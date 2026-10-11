import {describe,it,expect} from "vitest";
import {
  evaluateSyntheticSixPlusFourWatchdogV39,
  evaluateSyntheticSixPlusSixWatchdogV39,
  type SixPlusFourEvidenceV39,
  type SixPlusFourHealthV39
} from "../experiments/phase2g_rehearsal/synthetic_watchdog_six_plus_four_v39";

const verified=():SixPlusFourEvidenceV39=>({
  sourceEvidenceIndependentlyAuthenticated:true,
  currentSenderWatermarkComplete:true,
  senderAttemptCount:72,durableExactAttemptCount:72,
  senderAttemptCredits:72,durableExactAttemptCredits:72,
  unambiguousFirstEdgeUtcAndWireSha:true,
  fullOriginalBytesReadBackVerified:true,rawRetentionHours:168,
  originalPhysicalFlightV2Continuity:true,
  elapsedScientificBinsThroughWatermarkVerified:true,
  signedOwnerAndSubscriptionMatch:true,oneActiveOwnerLease:true,
  unloggedRecoverySourceComplete:true,durableQueueAvailable:true,
  queueBacklogAgeSeconds:0,queueRetentionSeconds:86400,
  providerMaxDeliveryRetries:0,
  frozenCreditCeiling:500,independentEstimatedUpperBoundSpend:150,
  currentEvidenceAgeSeconds:0
});
const N=(n:number,health:SixPlusFourHealthV39="transient_http_502_503_504")=>
  Array<SixPlusFourHealthV39>(n).fill(health);
const sample=(kinds:SixPlusFourHealthV39[],tweak:Partial<SixPlusFourEvidenceV39>={})=>
  kinds.map(health=>({health,evidence:{...verified(),...tweak}}));
const run=(kinds:SixPlusFourHealthV39[],
  tweak:Partial<SixPlusFourEvidenceV39>={})=>
  evaluateSyntheticSixPlusSixWatchdogV39({
    mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:6,
    samples:sample(kinds,tweak)
  });
