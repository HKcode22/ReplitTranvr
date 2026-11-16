import test from "node:test";
import assert from "node:assert/strict";
import {createP6SessionAckLedger,P6_ROLLING_ACK_CAPACITY} from "../server/lib/disruption/phase6RollingSessionAckLedger_v39.mjs";
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

test("closing receipt is impossible until all exact terminal IDs are visible in complete normal history",async()=>{
 const f=setup();f.attempt();f.ack();
 const row=f.row({status:"completed",conclusion:"success"});
 const jobs=route.jobs.map(j=>({name:j.name,status:"completed",conclusion:"success",steps:[]}));
 await f.ledger.reconcile({token,fetcher:async u=>({ok:true,json:async()=>u.includes("/jobs?")?{total_count:jobs.length,jobs}:row})});
 assert.throws(f.ledger.terminalAcknowledgements,/TERMINAL_RECEIPT_NOT_ADMITTED/);
 const all=P6_ROLLING_ROUTES.map(r=>({workflow:r.workflow,complete:true,runs:r===route?[row]:[],active:[]}));
 assert.throws(()=>f.ledger.verifyTerminalHistory(all.slice(1)),/TERMINAL_HISTORY_NOT_READY/);
 const missing=all.map(s=>({...s,runs:[]}));
 assert.throws(()=>f.ledger.verifyTerminalHistory(missing),/ACK_NOT_VISIBLE/);
 f.ledger.verifyTerminalHistory(all);
 assert.deepEqual(f.ledger.terminalAcknowledgements(),[{lane:route.lane,runId:id,sentAtUtc:new Date(t).toISOString()}]);
 const lag=all.map(s=>s.workflow===route.workflow?{...s,active:[f.row()]}:s);
 assert.throws(()=>f.ledger.verifyTerminalHistory(lag),/ACK_TERMINAL_HISTORY_DRIFT/);
 assert.throws(f.ledger.terminalAcknowledgements,/TERMINAL_RECEIPT_NOT_ADMITTED/);
});
test("prior ACK receipt is imported as unresolved and requires new direct readback before terminal export",async()=>{
 const prior={lane:route.lane,runId:id,sentAtUtc:new Date(t-1000).toISOString()};
 const cfg={sha,epoch:t-2000,deadline:t+600000,now:()=>t};
 for(const bad of [[prior,prior],[{...prior,lane:"OTHER"}],[{...prior,sentAtUtc:new Date(t+1000).toISOString()}],[{...prior,terminal:true}]]){
  assert.throws(()=>createP6SessionAckLedger({...cfg,priorAcknowledgements:bad}),/INVALID_PRIOR_ACK_SET/);
 }
 const ledger=createP6SessionAckLedger({...cfg,priorAcknowledgements:[prior]});
 assert.equal(ledger.status().verifiedTerminal,0);
 assert.deepEqual(ledger.status().pending,[{lane:route.lane,runId:id}]);
 assert.throws(()=>ledger.evidence({lane:route.lane,status:"DISPATCH_ATTEMPT_BEFORE_ACK"}),/DUPLICATE_OR_UNRESOLVED/);
 const f=setup(),row=f.row({status:"completed",conclusion:"success"});
 const jobs=route.jobs.map(j=>({name:j.name,status:"completed",conclusion:"success",steps:[]}));
 await ledger.reconcile({token,fetcher:async u=>({ok:true,json:async()=>u.includes("/jobs?")?{total_count:jobs.length,jobs}:row})});
 const all=P6_ROLLING_ROUTES.map(r=>({workflow:r.workflow,complete:true,runs:r===route?[row]:[],active:[]}));
 ledger.verifyTerminalHistory(all);
 assert.deepEqual(ledger.terminalAcknowledgements(),[prior]);
});

test("full inherited ACK ledger refuses a new attempt BEFORE any external POST or unknown attempt",()=>{
 const prior=Array.from({length:P6_ROLLING_ACK_CAPACITY},(_,i)=>({
  lane:route.lane,runId:20000+i,sentAtUtc:new Date(t-1000).toISOString()}));
 const events=[];
 const ledger=createP6SessionAckLedger({sha,epoch:t-2000,deadline:t+600000,now:()=>t,
  emit:e=>events.push(e),priorAcknowledgements:prior});
 assert.equal(ledger.remainingDispatchCapacity(),0);
 assert.throws(()=>ledger.evidence({lane:"PRE_RECOVERY",status:"DISPATCH_ATTEMPT_BEFORE_ACK"}),/ACK_CAPACITY_EXHAUSTED_BEFORE_POST/);
 assert.equal(ledger.status().unknownAttempts,0);assert.equal(events.length,0);
});
test("the last tracking slot is reserved before dispatch and consumed only by its exact ACK",()=>{
 const prior=Array.from({length:P6_ROLLING_ACK_CAPACITY-1},(_,i)=>({
  lane:route.lane,runId:20000+i,sentAtUtc:new Date(t-1000).toISOString()}));
 const ledger=createP6SessionAckLedger({sha,epoch:t-2000,deadline:t+600000,now:()=>t,priorAcknowledgements:prior});
 assert.equal(ledger.remainingDispatchCapacity(),1);
 ledger.evidence({lane:"PRE_RECOVERY",status:"DISPATCH_ATTEMPT_BEFORE_ACK"});
 assert.equal(ledger.remainingDispatchCapacity(),0);
 assert.throws(()=>ledger.evidence({lane:"RETENTION_MONITOR",status:"DISPATCH_ATTEMPT_BEFORE_ACK"}),/ACK_CAPACITY_EXHAUSTED_BEFORE_POST/);
 assert.equal(ledger.status().unknownAttempts,1);
 ledger.evidence({lane:"PRE_RECOVERY",status:"EXACT_ACK_NOT_EXECUTION_PROOF",runId:99999});
 assert.equal(ledger.status().acknowledged,P6_ROLLING_ACK_CAPACITY);
 assert.equal(ledger.status().unknownAttempts,0);
 assert.equal(ledger.remainingDispatchCapacity(),0);
});
