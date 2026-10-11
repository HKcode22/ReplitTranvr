import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { enforcePaidGuard, verifyAuthFile } from "./v39_paid_guard_v39";
import { armStage1PaidOwnerTerminationBoundV39, stage1PaidOwnerExitVerdictV39, type PaidOwnerTerminationEscalationV39 } from "./v39_phase2g_paid_owner_termination_bound_v39";
import {verifyStage1PublishedDatabaseLiveV39} from "./phase2gStage1PublishedDatabaseLivePreflight_v39";
import {
  advanceStage1WatchdogV39,initialStage1WatchdogStateV39,
  STAGE1_SIX_PLUS_SIX_MAX_CONSECUTIVE_V39,
  STAGE1_SIX_PLUS_SIX_MAX_EPISODES_V39,
  STAGE1_SIX_PLUS_SIX_MAX_CUMULATIVE_MS_V39,
  STAGE1_SIX_PLUS_SIX_WALL_MS_V39,
  type Stage1CallbackWatchdogModeV39
} from "./v39_phase2g_stage1_watchdog_6plus6_policy_v39";

const PHASE = "Phase 2 / Gate 2 Stage 1";
const CALLBACK_POLL_MS = 15_000;
// Four distinct endpoint checks may each require up to 8s of network time.
// A hung aggregate check must never suspend owner supervision indefinitely.
const CALLBACK_HEALTH_CYCLE_HARD_DEADLINE_MS = 40_000;
const CALLBACK_CONSECUTIVE_FAILURE_LIMIT = STAGE1_SIX_PLUS_SIX_MAX_CONSECUTIVE_V39;
// Recovery invokes real exact-subscription provider cleanup. Bound the
// synchronous child without assuming success when it times out: the
// independent GitHub safety watchdog remains responsible for escalation.
const STAGE1_RECOVERY_HARD_DEADLINE_MS = 5 * 60_000;

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}
function sha256File(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function gitHead(): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  if (result.status !== 0 || !result.stdout) throw new Error("SUPERVISOR_REFUSED:GIT_HEAD_READ_FAILED");
  return result.stdout.trim().toLowerCase();
}
function atomicWriteJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}
/**
 * Sanitized diagnostic outcome: never log secrets, response bodies, the real
 * signed webhook URL, database connection strings or raw error messages.
 * Effective paid policy: six primary plus six contingency health checks
 * at 15s each, max 180s per event and max 180s cumulative across the run.
 * Health is not proof of provider delivery; final reconciliation is required.
 */
type CallbackHealthResultV39 = {
  healthy: boolean;
  check: string;
  reason: string;
  http_status: number | null;
  elapsed_ms: number;
};

