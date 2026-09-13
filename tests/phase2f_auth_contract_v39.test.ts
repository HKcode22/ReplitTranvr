import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const runtime = readFileSync(join(root, "scripts", "v39_prepare_phase2f_smoke_runtime_v39.ts"), "utf8");
const draft = readFileSync(join(root, "scripts", "v39_prepare_phase2f_auth_v39.ts"), "utf8");
const approve = readFileSync(join(root, "scripts", "v39_approve_phase2f_auth_v39.ts"), "utf8");
const smoke = readFileSync(join(root, "scripts", "v39_smoke_safety_owner_v39.ts"), "utf8");
const handoff = readFileSync(join(root, "scripts", "v39_record_phase2_smoke_handoff_v39.ts"), "utf8");

describe("Phase 2F exact authorization/runtime contract", () => {
  it("freezes smoke controls as evidence without creating paid authorization", () => {
    expect(runtime).toContain('required("--pre-smoke-margin")');
    expect(runtime).toContain('required("--settlement-initial-wait-s")');
    expect(runtime).toContain('required("--settlement-poll-s")');
    expect(runtime).toContain('required("--settlement-stable-reads")');
    expect(runtime).toContain('required("--settlement-timeout-s")');
    expect(runtime).toContain('required("--watchdog-poll-ms")');
    expect(runtime).toContain('status: "FROZEN_RUNTIME_EVIDENCE_ONLY_NOT_PAID_AUTH"');
    expect(runtime).toContain('paid_authorization: false');
    expect(runtime).not.toContain("AUTH_ARTIFACT_SHA256:");
  });

  it("creates drafts that are not self-authorizing and bind to preprobe + frozen smoke runtime", () => {
    expect(draft).toContain('status: "DRAFT_ONLY_NOT_AUTHORIZED"');
    expect(draft).toContain('phaseGate: PHASE');
    expect(draft).toContain('predecessorEvidenceIds: [binding.evidenceId, runtime.evidenceId]');
    expect(draft).toContain('maxRestUnitsByCategory: null');
    expect(draft).toContain('flag: "wx"');
    expect(draft).not.toContain("AUTH_ARTIFACT_SHA256:");
  });

  it("requires the human-reviewed exact SHA and both exact predecessors before approval", () => {
    expect(approve).toContain('required("--expected-sha")');
    expect(approve).toContain('required("--runtime-file")');
    expect(approve).toContain('required("--runtime-sha")');
    expect(approve).toContain("REFUSED_PHASE2F_HUMAN_REVIEW_SHA_MISMATCH");
    expect(approve).toContain('record.phaseGate !== PHASE');
    expect(approve).toContain('const expected = [binding.evidenceId, runtime.evidenceId]');
    expect(approve).toContain('AUTH_ARTIFACT_SHA256:${sha256}');
    expect(approve).toContain('stage1_authorized: false');
    expect(approve).toContain('stage2_authorized: false');
  });

  it("makes the paid smoke consume only the frozen runtime controls and rebind exact predecessors", () => {
    expect(smoke).toContain("loadPhase2FSmokeRuntimeV39");
    expect(smoke).toContain('expectedFileSha256: args.runtimeSha256');
    expect(smoke).toContain('const requiredPredecessors = [preprobe.evidenceId, runtime.evidenceId]');
    expect(smoke).toContain('frozen.pre_smoke_unsettled_burst_margin_credits');
    expect(smoke).toContain('frozen.settlement_initial_wait_seconds');
    expect(smoke).toContain('frozen.watchdog_poll_ms');
    expect(smoke).not.toContain("V39_PRE_SMOKE_UNSETTLED_BURST_MARGIN_CREDITS");
    expect(smoke).not.toContain("ADB_SMOKE_SETTLE_INITIAL_S");
    expect(smoke).not.toContain("ADB_SMOKE_WATCHDOG_POLL_MS");
  });

  it("records a Stage-1-ineligible handoff only after PASS smoke + approved exact AUTH", () => {
    expect(handoff).toContain("loadPhase2SmokeHandoffV39");
    expect(handoff).toContain('`AUTH_ARTIFACT_SHA256:${handoff.smoke.authorizationArtifactSha256}`');
    expect(handoff).toContain('phase2f: "PASS"');
    expect(handoff).toContain('stage1_authorized: false');
  });
});