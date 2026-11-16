/** Phase6 rolling control-plane admission. No DB or provider credentials.
 * Fixed existing workflows, grouped shared-parent routes, exact ACK, no retry.
 * Not a release authority: individual workflows still verify signed policy,
 * actual DB clock, rights, STOP, and budget. No live entrypoint in this PR.
 */
import {createHash} from "node:crypto";
const REPO="HKcode22/ReplitTranvr",ROOT="https://api.github.com/repos/"+REPO;
const CODE=/^[a-f0-9]{40}$/;
const ACTIVE=new Set(["queued","in_progress","waiting","requested","pending"]);
const issued=new WeakMap();
const inertCaches=new WeakMap(),inertProofs=new WeakMap();
const independentlyReproducedRetirements=new WeakMap();
const ACK_ID=x=>Number.isSafeInteger(x)&&x>0;
const hold=s=>{throw Error("HOLD_P6_ROLLING_CONTROLLER_"+s);};
const instant=s=>{
 if(typeof s!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(s)||!Number.isFinite(Date.parse(s)))
  hold("BAD_CLOCK");
 return Date.parse(s);
};
const route=(lane,workflow,minutes,inputs,jobs)=>Object.freeze({
 lane,workflow,minutes,inputs:Object.freeze(inputs),jobs:Object.freeze(jobs.map(x=>Object.freeze(x)))
});
export const P6_ROLLING_ROUTES=Object.freeze([
 route("SOURCE_POST","phase5-source-upcoming-queue-main-scheduled-readonly.yml",10,{confirm:"RUN_CURRENT_SIGNED_SOURCE_POST_CYCLE"},
  [{name:"separately-authorized-stored-source-children",parentOutcome:true},{name:"separately-authorized-current-private-post-children",parentOutcome:true},{name:"separately-authorized-native-post-producer"}]),
 route("PRE_ENROLLMENT","phase6-private-later-enrollment.yml",10,{confirm:"ENROLL_DUE_CURRENT_SIGNED_PRE_CYCLE_NO_PROVIDER",run_days:""},
  [{name:"enroll-current-signed-day"},{name:"enroll-current-signed-t24-day"}]),
 route("T24","phase5-cd-github-one-queued-t24-witness-main-manual.yml",5,{confirm:"RUN_CURRENT_SIGNED_T24_WITH_WITNESS_NO_PROVIDER",frozen_roster:""},
  [{name:"current-private-native-t24"}]),
 route("LATER_PRE","phase5-cd-github-bounded-pre-tick.yml",5,{private_transport:"PRIVATE_CURRENT_SCHEDULE",current_dispatch_confirm:"RUN_CURRENT_SIGNED_PRE_TICK_NO_PROVIDER"},
  [{name:"bounded-reviewed-real-pre"}]),
 route("DAILY_PREPARE","phase6-nonpaid-source-day-prepare-publish.yml",10,{confirm:"PREPARE_PUBLISH_NEXT_DUE_SIGNED_SOURCE_DAY_NO_PROVIDER",run_day_index:""},
  [{name:"protected-main-one-day-nonpaid"}]),
 route("PRE_RECOVERY","phase5-cd-github-existing-queue-lease-watchdog.yml",5,{confirm:"REAP_EXISTING_CD_LEASES_ONLY_NO_REPLAY_NO_PROVIDER"},
  [{name:"reviewed-existing-queue-watchdog"}]),
 // Actual early draw job returns green even when inert; its execution step
 // must be independently observed. Never equate workflow green to actual draw.
 route("EARLY_DRAW","phase5-six-slot-approved-early-four-airport-draw.yml",240,{confirm:"ONE_FUTURE_EARLY_DRAW_AFTER_SEPARATE_PHASE6_GO"},
  [{name:"gated-exact-early-parent",step:"Select max ONE genuinely due future parent under actual DB clock and existing serializable owner"}]),
 route("RETENTION_MONITOR","phase5-private-blob-retention-readonly-sentinel-no-provider.yml",60,{confirm:"READONLY_PRIVATE_RETENTION_METADATA_NO_PROVIDER_NO_DELETE"},
  [{name:"private-main-restricted-metadata-sentinel"}])
]);
const DISPOSITIONS=["SAFE_PREFLIGHT_HOLD","MISSING_EVIDENCE","NO_DUE_WORK","NO_NEW_ACK","ACKNOWLEDGED_NOT_PAID_RECEIPT"];
export function readP6ParentOutcomeSteps(steps){
 if(!Array.isArray(steps))return null;
 const marker=steps.filter(s=>typeof s.name==="string"&&s.name.startsWith("Parent outcome "));
 if(marker.length!==DISPOSITIONS.length||new Set(marker.map(s=>s.name)).size!==DISPOSITIONS.length||
    marker.some(s=>!DISPOSITIONS.includes(s.name.slice("Parent outcome ".length))||
      s.status!=="completed"||!["success","skipped"].includes(s.conclusion)))return null;
 const observed=marker.filter(s=>s.conclusion==="success");
 return observed.length===1?observed[0].name.slice("Parent outcome ".length):null;
}
function exactRun(row){
 if(!ACK_ID(row?.id)||typeof row.path!=="string"||row.head_branch!=="main"||
    !CODE.test(row.head_sha??"")||!["workflow_dispatch","schedule"].includes(row.event)||
    (row.status!=="completed"&&!ACTIVE.has(row.status))||
    (row.status==="completed"?typeof row.conclusion!=="string":row.conclusion!==null)||
    !Number.isSafeInteger(row.run_attempt)||row.run_attempt<1)
  hold("UNTRUSTED_RUN");
 return {...row,created:instant(row.created_at)};
}
// Purely inert schedules may exist even with explicit collection STOP.
// They are never successful work or cooldown evidence. Only an exact
// independent all-jobs-skipped readback can exclude one from attempts.
const isSkippedSchedule=(row,sha)=>row.event==="schedule"&&row.head_sha===sha&&
 row.run_attempt===1&&row.status==="completed"&&row.conclusion==="skipped";
