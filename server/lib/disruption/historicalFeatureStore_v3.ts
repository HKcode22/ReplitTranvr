/**
 * Historical as-of feature store — V3.9-f.8 §12.2 / §12.2.1.
 *
 * Binding authority: SEPmd/V3.9_DataCollectPlan_f.8.md §§0–21.
 * Historical facts are append-only and bitemporal. At prediction cutoff T a
 * feature is eligible only when information_available_at <= T, valid_from <= T,
 * and valid_to is null or > T.
 *
 * IMPORTANT Phase-0 safety rule: an infrastructure/database failure is NOT the
 * same thing as a genuinely missing as-of feature. Missing rows return null (or
 * an empty Map for a batch lookup); query/write failures throw a typed error so
 * snapshot materializers can pause/fail closed instead of manufacturing
 * history_incomplete from a broken store.
 */

import { v39Pool as pool } from "./db_v39";

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

export type HistoryLookupStatus = "FOUND" | "MISSING_AS_OF";

export interface HistoryLookupResult {
  status: HistoryLookupStatus;
  row: HistoricalFeatureRow | null;
}

export interface HistoryQueryExecutor {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
}

export class HistoryStoreInfrastructureError extends Error {
  readonly operation: string;
  readonly causeValue: unknown;

  constructor(operation: string, causeValue: unknown) {
    const detail = causeValue instanceof Error ? causeValue.message : String(causeValue);
    super(`historical feature store infrastructure failure during ${operation}: ${detail}`);
    this.name = "HistoryStoreInfrastructureError";
    this.operation = operation;
    this.causeValue = causeValue;
  }
}

function defaultExecutor(): HistoryQueryExecutor {
  return { query: (text, params = []) => pool.query(text, params as any[]) };
}

function mapFeatureRow(row: any): HistoricalFeatureRow {
  return {
    entityType: row.entity_type,
    entityId: row.entity_id,
    featureName: row.feature_name,
    featureValue: row.feature_value,
    featureText: row.feature_text,
    source: row.source,
    sourceVersion: row.source_version,
    sourceTimestamp: row.source_timestamp?.toISOString?.() ?? row.source_timestamp ?? null,
    informationAvailableTimestamp:
      row.information_available_at?.toISOString?.() ?? row.information_available_at,
    validFrom: row.valid_from?.toISOString?.() ?? row.valid_from,
    validTo: row.valid_to?.toISOString?.() ?? row.valid_to ?? null,
    batchId: row.batch_id,
    payloadSha256: row.payload_sha256,
  };
}

/**
 * Explicit-status form used where callers need to distinguish a legitimate
 * absent fact from a found fact. Infrastructure failures throw.
 */
