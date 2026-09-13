import type { FrozenTrafficReferenceV39 } from "./trafficReference_v39";

export interface TrafficReferenceFreshnessVerdictV39 {
  pass: boolean;
  failures: string[];
  frameFreezeDateUtc: string;
  referenceEndAgeCalendarDays: number | null;
  allowedMaxAgeDays: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
/** Binding V3.9-f.8 Plan §4.1 maximum; artifacts may not relax it. */
export const V39_BINDING_TRAFFIC_REFERENCE_MAX_AGE_DAYS = 30;

function utcDateStart(date: string): number | null {
  if (!DATE.test(date)) return null;
  const value = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(value) ? value : null;
}

/**
 * Binding Plan §4.1 admission rule evaluated at frame/reference freeze time.
 *
 * The evidence artifact is subordinate to the Plan. A source-specific
 * `reference_max_age_days` may be stricter than the Plan, but may never relax
 * the Plan's 30-day maximum. Any methodology change must first be made in the
 * binding Plan and then propagated to code/tests as a separately reviewed
 * change; an evidence memo or generated artifact cannot supersede it.
 */
export function verifyTrafficReferenceFreshnessV39(
  ref: FrozenTrafficReferenceV39,
  frameFreezeAt: Date,
): TrafficReferenceFreshnessVerdictV39 {
  const failures: string[] = [];
  const declaredMaxAge = ref.reference_max_age_days;
  if (declaredMaxAge !== undefined && (!Number.isInteger(declaredMaxAge) || declaredMaxAge < 1)) {
    failures.push("reference-max-age-days-invalid");
  }
  if (declaredMaxAge !== undefined && declaredMaxAge > V39_BINDING_TRAFFIC_REFERENCE_MAX_AGE_DAYS) {
    failures.push(`reference-artifact-attempts-plan-relaxation:${declaredMaxAge}d>${V39_BINDING_TRAFFIC_REFERENCE_MAX_AGE_DAYS}d`);
  }
  if (declaredMaxAge !== undefined && !String(ref.reference_freshness_basis ?? "").trim()) {
    failures.push("reference-freshness-basis-missing");
  }
  const allowedMaxAgeDays = Math.min(
    V39_BINDING_TRAFFIC_REFERENCE_MAX_AGE_DAYS,
    Number.isInteger(declaredMaxAge) && (declaredMaxAge as number) > 0
      ? (declaredMaxAge as number)
      : V39_BINDING_TRAFFIC_REFERENCE_MAX_AGE_DAYS,
  );

  if (!Number.isFinite(frameFreezeAt.getTime())) failures.push("frame-freeze-time-invalid");
  const freezeDate = Number.isFinite(frameFreezeAt.getTime()) ? frameFreezeAt.toISOString().slice(0, 10) : "INVALID";
  const freezeMs = freezeDate === "INVALID" ? null : utcDateStart(freezeDate);
  const endMs = utcDateStart(ref.reference_period_end);
  const retrievalMs = utcDateStart(ref.traffic_retrieval_date);
  let ageDays: number | null = null;

  if (endMs === null) failures.push("reference-period-end-invalid");
  if (retrievalMs === null) failures.push("traffic-retrieval-date-invalid");
  if (freezeMs !== null && endMs !== null) {
    ageDays = (freezeMs - endMs) / DAY_MS;
    if (ageDays < 0) failures.push(`reference-period-ends-after-freeze:${ageDays}d`);
    if (ageDays > allowedMaxAgeDays) {
      failures.push(`reference-period-too-stale:${ageDays}d>max${allowedMaxAgeDays}d`);
    }
  }
  if (retrievalMs !== null && endMs !== null && retrievalMs < endMs) failures.push("traffic-retrieval-before-reference-period-end");
  if (freezeMs !== null && retrievalMs !== null && retrievalMs > freezeMs) failures.push("traffic-retrieval-after-frame-freeze");

  return {
    pass: failures.length === 0,
    failures: [...new Set(failures)].sort(),
    frameFreezeDateUtc: freezeDate,
    referenceEndAgeCalendarDays: ageDays,
    allowedMaxAgeDays,
  };
}

export function requireTrafficReferenceFreshnessV39(ref: FrozenTrafficReferenceV39, frameFreezeAt: Date): void {
  const verdict = verifyTrafficReferenceFreshnessV39(ref, frameFreezeAt);
  if (!verdict.pass) throw new Error(`TRAFFIC_REFERENCE_FREEZE_WINDOW_INVALID:${verdict.failures.join(",")}`);
}
