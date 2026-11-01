/**
 * ONE authorized real AeroDataBox FIDS Tier2 GET (~2 REST units), no
 * persistence, retry, redirect, subscriptions, DB access, provider JSON logs.
 * Scope: bounded one-hour WSSS departures just before this fresh run.
 * The user authorized paid use; this job is intentionally not Gate5 PASS.
 */
import "dotenv/config";
import {execFileSync} from "node:child_process";
import {getBalanceEvidenceStrict}
 from "../server/lib/disruption/aerodataboxLimiter_v3";
import {inspectP4OnePaidNonretainedFidsV39}
 from "../server/lib/disruption/phase4Gate5OnePaidNonretainedSourceInspection_v39";
const REPO="HKcode22/ReplitTranvr";
const WORKFLOW="Phase4 Gate5 One Real Paid Nonretained FIDS Semantics Probe";
const WORKFLOW_REF=REPO+
 "/.github/workflows/phase4-gate5-one-real-paid-nonretained-fids-semantics.yml@refs/heads/main";
const INTENT="GATE5_ONE_PAID_FIDS_SEMANTIC_FEASIBILITY_2_UNITS_NO_RETENTION";
const MAX_BYTES=4*1024*1024;
const ROLLOVER=Date.parse("2026-11-03T00:00:00.000Z");
function local(t:number):string{
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Singapore",
  year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",
  minute:"2-digit",hourCycle:"h23"
 }).formatToParts(new Date(t)).filter(x=>x.type!=="literal")
 .map(x=>[x.type,x.value]));
 const result=[parts.year,parts.month,parts.day].join("-")+
  "T"+parts.hour+":"+parts.minute;
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(result))
  throw Error("P4_G5_ONE_PAID_LOCAL_TIME_HOLD");
 return result;
}
async function bodyBytes(resp:Response):Promise<Uint8Array>{
 const declared=resp.headers.get("content-length");
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BYTES))
  throw Error("P4_G5_ONE_PAID_BODY_OVERSIZE_HOLD");
 const reader=resp.body?.getReader();
 if(!reader)throw Error("P4_G5_ONE_PAID_RESPONSE_BODY_MISSING");
 const parts:Uint8Array[]=[];let length=0;
 try{
  while(true){
   const chunk=await reader.read();if(chunk.done)break;
   length+=chunk.value.byteLength;
   if(length>MAX_BYTES){
    await reader.cancel().catch(()=>undefined);
    throw Error("P4_G5_ONE_PAID_BODY_OVERSIZE_HOLD");
   }
   parts.push(chunk.value);
  }
 }finally{reader.releaseLock();}
 const all=new Uint8Array(length);let pos=0;
 for(const part of parts){all.set(part,pos);pos+=part.byteLength;}
 return all;
}
export function assertP4G5OnePaidEphemeralContext(
 env:NodeJS.ProcessEnv,checkoutSha:string,now:number
){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==REPO||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="push"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    env.GITHUB_JOB!=="one-real-paid-nonretained-fids"||
    env.GITHUB_WORKFLOW!==WORKFLOW||
    env.GITHUB_WORKFLOW_REF!==WORKFLOW_REF||
    env.GITHUB_SHA!==checkoutSha||
    !/^[a-f0-9]{40}$/.test(checkoutSha)||
    !/^[0-9]{5,25}$/.test(env.GITHUB_RUN_ID??"")||
    env.P4_G5_PAID_EXACT_INTENT!==INTENT||
    !Number.isFinite(now)||now>=ROLLOVER||
    !env.AERODATABOX_API_KEY||env.AERODATABOX_API_KEY.length<10||
    !!env.DATABASE_URL||!!env.V39_DATABASE_RUNTIME_URL||
    !!env.GATE05_AUTOMATION_DATABASE_URL||!!env.RAPIDAPI_KEY)
  throw Error("P4_G5_ONE_PAID_CONTEXT_OR_RETENTION_HOLD");
}
export async function main(){
 let attempts=0,debitedUnits:number|null=null;
 try{
  const env=process.env;
  const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
  assertP4G5OnePaidEphemeralContext(env,sha,Date.now());
  const account=await getBalanceEvidenceStrict();
  const before=account.quota.apiUnitsRemaining;
  const requests=account.quota.requestsRemaining;
  if(!Number.isSafeInteger(before)||before<100||
     !Number.isSafeInteger(requests)||requests<10||
     account.quota.apiUnitsLimit<100||
     Date.now()-Date.parse(account.quota.observedAtUtc)>30_000)
   throw Error("P4_G5_ONE_PAID_QUOTA_FLOOR_OR_STALE_HOLD");
  // A recent complete 60-minute WSSS service interval is more likely to
  // contain mature runway fields than a future PRE-source request.
  const minute=60000,hour=3600000,now=Date.now();
  const end=Math.floor((now-60*minute)/hour)*hour;
  const start=end-hour;
  if(start<=0||end-start!==hour)
   throw Error("P4_G5_ONE_PAID_LOCAL_WINDOW_HOLD");
  const from=local(start),to=local(end);
  if(from>=to)throw Error("P4_G5_ONE_PAID_LOCAL_ORDER_HOLD");
  const qs=new URLSearchParams({
   direction:"Departure",withLeg:"true",withCancelled:"true",
   withCodeshared:"true",withCargo:"false",withPrivate:"false",
   withLocation:"false"
  });
  assertP4G5OnePaidEphemeralContext(env,sha,Date.now());
  // Irrevocable single physical attempt, even if network/HTTP fails.
  attempts=1;
  console.log("P4_G5_ONE_REAL_FIDS_PAID_GET_STARTED_ONE_ATTEMPT_NO_RETRIES");
  const response=await fetch(
   "https://aerodatabox.p.rapidapi.com/flights/airports/icao/WSSS/"+
   encodeURIComponent(from)+"/"+encodeURIComponent(to)+"?"+qs,
   {method:"GET",redirect:"error",signal:AbortSignal.timeout(15000),
    headers:{"X-RapidAPI-Host":"aerodatabox.p.rapidapi.com",
     "X-RapidAPI-Key":env.AERODATABOX_API_KEY!,Accept:"application/json"}}
  );
  if(response.status!==200)
   throw Error("P4_G5_ONE_PAID_NON200_NO_RETRY");
  const header=response.headers.get("x-ratelimit-api-units-remaining");
  if(header&&/^\d+$/.test(header)){
   const n=Number(header);
   if(Number.isSafeInteger(n)&&n<=before)
    debitedUnits=before-n;
  }
  const bytes=await bodyBytes(response);
  let decoded:unknown;
  try{
   decoded=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  }catch{throw Error("P4_G5_ONE_PAID_JSON_HOLD");}
  const summary=inspectP4OnePaidNonretainedFidsV39(decoded);
  // No individual response content, raw bytes, identifiers or timestamps
  // are persisted by this source-shape-only paid workflow.
  console.log(JSON.stringify({
   ...summary,providerRequestsAttempted:attempts,
   tier2UnitsExpected:2,measuredProviderUnitDelta:debitedUnits,
   responseContentPersisted:false,
   normalizationsPersisted:false,
   databaseConnections:0,
   alertsCreated:0,retries:0
  }));
  if(debitedUnits!==null&&debitedUnits!==2)
   process.exitCode=2;
 }catch{
  console.error(JSON.stringify({
   status:attempts?
    "P4_G5_ONE_PAID_ATTEMPT_SPENT_OUTCOME_NOT_PROVEN_NO_RETRY":
    "P4_G5_ONE_PAID_PREFLIGHT_HOLD_NO_PAID_GET",
   requestsAttempted:attempts,measuredProviderUnitDelta:debitedUnits,
   responseContentPersisted:false,databaseConnections:0,
   retries:0,alertsCreated:0,strictGate5Passed:false,
   failureDetailsRedacted:true
  }));
  process.exitCode=2;
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_one_paid_nonretained_fids_semantics_actions.ts"))
 void main();
