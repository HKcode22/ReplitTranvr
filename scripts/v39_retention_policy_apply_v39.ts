import { createHash } from "crypto";
import { pool } from "../server/db";
import {
  RETENTION_MATRIX,
  RETENTION_MATRIX_HASH,
  parseRetentionMatrixEvidence,
  resolveRetentionMatrix,
  verifyRetentionMatrix,
} from "../server/lib/disruption/retentionMatrix_v39";
import {
  parsePrepaidGovernanceEvidence,
  verifyPrepaidGovernanceEvidence,
} from "../server/lib/disruption/prepaidSecurityRetention_v39";
import { prerequisitePSecurityContractHash } from "../server/lib/disruption/prerequisitePArtifact_v39";

const RAW_CLASSES = ["webhook_raw_delivery", "airborne_raw", "fids_population"] as const;
type RawClass = typeof RAW_CLASSES[number];

interface RuntimePolicyEvidence {
  verifiedDate: string;
  ownerApprovalRef: string;
  rawPolicies: Record<RawClass, {
    retentionSeconds: number;
    retentionSource: string;
    retentionLegalBasis: string;
    expiryAction: string;
  }>;
}
interface DeploymentEvidence { surfaces: Record<string, "DEPLOYED" | "NOT_DEPLOYED" | "UNKNOWN">; }

function parseJson<T>(name: string): T {
  const raw = process.env[name];
  if (!raw) throw new Error(`REFUSED: missing ${name}`);
  try { return JSON.parse(raw) as T; } catch { throw new Error(`REFUSED: ${name} is not valid JSON`); }
}
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}
function sha256(value: string): string { return createHash("sha256").update(value, "utf8").digest("hex"); }
function positiveInteger(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error(`REFUSED: ${label} must be a positive integer number of seconds`);
  return n;
}

export function validateRetentionPolicyInputs(input: {
  matrixEvidenceRaw: string;
  governanceEvidenceRaw: string;
  runtimePolicyEvidenceRaw: string;
  deploymentEvidenceRaw: string;
}): {
  policies: Array<{ contentClass: RawClass; retentionSeconds: number; retentionSource: string; retentionLegalBasis: string; expiryAction: string; ownerApprovalRef: string; policyHash: string }>;
  ownerApprovalRef: string;
} {
  const { rows, failures } = resolveRetentionMatrix(parseRetentionMatrixEvidence(input.matrixEvidenceRaw));
  const matrixVerdict = verifyRetentionMatrix(rows);
  const matrixFailures = [...failures, ...matrixVerdict.failures];
  if (matrixFailures.length) throw new Error(`REFUSED: retention matrix is not verified (${matrixFailures.slice(0, 5).join(",")})`);

  const governance = parsePrepaidGovernanceEvidence(input.governanceEvidenceRaw);
  const governanceVerdict = verifyPrepaidGovernanceEvidence(governance);
  if (!governanceVerdict.pass) throw new Error(`REFUSED: governance evidence incomplete (${governanceVerdict.failures.join(",")})`);

  const runtime = JSON.parse(input.runtimePolicyEvidenceRaw) as RuntimePolicyEvidence;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(runtime.verifiedDate ?? ""))) throw new Error("REFUSED: runtime policy verifiedDate is invalid");
  if (!runtime.ownerApprovalRef?.trim() || runtime.ownerApprovalRef.trim() !== governance.ownerLegalApprovalRef.trim()) throw new Error("REFUSED: owner approval reference mismatch");

  const deployment = JSON.parse(input.deploymentEvidenceRaw) as DeploymentEvidence;
  if (deployment.surfaces?.primary !== "DEPLOYED") throw new Error("REFUSED: primary retention surface must be DEPLOYED");
  for (const surface of ["replica", "backup", "object", "log"]) {
    if (deployment.surfaces?.[surface] !== "NOT_DEPLOYED") throw new Error(`REFUSED: retention surface ${surface} is not explicitly NOT_DEPLOYED`);
  }

  const policies = RAW_CLASSES.map((contentClass) => {
    const runtimeRow = runtime.rawPolicies?.[contentClass];
    if (!runtimeRow) throw new Error(`REFUSED: runtime retention policy missing ${contentClass}`);
    const matrixRow = rows.find((row) => row.contentClass === contentClass);
    if (!matrixRow || matrixRow.contentClassification !== "raw_api_content") throw new Error(`REFUSED: ${contentClass} is not frozen as raw_api_content`);
    const retentionSeconds = positiveInteger(runtimeRow.retentionSeconds, `${contentClass}.retentionSeconds`);
    if (runtimeRow.retentionSource.trim() !== matrixRow.retentionSource.trim()) throw new Error(`REFUSED: ${contentClass} retention source does not match verified matrix`);
    if (runtimeRow.retentionLegalBasis.trim() !== matrixRow.retentionLegalBasis.trim()) throw new Error(`REFUSED: ${contentClass} legal basis does not match verified matrix`);
    if (runtimeRow.expiryAction.trim() !== matrixRow.expiryAction.trim()) throw new Error(`REFUSED: ${contentClass} expiry action does not match verified matrix`);
    const unsigned = {
      content_class: contentClass,
      content_classification: "raw_api_content",
      retention_seconds: retentionSeconds,
      retention_verified_date: runtime.verifiedDate,
      retention_source: runtimeRow.retentionSource,
      retention_legal_basis: runtimeRow.retentionLegalBasis,
      expiry_action: runtimeRow.expiryAction,
      owner_approval_ref: runtime.ownerApprovalRef,
      retention_matrix_hash: RETENTION_MATRIX_HASH,
    };
    return { contentClass, retentionSeconds, retentionSource: runtimeRow.retentionSource, retentionLegalBasis: runtimeRow.retentionLegalBasis, expiryAction: runtimeRow.expiryAction, ownerApprovalRef: runtime.ownerApprovalRef, policyHash: sha256(canonical(unsigned)) };
  });

  return { policies, ownerApprovalRef: runtime.ownerApprovalRef };
}

