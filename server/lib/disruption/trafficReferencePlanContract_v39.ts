import type { FrozenTrafficReferenceV39 } from "./trafficReference_v39";
import { verifyTrafficReferenceFreshnessV39 } from "./trafficReferenceFreshness_v39";

export interface TrafficReferencePlanContractVerdictV39 {
  pass: boolean;
  failures: string[];
}

/**
 * Amended V3.9-f.8 Plan §§4.1/4.5 contract for the single exogenous reference
 * consumed by the frame builder.
 *
 * The binding Plan now permits either published scheduled commercial service
 * or an explicitly labeled observed commercial-movement/network reference.
 * The observed path remains a sampling/balancing proxy only; it may never be
 * relabeled as a published schedule or as the Phase-6 FIDS population.
 */
export function verifyTrafficReferencePlanContractV39(
  ref: FrozenTrafficReferenceV39,
  frameFreezeAt = new Date(),
): TrafficReferencePlanContractVerdictV39 {
  const failures: string[] = [];

  if (ref.reference_semantics === "scheduled_commercial_service") {
    // Scheduled path keeps the original §4.1/§4.5 meaning.
  } else if (ref.reference_semantics === "observed_commercial_movements") {
    if (ref.traffic_metric_name !== "observed_commercial_movements") {
      failures.push(`observed-reference-metric-mismatch:${ref.traffic_metric_name}`);
    }
    if (!String(ref.traffic_metric_units ?? "").toLowerCase().includes("observed")) {
      failures.push("observed-reference-units-not-explicitly-observed");
    }
    const tierRule = String(ref.tier_cut_rule ?? "");
    if (!tierRule.includes("route_degree_threshold=observed_resolved_movements>=53_over_365d")) {
      failures.push("observed-reference-route-threshold-not-frozen");
    }
    if (!String(ref.license_access_basis ?? "").trim()) failures.push("observed-reference-license-basis-missing");
  } else {
    failures.push(`reference-semantics-not-frozen:${ref.reference_semantics ?? "unspecified"}`);
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
