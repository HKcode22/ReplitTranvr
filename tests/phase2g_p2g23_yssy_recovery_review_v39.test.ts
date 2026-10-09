import {
  createHash,
} from "node:crypto";
import {
  readFileSync,
} from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";
import {
  assessP2g23RecoveryReviewV39,
  type P2g23HistoricalRecord,
} from "../scripts/v39_p2g23_yssy_recovery_review_v39";

const DRAFT_PATH =
  "artifacts/phase2g-p2g23-yssy-recovery-REVIEW-ONLY-20261009.json";

const PARENT_SHA =
  "589d7e3fbb1467c6bba7bb9b82784612e023cf5df482cc7daf1acd593987712c";

function sha(path: string) {
  return createHash("sha256")
    .update(readFileSync(path))
    .digest("hex");
}

const draft = JSON.parse(
  readFileSync(DRAFT_PATH, "utf8"),
);

const historical: P2g23HistoricalRecord = {
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

describe("P2G23 isolated recovery review", () => {
  it("keeps the draft non-authorizing", () => {
    expect(draft.status).toBe("DRAFT_NOT_FROZEN");
    expect(draft.authorized).toBe(false);
    expect(draft.paid_launch_authorized).toBe(false);
    expect(draft.machine_selector_enabled).toBe(false);
    expect(draft.independent_review.approved).toBe(false);
  });

  it("preserves the exact P2G22 amendment hash", () => {
    expect(sha(
      draft.original_parent_amendment.path,
    )).toBe(PARENT_SHA);
  });

  it("verifies the P2G23 historical receipt hashes", () => {
    expect(sha(draft.p2g23_closeout.path))
      .toBe(draft.p2g23_closeout.sha256);

    for (const receipt of
      Object.values(draft.p2g23_receipts) as
      Array<{path: string; sha256: string}>) {
      expect(sha(receipt.path)).toBe(receipt.sha256);
    }
  });

  it("preserves the failed 221/205 accounting", () => {
    const c = JSON.parse(
      readFileSync(draft.p2g23_closeout.path, "utf8"),
    );

    expect(c.external_credits_spent).toBe(221);
    expect(c.durable_received_credits).toBe(205);
    expect(c.external_minus_received).toBe(16);
    expect(c.scientific_acceptance).toBe(false);
    expect(c.prior_authorization_reusable).toBe(false);
    expect(c.automatic_retry_authorized).toBe(false);
  });

  it("allows exact history to enter review, never paid launch", () => {
    const result = assessP2g23RecoveryReviewV39(
      historical, 0,
    );
    expect(result.eligibleForIndependentReview).toBe(true);
    expect(result.authorizedForPaidLaunch).toBe(false);
    expect(result.automaticRetryAuthorized).toBe(false);
  });

  const alterations: Array<
    [keyof P2g23HistoricalRecord, string | number | boolean]
  > = [
    ["probeId", 18],
    ["icao", "SKBO"],
    ["budgetDay", "WRONG"],
    ["sessionId", "WRONG"],
    ["status", "completed"],
    ["durationCensored", false],
    ["reconciliationStatus", "MATCH"],
    ["stopReason", "other_failure"],
    ["failureClass", "unknown"],
    ["externalCredits", 220],
    ["internalCredits", 206],
    ["deliveryGap", 0],
  ];

  for (const [field, incorrect] of alterations) {
    it(`rejects altered historical field: ${field}`, () => {
      const changed = {
        ...historical,
        [field]: incorrect,
      } as P2g23HistoricalRecord;

      const result = assessP2g23RecoveryReviewV39(
        changed, 0,
      );

      expect(result.eligibleForIndependentReview)
        .toBe(false);
      expect(result.authorizedForPaidLaunch)
        .toBe(false);
    });
  }

  it("rejects an additional recovery attempt", () => {
    const result = assessP2g23RecoveryReviewV39(
      historical, 1,
    );
    expect(result.eligibleForIndependentReview).toBe(false);
    expect(result.blockers).toContain(
      "NEW_RECOVERY_ATTEMPT_ALREADY_PRESENT_OR_UNKNOWN",
    );
  });

  it("rejects unknown attempt counts", () => {
    for (const count of [-1, Number.NaN]) {
      const result = assessP2g23RecoveryReviewV39(
        historical, count,
      );
      expect(result.eligibleForIndependentReview)
        .toBe(false);
    }
  });

  it("retains exact prospective science boundaries", () => {
    const s = draft.prospective_scope_for_review;

    expect(s.maximum_additional_attempts_if_approved).toBe(1);
    expect(s.duration_minutes).toBe(120);
    expect(s.metric_contract).toBe(
      "v39-physical-flight-instance-v2",
    );
    expect(s.time_class_utc_slot).toBe(4);
    expect(s.delivery_gap_tolerance_credits).toBe(0);
    expect(s.stage1_reservation_credits).toBe(450);
    expect(s.unsettled_margin_credits).toBe(50);
    expect(s.existing_failures_reclassified).toBe(false);
    expect(s.no_further_automatic_retry).toBe(true);
  });
});
