/**
 * Phase5/6 bounded PRE capacity improvement.
 *
 * Repeatedly invoke the EXISTING V0092 signed roster claim + original Stage14
 * per-flight SERIALIZABLE writer. No alternate PRE writer/queue, bulk SQL,
 * optimistic success, paid provider, source request or invented flight.
 * Default one two-task tick. Higher max 2..4 ticks ONLY after separate signed
 * Phase6 burst approval; stop on HOLD/unknown-commit without a retry.
 */
import {
 requireP5CdGithubPreRelease
} from "./phase5CdGithubPreReleaseGate_v39";
import type {
 P5CdTickReport,P5CdTickRecord
} from "./phase5CdGithubBoundedPreTick_v39";

const stop=(reason:string):never=>{
 throw Error("REFUSED_P5_CD_GH_MICROBURST_"+reason);
};
const ACCEPTABLE=new Set<P5CdTickRecord["result"]>([
 "VERIFIED_ON_TIME","REJECTED_UNSIGNED_TASK_NO_WRITE",
 "WRITE_STARTED_UNKNOWN_NO_AUTORETRY","CLAIMED_NOT_STARTED"
]);
export function admitP5CdGithubStage14Microburst(env:NodeJS.ProcessEnv){
 requireP5CdGithubPreRelease(env);
 const raw=env.P5_CD_GH_BURST_TICKS||"1";
 if(!/^[1-4]$/.test(raw))stop("MAX_FOUR_SIGNED_TICKS");
 const maximumTicks=Number(raw);
 if(maximumTicks>1&&(
   env.P5_CD_GH_PRE_MODE!=="PHASE6_APPROVED"||
   env.P5_CD_GH_BURST_APPROVED!=="1"||
   env.P5_CD_GH_PRE_STOP!=="0"||
   env.V39_PHASE5_FREEZE_SIGNED!=="1"||
   env.V39_PHASE6_PROCESS_ARMED!=="1"))
  stop("PHASE6_BATCH_CAPACITY_NOT_INDEPENDENTLY_APPROVED");
 return {
  maxTicks:maximumTicks,
  maxOriginalStage14Claims:maximumTicks*2,
  defaultSingleTickUnchanged:maximumTicks===1,
  burstReleaseCannotGrantPaidProviderOrScientificFreeze:true as const
 };
}
export interface P5CdGithubMicroburstReport{
 schema:"v39.phase5.cd-gh-existing-stage14-bounded-microburst.v1";
 status:P5CdTickReport["status"];
 claimed:number;verified:number;reaped:P5CdTickReport["reaped"];
 results:P5CdTickRecord[];
 ticksExecuted:number;reviewedTickLimit:number;
 originalStage14ClaimCapacityCeiling:number;
 stoppedFor:"SIGNED_ROSTER_DRAINED"|"TICK_BOUND_REACHED"|
  "UNSIGNED_OR_UNKNOWN_COMMIT_NO_RETRY";
 noConcurrentWorkersLaunched:true;
 providerCalls:0;paidProviderCalls:0;tasksEnqueued:0;
 independentScientificFreezeGranted:false;
 phase6PaidGoGrantedByTick:false;
}
function validateTick(x:P5CdTickReport){
 if(!x||x.schema!=="v39.phase5.cd-gh-bounded-pre-tick.v1"||
    !["COMPLETED_WITH_PROSPECTIVE_EVIDENCE_OR_RECORDED_MISSINGNESS",
      "HOLD_UNSIGNED_OR_UNCERTAIN_SNAPSHOT_NO_REPLAY"].includes(x.status)||
    !Number.isSafeInteger(x.claimed)||x.claimed<0||x.claimed>2||
    !Number.isSafeInteger(x.verified)||x.verified<0||
    x.verified>x.claimed||
    !Array.isArray(x.results)||x.results.length!==x.claimed||
    !Array.isArray(x.reaped)||x.reaped.length>64||
    x.providerCalls!==0||x.paidProviderCalls!==0||
    x.tasksEnqueued!==0||
    x.independentScientificFreezeGranted!==false||
    x.phase6PaidGoGrantedByTick!==false)
  stop("UNCERTIFIED_OR_EXCESS_SINGLE_TICK_RESULT");
 const seen=new Set<string>();
 let successful=0,anyHold=false;
 for(const item of x.results){
  if(!item||typeof item.taskId!=="string"||
     !/^[0-9]{1,24}$/.test(item.taskId)||
     seen.has(item.taskId)||!ACCEPTABLE.has(item.result))
   stop("INVALID_OR_DUPLICATE_TASK_RESULT");
  seen.add(item.taskId);
  if(item.result==="VERIFIED_ON_TIME")successful++;
  else anyHold=true;
 }
 if(successful!==x.verified||
    (x.status==="COMPLETED_WITH_PROSPECTIVE_EVIDENCE_OR_RECORDED_MISSINGNESS"&&
     (anyHold||x.reaped.some(r=>r.state==="QUARANTINED"))))
  stop("MISREPORTED_STAGE14_POSTCOMMIT_OR_QUARANTINE");
 return true;
}
/**
 * Each invocation of runOne is the unchanged Stage14 V0092 claim + exact
 * original writer + fresh post-commit readback. Returning HOLD or throwing
 * immediately prevents any new invocation. Do not retry UNKNOWN commits.
 */
