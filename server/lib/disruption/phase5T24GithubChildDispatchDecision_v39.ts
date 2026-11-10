/**
 * Pure Phase5 genuine T24 PRE -> V0081 child selection.
 * GH run listing is an operational suppressor, not proof of SQL COMMIT.
 * The existing Stage14 PRE and independent Stage17 witness handle durable
 * identity, deduplication and the exact PostgreSQL cutoff.
 */
import type {P5T24ActualSourceHandoffDecision}
 from "./phase5T24OriginalBoundReadonlyHandoff_v39";

const SHA=/^[a-f0-9]{64}$/;
const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const PREFIX="P5 T24 ";
const hold=(s:string):never=>{throw Error("REFUSED_P5_T24_GH_CHILD_"+s);};

export interface P5T24GhRunBrief {
 id:number;display_title:string;status:string;
 created_at:string;conclusion:string|null;
}
export interface P5T24GhRunHistory {
 total_count:number;workflow_runs:P5T24GhRunBrief[];
}
export function planP5T24WitnessedChild(
 ready:P5T24ActualSourceHandoffDecision,
 history:P5T24GhRunHistory|null,
 frozenPath:string,expectedPacketSha:string
){
 if(!ready||
   ready.schema!=="v39.phase5.native-t24-bound-original-db-readonly-handoff.v1"||
   !FILE.test(frozenPath)||!SHA.test(expectedPacketSha)||
   ready.reviewedFrozenPacketSha256!==expectedPacketSha||
   ready.providerCalls!==0||ready.productionDatabaseWrites!==0||
   ready.githubChildDispatches!==0||
   ready.legalSourceRightsCertifiedByThisReadback!==false||
   ready.nativePhysicalLegCertifiedByThisReadback!==false)
  hold("UNVERIFIED_BOUND_SOURCE_OR_SIGNED_PACKET");
 if(ready.status!=="SIGNED_T24_READY_FOR_DISTINCT_WITNESS_CHILD_NO_DISPATCH")
  return{shouldDispatch:false as const,
   status:"NOT_DUE_NO_CHILD" as const,sourceStatus:ready.status,
   previouslySubmitted:false,providerCalls:0 as const,
   databaseWrites:0 as const};
 const now=Date.parse(ready.observedDbClockUtc);
 const cutoff=Date.parse(ready.selectedT24CutoffUtc);
 if(!Number.isFinite(now)||!Number.isFinite(cutoff)||
   cutoff-now<=15*60000||cutoff-now>90*60000||
   ready.originalRowCount!==1||ready.memberRowCount!==1||
   ready.existingT24Snapshots!==0||ready.existingT24Witnesses!==0)
  hold("NO_REAL_DUE_SOURCE_OR_ALREADY_COMMITTED");
 if(!history||!Number.isSafeInteger(history.total_count)||
    history.total_count<0||history.total_count>100||
    !Array.isArray(history.workflow_runs)||
    history.workflow_runs.length!==history.total_count)
  hold("UNBOUNDED_OR_INCOMPLETE_GH_CHILD_HISTORY");
 let seen=false;
 for(const run of history.workflow_runs){
  if(!run||!Number.isSafeInteger(run.id)||run.id<=0||
     typeof run.display_title!=="string"||
     !["queued","in_progress","completed","waiting",
       "pending","requested"].includes(run.status)||
     !Number.isFinite(Date.parse(run.created_at)))
    hold("MALFORMED_GH_CHILD_RUN_HISTORY");
  // Unknown legacy child titles may be for the SAME PRE. Never guess.
  if(!run.display_title.startsWith(PREFIX))
    hold("UNKNOWN_PRIOR_MANUAL_T24_RUN_CANNOT_RULE_OUT_REPLAY");
  if(run.display_title===PREFIX+frozenPath)seen=true;
 }
 return{
  shouldDispatch:!seen,
  status:seen?"EXISTING_T24_GH_CHILD_NO_REPLAY" as const:
    "SIGNED_T24_GH_CHILD_CAN_BE_REQUESTED" as const,
  sourceStatus:ready.status,previouslySubmitted:seen,
  providerCalls:0 as const,databaseWrites:0 as const
 };
}
