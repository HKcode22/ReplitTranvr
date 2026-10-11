import {describe,it,expect} from "vitest";
import {
  evaluateSyntheticWatchdogToleranceV39,
  type HealthClassificationV39,
  type SimulatedDurableIngressEvidenceV39,
  type SupervisorToleranceCandidateV39
} from "../experiments/phase2g_rehearsal/synthetic_watchdog_tolerance_gate_v39";

const durable=():SimulatedDurableIngressEvidenceV39=>({
  ownerFrozenBindingVerified:true,
  independentSenderLedgerVerified:true,
  immutableFirstEdgeUtcAndWireShaVerified:true,
  durableFullRawBytesAndRetention168hVerified:true,
  allSenderAttemptsAtWatermarkMatchedToEdge:true,
  scientificPhysicalV2EvidenceComplete:true,
  originalEightBucketsStillVerifiable:true,
  subscriberLeaseUnique:true,
  senderAttemptCount:60,durableEdgeAttemptCount:60,
  externalSyntheticCredits:60,durableEdgeSyntheticCredits:60,
  maxBacklogAgeSeconds:0,backlogDepth:0,
  queueTimeToLiveSeconds:86400,
  unloggedScientificStateKnownSafe:true
});
const pattern=(kinds:HealthClassificationV39[],limit:3|6|10=3,
  tweak:Partial<SimulatedDurableIngressEvidenceV39>={})=>
  ({mode:"synthetic-only" as const,pollMs:15000 as const,
    existingFailureLimit:3 as const,candidateFailureLimit:limit,
    providerMaxDeliveryRetries:0 as const,
    samples:kinds.map(health=>({health,evidence:{...durable(),...tweak}}))
  });
const evaluate=(s:SupervisorToleranceCandidateV39)=>
  evaluateSyntheticWatchdogToleranceV39(s);
const failures=(count:number,kind:HealthClassificationV39="transport_error")=>
  Array.from({length:count},()=>kind);
