/**
 * Shared guard for paid/mutating v39 commands (§1.5.15 items 4–6).
 * Every live command must: print resolved phase/gate/commit/hash + planned
 * inputs + spend ceiling BEFORE any live call; verify exact AUTH; refuse
 * before SEND/request on mismatch; produce machine-readable result + exit code.
 *
 * Verification path (ChatGPT P1-7): --auth gives the record ID; --auth-file
 * gives a JSON AUTH record which is fully verified (format, expiry window,
 * budgets, predecessor evidence). A fully valid record VERIFIES (success path
 * exists and is tested). Without a verifiable record, refuse with the precise
 * reason. NEVER proceeds to SEND/request on mismatch.
 *
 * Imported by the smoke/probe/canary/pilot/live-check/population/phase6:start
 * wrappers — never reimplemented per command.
 */

import { readFileSync } from "fs";
import { verifyAuthRecord, type AuthRecord } from "../server/lib/disruption/authRecord_v39";

export interface ResolvedPaidPlan {
  command: string;
  phaseGate: string;
  authId: string | null;
  airportFilterWindow: string | null;
  alertCeiling: number | null;
  restCeilings: Record<string, number> | null;
  startExpiry: string | null;
  stopOwner: string | null;
}

export function parseArgs(argv: string[]): { auth: string | null; evidenceId: string | null; authFile: string | null } {
  let auth: string | null = null;
  let evidenceId: string | null = null;
  let authFile: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--auth" && i + 1 < argv.length) auth = argv[++i];
    if (argv[i] === "--evidence-id" && i + 1 < argv.length) evidenceId = argv[++i];
    if (argv[i] === "--auth-file" && i + 1 < argv.length) authFile = argv[++i];
  }
  return { auth, evidenceId, authFile };
}

/**
 * Enforce the paid-command contract. On success prints the verified plan and
 * RETURNS (caller proceeds). On any mismatch prints REFUSED and exits 2.
 */
export function enforcePaidGuard(command: string, phaseGate: string): ResolvedPaidPlan {
  const { auth, evidenceId, authFile } = parseArgs(process.argv.slice(2));
  console.log(`${command.toUpperCase()} resolved plan:`);
  console.log(`  phase_gate=${phaseGate}`);
  console.log(`  auth=${auth ?? "<missing>"}`);
  console.log(`  evidence_id=${evidenceId ?? "<missing>"}`);
  if (!auth || !/^AUTH-\d{8}-[A-Z0-9]+$/.test(auth)) {
    console.error(`REFUSED: exact --auth AUTH-YYYYMMDD-ID is required before any live call.`);
    process.exit(2);
  }
  if (!authFile) {
    console.error(
      `REFUSED: --auth ${auth} names no verifiable record (supply --auth-file <record.json>; ` +
      `predecessor gates/frozen artifacts required).`,
    );
    process.exit(2);
  }
  let record: AuthRecord;
  try {
    record = JSON.parse(readFileSync(authFile, "utf8"));
  } catch (err: any) {
    console.error(`REFUSED: cannot read AUTH record file ${authFile}: ${err?.message ?? err}`);
    process.exit(2);
  }
  if (record.authorizationId !== auth) {
    console.error(`REFUSED: record id ${record.authorizationId} does not match --auth ${auth}.`);
    process.exit(2);
  }
  // Predecessor evidence: run-report IDs recorded so far (evidence ledger).
  // Gate PASS records do not exist yet in Phase 0 → unsettled predecessors refuse.
  const verdict = verifyAuthRecord(record, { nowUtc: new Date(), existingEvidenceIds: [] });
  if (!verdict.verified) {
    console.error(`REFUSED: AUTH ${auth} failed verification: ${verdict.reason}`);
    process.exit(2);
  }
  const plan: ResolvedPaidPlan = {
    command,
    phaseGate,
    authId: auth,
    airportFilterWindow: record.airportFilterWindow,
    alertCeiling: record.maxAlertCredits,
    restCeilings: record.maxRestUnitsByCategory,
    startExpiry: record.startNotBeforeUtc && record.expiresAtUtc
      ? `${record.startNotBeforeUtc}..${record.expiresAtUtc}` : null,
    stopOwner: record.cleanupOwner,
  };
  console.log(`VERIFIED: AUTH ${auth} passed all checks (ceilings, window, predecessors).`);
  return plan;
}