function exactSkippedJobs(row,jobs){
 return Array.isArray(jobs)&&jobs.length>0&&jobs.length<=100&&
  new Set(jobs.map(j=>j.id)).size===jobs.length&&new Set(jobs.map(j=>j.name)).size===jobs.length&&
  jobs.every(j=>ACK_ID(j.id)&&j.run_id===row.id&&j.run_attempt===1&&j.head_sha===row.head_sha&&
   typeof j.name==="string"&&j.name.length>0&&j.status==="completed"&&j.conclusion==="skipped"&&
   Array.isArray(j.steps)&&j.steps.every(s=>s.status==="completed"&&s.conclusion==="skipped"));
}
export function createP6RollingScheduleEvidenceCache(){
 const handle=Object.freeze({});inertCaches.set(handle,new Map());return handle;
}
function inertProof(row,route,jobs){
 if(!exactSkippedJobs(row,jobs))return null;
 const proof=Object.freeze({runId:row.id,workflow:route.workflow});
 inertProofs.set(proof,{id:row.id,sha:row.head_sha,path:row.path,created:row.created_at});
 return proof;
}
function exactInertProof(proof,row,route){
 const stamp=inertProofs.get(proof);
 return !!stamp&&proof.runId===row.id&&proof.workflow===route.workflow&&stamp.id===row.id&&
  stamp.sha===row.head_sha&&stamp.path===row.path&&stamp.created===row.created_at;
}
export function assessP6RollingRoute(route,snapshot,{sha,epoch,clock}){
 if(!P6_ROLLING_ROUTES.includes(route)||!CODE.test(sha??"")||!Number.isFinite(epoch)||!Number.isFinite(clock)||epoch>clock)
  hold("UNREVIEWED_ROUTE_OR_CLOCK");
 if(!snapshot||snapshot.workflow!==route.workflow||snapshot.complete!==true||
  !Array.isArray(snapshot.runs)||snapshot.runs.length>100||!Array.isArray(snapshot.active)||snapshot.active.length>100)
  hold("INCOMPLETE_ROUTE_HISTORY");
 const path=".github/workflows/"+route.workflow;
 const rows=snapshot.runs.map(exactRun),active=snapshot.active.map(exactRun);
 if(new Set(rows.map(x=>x.id)).size!==rows.length||new Set(active.map(x=>x.id)).size!==active.length||
    [...rows,...active].some(x=>x.path!==path||x.created>clock+5000)||
    active.some(x=>x.status==="completed"))
  hold("MIXED_OR_DUPLICATE_ROUTE_HISTORY");
 // A run missed by the independent active sweep is a refusal, not permission.
 const activeIds=new Set(active.map(x=>x.id));
 if(rows.some(x=>ACTIVE.has(x.status)&&!activeIds.has(x.id)))return {lane:route.lane,state:"HOLD_HISTORY_CHANGED"};
 const proofs=snapshot.inertScheduleProofs??[];
 if(!Array.isArray(proofs)||proofs.length>100||new Set(proofs.map(p=>p?.runId)).size!==proofs.length||
    proofs.some(p=>!rows.some(row=>row.created>=epoch&&isSkippedSchedule(row,sha)&&exactInertProof(p,row,route))))
   hold("INVALID_INERT_SCHEDULE_PROOF");
 const inertIds=new Set(proofs.map(p=>p.runId));
 const attempts=rows.filter(x=>x.created>=epoch&&!inertIds.has(x.id)).sort((a,b)=>b.created-a.created||b.id-a.id);
 // Every unsuccessful attempt after release start must be reviewed; a later
 // green run cannot silently erase an older unknown outcome.
 const bad=attempts.find(x=>x.head_sha!==sha||x.run_attempt!==1||(x.status==="completed"&&x.conclusion!=="success"));
 if(bad)return {lane:route.lane,state:"HOLD_UNSUCCESSFUL_OR_DRIFTED_ATTEMPT",runId:bad.id};
 // A busy route cannot conceal an earlier failed or drifted attempt.
 if(active.length)return {lane:route.lane,state:"ACTIVE_NO_OVERLAP",activeCount:active.length};
 const last=attempts[0];
 if(last){
  if(snapshot.jobRunId!==last.id||!Array.isArray(snapshot.jobs)||snapshot.jobs.length>100)
   return {lane:route.lane,state:"HOLD_MISSING_JOB_EVIDENCE",runId:last.id};
  const parentDispositions=[];
  for(const required of route.jobs){
   const matches=snapshot.jobs.filter(j=>j.name===required.name);
   if(matches.length!==1||matches[0].status!=="completed"||matches[0].conclusion!=="success")
    return {lane:route.lane,state:"HOLD_GATED_OR_FAILED_REQUIRED_JOB",runId:last.id};
   if(required.parentOutcome){
    const disposition=readP6ParentOutcomeSteps(matches[0].steps);
    if(disposition===null)return {lane:route.lane,state:"HOLD_MISSING_PARENT_OUTCOME",runId:last.id};
    parentDispositions.push(disposition);
   }
   if(required.step){
    const steps=matches[0].steps?.filter(s=>s.name===required.step)??[];
    if(steps.length!==1||steps[0].status!=="completed"||steps[0].conclusion!=="success")
     return {lane:route.lane,state:"HOLD_INERT_REQUIRED_STEP",runId:last.id};
   }
  }
  if(clock-last.created<route.minutes*60000)return {lane:route.lane,state:parentDispositions.includes("SAFE_PREFLIGHT_HOLD")?"RECENT_SAFE_PREFLIGHT_HOLD":parentDispositions.includes("MISSING_EVIDENCE")?"RECENT_MISSING_EVIDENCE":"RECENT_JOB_SUCCESS_NOT_COLLECTION_PROOF",runId:last.id,parentDispositions};
 }
 return {lane:route.lane,state:"DUE_REVIEWED_ROUTE",lastRunId:last?.id??null,inertScheduledRuns:inertIds.size};
}
export function planP6RollingTick(snapshots,context){
 if(!Array.isArray(snapshots)||snapshots.length!==P6_ROLLING_ROUTES.length)
  hold("INCOMPLETE_ROLLING_SNAPSHOT");
 const assessments=P6_ROLLING_ROUTES.map(route=>{
  const found=snapshots.filter(x=>x.workflow===route.workflow);
  if(found.length!==1)hold("DUPLICATE_OR_MISSING_WORKFLOW");
  return assessP6RollingRoute(route,found[0],context);
 });
 // Preserve the global safety envelope on uncertainty. Ordinary busy routes
 // defer locally; actual failed or gated attempts stop the whole next wave.
 const blocked=assessments.some(x=>x.state.startsWith("HOLD_"));
 const due=blocked?[]:assessments.filter(x=>x.state==="DUE_REVIEWED_ROUTE").map(x=>x.lane);
 const plan=Object.freeze({status:blocked?"HOLD_ROLLING_WAVE_NO_DISPATCH":"REVIEWED_ROLLING_WAVE_PLAN_NO_GO",
  assessments:Object.freeze(assessments.map(Object.freeze)),due:Object.freeze(due),providerCalls:0,databaseReads:0,databaseWrites:0,dispatchCount:0,phase6PaidGo:false});
 issued.set(plan,{...context,used:false});return plan;
}
/** Narrow a genuine issued wave to independently reviewed calendar wake hints.
 * Never adds a route, erases a HOLD or extends the original observation clock.
 * The original plan is consumed, even if the narrowed plan is empty.
 */