export async function applyRetentionPolicy(): Promise<void> {
  const matrixEvidenceRaw = process.env.V39_RETENTION_MATRIX_EVIDENCE;
  const governanceEvidenceRaw = process.env.V39_PREPAID_GOVERNANCE_EVIDENCE;
  const runtimePolicyEvidenceRaw = process.env.V39_RETENTION_RUNTIME_POLICY_EVIDENCE;
  const deploymentEvidenceRaw = process.env.V39_RETENTION_DEPLOYMENT_EVIDENCE;
  if (!matrixEvidenceRaw || !governanceEvidenceRaw || !runtimePolicyEvidenceRaw || !deploymentEvidenceRaw) {
    throw new Error("REFUSED: V39_RETENTION_MATRIX_EVIDENCE, V39_PREPAID_GOVERNANCE_EVIDENCE, V39_RETENTION_RUNTIME_POLICY_EVIDENCE and V39_RETENTION_DEPLOYMENT_EVIDENCE are required");
  }
  const validated = validateRetentionPolicyInputs({ matrixEvidenceRaw, governanceEvidenceRaw, runtimePolicyEvidenceRaw, deploymentEvidenceRaw });
  const contractHash = prerequisitePSecurityContractHash();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const schema = await client.query(`SELECT to_regclass('clean.adb_retention_policy_v39') policy, to_regclass('clean.adb_retention_enforcement_event_v39') enforcement`);
    if (!schema.rows[0]?.policy || !schema.rows[0]?.enforcement) throw new Error("REFUSED: retention schema 0048 is not applied");
    for (const p of validated.policies) {
      await client.query(
        `INSERT INTO clean.adb_retention_policy_v39
          (policy_hash,content_class,content_classification,retention_seconds,retention_verified_date,
           retention_source,retention_legal_basis,expiry_action,owner_approval_ref,retention_matrix_hash,effective_from_utc)
         VALUES($1,$2,'raw_api_content',$3,$4,$5,$6,$7,$8,$9,now())
         ON CONFLICT(policy_hash) DO NOTHING`,
        [p.policyHash,p.contentClass,p.retentionSeconds,(JSON.parse(runtimePolicyEvidenceRaw) as RuntimePolicyEvidence).verifiedDate,p.retentionSource,p.retentionLegalBasis,p.expiryAction,p.ownerApprovalRef,RETENTION_MATRIX_HASH],
      );
    }
    await client.query(
      `INSERT INTO clean.adb_retention_enforcement_event_v39(enabled,retention_matrix_hash,security_contract_hash,owner_approval_ref)
       VALUES(true,$1,$2,$3)`,
      [RETENTION_MATRIX_HASH,contractHash,validated.ownerApprovalRef],
    );
    await client.query("COMMIT");
    console.log(JSON.stringify({ status:"PASS", schema:"v39.retention-policy-freeze.v1", retentionMatrixHash:RETENTION_MATRIX_HASH, securityContractHash:contractHash, policyHashes:Object.fromEntries(validated.policies.map((p)=>[p.contentClass,p.policyHash])) }));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  applyRetentionPolicy().catch((error:any)=>{ console.error(JSON.stringify({status:"BLOCKED",error:error?.message??String(error)})); process.exitCode=1; }).finally(async()=>{ await pool.end().catch(()=>undefined); });
}
