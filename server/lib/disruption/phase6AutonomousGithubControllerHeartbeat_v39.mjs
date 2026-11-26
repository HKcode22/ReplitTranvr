/**
 * Phase5/6 autonomous GitHub controller heartbeat.
 * NONPAID and NO DATABASE. GitHub Actions schedule health is NOT science GO,
 * current source/right proof, on-time flight PRE, or POST outcome evidence.
 *
 * Zero provider HTTP, zero SQL/DDL, zero workflow dispatch or GH writes.
 * This inspector reads GitHub scheduled workflow-run metadata (not logs).
 * A conclusion of "skipped" is a deliberately gated workflow, NOT proof
 * of flight collection. GitHub clock NEVER replaces original PG16 cutoff.
 */
export const P6_AUTO_CONTROL_HEARTBEAT_V39=
 "v39.phase6.github-autonomous-control-plane-heartbeat.v1";
const SHA=/^[a-f0-9]{40}$/;
const WF=/^[a-z0-9][a-z0-9-]{5,110}\.yml$/;
const REPO="HKcode22/ReplitTranvr";
const ROOT="https://api.github.com/repos/"+REPO;
const MAX_PER_WORKFLOW=15;
const fail=s=>{throw Error("HOLD_P6_AUTO_HEARTBEAT_"+s);};
export const P6_EXISTING_CONTROLLER_LANES=Object.freeze([
 {
  lane:"EARLY_DRAW",
  workflow:"phase5-six-slot-approved-early-four-airport-draw.yml",
  maxExpectedGapMinutes:330, // Six UTC slots, 4h cadence + 90m jitter
  purpose:"Four-hour cadence for prospective early four-airport cohorts"
 },
 {
  lane:"SOURCE",
  workflow:"phase5-source-upcoming-queue-main-scheduled-readonly.yml",
  maxExpectedGapMinutes:90,
  purpose:"Ten-minute signed upcoming source + SOURCE child review"
 },
 {
  lane:"PRE",
  workflow:"phase5-cd-github-bounded-pre-tick.yml",
  maxExpectedGapMinutes:90,
  purpose:"Five-minute signed current later PRE worker"
 },
 {
  lane:"PRE_RECOVERY",
  workflow:"phase5-cd-github-existing-queue-lease-watchdog.yml",
  maxExpectedGapMinutes:90,
  purpose:"Five-minute existing V0087 lease/watchdog reconciliation"
 },
 {
  lane:"DAY_SHARD_SELECTOR",
  workflow:"phase5-phase6-append-only-day-shard-dbclock-readonly.yml",
  maxExpectedGapMinutes:90,
  purpose:"Legacy independent day-index observer; not required for current stored dispatcher"
 },
 {lane:"DAILY_PREPARE",workflow:"phase6-nonpaid-source-day-prepare-publish.yml",maxExpectedGapMinutes:90,purpose:"Current-day nonpaid SOURCE preparation and private publication"},
 {lane:"PRE_ENROLLMENT",workflow:"phase6-private-later-enrollment.yml",maxExpectedGapMinutes:90,purpose:"Current signed later and T24 enrollment"},
 {lane:"T24",workflow:"phase5-cd-github-one-queued-t24-witness-main-manual.yml",maxExpectedGapMinutes:90,purpose:"Native T24 and independent witness execution"},
 {lane:"RETENTION",workflow:"phase5-private-blob-retention-readonly-sentinel-no-provider.yml",maxExpectedGapMinutes:150,purpose:"Restricted primary-blob expiry metadata monitoring; not deletion"}
]);
// Separate from the historical nine-lane collection cadence summary.
// This 60-minute diagnostic is not a new retention policy or an SLA.
export const P6_PRIMARY_FIDS_EXPIRY_LANE=Object.freeze({
 lane:"PRIMARY_FIDS_EXPIRY",workflow:"phase5-primary-fids-expiry-no-provider.yml",
 maxExpectedGapMinutes:60,purpose:"15-minute scheduled primary FIDS expiry, distinct from blob sentinel"
});
const PRIMARY_APPLY="APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER";
const PRIMARY_STEP="Verify exact main and execute only bounded primary FIDS expiry";
async function observeP6PrimaryBackup(env,readGithub,observedAtUtc){
 const off={state:"BACKSTOP_DISABLED",runId:null,jobId:null,executedStepVerified:false,
  actualRetentionReceiptVerified:false,physicalDeletionVerified:false,retentionDeadlineGuaranteed:false};
 if(env.P5_PRIMARY_FIDS_BACKSTOP_ENABLED!=="true")return off;
 try{
  const h=await readGithub(ROOT+"/actions/workflows/"+P6_PRIMARY_FIDS_EXPIRY_LANE.workflow+
   "/runs?branch=main&event=workflow_dispatch&per_page="+MAX_PER_WORKFLOW);
  if(!Number.isSafeInteger(h?.total_count)||h.total_count<0||!Array.isArray(h.workflow_runs)||
     h.workflow_runs.length!==Math.min(h.total_count,MAX_PER_WORKFLOW))fail("INVALID_PRIMARY_BACKUP_HISTORY");
  const children=h.workflow_runs.filter(r=>r?.display_title==="P5 PRIMARY BACKSTOP CHILD"||r?.display_title==="P5 FULL RETENTION BACKSTOP CHILD")
   .sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||b.id-a.id);
  if(!children.length)return {...off,state:"NO_BACKSTOP_CHILD_OBSERVED"};
  const child=children[0],when=Date.parse(child.created_at),now=Date.parse(observedAtUtc);
  if(!Number.isSafeInteger(child.id)||child.id<1||child.path!==".github/workflows/"+P6_PRIMARY_FIDS_EXPIRY_LANE.workflow||
     child.head_branch!=="main"||child.event!=="workflow_dispatch"||child.run_attempt!==1||
     !Number.isFinite(when)||when>now+5000)return {...off,state:"BACKSTOP_CHILD_IDENTITY_UNVERIFIED"};
  const base={...off,runId:child.id};
  if(child.head_sha!==env.GITHUB_SHA)return {...base,state:"NO_BACKSTOP_CHILD_ON_CURRENT_MAIN"};
  if(child.status!=="completed")return {...base,state:"BACKSTOP_CHILD_PENDING"};
  if(child.conclusion!=="success")return {...base,state:"BACKSTOP_CHILD_NOT_SUCCESSFUL"};
  const j=await readGithub(ROOT+"/actions/runs/"+child.id+"/jobs?filter=latest&per_page=10");
  const job=j?.jobs?.find(x=>x.name==="primary-fids-expiry");
  const step=job?.steps?.filter(s=>s.name===PRIMARY_STEP&&s.status==="completed"&&s.conclusion==="success");
  if(!job||!Array.isArray(j?.jobs)||
     !Number.isSafeInteger(job.id)||job.id<1||job.run_id!==child.id||job.head_sha!==env.GITHUB_SHA||
     job.run_attempt!==1||job.status!=="completed"||job.conclusion!=="success"||step?.length!==1)
   return {...base,state:"BACKSTOP_CHILD_STEP_UNVERIFIED"};
  const completed=Date.parse(job.completed_at);
  if(!Number.isFinite(completed)||completed<when||completed>now+5000)
   return {...base,state:"BACKSTOP_CHILD_TIME_UNVERIFIED"};
  return {...base,jobId:job.id,executedStepVerified:true,
   state:now-completed>60*60000?"BACKSTOP_CHILD_STEP_STALE":"BACKSTOP_CHILD_STEP_RECENT_NOT_DELETION_PROOF"};
 }catch{return {...off,state:"BACKSTOP_EVIDENCE_UNAVAILABLE"};}
}
// Independent direct-controller job metadata. A native outage stays visible;
// a recent controller receipt is never a claim of a paid flight or completed
// parent. Read only the exact existing workflow when the direct lane is on.
export async function observeP6DirectRecovery(env,readGithub,observedAtUtc){
 const base={state:"DIRECT_RECOVERY_DISABLED",runId:null,jobId:null,mode:null,
  recentOperationalTick:false,terminalParentAcknowledgementsProven:false,
  actualExternalCronAttributionProven:false,collectionProven:false};
 if(env.P6_ROLLING_DIRECT_RECOVERY_ENABLED!=="1")return base;
 const wf="phase6-direct-recovery-tick.yml",path=".github/workflows/"+wf,clock=Date.parse(observedAtUtc);
 try{
  const since=Date.parse(env.P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC);
  if(!Number.isSafeInteger(since)||new Date(since).toISOString()!==env.P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC||since>clock)
   return {...base,state:"DIRECT_RECOVERY_ACTIVATION_INVALID"};
  const history=await readGithub(ROOT+"/actions/workflows/"+wf+"/runs?branch=main&event=workflow_dispatch&per_page=15&created="+encodeURIComponent(">="+new Date(since).toISOString()));
  if(!Number.isSafeInteger(history?.total_count)||history.total_count<0||!Array.isArray(history.workflow_runs)||
    history.workflow_runs.length!==Math.min(history.total_count,15))fail("DIRECT_HISTORY_INCOMPLETE");
  const rows=[...history.workflow_runs];
  if(new Set(rows.map(x=>x.id)).size!==rows.length||rows.some(x=>!Number.isSafeInteger(x.id)||x.id<1||x.path!==path||
    x.head_branch!=="main"||x.event!=="workflow_dispatch"||x.run_attempt!==1||x.display_title!=="P6 DIRECT RECOVERY TICK"||
    !Number.isFinite(Date.parse(x.created_at))||Date.parse(x.created_at)<since||Date.parse(x.created_at)>clock+5000))
   return {...base,state:"DIRECT_RECOVERY_HISTORY_IDENTITY_REVIEW"};
  const last=rows.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||b.id-a.id)[0];
  if(!last)return {...base,state:"DIRECT_RECOVERY_NO_TICK_OBSERVED"};
  const result={...base,runId:last.id};
  if(last.head_sha!==env.GITHUB_SHA)return {...result,state:"DIRECT_RECOVERY_PIN_DRIFT"};
  // A recent later green cannot hide a failed attempt visible in this window.
  if(rows.some(x=>x.head_sha!==env.GITHUB_SHA||x.status==="completed"&&x.conclusion!=="success"))
   return {...result,state:"DIRECT_RECOVERY_PRIOR_ATTEMPT_REVIEW"};
  if(clock-Date.parse(last.created_at)>20*60000)return {...result,state:"DIRECT_RECOVERY_STALE"};
  if(last.status!=="completed")return {...result,state:"DIRECT_RECOVERY_PENDING"};
  const j=await readGithub(ROOT+"/actions/runs/"+last.id+"/jobs?filter=latest&per_page=100");
  if(j?.total_count!==3||!Array.isArray(j.jobs)||j.jobs.length!==3||new Set(j.jobs.map(x=>x.id)).size!==3||
   j.jobs.some(x=>!Number.isSafeInteger(x.id)||x.id<1||x.run_id!==last.id||x.head_sha!==env.GITHUB_SHA||x.run_attempt!==1||x.status!=="completed")||
   !["offline-direct-recovery","direct-readonly-verify"].every(name=>j.jobs.filter(x=>x.name===name&&x.conclusion==="skipped"&&(x.steps==null||Array.isArray(x.steps)&&x.steps.length===0)).length===1))
   return {...result,state:"DIRECT_RECOVERY_JOB_IDENTITY_REVIEW"};
  const p=j.jobs.find(x=>x.name==="direct-protected-recovery-tick");
  if(!p||p.conclusion!=="success"||!Array.isArray(p.steps)||!["Execute one direct recovery wave and reconcile exact parent ACKs","Preserve direct terminal operational receipt"].every(name=>
   p.steps.filter(x=>x.name===name&&x.status==="completed"&&x.conclusion==="success").length===1))
   return {...result,state:"DIRECT_RECOVERY_REQUIRED_STEP_UNVERIFIED"};
  const marks=["Direct outcome TERMINAL_PARENT_ACKS_RECONCILED","Direct outcome PREFLIGHT_HOLD_NO_POST","Direct outcome KNOWN_ACTIVE_PARENT_ACKS_CARRIED"].map(name=>p.steps.filter(x=>x.name===name));
  if(marks.some(x=>x.length!==1||x[0].status!=="completed"||!["success","skipped"].includes(x[0].conclusion))||marks.filter(x=>x[0].conclusion==="success").length!==1)
   return {...result,state:"DIRECT_RECOVERY_RESULT_MARKER_REVIEW"};
  const mode=["TERMINAL","PREFLIGHT_HOLD","CARRIED"][marks.findIndex(x=>x[0].conclusion==="success")];
  return {...result,jobId:p.id,mode,recentOperationalTick:mode!=="PREFLIGHT_HOLD",
   // Deliberately not a claim of artifact-byte proof from job metadata.
   state:mode==="TERMINAL"?"DIRECT_RECOVERY_TERMINAL_STEP_OBSERVED_NOT_COLLECTION_PROOF":
     mode==="CARRIED"?"DIRECT_RECOVERY_KNOWN_ACTIVE_MARKER_OBSERVED_NOT_TERMINAL_PROOF":"DIRECT_RECOVERY_PREFLIGHT_HOLD_REVIEW"};
 }catch{return {...base,state:"DIRECT_RECOVERY_EVIDENCE_UNAVAILABLE"};}
}
async function observeP6PrimaryFidsExpiry(env,readGithub,observedAtUtc){
 const history=await readGithub(ROOT+"/actions/workflows/"+P6_PRIMARY_FIDS_EXPIRY_LANE.workflow+
  "/runs?branch=main&event=schedule&per_page="+MAX_PER_WORKFLOW);
 if(!history||!Number.isSafeInteger(history.total_count)||history.total_count<0||
    !Array.isArray(history.workflow_runs)||history.workflow_runs.length>MAX_PER_WORKFLOW||
    (history.total_count===0)!==(history.workflow_runs.length===0))
  fail("INVALID_PRIMARY_EXPIRY_HISTORY");
 const lane=reviewP6OneScheduledController(P6_PRIMARY_FIDS_EXPIRY_LANE,history.workflow_runs,observedAtUtc);
 const latest=history.workflow_runs.find(r=>r.id===lane.mostRecentRun?.id);
 const enabled=env.P5_PRIMARY_FIDS_EXPIRY_ENABLED==="true";
 const pinMatches=env.P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA===env.GITHUB_SHA;
 const approved=env.P5_PRIMARY_FIDS_EXPIRY_APPROVAL===PRIMARY_APPLY;
 const sameMain=!!latest&&latest.head_sha===env.GITHUB_SHA;
 let state,jobExecuted=false,jobId=null;
 if(!enabled){
  state=["","false",undefined].includes(env.P5_PRIMARY_FIDS_EXPIRY_ENABLED)?
   "SCHEDULED_APPLY_DISABLED":"SCHEDULE_CONFIGURATION_INVALID";
 }else if(!pinMatches)state="SCHEDULE_APPROVED_MAIN_DRIFT";
 else if(!approved)state="SCHEDULE_APPLY_APPROVAL_MISSING";
 else if(!latest)state="NO_SCHEDULE_RUN_OBSERVED";
 else if(!sameMain)state="NO_SCHEDULE_RUN_ON_CURRENT_MAIN";
 else if(lane.historicalCadence.latestAgeExceedsExpected)state="SCHEDULE_OBSERVATION_STALE";
 else if(latest.status!=="completed")state="SCHEDULE_EXECUTION_PENDING";
 else if(latest.conclusion!=="success"||latest.run_attempt!==1)state="SCHEDULE_EXECUTION_NOT_SUCCESSFUL_FIRST_ATTEMPT";
 else{
  try{
   const j=await readGithub(ROOT+"/actions/runs/"+latest.id+"/jobs?filter=latest&per_page=10");
   const x=j?.jobs?.find(job=>job.name==="primary-fids-expiry");
   const step=x?.steps?.filter(s=>s.name===PRIMARY_STEP&&s.status==="completed"&&s.conclusion==="success");
   if(!x||!Array.isArray(j?.jobs)||
      x.run_id!==latest.id||!Number.isSafeInteger(x.id)||x.id<1||x.status!=="completed"||
      x.conclusion!=="success"||!Array.isArray(x.steps)||step?.length!==1)
    state="SCHEDULE_SUCCESS_WITHOUT_EXECUTED_EXPIRY_STEP";
   else{state="SCHEDULE_EXECUTED_EXPIRY_STEP_NOT_DELETION_PROOF";jobExecuted=true;jobId=x.id;}
  }catch{state="SCHEDULE_JOB_EVIDENCE_UNAVAILABLE";}
 }
 const backup=await observeP6PrimaryBackup(env,readGithub,observedAtUtc);
 return {state,backup,scheduledApplyEnabled:enabled,approvalPinMatchesCurrentMain:pinMatches,
  separateApplyApprovalPresent:approved,latestRunMatchesCurrentMain:sameMain,
  latestExecutedJobVerified:jobExecuted,latestExecutedJobId:jobId,
  actualRetentionReceiptVerified:false,physicalDeletionVerified:false,
  retentionDeadlineGuaranteed:false,providerCalls:0,databaseReads:0,databaseWrites:0,
  scheduleObservation:lane};
}
export const P6_MANUAL_OR_MISSING_RELEASE_LANES=Object.freeze([
 {
  lane:"POST_CHILD",state:"CURRENT_POST_PARENT_AND_CHILD_IMPLEMENTED_ACTUAL_RELEASE_UNVERIFIED",
  workflow:"phase5-one-signed-future-post-v0083-main-manual.yml"
 },
 {
  lane:"PRIVATE_SOURCE_PUBLISHER",
  state:"CURRENT_NONPAID_PUBLISHER_IMPLEMENTED_ACTUAL_RELEASE_UNVERIFIED",
  workflow:"phase6-nonpaid-source-day-prepare-publish.yml"
 },
 {
  lane:"FULL_31_DAY_ROLLOVER",
  state:"DYNAMIC_STORED_DAY_ROUTING_IMPLEMENTED_ACTUAL_ROLLOVER_UNVERIFIED",
  workflow:null
 }
]);
const stamp=(s,why)=>{
 if(typeof s!=="string"||!Number.isFinite(Date.parse(s))||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(s))
  fail("INVALID_GITHUB_"+why);
 return Date.parse(s);
};
export function reviewP6OneScheduledController(
 lane,latestRuns,observedAtUtc
){
 if(!lane||!WF.test(lane.workflow??"")||
    typeof lane.lane!=="string"||
    !Number.isSafeInteger(lane.maxExpectedGapMinutes)||
    lane.maxExpectedGapMinutes<30||lane.maxExpectedGapMinutes>360||
    !Array.isArray(latestRuns)||
    latestRuns.length>MAX_PER_WORKFLOW)fail("UNREVIEWED_LANE_OR_UNBOUNDED_HISTORY");
 const clock=stamp(observedAtUtc,"OBSERVATION_CLOCK");
 const rows=[];const seen=new Set();
 for(const run of latestRuns){
  if(!run||!Number.isSafeInteger(run.id)||run.id<1||
     seen.has(run.id)||run.event!=="schedule"||
     !["queued","in_progress","completed","waiting","requested","pending"].includes(run.status)||
     !(run.conclusion===null||
       ["success","failure","cancelled","skipped","timed_out",
        "neutral","action_required"].includes(run.conclusion))||
     run.status!=="completed"&&run.conclusion!==null||
     run.status==="completed"&&run.conclusion===null||
     typeof run.head_branch!=="string"||run.head_branch!=="main"||
     !SHA.test(run.head_sha??"")||
     typeof run.created_at!=="string")
   fail("UNTRUSTED_SCHEDULE_RUN_OR_FOREIGN_BRANCH");
  const created=stamp(run.created_at,"RUN_CLOCK");
  if(created>clock+5*60_000)fail("FUTURE_RUN_TIMESTAMP");
  seen.add(run.id);
  rows.push({id:run.id,status:run.status,conclusion:run.conclusion,
   headShaPrefix:run.head_sha.slice(0,10),headSha:run.head_sha,createdAtUtc:run.created_at,
   ageMinutes:Math.max(0,Math.round((clock-created)/60000))});
 }
 rows.sort((a,b)=>b.createdAtUtc.localeCompare(a.createdAtUtc));
 const last=rows[0]??null;
 // A freshly created run can hide hours of scheduler silence. Measure
 // interarrival gaps on the actual returned history, without pretending
 // to know the exact scheduled event time, runner wait or flight outcomes.
 const gaps=rows.slice(1).map((older,i)=>
  stamp(rows[i].createdAtUtc,"RUN_CLOCK")-stamp(older.createdAtUtc,"RUN_CLOCK"));
 const ordered=[...gaps].sort((a,b)=>a-b);
 const n=ordered.length;
 const medianMs=n===0?null:n%2?ordered[(n-1)/2]:(ordered[n/2-1]+ordered[n/2])/2;
 const gapLimitMs=lane.maxExpectedGapMinutes*60_000;
 const toMinutes=ms=>ms===null?null:Math.round(ms/6000)/10;
 const historicalCadence={
  observedIntervals:n,
  recentWindowOldestUtc:rows.at(-1)?.createdAtUtc??null,
  recentWindowNewestUtc:last?.createdAtUtc??null,
  medianObservedGapMinutes:toMinutes(medianMs),
  maxObservedGapMinutes:toMinutes(n?ordered[n-1]:null),
  intervalsExceedingExpectedMax:gaps.filter(ms=>ms>gapLimitMs).length,
  newestObservedGapMinutes:toMinutes(gaps[0]??null),
  latestAgeExceedsExpected:last!==null&&clock-stamp(last.createdAtUtc,"RUN_CLOCK")>gapLimitMs,
  measuredActualWorkerLatency:false,
  exactMissingCronSlotsKnown:false
 };
 const counts={completedSuccess:0,completedSkipped:0,completedFailed:0,
   pendingOrInProgress:0};
 for(const row of rows){
  if(row.status!=="completed")counts.pendingOrInProgress++;
  else if(row.conclusion==="success")counts.completedSuccess++;
  else if(row.conclusion==="skipped")counts.completedSkipped++;
  else counts.completedFailed++;
 }
 let state;
 if(!last)state="NO_SCHEDULE_RUN_OBSERVED";
 else if(historicalCadence.latestAgeExceedsExpected)
  state="SCHEDULE_OBSERVATION_STALE";
 else if(last.status!=="completed")state="SCHEDULE_WORKFLOW_PENDING_NO_FLIGHT_PROOF";
 else if(last.conclusion==="skipped")state="SCHEDULE_GATED_SKIPPED_NOT_A_FAILURE_OR_A_FLIGHT";
 else if(last.conclusion==="success")state="WORKFLOW_SUCCESS_NOT_PROOF_COLLECTION";
 else state="SCHEDULE_RUN_UNSUCCESSFUL_REVIEW";
 return{
  lane:lane.lane,workflow:lane.workflow,purpose:lane.purpose,
  expectedMaxGapMinutes:lane.maxExpectedGapMinutes,
  state,mostRecentRun:last,observedRecentRuns:rows.length,
  runStateCounts:counts,
  historicalCadence,
  githubSchedulePresenceOnly:true,
  actualDatabaseQueueOrSignedSourceObserved:false,
  successfullyCollectedFlightOrPaidRunProven:false
 };
}
export function summarizeP6ControllerHeartbeat(assessments,observedAtUtc){
 if(!Array.isArray(assessments)||
    assessments.length!==P6_EXISTING_CONTROLLER_LANES.length||
    assessments.some((x,i)=>x.lane!==P6_EXISTING_CONTROLLER_LANES[i].lane))
  fail("INCOMPLETE_OR_MIXED_CONTROLLER_OBSERVATIONS");
 stamp(observedAtUtc,"SUMMARY_CLOCK");
 const problem=assessments.filter(x=>["NO_SCHEDULE_RUN_OBSERVED",
  "SCHEDULE_OBSERVATION_STALE","SCHEDULE_RUN_UNSUCCESSFUL_REVIEW"]
  .includes(x.state));
 const historicalProblems=assessments.filter(x=>x.historicalCadence?.intervalsExceedingExpectedMax>0);
 const unionProblems=new Set([...problem,...historicalProblems].map(x=>x.lane));
 return{
  schema:P6_AUTO_CONTROL_HEARTBEAT_V39,
  status:unionProblems.size?
   "AUTONOMOUS_GITHUB_CONTROLLERS_NEED_ATTENTION_NO_GO":
   "AUTONOMOUS_GITHUB_SCHEDULE_PRESENT_NOT_COLLECTION_PROOF_NO_GO",
  observedAtGithubRunnerUtc:observedAtUtc,
  existingScheduledControllerCount:assessments.length,
  controllerStates:assessments,
  controllerProblemCount:unionProblems.size,
  controllerCurrentProblemCount:problem.length,
  controllerHistoricalGapCount:historicalProblems.length,
  honestMissingAutonomousEndToEndLanes:P6_MANUAL_OR_MISSING_RELEASE_LANES,
  isActualPgClock:false,
  authorizedProviderContentsAnd31DayRetention:false,
  realPrivateSourceOrV0094PacketRead:false,
  signed31DayB0062CalendarOrBudgetsObserved:false,
  signedPhysicalFlightPreObserved:false,
  realWebhookPostOrLabelObserved:false,
  automaticFull31DayRolloverVerified:false,
  providerCalls:0,databaseReads:0,databaseWrites:0,
  dispatchCount:0,paidPhase6Go:false,phase5Freeze:false
 };
}
// Existing standalone release lanes. This is notification-only metadata,
// not an additional authorization switch, scheduler or provider/DB read.
const P6_EXPECTED_ACTIVE_JOBS=Object.freeze({
 EARLY_DRAW:[["gated-exact-early-parent","Select max ONE genuinely due future parent under actual DB clock and existing serializable owner"]],
 SOURCE:[["separately-authorized-stored-source-children","Dispatch stored SOURCE exact children"],["separately-authorized-current-private-post-children","Dispatch current private POST exact children"],["separately-authorized-native-post-producer","Review and publish bounded current POST windows with independent readback"]],
 PRE:[["bounded-reviewed-real-pre","One signed bounded lease tick — original Stage14 and no paid provider"]],
 PRE_RECOVERY:[["reviewed-existing-queue-watchdog","Bounded existing V0087 reaper, UNKNOWN quarantines never replay"]],
 DAILY_PREPARE:[["protected-main-one-day-nonpaid","Prepare and publish at most one eligible independently reviewed future day"]],
 PRE_ENROLLMENT:[["enroll-current-signed-day",null],["enroll-current-signed-t24-day",null]],
 T24:[["current-private-native-t24","Current signed T24 packets through original Stage14 and independent V0081"]]
});
/** Six-slot EARLY_DRAW handover: a verified first-parent execution is
 * historical evidence only. Wait no longer than the first existing relay
 * slot after a cutover (10..40 minutes of each four-hour UTC block + two
 * minutes observation allowance), and never beyond the old cadence limit.
 * Any current-main run, even failed/skipped, prevents this classification.
 * No clock, draw, authorization, retention or provider operation is changed. */
