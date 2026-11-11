/**
 * Phase5 C+D first OFFLINE engineering slice:
 *  - (C) select truly due tasks and execute bounded independent workers
 *  - (D) expose restart/watchdog and UNKNOWN_COMMIT results as durable-queue
 *    adapter requirements; no claim that the production DB queue exists.
 *
 * No SQL, provider GETs, Alert CREATE, GH dispatch or real source contents.
 * DUE times are derived from caller-supplied *actual PG* clock, not Date.now.
 * All real production eligibility, rights, selected-native-T semantics, and
 * source-packet SHA must be independently enforced upstream/downstream by
 * the existing #552/#559 registry and Stage14.
 */
const SHA=/^[a-f0-9]{64}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const MS:{[key:string]:number}={
 "T-24h":86400000,"T-6h":21600000,"T-90m":5400000
};
const hold=(s:string):never=>{throw Error("REFUSED_P5_CD_OFFLINE_"+s);};
const stamp=(s:string):number=>{
 if(typeof s!=="string"||!ISO.test(s)||!Number.isFinite(Date.parse(s))||
    new Date(Date.parse(s)).toISOString()!==s)hold("INVALID_UTC");
 return Date.parse(s);
};
export type P5PreHorizon="T-24h"|"T-6h"|"T-90m";
export interface P5PreQueueCandidate{
 flightInstanceId:string;
 horizon:P5PreHorizon;
 selectedNativeTUtc:string;
 ownCutoffUtc:string;
 packetSha256:string;
 /** Reviewed source registry status, NOT a license proven by this module. */
 handoffState:"EXTERNALLY_REVIEWED_PENDING"|"WRITE_STARTED_UNKNOWN"|"COMPLETED";
}
export interface P5CPlusDSnapshot{
 schema:"v39.phase5.cplusd-offline-due-snapshot.v1";
 observedDbClockUtc:string;
 due:P5PreQueueCandidate[];
 waiting:P5PreQueueCandidate[];
 missed:P5PreQueueCandidate[];
 heldUnknownOrComplete:P5PreQueueCandidate[];
 signedPacketsCreated:0;productionPreWrites:0;providerCalls:0;
 scientificFreezeGranted:false;paidPhase6GoGranted:false;
}
export function selectP5CPlusDDueTasks(
 rows:readonly P5PreQueueCandidate[],
 observedDbClockUtc:string
):P5CPlusDSnapshot{
 if(!Array.isArray(rows)||rows.length>2500)hold("UNBOUNDED_QUEUE_VIEW");
 const now=stamp(observedDbClockUtc);
 const seen=new Set<string>();
 const due:P5PreQueueCandidate[]=[],waiting:P5PreQueueCandidate[]=[],
 missed:P5PreQueueCandidate[]=[],heldUnknownOrComplete:P5PreQueueCandidate[]=[];
 for(const r of rows){
  if(!r||typeof r.flightInstanceId!=="string"||
     r.flightInstanceId.length<5||r.flightInstanceId.length>200||
     !Object.prototype.hasOwnProperty.call(MS,r.horizon)||
     !SHA.test(r.packetSha256??"")||
     !["EXTERNALLY_REVIEWED_PENDING","WRITE_STARTED_UNKNOWN","COMPLETED"].includes(r.handoffState))
    hold("UNREVIEWED_IDENTITY_OR_QUEUE_STATUS");
  const id=r.flightInstanceId+"|"+r.horizon;
  // A change in selected native T changes C, but never makes a second
  // independent first PRE for the same canonical flight+horizon.
  if(seen.has(id))hold("SAME_FLIGHT_HORIZON_TWO_NATIVE_CUTOFFS");
  seen.add(id);
  const t=stamp(r.selectedNativeTUtc),cutoff=stamp(r.ownCutoffUtc);
  if(t-cutoff!==MS[r.horizon])hold("ALTERED_NATIVE_T_OR_OWN_CUTOFF");
  if(r.handoffState!=="EXTERNALLY_REVIEWED_PENDING"){
   heldUnknownOrComplete.push(r);continue;
  }
  // Preserve the existing Stage14 3-min PRE window and 2s margin;
  // this function only *classifies*, never grants DB write permission.
  if(now<cutoff-180000)waiting.push(r);
  else if(now>=cutoff-2000)missed.push(r);
  else due.push(r);
 }
 const byCutoff=(a:P5PreQueueCandidate,b:P5PreQueueCandidate)=>
   a.ownCutoffUtc.localeCompare(b.ownCutoffUtc)||
   a.flightInstanceId.localeCompare(b.flightInstanceId);
 due.sort(byCutoff);waiting.sort(byCutoff);missed.sort(byCutoff);
 return{
  schema:"v39.phase5.cplusd-offline-due-snapshot.v1",
  observedDbClockUtc,due,waiting,missed,heldUnknownOrComplete,
  signedPacketsCreated:0,productionPreWrites:0,providerCalls:0,
  scientificFreezeGranted:false,paidPhase6GoGranted:false
 };
}
export interface P5ExistingStage14Proof{
 flightInstanceId:string;
 horizon:P5PreHorizon;
 packetSha256:string;
 postCommitDatabaseReadbackVerified:true;
 preSnapshotsInserted:1;
}
export interface P5WorkerResult{
 flightInstanceId:string;horizon:P5PreHorizon;packetSha256:string;
 status:"EXISTING_STAGE14_RETURNED_VERIFIED_PROOF"|"UNKNOWN_COMMIT_QUARANTINE"|
  "NOT_STARTED_SYSTEMIC_STOP";
}
export class P5SystemicStop extends Error{
 constructor(){super("P5_SHARED_DB_RIGHTS_BUDGET_OR_STOP_HOLD");}
}
/**
 * Inject original reviewed Stage14 as an adapter in future only AFTER
 * independent scientific freeze. This is NOT a new writer.
 *
 * Failures of one task quarantine that task, not unrelated eligible tasks.
 * A systemic stop prevents *new* tasks from starting; already-running
 * transactions need independent fencing/circuit-breaker admission.
 * No automatic retry of ANY exception (including 40001).
 */
