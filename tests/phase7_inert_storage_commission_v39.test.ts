import {describe,it,expect} from "vitest";
import {Pool} from "pg";
import {readFileSync} from "node:fs";
import {P7_PRESERVATION_ACTORS,inspectP7PreservationActors,commissionP7PreservationActors,verifyP7PreservationLogin} from "../scripts/v39_phase7_preservation_logins_owner_v39.mjs";
import {runP7ExpiryOnce} from "../server/lib/disruption/phase7ExpiryRunner_v39";
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
   await pool.query("REVOKE SELECT ON phase7_private.pre_source_link_v39 FROM "+P7_INERT_ROLES.bundleReader);
   await pool.query("ALTER ROLE "+P7_INERT_ROLES.expiryReader+" LOGIN PASSWORD 'disposable-only'; ALTER ROLE "+P7_INERT_ROLES.expiryWriter+" LOGIN PASSWORD 'disposable-only'");
   // Commission the other FOUR existing actors, no new schema or data policy.
   const owner=await pool.connect(),passwords=Object.fromEntries(P7_PRESERVATION_ACTORS.map((a,i)=>[a.role,String(i+1).repeat(48)]));
   try{
    expect(await inspectP7PreservationActors(owner,{newLogins:false})).toMatchObject({preservationLogins:0,expiryLogins:2});
    let called=0;
    await expect(commissionP7PreservationActors(owner,passwords,async c=>{await disposableGuard(c);if(++called===2)throw Error("rollback fixture");})).rejects.toThrow("rollback fixture");
    expect(await inspectP7PreservationActors(owner,{newLogins:false})).toMatchObject({preservationLogins:0});
    await expect(commissionP7PreservationActors(owner,passwords,disposableGuard)).resolves.toMatchObject({newLogins:4});
    expect(await inspectP7PreservationActors(owner,{newLogins:true})).toMatchObject({preservationLogins:4,expiryLogins:2});
    await expect(commissionP7PreservationActors(owner,passwords,disposableGuard)).rejects.toThrow("ROLE_BOUNDARY");
   }finally{owner.release();}
   for(const a of P7_PRESERVATION_ACTORS){
    const actor=new Pool({connectionString:url!.replace("postgres:postgres@",a.role+":"+passwords[a.role]+"@"),max:1});
    const c=await actor.connect();
    try{await verifyP7PreservationLogin(c,a);await expect(c.query("SELECT * FROM phase7_private.pre_source_link_v39")).rejects.toThrow();}
    finally{c.release();await actor.end();}
   }
   const reader=new Pool({connectionString:url!.replace("postgres:postgres@",P7_INERT_ROLES.expiryReader+":disposable-only@"),max:1});
   const writer=new Pool({connectionString:url!.replace("postgres:postgres@",P7_INERT_ROLES.expiryWriter+":disposable-only@"),max:1});
   try{
    expect(await runP7ExpiryOnce(reader,undefined,"VERIFY_ONLY")).toMatchObject({status:"P7_EXPIRY_VERIFY_ONLY_NO_GO",deletedLinks:0});
    expect(await runP7ExpiryOnce(reader,writer,"APPLY_DUE_ONLY")).toMatchObject({status:"P7_EXPIRY_DUE_ONLY_INDEPENDENT_READBACK",deletedFragments:0});
    await expect(reader.query("SELECT phase7_private.sweep_due_pre_links_v39(1)")).rejects.toThrow();
    await expect(writer.query("SELECT * FROM phase7_private.pre_source_link_v39")).rejects.toThrow();
    await expect(runP7ExpiryOnce(writer,reader,"APPLY_DUE_ONLY")).rejects.toThrow("DISTINCT_RESTRICTED_ACTOR");
    // Real nonempty late-wake backlog, larger than the former total
    // 2000-link limit. All rows are synthetic in this disposable DB.
    await pool.query(`WITH seed AS MATERIALIZED(
      SELECT i,gen_random_uuid() row_id,gen_random_uuid() group_id
      FROM generate_series(1,2506) i
    ), payload AS MATERIALIZED(
      SELECT *,convert_to(jsonb_build_object(
        'schema','v39.phase6.phase7-derived-release-packet.v1','packetId',row_id::text,
        'contractVersion','synthetic_fixture','featureDictionarySha256',repeat('b',64),
        'rows',jsonb_build_array(jsonb_build_object('releaseRowId',row_id::text,
          'horizon','T-6h','cohortBucket',0,'split','train','featureBuckets','{}'::jsonb,
          'labelBuckets','{}'::jsonb,'missingness','{}'::jsonb,'qualityFlags',0,
          'censoring','not_due')))::text,'UTF8') bytes
      FROM seed
    ), inserted AS (
      INSERT INTO phase7_private.pre_fragment_v39(row_id,group_id,horizon,cohort_bucket,split,
        contract_sha256,profile_sha256,research_expiry_utc,packet_sha256,packet_bytes)
      SELECT row_id,group_id,'T-6h',0,'train',repeat('a',64),repeat('b',64),
        clock_timestamp()+CASE WHEN i BETWEEN 2502 AND 2505 THEN interval '-1 day' ELSE interval '1 day' END,
        encode(sha256(bytes),'hex'),bytes FROM payload RETURNING row_id
    )
    INSERT INTO phase7_private.pre_source_link_v39(snapshot_id,row_id,expires_at_utc)
    SELECT i,payload.row_id,clock_timestamp()+CASE WHEN i=2506 THEN interval '1 hour' ELSE interval '-1 hour' END
      FROM payload JOIN inserted USING(row_id)`);
    const before=await runP7ExpiryOnce(reader,undefined,"VERIFY_ONLY");
    expect(before.before).toMatchObject({dueLinks:2505,dueFragments:4,liveLinksOnDueFragments:0});
    const drained=await runP7ExpiryOnce(reader,writer,"APPLY_DUE_ONLY");
    expect(drained).toMatchObject({status:"P7_EXPIRY_DUE_ONLY_INDEPENDENT_READBACK",deletedLinks:2505,deletedFragments:4,deletedBundles:0,after:{dueLinks:0,dueFragments:0,liveLinks:1}});
    expect((await pool.query("SELECT count(*)::int n FROM phase7_private.pre_fragment_v39")).rows[0].n).toBe(2502);
    expect((await pool.query("SELECT snapshot_id::int n FROM phase7_private.pre_source_link_v39")).rows).toEqual([{n:2506}]);
   }finally{await Promise.all([reader.end(),writer.end()])}
  }finally{await pool.end()}
 },60000);
});
