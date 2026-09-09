/**
 * Timestamp taxonomy — V3.9-f.8 cutoff-safety owner.
 *
 * Binding authority: SEPmd/V3.9_DataCollectPlan_f.8.md §§6.1, 6.3-6.6, 7,
 * 12.2, 14. Unknown information availability is never deployably eligible.
 */

export interface TimestampTaxonomy {
  scheduledGateOutUtc: Date | null;
  scheduledWheelsOffUtc: Date | null;
  revisedGateOutUtc: Date | null;
  predictedGateOutUtc: Date | null;
  actualGateOutUtc: Date | null;
  actualWheelsOffUtc: Date | null;
  scheduledGateInUtc: Date | null;
  scheduledWheelsOnUtc: Date | null;
  actualGateInUtc: Date | null;
  actualWheelsOnUtc: Date | null;
  locReportedUtc: Date | null;
  lastUpdatedUtc: Date | null;
  receivedAtUtc: Date;
  availableAt: Date | null;
  providerPublishedUtc: Date | null;
}

/**
 * Provider-native fields → project milestone aliases. Actual OOOI/runway
 * semantics remain UNVERIFIED until Gate 0.5 and therefore are not copied into
 * actual_* aliases pre-Gate-0.5.
 */
export const PROVIDER_TO_FAA_MAPPING: Record<string, { target: string; verified: boolean }> = {
  "departure.scheduledTime.utc": { target: "scheduled_gate_out_utc", verified: true },
  "departure.revisedTime.utc": { target: "revised_gate_out_utc", verified: true },
  "departure.predictedTime.utc": { target: "predicted_gate_out_utc", verified: true },
  "departure.runwayTime.utc": { target: "actual_gate_out_utc", verified: false },
  "arrival.scheduledTime.utc": { target: "scheduled_gate_in_utc", verified: true },
  "arrival.revisedTime.utc": { target: "revised_gate_in_utc", verified: true },
  "arrival.predictedTime.utc": { target: "predicted_gate_in_utc", verified: true },
  "arrival.runwayTime.utc": { target: "actual_wheels_on_utc", verified: false },
};

/** Unknown availability is never equivalent to available-before-cutoff. */
export function isAvailableAtCutoff(availableAt: Date | null, cutoffUtc: Date): boolean {
  if (availableAt === null) return false;
  const a = availableAt.getTime();
  const c = cutoffUtc.getTime();
  return Number.isFinite(a) && Number.isFinite(c) && a <= c;
}

/**
 * Generic bitemporal feature eligibility. The feature must have both a known
 * information-availability clock and a known validity start. valid_to may be
 * null to mean still valid. Missing optional features are represented by a
 * missing value/flag at the snapshot layer, NOT by calling an unknown feature
 * "eligible" here.
 */
export function isFeatureEligible(
  informationAvailableAt: Date | null,
  validFrom: Date | null,
  validTo: Date | null,
  cutoffUtc: Date,
): boolean {
  if (informationAvailableAt === null || validFrom === null) return false;
  const info = informationAvailableAt.getTime();
  const from = validFrom.getTime();
  const cutoff = cutoffUtc.getTime();
  if (![info, from, cutoff].every(Number.isFinite)) return false;
  if (info > cutoff || from > cutoff) return false;
  if (validTo !== null) {
    const to = validTo.getTime();
    if (!Number.isFinite(to) || to <= cutoff) return false;
  }
  return true;
}

export function buildSnapshotTimestamps(
  flight: {
    depScheduledUtc?: Date | null;
    depRevisedUtc?: Date | null;
    depRunwayUtc?: Date | null;
    arrScheduledUtc?: Date | null;
    arrRevisedUtc?: Date | null;
    arrRunwayUtc?: Date | null;
    locReportedUtc?: Date | null;
    lastUpdatedUtc?: Date | null;
  },
  receivedAtUtc: Date,
): TimestampTaxonomy {
  return {
    scheduledGateOutUtc: flight.depScheduledUtc ?? null,
    scheduledWheelsOffUtc: null,
    revisedGateOutUtc: flight.depRevisedUtc ?? null,
    predictedGateOutUtc: null,
    actualGateOutUtc: null,
    actualWheelsOffUtc: null,
    scheduledGateInUtc: flight.arrScheduledUtc ?? null,
    scheduledWheelsOnUtc: null,
    actualGateInUtc: null,
    actualWheelsOnUtc: null,
    locReportedUtc: flight.locReportedUtc ?? null,
    lastUpdatedUtc: flight.lastUpdatedUtc ?? null,
    receivedAtUtc,
    availableAt: null,
    providerPublishedUtc: flight.lastUpdatedUtc ?? null,
  };
}
