/**
 * V3.9 Gate-2 Stage-2 owner.
 * Executes at most one confirmation probe per invocation. Frozen Stage-1
 * ranking is the only promotion authority; source-code shortlist constants are
 * never consulted.
 */
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import {
  loadProbeExecutionArtifacts,
  type LoadedProbeExecutionArtifacts,
} from "../server/lib/disruption/probeExecution_v39";
import { executePrepaidProbeV39 } from "../server/lib/disruption/probeExecutionPrepaid_v39";
import {
  loadGate2RuntimeBindingV39,
  stage2AuthorizationScopeV39,
} from "../server/lib/disruption/phase2Gate2Runtime_v39";
import { loadStage1PromotionHandoffV39 } from "../server/lib/disruption/phase2Stage1Handoff_v39";
import {
  finalFiveMembershipInvariant,
  selectStage2Top5,
  type PromotionRow,
  type Stage1ProbeEvidence,
} from "../server/lib/disruption/anchorPromotion_v39";
import {
  parseArgs,
  resolveOwnerAuthorization,
  verifyAuthFile,
} from "./v39_paid_guard_v39";
import type { AuthRecord } from "../server/lib/disruption/authRecord_v39";

const SCOPE = "Phase 2 / Gate 2 Stage 2";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`REFUSED: ${name} is required`);
  return value;
}
function loadArtifacts(): LoadedProbeExecutionArtifacts {
  return loadProbeExecutionArtifacts({
    preprobePath: requiredEnv("ADB_PREPROBE_ARTIFACT_PATH"),
    preprobeSha256: requiredEnv("ADB_PREPROBE_ARTIFACT_SHA256"),
    runtimePath: requiredEnv("ADB_PROBE_RUNTIME_ARTIFACT_PATH"),
    runtimeSha256: requiredEnv("ADB_PROBE_RUNTIME_ARTIFACT_SHA256"),
  });
}
function loadGate2Binding() {
  return loadGate2RuntimeBindingV39({
    probeRuntimePath: requiredEnv("ADB_PROBE_RUNTIME_ARTIFACT_PATH"),
    probeRuntimeFileSha256: requiredEnv("ADB_PROBE_RUNTIME_ARTIFACT_SHA256"),
    smokePath: requiredEnv("ADB_PHASE2_SMOKE_ARTIFACT_PATH"),
    smokeRuntimePath: requiredEnv("ADB_PHASE2_SMOKE_RUNTIME_ARTIFACT_PATH"),
    smokeRuntimeFileSha256: requiredEnv("ADB_PHASE2_SMOKE_RUNTIME_ARTIFACT_SHA256"),
    preprobePath: requiredEnv("ADB_PREPROBE_ARTIFACT_PATH"),
  });
}

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

function verifiedStage2Auth(
  argv: string[],
  binding: ReturnType<typeof loadGate2Binding>,
  promotionBinding: ReturnType<typeof loadStage1PromotionHandoffV39>,
): { record: AuthRecord; ceiling: number } {
  const controls = parseArgs(argv);
  if (!controls.authFile) throw new Error("REFUSED: --auth-file required");
  const checked = verifyAuthFile(controls.authFile, SCOPE);
  if ("error" in checked || !checked.verdict.verified) {
    throw new Error(`REFUSED: owner AUTH re-verification failed: ${"error" in checked ? checked.error : checked.verdict.reason}`);
  }
  const record = checked.record;
  const expectedScope = stage2AuthorizationScopeV39(binding, promotionBinding.bindingSha256);
  if (record.airportFilterWindow !== expectedScope) {
    throw new Error(`REFUSED_STAGE2_SCOPE_MISMATCH:AUTH=${record.airportFilterWindow ?? "<null>"}`);
  }
  const predecessors = [binding.smoke.evidenceId, binding.evidenceId, promotionBinding.evidenceId];
  if (!Array.isArray(record.predecessorEvidenceIds) || record.predecessorEvidenceIds.length !== predecessors.length ||
      record.predecessorEvidenceIds.some((id, index) => id !== predecessors[index])) {
    throw new Error(`REFUSED_STAGE2_PREDECESSOR_MISMATCH:${predecessors.join(",")}`);
  }
  if (record.maxRestUnitsByCategory !== null && Object.values(record.maxRestUnitsByCategory).some((x) => Number(x) !== 0)) {
    throw new Error("REFUSED_STAGE2_REST_UNITS_MUST_BE_ZERO");
  }
  if (!record.cleanupOwner?.trim()) throw new Error("REFUSED_STAGE2_CLEANUP_OWNER_REQUIRED");
  const ceiling = Number(record.maxAlertCredits);
  if (!Number.isInteger(ceiling) || ceiling <= 0 || ceiling > 500) {
    throw new Error("REFUSED_STAGE2_AUTH_ALERT_CEILING_MUST_BE_1_TO_500");
  }
  if (binding.runtime.stage2ReservationCredits > ceiling) {
    throw new Error("REFUSED_STAGE2_RUNTIME_RESERVATION_EXCEEDS_AUTH_CEILING");
  }
  return { record, ceiling };
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
  if (!x) return false;
  if (validStage2(x)) return false;
  return ["completed", "failed", "abandoned"].includes(x.status);
}

