/**
 * Gate05 V0070 ACTIVATE only: real disposable PG16, rollback always.
 * CI fixture is NOT human AUTH or real safety ARMED proof.
 * No production DB/creds, no AeroDataBox calls, no scope left active.
 */
import {describe,it,expect} from "vitest";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import pg from "pg";
const url="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const guarded=process.env.GITHUB_ACTIONS==="true" &&
  process.env.NODE_ENV==="test" && process.env.DATABASE_URL===url &&
  !process.env.AERODATABOX_API_KEY;
const onlyCI=guarded?describe:describe.skip;
const activate="SELECT scope_id,state,expires_at_utc "+
  "FROM clean.activate_gate05_prepared_scope_v39($1::uuid,$2::text)";
const reserve="SELECT clean.reserve_gate05_fids_attempt_v39("+
  "$1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10) AS reserved";
const stop="SELECT state,reserved_attempts,reserved_units "+
  "FROM clean.stop_gate05_fids_pilot_v39($1::uuid,$2::text)";
onlyCI("Gate05 V0070 distinct activation role and exact consumed permit",()=>{
  it("only activation group may activate one PREPARED exact scope; reserve and STOP remain separate",async()=>{
    const db=new pg.Client({connectionString:url,
      connectionTimeoutMillis:8000,statement_timeout:8000,query_timeout:10000});
    await db.connect();
    const scope=randomUUID(),auth="AUTH-G05-CI-ACTIVATE-01",
      hash="1".repeat(64),off="2".repeat(64),on="3".repeat(64),
      cycle="ci-no-provider-external-auth";
    const denied=async(sql:string,params:unknown[],code="42501")=>{
      await db.query("SAVEPOINT denied_activation");
      await expect(db.query(sql,params)).rejects.toMatchObject({code});
      await db.query("ROLLBACK TO SAVEPOINT denied_activation");
      await db.query("RELEASE SAVEPOINT denied_activation");
    };
    try{
      expect((await db.query("SELECT current_database() AS name")).rows[0].name)
        .toBe("v39_ci");
      await db.query("BEGIN");
      await db.query(
        "SELECT pg_advisory_xact_lock(hashtext('gate05_staged_schema_test_v39'))"
      );
      for(const migration of [
        "V0066__gate05_scoped_fids_budget_v39.sql",
        "V0067__gate05_fids_function_only_roles_v39.sql",
        "V0068__gate05_single_open_scope_v39.sql",
        "V0069__gate05_permit_bound_prepared_only_v39.sql",
        "V0070__gate05_exact_permit_activation_v39.sql"
      ])await db.query(readFileSync("migrations/staged/"+migration,"utf8"));

      const actOid=(await db.query(
        "SELECT to_regprocedure($1)::oid AS oid",
        ["clean.activate_gate05_prepared_scope_v39(uuid,text)"]
      )).rows[0]?.oid;
      expect(actOid).toBeTruthy();
      for(const group of [
        "gate05_fids_dispatch_v39","gate05_fids_safety_v39",
        "gate05_fids_commission_v39","gate05_fids_activate_v39"
      ]){
        await db.query("SET LOCAL ROLE "+group);
        const q=(await db.query(
          "SELECT has_function_privilege(current_user,$1::oid,'EXECUTE') AS allowed",
          [actOid])).rows[0];
        expect(q.allowed).toBe(group==="gate05_fids_activate_v39");
        for(const rel of ["gate05_fids_pilot_scope_v39",
          "gate05_fids_allowed_query_v39","gate05_fids_attempt_v39",
          "gate05_fids_commission_permit_v39"]){
          const a=(await db.query(
            "SELECT has_table_privilege(current_user,c.oid,'UPDATE') AS value "+
            "FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "+
            "WHERE n.nspname='clean' AND c.relname=$1",[rel])).rows;
          expect(a).toEqual([{value:false}]);
        }
        await db.query("RESET ROLE");
      }

      const start=new Date(Date.now()-60_000),end=new Date(Date.now()+15*60_000);
      const reset=new Date(Date.now()+10*86400_000);
      await db.query(
        "INSERT INTO clean.gate05_fids_commission_permit_v39 "+
        "(scope_id,authorization_id,authorization_sha256,cycle_id,icao,"+
        "starts_at_utc,expires_at_utc,provider_reset_utc,"+
        "no_location_query_sha256,location_query_sha256) "+
        "VALUES($1,$2,$3,$4,'WSSS',$5,$6,$7,$8,$9)",
        [scope,auth,hash,cycle,start,end,reset,off,on]
      );
      await db.query(
        "INSERT INTO clean.gate05_fids_pilot_scope_v39 "+
        "(scope_id,authorization_id,authorization_sha256,cycle_id,icao,"+
        "starts_at_utc,expires_at_utc) VALUES($1,$2,$3,$4,'WSSS',$5,$6)",
        [scope,auth,hash,cycle,start,end]
      );
      await db.query(
        "INSERT INTO clean.gate05_fids_allowed_query_v39 "+
        "(scope_id,query_sha256,query_index,with_location) VALUES"+
        "($1,$2,1,false),($1,$3,2,true)",[scope,off,on]
      );

      await db.query("SET LOCAL ROLE gate05_fids_activate_v39");
      await denied(activate,[scope,"9".repeat(64)],"P0001");
      await denied(activate,[scope,hash],"P0001"); // permit unused
      await db.query("RESET ROLE");
      // Fabricated CI-approved consumption simulates the future commissioner;
      // real approved signer and environment ARMED checks are independent.
      await db.query(
        "UPDATE clean.gate05_fids_commission_permit_v39 "+
        "SET consumed_at_utc=clock_timestamp() WHERE scope_id=$1",[scope]
      );

      for(const group of ["gate05_fids_dispatch_v39",
        "gate05_fids_safety_v39","gate05_fids_commission_v39"]){
        await db.query("SET LOCAL ROLE "+group);
        await denied(activate,[scope,hash]);
        await db.query("RESET ROLE");
      }

      await db.query("SET LOCAL ROLE gate05_fids_activate_v39");
      const active=(await db.query(activate,[scope,hash])).rows;
      expect(active).toHaveLength(1);
      expect(active[0].state).toBe("ACTIVE");
      expect(active[0].scope_id).toBe(scope);
      await denied(activate,[scope,hash],"P0001"); // cannot re-activate
      await denied(reserve,[randomUUID(),scope,auth,hash,cycle,
        "WSSS",off,"fids_base",1,2]);
      await denied(stop,[scope,"OPERATOR_STOP"]);
      await db.query("RESET ROLE");

      // Real reserve function can be called by dispatch only, after activation.
      await db.query("SET LOCAL ROLE gate05_fids_dispatch_v39");
      expect((await db.query(reserve,[randomUUID(),scope,auth,hash,cycle,
        "WSSS",off,"fids_base",1,2])).rows[0].reserved).toBe(true);
      await db.query("RESET ROLE");
      await db.query("SET LOCAL ROLE gate05_fids_safety_v39");
      const receipt=(await db.query(stop,[scope,"SAFETY_ABORT"])).rows[0];
      expect(receipt).toMatchObject({state:"STOPPED",
        reserved_attempts:"1",reserved_units:"2"});
      await db.query("RESET ROLE");

      const final=(await db.query(
        "SELECT state,base_used_units,retry_used_units FROM "+
        "clean.gate05_fids_pilot_scope_v39 WHERE scope_id=$1",[scope]
      )).rows[0];
      expect(final).toEqual({state:"STOPPED",
        base_used_units:2,retry_used_units:0});
    }finally{
      await db.query("ROLLBACK").catch(()=>{});
      await db.end().catch(()=>{});
    }
  },50000);
});
