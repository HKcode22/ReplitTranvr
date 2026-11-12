/**
 * Genuine Phase5 T-24h queue worker using the EXISTING two-transaction
 * Stage14 PRE + Stage17/V0081 independent witness chain. Not a new writer.
 *
 * A V0091 source-bound task and a signed T24 packet must ALREADY exist.
 * This is deliberately ONE flight, manual GH dispatch, default STOP.
 * After WRITE_STARTED_UNKNOWN no automatic replay, including if V0081
 * witness or a network COMMIT acknowledgment is lost.
 */
import {createHash} from "node:crypto";
import type {Pool} from "pg";
import {
 claimP5CdSignedRosterDueTasksV39,markP5CdStage14WriteStartedV39,
 acknowledgeP5CdStage14PostCommitV39,reapP5CdExpiredLeasesOnceV39,
 type P5CdTaskExecutor
} from "./phase5CdDurableQueueClient_v39";
import {
 verifyP5CdFrozenRoster,bindP5CdTaskToFrozenPermit,
 type P5CdFrozenRoster,type P5CdFrozenRosterEntry
} from "./phase5CdGithubBoundedPreTick_v39";
import {requireP5CdGithubPreRelease}
 from "./phase5CdGithubPreReleaseGate_v39";
import {preflightP5Stage14ReviewedPermitV39}
 from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {
 persistP5ReviewedT24PreAndIndependentWitness,
 verifyP5T24PreWitnessCrossReview
} from "./phase5T24PreIndependentWitnessChain_v39";

const deny=(s:string):never=>{throw Error("REFUSED_P5_CD_T24_QUEUED_"+s);};
const T24_CONFIRM=
 "ONE_REVIEWED_SOURCE_QUEUED_T24_PRE_AND_INDEPENDENT_WITNESS_NO_PROVIDER";
/**
 * Scheduled T24 is separately disabled by default and can execute ONLY
 * with the same exact reviewed singleton packet and independent V0081
 * release as the original manual path. Never authorize paid source calls.
 */
