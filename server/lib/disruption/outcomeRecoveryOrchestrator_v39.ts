/**
 * V3.9-f.8 outcome recovery orchestrator — Phase 0H.
 *
 * Recovery is bound to the ORIGINAL canonical population query identity. A
 * logical opportunity never consumes REST units merely because it is due: the
 * units are reserved by the centralized FIDS transport immediately before each
 * physical attempt. Unknown Gate-0.5 milestone semantics remain unobserved.
 */
import { createHash } from "crypto";
import { fetchFidsAirport } from "./aerodataboxLimiter_v3";
import {
  terminalizeTarget,
  persistOutcome,
  RECOVERY_OPPORTUNITY_OFFSETS_MIN,
  type FlightOperationalState,
  type TerminalTarget,
  type OutcomePersistRow,
} from "./outcomeTerminalizer_v3";

export const OUTCOME_REST_UNIT_BUDGET = 500;
export const OUTCOME_RECOVERY_DEADLINE_HOURS = 24;

export interface OutcomeRecoveryQueryIdentity {
  sourceAirportIcao: string;
  fromLocal: string;
  toLocal: string;
  /** Original population query id used to prove bounded recovery scope. */
  populationQueryId: string;
  queryDirection: "Departure" | "Arrival" | "Both";
}
export interface OutcomeRecoveryTargetInput {
  target: TerminalTarget;
  actualUtc: Date | null;
  actualVerified: boolean;
  referenceArrivalUtc: Date;
}
export interface OutcomeRecoveryFlight {
  flightInstanceId: string;
  operationalState: FlightOperationalState;
  nowUtc: Date;
  targets: OutcomeRecoveryTargetInput[];
  opportunitiesUsed: number;
  /** Retained for compatibility; durable transport budget remains authoritative. */
  categoryRemainingUnits: number;
  recoveryQuery?: OutcomeRecoveryQueryIdentity | null;
}
export interface RecoveryTransportEvidence {
  requestHash: string;
  responseHash: string | null;
  retrievedAtUtc: Date;
  availableAtUtc: Date;
  unitsConsumed: number | null;
  physicalAttempts: number | null;
}
export interface RecoveryTransportResult {
  payload: unknown;
  evidence: RecoveryTransportEvidence;
}
export interface OutcomeRecoveryDependencies {
  recover: (query: OutcomeRecoveryQueryIdentity) => Promise<RecoveryTransportResult | null>;
  /** Gate-0.5-frozen parser. null means milestone semantics are not verified. */
  extractVerifiedActual: (payload: unknown, flightInstanceId: string, target: TerminalTarget) => Date | null;
}
export interface OutcomeRecoveryResult {
  flightInstanceId: string;
  processed: number;
  deferred: number;
  observed: number;
  nextRecoveryDueUtc: Date | null;
  restUnitsConsumed: number | null;
  physicalAttempts: number | null;
  recoveryRequestHash: string | null;
  recoveryResponseHash: string | null;
  failures: string[];
}
type QueryPool = { query: (text: string, params: unknown[]) => Promise<{ rows?: any[]; rowCount: number | null }> };

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

const productionDependencies: OutcomeRecoveryDependencies = {
  async recover(query) {
    const request = {
      airport: query.sourceAirportIcao,
      fromLocal: query.fromLocal,
      toLocal: query.toLocal,
      direction: query.queryDirection,
      category: "outcome" as const,
    };
    const retrievedAtUtc = new Date();
    const payload = await fetchFidsAirport(query.sourceAirportIcao, query.fromLocal, query.toLocal, {
      direction: query.queryDirection,
      withLeg: true,
      category: "outcome",
    });
    const availableAtUtc = new Date();
    if (!payload) return null;
    return {
      payload,
      evidence: {
        requestHash: sha256(request),
        responseHash: sha256(payload),
        retrievedAtUtc,
        availableAtUtc,
        // The centralized limiter durably reserves/debits every physical
        // attempt. Its current return type does not expose an attempt count, so
        // do not invent one here.
        unitsConsumed: null,
        physicalAttempts: null,
      },
    };
  },
  // Actual milestone semantics are a Gate-0.5 MEASURE→FREEZE item. Until a
  // verified parser is injected/wired, recovery cannot create observed labels.
  extractVerifiedActual: () => null,
};

function deadlineFor(target: OutcomeRecoveryTargetInput): Date {
  return new Date(target.referenceArrivalUtc.getTime() + OUTCOME_RECOVERY_DEADLINE_HOURS * 3_600_000);
}

function logicalRecoveryDue(flight: OutcomeRecoveryFlight): Date | null {
  if (flight.opportunitiesUsed >= RECOVERY_OPPORTUNITY_OFFSETS_MIN.length) return null;
  const reference = flight.targets[0]?.referenceArrivalUtc;
  if (!reference) return null;
  const offset = RECOVERY_OPPORTUNITY_OFFSETS_MIN[flight.opportunitiesUsed];
  return new Date(reference.getTime() + offset * 60_000);
}

/**
 * Run one logical recovery opportunity. At most ONE bounded FIDS query is made
 * for the flight/opportunity; all targets are then terminalized from the same
 * response provenance. No query identity → DEFER with zero provider call.
 */
