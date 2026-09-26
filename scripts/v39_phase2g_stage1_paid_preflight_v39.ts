import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { getBalance, listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import {
  loadGate2RuntimeBindingV39,
  stage1AuthorizationScopeV39,
} from "../server/lib/disruption/phase2Gate2Runtime_v39";
import { sha256HexString, type AuthRecord } from "../server/lib/disruption/authRecord_v39";
import {
  loadPhase2gCompact6AmendmentV39,
} from "../server/lib/disruption/phase2Compact6_v39";
import {
  chooseNextStage1TargetV39,
  type Stage1AttemptEvidence,
} from "./v39_probe_stage1_owner_v39";

const PHASE = "Phase 2 / Gate 2 Stage 1";
const TARGET_MINUTES = 120;
const AUTH_CLEANUP_BUFFER_MINUTES = 5;
const CALLBACK_SOURCE_PATHS = [
  "server/index.ts",
  "server/routes_v3.ts",
  "server/lib/disruption/workspaceRuntimeHealth_v39.ts",
  "server/lib/disruption/prepaidProbeRuntime_v39.ts",
  "server/lib/disruption/prepaidProbeWindow_v39.ts",
  "server/lib/disruption/probeExecutionPrepaid_v39.ts",
  "server/lib/disruption/phase2Compact6_v39.ts",
  "server/lib/disruption/providerBlobStore_v39.ts",
  "server/lib/disruption/replitProviderBlobStore_v39.ts",
  "server/lib/disruption/db_v39.ts",
  "server/db.ts",
] as const;

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}
function optional(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  return value || fallback;
}
function sha256(raw: Buffer | string): string {
  return createHash("sha256").update(raw).digest("hex");
}
function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}
function gitFileAt(ref: string, file: string): string {
  return execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}
function utcWeekdayClass(date: Date): "weekday" | "weekend" {
  const day = date.getUTCDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}
function circularHourDistance(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 24 - d);
}
function workspaceOrigin(): string | null {
  const direct = String(process.env.REPLIT_DEV_DOMAIN ?? "").trim();
  if (direct) {
    const host = direct.replace(/^https?:\/\//, "").split("/")[0];
    if (host.endsWith(".replit.dev")) return `https://${host}`;
  }
  for (const raw of String(process.env.REPLIT_DOMAINS ?? "").split(",")) {
    const host = raw.trim().replace(/^https?:\/\//, "").split("/")[0];
    if (host.endsWith(".replit.dev")) return `https://${host}`;
  }
  return null;
}
async function prepaidRouteHealth(origin: string): Promise<{ status: number; json: any | null }> {
  const wrongSecret = "phase2g-preflight-intentionally-wrong";
  const session = "00000000-0000-4000-8000-000000000000";
  const response = await fetch(
    `${origin}/api/v1/webhooks/aerodatabox/${encodeURIComponent(wrongSecret)}/prepaid/${session}`,
    {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(10_000),
    },
  );
  const text = await response.text().catch(() => "");
  let json: any | null = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: response.status, json };
}
async function getJson(url: string): Promise<{ status: number; json: any | null }> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text().catch(() => "");
  let json: any | null = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: response.status, json };
}
function readAuth(authPath: string): { raw: string; record: AuthRecord; sha256: string } {
  const raw = fs.readFileSync(authPath, "utf8");
  let record: AuthRecord;
  try { record = JSON.parse(raw); }
  catch { throw new Error("BLOCKED:AUTH_INVALID_JSON"); }
  return { raw, record, sha256: sha256HexString(raw) };
}

