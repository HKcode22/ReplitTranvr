import fs from "node:fs";
import path from "node:path";

const PORT = 5000;
const ROOT = fs.realpathSync(process.cwd());

interface ProcInfo {
  pid: number;
  ppid: number | null;
  cmdline: string;
  cwd: string | null;
}

function readText(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function socketInodesForListeningPort(port: number): Set<string> {
  const wanted = port.toString(16).toUpperCase().padStart(4, "0");
  const out = new Set<string>();

  for (const file of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    const raw = readText(file);
    if (!raw) continue;
    for (const line of raw.split("\n").slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 10) continue;
      const local = parts[1] ?? "";
      const state = parts[3] ?? "";
      const inode = parts[9] ?? "";
      const localPort = local.split(":").pop()?.toUpperCase();
      if (localPort === wanted && state === "0A" && /^\d+$/.test(inode)) {
        out.add(inode);
      }
    }
  }
  return out;
}

function procInfo(pid: number): ProcInfo | null {
  const stat = readText(`/proc/${pid}/stat`);
  if (!stat) return null;
  const close = stat.lastIndexOf(")");
  const rest = close >= 0 ? stat.slice(close + 2).trim().split(/\s+/) : [];
  const ppid = rest.length >= 2 && /^\d+$/.test(rest[1] ?? "") ? Number(rest[1]) : null;

  let cmdline = "";
  try {
    cmdline = fs.readFileSync(`/proc/${pid}/cmdline`).toString("utf8").replace(/\0/g, " ").trim();
  } catch {}

  let cwd: string | null = null;
  try {
    cwd = fs.realpathSync(`/proc/${pid}/cwd`);
  } catch {}

  return { pid, ppid, cmdline, cwd };
}

function listenerPids(port: number): ProcInfo[] {
  const inodes = socketInodesForListeningPort(port);
  if (inodes.size === 0) return [];

  const found: ProcInfo[] = [];
  for (const name of fs.readdirSync("/proc")) {
    if (!/^\d+$/.test(name)) continue;
    const pid = Number(name);
    let fds: string[];
    try {
      fds = fs.readdirSync(`/proc/${pid}/fd`);
    } catch {
      continue;
    }
    let owns = false;
    for (const fd of fds) {
      try {
        const target = fs.readlinkSync(`/proc/${pid}/fd/${fd}`);
        const m = target.match(/^socket:\[(\d+)\]$/);
        if (m && inodes.has(m[1])) {
          owns = true;
          break;
        }
      } catch {}
    }
    if (owns) {
      const info = procInfo(pid);
      if (info) found.push(info);
    }
  }
  return found;
}

function isWithinRepo(cwd: string | null): boolean {
  if (!cwd) return false;
  const normalized = path.resolve(cwd);
  return normalized === ROOT || normalized.startsWith(`${ROOT}${path.sep}`);
}

function isRecognizedProjectDevProcess(info: ProcInfo): boolean {
  if (!isWithinRepo(info.cwd)) return false;
  const cmd = info.cmdline;
  return (
    /(?:^|\s)npm(?:\s|$).*\brun\s+dev\b/.test(cmd) ||
    /\btsx\b.*(?:--watch\s+)?server\/index\.ts\b/.test(cmd) ||
    /server\/index\.ts\b/.test(cmd) ||
    /v39_workspace_v3_server_v39\.ts\b/.test(cmd)
  );
}

function sanitized(info: ProcInfo): object {
  return {
    pid: info.pid,
    ppid: info.ppid,
    cwd_is_repo: isWithinRepo(info.cwd),
    cmd: info.cmdline.slice(0, 300),
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const listeners = listenerPids(PORT);
  if (listeners.length === 0) {
    console.log(JSON.stringify({ status: "PASS", action: "PORT_ALREADY_FREE", port: PORT }, null, 2));
    return;
  }

  if (listeners.some((p) => !isRecognizedProjectDevProcess(p))) {
    console.error(JSON.stringify({
      status: "REFUSED",
      reason: "PORT_OWNER_NOT_RECOGNIZED_PROJECT_DEV_PROCESS",
      port: PORT,
      listeners: listeners.map(sanitized),
    }, null, 2));
    process.exitCode = 2;
    return;
  }

  const toStop = new Map<number, ProcInfo>();
  for (const listener of listeners) {
    toStop.set(listener.pid, listener);
    let current = listener;
    for (let depth = 0; depth < 4 && current.ppid && current.ppid > 1; depth += 1) {
      const parent = procInfo(current.ppid);
      if (!parent || !isRecognizedProjectDevProcess(parent)) break;
      toStop.set(parent.pid, parent);
      current = parent;
    }
  }

  const ordered = [...toStop.values()].sort((a, b) => a.pid - b.pid);
  console.log(JSON.stringify({
    status: "TAKEOVER_APPROVED",
    port: PORT,
    reason: "ONLY_RECOGNIZED_REPO_OWNED_DEV_PROCESSES",
    processes: ordered.map(sanitized),
  }, null, 2));

  // Stop children/listeners first, then recognized parents. Never signal an
  // arbitrary shell, workflow manager, or process outside this repository.
  for (const info of [...ordered].sort((a, b) => b.pid - a.pid)) {
    try {
      process.kill(info.pid, "SIGTERM");
    } catch (error: any) {
      if (error?.code !== "ESRCH") throw error;
    }
  }

  for (let i = 0; i < 40; i += 1) {
    await sleep(250);
    if (listenerPids(PORT).length === 0) {
      console.log(JSON.stringify({ status: "PASS", action: "SAFE_PROJECT_DEV_PROCESS_STOPPED", port: PORT }, null, 2));
      return;
    }
  }

  const remaining = listenerPids(PORT);
  console.error(JSON.stringify({
    status: "REFUSED",
    reason: "PORT_STILL_BUSY_AFTER_SAFE_SIGTERM",
    port: PORT,
    listeners: remaining.map(sanitized),
  }, null, 2));
  process.exitCode = 3;
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "FAIL",
    reason: error instanceof Error ? error.message : String(error),
    port: PORT,
  }, null, 2));
  process.exitCode = 1;
});
