/** Live Phase4 V0076 catalog verification: protected runtime role, READ ONLY. */
import pg from "pg";
import {execFileSync} from "node:child_process";
const REF="HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-v0076-postinstall-readonly.yml@refs/heads/main";
const WORKFLOW="Phase4 Gate5 V0076 Production Postinstall READ ONLY";
const TABLES=["phase4_g5_fids_cohort_budget_v39","phase4_g5_fids_physical_owner_v39","phase4_g5_fids_allowed_query_v39","phase4_g5_fids_physical_attempt_v39"];
const PROC="clean.reserve_phase4_g5_fids_physical_attempt_v39(text,text,text,text,integer,text)";
export const POSTINSTALL_SQL=[
 "WITH objects AS (SELECT c.oid,c.relpersistence,",
 "(has_table_privilege(current_user,c.oid,'SELECT') OR",
 "has_table_privilege(current_user,c.oid,'INSERT') OR",
 "has_table_privilege(current_user,c.oid,'UPDATE') OR",
 "has_table_privilege(current_user,c.oid,'DELETE') OR",
 "has_table_privilege(current_user,c.oid,'TRUNCATE')) AS granted",
 "FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace",
 "WHERE n.nspname='clean' AND c.relname=ANY($1::text[]) AND c.relkind='r'),",
 "fn AS (SELECT p.prosecdef,p.proconfig,",
 "EXISTS(SELECT 1 FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a",
 "WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS pub",
 "FROM pg_catalog.pg_proc p WHERE p.oid=to_regprocedure($2))",
 "SELECT current_setting('transaction_read_only')='on' AS ro,",
 "has_schema_privilege(current_user,'clean','USAGE') AS usage,",
 "has_schema_privilege(current_user,'clean','CREATE') AS schema_create,",
 "(SELECT count(*)::int FROM objects) AS tables,",
 "(SELECT count(*)::int FROM objects WHERE relpersistence='p') AS logged,",
 "(SELECT count(*)::int FROM objects WHERE granted) AS tables_granted,",
 "(SELECT count(*)::int FROM fn) AS funcs,",
 "coalesce((SELECT prosecdef FROM fn),false) AS security_definer,",
 "coalesce((SELECT EXISTS(SELECT 1 FROM unnest(proconfig) s",
 "WHERE replace(s,' ','')='search_path=pg_catalog,clean') FROM fn),false) AS safe_path,",
 "coalesce((SELECT pub FROM fn),true) AS public_execute,",
 "coalesce(has_function_privilege(current_user,to_regprocedure($2),'EXECUTE'),true) AS worker_execute,",
 "(SELECT count(*)::int FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid",
 "JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace",
 "WHERE n.nspname='clean' AND c.relname='phase4_g5_fids_physical_attempt_v39'",
 "AND t.tgname='phase4_g5_fids_attempt_immutable_v39' AND NOT t.tgisinternal",
 "AND t.tgenabled<>'D') AS triggers"
].join(" ");
export const RIGHTS_PROVENANCE_SQL=[
 "SELECT c.relname AS table_name,",
 "has_table_privilege(current_user,c.oid,'SELECT') AS can_select,",
 "has_table_privilege(current_user,c.oid,'INSERT') AS can_insert,",
 "has_table_privilege(current_user,c.oid,'UPDATE') AS can_update,",
 "has_table_privilege(current_user,c.oid,'DELETE') AS can_delete,",
 "has_table_privilege(current_user,c.oid,'TRUNCATE') AS can_truncate,",
 "has_table_privilege(current_user,c.oid,'REFERENCES') AS can_references,",
 "has_table_privilege(current_user,c.oid,'TRIGGER') AS can_trigger,",
 "pg_has_role(c.relowner,'USAGE') AS inherits_owner_role,",
 "pg_has_role('pg_read_all_data','USAGE') AS inherits_pg_read_all_data,",
 "pg_has_role('pg_write_all_data','USAGE') AS inherits_pg_write_all_data,",
 "EXISTS(SELECT 1 FROM pg_catalog.aclexplode(",
 "coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a",
 "WHERE a.grantee=current_user::regrole::oid",
 "AND a.privilege_type=ANY($2::text[])) AS explicit_current_role_acl,",
 "EXISTS(SELECT 1 FROM pg_catalog.aclexplode(",
 "coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a",
 "WHERE a.grantee=0 AND a.privilege_type=ANY($2::text[])) AS public_acl,",
 "EXISTS(SELECT 1 FROM pg_catalog.aclexplode(",
 "coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a",
 "WHERE a.grantee<>0 AND a.grantee<>current_user::regrole::oid",
 "AND pg_has_role(a.grantee,'USAGE')",
 "AND a.privilege_type=ANY($2::text[])) AS inherited_group_acl",
 "FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n",
 "ON n.oid=c.relnamespace",
 "WHERE n.nspname='clean' AND c.relname=ANY($1::text[]) AND c.relkind='r'",
 "ORDER BY c.relname"
].join(" ");
const TABLE_PRIVILEGES=["SELECT","INSERT","UPDATE","DELETE","TRUNCATE","REFERENCES","TRIGGER"];
export interface PostInstallFacts{
 ro:boolean;usage:boolean;schema_create:boolean;tables:number;logged:number;
 tables_granted:number;funcs:number;security_definer:boolean;safe_path:boolean;
 public_execute:boolean;worker_execute:boolean;triggers:number;
}
export function assessPostInstall(f:PostInstallFacts){
 if(!f||["ro","usage","schema_create","security_definer","safe_path",
 "public_execute","worker_execute"].some(k=>typeof (f as any)[k]!=="boolean")||
 ["tables","logged","tables_granted","funcs","triggers"].some(k=>
  !Number.isSafeInteger((f as any)[k])||(f as any)[k]<0))
  throw Error("P4_G5_V0076_BAD_CATALOG_HOLD");
 if(!f.ro||!f.usage||f.schema_create||f.tables!==4||f.logged!==4||
   f.tables_granted!==0||f.funcs!==1||!f.security_definer||!f.safe_path||
   f.public_execute||f.worker_execute||f.triggers!==1){
  // Safe audit-only facts: only already validated boolean and integer catalog fields.
  // Never print connection strings, usernames, query text, flight data or secrets.
  console.log(JSON.stringify({status:"P4_G5_V0076_RESTRICTED_CATALOG_FACTS_HOLD",
   ro:f.ro,usage:f.usage,schema_create:f.schema_create,
   tables:f.tables,logged:f.logged,tables_granted:f.tables_granted,
   funcs:f.funcs,security_definer:f.security_definer,safe_path:f.safe_path,
   public_execute:f.public_execute,worker_execute:f.worker_execute,
   triggers:f.triggers,providerCalls:0,productionWrites:0}));
  throw Error("P4_G5_V0076_POSTINSTALL_ISOLATION_HOLD");
 }
 return {status:"V0076_LIVE_LOGGED_PRIVATE_RUNTIME_NOT_GRANTED",
  metadataTables:4,reservationFunctions:1,immutableTriggers:1,
  workerExecute:false,verifiedRecordCounts:false,providerCalls:0,
  productionWrites:0,strictGate5Passed:false,phase5FreezeAuthorized:false,
  phase6Authorized:false};
}
export function assertGitHub(e:NodeJS.ProcessEnv,head:string){
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
 e.GITHUB_REF!=="refs/heads/main"||e.GITHUB_EVENT_NAME!=="push"||
 e.GITHUB_RUN_ATTEMPT!=="1"||e.GITHUB_JOB!=="v0076-postinstall-readonly"||
 e.GITHUB_WORKFLOW!==WORKFLOW||e.GITHUB_WORKFLOW_REF!==REF||
 head!==e.GITHUB_SHA||!/^[a-f0-9]{40}$/.test(head)||
 e.P4_G5_V0076_POSTINSTALL_INTENT!=="CATALOG_ONLY_READONLY"||
 !!e.DATABASE_URL||!!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY||
 !!e.GATE05_AUTOMATION_DATABASE_URL)
  throw Error("P4_G5_V0076_POSTINSTALL_CONTEXT_HOLD");
}
export async function main(){
 const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
 assertGitHub(process.env,sha);
 const url=process.env.V39_DATABASE_RUNTIME_URL;
 if(!url)throw Error("P4_G5_V0076_NO_RUNTIME_SECRET");
 const c=new pg.Client({connectionString:url,connectionTimeoutMillis:8000,
  query_timeout:12000,application_name:"gate5_v0076_postinstall_readonly",
  options:"-c default_transaction_read_only=on"});
 let connected=false,tx=false;
 try{
  await c.connect();connected=true;
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='10000ms'");
  await c.query("SET LOCAL lock_timeout='1000ms'");
  const res=await c.query(POSTINSTALL_SQL,[TABLES,PROC]);
  if(res.rows.length!==1)throw Error("P4_G5_V0076_RESULT_SHAPE_HOLD");
  const facts=res.rows[0] as PostInstallFacts;
  if(Number.isSafeInteger(facts.tables_granted)&&facts.tables_granted>0){
   // Metadata only. No table SELECT/DML is performed or provider called.
   const rights=await c.query(RIGHTS_PROVENANCE_SQL,[TABLES,TABLE_PRIVILEGES]);
   if(rights.rows.length!==4)
    throw Error("P4_G5_V0076_RIGHTS_PROVENANCE_SHAPE_HOLD");
   console.log(JSON.stringify({
    status:"P4_G5_V0076_EFFECTIVE_GRANT_ORIGIN_READONLY",
    tableRights:rights.rows,providerCalls:0,productionWrites:0
   }));
  }
  console.log(JSON.stringify(assessPostInstall(facts)));
 }finally{
  if(tx)await c.query("ROLLBACK").catch(()=>{});
  if(connected)await c.end().catch(()=>{});
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_v0076_postinstall_readonly_actions.ts"))
 void main().catch(e=>{
  console.error(typeof e?.message==="string"&&
   /^P4_G5_V0076_[A-Z0-9_]+$/.test(e.message)?
    e.message:
   typeof e?.code==="string"&&/^[A-Z0-9]{5}$/.test(e.code)?
    "P4_G5_V0076_POSTINSTALL_SQLSTATE_"+e.code:
    "P4_G5_V0076_POSTINSTALL_HOLD_NO_PROVIDER");
  process.exitCode=2;
 });