describe("P15/R1 selected 6 primary + 6 BACKUP health check model, never provider retry",()=>{
  it("declares EXACT primary 6, backup 6, total 12, zero live authorization",()=>{
    const r=run(N(1));
    expect(r).toMatchObject({
      mode:"synthetic-six-plus-six",primaryFailureChecks:6,
      contingencyFailureChecks:6,maximumConsecutiveChecks:12,
      state:"PRIMARY_GRACE",stopOwner:false,
      providerRetriesChanged:false,paidLaunchAuthorized:false,
      liveSupervisorModified:false,publicationApproved:false,
      scientificAdjudication:"PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS"
    });
  });
  it("primary is exactly checks one through six",()=>{
    for(let k=1;k<=6;k++){
      const r=run(N(k));
      expect(r.state).toBe("PRIMARY_GRACE");
      expect(r.enteredContingency).toBe(false);
      expect(r.maximumObservedConsecutiveFailures).toBe(k);
    }
  });
  it("backup begins at seventh and continues through ELEVENTH while no known data loss",()=>{
    for(let k=7;k<=11;k++){
      const r=run(N(k));
      expect(r).toMatchObject({
        state:"CONTINGENCY_DEGRADED_BUT_DURABLE",
        enteredContingency:true,contingencyChecksUsed:k-6,
        stopOwner:false,stopAtIndex:null,
        scientificAdjudication:"PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS"
      });
    }
  });
  it("eleven failures and a healthy twelfth check: 6+6 continues, 6+4 already stopped at check ten",()=>{
    const sequence=[...N(11),"healthy" as const];
    const a=run(sequence);
    const control=evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
      samples:sample(sequence)
    });
    expect(a).toMatchObject({
      stopOwner:false,enteredContingency:true,
      contingencyChecksUsed:5,recoveredHealth:true,
      state:"HEALTH_RECOVERED_AUDIT_PENDING"
    });
    expect(control).toMatchObject({
      stopOwner:true,stopAtIndex:9,state:"STOP_AT_TEN"
    });
    expect(a.paidLaunchAuthorized).toBe(false);
  });
  it("twelve consecutive failures stop at check #12 rather than wait for an unsafe thirteenth",()=>{
    const r=run([...N(12),"healthy"]);
    expect(r).toMatchObject({
      state:"STOP_AT_TWELVE",stopOwner:true,stopAtIndex:11,
      observedChecks:12,maximumObservedConsecutiveFailures:12,
      contingencyChecksUsed:6,
      reasons:["TWELVE_CONSECUTIVE_HEALTH_FAILURES"]
    });
  });
  it("WSSS historic two failures then recovery are accepted as monitoring without claiming scientific success",()=>{
    const r=run([...N(2),"healthy"]);
    expect(r).toMatchObject({
      stopOwner:false,recoveredHealth:true,
      maximumObservedConsecutiveFailures:2,
      state:"HEALTH_RECOVERED_AUDIT_PENDING",
      scientificAdjudication:"PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS"
    });
  });
  it("historical YSSY P2G24 three failures would not necessarily stop a SYNTHETIC 6+6 policy",()=>{
    const r=run(N(3));
    expect(r).toMatchObject({
      stopOwner:false,state:"PRIMARY_GRACE",
      maximumObservedConsecutiveFailures:3,paidLaunchAuthorized:false
    });
  });
  it("missing independently authenticated sender watermark forbids continuation even during first failed check",()=>{
    const r=run(N(12),{
      sourceEvidenceIndependentlyAuthenticated:false
    });
    expect(r).toMatchObject({
      stopOwner:true,stopAtIndex:0,state:"STOP_SAFE_NO_PROOF",
      reasons:["SENDER_WATERMARK_NOT_INDEPENDENTLY_ATTESTED"]
    });
  });
  it("known missing one billed source attempt: hard stop despite a HEALTHY check",()=>{
    const r=run(["healthy"],{
      senderAttemptCount:260,durableExactAttemptCount:259,
      senderAttemptCredits:260,durableExactAttemptCredits:259,
      currentSenderWatermarkComplete:false
    });
    expect(r).toMatchObject({
      stopOwner:true,stopAtIndex:0,
      reasons:["ATTEMPT_OR_BILLING_GAP"],state:"STOP_HARD_CONTRACT"
    });
  });
  it("one missing original physical-v2 item stops even at backup check #11",()=>{
    const samples=N(12).map((health,i)=>({
      health,evidence:{
        ...verified(),originalPhysicalFlightV2Continuity:i<10
      }
    }));
    const r=evaluateSyntheticSixPlusSixWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:6,
      samples
    });
    expect(r).toMatchObject({
      stopOwner:true,stopAtIndex:10,
      state:"STOP_SAFE_NO_PROOF",
      reasons:["ORIGINAL_SCIENTIFIC_IDENTITY_NOT_RECONSTRUCTIBLE"]
    });
  });
  it("new owner conflict during backup check #12 stops before bounded threshold",()=>{
    const samples=N(12).map((health,i)=>({
      health,evidence:{...verified(),oneActiveOwnerLease:i<11}
    }));
    const r=evaluateSyntheticSixPlusSixWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:6,
      samples
    });
    expect(r).toMatchObject({
      stopOwner:true,stopAtIndex:11,state:"STOP_HARD_CONTRACT",
      reasons:["OWNER_OR_PROVIDER_SUBSCRIPTION_NOT_ATTESTED"]
    });
  });
  it("stale sender watermark at backup check #10 cuts off grace immediately",()=>{
    const samples=N(12).map((health,i)=>({
      health,evidence:{...verified(),currentEvidenceAgeSeconds:i===9?31:0}
    }));
    const r=evaluateSyntheticSixPlusSixWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:6,
      samples
    });
    expect(r).toMatchObject({
      stopOwner:true,stopAtIndex:9,
      reasons:["SOURCE_WATERMARK_STALE_DURING_OUTAGE"]
    });
  });
  it("underlying raw store TTL mismatch/168h loss does not become benign due to 12 checks",()=>{
    for(const tweak of [
      {fullOriginalBytesReadBackVerified:false},
      {rawRetentionHours:48},
      {unambiguousFirstEdgeUtcAndWireSha:false}
    ]){
      const r=run(N(11),tweak);
      expect(r.stopAtIndex).toBe(0);
      expect(r.reasons).toContain("ORIGINAL_RAW_SOURCE_OR_UTC_NOT_DURABLE");
    }
  });
  it("queue backlog would expire or older than capped 600s: immediate stop",()=>{
    for(const tweak of [
      {durableQueueAvailable:false},
      {queueBacklogAgeSeconds:86400,queueRetentionSeconds:86400},
      {queueBacklogAgeSeconds:601}
    ]){
      const r=run(N(11),tweak);
      expect(r.stopAtIndex).toBe(0);
      expect(r.reasons).toContain("BACKLOG_NOT_BOUNDED_OR_EXPIRED");
    }
  });
  it("frozen budget upper bound is independent of health-check tolerance",()=>{
    const r=run(N(11),{independentEstimatedUpperBoundSpend:501});
    expect(r).toMatchObject({
      stopOwner:true,stopAtIndex:0,
      reasons:["FROZEN_BUDGET_AT_RISK"]
    });
  });
  it("hard wrong secret/build/multi-owner/db errors never enter primary or backup",()=>{
    for(const health of [
      "bad_secret","wrong_build","wrong_subscriber_owner",
      "db_identity_or_lifecycle_violation","webhook_contract_violation"
    ] as const){
      const r=run([health,...N(11)]);
      expect(r).toMatchObject({
        stopOwner:true,stopAtIndex:0,state:"STOP_HARD_CONTRACT",
        reasons:["HARD_CALLBACK_CONTRACT_INVALID"]
      });
    }
  });
  it("silently raising paid provider delivery retries is rejected as invalid test source contract",()=>{
    expect(()=>run(N(1),{providerMaxDeliveryRetries:1 as 0}))
      .toThrow("SIX_PLUS_N_INVALID_EVIDENCE_OR_RETRY_CONTRACT");
  });
  it("6+4 wrapper still rejects 6+6 inputs: no accidental policy activation",()=>{
    expect(()=>evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,
      backupChecks:6 as 4,samples:sample(N(1))
    })).toThrow("SIX_PLUS_FOUR_FROZEN_COMPARISON_INVALID");
  });
  it("6+6 wrapper rejects 6+4 input: must make explicit prospective choice",()=>{
    expect(()=>evaluateSyntheticSixPlusSixWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,
      backupChecks:4 as 6,samples:sample(N(1))
    })).toThrow("SIX_PLUS_SIX_FROZEN_COMPARISON_INVALID");
  });
  it("counter resets after verified recovery; previous outage still recorded, not forgotten",()=>{
    const r=run([...N(11),"healthy",...N(11),"healthy"]);
    expect(r).toMatchObject({
      stopOwner:false,enteredContingency:true,
      contingencyChecksUsed:5,
      recoveredHealth:true,
      maximumObservedConsecutiveFailures:11,
      state:"HEALTH_RECOVERED_AUDIT_PENDING"
    });
    expect(r.scientificAdjudication).not.toEqual("PASS");
  });
  it("a green check without source attestation is only monitoring recovery; no science PASS",()=>{
    const r=run(["healthy"],{
      sourceEvidenceIndependentlyAuthenticated:false
    });
    expect(r).toMatchObject({
      state:"MONITOR_ONLY",stopOwner:false,
      reasons:["HEALTH_OK_SCIENCE_STILL_NOT_ATTESTED"],
      scientificAdjudication:"PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS"
    });
  });
  it("source bins through watermark and post-crash continuity cannot be waived",()=>{
    for(const tweak of [
      {elapsedScientificBinsThroughWatermarkVerified:false},
      {unloggedRecoverySourceComplete:false}
    ]){
      const r=run(N(11),tweak);
      expect(r).toMatchObject({
        stopOwner:true,stopAtIndex:0,
        reasons:["ORIGINAL_SCIENTIFIC_IDENTITY_NOT_RECONSTRUCTIBLE"]
      });
    }
  });
});
