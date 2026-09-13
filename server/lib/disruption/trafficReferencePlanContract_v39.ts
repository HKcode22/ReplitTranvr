import type { FrozenTrafficReferenceV39 } from "./trafficReference_v39";
import { verifyTrafficReferenceFreshnessV39 } from "./trafficReferenceFreshness_v39";

export interface TrafficReferencePlanContractVerdictV39 {
  pass: boolean;
  failures: string[];
}

/**
 * V3.9-f.8 Plan §§4.1/4.5 contract for the single reference currently consumed
 * by the frame builder.
 *
 * §4.1 permits a measured traffic source, but §4.5 explicitly requires the
 * degree/carrier/international balancing variables to come from a permitted
 * scheduled-route/schedule reference. Because the current implementation uses
 * one artifact for both roles, that artifact must have scheduled-commercial
 * semantics. A memo/artifact cannot weaken this rule.
 */
export function verifyTrafficReferencePlanContractV39(
  ref: FrozenTrafficReferenceV39,
  frameFreezeAt = new Date(),
): TrafficReferencePlanContractVerdictV39 {
  const failures: string[] = [];
  if (ref.reference_semantics !== "scheduled_commercial_service") {
    failures.push(`balancing-reference-not-scheduled:${ref.reference_semantics ?? "unspecified"}`);
  }
  const freshness = verifyTrafficReferenceFreshnessV39(ref, frameFreezeAt);
  failures.push(...freshness.failures.map((failure) => `freshness:${failure}`));
  return { pass: failures.length === 0, failures: [...new Set(failures)].sort() };
}

export function requireTrafficReferencePlanContractV39(
  ref: FrozenTrafficReferenceV39,
  frameFreezeAt = new Date(),
): void {
  const verdict = verifyTrafficReferencePlanContractV39(ref, frameFreezeAt);
  if (!verdict.pass) {
    throw new Error(`TRAFFIC_REFERENCE_PLAN_CONTRACT_BLOCKED:${verdict.failures.join(",")}`);
  }
}
