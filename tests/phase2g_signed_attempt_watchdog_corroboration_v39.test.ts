import {describe,it,expect} from "vitest";
import {
  signSyntheticSenderFrameV39,
  reconcileSyntheticSignedAttemptsV39
} from "../experiments/phase2g_rehearsal/signed_attempt_reconciliation_v39";
import {createSyntheticDualSourceMessageV2} from "../experiments/phase2g_rehearsal/dual_source_wire_canonical_receipt_v39";
import {evaluateSyntheticSixPlusFourWatchdogV39} from "../experiments/phase2g_rehearsal/synthetic_watchdog_six_plus_four_v39";
import {
  evaluateSyntheticWatchdogToleranceV39,
  type SimulatedDurableIngressEvidenceV39
} from "../experiments/phase2g_rehearsal/synthetic_watchdog_tolerance_gate_v39";

const SESSION="12345678-1234-4234-8234-123456789abc";
const SUB="synthetic-watchdog-owned-sub";
const OWNER="a".repeat(64);
const EDGKEY="offline-independent-edge-"+ "e".repeat(60);
const SENDKEY="offline-independent-sender-"+ "s".repeat(60);
const START="2026-10-12T03:00:00.000Z";
const END="2026-10-12T05:00:00.000Z";
const t=(n:number)=>new Date(Date.parse(START)+60_000*n).toISOString();
async function signedFixture(dropLastEdge=false){
  const receipts=await Promise.all([1,2,3,4].map(async i=>{
    const body=JSON.stringify({
      id:"offline-watchdog-source-"+i,
      subscription:{id:SUB},timestampUtc:t(i),
      deliveryAttempt:{seqNo:0,costCredits:1,timestampUtc:t(i)},
      flights:[]
    });
    return createSyntheticDualSourceMessageV2({
      rawBytes:new TextEncoder().encode(body),
      sessionId:SESSION,expectedProviderSubscriptionId:SUB,
      trustedReceivedAtUtc:t(i),privateEdgeSigningKey:EDGKEY
    });
  }));
  const frame={
    schema:"v39.phase2g-synthetic-independent-sender.v1" as const,
    mode:"synthetic-only" as const,sessionId:SESSION,
    providerSubscriptionId:SUB,ownerFrozenRunSha256:OWNER,
    windowStartUtc:START,windowEndUtc:END,
    attempts:receipts.map(r=>({
      attemptKey:r.receipt.attemptKey,
      notificationId:r.receipt.notificationId,
      attemptSeqNo:r.receipt.attemptSeqNo,
      providerAttemptUtc:r.receipt.providerAttemptUtc,
      providerGeneratedUtc:r.receipt.providerGeneratedUtc,
      wireSha256:r.receipt.wireSha256,
      canonicalSha256:r.receipt.canonicalSha256,
      syntheticCostCredits:1,senderResponseStatus:200,
      senderResponseElapsedMs:220
    }))
  };
  const committed=receipts.map(r=>({
    attemptKey:r.receipt.attemptKey,
    canonicalSha256:r.receipt.canonicalSha256,
    rawObjectReadbackSha256:r.receipt.canonicalSha256,
    originalEdgeReceivedUtc:r.receipt.firstEdgeReceivedAtUtc,
    syntheticCostCredits:1
  }));
  const r=await reconcileSyntheticSignedAttemptsV39({
    signedSender:signSyntheticSenderFrameV39(frame,SENDKEY),
    independentSenderKey:SENDKEY,edgeSigningKey:EDGKEY,
    expectedSessionId:SESSION,expectedProviderSubscriptionId:SUB,
    expectedOwnerFrozenRunSha256:OWNER,
    trustedAuditUtc:"2026-10-12T05:01:00.000Z",
    signedEdgeReceipts:dropLastEdge?receipts.slice(0,3):receipts,
    committedInternal:dropLastEdge?committed.slice(0,3):committed
  });
  return r;
}
const evidence=(verified:boolean,rawStorage:boolean):SimulatedDurableIngressEvidenceV39=>({
  ownerFrozenBindingVerified:true,
  independentSenderLedgerVerified:true,
  immutableFirstEdgeUtcAndWireShaVerified:true,
  durableFullRawBytesAndRetention168hVerified:rawStorage,
  allSenderAttemptsAtWatermarkMatchedToEdge:verified,
  scientificPhysicalV2EvidenceComplete:true,
  originalEightBucketsStillVerifiable:true,
  subscriberLeaseUnique:true,
  senderAttemptCount:4,durableEdgeAttemptCount:verified?4:3,
  externalSyntheticCredits:4,durableEdgeSyntheticCredits:verified?4:3,
  maxBacklogAgeSeconds:0,backlogDepth:0,
  queueTimeToLiveSeconds:86400,
  unloggedScientificStateKnownSafe:true
});
const evaluate=(e:SimulatedDurableIngressEvidenceV39)=>
  evaluateSyntheticWatchdogToleranceV39({
    mode:"synthetic-only",pollMs:15000,
    existingFailureLimit:3,candidateFailureLimit:6,
    providerMaxDeliveryRetries:0,
    samples:["timeout","timeout","timeout","transport_error","healthy"].map(
      health=>({health:health as "timeout"|"transport_error"|"healthy",evidence:e})
    )
  });
