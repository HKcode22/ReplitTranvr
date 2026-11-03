/**
 * One exact GitHub-only, no subscription, NO SECRETS NOAA METAR source sample.
 * Writes official raw HTTPS JSON and normalized metadata to an artifact; then
 * separate job reads back that durable artifact and validates source SHA /
 * as-of feature availability through the existing PRE weather selector.
 *
 * No flight data, paid provider, database connection, or Phase6 authorization.
 */
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {createHash} from "node:crypto";
import {
 P4_G5_NOAA_AIRPORTS_V39,
 decodeP4G5FreeNoaaMetarV39,
 validateP4G5NoaaDurableArtifactV39
} from "../server/lib/disruption/phase4Gate5NoaaMetarReceipt_v39";
const DIR="/tmp/v39_gate5_free_noaa_meteorology";
const SOURCE=DIR+"/noaa_metar_original.json";
const SUMMARY=DIR+"/noaa_metar_receipts.json";
const API="https://aviationweather.gov/api/data/metar?ids="+
 P4_G5_NOAA_AIRPORTS_V39.join(",")+"&format=json";
function preflight(mode:string){
 const e=process.env;
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    e.GITHUB_REF!=="refs/heads/main"||e.GITHUB_EVENT_NAME!=="push"||
    e.GITHUB_RUN_ATTEMPT!=="1"||
    e.GITHUB_WORKFLOW!=="Phase4 Gate5 Free NOAA Weather Receipt (No Paid Provider)"||
    !/^[0-9a-f]{40}$/.test(e.GITHUB_SHA??"")||
    e.GITHUB_JOB!==mode||
    e.AERODATABOX_API_KEY||e.RAPIDAPI_KEY||e.DATABASE_URL||
    e.V39_DATABASE_RUNTIME_URL||e.GATE05_AUTOMATION_DATABASE_URL||
    e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0")
   throw Error("P4_G5_FREE_NOAA_GITHUB_CONTEXT_OR_SECRET_HOLD");
}
async function acquire(){
 preflight("capture-free-noaa");
 const response=await fetch(API,{
  method:"GET",redirect:"error",signal:AbortSignal.timeout(15000),
  headers:{
   "Accept":"application/json",
   "User-Agent":"HKcode22-ReplitTranvr-Gate5-noncommercial-research/1.0 (GitHub Actions)"
  }
 });
 if(![200,204].includes(response.status))
  throw Error("P4_G5_NOAA_HTTP_STATUS_"+response.status);
 const text=response.status===204?"[]":await response.text();
 if(text.length>1_000_000)
  throw Error("P4_G5_NOAA_RESPONSE_TOO_LARGE");
 const collectedAtUtc=new Date().toISOString();
 const result=decodeP4G5FreeNoaaMetarV39({
  sourceJsonText:text,collectedAtUtc,
  requestedAirports:P4_G5_NOAA_AIRPORTS_V39
 });
 mkdirSync(DIR,{recursive:true,mode:0o700});
 writeFileSync(SOURCE,text,{encoding:"utf8",mode:0o600,flag:"wx"});
 writeFileSync(SUMMARY,JSON.stringify(result,null,2)+"\n",
  {encoding:"utf8",mode:0o600,flag:"wx"});
 console.log(JSON.stringify({
  status:"NOAA_FREE_RECEIPT_CAPTURED_PENDING_DURABLE_ARTIFACT",
  originalSourceSha256:result.sourceBodySha256,
  airportsRequested:result.sourceAirportCount,
  accepted:result.acceptedAirportCount,
  missing:result.missingAirports,
  collectedAtUtc,
  authoritativeFlightPopulation:false,
  actualOnlyWheelsOffSource:false,
  persistedPre:false,paidApiUnits:0,databaseWrites:0,phase6Authorized:false
 }));
}
function review(){
 preflight("verify-free-noaa-artifact");
 const source=readFileSync(SOURCE,"utf8");
 const summary=readFileSync(SUMMARY,"utf8");
 if(source.length>1_000_000||summary.length>30000)
  throw Error("P4_G5_NOAA_ARTIFACT_SIZE_HOLD");
 let record:Record<string,unknown>;
 try{record=JSON.parse(summary) as Record<string,unknown>;}catch{
  throw Error("P4_G5_NOAA_ARTIFACT_SUMMARY_JSON_HOLD");
 }
 if(!record||typeof record!=="object"||
    typeof record.sourceCollectedAtUtc!=="string"||
    record.sourceBodySha256!==createHash("sha256").update(source).digest("hex"))
  throw Error("P4_G5_NOAA_ARTIFACT_SOURCE_DIGEST_HOLD");
 const regenerated=decodeP4G5FreeNoaaMetarV39({
  sourceJsonText:source,collectedAtUtc:record.sourceCollectedAtUtc,
  requestedAirports:P4_G5_NOAA_AIRPORTS_V39
 });
 // Deep exact recoding rejects additional forged row, altered clock or
 // attacker-editable PASS/feature counters in the artifact summary.
 if(JSON.stringify(regenerated)!==JSON.stringify(JSON.parse(summary)))
  throw Error("P4_G5_NOAA_ARTIFACT_RECOMPUTED_SUMMARY_MISMATCH");
 const auditedAtUtc=new Date().toISOString();
 const readBack=validateP4G5NoaaDurableArtifactV39(
  regenerated,auditedAtUtc,
  P4_G5_NOAA_AIRPORTS_V39.map(airportIcao=>({
   airportIcao,cutoffUtc:auditedAtUtc
  }))
 );
 const output={
  schema:"v39.phase4.gate5-free-noaa-durable-source-audit.v1",
  status:"DURABLE_FREE_NOAA_GITHUB_ARTIFACT_VERIFIED_NOT_GATE5_PASS",
  sourceOriginalSha256:regenerated.sourceBodySha256,
  collectedAtUtc:regenerated.sourceCollectedAtUtc,
  durablyReReadAtUtc:auditedAtUtc,
  sourceReceipts:regenerated.receipts.length,
  sourceAirportsMissing:regenerated.missingAirports,
  actualClockAsOfFeatures:readBack.reports.map(r=>({
   airportIcao:r.airportIcao,
   weatherMissing:r.weatherMissing,
   availableAsOfReview:r.weatherAvailableForThisActualCutoff
  })),
  actualFlightPrePersisted:false,
  actualFlightDenominatorMeasured:false,
  originalF8ActualOnlyRunwayMeasured:false,
  scientificGate5Passed:false,
  phase5FreezeAuthorized:false,phase6Authorized:false,
  paidProviderCalls:0,databaseWrites:0
 };
 console.log(JSON.stringify(output,null,2));
}
const action=process.argv[2];
if(action!=="capture-free-noaa"&&action!=="verify-free-noaa-artifact")
 throw Error("P4_G5_NOAA_INVALID_MODE");
void (action==="capture-free-noaa"?acquire():Promise.resolve().then(review))
 .catch(e=>{
  console.error("P4_G5_NOAA_FREE_SOURCE_HOLD",
   e instanceof Error&&/^P4_G5_NOAA_HTTP_STATUS_\d+$/.test(e.message)?
      e.message:"SOURCE_OR_INTEGRITY_ERROR");
  process.exitCode=2;
 });
