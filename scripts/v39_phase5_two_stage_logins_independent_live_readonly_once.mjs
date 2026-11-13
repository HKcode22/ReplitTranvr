/**
 * Independent read-only post-COMMIT validation of the TWO new B0062/V0093
 * dedicated LOGIN secrets actually used by GitHub Actions.
 *
 * STOP by default. Never imports the one-shot commissioner, never uses
 * neondb_owner, never writes SQL or GitHub secrets, never contacts a provider.
 * Can be executed only by an explicitly confirmed manual main GitHub Action.
 */
import pg from "pg";
const {Pool}=pg;
const SHA=/^[0-9a-f]{40}$/;
const CONFIRM="VERIFY_ONLY_TWO_B0062_V0093_STAGE_LOGIN_SECRETS_READONLY_NO_GO";
const ROLE_SPECS=Object.freeze([
 {role:"phase5_b0062_prelaunch_stage_prod20261113",
  key:"P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL",
  read:[
   "adb_phase6_calendar_day","adb_phase6_authorization",
   "phase5_fids_cycle_budget_v39","phase5_fids_utc_charge_budget_v39",
   "adb_sampling_draw","phase5_fids_day_budget_v39",
   "phase5_fids_allowed_query_v39","phase5_fids_seven_rest_release_v39",
   "phase5_fids_cycle_rest_category_cap_v39",
   "phase5_fids_utc_rest_category_budget_v39"],
  insert:[
   "adb_phase6_calendar_day","adb_phase6_authorization",
   "phase5_fids_cycle_budget_v39","phase5_fids_utc_charge_budget_v39"]},
 {role:"phase5_fids_budget_freeze_prod20261113",
  key:"P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL",
  read:[
   "adb_phase6_authorization","adb_phase6_calendar_day",
   "phase5_fids_cycle_budget_v39","phase5_fids_utc_charge_budget_v39",
   "phase5_fids_allowed_query_v39","phase5_fids_seven_rest_release_v39",
   "phase5_fids_cycle_rest_category_cap_v39",
   "phase5_fids_utc_rest_category_budget_v39"],
  insert:[
   "phase5_fids_seven_rest_release_v39",
   "phase5_fids_cycle_rest_category_cap_v39",
   "phase5_fids_utc_rest_category_budget_v39"]}
]);
const OTHER=[
 "phase5_fids_exact_query_partition_v39",
 "phase5_fids_physical_attempt_v39",
 "phase5_fids_original_binding_v39","fids_query_response",
 "flight_population","flight_snapshots"
];
const TABLES=Object.freeze([...new Set([
 ...ROLE_SPECS.flatMap(x=>[...x.read,...x.insert]),...OTHER
])].sort());
export const P5_TWO_STAGE_ROLES=ROLE_SPECS;
export const P5_TWO_STAGE_TABLES=TABLES;
const deny=(s)=>{throw Error("HOLD_P5_TWO_STAGE_INDEPENDENT_READONLY_"+s);};
const isTrue=v=>v===true;
export function admitP5TwoStageIndependentReadOnly(env){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !SHA.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.P5_TWO_STAGE_READONLY_APPROVED_MAIN_SHA||
    env.P5_TWO_STAGE_READONLY_CONFIRM!==CONFIRM||
    env.P5_TWO_STAGE_READONLY_EXECUTE!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||
    env.AERODATABOX_WEBHOOK_SECRET||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    env.P5_PRELAUNCH_TWO_LOGIN_APPROVAL)
  deny("NOT_EXACT_MAIN_MANUAL_ZERO_PAID_READONLY_CONFIRMATION");
 let backend=null;
 const ready=[];
 for(const spec of ROLE_SPECS){
  const url=env[spec.key];
  if(!url)deny("NEW_GITHUB_ACTIONS_SECRET_MISSING");
  let parsed;
  try{parsed=new URL(url);}catch{deny("SECRET_NOT_POSTGRES_URL");}
  let login;
  try{login=decodeURIComponent(parsed.username);}catch{deny("SECRET_LOGIN_NOT_URLENCODED");}
  if(!["postgres:","postgresql:"].includes(parsed.protocol)||
     !parsed.hostname||!parsed.password||parsed.pathname!=="/neondb"||
     parsed.hash||login!==spec.role)
   deny("SECRET_ROLE_OR_DB_DOES_NOT_MATCH_COMMISSIONER");
  const host=parsed.host+parsed.pathname;
  if(backend!==null&&backend!==host)
   deny("B0062_V0093_NOT_SAME_NEON_DATABASE");
  backend=host;
  ready.push({spec,url});
 }
 if(ready[0].url===ready[1].url)deny("SECRETS_MUST_BE_DISTINCT");
 return ready;
}
/** Validate self-catalog rows; accept no effective application/SOURCE role. */
export function verifyP5StageRoleCatalog(row,spec){
 if(!row||row.db!=="neondb"||
    row.session_actor!==spec.role||row.actor!==spec.role||
    row.ro!=="on"||Number(row.pg_version)<160000||
    row.replica!==false||row.rolcanlogin!==true||
    row.rolinherit!==false||row.rolsuper!==false||
    row.rolcreaterole!==false||row.rolcreatedb!==false||
    row.rolreplication!==false||row.rolbypassrls!==false||
    row.schema_usage!==true||row.schema_create!==false||
    row.db_create!==false)
  deny("IDENTITY_READONLY_OR_ROLE_FLAGS_NOT_VERIFIED");
 return true;
}
export function verifyP5StageTableAcl(rows,spec){
 if(!Array.isArray(rows)||rows.length!==TABLES.length||
    new Set(rows.map(x=>x.table_name)).size!==TABLES.length)
  deny("TABLE_CATALOG_CARDINALITY_OR_DUPLICATE");
 for(const row of rows){
  if(!TABLES.includes(row.table_name)||
     row.sel!==spec.read.includes(row.table_name)||
     row.ins!==spec.insert.includes(row.table_name)||
     [row.upd,row.del,row.trunc,row.ref,row.trigger].some(isTrue)||
     [row.sel,row.ins,row.upd,row.del,row.trunc,row.ref,row.trigger].
       some(v=>typeof v!=="boolean"))
   deny("TABLE_PRIVILEGE_NOT_EXACT_OR_UNEXPECTED");
 }
 return true;
}
const SQL_IDENTITY=[
 "SELECT current_database() db,current_user actor,session_user session_actor,",
 "current_setting('transaction_read_only') ro,",
 "current_setting('server_version_num')::int pg_version,",
 "pg_is_in_recovery() replica,",
 "p.rolcanlogin,p.rolinherit,p.rolsuper,p.rolcreaterole,",
 "p.rolcreatedb,p.rolreplication,p.rolbypassrls,",
 "has_schema_privilege(current_user,'clean','USAGE') schema_usage,",
 "has_schema_privilege(current_user,'clean','CREATE') schema_create,",
 "has_database_privilege(current_user,current_database(),'CREATE') db_create",
 "FROM pg_catalog.pg_roles p WHERE p.rolname=current_user"
].join(" ");
const SQL_ACLS=[
 "SELECT t.table_name,",
 "has_table_privilege(current_user,'clean.'||t.table_name,'SELECT') sel,",
 "has_table_privilege(current_user,'clean.'||t.table_name,'INSERT') ins,",
 "has_table_privilege(current_user,'clean.'||t.table_name,'UPDATE') upd,",
 "has_table_privilege(current_user,'clean.'||t.table_name,'DELETE') del,",
 "has_table_privilege(current_user,'clean.'||t.table_name,'TRUNCATE') trunc,",
 "has_table_privilege(current_user,'clean.'||t.table_name,'REFERENCES') ref,",
 "has_table_privilege(current_user,'clean.'||t.table_name,'TRIGGER') trigger",
 "FROM unnest($1::text[]) AS t(table_name) ORDER BY t.table_name"
].join(" ");
export async function verifyP5TwoStageOneLiveSession(pool,spec){
 const c=await pool.connect();
 let tx=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  await c.query("SET LOCAL statement_timeout='8000ms'");
  await c.query("SET LOCAL lock_timeout='1000ms'");
  const identity=await c.query(SQL_IDENTITY);
  if(identity.rows.length!==1)
   deny("POSTCOMMIT_ROLE_CATALOG_MISSING");
  verifyP5StageRoleCatalog(identity.rows[0],spec);
  const table=await c.query(SQL_ACLS,[TABLES]);
  verifyP5StageTableAcl(table.rows,spec);
  const member=await c.query(
   "SELECT COUNT(*)::int n FROM pg_catalog.pg_auth_members m "+
   "JOIN pg_catalog.pg_roles r ON r.oid=m.member "+
   "WHERE r.rolname=current_user"
  );
  if(member.rows.length!==1||member.rows[0].n!==0)
   deny("UNEXPECTED_ROLE_SET_MEMBERSHIP");
  // SECURITY DEFINER functions may bypass direct table ACLs.
  // Do not claim least privilege if public/role EXECUTE survives.
  const routine=await c.query(
   "SELECT COUNT(*)::int n FROM pg_catalog.pg_proc p "+
   "JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace "+
   "WHERE n.nspname='clean' AND p.prosecdef "+
   "AND has_function_privilege(current_user,p.oid,'EXECUTE')"
  );
  if(routine.rows.length!==1||routine.rows[0].n!==0)
   deny("UNREVIEWED_EXECUTABLE_SECURITY_DEFINER_FUNCTION");
  await c.query("ROLLBACK");tx=false;
  return{
   role:spec.role,verifiedIndependentSession:true,
   readTables:spec.read.length,insertTables:spec.insert.length,
   prohibitedOtherTablePrivilegesChecked:true,
   executableCleanSecurityDefinerFunctions:0,
   roleMemberships:0,providerCalls:0,dbWrites:0
  };
 }finally{
  if(tx)await c.query("ROLLBACK").catch(()=>{});
  c.release();
 }
}
export async function runP5TwoStageLiveReadOnly(env){
 const approved=admitP5TwoStageIndependentReadOnly(env);
 const results=[];
 for(const {spec,url} of approved){
  const pool=new Pool({
   connectionString:url,max:1,connectionTimeoutMillis:8000,
   idleTimeoutMillis:1400
  });
  try{results.push(await verifyP5TwoStageOneLiveSession(pool,spec));}
  catch(e){
   const message=String(e?.message??"");
   if(/^HOLD_P5_TWO_STAGE_INDEPENDENT_READONLY_[A-Z0-9_]+$/.test(message))
    throw e;
   deny("ACTUAL_LOGIN_CONNECT_OR_CATALOG_FAILED_"+spec.role.toUpperCase());
  }finally{await pool.end().catch(()=>{});}
 }
 if(results.length!==2)deny("INCOMPLETE_BOTH_ACTUAL_LOGINS");
 return{
  status:"P5_B0062_V0093_BOTH_REAL_LOGINS_INDEPENDENT_PG16_READONLY_PASS_NO_GO",
  rolesVerified:2,results,
  scriptsInstalled:0,rolesCreatedOrUpdated:0,dbWrites:0,
  providerCalls:0,flightRowsRead:0,
  phase5ScientificFreeze:false,phase6PaidGo:false
 };
}
if(process.env.P5_TWO_STAGE_READONLY_EXECUTE==="1"){
 try{console.log(JSON.stringify(
  await runP5TwoStageLiveReadOnly(process.env),null,2));}
 catch(e){
  const code=String(e?.message??"");
  console.error(
   /^HOLD_P5_TWO_STAGE_INDEPENDENT_READONLY_[A-Z0-9_]+$/.test(code)?
    code:"HOLD_P5_TWO_STAGE_INDEPENDENT_READONLY_UNVERIFIED_SESSION");
  process.exitCode=2;
 }
}
