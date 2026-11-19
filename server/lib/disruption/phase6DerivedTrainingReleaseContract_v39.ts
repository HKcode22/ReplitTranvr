/**
 * Phase 6 -> Phase 7 model-release field contract.
 *
 * This is a deliberately separate product from the existing source-custody
 * packet. It accepts only bucketed values and controlled research metadata;
 * it cannot certify provider rights, preserve a source response, or enable
 * paid collection. The independent review hashes are evidence references,
 * not an authorization mechanism.
 */
const SHA256 = /^[a-f0-9]{64}$/i;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_NAME = /^[a-z][a-z0-9_]{2,80}$/;
const FORBIDDEN_NAME = /(flight|carrier|callsign|tail|registration|airport|icao|iata|route|provider|adb|raw|payload|response|query|hash|timestamp|time|date|schedule|identity|origin|destination|latitude|longitude|coordinate|serial|record|instance)/i;
const HORIZONS = ["T-24h", "T-6h", "T-90m"] as const;
const FIELD_CLASSES = ["source_independent", "approved_derived", "external_supplement"] as const;
const CENSORING_STATES = ["observed", "censored", "missing", "not_due"] as const;
const SPLITS = ["train", "validation", "test"] as const;

export type Phase6ReleaseHorizon = typeof HORIZONS[number];
export type Phase7ReleaseFieldClass = typeof FIELD_CLASSES[number];
export type Phase7ReleaseCensoring = typeof CENSORING_STATES[number];
export type Phase7ReleaseSplit = typeof SPLITS[number];

export interface Phase7ReleaseField {
  /** A project-defined field name, never a provider field name or identity. */
  name: string;
  /** Model values are integer bucket codes, never copied text or time. */
  bucketCount: number;
  /** How the field is treated by the independent review. */
  fieldClass: Phase7ReleaseFieldClass;
  /** Evidence for the exact transform and reconstruction-risk review. */
  transformEvidenceSha256: string;
  /** A writer may not opt a field into this packet without this assertion. */
  nonReconstructable: true;
}

export interface Phase7DerivedReleaseContract {
  schema: "v39.phase6.phase7-derived-release-contract.v2";
  version: string;
  featureDictionarySha256: string;
  termsReviewSha256: string;
  derivedWorkReviewSha256: string;
  /** Temporary source-to-row linkage is never part of the release packet. */
  sourceToReleaseMappingExpiryHours: number;
  researchExpiryUtc: string;
  /** Numeric cohort domain used to keep grouped observations in one split. */
  cohortBucketCount: number;
  features: readonly Phase7ReleaseField[];
  labels: readonly Phase7ReleaseField[];
  allowedHorizons: readonly Phase6ReleaseHorizon[];
}

export interface Phase7DerivedReleaseRow {
  /** Random UUID v4 format only; this is not a source identity or join key. */
  releaseRowId: string;
  horizon: Phase6ReleaseHorizon;
  cohortBucket: number;
  split: Phase7ReleaseSplit;
  featureBuckets: Record<string, number | null>;
  labelBuckets: Record<string, number | null>;
  /** Exact feature/label missingness is retained without retaining the value. */
  missingness: Record<string, boolean>;
  /** Project-defined non-source quality bit flags. */
  qualityFlags: number;
  /** Prevents censored/not-due rows from becoming invented negatives. */
  censoring: Phase7ReleaseCensoring;
}

