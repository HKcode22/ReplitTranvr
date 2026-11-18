import test from "node:test";
import assert from "node:assert/strict";
import {buildPlan,stressPhysicalOutage,assessSourceLedger,pairCoverage,loadFrozenCycle,split} from "./source_outage_accounting_v39.mjs";
const T=Date.parse("2026-11-20T00:00:00.000Z"),i=x=>new Date(x).toISOString(),H="a".repeat(64);
function day(d=1){
 const templates=["T-24h","T-6h","T-90m"].flatMap((h,k)=>["HUB","MID_A","MID_B","REGIONAL"].map((slot,j)=>{
  const start=T+(d-1)*86400000+k*3600000+j*900000;
  return {queryKey:"p6.d"+d+"."+slot+"."+h+".s1.p1.r1",runDayIndex:d,slot,horizon:h,providerQueryDirection:"Departure",
   physicalChargeDayUtc:i(start).slice(0,10),serviceWindowStartUtc:i(start+86400000),serviceWindowEndUtc:i(start+90000000),
   earliestPlannedCutoffUtc:i(start+900000),scheduledRequestUtc:i(start),maxResponseAndPersistSeconds:180,apiUnitsPerAttempt:2,maxAttempts:1};
 }));
 return {schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex:d,templates};
}
const p=buildPlan([day()],{exactCycle:false}),q=p.queries.find(x=>x.planned===T);
const blank=(now=T+120000,complete=true)=>({schema:"v39.review.source-operational-metadata.v1",planSha256:p.planSha256,observedAtUtc:i(now),
 completeDays:complete?[{day:1,evidenceSha256:H,observedAtUtc:i(now)}]:[],receipts:[]});
