import { appendFileSync, existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { sha256HexString, type AuthRecord } from "../server/lib/disruption/authRecord_v39";
import {
  loadGate2RuntimeBindingV39,
  stage1AuthorizationScopeV39,
} from "../server/lib/disruption/phase2Gate2Runtime_v39";

const PHASE = "Phase 2 / Gate 2 Stage 1";
const LEDGER = join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md");
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
function readAuth(path: string): { raw: string; record: AuthRecord; sha256: string } {
  const raw = readFileSync(path, "utf8");
  let record: AuthRecord;
  try { record = JSON.parse(raw); } catch { throw new Error("REFUSED_PHASE2G_AUTH_INVALID_JSON"); }
  return { raw, record, sha256: sha256HexString(raw) };
}

function main(): void {
  if (!existsSync(LEDGER)) throw new Error("REFUSED_PHASE2G_EVIDENCE_LEDGER_MISSING");
  const expectedSha = required("--expected-sha").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedSha)) throw new Error("REFUSED_PHASE2G_EXPECTED_SHA_INVALID");
  const binding = loadGate2RuntimeBindingV39({
    probeRuntimePath: resolve(required("--runtime-file")),
    probeRuntimeFileSha256: required("--runtime-sha").toLowerCase(),
    smokePath: resolve(optional("--smoke") ?? DEFAULT_SMOKE),
    smokeRuntimePath: resolve(required("--smoke-runtime-file")),
    smokeRuntimeFileSha256: required("--smoke-runtime-sha").toLowerCase(),
    preprobePath: resolve(optional("--preprobe") ?? DEFAULT_PREPROBE),
  });
  const ledger = readFileSync(LEDGER, "utf8");
  const evidenceTokens = [
    binding.smoke.evidenceId,
    binding.evidenceId,
    `SMOKE_BINDING_SHA256:${binding.smoke.smokeBindingSha256}`,
    `GATE2_RUNTIME_FILE_SHA256:${binding.runtimeFileSha256}`,
    `GATE2_RUNTIME_BINDING_SHA256:${binding.bindingSha256}`,
  ];
  const missing = evidenceTokens.find((token) => !ledger.includes(token));
  if (missing) throw new Error(`REFUSED_PHASE2G_HANDOFF_NOT_RECORDED:${missing}`);

  const authFile = resolve(required("--auth-file"));
  const { raw, record, sha256 } = readAuth(authFile);
  if (sha256 !== expectedSha) throw new Error(`REFUSED_PHASE2G_HUMAN_REVIEW_SHA_MISMATCH:expected=${expectedSha}:actual=${sha256}`);
  if (record.phaseGate !== PHASE) throw new Error("REFUSED_PHASE2G_PHASE_MISMATCH");
  const expectedScope = stage1AuthorizationScopeV39(binding);
  if (record.airportFilterWindow !== expectedScope) throw new Error("REFUSED_PHASE2G_SCOPE_MISMATCH");
  const expectedPredecessors = [binding.smoke.evidenceId, binding.evidenceId];
  if (!Array.isArray(record.predecessorEvidenceIds) || record.predecessorEvidenceIds.length !== 2 ||
      record.predecessorEvidenceIds.some((id, index) => id !== expectedPredecessors[index])) {
    throw new Error("REFUSED_PHASE2G_PREDECESSOR_MISMATCH");
  }
  const ceiling = Number(record.maxAlertCredits);
  if (!Number.isInteger(ceiling) || ceiling <= 0 || ceiling > 500 || binding.runtime.stage1ReservationCredits > ceiling) {
    throw new Error("REFUSED_PHASE2G_ALERT_CEILING_INVALID");
  }
  if (record.maxRestUnitsByCategory !== null && Object.values(record.maxRestUnitsByCategory).some((x) => Number(x) !== 0)) {
    throw new Error("REFUSED_PHASE2G_REST_UNITS_MUST_BE_ZERO");
  }
  if (!record.cleanupOwner?.trim()) throw new Error("REFUSED_PHASE2G_CLEANUP_OWNER_REQUIRED");
  const start = Date.parse(String(record.startNotBeforeUtc ?? ""));
  const expires = Date.parse(String(record.expiresAtUtc ?? ""));
  if (!Number.isFinite(start) || !Number.isFinite(expires) || expires <= start || expires <= Date.now()) {
    throw new Error("REFUSED_PHASE2G_TIME_WINDOW_INVALID");
  }

  const token = `AUTH_ARTIFACT_SHA256:${sha256}`;
  if (!ledger.includes(token)) {
    appendFileSync(LEDGER, [
      "",
      `### ${record.authorizationId} — approved Phase 2G Stage-1 authorization`,
      `- authorization_id: ${record.authorizationId}`,
      `- phase_gate: ${PHASE}`,
      `- exact_scope: ${record.airportFilterWindow}`,
      `- max_alert_credits: ${record.maxAlertCredits}`,
      `- start_not_before_utc: ${record.startNotBeforeUtc}`,
      `- expires_at_utc: ${record.expiresAtUtc}`,
      `- cleanup_owner: ${record.cleanupOwner}`,
      `- predecessor_smoke_evidence_id: ${binding.smoke.evidenceId}`,
      `- predecessor_gate2_runtime_evidence_id: ${binding.evidenceId}`,
      `- AUTH_ARTIFACT_SHA256:${sha256}`,
      "- approval_scope: PHASE_2G_STAGE1_ONLY",
      "",
    ].join("\n"), "utf8");
  }

  console.log(JSON.stringify({
    status: "APPROVED_PHASE2G_STAGE1_ONLY",
    authorization_id: record.authorizationId,
    exact_scope: record.airportFilterWindow,
    max_alert_credits: ceiling,
    predecessor_evidence_ids: expectedPredecessors,
    auth_artifact_sha256: sha256,
    stage1_authorized: true,
    stage2_authorized: false,
    ledger: LEDGER,
  }, null, 2));
  void raw;
}

try { main(); }
catch (error: any) { console.error(String(error?.message ?? error)); process.exitCode = 1; }