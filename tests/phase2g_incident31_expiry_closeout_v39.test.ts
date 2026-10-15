import {describe,it,expect} from "vitest";
import {assessIncident31ExpiryCloseoutV39 as check}
 from "../server/lib/disruption/phase2gIncident31ExpiryCloseout_v39";
const expiry=Date.parse("2026-10-20T05:02:12.501Z");
const w={
  observedAtMs:expiry+1,latestOriginalExpiryMs:expiry,
  incidentId:31,incidentCause:"reconciliation",incidentResolved:false,
  incidentKind:"stage1_supervisor_recovery",incidentReason:"provider_subscription_isolation_lost",
  incidentProviderDeleteVerified:true,incidentRuntimeCleanupVerified:false,
  probeId:19,probeIcao:"YSSY",probeStatus:"failed",probeReconciliation:"DELIVERY_GAP",
  probeStopReason:"external_internal_delivery_gap",probeDurationCensored:false,probeSessionExact:true,
  historicalReconciliationExternal:231,historicalReconciliationInternal:229,historicalReconciliationGap:2,
  activeOrSettlingProbes:0,openBudgetDays:0,activeBillableSubscriptions:0,
  runtimeSessions:0,runtimeDeliveries:0,runtimeItems:0,
  originalReferences:58,originalShaMetadataRefs:58,originalBytesRecorded:308832,
  deletedVerifiedReferences:58,stillLiveReferences:0,contractInvalidReferences:0
};
describe("exact P25 incident31 after-expiry disposition, not a scientific override",()=>{
  it("eligible only after all 58 originals independently deleted + billing closed",()=>{
    expect(check(w)).toEqual({eligible:true,blockers:[],
      historicalReconciliation:"DELIVERY_GAP",protocolPassed:false,rawDeletionAuthorized:false});
  });
  it("refuses before final permitted expiry even with earlier objects tombstoned",()=>{
    expect(check({...w,observedAtMs:expiry-1}).blockers).toContain("RAW_RETENTION_EXPIRY_NOT_REACHED");
  });
  it("refuses any remaining live object or absent tombstone",()=>{
    expect(check({...w,stillLiveReferences:1,deletedVerifiedReferences:57}).blockers)
      .toContain("ALL_58_ORIGINALS_NOT_VERIFIABLY_TOMBSTONED");
  });
  it("refuses any active provider, runtime or open budget",()=>{
    expect(check({...w,activeBillableSubscriptions:1}).blockers)
      .toContain("RUNTIME_OR_PROVIDER_NOT_QUIESCENT");
    expect(check({...w,runtimeSessions:1}).blockers)
      .toContain("RUNTIME_OR_PROVIDER_NOT_QUIESCENT");
    expect(check({...w,openBudgetDays:1}).blockers)
      .toContain("RUNTIME_OR_PROVIDER_NOT_QUIESCENT");
  });
  it("refuses changing historical gap or original P25 fingerprint",()=>{
    expect(check({...w,historicalReconciliationGap:0}).blockers)
      .toContain("HISTORICAL_RECONCILIATION_FINGERPRINT_MISMATCH");
    expect(check({...w,probeStatus:"completed"}).blockers)
      .toContain("HISTORICAL_PROBE19_FINGERPRINT_MISMATCH");
    expect(check({...w,incidentResolved:true}).blockers)
      .toContain("HISTORICAL_INCIDENT31_FINGERPRINT_MISMATCH");
  });
});
