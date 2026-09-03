/**
 * TEST-021: Budget accounting tests (V3.9 Plan §41-42)
 *
 * Covers:
 *  - FIDS/API-unit budget computation from materialized calendar
 *  - Window-shape-aware call counting
 *  - Retry budget (10% contingency)
 *  - Alert-credit vs API-unit separation (no double-counting)
 *  - Billing cycle boundary crossing
 *  - Budget report determinism
 */

import { describe, it, expect } from "vitest";
import {
  recomputeBudget,
  verifyNoDoubleCounting,
  crossesBillingCycle,
  type BudgetConfig,
  type BillingCycle,
  type CreditAccounting,
} from "../server/lib/disruption/budgetAccounting_v3";
import type { CalendarDay } from "../server/lib/disruption/experimentCalendar_v3";

// ---------------------------------------------------------------------------
// TEST-021: Budget accounting
// ---------------------------------------------------------------------------

describe("TEST-021: Budget accounting", () => {
  const baseConfig: BudgetConfig = {
    airportsPerDay: 5,
    preHorizons: 3,
    longWindowSplits: 2,
    maxFidsRangeHours: 4,
    retryMultiplier: 1.1,
    validationUnitsPerDay: 10,
    outcomeRestUnitsPerDay: 5,
    historyBootstrapUnits: 100,
    diagnosticUnitsPerDay: 2,
  };

  function makeDay(dayIndex: number, shape: "4h" | "2x2h" | "up-to-6h"): CalendarDay {
    const segments = shape === "2x2h"
      ? [
          { segmentIndex: 0, startUtc: "08:00", endUtc: "10:00", durationHours: 2, isGap: false },
          { segmentIndex: 1, startUtc: "10:00", endUtc: "11:00", durationHours: 1, isGap: true },
          { segmentIndex: 2, startUtc: "11:00", endUtc: "13:00", durationHours: 2, isGap: false },
        ]
      : [{ segmentIndex: 0, startUtc: "08:00", endUtc: shape === "4h" ? "12:00" : "14:00", durationHours: shape === "4h" ? 4 : 6, isGap: false }];

    return {
      dayIndex,
      date: `2026-09-${String(dayIndex).padStart(2, "0")}`,
      dayOfWeek: "Monday",
      isWeekend: false,
      windowShape: shape,
      segments,
      batchId: "batch_2026-09-01",
      anchorAirport: null,
      treatmentAssignment: null,
    };
  }

  describe("Budget computation", () => {
    it("computes budget from calendar days", () => {
      const days = Array.from({ length: 31 }, (_, i) => makeDay(i + 1, i < 20 ? "up-to-6h" : "2x2h"));
      const report = recomputeBudget(days, baseConfig, "test-hash");

      expect(report.restTotalUnits).toBeGreaterThan(0);
      expect(report.fidsBaseUnits).toBeGreaterThan(0);
      expect(report.generatedAt).toBeTruthy();
      expect(report.calendarHash).toBe("test-hash");
    });

    it("up-to-6h days have correct base calls: airports × horizons × segments", () => {
      const days = [makeDay(1, "up-to-6h")];
      const report = recomputeBudget(days, baseConfig, "test");

      // 5 airports × 3 horizons × 1 segment = 15
      expect(report.fidsBaseUnits).toBe(15);
    });

    it("2x2h days have correct base calls: airports × horizons × 2 active segments", () => {
      const days = [makeDay(1, "2x2h")];
      const report = recomputeBudget(days, baseConfig, "test");

      // 5 airports × 3 horizons × 2 active segments = 30
      expect(report.fidsBaseUnits).toBe(30);
    });

    it("split units computed for up-to-6h windows when maxFidsRange < 6h", () => {
      const days = [makeDay(1, "up-to-6h")];
      const report = recomputeBudget(days, baseConfig, "test");

      // ceil(6/4) = 2 calls needed, so 1 split per airport
      // 5 airports × 1 split × 2 longWindowSplits = 10
      expect(report.fidsSplitUnits).toBe(10);
    });

    it("no split units for 2x2h windows", () => {
      const days = [makeDay(1, "2x2h")];
      const report = recomputeBudget(days, baseConfig, "test");

      expect(report.fidsSplitUnits).toBe(0);
    });

    it("retry budget is 10% of base + split", () => {
      const days = [makeDay(1, "up-to-6h")];
      const report = recomputeBudget(days, baseConfig, "test");

      const expectedRetry = Math.ceil((report.fidsBaseUnits + report.fidsSplitUnits) * 0.1);
      expect(report.fidsRetryUnits).toBe(expectedRetry);
    });

    it("total includes all components", () => {
      const days = [makeDay(1, "up-to-6h")];
      const report = recomputeBudget(days, baseConfig, "test");

      const expectedTotal =
        report.fidsBaseUnits +
        report.fidsSplitUnits +
        report.fidsRetryUnits +
        report.validationUnits +
        report.outcomeRestUnits +
        report.historyBootstrapUnits +
        report.diagnosticUnits;

      expect(report.restTotalUnits).toBe(expectedTotal);
    });

    it("per-day breakdown has correct shape labels", () => {
      const days = [makeDay(1, "up-to-6h"), makeDay(2, "2x2h")];
      const report = recomputeBudget(days, baseConfig, "test");

      expect(report.perDayCalls[0].shape).toBe("up-to-6h");
      expect(report.perDayCalls[1].shape).toBe("2x2h");
    });
  });

  describe("Alert-credit vs API-unit separation", () => {
    it("valid accounting passes verification", () => {
      const accounting: CreditAccounting = {
        alertCredits: {
          openingBalance: 1000,
          newRefill: 500,
          preRunSpend: 100,
          phase6Ceiling: 200,
          protectedFloor: 100,
          remainingUnallocated: 1100,
        },
        apiUnits: {
          monthlyEntitlement: 5000,
          unitsSpentRefillingAlertBalance: 500,
          restFidsUnits: 2000,
          restOtherUnits: 500,
          remainingApiUnits: 2000,
        },
      };

      const result = verifyNoDoubleCounting(accounting);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("unbalanced alert credits fails verification", () => {
      const accounting: CreditAccounting = {
        alertCredits: {
          openingBalance: 1000,
          newRefill: 500,
          preRunSpend: 100,
          phase6Ceiling: 200,
          protectedFloor: 100,
          remainingUnallocated: 900, // should be 1100
        },
        apiUnits: {
          monthlyEntitlement: 5000,
          unitsSpentRefillingAlertBalance: 500,
          restFidsUnits: 2000,
          restOtherUnits: 500,
          remainingApiUnits: 2000,
        },
      };

      const result = verifyNoDoubleCounting(accounting);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("unbalanced API units fails verification", () => {
      const accounting: CreditAccounting = {
        alertCredits: {
          openingBalance: 1000,
          newRefill: 500,
          preRunSpend: 100,
          phase6Ceiling: 200,
          protectedFloor: 100,
          remainingUnallocated: 1100,
        },
        apiUnits: {
          monthlyEntitlement: 5000,
          unitsSpentRefillingAlertBalance: 500,
          restFidsUnits: 2000,
          restOtherUnits: 500,
          remainingApiUnits: 1500, // should be 2000
        },
      };

      const result = verifyNoDoubleCounting(accounting);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Billing cycle crossing", () => {
    it("detects cycle crossing", () => {
      const crosses = crossesBillingCycle(
        "2026-09-01",
        "2026-10-01",
        { cycleStart: "2026-09-01", cycleEnd: "2026-09-30", monthlyEntitlement: 5000, openingUsage: 0 },
      );
      expect(crosses).toBe(true);
    });

    it("detects no cycle crossing", () => {
      const crosses = crossesBillingCycle(
        "2026-09-01",
        "2026-09-30",
        { cycleStart: "2026-09-01", cycleEnd: "2026-09-30", monthlyEntitlement: 5000, openingUsage: 0 },
      );
      expect(crosses).toBe(false);
    });
  });
});
