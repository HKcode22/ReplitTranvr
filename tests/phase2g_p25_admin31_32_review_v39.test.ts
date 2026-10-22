import {describe,it,expect} from "vitest";
import {assessP25AdministrativeReviewV39 as assess,
 type P25AdminWitnessV39} from
 "../server/lib/disruption/p25AdminCloseoutReview_v39";
const base:P25AdminWitnessV39={
 nowMs:Date.parse("2026-10-22T08:30:00Z"),
 latestBlobExpiryMs:Date.parse("2026-10-20T05:02:12.501Z"),
 probeId:19,probeIcao:"YSSY",probeStage:1,
 probeStatus:"failed",probeReconciliation:"DELIVERY_GAP",
 probeStopReason:"external_internal_delivery_gap",
 probeCensored:false,exactSession:true,runtimeCleanupTimestampIsNull:true,
 externalCredits:231,internalCredits:229,deliveryGapCredits:2,
 budgetState:"OPEN",budgetCap:500,budgetClosedAtIsNull:true,
 openBudgetCount:1,activeProbeCount:0,runtimeSessions:0,
 runtimeDeliveries:0,runtimeItems:0,activeBillableSubscriptions:0,
 unendedV39Subscriptions:0,incidentOpenIds:[31,32],
 incident31Fingerprint:true,incident32Fingerprint:true,
 refCount:58,refShaCount:58,refBytes:308832,tombstones:58,
 unmarkedRefs:0,deletionRunCount:1,rowsInDeletionRun:58,invalidContractCount:0
};
describe("P25 YSSY probe19 exact historical administrative REVIEW only",()=>{
 it("successful evidence remains strictly REVIEW, never a write/paid/science PASS",()=>{
   expect(assess(base)).toEqual({
     eligibleForReview:true,blockers:[],
     historicalProtocolPassed:false,scientificReconciliation:"DELIVERY_GAP",
     originalGapCredits:2,paidAuthorization:false,databaseWriteAuthorized:false
   });
 });
 it("refuses replacing historical 2-credit gap with MATCH",()=>{
   for(const x of [{externalCredits:229},{internalCredits:231},
      {deliveryGapCredits:0},{probeReconciliation:"MATCH"},
      {probeStatus:"completed"}])
     expect(assess({...base,...x}).eligibleForReview).toBe(false);
 });
 it("refuses missing/foreign incident or missing cleanup evidence",()=>{
   for(const x of [{incidentOpenIds:[31]},
     {incidentOpenIds:[31,33]},{incident32Fingerprint:false},
     {incident31Fingerprint:false},{tombstones:57},{refCount:59},
     {rowsInDeletionRun:57},{deletionRunCount:2}])
     expect(assess({...base,...x}).eligibleForReview).toBe(false);
 });
 it("refuses active subscriptions, runtime, unexpected budget state",()=>{
   for(const x of [{activeBillableSubscriptions:1},
     {unendedV39Subscriptions:1},{runtimeItems:1},{activeProbeCount:1},
     {budgetState:"CLOSED"},{openBudgetCount:0},{budgetCap:1900}])
     expect(assess({...base,...x}).eligibleForReview).toBe(false);
 });
 it("refuses before retention expiry, altered session or cleanup timestamp",()=>{
   for(const x of [{nowMs:base.latestBlobExpiryMs-1},
     {exactSession:false},{runtimeCleanupTimestampIsNull:false},
     {invalidContractCount:1}])
     expect(assess({...base,...x}).eligibleForReview).toBe(false);
 });
});