export function restrictP6RollingWave(plan,eligibleLanes){
 const stamp=issued.get(plan);
 if(!stamp||stamp.used||!Array.isArray(eligibleLanes)||
    eligibleLanes.length>P6_ROLLING_ROUTES.length||
    new Set(eligibleLanes).size!==eligibleLanes.length||
    eligibleLanes.some(l=>!P6_ROLLING_ROUTES.some(r=>r.lane===l)))
  hold("UNREVIEWED_CALENDAR_WAVE_SCOPE");
 const restricted=Object.freeze({...plan,
  due:Object.freeze(plan.due.filter(l=>eligibleLanes.includes(l))),
  calendarDeferred:Object.freeze(plan.due.filter(l=>!eligibleLanes.includes(l)))});
 stamp.used=true;issued.set(restricted,{...stamp,used:false});
 return restricted;
}
/** Exact fixed allowlist dispatch; caller must still supply reviewed admission
 * from a real protected workflow. In this PR no production caller exists.
 * An unknown ACK stops immediately; no retry or alternate dispatch API.
 */
export async function dispatchP6ReviewedRollingWave(plan,{sha,approvedSha,releaseApproved,token,deadline,recheckRoute,onEvidence,mayStartAttempt=()=>true,now=()=>Date.now(),fetcher=fetch}){
 const stamp=issued.get(plan),started=now();
 if(!stamp||stamp.used||stamp.sha!==sha||started<stamp.clock||started-stamp.clock>60000||
    typeof recheckRoute!=="function"||typeof onEvidence!=="function"||typeof mayStartAttempt!=="function"||
    !CODE.test(sha??"")||sha!==approvedSha||releaseApproved!==true||
    typeof token!=="string"||token.length<16||!Number.isFinite(deadline)||
    deadline<=now()||deadline-now()>600000||
    plan?.status!=="REVIEWED_ROLLING_WAVE_PLAN_NO_GO"||plan.providerCalls!==0||
    !Array.isArray(plan.due)||plan.due.length>P6_ROLLING_ROUTES.length||
    !Array.isArray(plan.assessments)||plan.assessments.length!==P6_ROLLING_ROUTES.length||
    plan.assessments.some(x=>x.state.startsWith("HOLD_"))||
    new Set(plan.due).size!==plan.due.length||
    plan.due.some(l=>!P6_ROLLING_ROUTES.some(r=>r.lane===l)||!plan.assessments.some(x=>x.lane===l&&x.state==="DUE_REVIEWED_ROUTE")))
  hold("NO_EXACT_ROLLING_WAVE_APPROVAL");
 stamp.used=true;
 const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28"};
 const acknowledged=[],deferred=[],requestBudgetDeferred=[];
 for(const route of P6_ROLLING_ROUTES.filter(r=>plan.due.includes(r.lane))){
  if(mayStartAttempt()!==true){requestBudgetDeferred.push(route.lane);continue;}
  if(now()>=deadline-30000)hold("WAVE_DEADLINE_NO_REPLAY");
  const fresh=assessP6RollingRoute(route,await recheckRoute(route),{sha,epoch:stamp.epoch,clock:now()});
  if(fresh.state==="ACTIVE_NO_OVERLAP"||fresh.state.startsWith("RECENT_")){deferred.push(route.lane);continue;}
  if(fresh.state!=="DUE_REVIEWED_ROUTE")hold("FRESH_ROUTE_HISTORY_NO_REPLAY");
  let live;
  try{
   const res=await fetcher(ROOT+"/git/ref/heads/main",{method:"GET",headers,redirect:"error",signal:AbortSignal.timeout(10000)});
   if(!res.ok)hold("MAIN_UNAVAILABLE");live=await res.json();
  }catch{hold("MAIN_UNAVAILABLE");}
  if(live?.object?.sha!==sha)hold("MAIN_CHANGED");
  if(now()>=deadline-30000)hold("WAVE_DEADLINE_NO_REPLAY");
  const inputs={...route.inputs,...(route.lane==="RETENTION_MONITOR"?{approved_main_sha:sha}:{})};
  // No arbitrary URL, workflow names, day, roster, scope, budget or provider
  // arguments from the runtime caller.
  // The caller can reserve readback capacity after the last GET. This is
  // a normal deferral before the attempt marker, never an unknown POST.
  if(mayStartAttempt()!==true){requestBudgetDeferred.push(route.lane);continue;}
  onEvidence(Object.freeze({lane:route.lane,status:"DISPATCH_ATTEMPT_BEFORE_ACK"}));
  try{
   const res=await fetcher(ROOT+"/actions/workflows/"+route.workflow+"/dispatches",{
    method:"POST",headers:{...headers,"Content-Type":"application/json"},redirect:"error",
    signal:AbortSignal.timeout(10000),body:JSON.stringify({ref:"main",return_run_details:true,inputs})});
   if(res.status!==200)hold("DISPATCH_ACK_NOT_EXACT");
   const b=await res.json(),id=b?.workflow_run_id;
   if(!ACK_ID(id)||acknowledged.some(x=>x.runId===id)||b.run_url!==ROOT+"/actions/runs/"+id||
      b.html_url!=="https://github.com/"+REPO+"/actions/runs/"+id)hold("DISPATCH_ACK_NOT_EXACT");
   acknowledged.push({lane:route.lane,runId:id});
   onEvidence(Object.freeze({lane:route.lane,status:"EXACT_ACK_NOT_EXECUTION_PROOF",runId:id}));
  }catch{hold("UNKNOWN_DISPATCH_STOP_NO_RETRY");}
 }
 return {status:"ROLLING_WAVE_ACKNOWLEDGED_NOT_EXECUTION_PROOF",acknowledged,deferred,requestBudgetDeferred,dispatchCount:acknowledged.length,
  providerCalls:0,databaseReads:0,databaseWrites:0,phase6PaidGo:false};
}

