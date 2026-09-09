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
import { join } from "path";
import {
  approvedArtifactHashesFromLedger,
  sha256HexString,
  verifyAuthRecord,
  type AuthRecord,
  type AuthVerdict,
} from "../server/lib/disruption/authRecord_v39";

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

function loadLedgerEvidenceIds(): string[] {
  try {
    const ledger = readFileSync(join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md"), "utf8");
    return Array.from(
      new Set(Array.from(ledger.matchAll(/\b((?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+)\b/g)).map((m) => m[1])),
    );
  } catch {
    return [];
  }
}

/**
 * Approved AUTH artifact hashes, from `AUTH_ARTIFACT_SHA256:<64hex>` tokens in
 * the evidence ledger. An artifact authorizes a mutation ONLY when the SHA-256
 * of its exact bytes appears here. No tokens approved yet in Phase 0 → the
 * set is empty and every paid path correctly refuses (fail-closed).
 */
export function loadApprovedArtifactHashes(): string[] {
  try {
    return approvedArtifactHashesFromLedger(
      readFileSync(join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md"), "utf8"),
    );
  } catch {
    return [];
  }
}

export function sha256Hex(raw: string): string {
  return sha256HexString(raw);
}

export interface VerifiedAuthFile {
  record: AuthRecord;
  artifactHash: string;
  verdict: AuthVerdict;
}

/**
 * Verify an AUTH record file against the exact operation gate, the live
 * evidence ledger, and the hash-locked approved-artifact set. Never throws —
 * returns the verdict for the caller to enforce.
 */
export function verifyAuthFile(authFile: string, expectedPhaseGate: string, nowUtc = new Date()): VerifiedAuthFile | { error: string } {
  let raw: string;
  try {
    raw = readFileSync(authFile, "utf8");
  } catch (err: any) {
    return { error: `cannot read AUTH record file ${authFile}: ${err?.message ?? err}` };
  }
  let record: AuthRecord;
  try {
    record = JSON.parse(raw);
  } catch {
    return { error: `AUTH record file ${authFile} is not valid JSON` };
  }
  const artifactHash = sha256Hex(raw);
  const verdict = verifyAuthRecord(record, {
    nowUtc,
    existingEvidenceIds: loadLedgerEvidenceIds(),
    expectedPhaseGate,
    artifactHash,
    approvedArtifactHashes: loadApprovedArtifactHashes(),
  });
  return { record, artifactHash, verdict };
}

/**
 * Owner-level authorization for directly-executed paid scripts
 * (credit_canary, anchor_probe, refill_credits). Two legitimate entries:
 *   1. `V39_VERIFIED_AUTH=<authId>` — set ONLY by runAuthorizedOwner after its
 *      own exact AUTH verification, propagated to the spawned child. The guard
 *      decision already happened in-process; this only proves mediation.
 *   2. `--auth-file <record.json>` — direct verification of the file against
 *      the expected gate, ledger and approved-artifact set.
 * Anything else → throws REFUSE (caller exits 2). Read-only invocations that
 * perform no mutation may pass `allowReadOnly: true` with a probe that proves
 * no mutation (scripts decide; refill balance-display uses it).
 */
export function resolveOwnerAuthorization(
  expectedPhaseGate: string,
  argv = process.argv.slice(2),
  env = process.env,
): { mode: "wrapper-mediated"; authId: string } | { mode: "direct-file"; authId: string } {
  const mediated = env.V39_VERIFIED_AUTH;
  if (mediated && /^AUTH-\d{8}-[A-Z0-9]+$/.test(mediated)) {
    return { mode: "wrapper-mediated", authId: mediated };
  }
  const { auth, authFile } = parseArgs(argv);
  if (auth && authFile) {
    const checked = verifyAuthFile(authFile, expectedPhaseGate);
    if (!("error" in checked) && checked.verdict.verified && checked.record.authorizationId === auth) {
      return { mode: "direct-file", authId: auth };
    }
    const reason = "error" in checked ? checked.error : ((checked.verdict as { reason?: string }).reason ?? "verification failed");
    throw new Error(`REFUSE: direct AUTH verification failed: ${reason}`);
  }
  throw new Error(
    "REFUSE: paid script requires wrapper mediation (V39_VERIFIED_AUTH) or --auth <id> --auth-file <record.json>; direct unmediated execution never mutates",
  );
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
  const checked = verifyAuthFile(authFile, phaseGate);
  if ("error" in checked) {
    console.error(`REFUSED: ${checked.error}`);
    process.exit(2);
  }
  const { record, verdict } = checked;
  if (record.authorizationId !== auth) {
    console.error(`REFUSED: record id ${record.authorizationId} does not match --auth ${auth}.`);
    process.exit(2);
  }
  if (!verdict.verified) {
    console.error(`REFUSED: AUTH ${auth} failed verification: ${(verdict as { reason: string }).reason}`);
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
  console.log(`VERIFIED: AUTH ${auth} passed all checks (ceilings, window, predecessors, approved artifact ${(checked as { artifactHash: string }).artifactHash.slice(0, 12)}…).`);
  return plan;
}
