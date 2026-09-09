import { describe, it, expect } from "vitest";
import {
  finalFiveMembershipInvariant,
  selectStage2Top5,
  type FrozenProbeArtifact,
  type PromotionRow,
  type Stage1ProbeEvidence,
} from "../server/lib/disruption/anchorPromotion_v39";

function cand(i: number) {
  return {
    icao: i === 0 ? "WSSS" : i === 1 ? "OMAA" : `H${String(i).padStart(3, "0")}`,
    region: "R",
    tier: "HUB",
    preEligible: true,
    postEligible: true,
    trafficMetricValue: 100 - i,
    degree: 50,
    effectiveCarriers: 20,
    intlShare: 0.5,
    regionShare: 0.1,
  };
}
function artifact(): FrozenProbeArtifact {
  return {
    version: "v1",
    shortlist: Array.from({ length: 12 }, (_, i) => cand(i)),
    replacements: [{ ...cand(20), icao: "REP1" }, { ...cand(21), icao: "REP2" }],
    hubCutMetric: 100,
    degreeCap: 100,
    carriersCap: 40,
  };
}
function ev(
  icao: string,
  lower = 100,
  upper = lower,
  status = "completed",
  credits = 10,
): Stage1ProbeEvidence {
  return {
    icao,
    status,
    rowsPerHour: status === "completed" ? 100 : null,
    creditsSpent: status === "completed" ? credits : null,
    uniqueFlightsPerCredit: status === "completed" ? lower / credits : null,
    tailChainLinksPerCredit: status === "completed" ? 1 : null,
    stability: status === "completed" ? 1 : null,
    confirmedUniqueLower: status === "completed" ? lower : null,
    confirmedPlusAmbiguousUpper: status === "completed" ? upper : null,
  };
}

function boundedRow(icao: string, nominal: number, lower: number, upper: number): PromotionRow {
  return {
    icao,
    anchorScore: nominal,
    anchorScoreLower: lower,
    anchorScoreUpper: upper,
    yieldScore: 1,
    yieldScoreLower: 1,
    yieldScoreUpper: 1,
    capacityPass: true,
    ambiguityInvariant: true,
    source: "shortlist",
  };
}

describe("V3.9 Stage-2 promotion", () => {
  it("returns exactly five by frozen anchor score with lexical tie break", () => {
    const a = artifact();
    const rows = a.shortlist.map((c, i) => ev(c.icao, 100 - i));
    const r = selectStage2Top5(a, rows);
    expect(r.primaryStage1Complete).toBe(true);
    expect(r.selected).toHaveLength(5);
    expect(r.replacementsNeeded).toBe(0);
    expect(r.ambiguityMembershipInvariant).toBe(true);
    expect(r.ranked.slice(0, 5).map((x) => x.icao)).toEqual(r.selected);
    expect(r.referenceIcao).toBe("WSSS");
  });

  it("refuses when an outsider's upper anchor-score bound can enter the top five", () => {
    const a = artifact();
    const rows = a.shortlist.map((c, i) => ev(c.icao, 100 - i));
    // H005 is nominally outside the top five but has a very wide unresolved
    // identity upper bound. The proof must operate on anchor-score intervals,
    // not merely raw flight-count ordering.
    const outsider = rows.find((x) => x.icao === "H005")!;
    outsider.confirmedUniqueLower = 1;
    outsider.confirmedPlusAmbiguousUpper = 1000;
    outsider.uniqueFlightsPerCredit = 0.1;
    expect(() => selectStage2Top5(a, rows)).toThrow(/INSUFFICIENT_IDENTITY_RESOLUTION/);
  });

  it("does not consume replacements until all 12 primary Stage-1 attempts are terminal", () => {
    const a = artifact();
    const rows = a.shortlist.slice(0, 4).map((c, i) => ev(c.icao, 100 - i));
    rows.push(ev("REP1", 50));
    const r = selectStage2Top5(a, rows);
    expect(r.primaryStage1Complete).toBe(false);
    expect(r.selected).toHaveLength(4);
    expect(r.nextReplacement).toBeNull();
    expect(r.replacementsNeeded).toBe(1);
  });

  it("uses completed frozen replacements sequentially after primary Stage 1 completes with <5 valid", () => {
    const a = artifact();
    const rows: Stage1ProbeEvidence[] = a.shortlist.map((c, i) => i < 4 ? ev(c.icao, 100 - i) : ev(c.icao, 0, 0, "failed"));
    rows.push(ev("REP1", 50));
    const r = selectStage2Top5(a, rows);
    expect(r.primaryStage1Complete).toBe(true);
    expect(r.selected).toHaveLength(5);
    expect(r.selected).toContain("REP1");
    expect(r.replacementsNeeded).toBe(0);
  });

  it("names the next ordered replacement when the first replacement has not completed Stage 1", () => {
    const a = artifact();
    const rows: Stage1ProbeEvidence[] = a.shortlist.map((c, i) => i < 4 ? ev(c.icao, 100 - i) : ev(c.icao, 0, 0, "failed"));
    const r = selectStage2Top5(a, rows);
    expect(r.selected).toHaveLength(4);
    expect(r.replacementsNeeded).toBe(1);
    expect(r.nextReplacement).toBe("REP1");
  });

  it("capacity failure cannot be traded against score", () => {
    const a = artifact();
    const rows = a.shortlist.map((c, i) => ev(c.icao, 100 - i));
    rows[2].rowsPerHour = 59;
    const r = selectStage2Top5(a, rows);
    expect(r.selected).toHaveLength(5);
    expect(r.selected).not.toContain(rows[2].icao);
  });

  it("uses OMAA only when WSSS reference is invalid/capacity-failed", () => {
    const a = artifact();
    const rows = a.shortlist.map((c, i) => ev(c.icao, 100 - i));
    rows.find((x) => x.icao === "WSSS")!.rowsPerHour = 59;
    const r = selectStage2Top5(a, rows);
    expect(r.referenceIcao).toBe("OMAA");
  });

  it("strong interval proof rejects overlapping fifth/outside membership", () => {
    const rows = [
      boundedRow("A", .90, .89, .91),
      boundedRow("B", .80, .79, .81),
      boundedRow("C", .70, .69, .71),
      boundedRow("D", .60, .59, .61),
      boundedRow("E", .50, .45, .55),
      boundedRow("F", .40, .44, .54),
    ];
    expect(finalFiveMembershipInvariant(rows)).toBe(false);
    rows[4].anchorScoreLower = .56;
    expect(finalFiveMembershipInvariant(rows)).toBe(true);
  });
});
