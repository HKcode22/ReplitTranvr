import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { dirname, join, resolve } from "path";
import { loadPhase2SmokeHandoffV39 } from "../server/lib/disruption/phase2SmokeHandoff_v39";
import { loadGate2RuntimeBindingV39 } from "../server/lib/disruption/phase2Gate2Runtime_v39";

const LEDGER = join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md");
const DEFAULT_PREPROBE = "artifacts/preprobe-reference-freeze-record.json";
const DEFAULT_SMOKE = "artifacts/v39-phase2-safety-smoke.json";

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
function positiveInt(name: string): number {
  const n = Number(required(name));
  if (!Number.isInteger(n) || n <= 0) throw new Error(`INVALID:${name}`);
  return n;
}
function sha(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function main(): void {
  if (!existsSync(LEDGER)) throw new Error("BLOCKED:EVIDENCE_LEDGER_MISSING");
  const preprobePath = resolve(optional("--preprobe") ?? DEFAULT_PREPROBE);
  const smokePath = resolve(optional("--smoke") ?? DEFAULT_SMOKE);
  const smokeRuntimePath = resolve(required("--smoke-runtime-file"));
  const smokeRuntimeSha = required("--smoke-runtime-sha").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(smokeRuntimeSha)) throw new Error("INVALID:--smoke-runtime-sha");
  const out = resolve(required("--out"));
  const probeBudgetDayId = required("--probe-budget-day-id");
  if (!/^[A-Za-z0-9_.:-]+$/.test(probeBudgetDayId)) throw new Error("INVALID:--probe-budget-day-id");
  const minStabilityBuckets = positiveInt("--min-stability-buckets");
  const stage1ReservationCredits = positiveInt("--stage1-reservation");
  const stage2ReservationCredits = positiveInt("--stage2-reservation");

  const smoke = loadPhase2SmokeHandoffV39({
    smokePath,
    preprobePath,
    runtimePath: smokeRuntimePath,
    expectedRuntimeFileSha256: smokeRuntimeSha,
  });
  const ledgerBefore = readFileSync(LEDGER, "utf8");
  if (!ledgerBefore.includes(smoke.evidenceId)) {
    throw new Error(`BLOCKED:SMOKE_HANDOFF_NOT_RECORDED:${smoke.evidenceId}`);
  }
  const margin = smoke.smoke.unsettledBurstMarginCredits;
  if (stage1ReservationCredits + margin > 500 || stage2ReservationCredits + margin > 500) {
    throw new Error("REFUSED:GATE2_RESERVATION_PLUS_FROZEN_MARGIN_EXCEEDS_500");
  }

  const config = {
    version: "v39-gate2-runtime-1",
    probeBudgetDayId,
    watchdogPollMs: smoke.smoke.watchdogPollMs,
    minStabilityBuckets,
    settlementInitialWaitSeconds: smoke.smoke.settlementInitialWaitSeconds,
    settlementPollIntervalSeconds: smoke.smoke.settlementPollIntervalSeconds,
    settlementStableReadCount: smoke.smoke.settlementStableReadCount,
    settlementTimeoutSeconds: smoke.smoke.settlementTimeoutSeconds,
    unsettledBurstMarginCredits: margin,
    stage1ReservationCredits,
    stage2ReservationCredits,
  };
  const raw = JSON.stringify(config, null, 2) + "\n";
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, raw, { encoding: "utf8", flag: "wx" });
  const fileSha256 = sha(raw);
  const binding = loadGate2RuntimeBindingV39({
    probeRuntimePath: out,
    probeRuntimeFileSha256: fileSha256,
    smokePath,
    smokeRuntimePath,
    smokeRuntimeFileSha256: smokeRuntimeSha,
    preprobePath,
  });

  if (!ledgerBefore.includes(binding.evidenceId)) {
    appendFileSync(LEDGER, [
      "",
      `### ${binding.evidenceId} — Gate 2 smoke-bound probe runtime`,
      `- evidence_id: ${binding.evidenceId}`,
      `- predecessor_smoke_evidence_id: ${smoke.evidenceId}`,
      `- GATE2_RUNTIME_FILE_SHA256:${binding.runtimeFileSha256}`,
      `- GATE2_RUNTIME_BINDING_SHA256:${binding.bindingSha256}`,
      `- probe_budget_day_id: ${probeBudgetDayId}`,
      `- min_stability_buckets: ${minStabilityBuckets}`,
      `- unsettled_burst_margin_credits: ${margin}`,
      `- stage1_reservation_credits: ${stage1ReservationCredits}`,
      `- stage2_reservation_credits: ${stage2ReservationCredits}`,
      "- paid_authorization: false",
      "",
    ].join("\n"), "utf8");
  }

  console.log(JSON.stringify({
    status: "FROZEN_GATE2_RUNTIME_EVIDENCE_ONLY_NOT_PAID_AUTH",
    path: out,
    file_sha256: binding.runtimeFileSha256,
    binding_sha256: binding.bindingSha256,
    evidence_id: binding.evidenceId,
    predecessor_smoke_evidence_id: smoke.evidenceId,
    probe_budget_day_id: probeBudgetDayId,
    min_stability_buckets: minStabilityBuckets,
    unsettled_burst_margin_credits: margin,
    stage1_reservation_credits: stage1ReservationCredits,
    stage2_reservation_credits: stage2ReservationCredits,
    next: "Prepare a separate exact Stage-1 AUTH bound to this runtime and the smoke PASS handoff",
  }, null, 2));
}

try { main(); }
catch (error: any) { console.error(String(error?.message ?? error)); process.exitCode = 1; }