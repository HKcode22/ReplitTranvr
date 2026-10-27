
/** ONE paid ADB FIDS GET only, no retries. Persist existing raw-first V3.9 custody. */
import "dotenv/config";
import {execFileSync} from "node:child_process";
import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {homedir} from "node:os";
import {fetchFidsPopulation} from "../server/lib/disruption/fidsCensus_v3.ts";
import {gate05eFutureWsssWindowV39} from "../server/lib/disruption/gate05eProspectiveWindow_v39.ts";
import {getV39Pool} from "../server/lib/disruption/db_v39.ts";
import {getBalanceEvidenceStrict} from "../server/lib/disruption/aerodataboxLimiter_v3.ts";
import {inspectGate05OpenApiBytesV39} from "../server/lib/disruption/gate05OpenApiInspector_v39.ts";

const PIN=process.env.GATE05E_REVIEWED_MAIN_SHA??"";
const GO="AUTHORIZE_NEW_GATE05E_ONE_WSSS_FUTURE_FIDS_GET_EXPECTED_2_API_UNITS_ZERO_RETRIES_RAWFIRST";
if(process.env.GATE05E_PAID_GO!==GO)throw Error("G05E_FRESH_PAID_INTENT_REQUIRED");
if(!/^[a-f0-9]{40}$/.test(PIN)||
   execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",timeout:5000}).trim()!==PIN)
 throw Error("G05E_SOURCE_PIN_HOLD");
if(Date.now()<Date.parse("2026-10-27T00:00:00Z")||
   Date.now()>Date.parse("2026-10-30T03:00:00Z"))
 throw Error("G05E_OWNER_SCOPE_EXPIRED");
const key=process.env.AERODATABOX_API_KEY;
if(!key||key.length<10)throw Error("G05E_EXISTING_AERODATABOX_KEY_REQUIRED");
if(!process.env.V39_DATABASE_RUNTIME_URL)throw Error("G05E_V39_DB_NOT_CONFIGURED");
const pool=getV39Pool();
let intent=null,attempts=0,headerDebit=null,stored=null;
const base={schema:"v39.gate05e.prospective-first-fids.v1",sourceSha:PIN,
 airport:"WSSS",direction:"Departure",proposedHorizon:"T-24h",
 actualTVerified:false,actualRunwayVerified:false,scheduledRunwayVerified:false,
 maxPaidGets:1,automaticRetries:0,expectedApiUnits:2,hardProviderCap:false,
 noNewSubscriptions:true,rawStoredInExistingV39DB:true};
const record=x=>writeFileSync(intent,JSON.stringify({...base,...x})+"\n",{mode:0o600});
function local(ms){
 const v=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{
  timeZone:"Asia/Singapore",year:"numeric",month:"2-digit",day:"2-digit",
  hour:"2-digit",minute:"2-digit",hourCycle:"h23"
 }).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
 return v.year+"-"+v.month+"-"+v.day+"T"+v.hour+":"+v.minute;
}
function remaining(h){
 const t=h.get("x-ratelimit-api-units-remaining");
 if(!/^[0-9]{1,12}$/.test(t??""))throw Error("G05E_QUOTA_HEADER_MISSING");
 return Number(t);
}
try{
 // Actual read-only custody prerequisite: tables and controlled expiry guard.
 const db=await pool.query([
   "SELECT to_regclass('clean.fids_query_response')::text AS raw_table,",
   "to_regclass('clean.flight_population')::text AS population_table,",
   "to_regclass('clean.retention_tombstone')::text AS retention_table,",
   "EXISTS(SELECT 1 FROM pg_trigger",
   " WHERE tgrelid='clean.fids_query_response'::regclass",
   " AND tgname='trg_fids_response_expire_population' AND tgenabled<>'D') AS expiry_trigger,",
   "EXISTS(SELECT 1 FROM pg_trigger",
   " WHERE tgrelid='clean.fids_query_response'::regclass",
   " AND tgname='trg_fids_query_response_immutable' AND tgenabled<>'D') AS immutable_trigger"
 ].join(" "));
 const schema=db.rows[0];
 if(!schema?.raw_table||!schema?.population_table||!schema?.retention_table||
    !schema?.expiry_trigger||!schema?.immutable_trigger)
   throw Error("G05E_RAW_CUSTODY_SCHEMA_HOLD");
 // Official ADB public OpenAPI, NOT a billable RapidAPI call.
 const specification=await fetch("https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json",
   {method:"GET",redirect:"error",signal:AbortSignal.timeout(12000)});
 if(!specification.ok)throw Error("G05E_PUBLIC_OPENAPI_UNAVAILABLE");
 const inspector=inspectGate05OpenApiBytesV39(Buffer.from(await specification.arrayBuffer()));
 if(!inspector.fids.localRangeGetTier2||
    !inspector.movementFields.runwayMayBeEstimate)
   throw Error("G05E_OPENAPI_SEMANTICS_CHANGED");
 const before=await getBalanceEvidenceStrict(); // Free Tier
 if(before.quota.apiUnitsRemaining<2 ||
    before.quota.requestsRemaining<2 ||
    before.balance.creditsRemaining<1000)
   throw Error("G05E_ACCOUNT_FLOOR_HOLD");
 const started=Date.now();
 const w=gate05eFutureWsssWindowV39(started);
 const from=local(Date.parse(w.serviceWindowStartUtc));
 const to=local(Date.parse(w.serviceWindowEndUtc));
 const dir=join(homedir(),".config","replittranvr","gate05e-first-prospective-20261027");
 mkdirSync(dir,{recursive:true,mode:0o700});
 intent=join(dir,"once-intent.json");
 const receipt={window:w,apiBefore:before.quota.apiUnitsRemaining,
  alertBefore:before.balance.creditsRemaining,
  officialOpenapiSha256:inspector.sha256,officialOpenapiVersion:inspector.version};
 // The new private one-use authorization becomes permanently spent BEFORE GET.
 writeFileSync(intent,JSON.stringify({...base,...receipt,
   status:"INTENT_SPENT_BEFORE_PAID_GET"})+"\n",{flag:"wx",mode:0o600});
 const customFetch=async(icao,fromArg,toArg,opts)=>{
   if(icao!=="WSSS"||fromArg!==from||toArg!==to||
      opts?.direction!=="Departure"||opts?.withLeg!==true||attempts!==0)
     throw Error("G05E_WRONG_PROVIDER_ROUTE_OR_RETRY");
   attempts=1;
   record({...receipt,status:"PAID_GET_DISPATCHED",paidAttempts:attempts});
   const qs=new URLSearchParams({direction:"Departure",
      withLeg:"true",withCancelled:"true",withCodeshared:"true",
      withCargo:"false",withPrivate:"false",withLocation:"false"});
   const url="https://aerodatabox.p.rapidapi.com/flights/airports/icao/WSSS/"+
     encodeURIComponent(from)+"/"+encodeURIComponent(to)+"?"+qs;
   const response=await fetch(url,{method:"GET",redirect:"error",
     signal:AbortSignal.timeout(15000),
     headers:{"x-rapidapi-host":"aerodatabox.p.rapidapi.com",
       "x-rapidapi-key":key,accept:"application/json"}});
   if(!response.ok)throw Error("G05E_HTTP_NON200_NO_RETRY");
   headerDebit=before.quota.apiUnitsRemaining-remaining(response.headers);
   if(headerDebit!==2)throw Error("G05E_UNEXPECTED_FIRST_GET_COST_NO_RETRY");
   const data=await response.arrayBuffer();
   if(data.byteLength>7000000)throw Error("G05E_LARGE_RESPONSE");
   let j;try{j=JSON.parse(Buffer.from(data).toString("utf8"));}
   catch{throw Error("G05E_FIDS_NONJSON");}
   if(!j||!Array.isArray(j.departures)||j.departures.length>1000)
     throw Error("G05E_FIDS_DEPARTURE_SHAPE");
   return {departures:j.departures,arrivals:Array.isArray(j.arrivals)?j.arrivals:[]};
 };
 // Override the stock 3-attempt fetcher. Existing transactional raw+row
 // persistence still runs unchanged, including durable available_at clock.
 const observed=await fetchFidsPopulation({
   airportIcao:"WSSS",fromLocal:from,toLocal:to,
   ianaTimezone:"Asia/Singapore",withCancelled:true,withCodeshared:true,
   withCargo:false,withPrivate:false,direction:"Departure",
   serviceWindowStartUtc:new Date(w.serviceWindowStartUtc),
   serviceWindowEndUtc:new Date(w.serviceWindowEndUtc),
   cutoffUtc:new Date(started),batchId:null,restCategory:"fids_base",
   providerApiVersion:inspector.version,
   fidsProtocolVersion:"gate05e.first-prospective-rawfirst@1",
   openapiSha256:inspector.sha256
 },{fetchAirport:customFetch});
 if(!observed)throw Error("G05E_FIDS_MISSING");
 const readback=await pool.query([
  "SELECT q.population_query_id, q.available_at, q.raw_persisted_at_utc,",
  "q.response_hash, (q.raw_payload IS NOT NULL) AS raw_present,",
  "count(p.id)::int AS rows,",
  "count(p.id) FILTER (WHERE p.population_role='requested_airport_primary')::int AS primary_rows,",
  "count(p.id) FILTER (WHERE p.codeshare_resolution_status='confirmed_operating_leg')::int AS operator_rows,",
  "count(p.id) FILTER (WHERE p.dep_scheduled_utc IS NOT NULL AND",
  "p.available_at<=p.dep_scheduled_utc - interval '24 hours')::int AS before_t24,",
  "count(p.id) FILTER (WHERE p.dep_scheduled_utc IS NOT NULL AND",
  "p.available_at<=p.dep_scheduled_utc - interval '24 hours' AND",
  "p.dep_scheduled_utc - interval '24 hours' - p.available_at<= interval '10 minutes')::int AS within10,",
  "FROM_NONE_PLACEHOLDER"
 ].join(" ").replace("FROM_NONE_PLACEHOLDER",
  "FROM clean.fids_query_response q LEFT JOIN clean.flight_population p"+
  " ON p.population_query_id=q.population_query_id WHERE q.population_query_id=$1"+
  " GROUP BY q.population_query_id,q.available_at,q.raw_persisted_at_utc,q.response_hash,q.raw_payload"
 ),[observed.populationQueryId]);
 const z=readback.rows[0];
 if(!z||!z.raw_present||z.response_hash!==observed.responseHash)
   throw Error("G05E_RAW_READBACK_HOLD");
 stored={queryId:observed.populationQueryId,responseSha256:observed.responseHash,
   availableAtUtc:z.available_at?.toISOString?.()??null,
   rawPersistedAtUtc:z.raw_persisted_at_utc?.toISOString?.()??null,
   normalizedRows:z.rows,primaryRows:z.primary_rows,
   operatorRows:z.operator_rows,preliminaryBeforeT24:z.before_t24,
   preliminaryWithin10mAtT24:z.within10,
   sourceNativeTStillUnverified:true};
 record({...receipt,status:"RAW_FIRST_DURABLE_READBACK_PASS",stored});
 let after=null,settlementError=null;
 try{after=await getBalanceEvidenceStrict();}catch{settlementError="FREE_BALANCE_READ_UNAVAILABLE";}
 const spent=after?before.quota.apiUnitsRemaining-after.quota.apiUnitsRemaining:null;
 const alertDebit=after?before.balance.creditsRemaining-after.balance.creditsRemaining:null;
 if(after&&(spent!==2||alertDebit!==0))settlementError="BILLING_MISMATCH";
 const final={...base,window:w,
   status:settlementError?"G05E_CAPTURE_BILLING_HOLD":
     z.rows===0?"G05E_EMPTY_PROSPECTIVE_COHORT":"G05E_FIRST_PROSPECTIVE_RAW_CAPTURED",
   paidAttempts:attempts,apiUnitsSpent:spent,
   apiUnitsAfter:after?.quota.apiUnitsRemaining??null,
   alertCreditsSpent:alertDebit,
   alertCreditsAfter:after?.balance.creditsRemaining??null,
   officialOpenapiSha256:inspector.sha256,
   officialOpenapiVersion:inspector.version,
   stored,warning:settlementError,
   originalExactRunwayLabelProven:false,
   prospectiveAsOfT24FinalVerdict:"CANDIDATE_NOT_SCIENTIFICALLY_CERTIFIED",
   endedUtc:new Date().toISOString()};
 record(final);console.log(JSON.stringify(final));
 if(settlementError)process.exitCode=2;
}catch{
 const final={...base,status:"G05E_HOLD_DO_NOT_RETRY",
   paidAttempts:attempts,providerDebitHeader:headerDebit,
   oneUseIntentSpent:Boolean(intent),stored,
   reason:"PREFLIGHT_CUSTODY_OR_PROVIDER_HOLD_DETAILS_REDACTED",
   endedUtc:new Date().toISOString()};
 if(intent)try{record(final);}catch{}
 console.log(JSON.stringify(final));process.exitCode=2;
}finally{
 await pool.end().catch(()=>{});
}
