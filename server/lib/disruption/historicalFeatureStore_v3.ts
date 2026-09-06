/**
 * Historical as-of feature store — V3.9-f.8 §12.2 / §12.2.1 / §70 / Sep1_1 §26
 *
 * Binding spec: AugMDnotes/V3.9_DataCollectPlan.md §12.2 + §12.2.1
 * One row per (entity_type, entity_id, feature_name, valid_from) with
 * feature_value, source, source_timestamp, information_available_timestamp, valid_from, valid_to
 *
 * Snapshot at T fetches max(valid_from) WHERE available_at ≤ T — never future computation.
 * Bootstrap: weather archive backfill + provider FIDS history as far as retained (≥7d) + pre-run collection.
 * history_ready_at = max(bootstrap_end, earliest_snapshot_cutoff - lookback) — earliest evaluation cutoff must be ≥ history_ready_at.
 *
 * Sep1_1 §26 corrections:
 *  - Real bitemporal/as-of logic, not a stub
 *  - Append-only: rows are never updated or deleted
 *  - as-of effective time query implemented
 *  - History readiness tracked per entity
 *  - Missing features stay NULL, never 0
 */

import { pool } from "../../db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HistoricalFeatureRow {
  entityType: "airport" | "route" | "carrier_airport" | "tail" | "od" | "weather";
  entityId: string;
  featureName: string;
  featureValue: number | null;
  featureText: string | null;
  source: string;
  sourceVersion: string | null;
  sourceTimestamp: string | null;
  informationAvailableTimestamp: string;
  validFrom: string;
  validTo: string | null;
  batchId: string | null;
  payloadSha256: string | null;
}

export interface HistoryReadinessRow {
  entityType: string;
  entityId: string;
  historyReadyAt: string;
  bootstrapEnd: string | null;
  earliestSnapshotCutoff: string | null;
  lookbackDays: number;
  verified: boolean;
}

// ---------------------------------------------------------------------------
// As-of lookup (§12.2.1)
// ---------------------------------------------------------------------------

/**
 * Fetch the most recent feature value for a given entity as of a cutoff time.
 *
 * Query: SELECT ... FROM clean.historical_feature_store
 *   WHERE entity_type = $1 AND entity_id = $2 AND feature_name = $3
 *     AND information_available_at <= $4  -- feature was computable at cutoff
 *     AND valid_from <= $4               -- feature was valid at cutoff
 *     AND (valid_to IS NULL OR valid_to > $4)  -- feature hadn't expired
 *   ORDER BY valid_from DESC LIMIT 1
 *
 * Returns null if no feature exists for the given entity at the cutoff.
 * Never throws: missing features return null (caller stamps history_incomplete).
 */
export async function getHistoricalFeatureAsOf(
  entityType: HistoricalFeatureRow["entityType"],
  entityId: string,
  featureName: string,
  cutoffUtc: string,
): Promise<HistoricalFeatureRow | null> {
  try {
    const result = await pool.query(
      `SELECT
         entity_type, entity_id, feature_name,
         feature_value, feature_text,
         source, source_version, source_timestamp,
         information_available_at, valid_from, valid_to,
         batch_id, payload_sha256
       FROM clean.historical_feature_store
       WHERE entity_type = $1
         AND entity_id = $2
         AND feature_name = $3
         AND information_available_at <= $4
         AND valid_from <= $4
         AND (valid_to IS NULL OR valid_to > $4)
       ORDER BY valid_from DESC
       LIMIT 1`,
      [entityType, entityId, featureName, cutoffUtc],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      entityType: row.entity_type,
      entityId: row.entity_id,
      featureName: row.feature_name,
      featureValue: row.feature_value,
      featureText: row.feature_text,
      source: row.source,
      sourceVersion: row.source_version,
      sourceTimestamp: row.source_timestamp?.toISOString?.() ?? row.source_timestamp ?? null,
      informationAvailableTimestamp: row.information_available_at?.toISOString?.() ?? row.information_available_at,
      validFrom: row.valid_from?.toISOString?.() ?? row.valid_from,
      validTo: row.valid_to?.toISOString?.() ?? row.valid_to ?? null,
      batchId: row.batch_id,
      payloadSha256: row.payload_sha256,
    };
  } catch (err: any) {
    console.error(`[history-store] as-of lookup failed (${entityType}/${entityId}/${featureName}):`, err?.message || err);
    return null;
  }
}

/**
 * Batch as-of lookup: fetch multiple features for the same entity at a cutoff.
 * More efficient than individual calls when querying many features for one entity.
 */
