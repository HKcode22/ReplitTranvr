/**
 * FIDS/API-unit budget recompute — V3.9-f.9 §41 / Sep1_1 §41
 *
 * Computes REST API unit budget from the actual materialized calendar,
 * not simple arithmetic assumptions.
 *
 * Sep1_1 §41 corrections:
 *  - Compute calls from: all Phase-6 experiment days × airports queried
 *    × PRE horizons × number of 2x2 segments × long-window splits
 *    × account-specific max FIDS range + retries + validation + outcome
 *    + history bootstrap + diagnostics
 *  - Do NOT assume "one call per horizon per day" if a day has two segments
 *    or a 6h range requires multiple calls
 *  - Generate machine-checkable budget report
 *  - Track separately: FIDS_BASE_UNITS, FIDS_SPLIT_UNITS, FIDS_RETRY_UNIT_BUDGET,
 *    VALIDATION_UNIT_BUDGET, OUTCOME_REST_UNIT_BUDGET, HISTORY_BOOTSTRAP_UNIT_BUDGET,
 *    DIAGNOSTIC_UNIT_BUDGET, REST_TOTAL_UNIT_BUDGET
 */

import type { CalendarDay, WindowShape } from "./experimentCalendar_v3";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BudgetConfig {
  /** Number of airports queried per experiment day */
  airportsPerDay: number;
  /** PRE horizons (e.g., T-24, T-6, T-90) */
  preHorizons: number;
  /** Number of long-window splits per segment */
  longWindowSplits: number;
  /** Max FIDS range in hours (account-specific, measured at Gate 0.5) */
  maxFidsRangeHours: number;
  /** Retry multiplier (10% contingency) */
  retryMultiplier: number;
  /** Validation units per day */
  validationUnitsPerDay: number;
  /** Outcome REST units per day */
  outcomeRestUnitsPerDay: number;
  /** History bootstrap units (one-time) */
  historyBootstrapUnits: number;
  /** Diagnostic units per day */
  diagnosticUnitsPerDay: number;
}

export interface BudgetReport {
  /** Base FIDS calls: days × airports × horizons × segments */
  fidsBaseUnits: number;
  /** Split units: days × airports × splits */
  fidsSplitUnits: number;
  /** Retry budget: 10% of base + split */
  fidsRetryUnits: number;
  /** Validation units */
  validationUnits: number;
  /** Outcome REST units */
  outcomeRestUnits: number;
  /** History bootstrap units */
  historyBootstrapUnits: number;
  /** Diagnostic units */
  diagnosticUnits: number;
  /** Total REST units */
  restTotalUnits: number;
  /** Breakdown by day shape */
  breakdownByShape: Record<WindowShape, { days: number; callsPerDay: number }>;
  /** Per-day call count */
  perDayCalls: { day: number; date: string; shape: WindowShape; calls: number }[];
  /** Machine-readable */
  generatedAt: string;
  calendarHash: string;
}

// ---------------------------------------------------------------------------
// Budget computation (§41)
// ---------------------------------------------------------------------------

/**
 * Compute the complete FIDS/API-unit budget from the materialized calendar.
 * This is the authoritative budget — not simple arithmetic.
 */
