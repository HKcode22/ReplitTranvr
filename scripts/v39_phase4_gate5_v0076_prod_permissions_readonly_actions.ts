/**
 * Gate5 V0076 production permissions and object-collision preflight.
 * A strictly READ ONLY metadata query using the existing protected runtime
 * connection. NO schema install, role grant, provider GET or source-data read.
 *
 * This does not replace reviewed owner/terms/source admission. CREATE
 * privilege may be technically present even while PAID SOURCE IS HELD.
 */
import pg from "pg";
import {execFileSync} from "node:child_process";
const WORKFLOW="Phase4 Gate5 V0076 Production Permissions READ ONLY";
const REF="HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-v0076-production-permissions-readonly.yml@refs/heads/main";
export const P4_G5_V0076_PERMISSION_SQL=[
 "SELECT",
 "to_regnamespace('clean') IS NOT NULL AS clean_schema_exists,",
 "has_schema_privilege(current_user,'clean','USAGE') AS schema_usage,",
 "has_schema_privilege(current_user,'clean','CREATE') AS schema_create,",
 "has_database_privilege(current_user,current_database(),'CREATE')",
 "AS database_create,",
 "to_regclass('clean.phase4_g5_fids_cohort_budget_v39') IS NOT NULL",
 "AS cohort_budget_exists,",
 "to_regclass('clean.phase4_g5_fids_physical_owner_v39') IS NOT NULL",
 "AS owner_exists,",
 "to_regclass('clean.phase4_g5_fids_allowed_query_v39') IS NOT NULL",
 "AS query_exists,",
 "to_regclass('clean.phase4_g5_fids_physical_attempt_v39') IS NOT NULL",
 "AS attempt_exists,",
 "to_regprocedure(",
 "'clean.reserve_phase4_g5_fids_physical_attempt_v39(text,text,text,text,integer,text)')",
 "IS NOT NULL AS reserve_function_exists,",
 "current_setting('transaction_read_only')='on' AS transaction_is_readonly"
].join(" ");
export function assertP4G5V0076PermissionsGitHub(
 e:NodeJS.ProcessEnv,checkout:string
){
 if(e.GITHUB_ACTIONS!=="true"||
    e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    e.GITHUB_REF!=="refs/heads/main"||
    e.GITHUB_EVENT_NAME!=="push"||
    e.GITHUB_RUN_ATTEMPT!=="1"||
    e.GITHUB_JOB!=="v0076-readonly-permission"||
    e.GITHUB_WORKFLOW!==WORKFLOW||
    e.GITHUB_WORKFLOW_REF!==REF||
    !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA??"")||
    checkout!==e.GITHUB_SHA||
    e.P4_G5_V0076_PROBE_INTENT!=="METADATA_ONLY_READONLY"||
    !!e.AERODATABOX_API_KEY||
    !!e.RAPIDAPI_KEY||
    !!e.DATABASE_URL||
    !!e.GATE05_AUTOMATION_DATABASE_URL)
  throw Error("P4_G5_V0076_READONLY_JOB_CONTEXT_HOLD");
}
export interface P4G5V0076PermissionFacts{
 clean_schema_exists:boolean;schema_usage:boolean;schema_create:boolean;
 database_create:boolean;cohort_budget_exists:boolean;owner_exists:boolean;
 query_exists:boolean;attempt_exists:boolean;
 reserve_function_exists:boolean;transaction_is_readonly:boolean;
}
export function assessP4G5V0076PermissionFacts(f:P4G5V0076PermissionFacts){
 if(!f||Object.values(f).length!==10||
    Object.values(f).some(x=>typeof x!=="boolean"))
  throw Error("P4_G5_V0076_PERMISSION_QUERY_SHAPE_HOLD");
 if(!f.transaction_is_readonly)
  throw Error("P4_G5_V0076_PROBE_NOT_READ_ONLY_HOLD");
 const objects=[f.cohort_budget_exists,f.owner_exists,f.query_exists,
   f.attempt_exists,f.reserve_function_exists];
 const existing=objects.filter(Boolean).length;
 return {
  schema:"v39.phase4.gate5-v0076-live-permission-readonly.v1" as const,
  status:existing===0
   ?f.clean_schema_exists&&f.schema_create
     ?"V0076_OBJECTS_ABSENT_RUNTIME_CAN_CREATE_REVIEW_REQUIRED"
     :"V0076_OBJECTS_ABSENT_RUNTIME_LACKS_SCHEMA_CREATE"
   :existing===5?"V0076_OBJECTS_ALREADY_EXIST_NEEDS_VERSION_AUDIT"
    :"V0076_PARTIAL_OBJECTS_FOUND_HOLD_MANUAL_RECONCILIATION",
  cleanSchemaExists:f.clean_schema_exists,
  canUseCleanSchema:f.schema_usage,
  canCreateWithinCleanSchema:f.schema_create,
  hasDatabaseCreatePrivilege:f.database_create,
  v0076ObjectsObserved:existing,
  sourceNativeTCertified:false as const,
  sourceContentRightsCertified:false as const,
  selectedTActualOnlyWheelsOffCertified:false as const,
  productionV0076InstalledByThisJob:false as const,
  productionRoleGrantedByThisJob:false as const,
  paidSourceOwnerArmed:false as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  strictGate5Passed:false as const,phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const
 };
}
export async function mainP4G5V0076PermissionsReadOnly(){
 const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
 assertP4G5V0076PermissionsGitHub(process.env,sha);
 const url=process.env.V39_DATABASE_RUNTIME_URL;
 if(!url)throw Error("P4_G5_V0076_RUNTIME_DB_SECRET_MISSING");
 const c=new pg.Client({
  connectionString:url,
  application_name:"phase4_gate5_v0076_permission_probe_readonly",
  connectionTimeoutMillis:9000,query_timeout:12000,
  options:"-c default_transaction_read_only=on"
 });
 let connected=false,tx=false;
 try{
  await c.connect();connected=true;
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='10000ms'");
  await c.query("SET LOCAL lock_timeout='1000ms'");
  const x=await c.query(P4_G5_V0076_PERMISSION_SQL);
  if(x.rows.length!==1)throw Error("P4_G5_V0076_SCHEMA_RESULT_INVALID");
  console.log(JSON.stringify(assessP4G5V0076PermissionFacts(
    x.rows[0] as P4G5V0076PermissionFacts
  )));
  console.log("P4_G5_V0076_PRODUCTION_DB_PERMISSIONS_READONLY_DONE_NO_INSTALL");
 }finally{
  if(tx)await c.query("ROLLBACK").catch(()=>undefined);
  if(connected)await c.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_v0076_prod_permissions_readonly_actions.ts"))
 void mainP4G5V0076PermissionsReadOnly().catch(err=>{
  const code=err&&typeof err==="object"?(err as {code?:unknown}).code:null;
  console.error(typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code)?
   "P4_G5_V0076_PROD_READONLY_HOLD_SQLSTATE_"+code:
   "P4_G5_V0076_PROD_READONLY_HOLD_NO_PROVIDER");
  process.exitCode=2;
 });
