/**
 * One protected GitHub-native AeroDataBox Flight Status GET (Tier 2, expected
 * two API units), from an existing WSSS provider-marked operator source record.
 * Source-feasibility only: no original response persistence, alerts, writes,
 * retries, physical-leg certification or scientific Gate5/Phase6 admission.
 */
import "dotenv/config";
import pg from "pg";
import {getBalanceEvidenceStrict} from "../server/lib/disruption/aerodataboxLimiter_v3";
import {summarizeP4OneStatusFeasibility}
 from "../server/lib/disruption/phase4Gate5OneStatusFeasibility_v39";
const DEADLINE=Date.parse("2026-10-31T23:59:59.000Z");
export function p4OnePaidStatusGuard(env:NodeJS.ProcessEnv,now:number){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_EVENT_NAME!=="push"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")||
    env.P4_ONE_STATUS_EXACT_INTENT!=="ONE_PROTECTED_FIDS_OPERATOR_STATUS_TIER2_NO_RETRY"||
    now>=DEADLINE)
   throw Error("P4_ONE_STATUS_CONTEXT_OR_DEADLINE_HOLD");
}
const READ_SOURCE_SQL=[
 "WITH q AS (SELECT population_query_id,available_at,raw_payload",
 "FROM clean.fids_query_response",
 "WHERE source_airport_icao='WSSS' AND",
 "query_direction IN ('Departure','Both')",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL",
 "AND available_at>now()-interval '6 days'",
 "AND available_at<=now()),",
 "items AS (SELECT q.available_at,flight.value AS flight",
 "FROM q CROSS JOIN LATERAL jsonb_array_elements(",
 "CASE WHEN jsonb_typeof(q.raw_payload->'departures')='array'",
 "THEN q.raw_payload->'departures' ELSE '[]'::jsonb END) flight)",
 "SELECT flight->>'number' AS number,",
 "flight#>>'{departure,scheduledTime,utc}' AS scheduled,",
 "flight#>>'{arrival,airport,icao}' AS destination",
 "FROM items WHERE flight->>'codeshareStatus' IN ('IsOperator','1')",
 "AND NULLIF(flight->>'number','') IS NOT NULL",
 "AND NULLIF(flight#>>'{departure,scheduledTime,utc}','') IS NOT NULL",
 "AND flight#>>'{arrival,airport,icao}' ~ '^[A-Z]{4}$'",
 "ORDER BY available_at DESC, number ASC LIMIT 1"
].join(" ");
const localDate=(time:number):string=>{
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{
  timeZone:"Asia/Singapore",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date(time)).map(x=>[x.type,x.value]));
 return [p.year,p.month,p.day].join("-");
};
async function candidateFromReadOnlyDb(url:string,now:number){
 const c=new pg.Client({connectionString:url,application_name:"phase4_one_status_metadata_feasibility",
  connectionTimeoutMillis:7000,query_timeout:8000});
 let connected=false,started=false;
 try{
  await c.connect();connected=true;
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");started=true;
  await c.query("SET LOCAL statement_timeout='8000ms'");
  const r=await c.query(READ_SOURCE_SQL);
  if(!Array.isArray(r.rows)||r.rows.length!==1)
   throw Error("P4_ONE_STATUS_NO_RETAINED_SOURCE_CANDIDATE");
  const x=r.rows[0] as Record<string,unknown>;
  const number=typeof x.number==="string"?x.number.replace(/[\s-]/g,"").toUpperCase():"";
  const destinationIcao=typeof x.destination==="string"?x.destination.toUpperCase():"";
  const scheduled=typeof x.scheduled==="string"?Date.parse(x.scheduled):NaN;
  if(!/^[A-Z0-9]{3,10}$/.test(number)||
     !/^[A-Z]{4}$/.test(destinationIcao)||
     !Number.isFinite(scheduled)||
     scheduled>=now-60*60*1000||
     scheduled<now-6*86400000)
    throw Error("P4_ONE_STATUS_SOURCE_DATE_OR_ID_HOLD");
  return {number,destinationIcao,localServiceDate:localDate(scheduled)};
 }finally{
  if(started)await c.query("ROLLBACK").catch(()=>undefined);
  if(connected)await c.end().catch(()=>undefined);
 }
}
async function main(){
 let attempted=0;
 try{
  const now=Date.now();
  p4OnePaidStatusGuard(process.env,now);
  const dburl=process.env.GATE05_AUTOMATION_DATABASE_URL;
  const key=process.env.AERODATABOX_API_KEY;
  if(!dburl||!key||key.length<10)
   throw Error("P4_ONE_STATUS_PROTECTED_SECRET_UNAVAILABLE");
  const candidate=await candidateFromReadOnlyDb(dburl,now);
  const before=await getBalanceEvidenceStrict(); // free account entitlement check
  const remaining=before.quota.apiUnitsRemaining;
  const requests=before.quota.requestsRemaining;
  if(!Number.isSafeInteger(remaining)||remaining<4||
     !Number.isSafeInteger(requests)||requests<2)
    throw Error("P4_ONE_STATUS_PROVIDER_ACCOUNT_FLOOR_HOLD");
  const params=new URLSearchParams({
   dateLocalRole:"Departure",withAircraftImage:"false",withLocation:"false"
  });
  const url="https://aerodatabox.p.rapidapi.com/flights/number/"+
   encodeURIComponent(candidate.number)+"/"+
   candidate.localServiceDate+"?"+params.toString();
  attempted=1; // BEFORE the sole billable request; ambiguous errors are spent
  console.log("P4_ONE_STATUS_BILLABLE_ATTEMPT_STARTED_ONE_NO_RETRY");
  const response=await fetch(url,{
   method:"GET",redirect:"error",
   headers:{"X-RapidAPI-Host":"aerodatabox.p.rapidapi.com",
    "X-RapidAPI-Key":key,Accept:"application/json"},
   signal:AbortSignal.timeout(15000)
  });
  if(response.status!==200)throw Error("P4_ONE_STATUS_HTTP_NON200_NO_RETRY");
  const len=response.headers.get("content-length");
  if(len!==null&&(!/^[0-9]+$/.test(len)||Number(len)>4000000))
    throw Error("P4_ONE_STATUS_OVERSIZE");
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength>4000000)throw Error("P4_ONE_STATUS_OVERSIZE");
  let data:unknown;try{data=JSON.parse(Buffer.from(bytes).toString("utf8"));}
  catch{throw Error("P4_ONE_STATUS_NONJSON");}
  const report=summarizeP4OneStatusFeasibility(data,{
   number:candidate.number,originIcao:"WSSS",
   destinationIcao:candidate.destinationIcao
  });
  const h=response.headers.get("x-ratelimit-api-units-remaining");
  const after=h&&/^[0-9]{1,12}$/.test(h)?Number(h):null;
  const debit=after!==null&&after<=remaining?remaining-after:null;
  console.log(JSON.stringify({
   ...report,sourceRecordCountSelected:1,
   originalApiUnitsRemainingBefore:remaining,
   providerApiUnitDebitMeasured:debit,
   expectedTier2ApiUnits:2,
   billableProviderRequestsAttempted:attempted,
   originalProviderResponseBytesStored:false,
   noPaidRetryAttempted:true,
   originalSourceRequestNotBackfilled:true
  }));
  if(debit!==null&&debit!==2)process.exitCode=2;
 }catch{
  console.log(JSON.stringify({
   schema:"v39.phase4.gate5-one-status-feasibility.v1",
   status:attempted?
    "HOLD_AFTER_ONE_POSSIBLY_BILLABLE_REQUEST_NO_RETRY":
    "HOLD_BEFORE_ANY_BILLABLE_REQUEST",
   billableProviderRequestsAttempted:attempted,
   maxTier2GetAttempts:1,noRetries:true,dbWrites:0,
   noNewProviderAlertsOrSubscriptions:true,
   sourceIdsNeverLogged:true,strictGate5Passed:false,phase6Authorized:false
  }));
  process.exitCode=2;
 }
}
if(process.argv[1]?.endsWith("v39_phase4_wsss_one_paid_status_probe_20261029.ts"))
 void main();
