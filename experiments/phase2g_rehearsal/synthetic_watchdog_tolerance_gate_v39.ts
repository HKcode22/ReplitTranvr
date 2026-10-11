/**
 * P15 / R1 isolated decision model — NEVER run as a paid supervisor.
 *
 * Frozen live contract remains 15s poll + 3 consecutive health failures +
 * provider maxDeliveryRetries=0. Candidate 6/10 tolerances are useful only
 * where independent sender, original-wire ingress, owner, clock, retained
 * raw bytes and per-flight evidence exist at every affected watermark.
 *
 * A healthy GET/secret comparison does not prove complete POST deliveries.
 * A synthetic "proofVerified" boolean is fixture testimony, not evidence
 * from any real provider or deployment. No model result authorizes launch,
 * scientific PASS, provider retries, or recovery after loss of UNLOGGED data.
 */
export type HealthClassificationV39=
  |"healthy"|"timeout"|"transport_error"|"transient_http_503"
  |"secret_binding_mismatch"|"deployed_build_mismatch"
  |"sql_binding_or_lifecycle_mismatch"|"callback_contract_invalid";
export type SimulatedDurableIngressEvidenceV39=Readonly<{
  ownerFrozenBindingVerified:boolean;
  independentSenderLedgerVerified:boolean;
  immutableFirstEdgeUtcAndWireShaVerified:boolean;
  durableFullRawBytesAndRetention168hVerified:boolean;
  allSenderAttemptsAtWatermarkMatchedToEdge:boolean;
  scientificPhysicalV2EvidenceComplete:boolean;
  originalEightBucketsStillVerifiable:boolean;
  subscriberLeaseUnique:boolean;
  senderAttemptCount:number;
  durableEdgeAttemptCount:number;
  externalSyntheticCredits:number;
  durableEdgeSyntheticCredits:number;
  maxBacklogAgeSeconds:number;
  backlogDepth:number;
  queueTimeToLiveSeconds:number;
  unloggedScientificStateKnownSafe:boolean;
}>;
export type HealthSampleV39=Readonly<{
  health:HealthClassificationV39;
  evidence:SimulatedDurableIngressEvidenceV39;
}>;
export type SupervisorToleranceCandidateV39=Readonly<{
  mode:"synthetic-only";
  pollMs:15000;
  existingFailureLimit:3;
  candidateFailureLimit:3|6|10;
  providerMaxDeliveryRetries:0;
  samples:readonly HealthSampleV39[];
}>;
export type SupervisorToleranceDecisionV39=Readonly<{
  stopPaidOwner:true|false;
  wouldStopAtHealthIndex:number|null;
  maximumObservedConsecutiveFailures:number;
  finalConsecutiveFailures:number;
  observedDegradedButDurable:boolean;
  healthRecoveredAfterTransient:boolean;
  finalState:"HEALTHY"|"MONITORING_UNCERTAIN"|
    "DEGRADED_BUT_DURABLE"|"RECOVERED_PENDING_SCIENCE_PROOF"|
    "STOPPED_FAIL_CLOSED";
  errors:string[];
  candidateDifferenceFromLiveContract:boolean;
  liveSupervisorChangeAuthorized:false;
  providerRetriesAuthorized:false;
  paidLaunchAuthorized:false;
  scientificPassAuthorized:false;
}>;
const soft=new Set<HealthClassificationV39>([
  "timeout","transport_error","transient_http_503"
]);
const statuses=new Set<HealthClassificationV39>([
  "healthy","timeout","transport_error","transient_http_503",
  "secret_binding_mismatch","deployed_build_mismatch",
  "sql_binding_or_lifecycle_mismatch","callback_contract_invalid"
]);
const integer=(v:unknown)=>typeof v==="number"&&
  Number.isSafeInteger(v)&&v>=0;
