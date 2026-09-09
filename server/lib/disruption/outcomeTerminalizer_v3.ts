/**
 * Outcome terminalizer — Phase 0H (§1.5.8).
 *
 * Plan coverage: §§7.3–7.4, 5.4 outcome REST category, 6.3 milestones.
 *
 * Two INDEPENDENT label dimensions (§1.5.8 — never collapsed into one status):
 *   flight_operational_state: scheduled / departed / arrived / canceled /
 *     canceled_uncertain / diverted / unknown
 *   label_status (per target): pending / observed / censored / missing /
 *     not_applicable
 *
 * Recovery contract (§1.5.8):
 *  - target-specific terminalization; gate_out, wheels_off, wheels_on, gate_in,
 *    cancellation/diversion and POST targets close independently;
 *  - four target booleans preserved (no generic observed flag);
 *  - recovery uses the same bounded canonical query identity (never an
 *    unbounded loose search);
 *  - logical recovery opportunities at reference arrival +30 / +120 / +360 min
 *    (≥90 min between the first two); at most three per flight;
 *  - compatible due identities may be coalesced into pre-frozen buckets;
 *  - each physical request follows max-three-total-attempt transport;
 *  - the third logical opportunity STOPS further recovery calls but does NOT
 *    terminalize an absent label;
 *  - unresolved labels stay `pending` until the frozen recovery deadline
 *    (reference arrival +24h); at deadline: verified evidence → `observed`,
 *    cancellation may make a movement target `not_applicable`, else `missing`
 *    (or `censored` only for a separately valid survival endpoint);
 *  - every physical call enters OUTCOME_REST_UNIT_BUDGET; cap shortfall →
 *    DEFER/REFUSE, never borrow;
 *  - estimated timestamps never masquerade as verified actual milestones;
 *    CanceledUncertain never fabricates cancellation.
 *
 * Pure offline logic (no DB/provider calls): persistence + budget ledger live
 * with the caller (Phase 0K).
 */

export const OUTCOME_TERMINALIZER_VERSION = "outcomeTerminalizer_v3@1.0.0";

export type FlightOperationalState =
  | "scheduled" | "departed" | "arrived" | "canceled"
  | "canceled_uncertain" | "diverted" | "unknown";

export type TargetLabelStatus =
  | "pending" | "observed" | "censored" | "missing" | "not_applicable";

export type TerminalTarget = "gate_out" | "wheels_off" | "wheels_on" | "gate_in";

/** Logical recovery opportunity offsets (minutes after reference arrival). */
export const RECOVERY_OPPORTUNITY_OFFSETS_MIN = [30, 120, 360] as const;
/** Frozen recovery deadline offset (hours after reference arrival). */
export const RECOVERY_DEADLINE_OFFSET_HOURS = 24;
/** Minimum gap (minutes) between the first two logical opportunities. */
export const RECOVERY_MIN_GAP_FIRST_TWO_MIN = 90;

export interface TargetTerminalInput {
  target: TerminalTarget;
  /** Verified actual milestone (never an estimate). */
  actualUtc: Date | null;
  /** Whether the supplied actual is verified (not estimated). */
  actualVerified: boolean;
  operationalState: FlightOperationalState;
  referenceArrivalUtc: Date;
  nowUtc: Date;
  /** Logical opportunities already consumed (0–3). */
  opportunitiesUsed: number;
}

export interface TargetTerminalResult {
  target: TerminalTarget;
  labelStatus: TargetLabelStatus;
  /** Whether a further recovery call is still allowed. */
  recoveryAllowed: boolean;
  /** Next logical opportunity time, or null when none remains. */
  nextRecoveryDueUtc: Date | null;
  reason: string;
}

