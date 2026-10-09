import { describe, expect, it } from "vitest";
import {
  auditYssyHistoryForReviewV39,
  EXPECTED_YSSY_HISTORY,
  type YssyHistoryRow,
} from "../scripts/v39_p2g23_exact_history_review_gate_v39";

const good = () => EXPECTED_YSSY_HISTORY.map(
  x => ({...x}),
);

describe("P2G23 exact C35 history gate", () => {
  it("accepts exact history for review, never paid use", () => {
    const r = auditYssyHistoryForReviewV39(good());
    expect(r.eligibleForIndependentReview).toBe(true);
    expect(r.authorizedForPaidLaunch).toBe(false);
    expect(r.automaticRetryAuthorized).toBe(false);
  });

  it("rejects extra attempts", () => {
    const r = auditYssyHistoryForReviewV39([
      ...good(),
      {...good()[1],probeId:18},
    ]);
    expect(r.eligibleForIndependentReview).toBe(false);
  });

  it("rejects missing and duplicate records", () => {
    for (const rows of [
      good().slice(0,1),
      [good()[0],good()[0]],
    ]) {
      expect(
        auditYssyHistoryForReviewV39(rows)
          .eligibleForIndependentReview,
      ).toBe(false);
    }
  });

  for (const probeIndex of [0,1]) {
    const original = good()[probeIndex];

    for (const field of Object.keys(original) as
      Array<keyof YssyHistoryRow>) {
      it(`rejects probe ${original.probeId} field ${field}`, () => {
        const rows = good();
        const old = rows[probeIndex][field];

        const changed = typeof old === "boolean"
          ? !old
          : typeof old === "number"
          ? old + 1
          : old === null
          ? "unexpected-durable-data"
          : "WRONG";

        rows[probeIndex] = {
          ...rows[probeIndex],
          [field]:changed,
        } as YssyHistoryRow;

        expect(
          auditYssyHistoryForReviewV39(rows)
            .eligibleForIndependentReview,
        ).toBe(false);
      });
    }
  }
});