export async function getHistoricalFeaturesAsOf(
  entityType: HistoricalFeatureRow["entityType"],
  entityId: string,
  featureNames: string[],
  cutoffUtc: string,
): Promise<Map<string, HistoricalFeatureRow>> {
  const results = new Map<string, HistoricalFeatureRow>();
  if (featureNames.length === 0) return results;

  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (feature_name)
         entity_type, entity_id, feature_name,
         feature_value, feature_text,
         source, source_version, source_timestamp,
         information_available_at, valid_from, valid_to,
         batch_id, payload_sha256
       FROM clean.historical_feature_store
       WHERE entity_type = $1
         AND entity_id = $2
         AND feature_name = ANY($3::text[])
         AND information_available_at <= $4
         AND valid_from <= $4
         AND (valid_to IS NULL OR valid_to > $4)
       ORDER BY feature_name, valid_from DESC`,
      [entityType, entityId, featureNames, cutoffUtc],
    );

    for (const row of result.rows) {
      results.set(row.feature_name, {
        entityType: row.entity_type,
        entityId: row.entity_id,
        featureName: row.feature_name,
        featureValue: row.feature_value,
        featureText: row.feature_text,
        source: row.source,
        sourceVersion: row.source_version,
        sourceTimestamp: row.source_timestamp?.toISOString?.() ?? row.source_timestamp ?? null,
        informationAvailableTimestamp: row.information_available_at?.toISOString?.() ?? row.information_available_at,
        validFrom: row.valid_from?.toISOString?.() ?? row.valid_from,
        validTo: row.valid_to?.toISOString?.() ?? row.valid_to ?? null,
        batchId: row.batch_id,
        payloadSha256: row.payload_sha256,
      });
    }
  } catch (err: any) {
    console.error(`[history-store] batch as-of lookup failed (${entityType}/${entityId}):`, err?.message || err);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Insert (append-only, §12.2)
// ---------------------------------------------------------------------------

/**
 * Insert a historical feature row. Append-only: rows are never updated or deleted.
 * ON CONFLICT (entity_type, entity_id, feature_name, valid_from) DO NOTHING
 * to ensure idempotent inserts.
 */
export async function insertHistoricalFeature(row: Omit<HistoricalFeatureRow, "featureText"> & { featureText?: string | null }): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO clean.historical_feature_store
         (entity_type, entity_id, feature_name, feature_value, feature_text,
          source, source_version, source_timestamp,
          information_available_at, valid_from, valid_to,
          batch_id, payload_sha256)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (entity_type, entity_id, feature_name, valid_from) DO NOTHING`,
      [
        row.entityType,
        row.entityId,
        row.featureName,
        row.featureValue,
        row.featureText ?? null,
        row.source,
        row.sourceVersion ?? null,
        row.sourceTimestamp ? new Date(row.sourceTimestamp) : null,
        new Date(row.informationAvailableTimestamp),
        new Date(row.validFrom),
        row.validTo ? new Date(row.validTo) : null,
        row.batchId ?? null,
        row.payloadSha256 ?? null,
      ],
    );
  } catch (err: any) {
    console.error(`[history-store] insert failed (${row.entityType}/${row.entityId}/${row.featureName}):`, err?.message || err);
  }
}

// ---------------------------------------------------------------------------
// History readiness (§12.2)
// ---------------------------------------------------------------------------

/**
 * Check if historical features are ready for a given entity at a cutoff.
 * history_ready_at = max(bootstrap_end, earliest_snapshot_cutoff - lookback)
 */
export async function isHistoryReady(
  entityType: string,
  entityId: string,
  cutoffUtc: string,
): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT history_ready_at
       FROM clean.historical_readiness
       WHERE entity_type = $1 AND entity_id = $2 AND verified = true`,
      [entityType, entityId],
    );

    if (result.rows.length === 0) return false;

    const readyAt = result.rows[0].history_ready_at;
    return new Date(cutoffUtc) >= new Date(readyAt);
  } catch (err: any) {
    console.error(`[history-store] readiness check failed (${entityType}/${entityId}):`, err?.message || err);
    return false;
  }
}

/**
 * Simple cutoff-based readiness check (for callers that pre-computed history_ready_at).
 */
export function isHistoryReadySimple(historyReadyAt: string, cutoffUtc: string): boolean {
  return new Date(cutoffUtc) >= new Date(historyReadyAt);
}

/**
 * Get history readiness info for an entity.
 */
export async function getHistoryReadiness(
  entityType: string,
  entityId: string,
): Promise<HistoryReadinessRow | null> {
  try {
    const result = await pool.query(
      `SELECT entity_type, entity_id, history_ready_at, bootstrap_end,
              earliest_snapshot_cutoff, lookback_days, verified
       FROM clean.historical_readiness
       WHERE entity_type = $1 AND entity_id = $2`,
      [entityType, entityId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      entityType: row.entity_type,
      entityId: row.entity_id,
      historyReadyAt: row.history_ready_at?.toISOString?.() ?? row.history_ready_at,
      bootstrapEnd: row.bootstrap_end?.toISOString?.() ?? row.bootstrap_end ?? null,
      earliestSnapshotCutoff: row.earliest_snapshot_cutoff?.toISOString?.() ?? row.earliest_snapshot_cutoff ?? null,
      lookbackDays: row.lookback_days,
      verified: row.verified,
    };
  } catch (err: any) {
    console.error(`[history-store] readiness get failed (${entityType}/${entityId}):`, err?.message || err);
    return null;
  }
}
