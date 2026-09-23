import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const preflight = readFileSync(join(root, "scripts", "v39_phase2g_stage1_paid_preflight_v39.ts"), "utf8");
const verifier = readFileSync(join(root, "scripts", "v39_phase2g_verify_live_callback_v39.ts"), "utf8");
const owner = readFileSync(join(root, "scripts", "v39_phase2g_github_actions_owner_v39.sh"), "utf8");
const supervisor = readFileSync(join(root, "scripts", "v39_phase2g_stage1_logged_supervisor_v39.ts"), "utf8");
const watchdog = readFileSync(join(root, "scripts", "v39_phase2g_github_actions_watchdog_v39.ts"), "utf8");
const localLauncher = readFileSync(join(root, "scripts", "v39_phase2g_stage1_launch_logged_v39.sh"), "utf8");
const resolver = readFileSync(join(root, "scripts", "v39_phase2g_resolve_incident24_v39.ts"), "utf8");
const workflow = readFileSync(join(root, ".github", "workflows", "phase2g-paid-stage1.yml"), "utf8");
const routes = readFileSync(join(root, "server", "routes_v3.ts"), "utf8");
const freeze = JSON.parse(readFileSync(join(root, "artifacts", "phase2g-same-app-dev-callback-contingency-freeze-20260923.json"), "utf8"));

describe("Phase-2G same-app development callback contingency", () => {
  it("freezes infrastructure only and preserves the scientific protocol", () => {
    expect(freeze.schema).toBe("v39.phase2g-same-app-dev-callback-contingency.v1");
    expect(freeze.status).toBe("FROZEN");
    expect(freeze.authorized).toBe(true);
    expect(freeze.owner_executor).toBe("github-actions");
    expect(freeze.independent_watchdog_required).toBe(true);
    expect(freeze.scientific_protocol_unchanged).toBe(true);
    expect(freeze.stage1_target_minutes).toBe(120);
    expect(freeze.exact_match_required).toBe(true);
    expect(freeze.no_automatic_retry).toBe(true);
  });

  it("allows replit.dev only under explicit contingency and exact runtime health", () => {
    expect(preflight).toContain("INTERACTIVE_REPLIT_DEV_CALLBACK_REQUIRES_EXPLICIT_CONTINGENCY");
    expect(preflight).toContain("development_callback_runtime_health_not_exact");
    expect(verifier).toContain("REFUSED:DEV_RUNTIME_HEALTH_NOT_EXACT");
    expect(verifier).toContain("workspace_git_head");
  });

  it("keeps paid ownership on GitHub and local launcher disabled", () => {
    expect(owner).toContain("GITHUB_ACTIONS_RUNTIME_REQUIRED");
    expect(supervisor).toContain("OWNER_EXECUTOR_MUST_BE_GITHUB_ACTIONS");
    expect(watchdog).toContain("GITHUB_ACTIONS_RUNTIME_REQUIRED");
    expect(localLauncher).toContain("REFUSED:DEPRECATED_LOCAL_STAGE1_LAUNCH_USE_GITHUB_ACTIONS");
    expect(workflow).toContain("same-app-development-contingency");
    const gateBlock = workflow.slice(workflow.indexOf("  gate:"), workflow.indexOf("  owner:"));
    const ownerBlock = workflow.slice(workflow.indexOf("  owner:"), workflow.indexOf("  safety-watchdog:"));
    const watchdogBlock = workflow.slice(workflow.indexOf("  safety-watchdog:"));
    expect(gateBlock.split('--callback-mode "${{ inputs.callback_mode }}"').length - 1).toBe(1);
    expect(ownerBlock).toContain('--callback-base "${{ inputs.callback_base }}"             --callback-mode "${{ inputs.callback_mode }}"');
    expect(ownerBlock.split('--callback-mode "${{ inputs.callback_mode }}"').length - 1).toBe(1);
    expect(watchdogBlock.split('--callback-mode "${{ inputs.callback_mode }}"').length - 1).toBe(1);
  });

  it("fails the GitHub gate closed when its webhook secret does not match the live Replit receiver", () => {
    expect(routes).toContain('/__v39/phase2g/webhook-secret-match');
    expect(routes).toContain('x-v39-phase2g-webhook-secret');
    expect(routes).toContain('v39.phase2g-webhook-secret-match.v1');
    expect(routes).toContain('timingSafeEqual(a, b)');
    const gateBlock = workflow.slice(workflow.indexOf("  gate:"), workflow.indexOf("  owner:"));
    expect(gateBlock).toContain('AERODATABOX_WEBHOOK_SECRET: ${{ secrets.AERODATABOX_WEBHOOK_SECRET }}');
    expect(gateBlock).toContain("Verify GitHub/Replit webhook-secret binding");
    expect(gateBlock).toContain("x-v39-phase2g-webhook-secret");
    expect(gateBlock).toContain("/__v39/phase2g/webhook-secret-match");
    expect(gateBlock).toContain("GITHUB_REPLIT_WEBHOOK_SECRET_BINDING=PASS");
    expect(owner).toContain("GITHUB_REPLIT_WEBHOOK_SECRET_BINDING_CHECK=START");
    expect(owner).toContain("x-v39-phase2g-webhook-secret");
    expect(owner).toContain("/__v39/phase2g/webhook-secret-match");
    expect(owner).toContain("GITHUB_REPLIT_WEBHOOK_SECRET_BINDING=PASS");
    expect(gateBlock.indexOf("Verify GitHub/Replit webhook-secret binding"))
      .toBeLessThan(gateBlock.indexOf("Generate fresh read-only paid preflight"));
  });

  it("does not weaken exact reconciliation or create an automatic retry", () => {
    expect(freeze.exact_match_required).toBe(true);
    expect(freeze.provider_send_received_gap_acceptance).toBe(false);
    expect(freeze.no_automatic_retry).toBe(true);
  });

  it("tolerates only the two known zero-credit synthetic callback incidents during proof", () => {
    expect(verifier).toContain("const i24 = byId.get(24)");
    expect(verifier).toContain("const i25 = byId.get(25)");
    expect(verifier).toContain("incidents.rows.length === 2");
    expect(verifier).toContain('column "session_id" is of type uuid but expression is of type integer');
    expect(resolver).toContain("PASS_READY_TO_RESOLVE_SYNTHETIC_INCIDENTS");
    expect(resolver).toContain("PHASE2G_CONFIRM_SYNTHETIC_INCIDENT_RESOLUTION");
    expect(resolver).toContain("WHERE id IN (24,25) AND resolved=false");
    expect(resolver).toContain("RETURNING id,resolved,resolved_at_utc");
    expect(resolver).not.toContain("RETURNING id,resolved,resolved_at_utc\n        ORDER BY id");
    expect(resolver).toContain("updatedRows = [...updated.rows].sort");
  });
});
