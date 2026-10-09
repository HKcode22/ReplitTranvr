import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  loadFrozenProbeArtifact,
} from "../server/lib/disruption/anchorPromotion_v39";

import {
  loadPhase2gCompact6AmendmentV39,
} from "../server/lib/disruption/phase2Compact6_v39";

import type {
  Stage1AttemptEvidence,
} from "../scripts/v39_probe_stage1_owner_v39";

import {
  previewP2g23YssyRecoveryV39,
} from "../scripts/v39_p2g23_yssy_selector_preview_v39";

import type {
  P2g23HistoricalRecord,
} from "../scripts/v39_p2g23_yssy_recovery_review_v39";

const PATH =
  "artifacts/phase2g-early-pilot-yssy-p2g22-recovery-freeze-20261007.json";

const PARENT_SHA =
  "589d7e3fbb1467c6bba7bb9b82784612e023cf5df482cc7daf1acd593987712c";

const raw = readFileSync(PATH, "utf8");

expect(
  createHash("sha256").update(raw).digest("hex"),
).toBe(PARENT_SHA);

const preprobe = loadFrozenProbeArtifact(
  "artifacts/preprobe-reference-freeze-record.json",
  "b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870",
);

const loaded = loadPhase2gCompact6AmendmentV39({
  expectedSha256: PARENT_SHA,
  sourcePreprobeFileSha256:
    "b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870",
  preprobe: preprobe.artifact,
  path: PATH,
});

const scope = loaded.amendment.early_pilot_scope_reduction!;
const recovery =
  loaded.amendment.p2g22_yssy_delivery_gap_recovery_rerun!;

function valid(
  probeId: number,
  icao: string,
  rowsPerHour = 100,
): Stage1AttemptEvidence {
  const session =
    "00000000-0000-4000-8000-" +
    String(probeId).padStart(12, "0");

  return {
    probeId,
    icao,
    probeBudgetDayId: `TEST-${probeId}`,
    runtimeSessionId: session,
    status: "completed",
    metricContractVersion: "v39-physical-flight-instance-v2",
    rowsPerHour,
    creditsSpent: 1,
    uniqueFlightsPerCredit: 0.5,
    tailChainLinksPerCredit: 0.1,
    stability: 0.5,
    confirmedUniqueLower: 0.5,
    confirmedPlusAmbiguousUpper: 0.5,
    durationCensored: false,
    reconciliationStatus: "MATCH",
    stopReason: null,
    recordedAtUtc: new Date(
      Date.UTC(2026, 9, 8, 0, probeId),
    ).toISOString(),
    durableReconciliation: {
      runtimeSessionId: session,
      evidenceStatus: "MATCH",
      externalSpendCredits: 100,
      internalReceivedCredits: 100,
      deliveryGapCredits: 0,
      deliveryCompleteness: 1,
      callbackRequestsSeen: 10,
      callbackSuccess2xx: 10,
      callbackFailures: 0,
      durationCensored: false,
      stopReason: null,
    },
  };
}

function p2g22(): Stage1AttemptEvidence {
  return {
    ...valid(16, "YSSY", 0),
    probeBudgetDayId: "P2G-S1-20261006-21",
    runtimeSessionId:
      "06ae005c-34ca-4478-af17-1c5d11b42d6e",
    status: "failed",
    rowsPerHour: null,
    creditsSpent: null,
    uniqueFlightsPerCredit: null,
    tailChainLinksPerCredit: null,
    stability: null,
    confirmedUniqueLower: null,
    confirmedPlusAmbiguousUpper: null,
    durationCensored: false,
    reconciliationStatus: "DELIVERY_GAP",
    stopReason: "external_internal_delivery_gap",
    durableReconciliation: {
      runtimeSessionId:
        "06ae005c-34ca-4478-af17-1c5d11b42d6e",
      evidenceStatus: "DELIVERY_GAP",
      externalSpendCredits: 260,
      internalReceivedCredits: 259,
      deliveryGapCredits: 1,
      deliveryCompleteness: 259 / 260,
      callbackRequestsSeen: 56,
      callbackSuccess2xx: 56,
      callbackFailures: 0,
      durationCensored: false,
      stopReason: "external_internal_delivery_gap",
    },
  };
}

