import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {executeP6BoundedT24Candidates} from "../scripts/v39_phase6_private_current_t24_schedule_v39.mjs";
const h=x=>createHash("sha256").update(String(x)).digest("hex");
const packet=(i,cutoff=i)=>({entry:{packetSha256:h("packet"+i),permit:{flightInstanceId:"leg:synthetic-"+i,horizon:"T-24h"},witnessReview:{}},
 registrySha256:h("reg"),rosterSha256:h("roster"+i),cutoff});
const success={status:"T24_PRE_V0081_WITNESS_AND_QUEUE_VERIFIED_NOT_SCIENTIFIC_FREEZE",privateCustodyCommittedAndReadBack:true,providerCalls:0,paidProviderCalls:0,phase6PaidGo:false};
const absent={status:"NO_DUE_SIGNED_T24_TASK",providerCalls:0,phase6PaidGo:false};
test("earliest deadline first, ordinary absent packet does not prevent other valid packets",async()=>{
 const order=[],r=await executeP6BoundedT24Candidates([packet(3),packet(1),packet(2)],1,async p=>{order.push(p.cutoff);return p.cutoff===2?absent:success;});
 assert.deepEqual(order,[1,2,3]);assert.equal(r.verified,2);assert.equal(r.noDue,1);assert.equal(r.held,0);assert.equal(r.deferred,0);
 assert(!JSON.stringify(r).includes("leg:synthetic"));
});
test("unknown commit or missing durable custody stops new dispatch, no retry",async()=>{
 const seen=[];
 const r=await executeP6BoundedT24Candidates([packet(1),packet(2),packet(3)],1,async p=>{seen.push(p.cutoff);return {...success,privateCustodyCommittedAndReadBack:false};});
 assert.deepEqual(seen,[1]);assert.equal(r.status,"HOLD_CURRENT_NATIVE_T24_NO_REPLAY");assert.equal(r.held,1);assert.equal(r.deferred,2);
 assert.equal(r.aggregateCountsMayExcludeUnknownCommits,true);
});
test("parallelism is bounded and no task starts after a peer reports unknown",async()=>{
 let active=0,peak=0,started=0,resolveFirst,resolveSecond;
 const first=new Promise(r=>resolveFirst=r),second=new Promise(r=>resolveSecond=r);
 const work=executeP6BoundedT24Candidates([packet(1),packet(2),packet(3)],2,async p=>{
  started++;active++;peak=Math.max(peak,active);const z=await(p.cutoff===1?first:second);active--;return z;
 });
 assert.equal(started,2);resolveFirst({status:"HOLD_T24_UNKNOWN_NO_AUTORETRY"});await Promise.resolve();await Promise.resolve();
 resolveSecond(success);const r=await work;
 assert.equal(peak,2);assert.equal(started,2);assert.equal(r.held,1);assert.equal(r.verified,1);assert.equal(r.deferred,1);
});
test("reject duplicate packet, non-T24, and capacity drift before any dispatch",async()=>{
 let n=0;const run=async()=>{n++;return success;};
 await assert.rejects(executeP6BoundedT24Candidates([packet(1),packet(1)],1,run),/DUPLICATE/);
 await assert.rejects(executeP6BoundedT24Candidates([packet(1)],5,run),/UNBOUNDED/);
 const wrong=packet(1);wrong.entry.permit.horizon="T-6h";
 await assert.rejects(executeP6BoundedT24Candidates([wrong],1,run),/DUPLICATE/);
 assert.equal(n,0);
});
test("no new singleton after finite elapsed runner work bound",async()=>{
 let now=0;const r=await executeP6BoundedT24Candidates([packet(1),packet(2)],1,async()=>{now=600001;return success;},()=>now);
 assert.equal(r.verified,1);assert.equal(r.deferred,1);
});
