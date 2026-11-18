import test from "node:test";
import assert from "node:assert/strict";
import {
 P6_AUTO_CONTROL_HEARTBEAT_V39,
 P6_EXISTING_CONTROLLER_LANES,
 P6_MANUAL_OR_MISSING_RELEASE_LANES,
 reviewP6OneScheduledController,
 summarizeP6ControllerHeartbeat,
 admitP6HeartbeatGithubEnv,
 readP6GithubAutoControllerHeartbeat,
 reviewP6ActiveStandaloneNotifications,observeP6DirectRecovery
} from "../server/lib/disruption/phase6AutonomousGithubControllerHeartbeat_v39.mjs";
import {formatP6ControllerHeartbeatHuman}
 from "../scripts/v39_phase6_github_controller_heartbeat_v39.mjs";

const T="2026-11-14T02:00:00.000Z";
const ID="b".repeat(40);
function run(i,{conclusion="skipped",status="completed",
 created="2026-11-14T01:50:00Z",branch="main",event="schedule"}={}){
 return {id:i,event,status,conclusion,head_branch:branch,
  head_sha:ID,created_at:created};
}
function env(){
 return {GITHUB_ACTIONS:"true",
  GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",
  GITHUB_EVENT_NAME:"schedule",GITHUB_RUN_ATTEMPT:"1",
  GITHUB_SHA:ID,P6_CONTROLLER_HEARTBEAT_EXECUTE:"1",
  ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
  V39_PHASE6_OWNER_APPROVED:"0",AERODATABOX_API_KEY:"",
  RAPIDAPI_KEY:"",DATABASE_URL:"",V39_P5_SOURCE_DATABASE_URL:"",
  P5_V39_PRE_DATABASE_URL:"",P5_V39_T24_WITNESS_DATABASE_URL:"",
  GITHUB_TOKEN:"this_is_synthetic_nonsecret_token_for_unit_tests"};
}
test("nine exact existing GH cron lanes, not a duplicate new SOURCE/PRE/POST",()=>{
 assert.equal(P6_EXISTING_CONTROLLER_LANES.length,9);
 assert.deepEqual(P6_EXISTING_CONTROLLER_LANES.map(x=>x.lane),[
  "EARLY_DRAW","SOURCE","PRE","PRE_RECOVERY","DAY_SHARD_SELECTOR","DAILY_PREPARE","PRE_ENROLLMENT","T24","RETENTION"
 ]);
 assert.equal(new Set(P6_EXISTING_CONTROLLER_LANES.map(x=>x.workflow)).size,9);
 assert(P6_MANUAL_OR_MISSING_RELEASE_LANES.some(x=>x.lane==="FULL_31_DAY_ROLLOVER"));
 assert(P6_MANUAL_OR_MISSING_RELEASE_LANES.some(x=>x.lane==="POST_CHILD"));
});
test("skipped schedule is safety-gated, never success or failed collection",()=>{
 const s=reviewP6OneScheduledController(P6_EXISTING_CONTROLLER_LANES[0],
  [run(1)],T);
 assert.equal(s.state,"SCHEDULE_GATED_SKIPPED_NOT_A_FAILURE_OR_A_FLIGHT");
 assert.equal(s.runStateCounts.completedSkipped,1);
 assert.equal(s.runStateCounts.completedSuccess,0);
 assert.equal(s.successfullyCollectedFlightOrPaidRunProven,false);
});
test("four-hour six-slot early draw is NOT incorrectly classified as stale",()=>{
 const early=P6_EXISTING_CONTROLLER_LANES[0];
 assert.equal(early.maxExpectedGapMinutes,330);
 const recent=reviewP6OneScheduledController(early,[
   run(9,{conclusion:"skipped",created:"2026-11-13T22:20:00Z"})
 ],T);
 assert.equal(recent.state,"SCHEDULE_GATED_SKIPPED_NOT_A_FAILURE_OR_A_FLIGHT");
 const tooOld=reviewP6OneScheduledController(early,[
   run(10,{conclusion:"skipped",created:"2026-11-13T19:00:00Z"})
 ],T);
 assert.equal(tooOld.state,"SCHEDULE_OBSERVATION_STALE");
});
test("success still is not evidence provider issued an original or wrote PRE",()=>{
 const s=reviewP6OneScheduledController(P6_EXISTING_CONTROLLER_LANES[1],
  [run(2,{conclusion:"success"})],T);
 assert.equal(s.state,"WORKFLOW_SUCCESS_NOT_PROOF_COLLECTION");
 assert.equal(s.actualDatabaseQueueOrSignedSourceObserved,false);
 assert.equal(s.successfullyCollectedFlightOrPaidRunProven,false);
});
test("recognize stale, missing, actual failed, pending and ambiguous response",()=>{
 const lane=P6_EXISTING_CONTROLLER_LANES[2];
 assert.equal(reviewP6OneScheduledController(lane,[],T).state,
  "NO_SCHEDULE_RUN_OBSERVED");
 assert.equal(reviewP6OneScheduledController(lane,[
  run(1,{created:"2026-11-13T19:01:00Z"})],T).state,
  "SCHEDULE_OBSERVATION_STALE");
 assert.equal(reviewP6OneScheduledController(lane,[
  run(1,{conclusion:"failure"})],T).state,
  "SCHEDULE_RUN_UNSUCCESSFUL_REVIEW");
 assert.equal(reviewP6OneScheduledController(lane,[
  run(1,{status:"in_progress",conclusion:null})],T).state,
  "SCHEDULE_WORKFLOW_PENDING_NO_FLIGHT_PROOF");
 for(const bad of [
  run(4,{branch:"private"}),
  run(4,{event:"workflow_dispatch"}),
  {...run(4),head_sha:"x"},
  {...run(4),id:0},
  {...run(4),created_at:"tomorrow"},
  {...run(4),status:"completed",conclusion:null},
  {...run(4),status:"queued",conclusion:"success"}
 ]){
  assert.throws(()=>reviewP6OneScheduledController(lane,[bad],T),
   /HOLD_P6_AUTO_HEARTBEAT/);
 }
 assert.throws(()=>reviewP6OneScheduledController(lane,[run(4),run(4)],T),
  /UNTRUSTED_SCHEDULE_RUN_OR_FOREIGN_BRANCH/);
});
test("role boundaries: scheduled GH only, no provider or DB credentials",()=>{
 const good=env();
 assert.equal(admitP6HeartbeatGithubEnv(good).sha,ID);
 for(const patch of [
  {GITHUB_REPOSITORY:"other/repo"},
  {GITHUB_REF:"refs/heads/pull"},
  {GITHUB_EVENT_NAME:"push"},
  {GITHUB_RUN_ATTEMPT:"2"},
  {GITHUB_SHA:"invalid"},
  {V39_PHASE6_PROCESS_ARMED:"1"},
  {ADB_AUTO_COLLECT:"1"},
  {AERODATABOX_API_KEY:"key"},
  {DATABASE_URL:"postgres://no"},
  {V39_P5_SOURCE_DATABASE_URL:"postgres://no"},
  {P5_V39_PRE_DATABASE_URL:"postgres://no"},
  {P5_V39_T24_WITNESS_DATABASE_URL:"postgres://no"},
  {GITHUB_TOKEN:""},
  {P6_CONTROLLER_HEARTBEAT_EXECUTE:"0"}
 ])assert.throws(()=>admitP6HeartbeatGithubEnv({...good,...patch}),
  /NOT_MAIN_READONLY_GITHUB_ACTION/);
 assert.throws(()=>admitP6HeartbeatGithubEnv({...good,
  GITHUB_EVENT_NAME:"workflow_dispatch",P6_CONTROLLER_HEARTBEAT_CONFIRM:"wrong"}),
  /NOT_MAIN_READONLY_GITHUB_ACTION/);
});
test("nine historical lanes plus one separate primary expiry history read; human summary redacted",async()=>{
 const calls=[];
 const fetcher=async(url,opts)=>{
  calls.push({url,opts});
  const u=new URL(url);
  assert.equal(u.hostname,"api.github.com");
  assert(u.pathname.startsWith("/repos/HKcode22/ReplitTranvr/actions/workflows/"));
  assert.equal(u.searchParams.get("branch"),"main");
  assert.equal(u.searchParams.get("event"),"schedule");
  assert.equal(u.searchParams.get("per_page"),"15");
  assert.equal(opts.method,"GET");
  assert.equal(opts.redirect,"error");
  return {ok:true,json:async()=>({
   total_count:1,workflow_runs:[run(calls.length)]
  })};
 };
 const x=await readP6GithubAutoControllerHeartbeat(env(),{
  fetcher,now:()=>new Date(T)
 });
 assert.equal(x.schema,P6_AUTO_CONTROL_HEARTBEAT_V39);
 assert.equal(x.controllerStates.length,9);
 assert.equal(calls.length,10);
 assert.equal(x.primaryFidsExpiry.state,"SCHEDULED_APPLY_DISABLED");
 assert.equal(x.primaryFidsExpiry.latestExecutedJobVerified,false);
 assert.equal(x.primaryFidsExpiryNeedsAttention,false);
 assert.equal(x.status,"AUTONOMOUS_GITHUB_SCHEDULE_PRESENT_NOT_COLLECTION_PROOF_NO_GO");
 assert.equal(x.paidPhase6Go,false);
 assert.equal(x.automaticFull31DayRolloverVerified,false);
 assert.equal(x.dispatchCount,0);
 assert.equal(x.databaseReads,0);
 assert.equal(x.providerCalls,0);
 const h=formatP6ControllerHeartbeatHuman(x);
 assert(h.includes("EARLY_DRAW"));
 assert(h.includes("FULL")===false || h.includes("31-day"));
 assert(h.includes("Phase6 paid GO: **NO**"));
 assert(!h.includes(env().GITHUB_TOKEN));
});
test("API read errors/invalid payload fail closed, never infer safe GO",async()=>{
 for(const f of [
  async()=>({ok:false,status:403}),
  async()=>({ok:true,json:async()=>({total_count:1,workflow_runs:[]})}),
  async()=>{throw Error("Bearer private_token_would_leak_if_echoed")}
 ]){
  await assert.rejects(readP6GithubAutoControllerHeartbeat(env(),{
   fetcher:f,now:()=>new Date(T)
  }),/HOLD_P6_AUTO_HEARTBEAT/);
 }
});
test("mixed stale/skipped/failed summary remains science NO-GO",()=>{
 const a=P6_EXISTING_CONTROLLER_LANES.map((lane,i)=>
  reviewP6OneScheduledController(lane,[
   run(i+1,{conclusion:i===0?"failure":"skipped"})
  ],T));
 const x=summarizeP6ControllerHeartbeat(a,T);
 assert.equal(x.controllerProblemCount,1);
 assert.equal(x.status,"AUTONOMOUS_GITHUB_CONTROLLERS_NEED_ATTENTION_NO_GO");
 assert.equal(x.signedPhysicalFlightPreObserved,false);
 assert.equal(x.signed31DayB0062CalendarOrBudgetsObserved,false);
});

