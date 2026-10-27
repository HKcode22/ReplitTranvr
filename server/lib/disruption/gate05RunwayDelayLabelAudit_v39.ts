/**
 * Gate 0.5 f.8 §6.3/§7.3 — exact runway departure delay label.
 * No provider I/O, no DB I/O and no fallback to gate-departure proxy.
 * Missing or estimated milestones remain unobserved targets; valid records
 * and different outcome targets are not globally discarded.
 */
export interface VerifiedRunwayMilestoneV39 {
  utc: string | null;
  /** A provider value alone ("Live", revisedTime or runwayTime) is not proof. */
  semanticClass:
    "VERIFIED_ACTUAL_WHEELS_OFF" |
    "VERIFIED_SCHEDULED_WHEELS_OFF" |
    "GENERAL_SCHEDULED_DEPARTURE" |
    "ESTIMATED_RUNWAY" |
    "UNKNOWN";
  /** Independently reviewed evidence reference, not an arbitrary hash alone. */
  externallyAuthenticatedSemantics: boolean;
}
export interface Gate05RunwayDelayInputV39 {
  canonicalOperatingLegVerified: boolean;
  scheduled: VerifiedRunwayMilestoneV39;
  actual: VerifiedRunwayMilestoneV39;
  targetRecoveryGraceElapsed: boolean;
}
export type Gate05RunwayDelayStatusV39 =
  "OBSERVED_EXACT_RUNWAY_DELAY" | "PENDING_TARGET_EVIDENCE" |
  "MISSING_TARGET_EVIDENCE" | "SOURCE_SEMANTICS_UNVERIFIED";
export interface Gate05RunwayDelayAssessmentV39 {
  schema: "v39.gate05.exact-runway-delay-label-review.v1";
  status: Gate05RunwayDelayStatusV39;
  /** Signed number: early runway departure gives a negative delay. */
  runwayDelayMinutes: number | null;
  actualWheelsOffProven: boolean;
  scheduledWheelsOffProven: boolean;
  observedTargetCanBeScored: boolean;
  /** Not a failure of other independent endpoints. */
  otherTargetsUnaffected: true;
  noProviderIO: true;
  noDatabaseIO: true;
}
function utcMillis(value: string | null): number | null {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/.test(value))
    return null;
  const canonical=value.replace(" ","T");
  const ms=Date.parse(canonical);
  if (!Number.isFinite(ms)) return null;
  const parts=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(canonical);
  if (!parts) return null;
  const d=new Date(ms);
  if (d.getUTCFullYear()!==Number(parts[1]) ||
      d.getUTCMonth()+1!==Number(parts[2]) ||
      d.getUTCDate()!==Number(parts[3]) ||
      d.getUTCHours()!==Number(parts[4]) ||
      d.getUTCMinutes()!==Number(parts[5]) ||
      d.getUTCSeconds()!==Number(parts[6]??"0")) return null;
  return ms;
}
export function assessGate05ExactRunwayDelayV39(
  input: Gate05RunwayDelayInputV39
): Gate05RunwayDelayAssessmentV39 {
  if (!input || typeof input.canonicalOperatingLegVerified !== "boolean" ||
      typeof input.targetRecoveryGraceElapsed !== "boolean" ||
      !input.scheduled || !input.actual ||
      typeof input.scheduled.externallyAuthenticatedSemantics !== "boolean" ||
      typeof input.actual.externallyAuthenticatedSemantics !== "boolean")
    throw Error("GATE05_RUNWAY_LABEL_INVALID_INPUT");
  const scheduled=utcMillis(input.scheduled.utc);
  const actual=utcMillis(input.actual.utc);
  const scheduledVerified=scheduled!==null &&
    input.scheduled.semanticClass==="VERIFIED_SCHEDULED_WHEELS_OFF" &&
    input.scheduled.externallyAuthenticatedSemantics;
  const actualVerified=actual!==null &&
    input.actual.semanticClass==="VERIFIED_ACTUAL_WHEELS_OFF" &&
    input.actual.externallyAuthenticatedSemantics;
  const observed=input.canonicalOperatingLegVerified &&
    scheduledVerified && actualVerified;
  const uncertainty=Boolean(
    !input.canonicalOperatingLegVerified ||
    (input.scheduled.utc !== null && !scheduledVerified) ||
    (input.actual.utc !== null && !actualVerified)
  );
  const status:Gate05RunwayDelayStatusV39=observed
    ? "OBSERVED_EXACT_RUNWAY_DELAY"
    : uncertainty ? "SOURCE_SEMANTICS_UNVERIFIED"
    : input.targetRecoveryGraceElapsed ? "MISSING_TARGET_EVIDENCE"
    : "PENDING_TARGET_EVIDENCE";
  return {
    schema:"v39.gate05.exact-runway-delay-label-review.v1",
    status,
    runwayDelayMinutes:observed ? (actual!-scheduled!)/60_000 : null,
    actualWheelsOffProven:actualVerified,
    scheduledWheelsOffProven:scheduledVerified,
    observedTargetCanBeScored:observed,
    otherTargetsUnaffected:true,
    noProviderIO:true,noDatabaseIO:true,
  };
}
