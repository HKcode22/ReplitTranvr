/**
 * CI ONLY / ROLLBACK ONLY / NO PROVIDER.
 *
 * PostgreSQL 16 actually enforces function-only dispatch and STOP group
 * privileges against the staged V0066/V0067/V0068 schema. Uses SET LOCAL
 * ROLE inside an isolated disposable transaction: it proves effective SQL
 * permissions, NOT independent production LOGIN/password authentication,
 * process uptime, operating STOP delivery, owner consent, or paid readiness.
 */
import {describe,it,expect} from "vitest";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import pg from "pg";

const disposableUrl="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const safe=process.env.GITHUB_ACTIONS==="true"&&
  process.env.NODE_ENV==="test"&&
  process.env.DATABASE_URL===disposableUrl&&
  !process.env.AERODATABOX_API_KEY;
const onlyDisposable=safe?describe:describe.skip;
const group="gate05_staged_schema_test_v39";

onlyDisposable("Gate05 real PG16 separate function-only dispatch/safety ACL, no provider",()=>{
  it("dispatch cannot STOP; safety cannot reserve; STOP blocks future dispatch; historical receipts persist",async()=>{
    const db=new pg.Client({
      connectionString:disposableUrl,
      connectionTimeoutMillis:8000,
      query_timeout:8000,
      statement_timeout:8000
    });
    await db.connect();
    const scopeId=randomUUID();
    const authorizationId="AUTH-G05-DISPOSABLE-ROLE-TEST1";
    const authSha="a".repeat(64);
    const cycleId="ci-disposable-only-cycle";
    const offHash="b".repeat(64),onHash="c".repeat(64);
    const stopSql="SELECT state,reserved_attempts,reserved_units "+
      "FROM clean.stop_gate05_fids_pilot_v39($1::uuid,$2::text)";
    const reserveSql="SELECT clean.reserve_gate05_fids_attempt_v39("+
      "$1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9::integer,$10::integer) AS reserved";
    const attempt=(querySha:string,n:number,category:"fids_base"|"fids_retry")=>[
      randomUUID(),scopeId,authorizationId,authSha,cycleId,"WSSS",
      querySha,category,n,2
    ];
    const allTables=[
      "clean.gate05_fids_pilot_scope_v39",
      "clean.gate05_fids_allowed_query_v39",
      "clean.gate05_fids_attempt_v39"
    ];
    const expectNoDirectTables=async()=>{
      for(const table of allTables){
        for(const p of ["SELECT","INSERT","UPDATE","DELETE"]){
          const q=await db.query(
            "SELECT has_table_privilege(current_user,$1,$2) AS allowed",
            [table,p]
          );
          expect(q.rows[0].allowed).toBe(false);
        }
      }
    };
    const expectDenied=async(sql:string,args:unknown[],code="42501")=>{
      await db.query("SAVEPOINT denied_role_operation");
      await expect(db.query(sql,args)).rejects.toMatchObject({code});
      await db.query("ROLLBACK TO SAVEPOINT denied_role_operation");
      await db.query("RELEASE SAVEPOINT denied_role_operation");
    };
    try{
      expect((await db.query("SELECT current_database() AS db")).rows[0].db)
        .toBe("v39_ci");
      await db.query("BEGIN");
      await db.query("SELECT pg_advisory_xact_lock(hashtext($1))",[group]);
      for(const f of [
        "V0066__gate05_scoped_fids_budget_v39.sql",
        "V0067__gate05_fids_function_only_roles_v39.sql",
        "V0068__gate05_single_open_scope_v39.sql"
      ])await db.query(readFileSync("migrations/staged/"+f,"utf8"));
      // Admin-created fixture substitutes for a NOT-YET-IMPLEMENTED
      // commissioner ONLY within this rollback-only CI transaction.
      await db.query(
        "INSERT INTO clean.gate05_fids_pilot_scope_v39 "+
        "(scope_id,authorization_id,authorization_sha256,cycle_id,icao,"+
        "starts_at_utc,expires_at_utc) VALUES "+
        "($1,$2,$3,$4,'WSSS',clock_timestamp()-interval '1 minute',"+
        "clock_timestamp()+interval '15 minutes')",
        [scopeId,authorizationId,authSha,cycleId]
      );
      await db.query(
        "INSERT INTO clean.gate05_fids_allowed_query_v39 "+
        "(scope_id,query_sha256,query_index,with_location) VALUES "+
        "($1,$2,1,false),($1,$3,2,true)",
        [scopeId,offHash,onHash]
      );
      await db.query(
        "UPDATE clean.gate05_fids_pilot_scope_v39 "+
        "SET state='ACTIVE' WHERE scope_id=$1",[scopeId]
      );

      // The existing commission group must remain INERT until a separately
      // approved function-only one-use commissioner has been implemented.
      // Never give the commissioning account generic INSERT/UPDATE rights.
      await db.query("SET LOCAL ROLE gate05_fids_commission_v39");
      expect((await db.query("SELECT current_user AS role")).rows[0].role)
        .toBe("gate05_fids_commission_v39");
      await expectNoDirectTables();
      await expectDenied(reserveSql,attempt(offHash,1,"fids_base"));
      await expectDenied(stopSql,[scopeId,"SAFETY_ABORT"]);
      await expectDenied(
        "UPDATE clean.gate05_fids_pilot_scope_v39 SET state='STOPPED' "+
        "WHERE scope_id=$1",[scopeId]
      );
      await db.query("RESET ROLE");

      await db.query("SET LOCAL ROLE gate05_fids_dispatch_v39");
      expect((await db.query("SELECT current_user AS role")).rows[0].role)
        .toBe("gate05_fids_dispatch_v39");
      await expectNoDirectTables();
      expect((await db.query(reserveSql,attempt(offHash,1,"fids_base")))
        .rows[0].reserved).toBe(true);
      await expectDenied(stopSql,[scopeId,"OPERATOR_STOP"]);
      await db.query("RESET ROLE");

      await db.query("SET LOCAL ROLE gate05_fids_safety_v39");
      expect((await db.query("SELECT current_user AS role")).rows[0].role)
        .toBe("gate05_fids_safety_v39");
      await expectNoDirectTables();
      await expectDenied(reserveSql,attempt(onHash,1,"fids_base"));
      await expectDenied(
        "UPDATE clean.gate05_fids_pilot_scope_v39 SET state='ACTIVE' "+
        "WHERE scope_id=$1",[scopeId]
      );
      const receipt=(await db.query(stopSql,[scopeId,"SAFETY_ABORT"])).rows;
      expect(receipt).toEqual([{
        state:"STOPPED",reserved_attempts:"1",reserved_units:"2"
      }]);
      // Only the function-only safety identity is needed, and terminal STOP
      // returns the same historical receipt when called again.
      expect((await db.query(stopSql,[scopeId,"SAFETY_ABORT"])).rows)
        .toEqual(receipt);
      await db.query("RESET ROLE");

      await db.query("SET LOCAL ROLE gate05_fids_dispatch_v39");
      await db.query("SAVEPOINT after_stop_reservation");
      await expect(db.query(reserveSql,attempt(onHash,1,"fids_base")))
        .rejects.toThrow("GATE05_OWNER_AUTH_CYCLE_OR_WINDOW_HOLD");
      await db.query("ROLLBACK TO SAVEPOINT after_stop_reservation");
      await db.query("RELEASE SAVEPOINT after_stop_reservation");
      await db.query("RESET ROLE");

      const final=(await db.query(
        "SELECT state,stop_reason,base_used_units,retry_used_units "+
        "FROM clean.gate05_fids_pilot_scope_v39 WHERE scope_id=$1",
        [scopeId]
      )).rows[0];
      expect(final).toMatchObject({
        state:"STOPPED",stop_reason:"SAFETY_ABORT",
        base_used_units:2,retry_used_units:0
      });
      expect((await db.query(
        "SELECT count(*)::integer AS n FROM clean.gate05_fids_attempt_v39 "+
        "WHERE scope_id=$1",[scopeId]
      )).rows[0].n).toBe(1);
    }finally{
      // Never COMMIT. A failure still rolls back roles, schema and fixtures.
      await db.query("ROLLBACK").catch(()=>{});
      await db.end().catch(()=>{});
    }
  },40000);
});
