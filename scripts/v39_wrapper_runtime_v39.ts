import { spawnSync, type SpawnSyncReturns } from "child_process";
import { enforcePaidGuard } from "./v39_paid_guard_v39";

const CONTROL_OPTIONS = new Set(["--auth", "--auth-file", "--evidence-id"]);

export function operationArgs(argv: string[]): string[] {
  const forwarded: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (CONTROL_OPTIONS.has(argv[i])) {
      i++;
      continue;
    }
    forwarded.push(argv[i]);
  }
  return forwarded;
}

export interface WrapperDependencies {
  authorize: typeof enforcePaidGuard;
  spawn: typeof spawnSync;
  write: (line: string) => void;
}

const defaults: WrapperDependencies = {
  authorize: enforcePaidGuard,
  spawn: spawnSync,
  write: console.log,
};

export function runAuthorizedOwner(
  command: string,
  phaseGate: string,
  owner: string,
  argv = process.argv.slice(2),
  dependencies: WrapperDependencies = defaults,
): number {
  const parsedEvidence = argv.findIndex((arg) => arg === "--evidence-id");
  const evidenceId = parsedEvidence >= 0 ? argv[parsedEvidence + 1] ?? null : null;

  // This is deliberately the first operation. No child can exist before AUTH.
  const plan = dependencies.authorize(command, phaseGate);
  const result: SpawnSyncReturns<Buffer> = dependencies.spawn(
    process.execPath,
    ["--import", "tsx", owner, ...operationArgs(argv)],
    {
      stdio: "inherit",
      // Mediation proof for the owner's anti-bypass check: set ONLY here,
      // after exact AUTH verified in-process. Prevents accidental direct
      // execution from mutating; not a boundary against machine owners.
      env: { ...process.env, V39_VERIFIED_AUTH: plan.authId ?? "" },
    },
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
