import { spawnSync, type SpawnSyncReturns } from "child_process";
import { enforcePaidGuard, parseArgs } from "./v39_paid_guard_v39";

const CONTROL_OPTIONS = new Set(["--auth", "--auth-file", "--evidence-id"]);

/** Operation-only args; AUTH controls are reattached explicitly for owner verification. */
export function operationArgs(argv: string[]): string[] {
  const forwarded: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (CONTROL_OPTIONS.has(argv[i])) { i++; continue; }
    forwarded.push(argv[i]);
  }
  return forwarded;
}

export interface WrapperDependencies {
  authorize: typeof enforcePaidGuard;
  spawn: typeof spawnSync;
  write: (line: string) => void;
}
const defaults: WrapperDependencies = { authorize: enforcePaidGuard, spawn: spawnSync, write: console.log };

export function runAuthorizedOwner(
  command: string,
  phaseGate: string,
  owner: string,
  argv = process.argv.slice(2),
  dependencies: WrapperDependencies = defaults,
): number {
  const controls = parseArgs(argv);
  const evidenceId = controls.evidenceId;

  // Front-door check is always first. No child/provider call can precede AUTH.
  const plan = dependencies.authorize(command, phaseGate);
  if (!controls.auth || !controls.authFile || controls.auth !== plan.authId) {
    throw new Error("REFUSED: verified wrapper plan is missing the exact AUTH id/file needed for owner re-verification");
  }

  const childArgs = [
    "--import", "tsx", owner,
    ...operationArgs(argv),
    "--auth", controls.auth,
    "--auth-file", controls.authFile,
  ];
  if (evidenceId) childArgs.push("--evidence-id", evidenceId);

  const result: SpawnSyncReturns<Buffer> = dependencies.spawn(
    process.execPath,
    childArgs,
    { stdio: "inherit", env: { ...process.env } },
  );
  const passed = result.status === 0 && !result.error;
  dependencies.write(JSON.stringify({
    schema: "v39.command-evidence.v1",
    command,
    phaseGate,
    owner,
    evidenceId,
    status: passed ? "PASS" : "FAIL",
    exitCode: result.status ?? 1,
    error: result.error?.message ?? null,
  }));
  return passed ? 0 : result.status ?? 1;
}