export async function runP5CPlusDReadyBatchOffline(
 due:readonly P5PreQueueCandidate[],
 lanes:number,
 invokeReviewedExistingStage14:(p:P5PreQueueCandidate)=>Promise<P5ExistingStage14Proof>
):Promise<{
 schema:"v39.phase5.cplusd-offline-parallel-results.v1";
 laneLimit:number;results:P5WorkerResult[];
 externallyVerifiedRealSource:false;liveDatabaseBenchmark:false;
 productionQueueInstalled:false;phase6PaidGo:false;
}>{
 if(!Array.isArray(due)||due.length>2500||
    !Number.isSafeInteger(lanes)||lanes<1||lanes>16||
    typeof invokeReviewedExistingStage14!=="function")
  hold("UNBOUNDED_LANES_OR_TASKS");
 const ids=new Set<string>();
 for(const r of due){
  if(!r||r.handoffState!=="EXTERNALLY_REVIEWED_PENDING"||
     !SHA.test(r.packetSha256??""))
   hold("QUEUE_STATE_NOT_APPROVED_PENDING");
  const key=r.flightInstanceId+"|"+r.horizon;
  if(ids.has(key))hold("DUPLICATE_FLIGHT_HORIZON_PARALLEL_WRITE");
  ids.add(key);
 }
 const tasks=[...due].sort((a,b)=>a.ownCutoffUtc.localeCompare(b.ownCutoffUtc));
 const results:P5WorkerResult[]=new Array(tasks.length);
 let next=0,systemicStop=false;
 const worker=async()=>{
  while(true){
   const i=next++;
   if(i>=tasks.length)return;
   const t=tasks[i];
   if(systemicStop){
    results[i]={flightInstanceId:t.flightInstanceId,horizon:t.horizon,
      packetSha256:t.packetSha256,status:"NOT_STARTED_SYSTEMIC_STOP"};
    continue;
   }
   try{
    const proof=await invokeReviewedExistingStage14(t);
    if(!proof||proof.packetSha256!==t.packetSha256||
       proof.flightInstanceId!==t.flightInstanceId||
       proof.horizon!==t.horizon||
       proof.postCommitDatabaseReadbackVerified!==true||
       proof.preSnapshotsInserted!==1)
     throw new Error("AMBIGUOUS_STAGE14_PROOF");
    results[i]={flightInstanceId:t.flightInstanceId,horizon:t.horizon,
     packetSha256:t.packetSha256,
     status:"EXISTING_STAGE14_RETURNED_VERIFIED_PROOF"};
   }catch(e){
    if(e instanceof P5SystemicStop)systemicStop=true;
    // A lost acknowledgement can conceal a committed row. No retries.
    results[i]={flightInstanceId:t.flightInstanceId,horizon:t.horizon,
      packetSha256:t.packetSha256,status:"UNKNOWN_COMMIT_QUARANTINE"};
   }
  }
 };
 await Promise.all(Array.from({length:Math.min(lanes,tasks.length)},()=>worker()));
 return{
  schema:"v39.phase5.cplusd-offline-parallel-results.v1",
  laneLimit:lanes,results,externallyVerifiedRealSource:false,
  liveDatabaseBenchmark:false,productionQueueInstalled:false,
  phase6PaidGo:false
 };
}
export interface P5SupervisorReadOnlyMetrics{
 lastSuccessfulControllerTickUtc:string|null;
 oldestUnclaimedDueUtc:string|null;
 unverifiedUnknownCommitCount:number;
 sourceRightsHold:boolean;
 budgetHold:boolean;
 alertStopHold:boolean;
}
export function inspectP5CPlusDWatchdogOffline(
 observedDbClockUtc:string,
 m:P5SupervisorReadOnlyMetrics
):{
 status:"HEALTHY"|"REQUIRES_OPERATOR_REVIEW";
 issues:string[];
 paidActionsInitiated:0;databaseWrites:0;automaticReruns:0;
}{
 const now=stamp(observedDbClockUtc),issues:string[]=[];
 if(!m||!Number.isSafeInteger(m.unverifiedUnknownCommitCount)||
    m.unverifiedUnknownCommitCount<0)
  hold("INVALID_WATCHDOG_COUNTS");
 if(m.lastSuccessfulControllerTickUtc===null||
    now-stamp(m.lastSuccessfulControllerTickUtc)>20*60000)
  issues.push("CONTROLLER_STALE_OR_NEVER_STARTED");
 if(m.oldestUnclaimedDueUtc!==null&&
    now-stamp(m.oldestUnclaimedDueUtc)>2*60000)
  issues.push("DUE_FLIGHT_TASK_NOT_CLAIMED");
 if(m.unverifiedUnknownCommitCount>0)
  issues.push("UNCERTAIN_PRE_COMMIT_NEEDS_READONLY_RECONCILIATION");
 if(m.sourceRightsHold)issues.push("SOURCE_RIGHTS_HOLD");
 if(m.budgetHold)issues.push("REST_OR_ALERT_BUDGET_HOLD");
 if(m.alertStopHold)issues.push("ALERT_STOP_UNVERIFIED");
 return{
  status:issues.length?"REQUIRES_OPERATOR_REVIEW":"HEALTHY",
  issues,paidActionsInitiated:0,databaseWrites:0,automaticReruns:0
 };
}
export function idealizedP5ParallelWorkSeconds(
 taskCount:number,laneCount:number,assumedSecondsPerTask:number
):number{
 if(!Number.isSafeInteger(taskCount)||taskCount<0||taskCount>2500||
    !Number.isSafeInteger(laneCount)||laneCount<1||laneCount>16||
    !Number.isFinite(assumedSecondsPerTask)||
    assumedSecondsPerTask<=0||assumedSecondsPerTask>60)
  hold("INVALID_THEORETICAL_BENCHMARK_INPUT");
 return Math.ceil(taskCount/laneCount)*assumedSecondsPerTask;
}
