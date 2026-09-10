import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it, vi } from "vitest";
import {
  CURRENT_NEW_RAPIDAPI_ULTRA_BASELINE_UNITS,
  evaluateGate0Accounting,
  MAX_DESIGN_CEILING,
  REST_CATEGORIES,
  serializeGate0Artifact,
  type Gate0AccountEvidence,
} from "../server/lib/disruption/gate0Accounting_v39";
import { runGate0Gather } from "../scripts/gate0_evidence_gather";

function validEvidence(overrides: Partial<Gate0AccountEvidence> = {}): Gate0AccountEvidence {
  return {
    schema_version: "v3.9-gate0-account-evidence-2",
    gathered_at_utc: "2026-09-10T05:30:00Z",
    provenance: "sanitized active-account dashboard/header evidence",
    active_subscribed_plan: "RapidAPI Ultra",
    plan_version_basis: "current_new_subscription",
    entitlement_verified_for_active_subscription: true,
    subscription_channel: "rapidapi",
    account_plan_id: "plan-account-1",
    billing_cycle_start_utc: "2026-09-10T00:00:00Z",
    billing_cycle_end_utc: "2026-10-10T00:00:00Z",
    cycle_entitlement_units: 50_000,
    api_units_consumed_before_freeze: 1_000,
    api_units_remaining: 49_000,
    opening_nonexpiring_alert_balance: 3_000,
    refill_history: [],
    refill_conversion_api_units_per_credit: 1,
    refill_min_credits: 1,
    refill_max_credits: 50_000,
    alert_balance_cap_credits: 60_000,
    fids_endpoint: "GET /flights/airports/{codeType}/{code}/{fromLocal}/{toLocal}",
    fids_tier: "TIER 2",
    fids_units_per_request: 2,
    rate_limit_and_account_mechanics: "verified current RapidAPI Ultra terms",
    active_subscription_inventory: [],
    authorized_alert_refill_credits: 46_000,
    authorized_alert_refill_units: 46_000,
    protected_alert_floor: 1_000,
    ending_alert_margin: 100,
    pre_smoke_unsettled_burst_margin_credits: 50,
    protected_api_floor_units: 1_000,
    ending_api_margin_units: 100,
    pre_run_alert_subcaps: {
      safety_smoke: 100,
      stage1_candidates_and_replacements: 300,
      stage2_confirmations_and_replacements: 300,
      gate3: 100,
      gate05: 50,
      gate4_live_check: 50,
    },
    pre_run_alert_spend_ceiling: 900,
    phase6_alert_spend_ceiling: 47_000,
    unallocated_alert_credits: 0,
    rest_categories: {
      fids_base_units: 100,
      fids_split_units: 100,
      fids_retry_unit_budget: 100,
      validation_unit_budget: 100,
      outcome_rest_unit_budget: 100,
      history_bootstrap_unit_budget: 100,
      diagnostic_unit_budget: 100,
    },
    unallocated_api_units: 1_200,
    ...overrides,
  };
}

const identity = { evidenceId: "GATE-0-20260910-001", authorizationId: "AUTH-20260910-G0" };

