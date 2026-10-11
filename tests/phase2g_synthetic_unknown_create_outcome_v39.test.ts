import {describe,expect,it} from "vitest";
import {
  evaluateSyntheticCreateUnknownOutcomeV39,
  type SyntheticCreateEvidenceV39
} from "../experiments/phase2g_rehearsal/synthetic_unknown_create_outcome_v39";

const SUB="synthetic-created-sub-1";
const frame=():SyntheticCreateEvidenceV39=>({
  mode:"synthetic-only",
  frozenPlanSha256:"a".repeat(64),
  preCreateIntentDurable:true,
  createAttemptSha256:"b".repeat(64),
  createOutcome:"ack_with_subscription",
  acknowledgedSubscriptionId:SUB,
  inventoryScope:"complete",
  inventoryCorrespondsToFrozenAttempt:true,
  reportedActiveOwnedSubscriptions:[SUB],
  providerSpendReconciledIndependently:true,
  ownerJournalBoundSubscriptionId:SUB
});
const audit=(patch:Partial<SyntheticCreateEvidenceV39>={})=>
  evaluateSyntheticCreateUnknownOutcomeV39({...frame(),...patch});
const refused=(patch:Partial<SyntheticCreateEvidenceV39>,reason:string)=>{
  const r=audit(patch);
  expect(r.errors).toContain(reason);
  expect(r.anotherCreateAllowed).toBe(false);
  expect(r.paidLaunchAuthorized).toBe(false);
  expect(r.scientificRunAuthorized).toBe(false);
  expect(r.automaticDeleteAuthorized).toBe(false);
};

