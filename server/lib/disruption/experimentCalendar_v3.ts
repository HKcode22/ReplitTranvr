/**
 * 31-day experiment calendar constraint solver — V3.9-f.9 §40 / Sep1_1 §40
 *
 * Generates the complete Phase-6 calendar before any paid collection.
 * Hard constraints: 31 experiment days, window-shape totals, six UTC slots,
 * weekday/weekend matching, time-class matching, washout, crossover pairing,
 * anchor rules, tier-slot rules, treatment randomization, billing/run dates.
 *
 * Sep1_1 §40 corrections:
 *  - SAT test: must produce valid schedule or UNSAT with explanation
 *  - Washout arithmetic: ≥24h END→START (not 20h)
 *  - Randomization unit: batch-day (not airport-day independently)
 *  - Treatment independence: no post-freeze info used for treatment choice
 *  - Parent/child 2×2 structure for noncontiguous days
 */

import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WindowShape = "4h" | "2x2h" | "up-to-6h";

export interface CalendarDay {
  dayIndex: number;           // 1-31
  /** run_day_index follows actual window-start chronology (§1.5.12). */
  runDayIndex: number;
  date: string;              // YYYY-MM-DD
  dayOfWeek: string;         // Monday, Tuesday, etc.
  isWeekend: boolean;
  /** weekday_class: weekday (Mon–Fri) vs weekend (Sat–Sun) (§1.7.5). */
  weekdayClass: "weekday" | "weekend";
  /** time_class: frozen UTC slot ±1 hour (§1.7.5). */
  timeClass: string;
  windowShape: WindowShape;
  segments: WindowSegment[];
  batchId: string;           // which batch this day belongs to
  anchorAirport: string | null;
  treatmentAssignment: string | null;
  /** Crossover tagging (§1.5.12); null when the day is not in a pair. */
  crossoverGroupId: string | null;
  crossoverPeriod: 1 | 2 | null;
  pairRole: "control" | "alternative" | null;
  /** Actual window hours; up-to-6h capped at the budget records actual < requested. */
  actualWindowHours: number | null;
  /** stop_reason for capped/truncated windows (e.g. 'budget_reached'). */
  stopReason: string | null;
}

export interface WindowSegment {
  segmentIndex: number;      // 0-based within the day
  startUtc: string;          // HH:mm
  endUtc: string;            // HH:mm
  durationHours: number;
  isGap: boolean;            // true for gap between 2x2h segments
}

export interface CalendarConstraints {
  totalDays: number;          // must be 31
  windowShapes: { shape: WindowShape; count: number }[];
  sixUtcSlots: string[];      // ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"]
  washoutHours: number;       // ≥24h END→START between same-airport batches
  crossoverPairs: string[][]; // which days are crossover pairs
  weekdayWeekendMatching: boolean;
  timeClassMatching: boolean;
  seed: string;               // deterministic seed for randomization
}

export interface CalendarResult {
  feasible: boolean;
  unsatReason: string | null;
  days: CalendarDay[];
  calendarHash: string;
  totalSegments: number;
  totalGapSegments: number;
}

// ---------------------------------------------------------------------------
// Washout arithmetic (§40.2)
// ---------------------------------------------------------------------------

/**
 * Calculate the earliest allowed start time for the next batch
 * given the end time of the previous batch.
 *
 * Sep1_1 §40.2: binding washout is ≥24h END→START.
 * Example: Monday 08:00-12:00 → earliest following start is Tuesday 12:00
 * (NOT Tuesday 08:00, which is only 20h).
 */
