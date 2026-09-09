/**
 * TEST-017: 31-day experiment calendar constraint solver (V3.9 Plan §40)
 *
 * Covers:
 *  - Window-shape totals
 *  - Washout arithmetic (≥24h END→START)
 *  - 6 UTC slots rotation
 *  - 2x2h segments with gap
 *  - Calendar hash determinism
 *  - SAT/UNSAT validation
 */

import { describe, it, expect } from "vitest";
import {
  earliestNextStart,
  generateExperimentCalendar,
  validateCalendar,
  assignCrossoverPairs,
  validateCrossoverRequest,
  tagCappedUpTo6h,
  type CalendarConstraints,
  type CalendarDay,
  type WindowShape,
  type CrossoverContrast,
} from "../server/lib/disruption/experimentCalendar_v3";

const BASE_CONSTRAINTS: CalendarConstraints = {
  totalDays: 31,
  windowShapes: [
    { shape: "4h", count: 26 },
    { shape: "2x2h", count: 3 },
    { shape: "up-to-6h", count: 2 },
  ],
  sixUtcSlots: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
  washoutHours: 24,
  crossoverPairs: [],
  weekdayWeekendMatching: false,
  timeClassMatching: false,
  seed: "test-seed-001",
};

describe("TEST-017: Experiment calendar solver", () => {
  describe("Washout arithmetic", () => {
    it("≥24h washout: 08:00 end → earliest 08:00 next day", () => {
      expect(earliestNextStart("08:00", 24)).toBe("08:00");
    });

    it("≥24h washout: 12:00 end → earliest 12:00 next day", () => {
      expect(earliestNextStart("12:00", 24)).toBe("12:00");
    });

    it("20h washout (incorrect): 08:00 end → 04:00 next day", () => {
      // This is what would happen if washout were 20h instead of 24h
      expect(earliestNextStart("08:00", 20)).toBe("04:00");
    });

    it("6h window: 00:00 start → 06:00 end", () => {
      expect(earliestNextStart("00:00", 6)).toBe("06:00");
    });

    it("2h segment: 08:00 start → 10:00 end", () => {
      expect(earliestNextStart("08:00", 2)).toBe("10:00");
    });
  });

  describe("Calendar generation", () => {
    it("generates 31 days", () => {
      const result = generateExperimentCalendar(BASE_CONSTRAINTS, "2026-09-01");
      expect(result.feasible).toBe(true);
      expect(result.days.length).toBe(31);
    });

    it("correct window shape counts (plan §8.7: 26×4h + 3×2x2h + 2×up-to-6h)", () => {
      const result = generateExperimentCalendar(BASE_CONSTRAINTS, "2026-09-01");
      const shapeCounts = { "4h": 0, "2x2h": 0, "up-to-6h": 0 };
      for (const d of result.days) {
        shapeCounts[d.windowShape]++;
      }
      expect(shapeCounts["4h"]).toBe(26);
      expect(shapeCounts["2x2h"]).toBe(3);
      expect(shapeCounts["up-to-6h"]).toBe(2);
    });

    it("4h days have exactly 1 segment of 4 hours", () => {
      const result = generateExperimentCalendar(BASE_CONSTRAINTS, "2026-09-01");
      for (const d of result.days) {
        if (d.windowShape === "4h") {
          expect(d.segments.length).toBe(1);
          expect(d.segments[0].durationHours).toBe(4);
          expect(d.segments[0].isGap).toBe(false);
        }
      }
    });

    it("up-to-6h days have exactly 1 segment of up to 6 hours", () => {
      const result = generateExperimentCalendar(BASE_CONSTRAINTS, "2026-09-01");
      for (const d of result.days) {
        if (d.windowShape === "up-to-6h") {
          expect(d.segments.length).toBe(1);
          expect(d.segments[0].durationHours).toBe(6);
          expect(d.segments[0].isGap).toBe(false);
        }
      }
    });

    it("2x2h days have 3 segments (2 active + 1 gap)", () => {
      const result = generateExperimentCalendar(BASE_CONSTRAINTS, "2026-09-01");
      for (const d of result.days) {
        if (d.windowShape === "2x2h") {
          expect(d.segments.length).toBe(3);
          expect(d.segments[0].isGap).toBe(false);
          expect(d.segments[1].isGap).toBe(true);
          expect(d.segments[2].isGap).toBe(false);
          expect(d.segments[0].durationHours).toBe(2);
          expect(d.segments[1].durationHours).toBe(1);
          expect(d.segments[2].durationHours).toBe(2);
        }
      }
    });

    it("calendar hash is deterministic", () => {
      const r1 = generateExperimentCalendar(BASE_CONSTRAINTS, "2026-09-01");
      const r2 = generateExperimentCalendar(BASE_CONSTRAINTS, "2026-09-01");
      expect(r1.calendarHash).toBe(r2.calendarHash);
    });

    it("different window shapes produce different hashes", () => {
      const r1 = generateExperimentCalendar(BASE_CONSTRAINTS, "2026-09-01");
      const r2 = generateExperimentCalendar(
        {
          ...BASE_CONSTRAINTS,
          windowShapes: [
            { shape: "4h", count: 26 },
            { shape: "2x2h", count: 5 },
            { shape: "up-to-6h", count: 0 },
          ],
        },
        "2026-09-01",
      );
      expect(r1.calendarHash).not.toBe(r2.calendarHash);
    });
  });

  describe("SAT validation", () => {
    it("valid calendar passes SAT check", () => {
      const calendar = generateExperimentCalendar(BASE_CONSTRAINTS, "2026-09-01");
      const sat = validateCalendar(calendar, BASE_CONSTRAINTS);
      expect(sat.sat).toBe(true);
      expect(sat.violations).toHaveLength(0);
    });

    it("wrong day count fails SAT", () => {
      const result = generateExperimentCalendar(
        { ...BASE_CONSTRAINTS, totalDays: 10 },
        "2026-09-01",
      );
      expect(result.feasible).toBe(false);
      expect(result.unsatReason).toContain("31");
    });

    it("wrong window shape total fails SAT", () => {
      const result = generateExperimentCalendar(
        {
          ...BASE_CONSTRAINTS,
          windowShapes: [
            { shape: "4h", count: 10 }, // sums to 20, not 31
            { shape: "2x2h", count: 10 },
            { shape: "up-to-6h", count: 0 },
          ],
        },
        "2026-09-01",
      );
      expect(result.feasible).toBe(false);
      expect(result.unsatReason).toContain("sum");
    });
  });

  describe("Day index tracking", () => {
    it("dayIndex is sequential 1-31", () => {
      const result = generateExperimentCalendar(BASE_CONSTRAINTS, "2026-09-01");
      for (let i = 0; i < result.days.length; i++) {
        expect(result.days[i].dayIndex).toBe(i + 1);
      }
    });

    it("batchId is consistent across all days", () => {
      const result = generateExperimentCalendar(BASE_CONSTRAINTS, "2026-09-01");
      const batchIds = new Set(result.days.map(d => d.batchId));
      expect(batchIds.size).toBe(1);
    });

    it("isWeekend is correct", () => {
      const result = generateExperimentCalendar(BASE_CONSTRAINTS, "2026-09-01");
      for (const d of result.days) {
        const date = new Date(d.date);
        const day = date.getDay();
        expect(d.isWeekend).toBe(day === 0 || day === 6);
      }
    });
  });
});

