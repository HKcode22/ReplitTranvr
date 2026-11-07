/**
 * Phase5 Stage16: owner-run ZERO-WRITE metadata inventory for the live
 * Replit/Neon PostgreSQL environment. Safe on diverged Replit Git checkout:
 * this is one source-locked standalone mjs file, not a deploy or migration.
 *
 * Never prints DATABASE_URL, role passwords, raw FIDS/Contents, flight
 * identifiers or provider source. Never contacts AeroDataBox. Does not
 * install/enable track_commit_timestamp; only READS its current state.
 */
import pg from "pg";
const {Pool}=pg;

export const P5_PRODUCTION_DB_METADATA_SQL=[
 "SELECT current_database() AS db,",
 "current_user AS actor,current_setting('transaction_read_only') AS ro,",
 "current_setting('track_commit_timestamp',true) AS track,",
 "current_setting('server_version_num') AS pg_version_num,",
 "pg_is_in_recovery() AS standby,clock_timestamp() AS observed_at,",
 "to_regclass('clean.flight_snapshots') IS NOT NULL AS flight_snapshots,",
 "to_regclass('clean.fids_query_response') IS NOT NULL AS fids_originals,",
 "to_regclass('clean.flight_population') IS NOT NULL AS fids_population,",
 "to_regclass('clean.phase5_fids_allowed_query_v39') IS NOT NULL AS v0079_queries,",
 "to_regclass('clean.phase5_fids_physical_attempt_v39') IS NOT NULL AS v0079_attempts,",
 "to_regclass('clean.phase5_fids_original_binding_v39') IS NOT NULL AS v0079_bindings,",
 "to_regclass('clean.phase5_fids_day_budget_v39') IS NOT NULL AS v0079_day_budget,",
 "to_regclass('clean.phase5_fids_utc_charge_budget_v39') IS NOT NULL AS v0079_charge_days"
].join(" ");
const reject=(code)=>{throw Error("REFUSED_P5_READONLY_DB_ENV_"+code);};
export async function inspectP5ReadOnlyDbEnvironment(pool){
 if(!pool||typeof pool.connect!=="function")
  reject("NO_DB_CONNECTION");
 const c=await pool.connect();
 let active=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  active=true;
  await c.query("SET LOCAL statement_timeout='8000ms'");
  await c.query("SET LOCAL lock_timeout='1000ms'");
  const result=await c.query(P5_PRODUCTION_DB_METADATA_SQL);
  if(result.rows?.length!==1)reject("AMBIGUOUS_METADATA");
  const r=result.rows[0];
  if(r.ro!=="on"||r.standby!==false)
   reject("DB_READ_ONLY_OR_PRIMARY_STATUS_NOT_VERIFIED");
  const timestamp=r.observed_at instanceof Date?
    r.observed_at:new Date(r.observed_at);
  if(!Number.isFinite(timestamp.getTime()))
   reject("DB_CLOCK_NOT_VERIFIED");
  const schema={
   flightSnapshots:r.flight_snapshots===true,
   originalFidsResponse:r.fids_originals===true,
   normalizedFlightPopulation:r.fids_population===true,
   v0079AllowedQueries:r.v0079_queries===true,
   v0079PhysicalAttempts:r.v0079_attempts===true,
   v0079OriginalBindings:r.v0079_bindings===true,
   v0079DayBudget:r.v0079_day_budget===true,
   v0079ActualUtcChargeBudget:r.v0079_charge_days===true
  };
  const nativeCommitTracking=r.track==="on";
  const baseSchema=Object.values(schema).every(Boolean);
  const recognizedPg16OrLater=
    /^[0-9]+$/.test(String(r.pg_version_num))&&
    Number(r.pg_version_num)>=160000;
  const expectedDb=r.db==="neondb";
  await c.query("COMMIT");
  active=false;
  return {
   schema:"v39.phase5.stage16.production-db-metadata-readonly.v1",
   status:"READONLY_DATABASE_METADATA_OBSERVED_NOT_SCIENTIFIC_RELEASE",
   observedAtUtc:timestamp.toISOString(),
   expectedDatabaseMatched:expectedDb,
   postgres16OrLater:recognizedPg16OrLater,
   transactionalReadOnlyVerified:true,
   nativeCommitTimestampTrackingEnabledNow:nativeCommitTracking,
   nativeCommitTimestampHistoryActuallyRetained:false,
   previouslyWrittenT24NativeCommitEvidenceCertified:false,
   v0079RequiredSchemaPresent:baseSchema,
   tablePresence:schema,
   phase5ProductionOriginalsCertified:false,
   phase5RealFlightPreCertified:false,
   providerSourceUseAndRetentionCertified:false,
   actualOperatingLegAndSelectedTCertified:false,
   publishedReceiverExactSourceCertified:false,
   providerCalls:0,alertMutations:0,databaseWrites:0,githubMutations:0,
   phase5FreezePassed:false,phase6PaidGo:false,
   blockers:[
    ...(!expectedDb?["UNEXPECTED_DATABASE_IDENTITY"]:[]),
    ...(!recognizedPg16OrLater?["POSTGRES16_NOT_VERIFIED"]:[]),
    ...(!baseSchema?["PHASE5_V0079_SCHEMA_NOT_INSTALLED_OR_INVISIBLE"]:[]),
    ...(!nativeCommitTracking?["NATIVE_TRANSACTION_COMMIT_TRACKING_OFF"]:[]),
    "LIVE_T24_COMMIT_HISTORY_NOT_INDEPENDENTLY_AUDITED",
    "EXTERNAL_SOURCE_RIGHTS_NATIVE_T_OPERATING_LEG_AND_PROSPECTIVE_PRE_NOT_CLEARED"
   ]
  };
 }catch(e){
  if(active)await c.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{c.release();}
}
async function run(){
 let pool;
 try{
  const url=process.env.DATABASE_URL;
  if(!url||typeof url!=="string")reject("DATABASE_URL_NOT_CONFIGURED");
  pool=new Pool({connectionString:url,max:1,
    connectionTimeoutMillis:8000,idleTimeoutMillis:3000});
  const result=await inspectP5ReadOnlyDbEnvironment(pool);
  console.log(JSON.stringify(result,null,2));
 }catch{
  // No connection string, SQL errors, role names, server addresses, or
  // raw provider/flight values are ever logged from a caught exception.
  console.log("HOLD_PHASE5_READONLY_PRODUCTION_DB_METADATA_PROBE_UNAVAILABLE");
  process.exitCode=2;
 }finally{await pool?.end().catch(()=>{});}
}
if(process.env.P5_DB_ENV_PROBE_ONCE==="1")await run();
