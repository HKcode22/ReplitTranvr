/**
 * Phase 5 RELEASE CRITICAL-PATH inventory: owner-only, metadata/counts only.
 * No provider HTTP, no source bodies or flight-level rows, no SQL mutations.
 * A READONLY snapshot is a blocker inventory, never a scientific FREEZE.
 */
import pg from 'pg';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {Pool}=pg;
const REQUIRED={
  calendar:'clean.adb_phase6_calendar_day',
  samplingDraw:'clean.adb_sampling_draw',
  phase6Authorization:'clean.adb_phase6_authorization',
  sourceQuery:'clean.phase5_fids_allowed_query_v39',
  sourcePhysicalAttempt:'clean.phase5_fids_physical_attempt_v39',
  sourceOriginalBinding:'clean.phase5_fids_original_binding_v39',
  sourceGithubPrearm:'clean.phase5_fids_github_prearm_v39',
  sourceCycleBudget:'clean.phase5_fids_cycle_budget_v39',
  sourceChargeBudget:'clean.phase5_fids_utc_charge_budget_v39',
  sourceSevenRestRelease:'clean.phase5_fids_seven_rest_release_v39',
  sourceCategoryCaps:'clean.phase5_fids_cycle_rest_category_cap_v39',
  sourceUtcCategoryBudget:'clean.phase5_fids_utc_rest_category_budget_v39',
  sourcePartition:'clean.phase5_fids_exact_query_partition_v39',
  restReviewedCall:'clean.phase5_other_rest_reviewed_call_v39',
  restPhysicalReservation:'clean.phase5_other_rest_physical_reservation_v39',
  independentT24Witness:'clean.phase5_t24_postcommit_witness_v39'
};
const ROLES=[
 'phase5_fids_prepare_prod_20261107',
 'phase5_fids_source_prod_20261107',
 'phase5_fids_pre_writer_prod_20261107',
 'phase5_fids_t24_witness_prod_20261107',
 'phase5_fids_budget_freeze_prod_20261108',
 'phase5_other_rest_review_prod_20261108',
 'phase5_other_rest_reserve_prod_20261108'
];
const err=s=>{throw new Error('REFUSED_P5_PRODUCTION_RELEASE_INVENTORY_'+s);};
const countSql=t=>{
 if(!/^clean\.[a-z][a-z0-9_]+$/.test(t))err('UNPINNED_TABLE');
 return 'SELECT COUNT(*)::int AS n FROM '+t;
};
const positive=(value)=>Number.isSafeInteger(value)&&value>=0;
export async function inspectPhase5ReleaseInventory(pool){
 if(!pool||typeof pool.connect!=='function')err('NO_POOL');
 let c,open=false;
 try{
  c=await pool.connect();
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');open=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const s=(await c.query("SELECT current_database() db,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,current_setting('transaction_read_only') ro,clock_timestamp() AS at")).rows[0];
  if(!s||s.db!=='neondb'||s.ver<160000||s.replica!==false||s.ro!=='on'||!s.at)
   err('NOT_POSTGRES16_READONLY_PRIMARY');
  const tables={},missing=[];
  for(const [name,path] of Object.entries(REQUIRED)){
    const exists=(await c.query('SELECT to_regclass($1::text) IS NOT NULL AS present',[path])).rows[0]?.present;
    if(exists!==true){missing.push(name);tables[name]=null;continue;}
    const n=(await c.query(countSql(path))).rows[0]?.n;
    if(!positive(n))err('INVALID_NONNEGATIVE_ROW_COUNT');
    tables[name]=n;
  }
  const roles=(await c.query(
    'SELECT rolname,rolcanlogin FROM pg_catalog.pg_roles WHERE rolname=ANY($1::text[])',[ROLES]
  )).rows;
  const found=new Set(roles.filter(x=>x.rolcanlogin===false).map(x=>x.rolname));
  const missingRoles=ROLES.filter(x=>!found.has(x));
  let phase6Enabled=null;
  if(tables.phase6Authorization!==null){
   const x=(await c.query(
    "SELECT COUNT(*)::int AS n FROM clean.adb_phase6_authorization WHERE singleton_key=true AND enabled=true AND revoked_at_utc IS NULL"
   )).rows[0]?.n;
   if(!positive(x))err('INVALID_AUTHORIZATION_COUNT');
   phase6Enabled=x>0;
  }
  await c.query('ROLLBACK');open=false;
  const blocks=[];
  if(missing.length)blocks.push('SCHEMA_OR_SOURCE_LEDGER_MISSING');
  if(missingRoles.length)blocks.push('NOLOGIN_ROLE_PREREQUISITE_MISSING');
  if(tables.calendar!==31)blocks.push('ACTUAL_SIGNED_31_BATCH_DAY_CALENDAR_NOT_PROVEN');
  if(tables.samplingDraw===null||tables.samplingDraw<4)blocks.push('EARLY_FOUR_AIRPORT_DRAW_NOT_COMMITTED');
  if(tables.sourceSevenRestRelease!==1||tables.sourceCategoryCaps!==7||
    tables.sourceUtcCategoryBudget===0||tables.sourceUtcCategoryBudget===null)
    blocks.push('SEVEN_CATEGORY_SOURCE_BUDGET_NOT_FROZEN');
  if(tables.sourceQuery===0||tables.sourceQuery===null)
    blocks.push('NO_REVIEWED_SOURCE_QUERY_PREPARED');
  if(tables.sourceOriginalBinding===0||tables.sourceOriginalBinding===null)
    blocks.push('NO_LIVE_PHASE5_SOURCE_ORIGINAL_BINDING');
  if(tables.independentT24Witness===0||tables.independentT24Witness===null)
    blocks.push('NO_DURABLE_INDEPENDENT_T24_WITNESS');
  // Source-purpose/retention and real three PRE/POST/receiver cannot be certified
  // from counts or one application-owned read-only database session.
  blocks.push('SOURCE_CONTENT_ML_RETENTION_AND_EXPIRY_UNVERIFIED_BY_THIS_AUDIT');
  blocks.push('GITHUB_SOURCE_THREE_PRE_POST_RECEIVER_NOT_VERIFIED_BY_THIS_AUDIT');
  blocks.push('NO_INDEPENDENT_FINAL_PHASE5_SCIENTIFIC_FREEZE_PROVEN');
  return {
   status:'PHASE5_READONLY_PRIMARY_INVENTORY_NOT_RELEASE_AUTHORITY',
   database:'neondb',
   snapshotAtUtc:new Date(s.at).toISOString(),
   scope:'AGGREGATE_METADATA_ONLY_NO_FLIGHT_OR_SOURCE_PAYLOAD',
   tableRowCounts:tables,missingTables:missing,
   requiredNoLoginRoles:ROLES.length,missingNoLoginRoles:missingRoles,
   phase6AuthorizationEnabled:phase6Enabled,
   blockers:blocks,
   accountPlanOrLicenseRead:false,providerCalls:0,databaseWrites:0,
   certifiedPhysicalFlightIdentities:0,
   phase5ScientificFreezePassed:false,phase6PaidGo:false
  };
 }catch(e){
  if(open&&c)await c.query('ROLLBACK').catch(()=>{});
  throw e;
 }finally{if(c)c.release();}
}
async function main(){
 let pool;
 try{
  if(!process.env.DATABASE_URL||!process.env.V39_DATABASE_RUNTIME_URL||
   process.env.DATABASE_URL===process.env.V39_DATABASE_RUNTIME_URL||
   process.env.GITHUB_ACTIONS==='true')err('WRONG_OWNER_RUNTIME_OR_CI');
  pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:12000});
  const inventory=await inspectPhase5ReleaseInventory(pool);
  console.log(JSON.stringify(inventory));
  console.log('PHASE5_INDEPENDENT_OWNER_READONLY_INVENTORY_SUCCESS_NO_PROVIDER_NO_DB_WRITES');
 }catch(e){
  console.error('HOLD_PHASE5_OWNER_READONLY_INVENTORY_UNAVAILABLE');
  process.exitCode=2;
 }finally{if(pool)await pool.end().catch(()=>{});}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await main();
