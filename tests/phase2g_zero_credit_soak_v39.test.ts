import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const soak = readFileSync(join(root, "scripts", "v39_phase2g_zero_credit_soak_v39.ts"), "utf8");
const prep = readFileSync(join(root, "scripts", "v39_prepare_phase2f_workspace_callback_v39.sh"), "utf8");
const verifier = readFileSync(join(root, "scripts", "v39_verify_workspace_callback_v39.ts"), "utf8");

describe("Phase2G zero-credit resilience soak", () => {
  it("can invoke only the synthetic workspace callback-prep path", () => {
    expect(soak).toContain('const PREP = "scripts/v39_prepare_phase2f_workspace_callback_v39.sh"');
    expect(soak).toContain('spawnSync("bash", [PREP]');
    expect(soak).toContain('ADB_AUTO_COLLECT: "false"');
    expect(soak).not.toMatch(/probe_stage1_owner|paid_guard|createSubscription|deleteSubscription|aerodataboxLimiter/i);
  });

  it("requires explicit zero-provider proof markers on every passing cycle", () => {
    expect(soak).toContain('WORKSPACE_CALLBACK_PREP=PASS');
    expect(soak).toContain('AERODATABOX_PROVIDER_CALLED=false');
    expect(soak).toContain('ALERT_CREDITS_SPENT=0');
    expect(prep).toContain('AERODATABOX_PROVIDER_CALLED=false');
    expect(prep).toContain('ALERT_CREDITS_SPENT=0');
    expect(verifier).toContain('providerCalled: false');
    expect(verifier).toContain('providerSubscriptionCreated: false');
    expect(verifier).toContain('alertCreditsSpent: 0');
    expect(verifier).not.toContain("createSubscription(");
  });

  it("keeps failures observable and allows a later healthy cycle to prove recovery", () => {
    expect(soak).toContain("consecutiveFailures");
    expect(soak).toContain("maxConsecutiveFailures");
    expect(soak).toContain("recoveredAfterFailure");
    expect(soak).toContain("PASS_RECOVERED_AFTER_FAILURE");
    expect(soak).toContain("FAIL_ENDED_UNHEALTHY");
  });

  it("documents the same-workspace host failure boundary", () => {
    expect(soak).toContain("whole Replit container termination");
  });
});
