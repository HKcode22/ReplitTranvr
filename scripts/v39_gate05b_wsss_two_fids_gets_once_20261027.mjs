/**
 * Gate05b NEW prospective micro-retake, NOT the expired WSSS12 gate.
 * USER-TRIGGERED once, at most TWO paid FIDS GET physical attempts, zero retries.
 * Expected Tier2 charge: 2 API units/request, 4 units aggregate. This is
 * NOT an absolute provider overage price cap, and does not prove runway-label
 * semantics. All raw provider JSON stays in volatile process memory only.
 *
 * Never issue Alert CREATE, DELETE, refill, POST or production DB mutation.
 * All externally paid possible traffic is restricted to two WSSS FIDS GETs.
 * Crash/timeout/429 after one shot is AMBIGUOUS: never rerun.
 */
import "dotenv/config";
import {execFileSync} from "node:child_process";
import {mkdirSync,writeFileSync} from "node:fs";
import {homedir} from "node:os";
import {join} from "node:path";

const GO="AUTHORIZE_ONE_NEW_WSSS_GATE05B_TWO_GET_RETEST_EXPECTED_4_UNITS_ZERO_RETRIES";
const status=(x)=>console.log(JSON.stringify(x));
if(process.env.GATE05B_PAID_GO!==GO)
 throw Error("GATE05B_HOLD_FRESH_EXACT_USER_APPROVAL");
if(!/^[0-9a-f]{40}$/.test(process.env.GATE05B_REVIEWED_MAIN_SHA||""))
 throw Error("GATE05B_HOLD_REVIEWED_SOURCE");
const expected=process.env.GATE05B_REVIEWED_MAIN_SHA;
const actual=execFileSync("git",["rev-parse","FETCH_HEAD"],{encoding:"utf8",timeout:5000}).trim();
if(actual!==expected)throw Error("GATE05B_HOLD_MAIN_SOURCE_MISMATCH");
if(!process.env.AERODATABOX_API_KEY || process.env.AERODATABOX_API_KEY.length<10)
 throw Error("GATE05B_HOLD_PROVIDER_KEY");
const BASE="https://aerodatabox.p.rapidapi.com";
const headers={
 "x-rapidapi-host":"aerodatabox.p.rapidapi.com",
 "x-rapidapi-key":process.env.AERODATABOX_API_KEY,
 "accept":"application/json"
};
const MIN_MS=2600;
let lastStart=null;
let paidAttempts=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function intHeader(h,name){
 const s=h.get(name);
 if(s===null||!/^[0-9]{1,12}$/.test(s))
  throw Error("GATE05B_HOLD_QUOTA_HEADER_"+name);
 const n=Number(s);
 if(!Number.isSafeInteger(n))throw Error("GATE05B_HOLD_QUOTA_INVALID");
 return n;
}
async function get(path,paid=false){
 if(!/^\/(?:subscriptions\/balance|flights\/airports\/icao\/WSSS\/\d{4}-\d\d-\d\dT\d\d%3A\d\d\/\d{4}-\d\d-\d\dT\d\d%3A\d\d\?.*)$/.test(path))
  throw Error("GATE05B_HOLD_NON_ALLOWLISTED_PATH");
 if(paid&&(!path.includes("direction=Departure")||
           !path.includes("withLeg=true")||
           !path.includes("withPrivate=false")||
           !path.includes("withCargo=false")||
           !/withLocation=(?:true|false)/.test(path)))
  throw Error("GATE05B_HOLD_QUERY_CONTRACT");
 if(lastStart!==null){
   const ms=Math.max(0,MIN_MS-(Date.now()-lastStart));
   if(ms)await sleep(ms);
 }
 lastStart=Date.now();
 if(paid){
  if(paidAttempts>=2)throw Error("GATE05B_HOLD_PAID_ATTEMPT_CEILING");
  paidAttempts++;
 }
 const res=await fetch(BASE+path,{
   method:"GET",headers,redirect:"error",signal:AbortSignal.timeout(12_000)
 });
 if(res.status!==200)
   throw Error("GATE05B_HOLD_HTTP_"+res.status+(paid?"_BILLABLE_OUTCOME_AMBIGUOUS":""));
 const b=await res.arrayBuffer();
 if(b.byteLength>8_000_000)throw Error("GATE05B_HOLD_BODY_TOO_LARGE");
 let obj;
 try{obj=JSON.parse(Buffer.from(b).toString("utf8"))}
 catch{throw Error("GATE05B_HOLD_PROVIDER_JSON");}
 return {obj,h:res.headers};
}
function numbersFromBalance(b){
 const body=b.obj?.balance??b.obj;
 const credits=Number(body?.creditsRemaining);
 if(!Number.isSafeInteger(credits)||credits<0)
  throw Error("GATE05B_HOLD_BALANCE_SHAPE");
 return {api:intHeader(b.h,"x-ratelimit-api-units-remaining"),
   requests:intHeader(b.h,"x-ratelimit-requests-remaining"),credits};
}
function sgLocal(ms){
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{
  timeZone:"Asia/Singapore",year:"numeric",month:"2-digit",day:"2-digit",
  hour:"2-digit",minute:"2-digit",hourCycle:"h23"
 }).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
 return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
