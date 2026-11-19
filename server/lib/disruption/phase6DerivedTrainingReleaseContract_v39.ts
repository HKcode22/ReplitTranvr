/**
 * Phase 6 -> Phase 7 model-release contract.
 *
 * Structural enforcement only: a passing contract is never source-use approval
 * or a paid Phase 6 GO.
 */
const SHA256 = /^[a-f0-9]{64}$/i;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_NAME = /^[a-z][a-z0-9_]{2,80}$/;
const FORBIDDEN_NAME = /(flight|carrier|callsign|tail|registration|airport|icao|iata|route|provider|adb|raw|payload|response|query|hash|timestamp|time|date|schedule|identity|origin|destination|latitude|longitude)/i;

export type Phase6ReleaseHorizon = "T-24h" | "T-6h" | "T-90m";
export interface Phase7ReleaseField {
  name: string;
  bucketCount: number;
  transformEvidenceSha256: string;
}
export interface Phase7DerivedReleaseContract {
  schema: "v39.phase6.phase7-derived-release-contract.v1";
  version: string;
  featureDictionarySha256: string;
  termsReviewSha256: string;
  derivedWorkReviewSha256: string;
  sourceToReleaseMappingExpiryHours: number;
  researchExpiryUtc: string;
  features: readonly Phase7ReleaseField[];
  labels: readonly Phase7ReleaseField[];
  allowedHorizons: readonly Phase6ReleaseHorizon[];
}
export interface Phase7DerivedReleaseRow {
  releaseRowId: string;
  horizon: Phase6ReleaseHorizon;
  split: "train" | "validation" | "test";
  featureBuckets: Record<string, number | null>;
  labelBuckets: Record<string, number | null>;
  missingness: Record<string, boolean>;
}
export interface Phase7ReleaseContractVerdict { pass: boolean; failures: string[]; }

function saneUtc(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function validateFields(kind: string, fields: readonly Phase7ReleaseField[], failures: string[]): void {
  if (!Array.isArray(fields) || fields.length === 0) { failures.push(`${kind}-missing`); return; }
  const names = new Set<string>();
  for (const f of fields) {
    if (!f || !SAFE_NAME.test(f.name ?? "") || FORBIDDEN_NAME.test(f.name)) failures.push(`${kind}-name-forbidden:${f?.name ?? "missing"}`);
    if (names.has(f?.name)) failures.push(`${kind}-name-duplicate:${f?.name}`);
    names.add(f?.name);
    if (!Number.isInteger(f?.bucketCount) || f.bucketCount < 2 || f.bucketCount > 10_000) failures.push(`${kind}-bucket-count-invalid:${f?.name ?? "missing"}`);
    if (!SHA256.test(f?.transformEvidenceSha256 ?? "")) failures.push(`${kind}-transform-evidence-invalid:${f?.name ?? "missing"}`);
  }
}
export function validatePhase7DerivedReleaseContract(contract: Phase7DerivedReleaseContract): Phase7ReleaseContractVerdict {
  const failures: string[] = [];
  if (!contract || contract.schema !== "v39.phase6.phase7-derived-release-contract.v1") failures.push("schema-invalid");
  if (!SAFE_NAME.test(contract?.version ?? "")) failures.push("version-invalid");
  for (const key of ["featureDictionarySha256", "termsReviewSha256", "derivedWorkReviewSha256"] as const)
    if (!SHA256.test(contract?.[key] ?? "")) failures.push(`${key}-invalid`);
  if (!Number.isInteger(contract?.sourceToReleaseMappingExpiryHours) || contract.sourceToReleaseMappingExpiryHours < 1 || contract.sourceToReleaseMappingExpiryHours > 24)
    failures.push("source-to-release-mapping-expiry-invalid");
  if (!saneUtc(contract?.researchExpiryUtc ?? "")) failures.push("research-expiry-invalid");
  validateFields("feature", contract?.features ?? [], failures);
  validateFields("label", contract?.labels ?? [], failures);
  const horizons = contract?.allowedHorizons ?? [];
  if (!Array.isArray(horizons) || horizons.length === 0 || new Set(horizons).size !== horizons.length ||
      horizons.some(h => !["T-24h", "T-6h", "T-90m"].includes(h))) failures.push("horizons-invalid");
  return { pass: failures.length === 0, failures: [...new Set(failures)].sort() };
}
function validateBucketMap(kind: "feature" | "label", values: Record<string, number | null>, fields: readonly Phase7ReleaseField[], failures: string[]): void {
  const byName = new Map(fields.map(f => [f.name, f]));
  for (const name of Object.keys(values ?? {})) if (!byName.has(name)) failures.push(`${kind}-value-not-allowlisted:${name}`);
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(values ?? {}, field.name)) { failures.push(`${kind}-value-missing:${field.name}`); continue; }
    const value = values[field.name];
    if (value !== null && (!Number.isInteger(value) || value < 0 || value >= field.bucketCount)) failures.push(`${kind}-bucket-invalid:${field.name}`);
  }
}
export function validatePhase7DerivedReleaseRow(contract: Phase7DerivedReleaseContract, row: Phase7DerivedReleaseRow): Phase7ReleaseContractVerdict {
  const failures = [...validatePhase7DerivedReleaseContract(contract).failures];
  if (!UUID_V4.test(row?.releaseRowId ?? "")) failures.push("release-row-id-not-random-uuid-v4");
  if (!contract?.allowedHorizons?.includes(row?.horizon)) failures.push("row-horizon-not-allowlisted");
  if (!["train", "validation", "test"].includes(row?.split)) failures.push("row-split-invalid");
  validateBucketMap("feature", row?.featureBuckets, contract?.features ?? [], failures);
  validateBucketMap("label", row?.labelBuckets, contract?.labels ?? [], failures);
  const allowedMissing = new Set([...(contract?.features ?? []), ...(contract?.labels ?? [])].map(x => x.name));
  for (const [name, value] of Object.entries(row?.missingness ?? {})) {
    if (!allowedMissing.has(name)) failures.push(`missingness-not-allowlisted:${name}`);
    if (typeof value !== "boolean") failures.push(`missingness-not-boolean:${name}`);
  }
  return { pass: failures.length === 0, failures: [...new Set(failures)].sort() };
}
export const PHASE6_DERIVED_RELEASE_NEVER_AUTHORIZES_PAID_GO = Object.freeze({
  sourceRightsApproved: false as const,
  authorizationEnabled: false as const,
  phase6PaidGo: false as const,
});