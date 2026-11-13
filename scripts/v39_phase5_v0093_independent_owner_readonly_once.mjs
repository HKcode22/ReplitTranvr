/**
 * INDEPENDENT from the one-use installer: V0093 owner RO production
 * catalog and source-boundary attestation. NEVER a source/release GO.
 *
 * No migration, no provider network, no DB writes, no flight bodies.
 * Different connection after V0093 install, original catalog definitions.
 */
import "dotenv/config";
import pg from "pg";
import {pathToFileURL} from "node:url";
import {resolve} from "node:path";
const {Pool}=pg;
const TABLES=[
 "clean.adb_phase6_calendar_day",
 "clean.adb_phase6_authorization",
 "clean.phase5_fids_cycle_budget_v39",
 "clean.phase5_fids_utc_charge_budget_v39",
 "clean.phase5_fids_seven_rest_release_v39",
 "clean.phase5_fids_cycle_rest_category_cap_v39",
 "clean.phase5_fids_utc_rest_category_budget_v39",
 "clean.phase5_fids_allowed_query_v39",
 "clean.phase5_fids_exact_query_partition_v39",
 "clean.phase5_fids_physical_attempt_v39"
];
const FUNCTION="clean.phase5_fids_v0082_enforce_category_get_v39()";
const TRIGGER="phase5_fids_v0082_seven_rest_before_physical";
const REL="clean.phase5_fids_seven_rest_release_v39";
const ATTEMPT="clean.phase5_fids_physical_attempt_v39";
const sha64=/^[a-f0-9]{64}$/;
const stop=s=>{throw Error("HOLD_V0093_INDEPENDENT_RO_"+s);};
const int=x=>Number.isSafeInteger(x)&&x>=0;

