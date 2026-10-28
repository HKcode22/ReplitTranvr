/**
 * Disposable PostgreSQL 16: staged future Gate05 LOGGED custody journal.
 * This test MUST NEVER touch production. Both migrations are transactionally
 * applied and rolled back, without provider calls or real callback bytes.
 */
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import pg from "pg";

const url=process.env.DATABASE_URL??"";
let local=false;
try{
 const u=new URL(url);
 local=["localhost","127.0.0.1"].includes(u.hostname)&&
   u.pathname==="/v39_ci"&&process.env.GITHUB_ACTIONS==="true"&&
   !process.env.AERODATABOX_API_KEY;
}catch{}
const v74="migrations/staged/V0074__gate05_science_prepaid_owner_v39.sql";
const v75="migrations/staged/V0075__gate05_logged_delivery_custody_v39.sql";
const DELIVERY="ppd_"+"a".repeat(64);
const HASH="b".repeat(64);
(local?describe:describe.skip)("Gate05 durable LOGGED raw callback custody (staged, rollback only)",()=>{
 it("normalizes inherited DEFAULT UPDATE/DELETE only on newly created V0075 table",async()=>{
  const db=new pg.Client({connectionString:url,connectionTimeoutMillis:10000});
  await db.connect();
  const tag=randomUUID().replaceAll("-","").slice(0,16);
  const runtime="g05_acl_writer_"+tag;
  const inherited="g05_acl_group_"+tag;
  const ident=(name:string)=>'"'+name.replaceAll('"','""')+'"';
  try{
   await db.query("BEGIN");
   await db.query(readFileSync(v74,"utf8"));
   const beforeOwnerTableAcl=(await db.query(
     "SELECT relacl::text AS acl FROM pg_class "+
     "WHERE oid='clean.phase3_gate05_science_owner_v39'::regclass"
   )).rows[0].acl;
   await db.query('CREATE ROLE '+ident(runtime)+' NOLOGIN INHERIT');
   await db.query('CREATE ROLE '+ident(inherited)+' NOLOGIN');
   await db.query('GRANT '+ident(inherited)+' TO '+ident(runtime));
   // Reproduce the live Neon condition: direct and inherited grantee
   // DEFAULT privileges for new tables include UPDATE and DELETE.
   await db.query('ALTER DEFAULT PRIVILEGES IN SCHEMA clean '+
     'GRANT INSERT, UPDATE, DELETE ON TABLES TO '+
     ident(runtime)+','+ident(inherited));
   await db.query(readFileSync(v75,"utf8"));
   await db.query('GRANT USAGE ON SCHEMA clean TO '+ident(runtime));
   await db.query('GRANT INSERT ON TABLE '+
     'clean.gate05_science_delivery_custody_v39 TO '+ident(runtime));
   const rights=async(table:string)=>(
     await db.query(
       "SELECT has_table_privilege($1,$2,'INSERT') AS can_insert,"+
       "has_table_privilege($1,$2,'UPDATE') AS can_update,"+
       "has_table_privilege($1,$2,'DELETE') AS can_delete",
       [runtime,table])
   ).rows[0];
   const journal="clean.gate05_science_delivery_custody_v39";
   expect(await rights(journal)).toMatchObject({
     can_insert:true,can_update:true,can_delete:true
   });
   // Exact catalog-driven normalization used by the production installer.
   // It cannot touch default privileges or any historical table.
   const overgranted=(await db.query(
     "SELECT DISTINCT recipient.rolname AS grantee_role "+
     "FROM pg_class c "+
     "CROSS JOIN LATERAL aclexplode("+
     "COALESCE(c.relacl,acldefault('r',c.relowner))) acl "+
     "JOIN pg_roles recipient ON recipient.oid=acl.grantee "+
     "WHERE c.oid='clean.gate05_science_delivery_custody_v39'::regclass "+
     "AND acl.grantee<>c.relowner "+
     "AND acl.privilege_type IN ('UPDATE','DELETE')"
   )).rows;
   expect(overgranted.map(x=>x.grantee_role).sort()).toEqual(
     [runtime,inherited].sort());
   for(const recipient of overgranted){
     await db.query(
       "REVOKE UPDATE, DELETE ON TABLE "+
       "clean.gate05_science_delivery_custody_v39 FROM "+
       ident(recipient.grantee_role)
     );
   }
   expect(await rights(journal)).toMatchObject({
     can_insert:true,can_update:false,can_delete:false
   });
   expect((await db.query(
     "SELECT has_schema_privilege($1,'clean','USAGE') AS schema_use",
     [runtime])).rows[0].schema_use).toBe(true);
   expect((await db.query(
     "SELECT relacl::text AS acl FROM pg_class "+
     "WHERE oid='clean.phase3_gate05_science_owner_v39'::regclass"
   )).rows[0].acl).toBe(beforeOwnerTableAcl);
   // Default ACL policies are deliberately unchanged, verified by another
   // newly created disposable table still inheriting the historical grant.
   const probe="g05_acl_probe_"+tag;
   await db.query("CREATE TABLE clean."+ident(probe)+" (id integer)");
   expect(await rights("clean."+probe)).toMatchObject({
     can_insert:true,can_update:true,can_delete:true
   });
  }finally{
   await db.query("ROLLBACK").catch(()=>undefined);
   await db.end();
  }
 },20000);
 it("survives erased UNLOGGED item history, rejects foreign refs and is immutable",async()=>{
  const db=new pg.Client({connectionString:url,connectionTimeoutMillis:10000});
  await db.connect();
  try{
   await db.query("BEGIN");
   await db.query(readFileSync(v74,"utf8"));
   await db.query(readFileSync(v75,"utf8"));
   // Regression: PostgreSQL serializes a function SET search_path using
   // optional spaces around commas. The one-shot production installer used
   // to reject the valid catalog representation after creating V0075,
   // forcing a transaction rollback. Check actual PG16 catalog, not mocks.
   const meta=(await db.query(
    "SELECT c.relpersistence,c.relkind,p.prosecdef,p.proconfig "+
    "FROM pg_class c "+
    "JOIN pg_trigger t ON t.tgrelid=c.oid AND "+
    "t.tgname='gate05_delivery_custody_immutable_v39' "+
    "JOIN pg_proc p ON p.oid=t.tgfoid "+
    "WHERE c.oid='clean.gate05_science_delivery_custody_v39'::regclass"
   )).rows;
   expect(meta).toHaveLength(1);
   expect(meta[0].relpersistence).toBe("p");
   expect(meta[0].relkind).toBe("r");
   expect(meta[0].prosecdef).toBe(true);
   expect(Array.isArray(meta[0].proconfig)).toBe(true);
   const normalized=(meta[0].proconfig as string[]).map(x=>
     x.replace(/\s*,\s*/g,","));
   expect(normalized).toEqual(["search_path=pg_catalog,clean"]);
   // Validate the live read-only privilege diagnostic's PG16 role and
   // default-ACL catalog query using the actual disposal database catalog.
   // In particular, pg_has_role(name,name,USAGE) is a real PG function,
   // and aclexplode/default privilege metadata must not require production.
   const currentRole=(await db.query(
     "SELECT current_user AS actor")).rows[0].actor;
   const roleProof=(await db.query(
     "SELECT pg_has_role($1::name,$2::name,'USAGE') AS admin_usage,"+
     "has_schema_privilege($1::name,'clean','USAGE') AS schema_usage",
     [currentRole,currentRole])).rows[0];
   expect(roleProof.admin_usage).toBe(true);
   expect(roleProof.schema_usage).toBe(true);
   const acl=(await db.query(
     "SELECT d.defaclnamespace=0 AS global_scope,"+
     "a.privilege_type AS privilege,"+
     "(a.grantee=0) AS public_grant,"+
     "CASE WHEN a.grantee=0 THEN false "+
     "ELSE pg_has_role($1::name,grantee_role.rolname,'USAGE') END "+
     "AS runtime_eligible "+
     "FROM pg_default_acl d "+
     "CROSS JOIN LATERAL aclexplode(d.defaclacl) a "+
     "LEFT JOIN pg_roles grantee_role ON grantee_role.oid=a.grantee "+
     "WHERE d.defaclrole=(SELECT oid FROM pg_roles WHERE rolname=$2) "+
     "AND d.defaclobjtype='r' "+
     "AND (d.defaclnamespace=0 OR "+
     "d.defaclnamespace=(SELECT oid FROM pg_namespace WHERE nspname='clean')) "+
     "AND a.privilege_type IN ('INSERT','UPDATE','DELETE')",
     [currentRole,currentRole])).rows;
   expect(Array.isArray(acl)).toBe(true);
   const scope=randomUUID(),blob=randomUUID(),foreign=randomUUID();
   const head="c".repeat(40),auth="d".repeat(64),ticket="e".repeat(64);
   await db.query(
    "INSERT INTO clean.phase3_gate05_science_owner_v39 "+
    "(session_id,source_commit,authorization_sha256,reviewed_stop_ticket_sha256,"+
    "start_at_utc,stop_at_utc,session_expires_at_utc)"+
    " VALUES($1,$2,$3,$4,now()+interval '2 hours',"+
    "now()+interval '3 hours',now()+interval '3 hours 20 minutes')",
    [scope,head,auth,ticket]);
   const objectName=(id:string)=>
     "v39/provider/raw_provider_content/"+id.slice(0,2)+"/"+id+".blob";
   const addRef=async(id:string,src:string)=>db.query(
    "INSERT INTO clean.provider_content_blob_ref "+
    "(blob_ref_id,storage_kind,contract_version,object_name,content_class,"+
    "content_sha256,content_bytes,source_kind,source_record_id,"+
    "persisted_at_utc,retention_hours,expires_at_utc)"+
    " VALUES($1,'replit_app_storage','provider-blob-contract-v39@1.0.0',"+
    "$2,'raw_provider_content',$3,10,'webhook',$4,"+
    "now()-interval '1 minute',168,now()-interval '1 minute'+interval '168 hours')",
    [id,objectName(id),HASH,src]);
   await addRef(blob,"prepaid:"+scope+":"+DELIVERY);
   await addRef(foreign,"prepaid:"+randomUUID()+":"+DELIVERY);
   const insert="INSERT INTO clean.gate05_science_delivery_custody_v39"+
    " (session_id,delivery_id,blob_ref_id,body_sha256,item_count,"+
    " receiver_attempt_at_utc,blob_persisted_at_utc)"+
    " VALUES($1,$2,$3,$4,$5,now()-interval '2 seconds',"+
    "now()-interval '1 minute')";
   const reject=async(label:string,args:any[])=>{
    await db.query("SAVEPOINT "+label);
    await expect(db.query(insert,args)).rejects.toThrow();
    await db.query("ROLLBACK TO SAVEPOINT "+label);
   };
   await reject("wrongref",[scope,DELIVERY,foreign,HASH,2]);
   await reject("wronghash",[scope,DELIVERY,blob,"f".repeat(64),2]);
   await db.query(insert,[scope,DELIVERY,blob,HASH,2]);
   const row=await db.query(
     "SELECT item_count,body_sha256,receiver_attempt_at_utc,"+
     "http_2xx_delivery_verified FROM clean.gate05_science_delivery_custody_v39"+
     " WHERE session_id=$1",[scope]);
   expect(row.rows).toHaveLength(1);
   expect(row.rows[0].item_count).toBe(2);
   expect(row.rows[0].body_sha256).toBe(HASH);
   expect(row.rows[0].http_2xx_delivery_verified).toBe(false);
   const persistence=await db.query(
    "SELECT relname,relpersistence FROM pg_class WHERE oid IN "+
    "('clean.gate05_science_delivery_custody_v39'::regclass,"+
    "'clean.prepaid_probe_item_runtime'::regclass)");
   expect(Object.fromEntries(persistence.rows.map(x=>[x.relname,x.relpersistence])))
     .toMatchObject({gate05_science_delivery_custody_v39:"p",
       prepaid_probe_item_runtime:"u"});
   // A published receiver has only INSERT on this new table. The immutable
   // trigger's ref/owner lookups must run under the reviewed DDL owner,
   // not require broad SELECT privileges for the low-privilege runtime.
   const restricted="g05_ci_"+randomUUID().replaceAll("-","").slice(0,18);
   const limitedBlob=randomUUID();
   const limitedDelivery="ppd_"+"d".repeat(64);
   await addRef(limitedBlob,"prepaid:"+scope+":"+limitedDelivery);
   await db.query('CREATE ROLE "'+restricted+'" NOLOGIN');
   await db.query('GRANT USAGE ON SCHEMA clean TO "'+restricted+'"');
   await db.query('GRANT INSERT ON clean.gate05_science_delivery_custody_v39 TO "'+restricted+'"');
   expect((await db.query(
     "SELECT has_table_privilege($1,"+
     "'clean.phase3_gate05_science_owner_v39','SELECT') AS owner_read,"+
     "has_table_privilege($1,"+
     "'clean.provider_content_blob_ref','SELECT') AS raw_ref_read",
     [restricted])).rows[0]).toMatchObject({
       owner_read:false,raw_ref_read:false
     });
   await db.query('SET LOCAL ROLE "'+restricted+'"');
   try {
     await db.query(insert,[scope,limitedDelivery,limitedBlob,HASH,1]);
   }finally{
     await db.query("RESET ROLE");
   }
   const limited=(await db.query(
     "SELECT item_count FROM clean.gate05_science_delivery_custody_v39 "+
     "WHERE session_id=$1 AND delivery_id=$2",
     [scope,limitedDelivery])).rows;
   expect(limited).toHaveLength(1);
   expect(limited[0].item_count).toBe(1);
   await db.query("SAVEPOINT immutability");
   await expect(db.query(
     "UPDATE clean.gate05_science_delivery_custody_v39 SET item_count=99 "+
     "WHERE session_id=$1",[scope])).rejects.toThrow("GATE05_CUSTODY_IMMUTABLE");
   await db.query("ROLLBACK TO SAVEPOINT immutability");
   await db.query("SAVEPOINT duplicate");
   await expect(db.query(insert,[scope,DELIVERY,blob,HASH,2])).rejects.toThrow();
   await db.query("ROLLBACK TO SAVEPOINT duplicate");
  }finally{
   await db.query("ROLLBACK").catch(()=>undefined);
   await db.end();
  }
 },20000);
 it("receiver writes journal in same transaction only behind opt-in future switch",()=>{
  const src=readFileSync("server/lib/disruption/prepaidProbeRuntime_v39.ts","utf8");
  const insert=src.indexOf("INSERT INTO clean.gate05_science_delivery_custody_v39");
  const unlogged=src.indexOf("INSERT INTO clean.prepaid_probe_delivery_runtime",insert);
  const commit=src.indexOf('client.query("COMMIT")',unlogged);
  expect(src).toContain("V39_GATE05_DURABLE_CUSTODY_REQUIRED");
  expect(src).toContain('=== "1"');
  expect(src).toContain('"phase3_gate05_science"');
  expect(insert).toBeGreaterThan(0);
  expect(unlogged).toBeGreaterThan(insert);
  expect(commit).toBeGreaterThan(unlogged);
  expect(src).toContain("blob.persistedAtUtc");
  expect(src).not.toContain("http_2xx_delivery_verified,true");
 });
});
