import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CURRENT_NEW_RAPIDAPI_ULTRA_BASELINE_UNITS,
  evaluateGate0Accounting,
  MAX_DESIGN_CEILING,
  serializeGate0Artifact,
  type Gate0AccountEvidence,
} from "../server/lib/disruption/gate0Accounting_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";
import { runGate0Gather } from "../scripts/gate0_evidence_gather";

function accountEvidence(overrides: Partial<Gate0AccountEvidence> = {}): Gate0AccountEvidence {
  return {
    schema_version: "v3.9-gate0-account-evidence-3",
    gathered_at_utc: "2026-09-10T06:47:29.000Z",
    provenance: "RapidAPI free balance/list reads + user-provided team plan metadata",
    active_subscribed_plan: "RapidAPI Ultra",
    plan_version_basis: "grandfathered",
    entitlement_verified_for_active_subscription: true,
    account_identity_verified: true,
    account_identity_evidence: "test fixture binds credential to intended team subscription",
    subscription_channel: "rapidapi",
    account_plan_id: "travnr-team",
    billing_cycle_start_utc: null,
    billing_cycle_start_basis: "marketplace cycle reported as 2026-09-04; exact start time not exposed",
    billing_cycle_end_utc: "2026-10-04T02:21:21.000Z",
    cycle_entitlement_units: 60_000,
    api_units_consumed_before_freeze: 6,
    api_units_remaining: 59_994,
    project_cycle_api_unit_ceiling: 50_000,
    rapidapi_quota_headers: {
      observed_at_utc: "2026-09-10T06:47:29.000Z",
      api_units_limit: 60_000,
      api_units_remaining: 59_994,
      api_units_reset_seconds: 2_057_632,
      api_units_reset_at_utc: "2026-10-04T02:21:21.000Z",
      requests_limit: 240_000,
      requests_remaining: 237_905,
      requests_reset_seconds: 2_057_632,
      request_id: "request-1",
      rapidapi_region: "AWS - us-west-2",
      rapidapi_version: "0.0.46",
    },
    opening_nonexpiring_alert_balance: 2_900,
    fids_endpoint: "GET /flights/airports/{codeType}/{code}/{fromLocal}/{toLocal}",
    fids_tier: "TIER 2",
    fids_units_per_request: 2,
    rate_limit_and_account_mechanics: "RapidAPI custom quota headers observed live; provider contract pinned separately",
    active_subscription_inventory: [],
    ...overrides,
  };
}

function completeBudget(overrides: Partial<Gate0AccountEvidence> = {}): Gate0AccountEvidence {
  return accountEvidence({
    refill_history: [],
    refill_conversion_api_units_per_credit: 1,
    refill_min_credits: 1,
    refill_max_credits: 60_000,
    alert_balance_cap_credits: 60_000,
    authorized_alert_refill_credits: 0,
    authorized_alert_refill_units: 0,
    protected_alert_floor: 1_000,
    ending_alert_margin: 100,
    pre_smoke_unsettled_burst_margin_credits: 50,
    protected_api_floor_units: 1_000,
    ending_api_margin_units: 100,
    pre_run_alert_subcaps: {
      safety_smoke: 50,
      stage1_candidates_and_replacements: 200,
      stage2_confirmations_and_replacements: 200,
      gate3: 50,
      gate05: 50,
      gate4_live_check: 50,
    },
    pre_run_alert_spend_ceiling: 600,
    phase6_alert_spend_ceiling: 1_000,
    unallocated_alert_credits: 200,
    rest_categories: {
      fids_base_units: 100,
      fids_split_units: 100,
      fids_retry_unit_budget: 100,
      validation_unit_budget: 100,
      outcome_rest_unit_budget: 100,
      history_bootstrap_unit_budget: 100,
      diagnostic_unit_budget: 100,
    },
    unallocated_api_units: 48_194,
    ...overrides,
  });
}

