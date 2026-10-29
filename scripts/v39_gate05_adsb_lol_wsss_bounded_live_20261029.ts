/**
 * Finite, zero-paid WSSS live source RESEARCH pilot, not a production feed.
 * 6 public GETs, 60 sec apart, 0 retries, only before 2026-11-01T00:00Z.
 * Anonymous aggregate only. No identifiers, coordinates, DB, blobs or alerts.
 */
import {setTimeout as delay} from "node:timers/promises";
import {normalizeGate05AdsbLolOfflineV39,
  type Gate05AdsbResultV39} from "../server/lib/disruption/gate05ZeroCostAdsbEvidence_v39";
import {summarizeGate05AdsbContinuityV39}
  from "../server/lib/disruption/gate05LiveAdsbContinuity_v39";

const URL="https://api.adsb.lol/v2/point/1.359211/103.989325/60";
const END=Date.parse("2026-11-01T00:00:00.000Z");
const MAX_GETS=6;
const SLEEP_MS=60000;
function guard(){
  if(process.env.GITHUB_ACTIONS!=="true"||
     process.env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
     process.env.GITHUB_REF!=="refs/heads/main"||
     !["push","schedule"].includes(process.env.GITHUB_EVENT_NAME??"")||
     process.env.GITHUB_RUN_ATTEMPT!=="1")
    throw Error("RESEARCH_ONLY_GITHUB_MAIN_FIRST_ATTEMPT");
}
function fail(code:string):never{throw Error("GATE05_PUBLIC_ADSB_"+code);}
async function once():Promise<Gate05AdsbResultV39>{
  const response=await fetch(URL,{
    method:"GET",redirect:"error",headers:{accept:"application/json"},
    signal:AbortSignal.timeout(12000)
  });
  if(response.status!==200)fail("UPSTREAM_NON_200");
  const length=response.headers.get("content-length");
  if(length!==null&&(!/^\\d+$/.test(length)||Number(length)>8000000))
    fail("RESPONSE_SIZE_HOLD");
  const body=await response.text();
  if(body.length>8000000)fail("RESPONSE_SIZE_HOLD");
  let value:unknown;
  try{value=JSON.parse(body);}catch{fail("INVALID_JSON");}
  // Response arrival is the earliest feature availability, NOT the ADS-B
  // broadcast timestamp, NOT prospective AeroDataBox snapshot availability.
  return normalizeGate05AdsbLolOfflineV39(value,new Date().toISOString());
}
async function main(){
  guard();
  if(Date.now()>=END){
    console.log(JSON.stringify({
      schema:"v39.gate05.adsb-research-finite.v1",
      status:"SUNSET_NO_FURTHER_SOURCE_CALLS",
      publicGetCount:0,paidProviderCalls:0
    }));
    return;
  }
  const samples:Gate05AdsbResultV39[]=[];
  let errorCode:string|null=null;
  for(let i=0;i<MAX_GETS;i++){
    if(Date.now()>=END)break;
    try{samples.push(await once());}
    catch(e){
      // Never log provider response or exception internals to public CI.
      errorCode=e instanceof Error&&e.message.startsWith("GATE05_")?
        e.message:"SOURCE_NETWORK_OR_SHAPE_HOLD";
      break;
    }
    if(i<MAX_GETS-1)await delay(SLEEP_MS);
  }
  const summary=summarizeGate05AdsbContinuityV39(samples);
  const status=errorCode?"PARTIAL_OR_UNAVAILABLE_SOURCE_HOLD":
    samples.length===MAX_GETS?"FINITE_RESEARCH_WINDOW_OBSERVED":"SUNSET_PARTIAL_WINDOW";
  console.log(JSON.stringify({
    status,windowEndedAtUtc:new Date().toISOString(),
    publicGetCount:samples.length,maximumPublicGetsPerRun:MAX_GETS,
    requestedGapSeconds:SLEEP_MS/1000,sourceFailureCode:errorCode,
    ...summary,flightLinkage:"NOT_VERIFIED",
    originalGate05ScientificPass:false,
    realtimeServiceOrProductionPermissionNotEstablished:true,
    paidProviderCalls:0,dbWrites:0,persistentRawDataWritten:false
  }));
  if(errorCode)process.exitCode=2;
}
void main().catch(()=>{
  console.log(JSON.stringify({
    status:"RESEARCH_GUARD_OR_INTERNAL_HOLD",
    noPaidProviderRequests:true,noProductionWrites:true
  }));
  process.exitCode=2;
});