const good={key:q.key,state:"COMMITTED",attempt:1,evidenceSha256:H,requestStartedUtc:i(T+15000),originalAvailableUtc:i(T+45000),committedOriginalReceiptSha256:H};
const states=a=>a.by.overall.ALL.states;
test("fixed split never reallocates failed days",()=>assert.deepEqual([1,20,21,25,26,31].map(split),["train","train","validation","validation","test","test"]));
test("no outage leaves planned denominator untouched",()=>{const a=stressPhysicalOutage(p,[]);assert.equal(a.plannedRequests,12);assert.equal(a.blocked,0);assert.equal(a.potentialCoverageLower,1);assert.equal(a.permitNewRequest,false)});
test("physical outage covering exact dispatch interval means one blocked opportunity",()=>{const a=stressPhysicalOutage(p,[{startUtc:i(T),endUtc:i(T+60000)}]);assert.equal(a.blocked,1);assert.equal(a.by.horizon["T-24h"].states.FULL_DISPATCH_WINDOW_BLOCKED,1)});
test("partial interval is at risk, not definite miss",()=>{const a=stressPhysicalOutage(p,[{startUtc:i(T+5000),endUtc:i(T+50000)}]);assert.equal(a.blocked,0);assert.equal(a.partiallyAtRisk,1)});
test("adjacent outage intervals coalesce without double count",()=>{const a=stressPhysicalOutage(p,[{startUtc:i(T),endUtc:i(T+30000)},{startUtc:i(T+30000),endUtc:i(T+60000)}]);assert.equal(a.blocked,1)});
test("complete day lost remains in denominator",()=>{const a=stressPhysicalOutage(p,[{startUtc:i(T),endUtc:i(T+5*3600000)}]);assert.equal(a.blocked,12);assert.deepEqual(a.completelyBlockedParentDays,[1]);assert.equal(a.potentialCoverageLower,0)});
test("plan duplicates or changed budget refused",()=>{const d=day();assert.throws(()=>buildPlan([d,d],{exactCycle:false}),/DAY/);assert.throws(()=>buildPlan([{...d,templates:[...d.templates,d.templates[0]]}],{exactCycle:false}),/QUERY_TEMPLATE/);assert.throws(()=>buildPlan([{...d,templates:[{...d.templates[0],maxAttempts:2}]}],{exactCycle:false}),/QUERY_TEMPLATE/)});
test("absence without complete readback is unknown, not a missed request",()=>{const a=assessSourceLedger(p,blank(T+120000,false));assert.equal(states(a).CLOSED_LEDGER_UNPROVEN_NO_REPLAY,1);assert.equal(states(a).CLOSED_MISSED_NO_ATTEMPT,undefined);assert.equal(a.permitReplay,false)});
test("confirmed missing past hard latest never authorizes backfill",()=>{const a=assessSourceLedger(p,blank());assert.equal(states(a).CLOSED_MISSED_NO_ATTEMPT,1);assert.equal(a.due,1);assert.equal(a.reportedDueOriginalCoverage,0);assert.equal(a.permitReplay,false)});
test("open exact interval is advisory only",()=>{const a=assessSourceLedger(p,blank(T+15000));assert.equal(states(a).OPEN_UNATTEMPTED_REVIEW_ONLY,1);assert.equal(a.permitNewRequest,false)});
test("known timely original does not imply a labeled flight",()=>{const a=assessSourceLedger(p,{...blank(),receipts:[good]});assert.equal(a.timelyOriginalCommitsReported,1);assert.equal(a.reportedDueOriginalCoverage,1);assert.equal(a.studyReleaseApproved,false)});
test("unknown reservation remains unresolved and is never retried",()=>{const a=assessSourceLedger(p,{...blank(),receipts:[{key:q.key,state:"UNKNOWN",attempt:1,evidenceSha256:H}]});assert.equal(states(a).CLOSED_UNKNOWN_RESERVATION_NO_REPLAY,1);assert.deepEqual(a.daysRequiringIntegrityOrUnknownReview,[1])});
test("late request or late commit triggers integrity hold",()=>{for(const r of [{...good,requestStartedUtc:i(T+61000)},{...good,originalAvailableUtc:i(T+400000)}]){const a=assessSourceLedger(p,{...blank(T+1000000),receipts:[r]});assert.equal(a.timelyOriginalCommitsReported,0);assert.deepEqual(a.daysRequiringIntegrityOrUnknownReview,[1])}});
test("duplicate receipts don't inflate coverage and no second attempt accepted",()=>{const a=assessSourceLedger(p,{...blank(),receipts:[good,good]});assert.equal(states(a).DUPLICATE_OR_CONFLICTING_RECEIPTS,1);assert.equal(a.timelyOriginalCommitsReported,0);assert.throws(()=>assessSourceLedger(p,{...blank(),receipts:[{...good,attempt:2}]}),/RECEIPT_SCOPE/)});
test("failed attempted source is distinct from no attempt or zero yield",()=>{const a=assessSourceLedger(p,{...blank(),receipts:[{...good,state:"FAILED"}]});assert.equal(states(a).ATTEMPTED_FAILED_NO_REPLAY,1);assert.equal(a.timelyOriginalCommitsReported,0)});
const pairs={schema:"v39.review.private-aggregate-pair-coverage.v1",partition:"test",independentJoinEvidenceSha256:H,eligibleFrame:100,certifiedActualLabel:50,t6ValidPrediction:60,t90ValidPrediction:55,t24ValidPrediction:0,t6LabelPairs:35,t6t90CommonLabelPairs:25,t6t24CommonLabelPairs:0};
test("primary T6 and paired T90 remain separately potentially estimable if T24 is absent",()=>{const a=pairCoverage(pairs);assert.equal(a.t6.pairs,35);assert.equal(a.t6.coverage,.35);assert.equal(a.t6t90.pairs,25);assert.equal(a.t6t24.status,"NOT_ESTIMABLE")});
test("unknown label denominator cannot be inflated and no forced zero loss",()=>{assert.throws(()=>pairCoverage({...pairs,t6t90CommonLabelPairs:40}),/PAIR_DENOMINATOR/);const a=pairCoverage({...pairs,eligibleFrame:0,certifiedActualLabel:0,t6ValidPrediction:0,t90ValidPrediction:0,t6LabelPairs:0,t6t90CommonLabelPairs:0});assert.equal(a.t6.coverage,null);assert.equal(a.t6.status,"NOT_ESTIMABLE")});
test("actual committed calendar contains all 6144 planned templates and exact horizon/slot counts",()=>{const a=loadFrozenCycle(process.cwd()),r=stressPhysicalOutage(a,[]);assert.equal(a.queries.length,6144);assert.equal(Object.keys(r.by.day).length,31);assert.equal(r.by.horizon["T-6h"].planned,2048);assert.equal(r.by.slot.REGIONAL.planned,1536);assert.equal(Object.values(r.by.split).reduce((s,x)=>s+x.planned,0),6144)});
