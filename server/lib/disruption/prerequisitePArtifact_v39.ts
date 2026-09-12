import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import { PREPAID_SECURITY_RETENTION_CONTROL_IDS } from "./prepaidSecurityRetention_v39";

export const PREREQUISITE_P_PHASE_GATE = "Phase 2 / prerequisite P" as const;
export const PREREQUISITE_P_SCHEMA_VERSION = "v3.9-prepaid-security-retention-3" as const;
export const PREREQUISITE_P_ARTIFACT_RELATIVE_PATH = "artifacts/prepaid-security-retention.json" as const;
export const PREREQUISITE_P_REQUIRED_CHECKS = PREPAID_SECURITY_RETENTION_CONTROL_IDS;

export const PREREQUISITE_P_CONTRACT_FILES = Object.freeze([
  "server/lib/disruption/prerequisitePArtifact_v39.ts",
  "server/lib/disruption/prepaidSecurityRetention_v39.ts",
  "server/lib/disruption/retentionMatrix_v39.ts",
  "server/lib/disruption/retentionSecurity_v39.ts",
  "server/lib/disruption/rawIngress_v3.ts",
  "server/lib/disruption/flightDataPrePostStore_v3.ts",
  "server/lib/disruption/fidsCensus_v3.ts",
  "server/lib/disruption/settlement_v3.ts",
  "server/lib/disruption/probeExecution_v39.ts",
  "server/lib/disruption/phase6SafetyWatchdog_v39.ts",
  "server/lib/disruption/adbCollectionController_v3.ts",
  "server/routes_v3.ts",
  "scripts/v39_security_verify_v39.ts",
  "scripts/export_v39_env.sh",
] as const);

export interface PrerequisitePCheckEvidence {
  name: string;
  pass: true;
  detail_sha256: string;
}

export interface PrerequisitePArtifact {
  schema_version: typeof PREREQUISITE_P_SCHEMA_VERSION;
  phase_gate: typeof PREREQUISITE_P_PHASE_GATE;
  status: "PASS";
  verified_at_utc: string;
  code_sha: string;
  security_contract_sha256: string;
  retention_matrix_sha256: string;
  checks: PrerequisitePCheckEvidence[];
  artifact_sha256: string;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function currentGitSha(cwd = process.cwd()): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).trim();
}

export function prerequisitePSecurityContractHash(root = process.cwd()): string {
  const pieces = PREREQUISITE_P_CONTRACT_FILES.map((relativePath) => {
    const absolutePath = join(root, relativePath);
    if (!existsSync(absolutePath)) throw new Error(`missing-prerequisite-p-contract-file:${relativePath}`);
    return { path: relativePath, sha256: sha256Hex(readFileSync(absolutePath, "utf8")) };
  });
  return sha256Hex(canonical(pieces));
}

export function buildPrerequisitePArtifact(input: {
  verifiedAtUtc: string;
  codeSha: string;
  securityContractSha256: string;
  retentionMatrixSha256: string;
  checks: readonly { name: string; pass: boolean; detail: string }[];
}): PrerequisitePArtifact {
  if (!Number.isFinite(Date.parse(input.verifiedAtUtc))) throw new Error("invalid-prerequisite-p-time");
  if (!/^[a-f0-9]{40}$/i.test(input.codeSha)) throw new Error("invalid-prerequisite-p-code-sha");
  if (!/^[a-f0-9]{64}$/i.test(input.securityContractSha256)) throw new Error("invalid-prerequisite-p-contract-hash");
  if (!/^[a-f0-9]{64}$/i.test(input.retentionMatrixSha256)) throw new Error("invalid-prerequisite-p-matrix-hash");

  const byName = new Map(input.checks.map((check) => [check.name, check]));
  const checkEvidence: PrerequisitePCheckEvidence[] = [];
  for (const name of PREREQUISITE_P_REQUIRED_CHECKS) {
    const check = byName.get(name);
    if (!check || !check.pass) throw new Error(`prerequisite-p-check-not-pass:${name}`);
    checkEvidence.push({ name, pass: true, detail_sha256: sha256Hex(check.detail) });
  }
  if (input.checks.some((check) => !PREREQUISITE_P_REQUIRED_CHECKS.includes(check.name as any))) {
    throw new Error("prerequisite-p-unexpected-check");
  }

  const unsigned = {
    schema_version: PREREQUISITE_P_SCHEMA_VERSION,
    phase_gate: PREREQUISITE_P_PHASE_GATE,
    status: "PASS" as const,
    verified_at_utc: input.verifiedAtUtc,
    code_sha: input.codeSha.toLowerCase(),
    security_contract_sha256: input.securityContractSha256.toLowerCase(),
    retention_matrix_sha256: input.retentionMatrixSha256.toLowerCase(),
    checks: checkEvidence,
  };
  return { ...unsigned, artifact_sha256: sha256Hex(canonical(unsigned)) };
}

