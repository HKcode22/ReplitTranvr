/**
 * P25 YSSY 2026-10-13 historical ADMINISTRATIVE completion only.
 * Never reclassifies a failed/DELIVERY_GAP scientific result as MATCH.
 * A fresh strict provider LIST and transaction-scoped database witness are
 * mandatory before any exact budget+incident administrative disposition.
 */
export type P25AdministrativeCloseoutWitnessV39 = Readonly<{
  observedAtMs:number;
  latestOriginalExpiryMs:number;
  unresolvedIncidentIds:readonly number[];
  incident31:Readonly<{
    id:number;occurredAtMs:number;cause:string;resolved:boolean;
    kind:string;reason:string;providerDeleteVerified:boolean;
    runtimeCleanupVerified:boolean;probeId:number;budgetDayId:string;
  }> | null;
  incident32:Readonly<{
    id:number;occurredAtMs:number;cause:string;resolved:boolean;
    kind:string;probeId:number;
    budgetDayId:string|null;
  }> | null;
  probeId:number;icao:string;probeStatus:string;
  probeReconciliation:string;probeStopReason:string;
  probeDurationCensored:boolean;probeSessionExact:boolean;
  historicalExternalCredits:number;historicalReceivedCredits:number;
  historicalCreditGap:number;
  budgetId:string;budgetState:string;budgetCapCredits:number;
  budgetClosedAtIsNull:boolean;
  globallyOpenBudgetDays:number;probesInBudget:number;
  activeOrSettlingProbes:number;
  currentActiveProviderSubscriptions:number;
  currentActiveBillableSubscriptions:number;
  globalRuntimeSessions:number;
  historicalRuntimeDeliveries:number;historicalRuntimeItems:number;
  historicalCleanupJournalRows:number;
  originalReferences:number;originalShaRefs:number;
  originalMetadataBytes:number;originalTombstonedRefs:number;
  originalLiveRefs:number;originalInvalidContractRefs:number;
}>;
export type P25AdministrativeCloseoutDecisionV39 = Readonly<{
  eligible:boolean;
  blockers:readonly string[];
  closeOnlyBudget:"P2G-S1-20261013-03";
  closeOnlyIncidents:readonly [31,32];
  preserveProbeId:19;
  preserveProbeStatus:"failed";
  preserveReconciliation:"DELIVERY_GAP";
  historicalMissingCredits:2;
  paidPhase6Authorized:false;
  signedWebhookTestAuthorized:false;
}>;

export function assessP25PairedAdministrativeCloseoutV39(
 w:P25AdministrativeCloseoutWitnessV39
):P25AdministrativeCloseoutDecisionV39 {
 const blockers:string[]=[];
 const I31_TIME=Date.parse("2026-10-13T05:02:49.928Z");
 const I32_TIME=Date.parse("2026-10-13T05:04:21.617Z");
 const BUDGET="P2G-S1-20261013-03";
 if(!Number.isSafeInteger(w.observedAtMs)||
    !Number.isSafeInteger(w.latestOriginalExpiryMs)||
    w.observedAtMs<w.latestOriginalExpiryMs)
   blockers.push("ORIGINAL_EXPIRY_NOT_CONFIRMED");
 if(w.unresolvedIncidentIds.length!==2||
    w.unresolvedIncidentIds[0]!==31||w.unresolvedIncidentIds[1]!==32)
   blockers.push("UNEXPECTED_OPEN_INCIDENT_SET");
 const a=w.incident31;
 if(!a||a.id!==31||a.occurredAtMs!==I31_TIME||
    a.cause!=="reconciliation"||a.resolved!==false||
    a.kind!=="stage1_supervisor_recovery"||
    a.reason!=="provider_subscription_isolation_lost"||
    a.providerDeleteVerified!==true||a.runtimeCleanupVerified!==false||
    a.probeId!==19||a.budgetDayId!==BUDGET)
   blockers.push("INCIDENT31_HISTORIC_FINGERPRINT_MISMATCH");
 const b=w.incident32;
 if(!b||b.id!==32||b.occurredAtMs!==I32_TIME||
    b.cause!=="reconciliation"||b.resolved!==false||
    b.kind!=="prepaid_probe_failed"||b.probeId!==19||
    (b.budgetDayId!==null&&b.budgetDayId!==BUDGET))
   blockers.push("INCIDENT32_HISTORIC_FINGERPRINT_MISMATCH");
 if(w.probeId!==19||w.icao!=="YSSY"||
    w.probeStatus!=="failed"||w.probeReconciliation!=="DELIVERY_GAP"||
    w.probeStopReason!=="external_internal_delivery_gap"||
    w.probeDurationCensored!==false||w.probeSessionExact!==true)
   blockers.push("PROBE19_SCIENTIFIC_HISTORIC_FINGERPRINT_MISMATCH");
 if(w.historicalExternalCredits!==231||w.historicalReceivedCredits!==229||
    w.historicalCreditGap!==2)
   blockers.push("ORIGINAL_231_229_CREDIT_RECONCILIATION_CHANGED");
 if(w.budgetId!==BUDGET||w.budgetState!=="OPEN"||
    w.budgetCapCredits!==500||w.budgetClosedAtIsNull!==true||
    w.globallyOpenBudgetDays!==1||w.probesInBudget!==1)
   blockers.push("EXACT_SINGLE_OPEN_P25_BUDGET_NOT_VERIFIED");
 if([w.activeOrSettlingProbes,w.currentActiveProviderSubscriptions,
    w.currentActiveBillableSubscriptions,w.globalRuntimeSessions,
    w.historicalRuntimeDeliveries,w.historicalRuntimeItems,
    w.historicalCleanupJournalRows].some(n=>n!==0))
   blockers.push("PROVIDER_OR_RUNTIME_NOT_QUIESCENT");
 if(w.originalReferences!==58||w.originalShaRefs!==58||
    w.originalMetadataBytes!==308832||w.originalTombstonedRefs!==58||
    w.originalLiveRefs!==0||w.originalInvalidContractRefs!==0)
   blockers.push("EXACT_58_ORIGINAL_TOMBSTONE_CONTRACT_NOT_VERIFIED");
 return {
  eligible:blockers.length===0,blockers,
  closeOnlyBudget:"P2G-S1-20261013-03",
  closeOnlyIncidents:[31,32],preserveProbeId:19,
  preserveProbeStatus:"failed",
  preserveReconciliation:"DELIVERY_GAP",historicalMissingCredits:2,
  paidPhase6Authorized:false,signedWebhookTestAuthorized:false
 };
}
