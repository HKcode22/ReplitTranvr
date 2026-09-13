import "dotenv/config";
import { createHash } from "crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import {
  finalFiveMembershipInvariant,
  selectStage2Top5,
  type PromotionRow,
  type Stage1ProbeEvidence,
} from "../server/lib/disruption/anchorPromotion_v39";
import { loadProbeExecutionArtifacts, PROBE_BUDGET_DAY_HARD_CAP } from "../server/lib/disruption/probeExecution_v39";
import { prepaidSafeBudgetExposureV39 } from "../server/lib/disruption/probeExecutionPrepaid_v39";
import {
  loadGate2RuntimeBindingV39,
  stage2AuthorizationScopeV39,
} from "../server/lib/disruption/phase2Gate2Runtime_v39";
import { loadStage1PromotionHandoffV39 } from "../server/lib/disruption/phase2Stage1Handoff_v39";
import { sha256HexString } from "../server/lib/disruption/authRecord_v39";
import { verifyAuthFile } from "./v39_paid_guard_v39";

const PHASE = "Phase 2 / Gate 2 Stage 2";
const LEDGER = join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md");
const DEFAULT_PREPROBE = "artifacts/preprobe-reference-freeze-record.json";
const DEFAULT_SMOKE = "artifacts/v39-phase2-safety-smoke.json";
const DEFAULT_PROMOTION = "artifacts/v39-stage1-promotion-handoff.json";
const DEFAULT_OUT = "artifacts/v39-gate2-phase2-pass.json";

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
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const x = value as Record<string, unknown>;
  return `{${Object.keys(x).sort().map((key) => `${JSON.stringify(key)}:${canonical(x[key])}`).join(",")}}`;
}
function sha(raw: string): string { return createHash("sha256").update(raw, "utf8").digest("hex"); }
function hashObject(value: unknown): string { return sha(canonical(value)); }

async function readStage1Evidence(preprobeHash: string): Promise<Stage1ProbeEvidence[]> {
  const r = await pool.query(
    `SELECT icao,status,rows_per_hour,credits_spent,unique_flights_per_credit,
            tail_chain_links_per_credit,stability,confirmed_unique_lower,
            confirmed_plus_ambiguous_upper,provider_content_safe_mode,
            confirmed_unique_lower_per_credit,confirmed_plus_ambiguous_upper_per_credit
       FROM clean.adb_anchor_probe
      WHERE stage=1 AND preprobe_artifact_sha256=$1
      ORDER BY recorded_at ASC`,
    [preprobeHash],
  );
  return r.rows.map((x: any) => {
    const safe = x.provider_content_safe_mode === true;
    const lowerRate = x.confirmed_unique_lower_per_credit == null ? null : Number(x.confirmed_unique_lower_per_credit);
    const upperRate = x.confirmed_plus_ambiguous_upper_per_credit == null ? null : Number(x.confirmed_plus_ambiguous_upper_per_credit);
    const safeRates = safe && lowerRate !== null && upperRate !== null && Number.isFinite(lowerRate) && Number.isFinite(upperRate);
    return {
      icao: String(x.icao).toUpperCase(),
      status: String(x.status),
      rowsPerHour: x.rows_per_hour == null ? null : Number(x.rows_per_hour),
      creditsSpent: safeRates ? 1 : (x.credits_spent == null ? null : Number(x.credits_spent)),
      uniqueFlightsPerCredit: x.unique_flights_per_credit == null ? null : Number(x.unique_flights_per_credit),
      tailChainLinksPerCredit: x.tail_chain_links_per_credit == null ? null : Number(x.tail_chain_links_per_credit),
      stability: x.stability == null ? null : Number(x.stability),
      confirmedUniqueLower: safeRates ? lowerRate : (x.confirmed_unique_lower == null ? null : Number(x.confirmed_unique_lower)),
      confirmedPlusAmbiguousUpper: safeRates ? upperRate : (x.confirmed_plus_ambiguous_upper == null ? null : Number(x.confirmed_plus_ambiguous_upper)),
    };
  });
}

interface Stage2State {
  icao: string;
  status: string;
  rowsPerHour: number | null;
  stability: number | null;
  stabilityStatus: string | null;
}
async function readStage2State(preprobeHash: string): Promise<Stage2State[]> {
  const r = await pool.query(
    `SELECT icao,status,rows_per_hour,stability,stability_status
       FROM clean.adb_anchor_probe
      WHERE stage=2 AND preprobe_artifact_sha256=$1
      ORDER BY recorded_at ASC`,
    [preprobeHash],
  );
  return r.rows.map((x: any) => ({
    icao: String(x.icao).toUpperCase(),
    status: String(x.status),
    rowsPerHour: x.rows_per_hour == null ? null : Number(x.rows_per_hour),
    stability: x.stability == null ? null : Number(x.stability),
    stabilityStatus: x.stability_status == null ? null : String(x.stability_status),
  }));
}
function validStage2(x: Stage2State | undefined): boolean {
  return !!x && x.status === "completed" && (x.rowsPerHour ?? -Infinity) >= 60 &&
    x.stability !== null && Number.isFinite(x.stability) && x.stabilityStatus === "PASS";
}
function terminalInvalidStage2(x: Stage2State | undefined): boolean {
  if (!x || validStage2(x)) return false;
  return ["completed", "failed", "abandoned"].includes(x.status);
}
function remainingRankAfterStage2Failures(ranked: PromotionRow[], states: Stage2State[]): PromotionRow[] {
  const by = new Map(states.map((x) => [x.icao, x]));
  return ranked.filter((row) => !terminalInvalidStage2(by.get(row.icao)));
}

