/**
 * REAL PG16 concurrency/fail-closed test for the Gate4 admission guard.
 *
 * Strictly GitHub Actions' localhost /v39_ci environment, without any
 * provider credentials. Spins up a separate disposable g4_adm_* database,
 * uses only a minimal clean.adb_collection_batches shape needed by the
 * production admission SQL, and removes it on every exit.
 *
 * This is real cross-connection lock/SQL evidence, NOT an integrated
 * provider CREATE/DELETE, SEND-cost, or independent STOP receipt.
 */
import {randomBytes} from "node:crypto";
import {describe,it,expect} from "vitest";
import pg from "pg";
import {assertGate4TransactionalAdmissionV39}
  from "../server/lib/disruption/gate4TransactionalAdmission_v39";

const localUrl="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const safe = process.env.GITHUB_ACTIONS==="true" &&
  process.env.NODE_ENV==="test" &&
  process.env.DATABASE_URL===localUrl &&
  !process.env.AERODATABOX_API_KEY &&
  process.env.ADB_AUTO_COLLECT==="0" &&
  process.env.V39_PHASE6_PROCESS_ARMED==="0";
const suite=safe?describe:describe.skip;

suite("Gate4 real PG16 — independent connections, lock and unsettled state",()=>{
  it("serializes admission and blocks active, unsettled and unacknowledged parents",async()=>{
    const name="g4_adm_"+randomBytes(6).toString("hex");
    // Safe unquoted generated SQL identifier, never user input or production.
    expect(name).toMatch(/^g4_adm_[a-f0-9]{12}$/);
    const admin=new pg.Client({
      connectionString:localUrl,connectionTimeoutMillis:5000
    });
    const clients:pg.Client[]=[];
    let created=false;
    const newClient=async()=>{
      const url=new URL(localUrl);
      url.pathname="/"+name;
      const c=new pg.Client({
        connectionString:url.toString(),
        connectionTimeoutMillis:5000,
        statement_timeout:6000,
        lock_timeout:2500
      });
      await c.connect();
      clients.push(c);
      return c;
    };
    await admin.connect();
    try {
      const identity=(await admin.query(
        "SELECT current_database() AS db,current_user AS actor"
      )).rows[0];
      expect(identity).toMatchObject({db:"v39_ci",actor:"postgres"});
      await admin.query("CREATE DATABASE "+name);
      created=true;
      const a=await newClient();
      const b=await newClient();
      await a.query("CREATE SCHEMA clean");
      await a.query(
        "CREATE TABLE clean.adb_collection_batches("+
        "batch_seq int PRIMARY KEY,"+
        "status text NOT NULL,"+
        "reconciliation_status text,"+
        "reconcile_acked boolean,"+
        "credits_consumed_actual bigint)"
      );

      await a.query("BEGIN");
      await assertGate4TransactionalAdmissionV39(a);
      await b.query("BEGIN");
      await expect(assertGate4TransactionalAdmissionV39(b))
        .rejects.toThrow("REFUSED_GATE4_ADMISSION_LOCK_BUSY");

      // Admitted client inserts an ACTIVE parent while still holding lock.
      await a.query(
        "INSERT INTO clean.adb_collection_batches(batch_seq,status) "+
        "VALUES (1,'ACTIVE')"
      );
      await a.query("COMMIT");
      await expect(assertGate4TransactionalAdmissionV39(b))
        .rejects.toThrow("REFUSED_GATE4_ACTIVE_BATCH_TRANSACTION");
      await b.query("ROLLBACK");

      // Terminal-but-unsettled predecessor is NOT permission to start.
      await a.query(
        "UPDATE clean.adb_collection_batches SET status='CLOSED',"+
        "reconciliation_status='UNSETTLED',reconcile_acked=false"
      );
      await b.query("BEGIN");
      await expect(assertGate4TransactionalAdmissionV39(b))
        .rejects.toThrow("REFUSED_GATE4_UNSETTLED_PREDECESSOR_TRANSACTION");
      await b.query("ROLLBACK");

      // Even matching accounting must be durably acknowledged.
      await a.query(
        "UPDATE clean.adb_collection_batches SET "+
        "reconciliation_status='MATCH',credits_consumed_actual=4"
      );
      await b.query("BEGIN");
      await expect(assertGate4TransactionalAdmissionV39(b))
        .rejects.toThrow("REFUSED_GATE4_UNSETTLED_PREDECESSOR_TRANSACTION");
      await b.query("ROLLBACK");

      await a.query(
        "UPDATE clean.adb_collection_batches "+
        "SET reconcile_acked=true"
      );
      await a.query("BEGIN");
      await assertGate4TransactionalAdmissionV39(a);
      await b.query("BEGIN");
      await expect(assertGate4TransactionalAdmissionV39(b))
        .rejects.toThrow("REFUSED_GATE4_ADMISSION_LOCK_BUSY");

      // Rollback releases transaction-scoped advisory lock.
      await a.query("ROLLBACK");
      await expect(assertGate4TransactionalAdmissionV39(b))
        .resolves.toBeUndefined();
      await b.query("ROLLBACK");

      // Cross-connection readback confirms original active row was
      // terminalized and no concurrent CREATE occurred in the fixture.
      const rows=(await a.query(
        "SELECT batch_seq,status,reconciliation_status,"+
        "reconcile_acked,credits_consumed_actual "+
        "FROM clean.adb_collection_batches"
      )).rows;
      expect(rows).toEqual([{
        batch_seq:1,status:"CLOSED",
        reconciliation_status:"MATCH",reconcile_acked:true,
        credits_consumed_actual:"4"
      }]);
      console.log("GATE4_REAL_PG_ADMISSION_CONTENTION_PASS");
      console.log("GATE4_REAL_PG_ACTIVE_UNSETTLED_GUARD_PASS");
      console.log("GATE4_REAL_PG_ROLLBACK_LOCK_RELEASE_PASS");
      console.log("PROVIDER_CALLS=0");
    } finally {
      for(const c of clients) {
        await c.query("ROLLBACK").catch(()=>{});
        await c.end().catch(()=>{});
      }
      try {
        if(created) await admin.query("DROP DATABASE "+name);
      } finally {
        await admin.end().catch(()=>{});
      }
    }
  },35000);
});