test("recent successful or skipped run does not hide multi-hour history gaps",()=>{
 const lane=P6_EXISTING_CONTROLLER_LANES[1];
 const recent=reviewP6OneScheduledController(lane,[
  run(9,{created:"2026-11-14T01:50:00Z"}),
  run(5,{created:"2026-11-13T20:00:00Z"}),
  run(7,{created:"2026-11-14T01:40:00Z"}),
 ],T);
 assert.equal(recent.state,"SCHEDULE_GATED_SKIPPED_NOT_A_FAILURE_OR_A_FLIGHT");
 assert.deepEqual(recent.historicalCadence,{
  observedIntervals:2,recentWindowOldestUtc:"2026-11-13T20:00:00Z",
  recentWindowNewestUtc:"2026-11-14T01:50:00Z",
  medianObservedGapMinutes:175,maxObservedGapMinutes:340,
  intervalsExceedingExpectedMax:1,newestObservedGapMinutes:10,
  latestAgeExceedsExpected:false,measuredActualWorkerLatency:false,
  exactMissingCronSlotsKnown:false
 });
 const all=P6_EXISTING_CONTROLLER_LANES.map((l,i)=>i===1?recent:
  reviewP6OneScheduledController(l,[run(i+100)],T));
 const summary=summarizeP6ControllerHeartbeat(all,T);
 assert.equal(summary.controllerProblemCount,1);
 assert.equal(summary.controllerCurrentProblemCount,0);
 assert.equal(summary.controllerHistoricalGapCount,1);
 assert.equal(summary.status,"AUTONOMOUS_GITHUB_CONTROLLERS_NEED_ATTENTION_NO_GO");
 assert(formatP6ControllerHeartbeatHuman(summary).includes("340"));
 assert.equal(summary.paidPhase6Go,false);
});
test("single observation cannot establish cadence; strict exact gap and age boundaries",()=>{
 const lane=P6_EXISTING_CONTROLLER_LANES[2];
 const one=reviewP6OneScheduledController(lane,[run(1)],T);
 assert.equal(one.historicalCadence.observedIntervals,0);
 assert.equal(one.historicalCadence.maxObservedGapMinutes,null);
 const exactly=reviewP6OneScheduledController(lane,[
  run(1,{created:"2026-11-14T00:30:00Z"}),
  run(2,{created:"2026-11-13T23:00:00Z"})
 ],T);
 assert.equal(exactly.historicalCadence.intervalsExceedingExpectedMax,0);
 assert.equal(exactly.historicalCadence.latestAgeExceedsExpected,false);
 const over=reviewP6OneScheduledController(lane,[
  run(1,{created:"2026-11-14T00:29:59Z"}),
  run(2,{created:"2026-11-13T22:59:58Z"})
 ],T);
 assert.equal(over.historicalCadence.intervalsExceedingExpectedMax,1);
 assert.equal(over.state,"SCHEDULE_OBSERVATION_STALE");
 assert.equal(reviewP6OneScheduledController(lane,[],T).historicalCadence.latestAgeExceedsExpected,false);
});

