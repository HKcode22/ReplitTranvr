/** Direct single-wave fallback for the EXISTING reviewed worker routes.
 * No V0102/root claim, no chain, no provider key and no DB connection.
 * A separate approved activation epoch plus full negative-history scans
 * preserve prior uncertainty; a sliding observation window is NOT a replay
 * authorization. Pending exact ACKs may be carried only through a byte-
 * verified predecessor receipt and independent ordinary/active history.
 * No uncertain attempt may cross a tick boundary.
 */
import {readP6RollingGithubSnapshot,restrictP6RollingWave,dispatchP6ReviewedRollingWave,P6_ROLLING_ROUTES,createP6RollingScheduleEvidenceCache} from "../server/lib/disruption/phase6RollingGithubController_v39.mjs";
import {loadP6RollingCalendarHints,assessP6RollingCalendarHints} from "../server/lib/disruption/phase6RollingCalendarHints_v39.mjs";
import {createP6SessionAckLedger} from "../server/lib/disruption/phase6RollingSessionAckLedger_v39.mjs";
import {writeFileSync,appendFileSync} from "node:fs";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {unpackP6ControllerArtifactArchive} from "./v39_phase6_rolling_window_terminal_readback_v39.mjs";
export const DIRECT_WF="phase6-direct-recovery-tick.yml";
export const DIRECT_CONFIRM="RUN_ONE_REVIEWED_DIRECT_RECOVERY_TICK_AFTER_SEPARATE_PHASE6_GO";
export const DIRECT_TITLE="P6 DIRECT RECOVERY TICK";
const REPO="HKcode22/ReplitTranvr",ROOT="https://api.github.com/repos/"+REPO,MIN=60000;
const OLD="phase6-rolling-controller-bounded-session.yml";
const states=["queued","in_progress","waiting","requested","pending"];
const failures=["failure","cancelled","timed_out","action_required","stale","neutral"];
const hold=s=>{throw Error("HOLD_P6_DIRECT_RECOVERY_"+s);};
const iso=n=>new Date(n).toISOString();
const validId=n=>Number.isSafeInteger(n)&&n>0;
const noCount={providerCalls:0,databaseReads:0,databaseWrites:0,phase6PaidGo:false};
const flagNames=["P6_ROLLING_CONTROLLER_ENABLED","P6_ROLLING_DIRECT_RECOVERY_ENABLED","P6_ROLLING_DIRECT_RECOVERY_APPROVED","V39_PHASE5_FREEZE_SIGNED","V39_PHASE5_SOURCE_RIGHTS_APPROVED","V39_P5_SEVEN_REST_BUDGET_SIGNED","V39_PHASE6_PROCESS_ARMED","V39_PHASE6_OWNER_APPROVED"];
const conflictNames=["P6_ROLLING_SCHEDULED_ROOT_ENABLED","P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED","P6_ROLLING_WINDOW_CUSTODY_ENABLED","P6_ROLLING_SESSION_APPROVED"];
const forbidden=["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","DATABASE_URL","V39_DATABASE_RUNTIME_URL","V39_P5_SOURCE_DATABASE_URL","P5_V39_PRE_DATABASE_URL","P5_V39_PREPARE_DATABASE_URL","P5_V39_T24_WITNESS_DATABASE_URL","P6_PRIVATE_READER_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL","P5_V39_OTHER_REST_REVIEW_DATABASE_URL","P5_V39_OTHER_REST_RESERVE_DATABASE_URL","P6_ROLLING_WINDOW_CUSTODY_DATABASE_URL"];