export async function getHistoricalFeatureAsOfResult(
  entityType: HistoricalFeatureRow["entityType"],
  entityId: string,
  featureName: string,
  cutoffUtc: string,
  executor: HistoryQueryExecutor = defaultExecutor(),
): Promise<HistoryLookupResult> {
  let result: { rows: any[]; rowCount?: number | null };
  try {
    result = await executor.query(
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
  } catch (error) {
    throw new HistoryStoreInfrastructureError(
      `as-of lookup ${entityType}/${entityId}/${featureName}`,
      error,
    );
  }

  if (result.rows.length === 0) return { status: "MISSING_AS_OF", row: null };
  return { status: "FOUND", row: mapFeatureRow(result.rows[0]) };
}

/**
 * Compatibility form: a genuinely absent feature returns null; infrastructure
 * failure throws HistoryStoreInfrastructureError.
 */
export async function getHistoricalFeatureAsOf(
  entityType: HistoricalFeatureRow["entityType"],
  entityId: string,
  featureName: string,
  cutoffUtc: string,
  executor: HistoryQueryExecutor = defaultExecutor(),
): Promise<HistoricalFeatureRow | null> {
  const result = await getHistoricalFeatureAsOfResult(
    entityType,
    entityId,
    featureName,
    cutoffUtc,
    executor,
  );
  return result.row;
}

/**
 * Batch as-of lookup. An empty Map means the query succeeded but none of the
 * requested features existed as-of the cutoff. Database failure throws.
 */
export async function getHistoricalFeaturesAsOf(
  entityType: HistoricalFeatureRow["entityType"],
  entityId: string,
  featureNames: string[],
  cutoffUtc: string,
  executor: HistoryQueryExecutor = defaultExecutor(),
): Promise<Map<string, HistoricalFeatureRow>> {
  const results = new Map<string, HistoricalFeatureRow>();
  if (featureNames.length === 0) return results;

  let queryResult: { rows: any[]; rowCount?: number | null };
  try {
    queryResult = await executor.query(
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
  } catch (error) {
    throw new HistoryStoreInfrastructureError(
      `batch as-of lookup ${entityType}/${entityId}`,
      error,
    );
  }

  for (const row of queryResult.rows) results.set(row.feature_name, mapFeatureRow(row));
  return results;
}

/**
 * Append-only insert. Expected duplicate keys remain idempotent through
 * ON CONFLICT DO NOTHING. Any database failure throws rather than silently
 * pretending the feature was stored.
 */
export async function insertHistoricalFeature(
  row: Omit<HistoricalFeatureRow, "featureText"> & { featureText?: string | null },
  executor: HistoryQueryExecutor = defaultExecutor(),
): Promise<void> {
  try {
    await executor.query(
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
  } catch (error) {
    throw new HistoryStoreInfrastructureError(
      `insert ${row.entityType}/${row.entityId}/${row.featureName}`,
      error,
    );
  }
}

/**
 * Check persisted readiness. Missing readiness evidence is NOT_READY (false);
 * an inability to query readiness is an infrastructure failure and throws.
 */
export async function isHistoryReady(
  entityType: string,
  entityId: string,
  cutoffUtc: string,
  executor: HistoryQueryExecutor = defaultExecutor(),
): Promise<boolean> {
  let result: { rows: any[]; rowCount?: number | null };
  try {
    result = await executor.query(
      `SELECT history_ready_at
       FROM clean.historical_readiness
       WHERE entity_type = $1 AND entity_id = $2 AND verified = true`,
      [entityType, entityId],
    );
  } catch (error) {
    throw new HistoryStoreInfrastructureError(
      `readiness check ${entityType}/${entityId}`,
      error,
    );
  }

  if (result.rows.length === 0) return false;
  const readyAt = new Date(result.rows[0].history_ready_at);
  const cutoff = new Date(cutoffUtc);
  if (!Number.isFinite(readyAt.getTime()) || !Number.isFinite(cutoff.getTime())) return false;
  return cutoff >= readyAt;
}

export function isHistoryReadySimple(historyReadyAt: string, cutoffUtc: string): boolean {
  const ready = new Date(historyReadyAt);
  const cutoff = new Date(cutoffUtc);
  return Number.isFinite(ready.getTime()) && Number.isFinite(cutoff.getTime()) && cutoff >= ready;
}

/** Frozen minimum lookbacks (days) by entity family. */
export const HISTORY_MIN_LOOKBACK_DAYS: Record<string, number> = {
  airport: 7,
  route: 7,
  carrier_airport: 7,
  tail: 1,
  od: 7,
  weather: 0.25,
};

export const HISTORY_MIN_QUALIFYING_FLIGHTS = 5;

/** history_ready_at = max(bootstrap_end, earliest_snapshot_cutoff − lookback). */
export function computeHistoryReadyAt(
  bootstrapEndUtc: Date | null,
  earliestSnapshotCutoffUtc: Date,
  lookbackDays: number,
): Date {
  const cutoffMinusLookback = new Date(
    earliestSnapshotCutoffUtc.getTime() - lookbackDays * 86_400_000,
  );
  if (!bootstrapEndUtc) return cutoffMinusLookback;
  return bootstrapEndUtc.getTime() >= cutoffMinusLookback.getTime()
    ? bootstrapEndUtc
    : cutoffMinusLookback;
}

export interface HistoryCompleteness {
  complete: boolean;
  qualifyingCount: number;
  minimumRequired: number;
  flag: "history_complete_for_snapshot" | "history_incomplete";
}

export function evaluateHistoryCompleteness(
  qualifyingCount: number,
  minimumRequired: number = HISTORY_MIN_QUALIFYING_FLIGHTS,
): HistoryCompleteness {
  const complete = qualifyingCount >= minimumRequired;
  return {
    complete,
    qualifyingCount,
    minimumRequired,
    flag: complete ? "history_complete_for_snapshot" : "history_incomplete",
  };
}

/** Missing row returns null; infrastructure failure throws. */
export async function getHistoryReadiness(
  entityType: string,
  entityId: string,
  executor: HistoryQueryExecutor = defaultExecutor(),
): Promise<HistoryReadinessRow | null> {
  let result: { rows: any[]; rowCount?: number | null };
  try {
    result = await executor.query(
      `SELECT entity_type, entity_id, history_ready_at, bootstrap_end,
              earliest_snapshot_cutoff, lookback_days, verified
       FROM clean.historical_readiness
       WHERE entity_type = $1 AND entity_id = $2`,
      [entityType, entityId],
    );
  } catch (error) {
    throw new HistoryStoreInfrastructureError(
      `readiness get ${entityType}/${entityId}`,
      error,
    );
  }

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    entityType: row.entity_type,
    entityId: row.entity_id,
    historyReadyAt: row.history_ready_at?.toISOString?.() ?? row.history_ready_at,
    bootstrapEnd: row.bootstrap_end?.toISOString?.() ?? row.bootstrap_end ?? null,
    earliestSnapshotCutoff:
      row.earliest_snapshot_cutoff?.toISOString?.() ?? row.earliest_snapshot_cutoff ?? null,
    lookbackDays: row.lookback_days,
    verified: row.verified,
  };
}