async function observeEarlyDrawHandover(c,history,env,readGithub,now){
 if(c.lane!=="EARLY_DRAW"||c.mostRecentRun?.headSha===env.GITHUB_SHA||
    history.some(x=>x?.head_sha===env.GITHUB_SHA))return null;
 const prior=history.find(x=>Number.isSafeInteger(x?.id)&&x.id>0&&SHA.test(x.head_sha??"")&&
  x.head_sha!==env.GITHUB_SHA&&x.head_branch==="main"&&x.event==="workflow_dispatch"&&x.run_attempt===1&&
  x.path===".github/workflows/"+c.workflow&&x.status==="completed"&&x.conclusion==="success"&&
  Number.isFinite(Date.parse(x.created_at))&&Date.parse(x.created_at)<=now&&
  now-Date.parse(x.created_at)<=c.expectedMaxGapMinutes*60000);
 if(!prior)return null;
 const commit=await readGithub(ROOT+"/git/commits/"+env.GITHUB_SHA);
 const cutover=Date.parse(commit?.committer?.date),created=Date.parse(prior.created_at);
 if(commit?.sha!==env.GITHUB_SHA||!Array.isArray(commit.parents)||commit.parents.length<1||
  commit.parents[0]?.sha!==prior.head_sha||!Number.isFinite(cutover)||created>=cutover||cutover>now)return null;
 const block=4*3600000,base=Math.floor(cutover/block)*block;
 const firstSlot=base+(cutover>=base+40*60000?block:0);
 const until=Math.min(firstSlot+42*60000,created+c.expectedMaxGapMinutes*60000);
 if(now>=until)return null;
 const j=await readGithub(ROOT+"/actions/runs/"+prior.id+"/jobs?filter=latest&per_page=50");
 if(!Array.isArray(j?.jobs)||j.jobs.length>50||!Number.isSafeInteger(j.total_count)||j.total_count!==j.jobs.length)return null;
 const [name,step]=P6_EXPECTED_ACTIVE_JOBS.EARLY_DRAW[0];
 const workers=j.jobs.filter(x=>x.name===name&&x.run_id===prior.id&&x.head_sha===prior.head_sha&&x.run_attempt===1&&
  Number.isSafeInteger(x.id)&&x.id>0&&x.status==="completed"&&x.conclusion==="success"&&
  Number.isFinite(Date.parse(x.completed_at))&&Date.parse(x.completed_at)<=cutover&&Date.parse(x.completed_at)>=created);
 if(workers.length!==1||!Array.isArray(workers[0].steps)||
  workers[0].steps.filter(s=>p6ExpectedStepName(s.name,step)&&s.status==="completed"&&s.conclusion==="success").length!==1)return null;
 return {state:"PREVIOUS_MAIN_EARLY_DRAW_EXECUTED_AWAIT_CURRENT_SLOT",runId:prior.id,jobId:workers[0].id,
  previousHeadSha:prior.head_sha,createdAtUtc:prior.created_at,cutoverUtc:new Date(cutover).toISOString(),
  recheckByUtc:new Date(until).toISOString(),currentExecutableVerified:false,flightCollectionVerified:false};
}
/** Inspect actual independent wake worker jobs, not a relay ACK or native
 * schedule alone. Bounded recent reads, no historic count equality, and a
 * local observation failure must not hide other lanes. Preserve native gaps.
 */