async function main(): Promise<void> {
  const preprobePath = path.resolve(optional("--preprobe", "artifacts/preprobe-reference-freeze-record.json"));
  const smokePath = path.resolve(required("--smoke"));
  const smokeRuntimePath = path.resolve(required("--smoke-runtime-file"));
  const smokeRuntimeSha = required("--smoke-runtime-sha").toLowerCase();
  const runtimePath = path.resolve(required("--runtime-file"));
  const runtimeSha = required("--runtime-sha").toLowerCase();
  const authPath = path.resolve(required("--auth-file"));
  const expectedAuthSha = required("--auth-sha").toLowerCase();
  const callbackVerificationPath = path.resolve(required("--callback-verification"));
  const callbackVerificationSha = required("--callback-verification-sha").toLowerCase();
  const expectedHead = required("--expected-head").toLowerCase();
  const outPath = path.resolve(required("--out"));
  const expectedIcaoRaw = optional("--expected-icao", "").trim().toUpperCase();
  const expectedIcao = expectedIcaoRaw || null;
  const callbackBase = required("--callback-base").replace(/\/+$/, "");
  const callbackMode = optional("--callback-mode", "published").trim().toLowerCase();
  const callbackContingencyPathRaw = optional("--callback-contingency-file", "");
  const callbackContingencySha = optional("--callback-contingency-sha", "").toLowerCase();
  const ownerExecutor = required("--owner-executor").trim().toLowerCase();
  if (ownerExecutor !== "github-actions") throw new Error("BLOCKED:OWNER_EXECUTOR_MUST_BE_GITHUB_ACTIONS");
  if (!["published", "same-app-development-contingency"].includes(callbackMode)) throw new Error("BLOCKED:CALLBACK_MODE_INVALID");
  if (!/^https:\/\/[^/]+$/i.test(callbackBase)) throw new Error("BLOCKED:CALLBACK_BASE_MUST_BE_HTTPS_ORIGIN");
  const callbackHost = new URL(callbackBase).hostname.toLowerCase();
  const isReplitDev = callbackHost.endsWith(".replit.dev");
  const isDevContingency = callbackMode === "same-app-development-contingency";
  if (isReplitDev && !isDevContingency) throw new Error("BLOCKED:INTERACTIVE_REPLIT_DEV_CALLBACK_REQUIRES_EXPLICIT_CONTINGENCY");
  if (isDevContingency && !isReplitDev) throw new Error("BLOCKED:DEV_CONTINGENCY_REQUIRES_REPLIT_DEV_CALLBACK");
  if (expectedIcao && !/^[A-Z0-9]{4}$/.test(expectedIcao)) {
    throw new Error("BLOCKED:EXPECTED_ICAO_INVALID");
  }

  if (!/^[a-f0-9]{64}$/.test(runtimeSha)) throw new Error("BLOCKED:RUNTIME_SHA_INVALID");
  if (!/^[a-f0-9]{64}$/.test(expectedAuthSha)) throw new Error("BLOCKED:AUTH_SHA_INVALID");
  if (!/^[a-f0-9]{64}$/.test(callbackVerificationSha)) throw new Error("BLOCKED:CALLBACK_VERIFICATION_SHA_INVALID");
  if (!/^[a-f0-9]{40}$/.test(expectedHead)) throw new Error("BLOCKED:EXPECTED_HEAD_INVALID");

  let callbackContingency: any = null;
  let callbackContingencyPath: string | null = null;
  if (isDevContingency) {
    if (!callbackContingencyPathRaw || !/^[a-f0-9]{64}$/.test(callbackContingencySha)) throw new Error("BLOCKED:DEV_CONTINGENCY_ARTIFACT_REQUIRED");
    callbackContingencyPath = path.resolve(callbackContingencyPathRaw);
    const raw = fs.readFileSync(callbackContingencyPath);
    const actualSha = sha256(raw);
    if (actualSha !== callbackContingencySha) throw new Error(`BLOCKED:DEV_CONTINGENCY_SHA_MISMATCH:${actualSha}`);
    try { callbackContingency = JSON.parse(raw.toString("utf8")); } catch { throw new Error("BLOCKED:DEV_CONTINGENCY_INVALID_JSON"); }
    const valid =
      callbackContingency?.schema === "v39.phase2g-same-app-dev-callback-contingency.v1" &&
      callbackContingency?.status === "FROZEN" &&
      callbackContingency?.authorized === true &&
      callbackContingency?.callback_kind === "same-app-replit-development" &&
      callbackContingency?.owner_executor === "github-actions" &&
      callbackContingency?.independent_watchdog_required === true &&
      callbackContingency?.scientific_protocol_unchanged === true &&
      callbackContingency?.exact_match_required === true &&
      Number(callbackContingency?.stage1_target_minutes) === 120 &&
      callbackContingency?.no_automatic_retry === true;
    if (!valid) throw new Error("BLOCKED:DEV_CONTINGENCY_CONTRACT_INVALID");
  }

  const currentHead = git(["rev-parse", "HEAD"]).toLowerCase();
  const blockers: string[] = [];
  if (currentHead !== expectedHead) blockers.push(`git_head_mismatch:${currentHead}`);
  const protectedStatus = git(["status", "--porcelain=v1", "--untracked-files=all", "--", "server", "scripts", "migrations", "tests"]);
  if (protectedStatus.trim()) blockers.push("protected_source_tree_dirty");

  const binding = loadGate2RuntimeBindingV39({
    probeRuntimePath: runtimePath,
    probeRuntimeFileSha256: runtimeSha,
    smokePath,
    smokeRuntimePath,
    smokeRuntimeFileSha256: smokeRuntimeSha,
    preprobePath,
  });

  let compact6: ReturnType<typeof loadPhase2gCompact6AmendmentV39> | null = null;
  if (binding.runtime.stage1AmendmentSha256) {
    try {
      compact6 = loadPhase2gCompact6AmendmentV39({
        expectedSha256: binding.runtime.stage1AmendmentSha256,
        sourcePreprobeFileSha256: binding.smoke.preprobe.fileSha256,
        preprobe: binding.smoke.preprobe.artifact,
      });
    } catch (error) {
      blockers.push(`compact6_amendment_invalid:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const migrationCheck = await pool.query(
    `SELECT
       to_regclass('clean.adb_probe_reconciliation_evidence') IS NOT NULL AS evidence_table,
       EXISTS (
         SELECT 1 FROM information_schema.columns
          WHERE table_schema='clean'
            AND table_name='prepaid_probe_session_runtime'
            AND column_name='callback_requests_seen'
       ) AS callback_counter,
       EXISTS (
         SELECT 1
           FROM pg_constraint
          WHERE conrelid='clean.adb_anchor_probe'::regclass
            AND conname='adb_anchor_probe_status_check'
            AND pg_get_constraintdef(oid) ILIKE '%settling%'
       ) AS settling_status`,
  );
  if (migrationCheck.rows[0]?.evidence_table !== true) blockers.push("phase2g_reconciliation_evidence_table_missing");
  if (migrationCheck.rows[0]?.callback_counter !== true) blockers.push("phase2g_callback_counter_migration_missing");
  if (migrationCheck.rows[0]?.settling_status !== true) blockers.push("phase2g_settling_status_migration_missing");

  const auth = readAuth(authPath);
  if (auth.sha256 !== expectedAuthSha) blockers.push(`auth_sha_mismatch:${auth.sha256}`);
  if (auth.record.phaseGate !== PHASE) blockers.push("auth_phase_mismatch");
  if (auth.record.airportFilterWindow !== stage1AuthorizationScopeV39(binding)) blockers.push("auth_scope_mismatch");
  const predecessors = [binding.smoke.evidenceId, binding.evidenceId];
  if (!Array.isArray(auth.record.predecessorEvidenceIds) ||
      auth.record.predecessorEvidenceIds.length !== predecessors.length ||
      auth.record.predecessorEvidenceIds.some((id, index) => id !== predecessors[index])) {
    blockers.push("auth_predecessor_mismatch");
  }
  const ceiling = Number(auth.record.maxAlertCredits);
  const protectedExposure = binding.runtime.stage1ReservationCredits + binding.runtime.unsettledBurstMarginCredits;
  if (!Number.isInteger(ceiling) || ceiling <= 0 || ceiling > 500 || protectedExposure > ceiling) {
    blockers.push("auth_ceiling_does_not_cover_protected_exposure");
  }
  if (auth.record.maxRestUnitsByCategory !== null &&
      Object.values(auth.record.maxRestUnitsByCategory).some((value) => Number(value) !== 0)) {
    blockers.push("auth_rest_units_nonzero");
  }
  if (!String(auth.record.cleanupOwner ?? "").trim()) blockers.push("auth_cleanup_owner_missing");

  const ledgerPath = path.resolve("SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md");
  const ledger = fs.readFileSync(ledgerPath, "utf8");
  const approvalHeading = `### ${auth.record.authorizationId} — approved Phase 2G Stage-1 authorization`;
  if (!ledger.includes(binding.smoke.evidenceId)) blockers.push("smoke_handoff_not_in_ledger");
  if (!ledger.includes(binding.evidenceId)) blockers.push("gate2_runtime_not_in_ledger");
  if (!ledger.includes(approvalHeading)) blockers.push("exact_stage1_auth_approval_heading_missing");
  if (!ledger.includes(`AUTH_ARTIFACT_SHA256:${expectedAuthSha}`)) blockers.push("exact_stage1_auth_sha_not_approved");
  if (!ledger.includes("approval_scope: PHASE_2G_STAGE1_ONLY")) blockers.push("stage1_approval_scope_missing");

  const startMs = Date.parse(String(auth.record.startNotBeforeUtc ?? ""));
  const expiresMs = Date.parse(String(auth.record.expiresAtUtc ?? ""));
  if (!Number.isFinite(startMs) || !Number.isFinite(expiresMs) || expiresMs <= startMs) {
    blockers.push("auth_time_window_invalid");
  }

  const incidents = await pool.query(`SELECT count(*)::int AS n FROM clean.adb_incident_stop WHERE resolved=false`);
  const openIncidents = Number(incidents.rows[0]?.n ?? -1);
  if (openIncidents !== 0) blockers.push(`open_incidents=${openIncidents}`);

  const activeProbe = await pool.query(
    `SELECT count(*)::int AS n FROM clean.adb_anchor_probe WHERE status IN ('probing','settling')`,
  );
  const activeProbes = Number(activeProbe.rows[0]?.n ?? -1);
  if (activeProbes !== 0) blockers.push(`active_or_settling_probes=${activeProbes}`);

  let nextCandidate: string | null = null;
  if (compact6) {
    const stage1Rows = await pool.query(
      `SELECT probe_id,icao,status,rows_per_hour,credits_spent,unique_flights_per_credit,
              tail_chain_links_per_credit,stability,confirmed_unique_lower,
              confirmed_plus_ambiguous_upper,metric_contract_version,
              duration_censored,stop_reason,reconciliation_status,recorded_at
         FROM clean.adb_anchor_probe
        WHERE stage=1 AND preprobe_artifact_sha256=$1
        ORDER BY recorded_at ASC,probe_id ASC`,
      [binding.smoke.preprobe.fileSha256],
    );
    const evidence: Stage1AttemptEvidence[] = stage1Rows.rows.map((row: any) => ({
      probeId: Number(row.probe_id),
      icao: String(row.icao).toUpperCase(),
      status: String(row.status),
      metricContractVersion:
        row.metric_contract_version == null
          ? null
          : String(row.metric_contract_version),
      rowsPerHour: row.rows_per_hour == null ? null : Number(row.rows_per_hour),
      creditsSpent: row.credits_spent == null ? null : Number(row.credits_spent),
      uniqueFlightsPerCredit: row.unique_flights_per_credit == null ? null : Number(row.unique_flights_per_credit),
      tailChainLinksPerCredit: row.tail_chain_links_per_credit == null ? null : Number(row.tail_chain_links_per_credit),
      stability: row.stability == null ? null : Number(row.stability),
      confirmedUniqueLower: row.confirmed_unique_lower == null ? null : Number(row.confirmed_unique_lower),
      confirmedPlusAmbiguousUpper: row.confirmed_plus_ambiguous_upper == null ? null : Number(row.confirmed_plus_ambiguous_upper),
      durationCensored: row.duration_censored === true,
      stopReason: row.stop_reason == null ? null : String(row.stop_reason),
      reconciliationStatus: row.reconciliation_status == null ? null : String(row.reconciliation_status),
      recordedAtUtc: new Date(row.recorded_at).toISOString(),
    }));

    const next = chooseNextStage1TargetV39(
      {
        ...binding.smoke.preprobe.artifact,
        shortlist: compact6.effectiveShortlist,
      },
      evidence,
      compact6.amendment,
    );
    nextCandidate = next?.icao ?? null;

    if (expectedIcao && nextCandidate !== expectedIcao) {
      blockers.push(`next_candidate_mismatch:expected=${expectedIcao}:actual=${nextCandidate ?? "<none>"}`);
    }
  } else if (expectedIcao) {
    blockers.push("expected_icao_requires_stage1_amendment");
  }

  const sameDayRows = await pool.query(
    `SELECT probe_id,icao,status FROM clean.adb_anchor_probe WHERE probe_budget_day_id=$1 ORDER BY recorded_at ASC`,
    [binding.runtime.probeBudgetDayId],
  );
  if ((sameDayRows.rowCount ?? sameDayRows.rows.length) !== 0) blockers.push("probe_budget_day_already_has_probe_rows");

  const budgetDays = await pool.query(
    `SELECT probe_budget_day_id,state,cap_credits FROM clean.adb_probe_budget_day ORDER BY created_at ASC`,
  );
  const openBudgetDays = budgetDays.rows.filter((row: any) => row.state === "OPEN");
  if (openBudgetDays.length !== 0) blockers.push(`open_probe_budget_days=${openBudgetDays.length}`);

  const balanceCanary: Array<{read:number;creditsRemaining:number}> = [];
  const requireBalanceCanary = compact6?.amendment.p2g08_balance502_recovery_rerun?.requires_balance_stability_canary === true;
  if (requireBalanceCanary) {
    for (let i = 1; i <= 3; i += 1) {
      const canaryBalance = await getBalance();
      if (!canaryBalance) {
        blockers.push(`provider_balance_stability_canary_failed_at_read=${i}`);
        break;
      }
      balanceCanary.push({ read: i, creditsRemaining: canaryBalance.creditsRemaining });
      if (i < 3) await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
    if (balanceCanary.length === 3 &&
        !balanceCanary.every((entry) => entry.creditsRemaining === balanceCanary[0].creditsRemaining)) {
      blockers.push("provider_balance_stability_canary_not_stable");
    }
  }
  const balance = balanceCanary.length === 3
    ? { creditsRemaining: balanceCanary[2].creditsRemaining }
    : await getBalance();
  if (!balance) throw new Error("BLOCKED:PROVIDER_BALANCE_READ_FAILED");
  if (balance.creditsRemaining < 1000 + protectedExposure) {
    blockers.push(`provider_balance_below_protected_floor:${balance.creditsRemaining}`);
  }
  const subscriptions = await listSubscriptionsStrict();
  const activeBillable = subscriptions.filter((subscription) => subscription.isActive && subscription.billingType !== "LifetimeBased");
  if (activeBillable.length !== 0) blockers.push(`active_billable_subscriptions=${activeBillable.length}`);

  const origin = callbackBase;
  let callbackVerification: any = null;
  let developmentRuntimeHealth: any = null;
  let developmentRuntimeHealthExact = false;
  if (isDevContingency) {
    try {
      const health = await getJson(`${origin}/__v39/workspace-runtime`);
      developmentRuntimeHealth = health.json;
      developmentRuntimeHealthExact =
        health.status === 200 &&
        health.json?.schema === "v39.phase2f-workspace-runtime.v1" &&
        health.json?.status === "PASS" &&
        String(health.json?.git_head ?? "").toLowerCase() === expectedHead &&
        health.json?.prepaid_route_registered === true &&
        Number(health.json?.retention_hours) === 168 &&
        health.json?.provider_mutation === false &&
        health.json?.runtime_owner_mode === "replit-managed-project" &&
        health.json?.managed_replit_workflow === true &&
        health.json?.published_deployment === false;
      if (!developmentRuntimeHealthExact) blockers.push("development_callback_runtime_health_not_exact");
    } catch (error) {
      blockers.push(`development_callback_runtime_health_failed:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  try {
    const callbackRaw = fs.readFileSync(callbackVerificationPath);
    const actualCallbackSha = sha256(callbackRaw);
    if (actualCallbackSha !== callbackVerificationSha) {
      blockers.push(`callback_verification_sha_mismatch:${actualCallbackSha}`);
    } else {
      callbackVerification = JSON.parse(callbackRaw.toString("utf8"));
    }
  } catch (error) {
    blockers.push(`callback_verification_unreadable:${error instanceof Error ? error.message : String(error)}`);
  }

  const callbackContractMode = isDevContingency ? "same-app-development-contingency" : "legacy-live-prepaid-route";
  let callback: Record<string, unknown> = {
    origin,
    reachable: false,
    exact_contract: false,
    contract_mode: callbackContractMode,
    callback_mode: callbackMode,
    callback_contingency_sha256: isDevContingency ? callbackContingencySha : null,
    callback_verification_sha256: callbackVerificationSha,
  };

  if (callbackVerification) {
    const generatedMs = Date.parse(String(callbackVerification.generated_at_utc ?? ""));
    const ageMs = Date.now() - generatedMs;
    const before = callbackVerification.before_cleanup ?? {};
    const after = callbackVerification.after_cleanup ?? {};
    const artifactContract =
      callbackVerification.schema === "v39.phase2g-live-callback-verification.v1" &&
      callbackVerification.status === "PASS" &&
      callbackVerification.contract_mode === "live-prepaid-route-end-to-end" &&
      callbackVerification.callback_origin === origin &&
      String(callbackVerification.callback_mode ?? "published") === callbackMode &&
      (!isDevContingency || (
        callbackVerification.callback_contingency_sha256 === callbackContingencySha &&
        String(callbackVerification.workspace_git_head ?? "").toLowerCase() === expectedHead
      )) &&
      callbackVerification.provider_called === false &&
      callbackVerification.provider_subscription_created === false &&
      Number(callbackVerification.alert_credits_spent) === 0 &&
      callbackVerification.wrong_secret_rejected_404 === true &&
      callbackVerification.correct_secret_accepted_200 === true &&
      callbackVerification.persistence_verified === true &&
      callbackVerification.local_exact_session_cleanup_verified === true &&
      Number(before.sessions) === 1 &&
      Number(before.deliveries) === 1 &&
      Number(before.items) === 1 &&
      Number(before.blobs) === 1 &&
      Number(before.live_blobs) === 1 &&
      Number(after.sessions) === 0 &&
      Number(after.deliveries) === 0 &&
      Number(after.items) === 0 &&
      Number(after.live_blobs) === 0 &&
      Number(after.deleted_blobs) === 1 &&
      Number.isFinite(generatedMs) &&
      ageMs >= -5 * 60_000 &&
      ageMs <= 24 * 60 * 60_000;

    if (!artifactContract) blockers.push("callback_verification_contract_invalid_or_stale");

    try {
      const live = await prepaidRouteHealth(origin);
      const liveRouteHealthy = live.status === 404 && live.json?.error === "Not found";
      callback = {
        origin,
        reachable: liveRouteHealthy,
        exact_contract: artifactContract && liveRouteHealthy,
        contract_mode: callbackContractMode,
        callback_mode: callbackMode,
        callback_contingency_sha256: isDevContingency ? callbackContingencySha : null,
        callback_verification_sha256: callbackVerificationSha,
        callback_verification_generated_at_utc: callbackVerification.generated_at_utc ?? null,
        wrong_secret_live_check_status: live.status,
        provider_blob_boundary_proven_by_callback_verification: artifactContract,
        source_compatible_with_current_head: isDevContingency ? developmentRuntimeHealthExact : null,
        development_runtime_health: isDevContingency ? developmentRuntimeHealth : null,
      };
      if (!liveRouteHealthy) blockers.push("callback_live_route_check_failed");
    } catch (error) {
      callback = {
        origin,
        reachable: false,
        exact_contract: false,
        contract_mode: callbackContractMode,
        callback_mode: callbackMode,
        callback_contingency_sha256: isDevContingency ? callbackContingencySha : null,
        callback_verification_sha256: callbackVerificationSha,
        error: error instanceof Error ? error.message : String(error),
      };
      blockers.push("callback_live_route_check_failed");
    }
  }

  const now = new Date();
  const tc = binding.smoke.preprobe.artifact.probeTimeClass;
  const currentClass = utcWeekdayClass(now);
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const timeClassEligible = currentClass === tc.stage1WeekdayClass && circularHourDistance(hour, tc.stage1UtcSlotHour) <= 1;
  const safeLatestStartMs = expiresMs - (TARGET_MINUTES + AUTH_CLEANUP_BUFFER_MINUTES) * 60_000;
  const authStarted = Number.isFinite(startMs) && now.getTime() >= startMs;
  const authNotExpired = Number.isFinite(expiresMs) && now.getTime() <= expiresMs;
  const safeToStartByAuthDuration = Number.isFinite(safeLatestStartMs) && now.getTime() <= safeLatestStartMs;
  const targetEnd = new Date(now.getTime() + TARGET_MINUTES * 60_000);
  const wouldCrossUtcMidnight = now.toISOString().slice(0, 10) !== targetEnd.toISOString().slice(0, 10);

  if (authStarted && !authNotExpired) blockers.push("auth_expired");
  if (authStarted && !safeToStartByAuthDuration) blockers.push("auth_remaining_duration_too_short");
  if (authStarted && wouldCrossUtcMidnight) blockers.push("probe_would_cross_utc_midnight");
  if (authStarted && !timeClassEligible) blockers.push("outside_frozen_stage1_time_class");

  let status: "PASS_READY_FOR_PAID_STAGE1" | "PASS_WAIT_FOR_AUTH_START" | "BLOCKED";
  if (blockers.length > 0) {
    status = "BLOCKED";
  } else if (!authStarted) {
    const secondsUntilStart = Math.ceil((startMs - now.getTime()) / 1000);
    status = secondsUntilStart >= 0 && secondsUntilStart <= 30 * 60
      ? "PASS_WAIT_FOR_AUTH_START"
      : "BLOCKED";
    if (status === "BLOCKED") blockers.push(`auth_not_started_seconds=${secondsUntilStart}`);
  } else {
    status = "PASS_READY_FOR_PAID_STAGE1";
  }

  const receipt = {
    schema: "v39.phase2g-stage1-paid-preflight.v1",
    status,
    mutation_performed: false,
    provider_paid_action_performed: false,
    deployment_performed: false,
    generated_at_utc: now.toISOString(),
    git_head: currentHead,
    expected_git_head: expectedHead,
    auth: {
      authorization_id: auth.record.authorizationId,
      file: path.relative(process.cwd(), authPath),
      sha256: auth.sha256,
      start_not_before_utc: auth.record.startNotBeforeUtc,
      expires_at_utc: auth.record.expiresAtUtc,
      max_alert_credits: ceiling,
      protected_exposure_credits: protectedExposure,
      safe_latest_start_utc: Number.isFinite(safeLatestStartMs) ? new Date(safeLatestStartMs).toISOString() : null,
      approved_in_ledger: ledger.includes(approvalHeading) && ledger.includes(`AUTH_ARTIFACT_SHA256:${expectedAuthSha}`),
    },
    gate2_runtime: {
      file: path.relative(process.cwd(), runtimePath),
      file_sha256: binding.runtimeFileSha256,
      binding_sha256: binding.bindingSha256,
      evidence_id: binding.evidenceId,
      probe_budget_day_id: binding.runtime.probeBudgetDayId,
      stage1_reservation_credits: binding.runtime.stage1ReservationCredits,
      unsettled_burst_margin_credits: binding.runtime.unsettledBurstMarginCredits,
      stage1_amendment_sha256: binding.runtime.stage1AmendmentSha256,
      compact6_validated: compact6 !== null,
      next_candidate: nextCandidate,
      expected_icao: expectedIcao,
    },
    provider: {
      credits_remaining: balance.creditsRemaining,
      protected_floor_after_authorized_exposure: 1000,
      active_billable_subscriptions: activeBillable.length,
      balance_stability_canary: balanceCanary,
    },
    database: {
      open_incidents: openIncidents,
      active_or_settling_probes: activeProbes,
      same_budget_day_probe_rows: sameDayRows.rowCount ?? sameDayRows.rows.length,
      open_probe_budget_days: openBudgetDays.length,
    },
    frozen_stage1_time_class: {
      utc_slot_hour: tc.stage1UtcSlotHour,
      weekday_class: tc.stage1WeekdayClass,
      eligible_now: timeClassEligible,
      would_cross_utc_midnight_if_started_now: wouldCrossUtcMidnight,
    },
    owner_executor: ownerExecutor,
    callback_mode: callbackMode,
    callback_contingency: isDevContingency ? {
      file: callbackContingencyPath ? path.relative(process.cwd(), callbackContingencyPath) : null,
      sha256: callbackContingencySha,
      schema: callbackContingency?.schema ?? null,
      scientific_protocol_unchanged: callbackContingency?.scientific_protocol_unchanged === true,
    } : null,
    callback,
    blockers,
    next: status === "PASS_READY_FOR_PAID_STAGE1"
      ? "Launch only through the exact hash-bound GitHub Actions Stage-1 owner; the published deployment is callback-only."
      : status === "PASS_WAIT_FOR_AUTH_START"
        ? "Wait until AUTH start/time-class opens, rerun this preflight, then launch only on PASS_READY_FOR_PAID_STAGE1."
        : "Resolve blockers; do not launch Stage 1.",
  };

  const raw = JSON.stringify(receipt, null, 2) + "\n";
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, raw, { encoding: "utf8", flag: "wx" });
  const fileSha256 = sha256(raw);
  console.log(JSON.stringify({
    ...receipt,
    preflight_receipt: path.relative(process.cwd(), outPath),
    preflight_receipt_sha256: fileSha256,
  }, null, 2));

  if (status === "BLOCKED") process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      schema: "v39.phase2g-stage1-paid-preflight.v1",
      status: "BLOCKED",
      mutation_performed: false,
      provider_paid_action_performed: false,
      deployment_performed: false,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });