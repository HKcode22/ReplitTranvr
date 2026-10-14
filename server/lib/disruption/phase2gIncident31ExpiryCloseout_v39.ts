/**
 * Exact historical P25 incident31 archival disposition. PURE decision:
 * no raw deletions, no DB update, no credit/owner result change.
 * Incident closure is only eligible after the authorized retention expiry
 * has tombstoned every EXACT original source, and all paid/runtime scope
 * checks have been independently verified.
 */
export interface Incident31CloseoutWitnessV39 {
  observedAtMs: number;
  incidentId: number;
  incidentCause: string;
  incidentResolved: boolean;
  incidentKind: string;
  incidentReason: string;
  incidentProviderDeleteVerified: boolean;
  incidentRuntimeCleanupVerified: boolean;
  probeId: number;
  probeIcao: string;
  probeStatus: string;
  probeReconciliation: string;
  probeStopReason: string;
  probeDurationCensored: boolean;
  probeSessionExact: boolean;
  historicalReconciliationExternal: number;
  historicalReconciliationInternal: number;
  historicalReconciliationGap: number;
  activeOrSettlingProbes: number;
  openBudgetDays: number;
  activeBillableSubscriptions: number;
  runtimeSessions: number;
  runtimeDeliveries: number;
  runtimeItems: number;
  originalReferences: number;
  originalShaMetadataRefs: number;
  originalBytesRecorded: number;
  deletedVerifiedReferences: number;
  stillLiveReferences: number;
  latestOriginalExpiryMs: number;
  contractInvalidReferences: number;
}
export function assessIncident31ExpiryCloseoutV39(
  w: Incident31CloseoutWitnessV39,
): {eligible:boolean;blockers:string[];historicalReconciliation:"DELIVERY_GAP";protocolPassed:false;rawDeletionAuthorized:false} {
  const blockers: string[] = [];
  if(!Number.isSafeInteger(w.observedAtMs) || !Number.isSafeInteger(w.latestOriginalExpiryMs) ||
     w.observedAtMs < w.latestOriginalExpiryMs)
    blockers.push("RAW_RETENTION_EXPIRY_NOT_REACHED");
  if(w.incidentId!==31 || w.incidentCause!=="reconciliation" ||
     w.incidentResolved!==false ||
     w.incidentKind!=="stage1_supervisor_recovery" ||
     w.incidentReason!=="provider_subscription_isolation_lost" ||
     !w.incidentProviderDeleteVerified || w.incidentRuntimeCleanupVerified)
    blockers.push("HISTORICAL_INCIDENT31_FINGERPRINT_MISMATCH");
  if(w.probeId!==19 || w.probeIcao!=="YSSY" ||
     w.probeStatus!=="failed" || w.probeReconciliation!=="DELIVERY_GAP" ||
     w.probeStopReason!=="external_internal_delivery_gap" ||
     w.probeDurationCensored!==false || !w.probeSessionExact)
    blockers.push("HISTORICAL_PROBE19_FINGERPRINT_MISMATCH");
  if(w.historicalReconciliationExternal!==231 ||
     w.historicalReconciliationInternal!==229 ||
     w.historicalReconciliationGap!==2)
    blockers.push("HISTORICAL_RECONCILIATION_FINGERPRINT_MISMATCH");
  if([w.activeOrSettlingProbes,w.openBudgetDays,w.activeBillableSubscriptions,
      w.runtimeSessions,w.runtimeDeliveries,w.runtimeItems].some(x=>x!==0))
    blockers.push("RUNTIME_OR_PROVIDER_NOT_QUIESCENT");
  if(w.originalReferences!==58 || w.originalShaMetadataRefs!==58 ||
     w.originalBytesRecorded!==308832 || w.deletedVerifiedReferences!==58 ||
     w.stillLiveReferences!==0 || w.contractInvalidReferences!==0)
    blockers.push("ALL_58_ORIGINALS_NOT_VERIFIABLY_TOMBSTONED");
  return {eligible:blockers.length===0,blockers,
    historicalReconciliation:"DELIVERY_GAP",
    protocolPassed:false,rawDeletionAuthorized:false};
}
