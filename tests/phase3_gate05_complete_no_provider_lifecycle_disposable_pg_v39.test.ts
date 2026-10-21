/**
 * COMPLETE Gate05 V0066–V0070 lifecycle in *ONE* disposable PostgreSQL16
 * transaction. No commercial key, paid network calls, real owner signature,
 * production DDL, secret issuance or live safety service.
 *
 * Synthetic permit -> restricted PREPARED -> restricted ACTIVE ->
 * both OFF/ON queries x base+two retries -> restricted terminal STOP ->
 * replay/after-STOP rejection. All DDL and rows ROLLBACK on every exit.
 *
 * This is an integration contract, NOT an independent GitHub worker
 * rehearsal or authorization to run the physical AeroDataBox provider.
 */
import {describe,it,expect} from "vitest";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import pg from "pg";

const DB="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const enabled=process.env.GITHUB_ACTIONS==="true" &&
  process.env.NODE_ENV==="test" && process.env.DATABASE_URL===DB &&
  !process.env.AERODATABOX_API_KEY;
const ciOnly=enabled?describe:describe.skip;
const prepare="SELECT prepared_scope_id,prepared_queries "+
  "FROM clean.prepare_gate05_permitted_scope_v39($1::uuid,$2::text)";
const activate="SELECT scope_id,state,expires_at_utc "+
  "FROM clean.activate_gate05_prepared_scope_v39($1::uuid,$2::text)";
const reserve="SELECT clean.reserve_gate05_fids_attempt_v39("+
  "$1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10) AS reserved";
const stop="SELECT state,reserved_attempts,reserved_units "+
  "FROM clean.stop_gate05_fids_pilot_v39($1::uuid,$2::text)";
