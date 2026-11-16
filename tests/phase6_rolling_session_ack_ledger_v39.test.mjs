import test from "node:test";
import assert from "node:assert/strict";
import {createP6SessionAckLedger,P6_ROLLING_ACK_CAPACITY} from "../server/lib/disruption/phase6RollingSessionAckLedger_v39.mjs";
import {P6_ROLLING_ROUTES,readP6RollingGithubSnapshot} from "../server/lib/disruption/phase6RollingGithubController_v39.mjs";
const t=Date.parse("2030-01-01T00:00:00.500Z"),sha="a".repeat(40),route=P6_ROLLING_ROUTES.find(x=>x.lane==="LATER_PRE"),id=12345;
function setup(){
 let clock=t;const events=[];
 const ledger=createP6SessionAckLedger({sha,epoch:t-1000,deadline:t+600000,now:()=>clock,emit:e=>events.push(e)});
 const attempt=()=>ledger.evidence({lane:route.lane,status:"DISPATCH_ATTEMPT_BEFORE_ACK"});
 const ack=()=>ledger.evidence({lane:route.lane,status:"EXACT_ACK_NOT_EXECUTION_PROOF",runId:id});
 const row=(d={})=>({id,head_sha:sha,path:".github/workflows/"+route.workflow,head_branch:"main",event:"workflow_dispatch",
  run_attempt:1,status:"queued",conclusion:null,created_at:new Date(Math.floor(t/1000)*1000).toISOString(),...d});
 const snapshot=(x=[])=>({workflow:route.workflow,complete:true,runs:x,active:x.filter(v=>v.status!=="completed")});
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

test("known active transfer requires direct ACK plus exact normal and active history, never terminal evidence",async()=>{
 const f=setup();f.attempt();f.ack();
 const row=f.row();
 await f.ledger.reconcile({token,fetcher:async()=>({ok:true,json:async()=>row})});
 const all=P6_ROLLING_ROUTES.map(r=>({workflow:r.workflow,complete:true,runs:r===route?[row]:[],active:r===route?[row]:[]}));
 assert.throws(()=>f.ledger.verifyTerminalHistory(all),/TERMINAL_HISTORY_NOT_READY/);
 assert.throws(f.ledger.continuationAcknowledgements,/CONTINUATION_RECEIPT_NOT_ADMITTED/);
 const missingNormal=all.map(x=>({...x,runs:[]}));
 assert.throws(()=>f.ledger.verifyContinuationHistory(missingNormal),/ACK_NOT_VISIBLE/);
 const missingActive=all.map(x=>({...x,active:[]}));
 assert.throws(()=>f.ledger.verifyContinuationHistory(missingActive),/ACK_TERMINAL_NOT_YET_RECONCILED/);
 f.ledger.verifyContinuationHistory(all);
 const receipt=f.ledger.continuationAcknowledgements();
 assert.deepEqual(receipt,{terminalAcknowledgements:[],pendingAcknowledgements:[{lane:route.lane,runId:id,sentAtUtc:new Date(t).toISOString()}]});
 assert.throws(f.ledger.terminalAcknowledgements,/TERMINAL_RECEIPT_NOT_ADMITTED/);
 assert.throws(f.attempt,/DUPLICATE_OR_UNRESOLVED/);
 await f.ledger.reconcile({token,fetcher:async()=>({ok:true,json:async()=>row})});
 assert.throws(f.ledger.continuationAcknowledgements,/CONTINUATION_RECEIPT_NOT_ADMITTED/);
});


function rolloverFixture({retainedSentAcrossCut=false,missingOld=false}={}){
 const now=t+30*60000,epoch=now-60*60000,deadline=now+20*60000;
 const oldTime=now-45*60000,pendingTime=now-2*60000;
 const old={id:31001,path:".github/workflows/"+route.workflow,head_sha:sha,head_branch:"main",event:"workflow_dispatch",
  run_attempt:1,status:"completed",conclusion:"success",created_at:new Date(oldTime).toISOString()};
 const pending={...old,id:31002,status:"in_progress",conclusion:null,created_at:new Date(pendingTime).toISOString()};
 const prior=[{lane:route.lane,runId:old.id,sentAtUtc:new Date(oldTime-500).toISOString()},
  {lane:route.lane,runId:pending.id,sentAtUtc:new Date(retainedSentAcrossCut?now-11*60000:pendingTime-500).toISOString()}];
 const jobs=route.jobs.map((x,i)=>({id:old.id*10+i+1,run_id:old.id,head_sha:sha,run_attempt:1,
  name:x.name,status:"completed",conclusion:"success",steps:x.step?[{name:x.step,status:"completed",conclusion:"success"}]:[]}));
 const fetcher=async(url,opt)=>{
  assert.equal(opt.method,"GET");const u=new URL(url);
  if(u.pathname.endsWith("/runs/"+old.id))return {ok:true,json:async()=>old};
  if(u.pathname.endsWith("/runs/"+pending.id))return {ok:true,json:async()=>pending};
  let key="workflow_runs",items=[];
  if(u.pathname.endsWith("/runs/"+old.id+"/jobs")){key="jobs";items=jobs;}
  else if(u.searchParams.get("status")==="in_progress")items=[pending];
  else if(u.pathname.includes("/workflows/"+route.workflow+"/runs")&&u.searchParams.get("event")==="workflow_dispatch")
   items=[...(missingOld?[]:[old]),pending];
  return {ok:true,json:async()=>({total_count:items.length,[key]:items})};
 };
 const ledger=createP6SessionAckLedger({sha,epoch,deadline,now:()=>now,priorAcknowledgements:prior});
 return {now,epoch,deadline,ledger,fetcher,old,pending,prior,
  snapshot:async(capture=()=>{})=>readP6RollingGithubSnapshot({sha,epoch,now:()=>now,token,fetcher,verifySnapshot:capture})};
}
test("independent prefix permits only terminal ACK retirement and preserves pending exact custody without mutating old ledger",async()=>{
 const f=rolloverFixture();
 await f.ledger.reconcile({token,fetcher:f.fetcher});
 const earlier=await f.snapshot(),receipt=await earlier.reviewHistoryRetirement();
 const closing=[],fresh=await f.snapshot((_r,s)=>closing.push(s));
 f.ledger.verifyContinuationHistory(closing);
 assert.throws(()=>f.ledger.reviewRolloverPartition(receipt),/RETIREMENT_PROOF_NOT_INDEPENDENT/);
 const proof=await fresh.reviewHistoryRetirement({previousReceipt:receipt});
 assert.throws(()=>f.ledger.reviewRolloverPartition({...proof}),/RETIREMENT_PROOF_NOT_INDEPENDENT/);
 const part=f.ledger.reviewRolloverPartition(proof);
 assert.equal(part.status,"REVIEWED_ACK_ROLLOVER_PARTITION_NO_GO");
 assert.deepEqual(part.retiredAcknowledgements,[f.prior[0]]);
 assert.deepEqual(part.carriedPendingAcknowledgements,[f.prior[1]]);
 assert.deepEqual(part.carriedTerminalAcknowledgements,[]);
 assert.equal(part.projectedRemainingDispatchCapacity,P6_ROLLING_ACK_CAPACITY-1);
 assert.equal(f.ledger.remainingDispatchCapacity(),P6_ROLLING_ACK_CAPACITY-2);
 const next=createP6SessionAckLedger({sha,epoch:Date.parse(part.proposedEpochUtc),deadline:f.deadline,now:()=>f.now,
  priorAcknowledgements:part.carriedPendingAcknowledgements});
 assert.deepEqual(next.status().pending,[{lane:route.lane,runId:f.pending.id}]);
 assert.equal(next.status().verifiedTerminal,0);
});
test("rollover refuses a retained ACK whose send clock would be lost at the proposed boundary",async()=>{
 const f=rolloverFixture({retainedSentAcrossCut:true});
 await f.ledger.reconcile({token,fetcher:f.fetcher});
 const a=await f.snapshot(),receipt=await a.reviewHistoryRetirement();
 const closing=[],fresh=await f.snapshot((_r,s)=>closing.push(s));
 f.ledger.verifyContinuationHistory(closing);
 const proof=await fresh.reviewHistoryRetirement({previousReceipt:receipt});
 await assert.rejects(async()=>f.ledger.reviewRolloverPartition(proof),/ROLLOVER_RETAINED_ACK_CROSSES_BOUNDARY/);
 assert.equal(f.ledger.status().acknowledged,2);
});
test("missing prior ACK never becomes rollover evidence even if new history independently appears safe",async()=>{
 const f=rolloverFixture({missingOld:true});
 await f.ledger.reconcile({token,fetcher:f.fetcher});
 const closing=[],fresh=await f.snapshot((_r,s)=>closing.push(s));
 assert.throws(()=>f.ledger.verifyContinuationHistory(closing),/ACK_NOT_VISIBLE/);
 const receipt=await fresh.reviewHistoryRetirement();
 const second=await f.snapshot(),proof=await second.reviewHistoryRetirement({previousReceipt:receipt});
 assert.throws(()=>f.ledger.reviewRolloverPartition(proof),/ROLLOVER_LEDGER_NOT_RECONCILED/);
});
