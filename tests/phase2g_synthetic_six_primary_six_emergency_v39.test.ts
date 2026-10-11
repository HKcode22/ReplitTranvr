import {describe,expect,it} from "vitest";
import {reviewSixPrimarySixEmergencyV39 as review,
  type SixPlusSixReviewInputV39}
 from "../experiments/phase2g_rehearsal/synthetic_six_primary_six_emergency_v39";

const base=():SixPlusSixReviewInputV39=>({
  syntheticOnly:true,consecutiveTransientHealthFailures:0,
  firstTransientFailureAgeMs:0,
  isHardContractIdentityOrSourceCorruption:false,
  frozenOwnedSessionAndOneSubscription:true,
  noProviderRetryOrDuplicateSubscriptions:true,
  prospectiveBlindCreditExposureLimitFrozen:true,
  worstCaseCreditsStillWithinFrozenCeiling:true,
  trustworthyIndependentPerAttemptSourceAndCredits:false,
  originalWindowBinsAndReplayDurable:false,
  sourceBacklogWithinFrozenBound:false,
  originalSourceKnownMissingOrBillingMismatch:false
});
const ask=(patch:Partial<SixPlusSixReviewInputV39>={})=>review({...base(),...patch});
describe("Prospective SIX PRIMARY + SIX EMERGENCY, strictly synthetic",()=>{
 it("primary six can in principle replace GET three-strike only with pre-frozen credit exposure, NOT historical rule",()=>{
   for(let n=1;n<=6;n++){
     const v=ask({consecutiveTransientHealthFailures:n,
       firstTransientFailureAgeMs:(n-1)*15000});
     expect(v.action,"check "+n).toBe("CANDIDATE_PRIMARY_MONITOR");
     expect(v.phase).toBe("PRIMARY_SIX");
     expect(v.originalF8SciencePassAuthorized).toBe(false);
     expect(v.paidSixPlusSixEnabled).toBe(false);
   }
 });
 it("after sixth GET failure, first emergency check requires trustworthy source and replay, not a PostgreSQL-only count",()=>{
   const r=ask({consecutiveTransientHealthFailures:7,firstTransientFailureAgeMs:90000});
   expect(r.action).toBe("STOP_OWNER");
   expect(r.reason).toBe("EMERGENCY_SIX_UNVERIFIED_INDEPENDENT_SOURCE_OR_REPLAY");
 });
 it("verified hypothetical complete source enables checks 7-11 but never enables actual paid owner",()=>{
   for(let n=7;n<=11;n++){
     const r=ask({consecutiveTransientHealthFailures:n,
       firstTransientFailureAgeMs:(n-1)*15000,
       trustworthyIndependentPerAttemptSourceAndCredits:true,
       originalWindowBinsAndReplayDurable:true,
       sourceBacklogWithinFrozenBound:true});
     expect(r.phase).toBe("EMERGENCY_SIX");
     expect(r.action).toBe("CANDIDATE_EMERGENCY_MONITOR");
     expect(r.paidLaunchAuthorized).toBe(false);
     expect(r.sourceCompletenessNotYetCertified).toBe(true);
   }
 });
 it("after all six emergency checks owner must stop despite evidence",()=>{
   const r=ask({consecutiveTransientHealthFailures:12,firstTransientFailureAgeMs:165000,
     trustworthyIndependentPerAttemptSourceAndCredits:true,
     originalWindowBinsAndReplayDurable:true,sourceBacklogWithinFrozenBound:true});
   expect(r.action).toBe("STOP_OWNER");
   expect(r.reason).toBe("ALL_SIX_PLUS_SIX_CHECKS_CONSUMED");
 });
 it("no POST loss cannot be inferred from healthy GET recovery",()=>{
   const r=ask();
   expect(r.action).toBe("CANDIDATE_RECOVERY_REVIEW");
   expect(r.reason).toBe("HEALTH_ONLY_NOT_PROOF_OF_SOURCE_COMPLETENESS");
   expect(r.originalF8SciencePassAuthorized).toBe(false);
 });
 it("known original source loss or 260/259 style billing mismatch stops even at first health failure",()=>{
   const r=ask({consecutiveTransientHealthFailures:1,
     originalSourceKnownMissingOrBillingMismatch:true});
   expect(r.reason).toBe("KNOWN_SOURCE_OR_PROVIDER_BILLING_GAP");
 });
 it("bad callback identity/secret contract stops before primary tolerance can be used",()=>{
   const r=ask({consecutiveTransientHealthFailures:1,
     isHardContractIdentityOrSourceCorruption:true});
   expect(r.action).toBe("STOP_OWNER");
 });
 it("unfrozen extra billable exposure cannot be tolerated through first six",()=>{
   expect(ask({prospectiveBlindCreditExposureLimitFrozen:false}).action).toBe("STOP_OWNER");
   expect(ask({worstCaseCreditsStillWithinFrozenCeiling:false}).action).toBe("STOP_OWNER");
 });
 it("lost one-owner constraint or provider retries cannot be called harmless GET outage",()=>{
   expect(ask({frozenOwnedSessionAndOneSubscription:false}).action).toBe("STOP_OWNER");
   expect(ask({noProviderRetryOrDuplicateSubscriptions:false}).action).toBe("STOP_OWNER");
 });
 it("three-minute wall ceiling overrides misleading 12-check permission",()=>{
   const r=ask({consecutiveTransientHealthFailures:11,firstTransientFailureAgeMs:180000,
      trustworthyIndependentPerAttemptSourceAndCredits:true,
      originalWindowBinsAndReplayDurable:true,sourceBacklogWithinFrozenBound:true});
   expect(r.reason).toBe("THREE_MINUTE_TOTAL_OUTAGE_CEILING");
 });
 it("nonmonotonic/invalid state fails closed instead of inventing a health check",()=>{
   expect(()=>ask({consecutiveTransientHealthFailures:-1}))
     .toThrow("SIX_PLUS_SIX_COUNTERFACTUAL_INPUT_INVALID");
 });
});