export async function runOutcomeRecoveryForFlight(
  pool: QueryPool,
  flight: OutcomeRecoveryFlight,
  _estimatedCallUnits = 1,
  deps: OutcomeRecoveryDependencies = productionDependencies,
): Promise<OutcomeRecoveryResult> {
  const result: OutcomeRecoveryResult = {
    flightInstanceId: flight.flightInstanceId,
    processed: 0,
    deferred: 0,
    observed: 0,
    nextRecoveryDueUtc: null,
    restUnitsConsumed: 0,
    physicalAttempts: 0,
    recoveryRequestHash: null,
    recoveryResponseHash: null,
    failures: [],
  };

  const due = logicalRecoveryDue(flight);
  const needsRecovery = flight.targets.some((target) => {
    const term = terminalizeTarget({
      target: target.target,
      actualUtc: target.actualUtc,
      actualVerified: target.actualVerified,
      operationalState: flight.operationalState,
      referenceArrivalUtc: target.referenceArrivalUtc,
      nowUtc: flight.nowUtc,
      opportunitiesUsed: flight.opportunitiesUsed,
    });
    return term.recoveryAllowed;
  });

  let transport: RecoveryTransportResult | null = null;
  if (needsRecovery && due && flight.nowUtc >= due) {
    if (!flight.recoveryQuery) {
      result.deferred += 1;
      result.failures.push("missing-original-population-query-identity");
    } else if (flight.targets.every((t) => flight.nowUtc <= deadlineFor(t))) {
      transport = await deps.recover(flight.recoveryQuery);
      if (!transport) result.failures.push("outcome-fids-recovery-failed");
      else {
        result.restUnitsConsumed = transport.evidence.unitsConsumed;
        result.physicalAttempts = transport.evidence.physicalAttempts;
        result.recoveryRequestHash = transport.evidence.requestHash;
        result.recoveryResponseHash = transport.evidence.responseHash;
      }
    }
  }

  for (const target of flight.targets) {
    let actualUtc = target.actualUtc;
    let actualVerified = target.actualVerified;
    if ((!actualUtc || !actualVerified) && transport) {
      const recovered = deps.extractVerifiedActual(transport.payload, flight.flightInstanceId, target.target);
      if (recovered) { actualUtc = recovered; actualVerified = true; }
    }
    const term = terminalizeTarget({
      target: target.target,
      actualUtc,
      actualVerified,
      operationalState: flight.operationalState,
      referenceArrivalUtc: target.referenceArrivalUtc,
      nowUtc: flight.nowUtc,
      opportunitiesUsed: flight.opportunitiesUsed + (transport ? 1 : 0),
    });
    result.processed += 1;
    if (term.labelStatus === "observed") result.observed += 1;
    if (term.recoveryAllowed && term.nextRecoveryDueUtc) {
      result.nextRecoveryDueUtc = !result.nextRecoveryDueUtc || term.nextRecoveryDueUtc < result.nextRecoveryDueUtc
        ? term.nextRecoveryDueUtc : result.nextRecoveryDueUtc;
    }
    const row: OutcomePersistRow = {
      flightInstanceId: flight.flightInstanceId,
      operationalState: flight.operationalState,
      target: target.target,
      labelStatus: term.labelStatus,
      referenceArrivalUtc: target.referenceArrivalUtc,
      recoveryDeadlineUtc: deadlineFor(target),
      opportunitiesUsed: flight.opportunitiesUsed + (transport ? 1 : 0),
      evidenceJson: {
        reason: term.reason,
        verified: actualVerified,
        recovery: transport ? {
          populationQueryId: flight.recoveryQuery?.populationQueryId,
          requestHash: transport.evidence.requestHash,
          responseHash: transport.evidence.responseHash,
          retrievedAtUtc: transport.evidence.retrievedAtUtc.toISOString(),
          availableAtUtc: transport.evidence.availableAtUtc.toISOString(),
        } : null,
      },
    };
    const wrote = await persistOutcome(pool, row);
    if (wrote !== 1) throw new Error(`${target.target}: outcome persistence did not write exactly one row`);
  }
  return result;
}

export async function runOutcomeRecoveryCycle(
  pool: QueryPool,
  flights: OutcomeRecoveryFlight[],
  _budget = OUTCOME_REST_UNIT_BUDGET,
  estimatedCallUnits = 1,
  deps: OutcomeRecoveryDependencies = productionDependencies,
): Promise<{ results: OutcomeRecoveryResult[]; totalConsumed: number | null; deferredFlights: string[] }> {
  const results: OutcomeRecoveryResult[] = [];
  const deferredFlights: string[] = [];
  let total: number | null = 0;
  for (const flight of flights) {
    const r = await runOutcomeRecoveryForFlight(pool, flight, estimatedCallUnits, deps);
    results.push(r);
    if (r.deferred > 0) deferredFlights.push(flight.flightInstanceId);
    if (r.restUnitsConsumed === null) total = null;
    else if (total !== null) total += r.restUnitsConsumed;
  }
  return { results, totalConsumed: total, deferredFlights };
}

export { RECOVERY_OPPORTUNITY_OFFSETS_MIN };
