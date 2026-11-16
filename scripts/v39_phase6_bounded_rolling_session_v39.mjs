/** Initial bounded rolling runtime using the original worker workflows.
 * Direct provider calls and DB connections are forbidden in this controller.
 * It CAN cause separately approved paid children, so global release and
 * one exact protected session are required. No automatic successor yet.
 */
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {readP6RollingGithubSnapshot,restrictP6RollingWave,dispatchP6ReviewedRollingWave} from "../server/lib/disruption/phase6RollingGithubController_v39.mjs";
import {loadP6RollingCalendarHints,assessP6RollingCalendarHints} from "../server/lib/disruption/phase6RollingCalendarHints_v39.mjs";
import {createP6SessionAckLedger} from "../server/lib/disruption/phase6RollingSessionAckLedger_v39.mjs";
const REPO="HKcode22/ReplitTranvr",ROOT="https://api.github.com/repos/"+REPO;
const WF="phase6-rolling-controller-bounded-session.yml";
const CONFIRM="RUN_ONE_PROTECTED_ROLLING_SESSION_AFTER_SEPARATE_PHASE6_GO";
const MIN=60000;
const hold=s=>{throw Error("HOLD_P6_ROLLING_RUNTIME_"+s);};
const time=x=>{
 if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)hold("INVALID_PROTECTED_UTC");
 return Date.parse(x);
};
const sleepDefault=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function admitP6RollingSession(env,now=Date.now()){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_RUN_ATTEMPT!=="1"||
    !/^[1-9][0-9]{0,14}$/.test(env.GITHUB_RUN_ID??"")||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.P6_ROLLING_REQUESTED_MAIN_SHA||env.GITHUB_SHA!==env.V39_P5_APPROVED_CODE_SHA||
    env.P6_ROLLING_SESSION_CONFIRM!==CONFIRM||env.P6_ROLLING_CONTROLLER_ENABLED!=="1"||
    env.P6_ROLLING_SESSION_APPROVED!=="1"||env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||env.V39_P5_SEVEN_REST_BUDGET_SIGNED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1"||env.V39_PHASE6_OWNER_APPROVED!=="1"||
    env.P5_CD_GH_PRE_STOP!=="0"||env.ADB_AUTO_COLLECT!=="0"||
    typeof env.GITHUB_TOKEN!=="string"||env.GITHUB_TOKEN.length<16||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    ["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","DATABASE_URL","V39_DATABASE_RUNTIME_URL",
     "V39_P5_SOURCE_DATABASE_URL","P5_V39_PRE_DATABASE_URL","P5_V39_PREPARE_DATABASE_URL",
     "P5_V39_T24_WITNESS_DATABASE_URL","P6_PRIVATE_READER_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL",
     "P5_V39_OTHER_REST_REVIEW_DATABASE_URL","P5_V39_OTHER_REST_RESERVE_DATABASE_URL"].some(k=>env[k]))
  hold("NO_PROTECTED_REAL_SESSION_APPROVAL");
 const epoch=time(env.P6_ROLLING_SESSION_EPOCH_UTC),deadline=time(env.P6_ROLLING_SESSION_DEADLINE_UTC);
 // Initial commissioning envelope, NOT the eventual 4h/31-day controller.
 // A missed launch must not silently reset the protected epoch.
 if(epoch%1000!==0||epoch>now||deadline-epoch>30*MIN||deadline-now<15*MIN)
  hold("OUTSIDE_INITIAL_BOUNDED_SESSION");
 const wire=env.P6_NONPAID_DAILY_POLICY_BASE64;
 if(typeof wire!=="string"||wire.length>46668||!/^[A-Za-z0-9+/]+={0,2}$/.test(wire))
  hold("MISSING_REVIEWED_CALENDAR");
 const policyBytes=Buffer.from(wire,"base64");
 if(policyBytes.toString("base64")!==wire)hold("NONCANONICAL_POLICY");
 const trust={reviewedCodeSha:env.GITHUB_SHA,manifestSha256:env.V39_P5_MANIFEST_SHA256,
  calendarSha256:env.V39_P5_CALENDAR_HASH,releaseSha256:env.V39_P5_RELEASE_SHA256,rightsSha256:env.V39_P5_RIGHTS_SHA256};
 return {sha:env.GITHUB_SHA,id:Number(env.GITHUB_RUN_ID),epoch,deadline,policyBytes,
  expectedPolicySha256:env.P6_NONPAID_DAILY_POLICY_SHA256,trust};
}
export async function runP6RollingSession(env,{now=Date.now,sleep=sleepDefault,fetcher=fetch,readPlan,emit=()=>{}}={}){
 const started=now(),a=admitP6RollingSession(env,started);
 const calendar=loadP6RollingCalendarHints({...a,read:readPlan});
 if(a.epoch<calendar.from||a.deadline>calendar.until)hold("SESSION_OUTSIDE_REVIEWED_POLICY");
 const ledger=createP6SessionAckLedger({...a,now,emit});
 let requests=0,waves=0,calendarDeferred=0,visibilityDeferrals=0,visibilityUnresolved=false;
 const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+env.GITHUB_TOKEN,"X-GitHub-Api-Version":"2022-11-28"};
 const api=async(url,init)=>{
  const u=new URL(url);
  if(u.origin!=="https://api.github.com"||!u.pathname.startsWith("/repos/"+REPO+"/")||
     u.username||u.password||u.hash||!["GET","POST"].includes(init?.method)||
     now()>=a.deadline-12000||++requests>450)hold("API_SCOPE_OR_SESSION_REQUEST_BOUND");
  // Every write originates only in the imported fixed-route dispatch core.
  // Refuse a call if it cannot leave a separate reconciliation window.
  if(init.method==="POST"&&now()>=a.deadline-12*MIN)hold("DISPATCH_DRAIN_BOUND");
  const response=await fetcher(url,{...init,redirect:"error",signal:AbortSignal.timeout(10000)});
  const remaining=response.headers?.get?.("x-ratelimit-remaining");
  if(remaining!==null&&remaining!==undefined&&(!/^\d+$/.test(remaining)||Number(remaining)<25))
   hold("RATE_LIMIT_RESERVE");
  return response;
 };
 const get=async(path)=>{
  const res=await api(ROOT+path,{method:"GET",headers});
  if(!res.ok)hold("GITHUB_READ_UNAVAILABLE");
  return await res.json();
 };
 const main=async()=>{if((await get("/git/ref/heads/main"))?.object?.sha!==a.sha)hold("MAIN_CHANGED");};
 async function uniqueRoot(){
  const path=".github/workflows/"+WF,created=encodeURIComponent(">="+new Date(a.epoch).toISOString());
  const h=await get("/actions/workflows/"+WF+"/runs?branch=main&event=workflow_dispatch&per_page=100&created="+created);
  if(h?.total_count!==1||!Array.isArray(h.workflow_runs)||h.workflow_runs.length!==1)
   hold("PREVIOUS_OR_DUPLICATE_SESSION_NO_REPLAY");
  const row=h.workflow_runs[0],createdAt=Date.parse(row?.created_at);
  if(row.id!==a.id||row.path!==path||row.head_sha!==a.sha||row.head_branch!=="main"||
     row.event!=="workflow_dispatch"||row.run_attempt!==1||row.status!=="in_progress"||
     !Number.isFinite(createdAt)||createdAt<a.epoch||createdAt>now()+5000)
   hold("SESSION_ROOT_IDENTITY_DRIFT");
 }
 async function pause(ms){
  const prior=now();
  await sleep(ms);
  if(now()<prior+ms-250||now()>=a.deadline)hold("SESSION_CLOCK_OR_DEADLINE");
 }
 await main();await uniqueRoot();
 // Allow a maximum of 8 waves under the first 30-minute protected window.
 // 2 minutes polling cadence is provisional; actual timing must be measured.
 while(waves<8&&now()<a.deadline-12*MIN-60000){
  await ledger.reconcile({token:env.GITHUB_TOKEN,fetcher:api});
  let observation;
  try{
   observation=await readP6RollingGithubSnapshot({sha:a.sha,epoch:a.epoch,token:env.GITHUB_TOKEN,now,fetcher:api,
    verifySnapshot:ledger.assertVisible});
  }catch(e){
   // A known ACK may be temporarily absent from GitHub's list or become
   // terminal between direct readback and the list. Retry GETs only, never
   // POSTs; other identity/authorization failures remain immediate HOLDs.
   if(!["HOLD_P6_ROLLING_SESSION_ACK_NOT_VISIBLE_IN_EXACT_HISTORY","HOLD_P6_ROLLING_SESSION_ACK_TERMINAL_NOT_YET_RECONCILED"].includes(e?.message))throw e;
   visibilityUnresolved=true;visibilityDeferrals++;waves++;
   emit({status:"ROLLING_WAVE_DEFERRED_ACK_VISIBILITY_NO_DISPATCH",wave:waves,...ledger.status()});
   if(waves<8&&now()+2*MIN<a.deadline-12*MIN-60000){await pause(2*MIN);continue;}
   break;
  }
  visibilityUnresolved=false;
  const {plan,recheckRoute}=observation;
  if(plan.status!=="REVIEWED_ROLLING_WAVE_PLAN_NO_GO")hold("CURRENT_HISTORY_HOLD");
  const hint=assessP6RollingCalendarHints(calendar,now());
  if(hint.status!=="REVIEWED_CALENDAR_WAKE_HINT_ONLY_NO_GO")hold("CALENDAR_WINDOW_UNKNOWN");
  const narrowed=restrictP6RollingWave(plan,hint.hints.filter(x=>x.mayNeedWork).map(x=>x.lane));
  calendarDeferred+=narrowed.calendarDeferred.length;
  if(narrowed.due.length){
   const dispatchDeadline=Math.min(a.deadline-12*MIN,now()+5*MIN);
   if(dispatchDeadline-now()<60000)break;
   await dispatchP6ReviewedRollingWave(narrowed,{sha:a.sha,approvedSha:a.sha,releaseApproved:true,token:env.GITHUB_TOKEN,
    deadline:dispatchDeadline,now,fetcher:api,recheckRoute:async route=>ledger.assertVisible(route,await recheckRoute(route)),
    onEvidence:ledger.evidence});
  }
  waves++;
  emit({status:"ROLLING_WAVE_OBSERVED_NOT_COLLECTION_PROOF",wave:waves,calendarDeferred:narrowed.calendarDeferred.length,
   ...ledger.status()});
  if(waves<8&&now()+2*MIN<a.deadline-12*MIN-60000)await pause(2*MIN);else break;
 }
 // No subsequent wave until accepted IDs are really reconciled.
 // All accepted parents drain to exact terminal job outcomes before this
 // root reports success. Paid child receipts remain independent.
 for(let i=0;i<24;i++){
  const state=await ledger.reconcile({token:env.GITHUB_TOKEN,fetcher:api});
  if(!state.pending.length){
   if(visibilityUnresolved)hold("ACK_HISTORY_VISIBILITY_UNRESOLVED_NO_SUCCESSOR");
   await uniqueRoot();await main();
   return {schema:"v39.phase6.bounded-rolling-session.v1",status:"BOUNDED_SESSION_TERMINAL_NO_SUCCESSOR_NOT_COLLECTION_PROOF",
    runId:a.id,reviewedMainSha:a.sha,epochUtc:new Date(a.epoch).toISOString(),deadlineUtc:new Date(a.deadline).toISOString(),
    waves,calendarDeferred,visibilityDeferrals,githubRequests:requests,...state};
  }
  if(now()+30000>=a.deadline-12000)hold("PENDING_ACCEPTED_WORKERS_AT_DEADLINE");
  await pause(30000);
 }
 hold("BOUND_EXHAUSTED_PENDING_ACCEPTED_WORKERS");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const out=await runP6RollingSession(process.env,{emit:e=>console.log(JSON.stringify(e))});
  console.log(JSON.stringify(out));
 }catch(e){const m=e?.message??"";console.error(/^HOLD_P6_ROLLING_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_ROLLING_RUNTIME_REDACTED_NO_REPLAY");process.exitCode=2;}
}
