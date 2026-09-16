import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`DETACHED_SPAWN_REFUSED:MISSING:${name}`);
  return value;
}

function atomicWrite(file: string, value: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, value, "utf8");
  fs.renameSync(tmp, file);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const logPath = path.resolve(required("--log"));
  const pidFile = path.resolve(required("--pid-file"));
  const separator = process.argv.indexOf("--");
  if (separator < 0) throw new Error("DETACHED_SPAWN_REFUSED:MISSING_CHILD_SEPARATOR");
  const childArgs = process.argv.slice(separator + 1);
  if (childArgs[0] !== "scripts/v39_phase2g_stage1_logged_supervisor_v39.ts") {
    throw new Error("DETACHED_SPAWN_REFUSED:CHILD_NOT_STAGE1_SUPERVISOR");
  }
  if (childArgs.length < 2) throw new Error("DETACHED_SPAWN_REFUSED:CHILD_ARGS_MISSING");

  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const logFd = fs.openSync(logPath, "a");
  const child = spawn(process.execPath, ["--import", "tsx", ...childArgs], {
    cwd: process.cwd(),
    env: { ...process.env },
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  if (!child.pid) {
    fs.closeSync(logFd);
    throw new Error("DETACHED_SPAWN_REFUSED:NO_CHILD_PID");
  }
  const pid = child.pid;
  child.unref();
  atomicWrite(pidFile, `${pid}\n`);
  fs.closeSync(logFd);

  // The caller performs a second longer liveness check. This first check catches
  // immediate exec/import/refusal failures while keeping the supervisor in an
  // independent OS session/process group rather than the terminal job group.
  await sleep(1_000);
  try {
    process.kill(pid, 0);
  } catch {
    throw new Error("DETACHED_SPAWN_REFUSED:SUPERVISOR_EXITED_IMMEDIATELY");
  }

  console.log(JSON.stringify({
    schema: "v39.phase2g-detached-supervisor-spawn.v1",
    status: "DETACHED_SUPERVISOR_ALIVE",
    supervisor_pid: pid,
    pid_file: path.relative(process.cwd(), pidFile),
    log_file: path.relative(process.cwd(), logPath),
    detached: true,
    provider_paid_action_performed: false,
    deployment_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "v39.phase2g-detached-supervisor-spawn.v1",
    status: "DETACHED_SPAWN_REFUSED_OR_FAILED",
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exitCode = 1;
});
