/**
 * V3.9 Gate-2 Stage-1 owner.
 * Executes at most one paid probe per invocation from the exact frozen
 * shortlist/replacement protocol. No source-code shortlist is an authority.
 */
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import {
  loadProbeExecutionArtifacts,
  PROBE_STAGE1_TARGET_MINUTES,
  type LoadedProbeExecutionArtifacts,
} from "../server/lib/disruption/probeExecution_v39";
import { executePrepaidProbeV39 } from "../server/lib/disruption/probeExecutionPrepaid_v39";
import {
  loadGate2RuntimeBindingV39,
  stage1AuthorizationScopeV39,
} from "../server/lib/disruption/phase2Gate2Runtime_v39";
import {
  selectStage2Top5,
  type Stage1ProbeEvidence,
} from "../server/lib/disruption/anchorPromotion_v39";
import {
  parseArgs,
  resolveOwnerAuthorization,
  verifyAuthFile,
} from "./v39_paid_guard_v39";
import type { AuthRecord } from "../server/lib/disruption/authRecord_v39";

const SCOPE = "Phase 2 / Gate 2 Stage 1";
const AUTH_CLEANUP_BUFFER_MS = 5 * 60_000;

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

function verifiedStage1Auth(argv: string[], binding: ReturnType<typeof loadGate2Binding>): { record: AuthRecord; ceiling: number } {
  const controls = parseArgs(argv);
  if (!controls.authFile) throw new Error("REFUSED: --auth-file required");
  const checked = verifyAuthFile(controls.authFile, SCOPE);
  if ("error" in checked || !checked.verdict.verified) {
    throw new Error(`REFUSED: owner AUTH re-verification failed: ${"error" in checked ? checked.error : checked.verdict.reason}`);
  }
  const record = checked.record;
  const expectedScope = stage1AuthorizationScopeV39(binding);
  if (record.airportFilterWindow !== expectedScope) {
    throw new Error(`REFUSED_STAGE1_SCOPE_MISMATCH:AUTH=${record.airportFilterWindow ?? "<null>"}`);
  }
  const predecessors = [binding.smoke.evidenceId, binding.evidenceId];
  if (!Array.isArray(record.predecessorEvidenceIds) || record.predecessorEvidenceIds.length !== predecessors.length ||
      record.predecessorEvidenceIds.some((id, index) => id !== predecessors[index])) {
    throw new Error(`REFUSED_STAGE1_PREDECESSOR_MISMATCH:${predecessors.join(",")}`);
  }
  if (record.maxRestUnitsByCategory !== null && Object.values(record.maxRestUnitsByCategory).some((x) => Number(x) !== 0)) {
    throw new Error("REFUSED_STAGE1_REST_UNITS_MUST_BE_ZERO");
  }
  if (!record.cleanupOwner?.trim()) throw new Error("REFUSED_STAGE1_CLEANUP_OWNER_REQUIRED");
  const ceiling = Number(record.maxAlertCredits);
  if (!Number.isInteger(ceiling) || ceiling <= 0 || ceiling > 500) {
    throw new Error("REFUSED_STAGE1_AUTH_ALERT_CEILING_MUST_BE_1_TO_500");
  }
  const protectedExposure = binding.runtime.stage1ReservationCredits + binding.runtime.unsettledBurstMarginCredits;
  if (protectedExposure > ceiling) {
    throw new Error("REFUSED_STAGE1_RUNTIME_RESERVATION_PLUS_MARGIN_EXCEEDS_AUTH_CEILING");
  }
  return { record, ceiling };
}

function assertStage1AuthCoversTargetWindow(record: AuthRecord, now = new Date()): void {
  const expires = Date.parse(String(record.expiresAtUtc ?? ""));
  if (!Number.isFinite(expires)) throw new Error("REFUSED_STAGE1_AUTH_EXPIRY_REQUIRED");
  const targetEndWithCleanup = now.getTime() + PROBE_STAGE1_TARGET_MINUTES * 60_000 + AUTH_CLEANUP_BUFFER_MS;
  if (targetEndWithCleanup > expires) {
    throw new Error(
      `REFUSED_STAGE1_AUTH_WINDOW_TOO_SHORT:target_plus_cleanup_ends=${new Date(targetEndWithCleanup).toISOString()}:auth_expires=${record.expiresAtUtc}`,
    );
  }
}

/**
 * Safe-mode rows intentionally retain no exact provider credit delta. For the
 * pure promotion math we express the already-frozen lower/upper per-credit
 * bounds on a synthetic denominator of 1. This is algebraically identical to
 * count/credits ratios and never recreates the deleted provider account value.
 */
