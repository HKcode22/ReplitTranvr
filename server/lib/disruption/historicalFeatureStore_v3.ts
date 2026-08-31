/**
 * Historical as-of feature store — V3.9-f.7 §12.2 / §12.2.1 / §70
 *
 * Binding spec: AugMDnotes/V3.9_DataCollectPlan.md §12.2 + §12.2.1
 * One row per (entity_type, entity_id, feature_name, valid_from) with
 * feature_value, source, source_timestamp, information_available_timestamp, valid_from, valid_to
 *
 * Snapshot at T fetches max(valid_from) WHERE available_at ≤ T — never future computation.
 * Bootstrap: weather archive backfill + provider FIDS history as far as retained (≥7d) + pre-run collection.
 * history_ready_at = max(bootstrap_end, earliest_snapshot_cutoff - lookback) — earliest evaluation cutoff must be ≥ history_ready_at.
 * Status: STUB — table not yet created; wiring needed before Phase 6.
 */

export interface HistoricalFeatureRow {
  entityType: "airport" | "route" | "carrier_airport" | "tail" | "od" | "weather";
  entityId: string;
  featureName: string;
  featureValue: number | null;
  source: string;
  sourceTimestamp: string;
  informationAvailableTimestamp: string; // ≤ valid_from, eligibility rule
  validFrom: string;
  validTo: string;
}

/** STUB — as-of lookup, to be implemented against DB table `historical_feature_store` */
export async function getHistoricalFeatureAsOf(
  _entityType: HistoricalFeatureRow["entityType"],
  _entityId: string,
  _featureName: string,
  _cutoffUtc: string
): Promise<HistoricalFeatureRow | null> {
  throw new Error(
    "historical_feature_store not yet implemented — see AugMDnotes/V3.9_DataCollectPlan.md §12.2.1. " +
      "Implement table + bootstrap + history_ready_at. Until then every snapshot where history unavailable must be stamped history_incomplete and excluded from primary (see §12.2 warm-up rule)."
  );
}

export function isHistoryReady(_historyReadyAt: string, _cutoffUtc: string): boolean {
  return new Date(_cutoffUtc) >= new Date(_historyReadyAt);
}