export function directDisposition(steps){
 if(!Array.isArray(steps))return null;
 const names=["Direct outcome TERMINAL_PARENT_ACKS_RECONCILED","Direct outcome PREFLIGHT_HOLD_NO_POST","Direct outcome KNOWN_ACTIVE_PARENT_ACKS_CARRIED"];
 const x=names.map(name=>steps.filter(s=>s.name===name));
 if(x.some(a=>a.length!==1||a[0].status!=="completed"||!["success","skipped"].includes(a[0].conclusion))||
    x.filter(a=>a[0].conclusion==="success").length!==1)return null;
 return ["TERMINAL","PREFLIGHT_HOLD","CARRIED"][x.findIndex(a=>a[0].conclusion==="success")];
}
export function admitDirectTick(env,now,readPlan){
 const sha=env.GITHUB_SHA,id=Number(env.GITHUB_RUN_ID),since=Date.parse(env.P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC);
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=="refs/heads/main"||
  env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_RUN_ATTEMPT!=="1"||
  !/^[1-9][0-9]{0,14}$/.test(env.GITHUB_RUN_ID??"")||!validId(id)||
  !/^[a-f0-9]{40}$/.test(sha??"")||env.V39_P5_APPROVED_CODE_SHA!==sha||env.P6_ROLLING_REQUESTED_MAIN_SHA!==sha||
  env.P6_ROLLING_SESSION_CONFIRM!==DIRECT_CONFIRM||flagNames.some(k=>env[k]!=="1")||
  conflictNames.some(k=>!["","0",undefined].includes(env[k]))||
  env.P5_CD_GH_PRE_STOP!=="0"||env.ADB_AUTO_COLLECT!=="0"||forbidden.some(k=>env[k])||
  env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||typeof env.GITHUB_TOKEN!=="string"||env.GITHUB_TOKEN.length<16||
  !Number.isSafeInteger(since)||iso(since)!==env.P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC||since%1000!==0||since>now)
  hold("NO_EXACT_SEPARATE_APPROVAL_OR_CONFLICTING_ROOT");
 const wire=env.P6_NONPAID_DAILY_POLICY_BASE64;
 if(typeof wire!=="string"||wire.length>46668||!/^[A-Za-z0-9+/]+={0,2}$/.test(wire))hold("POLICY_WIRE");
 const policyBytes=Buffer.from(wire,"base64");
 if(policyBytes.toString("base64")!==wire)hold("POLICY_WIRE");
 const calendar=loadP6RollingCalendarHints({policyBytes,expectedPolicySha256:env.P6_NONPAID_DAILY_POLICY_SHA256,
  trust:{reviewedCodeSha:sha,manifestSha256:env.V39_P5_MANIFEST_SHA256,calendarSha256:env.V39_P5_CALENDAR_HASH,
   releaseSha256:env.V39_P5_RELEASE_SHA256,rightsSha256:env.V39_P5_RIGHTS_SHA256},read:readPlan});
 if(since<calendar.from||now>=calendar.until||calendar.until-calendar.from>60*24*60*MIN)hold("POLICY_CLOCK");
 return {sha,id,since,calendar};
}
function downloadDirectArchive({artifactId,token}){
 try{return execFileSync("gh",["api","--hostname","github.com","--method","GET","repos/"+REPO+"/actions/artifacts/"+artifactId+"/zip"],{
  env:{PATH:process.env.PATH,HOME:process.env.HOME,GH_TOKEN:token,GH_PROMPT_DISABLED:"1"},timeout:30000,
  maxBuffer:131072,stdio:["ignore","pipe","ignore"]});}
 catch{hold("PREDECESSOR_ARCHIVE_DOWNLOAD");}
}
export function readDirectReceipt(raw,{run,sha,since,policySha256,clock,epoch,disposition}){
 let x;try{x=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw));}catch{hold("PREDECESSOR_RECEIPT_JSON");}
 const statuses={TERMINAL:"DIRECT_WAVE_TERMINAL_NOT_COLLECTION_PROOF",PREFLIGHT_HOLD:"DIRECT_PREFLIGHT_HOLD_NO_POST",
  CARRIED:"DIRECT_WAVE_KNOWN_ACTIVE_ACKS_CARRIED_NOT_COLLECTION_PROOF"};
 if(x?.schema!=="v39.phase6.direct-recovery-tick.v2"||x.status!==statuses[disposition]||x.runId!==run.id||x.reviewedMainSha!==sha||
    x.activationUtc!==iso(since)||x.policySha256!==policySha256||x.providerCalls!==0||x.databaseReads!==0||
    x.databaseWrites!==0||x.phase6PaidGo!==false||x.unknownAttempts!==0||!Array.isArray(x.pendingAcknowledgements)||
    !Array.isArray(x.terminalAcknowledgements)||!Array.isArray(x.pending))hold("PREDECESSOR_RECEIPT_SCOPE");
 const seen=new Set(),pendingLanes=new Set(),validLanes=new Set(P6_ROLLING_ROUTES.map(r=>r.lane));
 const groups=[x.terminalAcknowledgements,x.pendingAcknowledgements];
 if(groups.flat().length>16||x.acknowledged!==groups.flat().length||x.verifiedTerminal!==groups[0].length||
    x.pending.length!==groups[1].length)hold("PREDECESSOR_RECEIPT_COUNTS");
 for(const [i,rows] of groups.entries())for(const q of rows){
  const sent=Date.parse(q?.sentAtUtc);
  if(!q||Object.keys(q).sort().join(",")!=="lane,runId,sentAtUtc"||!validId(q.runId)||seen.has(q.runId)||
     !validLanes.has(q.lane)||!Number.isSafeInteger(sent)||iso(sent)!==q.sentAtUtc||sent<since||sent>clock||
     i===1&&(sent<epoch||pendingLanes.has(q.lane)))hold("PREDECESSOR_RECEIPT_ACK_SCOPE");
  seen.add(q.runId);if(i===1)pendingLanes.add(q.lane);
 }
 if(x.pending.some(q=>!q||Object.keys(q).sort().join(",")!=="lane,runId"||
    !groups[1].some(p=>p.runId===q.runId&&p.lane===q.lane))||
    new Set(x.pending.map(q=>q.runId)).size!==x.pending.length||
    (disposition==="CARRIED")!==(groups[1].length>0)||
    disposition==="PREFLIGHT_HOLD"&&groups[0].length!==0)hold("PREDECESSOR_RECEIPT_DISPOSITION");
 return groups[1];
}
export async function runDirectTick(env,{now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),fetcher=fetch,readPlan,emit=()=>{},readArchive=downloadDirectArchive}={}){
 const start=now(),a=admitDirectTick(env,start,readPlan),deadline=Math.min(start+7*MIN,a.calendar.until);
 const epoch=Math.max(a.since,Math.floor((start-3*60*MIN)/1000)*1000);
 const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+env.GITHUB_TOKEN,"X-GitHub-Api-Version":"2022-11-28"};
 let journal,attempted=false,requests=0,priorVerified=false,prior=[],predecessorRunId=null;
 const report=(status,fields={})=>({schema:"v39.phase6.direct-recovery-tick.v2",status,runId:a.id,reviewedMainSha:a.sha,
  activationUtc:iso(a.since),policySha256:a.calendar.policySha256,historyEpochUtc:iso(epoch),
  predecessorRunId,githubRequests:requests,...fields,...noCount});
 const api=async(url,init)=>{
  const u=new URL(url);
  if(u.origin!=="https://api.github.com"||!u.pathname.startsWith("/repos/"+REPO+"/")||u.username||u.password||u.hash||
   !["GET","POST"].includes(init?.method)||++requests>420||now()>=deadline-12000)hold("API_BOUND");
  if(init.method==="POST"&&now()>=Math.min(start+3*MIN,deadline-3*MIN))hold("NO_DRAIN_HEADROOM");
  // No transport retries for POST. The existing snapshot helper retries
  // its own GETs; all attempts still consume the global cap above.

  const response=await fetcher(url,{...init,redirect:"error",signal:AbortSignal.timeout(10000)});
  const remaining=response.headers?.get?.("x-ratelimit-remaining");
  if(remaining!=null&&(!/^\d+$/.test(remaining)||Number(remaining)<25))hold("RATE_LIMIT_RESERVE");
  return response;
 };
 async function get(path){
  for(let i=0;i<3;i++){
   let r;
   try{r=await api(ROOT+path,{method:"GET",headers});}
   catch(e){if(i===2||(!(e instanceof TypeError)&&!["AbortError","TimeoutError"].includes(e?.name)))throw e;await sleep(500*(i+1));continue;}
   if([502,503,504].includes(r.status)&&i<2){await sleep(500*(i+1));continue;}
   if(!r.ok)hold("GET_HTTP_"+r.status);
   return r.json();
  }
 }
 const exactRoot=r=>r?.path===".github/workflows/"+DIRECT_WF&&r.head_sha===a.sha&&r.head_branch==="main"&&
  r.event==="workflow_dispatch"&&r.run_attempt===1&&r.display_title===DIRECT_TITLE&&validId(r.id)&&
  Number.isFinite(Date.parse(r.created_at))&&Date.parse(r.created_at)>=a.since&&Date.parse(r.created_at)<=now()+5000;
 const q=(wf,status,n=1)=>"/actions/workflows/"+wf+"/runs?branch=main&status="+status+"&per_page="+n+
  "&created="+encodeURIComponent(">="+iso(a.since));
 function bounded(x,key,cap=100){
  if(!Number.isSafeInteger(x?.total_count)||x.total_count<0||!Array.isArray(x[key])||
   x[key].length!==Math.min(cap,x.total_count))hold("HISTORY_RESPONSE_INCOMPLETE");
  return x[key];
 }
 async function negativeHistory(){
  // All negative conclusions since the independently approved activation,
  // not only the three-hour scheduling preview. A historical HOLD is NOT
  // retired when its clock ages. Query one row plus total_count, no truncation.

  const targets=[DIRECT_WF,...P6_ROLLING_ROUTES.map(r=>r.workflow)];
  const allowed=new Set(targets.map(wf=>".github/workflows/"+wf));
  for(const status of failures){
   // One complete repository-wide negative sweep per conclusion usually
   // replaces nine requests. If >100 rows, never infer absence from the first
   // page: check complete per-workflow counts for the same exact time scope.
   const list=await get("/actions/runs?branch=main&status="+status+"&per_page=100&created="+encodeURIComponent(">="+iso(a.since)));
   const rs=bounded(list,"workflow_runs");
   if(list.total_count<=100){
    if(new Set(rs.map(x=>x.id)).size!==rs.length||rs.some(x=>!validId(x.id)||typeof x.path!=="string"||
       x.head_branch!=="main"||x.status!=="completed"||x.conclusion!==status||
       !Number.isFinite(Date.parse(x.created_at))||Date.parse(x.created_at)<a.since))hold("NEGATIVE_HISTORY_IDENTITY");
    if(rs.some(x=>allowed.has(x.path)))hold("PRIOR_UNSUCCESSFUL_RUN_REVIEW");
   }else{
    const counts=await Promise.all(targets.map(wf=>get(q(wf,status))));
    for(const x of counts){bounded(x,"workflow_runs",1);if(x.total_count!==0)hold("PRIOR_UNSUCCESSFUL_RUN_REVIEW");}
   }
  }
  const skip=await get(q(DIRECT_WF,"skipped"));bounded(skip,"workflow_runs",1);
  if(skip.total_count!==0)hold("PRIOR_DIRECT_GATE_SKIPPED_REVIEW");
 }
 async function selfAndPredecessor(){
  const self=await get("/actions/runs/"+a.id);
  if(!exactRoot(self)||self.id!==a.id||self.status!=="in_progress"||self.conclusion!==null)hold("ROOT_IDENTITY");

  const p=await get(q(DIRECT_WF,"success"));const rows=bounded(p,"workflow_runs",1);
  if(rows.length){
   const r=rows[0];if(!exactRoot(r)||r.id===a.id||r.status!=="completed"||r.conclusion!=="success")hold("PREDECESSOR_IDENTITY");
   const jobs=await get("/actions/runs/"+r.id+"/jobs?filter=latest&per_page=100");
   const js=bounded(jobs,"jobs");
   if(jobs.total_count!==3||new Set(js.map(j=>j.id)).size!==3||
      !js.every(j=>validId(j.id)&&j.run_id===r.id&&j.head_sha===a.sha&&j.run_attempt===1&&j.status==="completed")||
      !["offline-direct-recovery","direct-readonly-verify"].every(name=>js.filter(j=>j.name===name&&j.conclusion==="skipped"&&
        (j.steps==null||Array.isArray(j.steps)&&j.steps.length===0)).length===1))hold("PREDECESSOR_JOB_HISTORY");
   const m=js.filter(j=>j.name==="direct-protected-recovery-tick"&&j.run_id===r.id&&j.head_sha===a.sha&&j.run_attempt===1&&j.status==="completed"&&j.conclusion==="success");
   if(m.length!==1||!["Execute one direct recovery wave and reconcile exact parent ACKs","Preserve direct terminal operational receipt"].every(name=>
      m[0].steps?.filter(s=>s.name===name&&s.status==="completed"&&s.conclusion==="success").length===1)||
      directDisposition(m[0].steps)===null)hold("PREDECESSOR_NOT_TERMINAL");
   const disposition=directDisposition(m[0].steps);
   async function artifact(){
    const xs=await get("/actions/runs/"+r.id+"/artifacts?per_page=100");
    const rows=bounded(xs,"artifacts");
    if(xs.total_count!==1||rows[0]?.name!=="p6-direct-terminal-"+r.id||rows[0].expired!==false||
       !validId(rows[0].id)||!Number.isSafeInteger(rows[0].size_in_bytes)||rows[0].size_in_bytes<1||
       rows[0].size_in_bytes>65536||!/^sha256:[a-f0-9]{64}$/.test(rows[0].digest??"")||
       (rows[0].workflow_run&&Number(rows[0].workflow_run.id)!==r.id))hold("PREDECESSOR_ARTIFACT_IDENTITY");
    return {id:rows[0].id,size:rows[0].size_in_bytes,digest:rows[0].digest};
   }
   const before=await artifact();
   if(now()-start>90*1000)hold("PREDECESSOR_DOWNLOAD_HEADROOM");
   const raw=unpackP6ControllerArtifactArchive(await readArchive({artifactId:before.id,token:env.GITHUB_TOKEN}),before,"DIRECT");
   if(JSON.stringify(before)!==JSON.stringify(await artifact()))hold("PREDECESSOR_ARTIFACT_CHANGED");
   prior=readDirectReceipt(raw,{run:r,sha:a.sha,since:a.since,policySha256:a.calendar.policySha256,clock:now(),epoch,disposition});
   predecessorRunId=r.id;
  }
  priorVerified=true;
  for(const status of states){
   const x=await get("/actions/runs?branch=main&status="+status+"&per_page=100");
   const rows=bounded(x,"workflow_runs");if(x.total_count>100)hold("ACTIVE_HISTORY_INCOMPLETE");
   if(rows.some(r=>!validId(r.id)||typeof r.path!=="string"||r.head_branch!=="main"||r.status!==status))hold("ACTIVE_HISTORY_IDENTITY");
   const controllers=rows.filter(r=>[DIRECT_WF,OLD].some(wf=>r.path===".github/workflows/"+wf));
   if(status==="in_progress"&&!controllers.some(r=>r.id===a.id&&exactRoot(r)))hold("SELF_NOT_VISIBLE");
   if(controllers.some(r=>r.id!==a.id||!exactRoot(r)||r.status!==status))hold("OVERLAPPING_CONTROLLER");
  }
 }
 const main=async()=>{if((await get("/git/ref/heads/main"))?.object?.sha!==a.sha)hold("MAIN_DRIFT");};
 try{
  // Establish predecessor custody even if near policy end or the active
  // sweep is blocked. Never mint a green empty HOLD over a possible pending ACK.
  await selfAndPredecessor();
  if(deadline-start<6*MIN)hold("INSUFFICIENT_POLICY_HEADROOM");
  await negativeHistory();await main();
  journal=createP6SessionAckLedger({sha:a.sha,epoch,deadline,now,emit,priorAcknowledgements:prior,directRecovery:true});
  const cache=createP6RollingScheduleEvidenceCache();
  // GET-only races (a known active worker settles during a history sweep)
  // are recoverable by fresh reconciliation. Never repeat a dispatch.
  async function observe(){
   for(let i=0;i<3;i++){
    await journal.reconcile({token:env.GITHUB_TOKEN,fetcher:api});
    try{
     const snapshots=[];
     const result=await readP6RollingGithubSnapshot({sha:a.sha,epoch,token:env.GITHUB_TOKEN,now,fetcher:api,sleep,
      directRecovery:true,verifySnapshot:(r,x)=>{journal.assertVisible(r,x);snapshots.push(x);},scheduleEvidenceCache:cache});
     if(result.plan.status!=="REVIEWED_ROLLING_WAVE_PLAN_NO_GO")hold("CURRENT_ROUTE_HISTORY");
     return {result,snapshots};
    }catch(e){
     if(i===2||!["HOLD_P6_ROLLING_SESSION_ACK_TERMINAL_NOT_YET_RECONCILED","HOLD_P6_ROLLING_CONTROLLER_GITHUB_ACTIVE_SWEEP_CHANGED"].includes(e?.message))throw e;
     await sleep(1000);
    }
   }
  }
  const {result:observation}=await observe();
  if(observation.plan.status!=="REVIEWED_ROLLING_WAVE_PLAN_NO_GO")hold("CURRENT_ROUTE_HISTORY");
  const hints=assessP6RollingCalendarHints(a.calendar,now());
  if(hints.status!=="REVIEWED_CALENDAR_WAKE_HINT_ONLY_NO_GO")hold("CALENDAR_UNKNOWN");
  const plan=restrictP6RollingWave(observation.plan,hints.hints.filter(x=>x.mayNeedWork).map(x=>x.lane));
  const wave=await dispatchP6ReviewedRollingWave(plan,{sha:a.sha,approvedSha:a.sha,releaseApproved:true,token:env.GITHUB_TOKEN,
   now,deadline:Math.min(start+3*MIN,deadline-3*MIN),fetcher:api,mayStartAttempt:()=>requests<220,
   recheckRoute:async r=>journal.assertVisible(r,await observation.recheckRoute(r)),
   onEvidence:e=>{if(e.status==="DISPATCH_ATTEMPT_BEFORE_ACK")attempted=true;journal.evidence(e);}});
  // Let quick parents settle, but never wait 23 minutes and suppress
  // unrelated next-tick lanes. Independently prove exact known-active
  // custody in both normal history and the active sweep before publishing.
  const settleUntil=Math.min(now()+MIN,deadline-2*MIN);
  while(now()<settleUntil){
   if(!(await journal.reconcile({token:env.GITHUB_TOKEN,fetcher:api})).pending.length)break;
   await sleep(Math.min(15000,Math.max(1,settleUntil-now())));
  }
  const {snapshots}=await observe();
  journal.verifyContinuationHistory(snapshots);
  const custody=journal.continuationAcknowledgements(),state=journal.status();
  await main();
  return report(state.pending.length?"DIRECT_WAVE_KNOWN_ACTIVE_ACKS_CARRIED_NOT_COLLECTION_PROOF":"DIRECT_WAVE_TERMINAL_NOT_COLLECTION_PROOF",
   {...state,...custody,calendarDeferred:plan.calendarDeferred.length,requestBudgetDeferred:wave.requestBudgetDeferred.length});
 }catch(e){
  // A known pre-POST HOLD is visible without manufacturing a failed
  // dispatch. Once an attempt marker exists, failure quarantines future
  // ticks through negativeHistory; never report it as a benign defer.
  const reason=/^HOLD_[A-Z0-9_]{1,120}$/.test(e?.message??"")?e.message:"HOLD_P6_DIRECT_RECOVERY_REDACTED";
  if(attempted||!priorVerified||prior.length)throw Error(reason+"_NO_REPLAY");
  return report("DIRECT_PREFLIGHT_HOLD_NO_POST",{reason,acknowledged:0,verifiedTerminal:0,unknownAttempts:0,
   pending:[],pendingAcknowledgements:[],terminalAcknowledgements:[]});
 }
}
if(process.env.P6_DIRECT_RECOVERY_ENTRYPOINT==="1"){
 runDirectTick(process.env,{emit:e=>console.log(JSON.stringify(e))}).then(r=>{

  if(typeof process.env.GITHUB_OUTPUT!=="string"||!process.env.GITHUB_OUTPUT.startsWith("/")||process.env.GITHUB_OUTPUT.includes("\n")||
     typeof process.env.RUNNER_TEMP!=="string"||!process.env.RUNNER_TEMP.startsWith("/"))hold("RECEIPT_PATH");
  const disposition=r.status==="DIRECT_WAVE_TERMINAL_NOT_COLLECTION_PROOF"?"TERMINAL":r.status==="DIRECT_PREFLIGHT_HOLD_NO_POST"?"PREFLIGHT_HOLD":
   r.status==="DIRECT_WAVE_KNOWN_ACTIVE_ACKS_CARRIED_NOT_COLLECTION_PROOF"?"CARRIED":null;
  if(!disposition)hold("RECEIPT_DISPOSITION");
  writeFileSync(join(process.env.RUNNER_TEMP,"p6-direct-terminal.json"),JSON.stringify(r),{flag:"wx",mode:0o600});
  appendFileSync(process.env.GITHUB_OUTPUT,"direct_disposition="+disposition+"\n","utf8");
  console.log(JSON.stringify(r));
 }).catch(e=>{console.error(/^HOLD_[A-Z0-9_]{1,150}$/.test(e?.message??"")?e.message:"HOLD_P6_DIRECT_RECOVERY_FAILED_NO_REPLAY");process.exitCode=2;});
}
