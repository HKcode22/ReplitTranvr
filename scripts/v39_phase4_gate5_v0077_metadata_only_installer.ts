/**
 * Phase4 Gate5 V0077 original-to-physical-reservation schema installer.
 *
 * DDL-only: no flight content, FIDS GET, PRE/POST, subscription, role GRANT
 * or gate-science authorization. Unlike V0076, this is only a NEW table and
 * two trigger functions; no application boot autoload. Once installed it
 * enables a later separately reviewed source owner to bind an actual original.
 *
 * Must run only by a privileged operator using an EXACT blob, distinct
 * restricted runtime DB role and a single SERIALIZABLE transaction.
 * Never install if V0076 missing, partial prior V0077 installation, default
 * grants leak access to worker, or application cannot access base schema.
 */
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import pg from "pg";

export const P4_G5_V0077_FILE_V39=
 "migrations/staged/V0077__phase4_gate5_original_fids_reservation_binding_v39.sql";
export const P4_G5_V0077_REVIEWED_BLOB_V39=
 "6783468fccf32de571e7ea77671db7370d9d87a4";
export const P4_G5_V0077_OPERATOR_INTENT_V39=
 "V0077_ONE_TIME_EMPTY_METADATA_SCHEMA_NO_GRANTS_OR_PROVIDER";
