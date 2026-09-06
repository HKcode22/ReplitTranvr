/**
 * Calendar solver CLI (plan §8.7, §17 step 23) — offline, no provider calls.
 *
 * Generates the 31-batch-day calendar with the plan-frozen shape totals:
 *   26 × 4h + 3 × 2×2h + 2 × up-to-6h = 31
 * then runs the SAT validator and prints the calendar hash.
 *
 * If the constraints are infeasible it prints the UNSAT reason and exits 1.
 *
 * Usage: npx tsx scripts/calendar_solve.ts [startDate YYYY-MM-DD]
 */

import {
  generateExperimentCalendar,
  validateCalendar,
  type CalendarConstraints,
} from "../server/lib/disruption/experimentCalendar_v3";
import { createHash } from "crypto";

const SIX_UTC_SLOTS = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"];

const PLAN_CONSTRAINTS: CalendarConstraints = {
  totalDays: 31,
  windowShapes: [
    { shape: "4h", count: 26 },
    { shape: "2x2h", count: 3 },
    { shape: "up-to-6h", count: 2 },
  ],
  sixUtcSlots: SIX_UTC_SLOTS,
  washoutHours: 24,
  crossoverPairs: [],
  weekdayWeekendMatching: false,
  timeClassMatching: false,
  seed: "plan-calendar-seed",
};

function main(): void {
  const startDate = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  console.log(`\nCALENDAR SOLVE (plan §8.7: 26×4h + 3×2×2h + 2×up-to-6h)`);
  console.log(`start_date: ${startDate}`);
  console.log(`generated_at_utc: ${new Date().toISOString()}\n`);

  const result = generateExperimentCalendar(PLAN_CONSTRAINTS, startDate);
  if (!result.feasible) {
    console.error(`UNSAT: ${result.unsatReason ?? "infeasible"}`);
    process.exit(1);
  }

  const sat = validateCalendar(result, PLAN_CONSTRAINTS);
  if (!sat.sat) {
    console.error(`SAT VALIDATION FAILED:`);
    for (const v of sat.violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  // Print the shape distribution
  const shapeCounts: Record<string, number> = {};
  for (const d of result.days) shapeCounts[d.windowShape] = (shapeCounts[d.windowShape] ?? 0) + 1;

  console.log("SAT: PASS");
  console.log(`calendar_hash: ${result.calendarHash}`);
  console.log(`total_segments: ${result.totalSegments}`);
  console.log(`total_gap_segments: ${result.totalGapSegments}`);
  console.log(`shape_counts: ${JSON.stringify(shapeCounts)}`);
  console.log(`\nFirst 5 batch-days:`);
  for (const d of result.days.slice(0, 5)) {
    const segs = d.segments.map(s => `${s.startUtc}-${s.endUtc}${s.isGap ? "(gap)" : ""}`).join(" ");
    console.log(`  day ${d.dayIndex} ${d.date} ${d.windowShape} [${segs}]`);
  }
  console.log(`\n... ${result.days.length - 5} more batch-days (see calendar_hash for full evidence).\n`);

  // Stable artifact hash (independent of the calendar hash) for evidence records
  const artifact = JSON.stringify({ startDate, calendarHash: result.calendarHash, shapeCounts });
  console.log(`artifact_sha256: ${createHash("sha256").update(artifact).digest("hex")}\n`);
}

main();