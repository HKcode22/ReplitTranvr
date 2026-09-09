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

// ---------------------------------------------------------------------------
// Persistence (§1.5.6): append PRE rows to clean.flight_snapshots.
// ON CONFLICT (flight_instance_id, horizon, prediction_cutoff_utc) DO NOTHING:
// repeated builds never overwrite. Returns inserted count. Never throws.
// ---------------------------------------------------------------------------

export async function persistPreSnapshot(
  pool: { query: (text: string, params: unknown[]) => Promise<{ rowCount: number | null }> },
  snapshot: PreSnapshot,
): Promise<number> {
  try {
    const res = await pool.query(
      `INSERT INTO clean.flight_snapshots
         (flight_instance_id, prediction_state, horizon, prediction_cutoff_utc,
          selected_t_milestone_utc, selected_t_version, population_query_id,
          fids_response_hash, schedule_version, frame_hash, config_hash,
          features_json, missingness_flags, builder_version, provenance_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15::jsonb)
       ON CONFLICT (flight_instance_id, horizon, prediction_cutoff_utc) DO NOTHING`,
      [
        snapshot.flightInstanceId,
        snapshot.predictionState,
        snapshot.horizon,
        snapshot.predictionCutoffUtc,
        snapshot.selectedTMilestoneUtc,
        snapshot.selectedTVersion,
        snapshot.populationQueryId,
        snapshot.provenance.fidsResponseHash,
        snapshot.provenance.scheduleVersion,
        snapshot.provenance.frameHash,
        snapshot.provenance.configHash,
        JSON.stringify(snapshot.features.map((f) => ({ name: f.featureName, value: f.value }))),
        JSON.stringify(snapshot.provenance.missingnessFlags),
        snapshot.provenance.builderVersion,
        JSON.stringify(snapshot.provenance),
      ],
    );
    return res.rowCount ?? 0;
  } catch (err: any) {
    console.error(`[pre-snapshot] persist failed (${snapshot.flightInstanceId}/${snapshot.horizon}):`, err?.message || err);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Production materializer (§1.5.6 / ChatGPT round-2 item 9): population → PRE.
// Reads the immutable flight_population rows for one prediction cutoff and
// appends one PRE snapshot per (flight, eligible horizon). This is the
// production owner that completes the chain
//   FIDS → query/response provenance → flight_population → PRE snapshots.
// Invocation point is Phase-6 collection (cutoff horizons fire during the
// run, per Plan §15 S3); Phase 0 delivers the owner + tests, never a live run.
//
// Mapping honesty rules:
// - Only requested_airport_primary rows (departures) materialize; opposite-
//   movement context rows are tallied blocked, never snapshotted as PRE.
// - Horizon eligibility: (dep_scheduled_utc − cutoff) ≥ horizon offset.
// - T milestone = provider-native dep_scheduled_utc (correct semantic class;
//   Gate 0.5 verifies milestone semantics). NULL schedule → BLOCKED.
// - Features: none attached in Phase 0 (history/weather providers run in
//   Phase 6 with information_available_at ≤ cutoff). Snapshots record
//   existence + provenance; feature completeness is NOT a prerequisite.
// - Caller contract: compare inserted vs built; a shortfall outside known
//   idempotent re-runs must pause downstream (fail-closed at the caller).
// ---------------------------------------------------------------------------

export const PRE_HORIZON_OFFSET_MIN: Record<PreHorizon, number> = {
  "T-24h": 24 * 60,
  "T-6h": 6 * 60,
  "T-90m": 90,
};

export interface PreMaterializeInput {
  cutoffUtc: Date;
  batchId: string | null;
  horizons?: readonly PreHorizon[];
  frameHash: string | null;
  configHash: string | null;
}

export interface PreMaterializeResult {
  cutoffUtc: string;
  populationRows: number;
  built: number;
  blocked: Record<string, number>;
  inserted: number;
}

type QueryPool = {
  query: (text: string, params: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>;
};

export function horizonEligibleForCutoff(
  depScheduledUtc: Date | null,
  cutoffUtc: Date,
  horizon: PreHorizon,
): boolean {
  if (!depScheduledUtc || !Number.isFinite(depScheduledUtc.getTime())) return false;
  return depScheduledUtc.getTime() - cutoffUtc.getTime() >= PRE_HORIZON_OFFSET_MIN[horizon] * 60_000;
}

export async function materializePreSnapshotsForCutoff(
  pool: QueryPool,
  input: PreMaterializeInput,
): Promise<PreMaterializeResult> {
  const horizons = input.horizons ?? PRE_HORIZONS;
  // SELECT failure throws (fail-closed): no partial materialization silently.
  const res = await pool.query(
    `SELECT analytic_identity_id, dep_scheduled_utc, population_query_id,
            response_hash, population_role, scope_classification
       FROM clean.flight_population
      WHERE cutoff_utc = $1 AND source_type = 'fids'`,
    [input.cutoffUtc],
  );
  const blocked: Record<string, number> = {};
  const tally = (reason: string): void => {
    blocked[reason] = (blocked[reason] ?? 0) + 1;
  };
  let built = 0;
  let inserted = 0;
  for (const row of res.rows) {
    if (row.population_role !== "requested_airport_primary") {
      tally("not_primary_role");
      continue;
    }
    const depScheduled: Date | null = row.dep_scheduled_utc ? new Date(row.dep_scheduled_utc) : null;
    for (const horizon of horizons) {
      const outcome = buildPreSnapshot({
        flightInstanceId: String(row.analytic_identity_id),
        populationQueryId: row.population_query_id ?? null,
        populationMemberAtCutoff: true,
        horizonEligible: horizonEligibleForCutoff(depScheduled, input.cutoffUtc, horizon),
        horizon,
        // Provider-native scheduled departure; NULL → builder BLOCKED (t_unavailable).
        selectedTMilestoneUtc: depScheduled,
        selectedTVersion: depScheduled ? "scheduled_gate_out:provider-native (milestone semantics pending Gate 0.5)" : null,
        predictionCutoffUtc: input.cutoffUtc,
        features: [],
        frameHash: input.frameHash,
        configHash: input.configHash,
        fidsResponseHash: row.response_hash ?? null,
        scheduleVersion: null,
      });
      if (outcome.status === "blocked") {
        tally(outcome.reason);
        continue;
      }
      built += 1;
      inserted += await persistPreSnapshot(pool, outcome.snapshot);
    }
  }
  return {
    cutoffUtc: input.cutoffUtc.toISOString(),
    populationRows: res.rows.length,
    built,
    blocked,
    inserted,
  };
}
