import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {
  GATE05_PROVIDER_POLL_INTERVAL_MS,
  GATE05_ACTIVE_BALANCE_TELEMETRY_GRACE_MS
} from "../server/lib/disruption/gate05ProviderTelemetrySafety_v39";

const workflow=readFileSync(
  ".github/workflows/phase3-gate05-science-exact-owned-stop-retry5.yml","utf8");
const worker=readFileSync(
  "scripts/v39_gate05_science_exact_owned_actions_stop_retry6_v39.ts","utf8");

describe("Gate05 future independent STOP workflow uses real retry6 recovery",()=>{
  it("keeps existing one-click protected GitHub workflow, not duplicate STOP workflows",()=>{
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("environment: gate05-safety");
    expect(workflow).toContain("group: gate05-one-wsss-scientific-alert-stop");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("timeout-minutes: 165");
    expect(workflow).toContain(
      "node --import tsx scripts/v39_gate05_science_exact_owned_actions_stop_retry6_v39.ts");
    expect(workflow).not.toContain(
      "node --import tsx scripts/v39_gate05_science_exact_owned_actions_stop_retry5_v39.ts");
    expect(workflow).not.toContain("schedule:");
    expect(workflow).not.toContain("push:");
  });
  it("limits provider mutation to independently pinned exact-owned DELETE",()=>{
    expect(workflow).toContain("GATE05_SAFETY_APPROVED_SCOPE");
    expect(workflow).toContain("GATE05_SAFETY_APPROVED_STOP_TICKET_SHA256");
    expect(workflow).toContain("GATE05_SCIENCE_SAFETY_DATABASE_URL");
    expect(worker).toContain("authorization_sha256!==p.authorization");
    expect(worker).toContain("reviewed_stop_ticket_sha256!==p.ticket");
    expect(worker).toContain("deleteSubscriptionVerifiedStrict(knownExactId");
    expect(worker).not.toContain("createGate4SingleWithRawReceiptV39(");
    expect(worker).not.toContain("refillBalance(");
    expect(worker).not.toContain("fetchFidsAirport(");
  });
  it("controls transient FREE telemetry outages by time, not fictitious balance",()=>{
    expect(GATE05_PROVIDER_POLL_INTERVAL_MS).toBe(25_000);
    expect(GATE05_ACTIVE_BALANCE_TELEMETRY_GRACE_MS).toBe(120_000);
    expect(worker).toContain("GATE05_STOP_TRANSIENT_FREE_TELEMETRY_GAP");
    expect(worker).toContain("EXACT_OWNED_DELETE_VERIFIED_BILLING_SETTLEMENT_PENDING");
    expect(worker).toContain("shortenedObservation:true");
    expect(worker).toContain("strictSciencePassed:false");
    expect(worker).toContain("noFlightRecordsSynthesized:true");
  });
});