test("primary expiry current-main pin, explicit apply, and actual scheduled job execution remain separate",async()=>{
 const enabled={...env(),P5_PRIMARY_FIDS_EXPIRY_ENABLED:"true",
  P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA:ID,
  P5_PRIMARY_FIDS_EXPIRY_APPROVAL:"APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER"};
 const latest={...run(600,{conclusion:"success"}),run_attempt:1};
 const actual={id:601,run_id:600,name:"primary-fids-expiry",status:"completed",conclusion:"success",
  steps:[{name:"Verify exact main and execute only bounded primary FIDS expiry",status:"completed",conclusion:"success"}]};
 async function observe(patch={},row=latest,job=actual){
  const calls=[];
  const x=await readP6GithubAutoControllerHeartbeat({...enabled,...patch},{now:()=>new Date(T),fetcher:async(url,opts)=>{
   calls.push(url);assert.equal(opts.method,"GET");
   if(url.includes("/actions/runs/600/jobs?")){
    if(job===null)return {ok:false};
    return {ok:true,json:async()=>({total_count:1,jobs:[job]})};
   }
   const rows=url.includes("phase5-primary-fids-expiry-no-provider.yml")?(row?[row]:[]):[run(calls.length)];
   return {ok:true,json:async()=>({total_count:rows.length,workflow_runs:rows})};
  }});
  return {p:x.primaryFidsExpiry,attention:x.primaryFidsExpiryNeedsAttention,calls};
 }
 const good=await observe();
 assert.equal(good.p.state,"SCHEDULE_EXECUTED_EXPIRY_STEP_NOT_DELETION_PROOF");
 assert.equal(good.p.latestExecutedJobVerified,true);
 assert.equal(good.p.latestExecutedJobId,601);
 assert.equal(good.p.actualRetentionReceiptVerified,false);
 assert.equal(good.p.physicalDeletionVerified,false);
 assert.equal(good.p.retentionDeadlineGuaranteed,false);
 assert.equal(good.attention,false);assert.equal(good.calls.length,11);
 for(const [patch,row,job,state] of [
  [{P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA:"c".repeat(40)},latest,actual,"SCHEDULE_APPROVED_MAIN_DRIFT"],
  [{P5_PRIMARY_FIDS_EXPIRY_APPROVAL:""},latest,actual,"SCHEDULE_APPLY_APPROVAL_MISSING"],
  [{},null,actual,"NO_SCHEDULE_RUN_OBSERVED"],
  [{},{...latest,head_sha:"c".repeat(40)},actual,"NO_SCHEDULE_RUN_ON_CURRENT_MAIN"],
  [{},{...latest,created_at:"2026-11-13T20:00:00Z"},actual,"SCHEDULE_OBSERVATION_STALE"],
  [{},{...latest,run_attempt:2},actual,"SCHEDULE_EXECUTION_NOT_SUCCESSFUL_FIRST_ATTEMPT"],
  [{},latest,{...actual,conclusion:"skipped"},"SCHEDULE_SUCCESS_WITHOUT_EXECUTED_EXPIRY_STEP"],
  [{},latest,{...actual,steps:[]},"SCHEDULE_SUCCESS_WITHOUT_EXECUTED_EXPIRY_STEP"],
  [{},latest,{...actual,run_id:999},"SCHEDULE_SUCCESS_WITHOUT_EXECUTED_EXPIRY_STEP"],
  [{},latest,null,"SCHEDULE_JOB_EVIDENCE_UNAVAILABLE"]
 ]){
  const x=await observe(patch,row,job);
  assert.equal(x.p.state,state);assert.equal(x.p.latestExecutedJobVerified,false);assert.equal(x.attention,true);
 }
});

