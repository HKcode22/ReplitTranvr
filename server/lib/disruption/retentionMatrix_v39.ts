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

function row(
  contentClass: string,
  tables: readonly string[],
  contentClassification: ContentClassification,
): RetentionMatrixRow {
  return {
    contentClass,
    tables,
    contentClassification,
    retentionVerifiedDate: "UNVERIFIED",
    retentionSource: "UNVERIFIED",
    retentionLegalBasis: "UNVERIFIED",
    retentionPeriodDaysOrCondition: "UNVERIFIED",
    expiryAction: "UNVERIFIED",
  };
}

export const RETENTION_MATRIX: readonly RetentionMatrixRow[] = Object.freeze([
  row("webhook_raw_delivery", ["clean.raw_delivery", "clean.raw_delivery_item"], "raw_api_content"),
  row("semantic_events", ["clean.flight_events"], "derived_work"),
  row("current_state_convenience", ["clean.flight_state"], "derived_work"),
  row("airborne_raw", ["clean.raw_airborne_events"], "raw_api_content"),
  row("airborne_clean", ["clean.clean_airborne_points", "clean.flight_trajectory"], "derived_work"),
  row("fids_population", ["clean.flight_population", "clean.raw_fids_query"], "raw_api_content"),
  row("pre_snapshots", ["clean.flight_snapshots"], "derived_work"),
  row("airborne_snapshots", ["clean.flight_airborne_snapshots"], "derived_work"),
  row("outcomes", ["clean.flight_outcomes"], "derived_work"),
  row("history_weather", ["clean.historical_feature_store", "clean.weather_observation", "clean.weather_forecast"], "derived_work"),
  row("sampling_frame", ["clean.adb_sampling_frame", "clean.adb_sampling_frame_registry"], "non_aerodatabox_metadata"),
  row("coverage_artifacts", ["artifacts/gate1-coverage.json"], "non_aerodatabox_metadata"),
  row("probe_ledgers", ["clean.anchor_probe_results", "clean.adb_rest_attempt_ledger"], "non_aerodatabox_metadata"),
  row("settlement_ledgers", ["clean.adb_collection_batches", "clean.adb_ingest_events"], "non_aerodatabox_metadata"),
  row("manifests", ["clean.final_manifest", "SEPmd/V39_PREPROBE_FREEZE.json"], "non_aerodatabox_metadata"),
  row("retention_audit", ["clean.retention_tombstone"], "non_aerodatabox_metadata"),
]);

export const RETENTION_MATRIX_HASH = createHash("sha256")
  .update(JSON.stringify(RETENTION_MATRIX))
  .digest("hex");

export interface RetentionMatrixVerdict {
  pass: boolean;
  failures: string[];
}

/**
 * Runtime evidence overlay (prerequisite-P evidence, never committed).
 *
 * Source control keeps the UNVERIFIED baseline so offline CI stays honest.
 * At prerequisite-P runtime the operator supplies per-class verified evidence
 * (Terms + owner attestation); the verifier overlays it onto the frozen
 * baseline and gates on the result. Unknown content classes are rejected so
 * evidence cannot silently extend the matrix.
 */
export interface RetentionClassEvidence {
  retentionVerifiedDate: string;
  retentionSource: string;
  retentionLegalBasis: string;
  retentionPeriodDaysOrCondition: string;
  expiryAction: string;
}
export type RetentionMatrixEvidence = Record<string, RetentionClassEvidence>;

export function parseRetentionMatrixEvidence(raw: string): RetentionMatrixEvidence {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("retention-matrix-evidence-not-json"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("retention-matrix-evidence-not-object");
  }
  return parsed as RetentionMatrixEvidence;
}

export function resolveRetentionMatrix(evidence: RetentionMatrixEvidence): { rows: RetentionMatrixRow[]; failures: string[] } {
  const failures: string[] = [];
  const known = new Set(RETENTION_MATRIX.map((r) => r.contentClass));
  for (const key of Object.keys(evidence)) {
    if (!known.has(key)) failures.push(`unknown-content-class:${key}`);
  }
  const rows = RETENTION_MATRIX.map((r) => ({ ...r, ...(evidence[r.contentClass] ?? {}) }));
  return { rows, failures };
}

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