export async function observeP6IndependentDispatches(report,env,readGithub){
 const out={};
 if(env.P6_HEARTBEAT_COLLECTION_EXPECTED!=="true"||env.P6_ROLLING_CONTROLLER_ENABLED!=="1"||
    env.P6_ROLLING_DIRECT_RECOVERY_ENABLED==="1")return out;
 const now=Date.parse(report.observedAtGithubRunnerUtc);
 for(const [lane,requirements] of Object.entries(P6_EXPECTED_ACTIVE_JOBS)){
  const c=report.controllerStates.find(x=>x.lane===lane);
  if(!c)continue;
  try{
   const h=await readGithub(ROOT+"/actions/workflows/"+c.workflow+"/runs?branch=main&event=workflow_dispatch&per_page=5");
   if(!Array.isArray(h?.workflow_runs)||h.workflow_runs.length>5)throw Error("DISPATCH_SHAPE");
   const rows=h.workflow_runs.filter(x=>Number.isSafeInteger(x?.id)&&x.id>0&&x.head_sha===env.GITHUB_SHA&&x.head_branch==="main"&&
     x.path===".github/workflows/"+c.workflow&&x.event==="workflow_dispatch"&&x.run_attempt===1&&
     Number.isFinite(Date.parse(x.created_at))&&Date.parse(x.created_at)<=now+5000&&
     now-Date.parse(x.created_at)<=c.expectedMaxGapMinutes*60000&&
     Date.parse(x.created_at)>=Date.parse(c.mostRecentRun?.createdAtUtc??"1970-01-01T00:00:00Z")).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||b.id-a.id);
   let pending=null;
   for(const row of rows){
    // Preserve a short bounded in-progress observation separately; never claim execution.
    if(row.status!=="completed"&&["queued","in_progress","waiting","requested","pending"].includes(row.status)&&now-Date.parse(row.created_at)<=120000)pending??=row;
    // A queued/pending manual verification is not worker evidence.
    if(row.status!=="completed")continue;
    const j=await readGithub(ROOT+"/actions/runs/"+row.id+"/jobs?filter=latest&per_page=50");
    if(!Array.isArray(j?.jobs)||j.jobs.length>50)throw Error("DISPATCH_JOBS_SHAPE");
    const required=requirements.map(([name])=>j.jobs.filter(x=>x.name===name&&x.run_id===row.id&&x.head_sha===env.GITHUB_SHA&&x.run_attempt===1&&Number.isSafeInteger(x.id)&&x.id>0));
    // Ignore verification-only or unrelated manual dispatches. Mixed job
    // results are retained, never treat parent red as failure of every job.
    if(required.some(x=>x.length!==1)||required.every(x=>x[0].conclusion==="skipped"))continue;
    out[lane]={state:"INDEPENDENT_WORKER_JOBS_OBSERVED_NOT_COLLECTION_PROOF",runId:row.id,createdAtUtc:row.created_at,
      parentConclusion:row.conclusion,jobs:required.map(x=>x[0])};
    break;
   }
   if(!out[lane]&&pending)out[lane]={state:"INDEPENDENT_WORKER_RECENT_PENDING_NOT_EXECUTION_PROOF",runId:pending.id,createdAtUtc:pending.created_at};
   if(!out[lane]&&lane==="EARLY_DRAW"){
    const prior=await observeEarlyDrawHandover(c,h.workflow_runs,env,readGithub,now);
    if(prior)out[lane]=prior;
   }
  }catch{out[lane]={state:"INDEPENDENT_WORKER_READ_UNAVAILABLE",runId:null};}
 }
 return out;
}
/** Alert only on current evidence, not old schedule gaps or deliberate STOP.
 * A successful job is not proof of a due draw or any flight collection. */
