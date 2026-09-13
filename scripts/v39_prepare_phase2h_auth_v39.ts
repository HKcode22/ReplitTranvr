import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import type { AuthRecord } from "../server/lib/disruption/authRecord_v39";
import {
  loadGate2RuntimeBindingV39,
  stage2AuthorizationScopeV39,
} from "../server/lib/disruption/phase2Gate2Runtime_v39";
import { loadStage1PromotionHandoffV39 } from "../server/lib/disruption/phase2Stage1Handoff_v39";

const PHASE = "Phase 2 / Gate 2 Stage 2";
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
  if (gate2.runtime.stage2ReservationCredits > alertCeiling) {
    throw new Error("REFUSED:STAGE2_RESERVATION_EXCEEDS_AUTH_CEILING");
  }

  const record: AuthRecord = {
    authorizationId: authId,
    phaseGate: PHASE,
    airportFilterWindow: stage2AuthorizationScopeV39(gate2, promotion.bindingSha256),
    maxAlertCredits: alertCeiling,
    maxRestUnitsByCategory: null,
    startNotBeforeUtc: new Date(startMs).toISOString(),
    expiresAtUtc: new Date(expMs).toISOString(),
    cleanupOwner,
    predecessorEvidenceIds: [gate2.smoke.evidenceId, gate2.evidenceId, promotion.evidenceId],
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
    stage1_promotion_file_sha256: promotion.fileSha256,
    stage1_promotion_binding_sha256: promotion.bindingSha256,
    auth_artifact_sha256: sha(raw),
    next: "Human reviews exact JSON/SHA, then runs the Phase-2H approval helper with --expected-sha",
  }, null, 2));
}

try { main(); }
catch (error: any) { console.error(String(error?.message ?? error)); process.exitCode = 1; }