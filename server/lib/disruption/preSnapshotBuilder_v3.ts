/** V3.9-f.8 PRE snapshot builder/materializer — Phase 0F. */
export const PRE_SNAPSHOT_BUILDER_VERSION = "preSnapshotBuilder_v3@1.1.0";
export const PRE_HORIZONS = ["T-24h", "T-6h", "T-90m"] as const;
export type PreHorizon = (typeof PRE_HORIZONS)[number];
export const PRE_PREDICTION_STATE = "PRE_DEPARTURE" as const;

export interface PreFeatureInput {
  featureName: string;
  value: unknown;
  informationAvailableAt: Date | null;
  source: string | null;
  sourceVersion: string | null;
}
export interface PreFeatureOutput {
  featureName: string;
  value: unknown;
  missing: boolean;
  missingReason: "available_after_cutoff" | "no_available_timestamp" | null;
}
export interface PrePopulationInput {
  flightInstanceId: string;
  populationQueryId: string | null;
  populationMemberAtCutoff: boolean;
  horizonEligible: boolean;
  horizon: PreHorizon;
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

export function snapshotExists(populationMemberAtCutoff: boolean, horizonEligible: boolean): boolean {
  return populationMemberAtCutoff && horizonEligible;
}

export function selectFeatureValue(feature: PreFeatureInput, cutoffUtc: Date): PreFeatureOutput {
  const base = { featureName: feature.featureName };
  if (!feature.informationAvailableAt || !Number.isFinite(feature.informationAvailableAt.getTime())) {
    return { ...base, value: null, missing: true, missingReason: "no_available_timestamp" };
  }
  if (feature.informationAvailableAt.getTime() > cutoffUtc.getTime()) {
    return { ...base, value: null, missing: true, missingReason: "available_after_cutoff" };
  }
  return { ...base, value: feature.value, missing: false, missingReason: null };
}

export function buildPreSnapshot(input: PrePopulationInput): PreSnapshotOutcome {
  if (!input.populationMemberAtCutoff) return { status: "blocked", reason: "not_population_member" };
  if (!input.selectedTMilestoneUtc || !Number.isFinite(input.selectedTMilestoneUtc.getTime())) {
    return { status: "blocked", reason: "t_unavailable" };
  }
  if (!input.horizonEligible) return { status: "blocked", reason: "not_horizon_eligible" };
  const features = input.features.map((f) => selectFeatureValue(f, input.predictionCutoffUtc));
  const missingnessFlags: Record<string, string | null> = {};
  for (const f of features) missingnessFlags[f.featureName] = f.missing ? (f.missingReason ?? "missing") : null;
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

/** DB failures throw. A zero rowCount means only an expected idempotent conflict. */
export async function persistPreSnapshot(
  pool: { query: (text: string, params: unknown[]) => Promise<{ rowCount: number | null }> },
  snapshot: PreSnapshot,
): Promise<number> {
  const res = await pool.query(
    `INSERT INTO clean.flight_snapshots
       (flight_instance_id, prediction_state, horizon, prediction_cutoff_utc,
        selected_t_milestone_utc, selected_t_version, population_query_id,
        fids_response_hash, schedule_version, frame_hash, config_hash,
        features_json, missingness_flags, builder_version, provenance_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15::jsonb)
     ON CONFLICT (flight_instance_id, horizon, prediction_cutoff_utc) DO NOTHING`,
    [snapshot.flightInstanceId, snapshot.predictionState, snapshot.horizon, snapshot.predictionCutoffUtc,
      snapshot.selectedTMilestoneUtc, snapshot.selectedTVersion, snapshot.populationQueryId,
      snapshot.provenance.fidsResponseHash, snapshot.provenance.scheduleVersion,
      snapshot.provenance.frameHash, snapshot.provenance.configHash,
      JSON.stringify(snapshot.features.map((f) => ({ name: f.featureName, value: f.value }))),
      JSON.stringify(snapshot.provenance.missingnessFlags), snapshot.provenance.builderVersion,
      JSON.stringify(snapshot.provenance)],
  );
  return res.rowCount ?? 0;
}

export const PRE_HORIZON_OFFSET_MIN: Record<PreHorizon, number> = {
  "T-24h": 24 * 60,
  "T-6h": 6 * 60,
  "T-90m": 90,
};

/**
 * Only provider-native selected-T constructs actually materialized in the
 * Phase-0 schema may be resolved here. A future Gate-0.5 selection that names
 * some other construct fails closed until its schema/owner is added.
 */
export type SelectedTMilestone =
  | "departure.scheduledTime.utc"
  | "scheduled_gate_out_utc"
  | "dep_scheduled_utc";

export interface SelectedTMilestoneConfig {
  milestone: string;
  version: string;
  artifactHash: string;
}

export function resolveSelectedTMilestone(
  row: { dep_scheduled_utc?: unknown },
  config: SelectedTMilestoneConfig | null,
): Date | null {
  if (!config || !/^[a-f0-9]{64}$/i.test(config.artifactHash) || !config.version.trim()) return null;
  const allowed = new Set<SelectedTMilestone>([
    "departure.scheduledTime.utc",
    "scheduled_gate_out_utc",
    "dep_scheduled_utc",
  ]);
  if (!allowed.has(config.milestone as SelectedTMilestone)) return null;
  if (!row.dep_scheduled_utc) return null;
  const d = new Date(row.dep_scheduled_utc as any);
  return Number.isFinite(d.getTime()) ? d : null;
}

export interface PreMaterializeInput {
  cutoffUtc: Date;
  batchId: string | null;
  horizons?: readonly PreHorizon[];
  frameHash: string | null;
  configHash: string | null;
  selectedTMilestoneConfig: SelectedTMilestoneConfig | null;
}
export interface PreMaterializeResult {
  cutoffUtc: string;
  populationRows: number;
  built: number;
  blocked: Record<string, number>;
  inserted: number;
  alreadyExisting: number;
}
type QueryPool = { query: (text: string, params: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }> };

export function horizonEligibleForCutoff(selectedTUtc: Date | null, cutoffUtc: Date, horizon: PreHorizon): boolean {
  if (!selectedTUtc || !Number.isFinite(selectedTUtc.getTime())) return false;
  return selectedTUtc.getTime() - cutoffUtc.getTime() >= PRE_HORIZON_OFFSET_MIN[horizon] * 60_000;
}

export async function materializePreSnapshotsForCutoff(pool: QueryPool, input: PreMaterializeInput): Promise<PreMaterializeResult> {
  const horizons = input.horizons ?? PRE_HORIZONS;
  const res = await pool.query(
    `SELECT analytic_identity_id, dep_scheduled_utc, population_query_id,
            response_hash, population_role, scope_classification
       FROM clean.flight_population
      WHERE cutoff_utc = $1 AND source_type = 'fids'`,
    [input.cutoffUtc],
  );
  const blocked: Record<string, number> = {};
  const tally = (reason: string) => { blocked[reason] = (blocked[reason] ?? 0) + 1; };
  let built = 0;
  let inserted = 0;
  let alreadyExisting = 0;

  for (const row of res.rows) {
    if (row.population_role !== "requested_airport_primary") { tally("not_primary_role"); continue; }
    const selectedT = resolveSelectedTMilestone(row, input.selectedTMilestoneConfig);
    for (const horizon of horizons) {
      const outcome = buildPreSnapshot({
        flightInstanceId: String(row.analytic_identity_id),
        populationQueryId: row.population_query_id ?? null,
        populationMemberAtCutoff: true,
        horizonEligible: horizonEligibleForCutoff(selectedT, input.cutoffUtc, horizon),
        horizon,
        selectedTMilestoneUtc: selectedT,
        selectedTVersion: selectedT && input.selectedTMilestoneConfig
          ? `${input.selectedTMilestoneConfig.milestone}:${input.selectedTMilestoneConfig.version}:${input.selectedTMilestoneConfig.artifactHash}`
          : null,
        predictionCutoffUtc: input.cutoffUtc,
        features: [],
        frameHash: input.frameHash,
        configHash: input.configHash,
        fidsResponseHash: row.response_hash ?? null,
        scheduleVersion: null,
      });
      if (outcome.status === "blocked") { tally(outcome.reason); continue; }
      built += 1;
      const n = await persistPreSnapshot(pool, outcome.snapshot);
      if (n > 0) inserted += n;
      else alreadyExisting += 1;
    }
  }
  return { cutoffUtc: input.cutoffUtc.toISOString(), populationRows: res.rows.length, built, blocked, inserted, alreadyExisting };
}
