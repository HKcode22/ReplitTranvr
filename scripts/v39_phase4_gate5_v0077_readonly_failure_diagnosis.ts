/**
 * Gate5 source-binding V0077 production refusal diagnosis.
 * It cannot install/reinstall DDL, read flight/provider Contents, mutate
 * production, call AeroDataBox, print DB role names or connection secrets.
 *
 * Prior V0077 installer intentionally hid non-SQLSTATE failures; that was
 * unhelpful operationally. Diagnose the *category* without leaking secrets.
 */
import pg from "pg";

export const P4_G5_V0077_DIAGNOSTIC_SCHEMA_V39 =
 "v39.phase4.gate5-v0077-operator-readonly-diagnosis.v1" as const;
type Field="dbMatch"|"roleDistinct"|"adminCanCreate"|"workerCanCreate"|
 "adminUsesClean"|"workerUsesClean"|"parentV0076Complete"|
 "sourceTablePresent"|"v0077Table"|"v0077CheckFunction"|
 "v0077ImmutableFunction"|"runtimeCanSelectV0077"|
 "runtimeCanInsertV0077"|"runtimeCanUpdateV0077"|
 "runtimeCanDeleteV0077";
type DbFacts={
 database:string;role:string;serverVersion:number;
 canUse:boolean;canCreate:boolean;
 parent:[boolean,boolean,boolean,boolean,boolean];
 source:boolean;
 v77:[boolean,boolean,boolean];
 hasRuntimeV77Privileges:[boolean,boolean,boolean,boolean];
};
function invalid():never{throw Error("P4_G5_V0077_BAD_DIAGNOSTIC_ROWS_HOLD");}
function record(x:unknown):Record<string,unknown>{
 if(!x||typeof x!=="object"||Array.isArray(x))invalid();
 return x as Record<string,unknown>;
}
const TRUE_FIELDS=[
 "uses_clean","can_create","parent_budget","parent_owner","parent_query",
 "parent_attempt","parent_reserve","original_source",
 "v0077_table","v0077_check","v0077_immutable"
] as const;
export function classifyP4G5V0077ProductionCatalogV39(admin:DbFacts,worker:DbFacts){
 const d:Record<Field,boolean>={
  dbMatch:admin.database===worker.database,
  roleDistinct:admin.role!==worker.role,
  adminCanCreate:admin.canCreate,workerCanCreate:worker.canCreate,
  adminUsesClean:admin.canUse,workerUsesClean:worker.canUse,
  parentV0076Complete:admin.parent.every(Boolean)&&worker.parent.every(Boolean),
  sourceTablePresent:admin.source&&worker.source,
  v0077Table:admin.v77[0]||worker.v77[0],
  v0077CheckFunction:admin.v77[1]||worker.v77[1],
  v0077ImmutableFunction:admin.v77[2]||worker.v77[2],
  runtimeCanSelectV0077:worker.hasRuntimeV77Privileges[0],
  runtimeCanInsertV0077:worker.hasRuntimeV77Privileges[1],
  runtimeCanUpdateV0077:worker.hasRuntimeV77Privileges[2],
  runtimeCanDeleteV0077:worker.hasRuntimeV77Privileges[3]
 };
 const v77Count=[d.v0077Table,d.v0077CheckFunction,
   d.v0077ImmutableFunction].filter(Boolean).length;
 let status:
  "ALREADY_INSTALLED_VERIFY_GRANTS"|
  "PARTIAL_V0077_SCHEMA_NEEDS_REVIEW"|
  "PARENT_V0076_OR_SOURCE_NOT_PRESENT"|
  "ROLE_OR_DATABASE_NOT_SAFE_FOR_PRIVATE_DDL"|
  "READY_FOR_ONE_TIME_V0077_PRIVATE_SCHEMA_INSTALL";
 if(!d.dbMatch||!d.roleDistinct||!d.adminCanCreate||d.workerCanCreate||
    !d.adminUsesClean||!d.workerUsesClean||
    admin.serverVersion<160000||worker.serverVersion<160000)
  status="ROLE_OR_DATABASE_NOT_SAFE_FOR_PRIVATE_DDL";
 else if(!d.parentV0076Complete||!d.sourceTablePresent)
  status="PARENT_V0076_OR_SOURCE_NOT_PRESENT";
 else if(v77Count===3)
  status="ALREADY_INSTALLED_VERIFY_GRANTS";
 else if(v77Count!==0)
  status="PARTIAL_V0077_SCHEMA_NEEDS_REVIEW";
 else status="READY_FOR_ONE_TIME_V0077_PRIVATE_SCHEMA_INSTALL";
 return {schema:P4_G5_V0077_DIAGNOSTIC_SCHEMA_V39,status,
  flags:d,providerCalls:0 as const,databaseWrites:0 as const,
  installedByThisDiagnostic:false as const,
  scientificGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,phase6Authorized:false as const};
}
export function parseP4G5V0077CatalogRowV39(x:unknown):DbFacts{
 const r=record(x);
 if(typeof r.db_name!=="string"||!r.db_name||
    typeof r.db_role!=="string"||!r.db_role||
    !Number.isSafeInteger(r.server_version)||
    TRUE_FIELDS.some(x=>typeof r[x]!=="boolean"))
  invalid();
 const bool=(k:string)=>r[k]===true;
 return {
  database:r.db_name,role:r.db_role,serverVersion:r.server_version as number,
  canUse:bool("uses_clean"),canCreate:bool("can_create"),
  parent:[bool("parent_budget"),bool("parent_owner"),bool("parent_query"),
     bool("parent_attempt"),bool("parent_reserve")],
  source:bool("original_source"),
  v77:[bool("v0077_table"),bool("v0077_check"),bool("v0077_immutable")],
  hasRuntimeV77Privileges:[false,false,false,false]
 };
}
const CATALOG_SQL=[
 "SELECT current_database() AS db_name,current_user AS db_role,",
 "current_setting('server_version_num')::int AS server_version,",
 "has_schema_privilege(current_user,'clean','USAGE') AS uses_clean,",
 "has_schema_privilege(current_user,'clean','CREATE') AS can_create,",
 "to_regclass('clean.phase4_g5_fids_cohort_budget_v39') IS NOT NULL AS parent_budget,",
 "to_regclass('clean.phase4_g5_fids_physical_owner_v39') IS NOT NULL AS parent_owner,",
 "to_regclass('clean.phase4_g5_fids_allowed_query_v39') IS NOT NULL AS parent_query,",
 "to_regclass('clean.phase4_g5_fids_physical_attempt_v39') IS NOT NULL AS parent_attempt,",
 "to_regprocedure('clean.reserve_phase4_g5_fids_physical_attempt_v39(text,text,text,text,integer,text)') IS NOT NULL AS parent_reserve,",
 "to_regclass('clean.fids_query_response') IS NOT NULL AS original_source,",
 "to_regclass('clean.phase4_g5_fids_original_binding_v39') IS NOT NULL AS v0077_table,",
 "to_regprocedure('clean.phase4_g5_check_original_binding_v39()') IS NOT NULL AS v0077_check,",
 "to_regprocedure('clean.phase4_g5_original_binding_immutable_update_v39()') IS NOT NULL AS v0077_immutable"
].join(" ");
const ACL_SQL=[
 "SELECT",
 "has_table_privilege(current_user,",
 "'clean.phase4_g5_fids_original_binding_v39','SELECT') AS can_select,",
 "has_table_privilege(current_user,",
 "'clean.phase4_g5_fids_original_binding_v39','INSERT') AS can_insert,",
 "has_table_privilege(current_user,",
 "'clean.phase4_g5_fids_original_binding_v39','UPDATE') AS can_update,",
 "has_table_privilege(current_user,",
 "'clean.phase4_g5_fids_original_binding_v39','DELETE') AS can_delete"
].join(" ");
async function readRole(url:string,role:"ADMIN"|"RUNTIME"):Promise<DbFacts>{
 const db=new pg.Client({
  connectionString:url,connectionTimeoutMillis:9000,
  query_timeout:15000,application_name:"gate5_v0077_metadata_diagnosis",
  options:"-c default_transaction_read_only=on"
 });
 let connected=false,tx=false;
 try{
  await db.connect();connected=true;
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  await db.query("SET LOCAL statement_timeout='12000ms'");
  const result=await db.query(CATALOG_SQL);
  if(result.rows.length!==1)invalid();
  const f=parseP4G5V0077CatalogRowV39(result.rows[0]);
  if(role==="RUNTIME"&&f.v77[0]){
   const a=await db.query(ACL_SQL);
   if(a.rows.length!==1)invalid();
   const r=record(a.rows[0]);
   for(const k of ["can_select","can_insert","can_update","can_delete"])
    if(typeof r[k]!=="boolean")invalid();
   f.hasRuntimeV77Privileges=[
    r.can_select===true,r.can_insert===true,
    r.can_update===true,r.can_delete===true
   ];
  }
  await db.query("ROLLBACK");tx=false;
  return f;
 }catch(e){
  const c=e&&typeof e==="object"?(e as {code?:unknown}).code:null;
  const sqlstate=typeof c==="string"&&/^[A-Z0-9]{5}$/.test(c)?
    "_SQLSTATE_"+c:"";
  throw Error("P4_G5_V0077_DIAG_"+role+sqlstate+"_HOLD");
 }finally{
  if(tx)await db.query("ROLLBACK").catch(()=>undefined);
  if(connected)await db.end().catch(()=>undefined);
 }
}
export async function runP4G5V0077ReadOnlyDiagnosisV39(){
 const a=process.env.DATABASE_URL,b=process.env.V39_DATABASE_RUNTIME_URL;
 if(!a||!b||a===b){
  console.log(JSON.stringify({
   status:"DISTINCT_CONFIGURED_DB_CONNECTIONS_MISSING",
   providerCalls:0,databaseWrites:0,scientificGate5Passed:false
  }));
  return 2;
 }
 const admin=await readRole(a,"ADMIN");
 const runtime=await readRole(b,"RUNTIME");
 const result=classifyP4G5V0077ProductionCatalogV39(admin,runtime);
 console.log(JSON.stringify(result));
 return result.status==="READY_FOR_ONE_TIME_V0077_PRIVATE_SCHEMA_INSTALL"||
  result.status==="ALREADY_INSTALLED_VERIFY_GRANTS"?0:2;
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_v0077_readonly_failure_diagnosis.ts")){
 void runP4G5V0077ReadOnlyDiagnosisV39().then(x=>{
  process.exitCode=x;
 }).catch(e=>{
  const message=e instanceof Error?e.message:"";
  console.error(message.startsWith("P4_G5_V0077_DIAG_")?
   message:"P4_G5_V0077_DIAG_UNCLASSIFIED_HOLD");
  process.exitCode=2;
 });
}
