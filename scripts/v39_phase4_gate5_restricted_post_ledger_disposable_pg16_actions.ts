/**
 * Real PostgreSQL16 POST ledger + decoded FIDS persistence, using same
 * restricted producer permissions as GitHub source writer. SYNTHETIC ONLY.
 * No provider HTTP, real DB, secret, live workflow dispatch, or paid billing.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {fetchFidsPopulation,persistFidsObservation} from
 "../server/lib/disruption/fidsCensus_v3";
import {getV39Pool} from "../server/lib/disruption/db_v39";
import {
 postReservationUuidV39,
 reserveG5APostSlotDbV39,
 verifyG5APostSourceLedgerAtCommitV39
} from "./v39_phase4_gate5_g5a_nov07_prospective_post_schedule_observation";

const URL="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const WRITER="g5a_post_restricted_disposable";
const WRITER_URI="postgresql://"+WRITER+
 ":pg16_fake_test_only@localhost:5432/v39_ci?sslmode=disable";
const SHA=(x:string)=>createHash("sha256").update(x).digest("hex");
const MANIFEST="a".repeat(64);
const COHORT="WSSS_G5A_20261107_0200Z";
const POST_WINDOW_START="2026-11-07T01:00:00.000Z";
const POST_WINDOW_END="2026-11-07T05:00:00.000Z";
function context(){
 const e=process.env;
 if(e.GITHUB_ACTIONS!=="true"||
    e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    !["pull_request","push"].includes(e.GITHUB_EVENT_NAME??"")||
    e.GITHUB_RUN_ATTEMPT!=="1"||
    e.GITHUB_WORKFLOW!=="Phase4 Gate5 Restricted POST Ledger Disposable PG16"||
    e.GITHUB_JOB!=="restricted-post-ledger-pg16"||
    e.DATABASE_URL!==URL||e.V39_DATABASE_RUNTIME_URL!==URL||
    !!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY||
    !!e.P4_G5_SOURCE_OWNER_DATABASE_URL||
    !!e.GATE05_AUTOMATION_DATABASE_URL)
   throw Error("G5A_POST_RESTRICTED_DISPOSABLE_CONTEXT_HOLD");
}
async function main(){
 context();
 let stage="BOOT";
 const admin=new pg.Client({
  connectionString:URL,connectionTimeoutMillis:8000,query_timeout:14000,
  application_name:"g5a_post_only_disposable_bootstrap"
 });
 let writer:pg.Client|null=null;
 await admin.connect();
 try{
  stage="SEED_SYNTHETIC_UNSPENT_COHORT";
  await admin.query(
   "INSERT INTO clean.phase4_g5_fids_cohort_budget_v39("+
   "manifest_sha256,cohort_id,project_unit_ceiling,reserved_units) "+
   "VALUES($1,$2,24,0)",[MANIFEST,COHORT]);
  stage="CREATE_RESTRICTED_WRITER_WITH_MINIMUM_POST_AND_FIDS_GRANTS";
  await admin.query("CREATE ROLE "+WRITER+
   " LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS"+
   " PASSWORD 'pg16_fake_test_only'");
  await admin.query("GRANT CONNECT ON DATABASE v39_ci TO "+WRITER);
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+WRITER);
  const grants:[string,string][]=[
   ["clean.fids_query_response","SELECT,INSERT"],
   ["clean.flight_population","SELECT,INSERT"],
   ["clean.phase4_g5_fids_original_binding_v39","SELECT,INSERT"],
   ["clean.phase4_g5_fids_cohort_budget_v39","SELECT,INSERT,UPDATE"],
   ["clean.phase4_g5_fids_physical_owner_v39","SELECT,INSERT,UPDATE"],
   ["clean.phase4_g5_fids_allowed_query_v39","SELECT,INSERT,UPDATE"],
   ["clean.phase4_g5_fids_physical_attempt_v39","SELECT,INSERT"],
   ["clean.flight_snapshots","SELECT,INSERT"],
   ["clean.adb_rest_attempt_ledger","SELECT,INSERT"]
  ];
  for(const [table,priv] of grants)
   await admin.query("GRANT "+priv+" ON TABLE "+table+" TO "+WRITER);
  for(const table of ["clean.flight_population","clean.flight_snapshots"]){
   const q=await admin.query("SELECT pg_get_serial_sequence($1,'id') AS seq",[table]);
   if(q.rows.length!==1||typeof q.rows[0]?.seq!=="string"||
      !/^clean\.[a-z0-9_]+$/.test(q.rows[0].seq))
    throw Error("G5A_POST_DISPOSABLE_WRITER_SEQUENCE_MISSING_HOLD");
   await admin.query("GRANT USAGE ON SEQUENCE "+q.rows[0].seq+" TO "+WRITER);
  }
  await admin.query("GRANT EXECUTE ON FUNCTION clean.reserve_phase4_g5_fids_physical_attempt_v39("+
   "text,text,text,text,integer,text) TO "+WRITER);
  await admin.query("GRANT INSERT ON TABLE clean.population_research_membership TO "+WRITER);
  await admin.query("GRANT SELECT(population_member_id) ON TABLE clean.population_research_membership TO "+WRITER);
  const f=await admin.query(
   "SELECT has_table_privilege($1,'clean.adb_rest_attempt_ledger','SELECT') AS sel,"+
   "has_table_privilege($1,'clean.adb_rest_attempt_ledger','INSERT') AS ins,"+
   "has_table_privilege($1,'clean.adb_rest_attempt_ledger','UPDATE') AS upd,"+
   "has_table_privilege($1,'clean.adb_rest_attempt_ledger','DELETE') AS del,"+
   "has_table_privilege($1,'clean.population_research_membership','SELECT') AS broad,"+
   "has_schema_privilege($1,'clean','CREATE') AS ddl",[WRITER]);
  const a=f.rows[0];
  if(f.rows.length!==1||a.sel!==true||a.ins!==true||
     a.upd!==false||a.del!==false||a.broad!==false||a.ddl!==false)
   throw Error("G5A_POST_DISPOSABLE_WRITER_LEAST_PRIVILEGE_HOLD");
  writer=new pg.Client({
   connectionString:WRITER_URI,connectionTimeoutMillis:8000,query_timeout:15000,
   application_name:"g5a_post_restricted_pg16"
  });
  await writer.connect();
  const role=await writer.query("SELECT current_user AS username");
  if(role.rows.length!==1||role.rows[0].username!==WRITER)
   throw Error("G5A_POST_DISPOSABLE_CREDENTIAL_DRIFT_HOLD");
  // Force actual source raw->normalization transaction pool to the same
  // restricted GitHub source owner; not the privileged schema bootstrapper.
  process.env.V39_DATABASE_RUNTIME_URL=WRITER_URI;

  stage="PERSIST_ONE_IRREVERSIBLE_POST_ATTEMPT_BEFORE_SOURCE";
  const reservation=await reserveG5APostSlotDbV39(writer,MANIFEST,COHORT,0);
  if(reservation!==postReservationUuidV39(MANIFEST,0))
   throw Error("G5A_POST_DISPOSABLE_LEDGER_IDENTITY_HOLD");
  let duplicateRefused=false;
  try{await reserveG5APostSlotDbV39(writer,MANIFEST,COHORT,0)}
  catch{duplicateRefused=true}
  if(!duplicateRefused)
   throw Error("G5A_POST_DISPOSABLE_SECOND_RESERVATION_ADMITTED_HOLD");
  const preRead=await admin.query(
   "SELECT b.reserved_units,b.project_unit_ceiling,"+
   "(SELECT count(*)::int FROM clean.adb_rest_attempt_ledger WHERE reservation_id=$2) AS attempts "+
   "FROM clean.phase4_g5_fids_cohort_budget_v39 b WHERE manifest_sha256=$1",
   [MANIFEST,reservation]);
  if(preRead.rows.length!==1||Number(preRead.rows[0].reserved_units)!==2||
     Number(preRead.rows[0].project_unit_ceiling)!==24||
     Number(preRead.rows[0].attempts)!==1)
   throw Error("G5A_POST_DISPOSABLE_LEDGER_DUPLICATED_OR_BUDGET_DRIFT_HOLD");

  stage="PERSIST_SYNTHETIC_DECODED_ORIGINAL_AND_OPERATING_POPULATION";
  const raw={
   departures:[{
    id:"synthetic-post-v39-fully-offline",
    number:"SQ 123",codeshareStatus:"IsOperator",
    isCargo:false,isPrivate:false,isCharter:false,
    departure:{airport:{icao:"WSSS",iata:"SIN"},
     scheduledTime:{utc:"2026-11-07T02:20:00.000Z"}},
    arrival:{airport:{icao:"YSSY",iata:"SYD"},
     scheduledTime:{utc:"2026-11-07T10:15:00.000Z"}}
   }],arrivals:[]
  };
  const body=Buffer.from(JSON.stringify(raw),"utf8");
  const original={
   representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE" as const,
   sha256:SHA(body.toString("utf8")),byteLength:body.length,
   base64:body.toString("base64")
  };
  const q={
   airportIcao:"WSSS",fromLocal:"2026-11-07T09:00",
   toLocal:"2026-11-07T13:00",ianaTimezone:"Asia/Singapore",
   serviceWindowStartUtc:new Date(POST_WINDOW_START),
   serviceWindowEndUtc:new Date(POST_WINDOW_END),
   cutoffUtc:new Date(),withCancelled:true,withCodeshared:true,
   withCargo:false,withPrivate:false,direction:"Departure" as const,
   restCategory:"outcome" as const,
   batchId:reservation,g5aPostReservationId:reservation,
   g5aObservedScheduleProtocol:true,
   providerApiVersion:"synthetic-test-only",
   fidsProtocolVersion:"G5A-POST-20261103-v1",
   openapiSha256:"f".repeat(64)
  };
  const result=await fetchFidsPopulation(q,{
   fetchAirport:async()=>({...raw,originalDecodedBody:original}) as any,
   persist:async(query,rows)=>persistFidsObservation(query,rows,
    async(client,facts)=>verifyG5APostSourceLedgerAtCommitV39(
     client,MANIFEST,0,query,rows,facts))
  });
  if(!result||result.flightCount!==1||result.persistedPopulationRows!==1)
   throw Error("G5A_POST_DISPOSABLE_FIDS_SOURCE_NOT_SAVED_HOLD");
  const saved=await admin.query(
   "SELECT (SELECT count(*)::int FROM clean.fids_query_response) originals,"+
   "(SELECT count(*)::int FROM clean.flight_population) normalized,"+
   "(SELECT count(*)::int FROM clean.population_research_membership) membership,"+
   "(SELECT count(*)::int FROM clean.adb_rest_attempt_ledger) ledger");
  const out=saved.rows[0];
  if(saved.rows.length!==1||out.originals!==1||out.normalized!==1||
     out.membership!==1||out.ledger!==1)
   throw Error("G5A_POST_DISPOSABLE_ATOMIC_READBACK_FAILURE_HOLD");
  console.log(JSON.stringify({
   status:"G5A_POST_SOURCE_LEDGER_RESTRICTED_WRITER_REAL_PG16_PASS",
   actualRestrictedPostWriterVerified:true,
   exactOnePostReservationCommitted:true,duplicateReservationDenied:true,
   budgetReservedUnits:2,projectCeiling:24,
   originalResponses:1,normalizedOperatingRows:1,
   membershipTriggerRows:1,postLedgerRows:1,
   fakeDecodedBodyAuthenticated:true,
   syntheticOnly:true,providerCalls:0,productionDatabaseWrites:0,
   realPostCutoffOrActualDepartureCertified:false,
   realProviderRightsCertified:false,scientificGate5Passed:false
  }));
 }catch(e){
  const code=e&&typeof e==="object"?(e as {code?:unknown}).code:null;
  console.error(JSON.stringify({
   status:"G5A_POST_RESTRICTED_PG16_HOLD",
   stage,sqlstate:typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code)?code:null,
   providerCalls:0,productionDatabaseWrites:0
  }));
  throw Error("G5A_POST_RESTRICTED_PG16_DIAGNOSTIC_FAILED");
 }finally{
  if(writer)await writer.end().catch(()=>undefined);
  await admin.end().catch(()=>undefined);
  await getV39Pool().end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_restricted_post_ledger_disposable_pg16_actions.ts"))
 void main().catch(()=>{process.exitCode=2});