/** Next logical opportunity at/after `now` given how many were used. */
export function nextRecoveryDue(
  referenceArrivalUtc: Date,
  nowUtc: Date,
  opportunitiesUsed: number,
): Date | null {
  for (let i = opportunitiesUsed; i < RECOVERY_OPPORTUNITY_OFFSETS_MIN.length; i++) {
    const due = new Date(referenceArrivalUtc.getTime() + RECOVERY_OPPORTUNITY_OFFSETS_MIN[i] * 60_000);
    if (due.getTime() >= nowUtc.getTime()) return due;
  }
  return null;
}

function deadlineUtc(referenceArrivalUtc: Date): Date {
  return new Date(referenceArrivalUtc.getTime() + RECOVERY_DEADLINE_OFFSET_HOURS * 3_600_000);
}

/**
 * Terminalize one target. Cancellation may make a movement target
 * not_applicable; CanceledUncertain never fabricates it. Estimated (unverified)
 * actuals never count as observed.
 */
export function terminalizeTarget(input: TargetTerminalInput): TargetTerminalResult {
  const { target, actualUtc, actualVerified, operationalState, referenceArrivalUtc, nowUtc } = input;
  const oppUsed = Math.max(0, Math.min(3, Math.floor(input.opportunitiesUsed)));
  const dl = deadlineUtc(referenceArrivalUtc);

  // Verified actual evidence → observed (independent of recovery bookkeeping).
  if (actualUtc && actualVerified) {
    return {
      target, labelStatus: "observed", recoveryAllowed: false,
      nextRecoveryDueUtc: null, reason: "verified actual milestone",
    };
  }

  // Cancellation can make a movement target not_applicable — but
  // CanceledUncertain must never fabricate cancellation.
  if (operationalState === "canceled") {
    return {
      target, labelStatus: "not_applicable", recoveryAllowed: false,
      nextRecoveryDueUtc: null, reason: "canceled operational state",
    };
  }

  // Past the frozen +24h deadline with no verified evidence → missing
  // (censored only for a separately valid survival endpoint, out of scope here).
  if (nowUtc.getTime() >= dl.getTime()) {
    return {
      target, labelStatus: "missing", recoveryAllowed: false,
      nextRecoveryDueUtc: null, reason: "recovery deadline reached without verified evidence",
    };
  }

  // Within the window: recovery allowed only while logical opportunities remain.
  // The third opportunity stops further calls but does NOT terminalize the label.
  if (oppUsed >= RECOVERY_OPPORTUNITY_OFFSETS_MIN.length) {
    return {
      target, labelStatus: "pending", recoveryAllowed: false,
      nextRecoveryDueUtc: null, reason: "logical opportunities exhausted; label stays pending to deadline",
    };
  }
  return {
    target,
    labelStatus: "pending",
    recoveryAllowed: true,
    nextRecoveryDueUtc: nextRecoveryDue(referenceArrivalUtc, nowUtc, oppUsed),
    reason: "awaiting recovery",
  };
}

/**
 * REST budget gate for one recovery call (§1.5.8): proceed only when the
 * OUTCOME category can fund it; otherwise DEFER/REFUSE (never borrow).
 */
export function recoveryBudgetGate(categoryRemainingUnits: number, estimatedCallUnits: number): "proceed" | "defer" {
  if (!Number.isFinite(categoryRemainingUnits) || !Number.isFinite(estimatedCallUnits)) return "defer";
  return categoryRemainingUnits >= estimatedCallUnits ? "proceed" : "defer";
}

/** The four target booleans (§1.5.8) — never one generic observed flag. */
export interface TargetObservedFlags {
  gateOutLabelObserved: boolean;
  wheelsOffLabelObserved: boolean;
  wheelsOnLabelObserved: boolean;
  gateInLabelObserved: boolean;
}

export function targetFlagsFromStatuses(statuses: Record<TerminalTarget, TargetLabelStatus>): TargetObservedFlags {
  return {
    gateOutLabelObserved: statuses.gate_out === "observed",
    wheelsOffLabelObserved: statuses.wheels_off === "observed",
    wheelsOnLabelObserved: statuses.wheels_on === "observed",
    gateInLabelObserved: statuses.gate_in === "observed",
  };
}
