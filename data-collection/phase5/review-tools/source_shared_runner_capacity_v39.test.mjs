import test from "node:test";
import assert from "node:assert/strict";
import {modelSharedSourceRunners} from "./source_shared_runner_capacity_v39.mjs";
import {loadFrozenCycle} from "./source_outage_accounting_v39.mjs";
const T=Date.parse("2026-11-20T00:00:00Z"),M=60000;
function plan(times){return {queries:times.map((d,i)=>({key:"q"+i,planned:T+d*M,hard:T+d*M+M,horizon:"T-6h",split:"test"}))};}
const cfg={totalSlots:2,reservedSlots:0,appCap:2,leadMinutes:90,tailMinutes:3,startupMs:120000,phaseMinutes:0,batch:8};
test("acknowledged jobs queued behind occupied runners are not counted as ready",()=>{
 const a=modelSharedSourceRunners(plan([90,90]),{...cfg,totalSlots:1});
 assert.equal(a.admitted,2);assert.equal(a.counts.READY_BY_NOMINAL,1);
 assert.equal(a.counts.READY_AFTER_HARD_WINDOW,1);assert.equal(a.peakRunning,1);assert.equal(a.peakWaiting,1);
 assert.equal(a.byHorizonAndSplit["T-6h/test"].READY_AFTER_HARD_WINDOW,1);
});
test("physical slots reserved for PRE/POST reduce effective SOURCE capacity, not denominator",()=>{
 const p=plan([90,90]);const a=modelSharedSourceRunners(p,cfg),b=modelSharedSourceRunners(p,{...cfg,reservedSlots:1,appCap:1});
 assert.equal(a.counts.READY_BY_NOMINAL,2);assert.equal(b.counts.READY_BY_NOMINAL,1);assert.equal(b.counts.NOT_ADMITTED_WITHIN_PREARM_LEAD,1);
 assert.equal(b.planned,2);assert.equal(b.permitReplay,false);
});
test("startup near nominal time separates hard-latest from earlier readiness",()=>{
 const a=modelSharedSourceRunners(plan([15]),{...cfg,leadMinutes:15,startupMs:15*M+30000});
 assert.equal(a.counts.READY_AFTER_NOMINAL_WITHIN_HARD_WINDOW,1);
 const b=modelSharedSourceRunners(plan([15]),{...cfg,leadMinutes:15,startupMs:17*M});
 assert.equal(b.counts.READY_AFTER_HARD_WINDOW,1);
});
test("scheduler blackout leads to explicit not-admitted, no retrospective request",()=>{
 const a=modelSharedSourceRunners(plan([90]),{...cfg,blackouts:[{start:T,end:T+80*M}]});
 assert.equal(a.counts.NOT_ADMITTED_WITHIN_PREARM_LEAD,1);assert.equal(a.admitted,0);assert.equal(a.dispatches,0);
});
test("full actual frozen plan reconciles all opportunities and protected T6 test denominator",()=>{
 const p=loadFrozenCycle(process.cwd()),a=modelSharedSourceRunners(p,{...cfg,totalSlots:20,reservedSlots:4,appCap:24});
 assert.equal(a.planned,6144);assert.equal(Object.values(a.counts).reduce((x,y)=>x+y,0),6144);
 assert.equal(Object.values(a.byHorizonAndSplit["T-6h/test"]).reduce((x,y)=>x+y,0),384);
 assert(a.peakRunning<=16);assert(a.peakAcknowledged<=24);assert.equal(a.phase6PaidGo,false);
});