// Accept only exact numeric redactions actually observed in GitHub job metadata.
const P6_REDACTED_STEP_ALIASES=Object.freeze({
 "One signed bounded lease tick — original Stage14 and no paid provider":"One signed bounded lease tick — original Stage***4 and no paid provider",
 "Bounded existing V0087 reaper, UNKNOWN quarantines never replay":"Bounded existing V***87 reaper, UNKNOWN quarantines never replay",
 "Current signed T24 packets through original Stage14 and independent V0081":"Current signed T24 packets through original Stage***4 and independent V***8***"
});
const p6ExpectedStepName=(actual,expected)=>actual===expected||
 (Object.hasOwn(P6_REDACTED_STEP_ALIASES,expected)&&actual===P6_REDACTED_STEP_ALIASES[expected]);
// Job-level GitHub admission uses these repository variables before the
// protected environment is assigned. Only explicit false plus actual
// skipped metadata is an intentional pause; failed/missing jobs still alert.
const P6_PAUSABLE_SOURCE_JOBS=Object.freeze({
 "separately-authorized-stored-source-children":"P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED",
 "separately-authorized-current-private-post-children":"P6_PRIVATE_POST_PARENT_ENABLED"
});
export async function reviewP6ActiveStandaloneNotifications(report,env,readGithub){
 const expected=env.P6_HEARTBEAT_COLLECTION_EXPECTED;
 if(![undefined,"","false","true"].includes(expected))fail("INVALID_NOTIFICATION_EXPECTATION");
 const incidents=[],intentionalPauses=[],handoverPending=[];
 const paused=(lane,job,runId)=>{
  const key=P6_PAUSABLE_SOURCE_JOBS[job?.name];
  if(lane!=="SOURCE"||!key||env[key]!=="false"||job.status!=="completed"||job.conclusion!=="skipped")return false;
  intentionalPauses.push({lane,job:job.name,runId,reason:"EXPLICIT_PAID_ROUTE_PAUSE_NOT_COLLECTION"});
  return true;
 };
 if(expected==="true"){
  for(const [lane,requirements] of Object.entries(P6_EXPECTED_ACTIVE_JOBS)){
   const c=report.controllerStates.find(x=>x.lane===lane);
   if(!c)fail("MISSING_NOTIFICATION_LANE");
   const independent=report.independentDispatchObservations?.[lane];
   if(lane==="EARLY_DRAW"&&independent?.state==="PREVIOUS_MAIN_EARLY_DRAW_EXECUTED_AWAIT_CURRENT_SLOT"&&
      independent.currentExecutableVerified===false&&independent.flightCollectionVerified===false&&
      Number.isFinite(Date.parse(independent.recheckByUtc))&&Date.parse(report.observedAtGithubRunnerUtc)<Date.parse(independent.recheckByUtc)){
    handoverPending.push({lane,reason:"PREVIOUS_MAIN_EXECUTED_CURRENT_MAIN_AWAITING_BOUNDED_SLOT",
     priorRunId:independent.runId,recheckByUtc:independent.recheckByUtc,currentExecutableVerified:false});
    continue;
   }
   if(independent?.state==="INDEPENDENT_WORKER_JOBS_OBSERVED_NOT_COLLECTION_PROOF"){
    for(const [name,step] of requirements){
     const job=independent.jobs.find(x=>x.name===name);
     if(paused(lane,job,independent.runId))continue;
     const add=reason=>incidents.push({lane,reason,runId:independent.runId,job:name});
     if(!job||job.status!=="completed"||job.conclusion!=="success"||
       step!==null&&(!Array.isArray(job.steps)||job.steps.filter(s=>p6ExpectedStepName(s.name,step)&&s.status==="completed"&&s.conclusion==="success").length!==1)){
      add("INDEPENDENT_WORKER_FAILED_SKIPPED_OR_UNVERIFIED");continue;
     }
     if(lane==="SOURCE"&&job.steps?.some(s=>["Parent outcome SAFE_PREFLIGHT_HOLD","Parent outcome MISSING_EVIDENCE"].includes(s.name)&&s.status==="completed"&&s.conclusion==="success"))
      add("PARENT_REPORTED_HOLD_OR_MISSING_EVIDENCE");
    }
    continue;
   }
   if(independent?.state==="INDEPENDENT_WORKER_RECENT_PENDING_NOT_EXECUTION_PROOF"){
    // A fresh run may be a verification-only dispatch; retain an actionable
    // pending notice rather than silently clearing the lane or alleging a stale clock.
    incidents.push({lane,reason:"INDEPENDENT_WORKER_PENDING_RECHECK_REQUIRED",runId:independent.runId,job:null});continue;
   }
   const run=c.mostRecentRun;
   const add=(reason,job=null)=>incidents.push({lane,reason,runId:run?.id??null,job});
   if(!run||c.historicalCadence.latestAgeExceedsExpected){add("SCHEDULE_MISSING_OR_STALE");continue;}
   if(run.headSha!==env.GITHUB_SHA){add("CURRENT_MAIN_EXECUTION_NOT_OBSERVED");continue;}
   if(run.status!=="completed")continue;
   if(run.conclusion!=="success"){add("EXPECTED_SCHEDULE_NOT_SUCCESSFUL");continue;}
   let body;
   try{body=await readGithub(ROOT+"/actions/runs/"+run.id+"/jobs?filter=latest&per_page=50");}
   catch{add("JOB_EVIDENCE_UNAVAILABLE");continue;}
   if(!body||!Number.isSafeInteger(body.total_count)||body.total_count<1||body.total_count>50||
      !Array.isArray(body.jobs)||body.jobs.length!==body.total_count||
      body.jobs.some(j=>j.run_id!==run.id||!Number.isSafeInteger(j.id)||j.id<1)){
    add("JOB_EVIDENCE_INCOMPLETE");continue;
   }
   for(const [name,step] of requirements){
    const jobs=body.jobs.filter(j=>j.name===name);
    if(jobs.length===1&&paused(lane,jobs[0],run.id))continue;
    if(jobs.length!==1||jobs[0].status!=="completed"||jobs[0].conclusion!=="success"||
       step!==null&&(!Array.isArray(jobs[0].steps)||jobs[0].steps.filter(s=>p6ExpectedStepName(s.name,step)&&s.status==="completed"&&s.conclusion==="success").length!==1)){
     add("EXPECTED_WORKER_SKIPPED_FAILED_OR_UNVERIFIED",name);continue;
    }
    if(lane==="SOURCE"&&Array.isArray(jobs[0].steps)&&jobs[0].steps.some(s=>
      ["Parent outcome SAFE_PREFLIGHT_HOLD","Parent outcome MISSING_EVIDENCE"].includes(s.name)&&s.status==="completed"&&s.conclusion==="success"))
      add("PARENT_REPORTED_HOLD_OR_MISSING_EVIDENCE",name);
   }
  }
 }
 return {collectionExpected:expected==="true",incidents,incidentCount:incidents.length,intentionalPauses,handoverPending,
  realDueDrawOrPreparationVerified:false,flightCollectionVerified:false,
  databaseReads:0,databaseWrites:0,providerCalls:0,dispatches:0};
}

