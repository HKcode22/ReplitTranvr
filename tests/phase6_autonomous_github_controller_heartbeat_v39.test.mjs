import test from "node:test";
import assert from "node:assert/strict";
import {
 P6_AUTO_CONTROL_HEARTBEAT_V39,
 P6_EXISTING_CONTROLLER_LANES,
 P6_MANUAL_OR_MISSING_RELEASE_LANES,
 reviewP6OneScheduledController,
 summarizeP6ControllerHeartbeat,
 admitP6HeartbeatGithubEnv,
 readP6GithubAutoControllerHeartbeat
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
test("five exact existing GH cron lanes, not a duplicate new SOURCE/PRE/POST",()=>{
 assert.equal(P6_EXISTING_CONTROLLER_LANES.length,5);
 assert.deepEqual(P6_EXISTING_CONTROLLER_LANES.map(x=>x.lane),[
  "EARLY_DRAW","SOURCE","PRE","PRE_RECOVERY","DAY_SHARD_SELECTOR"
 ]);
 assert.equal(new Set(P6_EXISTING_CONTROLLER_LANES.map(x=>x.workflow)).size,5);
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
test("five bounded GitHub read-only list calls and human summary redacted",async()=>{
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
 assert.equal(x.controllerStates.length,5);
 assert.equal(calls.length,5);
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
