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
/** Binding V3.9-f.8 §4.1 continuous/monthly source maximum. */
export const V39_BINDING_TRAFFIC_REFERENCE_MAX_AGE_DAYS = 30;
/** Binding V3.9-f.8 §4.1 latest-complete-quarter source maximum. */
export const V39_BINDING_QUARTERLY_REFERENCE_MAX_AGE_DAYS = 92;

function utcDateStart(date: string): number | null {
  if (!DATE.test(date)) return null;
  const value = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(value) ? value : null;
}

function isLatestCompleteQuarterReference(ref: FrozenTrafficReferenceV39): boolean {
  if (ref.reference_semantics !== "observed_commercial_movements") return false;
  const basis = String(ref.reference_freshness_basis ?? "").toLowerCase();
  return basis.includes("latest complete four-quarter") || basis.includes("latest-complete-quarter");
}

/**
 * Binding amended V3.9-f.8 Plan §4.1 admission rule evaluated at reference/
 * frame freeze time.
 *
 * Continuous/monthly references remain capped at 30 UTC calendar days. An
 * explicitly observed, quarterly-published source frozen under the
 * latest-complete-four-quarter rule may declare a cap no larger than 92 days.
 * An artifact may be stricter than its Plan class, but may never relax it.
 */
export function verifyTrafficReferenceFreshnessV39(
  ref: FrozenTrafficReferenceV39,
  frameFreezeAt: Date,
): TrafficReferenceFreshnessVerdictV39 {
  const failures: string[] = [];
  const declaredMaxAge = ref.reference_max_age_days;
  const quarterly = isLatestCompleteQuarterReference(ref);
  const planClassMax = quarterly
    ? V39_BINDING_QUARTERLY_REFERENCE_MAX_AGE_DAYS
    : V39_BINDING_TRAFFIC_REFERENCE_MAX_AGE_DAYS;

  if (ref.reference_semantics === "observed_commercial_movements" && !quarterly && declaredMaxAge !== undefined && declaredMaxAge > V39_BINDING_TRAFFIC_REFERENCE_MAX_AGE_DAYS) {
    failures.push("observed-reference-quarterly-basis-required-for-age-over-30d");
  }
  if (declaredMaxAge !== undefined && (!Number.isInteger(declaredMaxAge) || declaredMaxAge < 1)) {
    failures.push("reference-max-age-days-invalid");
  }
  if (declaredMaxAge !== undefined && declaredMaxAge > planClassMax) {
    failures.push(`reference-artifact-attempts-plan-relaxation:${declaredMaxAge}d>${planClassMax}d`);
  }
  if (declaredMaxAge !== undefined && !String(ref.reference_freshness_basis ?? "").trim()) {
    failures.push("reference-freshness-basis-missing");
  }
  const allowedMaxAgeDays = Math.min(
    planClassMax,
    Number.isInteger(declaredMaxAge) && (declaredMaxAge as number) > 0
      ? (declaredMaxAge as number)
      : planClassMax,
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