test("native primary schedule warning remains while exact current-main backup child is separately observed",async()=>{
 const e={...env(),P5_PRIMARY_FIDS_EXPIRY_ENABLED:"true",P5_PRIMARY_FIDS_BACKSTOP_ENABLED:"true",
  P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA:ID,
  P5_PRIMARY_FIDS_EXPIRY_APPROVAL:"APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER"};
 const child={...run(700,{conclusion:"success",event:"workflow_dispatch",created:"2026-11-14T01:55:00Z"}),
  path:".github/workflows/phase5-primary-fids-expiry-no-provider.yml",display_title:"P5 PRIMARY BACKSTOP CHILD",run_attempt:1};
 const job={id:701,run_id:700,head_sha:ID,run_attempt:1,name:"primary-fids-expiry",
  status:"completed",conclusion:"success",completed_at:"2026-11-14T01:56:00Z",
  steps:[{name:"Verify exact main and execute only bounded primary FIDS expiry",status:"completed",conclusion:"success"}]};
 async function check(candidate=child,jobs=[job]){
  return readP6GithubAutoControllerHeartbeat(e,{now:()=>new Date(T),fetcher:async(url,opts)=>{
   assert.equal(opts.method,"GET");
   if(url.includes("/actions/runs/700/jobs?"))return {ok:true,json:async()=>({total_count:jobs.length,jobs})};
   if(url.includes("phase5-primary-fids-expiry-no-provider.yml")&&url.includes("event=workflow_dispatch"))
    return {ok:true,json:async()=>({total_count:1,workflow_runs:[candidate]})};
   if(url.includes("phase5-primary-fids-expiry-no-provider.yml"))
    return {ok:true,json:async()=>({total_count:1,workflow_runs:[{...run(600,{conclusion:"success"}),head_sha:"c".repeat(40)}]})};
   return {ok:true,json:async()=>({total_count:1,workflow_runs:[run(1)]})};
  }});
 }
 const x=await check();
 assert.equal(x.primaryFidsExpiry.state,"NO_SCHEDULE_RUN_ON_CURRENT_MAIN");
 assert.equal(x.primaryFidsExpiry.backup.state,"BACKSTOP_CHILD_STEP_RECENT_NOT_DELETION_PROOF");
 assert.equal(x.primaryFidsExpiry.backup.runId,700);
 assert.equal(x.primaryFidsExpiry.backup.jobId,701);
 assert.equal(x.primaryFidsExpiry.backup.actualRetentionReceiptVerified,false);
 assert.equal(x.primaryFidsExpiryNeedsAttention,true);
 assert.equal(x.activeNotifications.incidents.find(i=>i.lane==="PRIMARY_FIDS_EXPIRY")?.backupState,
  "BACKSTOP_CHILD_STEP_RECENT_NOT_DELETION_PROOF");
 const skipped=await check({...child,conclusion:"skipped"},[]);
 assert.equal(skipped.primaryFidsExpiry.backup.state,"BACKSTOP_CHILD_NOT_SUCCESSFUL");
 assert.equal(skipped.primaryFidsExpiry.backup.executedStepVerified,false);
});

