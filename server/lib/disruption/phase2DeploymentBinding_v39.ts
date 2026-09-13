import { createHash } from "crypto";
import { readFileSync } from "fs";

export const PHASE2F_DEPLOYMENT_BINDING_SCHEMA_V39 = "v3.9-phase2f-deployment-binding-1" as const;
export const PHASE2F_DEPLOYMENT_BINDING_MAX_AGE_MS = 30 * 60 * 1000;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const x = value as Record<string, unknown>;
  return `{${Object.keys(x).sort().map((key) => `${JSON.stringify(key)}:${canonical(x[key])}`).join(",")}}`;
}
function sha256(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}
function hashObject(value: unknown): string { return sha256(canonical(value)); }

export interface Phase2FDeploymentBindingArtifactV39 {
  schema_version: typeof PHASE2F_DEPLOYMENT_BINDING_SCHEMA_V39;
  status: "PASS";
  checked_at_utc: string;
  deployment_origin: string;
  diagnostics_path: "/api/v1/collection/diagnostics";
  https: true;
  wrong_secret_rejected_403: true;
  exact_secret_accepted_200: true;
  deployed_v39_runtime_db_read: true;
  open_incidents: 0;
  artifact_sha256: string;
}

export interface LoadedPhase2FDeploymentBindingV39 {
  artifact: Phase2FDeploymentBindingArtifactV39;
  fileSha256: string;
  bindingSha256: string;
  evidenceId: string;
}

export function buildPhase2FDeploymentBindingV39(input: {
  checkedAtUtc: string;
  deploymentOrigin: string;
  openIncidents: number;
}): Phase2FDeploymentBindingArtifactV39 {
  const checked = new Date(input.checkedAtUtc);
  if (!Number.isFinite(checked.getTime())) throw new Error("PHASE2F_DEPLOYMENT_CHECKED_AT_INVALID");
  const origin = new URL(input.deploymentOrigin);
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash) {
    throw new Error("PHASE2F_DEPLOYMENT_ORIGIN_INVALID");
  }
  if (origin.pathname !== "/" && origin.pathname !== "") throw new Error("PHASE2F_DEPLOYMENT_ORIGIN_MUST_BE_ORIGIN_ONLY");
  if (input.openIncidents !== 0) throw new Error(`PHASE2F_DEPLOYMENT_OPEN_INCIDENTS:${input.openIncidents}`);
  const unsigned = {
    schema_version: PHASE2F_DEPLOYMENT_BINDING_SCHEMA_V39,
    status: "PASS" as const,
    checked_at_utc: checked.toISOString(),
    deployment_origin: origin.origin,
    diagnostics_path: "/api/v1/collection/diagnostics" as const,
    https: true as const,
    wrong_secret_rejected_403: true as const,
    exact_secret_accepted_200: true as const,
    deployed_v39_runtime_db_read: true as const,
    open_incidents: 0 as const,
  };
  return { ...unsigned, artifact_sha256: hashObject(unsigned) };
}

export function loadPhase2FDeploymentBindingV39(
  path: string,
  now = new Date(),
  maxAgeMs = PHASE2F_DEPLOYMENT_BINDING_MAX_AGE_MS,
): LoadedPhase2FDeploymentBindingV39 {
  const raw = readFileSync(path, "utf8");
  const fileSha256 = sha256(raw);
  const x = JSON.parse(raw) as Phase2FDeploymentBindingArtifactV39;
  if (x.schema_version !== PHASE2F_DEPLOYMENT_BINDING_SCHEMA_V39 || x.status !== "PASS") {
    throw new Error("PHASE2F_DEPLOYMENT_BINDING_NOT_PASS");
  }
  const { artifact_sha256, ...unsigned } = x;
  if (!/^[a-f0-9]{64}$/i.test(String(artifact_sha256 ?? "")) || hashObject(unsigned) !== artifact_sha256) {
    throw new Error("PHASE2F_DEPLOYMENT_BINDING_ARTIFACT_HASH_INVALID");
  }
  if (x.https !== true || x.wrong_secret_rejected_403 !== true || x.exact_secret_accepted_200 !== true ||
      x.deployed_v39_runtime_db_read !== true || Number(x.open_incidents) !== 0) {
    throw new Error("PHASE2F_DEPLOYMENT_BINDING_CONTROLS_INVALID");
  }
  const checked = Date.parse(x.checked_at_utc);
  if (!Number.isFinite(checked)) throw new Error("PHASE2F_DEPLOYMENT_BINDING_TIME_INVALID");
  const age = now.getTime() - checked;
  if (age < -60_000 || age > maxAgeMs) throw new Error(`PHASE2F_DEPLOYMENT_BINDING_STALE:age_ms=${age}`);
  const origin = new URL(x.deployment_origin);
  if (origin.protocol !== "https:" || origin.origin !== x.deployment_origin) {
    throw new Error("PHASE2F_DEPLOYMENT_BINDING_ORIGIN_INVALID");
  }
  const bindingSha256 = sha256(`v39-phase2f-deployment-binding-v1:${artifact_sha256}:${fileSha256}`);
  const date = new Date(checked).toISOString().slice(0, 10).replaceAll("-", "");
  return {
    artifact: x,
    fileSha256,
    bindingSha256,
    evidenceId: `RUN-${date}-${bindingSha256.toUpperCase()}`,
  };
}
