import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {loadP6RollingCalendarHints,assessP6RollingCalendarHints,planP6RollingRootScope} from "../server/lib/disruption/phase6RollingCalendarHints_v39.mjs";
const sha="a".repeat(64),code="b".repeat(40),H=3600000,M=60000,start=Date.parse("2030-01-05T00:00:00.000Z"),iso=x=>new Date(x).toISOString();
const digest=b=>createHash("sha256").update(b).digest("hex");
const offsets={"T-24h":24*H,"T-6h":6*H,"T-90m":90*M};
function fixture(compact=false){
 const files=new Map();
 const pins=Array.from({length:31},(_,i)=>{
  const day=i+1,service=start+i*(compact?1:4)*24*H,templates=[];
  for(const [horizon,off] of Object.entries(offsets))for(let slot=0;slot<4;slot++){
   templates.push({queryKey:"d"+day+"."+horizon+"."+slot,runDayIndex:day,horizon,
    serviceWindowStartUtc:iso(service),serviceWindowEndUtc:iso(service+4*H),
    earliestPlannedCutoffUtc:iso(service-off),scheduledRequestUtc:iso(service-off-15*M)});
  }
  const bytes=Buffer.from(JSON.stringify({schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex:day,
   expectedServiceStartUtc:iso(service),templates}));
  files.set("data-collection/phase5/planning/phase6-source-day-"+String(day).padStart(2,"0")+".json",bytes);
  return {runDayIndex:day,sha256:digest(bytes)};
 });
 const trust={reviewedCodeSha:code,manifestSha256:sha,calendarSha256:sha,releaseSha256:sha,rightsSha256:sha};
 const policyBytes=Buffer.from(JSON.stringify({schema:"v39.phase6.delegated-daily-source-review-policy.v1",
  delegatedDailyPacketProductionApproved:true,approvedCodeSha:code,manifestSha256:sha,calendarSha256:sha,
  releaseSha256:sha,rightsSha256:sha,dayPlanSha256s:pins,validFromUtc:"2030-01-01T00:00:00.000Z",validUntilUtc:compact?"2030-02-10T00:00:00.000Z":"2031-01-01T00:00:00.000Z"}));
 return {files,trust,policyBytes,expectedPolicySha256:digest(policyBytes),read:p=>files.get(p)};
}
const inspect=(f,t)=>Object.fromEntries(assessP6RollingCalendarHints(f,t).hints.map(x=>[x.lane,x]));
test("reviewed policy and every existing plan digest required, no mutable or arbitrary hints",()=>{
 const f=fixture(),r=loadP6RollingCalendarHints(f);
 assert.equal(r.phase6PaidGo,false);
 assert.throws(()=>loadP6RollingCalendarHints({...f,expectedPolicySha256:"c".repeat(64)}),/MISSING_EXACT/);
 assert.throws(()=>loadP6RollingCalendarHints({...f,trust:{...f.trust,rightsSha256:"c".repeat(64)}}),/POLICY_DRIFT/);
 assert.throws(()=>loadP6RollingCalendarHints({...f,read:()=>Buffer.from("changed")}),/DAY_PLAN_HASH_DRIFT/);
 assert.throws(()=>assessP6RollingCalendarHints({...r},start),/UNREVIEWED_CALENDAR/);
 assert.throws(()=>r.windows.T24[0].push(start));
});
test("source wake is conservative before dispatch, independent T24 and later windows",()=>{
 const r=loadP6RollingCalendarHints(fixture());
 const early=inspect(r,start-24*H-55*M);
 assert.equal(early.SOURCE_POST.mayNeedWork,true);
 assert.equal(early.T24.mayNeedWork,false);
 assert.equal(early.LATER_PRE.mayNeedWork,false);
 const nominal=inspect(r,start-24*H-15*M);
 assert.equal(nominal.T24.mayNeedWork,true);
 assert.equal(nominal.PRE_ENROLLMENT.mayNeedWork,true);
 assert.equal(nominal.LATER_PRE.mayNeedWork,false);
 assert.equal(nominal.EARLY_DRAW.mayNeedWork,false);
 const later=inspect(r,start-6*H);
 assert.equal(later.LATER_PRE.mayNeedWork,true);
 assert.equal(later.T24.mayNeedWork,false);
 assert.equal(later.PRE_ENROLLMENT.mayNeedWork,true);
});
test("full 48h POST tail and preparation lead, independent cleanup and recovery never suppressed",()=>{
 const r=loadP6RollingCalendarHints(fixture());
 const prepare=inspect(r,start-72*H);
 assert.equal(prepare.DAILY_PREPARE.mayNeedWork,true);
 assert.equal(prepare.EARLY_DRAW.mayNeedWork,true);
 const outcome=inspect(r,start+51*H);
 assert.equal(outcome.SOURCE_POST.mayNeedWork,true);
 assert.equal(outcome.T24.mayNeedWork,false);
 assert.equal(outcome.LATER_PRE.mayNeedWork,false);
 assert.equal(outcome.PRE_RECOVERY.mayNeedWork,true);
 assert.equal(outcome.RETENTION_MONITOR.mayNeedWork,true);
 const before=inspect(r,start-90*H);
 assert.equal(before.SOURCE_POST.mayNeedWork,false);
 assert.equal(before.EARLY_DRAW.nextPossibleWakeUtc,iso(start-72*H-10*M));
 const outside=assessP6RollingCalendarHints(r,Date.parse("2029-12-31T00:00:00.000Z"));
 assert.equal(outside.status,"OUTSIDE_POLICY_NO_IDLE_INFERENCE");
 assert(outside.hints.every(x=>x.mayNeedWork));
});

test("prospective root planner advances across fixed policy windows without reusing old epoch",()=>{
 const r=loadP6RollingCalendarHints(fixture(true)),a=r.from;
 const x=planP6RollingRootScope(r,a+8*M+250);
 assert.equal(x.mode,"FOUR");assert.equal(x.windowIndex,0);assert.equal(x.windowEpochUtc,iso(a+8*M));
 assert.equal(x.windowDeadlineUtc,iso(a+2*H));assert.equal(x.permitDispatch,false);
 const y=planP6RollingRootScope(r,a+50*M);
 assert.equal(y.mode,"SINGLE");assert.equal(y.windowDeadlineUtc,iso(a+80*M));
 assert.equal(planP6RollingRootScope(r,a+101*M).reason,"INSUFFICIENT_REMAINING_WINDOW");
 const z=planP6RollingRootScope(r,a+2*H+M);
 assert.equal(z.windowIndex,1);assert.equal(z.windowStartUtc,iso(a+2*H));assert.equal(z.windowDeadlineUtc,iso(a+4*H));
 assert.equal(planP6RollingRootScope(r,r.until).reason,"OUTSIDE_POLICY");
 assert.throws(()=>planP6RollingRootScope({...r},a),/UNREVIEWED_ROOT_SCOPE/);
 assert.throws(()=>planP6RollingRootScope(loadP6RollingCalendarHints(fixture()),a),/UNREVIEWED_ROOT_SCOPE/);
});