test("native notification branch is dormant before activation and ignores old historical gaps",async()=>{
 const a=P6_EXISTING_CONTROLLER_LANES.map((l,i)=>reviewP6OneScheduledController(l,[run(i+100),run(i+200,{created:"2026-11-13T18:00:00Z"})],T));
 const report=summarizeP6ControllerHeartbeat(a,T);
 assert(report.controllerHistoricalGapCount>0);
 const result=await reviewP6ActiveStandaloneNotifications(report,env(),async()=>{throw Error("unexpected read")});
 assert.equal(result.collectionExpected,false);
 assert.equal(result.incidentCount,0);
});
test("armed current-main monitoring distinguishes executed step, skipped draw, missing parent evidence and safely pending",async()=>{
 const a=P6_EXISTING_CONTROLLER_LANES.map((l,i)=>reviewP6OneScheduledController(l,[run(i+100,{conclusion:"success"})],T));
 const report=summarizeP6ControllerHeartbeat(a,T);
 const jobsByLane={
  EARLY_DRAW:[["gated-exact-early-parent","Select max ONE genuinely due future parent under actual DB clock and existing serializable owner"]],
  SOURCE:[["separately-authorized-stored-source-children","Dispatch stored SOURCE exact children"],["separately-authorized-current-private-post-children","Dispatch current private POST exact children"],["separately-authorized-native-post-producer","Review and publish bounded current POST windows with independent readback"]],
  PRE:[["bounded-reviewed-real-pre","One signed bounded lease tick — original Stage14 and no paid provider"]],
  PRE_RECOVERY:[["reviewed-existing-queue-watchdog","Bounded existing V0087 reaper, UNKNOWN quarantines never replay"]],
  DAILY_PREPARE:[["protected-main-one-day-nonpaid","Prepare and publish at most one eligible independently reviewed future day"]],
  PRE_ENROLLMENT:[["enroll-current-signed-day",null],["enroll-current-signed-t24-day",null]],
  T24:[["current-private-native-t24","Current signed T24 packets through original Stage14 and independent V0081"]]
 };
 const arm={...env(),P6_HEARTBEAT_COLLECTION_EXPECTED:"true"};
 const readers=patch=>async url=>{
  const id=Number(url.match(/runs\/(\d+)\/jobs/)[1]),lane=a.find(x=>x.mostRecentRun.id===id).lane;
  const jobs=jobsByLane[lane].map(([name,step],i)=>({id:1000+i,run_id:id,name,status:"completed",conclusion:"success",steps:step?[{name:step,status:"completed",conclusion:"success"}]:[]}));
  patch?.(lane,jobs);
  return {total_count:jobs.length,jobs};
 };
 const good=await reviewP6ActiveStandaloneNotifications(report,arm,readers());
 assert.equal(good.incidentCount,0);
 assert.equal(good.realDueDrawOrPreparationVerified,false);
 assert.equal(good.flightCollectionVerified,false);
 const bad=await reviewP6ActiveStandaloneNotifications(report,arm,readers((lane,jobs)=>{
  if(lane==="EARLY_DRAW")jobs[0].steps[0].conclusion="skipped";
  if(lane==="SOURCE")jobs[0].steps.push({name:"Parent outcome MISSING_EVIDENCE",status:"completed",conclusion:"success"});
  if(lane==="DAILY_PREPARE")jobs[0].conclusion="skipped";
 }));
 assert.equal(bad.incidentCount,3);
 assert(bad.incidents.some(i=>i.lane==="EARLY_DRAW"));
 assert(bad.incidents.some(i=>i.reason==="PARENT_REPORTED_HOLD_OR_MISSING_EVIDENCE"));
 assert(bad.incidents.some(i=>i.lane==="DAILY_PREPARE"));
 const pending=structuredClone(report);
 pending.controllerStates.find(x=>x.lane==="PRE").mostRecentRun.status="in_progress";
 const missing=pending.controllerStates.find(x=>x.lane==="EARLY_DRAW");
 missing.historicalCadence.latestAgeExceedsExpected=true;
 const x=await reviewP6ActiveStandaloneNotifications(pending,arm,readers());
 assert.equal(x.incidentCount,1);
 assert.equal(x.incidents[0].reason,"SCHEDULE_MISSING_OR_STALE");
 const drift=structuredClone(report);
 drift.controllerStates.find(x=>x.lane==="T24").mostRecentRun.headSha="c".repeat(40);
 const y=await reviewP6ActiveStandaloneNotifications(drift,arm,readers());
 assert.equal(y.incidents[0].reason,"CURRENT_MAIN_EXECUTION_NOT_OBSERVED");
 assert.equal(y.providerCalls,0);
 assert.equal(y.dispatches,0);
});