async function callbackHealthy(
  base: string,
  expectedHead: string,
  callbackMode: string,
): Promise<CallbackHealthResultV39> {
  const started = Date.now();
  let check = "wrong_secret_route";
  const result = (
    healthy: boolean,
    reason: string,
    httpStatus: number | null = null,
  ): CallbackHealthResultV39 => ({
    healthy,
    check: healthy ? "all_checks" : check,
    reason,
    http_status: httpStatus,
    elapsed_ms: Date.now() - started,
  });

  try {
    const wrongSecret = "phase2g-healthcheck-intentionally-wrong";
    const session = "00000000-0000-4000-8000-000000000000";
    const response = await fetch(
      `${base}/api/v1/webhooks/aerodatabox/${encodeURIComponent(wrongSecret)}/prepaid/${session}`,
      {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(8_000),
      },
    );
    const json: any = await response.json().catch(() => null);
    if (response.status !== 404 || json?.error !== "Not found") {
      return result(false, "route_contract_mismatch", response.status);
    }

    const publishedMode = callbackMode === "published";
    const developmentMode =
      callbackMode === "same-app-development-contingency";
    if (!publishedMode && !developmentMode) {
      return result(false, "invalid_callback_mode");
    }

    check = "published_runtime";
    const healthResponse = await fetch(`${base}/__v39/workspace-runtime`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    const health: any = await healthResponse.json().catch(() => null);
    if (
      healthResponse.status !== 200 ||
      health?.schema !== "v39.phase2f-workspace-runtime.v1" ||
      health?.status !== "PASS" ||
      String(health?.git_head ?? "").toLowerCase() !== expectedHead ||
      health?.prepaid_route_registered !== true ||
      Number(health?.retention_hours) !== 168 ||
      health?.provider_mutation !== false ||
      health?.runtime_owner_mode !==
        (publishedMode
          ? "replit-published-deployment"
          : "replit-managed-project") ||
      health?.managed_replit_workflow !==
        (publishedMode ? false : true) ||
      health?.published_deployment !== publishedMode ||
      (
        publishedMode &&
        !["autoscale", "reserved-vm"].includes(
          String(health?.runtime_durability_class ?? "").toLowerCase()
        )
      )
    ) {
      return result(false, "runtime_contract_or_http_mismatch", healthResponse.status);
    }

    check = "webhook_secret_binding";
    const githubWebhookSecret = String(process.env.AERODATABOX_WEBHOOK_SECRET ?? "");
    const githubRuntimeDbUrl = String(process.env.V39_DATABASE_RUNTIME_URL ?? "");
    if (!githubWebhookSecret || !githubRuntimeDbUrl) {
      return result(false, "missing_github_binding_environment");
    }

    const secretResponse = await fetch(`${base}/__v39/phase2g/webhook-secret-match`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "x-v39-phase2g-webhook-secret": githubWebhookSecret,
      },
      signal: AbortSignal.timeout(8_000),
    });
    const secretJson: any = await secretResponse.json().catch(() => null);
    if (
      secretResponse.status !== 200 ||
      secretJson?.schema !== "v39.phase2g-webhook-secret-match.v1" ||
      secretJson?.status !== "PASS" ||
      secretJson?.provider_call !== false ||
      secretJson?.provider_mutation !== false ||
      Number(secretJson?.alert_credits_spent) !== 0
    ) {
      return result(false, "secret_binding_contract_or_http_mismatch", secretResponse.status);
    }

    check = "runtime_db_binding";
    const challenge = `phase2g-supervisor-${process.pid}-${Date.now()}-${expectedHead}`;
    const proof = createHmac("sha256", githubRuntimeDbUrl)
      .update(`phase2g-db-binding:${challenge}`)
      .digest("hex");
    const dbResponse = await fetch(`${base}/__v39/phase2g/runtime-db-binding`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "x-v39-phase2g-db-challenge": challenge,
        "x-v39-phase2g-db-proof": proof,
      },
      signal: AbortSignal.timeout(8_000),
    });
    const dbJson: any = await dbResponse.json().catch(() => null);
    if (
      dbResponse.status !== 200 ||
      dbJson?.schema !== "v39.phase2g-runtime-db-binding.v1" ||
      dbJson?.status !== "PASS" ||
      dbJson?.provider_call !== false ||
      dbJson?.provider_mutation !== false ||
      dbJson?.database_mutation !== false ||
      Number(dbJson?.alert_credits_spent) !== 0
    ) {
      return result(false, "database_binding_contract_or_http_mismatch", dbResponse.status);
    }

    return result(true, "ok", 200);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    return result(
      false,
      name === "TimeoutError" || name === "AbortError"
        ? "request_timeout"
        : "network_or_request_error",
    );
  }
}

