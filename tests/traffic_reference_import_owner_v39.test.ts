import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Phase 2 offline traffic-reference import owner", () => {
  it("requires P then fresh Gate 1 before reading/building the normalized reference", () => {
    const script = source("scripts/v39_build_traffic_reference_v39.ts");
    const p = script.indexOf("loadVerifiedPrerequisitePPass(root)");
    const gate1 = script.indexOf("loadFreshGate1(root)");
    const input = script.indexOf("parseInput(inputPath)");
    const build = script.indexOf("buildFrozenTrafficReferenceV39");
    expect(p).toBeGreaterThan(-1);
    expect(gate1).toBeGreaterThan(p);
    expect(input).toBeGreaterThan(gate1);
    expect(build).toBeGreaterThan(-1);
  });

  it("enforces the 30-day freeze window and writes only frozen/report artifacts", () => {
    const script = source("scripts/v39_build_traffic_reference_v39.ts");
    expect(script).toContain("requireTrafficReferenceFreshnessV39(built.reference, builtAt)");
    expect(script).toContain("traffic-reference-frozen.json");
    expect(script).toContain("traffic-reference-build-report.json");
    expect(script).toContain("TRAFFIC_REFERENCE_FROZEN_EXISTS_WITH_DIFFERENT_CONTENT");
    expect(script).toContain("TRAFFIC_REFERENCE_BUILD_REPORT_INPUT_DRIFT");
  });

  it("contains no provider client/network execution path", () => {
    const script = source("scripts/v39_build_traffic_reference_v39.ts");
    expect(script).not.toContain("getAirportCoverage(");
    expect(script).not.toContain("fetchFidsAirport(");
    expect(script).not.toContain("createFlightAlert");
    expect(script).not.toContain("axios.");
    expect(script).not.toContain("fetch(");
  });
});
