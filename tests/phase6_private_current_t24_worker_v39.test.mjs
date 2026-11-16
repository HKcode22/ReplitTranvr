import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {loadP6CurrentT24CalendarWindows,loadP6LaterCalendarWindows,isP6CurrentPreTrigger,P6_CURRENT_T24_DISPATCH_CONFIRM} from "../server/lib/disruption/phase6LaterCalendarDueDays_v39.mjs";
import {runP6BoundedT24Packets,localP6T24SingletonEnv,admitP6CurrentT24Worker} from "../scripts/v39_phase6_private_current_t24_worker_v39.mjs";
import {requireP5CdGithubCurrentPrivateT24Scope,requireP5CdGithubPreRelease} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39.ts";
const code="a".repeat(40),h="b".repeat(64);
const env=()=>({GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",
 GITHUB_EVENT_NAME:"schedule",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,P5_CD_GH_PRE_APPROVED_CODE_SHA:code,
 P5_CD_GH_CODE_LINEAGE_VERIFIED:code+":"+code,P5_CD_GH_PRE_CONFIRM:"ONE_SIGNED_SOURCE_BOUND_CD_PRE_NO_PROVIDER",
 P5_CD_GH_T24_ONE_FLIGHT_CONFIRM:"ONE_REVIEWED_SOURCE_QUEUED_T24_PRE_AND_INDEPENDENT_WITNESS_NO_PROVIDER",
 P5_CD_GH_T24_SCHEDULE_ENABLED:"1",P6_PRIVATE_T24_EXECUTION_ENABLED:"1",P5_CD_GH_PRE_ARMED:"1",
 P5_CD_GH_PRE_STOP:"0",P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",P5_CD_GH_T24_WITNESS_APPROVED:"1",
 V39_PHASE5_FREEZE_SIGNED:"1",V39_PHASE6_PROCESS_ARMED:"1",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
 ADB_AUTO_COLLECT:"0",V39_P5_MANIFEST_SHA256:h,V39_P5_RIGHTS_SHA256:h,
 P5_V39_PRE_DATABASE_URL:"postgresql://phase5_p30_pre_login_20261107:ci@ep-test.neon.tech/neondb?sslmode=require",
 P5_V39_T24_WITNESS_DATABASE_URL:"postgresql://phase5_p30_witness_login_20261107:ci@ep-test.neon.tech/neondb?sslmode=require"});
const packets=n=>Array.from({length:n},(_,i)=>({entry:{packetSha256:(i+1).toString(16).padStart(64,"0"),permit:{horizon:"T-24h"}},cutoff:Date.parse("2030-01-01T00:00:00.000Z")+i}));
test("current T24 stable scope cannot authorize a legacy hash, competing mode or provider credential",()=>{
 const a=env();assert.equal(requireP5CdGithubCurrentPrivateT24Scope(a).rosterSha256,undefined);
 assert.throws(()=>requireP5CdGithubPreRelease(a,{allowReviewedT24Witness:true}));
 for(const b of [{P6_PRIVATE_T24_EXECUTION_ENABLED:"0"},{P5_CD_GH_PRE_ROSTER_SHA256:h},{P5_CD_GH_ROSTER_PATH:"unsafe"},
  {P5_T24_AUTO_DISPATCH_ENABLED:"true"},{P5_CD_GH_QUEUED_T24_EXECUTE:"1"},{RAPIDAPI_KEY:"forbidden"},
  {GITHUB_EVENT_NAME:"workflow_dispatch"},{P5_CD_GH_PRE_STOP:"1"}])
  assert.throws(()=>requireP5CdGithubCurrentPrivateT24Scope({...a,...b}));
 assert.throws(()=>admitP6CurrentT24Worker(a),/PROTECTED_CUSTODY_AND_ENROLLMENT/);
 assert.throws(()=>localP6T24SingletonEnv(a,{}),/NO_EXACT/);
});
test("one attempt per packet within four bounded parallel lanes, aggregate only",async()=>{
 const p=packets(24),seen=new Set();let active=0,peak=0;
 const r=await runP6BoundedT24Packets(p,4,async x=>{
  active++;peak=Math.max(peak,active);assert(!seen.has(x.entry.packetSha256));seen.add(x.entry.packetSha256);
  await Promise.resolve();active--;return "VERIFIED_WITH_CUSTODY";
 });
 assert.equal(peak,4);assert.equal(seen.size,24);assert.equal(r.verified,24);assert.equal(r.custodied,24);assert.equal(r.held,0);
 assert(!JSON.stringify(r).includes(p[0].entry.packetSha256));
});
test("unknown custody after confirmed PRE preserves partial confirmed evidence and stops remaining work",async()=>{
 const r=await runP6BoundedT24Packets(packets(5),1,async()=> "VERIFIED_CUSTODY_UNKNOWN");
 assert.equal(r.status,"HOLD_CURRENT_PRIVATE_T24_UNKNOWN_NO_REPLAY");assert.equal(r.attemptedCount,1);
 assert.equal(r.verified,1);assert.equal(r.custodied,0);assert.equal(r.held,1);assert.equal(r.deferredCount,4);
});
test("unknown PRE stops next attempts and bounds or duplicate packets are refused",async()=>{
 const p=packets(3),r=await runP6BoundedT24Packets(p,1,async()=>{throw Error("synthetic uncertainty");});
 assert.equal(r.attemptedCount,1);assert.equal(r.held,1);assert.equal(r.verified,0);
 await assert.rejects(runP6BoundedT24Packets(p,5,async()=> "NO_DUE"),/UNBOUNDED/);
 await assert.rejects(runP6BoundedT24Packets([p[0],p[0]],1,async()=> "NO_DUE"),/NONUNIQUE/);
 let calls=0;
 const bound=await runP6BoundedT24Packets(p,1,async()=> "NO_DUE",()=>calls++===0?0:720001);
 assert.equal(bound.attemptedCount,0);assert.equal(bound.deferredCount,3);
});