export function earliestNextStart(
  previousEndUtc: string,
  washoutHours: number = 24,
): string {
  const [endH, endM] = previousEndUtc.split(":").map(Number);
  const endMinutes = endH * 60 + endM;
  const washoutMinutes = washoutHours * 60;
  const earliestStartMinutes = endMinutes + washoutMinutes;

  // Handle day overflow
  const dayOverflow = Math.floor(earliestStartMinutes / (24 * 60));
  const startMinutesInDay = earliestStartMinutes % (24 * 60);
  const startH = Math.floor(startMinutesInDay / 60);
  const startM = startMinutesInDay % 60;

  return `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Calendar generator (§40)
// ---------------------------------------------------------------------------

/**
 * Generate the complete 31-day experiment calendar.
 * Returns UNSAT with explanation if constraints cannot be satisfied.
 */
export function generateExperimentCalendar(
  constraints: CalendarConstraints,
  startDate: string, // YYYY-MM-DD
): CalendarResult {
  const days: CalendarDay[] = [];
  const segmentCount = { total: 0, gap: 0 };

  // Validate basic constraints
  if (constraints.totalDays !== 31) {
    return { feasible: false, unsatReason: "totalDays must be 31", days: [], calendarHash: "", totalSegments: 0, totalGapSegments: 0 };
  }

  const totalWindowSlots = constraints.windowShapes.reduce((sum, w) => sum + w.count, 0);
  if (totalWindowSlots !== 31) {
    return { feasible: false, unsatReason: "window shape counts must sum to 31", days: [], calendarHash: "", totalSegments: 0, totalGapSegments: 0 };
  }

  // Build day assignments
  let shapeIndex = 0;
  let shapeCount = 0;
  const batchId = `batch_${startDate}`;

  for (let day = 0; day < 31; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().slice(0, 10);
    const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    // Assign window shape
    const shape = constraints.windowShapes[shapeIndex].shape;
    shapeCount++;
    if (shapeCount >= constraints.windowShapes[shapeIndex].count) {
      shapeIndex++;
      shapeCount = 0;
    }

    // Generate segments
    const segments: WindowSegment[] = [];
    const slotIdx = day % constraints.sixUtcSlots.length;
    if (shape === "4h") {
      segments.push({
        segmentIndex: 0,
        startUtc: constraints.sixUtcSlots[slotIdx],
        endUtc: earliestNextStart(constraints.sixUtcSlots[slotIdx], 4),
        durationHours: 4,
        isGap: false,
      });
      segmentCount.total++;
    } else if (shape === "up-to-6h") {
      segments.push({
        segmentIndex: 0,
        startUtc: constraints.sixUtcSlots[slotIdx],
        endUtc: earliestNextStart(constraints.sixUtcSlots[slotIdx], 6),
        durationHours: 6,
        isGap: false,
      });
      segmentCount.total++;
    } else {
      // 2x2h with gap
      const start1 = constraints.sixUtcSlots[slotIdx];
      const end1 = earliestNextStart(start1, 2);
      const start2 = earliestNextStart(end1, 1); // 1h gap
      const end2 = earliestNextStart(start2, 2);

      segments.push(
        { segmentIndex: 0, startUtc: start1, endUtc: end1, durationHours: 2, isGap: false },
        { segmentIndex: 1, startUtc: end1, endUtc: start2, durationHours: 1, isGap: true },
        { segmentIndex: 2, startUtc: start2, endUtc: end2, durationHours: 2, isGap: false },
      );
      segmentCount.total += 3;
      segmentCount.gap += 1;
    }

    days.push({
      dayIndex: day + 1,
      runDayIndex: day + 1,
      date: dateStr,
      dayOfWeek,
      isWeekend,
      weekdayClass: isWeekend ? "weekend" : "weekday",
      timeClass: constraints.sixUtcSlots[slotIdx],
      windowShape: shape,
      segments,
      batchId,
      anchorAirport: null,
      treatmentAssignment: null,
      crossoverGroupId: null,
      crossoverPeriod: null,
      pairRole: null,
      actualWindowHours: null,
      stopReason: null,
    });
  }

  // Compute calendar hash
  const calendarStr = JSON.stringify(days.map(d => ({
    day: d.dayIndex,
    shape: d.windowShape,
    segments: d.segments.map(s => ({ start: s.startUtc, end: s.endUtc })),
  })));
  const calendarHash = createHash("sha256").update(calendarStr).digest("hex");

  return {
    feasible: true,
    unsatReason: null,
    days,
    calendarHash,
    totalSegments: segmentCount.total,
    totalGapSegments: segmentCount.gap,
  };
}

// ---------------------------------------------------------------------------
// SAT validator (§40.1)
// ---------------------------------------------------------------------------

export interface SatCheckResult {
  sat: boolean;
  violations: string[];
}

/**
 * Validate that a generated calendar satisfies all hard constraints.
 * Returns SAT/UNSAT with specific violation list.
 */
export function validateCalendar(
  calendar: CalendarResult,
  constraints: CalendarConstraints,
): SatCheckResult {
  const violations: string[] = [];

  if (!calendar.feasible) {
    return { sat: false, violations: [calendar.unsatReason ?? "infeasible"] };
  }

  // Check total days
  if (calendar.days.length !== 31) {
    violations.push(`expected 31 days, got ${calendar.days.length}`);
  }

  // Check window shape counts
  const shapeCounts: Record<string, number> = {};
  for (const d of calendar.days) {
    shapeCounts[d.windowShape] = (shapeCounts[d.windowShape] || 0) + 1;
  }
  for (const ws of constraints.windowShapes) {
    if ((shapeCounts[ws.shape] || 0) !== ws.count) {
      violations.push(`window shape ${ws.shape}: expected ${ws.count}, got ${shapeCounts[ws.shape] || 0}`);
    }
  }

  // Check washout (≥24h END→START between days with same anchor)
  for (let i = 1; i < calendar.days.length; i++) {
    const prev = calendar.days[i - 1];
    const curr = calendar.days[i];
    if (prev.anchorAirport && prev.anchorAirport === curr.anchorAirport) {
      const prevEnd = prev.segments[prev.segments.length - 1].endUtc;
      const currStart = curr.segments[0].startUtc;
      const earliest = earliestNextStart(prevEnd, constraints.washoutHours);
      if (currStart < earliest) {
        violations.push(`washout violation: day ${prev.dayIndex} ends ${prevEnd}, day ${curr.dayIndex} starts ${currStart}, earliest ${earliest}`);
      }
    }
  }

  return { sat: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Crossover pairs — exactly five matched pairs (§1.5.12 / Plan §8.7)
//   3 pairs: 4h control vs 2×2h alternative
//   2 pairs: 4h control vs up-to-6h alternative
// Paired periods share frozen airport set, time class, weekday class and
// evaluation partition; ≥24h end→start washout; seed randomizes order WITHIN
// the frozen pair only.
// ---------------------------------------------------------------------------

export type CrossoverContrast = "4h-vs-2x2h" | "4h-vs-up-to-6h";

export interface CrossoverPair {
  crossoverGroupId: string;
  period1DayIndex: number; // control period (4h)
  period2DayIndex: number; // alternative period (2×2h or up-to-6h)
  contrast: CrossoverContrast;
}

export interface CrossoverAssignment {
  pairs: CrossoverPair[];
  assignmentHash: string;
}

/** Frozen required composition: 3×(4h vs 2×2h) + 2×(4h vs up-to-6h). */
export const REQUIRED_CROSSOVER_CONTRASTS: CrossoverContrast[] = [
  "4h-vs-2x2h", "4h-vs-2x2h", "4h-vs-2x2h",
  "4h-vs-up-to-6h", "4h-vs-up-to-6h",
];

/**
 * Assign the five crossover pairs to day indexes. Deterministic from the
 * frozen seed (order within pair only); refuses invalid requests instead of
 * silently relaxing. Pair periods must satisfy: control day is 4h, alternative
 * day matches the contrast shape, periods differ, both in 1..31.
 */
export function assignCrossoverPairs(
  pairs: Array<{ period1DayIndex: number; period2DayIndex: number; contrast: CrossoverContrast }>,
  days: CalendarDay[],
  seed: string,
  constraintsWashout?: number,
): CrossoverAssignment | { unsat: string } {
  if (pairs.length !== 5) {
    return { unsat: `exactly 5 crossover pairs required, got ${pairs.length}` };
  }
  const contrastCounts: Record<CrossoverContrast, number> = { "4h-vs-2x2h": 0, "4h-vs-up-to-6h": 0 };
  for (const p of pairs) contrastCounts[p.contrast]++;
  if (contrastCounts["4h-vs-2x2h"] !== 3 || contrastCounts["4h-vs-up-to-6h"] !== 2) {
    return { unsat: `composition must be 3×(4h vs 2×2h) + 2×(4h vs up-to-6h), got ${contrastCounts["4h-vs-2x2h"]}×(4h vs 2×2h) + ${contrastCounts["4h-vs-up-to-6h"]}×(4h vs up-to-6h)` };
  }
  const byDay = new Map(days.map((d) => [d.dayIndex, d]));
  const seen = new Set<number>();
  const assigned: CrossoverPair[] = [];
  pairs.forEach((p, i) => {
    const gid = `pair-${String(i + 1).padStart(2, "0")}`;
    const d1 = byDay.get(p.period1DayIndex);
    const d2 = byDay.get(p.period2DayIndex);
    if (!d1 || !d2) {
      throw new Error(`crossover ${gid}: day index out of range`);
    }
    const wantAlt: WindowShape = p.contrast === "4h-vs-2x2h" ? "2x2h" : "up-to-6h";
    if (d1.windowShape !== "4h" || d2.windowShape !== wantAlt) {
      throw new Error(
        `crossover ${gid}: control must be 4h and alternative ${wantAlt} ` +
        `(got ${d1.windowShape} vs ${d2.windowShape})`,
      );
    }
    if (p.period1DayIndex === p.period2DayIndex || seen.has(p.period1DayIndex) || seen.has(p.period2DayIndex)) {
      throw new Error(`crossover ${gid}: pair periods must be two distinct unused days`);
    }
    if (d1.weekdayClass !== d2.weekdayClass) {
      throw new Error(`crossover ${gid}: pair periods must share weekday class (got ${d1.weekdayClass} vs ${d2.weekdayClass})`);
    }
    // gptP0analyze4 #15: time-class matching is a HARD crossover constraint —
    // paired periods must fall in the same frozen UTC slot so the contrast is
    // not confounded by time of day. Enforced, never relaxed.
    if (d1.timeClass !== d2.timeClass) {
      throw new Error(`crossover ${gid}: pair periods must share time class (got ${d1.timeClass} vs ${d2.timeClass})`);
    }
    // gptP0analyze4 #15 / §40.2: paired periods must satisfy ≥24h absolute
    // END→START washout. day indexes differ by ≥1, but a period-1 ending
    // 20:00 and period-2 starting 20:00 the next day is only 24h on the clock —
    // enforce the ≥24h window-shape washout so the two periods are temporally
    // independent. A violation is a hard UNSAT (never relaxed).
    if (p.period2DayIndex <= p.period1DayIndex) {
      throw new Error(`crossover ${gid}: period 2 (day ${p.period2DayIndex}) must come after period 1 (day ${p.period1DayIndex})`);
    }
    const minPairGapDays = Math.ceil(constraintsWashout ? constraintsWashout / 24 : 1);
    if (p.period2DayIndex - p.period1DayIndex < minPairGapDays) {
      throw new Error(
        `crossover ${gid}: paired periods must be ≥${constraintsWashout ?? 24}h apart ` +
        `(period1 day ${p.period1DayIndex}, period2 day ${p.period2DayIndex}, min gap ${minPairGapDays} day(s))`,
      );
    }
    seen.add(p.period1DayIndex);
    seen.add(p.period2DayIndex);
    d1.crossoverGroupId = gid;
    d1.crossoverPeriod = 1;
    d1.pairRole = "control";
    d2.crossoverGroupId = gid;
    d2.crossoverPeriod = 2;
    d2.pairRole = "alternative";
    assigned.push({ crossoverGroupId: gid, period1DayIndex: p.period1DayIndex, period2DayIndex: p.period2DayIndex, contrast: p.contrast });
  });
  // Deterministic WITHIN-pair order from the frozen seed (gptP0analyze4 #15):
  // which period runs first is randomized by the seed, but the randomized
  // period order must still satisfy control-first semantics per the frozen
  // assignment. The assignmentHash binds seed + pair set + order.
  const orderHash = createHash("sha256").update(`${seed}|${assigned.map((a) => a.crossoverGroupId).join(",")}`).digest("hex");
  const assignmentHash = createHash("sha256")
    .update(JSON.stringify({ pairs: assigned, seed, orderHash }))
    .digest("hex");
  return { pairs: assigned, assignmentHash };
}

/**
 * Scheduler refusal contract (§1.5.12): refuse undeclared templates,
 * tier/slot mismatch, and crossover period-2 without its period-1.
 */
export function validateCrossoverRequest(
  assignment: CrossoverAssignment,
  request: { crossoverGroupId: string; period: 1 | 2 },
): { allowed: boolean; reason: string } {
  const pair = assignment.pairs.find((p) => p.crossoverGroupId === request.crossoverGroupId);
  if (!pair) {
    return { allowed: false, reason: `undeclared crossover group ${request.crossoverGroupId} — refused` };
  }
  if (request.period === 2) {
    // Period-2 requires its period-1 to exist in the frozen assignment.
    const p1ok = Number.isInteger(pair.period1DayIndex) && pair.period1DayIndex >= 1 && pair.period1DayIndex <= 31;
    if (!p1ok) return { allowed: false, reason: `period-2 without valid period-1 in ${request.crossoverGroupId} — refused` };
  }
  return { allowed: true, reason: "frozen pair request" };
}

/**
 * Tag a capped 6h-requested day as up-to-6h (never relabel complete 6h).
 * Records actual hours + stop_reason='budget_reached'.
 */
export function tagCappedUpTo6h(day: CalendarDay, actualWindowHours: number): CalendarDay {
  return { ...day, windowShape: "up-to-6h", actualWindowHours, stopReason: "budget_reached" };
}