type Catalog={
 db_name:string;db_role:string;server_version:number;read_only:boolean;
 clean_schema:boolean;can_use:boolean;can_create:boolean;
 v0076_budget:boolean;v0076_owner:boolean;v0076_query:boolean;
 v0076_attempt:boolean;v0076_reserve:boolean;original_source:boolean;
 v0077_table:boolean;v0077_trigger_check:boolean;v0077_immutable:boolean;
};
const CATALOG_SQL=[
 "SELECT current_database() AS db_name,current_user AS db_role,",
 "current_setting('server_version_num')::int AS server_version,",
 "current_setting('transaction_read_only')='on' AS read_only,",
 "to_regnamespace('clean') IS NOT NULL AS clean_schema,",
 "has_schema_privilege(current_user,'clean','USAGE') AS can_use,",
 "has_schema_privilege(current_user,'clean','CREATE') AS can_create,",
 "to_regclass('clean.phase4_g5_fids_cohort_budget_v39') IS NOT NULL AS v0076_budget,",
 "to_regclass('clean.phase4_g5_fids_physical_owner_v39') IS NOT NULL AS v0076_owner,",
 "to_regclass('clean.phase4_g5_fids_allowed_query_v39') IS NOT NULL AS v0076_query,",
 "to_regclass('clean.phase4_g5_fids_physical_attempt_v39') IS NOT NULL AS v0076_attempt,",
 "to_regprocedure('clean.reserve_phase4_g5_fids_physical_attempt_v39(text,text,text,text,integer,text)') IS NOT NULL AS v0076_reserve,",
 "to_regclass('clean.fids_query_response') IS NOT NULL AS original_source,",
 "to_regclass('clean.phase4_g5_fids_original_binding_v39') IS NOT NULL AS v0077_table,",
 "to_regprocedure('clean.phase4_g5_check_original_binding_v39()') IS NOT NULL AS v0077_trigger_check,",
 "to_regprocedure('clean.phase4_g5_original_binding_immutable_update_v39()') IS NOT NULL AS v0077_immutable"
].join(" ");
export function assertP4G5V0077ReviewedSqlV39(bytes:string,blob:string){
 if(blob!==P4_G5_V0077_REVIEWED_BLOB_V39||
    typeof bytes!=="string"||bytes.length<5500||bytes.length>8500||
    !bytes.startsWith("-- V0077 STAGED ONLY, not auto-applied")||
    !bytes.includes("CREATE TABLE clean.phase4_g5_fids_original_binding_v39 (")||
    !bytes.includes("CREATE TRIGGER phase4_g5_fids_original_binding_ins_v39")||
    !bytes.includes("CREATE TRIGGER phase4_g5_fids_original_binding_update_v39")||
    !bytes.includes("REVOKE ALL ON clean.phase4_g5_fids_original_binding_v39 FROM PUBLIC")||
    !bytes.includes("REVOKE EXECUTE ON FUNCTION clean.phase4_g5_check_original_binding_v39()")||
    !bytes.includes("REVOKE EXECUTE ON FUNCTION clean.phase4_g5_original_binding_immutable_update_v39()")||
    /\bGRANT\s+(?:ALL|EXECUTE|INSERT|UPDATE|DELETE|SELECT)\b/i.test(bytes)||
    /\bDROP\s+(?:TABLE|SCHEMA|FUNCTION|DATABASE)\b/i.test(bytes)||
    /\bTRUNCATE\b/i.test(bytes)||
    /\bALTER\s+(?:ROLE|DEFAULT PRIVILEGES|TABLE clean\.flight_population)\b/i.test(bytes))
  throw Error("P4_G5_V0077_UNREVIEWED_SQL_SOURCE_HOLD");
}
export function assertP4G5V0077InstallerIntentV39(env:NodeJS.ProcessEnv){
 if(env.V39_GATE5_V0077_INSTALL_INTENT!==
      P4_G5_V0077_OPERATOR_INTENT_V39||
    env.V39_GATE5_V0077_EXPECTED_BLOB!==
      P4_G5_V0077_REVIEWED_BLOB_V39||
    env.V39_PHASE6_PROCESS_ARMED==="1"||
    env.ADB_AUTO_COLLECT==="1")
  throw Error("P4_G5_V0077_OPERATOR_INTENT_OR_LIVE_COLLECTION_HOLD");
}
export function assessP4G5V0077CatalogV39(priv:Catalog,worker:Catalog){
 for(const c of [priv,worker]){
  if(!c||c.server_version<160000||!c.read_only||
    !c.db_name||!c.db_role||!c.clean_schema||!c.can_use||
    !c.v0076_budget||!c.v0076_owner||!c.v0076_query||
    !c.v0076_attempt||!c.v0076_reserve||!c.original_source)
   throw Error("P4_G5_V0077_PG16_PARENT_V0076_SCHEMA_HOLD");
  if(c.v0077_table||c.v0077_trigger_check||c.v0077_immutable)
   throw Error("P4_G5_V0077_ALREADY_OR_PARTIALLY_INSTALLED_HOLD");
 }
 if(priv.db_name!==worker.db_name||priv.db_role===worker.db_role||
    !priv.can_create||worker.can_create)
  throw Error("P4_G5_V0077_DISTINCT_PRIVILEGED_RESTRICTED_ROLES_HOLD");
 return {status:"READY_FOR_PRIVATE_V0077_SCHEMA_METADATA_ONLY" as const,
         providerCalls:0 as const,sourceContentWrites:0 as const};
}
async function catalog(client:pg.Client):Promise<Catalog>{
 await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
 try{
  const r=await client.query(CATALOG_SQL);
  if(r.rows.length!==1)throw Error("P4_G5_V0077_CATALOG_SHAPE");
  await client.query("ROLLBACK");
  return r.rows[0] as Catalog;
 }catch(e){
  await client.query("ROLLBACK").catch(()=>undefined);
  throw e;
 }
}
const POST_INSTALL_SQL=[
 "SELECT",
 "(SELECT count(*)::int FROM clean.phase4_g5_fids_original_binding_v39) AS row_count,",
 "has_table_privilege($1::name,'clean.phase4_g5_fids_original_binding_v39','INSERT') AS worker_insert,",
 "has_table_privilege($1::name,'clean.phase4_g5_fids_original_binding_v39','UPDATE') AS worker_update,",
 "has_table_privilege($1::name,'clean.phase4_g5_fids_original_binding_v39','DELETE') AS worker_delete,",
 "has_table_privilege($1::name,'clean.phase4_g5_fids_original_binding_v39','SELECT') AS worker_select,",
 "has_function_privilege($1::name,'clean.phase4_g5_check_original_binding_v39()','EXECUTE') AS worker_check_execute,",
 "has_function_privilege($1::name,'clean.phase4_g5_original_binding_immutable_update_v39()','EXECUTE') AS worker_update_execute"
].join(" ");
export async function installP4G5V0077PrivateMetadataV39(){
 assertP4G5V0077InstallerIntentV39(process.env);
 const blob=execFileSync("git",["rev-parse","HEAD:"+P4_G5_V0077_FILE_V39],
  {encoding:"utf8"}).trim();
 const bytes=readFileSync(P4_G5_V0077_FILE_V39,"utf8");
 assertP4G5V0077ReviewedSqlV39(bytes,blob);
 const adminUrl=process.env.DATABASE_URL,
       workerUrl=process.env.V39_DATABASE_RUNTIME_URL;
 if(!adminUrl||!workerUrl||adminUrl===workerUrl)
  throw Error("P4_G5_V0077_DISTINCT_DATABASE_URLS_REQUIRED");
 const config={
  connectionTimeoutMillis:8000,query_timeout:15000,
  application_name:"phase4_gate5_v0077_private_schema_only"
 };
 const admin=new pg.Client({...config,connectionString:adminUrl});
 const worker=new pg.Client({...config,connectionString:workerUrl,
  options:"-c default_transaction_read_only=on"});
 let adminReady=false,workerReady=false,tx=false;
 // Fixed stage labels carry no user info, DB details or SQL query text.
 // Needed because the prior entrypoint suppressed every non-SQLSTATE error.
 let stage="CONNECT_RESTRICTED_RUNTIME";
 try{
  await worker.connect();workerReady=true;
  stage="CONNECT_PRIVILEGED";
  await admin.connect();adminReady=true;
  stage="READ_RUNTIME_PARENT_CATALOG";
  const cw=await catalog(worker);
  stage="READ_PRIVILEGED_PARENT_CATALOG";
  const ca=await catalog(admin);
  stage="REVIEW_PRIVILEGED_RESTRICTED_ROLES";
  assessP4G5V0077CatalogV39(ca,cw);
  stage="BEGIN_SERIALIZABLE_PRIVATE_DDL";
  await admin.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  tx=true;
  stage="SET_DDL_TIMEOUTS";
  await admin.query("SET LOCAL statement_timeout='15000ms'");
  await admin.query("SET LOCAL lock_timeout='2000ms'");
  stage="LOCK_METADATA_SCHEMA";
  await admin.query("SELECT pg_advisory_xact_lock(77,39)");
  stage="RECHECK_V0077_NOT_PRESENT";
  const before=await admin.query(CATALOG_SQL);
  const c=before.rows[0] as Catalog;
  if(!c||c.v0077_table||c.v0077_trigger_check||c.v0077_immutable)
   throw Error("P4_G5_V0077_CONCURRENT_SCHEMA_CHANGE_HOLD");
  stage="APPLY_EXACT_PINNED_V0077_METADATA_DDL";
  await admin.query(bytes);
  stage="VERIFY_NO_RUNTIME_V0077_GRANTS";
  const after=await admin.query(POST_INSTALL_SQL,[cw.db_role]);
  if(after.rows.length!==1)throw Error("P4_G5_V0077_NEW_SCHEMA_QUERY_SHAPE_HOLD");
  const r=after.rows[0] as Record<string,unknown>;
  if(r.row_count!==0||r.worker_insert!==false||r.worker_update!==false||
     r.worker_delete!==false||r.worker_select!==false||
     r.worker_check_execute!==false||r.worker_update_execute!==false)
   throw Error("P4_G5_V0077_RUNTIME_DEFAULT_PRIVILEGE_LEAK_HOLD");
  stage="COMMIT_PRIVATE_METADATA_DDL";
  await admin.query("COMMIT");tx=false;
  console.log(JSON.stringify({
   status:"V0077_PRIVATE_EMPTY_METADATA_ONLY_INSTALLED",
   reviewedGitBlob:blob,
   metadataTables:1,originalBindingRows:0,
   runtimeRoleGrantsAdded:false,
   paidProviderCalls:0,originalContentWrites:0,
   futureOwnerActivated:false,
   selectedTAndRetentionRightsNotYetCertified:true,
   gate5ScientificPass:false,phase5FreezeAuthorized:false,
   phase6Authorized:false
  }));
 }catch(e){
  // Never expose raw Error.message, database identifiers, URLs or SQL detail.
  // This stage is a fixed source-code label, not external input. COMMIT
  // exceptions require an independent read-only catalog check; do NOT
  // assume a rollback undid a transaction that may already have committed.
  console.error("P4_G5_V0077_INSTALL_STAGE_"+stage+"_HOLD");
  if(tx)await admin.query("ROLLBACK").catch(()=>undefined);
  throw e;
 }finally{
  if(adminReady)await admin.end().catch(()=>undefined);
  if(workerReady)await worker.end().catch(()=>undefined);
 }
}
export function safeP4G5V0077InstallFailureReasonV39(e:unknown){
 const message=e instanceof Error?e.message:"";
 const code=e&&typeof e==="object"?(e as {code?:unknown}).code:null;
 // Only fixed, internal refusal labels; never echo a PostgreSQL DETAIL,
 // connection URL, role name, thrown error message or provider body.
 if(/^P4_G5_V0077_[A-Z0-9_]{1,110}_HOLD$/.test(message))
  return message;
 if(typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code))
  return "P4_G5_V0077_INSTALL_HOLD_SQLSTATE_"+code;
 return "P4_G5_V0077_INSTALL_UNCLASSIFIED_HOLD";
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_v0077_metadata_only_installer.ts"))
 void installP4G5V0077PrivateMetadataV39().catch(e=>{
  console.error(safeP4G5V0077InstallFailureReasonV39(e));
  process.exitCode=2;
 });
