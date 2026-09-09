/**
 * Outcome recovery orchestrator — Phase 0H (§1.5.8 / gptP0analyze4 #10).
 *
 * Production owner that drives the terminalizer across the +30/+120/+360
 * logical recovery schedule for flights bound to their ORIGINAL canonical
 * identity, honoring OUTCOME_REST_UNIT_BUDGET and max-three-attempt transport.
 *
 * Rules (0H):
 *  - Every flight is the bounded canonical flight_instance_id (never an
 *    unbounded flight-number/carrier loose search).
 *  - A recovery call proceeds only when the OUTCOME REST category can fund it
 *    (recoveryBudgetGate); a shortfall DEFERs — never borrows.
 *  - Resolve all four movement targets per flight; a terminalizer decision that
 *    still allows recovery schedules the next +offset logical opportunity.
 *  - Persist each outcome row; DB failure throws (fail-closed) so the caller
 *    does not advance a label that was never recorded.
 */
import {
  terminalizeTarget,
  nextRecoveryDue,
  persistOutcome,
  RECOVERY_OPPORTUNITY_OFFSETS_MIN,
  type FlightOperationalState,
  type TerminalTarget,
  type OutcomePersistRow,
} from "./outcomeTerminalizer_v3";

/** Frozen OUTCOME recovery REST budget (units) — from plan §5.4 REST category. */
export const OUTCOME_REST_UNIT_BUDGET = 500;

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
  /** Logical opportunities already consumed (0–3). */
  opportunitiesUsed: number;
  /** OUTCOME REST units remaining for this cycle. */
  categoryRemainingUnits: number;
}

export interface OutcomeRecoveryResult {
  flightInstanceId: string;
  processed: number;
  deferred: number;
  observed: number;
  nextRecoveryDueUtc: Date | null;
  /** REST units actually consumed by this run's physical recovery calls. */
  restUnitsConsumed: number;
  failures: string[];
}

type QueryPool = {
  query: (text: string, params: unknown[]) => Promise<{ rows?: any[]; rowCount: number | null }>;
};

/**
 * Run one outcome-recovery pass for a flight. Returns terminalizer decisions
 * and (when the REST budget allows) schedules the next logical opportunity.
 * Fail-closed on persistence error.
 */
export async function runOutcomeRecoveryForFlight(
  pool: QueryPool,
  flight: OutcomeRecoveryFlight,
  estimatedCallUnits = 1,
): Promise<OutcomeRecoveryResult> {
  const result: OutcomeRecoveryResult = {
    flightInstanceId: flight.flightInstanceId,
    processed: 0, deferred: 0, observed: 0,
    nextRecoveryDueUtc: null, restUnitsConsumed: 0, failures: [],
  };
  let remaining = flight.categoryRemainingUnits;
  for (const t of flight.targets) {
    const term = terminalizeTarget({
      target: t.target,
      actualUtc: t.actualUtc,
      actualVerified: t.actualVerified,
      operationalState: flight.operationalState,
      referenceArrivalUtc: t.referenceArrivalUtc,
      nowUtc: flight.nowUtc,
      opportunitiesUsed: flight.opportunitiesUsed,
    });
    result.processed += 1;
    if (term.labelStatus === "observed") result.observed += 1;

    const row: OutcomePersistRow = {
      flightInstanceId: flight.flightInstanceId,
      operationalState: flight.operationalState,
      target: t.target,
      labelStatus: term.labelStatus,
      referenceArrivalUtc: t.referenceArrivalUtc,
      recoveryDeadlineUtc: new Date(t.referenceArrivalUtc.getTime() + 24 * 3_600_000),
      opportunitiesUsed: flight.opportunitiesUsed,
      evidenceJson: { reason: term.reason, verified: t.actualVerified },
    };
    // Persist is the durable label; a DB failure must stop the run (fail-closed).
    const wrote = await persistOutcome(pool, row);
    if (wrote !== 1) {
      result.failures.push(`${t.target}:persist-failed`);
      continue;
    }

    // A recovery-allowed target schedules the next logical opportunity, but
    // only if the OUTCOME REST budget can fund the physical call (0H / §5.4).
    if (term.recoveryAllowed) {
      const gate = term.nextRecoveryDueUtc !== null
        ? (remaining >= estimatedCallUnits ? "proceed" : "defer")
        : "defer";
      if (gate === "proceed") {
        remaining -= estimatedCallUnits;
        result.restUnitsConsumed += estimatedCallUnits;
        result.nextRecoveryDueUtc = term.nextRecoveryDueUtc;
      } else {
        result.deferred += 1;
      }
    }
  }
  return result;
}

/**
 * Top-level orchestrator: for a set of canonical flights at a logical recovery
 * moment, run recovery and record consumed OUTCOME REST units against the
 * budget. A cycle shortfall DEFERs the remaining flights (never borrows).
 */
export async function runOutcomeRecoveryCycle(
  pool: QueryPool,
  flights: OutcomeRecoveryFlight[],
  budget = OUTCOME_REST_UNIT_BUDGET,
  estimatedCallUnits = 1,
): Promise<{ results: OutcomeRecoveryResult[]; totalConsumed: number; deferredFlights: string[] }> {
  const results: OutcomeRecoveryResult[] = [];
  let remaining = budget;
  const deferredFlights: string[] = [];
  for (const f of flights) {
    if (remaining < estimatedCallUnits) {
      deferredFlights.push(f.flightInstanceId);
      continue;
    }
    const r = await runOutcomeRecoveryForFlight(pool, { ...f, categoryRemainingUnits: remaining }, estimatedCallUnits);
    remaining -= r.restUnitsConsumed;
    results.push(r);
  }
  return {
    results,
    totalConsumed: budget - remaining,
    deferredFlights,
  };
}

export { RECOVERY_OPPORTUNITY_OFFSETS_MIN };