import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { enforcePaidGuard, verifyAuthFile } from "./v39_paid_guard_v39";

const PHASE = "Phase 2 / Gate 2 Stage 1";
const CALLBACK_POLL_MS = 15_000;
const CALLBACK_CONSECUTIVE_FAILURE_LIMIT = 3;

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
async function callbackHealthy(base: string, expectedHead: string): Promise<boolean> {
  try {
    const response = await fetch(`${base}/__v39/workspace-runtime`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (response.status !== 200) return false;
    const json: any = await response.json().catch(() => null);
    const ownerMode = String(json?.runtime_owner_mode ?? "");
    const ownerContract =
      (ownerMode === "replit-managed-project" &&
        json?.managed_replit_workflow === true &&
        json?.detached_workspace_server === false) ||
      (ownerMode === "phase2g-detached-npm-run-dev" &&
        json?.managed_replit_workflow === false &&
        json?.detached_workspace_server === true);
    return json?.schema === "v39.phase2f-workspace-runtime.v1" &&
      json?.status === "PASS" &&
      json?.prepaid_route_registered === true &&
      json?.provider_mutation === false &&
      ownerContract &&
      String(json?.git_head ?? "").toLowerCase() === expectedHead;
  } catch {
    return false;
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
  const logPath = path.resolve(required("--log"));
  const statusPath = path.resolve(required("--status"));
  const heartbeatPath = path.resolve(required("--heartbeat"));
  const expectedIcao = required("--expected-icao").toUpperCase();

  if (!/^AUTH-\d{8}-[A-Z0-9]+$/.test(authId)) throw new Error("SUPERVISOR_REFUSED:AUTH_ID_INVALID");
  if (!/^[a-f0-9]{64}$/.test(expectedAuthSha)) throw new Error("SUPERVISOR_REFUSED:AUTH_SHA_INVALID");
  if (!/^[a-f0-9]{64}$/.test(runtimeSha)) throw new Error("SUPERVISOR_REFUSED:RUNTIME_SHA_INVALID");
  if (!/^[a-f0-9]{40}$/.test(expectedHead)) throw new Error("SUPERVISOR_REFUSED:EXPECTED_HEAD_INVALID");
  if (!/^https:\/\/[^/]+\.replit\.dev$/i.test(callbackBase)) throw new Error("SUPERVISOR_REFUSED:CALLBACK_BASE_NOT_REPLIT_DEV");
  if (!/^[A-Z0-9]{4}$/.test(expectedIcao)) throw new Error("SUPERVISOR_REFUSED:EXPECTED_ICAO_INVALID");
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
  if (!(await callbackHealthy(callbackBase, expectedHead))) throw new Error("SUPERVISOR_REFUSED:CALLBACK_NOT_HEALTHY_AT_START");

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
  let callbackWatchdogTriggered = false;
  let callbackFailureCount = 0;
  let callbackCheckInFlight = false;
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
  };
  process.on("SIGTERM", () => requestTermination("SIGTERM", "supervisor_sigterm"));
  process.on("SIGINT", () => requestTermination("SIGINT", "supervisor_sigint"));
  process.on("SIGHUP", () => requestTermination("SIGHUP", "supervisor_sighup"));

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
    try {
      const healthy = await callbackHealthy(callbackBase, expectedHead);
      callbackFailureCount = healthy ? 0 : callbackFailureCount + 1;
      if (!healthy) {
        fs.writeSync(logFd, `${JSON.stringify({
          schema: "v39.phase2g-stage1-callback-watchdog.v1",
          observed_at_utc: new Date().toISOString(),
          healthy: false,
          consecutive_failures: callbackFailureCount,
          failure_limit: CALLBACK_CONSECUTIVE_FAILURE_LIMIT,
        })}\n`);
        fs.fsyncSync(logFd);
      }
      if (callbackFailureCount >= CALLBACK_CONSECUTIVE_FAILURE_LIMIT && !callbackWatchdogTriggered) {
        callbackWatchdogTriggered = true;
        requestTermination("SIGTERM", "workspace_callback_unreachable_threshold");
      }
    } finally {
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
    child.once("error", (error) => { spawnError = error.message; });
    child.once("exit", (code, signal) => resolve({ code, signal, spawnError }));
  });
  clearInterval(heartbeat);
  clearInterval(callbackWatchdog);

  const childPassed = exit.code === 0 && !exit.signal && !exit.spawnError;
  fs.writeSync(logFd, `${JSON.stringify({
    schema: "v39.command-evidence.v1",
    command: "v39:probe:stage1",
    phaseGate: PHASE,
    owner: "scripts/v39_probe_stage1_owner_v39.ts",
    evidenceId: null,
    status: childPassed ? "PASS" : "FAIL",
    exitCode: exit.code ?? 1,
    error: exit.spawnError,
  })}\n`);
  fs.fsyncSync(logFd);

  let recoveryAttempted = false;
  let recoveryExitCode: number | null = null;
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
      },
    );
    recoveryExitCode = recovery.status ?? 1;
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
    termination_signal_seen_by_supervisor: terminationSignal,
    callback_watchdog_triggered: callbackWatchdogTriggered,
    callback_consecutive_failures_at_exit: callbackFailureCount,
    recovery_attempted: recoveryAttempted,
    recovery_exit_code: recoveryExitCode,
    git_head: head,
    authorization_id: authId,
    auth_sha256: expectedAuthSha,
    runtime_sha256: runtimeSha,
    probe_budget_day_id: budgetDayId,
    expected_icao: expectedIcao,
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