function proofError(e:SimulatedDurableIngressEvidenceV39):string|null{
  if(!e.ownerFrozenBindingVerified||!e.subscriberLeaseUnique)
    return "UNVERIFIED_OWNER_OR_SPLIT_BRAIN";
  if(!e.independentSenderLedgerVerified||
     !e.allSenderAttemptsAtWatermarkMatchedToEdge||
     e.senderAttemptCount!==e.durableEdgeAttemptCount)
    return "UNVERIFIED_SENDER_TO_EDGE_ATTEMPTS";
  if(e.externalSyntheticCredits!==e.durableEdgeSyntheticCredits)
    return "SENDER_TO_EDGE_BILLED_CREDIT_GAP";
  if(!e.immutableFirstEdgeUtcAndWireShaVerified||
     !e.durableFullRawBytesAndRetention168hVerified)
    return "UNVERIFIED_ORIGINAL_SOURCE_BYTES_OR_TIME";
  if(!e.scientificPhysicalV2EvidenceComplete||
     !e.originalEightBucketsStillVerifiable)
    return "UNVERIFIED_SCIENTIFIC_ITEMS_OR_BUCKETS";
  if(!e.unloggedScientificStateKnownSafe)
    return "UNLOGGED_SCIENTIFIC_STATE_UNRECOVERED";
  // Synthetic safety bounds for model comparison, NOT frozen science policy.
  // Actual Queue age/retention must be measured by the independent edge.
  if(e.queueTimeToLiveSeconds<e.maxBacklogAgeSeconds||
     e.maxBacklogAgeSeconds>600)
    return "BACKLOG_UNBOUNDED_OR_EXPIRED";
  return null;
}
export function evaluateSyntheticWatchdogToleranceV39(
  input:SupervisorToleranceCandidateV39
):SupervisorToleranceDecisionV39{
  if(!input||input.mode!=="synthetic-only"||
     input.pollMs!==15000||input.existingFailureLimit!==3||
     ![3,6,10].includes(input.candidateFailureLimit)||
     input.providerMaxDeliveryRetries!==0||
     !Array.isArray(input.samples)||input.samples.length===0||
     input.samples.length>10000)
    throw new Error("WATCHDOG_FROZEN_TEST_CONTRACT_INVALID");
  let consecutive=0,max=0,everDegraded=false,recovered=false;
  let stopped=false,index:number|null=null;
  let finalState:SupervisorToleranceDecisionV39["finalState"]=
    "MONITORING_UNCERTAIN";
  const errors=new Set<string>();
  for(let i=0;i<input.samples.length;i++){
    const s=input.samples[i],e=s?.evidence;
    if(!s||!statuses.has(s.health)||!e||
       ![
         e.senderAttemptCount,e.durableEdgeAttemptCount,
         e.externalSyntheticCredits,e.durableEdgeSyntheticCredits,
         e.maxBacklogAgeSeconds,e.backlogDepth,e.queueTimeToLiveSeconds
       ].every(integer))
      throw new Error("WATCHDOG_SYNTHETIC_HEALTH_OR_WATERMARK_INVALID");
    const failed=s.health!=="healthy";
    const integrityHard=failed&&!soft.has(s.health);
    const gap=e.externalSyntheticCredits!==e.durableEdgeSyntheticCredits ||
      (e.allSenderAttemptsAtWatermarkMatchedToEdge&&
       e.senderAttemptCount!==e.durableEdgeAttemptCount);
    // A known mismatch cannot be overridden by a green GET or a longer timer.
    if(integrityHard||gap){
      stopped=true;index=i;finalState="STOPPED_FAIL_CLOSED";
      errors.add(integrityHard?"CALLBACK_OR_OWNER_HARD_CONTRACT_MISMATCH":
        "KNOWN_SOURCE_DELIVERY_GAP");
      break;
    }
    if(!failed){
      if(consecutive>0)recovered=true;
      consecutive=0;
      // A recovered health endpoint is not independent proof of all callback
      // attempts; science can only be evaluated from complete signed evidence.
      if(proofError(e)){
        finalState="RECOVERED_PENDING_SCIENCE_PROOF";
        errors.add("HEALTH_RECOVERY_NOT_SCIENTIFIC_RECOVERY");
      }else finalState=recovered?
        "RECOVERED_PENDING_SCIENCE_PROOF":"HEALTHY";
      continue;
    }
    consecutive++;max=Math.max(max,consecutive);
    if(consecutive>=input.existingFailureLimit){
      const invalid=proofError(e);
      if(invalid||consecutive>=input.candidateFailureLimit){
        stopped=true;index=i;finalState="STOPPED_FAIL_CLOSED";
        errors.add(invalid??"BOUNDED_HEALTH_FAILURE_LIMIT_REACHED");
        break;
      }
      everDegraded=true;finalState="DEGRADED_BUT_DURABLE";
    }else finalState="MONITORING_UNCERTAIN";
  }
  return {
    stopPaidOwner:stopped,wouldStopAtHealthIndex:index,
    maximumObservedConsecutiveFailures:max,
    finalConsecutiveFailures:consecutive,
    observedDegradedButDurable:everDegraded,
    healthRecoveredAfterTransient:recovered,
    finalState,errors:[...errors].sort(),
    candidateDifferenceFromLiveContract:input.candidateFailureLimit!==3,
    liveSupervisorChangeAuthorized:false,
    providerRetriesAuthorized:false,
    paidLaunchAuthorized:false,
    scientificPassAuthorized:false
  };
}
