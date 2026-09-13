import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import type { AuthRecord } from "../server/lib/disruption/authRecord_v39";
import {
  loadGate2RuntimeBindingV39,
  stage1AuthorizationScopeV39,
} from "../server/lib/disruption/phase2Gate2Runtime_v39";

const PHASE = "Phase 2 / Gate 2 Stage 1";
const DEFAULT_PREPROBE = "artifacts/preprobe-reference-freeze-record.json";
const DEFAULT_SMOKE = "artifacts/v39-phase2-safety-smoke.json";

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!v) throw new Error(`MISSING:${name}`);
  return v;
}
function optional(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? String(process.argv[i + 1] ?? "").trim() || null : null;
}
function sha(raw: string): string { return createHash("sha256").update(raw, "utf8").digest("hex"); }

function main(): void {
  const authId = required("--auth").toUpperCase();
  if (!/^AUTH-\d{8}-[A-Z0-9]+$/.test(authId)) throw new Error("INVALID:--auth");
  const alertCeiling = Number(required("--alert-ceiling"));
  if (!Number.isInteger(alertCeiling) || alertCeiling <= 0 || alertCeiling > 500) throw new Error("INVALID:--alert-ceiling must be 1..500");
  const startMs = Date.parse(required("--start"));
  const expMs = Date.parse(required("--expires"));
  if (!Number.isFinite(startMs) || !Number.isFinite(expMs) || expMs <= startMs) throw new Error("INVALID:start/expiry window");
  const cleanupOwner = required("--cleanup-owner");
  const out = resolve(required("--out"));

  const binding = loadGate2RuntimeBindingV39({
    probeRuntimePath: resolve(required("--runtime-file")),
    probeRuntimeFileSha256: required("--runtime-sha").toLowerCase(),
    smokePath: resolve(optional("--smoke") ?? DEFAULT_SMOKE),
    smokeRuntimePath: resolve(required("--smoke-runtime-file")),
    smokeRuntimeFileSha256: required("--smoke-runtime-sha").toLowerCase(),
    preprobePath: resolve(optional("--preprobe") ?? DEFAULT_PREPROBE),
  });
  if (binding.runtime.stage1ReservationCredits > alertCeiling) {
    throw new Error("REFUSED:STAGE1_RESERVATION_EXCEEDS_AUTH_CEILING");
  }

  const record: AuthRecord = {
    authorizationId: authId,
    phaseGate: PHASE,
    airportFilterWindow: stage1AuthorizationScopeV39(binding),
    maxAlertCredits: alertCeiling,
    maxRestUnitsByCategory: null,
    startNotBeforeUtc: new Date(startMs).toISOString(),
    expiresAtUtc: new Date(expMs).toISOString(),
    cleanupOwner,
    predecessorEvidenceIds: [binding.smoke.evidenceId, binding.evidenceId],
  };
  const raw = JSON.stringify(record, null, 2) + "\n";
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, raw, { encoding: "utf8", flag: "wx" });
  console.log(JSON.stringify({
    status: "DRAFT_ONLY_NOT_AUTHORIZED",
    path: out,
    authorization_id: authId,
    phase_gate: PHASE,
    exact_scope: record.airportFilterWindow,
    max_alert_credits: alertCeiling,
    predecessor_evidence_ids: record.predecessorEvidenceIds,
    preprobe_file_sha256: binding.smoke.preprobe.fileSha256,
    gate2_runtime_file_sha256: binding.runtimeFileSha256,
    gate2_runtime_binding_sha256: binding.bindingSha256,
    probe_budget_day_id: binding.runtime.probeBudgetDayId,
    auth_artifact_sha256: sha(raw),
    next: "Human reviews exact JSON/SHA, then runs the Phase-2G approval helper with --expected-sha",
  }, null, 2));
}

try { main(); }
catch (error: any) { console.error(String(error?.message ?? error)); process.exitCode = 1; }