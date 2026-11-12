/**
 * Phase 5 C+D autonomous BOUNDED GitHub tick.
 * Reuses real V0087 SQL functions + original Stage14, NOT a new PRE writer.
 * Enrollment is a SEPARATE source-reviewed step; this never INSERTs tasks.
 * A queue SHA alone is not a signed packet. Validate EXACT frozen bytes
 * and provenance/rights roster before touching the queue.
 */
import {createHash} from "node:crypto";
import type {Pool} from "pg";
import {
 verifyP5T24PreWitnessCrossReview,
 type P5IndependentT24WitnessReview
} from "./phase5T24PreIndependentWitnessChain_v39";
import {
 claimP5CdDueTasksV39,markP5CdStage14WriteStartedV39,
 acknowledgeP5CdStage14PostCommitV39,reapP5CdExpiredLeasesOnceV39,
 type P5CdClaimedTask,type P5CdTaskExecutor
} from "./phase5CdDurableQueueClient_v39";
import {
 persistP5V0079SingleBoundFlightPre,
 preflightP5Stage14ReviewedPermitV39,
 type P5Stage14SingleFlightPrePermit,
 type P5Stage14SingleFlightPreResult
} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {
 requireP5CdGithubPreRelease,type P5CdGithubPreRelease
} from "./phase5CdGithubPreReleaseGate_v39";

