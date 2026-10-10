import {describe,expect,it} from "vitest";
import {
  evaluateSyntheticSixPlusFourWatchdogV39,
  type SixPlusFourEvidenceV39,
  type SixPlusFourHealthV39
} from "../experiments/phase2g_rehearsal/synthetic_watchdog_six_plus_four_v39";

const good=():SixPlusFourEvidenceV39=>({
  sourceEvidenceIndependentlyAuthenticated:true,
  currentSenderWatermarkComplete:true,
  senderAttemptCount:24,durableExactAttemptCount:24,
  senderAttemptCredits:24,durableExactAttemptCredits:24,
  unambiguousFirstEdgeUtcAndWireSha:true,
  fullOriginalBytesReadBackVerified:true,rawRetentionHours:168,
  originalPhysicalFlightV2Continuity:true,
  elapsedScientificBinsThroughWatermarkVerified:true,
  signedOwnerAndSubscriptionMatch:true,oneActiveOwnerLease:true,
  unloggedRecoverySourceComplete:true,
  durableQueueAvailable:true,
  queueBacklogAgeSeconds:0,queueRetentionSeconds:86400,
  providerMaxDeliveryRetries:0,
  frozenCreditCeiling:500,independentEstimatedUpperBoundSpend:100,
  currentEvidenceAgeSeconds:0
});
const failures=(n:number):SixPlusFourHealthV39[]=>
  Array(n).fill("transient_timeout");
const run=(checks:SixPlusFourHealthV39[],
  override:Partial<SixPlusFourEvidenceV39>={})=>
  evaluateSyntheticSixPlusFourWatchdogV39({
    mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
    samples:checks.map(health=>({health,evidence:{...good(),...override}}))
  });
