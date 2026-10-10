/**
 * P15/R1: user-proposed SIX primary health observations + FOUR contingency.
 * ISOLATED SYNTHETIC POLICY ONLY. This is NOT the paid Stage-1 watchdog.
 *
 * Importantly, "health restored" != "original billable data preserved".
 * One failed GET is not a missing-flight observation, and ten successful GETs
 * are not a verified scientific dataset. No live permissions are returned.
 *
 * Conditional grace is allowed only while independently attested original
 * immutable source/owner evidence is complete at a current watermark,
 * retention/queue capacity is bounded, and active paid exposure is inside
 * an already-frozen budget. This model currently consumes declarations;
 * production evidence verifier/ingress remains UNIMPLEMENTED.
 */
export type SixPlusFourHealthV39=
  "healthy"|"transient_timeout"|"transient_network_error"|
  "transient_http_502_503_504"|"bad_secret"|"wrong_build"|
  "wrong_subscriber_owner"|"db_identity_or_lifecycle_violation"|
  "webhook_contract_violation";
export type SixPlusFourEvidenceV39=Readonly<{
  sourceEvidenceIndependentlyAuthenticated:boolean;
  currentSenderWatermarkComplete:boolean;
  senderAttemptCount:number;
  durableExactAttemptCount:number;
  senderAttemptCredits:number;
  durableExactAttemptCredits:number;
  unambiguousFirstEdgeUtcAndWireSha:boolean;
  fullOriginalBytesReadBackVerified:boolean;
  rawRetentionHours:number;
  originalPhysicalFlightV2Continuity:boolean;
  /** Validate elapsed 15m buckets only; future bins do not yet exist. */
  elapsedScientificBinsThroughWatermarkVerified:boolean;
  signedOwnerAndSubscriptionMatch:boolean;
  oneActiveOwnerLease:boolean;
  unloggedRecoverySourceComplete:boolean;
  durableQueueAvailable:boolean;
  queueBacklogAgeSeconds:number;
  queueRetentionSeconds:number;
  providerMaxDeliveryRetries:0;
  frozenCreditCeiling:number;
  independentEstimatedUpperBoundSpend:number;
  currentEvidenceAgeSeconds:number;
}>;
export type SixPlusFourSampleV39=Readonly<{
  health:SixPlusFourHealthV39;
  evidence:SixPlusFourEvidenceV39;
}>;
export type SixPlusFourDecisionV39=Readonly<{
  mode:"synthetic-six-plus-four";
  primaryFailureChecks:6;
  contingencyFailureChecks:4;
  maximumConsecutiveChecks:10;
  observedChecks:number;
  maximumObservedConsecutiveFailures:number;
  stopOwner:boolean;
  stopAtIndex:number|null;
  enteredContingency:boolean;
  contingencyChecksUsed:number;
  recoveredHealth:boolean;
  state:"MONITOR_ONLY"|"PRIMARY_GRACE"|"CONTINGENCY_DEGRADED_BUT_DURABLE"|
    "HEALTH_RECOVERED_AUDIT_PENDING"|"STOP_SAFE_NO_PROOF"|
    "STOP_AT_TEN"|"STOP_HARD_CONTRACT";
  scientificAdjudication:"PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS";
  reasons:string[];
  paidLaunchAuthorized:false;
  providerRetriesChanged:false;
  liveSupervisorModified:false;
  publicationApproved:false;
}>;

const ALL=new Set<SixPlusFourHealthV39>([
  "healthy","transient_timeout","transient_network_error",
  "transient_http_502_503_504","bad_secret","wrong_build",
  "wrong_subscriber_owner","db_identity_or_lifecycle_violation",
  "webhook_contract_violation"
]);
const SOFT=new Set<SixPlusFourHealthV39>([
  "transient_timeout","transient_network_error","transient_http_502_503_504"
]);
const integer=(v:unknown)=>typeof v==="number"&&
  Number.isSafeInteger(v)&&v>=0;
