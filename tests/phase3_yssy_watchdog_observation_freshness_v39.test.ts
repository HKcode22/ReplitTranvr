import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {assessPhase2gSustainedCreditGapV39}
  from "../server/lib/disruption/phase2gSustainedCreditGapSignal_v39";

const watchdog=readFileSync("scripts/v39_phase2g_github_actions_watchdog_v39.ts","utf8");
describe("YSSY billing-vs-ingest freshness telemetry, no paid provider",()=>{
 it("records provider's actual poll freshness and cached provisional gap separately",()=>{
  expect(watchdog).toContain("lastProviderBalanceObservedAtMs = Date.now()");
  expect(watchdog).toContain("provider_balance_observed_at_utc:");
  expect(watchdog).toContain("provisional_item_credit_difference:");
  expect(watchdog).toContain("baseline - lastProviderBalance - internalCredits");
  expect(watchdog).toContain("provisional_gap_is_not_sender_proof: true");
  expect(watchdog).toContain("provisional_gap_triggers_automatic_stop: false");
  // Existing 6+6 and financial STOP controls remain independent; this
  // additional diagnostic does not call the provider or create alerts.
  expect(watchdog).not.toContain("await assessPhase2gSustainedCreditGapV39(");
 });
 it("persistent +2 with stale source poll is not a fresh matched SEND ledger",()=>{
  const observedAtMs=Date.parse("2026-10-13T04:23:00Z");
  const samples=Array.from({length:5},(_,i)=>({
    observedAtMs:observedAtMs+i*31_000,
    providerCreditsRemaining:2142,
    retainedItemClaims:143,
    providerBalanceObservedAtMs:observedAtMs-90_000,
    receiverFailureObserved:false
  }));
  const limits={
    positiveGapReviewUnits:2,minimumConsecutiveSamples:4,
    minimumPersistenceMs:90_000,maximumProviderBalanceAgeMs:35_000
  };
  const r=assessPhase2gSustainedCreditGapV39(2287,samples,limits);
  expect(r.status).toBe("SUSTAINED_GAP_UNCONFIRMED_PROVIDER_BALANCE_FRESHNESS");
  expect(r.maximumPositiveGapItemUnits).toBe(2);
  expect(r.providerSendRootCauseIdentified).toBe(false);
  expect(r.automaticStopPermitted).toBe(false);
 });
});