export function requireP5CdT24DispatchEvent(
 env:NodeJS.ProcessEnv
):"MANUAL"|"SCHEDULED"{
 if(env.P5_CD_GH_T24_ONE_FLIGHT_CONFIRM!==T24_CONFIRM)
  deny("T24_EXACT_CONFIRMATION_REQUIRED");
 if(env.GITHUB_EVENT_NAME==="workflow_dispatch")return "MANUAL";
 if(env.GITHUB_EVENT_NAME==="schedule"&&
    env.P5_CD_GH_T24_SCHEDULE_ENABLED==="1")
  return "SCHEDULED";
 return deny("T24_UNREVIEWED_EVENT_OR_SCHEDULE_DISABLED");
}
function required<T>(v:T|undefined,reason:string):T{
 if(v===undefined)throw Error("REFUSED_P5_CD_T24_QUEUED_"+reason);
 return v;
}
export interface P5CdT24Deps{
 preDb:P5CdTaskExecutor;
 prePool:Pick<Pool,"connect">;
 witnessPool:Pick<Pool,"connect">;
 rosterBytes:Buffer;
 roster:P5CdFrozenRoster;
 files:P5CdFrozenRosterEntry[];
}
export interface P5CdT24QueuedResult{
 schema:"v39.phase5.queued-t24-pre-independent-v0081-witness.v1";
 status:"T24_PRE_V0081_WITNESS_AND_QUEUE_VERIFIED_NOT_SCIENTIFIC_FREEZE"|
        "NO_DUE_SIGNED_T24_TASK"|"HOLD_T24_UNKNOWN_NO_AUTORETRY";
 taskId:string|null;
 committedSnapshotId:string|null;
 registeredTaskWasSourceBound:boolean;
 stage17WitnessCommittedAndReadBack:boolean;
 /** Exact existing Stage17 unsigned receipt for independent review.
  * A queue worker NEVER promotes this candidate to an approved receipt. */
 unsignedStage24ReceiptCandidate:null|
  Awaited<ReturnType<typeof persistP5ReviewedT24PreAndIndependentWitness>>[
   "unsignedStage24ReceiptCandidate"];
 providerCalls:0;paidProviderCalls:0;queuedTasksInserted:0;
 phase5ScientificFreezePassed:false;phase6PaidGo:false;
}
export async function runP5CdOneQueuedT24Witness(
 env:NodeJS.ProcessEnv,deps:P5CdT24Deps
):Promise<P5CdT24QueuedResult>{
 // Requires an explicit, separate GH witness secret and distinct Stage30
 // witness-only login BEFORE opening any transaction.
 const released=requireP5CdGithubPreRelease(env,
  {allowReviewedT24Witness:true});
 requireP5CdT24DispatchEvent(env);
 if(!deps||!deps.preDb||!deps.prePool||!deps.witnessPool||
    deps.prePool===deps.witnessPool||
    !Array.isArray(deps.files)||deps.files.length!==1||
    deps.roster?.entries?.length!==1)
  deny("DISTINCT_PRE_WITNESS_OR_SINGLE_FROZEN_PACKET_REQUIRED");
 const packets=verifyP5CdFrozenRoster(deps.rosterBytes,deps.roster,
  deps.files,released,"T24_WITH_SEPARATE_WITNESS");
 if(packets.size!==1)deny("INDEPENDENT_T24_WITNESS_ROSTER_INVALID");
 const expected=[...packets.values()][0];
 if(expected.permit.horizon!=="T-24h")
  deny("T24_INDEPENDENT_WITNESS_FROZEN_SCOPE_MISSING");
 const witnessReview=required(expected.witnessReview,
   "T24_INDEPENDENT_WITNESS_FROZEN_SCOPE_MISSING");
 verifyP5T24PreWitnessCrossReview(
  expected.permit,witnessReview);
 preflightP5Stage14ReviewedPermitV39(expected.permit);
 const reaped=await reapP5CdExpiredLeasesOnceV39(deps.preDb,16);
 if(reaped.some(x=>x.state==="QUARANTINED"))
  deny("PRIOR_UNKNOWN_TASK_QUARANTINED_NO_AUTORETRY");
 const owner="cd-t24-gh-"+env.GITHUB_RUN_ID;
 if(!/^[a-z0-9-]{10,96}$/.test(owner))
  deny("GITHUB_T24_RUN_ID_NOT_REVIEWED");
 const claims=await claimP5CdSignedRosterDueTasksV39(
  deps.preDb,owner,[expected.packetSha256],["T-24h"],1,90);
 if(claims.length===0){
  return{
   schema:"v39.phase5.queued-t24-pre-independent-v0081-witness.v1",
   status:"NO_DUE_SIGNED_T24_TASK",taskId:null,
   committedSnapshotId:null,registeredTaskWasSourceBound:false,
   stage17WitnessCommittedAndReadBack:false,
   unsignedStage24ReceiptCandidate:null,
   providerCalls:0,paidProviderCalls:0,queuedTasksInserted:0,
   phase5ScientificFreezePassed:false,phase6PaidGo:false
  };
 }
 const task=claims[0];
 let permit!:ReturnType<typeof bindP5CdTaskToFrozenPermit>;
 try{
  permit=bindP5CdTaskToFrozenPermit(task,packets);
  if(permit.horizon!=="T-24h"||
     permit.flightInstanceId!==expected.permit.flightInstanceId)
   deny("CLAIMED_FLIGHT_NOT_FROZEN_T24");
 }catch{
  // Not marked started. Lease expires, but no arbitrary other flight
  // can become PRE without its exact original signed packet.
  deny("CLAIMED_TASK_NOT_EXACT_SIGNED_T24_NO_WRITE");
 }

 const started=await markP5CdStage14WriteStartedV39(deps.preDb,task);
 if(!started)deny("QUEUE_WRITE_STARTED_NOT_ACKNOWLEDGED_NO_RETRY");
 try{
  const durable=await persistP5ReviewedT24PreAndIndependentWitness(
   deps.prePool,deps.witnessPool,permit,witnessReview,{
    realV0088QueueFenceGh:{
     taskId:task.taskId,owner:task.leaseOwner,
     generation:task.leaseGeneration,packetSha256:task.packetSha256
    }
   });
  const id=durable.committedSnapshotId;
  // Witness role has SELECT on the existing V0081 witness and the
  // immutable pre snapshot; use a new connection after both commits.
  const c=await deps.witnessPool.connect();
  let witnessRow:Record<string,unknown>|undefined;
  try{
   const result=await c.query(
    "SELECT current_user AS role,w.snapshot_id::text AS snapshot_id,"+
    "w.flight_instance_id,w.selected_t_native_utc,w.t24_cutoff_utc,"+
    "w.post_pre_commit_db_observed_at_utc,"+
    "s.population_query_id::text,s.fids_response_hash,"+
    "clock_timestamp() AS observed_utc"+
    " FROM clean.phase5_t24_postcommit_witness_v39 w"+
    " JOIN clean.flight_snapshots s ON s.id=w.snapshot_id"+
    " WHERE w.snapshot_id=$1::bigint LIMIT 2",[id]);
   if(result.rows.length!==1)
    deny("INDEPENDENT_POSTWITNESS_SNAPSHOT_NOT_UNIQUE");
   witnessRow=result.rows[0] as Record<string,unknown>;
  }finally{c.release();}
  const date=(v:unknown):string=>{
   const d=v instanceof Date?v:
    typeof v==="string"?new Date(v):null;
   if(d===null)
    throw Error("REFUSED_P5_CD_T24_QUEUED_POSTWITNESS_DATABASE_UTC_MISSING");
   if(!Number.isFinite(d.getTime()))
    throw Error("REFUSED_P5_CD_T24_QUEUED_POSTWITNESS_DATABASE_UTC_INVALID");
   return d.toISOString();
  };
  const row=witnessRow!;
  if(row.role!==witnessReview.expectedWitnessOnlyRole||
     row.snapshot_id!==id||
     row.flight_instance_id!==task.flightInstanceId||
     row.population_query_id!==task.sourcePopulationQueryId||
     row.fids_response_hash!==task.sourceResponseSha256||
     date(row.selected_t_native_utc)!==task.selectedNativeTUtc||
     date(row.t24_cutoff_utc)!==task.predictionCutoffUtc||
     date(row.post_pre_commit_db_observed_at_utc)>=
       task.predictionCutoffUtc||
     date(row.observed_utc)<date(row.post_pre_commit_db_observed_at_utc))
   deny("INDEPENDENT_STAGE17_WITNESS_OR_FIDS_ORIGINAL_DRIFT");
  const receipt=createHash("sha256").update(JSON.stringify([
   "v39.phase5.queued-t24-independent-stage17-v0081.v1",
   task.taskId,task.packetSha256,id,
   task.leaseOwner,task.leaseGeneration,
   date(row.post_pre_commit_db_observed_at_utc),
   date(row.observed_utc)
  ])).digest("hex");
  const ack=await acknowledgeP5CdStage14PostCommitV39(
   deps.preDb,task,id,receipt);
  if(!ack)deny("QUEUE_ACK_UNKNOWN_AFTER_INDEPENDENT_WITNESS");
  return{
   schema:"v39.phase5.queued-t24-pre-independent-v0081-witness.v1",
   status:"T24_PRE_V0081_WITNESS_AND_QUEUE_VERIFIED_NOT_SCIENTIFIC_FREEZE",
   taskId:task.taskId,committedSnapshotId:id,
   registeredTaskWasSourceBound:true,stage17WitnessCommittedAndReadBack:true,
   unsignedStage24ReceiptCandidate:
    durable.unsignedStage24ReceiptCandidate,
   providerCalls:0,paidProviderCalls:0,queuedTasksInserted:0,
   phase5ScientificFreezePassed:false,phase6PaidGo:false
  };
 }catch{
  // After mark, a PRE COMMIT may be durable even if the subsequent
  // witness or ACK fails. Never replay; V0087 reap_once quarantines.
  return{
   schema:"v39.phase5.queued-t24-pre-independent-v0081-witness.v1",
   status:"HOLD_T24_UNKNOWN_NO_AUTORETRY",
   taskId:task.taskId,committedSnapshotId:null,
   registeredTaskWasSourceBound:true,
   stage17WitnessCommittedAndReadBack:false,
   unsignedStage24ReceiptCandidate:null,
   providerCalls:0,paidProviderCalls:0,queuedTasksInserted:0,
   phase5ScientificFreezePassed:false,phase6PaidGo:false
  };
 }
}
