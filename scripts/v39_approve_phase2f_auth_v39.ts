import { existsSync, readFileSync, appendFileSync } from "fs";
import { join, resolve } from "path";
import { sha256HexString, type AuthRecord } from "../server/lib/disruption/authRecord_v39";
import { loadPhase2FSmokeRuntimeV39 } from "../server/lib/disruption/phase2SmokeRuntime_v39";

const PHASE = "Phase 2 / safety smoke";
const DEFAULT_PREPROBE = "artifacts/preprobe-reference-freeze-record.json";
const LEDGER = join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md");

function required(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? String(process.argv[index + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}

function optional(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] ?? "").trim() || null : null;
}

function readAuth(path: string): { raw: string; record: AuthRecord; sha256: string } {
  const raw = readFileSync(path, "utf8");
  let record: AuthRecord;
  try { record = JSON.parse(raw); }
  catch { throw new Error("REFUSED_PHASE2F_AUTH_INVALID_JSON"); }
  return { raw, record, sha256: sha256HexString(raw) };
}

function assertLedgerBinding(runtime: ReturnType<typeof loadPhase2FSmokeRuntimeV39>): void {
  if (!existsSync(LEDGER)) throw new Error("REFUSED_PHASE2F_EVIDENCE_LEDGER_MISSING");
  const ledger = readFileSync(LEDGER, "utf8");
  const binding = runtime.preprobe;
  const requiredTokens = [
    binding.evidenceId,
    `PREPROBE_ARTIFACT_SHA256:${binding.artifactSha256}`,
    `PREPROBE_FILE_SHA256:${binding.fileSha256}`,
    `PREPROBE_BINDING_SHA256:${binding.bindingSha256}`,
    runtime.evidenceId,
    `SMOKE_RUNTIME_ARTIFACT_SHA256:${runtime.runtime.artifact_sha256}`,
    `SMOKE_RUNTIME_FILE_SHA256:${runtime.fileSha256}`,
    `SMOKE_RUNTIME_BINDING_SHA256:${runtime.bindingSha256}`,
  ];
  const missing = requiredTokens.filter((token) => !ledger.includes(token));
  if (missing.length) throw new Error(`REFUSED_PHASE2F_HANDOFF_NOT_RECORDED:${missing[0]}`);
}

function assertRecord(record: AuthRecord, runtime: ReturnType<typeof loadPhase2FSmokeRuntimeV39>): {
  icao: string;
  minutes: number;
} {
  const binding = runtime.preprobe;
  if (!/^AUTH-\d{8}-[A-Z0-9]+$/.test(String(record.authorizationId ?? ""))) {
    throw new Error("REFUSED_PHASE2F_AUTH_ID_INVALID");
  }
  if (record.phaseGate !== PHASE) throw new Error(`REFUSED_PHASE2F_PHASE_MISMATCH:${record.phaseGate ?? "<missing>"}`);

  const scope = String(record.airportFilterWindow ?? "");
  const match = scope.match(/^FlightByAirportIcao:([A-Z0-9]{4});window_minutes=(\d{1,2})$/);
  if (!match) throw new Error("REFUSED_PHASE2F_SCOPE_INVALID");
  const icao = match[1];
  const minutes = Number(match[2]);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 15) {
    throw new Error("REFUSED_PHASE2F_WINDOW_MINUTES_MUST_BE_1_TO_15");
  }
  if (!binding.artifact.shortlist.some((candidate) => candidate.icao === icao)) {
    throw new Error(`REFUSED_PHASE2F_ICAO_NOT_IN_FROZEN_SHORTLIST:${icao}`);
  }

  const alertCeiling = Number(record.maxAlertCredits);
  if (!Number.isInteger(alertCeiling) || alertCeiling <= 0) {
    throw new Error("REFUSED_PHASE2F_ALERT_CEILING_REQUIRED");
  }
  if (record.maxRestUnitsByCategory !== null) {
    const values = Object.values(record.maxRestUnitsByCategory ?? {});
    if (values.some((value) => Number(value) !== 0)) {
      throw new Error("REFUSED_PHASE2F_REST_UNITS_MUST_BE_ZERO");
    }
  }
  if (!record.cleanupOwner?.trim()) throw new Error("REFUSED_PHASE2F_CLEANUP_OWNER_REQUIRED");

  const start = Date.parse(String(record.startNotBeforeUtc ?? ""));
  const expires = Date.parse(String(record.expiresAtUtc ?? ""));
  if (!Number.isFinite(start) || !Number.isFinite(expires) || expires <= start) {
    throw new Error("REFUSED_PHASE2F_TIME_WINDOW_INVALID");
  }
  if (expires <= Date.now()) throw new Error("REFUSED_PHASE2F_AUTH_ALREADY_EXPIRED");

  const expected = [binding.evidenceId, runtime.evidenceId];
  if (!Array.isArray(record.predecessorEvidenceIds) || record.predecessorEvidenceIds.length !== expected.length ||
      record.predecessorEvidenceIds.some((id, index) => id !== expected[index])) {
    throw new Error(`REFUSED_PHASE2F_PREDECESSORS_MUST_EQUAL_CURRENT_BINDINGS:${expected.join(",")}`);
  }
  return { icao, minutes };
}