test("direct recovery observation preserves distinct exact terminal, carried, HOLD and native gap evidence",async()=>{
 const e={...env(),P6_ROLLING_DIRECT_RECOVERY_ENABLED:"1",P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC:"2026-11-14T01:00:00.000Z"};
 const child={...run(850,{conclusion:"success",event:"workflow_dispatch",created:"2026-11-14T01:55:00Z"}),
  run_attempt:1,path:".github/workflows/phase6-direct-recovery-tick.yml",display_title:"P6 DIRECT RECOVERY TICK"};
 const mk=(name,conclusion="success")=>({name,status:"completed",conclusion});
 const job={id:851,run_id:850,head_sha:ID,run_attempt:1,name:"direct-protected-recovery-tick",status:"completed",conclusion:"success"};
 const reader=(mode="TERMINAL",patch={},extra=[])=>async url=>{
  if(url.includes("/jobs?")){
   const p={...job,steps:[mk("Execute one direct recovery wave and reconcile exact parent ACKs"),mk("Preserve direct terminal operational receipt"),
    mk("Direct outcome TERMINAL_PARENT_ACKS_RECONCILED",mode==="TERMINAL"?"success":"skipped"),mk("Direct outcome PREFLIGHT_HOLD_NO_POST",mode==="PREFLIGHT_HOLD"?"success":"skipped"),
    mk("Direct outcome KNOWN_ACTIVE_PARENT_ACKS_CARRIED",mode==="CARRIED"?"success":"skipped")]};
   const jobs=[p,...["offline-direct-recovery","direct-readonly-verify"].map((name,i)=>({...job,id:852+i,name,conclusion:"skipped",steps:[]}))];
   return {total_count:3,jobs};
  }
  const rows=[{...child,...patch},...extra];
  return {total_count:rows.length,workflow_runs:rows};
 };
 for(const [mode,state,recent] of [["TERMINAL","DIRECT_RECOVERY_TERMINAL_STEP_OBSERVED_NOT_COLLECTION_PROOF",true],["CARRIED","DIRECT_RECOVERY_KNOWN_ACTIVE_MARKER_OBSERVED_NOT_TERMINAL_PROOF",true],
 ["PREFLIGHT_HOLD","DIRECT_RECOVERY_PREFLIGHT_HOLD_REVIEW",false],["BROKEN","DIRECT_RECOVERY_RESULT_MARKER_REVIEW",false]]){
  const o=await observeP6DirectRecovery(e,reader(mode),T);assert.equal(o.state,state);assert.equal(o.recentOperationalTick,recent);
  assert.equal(o.terminalParentAcknowledgementsProven,false);assert.equal(o.collectionProven,false);assert.equal(o.actualExternalCronAttributionProven,false);
 }
 assert.equal((await observeP6DirectRecovery(e,reader("TERMINAL",{head_sha:"c".repeat(40)}),T)).state,"DIRECT_RECOVERY_PIN_DRIFT");
 assert.equal((await observeP6DirectRecovery(e,reader("TERMINAL",{},[{...child,id:800,created_at:"2026-11-14T01:40:00Z",conclusion:"failure"}]),T)).state,"DIRECT_RECOVERY_PRIOR_ATTEMPT_REVIEW");
 assert.equal((await observeP6DirectRecovery(e,reader("TERMINAL",{created_at:"2026-11-14T01:30:00Z"}),T)).state,"DIRECT_RECOVERY_STALE");
 assert.equal((await observeP6DirectRecovery(env(),async()=>{throw Error("must stay disabled")},T)).state,"DIRECT_RECOVERY_DISABLED");
});