export async function runP5CdGithubStage14Microburst(
 env:NodeJS.ProcessEnv,
 runOne:()=>Promise<P5CdTickReport>
):Promise<P5CdGithubMicroburstReport>{
 const admission=admitP5CdGithubStage14Microburst(env);
 if(typeof runOne!=="function")stop("MISSING_EXISTING_STAGE14_SINGLE_TICK");
 const seen=new Set<string>();
 const results:P5CdTickRecord[]=[],reaped:P5CdTickReport["reaped"]=[];
 let claimed=0,verified=0,ticksExecuted=0;
 let stoppedFor:P5CdGithubMicroburstReport["stoppedFor"]=
  "TICK_BOUND_REACHED";
 let status:P5CdTickReport["status"]=
  "COMPLETED_WITH_PROSPECTIVE_EVIDENCE_OR_RECORDED_MISSINGNESS";
 for(let tick=0;tick<admission.maxTicks;tick++){
  // Existing permission gate may have been revoked in process env,
  // revalidate before each additional Stage14 transaction.
  requireP5CdGithubPreRelease(env);
  const report=await runOne();
  validateTick(report);
  ticksExecuted++;
  // Fail rather than disguise duplicated claims from an unexpected queue
  // regression; V0088/V0092 are separately the original SQL double-write fence.
  for(const item of report.results){
   if(seen.has(item.taskId))
    stop("REPEATED_STAGE14_TASK_ACROSS_MICROTICKS");
   seen.add(item.taskId);
  }
  claimed+=report.claimed;
  verified+=report.verified;
  results.push(...report.results);
  reaped.push(...report.reaped);
  if(report.status==="HOLD_UNSIGNED_OR_UNCERTAIN_SNAPSHOT_NO_REPLAY"){
   status=report.status;
   stoppedFor="UNSIGNED_OR_UNKNOWN_COMMIT_NO_RETRY";
   break;
  }
  if(report.claimed<2){
   stoppedFor="SIGNED_ROSTER_DRAINED";
   break;
  }
 }
 return{
  schema:"v39.phase5.cd-gh-existing-stage14-bounded-microburst.v1",
  status,claimed,verified,reaped,results,ticksExecuted,
  reviewedTickLimit:admission.maxTicks,
  originalStage14ClaimCapacityCeiling:admission.maxOriginalStage14Claims,
  stoppedFor,noConcurrentWorkersLaunched:true,
  providerCalls:0,paidProviderCalls:0,tasksEnqueued:0,
  independentScientificFreezeGranted:false,
  phase6PaidGoGrantedByTick:false
 };
}