function evidenceReason(x:SixPlusFourEvidenceV39):string|null{
  if(!x.signedOwnerAndSubscriptionMatch||!x.oneActiveOwnerLease)
    return "OWNER_OR_PROVIDER_SUBSCRIPTION_NOT_ATTESTED";
  // A KNOWN signed-source count or billed-credit gap must win over a
  // simultaneous missing/stale watermark classification. A green health
  // endpoint must never suppress this hard violation.
  if(x.senderAttemptCount!==x.durableExactAttemptCount||
     x.senderAttemptCredits!==x.durableExactAttemptCredits)
    return "ATTEMPT_OR_BILLING_GAP";
  if(!x.sourceEvidenceIndependentlyAuthenticated||
     !x.currentSenderWatermarkComplete)
    return "SENDER_WATERMARK_NOT_INDEPENDENTLY_ATTESTED";
  if(!x.unambiguousFirstEdgeUtcAndWireSha||
     !x.fullOriginalBytesReadBackVerified||x.rawRetentionHours<168)
    return "ORIGINAL_RAW_SOURCE_OR_UTC_NOT_DURABLE";
  if(!x.originalPhysicalFlightV2Continuity||
     !x.elapsedScientificBinsThroughWatermarkVerified||
     !x.unloggedRecoverySourceComplete)
    return "ORIGINAL_SCIENTIFIC_IDENTITY_NOT_RECONSTRUCTIBLE";
  if(!x.durableQueueAvailable||
     x.queueBacklogAgeSeconds>=x.queueRetentionSeconds||
     x.queueBacklogAgeSeconds>600)
    return "BACKLOG_NOT_BOUNDED_OR_EXPIRED";
  if(x.independentEstimatedUpperBoundSpend>x.frozenCreditCeiling)
    return "FROZEN_BUDGET_AT_RISK";
  // Even signed evidence can become stale while the service remains down.
  // The 30s synthetic freshness limit is deliberately stricter than grace.
  // It is an engineering TEST PARAMETER, not a frozen/live F.8 tolerance.
  if(x.currentEvidenceAgeSeconds>30)
    return "SOURCE_WATERMARK_STALE_DURING_OUTAGE";
  return null;
}
export function evaluateSyntheticSixPlusFourWatchdogV39(input:{
  mode:"synthetic-only";
  pollMs:15000;
  primaryChecks:6;
  backupChecks:4;
  samples:readonly SixPlusFourSampleV39[];
}):SixPlusFourDecisionV39{
  if(!input||input.mode!=="synthetic-only"||input.pollMs!==15000||
     input.primaryChecks!==6||input.backupChecks!==4||
     !Array.isArray(input.samples)||input.samples.length===0||
     input.samples.length>10_000)
    throw new Error("SIX_PLUS_FOUR_FROZEN_COMPARISON_INVALID");

  let count=0,peak=0,index:number|null=null,stopOwner=false,
    enteredContingency=false,recoveredHealth=false,contingencyChecksUsed=0;
  let state:SixPlusFourDecisionV39["state"]="MONITOR_ONLY";
  const reasons=new Set<string>();

  for(let i=0;i<input.samples.length;i++){
    const s=input.samples[i],e=s?.evidence;
    if(!s||!ALL.has(s.health)||!e||
       ![
         e.senderAttemptCount,e.durableExactAttemptCount,
         e.senderAttemptCredits,e.durableExactAttemptCredits,
         e.rawRetentionHours,e.queueBacklogAgeSeconds,e.queueRetentionSeconds,
         e.frozenCreditCeiling,e.independentEstimatedUpperBoundSpend,
         e.currentEvidenceAgeSeconds
       ].every(integer)||e.providerMaxDeliveryRetries!==0)
      throw new Error("SIX_PLUS_FOUR_INVALID_EVIDENCE_OR_RETRY_CONTRACT");
    const hard=s.health!=="healthy"&&!SOFT.has(s.health);
    const r=evidenceReason(e);
    // Confirmed loss/contract violations are never "just a few bad GETs".
    // Irrefutable corruption, missing original bytes, expiry, cost exposure
    // and ownership conflicts are hard vetoes EVEN IF health returns 200.
    // Merely not-yet-attested sender watermark can remain audit-pending
    // during a healthy interval, but cannot justify outage grace.
    const scientificHard=new Set([
      "ATTEMPT_OR_BILLING_GAP",
      "OWNER_OR_PROVIDER_SUBSCRIPTION_NOT_ATTESTED",
      "FROZEN_BUDGET_AT_RISK",
      "ORIGINAL_RAW_SOURCE_OR_UTC_NOT_DURABLE",
      "ORIGINAL_SCIENTIFIC_IDENTITY_NOT_RECONSTRUCTIBLE",
      "BACKLOG_NOT_BOUNDED_OR_EXPIRED"
    ]);
    if(hard||(r!==null&&scientificHard.has(r))){
      index=i;stopOwner=true;state="STOP_HARD_CONTRACT";
      reasons.add(hard?"HARD_CALLBACK_CONTRACT_INVALID":r!);break;
    }
    if(s.health==="healthy"){
      if(count>0)recoveredHealth=true;
      count=0;
      state=recoveredHealth?"HEALTH_RECOVERED_AUDIT_PENDING":"MONITOR_ONLY";
      if(r)reasons.add("HEALTH_OK_SCIENCE_STILL_NOT_ATTESTED");
      continue;
    }
    count++;peak=Math.max(peak,count);
    if(r){
      // No durable, independently fresh watermark: cannot safely extend
      // payment exposure, even though the health outage may be temporary.
      index=i;stopOwner=true;state="STOP_SAFE_NO_PROOF";reasons.add(r);
      break;
    }
    if(count<=6){
      state="PRIMARY_GRACE";
    }else if(count<=9){
      enteredContingency=true;
      contingencyChecksUsed=count-6;
      state="CONTINGENCY_DEGRADED_BUT_DURABLE";
    }else{
      enteredContingency=true;
      contingencyChecksUsed=4;
      index=i;stopOwner=true;state="STOP_AT_TEN";
      reasons.add("TEN_CONSECUTIVE_HEALTH_FAILURES");
      break;
    }
  }

  return {
    mode:"synthetic-six-plus-four",primaryFailureChecks:6,
    contingencyFailureChecks:4,maximumConsecutiveChecks:10,
    observedChecks:index===null?input.samples.length:index+1,
    maximumObservedConsecutiveFailures:peak,
    stopOwner,stopAtIndex:index,enteredContingency,contingencyChecksUsed,
    recoveredHealth,state,reasons:[...reasons].sort(),
    scientificAdjudication:"PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS",
    paidLaunchAuthorized:false,providerRetriesChanged:false,
    liveSupervisorModified:false,publicationApproved:false
  };
}