async function main(): Promise<void> {
  if (!existsSync(LEDGER)) throw new Error("BLOCKED:EVIDENCE_LEDGER_MISSING");
  const preprobePath = resolve(optional("--preprobe") ?? DEFAULT_PREPROBE);
  const smokePath = resolve(optional("--smoke") ?? DEFAULT_SMOKE);
  const smokeRuntimePath = resolve(required("--smoke-runtime-file"));
  const smokeRuntimeSha = required("--smoke-runtime-sha").toLowerCase();
  const runtimePath = resolve(required("--runtime-file"));
  const runtimeSha = required("--runtime-sha").toLowerCase();
  const promotionPath = resolve(optional("--promotion") ?? DEFAULT_PROMOTION);
  const promotionSha = required("--promotion-sha").toLowerCase();
  const authFile = resolve(required("--auth-file"));
  const out = resolve(optional("--out") ?? DEFAULT_OUT);

  const gate2 = loadGate2RuntimeBindingV39({
    probeRuntimePath: runtimePath,
    probeRuntimeFileSha256: runtimeSha,
    smokePath,
    smokeRuntimePath,
    smokeRuntimeFileSha256: smokeRuntimeSha,
    preprobePath,
  });
  const artifacts = loadProbeExecutionArtifacts({
    preprobePath,
    preprobeSha256: gate2.smoke.preprobe.fileSha256,
    runtimePath,
    runtimeSha256: runtimeSha,
  });
  const stage1 = await readStage1Evidence(artifacts.preprobeSha256);
  const currentPromotion = selectStage2Top5(artifacts.preprobe, stage1);
  const promotion = loadStage1PromotionHandoffV39({
    path: promotionPath,
    expectedFileSha256: promotionSha,
    gate2,
    currentPromotion,
  });

  const checked = verifyAuthFile(authFile, PHASE);
  if ("error" in checked || !checked.verdict.verified) {
    throw new Error(`REFUSED_GATE2_PASS_STAGE2_AUTH_INVALID:${"error" in checked ? checked.error : checked.verdict.reason}`);
  }
  const expectedScope = stage2AuthorizationScopeV39(gate2, promotion.bindingSha256);
  if (checked.record.airportFilterWindow !== expectedScope) throw new Error("REFUSED_GATE2_PASS_STAGE2_AUTH_SCOPE_MISMATCH");
  const expectedPredecessors = [gate2.smoke.evidenceId, gate2.evidenceId, promotion.evidenceId];
  if (checked.record.predecessorEvidenceIds.length !== expectedPredecessors.length ||
      checked.record.predecessorEvidenceIds.some((id, index) => id !== expectedPredecessors[index])) {
    throw new Error("REFUSED_GATE2_PASS_STAGE2_AUTH_PREDECESSOR_MISMATCH");
  }
  const authRaw = readFileSync(authFile, "utf8");
  const authSha = sha256HexString(authRaw);
  const ledger = readFileSync(LEDGER, "utf8");
  if (!ledger.includes(`AUTH_ARTIFACT_SHA256:${authSha}`) || !ledger.includes("approval_scope: PHASE_2H_STAGE2_ONLY")) {
    throw new Error("REFUSED_GATE2_PASS_STAGE2_AUTH_NOT_APPROVED_IN_LEDGER");
  }

  const active = await pool.query(`SELECT count(*)::int n FROM clean.adb_anchor_probe WHERE status='probing'`);
  if (Number(active.rows[0]?.n ?? 0) !== 0) throw new Error("REFUSED_GATE2_PASS_ACTIVE_PROBE");
  const states = await readStage2State(artifacts.preprobeSha256);
  const remaining = remainingRankAfterStage2Failures(currentPromotion.ranked, states);
  if (remaining.length < 5 || !finalFiveMembershipInvariant(remaining)) {
    throw new Error("REFUSED_GATE2_PASS_FINAL_FIVE_NOT_INVARIANT");
  }
  const finalFive = remaining.slice(0, 5).map((x) => x.icao);
  const byState = new Map(states.map((x) => [x.icao, x]));
  const unconfirmed = finalFive.filter((icao) => !validStage2(byState.get(icao)));
  if (unconfirmed.length) throw new Error(`REFUSED_GATE2_PASS_UNCONFIRMED:${unconfirmed.join(",")}`);

  const budget = await pool.query(
    `SELECT state,cap_credits,closed_at FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$1`,
    [gate2.runtime.probeBudgetDayId],
  );
  if (budget.rowCount !== 1 || budget.rows[0].state !== "CLOSED" || Number(budget.rows[0].cap_credits) !== PROBE_BUDGET_DAY_HARD_CAP || !budget.rows[0].closed_at) {
    throw new Error("REFUSED_GATE2_PASS_PROBE_BUDGET_DAY_NOT_CLOSED");
  }
  const exposure = await prepaidSafeBudgetExposureV39(gate2.runtime.probeBudgetDayId);
  if (!Number.isFinite(exposure) || exposure < 0 || exposure > PROBE_BUDGET_DAY_HARD_CAP) {
    throw new Error(`REFUSED_GATE2_PASS_EXPOSURE_INVALID:${exposure}`);
  }
  const incident = await pool.query(`SELECT cause FROM clean.adb_incident_stop WHERE resolved=false LIMIT 1`);
  if (incident.rowCount) throw new Error(`REFUSED_GATE2_PASS_INCIDENT_STOP:${incident.rows[0].cause}`);

  const unsigned = {
    schema_version: "v3.9-gate2-phase2-pass-1",
    status: "PASS" as const,
    recorded_at_utc: new Date().toISOString(),
    preprobe_evidence_id: gate2.smoke.preprobe.evidenceId,
    preprobe_artifact_sha256: gate2.smoke.preprobe.artifactSha256,
    preprobe_file_sha256: gate2.smoke.preprobe.fileSha256,
    smoke_evidence_id: gate2.smoke.evidenceId,
    smoke_binding_sha256: gate2.smoke.smokeBindingSha256,
    gate2_runtime_evidence_id: gate2.evidenceId,
    gate2_runtime_binding_sha256: gate2.bindingSha256,
    gate2_runtime_file_sha256: gate2.runtimeFileSha256,
    stage1_promotion_evidence_id: promotion.evidenceId,
    stage1_promotion_binding_sha256: promotion.bindingSha256,
    stage1_promotion_file_sha256: promotion.fileSha256,
    stage2_authorization_id: checked.record.authorizationId,
    stage2_authorization_artifact_sha256: authSha,
    probe_budget_day_id: gate2.runtime.probeBudgetDayId,
    conservative_safe_mode_exposure_credits: exposure,
    probe_budget_hard_cap_credits: PROBE_BUDGET_DAY_HARD_CAP,
    confirmed_final_five: finalFive,
    reference_icao: currentPromotion.referenceIcao,
    ambiguity_membership_invariant: true,
    probe_budget_day_closed: true,
    open_incident_stop_count: 0,
    phase2_complete: true,
    next: "MANDATORY HANDOFF BEFORE PHASE 3",
  };
  const artifact = { ...unsigned, artifact_sha256: hashObject(unsigned) };
  const bytes = JSON.stringify(artifact, null, 2) + "\n";
  if (existsSync(out)) {
    const existing = readFileSync(out, "utf8");
    if (existing !== bytes) throw new Error("REFUSED_GATE2_PASS_EXISTING_ARTIFACT_DIFFERS");
  } else {
    writeFileSync(out, bytes, { encoding: "utf8", flag: "wx" });
  }
  const fileSha256 = sha(bytes);
  const evidenceBindingSha = sha(`v39-gate2-phase2-pass-binding-v1:${artifact.artifact_sha256}:${fileSha256}`);
  const date = artifact.recorded_at_utc.slice(0, 10).replaceAll("-", "");
  const evidenceId = `GATE-2-${date}-${evidenceBindingSha.slice(0, 16).toUpperCase()}`;
  if (!ledger.includes(evidenceId)) {
    appendFileSync(LEDGER, [
      "",
      `### ${evidenceId} — Gate 2 / Phase 2 PASS`,
      `- evidence_id: ${evidenceId}`,
      `- GATE2_PHASE2_PASS_ARTIFACT_SHA256:${artifact.artifact_sha256}`,
      `- GATE2_PHASE2_PASS_FILE_SHA256:${fileSha256}`,
      `- GATE2_PHASE2_PASS_BINDING_SHA256:${evidenceBindingSha}`,
      `- confirmed_final_five: ${finalFive.join(",")}`,
      `- probe_budget_day_id: ${gate2.runtime.probeBudgetDayId}`,
      `- conservative_safe_mode_exposure_credits: ${exposure}`,
      "- phase2_complete: true",
      "- next: MANDATORY_HANDOFF_BEFORE_PHASE_3",
      "",
    ].join("\n"), "utf8");
  }

  console.log(JSON.stringify({
    status: "PASS",
    phase2_complete: true,
    evidence_id: evidenceId,
    artifact_path: out,
    artifact_sha256: artifact.artifact_sha256,
    file_sha256: fileSha256,
    binding_sha256: evidenceBindingSha,
    confirmed_final_five: finalFive,
    probe_budget_day_id: gate2.runtime.probeBudgetDayId,
    conservative_safe_mode_exposure_credits: exposure,
    next: "MANDATORY HANDOFF BEFORE PHASE 3",
  }, null, 2));
}

main().catch((error: any) => {
  console.error(String(error?.message ?? error));
  process.exitCode = 1;
}).finally(async () => { await pool.end().catch(() => undefined); });