const SHA256=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const SIZE=200_000;
function hold(s:string):never{throw Error("REFUSED_P5_CD_GH_TICK_"+s);}
const digest=(raw:Buffer)=>createHash("sha256").update(raw).digest("hex");
function iso(v:unknown):string{
 const x=v instanceof Date?v:typeof v==="string"?new Date(v):null;
 if(!x||!Number.isFinite(x.getTime()))hold("POSTCOMMIT_DB_TIMESTAMP_MISSING");
 return x.toISOString();
}
export interface P5CdFrozenRosterEntry{
 filePath:string;
 packetSha256:string;
 bytes:Buffer;
}
export interface P5CdFrozenRoster{
 schema:"v39.phase5.cd-existing-signed-pre-packet-roster.v1";
 reviewedCodeSha:string;
 manifestSha256:string;
 rightsSha256:string;
 entries:Array<{filePath:string;packetSha256:string}>;
}
export interface P5CdVerifiedTaskPacket{
 packetSha256:string;
 permit:P5Stage14SingleFlightPrePermit;
 /** Only present when an independently frozen T24 Stage17 witness is
  * paired to this exact source-bound T24 packet; no fabricated receipt. */
 witnessReview?:P5IndependentT24WitnessReview;
}
export function verifyP5CdFrozenRoster(
 raw:Buffer,roster:P5CdFrozenRoster,entries:P5CdFrozenRosterEntry[],
 gate:P5CdGithubPreRelease,
 acceptedHorizon:"LATER_ONLY"|"T24_WITH_SEPARATE_WITNESS"="LATER_ONLY"
):Map<string,P5CdVerifiedTaskPacket>{
 if(!Buffer.isBuffer(raw)||raw.length<100||raw.length>SIZE||
    digest(raw)!==gate.rosterSha256||
    !roster||roster.schema!==
     "v39.phase5.cd-existing-signed-pre-packet-roster.v1"||
    roster.reviewedCodeSha!==gate.approvedCodeSha||
    roster.manifestSha256!==gate.manifestSha256||
    roster.rightsSha256!==gate.rightsSha256||
    !Array.isArray(roster.entries)||roster.entries.length<1||
    roster.entries.length>96||entries.length!==roster.entries.length)
  hold("FROZEN_ROSTER_NOT_INDEPENDENTLY_PINNED");
 const packets=new Map<string,P5CdVerifiedTaskPacket>();
 const seenFiles=new Set<string>();
 for(let i=0;i<roster.entries.length;i++){
  const expected=roster.entries[i],given=entries[i];
  if(!expected||!given||
     !FILE.test(expected.filePath??"")||
     seenFiles.has(expected.filePath)||
     !SHA256.test(expected.packetSha256??"")||
     given.filePath!==expected.filePath||
     given.packetSha256!==expected.packetSha256||
     !Buffer.isBuffer(given.bytes)||
     given.bytes.length<100||given.bytes.length>SIZE||
     digest(given.bytes)!==expected.packetSha256||
     packets.has(expected.packetSha256))
   hold("FROZEN_PACKET_BYTES_OR_FILE_NOT_MATCHED");
  seenFiles.add(expected.filePath);
  let packet:any;
  try{packet=JSON.parse(given.bytes.toString("utf8"));}catch{
   hold("FROZEN_PACKET_JSON_NOT_VALID");
  }
  const pre=packet?.prePermit as P5Stage14SingleFlightPrePermit|undefined;
  const schema=packet?.schema;
  const t24=schema==="v39.phase5.github-native-t24-pre-witness-reviewed.v1";
  const later=schema==="v39.phase5.github-witnessed-later-pre-reviewed.v1";
  const fallback=schema==="v39.phase5.github-standalone-later-pre-asof-reviewed.v2";
  // FIRST controller only executes witnessed T6/T90. T24 must use the
  // existing separate V0081 witness writer, and standalone-later requires
  // a separately approved as-of protocol. Never mark WRITE_STARTED for
  // either incomplete branch.
  if(fallback||(t24&&acceptedHorizon!=="T24_WITH_SEPARATE_WITNESS")||
     (later&&acceptedHorizon!=="LATER_ONLY"))
   hold("T24_WITNESS_OR_STANDALONE_LATER_CHAIN_NOT_YET_CONNECTED");
  if(!t24&&!later||
     packet.reviewedCodeSha!==gate.approvedCodeSha||
     (t24&&packet.independentNativeT24AndSourceReviewAttested!==true)||
     (later&&packet.independentLaterHorizonAndT24ReviewAttested!==true)||
     (fallback&&packet.independentlyReviewedLaterWithoutT24AsOfAttested!==true)||
     !pre||pre.expectedRestrictedPreWriterRole!==
       "phase5_fids_pre_writer_prod_20261107"||
     pre.manifestSha256!==gate.manifestSha256||
     pre.expectedReviewedSourceRightsSha256!==gate.rightsSha256||
     pre.externalNativeTPhysicalLegAndSourceUseReviewed!==true||
     (pre.identityEvidenceTier??"PROVIDER_NATIVE_OPERATING_LEG")!==
       "PROVIDER_NATIVE_OPERATING_LEG"||
     (t24&&pre.horizon!=="T-24h")||
     (!t24&&!["T-6h","T-90m"].includes(pre.horizon))||
     !SHA256.test(pre.expectedSourceResponseSha256??"")||
     !SHA256.test(pre.reviewedFrameSha256??"")||
     !CODE.test(packet.reviewedCodeSha??""))
   hold("FROZEN_PERMIT_SOURCE_RIGHTS_OR_NATIVE_T_UNREVIEWED");
  let witnessReview:P5IndependentT24WitnessReview|undefined;
  if(t24){
   if(pre.horizon!=="T-24h"||
      packet.independentNativeT24AndSourceReviewAttested!==true||
      !packet.witnessReview)
    hold("T24_WITNESS_OR_NATIVE_SOURCE_NOT_IN_SIGNED_PACKET");
   witnessReview=packet.witnessReview as P5IndependentT24WitnessReview;
   verifyP5T24PreWitnessCrossReview(pre,witnessReview);
  }
  packets.set(expected.packetSha256,{
   packetSha256:expected.packetSha256,permit:pre,
   ...(witnessReview?{witnessReview}:{})
  });
 }
 return packets;
}
export function bindP5CdTaskToFrozenPermit(
 task:P5CdClaimedTask,packets:Map<string,P5CdVerifiedTaskPacket>
):P5Stage14SingleFlightPrePermit{
 const record=packets.get(task.packetSha256);
 if(!record)hold("CLAIMED_TASK_MISSING_IN_SIGNED_ROSTER");
 const p=record.permit;
 if(p.flightInstanceId!==task.flightInstanceId||
    p.horizon!==task.horizon||
    p.manifestSha256!==task.manifestSha256||
    p.selectedTNativeUtc!==task.selectedNativeTUtc||
    p.expectedSourcePopulationQueryId!==task.sourcePopulationQueryId||
    p.expectedSourceResponseSha256!==task.sourceResponseSha256||
    p.expectedReviewedSourceRightsSha256!==task.reviewedSourceRightsSha256||
    !SHA256.test(p.expectedReviewedSourceRightsSha256??"")||
    !Number.isFinite(Date.parse(task.sourceExpiresAtUtc)))
  hold("QUEUE_TASK_AND_FROZEN_PERMIT_IDENTITY_MISMATCH");
 const expected=new Date(Date.parse(task.selectedNativeTUtc)-
  (task.horizon==="T-24h"?86_400_000:
   task.horizon==="T-6h"?21_600_000:5_400_000)).toISOString();
 if(expected!==task.predictionCutoffUtc)
  hold("QUEUE_CUTOFF_OR_NATIVE_T_CHANGED");
 return p;
}
export interface P5CdTickDeps{
 /** Already scoped to Stage28 dedicated PRE role, never application runtime. */
 db:P5CdTaskExecutor;
 pool:Pick<Pool,"connect">;
 packets:Map<string,P5CdVerifiedTaskPacket>;
}
export interface P5CdTickRecord{
 taskId:string;
 result:"VERIFIED_ON_TIME"|"REJECTED_UNSIGNED_TASK_NO_WRITE"|
        "WRITE_STARTED_UNKNOWN_NO_AUTORETRY"|"CLAIMED_NOT_STARTED";
}
export interface P5CdTickReport{
 schema:"v39.phase5.cd-gh-bounded-pre-tick.v1";
 status:"COMPLETED_WITH_PROSPECTIVE_EVIDENCE_OR_RECORDED_MISSINGNESS"|
        "HOLD_UNSIGNED_OR_UNCERTAIN_SNAPSHOT_NO_REPLAY";
 claimed:number;verified:number;
 reaped:Array<{taskId:string;state:string}>;
 results:P5CdTickRecord[];
 providerCalls:0;paidProviderCalls:0;
 tasksEnqueued:0;
 independentScientificFreezeGranted:false;
 phase6PaidGoGrantedByTick:false;
}
/** SQL readback uses a fresh restricted PRE connection after Stage14
 * acknowledged COMMIT. This is a PROCEDURAL queue receipt, not an external
 * legal/source reviewer or a flight physical-outcome certificate.
 */
