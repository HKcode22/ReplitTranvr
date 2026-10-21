/**
 * Gate05 timeout policy regression: pure policy + real disposable PG16 SELECTs.
 *
 * No AeroDataBox calls, role/credential creation, schema changes, STOP calls,
 * app deployment, or production database access. Connection is permitted ONLY
 * to the exact CI localhost v39_ci service with an empty provider key.
 */
import {describe,it,expect} from "vitest";
import {randomUUID} from "node:crypto";
import pg from "pg";
import {
  previewGate05IndependentStopDbTimeoutPolicyV39
} from "../server/lib/disruption/gate05IndependentStopDbPolicy_v39";

const ciUrl="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const ci=process.env.GITHUB_ACTIONS==="true"&&
  process.env.NODE_ENV==="test"&&
  process.env.DATABASE_URL===ciUrl&&
  !process.env.AERODATABOX_API_KEY;
const onlyDisposable=ci?describe:describe.skip;

describe("Gate05 independent safety-only PG timeout policy preview, no I/O",()=>{
  it("keeps lock < statement < client query timeout, all nonzero and bounded",()=>{
    const plan=previewGate05IndependentStopDbTimeoutPolicyV39();
    const c=plan.settings;
    expect(c.connectionTimeoutMillis).toBeGreaterThan(0);
    expect(c.connectionTimeoutMillis).toBeLessThanOrEqual(5000);
    expect(c.lock_timeout).toBeGreaterThan(0);
    expect(c.lock_timeout).toBeLessThan(c.statement_timeout);
    expect(c.statement_timeout).toBeLessThan(c.query_timeout);
    expect(c.query_timeout).toBeLessThanOrEqual(10000);
    expect(c.application_name).toBe("gate05_fids_independent_safety_v39");
    expect(plan.productionConnectionCreated).toBe(false);
    expect(plan.activeSupervisorVerified).toBe(false);
    expect(plan.requiresIndependentRestrictedSafetyLogin).toBe(true);
    expect(plan.requiresPostTimeoutStopReconciliation).toBe(true);
    expect(plan.paidPilotAuthorized).toBe(false);
    expect(plan.providerRequests).toBe(0);
    expect(plan.databaseWrites).toBe(0);
  });
});

onlyDisposable("Gate05 server timeouts genuinely fire on disposable PG16",()=>{
  it("applies scoped server limits, cancels delayed SELECT and lock wait",async()=>{
    const c=previewGate05IndependentStopDbTimeoutPolicyV39().settings;
    const client=new pg.Client({connectionString:ciUrl,...c});
    const blocker=new pg.Client({
      connectionString:ciUrl,connectionTimeoutMillis:3000,
      statement_timeout:4000,query_timeout:6000
    });
    const lock=BigInt("0x"+randomUUID().replaceAll("-","").slice(0,14)).toString();
    let connected=false,blockerConnected=false,locked=false;
    try{
      await client.connect();connected=true;
      await blocker.connect();blockerConnected=true;
      const identity=await client.query("SELECT current_database() AS db");
      expect(identity.rows[0].db).toBe("v39_ci");
      const limits=await client.query(
        "SELECT name,setting::integer AS ms FROM pg_settings "+
        "WHERE name IN ('statement_timeout','lock_timeout') ORDER BY name"
      );
      expect(Object.fromEntries(limits.rows.map(r=>[r.name,r.ms]))).toEqual({
        lock_timeout:1500,statement_timeout:4000
      });

      // A small test-local timeout avoids using a 4-second CI sleeper.
      // SET LOCAL is scoped to the disposable transaction, no schema DDL.
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '120ms'");
      await expect(client.query("SELECT pg_sleep(0.5)"))
        .rejects.toMatchObject({code:"57014"});
      // Transaction is in aborted state after statement cancellation.
      await client.query("ROLLBACK");
      expect((await client.query("SELECT 1 AS alive")).rows[0].alive).toBe(1);

      // Two independent physical PG sessions verify an actual lock timeout.
      await blocker.query("SELECT pg_advisory_lock($1::bigint)",[lock]);
      locked=true;
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '120ms'");
      await expect(client.query(
        "SELECT pg_advisory_lock($1::bigint)",[lock]
      )).rejects.toMatchObject({code:"55P03"});
      await client.query("ROLLBACK");
      await blocker.query("SELECT pg_advisory_unlock($1::bigint)",[lock]);
      locked=false;
      expect((await client.query("SELECT 1 AS alive")).rows[0].alive).toBe(1);
    }finally{
      if(connected)await client.query("ROLLBACK").catch(()=>{});
      if(locked&&blockerConnected)
        await blocker.query("SELECT pg_advisory_unlock($1::bigint)",[lock])
          .catch(()=>{});
      if(blockerConnected)await blocker.end().catch(()=>{});
      if(connected)await client.end().catch(()=>{});
    }
  },22000);
});