export function verifyPrerequisitePArtifact(
  value: unknown,
  expected: { securityContractSha256?: string; retentionMatrixSha256?: string } = {},
): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { pass: false, failures: ["artifact-not-object"] };
  const artifact = value as Partial<PrerequisitePArtifact>;
  if (artifact.schema_version !== PREREQUISITE_P_SCHEMA_VERSION) failures.push("schema-version");
  if (artifact.phase_gate !== PREREQUISITE_P_PHASE_GATE) failures.push("phase-gate");
  if (artifact.status !== "PASS") failures.push("status-not-pass");
  if (!artifact.verified_at_utc || !Number.isFinite(Date.parse(artifact.verified_at_utc))) failures.push("verified-at");
  if (!artifact.code_sha || !/^[a-f0-9]{40}$/i.test(artifact.code_sha)) failures.push("code-sha");
  if (!artifact.security_contract_sha256 || !/^[a-f0-9]{64}$/i.test(artifact.security_contract_sha256)) failures.push("security-contract-hash");
  if (!artifact.retention_matrix_sha256 || !/^[a-f0-9]{64}$/i.test(artifact.retention_matrix_sha256)) failures.push("matrix-hash");
  if (expected.securityContractSha256 && artifact.security_contract_sha256?.toLowerCase() !== expected.securityContractSha256.toLowerCase()) failures.push("security-contract-hash-mismatch");
  if (expected.retentionMatrixSha256 && artifact.retention_matrix_sha256?.toLowerCase() !== expected.retentionMatrixSha256.toLowerCase()) failures.push("matrix-hash-mismatch");

  const checks = Array.isArray(artifact.checks) ? artifact.checks : [];
  const names = checks.map((check: any) => check?.name);
  for (const required of PREREQUISITE_P_REQUIRED_CHECKS) {
    const found = checks.find((check: any) => check?.name === required);
    if (!found || found.pass !== true || !/^[a-f0-9]{64}$/i.test(String(found.detail_sha256 ?? ""))) failures.push(`check:${required}`);
  }
  if (names.length !== PREREQUISITE_P_REQUIRED_CHECKS.length || new Set(names).size !== names.length) failures.push("check-set");

  if (artifact.artifact_sha256 && /^[a-f0-9]{64}$/i.test(artifact.artifact_sha256)) {
    const unsigned = {
      schema_version: artifact.schema_version,
      phase_gate: artifact.phase_gate,
      status: artifact.status,
      verified_at_utc: artifact.verified_at_utc,
      code_sha: artifact.code_sha,
      security_contract_sha256: artifact.security_contract_sha256,
      retention_matrix_sha256: artifact.retention_matrix_sha256,
      checks: artifact.checks,
    };
    if (sha256Hex(canonical(unsigned)) !== artifact.artifact_sha256.toLowerCase()) failures.push("artifact-hash-mismatch");
  } else failures.push("artifact-hash");

  return { pass: failures.length === 0, failures: [...new Set(failures)].sort() };
}

export function readCurrentPrerequisitePArtifact(
  root = process.cwd(),
  retentionMatrixSha256?: string,
): { pass: boolean; failures: string[]; artifact: PrerequisitePArtifact | null } {
  const path = join(root, PREREQUISITE_P_ARTIFACT_RELATIVE_PATH);
  if (!existsSync(path)) return { pass: false, failures: ["artifact-missing"], artifact: null };
  try {
    const artifact = JSON.parse(readFileSync(path, "utf8")) as PrerequisitePArtifact;
    const verdict = verifyPrerequisitePArtifact(artifact, {
      securityContractSha256: prerequisitePSecurityContractHash(root),
      retentionMatrixSha256,
    });
    return { ...verdict, artifact: verdict.pass ? artifact : null };
  } catch (error: any) {
    return { pass: false, failures: [`artifact-unreadable:${error?.message ?? error}`], artifact: null };
  }
}

export function serializePrerequisitePArtifact(artifact: PrerequisitePArtifact): string {
  return `${canonical(artifact)}\n`;
}
