/**
 * Shared guard for paid/mutating V3.9 commands.
 *
 * Security property: every paid owner independently verifies the exact AUTH
 * artifact. A syntactically valid environment variable is NEVER accepted as
 * authorization proof; environment variables are user-settable and therefore
 * cannot establish wrapper mediation.
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
    return Array.from(new Set(Array.from(
      ledger.matchAll(/\b((?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+)\b/g),
    ).map((m) => m[1])));
  } catch {
    return [];
  }
}

export function loadApprovedArtifactHashes(): string[] {
  try {
    return approvedArtifactHashesFromLedger(
      readFileSync(join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md"), "utf8"),
    );
  } catch {
    return [];
  }
}
export function sha256Hex(raw: string): string { return sha256HexString(raw); }

export interface VerifiedAuthFile {
  record: AuthRecord;
  artifactHash: string;
  verdict: AuthVerdict;
}
export function verifyAuthFile(
  authFile: string,
  expectedPhaseGate: string,
  nowUtc = new Date(),
): VerifiedAuthFile | { error: string } {
  let raw: string;
  try { raw = readFileSync(authFile, "utf8"); }
  catch (err: any) { return { error: `cannot read AUTH record file ${authFile}: ${err?.message ?? err}` }; }
  let record: AuthRecord;
  try { record = JSON.parse(raw); }
  catch { return { error: `AUTH record file ${authFile} is not valid JSON` }; }
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
 * Owner-level authorization. The owner must receive the exact record ID and
 * exact AUTH file bytes and re-verify them itself. `V39_VERIFIED_AUTH` is
 * intentionally ignored/rejected as an authority because any direct caller can
 * set it.
 */
export function resolveOwnerAuthorization(
  expectedPhaseGate: string,
  argv = process.argv.slice(2),
  _env = process.env,
): { mode: "direct-file"; authId: string; artifactHash: string } {
  const { auth, authFile } = parseArgs(argv);
  if (!auth || !authFile) {
    throw new Error(
      "REFUSE: paid owner requires --auth <AUTH-YYYYMMDD-ID> and --auth-file <record.json>; environment-only mediation is not authorization",
    );
  }
  const checked = verifyAuthFile(authFile, expectedPhaseGate);
  if ("error" in checked) throw new Error(`REFUSE: direct AUTH verification failed: ${checked.error}`);
  if (!checked.verdict.verified) {
    throw new Error(`REFUSE: direct AUTH verification failed: ${(checked.verdict as { reason: string }).reason}`);
  }
  if (checked.record.authorizationId !== auth) {
    throw new Error(`REFUSE: AUTH record id ${checked.record.authorizationId} does not match --auth ${auth}`);
  }
  return { mode: "direct-file", authId: auth, artifactHash: checked.artifactHash };
}

/** Wrapper/front-door verification before any owner is spawned. */
export function enforcePaidGuard(command: string, phaseGate: string): ResolvedPaidPlan {
  const { auth, evidenceId, authFile } = parseArgs(process.argv.slice(2));
  console.log(`${command.toUpperCase()} resolved plan:`);
  console.log(`  phase_gate=${phaseGate}`);
  console.log(`  auth=${auth ?? "<missing>"}`);
  console.log(`  evidence_id=${evidenceId ?? "<missing>"}`);
  if (!auth || !/^AUTH-\d{8}-[A-Z0-9]+$/.test(auth)) {
    console.error("REFUSED: exact --auth AUTH-YYYYMMDD-ID is required before any live call.");
    process.exit(2);
  }
  if (!authFile) {
    console.error(`REFUSED: --auth ${auth} requires --auth-file <record.json>.`);
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
  console.log(`VERIFIED: AUTH ${auth} passed exact artifact verification ${checked.artifactHash.slice(0, 12)}…`);
  return plan;
}
