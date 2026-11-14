import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {
 ROLE,CONFIRM,admitP5RetentionReaderInstall,
 reviewP5ReaderOwnerCatalog,commitRole
} from "../scripts/v39_phase5_retention_five_column_reader_owner_once_v39.mjs";
import {readP5RetentionMetadataReadOnly,
 RETENTION_READER_REQUIRED_COLUMNS,RETENTION_READER_DENIED_COLUMNS}
 from "../scripts/v39_phase5_retention_metadata_private_readonly_sentinel_v39.mjs";

const sha="a".repeat(40);
const env={
 DATABASE_URL:"postgresql://neondb_owner:dummy@127.0.0.1/neondb",
 P5_RETENTION_READER_OWNER_APPROVAL:CONFIRM,
 P5_RETENTION_READER_APPROVED_MAIN_SHA:sha,
 ADB_AUTO_COLLECT:"0",
 V39_PHASE6_PROCESS_ARMED:"0",
 V39_PHASE6_OWNER_APPROVED:"0",
 GITHUB_ACTIONS:"false"
};
test("explicit one-off owner approval and exact code required",()=>{
 assert.equal(admitP5RetentionReaderInstall(env,sha,sha),true);
 for(const mutation of [
  {P5_RETENTION_READER_OWNER_APPROVAL:""},
  {P5_RETENTION_READER_APPROVED_MAIN_SHA:"b".repeat(40)},
  {ADB_AUTO_COLLECT:"1"},
  {V39_PHASE6_PROCESS_ARMED:"1"},
  {V39_PHASE6_OWNER_APPROVED:"1"},
  {GITHUB_ACTIONS:"true"},
  {DATABASE_URL:""},
  {V39_DATABASE_RUNTIME_URL:"different"},
  {AERODATABOX_API_KEY:"live"},
  {RAPIDAPI_KEY:"live"},
  {AERODATABOX_WEBHOOK_SECRET:"live"},
  {NODE_TLS_REJECT_UNAUTHORIZED:"0"}
 ]){
  assert.throws(()=>admitP5RetentionReaderInstall({...env,...mutation},sha,sha),
   /NO_EXACT_MAIN_OWNER_APPROVAL/);
 }
 assert.throws(()=>admitP5RetentionReaderInstall(env,sha,"b".repeat(40)),/NO_EXACT/);
});
test("schema/catalog must be exact and role absent; no other migration",()=>{
 const all=[...RETENTION_READER_REQUIRED_COLUMNS,
  ...RETENTION_READER_DENIED_COLUMNS].map(attname=>({attname}));
 const good={
  db:"neondb",actor:"neondb_owner",session_actor:"neondb_owner",
  readonly:"on",replica:false,pg_version:160016,rolsuper:false,
  rolcreaterole:true,can_grant_five_select:true
 };
 assert.equal(reviewP5ReaderOwnerCatalog(good,all,[]),true);
 assert.throws(()=>reviewP5ReaderOwnerCatalog(good,all,[{rolname:ROLE}]),/OWNER_SCHEMA_ROLE_ALREADY_EXISTS/);
 assert.throws(()=>reviewP5ReaderOwnerCatalog({...good,actor:"postgres"},all,[]),/OWNER_SCHEMA/);
 assert.throws(()=>reviewP5ReaderOwnerCatalog({...good,can_grant_five_select:false},all,[]),/OWNER_SCHEMA/);
 assert.throws(()=>reviewP5ReaderOwnerCatalog(good,all.slice(0,-1),[]),/OWNER_SCHEMA/);
 assert.throws(()=>reviewP5ReaderOwnerCatalog(good,[...all,{attname:"raw_payload"}],[]),/OWNER_SCHEMA/);
});
test("actual disposable PG16 creates one correct five-column-login and rejects extra columns",
 {skip:!process.env.P5_RETENTION_SENTINEL_DISPOSABLE_ADMIN_URL},async()=>{
 const adminURL=process.env.P5_RETENTION_SENTINEL_DISPOSABLE_ADMIN_URL;
 const admin=new pg.Client({connectionString:adminURL});
 await admin.connect();
 try{
  await commitRole(admin,"CIOnlyTestPassword12345678909876543210");
  await assert.rejects(
   commitRole(admin,"CIOnlyTestPassword12345678909876543210"),
   /ROLE_ALREADY_EXISTS_DO_NOT_REINSTALL/
  );
 }finally{await admin.end()}
 const u=new URL(adminURL);
 u.username=ROLE;
 u.password="CIOnlyTestPassword12345678909876543210";
 const url=u.toString();
 const record=await readP5RetentionMetadataReadOnly({
  url,expectedRole:ROLE
 });
 assert.equal(record.restrictedReaderVerified,true);
 assert.equal(record.objectDeletions,0);
 const check=new pg.Client({connectionString:url});
 await check.connect();
 try{
  const cols=await check.query(
   "SELECT count(*),max(expires_at_utc),max(deletion_verified_at_utc),"+
   "max(content_class),max(storage_kind),max(retention_hours) "+
   "FROM clean.provider_content_blob_ref"
  );
  assert.equal(cols.rowCount,1);
  for(const sql of [
   "SELECT object_name FROM clean.provider_content_blob_ref LIMIT 1",
   "SELECT content_sha256 FROM clean.provider_content_blob_ref LIMIT 1",
   "SELECT source_record_id FROM clean.provider_content_blob_ref LIMIT 1",
   "SELECT * FROM clean.provider_content_blob_ref LIMIT 1",
   "UPDATE clean.provider_content_blob_ref SET retention_hours=1"
  ]){
   await assert.rejects(check.query(sql),e=>e.code==="42501");
  }
 }finally{await check.end()}
});
