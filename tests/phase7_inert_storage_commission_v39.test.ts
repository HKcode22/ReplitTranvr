import {describe,it,expect} from "vitest";
import {Pool} from "pg";
import {readFileSync} from "node:fs";
import {compileP7InertStorageSql,installP7InertStorage,inspectP7InertStorage,P7_INERT_ROLES} from "../server/lib/disruption/phase7InertStorageCommission_v39";
describe("exact inert schema compiler",()=>{
 it("rejects modified SQL even with same object names",()=>{
  expect(compileP7InertStorageSql()).toHaveLength(3);
  expect(()=>compileP7InertStorageSql(p=>Buffer.concat([readFileSync(p),Buffer.from("\n")]))).toThrow("EXACT_SQL_BLOB");
 });
});
const url=process.env.P7_INERT_DISPOSABLE_URL;
describe.skipIf(url!=="postgresql://postgres:postgres@127.0.0.1:5432/neondb?sslmode=disable"||process.env.GITHUB_ACTIONS!=="true")("atomic inert PostgreSQL16 install",()=>{
 it("installs exact tables and only narrow NOLOGIN actors; rejects duplicate install",async()=>{
  const pool=new Pool({connectionString:url,max:2});
  try{
   const disposableGuard=async(c:import("pg").PoolClient)=>{
    const q=(await c.query("SELECT current_database() db,current_user actor,current_setting('server_version_num')::int ver")).rows[0];
    expect(q.db).toBe("neondb");expect(q.actor).toBe("postgres");expect(q.ver).toBeGreaterThanOrEqual(160000);expect(q.ver).toBeLessThan(170000);
   };
   // Prove rollback (including schema/roles) if the final safety read fails.
   let count=0;
   await expect(installP7InertStorage(pool,async c=>{await disposableGuard(c);if(++count===2)throw Error("fixture rollback")})).rejects.toThrow("fixture rollback");
   expect((await pool.query("SELECT to_regnamespace('phase7_private') IS NULL ok")).rows[0].ok).toBe(true);
   const r=await installP7InertStorage(pool,disposableGuard);
   expect(r).toMatchObject({tables:4,functions:7,loginRoles:0,schemaRoleCount:6,empty:true});
   expect(await inspectP7InertStorage(pool)).toMatchObject({status:"P7_INERT_SCHEMA_INDEPENDENT_READBACK_NO_GO",empty:true,publicGrants:0});
   await expect(installP7InertStorage(pool,disposableGuard)).rejects.toThrow("EXISTING_SCHEMA_OR_ROLE_NO_REPLAY");
   await pool.query("GRANT SELECT ON phase7_private.pre_source_link_v39 TO "+P7_INERT_ROLES.bundleReader);
   await expect(inspectP7InertStorage(pool)).rejects.toThrow("TABLE_PRIVILEGE_DRIFT");
  }finally{await pool.end()}
 },60000);
});
