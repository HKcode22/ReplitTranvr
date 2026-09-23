import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const extractor = read("server/lib/disruption/flightNotificationExtractor_v3.ts");
const migration22 = read("migrations/0022_collection_v39_design_probability.sql");
const execution = read("server/lib/disruption/probeExecutionPrepaid_v39.ts");
const window = read("server/lib/disruption/prepaidProbeWindow_v39.ts");
const recovery = read("scripts/v39_phase2g_stage1_recover_after_exit_v39.ts");
const verifier = read("scripts/v39_phase2g_verify_live_callback_v39.ts");
const owner = read("scripts/v39_phase2g_github_actions_owner_v39.sh");
const watchdog = read("scripts/v39_phase2g_github_actions_watchdog_v39.ts");
const paidWorkflow = read(".github/workflows/phase2g-paid-stage1.yml");
const zeroCreditWorkflow = read(".github/workflows/phase2g-zero-credit-callback-binding.yml");
const placeholderRegression = read("tests/phase2g_prepaid_item_sql_placeholders_v39.test.ts");
const register = read("SEPmd/phase2g/FAILURE_REGISTER_AND_PREVENTION_MATRIX.md");
const omaa = read("SEPmd/phase2g/reports/2026-09-16_P2G02_OMAA_SUCCESS.md");

describe("Phase2G historical failure regression matrix", () => {
  it("keeps the pre-Gate is_randomized NULL failure fixed", () => {
    expect(extractor).toContain("isRandomized: ctx.sampling?.isRandomized ?? false");
    expect(migration22).toContain("is_randomized BOOLEAN NOT NULL DEFAULT false");
  });

  it("keeps runtime-reset ownership recoverable without bulk deletion", () => {
    expect(execution).toContain("durablyBindProbeRuntimeSession");
    expect(execution).toContain("SET runtime_session_id=$2::uuid");
    expect(recovery).toContain("prepaidProbeWebhookUrlV39(defaultWebhookUrl(), durableSessionId)");
    expect(recovery).toContain("RECOVERY_REFUSED:RUNTIME_RESET_ACTIVE_BILLABLE_NOT_EXACTLY_OWNED");
    expect(recovery).not.toContain("for (const subscription of activeBillableBefore)");
  });

  it("keeps callback/runtime admission exact instead of reviving the P2G05 route-owner drift", () => {
    expect(verifier).toContain('healthJson?.schema === "v39.phase2f-workspace-runtime.v1"');
    expect(verifier).toContain('healthJson?.runtime_owner_mode === "replit-managed-project"');
    expect(verifier).toContain("healthJson?.managed_replit_workflow === true");
    expect(verifier).toContain("String(healthJson?.git_head ?? "").toLowerCase() === expectedHead");
  });

  it("preserves reconciliation evidence before cleanup and refuses non-MATCH promotion", () => {
    expect(window).toContain("persistProbeReconciliationEvidenceV39");
    expect(window).toContain('status: "DELIVERY_GAP"');
    expect(window).toContain('if (reconciliationStatus !== "MATCH")');
    expect(execution).toContain('const acceptedReconciliation = result.reconciliationStatus === "MATCH"');
    expect(execution).toContain("result.durationCensored");
  });

  it("keeps provider-502 handling bounded and censored windows fail-closed", () => {
    expect(window).toContain("deleteOwnedSubscriptionVerifiedV39");
    expect(window).toContain("balance_read_failed_after_retries");
    expect(window).toContain("duration_censored_before_target");
    expect(recovery).toContain("deleteSubscription(ownedProviderSubscriptionId)");
  });

  it("keeps paid lifecycle ownership outside the Replit workspace failure domain", () => {
    expect(owner).toContain("GITHUB_ACTIONS_RUNTIME_REQUIRED");
    expect(owner).toContain('V39_DEFER_PROVIDER_CONTENT_CLEANUP="1"');
    expect(paidWorkflow).toContain("safety-watchdog:");
    expect(watchdog).not.toContain("createSubscription(");
  });

  it("keeps the zero-credit synthetic SQL placeholder regression in the suite", () => {
    expect(placeholderRegression).toContain("Phase-2G prepaid item SQL placeholders");
  });

  it("blocks a future GitHub/Replit secret or DB mismatch before provider ownership", () => {
    expect(zeroCreditWorkflow).toContain("GITHUB_REPLIT_RUNTIME_DB_BINDING=PASS");
    expect(zeroCreditWorkflow).toContain("GITHUB_REPLIT_WEBHOOK_SECRET_BINDING=PASS");
    expect(owner).toContain("GITHUB_REPLIT_RUNTIME_HEALTH_RECHECK=PASS");
    expect(owner).toContain("GITHUB_REPLIT_RUNTIME_DB_BINDING=PASS");
    expect(owner).toContain("GITHUB_REPLIT_WEBHOOK_SECRET_BINDING=PASS");
    expect(watchdog).toContain("persistent_provider_spend_without_callback_requests");
    expect(watchdog).toContain("callback_persistence_failure_count");
  });

  it("documents the candidate history without turning LKPR/SKBO/YSSY into fake failures", () => {
    expect(register).toContain("LKPR: **never started as a paid Stage-1 probe**");
    expect(register).toContain("SKBO: not yet run");
    expect(register).toContain("YSSY: not yet run");
    expect(register).toContain("P2G10 / probe 8 WSSS");
  });

  it("corrects the OMAA AUTH-label/probe-number documentation ambiguity", () => {
    expect(omaa).toContain("Probe 2 / AUTH P2G03");
    expect(omaa).toContain("AUTH-20260916-P2G03");
    expect(omaa).toContain("phase2g-stage1-paid-preflight-P2G03-20260916T1232Z.json");
  });
});
