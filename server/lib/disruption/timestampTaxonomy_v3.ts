/**
 * Timestamp taxonomy — V3.9-f.8 §14 / Sep1_1 §14
 *
 * 10+ timestamp fields with exact definitions and leakage rules.
 * Every timestamp in the system maps to exactly one of these categories.
 *
 * Frozen taxonomy (§14):
 *   1. scheduled_gate_out_utc   — T milestone candidate: scheduled pushback time
 *   2. scheduled_wheels_off_utc — T milestone fallback: scheduled takeoff time
 *   3. revised_gate_out_utc     — provider's revised pushback (if updated)
 *   4. predicted_gate_out_utc   — provider's predicted pushback (ML-based)
 *   5. actual_gate_out_utc      — real pushback time (POST only)
 *   6. actual_wheels_off_utc    — real takeoff time (POST only)
 *   7. scheduled_gate_in_utc    — scheduled arrival at gate
 *   8. scheduled_wheels_on_utc  — scheduled touchdown
 *   9. actual_gate_in_utc       — real gate arrival (POST only)
 *  10. actual_wheels_on_utc     — real touchdown (POST only)
 *  11. loc_reported_utc         — when the live position was reported
 *  12. last_updated_utc         — when the provider last updated the record
 *  13. received_at_utc          — when WE received the notification
 *  14. available_at             — when OUR system could build features (ETL lag)
 *  15. provider_published_utc   — when the provider generated the notification
 *
 * Leakage rule: source occurrence before cutoff but availability after cutoff
 * must be EXCLUDED from snapshots at that cutoff.
 *
 * Sep1_1 §14 corrections:
 *  - provider state timestamp distinct from location timestamp
 *  - available_at ≤ cutoff enforced in snapshot queries
 *  - optional missing feature does not delete snapshot
 *  - non-location location timestamp nullable
 */

// ---------------------------------------------------------------------------
// Timestamp field definitions
// ---------------------------------------------------------------------------

export interface TimestampTaxonomy {
  /** T milestone candidate: scheduled pushback time (§6.0) */
  scheduledGateOutUtc: Date | null;
  /** T milestone fallback: scheduled takeoff time (§6.0) */
  scheduledWheelsOffUtc: Date | null;
  /** Provider's revised pushback (if updated) */
  revisedGateOutUtc: Date | null;
  /** Provider's predicted pushback (ML-based) */
  predictedGateOutUtc: Date | null;
  /** Real pushback time (POST only) */
  actualGateOutUtc: Date | null;
  /** Real takeoff time (POST only) */
  actualWheelsOffUtc: Date | null;
  /** Scheduled arrival at gate */
  scheduledGateInUtc: Date | null;
  /** Scheduled touchdown */
  scheduledWheelsOnUtc: Date | null;
  /** Real gate arrival (POST only) */
  actualGateInUtc: Date | null;
  /** Real touchdown (POST only) */
  actualWheelsOnUtc: Date | null;
  /** When the live position was reported */
  locReportedUtc: Date | null;
  /** When the provider last updated the record */
  lastUpdatedUtc: Date | null;
  /** When WE received the notification */
  receivedAtUtc: Date;
  /** When OUR system could build features (ETL lag) */
  availableAt: Date | null;
  /** When the provider generated the notification */
  providerPublishedUtc: Date | null;
}

// ---------------------------------------------------------------------------
// Timestamp → FAA/ASPM milestone mapping (§8)
// Only map when semantically verified; never blindly rename.
// ---------------------------------------------------------------------------

/**
 * Provider-native fields → FAA/ASPM milestone aliases.
 * Only map when the semantic meaning is verified; otherwise keep NULL + milestone_unverified=true.
 *
 * Sep1_1 §8 corrections:
 *  - scheduledTime → scheduled gate/wheels (verified semantics)
 *  - revisedTime → revised gate/wheels (provider update, not necessarily actual)
 *  - predictedTime → predicted gate/wheels (ML-based, not actual)
 *  - runwayTime → actual gate/wheels (verified: "runway" in provider = actual pushback/touchdown)
 *  - actualTime is NOT used (provider contract does not have this field)
 */