function validTime(x){
 const s=x?.utc;
 // AeroDataBox examples include e.g. "2023-10-04 18:01Z" (space).
 // .utc is not always strict RFC3339 T; allow either explicit UTC style.
 if(typeof s!=="string"||
    !/^\d{4}-\d\d-\d\d[T ]\d\d:\d\d(?::\d\d(?:\.\d{1,9})?)?(?:Z|\+00:00)$/.test(s))
   return false;
 const normalized=s.replace(" ","T");
 const ms=Date.parse(normalized);
 return Number.isFinite(ms)&&
   new Date(ms).toISOString().slice(0,16)===normalized.slice(0,16);
}
function survey(data,withLocation){
 if(!data||typeof data!=="object"||Array.isArray(data)||
    !Array.isArray(data.departures)||data.departures.length>2000)
  throw Error("GATE05B_HOLD_DEPARTURE_SCHEMA");
 const keys=new Set();
 const out={
  withLocation,departureObjects:data.departures.length,malformedObjects:0,
  scheduledUtcPresent:0,revisedUtcPresent:0,runwayUtcPresent:0,
  scheduledUtcNonempty:0,revisedUtcNonempty:0,runwayUtcNonempty:0,
  sourceDepartureObjects:0,sourceMovementObjects:0,
  anyLiveQuality:0,operatorCodeshare:0,marketingCodeshare:0,
  unknownCodeshare:0,provisionalDistinctOperatingLegKeys:0,
  runwayTimestampActualityProven:false,
  scheduledWheelsOffReferenceProven:false,
  predictionCutoffTProven:false,
  canonicalOperatingLegIdentityProven:false
 };
 for(const x of data.departures){
  if(!x||typeof x!=="object"||Array.isArray(x)){out.malformedObjects++;continue;}
  const isObj=y=>y!==null&&typeof y==="object"&&!Array.isArray(y);
  const dep=isObj(x.departure)?x.departure:null;
  const mov=isObj(x.movement)?x.movement:null;
  const d=dep??mov??{};
  if(dep)out.sourceDepartureObjects++;
  else if(mov)out.sourceMovementObjects++;
  const nonempty=t=>typeof t?.utc==="string"&&t.utc.trim().length>0;
  if(nonempty(d.scheduledTime))out.scheduledUtcNonempty++;
  if(nonempty(d.revisedTime))out.revisedUtcNonempty++;
  if(nonempty(d.runwayTime))out.runwayUtcNonempty++;
  if(validTime(d.scheduledTime))out.scheduledUtcPresent++;
  if(validTime(d.revisedTime))out.revisedUtcPresent++;
  if(validTime(d.runwayTime))out.runwayUtcPresent++;
  if((Array.isArray(d.quality)?d.quality:Array.isArray(x.quality)?x.quality:[]).includes("Live"))out.anyLiveQuality++;
  const cs=x.codeshareStatus;
  if(cs==="IsOperator")out.operatorCodeshare++;
  else if(cs==="IsCodeshared")out.marketingCodeshare++;
  else out.unknownCodeshare++;
  // Process-local keys only. Never written to JSON receipt/logs.
  const n=typeof x.number==="string"?x.number:"";
  const a=x.arrival?.airport?.icao??mov?.airport?.icao??"";
  const sched=d.scheduledTime?.utc??"";
  if(cs==="IsOperator"&&n&&a&&validTime(d.scheduledTime))
    keys.add(JSON.stringify([n,a,sched]));
 }
 out.provisionalDistinctOperatingLegKeys=keys.size;
 return out;
}
const now=Date.now();
// Narrow finite owner approval; never make first paid GET after sprint cutoff.
if(now>Date.parse("2026-10-29T03:00:00.000Z") ||
   now<Date.parse("2026-10-26T00:00:00.000Z"))
 throw Error("GATE05B_HOLD_SIGNED_STUDY_WINDOW_EXPIRED");
