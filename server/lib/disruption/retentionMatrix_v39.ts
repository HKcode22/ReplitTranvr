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

/**
 * Table-level retention matrix.
 *
 * Deliberately conservative for mixed tables: if copied AeroDataBox values are
 * still present, the whole table remains raw_api_content at this layer. Exact
 * longer-lived exceptions belong in providerContentInventory_v39 and require
 * proof for the retained columns/output, not a table-name assertion.
 */
export const RETENTION_MATRIX: readonly RetentionMatrixRow[] = Object.freeze([
  row("webhook_ingress", ["clean.raw_delivery", "clean.raw_delivery_item", "clean.processing_attempt"], "raw_api_content"),
  row("webhook_identity_schedule", ["clean.webhook_flight_identity", "clean.webhook_flight_schedule_version", "clean.webhook_identity_resolution"], "raw_api_content"),
  row("webhook_ingest_ledger_mixed", ["clean.adb_ingest_events"], "raw_api_content"),
  row("latest_state_convenience", ["clean.flight_data_pre_post"], "raw_api_content"),
  row("semantic_events_mixed", ["clean.flight_events"], "raw_api_content"),
  row("airborne_raw", ["clean.raw_airborne_events"], "raw_api_content"),
  row("airborne_clean_mixed", ["clean.clean_airborne_points", "clean.flight_trajectory"], "raw_api_content"),
  row("fids_population", ["clean.flight_population", "clean.fids_query_response"], "raw_api_content"),
  row("pre_snapshots", ["clean.flight_snapshots"], "derived_work"),
  row("airborne_snapshots_mixed", ["clean.flight_airborne_snapshots"], "raw_api_content"),
  row("outcomes", ["clean.flight_outcomes"], "derived_work"),
  row("history_weather", ["clean.historical_feature_store", "clean.weather_observation", "clean.weather_forecast"], "derived_work"),
  row("probe_ledger_mixed", ["clean.adb_anchor_probe"], "raw_api_content"),
  row("collection_batch_ledger_mixed", ["clean.adb_collection_batches"], "raw_api_content"),
  row("sampling_frame", ["clean.adb_sampling_frame", "clean.adb_sampling_frame_registry"], "non_aerodatabox_metadata"),
  row("rest_attempt_ledger", ["clean.adb_rest_attempt_ledger"], "non_aerodatabox_metadata"),
  row("collection_segments", ["clean.adb_collection_segments"], "non_aerodatabox_metadata"),
  row("coverage_artifacts", ["artifacts/gate1-coverage.json"], "non_aerodatabox_metadata"),
  row("retention_audit", ["clean.retention_tombstone"], "non_aerodatabox_metadata"),
]);

export const RETENTION_MATRIX_HASH = createHash("sha256")
  .update(JSON.stringify(RETENTION_MATRIX))
  .digest("hex");

export interface RetentionMatrixVerdict {
  pass: boolean;
  failures: string[];
}

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

function normalized(value: string): string { return value.trim().toLowerCase(); }
function hasDeleteAction(value: string): boolean { return /(hard[_ -]?delete|delete|purge|expire)/i.test(value); }

/** Return the smallest explicit time quantity in hours, or null if none is parseable. */
function explicitPeriodHours(value: string): number | null {
  const candidates: number[] = [];
  for (const match of value.matchAll(/(?:^|\D)(\d+(?:\.\d+)?)\s*hours?(?:\D|$)/gi)) {
    const n = Number(match[1]);
    if (Number.isFinite(n)) candidates.push(n);
  }
  for (const match of value.matchAll(/(?:^|\D)(\d+(?:\.\d+)?)\s*days?(?:\D|$)/gi)) {
    const n = Number(match[1]);
    if (Number.isFinite(n)) candidates.push(n * 24);
  }
  return candidates.length ? Math.min(...candidates) : null;
}

function verifyClassificationSemantics(r: RetentionMatrixRow, failures: string[]): void {
  const source = normalized(r.retentionSource);
  const basis = normalized(r.retentionLegalBasis);
  const period = normalized(r.retentionPeriodDaysOrCondition);

  if (r.contentClassification === "raw_api_content") {
    if (!source.includes("aerodatabox") && !source.includes("provider")) {
      failures.push(`raw-source-not-provider-terms:${r.contentClass}`);
    }
    if (!basis.includes("5.5") && !basis.includes("raw_api_content")) {
      failures.push(`raw-basis-missing-article-5.5:${r.contentClass}`);
    }

    const declaredHours = explicitPeriodHours(period);
    const allowsLongerByProviderBasis = /(cache-control|max-age|plan[ _-]?terms|explicit[_ -]?provider[_ -]?grant)/i.test(period);
    if (declaredHours !== null && declaredHours > 168 && !allowsLongerByProviderBasis) {
      failures.push(`raw-retention-over-7d-without-provider-basis:${r.contentClass}`);
    }

    // Owner/account-plan evidence supplied for this project makes live FIDS a
    // stricter hard class than generic Article-5.5 raw content. The matrix must
    // itself prove <=24h; deployment-policy checks alone are not sufficient.
    if (r.contentClass === "fids_population") {
      if (declaredHours === null) failures.push("fids-retention-24h-unproven:fids_population");
      else if (declaredHours > 24) failures.push("fids-retention-over-24h:fids_population");
      if (!/(plan|account|provider)/i.test(`${r.retentionSource} ${r.retentionLegalBasis} ${r.retentionPeriodDaysOrCondition}`)) {
        failures.push("fids-retention-account-basis-unproven:fids_population");
      }
    }

    if (!hasDeleteAction(r.expiryAction)) failures.push(`raw-expiry-not-delete:${r.contentClass}`);
  } else if (r.contentClassification === "derived_work") {
    if (!source.includes("aerodatabox") && !source.includes("provider")) {
      failures.push(`derived-source-not-provider-terms:${r.contentClass}`);
    }
    if (!basis.includes("5.6")) failures.push(`derived-basis-missing-article-5.6:${r.contentClass}`);
    if (!/(non[-_ ]?reconstruct|cannot reconstruct|not reconstruct)/i.test(r.retentionLegalBasis)) {
      failures.push(`derived-nonreconstructability-unproven:${r.contentClass}`);
    }
    if (!/(non[-_ ]?trivial|transform|aggregate|feature engineering|statistical|computational)/i.test(r.retentionLegalBasis)) {
      failures.push(`derived-transformation-unproven:${r.contentClass}`);
    }
  } else {
    if (!/(non[_ -]?aerodatabox[_ -]?metadata|project[_ -]?metadata|no[_ -]?provider[_ -]?content)/i.test(r.retentionLegalBasis)) {
      failures.push(`metadata-provider-independence-unproven:${r.contentClass}`);
    }
  }
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
    let complete = true;
    for (const f of ["retentionVerifiedDate", "retentionSource", "retentionLegalBasis", "retentionPeriodDaysOrCondition", "expiryAction"] as const) {
      const v = r[f];
      if (!v || v === "UNVERIFIED" || (f === "retentionVerifiedDate" && !ISO_DATE.test(v))) {
        failures.push(`unverified:${r.contentClass}:${f}`);
        complete = false;
      }
    }
    if (complete) verifyClassificationSemantics(r, failures);
  }
  return { pass: failures.length === 0, failures: [...new Set(failures)].sort() };
}
