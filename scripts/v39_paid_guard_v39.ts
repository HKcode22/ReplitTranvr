/**
 * Shared guard for paid/mutating v39 commands (§1.5.15 items 4–6).
 * Every live command must: print resolved phase/gate/commit/hash + planned
 * inputs + spend ceiling BEFORE any live call; verify exact AUTH; refuse
 * before SEND/request on mismatch; produce machine-readable result + exit code.
 *
 * Imported by the smoke/probe/canary/pilot/live-check/population/phase6:start
 * wrappers — never reimplemented per command.
 */

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

export function parseArgs(argv: string[]): { auth: string | null; evidenceId: string | null } {
  let auth: string | null = null;
  let evidenceId: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--auth" && i + 1 < argv.length) auth = argv[++i];
    if (argv[i] === "--evidence-id" && i + 1 < argv.length) evidenceId = argv[++i];
  }
  return { auth, evidenceId };
}

/**
 * Enforce the paid-command contract. Returns the resolved plan for logging.
 * Exits nonzero (refusal) when: no --auth, AUTH format invalid, or the named
 * AUTH record cannot be verified. NEVER proceeds to SEND/request on mismatch.
 */
export function enforcePaidGuard(command: string, phaseGate: string): ResolvedPaidPlan {
  const { auth, evidenceId } = parseArgs(process.argv.slice(2));
  const plan: ResolvedPaidPlan = {
    command,
    phaseGate,
    authId: auth,
    airportFilterWindow: null,
    alertCeiling: null,
    restCeilings: null,
    startExpiry: null,
    stopOwner: null,
  };
  console.log(`${command.toUpperCase()} resolved plan:`);
  console.log(`  phase_gate=${phaseGate}`);
  console.log(`  auth=${auth ?? "<missing>"}`);
  console.log(`  evidence_id=${evidenceId ?? "<missing>"}`);
  if (!auth || !/^AUTH-\d{8}-[A-Z0-9]+$/.test(auth)) {
    console.error(`REFUSED: exact --auth AUTH-YYYYMMDD-ID is required before any live call.`);
    process.exit(2);
  }
  // Full AUTH-record verification (expiry, ceilings, predecessor evidence)
  // binds at gate time against the frozen artifacts; without them, refuse.
  console.error(`REFUSED: no verified AUTH record ${auth} on file for ${command} (predecessor gates/frozen artifacts required).`);
  process.exit(2);
}