export interface Phase7ReleaseContractVerdict {
  pass: boolean;
  failures: string[];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function nonPlaceholderSha(value: unknown): value is string {
  return typeof value === "string" && SHA256.test(value) && !/^([a-f0-9])\1{63}$/i.test(value);
}

function saneUtc(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  return Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function fieldNames(fields: readonly Phase7ReleaseField[]): string[] {
  return fields.filter((field): field is Phase7ReleaseField => Boolean(field) && typeof field.name === "string").map(field => field.name);
}

function validateFields(kind: "feature" | "label", fields: unknown, failures: string[]): void {
  if (!Array.isArray(fields) || fields.length === 0) {
    failures.push(`${kind}-missing`);
    return;
  }
  const names = new Set<string>();
  for (const raw of fields) {
    if (!isPlainRecord(raw)) {
      failures.push(`${kind}-field-invalid`);
      continue;
    }
    const field = raw as Partial<Phase7ReleaseField>;
    if (!hasExactKeys(raw, ["name", "bucketCount", "fieldClass", "transformEvidenceSha256", "nonReconstructable"])) {
      failures.push(`${kind}-field-extra-or-missing-keys:${typeof field.name === "string" ? field.name : "missing"}`);
    }
    if (typeof field.name !== "string" || !SAFE_NAME.test(field.name) || FORBIDDEN_NAME.test(field.name)) {
      failures.push(`${kind}-name-forbidden:${typeof field.name === "string" ? field.name : "missing"}`);
    }
    if (typeof field.name === "string") {
      if (names.has(field.name)) failures.push(`${kind}-name-duplicate:${field.name}`);
      names.add(field.name);
    }
    if (!Number.isInteger(field.bucketCount) || field.bucketCount < 2 || field.bucketCount > 4096) {
      failures.push(`${kind}-bucket-count-invalid:${typeof field.name === "string" ? field.name : "missing"}`);
    }
    if (!FIELD_CLASSES.includes(field.fieldClass as Phase7ReleaseFieldClass)) {
      failures.push(`${kind}-field-class-invalid:${typeof field.name === "string" ? field.name : "missing"}`);
    }
    if (!nonPlaceholderSha(field.transformEvidenceSha256)) {
      failures.push(`${kind}-transform-evidence-invalid:${typeof field.name === "string" ? field.name : "missing"}`);
    }
    if (field.nonReconstructable !== true) {
      failures.push(`${kind}-nonreconstructable-review-required:${typeof field.name === "string" ? field.name : "missing"}`);
    }
  }
}

/** Structural validation only. Passing never grants source rights or paid GO. */
export function validatePhase7DerivedReleaseContract(
  contract: Phase7DerivedReleaseContract,
): Phase7ReleaseContractVerdict {
  const failures: string[] = [];
  if (!isPlainRecord(contract)) return { pass: false, failures: ["contract-not-object"] };
  const contractRecord = contract as unknown as Record<string, unknown>;
  if (!hasExactKeys(contractRecord, [
    "schema", "version", "featureDictionarySha256", "termsReviewSha256", "derivedWorkReviewSha256",
    "sourceToReleaseMappingExpiryHours", "researchExpiryUtc", "cohortBucketCount", "features", "labels", "allowedHorizons",
  ])) failures.push("contract-extra-or-missing-keys");
  if (contract.schema !== "v39.phase6.phase7-derived-release-contract.v2") failures.push("schema-invalid");
  if (typeof contract.version !== "string" || !SAFE_NAME.test(contract.version)) failures.push("version-invalid");
  for (const key of ["featureDictionarySha256", "termsReviewSha256", "derivedWorkReviewSha256"] as const) {
    if (!nonPlaceholderSha(contract[key])) failures.push(`${key}-invalid`);
  }
  if (!Number.isInteger(contract.sourceToReleaseMappingExpiryHours) ||
      contract.sourceToReleaseMappingExpiryHours < 1 || contract.sourceToReleaseMappingExpiryHours > 24) {
    failures.push("source-to-release-mapping-expiry-invalid");
  }
  if (!saneUtc(contract.researchExpiryUtc)) failures.push("research-expiry-invalid");
  if (!Number.isInteger(contract.cohortBucketCount) || contract.cohortBucketCount < 1 || contract.cohortBucketCount > 4096) {
    failures.push("cohort-bucket-count-invalid");
  }
  validateFields("feature", contract.features, failures);
  validateFields("label", contract.labels, failures);
  const features = Array.isArray(contract.features) ? contract.features as Phase7ReleaseField[] : [];
  const labels = Array.isArray(contract.labels) ? contract.labels as Phase7ReleaseField[] : [];
  const labelNames = new Set(fieldNames(labels));
  for (const name of fieldNames(features)) if (labelNames.has(name)) failures.push(`feature-label-name-overlap:${name}`);
  const horizons = contract.allowedHorizons;
  if (!Array.isArray(horizons) || horizons.length === 0 || new Set(horizons).size !== horizons.length ||
      horizons.some(horizon => !HORIZONS.includes(horizon as Phase6ReleaseHorizon))) failures.push("horizons-invalid");
  return { pass: failures.length === 0, failures: [...new Set(failures)].sort() };
}

function validateBucketMap(
  kind: "feature" | "label",
  values: unknown,
  fields: readonly Phase7ReleaseField[],
  failures: string[],
): void {
  if (!isPlainRecord(values)) {
    failures.push(`${kind}-map-invalid`);
    return;
  }
  const byName = new Map(fields.map(field => [field.name, field]));
  for (const name of Object.keys(values)) if (!byName.has(name)) failures.push(`${kind}-value-not-allowlisted:${name}`);
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(values, field.name)) {
      failures.push(`${kind}-value-missing:${field.name}`);
      continue;
    }
    const value = values[field.name];
    if (value !== null && (!Number.isInteger(value) || value < 0 || value >= field.bucketCount)) {
      failures.push(`${kind}-bucket-invalid:${field.name}`);
    }
  }
}