const fromLocal=sgLocal(now-30*60_000);
const toLocal=sgLocal(now-10*60_000);
const pre=numbersFromBalance(await get("/subscriptions/balance"));
if(pre.api<4||pre.credits<1900)
 throw Error("GATE05B_HOLD_QUOTA_OR_ALERT_CREDIT_FLOOR");
const root=join(homedir(),".config","replittranvr","gate05b-one-paid-20261027");
mkdirSync(root,{recursive:true,mode:0o700});
const receiptPath=join(root,"once-intent.json");
const base={
 schema:"v39.gate05b.wsss-two-fids-paid-retake.v1",
 sourceSha:expected,
 status:"INTENT_SPENT_BEFORE_ANY_PAID_GET",
 startUtc:new Date().toISOString(),
 queryAirport:"WSSS",queryLocalWindow:{fromLocal,toLocal},
 sourceWindowIsHistorical:true,
 expectedMaximumApiUnits:4,hardProviderCostCap:false,
 noRetries:true,approvedMaximumPhysicalFidsGets:2,
 apiUnitsBefore:pre.api,alertCreditsBefore:pre.credits,
 flightDataWritten:false,labelProven:false,paidAttempts:0
};
// 'wx' intentionally consumes the one-off intent; do not delete/retry on failure.
writeFileSync(receiptPath,JSON.stringify(base)+"\n",{flag:"wx",mode:0o600});
function save(part){
 writeFileSync(receiptPath,JSON.stringify({...base,...part})+"\n",{mode:0o600});
}
let outputs=[];
let error=null;
try{
 for(const withLocation of [false,true]){
  const params=new URLSearchParams({
   direction:"Departure",withCancelled:"true",withCodeshared:"true",
   withCargo:"false",withPrivate:"false",withLocation:String(withLocation),
   withLeg:"true"
  });
  const q="/flights/airports/icao/WSSS/"+
   encodeURIComponent(fromLocal)+"/"+encodeURIComponent(toLocal)+"?"+params;
  save({status:"PAID_GET_DISPATCH_INTENT",paidAttempts:paidAttempts+1,
    completedVariants:outputs,currentlyDispatchingWithLocation:withLocation});
  const result=await get(q,true);
  outputs.push(survey(result.obj,withLocation));
  save({status:"PARTIAL_PAID_RETURN_RECEIVED",paidAttempts,completedVariants:outputs});
 }
}catch(e){
 error=e instanceof Error?e.message:"GATE05B_HOLD_UNEXPECTED";
}
let after=null,settlementError=null;
try{after=numbersFromBalance(await get("/subscriptions/balance"))}
catch(e){settlementError=e instanceof Error?e.message:"GATE05B_POST_BALANCE_UNKNOWN"}
const spent=after?pre.api-after.api:null;
const creditsDelta=after?pre.credits-after.credits:null;
const ok=!error&&!settlementError&&outputs.length===2&&spent===4&&creditsDelta===0;
const final={
 status:ok?"GATE05B_TWO_PAID_FIDS_GETS_AGGREGATE_MEASUREMENT_PASS":
  "GATE05B_PAID_RECHECK_HOLD_DO_NOT_RERUN",
 paidAttempts,completedVariants:outputs,
 apiUnitsAfter:after?.api??null,apiUnitsSpent:spent,
 alertCreditsAfter:after?.credits??null,alertCreditsSpent:creditsDelta,
 detail:error??settlementError??(ok?null:"ACCOUNTING_MISMATCH_OR_NO_TWO_RESULTS"),
 actualWheelsOffProven:false,scheduledWheelsOffSourceProven:false,
 phase4PaidAuthorized:false,
 historicalDataRetained:false,
 endedUtc:new Date().toISOString()
};
save(final);
status({...final,completedVariants:outputs});
if(!ok)process.exitCode=2;