describe("Gate 0 accounting owner", () => {
  it("uses 50,000 only as the current new-Ultra planning baseline, not a hard gate", () => {
    expect(CURRENT_NEW_RAPIDAPI_ULTRA_BASELINE_UNITS).toBe(50_000);
    expect(evaluateGate0Accounting(validEvidence(), identity).status).toBe("PASS");
  });

  it("accepts another explicitly verified entitlement, such as a grandfathered plan", () => {
    const grandfathered = validEvidence({
      plan_version_basis: "grandfathered",
      cycle_entitlement_units: 60_000,
      api_units_remaining: 59_000,
      authorized_alert_refill_credits: 56_000,
      authorized_alert_refill_units: 56_000,
      phase6_alert_spend_ceiling: 57_000,
      unallocated_alert_credits: 0,
      unallocated_api_units: 1_200,
    });
    expect(evaluateGate0Accounting(grandfathered, identity).status).toBe("PASS");
  });

  it("blocks an unverified entitlement even when the arithmetic balances", () => {
    expect(evaluateGate0Accounting(validEvidence({ entitlement_verified_for_active_subscription: false }), identity).reasons)
      .toContain("UNVERIFIED:entitlement_for_active_subscription");
  });

  it("blocks missing fields, invalid identities, and incomplete categories", () => {
    const missing = validEvidence({ account_plan_id: "" });
    expect(evaluateGate0Accounting(missing, identity).status).toBe("BLOCKED");
    const invalid = validEvidence({ unallocated_alert_credits: 1 });
    expect(evaluateGate0Accounting(invalid, identity).reasons).toContain("IDENTITY:alert_balance");
    const categories = validEvidence();
    delete (categories.rest_categories as any)[REST_CATEGORIES[6]];
    expect(evaluateGate0Accounting(categories, identity).status).toBe("BLOCKED");
  });

  it("uses 57,900 only as an absolute upper bound", () => {
    const evidence = validEvidence();
    expect(evaluateGate0Accounting(evidence, identity).status).toBe("PASS");
    expect(evidence.phase6_alert_spend_ceiling).toBeLessThan(MAX_DESIGN_CEILING);
    expect(evaluateGate0Accounting({ ...evidence, phase6_alert_spend_ceiling: MAX_DESIGN_CEILING }, identity).status).toBe("BLOCKED");
  });

  it("requires a positive measured FIDS unit cost and never accepts the observed 0 as proof", () => {
    expect(evaluateGate0Accounting(validEvidence({ fids_units_per_request: 0 }), identity).reasons)
      .toContain("INVALID:fids_units_per_request_must_be_positive");
  });

  it("allow-lists output and cannot serialize secrets", () => {
    const artifact = evaluateGate0Accounting({ ...validEvidence(), api_key: "SUPER_SECRET", authorization: "Bearer SUPER_SECRET" }, identity);
    expect(serializeGate0Artifact(artifact)).not.toContain("SUPER_SECRET");
  });
});

describe("Gate 0 gather", () => {
  function evidenceFile(evidence: Gate0AccountEvidence): string {
    const file = join(mkdtempSync(join(tmpdir(), "gate0-")), "account.json");
    writeFileSync(file, JSON.stringify(evidence));
    return file;
  }
  const args = (file: string) => ["--auth", identity.authorizationId, "--auth-file", "auth.json", "--evidence-id", identity.evidenceId, "--account-evidence-file", file];

  it("honors auth and evidence id before account reads", async () => {
    const readers = { getBalance: vi.fn(), listSubscriptionsStrict: vi.fn() };
    await expect(runGate0Gather(args(evidenceFile(validEvidence())), readers, () => false)).rejects.toThrow("AUTH verification failed");
    expect(readers.getBalance).not.toHaveBeenCalled();
  });

  it("makes only balance and strict subscription reads and honors evidence id", async () => {
    const readers = { getBalance: vi.fn().mockResolvedValue({ creditsRemaining: 3_000 }), listSubscriptionsStrict: vi.fn().mockResolvedValue([]) };
    const result = await runGate0Gather(args(evidenceFile(validEvidence())), readers, () => true);
    expect(result.evidence_id).toBe(identity.evidenceId);
    expect(result.status).toBe("PASS");
    expect(readers.getBalance).toHaveBeenCalledOnce();
    expect(readers.listSubscriptionsStrict).toHaveBeenCalledOnce();
  });

  it("uses the exact Phase Gate auth scope and fails closed on strict listing uncertainty", async () => {
    const authorize = vi.fn().mockReturnValue(true);
    const readers = { getBalance: vi.fn().mockResolvedValue({ creditsRemaining: 3_000 }), listSubscriptionsStrict: vi.fn().mockRejectedValue(new Error("uncertain")) };
    await expect(runGate0Gather(args(evidenceFile(validEvidence())), readers, authorize)).rejects.toThrow("uncertain");
    expect(authorize).toHaveBeenCalledWith("auth.json", "Phase 1 / Gate 0", identity.authorizationId);
  });

  it("refuses the RapidAPI reader for every other explicit channel", async () => {
    const readers = { getBalance: vi.fn(), listSubscriptionsStrict: vi.fn() };
    const result = await runGate0Gather(args(evidenceFile(validEvidence({ subscription_channel: "direct" }))), readers, () => true);
    expect(result.status).toBe("BLOCKED");
    expect(readers.getBalance).not.toHaveBeenCalled();
  });

  it("fails closed when balance is uncertain", async () => {
    const readers = { getBalance: vi.fn().mockResolvedValue(null), listSubscriptionsStrict: vi.fn() };
    await expect(runGate0Gather(args(evidenceFile(validEvidence())), readers, () => true)).rejects.toThrow("getBalance");
    expect(readers.listSubscriptionsStrict).not.toHaveBeenCalled();
  });
});