describe("P15 signed synthetic attempt ledger is not independently durable receiver proof",()=>{
  it("signed sender, edge HMAC and declared SQL all match, BUT absent proven 168h durable raw storage must stop at third check",async()=>{
    const r=await signedFixture();
    expect(r.attemptEvidenceConsistent).toBe(true);
    const p=evaluate(evidence(r.attemptEvidenceConsistent,false));
    expect(p).toMatchObject({
      stopPaidOwner:true,wouldStopAtHealthIndex:2,
      errors:["UNVERIFIED_ORIGINAL_SOURCE_BYTES_OR_TIME"],
      scientificPassAuthorized:false
    });
  });
  it("synthetically asserting separate durable-byte proof permits a comparison of six-check grace, NOT paid authorization",async()=>{
    const r=await signedFixture();
    expect(r.attemptEvidenceConsistent).toBe(true);
    const p=evaluate(evidence(r.attemptEvidenceConsistent,true));
    expect(p).toMatchObject({
      stopPaidOwner:false,observedDegradedButDurable:true,
      healthRecoveredAfterTransient:true,
      candidateDifferenceFromLiveContract:true,
      liveSupervisorChangeAuthorized:false,paidLaunchAuthorized:false,
      scientificPassAuthorized:false
    });
  });
  it("if one signed provider-emulator attempt never reached edge, longer health grace cannot mask it",async()=>{
    const r=await signedFixture(true);
    expect(r.attemptEvidenceConsistent).toBe(false);
    expect(r.errors).toContain("BILLED_SENDER_ATTEMPT_MISSING_AT_EDGE");
    const p=evaluate(evidence(r.attemptEvidenceConsistent,true));
    expect(p.stopPaidOwner).toBe(true);
    expect(p.wouldStopAtHealthIndex).toBe(0);
    expect(p.errors).toContain("KNOWN_SOURCE_DELIVERY_GAP");
  });
  it("6+4 signed sender and edge identities match, but absent real 168h raw-byte storage denies any grace",async()=>{
    const audit=await signedFixture();
    expect(audit.attemptEvidenceConsistent).toBe(true);
    const e=evidence(audit.attemptEvidenceConsistent,false);
    const policy=evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
      samples:Array.from({length:10},()=>({
        health:"transient_timeout" as const,
        evidence:{
          sourceEvidenceIndependentlyAuthenticated:e.independentSenderLedgerVerified,
          currentSenderWatermarkComplete:e.allSenderAttemptsAtWatermarkMatchedToEdge,
          senderAttemptCount:e.senderAttemptCount,
          durableExactAttemptCount:e.durableEdgeAttemptCount,
          senderAttemptCredits:e.externalSyntheticCredits,
          durableExactAttemptCredits:e.durableEdgeSyntheticCredits,
          unambiguousFirstEdgeUtcAndWireSha:e.immutableFirstEdgeUtcAndWireShaVerified,
          fullOriginalBytesReadBackVerified:e.durableFullRawBytesAndRetention168hVerified,
          rawRetentionHours:e.durableFullRawBytesAndRetention168hVerified?168:0,
          originalPhysicalFlightV2Continuity:e.scientificPhysicalV2EvidenceComplete,
          elapsedScientificBinsThroughWatermarkVerified:true,
          signedOwnerAndSubscriptionMatch:e.ownerFrozenBindingVerified,
          oneActiveOwnerLease:e.subscriberLeaseUnique,
          unloggedRecoverySourceComplete:e.unloggedScientificStateKnownSafe,
          durableQueueAvailable:true,queueBacklogAgeSeconds:0,
          queueRetentionSeconds:e.queueTimeToLiveSeconds,
          providerMaxDeliveryRetries:0 as const,
          frozenCreditCeiling:500,independentEstimatedUpperBoundSpend:20,
          currentEvidenceAgeSeconds:0
        }
      }))
    });
    expect(policy).toMatchObject({
      stopOwner:true,stopAtIndex:0,state:"STOP_SAFE_NO_PROOF",
      reasons:["ORIGINAL_RAW_SOURCE_OR_UTC_NOT_DURABLE"],
      publicationApproved:false
    });
  });
  it("6+4 no-provider demonstration may reach backup check eight only with declared source durability; no scientific PASS",async()=>{
    const audit=await signedFixture();
    expect(audit.attemptEvidenceConsistent).toBe(true);
    const e=evidence(audit.attemptEvidenceConsistent,true);
    const policy=evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
      samples:[...Array.from({length:8},()=> "transient_timeout" as const),"healthy" as const].map(
        health=>({health,evidence:{
          sourceEvidenceIndependentlyAuthenticated:e.independentSenderLedgerVerified,
          currentSenderWatermarkComplete:e.allSenderAttemptsAtWatermarkMatchedToEdge,
          senderAttemptCount:e.senderAttemptCount,
          durableExactAttemptCount:e.durableEdgeAttemptCount,
          senderAttemptCredits:e.externalSyntheticCredits,
          durableExactAttemptCredits:e.durableEdgeSyntheticCredits,
          unambiguousFirstEdgeUtcAndWireSha:e.immutableFirstEdgeUtcAndWireShaVerified,
          fullOriginalBytesReadBackVerified:e.durableFullRawBytesAndRetention168hVerified,
          rawRetentionHours:168,
          originalPhysicalFlightV2Continuity:e.scientificPhysicalV2EvidenceComplete,
          elapsedScientificBinsThroughWatermarkVerified:true,
          signedOwnerAndSubscriptionMatch:e.ownerFrozenBindingVerified,
          oneActiveOwnerLease:e.subscriberLeaseUnique,
          unloggedRecoverySourceComplete:e.unloggedScientificStateKnownSafe,
          durableQueueAvailable:true,queueBacklogAgeSeconds:0,
          queueRetentionSeconds:e.queueTimeToLiveSeconds,
          providerMaxDeliveryRetries:0 as const,
          frozenCreditCeiling:500,independentEstimatedUpperBoundSpend:20,
          currentEvidenceAgeSeconds:0
        }})
      )
    });
    expect(policy).toMatchObject({
      stopOwner:false,enteredContingency:true,contingencyChecksUsed:2,
      recoveredHealth:true,
      state:"HEALTH_RECOVERED_AUDIT_PENDING",
      scientificAdjudication:"PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS",
      paidLaunchAuthorized:false
    });
  });
  it("6+4 cannot overlook one sender-not-at-edge billed attempt while extending health grace",async()=>{
    const audit=await signedFixture(true);
    expect(audit.attemptEvidenceConsistent).toBe(false);
    expect(audit.errors).toContain("BILLED_SENDER_ATTEMPT_MISSING_AT_EDGE");
    const e=evidence(audit.attemptEvidenceConsistent,true);
    const policy=evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
      samples:[{
        health:"healthy" as const,evidence:{
          sourceEvidenceIndependentlyAuthenticated:e.independentSenderLedgerVerified,
          currentSenderWatermarkComplete:e.allSenderAttemptsAtWatermarkMatchedToEdge,
          senderAttemptCount:e.senderAttemptCount,
          durableExactAttemptCount:e.durableEdgeAttemptCount,
          senderAttemptCredits:e.externalSyntheticCredits,
          durableExactAttemptCredits:e.durableEdgeSyntheticCredits,
          unambiguousFirstEdgeUtcAndWireSha:e.immutableFirstEdgeUtcAndWireShaVerified,
          fullOriginalBytesReadBackVerified:e.durableFullRawBytesAndRetention168hVerified,
          rawRetentionHours:168,
          originalPhysicalFlightV2Continuity:e.scientificPhysicalV2EvidenceComplete,
          elapsedScientificBinsThroughWatermarkVerified:true,
          signedOwnerAndSubscriptionMatch:e.ownerFrozenBindingVerified,
          oneActiveOwnerLease:e.subscriberLeaseUnique,
          unloggedRecoverySourceComplete:e.unloggedScientificStateKnownSafe,
          durableQueueAvailable:true,queueBacklogAgeSeconds:0,
          queueRetentionSeconds:e.queueTimeToLiveSeconds,
          providerMaxDeliveryRetries:0 as const,
          frozenCreditCeiling:500,independentEstimatedUpperBoundSpend:20,
          currentEvidenceAgeSeconds:0
        }
      }]
    });
    expect(policy).toMatchObject({
      stopOwner:true,stopAtIndex:0,
      reasons:["ATTEMPT_OR_BILLING_GAP"],
      scientificAdjudication:"PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS"
    });
  });

});