function remainingRankAfterStage2Failures(ranked: PromotionRow[], states: Stage2State[]): PromotionRow[] {
  const by = new Map(states.map((x) => [x.icao, x]));
  return ranked.filter((row) => !terminalInvalidStage2(by.get(row.icao)));
}

export async function runStage2Owner(argv = process.argv.slice(2)): Promise<number> {
  const auth = resolveOwnerAuthorization(SCOPE, argv);
  const artifacts = loadArtifacts();
  const binding = loadGate2Binding();
  if (artifacts.preprobeSha256 !== binding.smoke.preprobe.fileSha256 || artifacts.runtimeSha256 !== binding.runtimeFileSha256) {
    throw new Error("REFUSED_STAGE2_EXECUTION_ARTIFACT_BINDING_MISMATCH");
  }
  const stage1 = await readStage1Evidence(artifacts.preprobeSha256);
  const promotion = selectStage2Top5(artifacts.preprobe, stage1);
  if (!promotion.primaryStage1Complete) {
    throw new Error("REFUSED_STAGE2: all 12 frozen primary Stage-1 candidates must reach terminal outcomes first");
  }
  if (promotion.replacementsNeeded > 0) {
    throw new Error(
      `REFUSED_STAGE2: fewer than five Stage-1-valid candidates; next frozen replacement=${promotion.nextReplacement ?? "NONE"}. Run the Stage-1 owner first.`,
    );
  }
  const promotionBinding = loadStage1PromotionHandoffV39({
    path: requiredEnv("ADB_STAGE1_PROMOTION_ARTIFACT_PATH"),
    expectedFileSha256: requiredEnv("ADB_STAGE1_PROMOTION_ARTIFACT_SHA256"),
    gate2: binding,
    currentPromotion: promotion,
  });
  const approved = verifiedStage2Auth(argv, binding, promotionBinding);

  const states = await readStage2State(artifacts.preprobeSha256);
  const byState = new Map(states.map((x) => [x.icao, x]));
  const remaining = remainingRankAfterStage2Failures(promotion.ranked, states);
  if (remaining.length < 5) throw new Error("REFUSED_GATE2_UNSAT: fewer than five Stage-1-valid candidates remain after Stage-2 failures");
  if (!finalFiveMembershipInvariant(remaining)) {
    throw new Error("INSUFFICIENT_IDENTITY_RESOLUTION: replacement final-five membership is not invariant after Stage-2 failures");
  }
  const finalTargets = remaining.slice(0, 5);
  const confirmed = finalTargets.filter((row) => validStage2(byState.get(row.icao)));
  if (confirmed.length === 5) {
    console.log(JSON.stringify({
      schema: "v39.anchor-stage2-evidence.v3",
      status: "PASS",
      authorizationId: auth.authId,
      preprobeArtifactSha256: artifacts.preprobeSha256,
      runtimeArtifactSha256: artifacts.runtimeSha256,
      stage1PromotionEvidenceId: promotionBinding.evidenceId,
      stage1PromotionBindingSha256: promotionBinding.bindingSha256,
      referenceIcao: promotion.referenceIcao,
      confirmedFinalFive: finalTargets.map((x) => x.icao),
      ambiguityMembershipInvariant: true,
      providerContentSafeMode: true,
    }));
    return 0;
  }

  const next = finalTargets.find((row) => !validStage2(byState.get(row.icao)) && !terminalInvalidStage2(byState.get(row.icao)));
  if (!next) {
    throw new Error("REFUSED_STAGE2_RECOMPUTE: a target confirmation is invalid; rerun to consume the next frozen ranked candidate");
  }

  const explicitIndex = argv.indexOf("--icao");
  if (explicitIndex >= 0) {
    const explicit = String(argv[explicitIndex + 1] ?? "").toUpperCase();
    if (explicit !== next.icao) {
      throw new Error(`REFUSED_STAGE2_ORDER: next ranked confirmation is ${next.icao}, not ${explicit || "<missing>"}`);
    }
  }

  const result = await executePrepaidProbeV39({
    stage: 2,
    icao: next.icao,
    allowReplacement: true,
    artifacts,
    authMaxAlertCredits: approved.ceiling,
  });
  if (result.status !== "completed") {
    throw new Error(`REFUSED_STAGE2_PROBE_FAILED: ${next.icao} ${result.stopReason ?? "unknown"}`);
  }
  console.log(JSON.stringify({
    schema: "v39.anchor-stage2-execution.v3",
    status: "PASS",
    authorizationId: auth.authId,
    preprobeArtifactSha256: artifacts.preprobeSha256,
    runtimeArtifactSha256: artifacts.runtimeSha256,
    stage1PromotionEvidenceId: promotionBinding.evidenceId,
    stage1PromotionBindingSha256: promotionBinding.bindingSha256,
    probeBudgetDayId: artifacts.runtime.probeBudgetDayId,
    icao: next.icao,
    probeId: result.probeId,
    providerContentSafeMode: true,
    durationCensored: result.durationCensored,
    stopReason: result.stopReason,
    message: "One sequential frozen Stage-2 confirmation completed through isolated App-Storage/UNLOGGED runtime",
  }));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runStage2Owner().catch((error: any) => {
    console.error(JSON.stringify({
      schema: "v39.anchor-stage2-execution.v3",
      status: "FAIL",
      error: error?.message ?? String(error),
    }));
    process.exitCode = 1;
  }).finally(async () => {
    await pool.end().catch(() => undefined);
  });
}