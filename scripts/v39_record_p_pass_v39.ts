/**
 * Records prerequisite-P PASS only after a fresh live security receipt and an
 * independent re-check of the exact Phase-2 prepaid storage scope.
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { buildPrepaidSecurityPassArtifact } from "../server/lib/disruption/prepaidSecurityPass_v39";
import {
  checkLeastPrivilege,
  checkWebhookSecurity,
  type DatabaseRoleEvidence,
  type WebhookSecurityEvidence,
} from "../server/lib/disruption/retentionSecurity_v39";
import {
  verifyRetentionDeploymentEvidence,
  type RetentionDeploymentEvidenceV39,
} from "../server/lib/disruption/retentionDeployment_v39";
import {
  parsePhase2RetentionScopeEvidenceV39,
  verifyPhase2RetentionScopeEvidenceV39,
} from "../server/lib/disruption/phase2RetentionEvidence_v39";
import { verifyPhase2PrepaidSecurityV39 } from "../server/lib/disruption/phase2PrepaidSecurity_v39";
import { verifyPrepaidSecurityVerificationReceiptV39 } from "../server/lib/disruption/prepaidSecurityVerification_v39";
import {
  V39_PROVIDER_BLOB_BUCKET_ENV,
  V39_PROVIDER_BLOB_MODE_ENV,
  V39_PROVIDER_BLOB_REQUIRED_MODE,
} from "../server/lib/disruption/replitProviderBlobStore_v39";
import { v39Pool } from "../server/lib/disruption/db_v39";

function required(name: string): string {
  const raw = process.env[name];
  if (!raw || !raw.trim()) throw new Error(`${name}_REQUIRED`);
  return raw;
}
function parsed<T>(raw: string, name: string): T {
  try { return JSON.parse(raw) as T; }
  catch { throw new Error(`${name}_NOT_JSON`); }
}

async function main(): Promise<void> {
  const dbRaw = required("V39_DB_ROLE_EVIDENCE");
  const webhookRaw = required("V39_WEBHOOK_SECURITY_EVIDENCE");
  const deploymentRaw = required("V39_RETENTION_DEPLOYMENT_EVIDENCE");
  const phase2Raw = required("V39_PHASE2_RETENTION_SCOPE_EVIDENCE");
  const bucketId = required(V39_PROVIDER_BLOB_BUCKET_ENV).trim();
  const mode = required(V39_PROVIDER_BLOB_MODE_ENV).trim().toLowerCase();
  if (mode !== V39_PROVIDER_BLOB_REQUIRED_MODE) throw new Error("P_PASS_REFUSED_PROVIDER_BLOB_MODE_NOT_REQUIRED");

  const db = parsed<DatabaseRoleEvidence>(dbRaw, "V39_DB_ROLE_EVIDENCE");
  const dbVerdict = checkLeastPrivilege(db);
  if (!dbVerdict.pass) throw new Error(`P_PASS_REFUSED_DB_ROLE:${dbVerdict.failures.join(",")}`);

  const webhook = parsed<WebhookSecurityEvidence>(webhookRaw, "V39_WEBHOOK_SECURITY_EVIDENCE");
  const webhookVerdict = checkWebhookSecurity(webhook);
  if (!webhookVerdict.pass) throw new Error(`P_PASS_REFUSED_WEBHOOK:${webhookVerdict.failures.join(",")}`);

  const deployment = parsed<RetentionDeploymentEvidenceV39>(deploymentRaw, "V39_RETENTION_DEPLOYMENT_EVIDENCE");
  const deploymentVerdict = verifyRetentionDeploymentEvidence(deployment);
  if (!deploymentVerdict.pass) throw new Error(`P_PASS_REFUSED_DEPLOYMENT:${deploymentVerdict.failures.slice(0, 8).join(",")}`);

  const scope = parsePhase2RetentionScopeEvidenceV39(phase2Raw);
  const scopeVerdict = verifyPhase2RetentionScopeEvidenceV39(scope);
  if (!scopeVerdict.pass) throw new Error(`P_PASS_REFUSED_PHASE2_SCOPE:${scopeVerdict.failures.join(",")}`);

  const receiptPath = join(process.cwd(), "artifacts", "prepaid-security-retention-verification.json");
  let receipt: unknown;
  try { receipt = JSON.parse(readFileSync(receiptPath, "utf8")); }
  catch (error: any) { throw new Error(`P_PASS_REFUSED_FRESH_VERIFICATION_RECEIPT:${error?.message ?? error}`); }
  const receiptOk = verifyPrepaidSecurityVerificationReceiptV39(receipt, {
    nowUtc: new Date(),
    dbRoleEvidenceRaw: dbRaw,
    webhookSecurityEvidenceRaw: webhookRaw,
    retentionDeploymentEvidenceRaw: deploymentRaw,
    phase2RetentionScopeEvidenceRaw: phase2Raw,
    providerBlobBucketId: bucketId,
    maxAgeMinutes: 10,
  });
  if (!receiptOk) throw new Error("P_PASS_REFUSED_VERIFICATION_RECEIPT_STALE_OR_MISMATCH");

  const live = await verifyPhase2PrepaidSecurityV39();
  if (!live.pass) throw new Error(`P_PASS_REFUSED_LIVE_PHASE2_RUNTIME:${live.failures.slice(0, 8).join(",")}`);
  const incident = await v39Pool.query("SELECT cause FROM clean.adb_incident_stop WHERE resolved=false LIMIT 1");
  if (incident.rowCount) throw new Error(`P_PASS_REFUSED_UNRESOLVED_INCIDENT:${incident.rows[0].cause}`);

  const artifact = buildPrepaidSecurityPassArtifact({
    verifiedAtUtc: new Date().toISOString(),
    dbRoleEvidenceRaw: dbRaw,
    webhookSecurityEvidenceRaw: webhookRaw,
    retentionDeploymentEvidenceRaw: deploymentRaw,
    phase2RetentionScopeEvidenceRaw: phase2Raw,
  });
  const dir = join(process.cwd(), "artifacts");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "prepaid-security-retention-pass.json"), `${JSON.stringify(artifact, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    status: artifact.status,
    schema_version: artifact.schema_version,
    verified_at_utc: artifact.verified_at_utc,
    plan_sha256: artifact.plan_sha256,
    phase2_prepaid_content_scope_sha256: artifact.phase2_prepaid_content_scope_sha256,
    artifact_sha256: artifact.artifact_sha256,
    path: "artifacts/prepaid-security-retention-pass.json",
  }, null, 2));
}

main()
  .catch((error: any) => {
    console.error(`BLOCKED: ${String(error?.message ?? error)}`);
    process.exitCode = 1;
  })
  .finally(async () => { await v39Pool.end().catch(() => undefined); });