function p2g23(): Stage1AttemptEvidence {
  return {
    ...valid(17, "YSSY", 0),
    probeBudgetDayId: "P2G-S1-20261008-22",
    runtimeSessionId:
      "cb90e45e-ae7b-4bb4-85fe-7f3e56bd8880",
    status: "failed",
    rowsPerHour: null,
    durationCensored: true,
    reconciliationStatus: "UNRESOLVED",
    stopReason: "supervisor_child_exit_recovered",
    durableReconciliation: null,
  };
}

function historical(): P2g23HistoricalRecord {
  return {
    probeId: 17,
    icao: "YSSY",
    budgetDay: "P2G-S1-20261008-22",
    sessionId:
      "cb90e45e-ae7b-4bb4-85fe-7f3e56bd8880",
    status: "failed",
    durationCensored: true,
    reconciliationStatus: "UNRESOLVED",
    stopReason: "supervisor_child_exit_recovered",
    failureClass: "replit_development_callback_unreachable",
    externalCredits: 221,
    internalCredits: 205,
    deliveryGap: 16,
  };
}

function attempts() {
  return [
    valid(11, "WSSS", 160.5),
    valid(12, "OMAA", 74),
    valid(14, "MMUN", 22.999639033442946),
    valid(15, "SKBO", 150.4977007295722),
    p2g22(),
    p2g23(),
  ];
}

function preview(
  rows = attempts(),
  record = historical(),
) {
  return previewP2g23YssyRecoveryV39(
    scope, rows, recovery, record,
  );
}

describe("P2G23 isolated selector preview", () => {
  it("verifies old refusal without permitting paid execution", () => {
    const r = preview();

    expect(r.originalSelectorRefusalVerified).toBe(true);
    expect(r.eligibleForIndependentReview).toBe(true);
    expect(r.proposedNextTarget).toBe("YSSY");

    expect(r.authorizedForPaidLaunch).toBe(false);
    expect(r.automaticRetryAuthorized).toBe(false);
  });

  it("rejects any additional YSSY row", () => {
    const r = preview([
      ...attempts(),
      valid(18, "YSSY"),
    ]);

    expect(r.eligibleForIndependentReview).toBe(false);
    expect(r.proposedNextTarget).toBeNull();
  });

  it("rejects missing P2G23", () => {
    const r = preview(
      attempts().filter(x => x.probeId !== 17),
    );

    expect(r.eligibleForIndependentReview).toBe(false);
  });

  it("rejects an altered P2G22 failure", () => {
    const rows = attempts();
    const row = rows.find(x => x.probeId === 16)!;

    row.durableReconciliation = {
      ...row.durableReconciliation!,
      externalSpendCredits: 259,
    };

    const r = preview(rows);
    expect(r.eligibleForIndependentReview).toBe(false);
    expect(r.blockers).toContain(
      "OLD_SELECTOR_WRONG_REFUSAL_REASON",
    );
  });

  for (const [field, replacement] of [
    ["runtimeSessionId", "wrong-session"],
    ["probeBudgetDayId", "wrong-budget"],
    ["status", "completed"],
    ["durationCensored", false],
    ["reconciliationStatus", "MATCH"],
    ["stopReason", "other"],
  ] as const) {
    it(`rejects altered P2G23 ${field}`, () => {
      const rows = attempts();
      const row = rows.find(x => x.probeId === 17)!;

      Object.assign(row, { [field]: replacement });

      const r = preview(rows);
      expect(r.eligibleForIndependentReview).toBe(false);
      expect(r.authorizedForPaidLaunch).toBe(false);
    });
  }

  it("rejects closeout and runtime disagreements", () => {
    const r = preview(attempts(), {
      ...historical(),
      sessionId: "wrong-session",
    });

    expect(r.eligibleForIndependentReview).toBe(false);
    expect(r.proposedNextTarget).toBeNull();
  });

  it("rejects altered frozen time class", () => {
    const r = previewP2g23YssyRecoveryV39(
      {
        ...scope,
        yssy_selected_stage1_utc_slot_hour: undefined,
      },
      attempts(),
      recovery,
      historical(),
    );

    expect(r.eligibleForIndependentReview).toBe(false);
  });

  it("always refuses paid launch", () => {
    for (const rows of [
      attempts(),
      [...attempts(), valid(18, "YSSY")],
    ]) {
      const r = preview(rows);

      expect(r.status).toBe("REVIEW_ONLY_NOT_AUTHORIZED");
      expect(r.authorizedForPaidLaunch).toBe(false);
      expect(r.automaticRetryAuthorized).toBe(false);
    }
  });
});
