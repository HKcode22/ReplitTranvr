import {describe, expect, it} from "vitest";
import {
  evaluateGate3PrepaidOfflineFixtureV39 as evaluate,
  GATE3_PREPAID_PATH_TEMPLATE_V39 as prepaidRoute,
  type Gate3OfflineFixtureV39,
} from "../server/lib/disruption/gate3PrepaidCanaryOfflineContract_v39";

const session = "cfe27b51-fb64-4b13-8cb3-00000000aa01";
const base = (): Gate3OfflineFixtureV39 => ({
  routeTemplate: prepaidRoute,
  sessionId: session,
  subscriptionId: "SUB-CANARY-001",
  balanceBefore: 500,
  balanceReads: [
    {remainingCredits: 498, observedAtMs: 0},
    {remainingCredits: 498, observedAtMs: 10_000},
    {remainingCredits: 498, observedAtMs: 20_000},
  ],
  minSettlementPollIntervalMs: 10_000,
  sourceEvents: [
    {sourceId:"raw-original-a",sessionId:session,
      subscriptionId:"SUB-CANARY-001",itemCount:2,explicitCostCredits:2,
      originalBlobShaVerified:true,rawDurableBeforeAck:true,http2xxAfterRaw:true,
      semanticItemLedgerStored:true},
  ],
  publisherRouteBindingAsserted: true,
  foreignActiveBillableBefore: 0,
  ownedActiveBillableAfterCleanup: 0,
  exactOwnedSubscriptionDeleteVerified:true,
});

describe("Phase3 Gate3 INERT exact-prepaid-session canary contract; NO provider/DB",()=>{
  it("valid offline sample remains explicitly NOT a live Gate3 PASS",()=>{
    const result=evaluate(base());
    expect(result).toMatchObject({
      status:"OFFLINE_FIXTURE_PASS",externalBilledCredits:2,
      internalSavedCredits:2,discrepancyCredits:0,
      minimumStableBalanceReadsVerified:true,
      liveGate3Certified:false,paidProviderAuthorized:false,
      legacyPaidCanaryUnblocked:false,
    });
  });
  it.each([
    ["legacy endpoint", {routeTemplate:"/api/v1/webhooks/aerodatabox/:secret"}],
    ["session not signed-shape", {sessionId:"no-session"}],
    ["published binding not supplied", {publisherRouteBindingAsserted:false}],
    ["string true not evidence", {publisherRouteBindingAsserted:"true"}],
    ["foreign active subscription", {foreignActiveBillableBefore:1}],
    ["unknown foreign billable", {foreignActiveBillableBefore:null}],
    ["postrun owned subscription still active", {ownedActiveBillableAfterCleanup:1}],
    ["subscription deletion missing", {exactOwnedSubscriptionDeleteVerified:false}],
    ["zero-cost no-event canary", {balanceBefore:500,balanceReads:[
      {remainingCredits:500,observedAtMs:0},
      {remainingCredits:500,observedAtMs:10000},
      {remainingCredits:500,observedAtMs:20000},
    ]}],
    ["negative initial account", {balanceBefore:-1}],
    ["cadence zero", {minSettlementPollIntervalMs:0}],
    ["balance increases (foreign refill)", {balanceReads:[
      {remainingCredits:497,observedAtMs:0},
      {remainingCredits:498,observedAtMs:10000},
      {remainingCredits:498,observedAtMs:20000},
    ]}],
    ["nonfinite balance", {balanceReads:[
      {remainingCredits:NaN,observedAtMs:0},
      {remainingCredits:NaN,observedAtMs:10000},
      {remainingCredits:NaN,observedAtMs:20000},
    ]}],
    ["insufficient read count", {balanceReads:[
      {remainingCredits:498,observedAtMs:0},
      {remainingCredits:498,observedAtMs:10000},
    ]}],
    ["changes in last stable triple", {balanceReads:[
      {remainingCredits:498,observedAtMs:0},
      {remainingCredits:497,observedAtMs:10000},
      {remainingCredits:497,observedAtMs:20000},
    ]}],
    ["spaced too tightly", {balanceReads:[
      {remainingCredits:498,observedAtMs:0},
      {remainingCredits:498,observedAtMs:500},
      {remainingCredits:498,observedAtMs:1000},
    ]}],
    ["billing mismatch", {balanceReads:[
      {remainingCredits:497,observedAtMs:0},
      {remainingCredits:497,observedAtMs:10000},
      {remainingCredits:497,observedAtMs:20000},
    ]}],
    ["no original source", {sourceEvents:[]}],
    ["source with wrong session", {sourceEvents:[{
      ...base().sourceEvents[0],sessionId:"b888aabb-bbcc-4ddd-8eee-112233445566",
    }]}],
    ["raw not SHA verified", {sourceEvents:[{
      ...base().sourceEvents[0],originalBlobShaVerified:false,
    }]}],
    ["durability false", {sourceEvents:[{
      ...base().sourceEvents[0],rawDurableBeforeAck:false,
    }]}],
    ["durability truthy-string", {sourceEvents:[{
      ...base().sourceEvents[0],rawDurableBeforeAck:"true",
    }]}],
    ["wrong explicit cost", {sourceEvents:[{
      ...base().sourceEvents[0],explicitCostCredits:1,
    }]}],
    ["no ledger", {sourceEvents:[{
      ...base().sourceEvents[0],semanticItemLedgerStored:false,
    }]}],
    ["no 2xx after raw", {sourceEvents:[{
      ...base().sourceEvents[0],http2xxAfterRaw:false,
    }]}],
    ["duplicate raw object", {sourceEvents:[
      base().sourceEvents[0],base().sourceEvents[0],
    ]}],
    ["malformed item count", {sourceEvents:[{
      ...base().sourceEvents[0],itemCount:"2",
    }]}],
  ])("fails closed for %s", (_label, difference)=>{
    const fixture={...base(),...difference} as Gate3OfflineFixtureV39;
    const result=evaluate(fixture);
    expect(result.status).toBe("OFFLINE_FIXTURE_HOLD");
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.paidProviderAuthorized).toBe(false);
    expect(result.legacyPaidCanaryUnblocked).toBe(false);
  });
  it("rejects malformed top-level JSON objects safely",()=>{
    for(const obj of [null,undefined,[],"approved"]) {
      expect(evaluate(obj as Gate3OfflineFixtureV39).status)
        .toBe("OFFLINE_FIXTURE_HOLD");
    }
  });
});
