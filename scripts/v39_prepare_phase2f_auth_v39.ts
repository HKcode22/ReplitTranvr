import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { loadPhase2FSmokeRuntimeV39 } from "../server/lib/disruption/phase2SmokeRuntime_v39";
import type { AuthRecord } from "../server/lib/disruption/authRecord_v39";

const PHASE = "Phase 2 / safety smoke";
const DEFAULT_PREPROBE = "artifacts/preprobe-reference-freeze-record.json";

function value(name: string): string {
  const i = process.argv.indexOf(name);
  const out = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!out) throw new Error(`MISSING:${name}`);
  return out;
}
function optional(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? String(process.argv[i + 1] ?? "").trim() || null : null;
}
function sha(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function main(): void {
  const authId = value("--auth").toUpperCase();
  if (!/^AUTH-\d{8}-[A-Z0-9]+$/.test(authId)) throw new Error("INVALID:--auth");
  const icao = value("--icao").toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(icao)) throw new Error("INVALID:--icao");
  const minutes = Number(value("--minutes"));
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 15) throw new Error("INVALID:--minutes must be 1..15");
  const alertCeiling = Number(value("--alert-ceiling"));
  if (!Number.isInteger(alertCeiling) || alertCeiling <= 0) throw new Error("INVALID:--alert-ceiling must be positive integer");
  const start = value("--start");
  const expires = value("--expires");
  const cleanupOwner = value("--cleanup-owner");
  const startMs = Date.parse(start);
  const expMs = Date.parse(expires);
  if (!Number.isFinite(startMs) || !Number.isFinite(expMs) || expMs <= startMs) throw new Error("INVALID:start/expiry window");
  const out = resolve(value("--out"));
  const preprobePath = resolve(optional("--preprobe") ?? DEFAULT_PREPROBE);
  const runtimePath = resolve(value("--runtime-file"));
  const runtimeSha = value("--runtime-sha").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(runtimeSha)) throw new Error("INVALID:--runtime-sha");
  const runtime = loadPhase2FSmokeRuntimeV39({
    runtimePath,
    expectedFileSha256: runtimeSha,
    preprobePath,
  });
  const binding = runtime.preprobe;
  if (!binding.artifact.shortlist.some((candidate) => candidate.icao === icao)) {
    throw new Error(`REFUSED:SMOKE_ICAO_NOT_IN_FROZEN_SHORTLIST:${icao}`);
  }

  const record: AuthRecord = {
    authorizationId: authId,
    phaseGate: PHASE,
    airportFilterWindow: `FlightByAirportIcao:${icao};window_minutes=${minutes}`,
    maxAlertCredits: alertCeiling,
    maxRestUnitsByCategory: null,
    startNotBeforeUtc: new Date(startMs).toISOString(),
    expiresAtUtc: new Date(expMs).toISOString(),
    cleanupOwner,
    predecessorEvidenceIds: [binding.evidenceId, runtime.evidenceId],
  };
  const raw = JSON.stringify(record, null, 2) + "\n";
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, raw, { encoding: "utf8", flag: "wx" });
  console.log(JSON.stringify({
    status: "DRAFT_ONLY_NOT_AUTHORIZED",
    path: out,
    authorization_id: authId,
    phase_gate: PHASE,
    airport_filter_window: record.airportFilterWindow,
    max_alert_credits: alertCeiling,
    max_rest_units_by_category: null,
    start_not_before_utc: record.startNotBeforeUtc,
    expires_at_utc: record.expiresAtUtc,
    cleanup_owner: cleanupOwner,
    predecessor_evidence_ids: record.predecessorEvidenceIds,
    preprobe_artifact_sha256: binding.artifactSha256,
    preprobe_file_sha256: binding.fileSha256,
    smoke_runtime_artifact_sha256: runtime.runtime.artifact_sha256,
    smoke_runtime_file_sha256: runtime.fileSha256,
    smoke_runtime_binding_sha256: runtime.bindingSha256,
    auth_artifact_sha256: sha(raw),
    next: "Human reviews exact JSON and SHA, then runs the Phase-2F approval helper with --expected-sha and the same runtime file/SHA",
  }, null, 2));
}

try { main(); }
catch (error: any) { console.error(String(error?.message ?? error)); process.exitCode = 1; }