describe("P13 synthetic unknown subscription-CREATE outcome requires reconciliation",()=>{
  it("a completely matched test-only create still cannot authorize paid launch or real uniqueness",()=>{
    expect(audit()).toEqual({
      state:"SINGLE_SUBSCRIPTION_CORROBORATED",errors:[],
      reportedSubscriptions:1,possibleUnrecordedProviderSpend:false,
      anotherCreateAllowed:false,paidLaunchAuthorized:false,
      scientificRunAuthorized:false,automaticDeleteAuthorized:false
    });
  });
  it("timeout after provider accepted CREATE with no owner response never permits blind second CREATE",()=>{
    refused({
      createOutcome:"timeout_unknown",acknowledgedSubscriptionId:null,
      ownerJournalBoundSubscriptionId:null,inventoryScope:"unavailable",
      inventoryCorrespondsToFrozenAttempt:false,
      reportedActiveOwnedSubscriptions:[],
      providerSpendReconciledIndependently:false
    },"AUTHORITATIVE_PROVIDER_INVENTORY_UNAVAILABLE");
    const r=audit({
      createOutcome:"timeout_unknown",acknowledgedSubscriptionId:null,
      ownerJournalBoundSubscriptionId:null,inventoryScope:"unavailable",
      inventoryCorrespondsToFrozenAttempt:false,
      reportedActiveOwnedSubscriptions:[],
      providerSpendReconciledIndependently:false
    });
    expect(r.state).toBe("UNKNOWN_PROVIDER_OUTCOME");
    expect(r.possibleUnrecordedProviderSpend).toBe(true);
  });
  it("even zero active subscriptions in a complete listing does not prove that failed CREATE cost nothing",()=>{
    const r=audit({
      createOutcome:"process_crash_after_send",
      acknowledgedSubscriptionId:null,ownerJournalBoundSubscriptionId:null,
      reportedActiveOwnedSubscriptions:[],
      providerSpendReconciledIndependently:false
    });
    expect(r.errors).toContain("UNKNOWN_CREATE_OUTCOME_UNRESOLVED");
    expect(r.possibleUnrecordedProviderSpend).toBe(true);
    expect(r.anotherCreateAllowed).toBe(false);
  });
  it("a recovered provider subscription unknown to journal must be quarantined",()=>{
    refused({
      createOutcome:"timeout_unknown",acknowledgedSubscriptionId:null,
      ownerJournalBoundSubscriptionId:null
    },"OWNER_JOURNAL_BINDING_MISSING");
  });
  it("two active provider subscriptions tied to one plan are never accepted",()=>{
    const r=audit({
      reportedActiveOwnedSubscriptions:[SUB,"synthetic-created-sub-2"]
    });
    expect(r.state).toBe("CONFLICTING_SUBSCRIPTIONS");
    expect(r.errors).toContain("MULTIPLE_ACTIVE_SUBSCRIPTIONS_FOR_ONE_PLAN");
    expect(r.anotherCreateAllowed).toBe(false);
  });
  it("provider response ID and journal ID must both match independent inventory",()=>{
    refused({
      reportedActiveOwnedSubscriptions:["different-sub"]
    },"ACK_NOT_IN_PROVIDER_INVENTORY");
    refused({
      ownerJournalBoundSubscriptionId:"different-sub"
    },"OWNER_JOURNAL_NOT_IN_PROVIDER_INVENTORY");
  });
  it("incomplete inventory, stale or unbound inventory cannot prove absence of second subscription",()=>{
    refused({inventoryScope:"incomplete"},
      "AUTHORITATIVE_PROVIDER_INVENTORY_UNAVAILABLE");
    refused({inventoryCorrespondsToFrozenAttempt:false},
      "INVENTORY_NOT_BOUND_TO_FROZEN_CREATE");
  });
  it("HTTP errors after CREATE could still have an external side effect; no blind retry",()=>{
    const r=audit({
      createOutcome:"http_error_unknown",acknowledgedSubscriptionId:null,
      ownerJournalBoundSubscriptionId:null,
      reportedActiveOwnedSubscriptions:[],providerSpendReconciledIndependently:false
    });
    expect(r.possibleUnrecordedProviderSpend).toBe(true);
    expect(r.anotherCreateAllowed).toBe(false);
  });
  it("a missing durable pre-create intent must not be fixed by an ACK alone",()=>{
    refused({preCreateIntentDurable:false},"PRECREATE_DURABLE_INTENT_UNPROVEN");
    refused({createAttemptSha256:null},"PRECREATE_DURABLE_INTENT_UNPROVEN");
  });
  it("billing ambiguity vetoes all purported success even if provider ID matches",()=>{
    refused({providerSpendReconciledIndependently:false},
      "PROVIDER_BILLING_NOT_RECONCILED");
  });
  it("never-sent requests remain NOT_SENT and cannot claim an acknowledged subscription",()=>{
    const result=audit({
      createOutcome:"never_sent",acknowledgedSubscriptionId:null,
      reportedActiveOwnedSubscriptions:[],ownerJournalBoundSubscriptionId:null,
      providerSpendReconciledIndependently:false
    });
    expect(result.state).toBe("NOT_SENT");
    expect(result.possibleUnrecordedProviderSpend).toBe(false);
    refused({createOutcome:"never_sent"},"NO_CREATE_SENT_BUT_SUBSCRIPTION_DECLARED");
  });
  it("malformed hashes, unexpected mode, fake subscription and duplicated inventory entries are rejected",()=>{
    expect(()=>audit({frozenPlanSha256:"short"})).toThrow(
      "SYNTHETIC_CREATE_EVIDENCE_INVALID"
    );
    expect(()=>audit({mode:"paid" as "synthetic-only"})).toThrow(
      "SYNTHETIC_CREATE_EVIDENCE_INVALID"
    );
    expect(()=>audit({acknowledgedSubscriptionId:"a space"})).toThrow(
      "SYNTHETIC_CREATE_EVIDENCE_INVALID"
    );
    refused({reportedActiveOwnedSubscriptions:[SUB,SUB]},
      "DUPLICATED_INVENTORY_ENTRY");
  });
});