const identity = { evidenceId: "GATE-0-20260909-A", authorizationId: "AUTH-20260909-G0A" };

describe("Gate 0 account verification and later budget freeze", () => {
  it("keeps the current-new Ultra 50k value as a planning reference only", () => {
    expect(CURRENT_NEW_RAPIDAPI_ULTRA_BASELINE_UNITS).toBe(50_000);
    const result = evaluateGate0Accounting(accountEvidence(), identity);
    expect(result.status).toBe("PASS");
    expect(result.budget_freeze_status).toBe("BLOCKED_LATER_LIVE_VALUE");
  });

  it("separates live 60k provider entitlement from the user-authorized 50k project ceiling", () => {
    const result = evaluateGate0Accounting(accountEvidence(), identity);
    expect(result.status).toBe("PASS");
    const usage = result.evidence_items.api_cycle_usage as Record<string, number>;
    expect(usage.provider_entitlement).toBe(60_000);
    expect(usage.project_cycle_api_unit_ceiling).toBe(50_000);
    expect(usage.project_remaining_after_observed_consumption).toBe(49_994);
    expect(usage.provider_entitlement_outside_project_ceiling).toBe(10_000);
  });

  it("blocks when the intended team/account identity is not verified", () => {
    const result = evaluateGate0Accounting(accountEvidence({ account_identity_verified: false }), identity);
    expect(result.status).toBe("BLOCKED");
    expect(result.reasons).toContain("UNVERIFIED:account_identity_for_intended_team");
  });

  it("binds entitlement and remaining values to live RapidAPI custom-quota headers", () => {
    expect(evaluateGate0Accounting(accountEvidence({ cycle_entitlement_units: 50_000 }), identity).reasons)
      .toContain("IDENTITY:api_used_remaining");
    const wrongRemaining = accountEvidence({ api_units_remaining: 59_000, api_units_consumed_before_freeze: 1_000 });
    expect(evaluateGate0Accounting(wrongRemaining, identity).reasons).toContain("IDENTITY:remaining_vs_live_quota_header");
  });

  it("binds the cycle end to RapidAPI's documented reset-seconds evidence", () => {
    const result = evaluateGate0Accounting(accountEvidence({ billing_cycle_end_utc: "2026-10-05T02:21:21.000Z" }), identity);
    expect(result.reasons).toContain("IDENTITY:billing_cycle_end_vs_live_reset");
  });

  it("does not require later-stage budget values for Gate-0 account PASS", () => {
    const result = evaluateGate0Accounting(accountEvidence(), identity);
    expect(result.status).toBe("PASS");
    expect(result.budget_pending_fields).toContain("rest_categories.fids_base_units");
    expect(result.budget_pending_fields).toContain("pre_run_alert_subcaps.stage1_candidates_and_replacements");
  });

  it("allows an explicitly conservative Phase-6 ceiling and accounts for the remainder", () => {
    const result = evaluateGate0Accounting(completeBudget(), identity);
    expect(result.status).toBe("PASS");
    expect(result.budget_freeze_status).toBe("READY");
    expect(result.budget_reasons).toEqual([]);
  });

  it("blocks the later budget freeze when Phase-6 exceeds the feasible maximum", () => {
    const result = evaluateGate0Accounting(completeBudget({ phase6_alert_spend_ceiling: MAX_DESIGN_CEILING }), identity);
    expect(result.status).toBe("PASS");
    expect(result.budget_freeze_status).toBe("BLOCKED");
    expect(result.budget_reasons).toContain("IDENTITY:phase6_ceiling_exceeds_feasible_max");
  });

  it("requires the current pinned FIDS Tier-2 / 2-unit contract", () => {
    expect(evaluateGate0Accounting(accountEvidence({ fids_units_per_request: 0 }), identity).reasons)
      .toContain("INVALID:fids_units_per_request_must_be_positive");
    expect(evaluateGate0Accounting(accountEvidence({ fids_units_per_request: 1 }), identity).reasons)
      .toContain("PROVIDER_CONTRACT:fids_units_per_request_not_2");
  });

  it("allow-lists output and cannot serialize secrets", () => {
    const artifact = evaluateGate0Accounting({ ...accountEvidence(), api_key: "SUPER_SECRET", authorization: "Bearer SUPER_SECRET" }, identity);
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
  const liveBalance = {
    balance: { creditsRemaining: 2_900 },
    quota: {
      observedAtUtc: "2026-09-10T06:47:29.000Z",
      apiUnitsLimit: 60_000,
      apiUnitsRemaining: 59_994,
      apiUnitsResetSeconds: 2_057_632,
      apiUnitsResetAtUtc: "2026-10-04T02:21:21.000Z",
      requestsLimit: 240_000,
      requestsRemaining: 237_905,
      requestsResetSeconds: 2_057_632,
      requestId: "request-1",
      rapidApiRegion: "AWS - us-west-2",
      rapidApiVersion: "0.0.46",
    },
  };

  it("honors auth and evidence id before account reads", async () => {
    const readers = { getBalanceEvidenceStrict: vi.fn(), listSubscriptionsStrict: vi.fn() };
    await expect(runGate0Gather(args(evidenceFile(accountEvidence())), readers, () => false)).rejects.toThrow("AUTH verification failed");
    expect(readers.getBalanceEvidenceStrict).not.toHaveBeenCalled();
  });

  it("uses live quota/balance evidence rather than trusting stale local entitlement values", async () => {
    const local = accountEvidence({
      cycle_entitlement_units: 50_000,
      api_units_remaining: 49_000,
      api_units_consumed_before_freeze: 1_000,
      opening_nonexpiring_alert_balance: 0,
    });
    const readers = {
      getBalanceEvidenceStrict: vi.fn().mockResolvedValue(liveBalance),
      listSubscriptionsStrict: vi.fn().mockResolvedValue([]),
    };
    const result = await runGate0Gather(args(evidenceFile(local)), readers, () => true);
    expect(result.status).toBe("PASS");
    const usage = result.evidence_items.api_cycle_usage as Record<string, number>;
    expect(usage.provider_entitlement).toBe(60_000);
    expect(usage.provider_remaining).toBe(59_994);
    expect(result.evidence_items.settled_alert_balance).toBe(2_900);
  });

  it("uses the exact Phase Gate auth scope and fails closed on strict listing uncertainty", async () => {
    const authorize = vi.fn().mockReturnValue(true);
    const readers = {
      getBalanceEvidenceStrict: vi.fn().mockResolvedValue(liveBalance),
      listSubscriptionsStrict: vi.fn().mockRejectedValue(new Error("uncertain")),
    };
    await expect(runGate0Gather(args(evidenceFile(accountEvidence())), readers, authorize)).rejects.toThrow("uncertain");
    expect(authorize).toHaveBeenCalledWith("auth.json", "Phase 1 / Gate 0", identity.authorizationId);
  });

  it("refuses the RapidAPI reader for every other explicit channel", async () => {
    const readers = { getBalanceEvidenceStrict: vi.fn(), listSubscriptionsStrict: vi.fn() };
    const result = await runGate0Gather(args(evidenceFile(accountEvidence({ subscription_channel: "direct" }))), readers, () => true);
    expect(result.status).toBe("BLOCKED");
    expect(readers.getBalanceEvidenceStrict).not.toHaveBeenCalled();
  });
});

describe("strict subscription inventory reader", () => {
  const originalKey = process.env.AERODATABOX_API_KEY;
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.AERODATABOX_API_KEY;
    else process.env.AERODATABOX_API_KEY = originalKey;
  });

  it("treats authoritative HTTP 204 from GET /subscriptions/webhook as an empty inventory", async () => {
    process.env.AERODATABOX_API_KEY = "test-only";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(listSubscriptionsStrict()).resolves.toEqual([]);
  });
});
