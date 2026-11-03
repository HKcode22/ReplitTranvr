/**
 * V0076/V0077 original FIDS request-frame audit in DISPOSABLE PG16 only.
 * All source/flight content below is generated synthetically in process.
 * No credentials, network/provider API, paid unit, production DB or PRE.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {draftP4Gate5ThreeHorizonGridV39}
 from "../server/lib/disruption/phase4Gate5FrozenGridDraft_v39";
import {prepareP4G5PhysicalOwnerV39}
 from "../server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39";
import {addCanonicalFidsEnvelopeHashV39}
 from "../server/lib/disruption/fidsEnvelopeCanonical_v39";
import {readP4Gate5OriginalRequestFrameV39}
 from "../server/lib/disruption/phase4Gate5OriginalRequestFrameReadOnly_v39";

const REPO="HKcode22/ReplitTranvr";
const URL="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const sha=(x:string)=>createHash("sha256").update(x).digest("hex");
const time=(x:number)=>new Date(x).toISOString();
function context(){
 const e=process.env;
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!==REPO||
   !["pull_request","push"].includes(e.GITHUB_EVENT_NAME??"")||
   e.GITHUB_WORKFLOW!=="Phase4 Gate5 Original FIDS Frame Disposable PG16"||
   e.GITHUB_JOB!=="frame-disposable-pg16"||
   e.GITHUB_RUN_ATTEMPT!=="1"||
   e.DATABASE_URL!==URL||!!e.AERODATABOX_API_KEY||
   !!e.RAPIDAPI_KEY||!!e.GATE05_AUTOMATION_DATABASE_URL||
   !!e.V39_DATABASE_RUNTIME_URL)
  throw Error("P4_G5_FRAME_PG16_DISPOSABLE_ONLY_CONTEXT_REQUIRED");
}
export async function main(){
 context();
 const now=Math.floor(Date.now()/60000)*60000;
 const start=now+15*3600000;
 const end=start+3600000;
 const grid={
  airportIcao:"WSSS",airportIanaTimezone:"Asia/Singapore",
  serviceWindowStartUtc:time(start),serviceWindowEndUtc:time(end),
  assignmentFrozenAtUtc:time(now-12*3600000),
  acquisitionGuardMinutes:20,refreshCadenceMinutes:30,
  maxStalenessMinutes:45,githubPrearmLeadMinutes:60,
  apiUnitsPerPhysicalAttempt:2,maxAttemptsPerQuery:1,
  projectRestApiUnitsBudget:18,maxSourceQueries:9
 };
 const cohortId="WSSS_SOURCE_FRAME_DISPOSABLE_CI";
 const bytes=JSON.stringify({cohortId,grid},null,2)+"\n";
 const manifestSha=sha(bytes);
 const draft=draftP4Gate5ThreeHorizonGridV39(grid);
 const ownerData=draft.horizonOwners.find(x=>x.horizon==="T-24h");
 if(!ownerData)throw Error("P4_G5_FRAME_PG16_OWNER_MISSING");
 const processStart=time(Date.parse(ownerData.verifiedPrearmDeadlineUtc)-5*60000);
 const owner=prepareP4G5PhysicalOwnerV39({
  cohortId,frozenManifestBytes:bytes,reviewedManifestSha256:manifestSha,
  grid,horizon:"T-24h",actualOwnerProcessStartedAtUtc:processStart
 });
 const q=owner.entries[0];
 const originalId="b00bb00b-0000-4000-8000-000000000078";
 const reservation=sha([manifestSha,owner.ownerDigest,q.queryDigest,"1"].join("|"));
 const dispatch=Date.parse(q.plannedPhysicalStartUtc);
 const committed=time(dispatch+10000);
 const retrieved=time(dispatch+15000);
 const persisted=time(dispatch+20000);
 const available=time(dispatch+30000);
 const body=Buffer.from('{"departures":[],"arrivals":[]}');
 const payload=addCanonicalFidsEnvelopeHashV39({
  departures:[],arrivals:[],
  payloadRepresentation:"RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES",
  originalHttpWireBytesPreserved:false,
  originalDecodedEntityBodyPreserved:true,
  originalDecodedEntityBodyEvidence:{
   schema:"v39.fids-fetch-decoded-source-body.v1",
   representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
   bodyLengthBytes:body.length,bodySha256:sha(body.toString("utf8")),
   bodyBase64:body.toString("base64")
  },
  fidsRequestContract:{
   schema:"v39.fids-request-frame.application-intent.v1",
   originalHttpBytesPreserved:false,
   sourceTransportRequestReceiptVerified:false,
   endpointKind:"airport_local_fids",airportIcao:"WSSS",
   fromLocal:q.sourceFromLocal,toLocal:q.sourceToLocal,
   direction:"Departure",withLeg:true,withCancelled:true,
   withCodeshared:true,withCargo:false,withPrivate:false,
   withLocation:false,
   providerApiVersion:"1.15.4.0",fidsProtocolVersion:"v3.9-f.8",
   openapiSha256:"a".repeat(64)
  }
 });
 const responseSha="b".repeat(64),githubRunId="12345678";
 const client=new pg.Client({connectionString:URL,connectionTimeoutMillis:8000,
  query_timeout:15000});
 await client.connect();
 let seed=false;
 try{
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  seed=true;
  await client.query(
   "INSERT INTO clean.phase4_g5_fids_cohort_budget_v39("+
   "manifest_sha256,cohort_id,project_unit_ceiling,reserved_units)"+
   "VALUES ($1,$2,18,2)",[manifestSha,cohortId]);
  await client.query(
   "INSERT INTO clean.phase4_g5_fids_physical_owner_v39("+
   "owner_digest,manifest_sha256,horizon,github_run_id,"+
   "reviewed_authorization_sha256,actual_github_runner_started_at_utc,"+
   "verified_prearm_deadline_utc,first_planned_dispatch_utc,"+
   "last_planned_dispatch_utc,hard_owner_expires_at_utc,state)"+
   "VALUES($1,$2,'T-24h',$3,$4,$5::timestamptz,$6::timestamptz,"+
   "$7::timestamptz,$8::timestamptz,$9::timestamptz,'ACTIVE')",
   [owner.ownerDigest,manifestSha,githubRunId,"c".repeat(64),
    processStart,ownerData.verifiedPrearmDeadlineUtc,
    ownerData.earliestPhysicalStartUtc,ownerData.latestPhysicalStartUtc,
    time(Date.parse(ownerData.latestPhysicalStartUtc)+15*60000)]);
  await client.query(
   "INSERT INTO clean.phase4_g5_fids_allowed_query_v39("+
   "query_digest,owner_digest,query_index,planned_dispatch_utc,"+
   "hard_latest_dispatch_utc,prediction_cutoff_utc,"+
   "max_physical_attempts,last_reserved_attempt)"+
   "VALUES($1,$2,0,$3::timestamptz,$4::timestamptz,"+
   "$5::timestamptz,1,1)",
   [q.queryDigest,owner.ownerDigest,q.plannedPhysicalStartUtc,
    q.hardLatestPhysicalStartUtc,q.cutoffUtc]);
  await client.query(
   "INSERT INTO clean.phase4_g5_fids_physical_attempt_v39("+
   "expected_reservation_sha256,owner_digest,query_digest,github_run_id,"+
   "physical_attempt_number,charged_reserved_units,committed_at_utc)"+
   "VALUES($1,$2,$3,$4,1,2,$5::timestamptz)",
   [reservation,owner.ownerDigest,q.queryDigest,githubRunId,committed]);
  await client.query(
   "INSERT INTO clean.fids_query_response("+
   "population_query_id,source_airport_icao,query_direction,"+
   "service_window_start_utc,service_window_end_utc,from_local,to_local,"+
   "airport_iana_timezone,fids_retrieval_utc,raw_persisted_at_utc,"+
   "available_at,response_hash,raw_payload,provider_api_version,"+
   "fids_protocol_version,openapi_sha256) VALUES("+
   "$1::uuid,'WSSS','Departure',$2::timestamptz,$3::timestamptz,"+
   "$4,$5,'Asia/Singapore',$6::timestamptz,$7::timestamptz,"+
   "$8::timestamptz,$9,$10::jsonb,'1.15.4.0','v3.9-f.8',$11)",
   [originalId,grid.serviceWindowStartUtc,grid.serviceWindowEndUtc,
    q.sourceFromLocal,q.sourceToLocal,retrieved,persisted,available,
    responseSha,JSON.stringify(payload),"a".repeat(64)]);
  await client.query(
   "INSERT INTO clean.phase4_g5_fids_original_binding_v39("+
   "population_query_id,expected_reservation_sha256,query_digest,"+
   "manifest_sha256,original_response_sha256,rights_review_artifact_sha256,"+
   "source_use_expires_at_utc) VALUES("+
   "$1::uuid,$2,$3,$4,$5,$6,$7::timestamptz)",
   [originalId,reservation,q.queryDigest,manifestSha,responseSha,
    "d".repeat(64),time(now+86400000)]);
  await client.query("COMMIT");seed=false;

  // A NEW independent session, with no write privilege in its transaction,
  // reads only the retained original from a disposable local database.
  const reader=new pg.Client({connectionString:URL,
   connectionTimeoutMillis:8000,query_timeout:15000});
  await reader.connect();
  try{
   await reader.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
   const flag=await reader.query("SHOW transaction_read_only");
   if(flag.rows[0]?.transaction_read_only!=="on")
    throw Error("P4_G5_FRAME_PG16_READ_ONLY_NOT_REAL");
   const scope={
    reviewedManifestBytes:bytes,independentlyReviewedManifestSha256:manifestSha,
    expectedCohortId:cohortId,horizon:"T-24h" as const,
    queryIndex:0,populationQueryId:originalId,
    readAsOfUtc:new Date().toISOString()
   };
   const result=await readP4Gate5OriginalRequestFrameV39(reader,scope);
   if(result.status!==
     "ORIGINAL_AND_FROZEN_REQUEST_APPLICATION_INTENT_MATCH_NOT_HTTP_CERTIFIED"||
      result.strictGate5Passed!==false||
      result.providerCalls!==0||result.databaseWrites!==0||
      result.independentProviderTransportOriginAuthenticated!==false||
      result.retainedSourceLegalRightsCertified!==false)
    throw Error("P4_G5_FRAME_PG16_UNEXPECTED_AUDIT_VERDICT");
   const wrong=await readP4Gate5OriginalRequestFrameV39(reader,{
    ...scope,populationQueryId:"b00bb00b-0000-4000-8000-000000000079"
   });
   if(wrong.status!=="ORIGINAL_SOURCE_BINDING_MISSING_EXPIRED_OR_UNMEASURABLE")
    throw Error("P4_G5_FRAME_PG16_WRONG_SOURCE_NOT_HOLD");
   await reader.query("ROLLBACK");
   console.log(JSON.stringify({
    event:"P4_G5_FRAME_REAL_DISPOSABLE_PG16_PASS",
    matchedOriginalRequestFrame:true,wrongSourceRejected:true,
    transactionReadOnly:true,syntheticOnly:true,providerCalls:0,
    productionDbWrites:0,strictGate5Passed:false,
    phase5FreezeAuthorized:false,phase6Authorized:false
   }));
  }finally{await reader.end();}
 }catch(e){
  if(seed)await client.query("ROLLBACK").catch(()=>undefined);
  throw e;
 }finally{await client.end();}
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_original_frame_disposable_pg16_actions.ts"))
 void main().catch(()=>{
  console.error("P4_G5_ORIGINAL_FRAME_DISPOSABLE_PG16_HOLD");
  process.exitCode=2;
 });
