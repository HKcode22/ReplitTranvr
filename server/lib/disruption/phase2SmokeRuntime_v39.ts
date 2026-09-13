import { createHash } from "crypto";
import { readFileSync } from "fs";
import { loadPreprobeHandoffBindingV39, type PreprobeHandoffBindingV39 } from "./phase2Handoff_v39";

export const PHASE2F_SMOKE_RUNTIME_SCHEMA_V39 = "v3.9-phase2f-smoke-runtime-1" as const;

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
function nonnegativeInt(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new Error(`PHASE2F_RUNTIME_${label.toUpperCase()}_INVALID`);
  return n;
}
function positiveInt(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`PHASE2F_RUNTIME_${label.toUpperCase()}_INVALID`);
  return n;
}

export interface Phase2FSmokeRuntimeArtifactV39 {
  schema_version: typeof PHASE2F_SMOKE_RUNTIME_SCHEMA_V39;
  created_at_utc: string;
  preprobe_evidence_id: string;
  preprobe_artifact_sha256: string;
  preprobe_file_sha256: string;
  preprobe_binding_sha256: string;
  pre_smoke_unsettled_burst_margin_credits: number;
  settlement_initial_wait_seconds: number;
  settlement_poll_interval_seconds: number;
  settlement_stable_read_count: number;
  settlement_timeout_seconds: number;
  watchdog_poll_ms: number;
  artifact_sha256: string;
}

export interface LoadedPhase2FSmokeRuntimeV39 {
  runtime: Phase2FSmokeRuntimeArtifactV39;
  fileSha256: string;
  evidenceId: string;
  bindingSha256: string;
  preprobe: PreprobeHandoffBindingV39;
}

export function buildPhase2FSmokeRuntimeV39(input: {
  createdAtUtc: string;
  preprobe: PreprobeHandoffBindingV39;
  preSmokeMarginCredits: number;
  settlementInitialWaitSeconds: number;
  settlementPollIntervalSeconds: number;
  settlementStableReadCount: number;
  settlementTimeoutSeconds: number;
  watchdogPollMs: number;
}): Phase2FSmokeRuntimeArtifactV39 {
  const created = new Date(input.createdAtUtc);
  if (!Number.isFinite(created.getTime())) throw new Error("PHASE2F_RUNTIME_CREATED_AT_INVALID");
  const stable = positiveInt(input.settlementStableReadCount, "settlement_stable_read_count");
  if (stable < 3) throw new Error("PHASE2F_RUNTIME_SETTLEMENT_STABLE_READ_COUNT_LT_3");
  const unsigned = {
    schema_version: PHASE2F_SMOKE_RUNTIME_SCHEMA_V39,
    created_at_utc: created.toISOString(),
    preprobe_evidence_id: input.preprobe.evidenceId,
    preprobe_artifact_sha256: input.preprobe.artifactSha256,
    preprobe_file_sha256: input.preprobe.fileSha256,
    preprobe_binding_sha256: input.preprobe.bindingSha256,
    pre_smoke_unsettled_burst_margin_credits: nonnegativeInt(input.preSmokeMarginCredits, "pre_smoke_margin"),
    settlement_initial_wait_seconds: nonnegativeInt(input.settlementInitialWaitSeconds, "settlement_initial_wait"),
    settlement_poll_interval_seconds: positiveInt(input.settlementPollIntervalSeconds, "settlement_poll_interval"),
    settlement_stable_read_count: stable,
    settlement_timeout_seconds: positiveInt(input.settlementTimeoutSeconds, "settlement_timeout"),
    watchdog_poll_ms: positiveInt(input.watchdogPollMs, "watchdog_poll_ms"),
  };
  return { ...unsigned, artifact_sha256: hashObject(unsigned) };
}

export function loadPhase2FSmokeRuntimeV39(input: {
  runtimePath: string;
  expectedFileSha256?: string | null;
  preprobePath: string;
}): LoadedPhase2FSmokeRuntimeV39 {
  const preprobe = loadPreprobeHandoffBindingV39(input.preprobePath);
  const raw = readFileSync(input.runtimePath, "utf8");
  const fileSha256 = sha256(raw);
  if (input.expectedFileSha256) {
    if (!/^[a-f0-9]{64}$/i.test(input.expectedFileSha256) || fileSha256 !== input.expectedFileSha256.toLowerCase()) {
      throw new Error(`PHASE2F_RUNTIME_FILE_SHA_MISMATCH:expected=${input.expectedFileSha256}:actual=${fileSha256}`);
    }
  }
  const x = JSON.parse(raw) as Phase2FSmokeRuntimeArtifactV39;
  if (x.schema_version !== PHASE2F_SMOKE_RUNTIME_SCHEMA_V39) throw new Error("PHASE2F_RUNTIME_SCHEMA_INVALID");
  const { artifact_sha256, ...unsigned } = x;
  if (!/^[a-f0-9]{64}$/i.test(String(artifact_sha256 ?? "")) || hashObject(unsigned) !== artifact_sha256) {
    throw new Error("PHASE2F_RUNTIME_ARTIFACT_HASH_INVALID");
  }
  if (x.preprobe_evidence_id !== preprobe.evidenceId ||
      x.preprobe_artifact_sha256 !== preprobe.artifactSha256 ||
      x.preprobe_file_sha256 !== preprobe.fileSha256 ||
      x.preprobe_binding_sha256 !== preprobe.bindingSha256) {
    throw new Error("PHASE2F_RUNTIME_PREPROBE_BINDING_MISMATCH");
  }
  const stable = positiveInt(x.settlement_stable_read_count, "settlement_stable_read_count");
  if (stable < 3) throw new Error("PHASE2F_RUNTIME_SETTLEMENT_STABLE_READ_COUNT_LT_3");
  nonnegativeInt(x.pre_smoke_unsettled_burst_margin_credits, "pre_smoke_margin");
  nonnegativeInt(x.settlement_initial_wait_seconds, "settlement_initial_wait");
  positiveInt(x.settlement_poll_interval_seconds, "settlement_poll_interval");
  positiveInt(x.settlement_timeout_seconds, "settlement_timeout");
  positiveInt(x.watchdog_poll_ms, "watchdog_poll_ms");
  const created = new Date(x.created_at_utc);
  if (!Number.isFinite(created.getTime())) throw new Error("PHASE2F_RUNTIME_CREATED_AT_INVALID");
  const bindingSha256 = sha256(`v39-phase2f-runtime-handoff-v1:${preprobe.bindingSha256}:${artifact_sha256}:${fileSha256}`);
  const date = created.toISOString().slice(0, 10).replaceAll("-", "");
  return {
    runtime: x,
    fileSha256,
    bindingSha256,
    evidenceId: `RUN-${date}-${bindingSha256.toUpperCase()}`,
    preprobe,
  };
}
