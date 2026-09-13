import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const draft = readFileSync(join(root, "scripts", "v39_prepare_phase2f_auth_v39.ts"), "utf8");
const approve = readFileSync(join(root, "scripts", "v39_approve_phase2f_auth_v39.ts"), "utf8");
const smoke = readFileSync(join(root, "scripts", "v39_smoke_safety_owner_v39.ts"), "utf8");

describe("Phase 2F exact authorization contract", () => {
  it("creates drafts that are not self-authorizing and bind to the current preprobe handoff", () => {
    expect(draft).toContain('status: "DRAFT_ONLY_NOT_AUTHORIZED"');
    expect(draft).toContain('phaseGate: PHASE');
    expect(draft).toContain('predecessorEvidenceIds: [binding.evidenceId]');
    expect(draft).toContain('maxRestUnitsByCategory: null');
    expect(draft).toContain('flag: "wx"');
    expect(draft).not.toContain("AUTH_ARTIFACT_SHA256:");
  });

  it("requires the human-reviewed exact SHA before writing an approval token", () => {
    expect(approve).toContain('required("--expected-sha")');
    expect(approve).toContain("REFUSED_PHASE2F_HUMAN_REVIEW_SHA_MISMATCH");
    expect(approve).toContain('record.phaseGate !== PHASE');
    expect(approve).toContain('record.predecessorEvidenceIds.length !== 1');
    expect(approve).toContain('record.predecessorEvidenceIds[0] !== binding.evidenceId');
    expect(approve).toContain('AUTH_ARTIFACT_SHA256:${sha256}');
    expect(approve).toContain('stage1_authorized: false');
    expect(approve).toContain('stage2_authorized: false');
  });

  it("makes the paid smoke re-bind the approved AUTH to the current exact preprobe", () => {
    expect(smoke).toContain("loadPreprobeHandoffBindingV39");
    expect(smoke).toContain("record.predecessorEvidenceIds.includes(preprobe.evidenceId)");
    expect(smoke).toContain("REFUSED_SMOKE_PREPROBE_BINDING_REQUIRED");
    expect(smoke).toContain("preprobeArtifactSha256");
    expect(smoke).toContain("preprobeFileSha256");
  });
});
