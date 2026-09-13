import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const runtimeGen = readFileSync(join(root, "scripts", "v39_prepare_gate2_runtime_v39.ts"), "utf8");
const stage1 = readFileSync(join(root, "scripts", "v39_probe_stage1_owner_v39.ts"), "utf8");
const stage1Draft = readFileSync(join(root, "scripts", "v39_prepare_phase2g_auth_v39.ts"), "utf8");
const stage1Approve = readFileSync(join(root, "scripts", "v39_approve_phase2g_auth_v39.ts"), "utf8");
const promotion = readFileSync(join(root, "scripts", "v39_record_stage1_promotion_handoff_v39.ts"), "utf8");
const stage2 = readFileSync(join(root, "scripts", "v39_probe_stage2_owner_v39.ts"), "utf8");
const stage2Draft = readFileSync(join(root, "scripts", "v39_prepare_phase2h_auth_v39.ts"), "utf8");
const stage2Approve = readFileSync(join(root, "scripts", "v39_approve_phase2h_auth_v39.ts"), "utf8");

describe("Phase 2 Gate-2 runtime and exact authorization contract", () => {
  it("derives Gate-2 runtime from the verified smoke handoff and never self-authorizes", () => {
    expect(runtimeGen).toContain("loadPhase2SmokeHandoffV39");
    expect(runtimeGen).toContain("watchdogPollMs: smoke.smoke.watchdogPollMs");
    expect(runtimeGen).toContain("settlementInitialWaitSeconds: smoke.smoke.settlementInitialWaitSeconds");
    expect(runtimeGen).toContain("unsettledBurstMarginCredits: margin");
    expect(runtimeGen).toContain("stage1ReservationCredits + margin > 500");
    expect(runtimeGen).toContain("stage2ReservationCredits + margin > 500");
    expect(runtimeGen).toContain('paid_authorization: false');
    expect(runtimeGen).not.toContain("AUTH_ARTIFACT_SHA256:");
  });

  it("makes Stage 1 re-bind the exact smoke/runtime/preprobe chain before provider execution", () => {
    expect(stage1).toContain("loadGate2RuntimeBindingV39");
    expect(stage1).toContain("stage1AuthorizationScopeV39");
    expect(stage1).toContain("REFUSED_STAGE1_SCOPE_MISMATCH");
    expect(stage1).toContain("const predecessors = [binding.smoke.evidenceId, binding.evidenceId]");
    expect(stage1).toContain("REFUSED_STAGE1_EXECUTION_ARTIFACT_BINDING_MISMATCH");
    expect(stage1).toContain("binding.runtime.stage1ReservationCredits > ceiling");
  });

  it("keeps Stage-1 draft separate from human SHA approval", () => {
    expect(stage1Draft).toContain('status: "DRAFT_ONLY_NOT_AUTHORIZED"');
    expect(stage1Draft).toContain("stage1AuthorizationScopeV39");
    expect(stage1Draft).not.toContain("AUTH_ARTIFACT_SHA256:");
    expect(stage1Approve).toContain('required("--expected-sha")');
    expect(stage1Approve).toContain("REFUSED_PHASE2G_HUMAN_REVIEW_SHA_MISMATCH");
    expect(stage1Approve).toContain("approval_scope: PHASE_2G_STAGE1_ONLY");
    expect(stage1Approve).toContain("stage2_authorized: false");
  });

  it("freezes Stage-1 promotion only after a complete invariant promotion exists", () => {
    expect(promotion).toContain("selectStage2Top5");
    expect(promotion).toContain("buildStage1PromotionHandoffV39");
    expect(promotion).toContain("loadStage1PromotionHandoffV39");
    expect(promotion).toContain("REFUSED_STAGE1_HANDOFF_ACTIVE_PROBE");
    expect(promotion).toContain("approval_scope: PHASE_2G_STAGE1_ONLY");
    expect(promotion).toContain("stage2_authorized: false");
  });

  it("makes Stage 2 require the exact frozen promotion handoff and exact Stage-2 scope", () => {
    expect(stage2).toContain("loadStage1PromotionHandoffV39");
    expect(stage2).toContain("currentPromotion: promotion");
    expect(stage2).toContain("stage2AuthorizationScopeV39");
    expect(stage2).toContain("REFUSED_STAGE2_SCOPE_MISMATCH");
    expect(stage2).toContain("promotionBinding.evidenceId");
    expect(stage2).toContain("binding.runtime.stage2ReservationCredits > ceiling");
  });

  it("keeps Stage-2 draft separate from exact human SHA approval", () => {
    expect(stage2Draft).toContain('status: "DRAFT_ONLY_NOT_AUTHORIZED"');
    expect(stage2Draft).toContain("stage2AuthorizationScopeV39");
    expect(stage2Draft).not.toContain("AUTH_ARTIFACT_SHA256:");
    expect(stage2Approve).toContain('required("--expected-sha")');
    expect(stage2Approve).toContain("REFUSED_PHASE2H_HUMAN_REVIEW_SHA_MISMATCH");
    expect(stage2Approve).toContain("approval_scope: PHASE_2H_STAGE2_ONLY");
  });
});