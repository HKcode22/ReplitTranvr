import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

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
  return spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim().toLowerCase();
}
function atomicWriteJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}

async function main(): Promise<void> {
  const authId = required("--auth").toUpperCase();
  const authFile = path.resolve(required("--auth-file"));
  const expectedAuthSha = required("--auth-sha").toLowerCase();
  const runtimeSha = required("--runtime-sha").toLowerCase();
  const budgetDayId = required("--probe-budget-day-id");
  const expectedHead = required("--expected-head").toLowerCase();
  const logPath = path.resolve(required("--log"));
  const statusPath = path.resolve(required("--status"));
  const heartbeatPath = path.resolve(required("--heartbeat"));

  if (!/^AUTH-\d{8}-[A-Z0-9]+$/.test(authId)) throw new Error("SUPERVISOR_REFUSED:AUTH_ID_INVALID");
  if (!/^[a-f0-9]{64}$/.test(expectedAuthSha)) throw new Error("SUPERVISOR_REFUSED:AUTH_SHA_INVALID");
  if (!/^[a-f0-9]{64}$/.test(runtimeSha)) throw new Error("SUPERVISOR_REFUSED:RUNTIME_SHA_INVALID");
  if (!/^[a-f0-9]{40}$/.test(expectedHead)) throw new Error("SUPERVISOR_REFUSED:EXPECTED_HEAD_INVALID");
  if (!fs.existsSync(authFile)) throw new Error("SUPERVISOR_REFUSED:AUTH_FILE_MISSING");
  const actualAuthSha = sha256File(authFile);
  if (actualAuthSha !== expectedAuthSha) throw new Error(`SUPERVISOR_REFUSED:AUTH_SHA_MISMATCH:${actualAuthSha}`);
  const head = gitHead();
  if (head !== expectedHead) throw new Error(`SUPERVISOR_REFUSED:GIT_HEAD_MISMATCH:${head}`);

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
    log_path: path.relative(process.cwd(), logPath),
    heartbeat_path: path.relative(process.cwd(), heartbeatPath),
  };
  atomicWriteJson(statusPath, supervisorStart);
  fs.writeSync(logFd, `${JSON.stringify(supervisorStart)}\n`);
  fs.fsyncSync(logFd);

  const child = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/v39_probe_stage1_v39.ts", "--auth", authId, "--auth-file", authFile],
    {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ["ignore", logFd, logFd],
    },
  );

  let terminationSignal: NodeJS.Signals | null = null;
  const requestTermination = (signal: NodeJS.Signals): void => {
    terminationSignal = signal;
    fs.writeSync(logFd, `${JSON.stringify({
      schema: "v39.phase2g-stage1-supervisor-signal.v1",
      observed_at_utc: new Date().toISOString(),
      signal,
      action: "forward_to_paid_child_then_recover_if_nonzero",
    })}\n`);
    fs.fsyncSync(logFd);
    if (!child.killed) child.kill("SIGTERM");
  };
  process.on("SIGTERM", () => requestTermination("SIGTERM"));
  process.on("SIGINT", () => requestTermination("SIGINT"));
  process.on("SIGHUP", () => requestTermination("SIGHUP"));

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
      log_path: path.relative(process.cwd(), logPath),
    });
  };
  writeHeartbeat();
  const heartbeat = setInterval(writeHeartbeat, 30_000);
  heartbeat.unref();

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

  const childPassed = exit.code === 0 && !exit.signal && !exit.spawnError;
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
    recovery_attempted: recoveryAttempted,
    recovery_exit_code: recoveryExitCode,
    git_head: head,
    authorization_id: authId,
    auth_sha256: expectedAuthSha,
    runtime_sha256: runtimeSha,
    probe_budget_day_id: budgetDayId,
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