test("explicit current T24 execution has same scoped release; no legacy roster or later PRE bypass",()=>{
 const e={...env(),GITHUB_EVENT_NAME:"workflow_dispatch",P6_PRIVATE_CURRENT_T24_DISPATCH_CONFIRM:P6_CURRENT_T24_DISPATCH_CONFIRM};
 assert.equal(requireP5CdGithubCurrentPrivateT24Scope(e).rosterSha256,undefined);
 assert.throws(()=>requireP5CdGithubPreRelease(e,{allowReviewedT24Witness:true}));
 assert.throws(()=>admitP6CurrentT24Worker(e),/PROTECTED_CUSTODY_AND_ENROLLMENT/);
 assert.equal(isP6CurrentPreTrigger(e),false);
 for(const d of [{P6_PRIVATE_CURRENT_T24_DISPATCH_CONFIRM:"wrong"},{P6_PRIVATE_CURRENT_T24_DISPATCH_CONFIRM:""},
  {GITHUB_EVENT_NAME:"schedule"},{P6_PRIVATE_T24_EXECUTION_ENABLED:"0"},{P5_T24_AUTO_DISPATCH_ENABLED:"true"},
  {P5_CD_GH_PRE_STOP:"1"},{V39_PHASE5_FREEZE_SIGNED:"0"},{P5_CD_GH_ROSTER_PATH:"legacy"},
  {P6_PRIVATE_CURRENT_PRE_DISPATCH_CONFIRM:"RUN_CURRENT_SIGNED_PRE_TICK_NO_PROVIDER"}])
  assert.throws(()=>requireP5CdGithubCurrentPrivateT24Scope({...e,...d}));
});
test("current T24 exact calendar parity; explicit dispatch cannot authorize enrollment",()=>{
 const trust={reviewedCodeSha:code,manifestSha256:h,calendarSha256:h,releaseSha256:h,rightsSha256:h};
 const plans=new Map(),hash=b=>createHash("sha256").update(b).digest("hex");
 const dayPlanSha256s=Array.from({length:31},(_,i)=>{
  const runDayIndex=i+1,bytes=Buffer.from(JSON.stringify({schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex,
   templates:Array.from({length:12},()=>({runDayIndex,horizon:"T-24h",
    scheduledRequestUtc:"2030-01-01T00:00:00.000Z",earliestPlannedCutoffUtc:"2030-01-01T00:15:00.000Z",
    serviceWindowEndUtc:"2030-01-02T04:00:00.000Z"}))}));
  plans.set("data-collection/phase5/planning/phase6-source-day-"+String(runDayIndex).padStart(2,"0")+".json",bytes);
  return {runDayIndex,sha256:hash(bytes)};
 });
 const policy=Buffer.from(JSON.stringify({schema:"v39.phase6.delegated-daily-source-review-policy.v1",
  delegatedDailyPacketProductionApproved:true,approvedCodeSha:code,manifestSha256:h,calendarSha256:h,releaseSha256:h,rightsSha256:h,
  dayPlanSha256s,validFromUtc:"2030-01-01T00:00:00.000Z",validUntilUtc:"2030-03-01T00:00:00.000Z"}));
 const scheduled={...env(),P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:"1",P6_NONPAID_DAILY_POLICY_BASE64:policy.toString("base64"),
  P6_NONPAID_DAILY_POLICY_SHA256:hash(policy)};
 const manual={...scheduled,GITHUB_EVENT_NAME:"workflow_dispatch",P6_PRIVATE_CURRENT_T24_DISPATCH_CONFIRM:P6_CURRENT_T24_DISPATCH_CONFIRM};
 const read=path=>plans.get(path);
 assert.deepEqual(loadP6CurrentT24CalendarWindows(manual,trust,read),loadP6CurrentT24CalendarWindows(scheduled,trust,read));
 assert.throws(()=>loadP6LaterCalendarWindows(manual,trust,read,"T24"),/EXPLICIT_SCHEDULE_SCOPE_REQUIRED/);
 assert.throws(()=>loadP6CurrentT24CalendarWindows({...manual,P6_PRIVATE_T24_RUN_DAYS:"1"},trust,read),/EXPLICIT_SCHEDULE_SCOPE_REQUIRED/);
});
