import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const routes = readFileSync(join(root, "server", "routes_v3.ts"), "utf8");
const receiver = readFileSync(join(root, "server", "phase2gCallbackOnly.ts"), "utf8");
const sender = readFileSync(join(root, "scripts", "v39_phase2g_github_signed_cleanup_v39.ts"), "utf8");
const finalizer = readFileSync(join(root, "scripts", "v39_phase2g_finalize_settling_probe_v39.ts"), "utf8");
const cleanup = routes.slice(
  routes.indexOf('app.post("/__v39/phase2g/runtime-cleanup"'),
  routes.indexOf('app.post("/api/v1/webhooks/aerodatabox",webhookIngress);'),
);

describe("Phase2G fail-closed signed GitHub remote cleanup wiring", () => {
  it("requires a signed attestation; bearer-only legacy guard cannot clean up", () => {
    expect(routes).toContain("verifyPhase2gCleanupAttestationV39(");
    expect(routes).toContain('req.header("x-v39-phase2g-cleanup-proof")');
    expect(routes).toContain("V39_PHASE2G_CLEANUP_SIGNING_KEY");
    expect(routes).toContain("V39_PHASE2G_CALLBACK_ORIGIN");
    expect(routes).not.toContain("phase2gControlGuard");
    expect(cleanup).toContain("phase2gCleanupProofGuard");
    expect(cleanup).not.toContain("listSubscriptionsStrict()");
  });
  it("rejects mismatched or lost session ownership before deleting raw content", () => {
    expect(cleanup).toContain("r.owner_kind='anchor_probe'");
    expect(cleanup).toContain("r.owner_probe_id=p.probe_id");
    expect(cleanup).toContain("p.probe_id=$2::int");
    expect(cleanup).toContain("p.provider_content_safe_mode=true");
    expect(cleanup).toContain('["settling", "failed"].includes(runtimeState)');
    expect(cleanup).toContain("runtime_provider_subscription_id");
    expect(cleanup).toContain("proof.probe_budget_day_id");
    expect(cleanup).toContain("proof.expected_live_blobs");
    expect(cleanup.indexOf("EXACT_STAGE1_LIVE_BLOB_COUNT_MISMATCH"))
      .toBeLessThan(cleanup.indexOf("cleanupPrepaidProbeSessionLocalV39(sessionId, deletionRunId)"));
    expect(receiver).toContain('"/__v39/phase2g/runtime-cleanup"');
  });
  it("keeps provider account access only in the GitHub-side signer", () => {
    expect(sender).toContain('process.env.GITHUB_ACTIONS !== "true"');
    expect(sender).toContain("listSubscriptionsStrict()");
    expect(sender).toContain("activeBillable.length !== 0");
    expect(sender).toContain("signPhase2gCleanupAttestationV39(");
    expect(sender).toContain("REFUSED:CALLBACK_SETTLING_QUIESCENCE_30S_NOT_PROVEN");
    expect(sender).toContain("REFUSED:LIVE_BLOB_COUNT_CHANGED");
    expect(sender).toContain("PHASE2G_SIGNED_EXACT_SESSION_CLEANUP=PASS");
    expect(sender).not.toContain("createSubscription(");
    expect(sender).not.toContain("deleteSubscription(");
    expect(sender).not.toContain("refillBalance(");
  });
  it("reuses the existing hash-checked finalizer rather than marking failures completed", () => {
    expect(sender).toContain("v39_phase2g_finalize_settling_probe_v39.ts");
    expect(sender).toContain('schema: "v39.phase2g-exact-session-purpose-cleanup.v1"');
    expect(sender).toContain('mode: "APPLY"');
    expect(sender).toContain("receiptSha");
    expect(finalizer).toContain('String(probe.status)!=="settling"');
    expect(finalizer).toContain('String(probe.reconciliation_status)!=="MATCH"');
    expect(finalizer).toContain("runtime_cleanup_verified_at_utc=$3");
  });
});