describe("P15/R1 3 vs 6 vs 10 supervisor health-check tolerance (not provider delivery retries)",()=>{
  it("WSSS-style two failed checks then recovered: 3-strike baseline does not terminate",()=>{
    const v=evaluate(pattern(["transport_error","timeout","healthy"],3));
    expect(v).toMatchObject({
      stopPaidOwner:false,wouldStopAtHealthIndex:null,
      maximumObservedConsecutiveFailures:2,finalConsecutiveFailures:0,
      healthRecoveredAfterTransient:true,observedDegradedButDurable:false,
      finalState:"RECOVERED_PENDING_SCIENCE_PROOF",
      liveSupervisorChangeAuthorized:false,scientificPassAuthorized:false
    });
  });
  it("P2G24-style three consecutive failures stop at third under exact existing rule",()=>{
    const v=evaluate(pattern(failures(3),3));
    expect(v).toMatchObject({
      stopPaidOwner:true,wouldStopAtHealthIndex:2,
      finalConsecutiveFailures:3,finalState:"STOPPED_FAIL_CLOSED",
      errors:["BOUNDED_HEALTH_FAILURE_LIMIT_REACHED"]
    });
  });
  it("with full synthetic source proof, six-strike candidate can tolerate four and then recover",()=>{
    const v=evaluate(pattern([...failures(4),"healthy"],6));
    expect(v).toMatchObject({
      stopPaidOwner:false,maximumObservedConsecutiveFailures:4,
      healthRecoveredAfterTransient:true,
      observedDegradedButDurable:true,
      finalState:"RECOVERED_PENDING_SCIENCE_PROOF",
      candidateDifferenceFromLiveContract:true,
      paidLaunchAuthorized:false,scientificPassAuthorized:false
    });
  });
  it("six-strike candidate stops at exactly sixth consecutive check despite durable proof",()=>{
    const v=evaluate(pattern([...failures(7),"healthy"],6));
    expect(v).toMatchObject({
      stopPaidOwner:true,wouldStopAtHealthIndex:5,
      maximumObservedConsecutiveFailures:6,
      errors:["BOUNDED_HEALTH_FAILURE_LIMIT_REACHED"]
    });
  });
  it("ten-strike model can survive nine but never ten consecutive failures",()=>{
    const ok=evaluate(pattern([...failures(9),"healthy"],10));
    expect(ok.stopPaidOwner).toBe(false);
    expect(ok.maximumObservedConsecutiveFailures).toBe(9);
    const bad=evaluate(pattern(failures(10),10));
    expect(bad.stopPaidOwner).toBe(true);
    expect(bad.wouldStopAtHealthIndex).toBe(9);
    expect(bad.providerRetriesAuthorized).toBe(false);
  });
  it("both six and ten REFUSE extension beyond three when independent sender/edge proof missing",()=>{
    for(const limit of [6,10] as const){
      const v=evaluate(pattern(failures(7),limit,{
        independentSenderLedgerVerified:false
      }));
      expect(v).toMatchObject({
        stopPaidOwner:true,wouldStopAtHealthIndex:2,
        errors:["UNVERIFIED_SENDER_TO_EDGE_ATTEMPTS"]
      });
    }
  });
  it("known 260/259 exact billed/source credit gap stops IMMEDIATELY even with green GET",()=>{
    const v=evaluate(pattern(["healthy","healthy"],10,{
      externalSyntheticCredits:260,durableEdgeSyntheticCredits:259,
      senderAttemptCount:260,durableEdgeAttemptCount:259
    }));
    expect(v).toMatchObject({
      stopPaidOwner:true,wouldStopAtHealthIndex:0,
      errors:["KNOWN_SOURCE_DELIVERY_GAP"],
      scientificPassAuthorized:false
    });
  });
  it("wrong secret, wrong deployed SHA, SQL lifecycle mismatch and hard route contract fail immediately",()=>{
    for(const health of [
      "secret_binding_mismatch","deployed_build_mismatch",
      "sql_binding_or_lifecycle_mismatch","callback_contract_invalid"
    ] as const){
      const r=evaluate(pattern([health],10));
      expect(r).toMatchObject({
        stopPaidOwner:true,wouldStopAtHealthIndex:0,
        errors:["CALLBACK_OR_OWNER_HARD_CONTRACT_MISMATCH"]
      });
    }
  });
  it("a 503 transport failure may be conditionally transient, but no unverified source data is excused",()=>{
    const pass=evaluate(pattern([...failures(4,"transient_http_503"),"healthy"],6));
    expect(pass.stopPaidOwner).toBe(false);
    const fail=evaluate(pattern(failures(4,"transient_http_503"),6,{
      immutableFirstEdgeUtcAndWireShaVerified:false
    }));
    expect(fail).toMatchObject({
      stopPaidOwner:true,wouldStopAtHealthIndex:2,
      errors:["UNVERIFIED_ORIGINAL_SOURCE_BYTES_OR_TIME"]
    });
  });
  it("missing source bytes/first-edge UTC, 168h retention, or physical-v2 and eight bins stop at baseline",()=>{
    const scenarios:[Partial<SimulatedDurableIngressEvidenceV39>,string][]=[
      [{durableFullRawBytesAndRetention168hVerified:false},
       "UNVERIFIED_ORIGINAL_SOURCE_BYTES_OR_TIME"],
      [{immutableFirstEdgeUtcAndWireShaVerified:false},
       "UNVERIFIED_ORIGINAL_SOURCE_BYTES_OR_TIME"],
      [{scientificPhysicalV2EvidenceComplete:false},
       "UNVERIFIED_SCIENTIFIC_ITEMS_OR_BUCKETS"],
      [{originalEightBucketsStillVerifiable:false},
       "UNVERIFIED_SCIENTIFIC_ITEMS_OR_BUCKETS"]
    ];
    for(const [tweak,error] of scenarios){
      const v=evaluate(pattern(failures(8),10,tweak));
      expect(v.wouldStopAtHealthIndex).toBe(2);
      expect(v.errors).toContain(error);
    }
  });
  it("UNLOGGED crash or owner split brain cannot be excused by longer watchdog",()=>{
    const scenarios:[Partial<SimulatedDurableIngressEvidenceV39>,string][]=[
      [{unloggedScientificStateKnownSafe:false},"UNLOGGED_SCIENTIFIC_STATE_UNRECOVERED"],
      [{subscriberLeaseUnique:false},"UNVERIFIED_OWNER_OR_SPLIT_BRAIN"],
      [{ownerFrozenBindingVerified:false},"UNVERIFIED_OWNER_OR_SPLIT_BRAIN"]
    ];
    for(const [tweak,error] of scenarios){
      const v=evaluate(pattern(failures(8),10,tweak));
      expect(v.stopPaidOwner).toBe(true);
      expect(v.wouldStopAtHealthIndex).toBe(2);
      expect(v.errors).toContain(error);
    }
  });
  it("backlog approaching expiry or older than synthetic bound refuses longer grace",()=>{
    for(const evidence of [
      {maxBacklogAgeSeconds:601},
      {maxBacklogAgeSeconds:301,queueTimeToLiveSeconds:300}
    ]){
      const v=evaluate(pattern(failures(5),6,evidence));
      expect(v.wouldStopAtHealthIndex).toBe(2);
      expect(v.errors).toContain("BACKLOG_UNBOUNDED_OR_EXPIRED");
    }
  });
  it("health green again without source verification remains pending, never scientific PASS",()=>{
    const input=pattern(["timeout","timeout","healthy"],6,
      {allSenderAttemptsAtWatermarkMatchedToEdge:false});
    const r=evaluate(input);
    expect(r.stopPaidOwner).toBe(false);
    expect(r.errors).toContain("HEALTH_RECOVERY_NOT_SCIENTIFIC_RECOVERY");
    expect(r.finalState).toBe("RECOVERED_PENDING_SCIENCE_PROOF");
    expect(r.scientificPassAuthorized).toBe(false);
  });
  it("a healthy intermediate check resets consecutive count, not the scientific/reconciliation obligation",()=>{
    const kinds:HealthClassificationV39[]=[
      ...failures(2),"healthy",...failures(2),"healthy"
    ];
    const r=evaluate(pattern(kinds,3));
    expect(r.stopPaidOwner).toBe(false);
    expect(r.maximumObservedConsecutiveFailures).toBe(2);
    expect(r.finalConsecutiveFailures).toBe(0);
    expect(r.scientificPassAuthorized).toBe(false);
  });
  it("attempting to change billable provider retry policy is rejected before evaluation",()=>{
    expect(()=>evaluate({
      ...pattern(failures(10),10),
      providerMaxDeliveryRetries:1 as 0
    })).toThrow("WATCHDOG_FROZEN_TEST_CONTRACT_INVALID");
    expect(()=>evaluate({
      ...pattern(failures(10),10),
      candidateFailureLimit:100 as 10
    })).toThrow("WATCHDOG_FROZEN_TEST_CONTRACT_INVALID");
  });
  it("invalid/negative/NaN sender evidence fails before any permission decision",()=>{
    expect(()=>evaluate(pattern(["healthy"],10,{
      maxBacklogAgeSeconds:Number.NaN
    }))).toThrow("WATCHDOG_SYNTHETIC_HEALTH_OR_WATERMARK_INVALID");
  });
});