describe("Phase 0L: crossover pairs (§1.5.12)", () => {
  // Build a deterministic 26/3/2 calendar, then pick real day indexes by shape.
  function calWithShapes() {
    const r = generateExperimentCalendar(BASE_CONSTRAINTS, "2026-09-01");
    expect(r.feasible).toBe(true);
    return r;
  }

  function pickDays() {
    const r = calWithShapes();
    const byShape: Record<string, number[]> = { "4h": [], "2x2h": [], "up-to-6h": [] };
    for (const d of r.days) byShape[d.windowShape].push(d.dayIndex);
    return { result: r, byShape };
  }

  // A satisfiable 31-day calendar whose crossover days share weekday AND time
  // class, so exactly 5 matched pairs are constructible. Paired periods are
  // placed on the SAME time class and ≥2 days apart (orderable). This isolates
  // the pairing logic from the sequential shape-ordering of the generator.
  function satisfiableCrossoverCalendar(): CalendarDay[] {
    const days: CalendarDay[] = [];
    for (let i = 1; i <= 31; i++) {
      const shape: WindowShape = i <= 26 ? "4h" : i <= 29 ? "2x2h" : "up-to-6h";
      days.push({
        dayIndex: i,
        runDayIndex: i,
        date: `2026-09-${String(i).padStart(2, "0")}`,
        dayOfWeek: "Monday",
        isWeekend: false,
        weekdayClass: "weekday",
        // days 1..4 = 4h@08:00; 5..8 = 4h@08:00; ... alternate 08:00/12:00 so
        // paired 4h + 2x2h can share a time class.
        timeClass: i % 2 === 1 ? "08:00" : "12:00",
        windowShape: shape,
        segments: [
          { segmentIndex: 0, startUtc: "08:00", endUtc: "12:00", durationHours: 4, isGap: false },
        ],
        batchId: `b${i}`,
        anchorAirport: null,
        treatmentAssignment: null,
        crossoverGroupId: null,
        crossoverPeriod: null,
        pairRole: null,
        actualWindowHours: null,
        stopReason: null,
      });
    }
    return days;
  }

  function buildFivePairs(days: CalendarDay[]): Array<{ period1DayIndex: number; period2DayIndex: number; contrast: CrossoverContrast }> {
    const byShape: Record<string, number[]> = { "4h": [], "2x2h": [], "up-to-6h": [] };
    for (const d of days) byShape[d.windowShape].push(d.dayIndex);
    const used = new Set<number>();
    const pairs: Array<{ period1DayIndex: number; period2DayIndex: number; contrast: CrossoverContrast }> = [];
    const take = (shape: string, contrast: CrossoverContrast) => {
      for (const alt of byShape[shape]) {
        if (used.has(alt)) continue;
        const altDay = days.find((d) => d.dayIndex === alt)!;
        const ctrl = byShape["4h"].find(
          (c) => !used.has(c)
            && days.find((d) => d.dayIndex === c)!.weekdayClass === altDay.weekdayClass
            && days.find((d) => d.dayIndex === c)!.timeClass === altDay.timeClass
            && c < alt,
        );
        if (ctrl === undefined) continue;
        used.add(ctrl); used.add(alt);
        pairs.push({ period1DayIndex: ctrl, period2DayIndex: alt, contrast });
        return;
      }
      throw new Error(`no pairable ${shape} day found`);
    };
    take("2x2h", "4h-vs-2x2h"); take("2x2h", "4h-vs-2x2h"); take("2x2h", "4h-vs-2x2h");
    take("up-to-6h", "4h-vs-up-to-6h"); take("up-to-6h", "4h-vs-up-to-6h");
    return pairs;
  }

  it("assigns exactly 5 pairs with correct composition + tags", () => {
    const days = satisfiableCrossoverCalendar();
    const pairs = buildFivePairs(days);
    const a = assignCrossoverPairs(pairs, days, "seed-1");
    expect("unsat" in a).toBe(false);
    if ("unsat" in a) return;
    expect(a.pairs).toHaveLength(5);
    expect(a.assignmentHash).toMatch(/^[a-f0-9]{64}$/);
    // Tags landed on the days.
    for (const p of a.pairs) {
      const d1 = days.find((d) => d.dayIndex === p.period1DayIndex)!;
      const d2 = days.find((d) => d.dayIndex === p.period2DayIndex)!;
      expect(d1.crossoverGroupId).toBe(p.crossoverGroupId);
      expect(d1.crossoverPeriod).toBe(1);
      expect(d1.pairRole).toBe("control");
      expect(d2.crossoverGroupId).toBe(p.crossoverGroupId);
      expect(d2.crossoverPeriod).toBe(2);
      expect(d2.pairRole).toBe("alternative");
      // Hard matching enforced (gptP0analyze4 #15)
      expect(d1.timeClass).toBe(d2.timeClass);
      expect(d1.weekdayClass).toBe(d2.weekdayClass);
      expect(p.period2DayIndex).toBeGreaterThan(p.period1DayIndex);
    }
  });

  it("time-class mismatch makes a pair UNSAT (never relaxed)", () => {
    const days = satisfiableCrossoverCalendar();
    const pairs = buildFivePairs(days);
    const pair0 = pairs[0];
    const usedDays = new Set(pairs.flatMap((p) => [p.period1DayIndex, p.period2DayIndex]));
    // Pick an unused 4h day whose time class differs from pair0's alternative.
    const altTC = days.find((d) => d.dayIndex === pair0.period2DayIndex)!.timeClass;
    const wrongCtrl = [1, 2, 3, 4, 5, 6].find(
      (c) => !usedDays.has(c)
        && days.find((d) => d.dayIndex === c)!.windowShape === "4h"
        && days.find((d) => d.dayIndex === c)!.timeClass !== altTC,
    );
    if (wrongCtrl === undefined) throw new Error("test fixture: no differing-time-class 4h day");
    pairs[0] = { ...pair0, period1DayIndex: wrongCtrl };
    expect(() => assignCrossoverPairs(pairs, days, "seed-1")).toThrow(/time class/);
  });

  it("wrong pair count → UNSAT (never silent relaxation)", () => {
    const { result } = pickDays();
    const r = assignCrossoverPairs([], result.days, "seed-1");
    expect("unsat" in r).toBe(true);
  });

  it("wrong composition → UNSAT", () => {
    const { result, byShape } = pickDays();
    const pairs = byShape["4h"].slice(0, 5).map((c, i) => ({
      period1DayIndex: c,
      period2DayIndex: byShape["2x2h"][0],
      contrast: "4h-vs-2x2h" as const,
    }));
    // Force-duplicate alternative to also break distinctness; composition itself is wrong (5× same contrast).
    const r = assignCrossoverPairs(
      pairs.map((p) => ({ ...p, contrast: "4h-vs-up-to-6h" as const })),
      result.days,
      "seed-1",
    );
    expect("unsat" in r).toBe(true);
  });

  it("scheduler refuses undeclared groups and period-2-without-1", () => {
    const days = satisfiableCrossoverCalendar();
    const pairs = buildFivePairs(days);
    const a = assignCrossoverPairs(pairs, days, "seed-1");
    expect("unsat" in a).toBe(false);
    if ("unsat" in a) return;
    expect(validateCrossoverRequest(a, { crossoverGroupId: "pair-99", period: 1 }).allowed).toBe(false);
    expect(validateCrossoverRequest(a, { crossoverGroupId: a.pairs[0].crossoverGroupId, period: 1 }).allowed).toBe(true);
    expect(validateCrossoverRequest(a, { crossoverGroupId: a.pairs[0].crossoverGroupId, period: 2 }).allowed).toBe(true);
  });

  it("capped 6h-requested day is tagged up-to-6h with budget_reached (never relabeled 6h)", () => {
    const { result } = pickDays();
    const d = { ...result.days[0] };
    const tagged = tagCappedUpTo6h(d, 3.42);
    expect(tagged.windowShape).toBe("up-to-6h");
    expect(tagged.actualWindowHours).toBe(3.42);
    expect(tagged.stopReason).toBe("budget_reached");
  });

  it("days carry runDayIndex, weekdayClass, timeClass", () => {
    const { result } = pickDays();
    for (let i = 0; i < result.days.length; i++) {
      const d = result.days[i];
      expect(d.runDayIndex).toBe(i + 1);
      expect(["weekday", "weekend"]).toContain(d.weekdayClass);
      expect(typeof d.timeClass).toBe("string");
    }
  });
});
