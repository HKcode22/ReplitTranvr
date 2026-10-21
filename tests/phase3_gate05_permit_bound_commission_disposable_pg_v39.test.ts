/**
 * Gate05 STAGED V0069 integration rehearsal on real, disposable PostgreSQL16.
 *
 * No production connection; no AeroDataBox; no genuine human authorization.
 * All permit rows here are fabricated by privileged CI fixture code.
 * Every V0066..V0069 DDL/role/row is ROLLED BACK.
 */
import {describe,it,expect} from "vitest";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import pg from "pg";

const disposableUrl="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const enabled=process.env.GITHUB_ACTIONS==="true"&&
  process.env.NODE_ENV==="test"&&
  process.env.DATABASE_URL===disposableUrl&&
  !process.env.AERODATABOX_API_KEY;
const ciOnly=enabled?describe:describe.skip;
const prepareSql="SELECT prepared_scope_id,prepared_queries "+
  "FROM clean.prepare_gate05_permitted_scope_v39($1::uuid,$2::text)";
const stopSql="SELECT * FROM clean.stop_gate05_fids_pilot_v39($1::uuid,$2::text)";
const reserveSql="SELECT clean.reserve_gate05_fids_attempt_v39("+
  "$1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10)";
const permitTable="clean.gate05_fids_commission_permit_v39";
function fixture(n:number){
  return {
    scope:randomUUID(),authId:"AUTH-G05-CI-PERMIT-"+String(n).padStart(4,"0"),
    digest:n.toString(16).padStart(64,"0"),
    cycle:"disposable-ci-no-provider-cycle",off:n.toString(16).padStart(64,"a"),
    on:n.toString(16).padStart(64,"b")
  };
}
ciOnly("Gate05 V0069 permit-only PREPARED commissioner, disposable PG16",()=>{
  it("one exact permit creates 1 PREPARED + 2 queries; denies role escalation, replay and conflicting open scope",async()=>{
    const db=new pg.Client({
      connectionString:disposableUrl,connectionTimeoutMillis:8000,
      statement_timeout:8000,query_timeout:10000
    });
    await db.connect();
    const x=fixture(1),y=fixture(2);
    const permitInsert=
      "INSERT INTO "+permitTable+" (scope_id,authorization_id,"+
      "authorization_sha256,cycle_id,icao,starts_at_utc,expires_at_utc,"+
      "provider_reset_utc,no_location_query_sha256,location_query_sha256) "+
      "VALUES($1,$2,$3,$4,'WSSS',"+
      "clock_timestamp()+interval '10 minutes',"+
      "clock_timestamp()+interval '40 minutes',"+
      "clock_timestamp()+interval '14 days',$5,$6)";
    const addPermit=(a:ReturnType<typeof fixture>)=>
      db.query(permitInsert,[a.scope,a.authId,a.digest,a.cycle,a.off,a.on]);
    const deny=async(sql:string,params:unknown[],errorCode="42501")=>{
      await db.query("SAVEPOINT denied_operation");
      await expect(db.query(sql,params))
        .rejects.toMatchObject({code:errorCode});
      await db.query("ROLLBACK TO SAVEPOINT denied_operation");
      await db.query("RELEASE SAVEPOINT denied_operation");
    };
    try{
      expect((await db.query("SELECT current_database() AS db")).rows[0].db)
        .toBe("v39_ci");
      await db.query("BEGIN");
      await db.query(
        "SELECT pg_advisory_xact_lock(hashtext('gate05_staged_schema_test_v39'))"
      );
      for(const name of [
        "V0066__gate05_scoped_fids_budget_v39.sql",
        "V0067__gate05_fids_function_only_roles_v39.sql",
        "V0068__gate05_single_open_scope_v39.sql",
        "V0069__gate05_permit_bound_prepared_only_v39.sql"
      ]){
        await db.query(readFileSync("migrations/staged/"+name,"utf8"));
      }
      // Commissioner cannot fabricate permits. Only CI admin makes one
      // synthetic row; owner-signed production AUTH is STILL absent.
      await db.query("SET LOCAL ROLE gate05_fids_commission_v39");
      expect((await db.query("SELECT current_user AS role")).rows[0].role)
        .toBe("gate05_fids_commission_v39");
      const fn=await db.query(
        "SELECT has_function_privilege(current_user,"+
        "'clean.prepare_gate05_permitted_scope_v39(uuid,text)','EXECUTE') AS allowed"
      );
      expect(fn.rows[0].allowed).toBe(true);
      for(const rel of [
        "gate05_fids_commission_permit_v39",
        "gate05_fids_pilot_scope_v39",
        "gate05_fids_allowed_query_v39",
        "gate05_fids_attempt_v39"
      ])for(const right of ["SELECT","INSERT","UPDATE","DELETE"]){
        const q=await db.query(
          "SELECT has_table_privilege(current_user,c.oid,$2) AS allowed "+
          "FROM pg_catalog.pg_class c "+
          "JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace "+
          "WHERE n.nspname='clean' AND c.relname=$1",
          [rel,right]
        );
        expect(q.rowCount).toBe(1);
        expect(q.rows[0].allowed).toBe(false);
      }
      await deny(prepareSql,[x.scope,x.digest],"P0001");
      await deny(stopSql,[x.scope,"SAFETY_ABORT"]);
      await deny(reserveSql,[
        randomUUID(),x.scope,x.authId,x.digest,x.cycle,"WSSS",
        x.off,"fids_base",1,2
      ]);
      await deny(
        "INSERT INTO "+permitTable+" (scope_id,authorization_id,"+
        "authorization_sha256,cycle_id,icao,starts_at_utc,expires_at_utc,"+
        "provider_reset_utc,no_location_query_sha256,location_query_sha256) "+
        "VALUES($1,$2,$3,$4,'WSSS',now(),now()+interval '1 minute',"+
        "now()+interval '1 day',$5,$6)",
        [x.scope,x.authId,x.digest,x.cycle,x.off,x.on]
      );
      await db.query("RESET ROLE");

      await addPermit(x);
      await db.query("SET LOCAL ROLE gate05_fids_commission_v39");
      await deny(prepareSql,[x.scope,y.digest],"P0001");
      const prepared=await db.query(prepareSql,[x.scope,x.digest]);
      expect(prepared.rows).toEqual([{prepared_scope_id:x.scope,prepared_queries:2}]);
      await deny(prepareSql,[x.scope,x.digest],"P0001");
      await deny(
        "UPDATE clean.gate05_fids_pilot_scope_v39 "+
        "SET state='ACTIVE' WHERE scope_id=$1",[x.scope]
      );
      await db.query("RESET ROLE");

      expect((await db.query(
        "SELECT state,icao,base_cap_units,retry_cap_units,"+
        "base_used_units,retry_used_units FROM "+
        "clean.gate05_fids_pilot_scope_v39 WHERE scope_id=$1",[x.scope]
      )).rows).toEqual([{
        state:"PREPARED",icao:"WSSS",
        base_cap_units:4,retry_cap_units:8,
        base_used_units:0,retry_used_units:0
      }]);
      expect((await db.query(
        "SELECT query_index,with_location,query_sha256,last_reserved_attempt "+
        "FROM clean.gate05_fids_allowed_query_v39 "+
        "WHERE scope_id=$1 ORDER BY query_index",[x.scope]
      )).rows).toEqual([
        {query_index:1,with_location:false,query_sha256:x.off,last_reserved_attempt:0},
        {query_index:2,with_location:true,query_sha256:x.on,last_reserved_attempt:0}
      ]);
      expect((await db.query(
        "SELECT consumed_at_utc IS NOT NULL AS used FROM "+permitTable+
        " WHERE scope_id=$1",[x.scope]
      )).rows[0].used).toBe(true);

      await addPermit(y);
      // Distinct permit still cannot open another scope while first PREPARED.
      await db.query("SET LOCAL ROLE gate05_fids_commission_v39");
      await deny(prepareSql,[y.scope,y.digest],"23505");
      await db.query("RESET ROLE");
      expect((await db.query(
        "SELECT consumed_at_utc IS NULL AS unused FROM "+permitTable+
        " WHERE scope_id=$1",[y.scope]
      )).rows[0].unused).toBe(true);

      // Closing old scope frees unique open slot, but cannot replay its
      // consumed permit, even after STOP.
      expect((await db.query(stopSql,[x.scope,"OPERATOR_STOP"])).rows[0].state)
        .toBe("STOPPED");
      await db.query("SET LOCAL ROLE gate05_fids_commission_v39");
      await deny(prepareSql,[x.scope,x.digest],"P0001");
      expect((await db.query(prepareSql,[y.scope,y.digest])).rows)
        .toEqual([{prepared_scope_id:y.scope,prepared_queries:2}]);
      await db.query("RESET ROLE");
      expect((await db.query(
        "SELECT state FROM clean.gate05_fids_pilot_scope_v39 "+
        "WHERE scope_id=$1",[y.scope]
      )).rows[0].state).toBe("PREPARED");
    }finally{
      // CI must leave zero tables, zero new roles, and zero scope permits.
      await db.query("ROLLBACK").catch(()=>undefined);
      await db.end().catch(()=>undefined);
    }
  },45000);
});
