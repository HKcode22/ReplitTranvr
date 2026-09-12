import type { FrozenTrafficReferenceV39 } from "./trafficReference_v39";

export interface TrafficReferenceFreshnessVerdictV39 {
  pass: boolean;
  failures: string[];
  frameFreezeDateUtc: string;
  referenceEndAgeCalendarDays: number | null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function utcDateStart(date: string): number | null {
  if (!DATE.test(date)) return null;
  const value = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(value) ? value : null;
}

/**
 * Plan §4.1 admission rule evaluated at frame/reference freeze time.
 * The frozen 12-month period must end no later than the freeze date and no more
 * than 30 UTC calendar days earlier. Retrieval must be on/after period end and
 * on/before the freeze date. Calendar-day arithmetic avoids time-of-day
 * ambiguity for source files whose period is date-granular.
 */
export function verifyTrafficReferenceFreshnessV39(
  ref: FrozenTrafficReferenceV39,
  frameFreezeAt: Date,
): TrafficReferenceFreshnessVerdictV39 {
  const failures: string[] = [];
  if (!Number.isFinite(frameFreezeAt.getTime())) failures.push("frame-freeze-time-invalid");
  const freezeDate = Number.isFinite(frameFreezeAt.getTime())
    ? frameFreezeAt.toISOString().slice(0, 10)
    : "INVALID";
  const freezeMs = freezeDate === "INVALID" ? null : utcDateStart(freezeDate);
  const endMs = utcDateStart(ref.reference_period_end);
  const retrievalMs = utcDateStart(ref.traffic_retrieval_date);
  let ageDays: number | null = null;

  if (endMs === null) failures.push("reference-period-end-invalid");
  if (retrievalMs === null) failures.push("traffic-retrieval-date-invalid");
  if (freezeMs !== null && endMs !== null) {
    ageDays = (freezeMs - endMs) / DAY_MS;
    if (ageDays < 0) failures.push(`reference-period-ends-after-freeze:${ageDays}d`);
    if (ageDays > 30) failures.push(`reference-period-too-stale:${ageDays}d`);
  }
  if (retrievalMs !== null && endMs !== null && retrievalMs < endMs) {
    failures.push("traffic-retrieval-before-reference-period-end");
  }
  if (freezeMs !== null && retrievalMs !== null && retrievalMs > freezeMs) {
    failures.push("traffic-retrieval-after-frame-freeze");
  }

  return {
    pass: failures.length === 0,
    failures: [...new Set(failures)].sort(),
    frameFreezeDateUtc: freezeDate,
    referenceEndAgeCalendarDays: ageDays,
  };
}

export function requireTrafficReferenceFreshnessV39(ref: FrozenTrafficReferenceV39, frameFreezeAt: Date): void {
  const verdict = verifyTrafficReferenceFreshnessV39(ref, frameFreezeAt);
  if (!verdict.pass) {
    throw new Error(`TRAFFIC_REFERENCE_FREEZE_WINDOW_INVALID:${verdict.failures.join(",")}`);
  }
}