const migrations=[
  "V0066__gate05_scoped_fids_budget_v39.sql",
  "V0067__gate05_fids_function_only_roles_v39.sql",
  "V0068__gate05_single_open_scope_v39.sql",
  "V0069__gate05_permit_bound_prepared_only_v39.sql",
  "V0070__gate05_exact_permit_activation_v39.sql"
];
ciOnly("Gate05 full synthetic no-provider one-use lifecycle PG16",()=>{
  it("commissions exact scope, activates only on time, accounts 12 units, independently STOPs and prohibits replay",async()=>{
    const db=new pg.Client({connectionString:DB,
      connectionTimeoutMillis:8000,statement_timeout:10000,
      query_timeout:12000,lock_timeout:2500});
    await db.connect();
    const scope=randomUUID(),auth="AUTH-G05-CI-INTEGRATED-0001",
      digest="d".repeat(64),cycle="ci-integration-zero-provider",
      off="e".repeat(64),on="f".repeat(64);
    let physicalProviderCalls=0;
    const rejected=async(sql:string,params:unknown[],code="P0001")=>{
      await db.query("SAVEPOINT gate05_expected_failure");
      await expect(db.query(sql,params)).rejects.toMatchObject({code});
      await db.query("ROLLBACK TO SAVEPOINT gate05_expected_failure");
      await db.query("RELEASE SAVEPOINT gate05_expected_failure");
    };
    const role=async(name:string)=>{
      await db.query("SET LOCAL ROLE "+name);
      expect((await db.query("SELECT current_user AS actor")).rows[0].actor)
        .toBe(name);
    };
    const resetRole=()=>db.query("RESET ROLE");
    const row=async()=>(await db.query(
      "SELECT state,base_used_units,retry_used_units,stop_reason "+
      "FROM clean.gate05_fids_pilot_scope_v39 WHERE scope_id=$1",
      [scope])).rows[0];
    const params=(hash:string,n:number)=>[
      randomUUID(),scope,auth,digest,cycle,"WSSS",hash,
      n===1?"fids_base":"fids_retry",n,2
    ];
    try{
      expect((await db.query("SELECT current_database() AS db")).rows[0].db)
        .toBe("v39_ci");
      await db.query("BEGIN");
      await db.query(
        "SELECT pg_advisory_xact_lock(hashtext('gate05_staged_schema_test_v39'))"
      );
      for(const path of migrations){
        await db.query(readFileSync("migrations/staged/"+path,"utf8"));
      }
      // Exact future commissioning window. Real wall clock is used by
      // both real installed functions; no mocks or operator time travel.
      const future=new Date(Date.now()+5000);
      const expiry=new Date(Date.now()+20*60000);
      const reset=new Date(Date.now()+10*86400_000);
      const inserted=await db.query(
        "INSERT INTO clean.gate05_fids_commission_permit_v39 "+
        "(scope_id,authorization_id,authorization_sha256,cycle_id,icao,"+
        "starts_at_utc,expires_at_utc,provider_reset_utc,"+
        "no_location_query_sha256,location_query_sha256) "+
        "VALUES ($1,$2,$3,$4,'WSSS',$5,$6,$7,$8,$9)",
        [scope,auth,digest,cycle,future,expiry,reset,off,on]
      );
      expect(inserted.rowCount).toBe(1);
      // Interrupted admin registration: rollback a second synthetic permit
      // rather than leave an orphan; no provider calls.
      await db.query("SAVEPOINT simulated_admin_interrupt");
      const other=randomUUID();
      await db.query(
        "INSERT INTO clean.gate05_fids_commission_permit_v39 "+
        "(scope_id,authorization_id,authorization_sha256,cycle_id,icao,"+
        "starts_at_utc,expires_at_utc,provider_reset_utc,"+
        "no_location_query_sha256,location_query_sha256) "+
        "VALUES ($1,$2,$3,$4,'WSSS',$5,$6,$7,$8,$9)",
        [other,"AUTH-G05-CI-ROLLBACK-0002","a".repeat(64),cycle,
          future,expiry,reset,"b".repeat(64),"c".repeat(64)]
      );
      await rejected("SELECT 1/0",[],"22012");
      await db.query("ROLLBACK TO SAVEPOINT simulated_admin_interrupt");
      await db.query("RELEASE SAVEPOINT simulated_admin_interrupt");
      expect((await db.query(
        "SELECT count(*)::int AS n "+
        "FROM clean.gate05_fids_commission_permit_v39"
      )).rows[0].n).toBe(1);

      await role("gate05_fids_commission_v39");
      await rejected(prepare,[scope,"9".repeat(64)]);
      expect((await db.query(prepare,[scope,digest])).rows)
        .toEqual([{prepared_scope_id:scope,prepared_queries:2}]);
      await rejected(prepare,[scope,digest]);
      await rejected(activate,[scope,digest],"42501");
      await rejected(reserve,params(off,1),"42501");
      await rejected(stop,[scope,"SAFETY_ABORT"],"42501");
      await resetRole();

      expect((await row()).state).toBe("PREPARED");
      expect((await db.query(
        "SELECT query_index,with_location,query_sha256,last_reserved_attempt "+
        "FROM clean.gate05_fids_allowed_query_v39 "+
        "WHERE scope_id=$1 ORDER BY query_index",[scope]
      )).rows).toEqual([
        {query_index:1,with_location:false,query_sha256:off,last_reserved_attempt:0},
        {query_index:2,with_location:true,query_sha256:on,last_reserved_attempt:0}
      ]);
      expect((await db.query(
        "SELECT consumed_at_utc IS NOT NULL AS consumed "+
        "FROM clean.gate05_fids_commission_permit_v39 WHERE scope_id=$1",
        [scope]
      )).rows[0].consumed).toBe(true);

      await role("gate05_fids_activate_v39");
      await rejected(activate,[scope,digest]); // signed start not reached
      await rejected(activate,[scope,"9".repeat(64)]);
      await rejected(stop,[scope,"OPERATOR_STOP"],"42501");
      await resetRole();

      // Real DB time must reach signed activation start. Bound wait.
      const remaining=future.getTime()-Date.now()+350;
      if(remaining>0)await new Promise(r=>setTimeout(r,remaining));
      await role("gate05_fids_activate_v39");
      expect((await db.query(activate,[scope,digest])).rows[0])
        .toMatchObject({scope_id:scope,state:"ACTIVE"});
      await rejected(activate,[scope,digest]); // one-way transition
      await rejected(reserve,params(off,1),"42501");
      await resetRole();

      await role("gate05_fids_dispatch_v39");
      await rejected(stop,[scope,"SAFETY_ABORT"],"42501");
      for(let n=1;n<=3;n++){
        for(const hash of [off,on]){
          const response=await db.query(reserve,params(hash,n));
          expect(response.rows[0].reserved).toBe(true);
          // Deliberately NO HTTP GET is dispatched. Reservation is charged
          // as possibly billable even though CI physical requests are zero.
        }
      }
      await rejected(reserve,params(off,3)); // duplicate, no 7th unit spend
      await rejected(reserve,params(on,4));  // n>3, impossible retry
      await rejected(prepare,[scope,digest],"42501");
      await resetRole();
      expect(await row()).toMatchObject({
        state:"ACTIVE",base_used_units:4,retry_used_units:8
      });
      const accounts=(await db.query(
        "SELECT count(*)::int AS attempts,"+
        "coalesce(sum(units),0)::int AS reserved_units "+
        "FROM clean.gate05_fids_attempt_v39 WHERE scope_id=$1",
        [scope]
      )).rows[0];
      expect(accounts).toEqual({attempts:6,reserved_units:12});

      await role("gate05_fids_safety_v39");
      await rejected(reserve,params(off,1),"42501");
      const terminal=(await db.query(stop,[scope,"SAFETY_ABORT"])).rows[0];
      expect(terminal).toEqual({
        state:"STOPPED",reserved_attempts:"6",reserved_units:"12"
      });
      expect((await db.query(stop,[scope,"SAFETY_ABORT"])).rows[0])
        .toEqual(terminal);
      await resetRole();

      await role("gate05_fids_dispatch_v39");
      await rejected(reserve,params(on,3));
      await resetRole();
      await role("gate05_fids_activate_v39");
      await rejected(activate,[scope,digest]);
      await resetRole();
      expect(await row()).toMatchObject({
        state:"STOPPED",stop_reason:"SAFETY_ABORT",
        base_used_units:4,retry_used_units:8
      });
      expect(physicalProviderCalls).toBe(0);
      expect(accounts.reserved_units).toBe(12);
      // 12 reserved units is NOT "12 billed units"; the network was off.
    } finally{
      await db.query("ROLLBACK").catch(()=>{});
      if((await db.query(
        "SELECT to_regclass('clean.gate05_fids_pilot_scope_v39') AS object"
      ).catch(()=>({rows:[]}))).rows[0]?.object!==null)
        throw Error("GATE05_CI_SCHEMA_LEAK_AFTER_ROLLBACK");
      await db.end().catch(()=>{});
    }
  },55000);
});
