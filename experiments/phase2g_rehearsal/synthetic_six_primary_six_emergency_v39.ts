/**
 * P15 prospective counterfactual requested by operator:
 * SIX primary health checks, then SIX emergency checks.
 *
 * Evaluates PURE OFFLINE future governance. Does not replace real production
 * legacy-three or its current prelaunch six-plus-six verifier veto.
 * No provider, Replit, Postgres, GitHub paid owner or DNS mutation.
 *
 * Six failed GETs alone cannot prove loss, but continuing their blind-paid
 * exposure is a separate budget decision, NOT signed science.
 */
export type SixPlusSixReviewInputV39=Readonly<{
  syntheticOnly:true;
  consecutiveTransientHealthFailures:number;
  firstTransientFailureAgeMs:number;
  isHardContractIdentityOrSourceCorruption:boolean;
  frozenOwnedSessionAndOneSubscription:boolean;
  noProviderRetryOrDuplicateSubscriptions:boolean;
  prospectiveBlindCreditExposureLimitFrozen:boolean;
  worstCaseCreditsStillWithinFrozenCeiling:boolean;
  trustworthyIndependentPerAttemptSourceAndCredits:boolean;
  originalWindowBinsAndReplayDurable:boolean;
  sourceBacklogWithinFrozenBound:boolean;
  originalSourceKnownMissingOrBillingMismatch:boolean;
}>;
export type SixPlusSixReviewV39=Readonly<{
  action:"CANDIDATE_PRIMARY_MONITOR"|"CANDIDATE_EMERGENCY_MONITOR"|
    "CANDIDATE_RECOVERY_REVIEW"|"STOP_OWNER";
  phase:"PRIMARY_SIX"|"EMERGENCY_SIX"|"HEALTH_RECOVERED"|"STOPPED";
  reason:string;
  consecutiveFailures:number;
  sourceCompletenessNotYetCertified:true;
  originalF8SciencePassAuthorized:false;
  paidSixPlusSixEnabled:false;
  paidLaunchAuthorized:false;
}>;
const valid=(n:number)=>Number.isSafeInteger(n)&&n>=0;
export function reviewSixPrimarySixEmergencyV39(
  v:SixPlusSixReviewInputV39
):SixPlusSixReviewV39{
  if(v.syntheticOnly!==true||
     !valid(v.consecutiveTransientHealthFailures)||
     !valid(v.firstTransientFailureAgeMs))
    throw Error("SIX_PLUS_SIX_COUNTERFACTUAL_INPUT_INVALID");
  const n=v.consecutiveTransientHealthFailures;
  const result=(phase:SixPlusSixReviewV39["phase"],
    action:SixPlusSixReviewV39["action"],
    reason:string):SixPlusSixReviewV39=>({
      action,phase,reason,consecutiveFailures:n,
      sourceCompletenessNotYetCertified:true,
      originalF8SciencePassAuthorized:false,
      paidSixPlusSixEnabled:false,paidLaunchAuthorized:false
    });
  const stop=(why:string)=>result("STOPPED","STOP_OWNER",why);
  if(v.isHardContractIdentityOrSourceCorruption)
    return stop("HARD_CONTRACT_OR_SOURCE_VIOLATION");
  if(!v.frozenOwnedSessionAndOneSubscription||
     !v.noProviderRetryOrDuplicateSubscriptions)
    return stop("PROVIDER_SINGLE_OWNER_OR_RETRY_INVARIANT_BROKEN");
  if(!v.prospectiveBlindCreditExposureLimitFrozen||
     !v.worstCaseCreditsStillWithinFrozenCeiling)
    return stop("PROSPECTIVE_BLIND_PAID_EXPOSURE_OR_BUDGET_NOT_APPROVED");
  if(v.originalSourceKnownMissingOrBillingMismatch)
    return stop("KNOWN_SOURCE_OR_PROVIDER_BILLING_GAP");
  if(n===0)
    return result("HEALTH_RECOVERED","CANDIDATE_RECOVERY_REVIEW",
      "HEALTH_ONLY_NOT_PROOF_OF_SOURCE_COMPLETENESS");
  if(v.firstTransientFailureAgeMs>=180000)
    return stop("THREE_MINUTE_TOTAL_OUTAGE_CEILING");
  if(n>=12)
    return stop("ALL_SIX_PLUS_SIX_CHECKS_CONSUMED");
  if(n<=6)
    return result("PRIMARY_SIX","CANDIDATE_PRIMARY_MONITOR",
      "TRANSIENT_GET_HEALTH_WITH_FROZEN_BLIND_PAID_RISK_NOT_SCIENCE_PASS");
  if(!v.trustworthyIndependentPerAttemptSourceAndCredits||
     !v.originalWindowBinsAndReplayDurable||
     !v.sourceBacklogWithinFrozenBound)
    return stop("EMERGENCY_SIX_UNVERIFIED_INDEPENDENT_SOURCE_OR_REPLAY");
  return result("EMERGENCY_SIX","CANDIDATE_EMERGENCY_MONITOR",
    "EVIDENCE_GATED_EMERGENCY_CHECK_NOT_SCIENTIFIC_PASS");
}