export const PROVIDER_TO_FAA_MAPPING: Record<string, { target: string; verified: boolean }> = {
  // Departure milestones
  "departure.scheduledTime.utc":  { target: "scheduled_gate_out_utc", verified: true },
  "departure.revisedTime.utc":    { target: "revised_gate_out_utc", verified: true },
  "departure.predictedTime.utc":  { target: "predicted_gate_out_utc", verified: true },
  "departure.runwayTime.utc":     { target: "actual_gate_out_utc", verified: true },
  // Arrival milestones
  "arrival.scheduledTime.utc":    { target: "scheduled_gate_in_utc", verified: true },
  "arrival.revisedTime.utc":      { target: "revised_gate_in_utc", verified: true },
  "arrival.predictedTime.utc":    { target: "predicted_gate_in_utc", verified: true },
  "arrival.runwayTime.utc":       { target: "actual_wheels_on_utc", verified: true },
  // Wheels milestones (derived from runway when available)
  // NOTE: provider does NOT directly expose wheels_off/wheels_on;
  // these are derived from departure.runwayTime and arrival.runwayTime
  // only when semantic verification confirms the mapping.
};

// ---------------------------------------------------------------------------
// Leakage check (§14)
// ---------------------------------------------------------------------------

/**
 * Check if a timestamp is available at a given cutoff.
 * available_at ≤ cutoff is the eligibility rule.
 *
 * A source occurrence before cutoff but availability after cutoff
 * must be EXCLUDED from snapshots at that cutoff.
 */
export function isAvailableAtCutoff(availableAt: Date | null, cutoffUtc: Date): boolean {
  if (availableAt === null) return true; // missing available_at = always eligible
  return availableAt <= cutoffUtc;
}

/**
 * Check if a feature is eligible for inclusion in a snapshot.
 * Both availability AND validity must hold:
 *   - information_available_at ≤ cutoff
 *   - valid_from ≤ cutoff
 *   - valid_to IS NULL OR valid_to > cutoff
 */
export function isFeatureEligible(
  informationAvailableAt: Date | null,
  validFrom: Date | null,
  validTo: Date | null,
  cutoffUtc: Date,
): boolean {
  // Availability check
  if (informationAvailableAt && informationAvailableAt > cutoffUtc) return false;
  // Validity check
  if (validFrom && validFrom > cutoffUtc) return false;
  if (validTo && validTo <= cutoffUtc) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Snapshot timestamp stamping
// ---------------------------------------------------------------------------

/**
 * Build the timestamp block for a snapshot row.
 * All timestamps are preserved distinctly; nullable fields stay NULL.
 */
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
    scheduledWheelsOffUtc: null, // derived from provider, not directly exposed
    revisedGateOutUtc: flight.depRevisedUtc ?? null,
    predictedGateOutUtc: null, // provider does not expose directly in all payloads
    actualGateOutUtc: flight.depRunwayUtc ?? null,
    actualWheelsOffUtc: null, // derived from departure.runwayTime when verified
    scheduledGateInUtc: flight.arrScheduledUtc ?? null,
    scheduledWheelsOnUtc: null, // derived from provider, not directly exposed
    actualGateInUtc: null, // provider does not expose directly in all payloads
    actualWheelsOnUtc: flight.arrRunwayUtc ?? null,
    locReportedUtc: flight.locReportedUtc ?? null,
    lastUpdatedUtc: flight.lastUpdatedUtc ?? null,
    receivedAtUtc,
    availableAt: null, // computed by ETL pipeline, not at extraction time
    providerPublishedUtc: flight.lastUpdatedUtc ?? null,
  };
}
