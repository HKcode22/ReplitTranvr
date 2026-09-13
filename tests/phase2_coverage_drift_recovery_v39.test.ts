import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const recovery = readFileSync(join(root, "scripts", "v39_refresh_gate1_reference_after_drift_v39.ts"), "utf8");
const runner = readFileSync(join(root, "scripts", "v39_phase2b_e_close.sh"), "utf8");

describe("Phase 2 pre-2D coverage drift recovery", () => {
  it("preserves the old evidence and forbids refresh after preprobe freeze", () => {
    expect(recovery).toContain("PREPROBE_ALREADY_EXISTS_GATE1_REFERENCE_REFRESH_FORBIDDEN");
    expect(recovery).toContain("phase2-history");
    expect(recovery).toContain("archiveExact(oldGateArchive");
    expect(recovery).toContain("archiveExact(oldReferenceArchive");
    expect(recovery).toContain("PASS_SUPERSEDED_PRE_2D");
  });

  it("allows only Gate-1 to change while Plan/P/traffic/region stay frozen", () => {
    for (const refusal of [
      "PLAN_DRIFT_DURING_GATE1_REFRESH",
      "PREREQUISITE_P_DRIFT_DURING_GATE1_REFRESH",
      "TRAFFIC_REFERENCE_ARTIFACT_DRIFT_DURING_GATE1_REFRESH",
      "TRAFFIC_REFERENCE_RAW_DRIFT_DURING_GATE1_REFRESH",
      "TRAFFIC_TIER_DRIFT_DURING_GATE1_REFRESH",
      "REGION_MAPPING_DRIFT_DURING_GATE1_REFRESH",
    ]) {
      expect(recovery).toContain(refusal);
    }
  });

  it("uses only the existing documented-free Gate-1 owner and rolls back on freeze failure", () => {
    expect(recovery).toContain("runGate1Coverage(");
    expect(recovery).toContain("documented-free coverage only");
    expect(recovery).toContain("paid_or_mutating_provider_action: false");
    expect(recovery).toContain("REFRESHED_REFERENCE_FREEZE_FAILED");
    expect(recovery).toContain("writeFileSync(gate1Path, oldGateLoaded.raw");
    expect(recovery).not.toContain("createSubscription(");
    expect(recovery).not.toContain("refill");
  });

  it("exposes an explicit runner mode and keeps ordinary resume mutually exclusive", () => {
    expect(runner).toContain("--refresh-after-coverage-drift");
    expect(runner).toContain("v39_refresh_gate1_reference_after_drift_v39.ts");
    expect(runner).toContain("choose only one of --resume-after-2c or --refresh-after-coverage-drift");
    expect(runner).toContain("[2D-preflight]");
    expect(runner).toContain("MANDATORY STOP before separately authorized Phase 2F safety smoke");
  });
});
