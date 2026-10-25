/**
 * Gate4 NEXT3 READ-ONLY hosted callback-health observer.
 * No provider GET/POST/CREATE/DELETE, no database writes, no secrets, no
 * payment authority and no actual provider STOP. The independent protected
 * Gate4 billing/owned-ID STOP remains separately ARMED and authoritative.
 *
 * --check-once: a single current public GET.
 * --watch: at 15s cadence until explicit bounded UTC deadline, with 6 PRIMARY
 * and 6 conditional BACKUP checks for transient failures.
 * Invalid published identity/contract is immediate STOP_OWNER recommendation.
 */
import {performance} from "node:perf_hooks";
import {setTimeout as sleep} from "node:timers/promises";
import {pathToFileURL} from "node:url";
import {
 advanceGate4CallbackObservationV39,
 initialGate4CallbackObservationStateV39,
 GATE4_CALLBACK_POLL_MS_V39
} from "../server/lib/disruption/gate4CallbackHealthSixPlusSix_v39";
import type {Stage1SanitizedCallbackHealthV39} from
 "./v39_phase2g_stage1_watchdog_6plus6_policy_v39";
const HOST="https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime";
const SRC="5878b90eed04b2edfe2b226735ff0f02d9be25f3";
const SCOPE="15bec7e1-8efc-49e7-9ee8-63521a76d71c";
const GO="WATCH_NEXT3_CALLBACK_HEALTH_SIX_PLUS_SIX_NO_PROVIDER";
const stop=(s:string):never=>{throw Error("GATE4_NEXT3_OBSERVER_"+s);};
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
export function classifyGate4PublicRuntimeV39(
 httpStatus:number|null,data:unknown,elapsedMs:number,
 transport:"ok"|"timeout"|"network"
):Stage1SanitizedCallbackHealthV39{
 if(transport!=="ok")return {
  healthy:false,check:"published_runtime",
  reason:transport==="timeout"?"request_timeout":"network_or_request_error",
  http_status:null,elapsed_ms:elapsedMs
 };
 if(httpStatus===200&&typeof data==="object"&&data!==null&&
    !Array.isArray(data)){
  const r=data as Record<string,unknown>;
  if(r.status==="PASS"&&r.git_head===SRC&&
     r.published_deployment===true&&
     r.prepaid_route_registered===true&&
     r.gate4_alert_ingress_registered===true)return {
      healthy:true,check:"all_checks",reason:"ok",
      http_status:200,elapsed_ms:elapsedMs
     };
 }
 return {
  healthy:false,check:"published_runtime",
  reason:"runtime_contract_or_http_mismatch",
  http_status:httpStatus,elapsed_ms:elapsedMs
 };
}
export async function fetchGate4PublicHealthV39(
 getter:typeof fetch=fetch
):Promise<Stage1SanitizedCallbackHealthV39>{
 const start=performance.now();
 let status:number|null=null,data:unknown=null;
 try{
  const response=await getter(HOST,{
   method:"GET",redirect:"error",signal:AbortSignal.timeout(8000),
   headers:{Accept:"application/json"}
  });
  status=response.status;
  if(status===200){
   try{data=await response.json();}
   catch{data=null;}
  }
  return classifyGate4PublicRuntimeV39(
   status,data,Math.round(performance.now()-start),"ok");
 }catch(e){
  const timeout=(e instanceof Error&&
    (e.name==="TimeoutError"||e.name==="AbortError"));
  return classifyGate4PublicRuntimeV39(
   null,null,Math.round(performance.now()-start),
   timeout?"timeout":"network");
 }
}
function fail():void{process.exitCode=2;}
async function main():Promise<void>{
 const mode=process.argv[2];
 if(process.argv.length!==3||!["--check-once","--watch"].includes(mode))
  stop("MODE_HOLD");
 if(mode==="--watch"&&
  process.env.GATE4_OBSERVER_GO!==GO)stop("NOT_AUTHORIZED_TO_START_WATCH");
 const until=String(process.env.GATE4_OBSERVER_STOP_UTC??"");
 let end=0;
 if(mode==="--watch"){
  if(!UTC.test(until)||new Date(until).toISOString()!==until)
   stop("INVALID_UTC_STOP");
  end=Date.parse(until);
  if(end-Date.now()<30_000||end-Date.now()>60*60_000)
   stop("WINDOW_MUST_BE_30S_TO_60MIN");
 }
 const first=await fetchGate4PublicHealthV39();
 if(mode==="--check-once"){
  const healthy=first.healthy===true;
  console.log(JSON.stringify({
   status:healthy?"GATE4_NEXT3_OBSERVER_PUBLIC_CHECK_PASS":
    "GATE4_NEXT3_OBSERVER_PUBLIC_CHECK_HOLD",
   reviewedSource:SRC,scopeId:SCOPE,healthy,
   publicHttpStatus:first.http_status,
   providerCalls:0,databaseWrites:0,paidAuthorized:false
  }));
  if(!healthy)fail();
  return;
 }
 let state=initialGate4CallbackObservationStateV39();
 let current=first,number=0;
 while(Date.now()<end){
  const now=performance.now();
  const result=advanceGate4CallbackObservationV39(
   state,current,now);
  state=result.state;number++;
  console.log(JSON.stringify({
   status:"GATE4_NEXT3_OBSERVER_TICK_NO_PROVIDER",
   sequence:number,phase:result.phase,action:result.action,
   reason:result.reason,healthy:current.healthy,
   httpStatus:current.http_status,
   consecutiveFailures:state.consecutiveFailures,
   scientificPassAuthorized:false,paidAuthorized:false,
   providerCalls:0,databaseWrites:0
  }));
  if(result.action==="STOP_OWNER"){
   console.log(JSON.stringify({
    status:"GATE4_NEXT3_OBSERVER_STOP_RECOMMENDED",
    reason:result.reason,actualProviderStopExecuted:false,
    independentBillingStopMustRemainArmed:true
   }));
   fail();return;
  }
  const remaining=end-Date.now();
  if(remaining<=GATE4_CALLBACK_POLL_MS_V39)break;
  await sleep(GATE4_CALLBACK_POLL_MS_V39);
  current=await fetchGate4PublicHealthV39();
 }
 console.log(JSON.stringify({
  status:"GATE4_NEXT3_OBSERVER_WINDOW_COMPLETE",
  checks:number,hadAnyHealthOutage:state.maximumFailures>0,
  scientificPassAuthorized:false,providerCalls:0,databaseWrites:0
 }));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void main().catch(()=>{
  console.log(JSON.stringify({
   status:"GATE4_NEXT3_OBSERVER_HOLD",
   providerCalls:0,databaseWrites:0,paidAuthorized:false
  }));fail();
 });
