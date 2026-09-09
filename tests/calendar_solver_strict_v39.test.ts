import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import {
  solveV39Calendar,
  validateV39Calendar,
  type FrozenCalendarDesignInput,
  type FrozenAirportSlotAssignment,
} from "../server/lib/disruption/experimentCalendarSolver_v39";

function hash(v: unknown) { return createHash("sha256").update(JSON.stringify(v)).digest("hex"); }
function seededOrder<T>(items: readonly T[], seed: string): T[] {
  return [...items].map((value, i) => ({ value, k: hash(`${seed}|${i}|${JSON.stringify(value)}`) }))
    .sort((a, b) => a.k.localeCompare(b.k)).map(x => x.value);
}

function input(seed = "calendar-seed"): FrozenCalendarDesignInput {
  const parts: Record<string, string> = {}, alerts: Record<string, number> = {};
  for (let i = 1; i <= 31; i++) { parts[String(i)] = i <= 20 ? "TRAIN" : i <= 25 ? "VALIDATION" : "TEST"; alerts[String(i)] = 1500; }
  // Pair 1..5 and 7..11 must share a partition. The ordinary chronological
  // split above does not, so freeze all five pairs into TRAIN and leave the
  // remaining days chronological for this fixture.
  for (let p = 1; p <= 5; p++) parts[String(p + 6)] = parts[String(p)];
  const anchors: FrozenAirportSlotAssignment[] = ["KLAX", "EGLL", "WSSS", "SBGR", "OMDB"].map(icao => ({ icao, region: "ANCHOR_REGION" }));
  const anchorOrder = seededOrder(anchors, "anchor-seed|cycle-0");
  const pairs: FrozenCalendarDesignInput["pairAirportSets"] = {};
  for (let p = 1; p <= 5; p++) {
    pairs[`pair-${p}`] = {
      HUB: anchorOrder[p - 1],
      MID_A: { icao: `M${p}A`, region: "MID_A_REGION" },
      MID_B: { icao: `M${p}B`, region: "MID_B_REGION" },
      REGIONAL: { icao: `R${p}`, region: "REGION_R" },
    };
  }
  return {
    startDate: "2026-10-05",
    seed,
    anchorSeed: "anchor-seed",
    anchorPool: anchors,
    eligibleRegionsBySlot: { MID_A: ["MID_A_REGION"], MID_B: ["MID_B_REGION"], REGIONAL: ["REGION_R"] },
    pairAirportSets: pairs,
    evaluationPartitionByRunDay: parts,
    projectedAlertCreditsByRunDay: alerts,
    projectedRestUnitsTotal: 800,
    protectedRestBudget: 1000,
  };
}

describe("strict V3.9 calendar + slot-region solver", () => {
  it("generates exact 26/3/2, five matched pairs, and six-slot blocks", () => {
    const x = input(), r = solveV39Calendar(x);
    expect(r.status).toBe("SAT");
    expect(r.days).toHaveLength(31);
    expect(r.days.filter(d => d.windowShape === "4h")).toHaveLength(26);
    expect(r.days.filter(d => d.windowShape === "2x2h")).toHaveLength(3);
    expect(r.days.filter(d => d.windowShape === "up-to-6h")).toHaveLength(2);
    expect(validateV39Calendar(r.days, x)).toEqual([]);
  });

  it("freezes regions for ordinary days without freezing their airport set", () => {
    const r = solveV39Calendar(input());
    expect(r.status).toBe("SAT");
    const ordinary = r.days.find(d => d.crossoverGroupId === null)!;
    expect(ordinary.pairAirportSet).toBeNull();
    expect(ordinary.slotRegions).toEqual({ HUB: "ANCHOR_REGION", MID_A: "MID_A_REGION", MID_B: "MID_B_REGION", REGIONAL: "REGION_R" });
    expect(ordinary.drawType).toBe("NEW_TEMPLATE");
  });

  it("period 2 replays period 1 exact airports and regions and consumes no draw", () => {
    const r = solveV39Calendar(input());
    expect(r.status).toBe("SAT");
    for (let p = 1; p <= 5; p++) {
      const a = r.days[p - 1], b = r.days[p + 5];
      expect(b.drawType).toBe("PAIR_REPLAY");
      expect(b.pairAirportSet).toEqual(a.pairAirportSet);
      expect(b.slotRegions).toEqual(a.slotRegions);
    }
  });

  it("is deterministic and seed changes at least one pair treatment order", () => {
    const a = solveV39Calendar(input("calendar-seed"));
    const b = solveV39Calendar(input("calendar-seed"));
    const c = solveV39Calendar(input("different-seed"));
    expect(a.days).toEqual(b.days);
    expect(a.days.slice(0, 11).map(d => d.windowShape)).not.toEqual(c.days.slice(0, 11).map(d => d.windowShape));
  });

  it("refuses pair airport set whose slot regions do not match the frozen region template", () => {
    const x = input();
    x.pairAirportSets["pair-1"].REGIONAL.region = "WRONG";
    expect(solveV39Calendar(x)).toMatchObject({ status: "UNSAT" });
  });

  it("refuses pair HUB inconsistent with the frozen anchor rotation", () => {
    const x = input();
    x.pairAirportSets["pair-1"].HUB.icao = "KJFK";
    expect(solveV39Calendar(x)).toMatchObject({ status: "UNSAT" });
  });

  it("refuses evaluation-partition, Alert, REST, or region-set infeasibility", () => {
    const a = input(); a.evaluationPartitionByRunDay["7"] = "TEST"; expect(solveV39Calendar(a).status).toBe("UNSAT");
    const b = input(); b.projectedAlertCreditsByRunDay["4"] = 1901; expect(solveV39Calendar(b).status).toBe("UNSAT");
    const c = input(); c.projectedRestUnitsTotal = 1001; expect(solveV39Calendar(c).status).toBe("UNSAT");
    const d = input(); d.eligibleRegionsBySlot.REGIONAL = []; expect(solveV39Calendar(d).status).toBe("UNSAT");
  });

  it("validator catches pair replay/time-class tampering", () => {
    const x = input(), r = solveV39Calendar(x);
    expect(r.status).toBe("SAT");
    const days = structuredClone(r.days);
    days[6].timeClass = "20:00";
    days[6].pairAirportSet!.REGIONAL.icao = "OTHER";
    expect(validateV39Calendar(days, x).join(" ")).toMatch(/time class mismatch|airport replay mismatch/);
  });
});
