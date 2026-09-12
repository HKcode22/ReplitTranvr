import { createHash } from "crypto";

export type ContentClassification = "raw_api_content" | "derived_work" | "external_source_content" | "non_aerodatabox_metadata";

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

function row(contentClass: string, tables: readonly string[], contentClassification: ContentClassification): RetentionMatrixRow {
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
  row("fids_population", ["clean.flight_population", "clean.fids_query_response"], "raw_api_content"),
  row("pre_snapshots", ["clean.flight_snapshots"], "derived_work"),
  row("airborne_snapshots", ["clean.flight_airborne_snapshots"], "derived_work"),
  row("outcomes", ["clean.flight_outcomes"], "derived_work"),
  row("historical_features", ["clean.historical_feature_store"], "derived_work"),
  // Weather provider rows are not AeroDataBox content and therefore must not
  // inherit AeroDataBox Article-5.6 semantics. Their own source/license basis
  // and retention condition must be verified separately.
  row("weather_source_content", ["clean.weather_observation", "clean.weather_forecast"], "external_source_content"),
  row("sampling_frame", ["clean.adb_sampling_frame", "clean.adb_sampling_frame_registry"], "non_aerodatabox_metadata"),
  row("coverage_artifacts", ["artifacts/gate1-coverage.json"], "non_aerodatabox_metadata"),
  row("probe_ledgers", ["clean.anchor_probe_results", "clean.adb_rest_attempt_ledger"], "non_aerodatabox_metadata"),
  row("settlement_ledgers", ["clean.adb_collection_batches", "clean.adb_ingest_events"], "non_aerodatabox_metadata"),
  row("manifests", ["clean.final_manifest", "SEPmd/V39_PREPROBE_FREEZE.json"], "non_aerodatabox_metadata"),
  row("retention_audit", ["clean.retention_tombstone"], "non_aerodatabox_metadata"),
]);

export const RETENTION_MATRIX_HASH = createHash("sha256").update(JSON.stringify(RETENTION_MATRIX)).digest("hex");

export interface RetentionMatrixVerdict { pass: boolean; failures: string[]; }
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
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("retention-matrix-evidence-not-object");
  return parsed as RetentionMatrixEvidence;
}

/** Evidence overlays may populate evidence fields only; they can never mutate
 * the frozen content-class/table/classification contract through untyped JSON. */
export function resolveRetentionMatrix(evidence: RetentionMatrixEvidence): { rows: RetentionMatrixRow[]; failures: string[] } {
  const failures: string[] = [];
  const known = new Set(RETENTION_MATRIX.map((r) => r.contentClass));
  for (const key of Object.keys(evidence)) if (!known.has(key)) failures.push(`unknown-content-class:${key}`);
  const rows = RETENTION_MATRIX.map((r) => {
    const e = evidence[r.contentClass];
    if (!e) return { ...r };
    return {
      ...r,
      retentionVerifiedDate: String(e.retentionVerifiedDate ?? ""),
      retentionSource: String(e.retentionSource ?? ""),
      retentionLegalBasis: String(e.retentionLegalBasis ?? ""),
      retentionPeriodDaysOrCondition: String(e.retentionPeriodDaysOrCondition ?? ""),
      expiryAction: String(e.expiryAction ?? ""),
    };
  });
  return { rows, failures };
}

function normalized(value: string): string { return value.trim().toLowerCase(); }
function hasDeleteAction(value: string): boolean { return /(hard[_ -]?delete|delete|purge|expire)/i.test(value); }

function verifyClassificationSemantics(r: RetentionMatrixRow, failures: string[]): void {
  const source = normalized(r.retentionSource);
  const basis = normalized(r.retentionLegalBasis);
  const period = normalized(r.retentionPeriodDaysOrCondition);

  if (r.contentClassification === "raw_api_content") {
    if (!source.includes("aerodatabox") && !source.includes("provider")) failures.push(`raw-source-not-provider-terms:${r.contentClass}`);
    if (!basis.includes("5.5") && !basis.includes("raw_api_content")) failures.push(`raw-basis-missing-article-5.5:${r.contentClass}`);
    const dayMatch = period.match(/(?:^|\D)(\d+)\s*[_ -]?days?(?:\D|$)/i);
    if (dayMatch && Number(dayMatch[1]) > 7 && !/(cache-control|max-age|plan[ _-]?terms|explicit[_ -]?provider[_ -]?grant)/i.test(period)) failures.push(`raw-retention-over-7d-without-provider-basis:${r.contentClass}`);
    if (!hasDeleteAction(r.expiryAction)) failures.push(`raw-expiry-not-delete:${r.contentClass}`);
  } else if (r.contentClassification === "derived_work") {
    if (!source.includes("aerodatabox") && !source.includes("provider")) failures.push(`derived-source-not-provider-terms:${r.contentClass}`);
    if (!basis.includes("5.6")) failures.push(`derived-basis-missing-article-5.6:${r.contentClass}`);
    if (!/(non[-_ ]?reconstruct|cannot reconstruct|not reconstruct)/i.test(r.retentionLegalBasis)) failures.push(`derived-nonreconstructability-unproven:${r.contentClass}`);
    if (!/(non[-_ ]?trivial|transform|aggregate|feature engineering|statistical|computational)/i.test(r.retentionLegalBasis)) failures.push(`derived-transformation-unproven:${r.contentClass}`);
  } else if (r.contentClassification === "external_source_content") {
    if (!source || source === "unverified") failures.push(`external-source-unverified:${r.contentClass}`);
    if (!/(license|terms|public domain|open data|permitted use|government)/i.test(r.retentionLegalBasis)) failures.push(`external-license-basis-unproven:${r.contentClass}`);
    if (!r.retentionPeriodDaysOrCondition.trim()) failures.push(`external-retention-condition-unproven:${r.contentClass}`);
  } else {
    if (!/(non[_ -]?aerodatabox[_ -]?metadata|project[_ -]?metadata|no[_ -]?provider[_ -]?content)/i.test(r.retentionLegalBasis)) failures.push(`metadata-provider-independence-unproven:${r.contentClass}`);
  }
}

export function verifyRetentionMatrix(rows: readonly RetentionMatrixRow[] = RETENTION_MATRIX): RetentionMatrixVerdict {
  const failures: string[] = [];
  if (rows.length !== RETENTION_MATRIX.length) failures.push(`row-count:${rows.length}-expected-${RETENTION_MATRIX.length}`);
  for (const r of rows) {
    if (!r.contentClass) failures.push("content-class-missing");
    if (!r.tables || r.tables.length === 0) failures.push(`tables-missing:${r.contentClass}`);
    if (!["raw_api_content", "derived_work", "external_source_content", "non_aerodatabox_metadata"].includes(r.contentClassification)) failures.push(`classification-invalid:${r.contentClass}`);
    let complete = true;
    for (const f of ["retentionVerifiedDate", "retentionSource", "retentionLegalBasis", "retentionPeriodDaysOrCondition", "expiryAction"] as const) {
      const v = r[f];
      if (!v || v === "UNVERIFIED" || (f === "retentionVerifiedDate" && !ISO_DATE.test(v))) { failures.push(`unverified:${r.contentClass}:${f}`); complete = false; }
    }
    if (complete) verifyClassificationSemantics(r, failures);
  }
  return { pass: failures.length === 0, failures: [...new Set(failures)].sort() };
}
