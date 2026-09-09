/**
 * PRE snapshot builder — Phase 0F (§1.5.6).
 *
 * Plan coverage: §§5.2, 6.0–6.1, 6.3–6.5, 7.3–7.4, 12–13.
 *
 * Builds PRE_DEPARTURE snapshots for the frozen horizons T−24h / T−6h / T−90m
 * from the selected-T milestone (Gate 0.5 verifies provider-native semantics;
 * until then T is BLOCKED and horizons refuse rather than fabricate).
 *
 * Binding rules implemented here (§1.5.6):
 *  - snapshot_exists = population_member_at_cutoff AND horizon_eligible
 *    (webhook capture and optional feature completeness are NOT prerequisites);
 *  - each feature enters only when information_available_timestamp ≤
 *    prediction_cutoff_utc, else NULL + missingness flag (future-dated feature
 *    fails the snapshot, never leaks in);
 *  - later population observations never backfill earlier cutoffs;
 *  - T unavailable → horizon BLOCKED, never fabricated;
 *  - selected T is immutable per physical flight (first observed verified value).
 *
 * Pure offline logic (no DB calls): persistence lives with the caller.
 * Builder version is stamped into provenance for replay/hash checks.
 */

export const PRE_SNAPSHOT_BUILDER_VERSION = "preSnapshotBuilder_v3@1.0.0";

export const PRE_HORIZONS = ["T-24h", "T-6h", "T-90m"] as const;
export type PreHorizon = (typeof PRE_HORIZONS)[number];

export const PRE_PREDICTION_STATE = "PRE_DEPARTURE" as const;

/** One cutoff-safe feature input. */
export interface PreFeatureInput {
  featureName: string;
  value: unknown;
  /** When this feature value became available to the system. */
  informationAvailableAt: Date | null;
  source: string | null;
  sourceVersion: string | null;
}

/** Resolved feature output: value or NULL + missingness flag. */
export interface PreFeatureOutput {
  featureName: string;
  value: unknown;
  missing: boolean;
  missingReason: "available_after_cutoff" | "no_available_timestamp" | null;
}

/** Population observation input (append-only membership row). */
export interface PrePopulationInput {
  flightInstanceId: string;
  populationQueryId: string | null;
  /** Was this flight a population member at the prediction cutoff? */
  populationMemberAtCutoff: boolean;
  /** Is the flight eligible for this horizon? */
  horizonEligible: boolean;
  horizon: PreHorizon;
  /** First observed verified selected-T milestone (immutable per flight). */
  selectedTMilestoneUtc: Date | null;
  selectedTVersion: string | null;
  predictionCutoffUtc: Date;
  features: PreFeatureInput[];
  frameHash: string | null;
  configHash: string | null;
  fidsResponseHash: string | null;
  scheduleVersion: string | null;
}

export interface PreSnapshot {
  flightInstanceId: string;
  predictionState: typeof PRE_PREDICTION_STATE;
  horizon: PreHorizon;
  predictionCutoffUtc: Date;
  selectedTMilestoneUtc: Date;
  selectedTVersion: string | null;
  populationQueryId: string | null;
  features: PreFeatureOutput[];
  provenance: {
    builderVersion: string;
    populationQueryId: string | null;
    fidsResponseHash: string | null;
    scheduleVersion: string | null;
    frameHash: string | null;
    configHash: string | null;
    missingnessFlags: Record<string, string | null>;
  };
}

export type PreSnapshotOutcome =
  | { status: "snapshot"; snapshot: PreSnapshot }
  | { status: "blocked"; reason: "not_population_member" | "not_horizon_eligible" | "t_unavailable" };

/**
 * Population-defined existence (§1.5.6): a snapshot exists iff the flight is a
 * population member at cutoff AND horizon-eligible. Webhook capture and feature
 * completeness are explicitly NOT prerequisites.
 */
export function snapshotExists(populationMemberAtCutoff: boolean, horizonEligible: boolean): boolean {
  return populationMemberAtCutoff && horizonEligible;
}

/**
 * Cutoff-safe feature selection (§1.5.6): a feature enters only when its
 * information availability timestamp is ≤ the prediction cutoff.
 */
export function selectFeatureValue(
  feature: PreFeatureInput,
  cutoffUtc: Date,
): PreFeatureOutput {
  const base = { featureName: feature.featureName };
  if (!feature.informationAvailableAt) {
    return { ...base, value: null, missing: true, missingReason: "no_available_timestamp" };
  }
  if (feature.informationAvailableAt.getTime() > cutoffUtc.getTime()) {
    return { ...base, value: null, missing: true, missingReason: "available_after_cutoff" };
  }
  return { ...base, value: feature.value, missing: false, missingReason: null };
}

/**
 * Build one PRE snapshot, or refuse with an explicit blocked reason.
 * Never fabricates T; never backfills from later observations (the caller must
 * pass the latest observation with available_at ≤ cutoff).
 */
export function buildPreSnapshot(input: PrePopulationInput): PreSnapshotOutcome {
  if (!input.populationMemberAtCutoff) {
    return { status: "blocked", reason: "not_population_member" };
  }
  if (!input.horizonEligible) {
    return { status: "blocked", reason: "not_horizon_eligible" };
  }
  if (!input.selectedTMilestoneUtc) {
    // T unavailable → horizon BLOCKED, never fabricated (§1.5.6).
    return { status: "blocked", reason: "t_unavailable" };
  }

  const features = input.features.map((f) => selectFeatureValue(f, input.predictionCutoffUtc));
  const missingnessFlags: Record<string, string | null> = {};
  for (const f of features) {
    missingnessFlags[f.featureName] = f.missing ? (f.missingReason ?? "missing") : null;
  }

  return {
    status: "snapshot",
    snapshot: {
      flightInstanceId: input.flightInstanceId,
      predictionState: PRE_PREDICTION_STATE,
      horizon: input.horizon,
      predictionCutoffUtc: input.predictionCutoffUtc,
      selectedTMilestoneUtc: input.selectedTMilestoneUtc,
      selectedTVersion: input.selectedTVersion,
      populationQueryId: input.populationQueryId,
      features,
      provenance: {
        builderVersion: PRE_SNAPSHOT_BUILDER_VERSION,
        populationQueryId: input.populationQueryId,
        fidsResponseHash: input.fidsResponseHash,
        scheduleVersion: input.scheduleVersion,
        frameHash: input.frameHash,
        configHash: input.configHash,
        missingnessFlags,
      },
    },
  };
}
