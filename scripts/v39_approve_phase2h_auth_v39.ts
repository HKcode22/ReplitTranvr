import { appendFileSync, existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { sha256HexString, type AuthRecord } from "../server/lib/disruption/authRecord_v39";
import {
  loadGate2RuntimeBindingV39,
  stage2AuthorizationScopeV39,
} from "../server/lib/disruption/phase2Gate2Runtime_v39";
import { loadStage1PromotionHandoffV39 } from "../server/lib/disruption/phase2Stage1Handoff_v39";

const PHASE = "Phase 2 / Gate 2 Stage 2";
const LEDGER = join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md");
const DEFAULT_PREPROBE = "artifacts/preprobe-reference-freeze-record.json";
const DEFAULT_SMOKE = "artifacts/v39-phase2-safety-smoke.json";
const DEFAULT_PROMOTION = "artifacts/v39-stage1-promotion-handoff.json";

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
  try { record = JSON.parse(raw); } catch { throw new Error("REFUSED_PHASE2H_AUTH_INVALID_JSON"); }
  return { raw, record, sha256: sha256HexString(raw) };
}

function main(): void {
  if (!existsSync(LEDGER)) throw new Error("REFUSED_PHASE2H_EVIDENCE_LEDGER_MISSING");
  const expectedSha = required("--expected-sha").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedSha)) throw new Error("REFUSED_PHASE2H_EXPECTED_SHA_INVALID");
  const gate2 = loadGate2RuntimeBindingV39({
    probeRuntimePath: resolve(required("--runtime-file")),
    probeRuntimeFileSha256: required("--runtime-sha").toLowerCase(),
    smokePath: resolve(optional("--smoke") ?? DEFAULT_SMOKE),
    smokeRuntimePath: resolve(required("--smoke-runtime-file")),
    smokeRuntimeFileSha256: required("--smoke-runtime-sha").toLowerCase(),
    preprobePath: resolve(optional("--preprobe") ?? DEFAULT_PREPROBE),
  });
  const promotion = loadStage1PromotionHandoffV39({
    path: resolve(optional("--promotion") ?? DEFAULT_PROMOTION),
    expectedFileSha256: required("--promotion-sha").toLowerCase(),
    gate2,
  });
  const ledger = readFileSync(LEDGER, "utf8");
  const requiredTokens = [
    gate2.smoke.evidenceId,
    gate2.evidenceId,
    promotion.evidenceId,
    `STAGE1_PROMOTION_FILE_SHA256:${promotion.fileSha256}`,
    `STAGE1_PROMOTION_BINDING_SHA256:${promotion.bindingSha256}`,
  ];
  const missing = requiredTokens.find((token) => !ledger.includes(token));
  if (missing) throw new Error(`REFUSED_PHASE2H_HANDOFF_NOT_RECORDED:${missing}`);

  const { raw, record, sha256 } = readAuth(resolve(required("--auth-file")));
  if (sha256 !== expectedSha) throw new Error(`REFUSED_PHASE2H_HUMAN_REVIEW_SHA_MISMATCH:expected=${expectedSha}:actual=${sha256}`);
  if (record.phaseGate !== PHASE) throw new Error("REFUSED_PHASE2H_PHASE_MISMATCH");
  const expectedScope = stage2AuthorizationScopeV39(gate2, promotion.bindingSha256);
  if (record.airportFilterWindow !== expectedScope) throw new Error("REFUSED_PHASE2H_SCOPE_MISMATCH");
  const expectedPredecessors = [gate2.smoke.evidenceId, gate2.evidenceId, promotion.evidenceId];
  if (!Array.isArray(record.predecessorEvidenceIds) || record.predecessorEvidenceIds.length !== 3 ||
      record.predecessorEvidenceIds.some((id, index) => id !== expectedPredecessors[index])) {
    throw new Error("REFUSED_PHASE2H_PREDECESSOR_MISMATCH");
  }
  const ceiling = Number(record.maxAlertCredits);
  if (!Number.isInteger(ceiling) || ceiling <= 0 || ceiling > 500 || gate2.runtime.stage2ReservationCredits > ceiling) {
    throw new Error("REFUSED_PHASE2H_ALERT_CEILING_INVALID");
  }
  if (record.maxRestUnitsByCategory !== null && Object.values(record.maxRestUnitsByCategory).some((x) => Number(x) !== 0)) {
    throw new Error("REFUSED_PHASE2H_REST_UNITS_MUST_BE_ZERO");
  }
  if (!record.cleanupOwner?.trim()) throw new Error("REFUSED_PHASE2H_CLEANUP_OWNER_REQUIRED");
  const start = Date.parse(String(record.startNotBeforeUtc ?? ""));
  const expires = Date.parse(String(record.expiresAtUtc ?? ""));
  if (!Number.isFinite(start) || !Number.isFinite(expires) || expires <= start || expires <= Date.now()) {
    throw new Error("REFUSED_PHASE2H_TIME_WINDOW_INVALID");
  }

  const token = `AUTH_ARTIFACT_SHA256:${sha256}`;
  if (!ledger.includes(token)) {
    appendFileSync(LEDGER, [
      "",
      `### ${record.authorizationId} — approved Phase 2H Stage-2 authorization`,
      `- authorization_id: ${record.authorizationId}`,
      `- phase_gate: ${PHASE}`,
      `- exact_scope: ${record.airportFilterWindow}`,
      `- max_alert_credits: ${record.maxAlertCredits}`,
      `- start_not_before_utc: ${record.startNotBeforeUtc}`,
      `- expires_at_utc: ${record.expiresAtUtc}`,
      `- cleanup_owner: ${record.cleanupOwner}`,
      `- predecessor_smoke_evidence_id: ${gate2.smoke.evidenceId}`,
      `- predecessor_gate2_runtime_evidence_id: ${gate2.evidenceId}`,
      `- predecessor_stage1_promotion_evidence_id: ${promotion.evidenceId}`,
      `- AUTH_ARTIFACT_SHA256:${sha256}`,
      "- approval_scope: PHASE_2H_STAGE2_ONLY",
      "",
    ].join("\n"), "utf8");
  }

  console.log(JSON.stringify({
    status: "APPROVED_PHASE2H_STAGE2_ONLY",
    authorization_id: record.authorizationId,
    exact_scope: record.airportFilterWindow,
    max_alert_credits: ceiling,
    predecessor_evidence_ids: expectedPredecessors,
    auth_artifact_sha256: sha256,
    stage2_authorized: true,
    ledger: LEDGER,
  }, null, 2));
  void raw;
}

try { main(); }
catch (error: any) { console.error(String(error?.message ?? error)); process.exitCode = 1; }