async function main(): Promise<void> {
  const authId = required("--auth").toUpperCase();
  const authFile = path.resolve(required("--auth-file"));
  const expectedAuthSha = required("--auth-sha").toLowerCase();
  const runtimeSha = required("--runtime-sha").toLowerCase();
  const budgetDayId = required("--probe-budget-day-id");
  const expectedHead = required("--expected-head").toLowerCase();
  const callbackBase = required("--callback-base").replace(/\/+$/, "");
  const callbackMode = required("--callback-mode").trim().toLowerCase();
  const logPath = path.resolve(required("--log"));
  const statusPath = path.resolve(required("--status"));
  const heartbeatPath = path.resolve(required("--heartbeat"));
  const expectedIcao = required("--expected-icao").toUpperCase();
  const ownerExecutor = required("--owner-executor").trim().toLowerCase();
  // Effective six-plus-six policy cannot be weakened by ENV. Evidence
  // absent from the host is NOT silently represented as sender-delivery proof.
  const requestedWatchdogMode =
    process.env.V39_PHASE2G_CALLBACK_WATCHDOG_POLICY ?? "six-plus-six";
  if(requestedWatchdogMode!=="six-plus-six")
    throw new Error("SUPERVISOR_REFUSED:STAGE1_WATCHDOG_POLICY_MUST_BE_SIX_PLUS_SIX");
  const callbackWatchdogMode:Stage1CallbackWatchdogModeV39="six-plus-six";

  if (!/^AUTH-\d{8}-[A-Z0-9]+$/.test(authId)) throw new Error("SUPERVISOR_REFUSED:AUTH_ID_INVALID");
  if (!/^[a-f0-9]{64}$/.test(expectedAuthSha)) throw new Error("SUPERVISOR_REFUSED:AUTH_SHA_INVALID");
  if (!/^[a-f0-9]{64}$/.test(runtimeSha)) throw new Error("SUPERVISOR_REFUSED:RUNTIME_SHA_INVALID");
  if (!/^[a-f0-9]{40}$/.test(expectedHead)) throw new Error("SUPERVISOR_REFUSED:EXPECTED_HEAD_INVALID");
  if (!/^https:\/\/[^/]+$/i.test(callbackBase)) throw new Error("SUPERVISOR_REFUSED:CALLBACK_BASE_NOT_HTTPS_ORIGIN");
  const isReplitDev = new URL(callbackBase).hostname.toLowerCase().endsWith(".replit.dev");
  if (!["published", "same-app-development-contingency"].includes(callbackMode)) throw new Error("SUPERVISOR_REFUSED:CALLBACK_MODE_INVALID");
  if (isReplitDev && callbackMode !== "same-app-development-contingency") throw new Error("SUPERVISOR_REFUSED:REPLIT_DEV_REQUIRES_EXPLICIT_CONTINGENCY");
  if (!isReplitDev && callbackMode === "same-app-development-contingency") throw new Error("SUPERVISOR_REFUSED:DEV_CONTINGENCY_REQUIRES_REPLIT_DEV");
  if (!/^[A-Z0-9]{4}$/.test(expectedIcao)) throw new Error("SUPERVISOR_REFUSED:EXPECTED_ICAO_INVALID");
  if (ownerExecutor !== "github-actions") throw new Error("SUPERVISOR_REFUSED:OWNER_EXECUTOR_MUST_BE_GITHUB_ACTIONS");
  if (process.env.GITHUB_ACTIONS !== "true" && process.env.V39_ALLOW_NON_GITHUB_OWNER_FOR_OFFLINE_TESTS !== "1") {
    throw new Error("SUPERVISOR_REFUSED:GITHUB_ACTIONS_RUNTIME_REQUIRED");
  }
  if (!fs.existsSync(authFile)) throw new Error("SUPERVISOR_REFUSED:AUTH_FILE_MISSING");
  const actualAuthSha = sha256File(authFile);
  if (actualAuthSha !== expectedAuthSha) throw new Error(`SUPERVISOR_REFUSED:AUTH_SHA_MISMATCH:${actualAuthSha}`);

  // Preserve the same paid front-door contract as every V3.9 paid wrapper.
  // This function reads the exact --auth/--auth-file from this supervisor's
  // argv and refuses before the owner/provider can be spawned.
  const guardedPlan = enforcePaidGuard("v39:probe:stage1", PHASE);
  if (guardedPlan.authId !== authId) throw new Error("SUPERVISOR_REFUSED:PAID_GUARD_AUTH_ID_MISMATCH");

  const checked = verifyAuthFile(authFile, PHASE);
  if ("error" in checked || !checked.verdict.verified) {
    throw new Error(`SUPERVISOR_REFUSED:AUTH_NOT_CURRENTLY_VERIFIED:${"error" in checked ? checked.error : checked.verdict.reason}`);
  }
  if (checked.record.authorizationId !== authId || checked.artifactHash !== expectedAuthSha) {
    throw new Error("SUPERVISOR_REFUSED:AUTH_ID_OR_HASH_REVERIFY_MISMATCH");
  }
  const head = gitHead();
  if (head !== expectedHead) throw new Error(`SUPERVISOR_REFUSED:GIT_HEAD_MISMATCH:${head}`);
  const initialCallbackHealth = await callbackHealthy(callbackBase, expectedHead, callbackMode);
  if (!initialCallbackHealth.healthy) {
    console.error(JSON.stringify({
      schema: "v39.phase2g-stage1-callback-health-diagnostic.v1",
      phase: "prelaunch",
      ...initialCallbackHealth,
    }));
    throw new Error("SUPERVISOR_REFUSED:CALLBACK_OR_BINDING_NOT_HEALTHY_AT_START");
  }

  // A matching database URL is a configuration check, not a live connection.
  // Require actual read-only PostgreSQL SELECT success from the published
  // receiver before opening the log or spawning the paid Stage1 owner.
  // This is deliberately NOT added to the every-15s failure watchdog.
  const dbLive = await verifyStage1PublishedDatabaseLiveV39({
    base:callbackBase, githubRuntimeDbUrl:String(process.env.V39_DATABASE_RUNTIME_URL??"")
  });
  if (!dbLive.healthy) {
    console.error(JSON.stringify({
      schema:"v39.phase2g-stage1-callback-health-diagnostic.v1",
      phase:"prelaunch_db_connectivity",
      ...dbLive
    }));
    throw new Error("SUPERVISOR_REFUSED:PUBLISHED_DATABASE_NOT_CONNECTING");
  }

  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const logFd = fs.openSync(logPath, "a");
  const startedAtUtc = new Date().toISOString();
  const supervisorStart = {
    schema: "v39.phase2g-stage1-supervisor.v1",
    state: "STARTING",
    started_at_utc: startedAtUtc,
    supervisor_pid: process.pid,
    git_head: head,
    authorization_id: authId,
    auth_sha256: expectedAuthSha,
    runtime_sha256: runtimeSha,
    probe_budget_day_id: budgetDayId,
    expected_icao: expectedIcao,
    owner_executor: ownerExecutor,
    callback_mode: callbackMode,
    callback_watchdog_policy: callbackWatchdogMode,
    callback_watchdog_source_proof_implemented: false,
    callback_watchdog_primary_checks:6,
    callback_watchdog_contingency_checks:6,
    callback_watchdog_max_consecutive:CALLBACK_CONSECUTIVE_FAILURE_LIMIT,
    callback_watchdog_max_outage_episodes:STAGE1_SIX_PLUS_SIX_MAX_EPISODES_V39,
    callback_watchdog_max_cumulative_outage_ms:STAGE1_SIX_PLUS_SIX_MAX_CUMULATIVE_MS_V39,
    callback_base: callbackBase,
    log_path: path.relative(process.cwd(), logPath),
    heartbeat_path: path.relative(process.cwd(), heartbeatPath),
  };
  atomicWriteJson(statusPath, supervisorStart);
  fs.writeSync(logFd, `${JSON.stringify(supervisorStart)}\n`);
  fs.fsyncSync(logFd);

  // The owner is spawned directly after the paid guard. It independently
  // re-verifies the same AUTH, while direct parentage lets the supervisor
  // signal the real paid owner before fail-closed recovery.
  const ownerSpawnMonotonicMs = performance.now();
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/v39_probe_stage1_owner_v39.ts", "--auth", authId, "--auth-file", authFile, "--icao", expectedIcao],
    {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ["ignore", logFd, logFd],
    },
  );

  let terminationSignal: NodeJS.Signals | null = null;
  let forcedOwnerKillDeadline: PaidOwnerTerminationEscalationV39 | null = null;
  let callbackWatchdogTriggered = false;
  let callbackFailureCount = 0;
  let watchdogState = initialStage1WatchdogStateV39();
  let callbackCheckInFlight = false;
  let episodeDeadline:NodeJS.Timeout|null=null;
  const requestTermination = (signal: NodeJS.Signals, reason: string): void => {
    terminationSignal = signal;
    fs.writeSync(logFd, `${JSON.stringify({
      schema: "v39.phase2g-stage1-supervisor-signal.v1",
      observed_at_utc: new Date().toISOString(),
      signal,
      reason,
      action: "signal_paid_owner_then_recover_if_nonzero",
    })}\n`);
    fs.fsyncSync(logFd);
    if (!child.killed) child.kill("SIGTERM");
    // Sending SIGTERM is NOT proof the owner has exited. If the child hangs,
    // force its local OS process to exit within a bounded grace period so
    // the supervisor's existing fail-closed provider recovery can execute.
    if (!forcedOwnerKillDeadline) {
      forcedOwnerKillDeadline = armStage1PaidOwnerTerminationBoundV39({
        childStillRunning:()=>child.pid!==undefined&&
          child.exitCode===null&&child.signalCode===null,
        forceKillChild:()=>{
          fs.writeSync(logFd, `${JSON.stringify({
            schema:"v39.phase2g-stage1-supervisor-escalation.v1",
            observed_at_utc:new Date().toISOString(),
            action:"sigkill_unresponsive_local_paid_child_then_recover",
            reason:"paid_child_unresponsive_after_sigterm_grace"
          })}\n`);
          fs.fsyncSync(logFd);
          child.kill("SIGKILL");
        }
      });
    }
  };
  process.on("SIGTERM", () => requestTermination("SIGTERM", "supervisor_sigterm"));
  process.on("SIGINT", () => requestTermination("SIGINT", "supervisor_sigint"));
  process.on("SIGHUP", () => requestTermination("SIGHUP", "supervisor_sighup"));

  // A timer independent of the HTTP poll chain enforces the *earliest*
  // remaining 6+6 single-episode AND whole-run cumulative exposure wall.
  // The normal 15s state machine remains authoritative for count, identity,
  // hard mismatches and science audit. No timer extends the owner life.
  const clearEpisodeDeadline=()=>{
    if(episodeDeadline!==null){clearTimeout(episodeDeadline);episodeDeadline=null;}
  };
  const armEpisodeDeadline=()=>{
    clearEpisodeDeadline();
    if(callbackWatchdogTriggered||
       watchdogState.consecutiveFailures===0||
       watchdogState.firstFailureMonotonicMs===null)return;
    const remainingEpisode=
      STAGE1_SIX_PLUS_SIX_WALL_MS_V39-
      (performance.now()-watchdogState.firstFailureMonotonicMs);
    const remainingCumulative=
      STAGE1_SIX_PLUS_SIX_MAX_CUMULATIVE_MS_V39-
      watchdogState.closedOutageEnvelopeMs-
      (performance.now()-watchdogState.firstFailureMonotonicMs);
    const remaining=Math.min(remainingEpisode,remainingCumulative);
    if(!Number.isFinite(remaining)||remaining<=0){
      callbackWatchdogTriggered=true;
      requestTermination("SIGTERM","workspace_callback_six_plus_six_monotonic_outage_limit");
      return;
    }
    episodeDeadline=setTimeout(()=>{
      if(callbackWatchdogTriggered||child.exitCode!==null||child.killed||
         watchdogState.consecutiveFailures===0)return;
      callbackWatchdogTriggered=true;
      requestTermination("SIGTERM","workspace_callback_six_plus_six_monotonic_outage_limit");
    },Math.max(1,Math.ceil(remaining)));
    episodeDeadline.unref();
  };
  const writeHeartbeat = (): void => {
    atomicWriteJson(heartbeatPath, {
      schema: "v39.phase2g-stage1-heartbeat.v1",
      state: "RUNNING",
      observed_at_utc: new Date().toISOString(),
      started_at_utc: startedAtUtc,
      supervisor_pid: process.pid,
      child_pid: child.pid ?? null,
      authorization_id: authId,
      git_head: head,
      probe_budget_day_id: budgetDayId,
      callback_consecutive_failures: callbackFailureCount,
      callback_watchdog_policy: callbackWatchdogMode,
      // Aggregate episode/risk counters; no secrets, source IDs or flights.
      callback_outage_episodes_observed:watchdogState.outageEpisodeCount,
      callback_closed_outage_envelope_ms:watchdogState.closedOutageEnvelopeMs,
      callback_watchdog_science_audit_pending:
        watchdogState.recoveredHealthAwaitingScienceAudit,
      callback_watchdog_triggered: callbackWatchdogTriggered,
      log_path: path.relative(process.cwd(), logPath),
    });
  };
  writeHeartbeat();
  const heartbeat = setInterval(writeHeartbeat, 30_000);
  heartbeat.unref();

  const callbackWatchdog = setInterval(async () => {
    if (callbackCheckInFlight || child.exitCode !== null || child.killed) return;
    callbackCheckInFlight = true;
    // Independently terminate the paid owner if the entire sequential
    // four-endpoint health cycle stalls. This timer does NOT depend on the
    // async fetch chain completing, and never changes provider retry count.
    const healthCycleDeadline = setTimeout(() => {
      if (callbackWatchdogTriggered || child.exitCode !== null || child.killed) return;
      callbackWatchdogTriggered = true;
      requestTermination("SIGTERM", "workspace_callback_health_cycle_hard_timeout");
    }, CALLBACK_HEALTH_CYCLE_HARD_DEADLINE_MS);
    healthCycleDeadline.unref();
    try {
      const callbackHealth = await callbackHealthy(callbackBase, expectedHead, callbackMode);
      const previousCount = watchdogState.consecutiveFailures;
      const decision = advanceStage1WatchdogV39({
        mode:callbackWatchdogMode,previous:watchdogState,
        health:callbackHealth,nowMonotonicMs:performance.now(),
        // No independent sender-attempt witness is available. Never invent
        // one; 6+6 is a health-stop budget, not scientific certification.
        evidence:undefined
      });
      watchdogState = decision.state;
      callbackFailureCount = watchdogState.consecutiveFailures;
      // Cancel on genuinely complete health verification, otherwise
      // independently bound a stuck/fewer-than-12-polls partial outage.
      armEpisodeDeadline();
      if (!callbackHealth.healthy || (previousCount > 0 && callbackHealth.healthy)) {
        fs.writeSync(logFd, `${JSON.stringify({
          schema: "v39.phase2g-stage1-callback-watchdog.v1",
          observed_at_utc: new Date().toISOString(),
          ...callbackHealth,
          consecutive_failures: callbackFailureCount,
          outage_episodes_observed:watchdogState.outageEpisodeCount,
          closed_outage_envelope_ms:watchdogState.closedOutageEnvelopeMs,
          // The actual paid watchdog is 6+6; provider delivery retries remain ZERO.
          failure_limit:CALLBACK_CONSECUTIVE_FAILURE_LIMIT,
          requested_failure_limit:CALLBACK_CONSECUTIVE_FAILURE_LIMIT,
          effective_failure_limit:CALLBACK_CONSECUTIVE_FAILURE_LIMIT,
          primary_checks:6,contingency_checks:6,
          cumulative_outage_budget_ms:STAGE1_SIX_PLUS_SIX_MAX_CUMULATIVE_MS_V39,
          whole_run_max_episodes:STAGE1_SIX_PLUS_SIX_MAX_EPISODES_V39,
          conditional_extension_authorized:true,
          policy:callbackWatchdogMode,
          phase:decision.phase,
          decision_reason:decision.reason,
          signed_original_source_verified:decision.independentSourceProvenForThisCheck,
          science_audit_pending:watchdogState.recoveredHealthAwaitingScienceAudit,
          scientific_pass_authorized:false
        })}\n`);
        fs.fsyncSync(logFd);
      }
      if (decision.action==="STOP_OWNER" && !callbackWatchdogTriggered) {
        callbackWatchdogTriggered = true;
        requestTermination("SIGTERM", "workspace_callback_unreachable_threshold");
      }
    } catch (_watchdogInternalFailure) {
      // Callback monitor failures must NEVER escape an async setInterval and
      // orphan the paid owner. The source/secret details are not logged.
      if (!callbackWatchdogTriggered) {
        callbackWatchdogTriggered = true;
        requestTermination("SIGTERM", "workspace_watchdog_internal_failure");
      }
    } finally {
      clearTimeout(healthCycleDeadline);
      callbackCheckInFlight = false;
    }
  }, CALLBACK_POLL_MS);
  callbackWatchdog.unref();

  atomicWriteJson(statusPath, {
    ...supervisorStart,
    state: "RUNNING",
    child_pid: child.pid ?? null,
  });

  const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null; spawnError: string | null }>((resolve) => {
    let spawnError: string | null = null;
    // Node guarantees close after an error or exit; exit itself can be absent
    // when spawn fails. Never put a raw OS error message into paid evidence.
    child.once("error", () => { spawnError = "child_spawn_or_process_error"; });
    child.once("close", (code, signal) => resolve({ code, signal, spawnError }));
  });
  forcedOwnerKillDeadline?.cancel();
  clearInterval(heartbeat);
  clearInterval(callbackWatchdog);
  clearEpisodeDeadline();

  const ownerElapsedMonotonicMs = performance.now() - ownerSpawnMonotonicMs;
  const exitVerdict = stage1PaidOwnerExitVerdictV39({
    ...exit,
    elapsedMonotonicMs: ownerElapsedMonotonicMs,
    terminationRequested: terminationSignal !== null,
    watchdogTriggered: callbackWatchdogTriggered,
  });
  const childPassed = exitVerdict.passed;
  fs.writeSync(logFd, `${JSON.stringify({
    schema: "v39.command-evidence.v1",
    command: "v39:probe:stage1",
    phaseGate: PHASE,
    owner: "scripts/v39_probe_stage1_owner_v39.ts",
    evidenceId: null,
    status: childPassed ? "PASS" : "FAIL",
    exit_verdict_reason: exitVerdict.reason,
    exitCode: exit.code ?? 1,
    error: exit.spawnError,
  })}\n`);
  fs.fsyncSync(logFd);

  let recoveryAttempted = false;
  let recoveryExitCode: number | null = null;
  let recoveryTimedOut = false;
  let recoverySignal: NodeJS.Signals | null = null;
  if (!childPassed) {
    recoveryAttempted = true;
    fs.writeSync(logFd, `${JSON.stringify({
      schema: "v39.phase2g-stage1-supervisor-recovery-start.v1",
      observed_at_utc: new Date().toISOString(),
      child_exit_code: exit.code,
      child_signal: exit.signal,
      spawn_error: exit.spawnError,
      callback_watchdog_triggered: callbackWatchdogTriggered,
    })}\n`);
    fs.fsyncSync(logFd);
    const recovery = spawnSync(
      process.execPath,
      [
        "--import", "tsx", "scripts/v39_phase2g_stage1_recover_after_exit_v39.ts",
        "--auth", authId,
        "--auth-file", authFile,
        "--auth-sha", expectedAuthSha,
        "--probe-budget-day-id", budgetDayId,
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["ignore", logFd, logFd],
        timeout: STAGE1_RECOVERY_HARD_DEADLINE_MS,
        killSignal: "SIGKILL",
      },
    );
    recoveryExitCode = recovery.status ?? 1;
    recoverySignal = recovery.signal;
    recoveryTimedOut = Boolean(
      recovery.error &&
      (recovery.error as NodeJS.ErrnoException).code === "ETIMEDOUT"
    );
    if (recoveryTimedOut) {
      fs.writeSync(logFd, `${JSON.stringify({
        schema:"v39.phase2g-stage1-supervisor-recovery-deadline.v1",
        observed_at_utc:new Date().toISOString(),
        reason:"exact_subscription_recovery_deadline_exceeded",
        recovery_proven_complete:false,
        independent_watchdog_escalation_required:true
      })}\n`);
      fs.fsyncSync(logFd);
    }
  }

  const endedAtUtc = new Date().toISOString();
  const finalStatus = {
    schema: "v39.phase2g-stage1-supervisor.v1",
    state: childPassed ? "CHILD_PASS" : "CHILD_FAIL_OR_INTERRUPTED",
    started_at_utc: startedAtUtc,
    ended_at_utc: endedAtUtc,
    supervisor_pid: process.pid,
    child_pid: child.pid ?? null,
    child_exit_code: exit.code,
    child_signal: exit.signal,
    child_spawn_error: exit.spawnError,
    child_exit_verdict_reason: exitVerdict.reason,
    child_wall_elapsed_ms: Math.round(ownerElapsedMonotonicMs),
    termination_signal_seen_by_supervisor: terminationSignal,
    callback_watchdog_triggered: callbackWatchdogTriggered,
    callback_watchdog_policy: callbackWatchdogMode,
    callback_watchdog_source_proof_implemented: false,
    callback_watchdog_science_audit_pending:
      watchdogState.recoveredHealthAwaitingScienceAudit,
    // A live recovered GET never establishes the original notifications
    // were sent and durably persisted. Preserve the full run evidence, but
    // forbid interpreting the supervisor's process PASS alone as scientific
    // promotion when an outage occurred. The frozen full credit/custody
    // reconciliation + study review must decide acceptance.
    scientific_promotion_from_supervisor_alone_authorized:
      childPassed && !watchdogState.recoveredHealthAwaitingScienceAudit,
    scientific_review_required_after_health_recovery:
      watchdogState.recoveredHealthAwaitingScienceAudit,
    callback_consecutive_failures_at_exit: callbackFailureCount,
    recovery_attempted: recoveryAttempted,
    recovery_exit_code: recoveryExitCode,
    recovery_timed_out: recoveryTimedOut,
    recovery_signal: recoverySignal,
    recovery_verified_completed: recoveryAttempted &&
      recoveryExitCode===0 && !recoveryTimedOut && recoverySignal===null,
    git_head: head,
    authorization_id: authId,
    auth_sha256: expectedAuthSha,
    runtime_sha256: runtimeSha,
    probe_budget_day_id: budgetDayId,
    expected_icao: expectedIcao,
    owner_executor: ownerExecutor,
    callback_base: callbackBase,
    log_path: path.relative(process.cwd(), logPath),
    heartbeat_path: path.relative(process.cwd(), heartbeatPath),
  };
  atomicWriteJson(statusPath, finalStatus);
  atomicWriteJson(heartbeatPath, {
    schema: "v39.phase2g-stage1-heartbeat.v1",
    state: "STOPPED",
    observed_at_utc: endedAtUtc,
    child_exit_code: exit.code,
    child_signal: exit.signal,
    callback_watchdog_triggered: callbackWatchdogTriggered,
    recovery_exit_code: recoveryExitCode,
  });
  fs.writeSync(logFd, `${JSON.stringify(finalStatus)}\n`);
  fs.fsyncSync(logFd);
  fs.closeSync(logFd);

  process.exitCode = childPassed ? 0 : 1;
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "v39.phase2g-stage1-supervisor.v1",
    state: "SUPERVISOR_REFUSED_OR_FAILED",
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exitCode = 1;
});
