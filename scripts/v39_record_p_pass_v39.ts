/**
 * Writes the prerequisite-P PASS artifact only after v39:security:verify has
 * already succeeded in the same operator command chain.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { buildPrepaidSecurityPassArtifact } from "../server/lib/disruption/prepaidSecurityPass_v39";
import { verifyProviderContentInventory } from "../server/lib/disruption/providerContentInventory_v39";
import { parseRetentionMatrixEvidence, resolveRetentionMatrix, verifyRetentionMatrix } from "../server/lib/disruption/retentionMatrix_v39";
import { verifyRetentionDeploymentEvidence, type RetentionDeploymentEvidenceV39 } from "../server/lib/disruption/retentionDeployment_v39";

function required(name: string): string {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name}_REQUIRED`);
  return raw;
}

function main(): void {
  const deploymentRaw = required("V39_RETENTION_DEPLOYMENT_EVIDENCE");
  const matrixRaw = required("V39_RETENTION_MATRIX_EVIDENCE");

  const deployment = JSON.parse(deploymentRaw) as RetentionDeploymentEvidenceV39;
  const deploymentVerdict = verifyRetentionDeploymentEvidence(deployment);
  if (!deploymentVerdict.pass) throw new Error(`P_PASS_REFUSED_DEPLOYMENT:${deploymentVerdict.failures.slice(0, 5).join(",")}`);

  const parsedMatrix = parseRetentionMatrixEvidence(matrixRaw);
  const resolved = resolveRetentionMatrix(parsedMatrix);
  const matrixVerdict = verifyRetentionMatrix(resolved.rows);
  const matrixFailures = [...resolved.failures, ...matrixVerdict.failures];
  if (matrixFailures.length) throw new Error(`P_PASS_REFUSED_MATRIX:${matrixFailures.slice(0, 5).join(",")}`);

  const inventory = verifyProviderContentInventory();
  if (!inventory.pass) throw new Error(`P_PASS_REFUSED_COLUMN_COVERAGE:${inventory.failures.slice(0, 5).join(",")}`);

  const artifact = buildPrepaidSecurityPassArtifact({
    verifiedAtUtc: new Date().toISOString(),
    retentionDeploymentEvidenceRaw: deploymentRaw,
    retentionMatrixEvidenceRaw: matrixRaw,
  });
  const dir = join(process.cwd(), "artifacts");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "prepaid-security-retention-pass.json"), `${JSON.stringify(artifact, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    status: artifact.status,
    verified_at_utc: artifact.verified_at_utc,
    plan_sha256: artifact.plan_sha256,
    artifact_sha256: artifact.artifact_sha256,
    path: "artifacts/prepaid-security-retention-pass.json",
  }, null, 2));
}

try { main(); }
catch (error: any) {
  console.error(`BLOCKED: ${String(error?.message ?? error)}`);
  process.exit(1);
}
