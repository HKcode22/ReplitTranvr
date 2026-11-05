/**
 * One-time, manually reviewed, narrowly restricted independent Gate5 G5A
 * Nov7 metadata auditor. A NEW secret, not an overwrite of Gate05 legacy.
 * Does NOT call AeroDataBox, run source collection, read raw flight payload,
 * modify scientific ledgers or backfill any PRE/POST evidence.
 */
import pg from "pg";
import {randomBytes} from "node:crypto";
import {execFileSync,spawnSync} from "node:child_process";

const REPO="HKcode22/ReplitTranvr";
const ROLE="p4_g5_g5a_nov07_readonly_20261105";
const SECRET="P4_G5_G5A_NOV07_AUDIT_DATABASE_URL";
const INTENT="ONE_NOV07_INDEPENDENT_AUDITOR_NO_PROVIDER_NEW_SECRET";
const EXPIRY="2026-11-12 00:00:00+00";
const HEAD=/^[a-f0-9]{40}$/;
const TABLES=[
 "clean.phase4_g5_fids_physical_owner_v39",
 "clean.phase4_g5_fids_allowed_query_v39",
 "clean.phase4_g5_fids_physical_attempt_v39",
 "clean.phase4_g5_fids_original_binding_v39",
 "clean.fids_query_response",
 "clean.flight_population",
 "clean.flight_snapshots",
 "clean.phase4_g5_fids_cohort_budget_v39",
 "clean.adb_rest_attempt_ledger"
] as const;
function hold(code:string):never{
 throw Error("G5A_INDEPENDENT_READER_"+code+"_HOLD");
}
function qident(v:string){
 if(!/^[a-z][a-z0-9_]{2,120}$/.test(v))hold("INVALID_IDENTIFIER");
 return '"'+v+'"';
}
function url(value:string|undefined){
 if(!value||!/^postgres(?:ql)?:\/\//.test(value)||value.length>3000)
  hold("DATABASE_URL_INVALID");
 return value;
}
function client(uri:string,app:string){
 return new pg.Client({connectionString:uri,application_name:app,
  connectionTimeoutMillis:9000,query_timeout:13000});
}
function gh(args:string[],input?:string){
 const x=spawnSync("gh",args,{input,encoding:"utf8",timeout:25000,
  stdio:["pipe","pipe","pipe"]});
 return !x.error&&x.status===0;
}
function auditorUri(adminUri:string,password:string){
 const u=new URL(adminUri);
 u.username=encodeURIComponent(ROLE);
 u.password=encodeURIComponent(password);
 return u.toString();
}
async function verifyNewReader(uri:string,expectedDb:string){
 const reader=client(uri,"g5a_nov07_verify_no_provider_read_only_role");
 await reader.connect();
 try{
  await reader.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const r=await reader.query(
   "SELECT current_database() AS db,current_user AS username,"+
   "(SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls "+
   "FROM pg_roles WHERE rolname=current_user) AS elevated,"+
   "has_schema_privilege(current_user,'clean','CREATE') AS schema_ddl,"+
   "has_database_privilege(current_user,current_database(),'CREATE') AS db_ddl,"+
   "current_setting('transaction_read_only')='on' AS readonly");
  const x=r.rows[0];
  if(r.rows.length!==1||x.db!==expectedDb||x.username!==ROLE||
     x.elevated!==false||x.schema_ddl!==false||x.db_ddl!==false||
     x.readonly!==true)hold("POSTCOMMIT_ROLE_NOT_READONLY");
  for(const table of TABLES){
   const t=await reader.query(
    "SELECT has_table_privilege(current_user,$1,'SELECT') AS read,"+
    "has_table_privilege(current_user,$1,'INSERT') AS ins,"+
    "has_table_privilege(current_user,$1,'UPDATE') AS upd,"+
    "has_table_privilege(current_user,$1,'DELETE') AS del,"+
    "has_table_privilege(current_user,$1,'TRUNCATE') AS trunc",
    [table]);
   const z=t.rows[0];
   if(t.rows.length!==1||z.read!==true||z.ins!==false||
      z.upd!==false||z.del!==false||z.trunc!==false)
    hold("POSTCOMMIT_TABLE_PRIVILEGE_SCOPE");
  }
  // No flight rows or identities are printed. One bounded SELECT verifies
  // actual ACL query operation; not a simulated has_table_privilege only.
  await reader.query(
   "SELECT 1 FROM clean.phase4_g5_fids_original_binding_v39 LIMIT 1");
  await reader.query("ROLLBACK");
 }finally{await reader.end().catch(()=>undefined)}
}
export async function main(){
 const e=process.env;
 const sha=execFileSync("git",["rev-parse","HEAD"],
  {encoding:"utf8",timeout:4000}).trim();
 if(!HEAD.test(sha)||e.P4_G5_REVIEWED_MAIN_SHA!==sha||
    e.P4_G5_G5A_NOV07_AUDITOR_INTENT!==INTENT||
    e.GITHUB_ACTIONS==="true"||e.ADB_AUTO_COLLECT!=="0"||
    e.V39_PHASE6_PROCESS_ARMED!=="0"||
    !e.DATABASE_URL||!e.V39_DATABASE_RUNTIME_URL||
    e.DATABASE_URL===e.V39_DATABASE_RUNTIME_URL)
  hold("EXPLICIT_PINNED_OPERATOR_CONTEXT");
 if(!gh(["--version"])||!gh(["auth","status","--hostname","github.com"]))
  hold("GITHUB_AUTH_REQUIRED_BEFORE_DB_WRITE");
 const admin=client(url(e.DATABASE_URL),"g5a_nov07_create_independent_reader");
 const runtime=client(url(e.V39_DATABASE_RUNTIME_URL),"g5a_nov07_runtime_role_readonly_check");
 await admin.connect();await runtime.connect();
 let tx=false,commitAttempted=false,committed=false;
 try{
  const a=await admin.query(
   "SELECT current_database() db,current_user who,"+
   "(SELECT rolcreaterole OR rolsuper FROM pg_roles WHERE rolname=current_user) AS can_create_role,"+
   "(current_setting('server_version_num')::int>=160000) AS pg16");
  const b=await runtime.query(
   "SELECT current_database() db,current_user who,"+
   "has_schema_privilege(current_user,'clean','CREATE') AS schema_ddl");
  if(a.rows.length!==1||b.rows.length!==1||
     a.rows[0].db!==b.rows[0].db||a.rows[0].who===b.rows[0].who||
     a.rows[0].can_create_role!==true||a.rows[0].pg16!==true||
     b.rows[0].schema_ddl!==false)
   hold("ADMIN_RUNTIME_SEPARATION");
  const dbname=String(a.rows[0].db);
  // Refuse any broad PUBLIC CREATE rights before creating new auditor role.
  const pub=await admin.query(
   "SELECT EXISTS(SELECT 1 FROM pg_namespace n CROSS JOIN LATERAL "+
   "aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) v "+
   "WHERE n.nspname='clean' AND v.grantee=0 AND v.privilege_type='CREATE') AS schema_create,"+
   "EXISTS(SELECT 1 FROM pg_database d CROSS JOIN LATERAL "+
   "aclexplode(COALESCE(d.datacl,acldefault('d',d.datdba))) v "+
   "WHERE d.datname=current_database() AND v.grantee=0 AND "+
   "v.privilege_type='CREATE') AS db_create");
  if(pub.rows.length!==1||pub.rows[0].schema_create!==false||
     pub.rows[0].db_create!==false)
   hold("PUBLIC_CREATE_PRIVILEGE_NOT_SCOPED");
  const before=await admin.query("SELECT 1 FROM pg_roles WHERE rolname=$1",[ROLE]);
  if(before.rows.length!==0)hold("ROLE_ALREADY_EXISTS_DO_NOT_ROTATE");
  for(const table of TABLES){
   const x=await admin.query("SELECT to_regclass($1::text) AS rel",[table]);
   if(x.rows.length!==1||!x.rows[0].rel)hold("REQUIRED_AUDIT_TABLE_ABSENT");
  }
  const password=randomBytes(36).toString("base64url");
  const newUri=auditorUri(url(e.DATABASE_URL),password);
  await admin.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  tx=true;
  await admin.query("SET LOCAL statement_timeout='13000ms'");
  await admin.query("SET LOCAL lock_timeout='2000ms'");
  const lock=await admin.query("SELECT pg_try_advisory_xact_lock(76,101) AS got");
  if(lock.rows[0]?.got!==true)hold("CONCURRENT_INDEPENDENT_READER_SETUP");
  const again=await admin.query("SELECT 1 FROM pg_roles WHERE rolname=$1",[ROLE]);
  if(again.rows.length!==0)hold("ROLE_ALREADY_EXISTS_INSIDE_TX");
  await admin.query("CREATE ROLE "+qident(ROLE)+
   " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS"+
   " PASSWORD '"+password+"' VALID UNTIL '"+EXPIRY+"'");
  await admin.query("GRANT CONNECT ON DATABASE "+qident(dbname)+" TO "+qident(ROLE));
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+qident(ROLE));
  for(const table of TABLES)
   await admin.query("GRANT SELECT ON TABLE "+table+" TO "+qident(ROLE));
  commitAttempted=true;
  await admin.query("COMMIT");tx=false;committed=true;
  await verifyNewReader(newUri,dbname);
  if(!gh(["secret","set",SECRET,"--repo",REPO,"--env","phase2g-paid"],newUri))
   hold("ROLE_COMMITTED_GITHUB_SECRET_NOT_UPLOADED");
  console.log(JSON.stringify({
   status:"G5A_NOV07_INDEPENDENT_AUDIT_READER_LEAST_PRIVILEGE_INSTALLED",
   distinctNewSecretPublished:true,existingAuditSecretUntouched:true,
   tableSelectCount:TABLES.length,tableWritePrivilegesZero:true,
   noSchemaOrDatabaseCreate:true,readerCredentialExpiresAtUtc:"2026-11-12T00:00:00.000Z",
   providerCalls:0,flightDataWrites:0,scientificGate5Passed:false
  }));
 }catch(ex){
  if(tx)await admin.query("ROLLBACK").catch(()=>undefined);
  if(commitAttempted&&!committed)
   hold("COMMIT_AMBIGUOUS_READONLY_INSPECT_BEFORE_RETRY");
  if(committed)hold("ROLE_COMMITTED_OPERATOR_DIAGNOSE_NO_RETRY");
  throw ex;
 }finally{
  await runtime.end().catch(()=>undefined);
  await admin.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_g5a_nov07_independent_reader_once.ts"))
 void main().catch(ex=>{
  const msg=ex instanceof Error?ex.message:"";
  const safe=/^G5A_INDEPENDENT_READER_[A-Z0-9_]+_HOLD$/.test(msg)?
   msg:"G5A_INDEPENDENT_READER_UNKNOWN_REDACTED_HOLD";
  console.error(safe);
  process.exitCode=2;
 });
