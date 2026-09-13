/**
 * V3.9 Gate-2 Stage-1 owner.
 * Executes at most one paid probe per invocation from the exact frozen
 * shortlist/replacement protocol. No source-code shortlist is an authority.
 */
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import {
  loadProbeExecutionArtifacts,
  type LoadedProbeExecutionArtifacts,
} from "../server/lib/disruption/probeExecution_v39";
import { executePrepaidProbeV39 } from "../server/lib/disruption/probeExecutionPrepaid_v39";
import {
  selectStage2Top5,
  type Stage1ProbeEvidence,
} from "../server/lib/disruption/anchorPromotion_v39";
import {
  parseArgs,
  resolveOwnerAuthorization,
  verifyAuthFile,
} from "./v39_paid_guard_v39";

const SCOPE = "Phase 2 / Gate 2 Stage 1";

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

function authCeiling(argv: string[]): number {
  const controls = parseArgs(argv);
  if (!controls.authFile) throw new Error("REFUSED: --auth-file required");
  const checked = verifyAuthFile(controls.authFile, SCOPE);
  if ("error" in checked || !checked.verdict.verified) {
    throw new Error(`REFUSED: owner AUTH re-verification failed: ${"error" in checked ? checked.error : checked.verdict.reason}`);
  }
  const ceiling = Number(checked.record.maxAlertCredits);
  if (!Number.isFinite(ceiling) || ceiling <= 0) throw new Error("REFUSED: AUTH maxAlertCredits must be positive");
  return ceiling;
}

/**
 * Safe-mode rows intentionally retain no exact provider credit delta. For the
 * pure promotion math we express the already-frozen lower/upper per-credit
 * bounds on a synthetic denominator of 1. This is algebraically identical to
 * count/credits ratios and never recreates the deleted provider account value.
 */
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

function terminal(status: string | undefined): boolean {
  return status === "completed" || status === "failed" || status === "abandoned";
}

async function chooseNextStage1Target(
  artifacts: LoadedProbeExecutionArtifacts,
  evidence: Stage1ProbeEvidence[],
): Promise<{ icao: string; replacement: boolean } | null> {
  const by = new Map(evidence.map((e) => [e.icao, e]));
  for (const candidate of artifacts.preprobe.shortlist) {
    if (!terminal(by.get(candidate.icao)?.status)) return { icao: candidate.icao, replacement: false };
  }

  const promotion = selectStage2Top5(artifacts.preprobe, evidence);
  if (promotion.replacementsNeeded === 0) return null;
  if (!promotion.nextReplacement) {
    throw new Error(`REFUSED_GATE2_UNSAT: ${promotion.replacementsNeeded} Stage-1-valid candidate(s) still needed but frozen replacements are exhausted`);
  }
  return { icao: promotion.nextReplacement, replacement: true };
}

export async function runStage1Owner(argv = process.argv.slice(2)): Promise<number> {
  const auth = resolveOwnerAuthorization(SCOPE, argv);
  const ceiling = authCeiling(argv);
  const artifacts = loadArtifacts();
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
    authMaxAlertCredits: ceiling,
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
