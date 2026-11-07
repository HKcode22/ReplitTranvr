/**
 * Stage23: exactly V0079→V0080→V0081 EMPTY SCHEMA commissioning.
 * This is a PERSISTENT DATABASE DDL change, not a Phase5 scientific PASS.
 * Owner must explicitly run the reviewed, commit/blob-pinned one-shot command.
 * No AeroDataBox transport, subscription or PRE writer is imported or called.
 */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {createHash} from "node:crypto";
import pg from "pg";
const {Pool}=pg;

const PERMIT="INSTALL_EMPTY_V0079_V0080_V0081_NO_PROVIDER_CALLS";
const LOCAL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const MIGRATIONS=[
 ["V0079__phase5_fids_31day_physical_attempt_and_original_binding_v39.sql","fa6f4275f773dfe36f591eb0259063aafe7ecd0c"],
 ["V0080__phase5_bind_actual_github_run_id_before_fids_get_v39.sql","bcdb0e8d77a0684e495467d20fdd0fb83c686c0e"],
 ["V0081__phase5_t24_separate_transaction_postcommit_witness_v39.sql","1ee6fa7f1582ec775002c1157f4b815cfe342015"]
];
const TABLES=["phase5_fids_cycle_budget_v39","phase5_fids_day_budget_v39",
 "phase5_fids_utc_charge_budget_v39","phase5_fids_allowed_query_v39",
 "phase5_fids_physical_attempt_v39","phase5_fids_original_binding_v39",
 "phase5_fids_github_prearm_v39","phase5_t24_postcommit_witness_v39"];
const FUNCTIONS=["phase5_fids_attempt_immutable_v39","reserve_phase5_fids_physical_get_v39",
 "phase5_fids_check_original_v39","phase5_fids_original_immutable_v39",
 "phase5_fids_prearm_immutable_v39","prearm_phase5_fids_github_query_v39",
 "phase5_fids_require_actual_prearm_v39","phase5_t24_witness_before_insert_v39",
 "phase5_t24_witness_immutable_v39"];
