import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { RETENTION_MATRIX_HASH } from "./retentionMatrix_v39";
import { PROVIDER_CONTENT_COLUMN_GROUPS } from "./providerContentInventory_v39";

export interface PrepaidSecurityPassArtifactV39 {
  schema_version: "v3.9-prepaid-security-retention-pass-1";
  status: "PASS";
  verified_at_utc: string;
  plan_sha256: string;
  retention_matrix_definition_sha256: string;
  provider_content_inventory_sha256: string;
  retention_deployment_evidence_sha256: string;
  retention_matrix_evidence_sha256: string;
  artifact_sha256: string;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function currentPlanSha256(root = process.cwd()): string {
  return sha256Text(readFileSync(join(root, "SEPmd", "V3.9_DataCollectPlan_f.8.md"), "utf8"));
}

export function currentProviderContentInventorySha256(): string {
  return sha256Text(canonical(PROVIDER_CONTENT_COLUMN_GROUPS));
}

export function buildPrepaidSecurityPassArtifact(input: {
  verifiedAtUtc: string;
  retentionDeploymentEvidenceRaw: string;
  retentionMatrixEvidenceRaw: string;
  root?: string;
}): PrepaidSecurityPassArtifactV39 {
  if (!Number.isFinite(Date.parse(input.verifiedAtUtc))) throw new Error("P_PASS_VERIFIED_AT_INVALID");
  const unsigned = {
    schema_version: "v3.9-prepaid-security-retention-pass-1" as const,
    status: "PASS" as const,
    verified_at_utc: new Date(input.verifiedAtUtc).toISOString(),
    plan_sha256: currentPlanSha256(input.root),
    retention_matrix_definition_sha256: RETENTION_MATRIX_HASH,
    provider_content_inventory_sha256: currentProviderContentInventorySha256(),
    retention_deployment_evidence_sha256: sha256Text(input.retentionDeploymentEvidenceRaw),
    retention_matrix_evidence_sha256: sha256Text(input.retentionMatrixEvidenceRaw),
  };
  return { ...unsigned, artifact_sha256: sha256Text(canonical(unsigned)) };
}

export function verifyPrepaidSecurityPassArtifact(value: unknown, root = process.cwd()): value is PrepaidSecurityPassArtifactV39 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.schema_version !== "v3.9-prepaid-security-retention-pass-1" || candidate.status !== "PASS") return false;
  if (!Number.isFinite(Date.parse(String(candidate.verified_at_utc ?? "")))) return false;
  if (candidate.plan_sha256 !== currentPlanSha256(root)) return false;
  if (candidate.retention_matrix_definition_sha256 !== RETENTION_MATRIX_HASH) return false;
  if (candidate.provider_content_inventory_sha256 !== currentProviderContentInventorySha256()) return false;
  for (const field of ["retention_deployment_evidence_sha256", "retention_matrix_evidence_sha256", "artifact_sha256"]) {
    if (!/^[a-f0-9]{64}$/.test(String(candidate[field] ?? ""))) return false;
  }
  const { artifact_sha256: _ignored, ...unsigned } = candidate;
  return sha256Text(canonical(unsigned)) === candidate.artifact_sha256;
}
