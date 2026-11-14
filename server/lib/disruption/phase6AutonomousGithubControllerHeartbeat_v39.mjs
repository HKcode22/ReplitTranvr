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
const MAX_AGE_MINUTES=90; // Default 5/10 minute cron + GitHub jitter
const MAX_PER_WORKFLOW=15;
const fail=s=>{throw Error("HOLD_P6_AUTO_HEARTBEAT_"+s);};
export const P6_EXISTING_CONTROLLER_LANES=Object.freeze([
 {
  lane:"EARLY_DRAW",
  workflow:"phase5-six-slot-approved-early-four-airport-draw.yml",
  maxExpectedGapMinutes:330, // Six UTC slots, 4h cadence + 90m jitter
  purpose:"Six-hour UTC early selection of genuine future four-airport cohorts"
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
  purpose:"Five-minute existing V0092 signed-roster T24/T6/T90 PRE lease"
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
  purpose:"Append-only rolling 31-day SOURCE/later-PRE/POST signed index observer"
 }
]);
export const P6_MANUAL_OR_MISSING_RELEASE_LANES=Object.freeze([
 {
  lane:"POST_CHILD",state:"EXISTING_MANUAL_CHILD_REQUIRES_AUTHENTIC_DAILY_SIGNED_INPUT",
  workflow:"phase5-one-signed-future-post-v0083-main-manual.yml"
 },
 {
  lane:"PRIVATE_SOURCE_PUBLISHER",
  state:"NO_LIVE_SOURCE_REGISTRY_PUBLISHER_AT_LAST_OWNER_READBACK",
  workflow:null
 },
 {
  lane:"FULL_31_DAY_ROLLOVER",
  state:"SINGLE_DAY_PACKET_VARIABLES_NOT_PROVEN_TO_ADVANCE_AUTONOMOUSLY",
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
   headShaPrefix:run.head_sha.slice(0,10),createdAtUtc:run.created_at,
   ageMinutes:Math.max(0,Math.round((clock-created)/60000))});
 }
 rows.sort((a,b)=>b.createdAtUtc.localeCompare(a.createdAtUtc));
 const last=rows[0]??null;
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
 else if(last.ageMinutes>lane.maxExpectedGapMinutes)
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
 return{
  schema:P6_AUTO_CONTROL_HEARTBEAT_V39,
  status:problem.length?
   "AUTONOMOUS_GITHUB_CONTROLLERS_NEED_ATTENTION_NO_GO":
   "AUTONOMOUS_GITHUB_SCHEDULE_PRESENT_NOT_COLLECTION_PROOF_NO_GO",
  observedAtGithubRunnerUtc:observedAtUtc,
  existingScheduledControllerCount:assessments.length,
  controllerStates:assessments,
  controllerProblemCount:problem.length,
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
 for(const lane of P6_EXISTING_CONTROLLER_LANES){
  const u=ROOT+"/actions/workflows/"+lane.workflow+
   "/runs?branch=main&event=schedule&per_page="+MAX_PER_WORKFLOW;
  let parsed;
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
   parsed=await response.json();
  }catch{fail("GITHUB_CONTROLLER_RUN_HISTORY_UNAVAILABLE");}
  if(!parsed||!Number.isSafeInteger(parsed.total_count)||
     parsed.total_count<0||!Array.isArray(parsed.workflow_runs)||
     parsed.workflow_runs.length>MAX_PER_WORKFLOW||
     (parsed.total_count===0)!==(parsed.workflow_runs.length===0))
   fail("INVALID_OR_UNBOUNDED_GITHUB_HISTORY_RESPONSE");
  out.push(reviewP6OneScheduledController(
   lane,parsed.workflow_runs,observedAtUtc));
 }
 return summarizeP6ControllerHeartbeat(out,observedAtUtc);
}
