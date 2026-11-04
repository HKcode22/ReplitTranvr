/**
 * Prove the real B0062 FIDS AFTER INSERT membership trigger permission
 * dependency, using ONLY disposable PostgreSQL16 and synthetic rows.
 *
 * No AeroDataBox HTTP, no production URL, no real flight/content or grants.
 */
import pg from "pg";
import {randomUUID} from "node:crypto";
const URL="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const ROLE="g5a_disposable_membership_proof";
const HASH="a".repeat(64),DOC="b".repeat(64);
function context(){
 const e=process.env;
 if(e.GITHUB_ACTIONS!=="true"||
    e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    !["push","pull_request"].includes(e.GITHUB_EVENT_NAME??"")||
    e.GITHUB_WORKFLOW!=="Phase4 Gate5 FIDS Membership Trigger Disposable PG16"||
    e.GITHUB_JOB!=="membership-trigger-disposable"||
    e.GITHUB_RUN_ATTEMPT!=="1"||
    e.DATABASE_URL!==URL||e.V39_DATABASE_RUNTIME_URL!==URL||
    !!e.P4_G5_SOURCE_OWNER_DATABASE_URL||!!e.GATE05_AUTOMATION_DATABASE_URL||
    !!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY)
   throw Error("G5A_FIDS_MEMBERSHIP_DISPOSABLE_CONTEXT_HOLD");
}
const flightInsert=`
 INSERT INTO clean.flight_population(
  source_airport_icao,window_start_utc,window_end_utc,cutoff_utc,
  source_type,flight_number,carrier_iata,provider_record_key,
  population_query_id,query_direction,population_role,
  from_local,to_local,airport_iana_timezone,scope_classification,
  codeshare_resolution_status,fids_retrieval_utc,available_at,response_hash,
  analytic_identity_id,provider_api_version,fids_protocol_version,openapi_sha256
 ) VALUES (
  'WSSS',now()+interval '26 hours',now()+interval '27 hours',
  now()+interval '2 hours','fids','SQ123','SQ','synthetic-777',
  $1,'Departure','requested_airport_primary',
  '2026-11-05T22:00','2026-11-05T23:00','Asia/Singapore','unknown',
  'confirmed_operating_leg',now(),now(),$2,
  'synthetic-test-only:777','offline-doc','offline-proto',$3
 )`;