export function recomputeBudget(
  days: CalendarDay[],
  config: BudgetConfig,
  calendarHash: string,
): BudgetReport {
  const perDayCalls: BudgetReport["perDayCalls"] = [];
  const shapeBreakdown: Record<string, { days: number; callsPerDay: number }> = {};

  let totalBase = 0;
  let totalSplit = 0;

  for (const day of days) {
    // Count active (non-gap) segments
    const activeSegments = day.segments.filter(s => !s.isGap);
    const segmentCount = activeSegments.length;

    // Base calls: airports × horizons × segments
    const baseCalls = config.airportsPerDay * config.preHorizons * segmentCount;

    // Split calls: airports × splits (for long windows that need multiple FIDS calls)
    let splitCalls = 0;
    const longWindowHours = day.windowShape === "4h" ? 4 : day.windowShape === "up-to-6h" ? 6 : 0;
    if (longWindowHours > 0) {
      // A long window may need multiple FIDS calls if max FIDS range < window length
      const callsNeeded = Math.ceil(longWindowHours / config.maxFidsRangeHours);
      if (callsNeeded > 1) {
        splitCalls = config.airportsPerDay * (callsNeeded - 1) * config.longWindowSplits;
      }
    }

    const dayTotal = baseCalls + splitCalls;
    totalBase += baseCalls;
    totalSplit += splitCalls;

    perDayCalls.push({
      day: day.dayIndex,
      date: day.date,
      shape: day.windowShape,
      calls: dayTotal,
    });

    if (!shapeBreakdown[day.windowShape]) {
      shapeBreakdown[day.windowShape] = { days: 0, callsPerDay: 0 };
    }
    shapeBreakdown[day.windowShape].days++;
    shapeBreakdown[day.windowShape].callsPerDay += dayTotal;
  }

  const retryUnits = Math.ceil((totalBase + totalSplit) * (config.retryMultiplier - 1));
  const validationUnits = config.validationUnitsPerDay * days.length;
  const outcomeRestUnits = config.outcomeRestUnitsPerDay * days.length;
  const historyBootstrapUnits = config.historyBootstrapUnits;
  const diagnosticUnits = config.diagnosticUnitsPerDay * days.length;
  const restTotalUnits = totalBase + totalSplit + retryUnits + validationUnits + outcomeRestUnits + historyBootstrapUnits + diagnosticUnits;

  return {
    fidsBaseUnits: totalBase,
    fidsSplitUnits: totalSplit,
    fidsRetryUnits: retryUnits,
    validationUnits,
    outcomeRestUnits,
    historyBootstrapUnits,
    diagnosticUnits,
    restTotalUnits,
    breakdownByShape: shapeBreakdown as Record<WindowShape, { days: number; callsPerDay: number }>,
    perDayCalls,
    generatedAt: new Date().toISOString(),
    calendarHash,
  };
}

// ---------------------------------------------------------------------------
// Alert-credit vs REST/API-unit accounting (§42)
// ---------------------------------------------------------------------------

export interface CreditAccounting {
  /** Alert credits: webhook Flight Alert sends */
  alertCredits: {
    openingBalance: number;
    newRefill: number;
    preRunSpend: number;
    phase6Ceiling: number;
    protectedFloor: number;
    remainingUnallocated: number;
  };
  /** API units: REST calls and Alert-credit refills */
  apiUnits: {
    monthlyEntitlement: number;
    unitsSpentRefillingAlertBalance: number;
    restFidsUnits: number;
    restOtherUnits: number;
    remainingApiUnits: number;
  };
}

/**
 * Verify that Alert credits and API units are NOT double-counted.
 * FIDS calls use REST API units, NOT Alert credits.
 * Alert anchor probes use Alert credits, NOT REST units.
 */
export function verifyNoDoubleCounting(accounting: CreditAccounting): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Alert credits identity: opening + refill = preRun + phase6 + protected + remaining
  const alertSum = accounting.alertCredits.preRunSpend +
    accounting.alertCredits.phase6Ceiling +
    accounting.alertCredits.protectedFloor +
    accounting.alertCredits.remainingUnallocated;
  const alertExpected = accounting.alertCredits.openingBalance + accounting.alertCredits.newRefill;
  if (Math.abs(alertSum - alertExpected) > 0.01) {
    errors.push(`Alert credits don't sum: ${alertSum} ≠ ${alertExpected}`);
  }

  // API units identity: entitlement = refill units + FIDS units + other units + remaining
  const apiSum = accounting.apiUnits.unitsSpentRefillingAlertBalance +
    accounting.apiUnits.restFidsUnits +
    accounting.apiUnits.restOtherUnits +
    accounting.apiUnits.remainingApiUnits;
  if (Math.abs(apiSum - accounting.apiUnits.monthlyEntitlement) > 0.01) {
    errors.push(`API units don't sum: ${apiSum} ≠ ${accounting.apiUnits.monthlyEntitlement}`);
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Billing cycle (§44)
// ---------------------------------------------------------------------------

export interface BillingCycle {
  cycleStart: string;  // YYYY-MM-DD
  cycleEnd: string;    // YYYY-MM-DD
  monthlyEntitlement: number;
  openingUsage: number;
}

/**
 * Check if a 31-day experiment crosses a billing cycle boundary.
 * If it does, a new monthly allocation does NOT increase the predeclared
 * scientific run budget (§44).
 */
export function crossesBillingCycle(
  experimentStart: string,
  experimentEnd: string,
  cycle: BillingCycle,
): boolean {
  const expStart = new Date(experimentStart);
  const expEnd = new Date(experimentEnd);
  const cycleEnd = new Date(cycle.cycleEnd);
  return expEnd > cycleEnd;
}