export function admitP6HeartbeatGithubEnv(env){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!==REPO||
    env.GITHUB_REF!=="refs/heads/main"||
    !["schedule","workflow_dispatch"].includes(env.GITHUB_EVENT_NAME)||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !SHA.test(env.GITHUB_SHA??"")||
    env.P6_CONTROLLER_HEARTBEAT_EXECUTE!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||
    env.DATABASE_URL||env.V39_P5_SOURCE_DATABASE_URL||
    env.P5_V39_PRE_DATABASE_URL||
    env.P5_V39_T24_WITNESS_DATABASE_URL||
    !env.GITHUB_TOKEN||env.GITHUB_TOKEN.length<16||
    (env.GITHUB_EVENT_NAME==="workflow_dispatch"&&
     env.P6_CONTROLLER_HEARTBEAT_CONFIRM!==
      "READONLY_GITHUB_CONTROLLER_HEALTH_NO_PROVIDER_NO_GO"))
  fail("NOT_MAIN_READONLY_GITHUB_ACTION_OR_HAS_PRODUCTION_CREDENTIALS");
 return {token:env.GITHUB_TOKEN,sha:env.GITHUB_SHA};
}
export async function readP6GithubAutoControllerHeartbeat(
 env,{fetcher=fetch,now=()=>new Date()}={}
){
 const {token}=admitP6HeartbeatGithubEnv(env);
 const time=now();
 if(!(time instanceof Date)||!Number.isFinite(time.getTime()))
  fail("INVALID_OBSERVER_CLOCK");
 const observedAtUtc=time.toISOString();
 const out=[];
 const readGithub=async u=>{
  try{
   const response=await fetcher(u,{
    method:"GET",
    headers:{
     Accept:"application/vnd.github+json",
     Authorization:"Bearer "+token,
     "X-GitHub-Api-Version":"2022-11-28"
    },
    redirect:"error"
   });
   if(!response.ok)fail("GITHUB_CONTROLLER_RUN_HISTORY_UNAVAILABLE");
   return await response.json();
  }catch{fail("GITHUB_CONTROLLER_RUN_HISTORY_UNAVAILABLE");}
 };
 for(const lane of P6_EXISTING_CONTROLLER_LANES){
  const u=ROOT+"/actions/workflows/"+lane.workflow+
   "/runs?branch=main&event=schedule&per_page="+MAX_PER_WORKFLOW;
  const parsed=await readGithub(u);
  if(!parsed||!Number.isSafeInteger(parsed.total_count)||
     parsed.total_count<0||!Array.isArray(parsed.workflow_runs)||
     parsed.workflow_runs.length>MAX_PER_WORKFLOW||
     (parsed.total_count===0)!==(parsed.workflow_runs.length===0))
   fail("INVALID_OR_UNBOUNDED_GITHUB_HISTORY_RESPONSE");
  out.push(reviewP6OneScheduledController(
   lane,parsed.workflow_runs,observedAtUtc));
 }
 const summary=summarizeP6ControllerHeartbeat(out,observedAtUtc);
 const primaryFidsExpiry=await observeP6PrimaryFidsExpiry(env,readGithub,observedAtUtc);
 // A disabled schedule is explicitly reported and is not an execution
 // failure. When enabled, require evidence of execution for the latest
 // current-main run. Still never claim deletion or deadline proof.
 const primaryProblem=primaryFidsExpiry.state!=="SCHEDULED_APPLY_DISABLED"&&
  (primaryFidsExpiry.state!=="SCHEDULE_EXECUTED_EXPIRY_STEP_NOT_DELETION_PROOF"||
   primaryFidsExpiry.scheduleObservation.historicalCadence.intervalsExceedingExpectedMax>0);
 const directRecovery=await observeP6DirectRecovery(env,readGithub,observedAtUtc);
 const independentDispatchObservations=await observeP6IndependentDispatches(summary,env,readGithub);
 const activeNotifications=await reviewP6ActiveStandaloneNotifications({...summary,independentDispatchObservations},env,readGithub);
 // Never suppress native incidents solely because a controller received a
 // wake. Conversely, surface a stale/skipped/held enabled backup even when
 // the native diagnostic happened to be recent.
 if(env.P6_ROLLING_DIRECT_RECOVERY_ENABLED==="1"&&!directRecovery.recentOperationalTick&&directRecovery.state!=="DIRECT_RECOVERY_PENDING"){
  activeNotifications.incidents.push({lane:"DIRECT_RECOVERY",reason:directRecovery.state,runId:directRecovery.runId,job:"direct-protected-recovery-tick"});
  activeNotifications.incidentCount++;
 }
 // Enabled expiry merits current alerts independently of paid activation.
 // A normal pending run or an old gap by itself must not spam failures.
 const currentExpiryIncident=primaryFidsExpiry.scheduledApplyEnabled&&
  !["SCHEDULE_EXECUTED_EXPIRY_STEP_NOT_DELETION_PROOF","SCHEDULE_EXECUTION_PENDING"].includes(primaryFidsExpiry.state);
 if(currentExpiryIncident){activeNotifications.incidents.push({lane:"PRIMARY_FIDS_EXPIRY",reason:primaryFidsExpiry.state,runId:primaryFidsExpiry.scheduleObservation.mostRecentRun?.id??null,job:"primary-fids-expiry",backupState:primaryFidsExpiry.backup.state,backupRunId:primaryFidsExpiry.backup.runId});activeNotifications.incidentCount++;}
 return {...summary,activeNotifications,directRecovery,independentDispatchObservations,
  status:primaryProblem||activeNotifications.incidentCount>0?"AUTONOMOUS_GITHUB_CONTROLLERS_NEED_ATTENTION_NO_GO":summary.status,
  primaryFidsExpiry,primaryFidsExpiryNeedsAttention:primaryProblem};
}
