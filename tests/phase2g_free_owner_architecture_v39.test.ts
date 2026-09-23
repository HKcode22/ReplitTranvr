import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const workflow = readFileSync(join(root, ".github", "workflows", "phase2g-paid-stage1.yml"), "utf8");
const owner = readFileSync(join(root, "scripts", "v39_phase2g_github_actions_owner_v39.sh"), "utf8");
const watchdog = readFileSync(join(root, "scripts", "v39_phase2g_github_actions_watchdog_v39.ts"), "utf8");
const preflight = readFileSync(join(root, "scripts", "v39_phase2g_stage1_paid_preflight_v39.ts"), "utf8");
const supervisor = readFileSync(join(root, "scripts", "v39_phase2g_stage1_logged_supervisor_v39.ts"), "utf8");
const localLauncher = readFileSync(join(root, "scripts", "v39_phase2g_stage1_launch_logged_v39.sh"), "utf8");
const runtime = readFileSync(join(root, "server", "lib", "disruption", "prepaidProbeRuntime_v39.ts"), "utf8");
const routes = readFileSync(join(root, "server", "routes_v3.ts"), "utf8");
const replit = readFileSync(join(root, ".replit"), "utf8");

describe("Phase-2G free independent-owner architecture", () => {
  it("keeps published callback default and permits replit.dev only under explicit GitHub-owner contingency", () => {
    expect(replit).toContain('deploymentTarget = "autoscale"');
    expect(replit).toContain('V39_WORKSPACE_RUNTIME_OWNER_MODE=replit-published-deployment');
    expect(replit).toContain('V39_RUNTIME_DURABILITY_CLASS=autoscale');
    expect(preflight).toContain("BLOCKED:INTERACTIVE_REPLIT_DEV_CALLBACK_REQUIRES_EXPLICIT_CONTINGENCY");
    expect(preflight).toContain('"same-app-development-contingency"');
    expect(preflight).toContain("development_callback_runtime_health_not_exact");
    expect(preflight).toContain('ownerExecutor !== "github-actions"');
    expect(preflight).toContain('contract_mode: "legacy-live-prepaid-route"');
    expect(preflight).toContain("callback_verification_contract_invalid_or_stale");
  });

  it("makes GitHub Actions the only prospective paid owner", () => {
    expect(supervisor).toContain('SUPERVISOR_REFUSED:OWNER_EXECUTOR_MUST_BE_GITHUB_ACTIONS');
    expect(supervisor).toContain('SUPERVISOR_REFUSED:GITHUB_ACTIONS_RUNTIME_REQUIRED');
    expect(owner).toContain('REFUSED:GITHUB_ACTIONS_RUNTIME_REQUIRED');
    expect(owner).toContain('--owner-executor github-actions');
    expect(localLauncher).toContain('REFUSED:DEPRECATED_LOCAL_STAGE1_LAUNCH_USE_GITHUB_ACTIONS');
  });

  it("creates preflight in a read-only gate job instead of committing a mutable receipt", () => {
    expect(workflow).toContain("gate:");
    expect(workflow).toContain("Generate fresh read-only paid preflight");
    expect(workflow).toContain("--owner-executor github-actions");
    expect(workflow).toContain("callback_mode");
    expect(workflow).toContain("callback_contingency_sha");
    expect(workflow).toContain("preflight_b64");
    expect(workflow).toContain("preflight_sha");
    expect(workflow).not.toContain("      preflight_file:");
    expect(workflow).not.toContain("description: 'Preflight receipt SHA-256'");
  });

  it("runs owner and independent watchdog only after the same gate succeeds", () => {
    expect(workflow).toContain("owner:");
    expect(workflow).toContain("safety-watchdog:");
    expect(workflow.match(/needs: gate/g)?.length).toBe(2);
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("RUN_PAID_STAGE1_ONCE");
    expect(workflow).toContain("timeout-minutes: 175");
  });

  it("keeps the owner foreground on GitHub and never detaches it", () => {
    expect(owner).toContain("v39_phase2g_stage1_logged_supervisor_v39.ts");
    expect(owner).toContain("tail -n 0 -F");
    expect(owner).not.toContain("nohup");
    expect(owner).not.toContain("setsid");
  });

  it("makes the watchdog recovery-only with no subscription creation path", () => {
    expect(watchdog).toContain("LIVE_CREDIT_LIMIT = 450");
    expect(watchdog).toContain("probe_deadline_plus_cleanup_grace_exceeded");
    expect(watchdog).toContain("v39_phase2g_stage1_recover_after_exit_v39.ts");
    expect(watchdog).not.toContain("createSubscription(");
    expect(watchdog).not.toContain("refillBalance(");
  });

  it("keeps raw provider blob cleanup deferred to the Replit workspace after provider stop", () => {
    expect(runtime).toContain("V39_DEFER_PROVIDER_CONTENT_CLEANUP");
    expect(owner).toContain('V39_DEFER_PROVIDER_CONTENT_CLEANUP="1"');
    expect(watchdog).toContain('V39_DEFER_PROVIDER_CONTENT_CLEANUP = "1"');
    expect(workflow).toContain("callback_verification_file");
    expect(workflow).not.toContain("provider_blob_bucket_id");
    expect(preflight).toContain("v39.phase2g-live-callback-verification.v1");
  });

  it("never gives GitHub the Replit object-storage credential surface", () => {
    expect(workflow).not.toContain("REPLIT_OBJECT_STORAGE");
    expect(workflow).not.toContain("OBJECT_STORAGE_TOKEN");
    expect(workflow).not.toContain("V39_PHASE2G_CONTROL_SECRET");
    expect(owner).not.toContain("V39_PROVIDER_BLOB_BUCKET_ID");
    expect(owner).toContain("V39_DEFER_PROVIDER_CONTENT_CLEANUP");
  });
});
