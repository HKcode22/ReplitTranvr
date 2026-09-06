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
  type CalendarConstraints,
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
