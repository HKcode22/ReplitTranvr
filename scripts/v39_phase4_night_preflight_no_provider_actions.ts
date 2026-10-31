/**
 * Phase 4 night-before FIDS infrastructure preflight.
 * Does NOT contact AeroDataBox or perform any paid request. DB transaction is
 * READ ONLY even though it checks the writer role's *granted* INSERT rights.
 * This is not provider quota verification, source-semantic verification,
 * or permission to dispatch the scheduled GET outside its frozen cutoff.
 */
import pg from "pg";

export const P4_NIGHT_PREFLIGHT_SCHEMA="v39.phase4.wsss-night-before-infrastructure.v1" as const;
export const P4_NIGHT_PREFLIGHT_STOP_UTC="2026-10-31T09:00:00.000Z";
export const P4_NIGHT_PREFLIGHT_SQL=[
 "SELECT",
 "to_regclass('clean.fids_query_response') IS NOT NULL AS raw_exists,",
 "to_regclass('clean.flight_population') IS NOT NULL AS population_exists,",
 "has_table_privilege(current_user,'clean.fids_query_response','INSERT') AS raw_insert,",
 "has_table_privilege(current_user,'clean.flight_population','INSERT') AS population_insert,",
 "EXISTS (SELECT 1 FROM pg_trigger WHERE",
 "tgrelid='clean.fids_query_response'::regclass",
 "AND tgname='trg_fids_query_response_immutable' AND tgenabled<>'D') AS raw_immutable,",
 "EXISTS (SELECT 1 FROM pg_trigger WHERE",
 "tgrelid='clean.fids_query_response'::regclass",
 "AND tgname='trg_fids_response_expire_population' AND tgenabled<>'D') AS raw_expiry,",
 "(SELECT count(*)::int FROM clean.fids_query_response",
 "WHERE source_airport_icao='WSSS'",
 "AND service_window_start_utc='2026-10-31T17:00:00.000Z'::timestamptz",
 "AND service_window_end_utc='2026-10-31T18:00:00.000Z'::timestamptz",
 "AND available_at<=now()",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL",
 "AND raw_persisted_at_utc>=now()-interval '24 hours') AS recent_source_receipts"
].join(" ");

export function requireP4NightBeforeContextV39(
 env:NodeJS.ProcessEnv, now:number
):void {
 if(!Number.isFinite(now)||
    now<Date.parse("2026-10-30T22:00:00.000Z")||
    now>=Date.parse(P4_NIGHT_PREFLIGHT_STOP_UTC)||
    env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="push"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")||
    env.P4_NIGHT_PRECHECK_INTENT!=="PHASE4_WSSS_DB_READONLY_INFRASTRUCTURE_NO_PROVIDER"||
    !!env.P4_FIDS_SCHEDULE_CRON||
    !!env.AERODATABOX_API_KEY)
  throw Error("P4_NIGHT_PRECHECK_CONTEXT_HOLD");
}

export interface P4NightDb {query:(sql:string,params?:unknown[])=>Promise<{rows:unknown[]}>}
export async function auditP4NightInfrastructureV39(db:P4NightDb) {
 const result=await db.query(P4_NIGHT_PREFLIGHT_SQL,[]);
 if(!result||!Array.isArray(result.rows)||result.rows.length!==1)
  throw Error("P4_NIGHT_PRECHECK_RESULT_SHAPE_HOLD");
 const r=result.rows[0] as Record<string,unknown>;
 if(!r||typeof r!=="object"||Array.isArray(r))
  throw Error("P4_NIGHT_PRECHECK_RESULT_SHAPE_HOLD");
 const required=["raw_exists","population_exists","raw_insert",
   "population_insert","raw_immutable","raw_expiry"] as const;
 if(required.some(k=>typeof r[k]!=="boolean"))
  throw Error("P4_NIGHT_PRECHECK_BAD_SCHEMA_FLAGS");
 const n=r.recent_source_receipts;
 if(!(typeof n==="number"&&Number.isSafeInteger(n)&&n>=0&&n<=500))
  throw Error("P4_NIGHT_PRECHECK_BAD_SOURCE_COUNT");
 const ready=required.every(k=>r[k]===true);
 return {
  schema:P4_NIGHT_PREFLIGHT_SCHEMA,
  status:ready
   ?"PRE_PAID_INFRASTRUCTURE_DB_WRITER_READY_NOT_QUOTA_PROVEN"
   :"HOLD_DB_SCHEMA_WRITER_OR_RETENTION",
  databaseWriterReady:ready,
  writerInsertGrantsVerified:r.raw_insert===true&&r.population_insert===true,
  immutableAndExpiryTriggersEnabled:r.raw_immutable===true&&r.raw_expiry===true,
  existingWsssRetainedSourceReceipts:n,
  sourceMayBeMissingWithoutMeaningZeroFlights:true,
  stillRequiresTomorrowProviderBalanceAndRequestPreflight:true,
  latestCutoffScienceUnproven:true,strictGate5Passed:false,
  phase6Authorized:false,providerCalls:0,databaseWrites:0,
 };
}
async function main():Promise<void> {
 requireP4NightBeforeContextV39(process.env,Date.now());
 const url=process.env.V39_DATABASE_RUNTIME_URL||
   process.env.GATE05_AUTOMATION_DATABASE_URL;
 if(!url)throw Error("P4_NIGHT_PRECHECK_NO_DB_SECRET");
 const c=new pg.Client({connectionString:url,
   application_name:"phase4_night_db_reader_no_provider",
   connectionTimeoutMillis:9000,query_timeout:8000});
 let transaction=false;
 try{
  await c.connect();
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  transaction=true;
  await c.query("SET LOCAL statement_timeout = '8000ms'");
  const result=await auditP4NightInfrastructureV39(c);
  console.log(JSON.stringify(result));
  if(!result.databaseWriterReady)process.exitCode=2;
 }finally{
  if(transaction)await c.query("ROLLBACK").catch(()=>undefined);
  await c.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_night_preflight_no_provider_actions.ts"))
 void main().catch(()=>{
  console.error("P4_NIGHT_PRECHECK_HOLD_NO_PROVIDER_NO_DATABASE_WRITE");
  process.exitCode=2;
 });
