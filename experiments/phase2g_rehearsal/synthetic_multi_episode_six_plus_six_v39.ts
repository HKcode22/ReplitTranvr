/**
 * P15/P17: pure synthetic PER-OUTAGE 6-primary + 6-emergency model.
 *
 * Operator proposal: a NEW outage after real recovery gets its own six plus
 * six, not the remainder of an earlier episode. Industry-style SRE error
 * budgets require *cumulative* exposure NOT to reset. "GET health recovered"
 * does NOT imply originally sent provider flight items were received.
 *
 * TEST MODEL ONLY. Not imported by the paid owner, not scientific F.8,
 * not an authenticated sender ledger, not an approved 6+6 amendment.
 * Does not issue HTTP, GitHub, PostgreSQL or AeroDataBox calls.
 */
export type EpisodeProbeV39=Readonly<{
  atMonotonicMs:number;
  health:"FULLY_HEALTHY"|"TRANSIENT_FAILURE"|"HARD_CONTRACT_FAILURE";
  // Never use synthetic boolean fields as actual independent evidence.
  originalSenderItemCreditWitnessVerified:boolean;
  originalSourceAndEightBinsRecoverable:boolean;
  oneOwnerAndBudgetInvariantPreserved:boolean;
}>;
export type EpisodeFrozenPolicyV39=Readonly<{
  pollMs:15000;
  maxIndividualFaultEnvelopeMs:number;
  maxCumulativeFaultEnvelopeMs:number;
  maxEpisodes:number;
  prospectiveBlindPaidRiskAndCreditCeilingApproved:boolean;
  requireEvidenceForEmergencyChecks:true;
}>;
export type EpisodeStateV39=Readonly<{
  lastProbeAtMs:number;
  lastFullyHealthyAtMs:number|null;
  firstFailedAtMs:number|null;
  precedingHealthyAtMs:number|null;
  consecutiveFailures:number;
  healthyRecoveryStreak:number;
  episodeCount:number;
  cumulativeFaultEnvelopeMs:number;
  closedEpisodeFaultEnvelopeMs:readonly number[];
  terminated:boolean;
  historicalMissingSourceStillUnproven:boolean;
}>;
export type EpisodeOutcomeV39=Readonly<{
  action:"MONITOR"|"RECOVERY_CONFIRMATION"|"STOP_OWNER";
  reason:string;
  phase:"NORMAL"|"PRIMARY"|"EMERGENCY"|"RECOVERY_PENDING"|"TERMINATED";
  state:EpisodeStateV39;
  currentFaultEnvelopeMs:number;
  cumulativeObservedOrPotentialFaultEnvelopeMs:number;
  paid6Plus6Authorized:false;
  originalF8SciencePassAuthorized:false;
}>;
export const initialEpisodeStateV39=(atMonotonicMs:number):EpisodeStateV39=>{
  if(!Number.isSafeInteger(atMonotonicMs)||atMonotonicMs<0)
    throw Error("EPISODE_INITIAL_MONOTONIC_TIME_INVALID");
  return {
    lastProbeAtMs:atMonotonicMs,lastFullyHealthyAtMs:atMonotonicMs,
    firstFailedAtMs:null,precedingHealthyAtMs:null,
    consecutiveFailures:0,healthyRecoveryStreak:0,episodeCount:0,
    cumulativeFaultEnvelopeMs:0,closedEpisodeFaultEnvelopeMs:[],
    terminated:false,historicalMissingSourceStillUnproven:false
  };
};
const nat=(n:unknown):n is number=>
  typeof n==="number"&&Number.isSafeInteger(n)&&n>=0;
