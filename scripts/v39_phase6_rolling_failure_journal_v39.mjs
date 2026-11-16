/** Bounded sanitized runner-local custody evidence, never an authorization.
 * Fsync attempt evidence before the network POST. A failed/unavailable
 * artifact or abruptly lost runner remains UNKNOWN, not replay permission.
 */
import {openSync,writeFileSync,fsyncSync,closeSync} from "node:fs";
const hold=()=>{throw Error("HOLD_P6_ROLLING_FAILURE_JOURNAL_SCOPE_OR_IO");};
const okId=x=>Number.isSafeInteger(x)&&x>0;
const lanes=new Set(["SOURCE_POST","PRE_ENROLLMENT","T24","LATER_PRE","DAILY_PREPARE","PRE_RECOVERY","EARLY_DRAW","RETENTION_MONITOR"]);
const okTime=x=>typeof x==="string"&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
export const P6_ROLLING_FAILURE_JOURNAL_FILE="p6-rolling-failure-custody.jsonl";
export function createP6RollingFailureJournal(path,scope){
 if(typeof path!=="string"||!path||!okId(scope?.id)||!/^[a-f0-9]{40}$/.test(scope?.sha??"")||
  !Number.isSafeInteger(scope.epoch)||!Number.isSafeInteger(scope.chainDeadline)||scope.epoch>=scope.chainDeadline||
  !Number.isSafeInteger(scope.hop)||scope.hop<0||scope.hop>3||
  (scope.hop===0?scope.parent!==0:!okId(scope.parent)))hold();
 const fd=openSync(path,"wx",0o600);
 let closed=false,count=0,bytes=0;
 function append(row){
  const line=JSON.stringify(row)+"\n",size=Buffer.byteLength(line);
  if(closed||++count>300||size>1024||(bytes+=size)>65536)hold();
  writeFileSync(fd,line,"utf8");fsyncSync(fd);
 }
 try{append({schema:"v39.phase6.rolling-failure-custody.v1",status:"SESSION_SCOPE_NOT_AUTHORIZATION",
  runId:scope.id,reviewedMainSha:scope.sha,parentRunId:scope.parent,sessionHop:scope.hop,
  epochUtc:new Date(scope.epoch).toISOString(),chainDeadlineUtc:new Date(scope.chainDeadline).toISOString(),
  noReplay:true,providerCalls:0,databaseWrites:0,phase6PaidGo:false});}
 catch(e){closeSync(fd);throw e;}
 function record(e){
  switch(e?.status){
   case "DISPATCH_ATTEMPT_BEFORE_ACK":
   case "EXACT_ACK_NOT_EXECUTION_PROOF":{
    if(!lanes.has(e.lane)||!okTime(e.atUtc)||
      (e.status==="EXACT_ACK_NOT_EXECUTION_PROOF"&&!okId(e.runId)))hold();
    append({status:e.status,lane:e.lane,atUtc:e.atUtc,
     ...(e.status==="EXACT_ACK_NOT_EXECUTION_PROOF"?{runId:e.runId}:{})});break;
   }
   case "EXACT_WORKER_TERMINAL_NOT_COLLECTION_PROOF":
    if(!lanes.has(e.lane)||!okId(e.runId))hold();
    append({status:e.status,lane:e.lane,runId:e.runId});break;
   case "CHAIN_SUCCESSOR_ATTEMPT_BEFORE_ACK":
   case "CHAIN_SUCCESSOR_EXACT_ACK_NOT_EXECUTION_PROOF":
    if(e.runId!==scope.id||!okTime(e.sentAtUtc)||
      (e.status==="CHAIN_SUCCESSOR_EXACT_ACK_NOT_EXECUTION_PROOF"&&(!okId(e.nextRunId)||e.nextRunId===scope.id)))hold();
    append({status:e.status,runId:e.runId,sentAtUtc:e.sentAtUtc,
     ...(e.status==="CHAIN_SUCCESSOR_EXACT_ACK_NOT_EXECUTION_PROOF"?{nextRunId:e.nextRunId}:{})});break;
   default:break; // Do not persist arbitrary events, payloads or exception strings.
  }
 }
 function close(){if(!closed){closed=true;closeSync(fd);}}
 return Object.freeze({record,close});
}