export interface Stage1AttemptEvidence extends Stage1ProbeEvidence {
  probeId: number;
  durationCensored: boolean;
  stopReason: string | null;
  reconciliationStatus: string | null;
  recordedAtUtc: string;
}

async function readStage1Evidence(preprobeHash: string): Promise<Stage1AttemptEvidence[]> {
  const r = await pool.query(
    `SELECT probe_id,icao,status,rows_per_hour,credits_spent,unique_flights_per_credit,
            tail_chain_links_per_credit,stability,confirmed_unique_lower,
            confirmed_plus_ambiguous_upper,provider_content_safe_mode,
            confirmed_unique_lower_per_credit,confirmed_plus_ambiguous_upper_per_credit,
            duration_censored,stop_reason,reconciliation_status,recorded_at
       FROM clean.adb_anchor_probe
      WHERE stage=1 AND preprobe_artifact_sha256=$1
      ORDER BY recorded_at ASC,probe_id ASC`,
    [preprobeHash],
  );
  return r.rows.map((x: any) => {
    const safe = x.provider_content_safe_mode === true;
    const lowerRate = x.confirmed_unique_lower_per_credit == null ? null : Number(x.confirmed_unique_lower_per_credit);
    const upperRate = x.confirmed_plus_ambiguous_upper_per_credit == null ? null : Number(x.confirmed_plus_ambiguous_upper_per_credit);
    const safeRates = safe && lowerRate !== null && upperRate !== null && Number.isFinite(lowerRate) && Number.isFinite(upperRate);
    return {
      probeId: Number(x.probe_id),
      icao: String(x.icao).toUpperCase(),
      status: String(x.status),
      rowsPerHour: x.rows_per_hour == null ? null : Number(x.rows_per_hour),
      creditsSpent: safeRates ? 1 : (x.credits_spent == null ? null : Number(x.credits_spent)),
      uniqueFlightsPerCredit: x.unique_flights_per_credit == null ? null : Number(x.unique_flights_per_credit),
      tailChainLinksPerCredit: x.tail_chain_links_per_credit == null ? null : Number(x.tail_chain_links_per_credit),
      stability: x.stability == null ? null : Number(x.stability),
      confirmedUniqueLower: safeRates ? lowerRate : (x.confirmed_unique_lower == null ? null : Number(x.confirmed_unique_lower)),
      confirmedPlusAmbiguousUpper: safeRates ? upperRate : (x.confirmed_plus_ambiguous_upper == null ? null : Number(x.confirmed_plus_ambiguous_upper)),
      durationCensored: x.duration_censored === true,
      stopReason: x.stop_reason == null ? null : String(x.stop_reason),
      reconciliationStatus: x.reconciliation_status == null ? null : String(x.reconciliation_status),
      recordedAtUtc: new Date(x.recorded_at).toISOString(),
    };
  });
}

const MAX_INFRASTRUCTURE_INVALID_RERUNS_PER_PRIMARY = 1;

export function isInfrastructureInvalidStage1AttemptV39(attempt: Stage1AttemptEvidence): boolean {
  if (attempt.status !== "failed") return false;
  if (attempt.durationCensored !== true) return false;
  if (attempt.reconciliationStatus !== "UNRESOLVED") return false;
  const reason = String(attempt.stopReason ?? "");
  return reason.startsWith("supervisor_child_exit");
}

/**
 * Scientific sequencing rule for primary Stage-1 candidates:
 * - preserve every original attempt row;
 * - a completed/non-infrastructure terminal result is terminal;
 * - one and only one rerun is permitted after a verified infrastructure-invalid
 *   first attempt;
 * - a second failed attempt is terminal for sequencing, preventing retry bias.
 *
 * This rule is symmetric across every frozen primary candidate and does not
 * change the two-hour/time-class/cap/score protocol.
 */
export function chooseNextPrimaryStage1TargetV39(
  shortlist: Array<{ icao: string }>,
  attempts: Stage1AttemptEvidence[],
): string | null {
  const grouped = new Map<string, Stage1AttemptEvidence[]>();
  for (const attempt of attempts) {
    const key = attempt.icao.toUpperCase();
    const rows = grouped.get(key) ?? [];
    rows.push(attempt);
    grouped.set(key, rows);
  }

  for (const candidate of shortlist) {
    const icao = candidate.icao.toUpperCase();
    const rows = grouped.get(icao) ?? [];
    if (rows.length === 0) return icao;

    if (rows.some((row) => row.status === "completed")) continue;

    const latest = rows[rows.length - 1];
    const infraInvalidCount = rows.filter(isInfrastructureInvalidStage1AttemptV39).length;
    if (
      rows.length === 1 &&
      infraInvalidCount <= MAX_INFRASTRUCTURE_INVALID_RERUNS_PER_PRIMARY &&
      isInfrastructureInvalidStage1AttemptV39(latest)
    ) {
      return icao;
    }

    // Any second attempt, abandoned row, or non-infrastructure failure is
    // terminal for sequencing. The immutable history remains available for
    // adjudication/promotion.
  }
  return null;
}