export function advanceHypotheticalMultipleOutagesV39(input:{
  policy:EpisodeFrozenPolicyV39;previous:EpisodeStateV39;probe:EpisodeProbeV39;
}):EpisodeOutcomeV39{
  const {policy:p,previous:before,probe:q}=input;
  if(p.pollMs!==15000||!nat(p.maxIndividualFaultEnvelopeMs)||
     p.maxIndividualFaultEnvelopeMs<15000||p.maxIndividualFaultEnvelopeMs>180000||
     !nat(p.maxCumulativeFaultEnvelopeMs)||
     p.maxCumulativeFaultEnvelopeMs<p.maxIndividualFaultEnvelopeMs||
     !nat(p.maxEpisodes)||p.maxEpisodes<1||p.maxEpisodes>100||
     p.requireEvidenceForEmergencyChecks!==true||
     typeof p.prospectiveBlindPaidRiskAndCreditCeilingApproved!=="boolean"||
     !nat(q.atMonotonicMs)||!nat(before.lastProbeAtMs)||
     q.atMonotonicMs<=before.lastProbeAtMs||
     !nat(before.episodeCount)||!nat(before.cumulativeFaultEnvelopeMs)||
     !nat(before.consecutiveFailures)||!nat(before.healthyRecoveryStreak)||
     !Array.isArray(before.closedEpisodeFaultEnvelopeMs)||
     (before.lastFullyHealthyAtMs!==null&&!nat(before.lastFullyHealthyAtMs))||
     (before.firstFailedAtMs!==null&&!nat(before.firstFailedAtMs))||
     (before.precedingHealthyAtMs!==null&&!nat(before.precedingHealthyAtMs))||
     !["FULLY_HEALTHY","TRANSIENT_FAILURE","HARD_CONTRACT_FAILURE"].includes(q.health))
    throw Error("EPISODE_PROBE_OR_POLICY_INVALID");
  const currentEnvelope=before.firstFailedAtMs===null?0:
    q.atMonotonicMs-(before.precedingHealthyAtMs??before.firstFailedAtMs);
  const exposure=before.cumulativeFaultEnvelopeMs+currentEnvelope;
  const stateBase={...before,lastProbeAtMs:q.atMonotonicMs};
  const result=(state:EpisodeStateV39,phase:EpisodeOutcomeV39["phase"],
    action:EpisodeOutcomeV39["action"],reason:string,
    current:number=currentEnvelope,total:number=exposure):EpisodeOutcomeV39=>({
      state,phase,action,reason,currentFaultEnvelopeMs:current,
      cumulativeObservedOrPotentialFaultEnvelopeMs:total,
      paid6Plus6Authorized:false,originalF8SciencePassAuthorized:false
    });
  const stop=(reason:string,current:number=currentEnvelope,total:number=exposure)=>
    result({...stateBase,terminated:true},"TERMINATED","STOP_OWNER",reason,current,total);
  if(before.terminated)return stop("PREVIOUS_EPISODE_ALREADY_TERMINATED");
  if(q.health==="HARD_CONTRACT_FAILURE")
    return stop("HARD_CALLBACK_CONTRACT_OR_IDENTITY_VIOLATION");
  if(!q.oneOwnerAndBudgetInvariantPreserved)
    return stop("SINGLE_OWNER_CREDITS_OR_BUDGET_INVALID");
  if(q.atMonotonicMs-before.lastProbeAtMs>p.pollMs*3)
    return stop("WATCHDOG_MONITOR_SCHEDULING_GAP_UNBOUNDED");
  if(before.firstFailedAtMs!==null&&
     (currentEnvelope>p.maxIndividualFaultEnvelopeMs||
      exposure>p.maxCumulativeFaultEnvelopeMs))
    return stop("PER_EPISODE_OR_CUMULATIVE_ERROR_BUDGET_EXHAUSTED");
  if(q.health==="FULLY_HEALTHY"){
    if(before.firstFailedAtMs===null)
      return result({...stateBase,lastFullyHealthyAtMs:q.atMonotonicMs},
        "NORMAL","MONITOR","HEALTH_STABLE",0,before.cumulativeFaultEnvelopeMs);
    const signedSource=q.originalSenderItemCreditWitnessVerified&&
      q.originalSourceAndEightBinsRecoverable;
    const streak=before.healthyRecoveryStreak+1;
    // A genuinely verified sender-source continuity can justify an
    // immediate recovered episode. GET-only recovery requires two healthy
    // cycles (half-open -> closed); the data remain scientifically CENSORED.
    if(!signedSource&&streak<2)
      return result({...stateBase,healthyRecoveryStreak:streak,
        historicalMissingSourceStillUnproven:true},
        "RECOVERY_PENDING","RECOVERY_CONFIRMATION",
        "FIRST_HEALTHY_GET_NOT_YET_STABLE_OR_SOURCE_VERIFIED");
    const span=currentEnvelope;
    const finalized=before.cumulativeFaultEnvelopeMs+span;
    return result({
      ...stateBase,
      lastFullyHealthyAtMs:q.atMonotonicMs,
      firstFailedAtMs:null,precedingHealthyAtMs:null,
      consecutiveFailures:0,healthyRecoveryStreak:0,
      cumulativeFaultEnvelopeMs:finalized,
      closedEpisodeFaultEnvelopeMs:[...before.closedEpisodeFaultEnvelopeMs,span],
      historicalMissingSourceStillUnproven:
        before.historicalMissingSourceStillUnproven||!signedSource
    },"NORMAL","MONITOR",signedSource?
      "SOURCE_VERIFIED_EPISODE_CLOSED_FRESH_SIX_PLUS_SIX_NEXT_OUTAGE":
      "HEALTH_ONLY_RECOVERED_SCIENCE_STILL_UNVERIFIED_FRESH_EPISODE_CHECKS");
  }
  // Only transient health failure reaches here.
  const isNewEpisode=before.firstFailedAtMs===null;
  const episodeCount=before.episodeCount+(isNewEpisode?1:0);
  if(episodeCount>p.maxEpisodes)
    return stop("FROZEN_MAX_OUTAGE_EPISODES_EXCEEDED");
  const firstFailedAtMs=isNewEpisode?q.atMonotonicMs:before.firstFailedAtMs;
  const precedingHealthyAtMs=isNewEpisode?before.lastFullyHealthyAtMs:
    before.precedingHealthyAtMs;
  if(precedingHealthyAtMs===null)
    return stop("NO_PRE_OUTAGE_HEALTH_OBSERVATION");
  const current=q.atMonotonicMs-precedingHealthyAtMs;
  const all=before.cumulativeFaultEnvelopeMs+current;
  if(current>p.maxIndividualFaultEnvelopeMs||
     all>p.maxCumulativeFaultEnvelopeMs)
    return stop("PER_EPISODE_OR_CUMULATIVE_ERROR_BUDGET_EXHAUSTED",current,all);
  if(!p.prospectiveBlindPaidRiskAndCreditCeilingApproved)
    return stop("NO_PROSPECTIVE_BLIND_PAID_CREDIT_RISK_APPROVAL",current,all);
  const n=before.consecutiveFailures+1;
  if(n>=12)return stop("TWELVE_CONSECUTIVE_HEALTH_FAILURES",current,all);
  const state:EpisodeStateV39={
    ...stateBase,episodeCount,firstFailedAtMs,precedingHealthyAtMs,
    consecutiveFailures:n,healthyRecoveryStreak:0,
    historicalMissingSourceStillUnproven:true
  };
  if(n<=6)return result(state,"PRIMARY","MONITOR","PRIMARY_SIX_"+n,
    current,all);
  if(!q.originalSenderItemCreditWitnessVerified||
     !q.originalSourceAndEightBinsRecoverable)
    return stop("EMERGENCY_SIX_REQUIRES_INDEPENDENT_SOURCE_CONTINUITY",current,all);
  return result(state,"EMERGENCY","MONITOR","EMERGENCY_SIX_"+n,
    current,all);
}
