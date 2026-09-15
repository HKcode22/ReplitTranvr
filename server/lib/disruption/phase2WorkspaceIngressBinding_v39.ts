import { createHash } from "crypto";
import { readFileSync } from "fs";

export const PHASE2F_WORKSPACE_INGRESS_SCHEMA_V39 = "v3.9-phase2f-workspace-ingress-binding-1" as const;
export const PHASE2F_WORKSPACE_INGRESS_MAX_AGE_MS = 30 * 60 * 1000;

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
function requireSha(value: unknown, label: string): string {
  const text = String(value ?? "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(text)) throw new Error(`PHASE2F_WORKSPACE_INGRESS_${label}_INVALID`);
  return text;
}

export interface Phase2FWorkspaceSourceCompatibilityV39 {
  path: string;
  runtime_sha256: string;
  current_sha256: string;
  match: true;
}

export interface Phase2FWorkspaceIngressArtifactV39 {
  schema_version: typeof PHASE2F_WORKSPACE_INGRESS_SCHEMA_V39;
  status: "PASS";
  checked_at_utc: string;
  ingress_kind: "replit-workspace-live";
  callback_origin: string;
  callback_receipt_sha256: string;
  callback_receipt_generated_at_utc: string;
  callback_runtime_git_head: string;
  binding_creator_git_head: string;
  exact_route_owner: "server/routes_v3.ts";
  public_https_ingress: true;
  wrong_secret_rejected_404: true;
  exact_secret_accepted_200: true;
  runtime_health_rechecked: true;
  retention_hours: 168;
  bucket_prefix: "replit-objstore";
  open_incidents: 0;
  provider_called_during_verification: false;
  provider_subscription_created_during_verification: false;
  alert_credits_spent_during_verification: 0;
  deployment_performed: false;
  source_compatibility: Phase2FWorkspaceSourceCompatibilityV39[];
  artifact_sha256: string;
}

export interface LoadedPhase2FWorkspaceIngressV39 {
  artifact: Phase2FWorkspaceIngressArtifactV39;
  fileSha256: string;
  bindingSha256: string;
  evidenceId: string;
}

export function buildPhase2FWorkspaceIngressBindingV39(
  input: Omit<Phase2FWorkspaceIngressArtifactV39, "schema_version" | "status" | "ingress_kind" | "artifact_sha256">,
): Phase2FWorkspaceIngressArtifactV39 {
  const checked = new Date(input.checked_at_utc);
  if (!Number.isFinite(checked.getTime())) throw new Error("PHASE2F_WORKSPACE_INGRESS_CHECKED_AT_INVALID");
  const receiptTime = new Date(input.callback_receipt_generated_at_utc);
  if (!Number.isFinite(receiptTime.getTime())) throw new Error("PHASE2F_WORKSPACE_INGRESS_RECEIPT_TIME_INVALID");
  const origin = new URL(input.callback_origin);
  if (origin.protocol !== "https:" || origin.origin !== input.callback_origin ||
      origin.username || origin.password || origin.search || origin.hash) {
    throw new Error("PHASE2F_WORKSPACE_INGRESS_ORIGIN_INVALID");
  }
  if (!origin.hostname.endsWith(".replit.dev") || ["travnr.com", "www.travnr.com"].includes(origin.hostname)) {
    throw new Error("PHASE2F_WORKSPACE_INGRESS_ORIGIN_NOT_WORKSPACE");
  }
  if (!/^[a-f0-9]{40}$/i.test(input.callback_runtime_git_head) || !/^[a-f0-9]{40}$/i.test(input.binding_creator_git_head)) {
    throw new Error("PHASE2F_WORKSPACE_INGRESS_GIT_HEAD_INVALID");
  }
  requireSha(input.callback_receipt_sha256, "RECEIPT_SHA");
  if (input.exact_route_owner !== "server/routes_v3.ts" || input.public_https_ingress !== true ||
      input.wrong_secret_rejected_404 !== true || input.exact_secret_accepted_200 !== true ||
      input.runtime_health_rechecked !== true || input.retention_hours !== 168 ||
      input.bucket_prefix !== "replit-objstore" || input.open_incidents !== 0 ||
      input.provider_called_during_verification !== false ||
      input.provider_subscription_created_during_verification !== false ||
      input.alert_credits_spent_during_verification !== 0 || input.deployment_performed !== false) {
    throw new Error("PHASE2F_WORKSPACE_INGRESS_CONTROLS_INVALID");
  }
  if (!Array.isArray(input.source_compatibility) || input.source_compatibility.length < 5) {
    throw new Error("PHASE2F_WORKSPACE_INGRESS_SOURCE_COMPATIBILITY_REQUIRED");
  }
  for (const row of input.source_compatibility) {
    if (!row.path || row.match !== true ||
        requireSha(row.runtime_sha256, "RUNTIME_SOURCE_SHA") !== requireSha(row.current_sha256, "CURRENT_SOURCE_SHA")) {
      throw new Error(`PHASE2F_WORKSPACE_INGRESS_SOURCE_MISMATCH:${row.path || "<missing>"}`);
    }
  }
  const unsigned = {
    schema_version: PHASE2F_WORKSPACE_INGRESS_SCHEMA_V39,
    status: "PASS" as const,
    ingress_kind: "replit-workspace-live" as const,
    ...input,
    checked_at_utc: checked.toISOString(),
    callback_origin: origin.origin,
  };
  return { ...unsigned, artifact_sha256: hashObject(unsigned) };
}

export function loadPhase2FWorkspaceIngressBindingV39(
  path: string,
  now = new Date(),
  maxAgeMs = PHASE2F_WORKSPACE_INGRESS_MAX_AGE_MS,
): LoadedPhase2FWorkspaceIngressV39 {
  const raw = readFileSync(path, "utf8");
  const fileSha256 = sha256(raw);
  const x = JSON.parse(raw) as Phase2FWorkspaceIngressArtifactV39;
  if (x.schema_version !== PHASE2F_WORKSPACE_INGRESS_SCHEMA_V39 || x.status !== "PASS" ||
      x.ingress_kind !== "replit-workspace-live") {
    throw new Error("PHASE2F_WORKSPACE_INGRESS_NOT_PASS");
  }
  const { artifact_sha256, ...unsigned } = x;
  if (requireSha(artifact_sha256, "ARTIFACT_SHA") !== hashObject(unsigned)) {
    throw new Error("PHASE2F_WORKSPACE_INGRESS_ARTIFACT_HASH_INVALID");
  }
  const rebuilt = buildPhase2FWorkspaceIngressBindingV39({
    checked_at_utc: x.checked_at_utc,
    callback_origin: x.callback_origin,
    callback_receipt_sha256: x.callback_receipt_sha256,
    callback_receipt_generated_at_utc: x.callback_receipt_generated_at_utc,
    callback_runtime_git_head: x.callback_runtime_git_head,
    binding_creator_git_head: x.binding_creator_git_head,
    exact_route_owner: x.exact_route_owner,
    public_https_ingress: x.public_https_ingress,
    wrong_secret_rejected_404: x.wrong_secret_rejected_404,
    exact_secret_accepted_200: x.exact_secret_accepted_200,
    runtime_health_rechecked: x.runtime_health_rechecked,
    retention_hours: x.retention_hours,
    bucket_prefix: x.bucket_prefix,
    open_incidents: x.open_incidents,
    provider_called_during_verification: x.provider_called_during_verification,
    provider_subscription_created_during_verification: x.provider_subscription_created_during_verification,
    alert_credits_spent_during_verification: x.alert_credits_spent_during_verification,
    deployment_performed: x.deployment_performed,
    source_compatibility: x.source_compatibility,
  });
  if (rebuilt.artifact_sha256 !== x.artifact_sha256) throw new Error("PHASE2F_WORKSPACE_INGRESS_REBUILD_MISMATCH");
  const checked = Date.parse(x.checked_at_utc);
  const receiptTime = Date.parse(x.callback_receipt_generated_at_utc);
  const age = now.getTime() - checked;
  const receiptAge = now.getTime() - receiptTime;
  if (!Number.isFinite(checked) || age < -60_000 || age > maxAgeMs) {
    throw new Error(`PHASE2F_WORKSPACE_INGRESS_STALE:age_ms=${age}`);
  }
  if (!Number.isFinite(receiptTime) || receiptAge < -60_000 || receiptAge > maxAgeMs) {
    throw new Error(`PHASE2F_WORKSPACE_INGRESS_RECEIPT_STALE:age_ms=${receiptAge}`);
  }
  const bindingSha256 = sha256(`v39-phase2f-workspace-ingress-binding-v1:${x.artifact_sha256}:${fileSha256}`);
  const date = new Date(checked).toISOString().slice(0, 10).replaceAll("-", "");
  return {
    artifact: x,
    fileSha256,
    bindingSha256,
    evidenceId: `RUN-${date}-${bindingSha256.toUpperCase()}`,
  };
}
