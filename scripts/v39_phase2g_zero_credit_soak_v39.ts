import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const PREP = "scripts/v39_prepare_phase2f_workspace_callback_v39.sh";

function intArg(name: string, fallback: number, min: number, max: number): number {
  const i = process.argv.indexOf(name);
  if (i < 0) return fallback;
  const value = Number(process.argv[i + 1]);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`REFUSED:${name}:EXPECTED_INTEGER_${min}_TO_${max}`);
  }
  return value;
}

function gitHead(): string {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("REFUSED:GIT_HEAD_READ_FAILED");
  const head = String(r.stdout ?? "").trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(head)) throw new Error("REFUSED:GIT_HEAD_INVALID");
  return head;
}

function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function atomicJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const durationMinutes = intArg("--duration-minutes", 20, 1, 180);
  const intervalSeconds = intArg("--interval-seconds", 60, 15, 900);
  const expectedHead = gitHead();
  const id = `phase2g-zero-credit-soak-${stamp()}`;
  const logPath = path.resolve("artifacts", `${id}.log`);
  const statusPath = path.resolve("artifacts", `${id}.status.json`);
  const heartbeatPath = path.resolve("artifacts", `${id}.heartbeat.json`);
  const startedAtMs = Date.now();
  const endAtMs = startedAtMs + durationMinutes * 60_000;

  let cycles = 0;
  let passes = 0;
  let failures = 0;
  let consecutiveFailures = 0;
  let maxConsecutiveFailures = 0;
  let recoveredAfterFailure = false;
  let lastCyclePassed: boolean | null = null;
  let stopRequested = false;

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => { stopRequested = true; });
  }

  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const logFd = fs.openSync(logPath, "a");
  const writeLine = (value: unknown) => {
    fs.writeSync(logFd, JSON.stringify(value) + "\n");
    fs.fsyncSync(logFd);
  };

  const base = {
    schema: "v39.phase2g-zero-credit-soak.v1",
    provider_paid_action_performed: false,
    provider_subscription_created: false,
    alert_credits_spent: 0,
    expected_git_head: expectedHead,
    duration_minutes: durationMinutes,
    interval_seconds: intervalSeconds,
    started_at_utc: new Date(startedAtMs).toISOString(),
    log_path: path.relative(ROOT, logPath),
    heartbeat_path: path.relative(ROOT, heartbeatPath),
  };
  atomicJson(statusPath, { ...base, state: "RUNNING", pid: process.pid });
  writeLine({ ...base, event: "SOAK_START", pid: process.pid });

  while (!stopRequested && Date.now() < endAtMs) {
    cycles += 1;
    const observedAtUtc = new Date().toISOString();
    const currentHead = gitHead();
    let passed = false;
    let reason = "";

    if (currentHead !== expectedHead) {
      reason = `git_head_changed:${currentHead}`;
    } else {
      const run = spawnSync("bash", [PREP], {
        cwd: ROOT,
        env: { ...process.env, ADB_AUTO_COLLECT: "false" },
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
      });
      const stdout = String(run.stdout ?? "");
      const stderr = String(run.stderr ?? "");
      passed =
        run.status === 0 &&
        stdout.includes("WORKSPACE_CALLBACK_PREP=PASS") &&
        stdout.includes("AERODATABOX_PROVIDER_CALLED=false") &&
        stdout.includes("ALERT_CREDITS_SPENT=0");
      reason = passed ? "PASS" : `prep_exit=${run.status ?? "null"}`;
      fs.writeSync(logFd, stdout);
      fs.writeSync(logFd, stderr);
      fs.fsyncSync(logFd);
    }

    if (passed) {
      passes += 1;
      if (consecutiveFailures > 0) recoveredAfterFailure = true;
      consecutiveFailures = 0;
    } else {
      failures += 1;
      consecutiveFailures += 1;
      maxConsecutiveFailures = Math.max(maxConsecutiveFailures, consecutiveFailures);
    }
    lastCyclePassed = passed;

    const heartbeat = {
      ...base,
      state: "RUNNING",
      observed_at_utc: observedAtUtc,
      pid: process.pid,
      cycle: cycles,
      cycle_passed: passed,
      reason,
      passes,
      failures,
      consecutive_failures: consecutiveFailures,
      max_consecutive_failures: maxConsecutiveFailures,
      recovered_after_failure: recoveredAfterFailure,
    };
    atomicJson(heartbeatPath, heartbeat);
    writeLine({ ...heartbeat, event: "SOAK_CYCLE" });

    if (!stopRequested && Date.now() < endAtMs) {
      await sleep(intervalSeconds * 1000);
    }
  }

  const endedHealthy = lastCyclePassed === true;
  const state = stopRequested
    ? "STOPPED_BY_SIGNAL"
    : endedHealthy
      ? (failures > 0 && recoveredAfterFailure ? "PASS_RECOVERED_AFTER_FAILURE" : "PASS_STABLE")
      : "FAIL_ENDED_UNHEALTHY";

  const final = {
    ...base,
    state,
    ended_at_utc: new Date().toISOString(),
    pid: process.pid,
    cycles,
    passes,
    failures,
    max_consecutive_failures: maxConsecutiveFailures,
    recovered_after_failure: recoveredAfterFailure,
    final_cycle_passed: lastCyclePassed,
    mutation_scope: "synthetic prepaid ingress + immediate cleanup only",
    host_failure_boundary:
      "A whole Replit container termination also terminates this rehearsal process; that boundary cannot be made independent from inside the same workspace.",
  };
  atomicJson(statusPath, final);
  atomicJson(heartbeatPath, { ...final, observed_at_utc: new Date().toISOString() });
  writeLine({ ...final, event: "SOAK_END" });
  fs.closeSync(logFd);
  console.log(JSON.stringify({ ...final, status_path: path.relative(ROOT, statusPath) }, null, 2));

  if (!stopRequested && !endedHealthy) process.exitCode = 2;
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "v39.phase2g-zero-credit-soak.v1",
    state: "REFUSED_OR_FAILED",
    provider_paid_action_performed: false,
    provider_subscription_created: false,
    alert_credits_spent: 0,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
});
