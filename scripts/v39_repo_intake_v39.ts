/**
 * v39:repo-intake — read-only repository intake (§1.5.15 / §2.3).
 * Prints branch/HEAD/worktree + V3.9 file inventory. Never mutates.
 * Exit 0 always (informational); downstream gates interpret the output.
 */
import { execSync } from "child_process";
import { readdirSync, statSync } from "fs";
import { join } from "path";

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "<unavailable>";
  }
}

function countFiles(dir: string, pred: (f: string) => boolean): number {
  try {
    return readdirSync(dir).filter((f) => {
      try { return statSync(join(dir, f)).isFile() && pred(f); } catch { return false; }
    }).length;
  } catch { return -1; }
}

function main(): void {
  const root = process.cwd();
  console.log("REPO-INTAKE");
  console.log(`  repo=${root}`);
  console.log(`  branch=${sh("git branch --show-current")}`);
  console.log(`  head=${sh("git rev-parse HEAD")}`);
  const status = sh("git status --short");
  console.log(`  worktree=${status ? "dirty(" + status.split("\n").length + " paths)" : "clean"}`);
  console.log(`  disruption_modules=${countFiles(join(root, "server/lib/disruption"), (f) => f.endsWith(".ts"))}`);
  console.log(`  test_files=${countFiles(join(root, "tests"), (f) => f.endsWith(".test.ts"))}`);
  console.log(`  migration_files=${countFiles(join(root, "migrations"), (f) => f.endsWith(".sql"))}`);
  console.log(`  script_files=${countFiles(join(root, "scripts"), (f) => f.endsWith(".ts"))}`);
  console.log(`  auto_collect_env=${process.env.ADB_AUTO_COLLECT ?? "<unset>"}`);
  console.log("RESULT: intake complete (read-only, exit 0)");
}

main();