const REQ={
 adb_phase6_calendar_day:["run_day_index","scheduled_start_utc","calendar_hash","config_hash","frame_hash"],
 adb_sampling_draw:["run_day_index","slot_id","selected_icao","selected_at_utc"],
 fids_query_response:["population_query_id","source_airport_icao","available_at","response_hash","raw_payload"],
 flight_population:["population_query_id","analytic_identity_id","canonical_flight_instance_id","available_at"],
 flight_snapshots:["id","flight_instance_id","horizon","prediction_state","prediction_cutoff_utc"]
};
const deny=s=>{throw Error("REFUSED_P5_STAGE23_"+s);};
function admit(e){
 if(e.P5_STAGE23_SCHEMA_ONLY_ONCE!==PERMIT||
    !e.DATABASE_URL||e.ADB_AUTO_COLLECT!=="0"||
    e.V39_PHASE6_PROCESS_ARMED!=="0"||
    !/^\/tmp\/p5-stage23-[A-Za-z0-9]{6,12}$/.test(e.P5_STAGE23_MIGRATION_DIR??""))
  deny("EXPLICIT_OWNER_SCHEMA_APPROVAL_OR_PATH_MISSING");
 if(e.GITHUB_ACTIONS==="true"){
  if(e.DATABASE_URL!==LOCAL||e.V39_DATABASE_RUNTIME_URL!==LOCAL)
    deny("CI_NOT_DISPOSABLE_LOCAL_PG16");
 }else if(e.V39_DATABASE_RUNTIME_URL&&e.DATABASE_URL===e.V39_DATABASE_RUNTIME_URL)
  deny("PRODUCTION_RUNTIME_ROLE_CANNOT_INSTALL_SCHEMA");
}
function file(path,blob){
 const bytes=readFileSync(path);
 const actual=createHash("sha1").update(Buffer.concat([
  Buffer.from("blob "+bytes.length+"\0"),bytes])).digest("hex");
 if(actual!==blob)deny("MIGRATION_GIT_BLOB_CHANGED");
 return bytes.toString("utf8");
}
const META=[
 "SELECT current_database() AS db,current_setting('server_version_num') AS ver,",
 "current_setting('transaction_read_only') AS ro,pg_is_in_recovery() AS replica,",
 "has_schema_privilege(current_user,'clean','CREATE') AS may_create,",
 "has_table_privilege(current_user,'clean.fids_query_response','REFERENCES') AS fids_ref,",
 "has_table_privilege(current_user,'clean.flight_snapshots','REFERENCES') AS pre_ref,",
 "pg_catalog.format_type(f.atttypid,f.atttypmod) AS fids_key_type,",
 "pg_catalog.format_type(s.atttypid,s.atttypmod) AS pre_key_type,",
 "EXISTS(SELECT 1 FROM pg_catalog.pg_constraint c",
 " WHERE c.conrelid='clean.fids_query_response'::regclass AND c.contype IN ('p','u')",
 " AND c.conkey=ARRAY[f.attnum]::int2[]) AS fids_unique,",
 "EXISTS(SELECT 1 FROM pg_catalog.pg_constraint c",
 " WHERE c.conrelid='clean.flight_snapshots'::regclass AND c.contype IN ('p','u')",
 " AND c.conkey=ARRAY[s.attnum]::int2[]) AS pre_unique",
 "FROM pg_catalog.pg_attribute f JOIN pg_catalog.pg_attribute s",
 " ON s.attrelid='clean.flight_snapshots'::regclass AND s.attname='id'",
 "WHERE f.attrelid='clean.fids_query_response'::regclass",
 " AND f.attname='population_query_id' AND f.attnum>0 AND s.attnum>0"
].join(" ");
const OBJECTS=[
 "SELECT (SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n",
 " ON n.oid=c.relnamespace WHERE n.nspname='clean' AND c.relname=ANY($1::text[])) AS relations,",
 "(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n",
 " ON n.oid=p.pronamespace WHERE n.nspname='clean' AND p.proname=ANY($2::text[])) AS helpers,",
 "(SELECT count(*)::int FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n",
 " ON n.oid=t.typnamespace WHERE n.nspname='clean' AND t.typname=ANY($3::text[])) AS composites"
].join(" ");
const PUBLIC_ACL=[
 "SELECT (SELECT count(*)::int FROM pg_catalog.pg_class c",
 " JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace",
 " CROSS JOIN LATERAL pg_catalog.aclexplode(",
 " COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a",
 " WHERE n.nspname='clean' AND c.relname=ANY($1::text[]) AND a.grantee=0) AS tables_public,",
 "(SELECT count(*)::int FROM pg_catalog.pg_proc p",
 " JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace",
 " CROSS JOIN LATERAL pg_catalog.aclexplode(",
 " COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a",
 " WHERE n.nspname='clean' AND p.proname=ANY($2::text[])",
 " AND a.grantee=0 AND a.privilege_type='EXECUTE') AS functions_public"
].join(" ");
async function objects(client,expect){
 const s=(await client.query(OBJECTS,[[...TABLES,"p5_allowed_source_day_v39"],
   FUNCTIONS,TABLES])).rows;
 if(s.length!==1||s[0].relations!==expect||
   s[0].helpers!==(expect===0?0:9)||
   s[0].composites!==(expect===0?0:8))
  deny("PARTIAL_DUPLICATE_OR_UNKNOWN_STAGED_OBJECTS");
}
async function acl(client){
 const q=(await client.query(PUBLIC_ACL,[TABLES,FUNCTIONS])).rows;
 if(q.length!==1||q[0].tables_public!==0||q[0].functions_public!==0)
  deny("PUBLIC_ROLE_STILL_HAS_STAGED_TABLE_OR_FUNCTION_ACCESS");
}
async function baseline(client){
 const names=Object.keys(REQ);
 const rows=(await client.query(
  "SELECT c.relname AS name,array_agg(a.attname::text ORDER BY a.attname::text)"+
  " FILTER(WHERE a.attnum>0 AND NOT a.attisdropped) AS cols"+
  " FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace"+
  " LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid"+
  " WHERE n.nspname='clean' AND c.relkind IN ('r','p')"+
  " AND c.relname=ANY($1::text[]) GROUP BY c.oid,c.relname",[names])).rows;
 if(rows.length!==5)deny("BASELINE_FIVE_TABLES_MISSING");
 const found=new Map(rows.map(r=>[r.name,new Set(r.cols)]));
 if(names.some(k=>!found.has(k)||REQ[k].some(col=>!found.get(k).has(col))))
  deny("BASELINE_CRITICAL_COLUMNS_MISSING");
}
export async function commissionPhase5EmptySchemaOnce(pool,env=process.env){
 admit(env);
 const files=MIGRATIONS.map(([name,sha])=>
  file(join(env.P5_STAGE23_MIGRATION_DIR,name),sha));
 const c=await pool.connect();let open=false,commitStarted=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");open=true;
  await c.query("SET LOCAL lock_timeout='2500ms'");
  await c.query("SET LOCAL statement_timeout='25000ms'");
  const advisory=(await c.query(
   "SELECT pg_try_advisory_xact_lock(hashtext('phase5-schema-commission'),"+
   "hashtext('v0079-v0081')) AS ok")).rows;
  if(advisory.length!==1||advisory[0].ok!==true)
   deny("ANOTHER_SCHEMA_COMMISSION_ACTIVE");
  const m=(await c.query(META)).rows;
  if(m.length!==1||m[0].db!=="neondb"||Number(m[0].ver)<160000||
    m[0].ro!=="off"||m[0].replica!==false||
    m[0].may_create!==true||m[0].fids_ref!==true||m[0].pre_ref!==true||
    m[0].fids_key_type!=="uuid"||m[0].pre_key_type!=="bigint"||
    m[0].fids_unique!==true||m[0].pre_unique!==true)
   deny("PG16_PARENT_TYPE_KEY_OR_PRIVILEGE_MISMATCH");
  await baseline(c);
  await objects(c,0);
  for(let i=0;i<files.length;i++){
   await c.query(files[i]);
   if(i===0&&env.GITHUB_ACTIONS==="true"&&
      env.P5_STAGE23_INJECT_ROLLBACK_AFTER_V0079==="1")
    deny("CI_INJECTED_ROLLBACK_AFTER_FIRST_MIGRATION");
  }
  // V0079/V0080 revoke PUBLIC EXECUTE themselves. V0081 needs tightening.
  await c.query("REVOKE EXECUTE ON FUNCTION "+
    "clean.phase5_t24_witness_before_insert_v39() FROM PUBLIC");
  await c.query("REVOKE EXECUTE ON FUNCTION "+
    "clean.phase5_t24_witness_immutable_v39() FROM PUBLIC");
  await objects(c,9);
  await acl(c);
  commitStarted=true;
  await c.query("COMMIT");open=false;
  // A new transaction must see the entire committed object set and ACL.
  await objects(c,9);
  await acl(c);
  return {status:"P5_EMPTY_V0079_80_81_SCHEMA_DURABLE_INERT",
   stagingFileBlobSha1:MIGRATIONS.map(x=>x[1]),
   expectedTables:8,expectedIndexRelations:1,expectedFunctions:9,
   publicTableAndHelperPrivileges:0,
   productionSchemaChanged:env.GITHUB_ACTIONS!=="true",
   producerSourceRoleGrants:0,flightRowsWritten:0,
   providerFidsGets:0,providerAlertCreates:0,
   sourceRightsCertified:false,perFlightPRECertified:false,
   phase5FreezePassed:false,phase6PaidGo:false};
 }catch(e){
  if(open&&!commitStarted)await c.query("ROLLBACK").catch(()=>{});
  if(commitStarted)deny("POST_COMMIT_UNKNOWN_QUARANTINE_NO_RETRY");
  throw e;
 }finally{c.release();}
}
async function main(){
 let pool;
 try{
  admit(process.env);
  pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,
   connectionTimeoutMillis:10000,idleTimeoutMillis:3000});
  console.log(JSON.stringify(await commissionPhase5EmptySchemaOnce(pool),null,2));
 }catch(e){
  const m=typeof e?.message==="string"&&
    /^REFUSED_P5_STAGE23_[A-Z0-9_]+$/.test(e.message)?
     e.message:"REFUSED_P5_STAGE23_DB_OR_UNEXPECTED_HOLD";
  // Never echo SQL error, DB URL, account details or flight Content.
  console.error(m);
  process.exitCode=2;
 }finally{await pool?.end().catch(()=>{});}
}
if(process.env.P5_STAGE23_SCHEMA_ONLY_ONCE)await main();
