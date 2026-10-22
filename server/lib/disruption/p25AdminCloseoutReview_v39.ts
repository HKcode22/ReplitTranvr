/**
 * Exact P25 YSSY probe19 ADMINISTRATIVE closeout review ONLY.
 * No SQL writes; this is not a scientific success adjudication.
 * An eventual signed write owner must re-lock/re-read the same evidence.
 */
export interface P25AdminWitnessV39 {
  nowMs:number;
  latestBlobExpiryMs:number;
  probeId:number;
  probeIcao:string;
  probeStage:number;
  probeStatus:string;
  probeReconciliation:string;
  probeStopReason:string;
  probeCensored:boolean;
  exactSession:boolean;
  runtimeCleanupTimestampIsNull:boolean;
  externalCredits:number;
  internalCredits:number;
  deliveryGapCredits:number;
  budgetState:string;
  budgetCap:number;
  budgetClosedAtIsNull:boolean;
  openBudgetCount:number;
  activeProbeCount:number;
  runtimeSessions:number;
  runtimeDeliveries:number;
  runtimeItems:number;
  activeBillableSubscriptions:number;
  unendedV39Subscriptions:number;
  incidentOpenIds:readonly number[];
  incident31Fingerprint:boolean;
  incident32Fingerprint:boolean;
  refCount:number;
  refShaCount:number;
  refBytes:number;
  tombstones:number;
  unmarkedRefs:number;
  deletionRunCount:number;
  rowsInDeletionRun:number;
  assignedDeletionRunCount:number;
  markedDeletedAtCount:number;
  invalidContractCount:number;
}
export type P25AdminVerdictV39={
  eligibleForReview:boolean;
  blockers:readonly string[];
  historicalProtocolPassed:false;
  scientificReconciliation:"DELIVERY_GAP";
  originalGapCredits:2;
  paidAuthorization:false;
  databaseWriteAuthorized:false;
};
export function assessP25AdministrativeReviewV39(
 w:P25AdminWitnessV39
):P25AdminVerdictV39 {
 const blockers:string[]=[];
 if(!Number.isSafeInteger(w.nowMs) ||
    !Number.isSafeInteger(w.latestBlobExpiryMs) ||
    w.nowMs<w.latestBlobExpiryMs)
   blockers.push("RETENTION_EXPIRY_INVALID");
 if(w.probeId!==19||w.probeIcao!=="YSSY"||
    w.probeStage!==1||w.probeStatus!=="failed"||
    w.probeReconciliation!=="DELIVERY_GAP"||
    w.probeStopReason!=="external_internal_delivery_gap"||
    w.probeCensored!==false||w.exactSession!==true||
    w.runtimeCleanupTimestampIsNull!==true)
   blockers.push("IMMUTABLE_PROBE19_FINGERPRINT_MISMATCH");
 if(w.externalCredits!==231||w.internalCredits!==229||
    w.deliveryGapCredits!==2)
   blockers.push("ORIGINAL_TWO_CREDIT_GAP_CHANGED");
 if(w.budgetState!=="OPEN"||w.budgetCap!==500||
    w.budgetClosedAtIsNull!==true||w.openBudgetCount!==1)
   blockers.push("BUDGET_OWNER_SCOPE_CHANGED");
 if(w.activeProbeCount!==0||w.runtimeSessions!==0||
    w.runtimeDeliveries!==0||w.runtimeItems!==0||
    w.activeBillableSubscriptions!==0||w.unendedV39Subscriptions!==0)
   blockers.push("RUNTIME_OR_PROVIDER_NOT_QUIESCENT");
 if(w.incidentOpenIds.length!==2||
    w.incidentOpenIds[0]!==31||w.incidentOpenIds[1]!==32||
    !w.incident31Fingerprint||!w.incident32Fingerprint)
   blockers.push("INCIDENT31_32_EXACT_SCOPE_CHANGED");
 if(w.refCount!==58||w.refShaCount!==58||w.refBytes!==308832||
    w.tombstones!==58||w.unmarkedRefs!==0||
    w.deletionRunCount!==1||w.rowsInDeletionRun!==58||
    w.assignedDeletionRunCount!==58||w.markedDeletedAtCount!==58||
    w.invalidContractCount!==0)
   blockers.push("EXACT_58_RETENTION_TOMBSTONES_INCOMPLETE");
 return {
   eligibleForReview:blockers.length===0,
   blockers,historicalProtocolPassed:false,
   scientificReconciliation:"DELIVERY_GAP",
   originalGapCredits:2,
   paidAuthorization:false,databaseWriteAuthorized:false
 };
}
