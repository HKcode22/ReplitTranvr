import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { createHash } from "crypto";
import { loadPreprobeHandoffBindingV39 } from "../server/lib/disruption/phase2Handoff_v39";
import {
  buildPhase2FSmokeRuntimeV39,
  loadPhase2FSmokeRuntimeV39,
} from "../server/lib/disruption/phase2SmokeRuntime_v39";

const DEFAULT_PREPROBE = "artifacts/preprobe-reference-freeze-record.json";
const LEDGER = join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md");

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}
function optional(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? String(process.argv[i + 1] ?? "").trim() || null : null;
}
function integer(name: string, minimum: number): number {
  const n = Number(required(name));
  if (!Number.isInteger(n) || n < minimum) throw new Error(`INVALID:${name}`);
  return n;
}
function sha(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function assertPreprobeRecorded(binding: ReturnType<typeof loadPreprobeHandoffBindingV39>): void {
  if (!existsSync(LEDGER)) throw new Error("BLOCKED:EVIDENCE_LEDGER_MISSING");
  const ledger = readFileSync(LEDGER, "utf8");
  const requiredTokens = [
    binding.evidenceId,
    `PREPROBE_ARTIFACT_SHA256:${binding.artifactSha256}`,
    `PREPROBE_FILE_SHA256:${binding.fileSha256}`,
    `PREPROBE_BINDING_SHA256:${binding.bindingSha256}`,
  ];
  const missing = requiredTokens.find((token) => !ledger.includes(token));
  if (missing) throw new Error(`BLOCKED:PREPROBE_HANDOFF_NOT_RECORDED:${missing}`);
}

function main(): void {
  const preprobePath = resolve(optional("--preprobe") ?? DEFAULT_PREPROBE);
  const out = resolve(required("--out"));
  const binding = loadPreprobeHandoffBindingV39(preprobePath);
  assertPreprobeRecorded(binding);

  // These values are deliberately explicit. This command does not infer a
  // safety margin from the smoke it is intended to protect, and it does not
  // silently inherit mutable process defaults.
  const artifact = buildPhase2FSmokeRuntimeV39({
    createdAtUtc: new Date().toISOString(),
    preprobe: binding,
    preSmokeMarginCredits: integer("--pre-smoke-margin", 0),
    settlementInitialWaitSeconds: integer("--settlement-initial-wait-s", 0),
    settlementPollIntervalSeconds: integer("--settlement-poll-s", 1),
    settlementStableReadCount: integer("--settlement-stable-reads", 3),
    settlementTimeoutSeconds: integer("--settlement-timeout-s", 1),
    watchdogPollMs: integer("--watchdog-poll-ms", 1),
  });
  const raw = JSON.stringify(artifact, null, 2) + "\n";
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, raw, { encoding: "utf8", flag: "wx" });
  const fileSha256 = sha(raw);
  const loaded = loadPhase2FSmokeRuntimeV39({
    runtimePath: out,
    expectedFileSha256: fileSha256,
    preprobePath,
  });

  const ledger = readFileSync(LEDGER, "utf8");
  if (!ledger.includes(loaded.evidenceId)) {
    appendFileSync(LEDGER, [
      "",
      `### ${loaded.evidenceId} — Phase 2F frozen smoke runtime`,
      `- evidence_id: ${loaded.evidenceId}`,
      `- predecessor_preprobe_evidence_id: ${binding.evidenceId}`,
      `- SMOKE_RUNTIME_ARTIFACT_SHA256:${artifact.artifact_sha256}`,
      `- SMOKE_RUNTIME_FILE_SHA256:${loaded.fileSha256}`,
      `- SMOKE_RUNTIME_BINDING_SHA256:${loaded.bindingSha256}`,
      `- pre_smoke_unsettled_burst_margin_credits: ${artifact.pre_smoke_unsettled_burst_margin_credits}`,
      `- settlement_initial_wait_seconds: ${artifact.settlement_initial_wait_seconds}`,
      `- settlement_poll_interval_seconds: ${artifact.settlement_poll_interval_seconds}`,
      `- settlement_stable_read_count: ${artifact.settlement_stable_read_count}`,
      `- settlement_timeout_seconds: ${artifact.settlement_timeout_seconds}`,
      `- watchdog_poll_ms: ${artifact.watchdog_poll_ms}`,
      "- paid_authorization: false",
      "",
    ].join("\n"), "utf8");
  }

  console.log(JSON.stringify({
    status: "FROZEN_RUNTIME_EVIDENCE_ONLY_NOT_PAID_AUTH",
    path: out,
    evidence_id: loaded.evidenceId,
    predecessor_preprobe_evidence_id: binding.evidenceId,
    artifact_sha256: artifact.artifact_sha256,
    file_sha256: loaded.fileSha256,
    binding_sha256: loaded.bindingSha256,
    pre_smoke_unsettled_burst_margin_credits: artifact.pre_smoke_unsettled_burst_margin_credits,
    settlement_initial_wait_seconds: artifact.settlement_initial_wait_seconds,
    settlement_poll_interval_seconds: artifact.settlement_poll_interval_seconds,
    settlement_stable_read_count: artifact.settlement_stable_read_count,
    settlement_timeout_seconds: artifact.settlement_timeout_seconds,
    watchdog_poll_ms: artifact.watchdog_poll_ms,
    next: "Create and human-review an exact Phase-2F AUTH bound to BOTH the preprobe and this runtime evidence ID",
  }, null, 2));
}

try { main(); }
catch (error: any) { console.error(String(error?.message ?? error)); process.exitCode = 1; }