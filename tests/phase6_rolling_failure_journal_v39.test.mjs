import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,statSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createP6RollingFailureJournal} from "../scripts/v39_phase6_rolling_failure_journal_v39.mjs";
const at="2030-01-01T00:00:00.000Z",epoch=Date.parse(at),scope={id:123,sha:"a".repeat(40),parent:0,hop:0,epoch,chainDeadline:epoch+3600000};
function fixture(fn){const dir=mkdtempSync(join(tmpdir(),"p6-failure-journal-"));try{fn(join(dir,"journal.jsonl"));}finally{rmSync(dir,{recursive:true,force:true});}}
const rows=p=>readFileSync(p,"utf8").trim().split("\n").map(JSON.parse);
test("attempt is already readable before POST, unknown ACK remains visible without replay permission",()=>fixture(p=>{
 const j=createP6RollingFailureJournal(p,scope);
 try{
  j.record({status:"DISPATCH_ATTEMPT_BEFORE_ACK",lane:"SOURCE_POST",atUtc:at,secret:"never copy"});
  assert.equal(rows(p).length,2);assert.equal(rows(p)[1].status,"DISPATCH_ATTEMPT_BEFORE_ACK");
  assert.equal(rows(p)[0].noReplay,true);assert(!readFileSync(p,"utf8").includes("never copy"));
  assert.equal(statSync(p).mode&0o777,0o600);
  assert.throws(()=>createP6RollingFailureJournal(p,scope));
 }finally{j.close();}
}));
test("known worker ACK, terminal readback and exact successor ACK remain separate finite custody records",()=>fixture(p=>{
 const j=createP6RollingFailureJournal(p,scope);
 try{
  j.record({status:"DISPATCH_ATTEMPT_BEFORE_ACK",lane:"T24",atUtc:at});
  j.record({status:"EXACT_ACK_NOT_EXECUTION_PROOF",lane:"T24",atUtc:at,runId:456});
  j.record({status:"EXACT_WORKER_TERMINAL_NOT_COLLECTION_PROOF",lane:"T24",runId:456,outcome:"private ignored"});
  j.record({status:"CHAIN_SUCCESSOR_ATTEMPT_BEFORE_ACK",runId:123,sentAtUtc:at});
  j.record({status:"CHAIN_SUCCESSOR_EXACT_ACK_NOT_EXECUTION_PROOF",runId:123,sentAtUtc:at,nextRunId:789});
  j.record({status:"UNKNOWN_EVENT",token:"ignored-secret"});
  assert.deepEqual(rows(p).slice(1).map(x=>x.status),["DISPATCH_ATTEMPT_BEFORE_ACK","EXACT_ACK_NOT_EXECUTION_PROOF","EXACT_WORKER_TERMINAL_NOT_COLLECTION_PROOF","CHAIN_SUCCESSOR_ATTEMPT_BEFORE_ACK","CHAIN_SUCCESSOR_EXACT_ACK_NOT_EXECUTION_PROOF"]);
  assert.equal(rows(p).at(-1).nextRunId,789);
  assert(!readFileSync(p,"utf8").includes("private ignored"));assert(!readFileSync(p,"utf8").includes("ignored-secret"));
 }finally{j.close();}
}));
test("bad scope, foreign lane, missing ACK ID or successor identity and journal exhaustion refuse",()=>fixture(p=>{
 assert.throws(()=>createP6RollingFailureJournal(p,{...scope,hop:4}),/JOURNAL/);
 const j=createP6RollingFailureJournal(p,scope);
 try{
  for(const e of [{status:"DISPATCH_ATTEMPT_BEFORE_ACK",lane:"unknown",atUtc:at},
   {status:"EXACT_ACK_NOT_EXECUTION_PROOF",lane:"T24",atUtc:at},
   {status:"CHAIN_SUCCESSOR_EXACT_ACK_NOT_EXECUTION_PROOF",runId:124,sentAtUtc:at,nextRunId:789}])
   assert.throws(()=>j.record(e),/JOURNAL/);
  for(let i=0;i<299;i++)j.record({status:"DISPATCH_ATTEMPT_BEFORE_ACK",lane:"T24",atUtc:at});
  assert.throws(()=>j.record({status:"DISPATCH_ATTEMPT_BEFORE_ACK",lane:"T24",atUtc:at}),/JOURNAL/);
 }finally{j.close();}
}));
