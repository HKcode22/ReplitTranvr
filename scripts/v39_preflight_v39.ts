/**
 * v39:preflight — AGGREGATE Phase-0 preflight (§1.5.15 / CRIT-012).
 * A scanner alias is NOT aggregate preflight. This orchestrator runs every
 * Phase-0 closure check in order and FAILS if any prerequisite fails:
 *   repo-intake → migrate:check → test:offline → test:full → typecheck →
 *   lint → build → registry:check → traceability:check → scanner → safety.
 *
 * IMPORTANT lifecycle boundary: `v39:security:verify` is NOT executed here.
 * The binding Log places its live/account/deployment evidence in Phase 2
 * prerequisite P, after Gate 0. Phase 0 only proves that the verifier is a
 * real non-stub command and that its machinery is covered by offline tests.
 * Exit 0 only when every Phase-0 prerequisite below passes.
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

interface Step { name: string; cmd: string; }

/** A package script that is a bare echo is a STUB — its exit 0 proves nothing. */
function mappedCommand(stepName: string): string | null {
  try {
    const p = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    const v = p?.scripts?.[`v39:${stepName}`];
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

function isStub(mapped: string | null): boolean {
  return mapped !== null && /^\s*echo\b/.test(mapped);
}

const STEPS: Step[] = [
  { name: "repo-intake", cmd: "npm run v39:repo-intake" },
  { name: "migrate:check", cmd: "npm run v39:migrate:check" },
  { name: "test:offline", cmd: "npm run v39:test:offline" },
  { name: "test:full", cmd: "npm run v39:test:full" },
  { name: "typecheck", cmd: "npm run v39:typecheck" },
  { name: "lint", cmd: "npm run v39:lint" },
  { name: "build", cmd: "npm run v39:build" },
  { name: "registry:check", cmd: "npm run v39:registry:check" },
  { name: "traceability:check", cmd: "npm run v39:traceability:check" },
  { name: "scanner", cmd: "npm run v39:scanner" },
];

function run(cmd: string): boolean {
  try {
    execSync(cmd, { stdio: "ignore", timeout: 300000 });
    return true;
  } catch {
    return false;
  }
}

function main(): void {
  console.log("PREFLIGHT (aggregate)");
  const failed: string[] = [];
  for (const s of STEPS) {
    const mapped = mappedCommand(s.name);
    if (!mapped || isStub(mapped)) {
      console.log(`  [FAIL] ${s.name} (${!mapped ? "missing mapping" : "echo stub — proves nothing"})`);
      failed.push(`${s.name}:${!mapped ? "missing" : "stub"}`);
      continue;
    }
    const ok = run(s.cmd);
    console.log(`  [${ok ? "PASS" : "FAIL"}] ${s.name}`);
    if (!ok) failed.push(s.name);
  }

  // Phase-0 proves the Phase-2 verifier exists and is not a stub; it does not
  // fabricate the live evidence that Gate 0/Prerequisite P must supply later.
  const securityMapped = mappedCommand("security:verify");
  const securityOwnerReady = !!securityMapped && !isStub(securityMapped) && securityMapped.includes("v39_security_verify_v39.ts");
  console.log(`  [${securityOwnerReady ? "PASS" : "FAIL"}] security-verifier-owner (${securityMapped ?? "missing"})`);
  if (!securityOwnerReady) failed.push("security-verifier-owner");
  console.log("  [DEFERRED] security live/account/deployment evidence → Phase 2 prerequisite P after Gate 0");

  // Safety: collection must resolve OFF in this process env.
  const autoCollect = process.env.ADB_AUTO_COLLECT;
  const safeOff = autoCollect === undefined || autoCollect === "" || ["0", "false", "off", "no"].includes(String(autoCollect).toLowerCase().trim());
  console.log(`  [${safeOff ? "PASS" : "FAIL"}] safety (ADB_AUTO_COLLECT=${autoCollect ?? "<unset>"})`);
  if (!safeOff) failed.push("safety");
  if (failed.length > 0) {
    console.log(`RESULT: FAIL — blocked prerequisites: ${failed.join(", ")}`);
    console.log("MANDATORY STOP before Gate 0 (§2.17). Fix the failed prerequisite only.");
    process.exit(1);
  }
  console.log("RESULT: PASS — all Phase-0 closure checks green. STOP before Phase 1 / Gate 0 (§1.13).");
}

main();
