/** V3.9-f.8 PRE snapshot builder/materializer — Phase 0F. */
export const PRE_SNAPSHOT_BUILDER_VERSION = "preSnapshotBuilder_v3@1.3.0";
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
  /** Durable system-availability of the qualifying population observation. */
  populationObservationAvailableAtUtc: Date | null;
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
  | { status: "blocked"; reason: "not_population_member" | "population_not_available_at_cutoff" | "not_horizon_eligible" | "t_unavailable" };

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
  const availability = input.populationObservationAvailableAtUtc?.getTime();
  const cutoff = input.predictionCutoffUtc?.getTime();
  if (availability === undefined || !Number.isFinite(availability) ||
      !Number.isFinite(cutoff) || availability > cutoff)
    return { status: "blocked", reason: "population_not_available_at_cutoff" };
  if (!input.selectedTMilestoneUtc || !Number.isFinite(input.selectedTMilestoneUtc.getTime())) {
    return { status: "blocked", reason: "t_unavailable" };
  }
  if (!input.horizonEligible || !horizonEligibleForCutoff(input.selectedTMilestoneUtc, input.predictionCutoffUtc, input.horizon))
    return { status: "blocked", reason: "not_horizon_eligible" };
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
  /** Explicit reviewed admission; an arbitrary SHA string alone is NOT provenance. */
  verifiedProviderNativeSchedule: true;
  /** SHA256 of the independently reviewed source-semantics evidence artifact. */
  semanticsEvidenceSha256: string;
}

export function resolveSelectedTMilestone(
  row: { first_observed_schedule_utc?: unknown },
  config: SelectedTMilestoneConfig | null,
): Date | null {
  if (!config || config.verifiedProviderNativeSchedule !== true ||
      !/^[a-f0-9]{64}$/i.test(config.artifactHash) ||
      !/^[a-f0-9]{64}$/i.test(config.semanticsEvidenceSha256 ?? "") ||
      !config.version?.trim()) return null;
  // f.8 §6.0: no FAA scheduled_gate_out alias or legacy DB-column selection.
  // Semantic evidence must independently establish the chosen native schedule
  // milestone; this reviewer-input flag is NOT itself an external certificate.
  if (config.milestone !== "departure.scheduledTime.utc") return null;
  if (!row.first_observed_schedule_utc) return null;
  const raw = row.first_observed_schedule_utc;
  if (!(raw instanceof Date) && typeof raw !== "string") return null;
  const d = raw instanceof Date ? raw : new Date(raw);
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
  // Exact T-horizon equality, not >=: earlier/later cutoffs are *different
  // predictions* and must not be mislabeled as this pre-registered horizon.
  return Number.isFinite(cutoffUtc.getTime()) &&
    selectedTUtc.getTime() - cutoffUtc.getTime() === PRE_HORIZON_OFFSET_MIN[horizon] * 60_000;
}

/**
 * Input cutoffUtc is the *processing watermark*, never the nominal per-flight
 * prediction cutoff. Each flight/horizon uses C_i,h = first_observed_T_i - h.
 * Historical materialization is allowed ONLY from truly durable as-of rows;
 * no post-C FIDS response enters that earlier horizon.
 * Missing optional features never determine whether a snapshot row exists.
 */