async function independentPostCommitReadback(
 db:P5CdTaskExecutor,task:P5CdClaimedTask,
 saved:P5Stage14SingleFlightPreResult
):Promise<string>{
 if(saved.status!=="ONE_SOURCE_BOUND_PROSPECTIVE_PRE_SAVED_NOT_SCIENTIFIC_FREEZE"||
   saved.postCommitDatabaseReadbackVerified!==true||
   saved.preSnapshotsInserted!==1||saved.providerCalls!==0||
   saved.alertCreates!==0||
   saved.cutoffUtc!==task.predictionCutoffUtc||
   saved.boundPopulationQueryId!==task.sourcePopulationQueryId||
   Date.parse(saved.postCommitDbClockAtUtc)>=
     Date.parse(task.predictionCutoffUtc))
  hold("ORIGINAL_STAGE14_DURABLE_PRE_RESULT_NOT_ACCEPTED");
 const r=await db.query(
  "SELECT id::text,flight_instance_id,horizon,prediction_state,"+
  "selected_t_milestone_utc,prediction_cutoff_utc,"+
  "population_query_id::text,fids_response_hash,created_at,"+
  "clock_timestamp() AS independent_readback_utc"+
  " FROM clean.flight_snapshots WHERE id=$1::bigint",
  [saved.committedSnapshotId]);
 if(r.rows.length!==1)hold("INDEPENDENT_SNAPSHOT_READBACK_NOT_UNIQUE");
 const x=r.rows[0];
 if(x.id!==saved.committedSnapshotId||
   x.flight_instance_id!==task.flightInstanceId||
   x.horizon!==task.horizon||
   x.prediction_state!=="PRE_DEPARTURE"||
   iso(x.selected_t_milestone_utc)!==task.selectedNativeTUtc||
   iso(x.prediction_cutoff_utc)!==task.predictionCutoffUtc||
   x.population_query_id!==task.sourcePopulationQueryId||
   x.fids_response_hash!==task.sourceResponseSha256||
   Date.parse(iso(x.created_at))>=Date.parse(task.predictionCutoffUtc))
  hold("INDEPENDENT_SNAPSHOT_IDENTITY_SOURCE_OR_CUTOFF_DRIFT");
 const observed=iso(x.independent_readback_utc);
 return createHash("sha256").update(JSON.stringify([
  "phase5-cd-v0087-v0088-postcommit-procedural-v1",
  task.taskId,task.leaseOwner,task.leaseGeneration,
  saved.committedSnapshotId,task.packetSha256,
  saved.postCommitDbClockAtUtc,observed
 ])).digest("hex");
}
/** One bounded tick. The caller has already authenticated GH main and read
 * the exact frozen signed roster before connecting. No timers, cron,
 * source/Alert GET, enqueue or background processing here.
 */
