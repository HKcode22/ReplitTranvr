import test from "node:test";
import assert from "node:assert/strict";
import {createP6SessionAckLedger} from "../server/lib/disruption/phase6RollingSessionAckLedger_v39.mjs";
import {P6_ROLLING_ROUTES} from "../server/lib/disruption/phase6RollingGithubController_v39.mjs";
const t=Date.parse("2030-01-01T00:00:00.500Z"),sha="a".repeat(40),route=P6_ROLLING_ROUTES.find(x=>x.lane==="LATER_PRE"),id=12345;
function setup(){
 let clock=t;const events=[];
 const ledger=createP6SessionAckLedger({sha,epoch:t-1000,deadline:t+600000,now:()=>clock,emit:e=>events.push(e)});
 const attempt=()=>ledger.evidence({lane:route.lane,status:"DISPATCH_ATTEMPT_BEFORE_ACK"});
 const ack=()=>ledger.evidence({lane:route.lane,status:"EXACT_ACK_NOT_EXECUTION_PROOF",runId:id});
 const row=(d={})=>({id,head_sha:sha,path:".github/workflows/"+route.workflow,head_branch:"main",event:"workflow_dispatch",
  run_attempt:1,status:"queued",conclusion:null,created_at:new Date(Math.floor(t/1000)*1000).toISOString(),...d});
 const snapshot=(x=[])=>({workflow:route.workflow,complete:true,runs:x,active:[]});
 return{ledger,events,attempt,ack,row,snapshot,advance:m=>clock+=m};
}
const token="synthetic-test-token-no-access";
test("accepted but invisible run blocks later history and same route repeat",()=>{
 const f=setup();f.attempt();f.ack();
 assert.throws(()=>f.ledger.assertVisible(route,f.snapshot()),/ACK_NOT_VISIBLE/);
 assert.throws(f.attempt,/DUPLICATE_OR_UNRESOLVED/);
 assert.equal(f.ledger.assertVisible(route,f.snapshot([f.row()])).runs.length,1);
 assert.throws(()=>f.ledger.assertVisible(route,f.snapshot([f.row({status:"completed",conclusion:"success"})])),/ACK_TERMINAL_NOT_YET_RECONCILED/);
});
test("uncertain POST forbids further reconciliation or replay",async()=>{
 const f=setup();f.attempt();
 await assert.rejects(f.ledger.reconcile({token,fetcher:()=>{throw Error("must never call");}}),/UNKNOWN_ACK_NO_REPLAY/);
 assert.equal(f.ledger.status().unknownAttempts,1);
});
test("independent exact terminal job readback permits later wave but never counts a physical result",async()=>{
 const f=setup();f.attempt();f.ack();
 const row=f.row({status:"completed",conclusion:"success"});
 const jobs=route.jobs.map(j=>({name:j.name,status:"completed",conclusion:"success",
   steps:j.step?[{name:j.step,status:"completed",conclusion:"success"}]:[]}));
 const calls=[];
 const status=await f.ledger.reconcile({token,fetcher:async(u,o)=>{
  calls.push(u);assert.equal(o.method,"GET");
  return {ok:true,json:async()=>u.endsWith("/jobs?filter=latest&per_page=100")?{total_count:jobs.length,jobs}:row};
 }});
 assert.equal(calls.length,2);assert.equal(status.verifiedTerminal,1);assert.equal(status.phase6PaidGo,false);
 assert.equal(f.events.at(-1).status,"EXACT_WORKER_TERMINAL_NOT_COLLECTION_PROOF");
 assert.throws(()=>f.ledger.assertVisible(route,f.snapshot()),/ACK_NOT_VISIBLE/);
 f.ledger.assertVisible(route,f.snapshot([row]));f.attempt();
 assert.throws(f.ack,/BAD_OR_DUPLICATE_ACK/);
});
test("queued work is not terminal, skipped or drifted outcome fails closed",async()=>{
 const f=setup();f.attempt();f.ack();
 const mock=row=>async()=>({ok:true,json:async()=>row});
 const q=await f.ledger.reconcile({token,fetcher:mock(f.row())});
 assert.equal(q.pending.length,1);
 await assert.rejects(f.ledger.reconcile({token,fetcher:mock(f.row({status:"completed",conclusion:"skipped"}))}),/ACK_WORKER_UNSUCCESSFUL/);
 await assert.rejects(f.ledger.reconcile({token,fetcher:mock(f.row({run_attempt:2}))}),/ACK_RUN_IDENTITY_DRIFT/);
 await assert.rejects(f.ledger.reconcile({token,fetcher:async()=>({ok:false})}),/ACK_READBACK_UNAVAILABLE/);
 assert.equal(f.ledger.status().pending.length,1);
});
test("green but incomplete or skipped job evidence is not a terminal receipt",async()=>{
 const f=setup();f.attempt();f.ack();
 const row=f.row({status:"completed",conclusion:"success"});
 for(const body of [{total_count:2,jobs:[]},{total_count:1,jobs:[{name:route.jobs[0].name,status:"completed",conclusion:"skipped"}]}]){
  await assert.rejects(f.ledger.reconcile({token,fetcher:async(u)=>({ok:true,json:async()=>u.includes("/jobs?")?body:row})}),/ACK_JOB_HISTORY_INCOMPLETE|ACK_WORKER_EVIDENCE_HOLD/);
 }
 assert.equal(f.ledger.status().verifiedTerminal,0);
});