async function chooseNextStage1Target(
  artifacts: LoadedProbeExecutionArtifacts,
  evidence: Stage1AttemptEvidence[],
): Promise<{ icao: string; replacement: boolean } | null> {
  const nextPrimary = chooseNextPrimaryStage1TargetV39(artifacts.preprobe.shortlist, evidence);
  if (nextPrimary) return { icao: nextPrimary, replacement: false };

  const promotion = selectStage2Top5(artifacts.preprobe, evidence);
  if (promotion.replacementsNeeded === 0) return null;
  if (!promotion.nextReplacement) {
    throw new Error(`REFUSED_GATE2_UNSAT: ${promotion.replacementsNeeded} Stage-1-valid candidate(s) still needed but frozen replacements are exhausted`);
  }
  return { icao: promotion.nextReplacement, replacement: true };
}

export async function runStage1Owner(argv = process.argv.slice(2)): Promise<number> {
  const auth = resolveOwnerAuthorization(SCOPE, argv);
  const artifacts = loadArtifacts();
  const binding = loadGate2Binding();
  if (artifacts.preprobeSha256 !== binding.smoke.preprobe.fileSha256 || artifacts.runtimeSha256 !== binding.runtimeFileSha256) {
    throw new Error("REFUSED_STAGE1_EXECUTION_ARTIFACT_BINDING_MISMATCH");
  }
  const approved = verifiedStage1Auth(argv, binding);
  assertStage1AuthCoversTargetWindow(approved.record);
  const evidence = await readStage1Evidence(artifacts.preprobeSha256);
  const next = await chooseNextStage1Target(artifacts, evidence);

  if (!next) {
    const promotion = selectStage2Top5(artifacts.preprobe, evidence);
    console.log(JSON.stringify({
      schema: "v39.anchor-stage1-evidence.v3",
      status: "PASS",
      authorizationId: auth.authId,
      preprobeArtifactSha256: artifacts.preprobeSha256,
      runtimeArtifactSha256: artifacts.runtimeSha256,
      gate2RuntimeEvidenceId: binding.evidenceId,
      smokeEvidenceId: binding.smoke.evidenceId,
      primaryStage1Complete: promotion.primaryStage1Complete,
      stage1ValidForPromotion: promotion.ranked.length,
      replacementsNeeded: promotion.replacementsNeeded,
      referenceIcao: promotion.referenceIcao,
      ambiguityMembershipInvariant: promotion.ambiguityMembershipInvariant,
      providerContentSafeMode: true,
      message: "Stage 1/replacement requirements complete; no provider call made",
    }));
    return 0;
  }

  const explicitIndex = argv.indexOf("--icao");
  if (explicitIndex >= 0) {
    const explicit = String(argv[explicitIndex + 1] ?? "").toUpperCase();
    if (explicit !== next.icao) {
      throw new Error(`REFUSED_STAGE1_ORDER: next frozen candidate is ${next.icao}, not ${explicit || "<missing>"}`);
    }
  }

  const result = await executePrepaidProbeV39({
    stage: 1,
    icao: next.icao,
    allowReplacement: next.replacement,
    artifacts,
    authMaxAlertCredits: approved.ceiling,
  });
  if (result.status !== "completed") {
    throw new Error(`REFUSED_STAGE1_PROBE_FAILED: ${next.icao} ${result.stopReason ?? "unknown"}`);
  }
  console.log(JSON.stringify({
    schema: "v39.anchor-stage1-execution.v3",
    status: "PASS",
    authorizationId: auth.authId,
    preprobeArtifactSha256: artifacts.preprobeSha256,
    runtimeArtifactSha256: artifacts.runtimeSha256,
    gate2RuntimeEvidenceId: binding.evidenceId,
    smokeEvidenceId: binding.smoke.evidenceId,
    probeBudgetDayId: artifacts.runtime.probeBudgetDayId,
    icao: next.icao,
    replacement: next.replacement,
    probeId: result.probeId,
    providerContentSafeMode: true,
    durationCensored: result.durationCensored,
    stopReason: result.stopReason,
    message: "One sequential frozen Stage-1 probe completed through isolated App-Storage/UNLOGGED runtime",
  }));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runStage1Owner().catch((error: any) => {
    console.error(JSON.stringify({
      schema: "v39.anchor-stage1-execution.v3",
      status: "FAIL",
      error: error?.message ?? String(error),
    }));
    process.exitCode = 1;
  }).finally(async () => {
    await pool.end().catch(() => undefined);
  });
}