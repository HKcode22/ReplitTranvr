/**
 * Future Nov7 independent G5A audit reader: genuine protected GitHub,
 * READ ONLY, no provider, no mutations, no identities or table rows printed.
 */
import pg from "pg";
import {execFileSync} from "node:child_process";
const ROLE="p4_g5_g5a_nov07_readonly_20261105";
const REPO="HKcode22/ReplitTranvr";
const WF="Phase4 Gate5 G5A Nov7 Audit Reader Readiness (No Provider)";
const PATH=".github/workflows/phase4-gate5-g5a-nov07-audit-reader-readiness-no-provider.yml";
const TABLES=[
 "clean.phase4_g5_fids_physical_owner_v39",
 "clean.phase4_g5_fids_allowed_query_v39",
 "clean.phase4_g5_fids_physical_attempt_v39",
 "clean.phase4_g5_fids_original_binding_v39",
 "clean.fids_query_response","clean.flight_population",
 "clean.flight_snapshots","clean.phase4_g5_fids_cohort_budget_v39",
 "clean.adb_rest_attempt_ledger"
] as const;
function hold(k:string):never{throw Error("G5A_NOV07_AUDITOR_"+k+"_HOLD")}
export function validateNov07ReadOnlyAuditorFlagsV39(x:{
 separateReader:boolean;dbReadOnly:boolean;noRoleAdmin:boolean;
 noSchemaCreate:boolean;noDatabaseCreate:boolean;
 exactTableReadAndNoWrite:boolean;providerCalls:0;databaseWrites:0
}){
 return x.separateReader&&x.dbReadOnly&&x.noRoleAdmin&&x.noSchemaCreate&&
  x.noDatabaseCreate&&x.exactTableReadAndNoWrite&&
  x.providerCalls===0&&x.databaseWrites===0;
}
export async function main(){
 const e=process.env,local=execFileSync("git",["rev-parse","HEAD"],
  {encoding:"utf8",timeout:4000}).trim();
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!==REPO||
    e.GITHUB_REF!=="refs/heads/main"||e.GITHUB_SHA!==local||
    e.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    e.GITHUB_RUN_ATTEMPT!=="1"||
    e.GITHUB_JOB!=="auditor-readiness"||
    e.GITHUB_WORKFLOW!==WF||
    e.GITHUB_WORKFLOW_REF!==REPO+"/"+PATH+"@refs/heads/main"||
    !e.P4_G5_G5A_NOV07_AUDIT_DATABASE_URL||
    !!e.DATABASE_URL||!!e.V39_DATABASE_RUNTIME_URL||
    !!e.GATE05_AUTOMATION_DATABASE_URL||
    !!e.P4_G5_SOURCE_OWNER_DATABASE_URL||
    !!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY||
    e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0")
  hold("PROTECTED_MAIN_CONTEXT_OR_SECRET");
 const db=new pg.Client({
  connectionString:e.P4_G5_G5A_NOV07_AUDIT_DATABASE_URL,
  connectionTimeoutMillis:9000,query_timeout:13000,
  application_name:"g5a_nov07_independent_reader_readiness",
  options:"-c default_transaction_read_only=on"
 });
 await db.connect();
 let tx=false;
 try{
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  const r=await db.query(
   "SELECT current_user AS reader,"+
   "current_setting('transaction_read_only')='on' AS tx_ro,"+
   "(current_setting('server_version_num')::int>=160000) AS pg16,"+
   "(SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls "+
   "FROM pg_roles WHERE rolname=current_user) AS elevated,"+
   "has_schema_privilege(current_user,'clean','CREATE') AS schema_ddl,"+
   "has_database_privilege(current_user,current_database(),'CREATE') AS db_ddl");
  const row=r.rows[0];
  if(r.rows.length!==1||row.reader!==ROLE||row.tx_ro!==true||
     row.pg16!==true||row.elevated!==false)
   hold("ROLE_OR_PG16_INVALID");
  let rights=true;
  for(const table of TABLES){
   const t=await db.query(
    "SELECT has_table_privilege(current_user,$1,'SELECT') AS sel,"+
    "has_table_privilege(current_user,$1,'INSERT') AS ins,"+
    "has_table_privilege(current_user,$1,'UPDATE') AS upd,"+
    "has_table_privilege(current_user,$1,'DELETE') AS del,"+
    "has_table_privilege(current_user,$1,'TRUNCATE') AS trunc",[table]);
   const v=t.rows[0];
   if(t.rows.length!==1||v.sel!==true||v.ins!==false||
      v.upd!==false||v.del!==false||v.trunc!==false)rights=false;
  }
  const flags={
   separateReader:row.reader===ROLE,dbReadOnly:row.tx_ro===true,
   noRoleAdmin:row.elevated===false,
   noSchemaCreate:row.schema_ddl===false,
   noDatabaseCreate:row.db_ddl===false,
   exactTableReadAndNoWrite:rights,
   providerCalls:0 as const,databaseWrites:0 as const
  };
  if(!validateNov07ReadOnlyAuditorFlagsV39(flags))
   hold("EXCESS_PRIVILEGE_OR_MISSING_TABLE_SELECT");
  await db.query("ROLLBACK");tx=false;
  console.log(JSON.stringify({
   status:"G5A_NOV07_INDEPENDENT_AUDIT_READER_READY_NO_PROVIDER",
   flags,
   tableReadCount:TABLES.length,actualProviderBillingVerified:false,
   scientificGate5Passed:false,phase5FreezeAuthorized:false
  }));
 }finally{if(tx)await db.query("ROLLBACK").catch(()=>undefined);
  await db.end().catch(()=>undefined)}
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_g5a_nov07_audit_reader_readiness_no_provider.ts"))
 void main().catch(e=>{
  const msg=e instanceof Error?e.message:"";
  const safe=/^G5A_NOV07_AUDITOR_[A-Z0-9_]+_HOLD$/.test(msg)?
   msg:"G5A_NOV07_AUDITOR_UNKNOWN_REDACTED_HOLD";
  console.error(JSON.stringify({
   status:safe,providerCalls:0,databaseWrites:0,scientificGate5Passed:false
  }));
  process.exitCode=2;
 });
