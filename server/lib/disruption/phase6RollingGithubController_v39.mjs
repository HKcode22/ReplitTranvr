/** Phase6 rolling control-plane admission. No DB or provider credentials.
 * Fixed existing workflows, grouped shared-parent routes, exact ACK, no retry.
 * Not a release authority: individual workflows still verify signed policy,
 * actual DB clock, rights, STOP, and budget. No live entrypoint in this PR.
 */
const REPO="HKcode22/ReplitTranvr",ROOT="https://api.github.com/repos/"+REPO;
const CODE=/^[a-f0-9]{40}$/;
const ACTIVE=new Set(["queued","in_progress","waiting","requested","pending"]);
const issued=new WeakMap();
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
 if(active.length)return {lane:route.lane,state:"ACTIVE_NO_OVERLAP",activeCount:active.length};
 const attempts=rows.filter(x=>x.created>=epoch).sort((a,b)=>b.created-a.created||b.id-a.id);
 // Every unsuccessful attempt after release start must be reviewed; a later
 // green run cannot silently erase an older unknown outcome.
 const bad=attempts.find(x=>x.head_sha!==sha||x.run_attempt!==1||x.status!=="completed"||x.conclusion!=="success");
 if(bad)return {lane:route.lane,state:"HOLD_UNSUCCESSFUL_OR_DRIFTED_ATTEMPT",runId:bad.id};
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
 return {lane:route.lane,state:"DUE_REVIEWED_ROUTE",lastRunId:last?.id??null};
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
export async function dispatchP6ReviewedRollingWave(plan,{sha,approvedSha,releaseApproved,token,deadline,recheckRoute,onEvidence,now=()=>Date.now(),fetcher=fetch}){
 const stamp=issued.get(plan),started=now();
 if(!stamp||stamp.used||stamp.sha!==sha||started<stamp.clock||started-stamp.clock>60000||
    typeof recheckRoute!=="function"||typeof onEvidence!=="function"||
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
 const acknowledged=[],deferred=[];
 for(const route of P6_ROLLING_ROUTES.filter(r=>plan.due.includes(r.lane))){
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
 return {status:"ROLLING_WAVE_ACKNOWLEDGED_NOT_EXECUTION_PROOF",acknowledged,deferred,dispatchCount:acknowledged.length,
  providerCalls:0,databaseReads:0,databaseWrites:0,phase6PaidGo:false};
}

/** Complete current-session history, bounded at 6h. Independently read ALL
 * nonterminal main runs, including older queued runs, once per wave. Fresh
 * per-route recheck reuses that conservative old-active observation and
 * includes all new active session rows. No hidden pagination or fallback.
 * An unexplained failure from an earlier session needs reviewed restart;
 * caller must NOT reset epoch autonomously to hide prior uncertainty.
 */
export async function readP6RollingGithubSnapshot({sha,epoch,token,now=()=>Date.now(),fetcher=fetch}){
 const started=now();
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
  const last=runs.slice().sort((a,b)=>instant(b.created_at)-instant(a.created_at)||b.id-a.id)[0];
  if(!last||last.status!=="completed"||last.conclusion!=="success")
   return {jobRunId:null,jobs:[]};
  return {jobRunId:last.id,jobs:await get("/actions/runs/"+last.id+"/jobs?filter=latest&per_page=100","jobs")};
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
 const plan=planP6RollingTick(snapshots,context);
 async function recheckRoute(route){
  if(!P6_ROLLING_ROUTES.includes(route)||now()-context.clock>600000)hold("GITHUB_FRESH_RECHECK_EXPIRED");
  const runs=await history(route),active=new Map(activeFor(route).map(x=>[x.id,x]));
  // New active rows cannot predate the already observed epoch.
  for(const row of runs.filter(x=>ACTIVE.has(x.status)))active.set(row.id,row);
  return {workflow:route.workflow,complete:true,runs,active:[...active.values()],...await jobsFor(route,runs)};
 }
 return {plan,recheckRoute,context};
}
