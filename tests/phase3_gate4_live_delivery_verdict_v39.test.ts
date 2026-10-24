import {describe,it,expect} from "vitest";
import {assessGate4LiveDeliveryV39} from
  "../server/lib/disruption/gate4LiveDeliveryVerdict_v39";
import type {Gate4LiveEvidenceV39} from
  "../server/lib/disruption/gate4LiveDeliveryVerdict_v39";

const previous:Gate4LiveEvidenceV39={
  positiveCreateVerified:true,
  ownedBindingVerified:true,
  independentExactStopVerified:true,
  stableSettlementReads:3,
  activeBillableAfterStop:0,
  settledExternalCreditDelta:0,
  paidWindowOriginalRows:0,
  paidWindowShaVerifiedRows:0,
  positivePaidIdClaimRows:0,
  historicalSyntheticRows:1,
  providerSendAttempts:null
};

describe("Gate4 scientific verdict — pure offline, no provider/db",()=>{
  it("classifies the actual Oct 23 zero-paid-callback result as safe but INCONCLUSIVE",()=>{
    const result=assessGate4LiveDeliveryV39(previous);
    expect(result.status).toBe("SAFETY_PASS_DELIVERY_NOT_OBSERVED");
    expect(result.safetyPassed).toBe(true);
    expect(result.reliabilityPercent).toBeNull();
    expect(result.originalFullGate4RubricCertified).toBe(false);
    expect(result.independentProviderHmacAuthenticated).toBe(false);
    expect(result.providerCalls).toBe(0);
    expect(result.databaseWrites).toBe(0);
    expect(result.authorizesPhase4Paid).toBe(false);
  });
  it("never counts preserved historical synthetic messages as a real paid receipt",()=>{
    const result=assessGate4LiveDeliveryV39({
      ...previous,historicalSyntheticRows:17
    });
    expect(result.status).toBe("SAFETY_PASS_DELIVERY_NOT_OBSERVED");
    expect(result.shaVerifiedPositivePaidIdClaimRows).toBe(0);
  });
  it("flags billed SEND credits without any preserved receiver originals",()=>{
    const result=assessGate4LiveDeliveryV39({
      ...previous,settledExternalCreditDelta:2,providerSendAttempts:2
    });
    expect(result.status).toBe("SAFETY_PASS_DELIVERY_GAP_SUSPECTED");
    expect(result.reliabilityPercent).toBeNull();
  });
  it("a correct paid-scope original with a matched owner claim and settled debit is qualified live feasibility",()=>{
    const result=assessGate4LiveDeliveryV39({
      ...previous,
      settledExternalCreditDelta:2,
      paidWindowOriginalRows:1,paidWindowShaVerifiedRows:1,
      positivePaidIdClaimRows:1,providerSendAttempts:1
    });
    expect(result.status).toBe("QUALIFIED_LIVE_ALERT_FEASIBILITY_OBSERVED");
    expect(result.safetyPassed).toBe(true);
    expect(result.shaVerifiedPositivePaidIdClaimRows).toBe(1);
    expect(result.reliabilityPercent).toBeNull();
    expect(result.originalFullGate4RubricCertified).toBe(false);
  });
  it("paid original and provider debit without provider SEND log can still be qualified with explicit provenance limits",()=>{
    const result=assessGate4LiveDeliveryV39({
      ...previous,
      settledExternalCreditDelta:1,
      paidWindowOriginalRows:1,paidWindowShaVerifiedRows:1,
      positivePaidIdClaimRows:1,
      providerSendAttempts:null
    });
    expect(result.status).toBe("QUALIFIED_LIVE_ALERT_FEASIBILITY_OBSERVED");
    expect(result.independentProviderHmacAuthenticated).toBe(false);
  });
  it("does not infer paid delivery from unmatched claim or wrong SHA",()=>{
    const unmatched=assessGate4LiveDeliveryV39({
      ...previous,paidWindowOriginalRows:1,paidWindowShaVerifiedRows:1,
      positivePaidIdClaimRows:0
    });
    expect(unmatched.status).toBe("SAFETY_PASS_DELIVERY_NOT_OBSERVED");
    const invalid=assessGate4LiveDeliveryV39({
      ...previous,paidWindowOriginalRows:0,paidWindowShaVerifiedRows:1,
      positivePaidIdClaimRows:1
    });
    expect(invalid.status).toBe("EVIDENCE_INCONSISTENT_HOLD");
  });
  it("positive original but no final provider charge requires accounting review",()=>{
    const r=assessGate4LiveDeliveryV39({
      ...previous,
      paidWindowOriginalRows:1,paidWindowShaVerifiedRows:1,
      positivePaidIdClaimRows:1
    });
    expect(r.status).toBe("SAFETY_PASS_POSITIVE_ORIGINAL_ACCOUNT_UNSETTLED");
  });
  it("refuses a supposed positive original when the provider confirms zero sends",()=>{
    const r=assessGate4LiveDeliveryV39({
      ...previous,
      settledExternalCreditDelta:2,
      paidWindowOriginalRows:1,paidWindowShaVerifiedRows:1,
      positivePaidIdClaimRows:1,
      providerSendAttempts:0
    });
    expect(r.status).toBe("EVIDENCE_INCONSISTENT_HOLD");
  });
  it("missing independent STOP or three account observations keeps safety open",()=>{
    const a=assessGate4LiveDeliveryV39({
      ...previous,independentExactStopVerified:false
    });
    const b=assessGate4LiveDeliveryV39({
      ...previous,stableSettlementReads:2
    });
    expect(a.status).toBe("SAFETY_HOLD");
    expect(b.status).toBe("SAFETY_HOLD");
    expect(b.authorizesProviderRequest).toBe(false);
  });
  it("null external balances remain unknown; never converted to zero",()=>{
    const a=assessGate4LiveDeliveryV39({
      ...previous,activeBillableAfterStop:null
    });
    expect(a.status).toBe("SAFETY_HOLD");
    const b=assessGate4LiveDeliveryV39({
      ...previous,settledExternalCreditDelta:null
    });
    expect(b.status).toBe("SAFETY_PASS_DELIVERY_NOT_OBSERVED");
  });
});
