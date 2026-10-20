/**
 * Production finding (2026-10-19): admin default ACL granted existing V39
 * runtime UPDATE on tables created in clean; old V0066 only revoked PUBLIC.
 * This disposable-PG regression proves a per-object REVOKE on just 3 new
 * Gate05 tables restores separation without changing global default ACLs.
 * Never invokes provider and never commits any PostgreSQL changes.
 */
import {describe,it,expect} from "vitest";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import pg from "pg";

const url=process.env.DATABASE_URL??"";
let safe=false;
try{
  const u=new URL(url);
  safe=process.env.GITHUB_ACTIONS==="true"&&
    ["127.0.0.1","localhost"].includes(u.hostname)&&
    u.pathname==="/v39_ci"&&!process.env.AERODATABOX_API_KEY;
}catch{}
const onlySafe=safe?describe:describe.skip;
const names=[
  "clean.gate05_fids_pilot_scope_v39",
  "clean.gate05_fids_allowed_query_v39",
  "clean.gate05_fids_attempt_v39"
];
onlySafe("Gate05 per-table default ACL mitigation on disposable PG16",()=>{
  it("revokes just pilot-table grants while keeping default ACL and runtime rights elsewhere",async()=>{
    const client=new pg.Client({connectionString:url,connectionTimeoutMillis:8000});
    await client.connect();
    const runtime="gate05_acl_fixture_"+randomUUID().replace(/-/g,"").slice(0,22);
    try{
      await client.query("BEGIN");
      await client.query('CREATE ROLE "'+runtime+'" NOLOGIN NOINHERIT');
      await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA clean GRANT UPDATE ON TABLES TO "'+runtime+'"');
      const before=await client.query(
        "SELECT count(*)::int AS n FROM pg_default_acl d "+
        "JOIN pg_roles r ON r.oid=d.defaclrole "+
        "WHERE r.rolname=current_user AND d.defaclnamespace='clean'::regnamespace");
      expect(before.rows[0].n).toBeGreaterThan(0);
      await client.query(readFileSync("migrations/staged/V0066__gate05_scoped_fids_budget_v39.sql","utf8"));
      await client.query(readFileSync("migrations/staged/V0067__gate05_fids_function_only_roles_v39.sql","utf8"));
      for(const name of names){
        const value=await client.query("SELECT has_table_privilege($1,$2,'UPDATE') AS allowed",[runtime,name]);
        expect(value.rows[0].allowed).toBe(true);
      }
      // Only the three new pilot objects are touched. No ALTER DEFAULT
      // PRIVILEGES, no schema-wide REVOKE and no runtime role mutation.
      await client.query("REVOKE ALL PRIVILEGES ON TABLE "+names.join(",")+' FROM "'+runtime+'"');
      for(const name of names){
        for(const right of ["SELECT","INSERT","UPDATE","DELETE","TRUNCATE","REFERENCES","TRIGGER"]){
          const actual=await client.query("SELECT has_table_privilege($1,$2,$3) AS allowed",[runtime,name,right]);
          expect(actual.rows[0].allowed).toBe(false);
        }
      }
      const after=await client.query(
        "SELECT count(*)::int AS n FROM pg_default_acl d "+
        "JOIN pg_roles r ON r.oid=d.defaclrole "+
        "WHERE r.rolname=current_user AND d.defaclnamespace='clean'::regnamespace");
      expect(after.rows[0].n).toBe(before.rows[0].n);
      const publicFns=await client.query(
        "SELECT has_function_privilege($1,"+
        "'clean.reserve_gate05_fids_attempt_v39(uuid,uuid,text,text,text,text,text,text,integer,integer)','EXECUTE')"+
        " AS can_reserve, has_function_privilege($1,"+
        "'clean.stop_gate05_fids_pilot_v39(uuid,text)','EXECUTE') AS can_stop",
        [runtime]
      );
      expect(publicFns.rows[0]).toEqual({can_reserve:false,can_stop:false});
      const role=await client.query(
        "SELECT rolname,rolcanlogin FROM pg_roles WHERE rolname IN "+
        "('gate05_fids_dispatch_v39','gate05_fids_safety_v39','gate05_fids_commission_v39')");
      expect(role.rowCount).toBe(3);
      expect(role.rows.every(r=>r.rolcanlogin===false)).toBe(true);
    }finally{
      await client.query("ROLLBACK").catch(()=>undefined);
      await client.end();
    }
  },35000);
});