export async function independentReadV0093InstalledOwnerCatalog(pool){
 if(!pool||typeof pool.connect!=="function")stop("NO_READONLY_POOL");
 let c,open=false;
 try{
  c=await pool.connect();
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  open=true;
  await c.query("SET LOCAL statement_timeout='10000ms'");
  await c.query("SET LOCAL lock_timeout='1500ms'");
  const ctx=(await c.query(
   "SELECT current_database() AS db, current_user AS actor,"+
   " current_setting('server_version_num')::int AS server_version,"+
   " current_setting('transaction_read_only') AS read_only,"+
   " pg_is_in_recovery() AS replica,"+
   " clock_timestamp() AS observed_at_utc,"+
   " (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user) AS superuser"
  )).rows[0];
  if(!ctx||ctx.db!=="neondb"||ctx.actor!=="neondb_owner"||
     ctx.server_version<160000||ctx.read_only!=="on"||
     ctx.replica!==false||ctx.superuser!==false||
     !Number.isFinite(Date.parse(ctx.observed_at_utc)))
   stop("NOT_INDEPENDENT_REAL_OWNER_PG16_READONLY_PRIMARY");
  const existing=(await c.query(
    "SELECT requested.relation, to_regclass(requested.relation) IS NOT NULL AS present"+
    " FROM unnest($1::text[]) requested(relation)",[TABLES])).rows;
  if(existing.length!==TABLES.length||
     existing.some(x=>!TABLES.includes(x.relation)||x.present!==true))
   stop("MISSING_ALREADY_INSTALLED_B0062_V0079_V0082_TABLE");
  const cols=(await c.query(
   "SELECT a.attname,a.attnotnull,"+
   " pg_get_expr(def.adbin,def.adrelid) AS default_expression"+
   " FROM pg_catalog.pg_attribute a"+
   " LEFT JOIN pg_catalog.pg_attrdef def ON def.adrelid=a.attrelid"+
   " AND def.adnum=a.attnum"+
   " WHERE a.attrelid=to_regclass($1)"+
   " AND a.attnum>0 AND NOT a.attisdropped"+
   " AND a.attname=ANY($2::text[])",
   [REL,["budget_release_mode","reviewed_cost_envelope_sha256",
     "reviewed_source_request_grid_sha256"]])).rows;
  if(cols.length!==3||new Set(cols.map(x=>x.attname)).size!==3)
   stop("V0093_EXACT_THREE_COLUMNS_MISSING");
  const col=Object.fromEntries(cols.map(x=>[x.attname,x]));
  if(col.budget_release_mode?.attnotnull!==true||
     !String(col.budget_release_mode?.default_expression).includes("EXACT_SOURCE_GRID")||
     col.reviewed_cost_envelope_sha256?.attnotnull!==false||
     col.reviewed_source_request_grid_sha256?.attnotnull!==false)
   stop("V0093_TYPED_COST_MODE_OR_ORIGINAL_GRID_NULLABILITY_WRONG");
  const constraint=(await c.query(
   "SELECT conname,contype,convalidated,pg_get_constraintdef(oid) AS definition"+
   " FROM pg_catalog.pg_constraint"+
   " WHERE conrelid=to_regclass($1)"+
   " AND conname='p5_v0093_release_provenance_disjoint'",[REL])).rows;
  if(constraint.length!==1||
     constraint[0].contype!=="c"||constraint[0].convalidated!==true||
     !String(constraint[0].definition).includes("EXACT_SOURCE_GRID")||
     !String(constraint[0].definition).includes("COST_UPPER_BOUND")||
     !String(constraint[0].definition).includes("reviewed_cost_envelope_sha256")||
     !String(constraint[0].definition).includes("reviewed_source_request_grid_sha256"))
   stop("V0093_PROVENANCE_DISJOINT_CHECK_NOT_ENFORCED");
  const trigger=(await c.query(
   "SELECT tgname,tgenabled,tgtype,"+
   " tgfoid=to_regprocedure($1) AS matches_original_function"+
   " FROM pg_catalog.pg_trigger"+
   " WHERE tgrelid=to_regclass($2) AND NOT tgisinternal"+
   " AND tgname=$3",
   [FUNCTION,ATTEMPT,TRIGGER])).rows;
  if(trigger.length!==1||trigger[0].tgname!==TRIGGER||
     trigger[0].tgenabled!=="O"||
     (trigger[0].tgtype & 7)!==7||
     trigger[0].matches_original_function!==true)
   stop("ORIGINAL_V0082_BEFORE_INSERT_TRIGGER_NOT_BOUND_TO_V0093_FUNCTION");
  const def=(await c.query(
   "SELECT pg_get_functiondef(to_regprocedure($1)) AS definition",
   [FUNCTION])).rows[0]?.definition;
  if(typeof def!=="string"||
     !def.includes("COST_UPPER_BOUND")||
     !def.includes("EXACT_SOURCE_GRID")||
     !def.includes("P5_V0093_SIGNED_SOURCE_QUERY_MISSING_PARTITION_OR_OVER_COST_CAP")||
     !def.includes("P5_V0082_CATEGORY_ALREADY_EXHAUSTED")||
     !def.includes("phase5_fids_utc_rest_category_budget_v39")||
     !def.includes("reviewed_provider_range_sha256"))
   stop("V0093_FUNCTION_NOT_TYPED_OR_CHARGE_GUARD_INCOMPLETE");
  // ONLY metadata counts; the function is not invoked; zero write locks.
  const counts={};
  for(const name of TABLES){
   if(!/^clean\.[a-z][a-z0-9_]+$/.test(name))stop("UNSAFE_TABLE_LITERAL");
   const v=(await c.query(
    "SELECT COUNT(*)::int AS n FROM "+name)).rows[0]?.n;
   if(!int(v))stop("INVALID_CATALOG_ROW_COUNT");
   counts[name.slice(6)]=v;
  }
  const auth=(await c.query(
   "SELECT COUNT(*) FILTER (WHERE enabled)::int AS enabled,"+
   " COUNT(*) FILTER (WHERE revoked_at_utc IS NOT NULL)::int AS revoked"+
   " FROM clean.adb_phase6_authorization")).rows[0];
  if(!int(auth?.enabled)||!int(auth?.revoked))
   stop("INVALID_PHASE6_AUTH_COUNTS");
  if(auth.enabled!==0||auth.revoked!==0||
     counts.adb_phase6_authorization>1||
     counts.phase5_fids_seven_rest_release_v39!==0||
     counts.phase5_fids_cycle_rest_category_cap_v39!==0||
     counts.phase5_fids_utc_rest_category_budget_v39!==0||
     counts.phase5_fids_allowed_query_v39!==0||
     counts.phase5_fids_exact_query_partition_v39!==0||
     counts.phase5_fids_physical_attempt_v39!==0)
   stop("SOURCE_OR_COST_RELEASE_ALREADY_PRESENT_OR_PHASE6_AUTH_ACTIVE");
  await c.query("ROLLBACK");open=false;
  return {
   status:"INDEPENDENT_NEW_CONNECTION_REAL_PG16_V0093_TYPED_INERT_SCHEMA_READBACK_PASS",
   source:"REAL_OWNER_READONLY_CATALOG_NOT_INSTALLER_CLAIM",
   snapshotAtUtc:new Date(ctx.observed_at_utc).toISOString(),
   postgresMajorAtLeast16:true,
   productionActor:"neondb_owner",
   installedV0093CostUpperBoundModeAndNullGrid:true,
   existingV0082BeforePhysicalAttemptTriggerEnabled:true,
   originalV0082FunctionIncludesV0093TypedCapLogic:true,
   releaseProvenanceMutualExclusionCheckValidated:true,
   phase6AuthorizationRows:counts.adb_phase6_authorization,
   phase6EnabledRows:auth.enabled,
   phase6RevokedRows:auth.revoked,
   counts,
   sourceRequestsAndPhysicalAttemptsZero:true,
   budgetCategoriesStillUnfrozen:true,
   realSignedFutureCalendarProven:false,
   actualSourceRightsOrProviderQuotaProven:false,
   actualRealFlightPREOrPOSTProven:false,
   providerCalls:0,databaseWrites:0,
   phase5ScientificFreeze:false,phase6PaidGo:false
  };
 }catch(e){
  if(open&&c)await c.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{if(c)c.release();}
}
async function main(){
 let pool;
 try{
  const e=process.env;
  if(!e.DATABASE_URL||e.GITHUB_ACTIONS==="true"||
     e.ADB_AUTO_COLLECT!=="0"||
     e.V39_PHASE6_PROCESS_ARMED!=="0"||
     e.DATABASE_URL===e.V39_DATABASE_RUNTIME_URL)
   stop("UNSAFE_RUNTIME_OR_OWNERSHIP_CONTEXT");
  pool=new Pool({
   connectionString:e.DATABASE_URL,max:1,connectionTimeoutMillis:8000,
   application_name:"phase5_v0093_independent_real_readonly"
  });
  const result=await independentReadV0093InstalledOwnerCatalog(pool);
  console.log(JSON.stringify(result));
  console.log("P5_V0093_INDEPENDENT_READONLY_NO_PROVIDER_NO_GO_PASS");
 }catch(e){
  console.error("HOLD_P5_V0093_INDEPENDENT_READONLY_NO_GO");
  process.exitCode=2;
 }finally{if(pool)await pool.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname){
 await main();
}