/**
 * Validates a row after all source-to-release linkage has been removed. The
 * exact-key and numeric-only checks are intentional: a future writer cannot
 * smuggle a flight identifier, timestamp, response hash or route into the
 * packet under an unreviewed extra property.
 */
export function validatePhase7DerivedReleaseRow(
  contract: Phase7DerivedReleaseContract,
  row: Phase7DerivedReleaseRow,
): Phase7ReleaseContractVerdict {
  const failures = [...validatePhase7DerivedReleaseContract(contract).failures];
  if (!isPlainRecord(row)) return { pass: false, failures: [...new Set([...failures, "row-not-object"])] };
  const rowRecord = row as unknown as Record<string, unknown>;
  if (!hasExactKeys(rowRecord, ["releaseRowId", "horizon", "cohortBucket", "split", "featureBuckets", "labelBuckets", "missingness", "qualityFlags", "censoring"])) {
    failures.push("row-extra-or-missing-keys");
  }
  if (typeof row.releaseRowId !== "string" || !UUID_V4.test(row.releaseRowId)) failures.push("release-row-id-not-random-uuid-v4");
  if (!Array.isArray(contract.allowedHorizons) || !contract.allowedHorizons.includes(row.horizon)) failures.push("row-horizon-not-allowlisted");
  if (!SPLITS.includes(row.split)) failures.push("row-split-invalid");
  if (!Number.isInteger(row.cohortBucket) || !Number.isInteger(contract.cohortBucketCount) ||
      row.cohortBucket < 0 || row.cohortBucket >= contract.cohortBucketCount) failures.push("row-cohort-bucket-invalid");
  if (!Number.isInteger(row.qualityFlags) || row.qualityFlags < 0 || row.qualityFlags > 0xffffffff) failures.push("row-quality-flags-invalid");
  if (!CENSORING_STATES.includes(row.censoring)) failures.push("row-censoring-invalid");

  const features = Array.isArray(contract.features) ? contract.features : [];
  const labels = Array.isArray(contract.labels) ? contract.labels : [];
  validateBucketMap("feature", row.featureBuckets, features, failures);
  validateBucketMap("label", row.labelBuckets, labels, failures);

  const names = [...fieldNames(features), ...fieldNames(labels)];
  if (!isPlainRecord(row.missingness)) {
    failures.push("missingness-map-invalid");
  } else {
    const expected = [...new Set(names)].sort();
    if (!hasExactKeys(row.missingness, expected)) failures.push("missingness-keys-not-exact");
    for (const name of Object.keys(row.missingness)) {
      if (!expected.includes(name)) failures.push(`missingness-not-allowlisted:${name}`);
      if (typeof row.missingness[name] !== "boolean") failures.push(`missingness-not-boolean:${name}`);
    }
    for (const name of expected) {
      const value = Object.prototype.hasOwnProperty.call(row.featureBuckets ?? {}, name)
        ? row.featureBuckets[name]
        : row.labelBuckets[name];
      if (typeof row.missingness[name] === "boolean" && row.missingness[name] !== (value === null)) {
        failures.push(`missingness-mismatch:${name}`);
      }
    }
  }

  if (CENSORING_STATES.includes(row.censoring) && row.censoring !== "observed" && isPlainRecord(row.labelBuckets) &&
      Object.values(row.labelBuckets).some(value => value !== null)) {
    failures.push("censored-row-label-must-be-null");
  }
  return { pass: failures.length === 0, failures: [...new Set(failures)].sort() };
}

/** A release-contract pass never promotes Phase 5/6 state. */
export const PHASE6_DERIVED_RELEASE_NEVER_AUTHORIZES_PAID_GO = Object.freeze({
  sourceRightsApproved: false as const,
  authorizationEnabled: false as const,
  phase6PaidGo: false as const,
  retentionExtensionGranted: false as const,
  sourceToReleaseMappingPersisted: false as const,
});