function main(): void {
  const authFile = resolve(required("--auth-file"));
  const expectedSha = required("--expected-sha").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedSha)) throw new Error("REFUSED_PHASE2F_EXPECTED_SHA_INVALID");
  const preprobePath = resolve(optional("--preprobe") ?? DEFAULT_PREPROBE);
  const runtimePath = resolve(required("--runtime-file"));
  const runtimeSha = required("--runtime-sha").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(runtimeSha)) throw new Error("REFUSED_PHASE2F_RUNTIME_SHA_INVALID");
  const runtime = loadPhase2FSmokeRuntimeV39({
    runtimePath,
    expectedFileSha256: runtimeSha,
    preprobePath,
  });
  assertLedgerBinding(runtime);

  const { raw, record, sha256 } = readAuth(authFile);
  if (sha256 !== expectedSha) {
    throw new Error(`REFUSED_PHASE2F_HUMAN_REVIEW_SHA_MISMATCH:expected=${expectedSha}:actual=${sha256}`);
  }
  const scope = assertRecord(record, runtime);

  const ledgerBefore = readFileSync(LEDGER, "utf8");
  const token = `AUTH_ARTIFACT_SHA256:${sha256}`;
  if (!ledgerBefore.includes(token)) {
    const block = [
      "",
      `### ${record.authorizationId} — approved Phase 2F safety-smoke authorization`,
      `- authorization_id: ${record.authorizationId}`,
      `- phase_gate: ${PHASE}`,
      `- airport_filter_window: ${record.airportFilterWindow}`,
      `- max_alert_credits: ${record.maxAlertCredits}`,
      `- max_rest_units_by_category: ${JSON.stringify(record.maxRestUnitsByCategory)}`,
      `- start_not_before_utc: ${record.startNotBeforeUtc}`,
      `- expires_at_utc: ${record.expiresAtUtc}`,
      `- cleanup_owner: ${record.cleanupOwner}`,
      `- predecessor_preprobe_evidence_id: ${runtime.preprobe.evidenceId}`,
      `- predecessor_smoke_runtime_evidence_id: ${runtime.evidenceId}`,
      `- smoke_runtime_binding_sha256: ${runtime.bindingSha256}`,
      `- AUTH_ARTIFACT_SHA256:${sha256}`,
      "- approval_scope: PHASE_2F_ONLY",
      "",
    ].join("\n");
    appendFileSync(LEDGER, block, "utf8");
  }

  console.log(JSON.stringify({
    status: "APPROVED_PHASE2F_ONLY",
    authorization_id: record.authorizationId,
    phase_gate: PHASE,
    icao: scope.icao,
    window_minutes: scope.minutes,
    max_alert_credits: record.maxAlertCredits,
    predecessor_evidence_ids: record.predecessorEvidenceIds,
    smoke_runtime_binding_sha256: runtime.bindingSha256,
    auth_artifact_sha256: sha256,
    paid_authorization: true,
    stage1_authorized: false,
    stage2_authorized: false,
    ledger: LEDGER,
  }, null, 2));

  void raw;
}

try { main(); }
catch (error: any) { console.error(String(error?.message ?? error)); process.exitCode = 1; }