export async function runP5CdGithubPreTick(
 env:NodeJS.ProcessEnv,deps:P5CdTickDeps,
 opts:{owner:string;limit?:number;leaseSeconds?:number}):
 Promise<P5CdTickReport>{
 requireP5CdGithubPreRelease(env);
 if(!deps||!deps.db||!deps.pool||!(deps.packets instanceof Map)||
    deps.packets.size<1||
    !/^[a-zA-Z0-9_.:-]{5,96}$/.test(opts?.owner??""))
  hold("UNAPPROVED_QUEUE_DEPENDENCIES_OR_WORKER_ID");
 const limit=opts.limit??2,seconds=opts.leaseSeconds??120;
 if(!Number.isInteger(limit)||limit<1||limit>2||
   !Number.isInteger(seconds)||seconds<30||seconds>120)
  hold("UNBOUNDED_QUEUE_WORKER_CAPACITY");
 const reap=await reapP5CdExpiredLeasesOnceV39(deps.db,64);
 const tasks=await claimP5CdDueTasksV39(deps.db,opts.owner,limit,seconds);
 const results:P5CdTickRecord[]=[];
 for(const task of tasks){
  // STOP/rights may have been revoked between tasks in this process;
  // avoid any further writes when the reviewed process gate is absent.
  requireP5CdGithubPreRelease(env);
  let permit:P5Stage14SingleFlightPrePermit;
  try{
   permit=bindP5CdTaskToFrozenPermit(task,deps.packets);
   // The exact original Stage14 native-T, frozen-builder, identity,
   // T24-witness and scientific-permit shape is checked BEFORE the
   // un-retriable UNKNOWN state is entered, not after it.
   if(preflightP5Stage14ReviewedPermitV39(permit)!==
      task.selectedNativeTUtc)
    hold("ORIGINAL_STAGE14_REVIEWED_NATIVE_T_CHANGED");
  }catch{
   // Nothing in Stage14 executed; CLAIMED lease expires. Never invent
   // source packet, source rights, native T or an automatic replacement.
   results.push({taskId:task.taskId,result:"REJECTED_UNSIGNED_TASK_NO_WRITE"});
   continue;
  }
  const started=await markP5CdStage14WriteStartedV39(deps.db,task);
  if(!started){
   results.push({taskId:task.taskId,result:"CLAIMED_NOT_STARTED"});
   continue;
  }
  // Any exception after this point is UNKNOWN and must quarantine via
  // existing V0087 watchdog. No automatic replay, even if it looks like
  // a serialization abort, until an independent reconciliation proves it.
  try{
   const saved=await persistP5V0079SingleBoundFlightPre(
    deps.pool,permit,{
     realV0088QueueFenceGh:{
      taskId:task.taskId,owner:task.leaseOwner,
      generation:task.leaseGeneration,packetSha256:task.packetSha256
     },
     ...(env.P5_CD_GH_E_ROUTE_FEATURES_APPROVED==="1"
       ?{amendmentENativeRouteBoundGh:true as const}:{})
    });
   const receipt=await independentPostCommitReadback(deps.db,task,saved);
   const ack=await acknowledgeP5CdStage14PostCommitV39(
    deps.db,task,saved.committedSnapshotId,receipt);
   if(!ack)hold("POSTCOMMIT_QUEUE_ACK_UNCERTAIN");
   results.push({taskId:task.taskId,result:"VERIFIED_ON_TIME"});
  }catch{
   results.push({taskId:task.taskId,
    result:"WRITE_STARTED_UNKNOWN_NO_AUTORETRY"});
  }
 }
 return{
  schema:"v39.phase5.cd-gh-bounded-pre-tick.v1",
  status:results.some(x=>x.result!=="VERIFIED_ON_TIME")||
   reap.some(x=>x.state==="QUARANTINED")?
   "HOLD_UNSIGNED_OR_UNCERTAIN_SNAPSHOT_NO_REPLAY":
   "COMPLETED_WITH_PROSPECTIVE_EVIDENCE_OR_RECORDED_MISSINGNESS",
  claimed:tasks.length,
  verified:results.filter(x=>x.result==="VERIFIED_ON_TIME").length,
  reaped:reap.map(x=>({taskId:x.taskId,state:x.state})),
  results,providerCalls:0,paidProviderCalls:0,tasksEnqueued:0,
  independentScientificFreezeGranted:false,phase6PaidGoGrantedByTick:false
 };
}
