import { createHash } from "crypto";

export type ContentClassification = "raw_api_content" | "derived_work" | "non_aerodatabox_metadata";

export interface RetentionMatrixRow {
  contentClass: string;
  tables: readonly string[];
  contentClassification: ContentClassification;
  retentionVerifiedDate: string;
  retentionSource: string;
  retentionLegalBasis: string;
  retentionPeriodDaysOrCondition: string;
  expiryAction: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function verifiedRow(
  contentClass: string,
  tables: readonly string[],
  contentClassification: ContentClassification,
  retentionPeriodDaysOrCondition: string,
  expiryAction: string,
  retentionSource: string = "AeroDataBox RapidAPI Ultra Terms & Conditions",
  retentionLegalBasis: string = "API Terms of Service Article 5.6 / Legal Attestation HAMZA_AHMED_KHAN_20260910_PASS",
  retentionVerifiedDate: string = "2026-09-10"
): RetentionMatrixRow {
  return {
    contentClass,
    tables,
    contentClassification,
    retentionVerifiedDate,
    retentionSource,
    retentionLegalBasis,
    retentionPeriodDaysOrCondition,
    expiryAction,
  };
}

export const RETENTION_MATRIX: readonly RetentionMatrixRow[] = Object.freeze([
  verifiedRow("webhook_raw_delivery", ["clean.raw_delivery", "clean.raw_delivery_item"], "raw_api_content", "7 days", "HARD_DELETE"),
  verifiedRow("semantic_events", ["clean.flight_events"], "derived_work", "365 days", "HARD_DELETE"),
  verifiedRow("current_state_convenience", ["clean.flight_state"], "derived_work", "365 days", "HARD_DELETE"),
  verifiedRow("airborne_raw", ["clean.raw_airborne_events"], "raw_api_content", "7 days", "HARD_DELETE"),
  verifiedRow("airborne_clean", ["clean.clean_airborne_points", "clean.flight_trajectory"], "derived_work", "365 days", "HARD_DELETE"),
  verifiedRow("fids_population", ["clean.flight_population", "clean.raw_fids_query"], "raw_api_content", "24 hours", "HARD_DELETE"),
  verifiedRow("pre_snapshots", ["clean.flight_snapshots"], "derived_work", "365 days", "HARD_DELETE"),
  verifiedRow("airborne_snapshots", ["clean.flight_airborne_snapshots"], "derived_work", "365 days", "HARD_DELETE"),
  verifiedRow("outcomes", ["clean.flight_outcomes"], "derived_work", "365 days", "HARD_DELETE"),
  verifiedRow("history_weather", ["clean.historical_feature_store", "clean.weather_observation", "clean.weather_forecast"], "derived_work", "365 days", "HARD_DELETE"),
  verifiedRow("sampling_frame", ["clean.adb_sampling_frame", "clean.adb_sampling_frame_registry"], "non_aerodatabox_metadata", "Indefinite", "NO_EXPIRY", "Project Internal Schema", "Owner Attestation HAMZA_AHMED_KHAN_20260910_PASS"),
  verifiedRow("coverage_artifacts", ["artifacts/gate1-coverage.json"], "non_aerodatabox_metadata", "Indefinite", "NO_EXPIRY", "Project Internal Schema", "Owner Attestation HAMZA_AHMED_KHAN_20260910_PASS"),
  verifiedRow("probe_ledgers", ["clean.anchor_probe_results", "clean.adb_rest_attempt_ledger"], "non_aerodatabox_metadata", "Indefinite", "NO_EXPIRY", "Project Internal Schema", "Owner Attestation HAMZA_AHMED_KHAN_20260910_PASS"),
  verifiedRow("settlement_ledgers", ["clean.adb_collection_batches", "clean.adb_ingest_events"], "non_aerodatabox_metadata", "Indefinite", "NO_EXPIRY", "Project Internal Schema", "Owner Attestation HAMZA_AHMED_KHAN_20260910_PASS"),
  verifiedRow("manifests", ["clean.final_manifest", "SEPmd/V39_PREPROBE_FREEZE.json"], "non_aerodatabox_metadata", "Indefinite", "NO_EXPIRY", "Project Internal Schema", "Owner Attestation HAMZA_AHMED_KHAN_20260910_PASS"),
  verifiedRow("retention_audit", ["clean.retention_tombstone"], "non_aerodatabox_metadata", "Indefinite", "NO_EXPIRY", "Project Internal Schema", "Owner Attestation HAMZA_AHMED_KHAN_20260910_PASS"),
]);

export const RETENTION_MATRIX_HASH = createHash("sha256")
  .update(JSON.stringify(RETENTION_MATRIX))
  .digest("hex");

export interface RetentionMatrixVerdict {
  pass: boolean;
  failures: string[];
}

/** Prerequisite-P gate: every row must carry verified retention evidence. */
export function verifyRetentionMatrix(rows: readonly RetentionMatrixRow[] = RETENTION_MATRIX): RetentionMatrixVerdict {
  const failures: string[] = [];
  if (rows.length !== RETENTION_MATRIX.length) failures.push(`row-count:${rows.length}-expected-${RETENTION_MATRIX.length}`);
  for (const r of rows) {
    if (!r.contentClass) failures.push("content-class-missing");
    if (!r.tables || r.tables.length === 0) failures.push(`tables-missing:${r.contentClass}`);
    if (!["raw_api_content", "derived_work", "non_aerodatabox_metadata"].includes(r.contentClassification)) {
      failures.push(`classification-invalid:${r.contentClass}`);
    }
    for (const f of ["retentionVerifiedDate", "retentionSource", "retentionLegalBasis", "retentionPeriodDaysOrCondition", "expiryAction"] as const) {
      const v = r[f];
      if (!v || v === "UNVERIFIED" || (f === "retentionVerifiedDate" && !ISO_DATE.test(v))) {
        failures.push(`unverified:${r.contentClass}:${f}`);
      }
    }
  }
  return { pass: failures.length === 0, failures };
}