/** Operational proof capability, held in memory only after an independent
 * successor readback. A deserialized/hash-shaped receipt is not a capability.
 * It cannot authorize an epoch reset or a collection POST by itself.
 */
export function inspectP6RollingRetirementProof(proof,{sha,epoch,now}){
 const p=independentlyReproducedRetirements.get(proof);
 if(!p||p.sha!==sha||p.epoch!==epoch||!Number.isSafeInteger(now)||
    now<p.clock||now-p.clock>120000||p.cut<=epoch)
  hold("RETIREMENT_PROOF_NOT_INDEPENDENT_OR_FRESH");
 return p;
}

/** Complete current-session history, bounded at 6h. Independently read ALL
 * nonterminal main runs, including older queued runs, once per wave. Fresh
 * per-route recheck reuses that conservative old-active observation and
 * includes all new active session rows. No hidden pagination or fallback.
 * An unexplained failure from an earlier session needs reviewed restart;
 * caller must NOT reset epoch autonomously to hide prior uncertainty.
 */
export async function readP6RollingGithubSnapshot({sha,epoch,token,now=()=>Date.now(),fetcher=fetch,verifySnapshot=()=>{},scheduleEvidenceCache=createP6RollingScheduleEvidenceCache()}){
 const started=now(),cache=inertCaches.get(scheduleEvidenceCache);
 if(!cache)hold("INVALID_INERT_SCHEDULE_CACHE");
 if(!CODE.test(sha??"")||!Number.isSafeInteger(epoch)||epoch>started||
    started-epoch>6*3600000||typeof token!=="string"||token.length<16)
  hold("NO_BOUNDED_SESSION_HISTORY_SCOPE");
 const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28"};
 async function get(path,key){
  try{
   const res=await fetcher(ROOT+path,{method:"GET",headers,redirect:"error",signal:AbortSignal.timeout(10000)});
   if(!res.ok)hold("GITHUB_HISTORY_UNAVAILABLE");
   const v=await res.json();
   if(!Number.isSafeInteger(v?.total_count)||v.total_count<0||v.total_count>100||
      !Array.isArray(v[key])||v[key].length!==v.total_count)
    hold("GITHUB_HISTORY_INCOMPLETE");
   return v[key];
  }catch{hold("GITHUB_HISTORY_UNAVAILABLE_OR_INCOMPLETE");}
 }
 async function history(route){
  const out=[];
  for(const event of ["schedule","workflow_dispatch"]){
   const created=encodeURIComponent(new Date(epoch).toISOString()+".."+new Date(now()+60000).toISOString());
   const list=await get("/actions/workflows/"+route.workflow+"/runs?branch=main&event="+event+"&per_page=100&created="+created,"workflow_runs");
   if(list.some(r=>r.event!==event))hold("GITHUB_EVENT_FILTER_DRIFT");
   out.push(...list);
  }
  if(out.length>100||new Set(out.map(x=>x.id)).size!==out.length||
     out.some(x=>exactRun(x).created<epoch||x.path!==".github/workflows/"+route.workflow))
   hold("GITHUB_SESSION_HISTORY_DRIFT");
  return out;
 }
 async function jobsFor(route,runs){
  const proofs=[];
  // Proof cache is per controller process/session. Current history still
  // has to contain the exact attempt-1 run; reruns never reuse proof.
  for(const row of runs.filter(r=>isSkippedSchedule(r,sha))){
   let proof=cache.get(row.id);
   if(proof&&!exactInertProof(proof,row,route))hold("INERT_SCHEDULE_IDENTITY_DRIFT");
   if(!proof){
    const list=await get("/actions/runs/"+row.id+"/jobs?filter=latest&per_page=100","jobs");
    proof=inertProof(row,route,list);
    if(proof){if(cache.size>=800)hold("INERT_SCHEDULE_CACHE_BOUND");cache.set(row.id,proof);}
   }
   if(proof)proofs.push(proof);
  }
  const inert=new Set(proofs.map(p=>p.runId));
  const last=runs.filter(r=>!inert.has(r.id)).sort((a,b)=>instant(b.created_at)-instant(a.created_at)||b.id-a.id)[0];
  if(!last||last.status!=="completed"||last.conclusion!=="success")
   return {jobRunId:null,jobs:[],inertScheduleProofs:proofs};
  return {jobRunId:last.id,jobs:await get("/actions/runs/"+last.id+"/jobs?filter=latest&per_page=100","jobs"),inertScheduleProofs:proofs};
 }
 const histories=await Promise.all(P6_ROLLING_ROUTES.map(history));
 // One bounded repo-wide active sweep, rather than five status queries
 // for each individual lane. All statuses must be accounted for.
 const activeById=new Map();
 for(const status of ACTIVE){
  const list=await get("/actions/runs?branch=main&status="+status+"&per_page=100","workflow_runs");
  for(const row of list){
   if(!P6_ROLLING_ROUTES.some(r=>row.path===".github/workflows/"+r.workflow))continue;
   const checked=exactRun(row);
   if(checked.status!==status||activeById.has(checked.id))hold("GITHUB_ACTIVE_SWEEP_CHANGED");
   activeById.set(checked.id,row);
  }
 }
 const activeFor=route=>[...activeById.values()].filter(x=>x.path===".github/workflows/"+route.workflow);
 const snapshots=await Promise.all(P6_ROLLING_ROUTES.map(async(route,i)=>({
  workflow:route.workflow,complete:true,runs:histories[i],active:activeFor(route),
  ...await jobsFor(route,histories[i])
 })));
 const context={sha,epoch,clock:now()};
 // No stale or inverted monotonic wall-clock snapshots may dispatch.
 if(context.clock<started||context.clock-started>120000)hold("GITHUB_SNAPSHOT_TOO_SLOW");
 // Verify every lane's accepted-run history before issuing any new wave.
 for(let i=0;i<P6_ROLLING_ROUTES.length;i++)verifySnapshot(P6_ROLLING_ROUTES[i],snapshots[i]);
 const plan=planP6RollingTick(snapshots,context);
 async function recheckRoute(route){
  if(!P6_ROLLING_ROUTES.includes(route)||now()-context.clock>600000)hold("GITHUB_FRESH_RECHECK_EXPIRED");
  const runs=await history(route),active=new Map(activeFor(route).map(x=>[x.id,x]));
  // New active rows cannot predate the already observed epoch.
  for(const row of runs.filter(x=>ACTIVE.has(x.status)))active.set(row.id,row);
  return {workflow:route.workflow,complete:true,runs,active:[...active.values()],...await jobsFor(route,runs)};
 }
 // Review a bounded prefix that a future separately admitted successor may
 // retire from its working GitHub history. This method NEVER admits a
 // dispatch, forgets an ACK, resolves a DB task, or advances an epoch itself.
 // A successor must independently reproduce the predecessor's exact prefix
 // from the OLD epoch before it can consider adopting the proposed cut.
 let retirementUsed=false;
 async function reviewHistoryRetirement({previousReceipt}={}){
  if(retirementUsed)hold("RETIREMENT_ALREADY_REVIEWED");
  retirementUsed=true;
  const overlap=600000,limit=64,receiptSchema="v39.phase6.rolling-history-retirement.v1";
  if(plan.status!=="REVIEWED_ROLLING_WAVE_PLAN_NO_GO"||
     now()<context.clock||now()-context.clock>120000)
   hold("RETIREMENT_HISTORY_HOLD");
  const families=[],all=[],ids=new Set();
  // Keep recent cooldown evidence, all active rows, and an overlap
  // against delayed GitHub listing visibility. Never move past an old
  // outstanding active run just because it disappeared from new history.
  let safeCut=Math.max(epoch,Math.floor((context.clock-overlap)/1000)*1000);
  for(let i=0;i<P6_ROLLING_ROUTES.length;i++){
   const route=P6_ROLLING_ROUTES[i],snap=snapshots[i];
   if(snap.workflow!==route.workflow||snap.complete!==true)hold("RETIREMENT_ROUTE_SCOPE");
   const rows=snap.runs.map(exactRun);
   const inert=new Set((snap.inertScheduleProofs??[]).map(p=>p.runId));
   const latest=rows.filter(row=>!inert.has(row.id))
    .sort((a,b)=>b.created-a.created||b.id-a.id)[0];
   if(latest&&context.clock-latest.created<route.minutes*60000)
    safeCut=Math.min(safeCut,Math.max(epoch,Math.floor(latest.created/1000)*1000));
   for(const x of snap.active.map(exactRun)){
    safeCut=Math.min(safeCut,Math.max(epoch,Math.floor(x.created/1000)*1000));
   }
   for(const row of rows){
    if(ids.has(row.id))hold("RETIREMENT_DUPLICATE_RUN");
    ids.add(row.id);all.push(row);
   }
   families.push({route,rows,inert});
  }
  const candidates=all.filter(row=>row.created<safeCut)
   .sort((a,b)=>a.created-b.created||a.id-b.id);
  // Shrink, rather than silently truncate the hash or erase tied rows.
  if(candidates.length>limit)
   safeCut=Math.min(safeCut,Math.max(epoch,Math.floor(candidates[limit].created/1000)*1000));
  let cut=safeCut;
  const iso=t=>new Date(t).toISOString();
  if(previousReceipt!==undefined){
   const p=previousReceipt;
   if(!p||typeof p!=="object"||Array.isArray(p)||
      p.schema!==receiptSchema||p.status!=="REVIEWED_RETIREMENT_CANDIDATE_NO_GO"||
      p.reviewedMainSha!==sha||p.priorEpochUtc!==iso(epoch)||
      p.phase6PaidGo!==false||p.dispatchCount!==0||p.providerCalls!==0||
      p.databaseWrites!==0||p.databaseReads!==0||
      p.requiresIndependentSuccessorReadback!==true||
      !/^[a-f0-9]{64}$/.test(p.retiredHistorySha256??"")||
      !Number.isSafeInteger(p.retiredRunCount)||p.retiredRunCount<0||p.retiredRunCount>limit)
    hold("RETIREMENT_PREDECESSOR_RECEIPT");
   const observed=instant(p.observedAtUtc),proposed=instant(p.proposedEpochUtc);
   if(observed>context.clock||context.clock-observed>3600000||
      proposed<=epoch||proposed>observed-overlap||proposed>safeCut||
      new Date(proposed).toISOString()!==p.proposedEpochUtc)
    hold("RETIREMENT_PREDECESSOR_CLOCK_OR_COOLDOWN");
   cut=proposed;
  }
  if(cut<=epoch){
   return Object.freeze({schema:receiptSchema,status:"RETIREMENT_NO_ADVANCE_KEEP_PRIOR_EPOCH",
    reviewedMainSha:sha,priorEpochUtc:iso(epoch),proposedEpochUtc:iso(epoch),
    observedAtUtc:iso(context.clock),retiredRunCount:0,dispatchCount:0,
    providerCalls:0,databaseReads:0,databaseWrites:0,phase6PaidGo:false});
  }
  const proof=[],laneCounts=[];
  for(const {route,rows,inert} of families){
   let retiredRunCount=0,inertCount=0,safeHoldCount=0,missingEvidenceCount=0;
   for(const row of rows.filter(x=>x.created<cut).sort((a,b)=>a.created-b.created||a.id-b.id)){
    if(now()<context.clock||now()-context.clock>120000||
       row.head_sha!==sha||row.run_attempt!==1||row.status!=="completed"||
       proof.length>=limit)hold("RETIREMENT_UNSAFE_PREFIX");
    // Every removed successful run, not merely the latest, gets a fresh
    // jobs read. Green older wrappers with skipped required jobs cannot
    // disappear behind a more recent green run.
    const jobs=await get("/actions/runs/"+row.id+"/jobs?filter=latest&per_page=100","jobs");
    if(jobs.length<1||new Set(jobs.map(j=>j.id)).size!==jobs.length||
       new Set(jobs.map(j=>j.name)).size!==jobs.length||
       jobs.some(j=>!ACK_ID(j.id)||j.run_id!==row.id||j.run_attempt!==1||
        j.head_sha!==sha||typeof j.name!=="string"||j.status!=="completed"||
        typeof j.conclusion!=="string"||!Array.isArray(j.steps)))
     hold("RETIREMENT_JOB_IDENTITY");
    let disposition="ACTUAL_REQUIRED_JOBS_TERMINAL";
    if(inert.has(row.id)){
     if(!isSkippedSchedule(row,sha)||!exactSkippedJobs(row,jobs))
      hold("RETIREMENT_INERT_PROOF_DRIFT");
     disposition="INDEPENDENTLY_INERT_SCHEDULE";inertCount++;
    }else{
     const assessment=assessP6RollingRoute(route,{workflow:route.workflow,complete:true,
      runs:[row],active:[],jobRunId:row.id,jobs},{sha,epoch,clock:context.clock});
     if(assessment.state.startsWith("HOLD_")||assessment.state==="ACTIVE_NO_OVERLAP")
      hold("RETIREMENT_REQUIRED_JOB_HOLD");
     const ps=route.jobs.filter(j=>j.parentOutcome).map(j=>
      readP6ParentOutcomeSteps(jobs.find(x=>x.name===j.name)?.steps));
     if(ps.some(x=>x===null))hold("RETIREMENT_PARENT_OUTCOME_HOLD");
     if(ps.includes("SAFE_PREFLIGHT_HOLD"))safeHoldCount++;
     if(ps.includes("MISSING_EVIDENCE"))missingEvidenceCount++;
     disposition=ps.length?ps.join("|"):disposition;
    }
    // Digest only narrow operational identity/evidence, no raw job
    // payload, step output, source data, or provider contents.
    proof.push({lane:route.lane,id:row.id,createdUtc:iso(row.created),event:row.event,
     runAttempt:row.run_attempt,headSha:row.head_sha,conclusion:row.conclusion,disposition,
     jobs:jobs.map(j=>({id:j.id,name:j.name,conclusion:j.conclusion,
      requiredStepConclusions:route.jobs.filter(q=>q.name===j.name&&q.step)
       .map(q=>j.steps.find(t=>t.name===q.step)?.conclusion??null)}))
      .sort((a,b)=>a.id-b.id)});
    retiredRunCount++;
   }
   laneCounts.push(Object.freeze({lane:route.lane,retiredRunCount,inertCount,safeHoldCount,missingEvidenceCount}));
  }
  if(now()<context.clock||now()-context.clock>120000)hold("RETIREMENT_READBACK_TOO_SLOW");
  const digest=createHash("sha256").update(JSON.stringify(proof)).digest("hex");
  if(previousReceipt&&(previousReceipt.retiredHistorySha256!==digest||
     previousReceipt.retiredRunCount!==proof.length||
     JSON.stringify(previousReceipt.laneCounts)!==JSON.stringify(laneCounts)))
   hold("RETIREMENT_PREFIX_CHANGED_NO_REPLAY");
  const result=Object.freeze({schema:receiptSchema,
   status:previousReceipt?"INDEPENDENT_RETIREMENT_PREFIX_MATCH_NO_GO":"REVIEWED_RETIREMENT_CANDIDATE_NO_GO",
   reviewedMainSha:sha,priorEpochUtc:iso(epoch),proposedEpochUtc:iso(cut),
   observedAtUtc:iso(context.clock),retiredHistorySha256:digest,retiredRunCount:proof.length,
   laneCounts:Object.freeze(laneCounts),requiresIndependentSuccessorReadback:!previousReceipt,
   dispatchCount:0,providerCalls:0,databaseReads:0,databaseWrites:0,phase6PaidGo:false});
  if(previousReceipt){
   const removed=new Set(proof.map(x=>x.id));
   const evidence=families.flatMap(({route,rows})=>rows.map(row=>Object.freeze({
    lane:route.lane,runId:row.id,created:row.created,event:row.event,
    status:row.status,conclusion:row.conclusion,retired:removed.has(row.id)
   })));
   // Only this freshly reproduced snapshot can be used for the ledger's
   // read-only partition review. Caller receives immutable narrow metadata.
   independentlyReproducedRetirements.set(result,Object.freeze({sha,epoch,clock:context.clock,cut,
    evidence:Object.freeze(evidence),retiredHistorySha256:digest}));
  }
  return result;
 }
 return {plan,recheckRoute,context,reviewHistoryRetirement};
}
