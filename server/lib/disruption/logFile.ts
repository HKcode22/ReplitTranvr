// ============================================================
// Persistent log file (logs/collector.log)
//
// Problem: on Replit the Shell scrollback is lost on tab refresh /
// workspace restart, so there was no way to review what collection
// was doing. Fix: tee every console line to logs/collector.log
// (append-only) so you can `tail -f logs/collector.log` at any
// time — including AFTER a restart — and paste it back to Claude.
//
// The file lives on disk (gitignored), NOT in the database. It
// rotates by date via a simple size cap (default 20 MB).
//
// Usage:
//   Replit Shell / Mac terminal:
//     tail -f logs/collector.log      # live stream
//     tail -200 logs/collector.log    # last 200 lines
//     wc -l logs/collector.log        # how much you have
// ============================================================

import * as fs from "fs";
import * as path from "path";

const LOG_DIR = path.resolve(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "collector.log");
const MAX_BYTES = Number(process.env.ADB_LOG_MAX_MB || 20) * 1024 * 1024;

function ensureDir(): void {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // never let logging break the app
  }
}

function rotateIfHuge(): void {
  try {
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_BYTES) {
      fs.renameSync(LOG_FILE, `${LOG_FILE}.1`);
    }
  } catch {
    // ignore — rotation is best-effort
  }
}

function append(line: string): void {
  try {
    ensureDir();
    rotateIfHuge();
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch {
    // ignore write errors (disk full, permissions) — the app must not crash
  }
}

function stringifyArg(a: unknown): string {
  if (typeof a === "string") return a;
  if (a instanceof Error) return `${a.name}: ${a.message}`;
  try {
    const s = JSON.stringify(a);
    return s === undefined ? String(a) : s;
  } catch {
    return String(a);
  }
}

/** Patch console.* so every line also lands in logs/collector.log. */
export function installConsoleTee(): void {
  for (const level of ["log", "warn", "error"] as const) {
    const orig = console[level].bind(console);
    (console as unknown as Record<string, (...args: unknown[]) => void>)[level] = (...args: unknown[]) => {
      orig(...args);
      const msg = args.map(stringifyArg).join(" ");
      append(`[${new Date().toISOString()}] [${level}] ${msg}`);
    };
  }
}

export const collectorLogPath = LOG_FILE;
