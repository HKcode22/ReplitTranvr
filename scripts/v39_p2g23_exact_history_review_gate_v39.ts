/**
 * Review-only C35 historical evidence validator.
 * Does not query Neon or authorize paid execution.
 */

export interface YssyHistoryRow {
  probeId: number;
  icao: string;
  status: string;
  budget: string;
  session: string;
  metric: string;
  censored: boolean;
  reconciliation: string;
  stopReason: string;
  preprobeSha: string;
  durableStatus: string | null;
  externalCredits: number | null;
  internalCredits: number | null;
  gapCredits: number | null;
  durableCensored: boolean | null;
}

export const EXPECTED_YSSY_HISTORY: readonly YssyHistoryRow[] = [
  {
    probeId: 16,
    icao: "YSSY",
    status: "failed",
    budget: "P2G-S1-20261006-21",
    session: "06ae005c-34ca-4478-af17-1c5d11b42d6e",
    metric: "v39-physical-flight-instance-v2",
    censored: false,
    reconciliation: "DELIVERY_GAP",
    stopReason: "external_internal_delivery_gap",
    preprobeSha:
      "b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870",
    durableStatus: "DELIVERY_GAP",
    externalCredits: 260,
    internalCredits: 259,
    gapCredits: 1,
    durableCensored: false,
  },
  {
    probeId: 17,
    icao: "YSSY",
    status: "failed",
    budget: "P2G-S1-20261008-22",
    session: "cb90e45e-ae7b-4bb4-85fe-7f3e56bd8880",
    metric: "v39-physical-flight-instance-v2",
    censored: true,
    reconciliation: "UNRESOLVED",
    stopReason: "supervisor_child_exit_recovered",
    preprobeSha:
      "b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870",
    durableStatus: null,
    externalCredits: null,
    internalCredits: null,
    gapCredits: null,
    durableCensored: null,
  },
];

export function auditYssyHistoryForReviewV39(
  rows: readonly YssyHistoryRow[],
) {
  const blockers: string[] = [];

  if (rows.length !== 2) {
    blockers.push("EXPECTED_EXACTLY_TWO_YSSY_ATTEMPTS");
  }

  for (const expected of EXPECTED_YSSY_HISTORY) {
    const matches = rows.filter(
      row => row.probeId === expected.probeId,
    );

    if (matches.length !== 1) {
      blockers.push(
        `HISTORICAL_PROBE_COUNT:${expected.probeId}`,
      );
      continue;
    }

    const actual = matches[0];

    for (const key of Object.keys(expected) as
      Array<keyof YssyHistoryRow>) {
      if (actual[key] !== expected[key]) {
        blockers.push(
          `HISTORICAL_MISMATCH:${expected.probeId}:${key}`,
        );
      }
    }
  }

  if (rows.some(row =>
    row.icao !== "YSSY" ||
    (row.probeId !== 16 && row.probeId !== 17)
  )) {
    blockers.push("UNEXPECTED_YSSY_HISTORY");
  }

  return {
    status: blockers.length === 0
      ? "EXACT_HISTORY_FOR_REVIEW"
      : "BLOCKED",
    eligibleForIndependentReview: blockers.length === 0,
    authorizedForPaidLaunch: false as const,
    automaticRetryAuthorized: false as const,
    blockers,
  };
}
