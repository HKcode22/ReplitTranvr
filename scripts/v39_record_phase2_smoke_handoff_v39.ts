import { appendFileSync, existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { loadPhase2SmokeHandoffV39 } from "../server/lib/disruption/phase2SmokeHandoff_v39";

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

function main(): void {
  if (!existsSync(LEDGER)) throw new Error("BLOCKED:EVIDENCE_LEDGER_MISSING");
  const preprobePath = resolve(optional("--preprobe") ?? DEFAULT_PREPROBE);
  const smokePath = resolve(optional("--smoke") ?? DEFAULT_SMOKE);
  const runtimePath = resolve(required("--runtime-file"));
  const runtimeSha = required("--runtime-sha").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(runtimeSha)) throw new Error("INVALID:--runtime-sha");

  const handoff = loadPhase2SmokeHandoffV39({
    smokePath,
    preprobePath,
    runtimePath,
    expectedRuntimeFileSha256: runtimeSha,
  });
  const ledger = readFileSync(LEDGER, "utf8");
  const requiredTokens = [
    handoff.preprobe.evidenceId,
    handoff.runtime.evidenceId,
    `AUTH_ARTIFACT_SHA256:${handoff.smoke.authorizationArtifactSha256}`,
  ];
  const missing = requiredTokens.find((token) => !ledger.includes(token));
  if (missing) throw new Error(`BLOCKED:SMOKE_HANDOFF_PREDECESSOR_NOT_RECORDED:${missing}`);

  if (!ledger.includes(handoff.evidenceId)) {
    appendFileSync(LEDGER, [
      "",
      `### ${handoff.evidenceId} — Phase 2F safety-smoke PASS handoff`,
      `- evidence_id: ${handoff.evidenceId}`,
      `- authorization_id: ${handoff.smoke.authorizationId}`,
      `- authorization_artifact_sha256: ${handoff.smoke.authorizationArtifactSha256}`,
      `- predecessor_preprobe_evidence_id: ${handoff.preprobe.evidenceId}`,
      `- predecessor_smoke_runtime_evidence_id: ${handoff.runtime.evidenceId}`,
      `- SMOKE_FILE_SHA256:${handoff.smokeFileSha256}`,
      `- SMOKE_BINDING_SHA256:${handoff.smokeBindingSha256}`,
      `- unsettled_burst_margin_credits: ${handoff.smoke.unsettledBurstMarginCredits}`,
      `- settlement_initial_wait_seconds: ${handoff.smoke.settlementInitialWaitSeconds}`,
      `- settlement_poll_interval_seconds: ${handoff.smoke.settlementPollIntervalSeconds}`,
      `- settlement_stable_read_count: ${handoff.smoke.settlementStableReadCount}`,
      `- settlement_timeout_seconds: ${handoff.smoke.settlementTimeoutSeconds}`,
      `- watchdog_poll_ms: ${handoff.smoke.watchdogPollMs}`,
      "- phase2f: PASS",
      "- stage1_authorized: false",
      "",
    ].join("\n"), "utf8");
  }

  console.log(JSON.stringify({
    status: "PASS_HANDOFF_RECORDED",
    phase2f: "PASS",
    evidence_id: handoff.evidenceId,
    smoke_file_sha256: handoff.smokeFileSha256,
    smoke_binding_sha256: handoff.smokeBindingSha256,
    preprobe_evidence_id: handoff.preprobe.evidenceId,
    smoke_runtime_evidence_id: handoff.runtime.evidenceId,
    unsettled_burst_margin_credits: handoff.smoke.unsettledBurstMarginCredits,
    stage1_authorized: false,
    next: "Prepare a separate exact Phase-2G Stage-1 runtime/AUTH from this handoff",
  }, null, 2));
}

try { main(); }
catch (error: any) { console.error(String(error?.message ?? error)); process.exitCode = 1; }