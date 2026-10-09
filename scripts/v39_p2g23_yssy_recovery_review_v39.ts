/**
 * P2G23 scientific recovery review policy.
 *
 * Deliberately disconnected from the paid Stage-1 owner.
 * This module cannot authorize paid execution.
 */

export interface P2g23HistoricalRecord {
  probeId: number;
  icao: string;
  budgetDay: string;
  sessionId: string;
  status: string;
  durationCensored: boolean;
  reconciliationStatus: string;
  stopReason: string;
  failureClass: string;
  externalCredits: number;
  internalCredits: number;
  deliveryGap: number;
}

export interface P2g23ReviewResult {
  exactHistoricalMatch: boolean;
  eligibleForIndependentReview: boolean;
  authorizedForPaidLaunch: false;
  automaticRetryAuthorized: false;
  blockers: string[];
}

const EXPECTED: P2g23HistoricalRecord = {
  probeId: 17,
  icao: "YSSY",
  budgetDay: "P2G-S1-20261008-22",
  sessionId: "cb90e45e-ae7b-4bb4-85fe-7f3e56bd8880",
  status: "failed",
  durationCensored: true,
  reconciliationStatus: "UNRESOLVED",
  stopReason: "supervisor_child_exit_recovered",
  failureClass: "replit_development_callback_unreachable",
  externalCredits: 221,
  internalCredits: 205,
  deliveryGap: 16,
};

export function assessP2g23RecoveryReviewV39(
  record: P2g23HistoricalRecord,
  additionalAttemptsAfterP2g23: number,
): P2g23ReviewResult {
  const blockers: string[] = [];

  for (const field of Object.keys(EXPECTED) as
    Array<keyof P2g23HistoricalRecord>) {
    if (record[field] !== EXPECTED[field]) {
      blockers.push(`HISTORICAL_FIELD_MISMATCH:${field}`);
    }
  }

  if (
    !Number.isInteger(additionalAttemptsAfterP2g23) ||
    additionalAttemptsAfterP2g23 !== 0
  ) {
    blockers.push("NEW_RECOVERY_ATTEMPT_ALREADY_PRESENT_OR_UNKNOWN");
  }

  if (
    record.externalCredits - record.internalCredits !==
    record.deliveryGap
  ) {
    blockers.push("HISTORICAL_ACCOUNTING_INCONSISTENT");
  }

  return {
    exactHistoricalMatch:
      !blockers.some(b => b.startsWith("HISTORICAL_")),
    eligibleForIndependentReview: blockers.length === 0,

    // Intentionally hard-coded. Only a separately
    // reviewed and approved production integration
    // may introduce a new execution authorization.
    authorizedForPaidLaunch: false,
    automaticRetryAuthorized: false,
    blockers,
  };
}
