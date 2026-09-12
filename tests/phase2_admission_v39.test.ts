import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadVerifiedPrerequisitePPass } from "../server/lib/disruption/phase2Admission_v39";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("V3.9 Phase-2 fail-closed admission", () => {
  it("shared P admission refuses when the current PASS artifact is absent", () => {
    expect(() => loadVerifiedPrerequisitePPass(join(process.cwd(), "__definitely_missing_phase2_root__")))
      .toThrow("BLOCKED:PREREQUISITE_P_PASS_MISSING");
  });

  it("final frame re-verifies P before reading provider coverage", () => {
    const frame = source("scripts/build_final_frame_v39.ts");
    const p = frame.indexOf("loadVerifiedPrerequisitePPass(root)");
    const coverage = frame.indexOf("await getAirportCoverage()");
    expect(p).toBeGreaterThan(-1);
    expect(coverage).toBeGreaterThan(p);
  });

  it("reference/preprobe freeze independently re-verifies P", () => {
    const freeze = source("scripts/v39_freeze_record_v39.ts");
    expect(freeze).toContain("loadVerifiedPrerequisitePPass(root)");
    expect(freeze).toContain("current prerequisite-P PASS evidence");
  });

  it("Gate 1 remains P-gated before coverage measurement", () => {
    const gate1 = source("scripts/measure_coverage.ts");
    const verify = gate1.indexOf("verifyPrerequisitePPassFile()");
    const run = gate1.indexOf("await runGate1Coverage(argv)");
    expect(verify).toBeGreaterThan(-1);
    expect(run).toBeGreaterThan(verify);
  });

  it("legacy curated frame command cannot be used as a production shortcut", () => {
    const pkg = JSON.parse(source("package.json"));
    expect(pkg.scripts["build-catalog"]).toBe("tsx scripts/v39_legacy_frame_refusal.ts");
    expect(pkg.scripts["v39:frame:build"]).toBe("tsx scripts/build_final_frame_v39.ts");
    const refusal = source("scripts/v39_legacy_frame_refusal.ts");
    expect(refusal).toContain("BLOCKED: legacy curated-tier frame builder");
    expect(refusal).toContain("npm run v39:frame:build");
  });
});