export async function main(){
 context();
 const db=new pg.Client({connectionString:URL,connectionTimeoutMillis:8000,
  query_timeout:12000,application_name:"g5a_disposable_membership_trigger_test"});
 await db.connect();
 try{
  const qid=randomUUID();
  const schema=await db.query(`
   SELECT
    (SELECT count(*)::int FROM pg_trigger WHERE
      tgrelid='clean.flight_population'::regclass
      AND tgname='trg_flight_population_research_membership'
      AND tgenabled IN ('O','A'))=1 AS enabled,
    (SELECT count(*)::int FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='clean' AND p.proname='ensure_population_research_membership'
      AND NOT p.prosecdef)=1 AS invoker
   `);
  if(schema.rows[0]?.enabled!==true||schema.rows[0]?.invoker!==true)
   throw Error("G5A_DISPOSABLE_BASELINE_TRIGGER_NOT_INVOKER_HOLD");
  await db.query(`
   INSERT INTO clean.fids_query_response(
     population_query_id,source_airport_icao,query_direction,
     service_window_start_utc,service_window_end_utc,
     from_local,to_local,airport_iana_timezone,
     fids_retrieval_utc,raw_persisted_at_utc,available_at,response_hash,
     raw_payload,provider_api_version,fids_protocol_version,openapi_sha256
   ) VALUES ($1,'WSSS','Departure',
      now()+interval '26 hours',now()+interval '27 hours',
      '2026-11-05T22:00','2026-11-05T23:00','Asia/Singapore',
      now(),now(),now(),$2,'{}'::jsonb,'offline-doc','offline-proto',$3)
  `,[qid,HASH,DOC]);
  await db.query("CREATE ROLE "+ROLE+" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION");
  await db.query("GRANT USAGE ON SCHEMA clean TO "+ROLE);
  await db.query("GRANT SELECT,INSERT ON clean.flight_population TO "+ROLE);
  await db.query("GRANT SELECT ON clean.fids_query_response TO "+ROLE);
  await db.query("GRANT USAGE ON SEQUENCE clean.flight_population_id_seq TO "+ROLE);
  const ownerBefore=await db.query(
   "SELECT has_table_privilege($1,'clean.population_research_membership','INSERT') AS allowed",[ROLE]);
  if(ownerBefore.rows[0]?.allowed!==false)
   throw Error("G5A_DISPOSABLE_MISSING_GRANT_NOT_REPRODUCIBLE_HOLD");
  await db.query("BEGIN");
  let refused=false;
  try{
   await db.query("SET LOCAL ROLE "+ROLE);
   await db.query(flightInsert,[qid,HASH,DOC]);
   await db.query("ROLLBACK");
  }catch(e){
   const c=e&&typeof e==="object"&&(e as {code?:unknown}).code;
   refused=c==="42501";
   await db.query("ROLLBACK").catch(()=>undefined);
  }
  if(!refused)
   throw Error("G5A_DISPOSABLE_INVOCER_TRIGGER_PERMISSION_NOT_REPRODUCED_HOLD");
  const noPartial=await db.query(
   "SELECT (SELECT count(*)::int FROM clean.flight_population WHERE population_query_id=$1) AS population,"+
   "(SELECT count(*)::int FROM clean.population_research_membership WHERE source_airport_icao='WSSS') AS members",[qid]);
  if(noPartial.rows[0]?.population!==0||noPartial.rows[0]?.members!==0)
   throw Error("G5A_DISPOSABLE_PARTIAL_FIDS_AFTER_FAILED_TRIGGER_HOLD");
  // Test ONLY on disposable PG16: exact additional INSERT privilege.
  await db.query("GRANT INSERT ON clean.population_research_membership TO "+ROLE);
  const allowed=await db.query(
   "SELECT has_table_privilege($1,'clean.population_research_membership','INSERT') AS allowed,"+
   "has_table_privilege($1,'clean.population_research_membership','UPDATE') AS update_allowed,"+
   "has_table_privilege($1,'clean.population_research_membership','DELETE') AS delete_allowed",[ROLE]);
  if(allowed.rows[0]?.allowed!==true||allowed.rows[0]?.update_allowed!==false||
    allowed.rows[0]?.delete_allowed!==false)
   throw Error("G5A_DISPOSABLE_MEMBERSHIP_GRANT_SCOPE_INVALID_HOLD");
  await db.query("BEGIN");
  try{
   await db.query("SET LOCAL ROLE "+ROLE);
   const inserted=await db.query(flightInsert,[qid,HASH,DOC]);
   if(inserted.rowCount!==1)
    throw Error("G5A_DISPOSABLE_FIDS_REPLAY_NOT_INSERTED_HOLD");
   await db.query("COMMIT");
  }catch(e){
   await db.query("ROLLBACK").catch(()=>undefined);
   throw e;
  }
  const final=await db.query(
   "SELECT (SELECT count(*)::int FROM clean.flight_population WHERE population_query_id=$1) AS population,"+
   "(SELECT count(*)::int FROM clean.population_research_membership WHERE source_airport_icao='WSSS') AS members",[qid]);
  if(final.rows[0]?.population!==1||final.rows[0]?.members!==1)
   throw Error("G5A_DISPOSABLE_MEMBERSHIP_AFTER_GRANT_NOT_DURABLE_HOLD");
  console.log(JSON.stringify({
   status:"G5A_REAL_B0062_INVOCER_MEMBERSHIP_MISSING_GRANT_REPRODUCED_PG16",
   before:{restrictedSourceWriterTableInsert:true,
    sourceWriterMembershipInsert:false,sqlstate42501:true,
    normalizedRowsPersisted:0},
   afterDisposableOnly:{additionalMembershipInsert:true,
    membershipUpdate:false,membershipDelete:false,
    normalizedRowsPersisted:1,membershipRowsPersisted:1},
   noProductionSchemaOrRolesChanged:true,providerCalls:0,
   productionDbWrites:0,scientificGate5Passed:false
  }));
 }finally{await db.end().catch(()=>undefined);}
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_membership_trigger_disposable_pg16.ts"))
 void main().catch(e=>{
  console.error(JSON.stringify({
   status:"G5A_FIDS_MEMBERSHIP_DISPOSABLE_NO_PROVIDER_HOLD",
   cause:"OFFLINE_TEST_FAILED_REDACTED",providerCalls:0,productionDbWrites:0
  }));
  process.exitCode=2;
 });
