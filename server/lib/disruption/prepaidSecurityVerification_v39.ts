import { createHash } from "crypto";
import { PHASE2_PREPAID_CONTENT_SCOPE_SHA256 } from "./phase2PrepaidContentScope_v39";
import { currentPlanSha256, currentProviderContentInventorySha256 } from "./prepaidSecurityPass_v39";

export interface PrepaidSecurityVerificationReceiptV39 {
  schema_version: "v3.9-prepaid-security-verification-receipt-1";
  status: "PASS";
  verified_at_utc: string;
  plan_sha256: string;
  provider_content_inventory_sha256: string;
  phase2_prepaid_content_scope_sha256: string;
  db_role_evidence_sha256: string;
  webhook_security_evidence_sha256: string;
  retention_deployment_evidence_sha256: string;
  phase2_retention_scope_evidence_sha256: string;
  provider_blob_bucket_id_sha256: string;
  provider_blob_mode: "required";
  artifact_sha256: string;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}
function sha(raw: string): string { return createHash("sha256").update(raw, "utf8").digest("hex"); }

export function buildPrepaidSecurityVerificationReceiptV39(input: {
  verifiedAtUtc: string;
  dbRoleEvidenceRaw: string;
  webhookSecurityEvidenceRaw: string;
  retentionDeploymentEvidenceRaw: string;
  phase2RetentionScopeEvidenceRaw: string;
  providerBlobBucketId: string;
  root?: string;
}): PrepaidSecurityVerificationReceiptV39 {
  if (!Number.isFinite(Date.parse(input.verifiedAtUtc))) throw new Error("P_RECEIPT_VERIFIED_AT_INVALID");
  if (!input.providerBlobBucketId.trim()) throw new Error("P_RECEIPT_BUCKET_ID_REQUIRED");
  const unsigned = {
    schema_version: "v3.9-prepaid-security-verification-receipt-1" as const,
    status: "PASS" as const,
    verified_at_utc: new Date(input.verifiedAtUtc).toISOString(),
    plan_sha256: currentPlanSha256(input.root),
    provider_content_inventory_sha256: currentProviderContentInventorySha256(),
    phase2_prepaid_content_scope_sha256: PHASE2_PREPAID_CONTENT_SCOPE_SHA256,
    db_role_evidence_sha256: sha(input.dbRoleEvidenceRaw),
    webhook_security_evidence_sha256: sha(input.webhookSecurityEvidenceRaw),
    retention_deployment_evidence_sha256: sha(input.retentionDeploymentEvidenceRaw),
    phase2_retention_scope_evidence_sha256: sha(input.phase2RetentionScopeEvidenceRaw),
    provider_blob_bucket_id_sha256: sha(input.providerBlobBucketId.trim()),
    provider_blob_mode: "required" as const,
  };
  return { ...unsigned, artifact_sha256: sha(canonical(unsigned)) };
}

export function verifyPrepaidSecurityVerificationReceiptV39(
  value: unknown,
  input: {
    nowUtc: Date;
    dbRoleEvidenceRaw: string;
    webhookSecurityEvidenceRaw: string;
    retentionDeploymentEvidenceRaw: string;
    phase2RetentionScopeEvidenceRaw: string;
    providerBlobBucketId: string;
    maxAgeMinutes?: number;
    root?: string;
  },
): value is PrepaidSecurityVerificationReceiptV39 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const c = value as Record<string, unknown>;
  if (c.schema_version !== "v3.9-prepaid-security-verification-receipt-1" || c.status !== "PASS") return false;
  const verifiedMs = Date.parse(String(c.verified_at_utc ?? ""));
  if (!Number.isFinite(verifiedMs) || !Number.isFinite(input.nowUtc.getTime())) return false;
  const ageMs = input.nowUtc.getTime() - verifiedMs;
  const maxAgeMs = (input.maxAgeMinutes ?? 10) * 60_000;
  if (ageMs < 0 || ageMs > maxAgeMs) return false;
  if (c.plan_sha256 !== currentPlanSha256(input.root)) return false;
  if (c.provider_content_inventory_sha256 !== currentProviderContentInventorySha256()) return false;
  if (c.phase2_prepaid_content_scope_sha256 !== PHASE2_PREPAID_CONTENT_SCOPE_SHA256) return false;
  if (c.db_role_evidence_sha256 !== sha(input.dbRoleEvidenceRaw)) return false;
  if (c.webhook_security_evidence_sha256 !== sha(input.webhookSecurityEvidenceRaw)) return false;
  if (c.retention_deployment_evidence_sha256 !== sha(input.retentionDeploymentEvidenceRaw)) return false;
  if (c.phase2_retention_scope_evidence_sha256 !== sha(input.phase2RetentionScopeEvidenceRaw)) return false;
  if (c.provider_blob_bucket_id_sha256 !== sha(input.providerBlobBucketId.trim())) return false;
  if (c.provider_blob_mode !== "required") return false;
  if (!/^[a-f0-9]{64}$/.test(String(c.artifact_sha256 ?? ""))) return false;
  const { artifact_sha256: _ignored, ...unsigned } = c;
  return sha(canonical(unsigned)) === c.artifact_sha256;
}
