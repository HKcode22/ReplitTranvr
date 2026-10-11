/**
 * P15 prospective SIX PRIMARY + SIX CONTINGENCY callback health watchdog.
 *
 * Pure production-shaped fail-closed state machine. This is not a replacement
 * for actual provider/source evidence, an approved scientific amendment or an
 * authenticated external attribution service. No provider calls or DB writes.
 *
 * Default supervisor policy is unchanged (three consecutive failures).
 * A 6+6 candidate never receives 12 checks without a freshly verified
 * independent provider/source evidence witness supplied by a separate trusted
 * verifier; production currently provides NONE, so it stops by check three.
 */
export type Stage1CallbackWatchdogModeV39 =
  "legacy-three" | "six-plus-six-candidate";
export type Stage1SanitizedCallbackHealthV39 = Readonly<{
  healthy:boolean;check:string;reason:string;
  http_status:number|null;elapsed_ms:number;
}>;
/**
 * This interface MUST be constructed by a verifier with independent,
 * frozen signed source and provider attempt ledger. Do not populate this
 * object from user-supplied environment flags, a synthetic source manifest,
 * HTTP GET health, a local DB alone, or unsigned webhook payload.
 */
export type Stage1IndependentlyVerifiedOutageWitnessV39 = Readonly<{
  evidenceVerifiedByIndependentSource:boolean;
  providerSubscriptionAndOwnerMatched:boolean;
  oneActiveOwner:boolean;
  senderAttemptCount:number;
  originalSourceAttemptCount:number;
  senderBilledCredits:number;
  originalSourceAttributedCredits:number;
  sourceUtcAndWireShaVerified:boolean;
  fullOriginalBytesReadBack:boolean;
  rawRetentionHours:number;
  everyPhysicalFlightV2Reconstructible:boolean;
  originalElapsed15mBucketsPreserved:boolean;
  currentSenderWatermarkComplete:boolean;
  receiverUnloggedRestartReconstructible:boolean;
  currentEvidenceAgeSeconds:number;
  queueBacklogAgeSeconds:number;
  queueRetentionSeconds:number;
  providerMaxDeliveryRetries:0;
  projectedWorstCaseTotalCredits:number;
  frozenCreditCeiling:number;
}>;
export type Stage1WatchdogStateV39=Readonly<{
  consecutiveFailures:number;
  firstFailureMonotonicMs:number|null;
  maximumFailures:number;
  recoveredHealthAwaitingScienceAudit:boolean;
  terminated:boolean;
}>;
export type Stage1WatchdogDecisionV39=Readonly<{
  state:Stage1WatchdogStateV39;
  mode:Stage1CallbackWatchdogModeV39;
  action:"MONITOR"|"STOP_OWNER";
  phase:"HEALTHY"|"LEGACY_PENDING"|"PRIMARY"|"CONTINGENT"|"TERMINATED";
  reason:string;
  independentSourceProvenForThisCheck:boolean;
  scientificPassAuthorized:false;
  paidLaunchAuthorized:false;
}>;
export const STAGE1_WATCHDOG_POLL_MS_V39=15_000 as const;
export const STAGE1_SIX_PLUS_SIX_PRIMARY_V39=6 as const;
export const STAGE1_SIX_PLUS_SIX_CONTINGENT_V39=6 as const;
export const STAGE1_SIX_PLUS_SIX_MAX_CONSECUTIVE_V39=12 as const;
/** Wall-clock ceiling may stop earlier than check 12 if polling is slow. */
export const STAGE1_SIX_PLUS_SIX_WALL_MS_V39=180_000 as const;
export const initialStage1WatchdogStateV39=():Stage1WatchdogStateV39=>({
  consecutiveFailures:0,firstFailureMonotonicMs:null,
  maximumFailures:0,recoveredHealthAwaitingScienceAudit:false,
  terminated:false
});
const isInteger=(v:unknown)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0;
const stages=new Set([
  "wrong_secret_route","published_runtime","webhook_secret_binding",
  "runtime_db_binding"
]);
const mismatches:Record<string,string>={
  wrong_secret_route:"route_contract_mismatch",
  published_runtime:"runtime_contract_or_http_mismatch",
  webhook_secret_binding:"secret_binding_contract_or_http_mismatch",
  runtime_db_binding:"database_binding_contract_or_http_mismatch"
};
function classify(h:Stage1SanitizedCallbackHealthV39):
  "HEALTHY"|"TRANSIENT"|"HARD"{
  if(!h||typeof h.healthy!=="boolean"||
     !Number.isFinite(h.elapsed_ms)||h.elapsed_ms<0||
     typeof h.check!=="string"||typeof h.reason!=="string"||
     !(h.http_status===null||
       (isInteger(h.http_status)&&h.http_status>=100&&h.http_status<=599)))
    return "HARD";
  if(h.healthy)
    return h.check==="all_checks"&&h.reason==="ok"&&
      h.http_status===200?"HEALTHY":"HARD";
  if(!stages.has(h.check))return "HARD";
  if(["request_timeout","network_or_request_error"].includes(h.reason)&&
     h.http_status===null)return "TRANSIENT";
  if(mismatches[h.check]===h.reason&&
     [502,503,504].includes(h.http_status??0))return "TRANSIENT";
  return "HARD";
}
export function independentOutageWitnessReasonV39(
  e:Stage1IndependentlyVerifiedOutageWitnessV39|undefined
):string|null{
  if(!e)return "INDEPENDENT_PROVIDER_SOURCE_EVIDENCE_NOT_AVAILABLE";
  if(![
    e.senderAttemptCount,e.originalSourceAttemptCount,
    e.senderBilledCredits,e.originalSourceAttributedCredits,
    e.rawRetentionHours,e.currentEvidenceAgeSeconds,
    e.queueBacklogAgeSeconds,e.queueRetentionSeconds,
    e.projectedWorstCaseTotalCredits,e.frozenCreditCeiling
  ].every(isInteger)||e.providerMaxDeliveryRetries!==0)
    return "SOURCE_WITNESS_SCHEMA_OR_PROVIDER_RETRY_CONTRACT_INVALID";
  if(!e.evidenceVerifiedByIndependentSource)
    return "INDEPENDENT_PROVIDER_SOURCE_EVIDENCE_NOT_VERIFIED";
  if(!e.providerSubscriptionAndOwnerMatched||!e.oneActiveOwner)
    return "SOURCE_WITNESS_OWNER_OR_PROVIDER_SUBSCRIPTION_MISMATCH";
  if(e.senderAttemptCount!==e.originalSourceAttemptCount||
     e.senderBilledCredits!==e.originalSourceAttributedCredits)
    return "SOURCE_WITNESS_PROVIDER_ATTEMPT_OR_CREDIT_GAP";
  if(!e.sourceUtcAndWireShaVerified||!e.fullOriginalBytesReadBack||
     e.rawRetentionHours<168)
    return "SOURCE_WITNESS_ORIGINAL_RAW_OR_UTC_LOST";
  if(!e.everyPhysicalFlightV2Reconstructible||
     !e.originalElapsed15mBucketsPreserved||
     !e.receiverUnloggedRestartReconstructible)
    return "SOURCE_WITNESS_SCIENTIFIC_RECOVERY_INCOMPLETE";
  if(!e.currentSenderWatermarkComplete||e.currentEvidenceAgeSeconds>30)
    return "SOURCE_WITNESS_CURRENT_PROVIDER_WATERMARK_STALE";
  if(e.queueRetentionSeconds<=e.queueBacklogAgeSeconds||
     e.queueBacklogAgeSeconds>600)
    return "SOURCE_WITNESS_BACKLOG_EXPIRED_OR_UNBOUNDED";
  if(e.projectedWorstCaseTotalCredits>e.frozenCreditCeiling)
    return "SOURCE_WITNESS_BUDGET_BOUND_EXCEEDED";
  return null;
}
export function advanceStage1WatchdogV39(input:Readonly<{
  mode:Stage1CallbackWatchdogModeV39;
  previous:Stage1WatchdogStateV39;
  health:Stage1SanitizedCallbackHealthV39;
  nowMonotonicMs:number;
  /** Production cannot supply this until independent original-source
      and billable-provider evidence genuinely exist. */
  evidence?:Stage1IndependentlyVerifiedOutageWitnessV39;
}>):Stage1WatchdogDecisionV39{
  const {mode,previous:p,health,nowMonotonicMs:now}=input;
  if(!["legacy-three","six-plus-six-candidate"].includes(mode)||
     !p||!isInteger(p.consecutiveFailures)||!isInteger(p.maximumFailures)||
     p.maximumFailures<p.consecutiveFailures||
     !(p.firstFailureMonotonicMs===null||
       (Number.isFinite(p.firstFailureMonotonicMs)&&
        p.firstFailureMonotonicMs>=0&&
        p.firstFailureMonotonicMs<=now))||
     !Number.isFinite(now)||now<0||
     typeof p.recoveredHealthAwaitingScienceAudit!=="boolean"||
     typeof p.terminated!=="boolean")
    throw Error("P15_WATCHDOG_INVALID_OR_NONMONOTONIC_STATE");
  if(p.terminated)return {
    state:p,mode,action:"STOP_OWNER",phase:"TERMINATED",
    reason:"ALREADY_TERMINATED",independentSourceProvenForThisCheck:false,
    scientificPassAuthorized:false,paidLaunchAuthorized:false
  };
  const kind=classify(health);
  const stop=(reason:string,count:number,first:number|null):Stage1WatchdogDecisionV39=>({
    mode,action:"STOP_OWNER",phase:"TERMINATED",reason,
    state:{
      consecutiveFailures:count,firstFailureMonotonicMs:first,
      maximumFailures:Math.max(p.maximumFailures,count),
      recoveredHealthAwaitingScienceAudit:p.recoveredHealthAwaitingScienceAudit,
      terminated:true
    },
    independentSourceProvenForThisCheck:false,
    scientificPassAuthorized:false,paidLaunchAuthorized:false
  });
  if(kind==="HARD"&&mode!=="legacy-three")
    return stop("HARD_CALLBACK_CONTRACT_OR_IDENTITY_VIOLATION",
      p.consecutiveFailures,p.firstFailureMonotonicMs);
  if(kind==="HEALTHY"){
    return {
      mode,action:"MONITOR",phase:"HEALTHY",
      reason:p.consecutiveFailures?
        "HEALTH_RECOVERED_SCIENTIFIC_AUDIT_STILL_PENDING":"HEALTHY",
      state:{
        consecutiveFailures:0,firstFailureMonotonicMs:null,
        maximumFailures:p.maximumFailures,
        recoveredHealthAwaitingScienceAudit:
          p.recoveredHealthAwaitingScienceAudit||p.consecutiveFailures>0,
        terminated:false
      },
      independentSourceProvenForThisCheck:false,
      scientificPassAuthorized:false,paidLaunchAuthorized:false
    };
  }
  const count=p.consecutiveFailures+1;
  const first=p.firstFailureMonotonicMs??now;
  const duration=now-first;
  if(mode==="legacy-three"){
    if(count>=3)return stop("LEGACY_THREE_CONSECUTIVE_CALLBACK_FAILURES",count,first);
    return {
      mode,action:"MONITOR",phase:"LEGACY_PENDING",reason:"LEGACY_MONITOR",
      state:{...p,consecutiveFailures:count,firstFailureMonotonicMs:first,
        maximumFailures:Math.max(p.maximumFailures,count)},
      independentSourceProvenForThisCheck:false,
      scientificPassAuthorized:false,paidLaunchAuthorized:false
    };
  }
  // A verified witness can justify *continuing* but does not prove the
  // scientific 120-minute experiment PASS. Any known negative evidence
  // (provider attempts, credits, identity, retention, budget) stops early.
  const evidenceReason=independentOutageWitnessReasonV39(input.evidence);
  if(evidenceReason&&input.evidence)
    return stop(evidenceReason,count,first);
  if(duration>=STAGE1_SIX_PLUS_SIX_WALL_MS_V39)
    return stop("SIX_PLUS_SIX_WALL_CLOCK_MAX_EXCEEDED",count,first);
  if(count>=STAGE1_SIX_PLUS_SIX_MAX_CONSECUTIVE_V39)
    return stop("TWELVE_CONSECUTIVE_HEALTH_FAILURES",count,first);
  if(evidenceReason&&count>=3)
    return stop("NO_EXTENSION_WITHOUT_AUTHENTICATED_SOURCE_AND_CREDITS",count,first);
  return {
    mode,action:"MONITOR",phase:count<=6?"PRIMARY":"CONTINGENT",
    reason:evidenceReason??(count<=6?"PRIMARY_SIX_MONITORING":"CONTINGENT_SIX_MONITORING"),
    state:{
      consecutiveFailures:count,firstFailureMonotonicMs:first,
      maximumFailures:Math.max(count,p.maximumFailures),
      recoveredHealthAwaitingScienceAudit:p.recoveredHealthAwaitingScienceAudit,
      terminated:false
    },
    independentSourceProvenForThisCheck:!evidenceReason,
    scientificPassAuthorized:false,paidLaunchAuthorized:false
  };
}
