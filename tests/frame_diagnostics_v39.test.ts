import { describe, expect, it } from "vitest";
import {
  buildFrameDiagnostics18V39,
  frameDiagnosticsHashV39,
} from "../server/lib/disruption/frameDiagnostics_v39";

describe("Phase 2 final-frame 18-cell diagnostics", () => {
  it("always emits all 3 tier x 6 region cells including zeros", () => {
    const cells = buildFrameDiagnostics18V39([
      { tier: "HUB", tierVerified: true, region: "North America", preEligible: true, postEligible: true },
      { tier: "MID", tierVerified: true, region: "Europe", preEligible: true, postEligible: false },
      { tier: "UNCLASSIFIED", tierVerified: false, region: null, preEligible: true, postEligible: true },
    ]);
    expect(cells).toHaveLength(18);
    expect(cells.find((cell) => cell.tier === "HUB" && cell.region === "North America")).toEqual({
      tier: "HUB",
      region: "North America",
      total: 1,
      preEligible: 1,
      postEligible: 1,
      dualEligible: 1,
    });
    expect(cells.find((cell) => cell.tier === "REGIONAL" && cell.region === "Oceania")?.total).toBe(0);
  });

  it("excludes UNCLASSIFIED/UNMAPPED from primary cells and hashes deterministically", () => {
    const rows = [
      { tier: "REGIONAL", tierVerified: true, region: "Oceania", preEligible: false, postEligible: true },
      { tier: "UNCLASSIFIED", tierVerified: false, region: "Oceania", preEligible: true, postEligible: true },
      { tier: "HUB", tierVerified: true, region: null, preEligible: true, postEligible: true },
    ];
    const a = buildFrameDiagnostics18V39(rows);
    const b = buildFrameDiagnostics18V39([...rows].reverse());
    expect(a.reduce((sum, cell) => sum + cell.total, 0)).toBe(1);
    expect(frameDiagnosticsHashV39(a)).toBe(frameDiagnosticsHashV39(b));
  });
});