export async function materializePreSnapshotsForCutoff(pool: QueryPool, input: PreMaterializeInput): Promise<PreMaterializeResult> {
  const horizons = input.horizons ?? PRE_HORIZONS;
  if (!Number.isFinite(input.cutoffUtc.getTime()) ||
      horizons.some(h => !PRE_HORIZONS.includes(h)) ||
      new Set(horizons).size !== horizons.length)
    throw Error("PRE_INVALID_WATERMARK_OR_HORIZONS");
  const res = await pool.query(
    `WITH eligible AS (
       SELECT * FROM clean.flight_population
        WHERE source_type = 'fids'
          AND population_role = 'requested_airport_primary'
          AND scope_classification = 'confirmed_core'
          AND codeshare_resolution_status = 'confirmed_operating_leg'
          AND provider_content_expired_at_utc IS NULL
          AND dep_scheduled_utc IS NOT NULL
          AND available_at IS NOT NULL AND available_at <= $1
     ), firsts AS (
       SELECT DISTINCT ON (analytic_identity_id)
              analytic_identity_id,
              dep_scheduled_utc AS first_observed_schedule_utc,
              population_query_id AS first_schedule_query_id
         FROM eligible
        ORDER BY analytic_identity_id, available_at ASC, id ASC
     )
     SELECT f.analytic_identity_id, f.first_observed_schedule_utc,
            f.first_schedule_query_id,
            obs.population_query_id, obs.response_hash,
            obs.population_role, obs.scope_classification,
            obs.codeshare_resolution_status, obs.available_at,
            h.horizon, f.first_observed_schedule_utc - h.lag AS prediction_cutoff_utc
       FROM firsts f
       CROSS JOIN (VALUES ('T-24h'::text, INTERVAL '24 hours'),
                          ('T-6h'::text, INTERVAL '6 hours'),
                          ('T-90m'::text, INTERVAL '90 minutes')) AS h(horizon,lag)
       LEFT JOIN LATERAL (
         SELECT p.population_query_id, p.response_hash,
                p.population_role, p.scope_classification,
                p.codeshare_resolution_status, p.available_at
           FROM eligible p
          WHERE p.analytic_identity_id = f.analytic_identity_id
            AND p.available_at <= f.first_observed_schedule_utc - h.lag
          ORDER BY p.available_at DESC, p.id DESC
          LIMIT 1
       ) obs ON TRUE
      ORDER BY f.analytic_identity_id, h.horizon`,
    [input.cutoffUtc],
  );
  const blocked: Record<string, number> = {};
  const tally = (reason: string) => { blocked[reason] = (blocked[reason] ?? 0) + 1; };
  let built = 0, inserted = 0, alreadyExisting = 0, evaluatedRows = 0;

  for (const row of res.rows) {
    if (!horizons.includes(row.horizon as PreHorizon)) continue;
    evaluatedRows += 1;
    const horizon = row.horizon as PreHorizon;
    const selectedT = resolveSelectedTMilestone(row, input.selectedTMilestoneConfig);
    if (!selectedT) { tally("t_unavailable"); continue; }
    const nominalCutoff = row.prediction_cutoff_utc instanceof Date
      ? row.prediction_cutoff_utc
      : typeof row.prediction_cutoff_utc === "string"
        ? new Date(row.prediction_cutoff_utc) : null;
    if (!nominalCutoff || !horizonEligibleForCutoff(selectedT, nominalCutoff, horizon)) {
      tally("not_horizon_eligible"); continue;
    }
    // The LEFT JOIN intentionally exposes unavailable horizons as missing,
    // rather than silently omitting otherwise encountered flights from QC.
    const availableAt = row.available_at instanceof Date
      ? row.available_at : typeof row.available_at === "string"
        ? new Date(row.available_at) : null;
    if (!availableAt || !Number.isFinite(availableAt.getTime()) ||
        availableAt.getTime() > nominalCutoff.getTime() ||
        availableAt.getTime() > input.cutoffUtc.getTime()) {
      tally("population_unobserved_at_cutoff"); continue;
    }
    if (row.population_role !== "requested_airport_primary") { tally("not_primary_role"); continue; }
    if (row.scope_classification !== "confirmed_core") { tally("unverified_scope"); continue; }
    if (row.codeshare_resolution_status !== "confirmed_operating_leg") { tally("unverified_operating_leg"); continue; }
    const outcome = buildPreSnapshot({
      flightInstanceId: String(row.analytic_identity_id),
      populationQueryId: row.population_query_id ?? null,
      populationMemberAtCutoff: true,
      populationObservationAvailableAtUtc: availableAt,
      horizonEligible: true,
      horizon,
      selectedTMilestoneUtc: selectedT,
      selectedTVersion: input.selectedTMilestoneConfig
        ? `${input.selectedTMilestoneConfig.milestone}:${input.selectedTMilestoneConfig.version}:${input.selectedTMilestoneConfig.artifactHash}:${row.first_schedule_query_id ?? "no-first-id"}`
        : null,
      predictionCutoffUtc: nominalCutoff,
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
  return { cutoffUtc: input.cutoffUtc.toISOString(), populationRows: evaluatedRows,
    built, blocked, inserted, alreadyExisting };
}