describe("P15 six-primary + four-conditional-backup checks; never provider retries",()=>{
  it("six transient health failures are primary tolerated if truly independently durable and fresh",()=>{
    const v=run(failures(6));
    expect(v).toMatchObject({
      state:"PRIMARY_GRACE",stopOwner:false,
      maximumObservedConsecutiveFailures:6,
      enteredContingency:false,contingencyChecksUsed:0,
      paidLaunchAuthorized:false,scientificAdjudication:
        "PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS"
    });
  });
  it("six failures then health restored neither terminates nor awards scientific PASS",()=>{
    const v=run([...failures(6),"healthy"]);
    expect(v).toMatchObject({
      state:"HEALTH_RECOVERED_AUDIT_PENDING",
      stopOwner:false,healthRecoveredAfterTransient:true,
      maximumObservedConsecutiveFailures:6,enteredContingency:false,
      publicationApproved:false
    });
  });
  it("at seventh through ninth consecutive failure, BACKUP phase is entered but still bounded",()=>{
    for(const n of [7,8,9]){
      const v=run(failures(n));
      expect(v).toMatchObject({
        stopOwner:false,
        state:"CONTINGENCY_DEGRADED_BUT_DURABLE",
        enteredContingency:true,contingencyChecksUsed:n-6
      });
    }
  });
  it("nine consecutive failures then recovery uses backup but never treats a GET as evidence of received flights",()=>{
    const v=run([...failures(9),"healthy"]);
    expect(v).toMatchObject({
      stopOwner:false,enteredContingency:true,
      contingencyChecksUsed:3,
      healthRecoveredAfterTransient:true,
      state:"HEALTH_RECOVERED_AUDIT_PENDING",
      scientificAdjudication:"PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS"
    });
  });
  it("contingency is revoked at seventh check if the edge watermark becomes stale",()=>{
    const samples=failures(9).map((health,i)=>({
      health,evidence:{
        ...good(),
        currentEvidenceAgeSeconds:i===6?31:0
      }
    }));
    const r=evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
      samples
    });
    expect(r).toMatchObject({
      stopOwner:true,stopAtIndex:6,
      maximumObservedConsecutiveFailures:7,
      state:"STOP_SAFE_NO_PROOF",
      reasons:["SOURCE_WATERMARK_STALE_DURING_OUTAGE"]
    });
    expect(r.scientificAdjudication)
      .toBe("PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS");
  });
  it("during contingency a newly missing original item stops without waiting for ten",()=>{
    const samples=failures(10).map((health,i)=>({
      health,evidence:{
        ...good(),originalPhysicalFlightV2Continuity:i<7
      }
    }));
    const r=evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
      samples
    });
    expect(r).toMatchObject({
      stopOwner:true,stopAtIndex:7,
      state:"STOP_SAFE_NO_PROOF",
      reasons:["ORIGINAL_SCIENTIFIC_IDENTITY_NOT_RECONSTRUCTIBLE"]
    });
  });
  it("tenth failure is bounded STOP at index nine, not infinite retry",()=>{
    const v=run([...failures(10),"healthy"]);
    expect(v).toMatchObject({
      stopOwner:true,stopAtIndex:9,
      observedChecks:10,
      maximumObservedConsecutiveFailures:10,
      contingencyChecksUsed:4,
      state:"STOP_AT_TEN",reasons:["TEN_CONSECUTIVE_HEALTH_FAILURES"],
      providerRetriesChanged:false
    });
  });
  it("WSSS two failures and green health do not even need primary six",()=>{
    const v=run([...failures(2),"healthy"]);
    expect(v).toMatchObject({
      state:"HEALTH_RECOVERED_AUDIT_PENDING",
      stopOwner:false,maximumObservedConsecutiveFailures:2,
      enteredContingency:false
    });
  });
  it("YSSY P2G24 three failures would conditionally continue, but this is NOT retrospective recovered data",()=>{
    const v=run(failures(3));
    expect(v).toMatchObject({
      state:"PRIMARY_GRACE",stopOwner:false,
      scientificAdjudication:"PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS",
      paidLaunchAuthorized:false
    });
  });
  it("without independent durable evidence at minute of FIRST failure, do not make unsupported paid continuation",()=>{
    const v=run(failures(6),{
      sourceEvidenceIndependentlyAuthenticated:false
    });
    expect(v).toMatchObject({
      stopOwner:true,stopAtIndex:0,state:"STOP_SAFE_NO_PROOF",
      reasons:["SENDER_WATERMARK_NOT_INDEPENDENTLY_ATTESTED"]
    });
  });
  it("one unmatched source attempt or even equal 260/259 equivalent counts cannot be forgiven by 6+4",()=>{
    const v=run(failures(10),{
      senderAttemptCount:260,durableExactAttemptCount:259,
      senderAttemptCredits:260,durableExactAttemptCredits:259
    });
    expect(v).toMatchObject({
      stopOwner:true,stopAtIndex:0,state:"STOP_HARD_CONTRACT",
      reasons:["ATTEMPT_OR_BILLING_GAP"]
    });
  });
  it("lost edge UTC, missing full bytes, or short retention cannot be called backup",()=>{
    const scenarios:Partial<SixPlusFourEvidenceV39>[]=[
      {unambiguousFirstEdgeUtcAndWireSha:false},
      {fullOriginalBytesReadBackVerified:false},
      {rawRetentionHours:24}
    ];
    for(const overrides of scenarios){
      const v=run(failures(10),overrides);
      expect(v).toMatchObject({
        stopOwner:true,stopAtIndex:0,
        reasons:["ORIGINAL_RAW_SOURCE_OR_UTC_NOT_DURABLE"]
      });
    }
  });
  it("flight identity, 8 original bins and lost UNLOGGED state require scientific proof",()=>{
    for(const overrides of [
      {originalPhysicalFlightV2Continuity:false},
      {elapsedScientificBinsThroughWatermarkVerified:false},
      {unloggedRecoverySourceComplete:false}
    ]){
      expect(run(failures(10),overrides)).toMatchObject({
        stopOwner:true,stopAtIndex:0,
        reasons:["ORIGINAL_SCIENTIFIC_IDENTITY_NOT_RECONSTRUCTIBLE"]
      });
    }
  });
  it("hard identity/secret/build/db contract mismatch stops IMMEDIATELY, not after six attempts",()=>{
    for(const health of [
      "bad_secret","wrong_build","wrong_subscriber_owner",
      "db_identity_or_lifecycle_violation","webhook_contract_violation"
    ] as const){
      const v=run([health,...failures(10)]);
      expect(v).toMatchObject({
        stopOwner:true,stopAtIndex:0,state:"STOP_HARD_CONTRACT",
        reasons:["HARD_CALLBACK_CONTRACT_INVALID"]
      });
    }
  });
  it("lost unique owner lease or mismatched subscription abort before second paid owner",()=>{
    for(const overrides of [
      {oneActiveOwnerLease:false},{signedOwnerAndSubscriptionMatch:false}
    ]){
      const v=run(failures(10),overrides);
      expect(v.stopAtIndex).toBe(0);
      expect(v.reasons).toContain("OWNER_OR_PROVIDER_SUBSCRIPTION_NOT_ATTESTED");
    }
  });
  it("stale independently-signed watermark cannot be stretched across a 2m outage",()=>{
    const v=run(failures(10),{currentEvidenceAgeSeconds:31});
    expect(v).toMatchObject({
      stopOwner:true,stopAtIndex:0,
      reasons:["SOURCE_WATERMARK_STALE_DURING_OUTAGE"]
    });
  });
  it("queue expiry/capacity prevents backup even if synthetic sender counts still match",()=>{
    for(const overrides of [
      {durableQueueAvailable:false},
      {queueBacklogAgeSeconds:120,queueRetentionSeconds:119},
      {queueBacklogAgeSeconds:601}
    ]){
      const v=run(failures(10),overrides);
      expect(v.stopAtIndex).toBe(0);
      expect(v.reasons).toContain("BACKLOG_NOT_BOUNDED_OR_EXPIRED");
    }
  });
  it("frozen budget ceiling/upper-bound spend overrides otherwise recoverable Replit timeout",()=>{
    const v=run(failures(9),{independentEstimatedUpperBoundSpend:501});
    expect(v).toMatchObject({
      stopOwner:true,stopAtIndex:0,
      reasons:["FROZEN_BUDGET_AT_RISK"]
    });
  });
  it("must keep AeroDataBox provider retries frozen at zero even while health retry reaches 10",()=>{
    expect(()=>evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
      samples:[{
        health:"transient_timeout",
        evidence:{...good(),providerMaxDeliveryRetries:1 as 0}
      }]
    })).toThrow("SIX_PLUS_FOUR_INVALID_EVIDENCE_OR_RETRY_CONTRACT");
  });
  it("invalid contingency sizes, sampling period and fake paid mode cannot silently change policy",()=>{
    for(const override of [
      {primaryChecks:3},{backupChecks:10},{pollMs:30000},{mode:"paid"}
    ]){
      expect(()=>evaluateSyntheticSixPlusFourWatchdogV39({
        mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
        samples:[{health:"healthy",evidence:good()}],
        ...override
      } as Parameters<typeof evaluateSyntheticSixPlusFourWatchdogV39>[0]))
        .toThrow("SIX_PLUS_FOUR_FROZEN_COMPARISON_INVALID");
    }
  });
  it("recovery followed by another six-failure spell resets counters yet never overwrites evidence flags",()=>{
    const v=run([...failures(6),"healthy",...failures(6),"healthy"]);
    expect(v).toMatchObject({
      stopOwner:false,maximumObservedConsecutiveFailures:6,
      healthRecoveredAfterTransient:true,
      state:"HEALTH_RECOVERED_AUDIT_PENDING",
      providerRetriesChanged:false,paidLaunchAuthorized:false
    });
  });
});
