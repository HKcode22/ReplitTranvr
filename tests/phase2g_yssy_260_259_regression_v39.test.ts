import {
  describe,
  expect,
  it,
} from "vitest";

import {
  classifyProbeReconciliationV39,
  waitForPrepaidProbeAccountingQuiescenceV39,
} from "../server/lib/disruption/prepaidProbeWindow_v39";

function metrics(
  internalSendCredits: number,
) {
  return {
    rowsDelivered: 0,
    uniqueFlights: 0,
    tailChainLinks: 0,

    internalSendCredits,

    confirmedUniqueLower: 0,
    confirmedPlusAmbiguousUpper: 0,
    ambiguousUnknown: 0,

    firstObservationMs: [],

    deliveryCount: 56,

    notificationItemsReceived:
      internalSendCredits,

    explicitCostDeliveryCount: 56,
    fallbackDeliveryCount: 0,

    costItemDisagreementCount: 0,

    callbackRequestsSeen: 56,
    callbackSuccess2xx: 56,
    callbackFailures: 0,
  };
}

const settlement = {
  initialWaitSeconds: 30,
  pollIntervalSeconds: 10,
  stableReadCount: 3,
  timeoutSeconds: 600,
};

describe(
  "P2G22 YSSY historical 260/259 regression",
  () => {
    it(
      "classifies the healthy corrected 260/260 case as MATCH",
      () => {
        const result =
          classifyProbeReconciliationV39({
            ownerKind: "anchor_probe",
            externalCredits: 260,
            internalSendCredits: 260,
            costItemDisagreementCount: 0,
          });

        expect(result).toEqual({
          status: "MATCH",
          deliveryGapCredits: 0,
          deliveryCompleteness: 1,
        });
      },
    );

    it(
      "waits through 259 and captures an in-flight final credit before reconciliation",
      async () => {
        let now = 0;
        let i = 0;

        /*
         * Reproduces the class of race we are hardening:
         *
         * provider settled at 260,
         * internal initially shows 259,
         * then the final callback arrives.
         */
        const sequence = [
          259,
          259,
          260,
          260,
          260,
          260,
        ];

        const drain =
          await waitForPrepaidProbeAccountingQuiescenceV39(
            settlement,
            async () => {
              const n =
                sequence[
                  Math.min(
                    i,
                    sequence.length - 1,
                  )
                ];

              i += 1;

              return metrics(n);
            },
            {
              nowMs: () => now,

              sleep: async (ms) => {
                now += ms;
              },
            },
          );

        expect(drain.status).toBe(
          "quiescent",
        );

        if (drain.status !== "quiescent") {
          throw new Error(
            "expected accounting to become quiescent",
          );
        }

        expect(
          drain.metrics.internalSendCredits,
        ).toBe(260);

        /*
         * The delayed 260th credit must not merely
         * appear; the accounting ledger must then
         * remain quiet for the full frozen drain
         * interval before reconciliation.
         */
        expect(now).toBeGreaterThanOrEqual(
          70_000,
        );

        const result =
          classifyProbeReconciliationV39({
            ownerKind: "anchor_probe",
            externalCredits: 260,
            internalSendCredits:
              drain.metrics.internalSendCredits,
            costItemDisagreementCount:
              drain.metrics
                .costItemDisagreementCount,
          });

        expect(result.status).toBe("MATCH");
        expect(
          result.deliveryGapCredits,
        ).toBe(0);
      },
    );

    it(
      "preserves a real historical 260/259 loss as DELIVERY_GAP",
      async () => {
        let now = 0;

        const drain =
          await waitForPrepaidProbeAccountingQuiescenceV39(
            settlement,
            async () => metrics(259),
            {
              nowMs: () => now,

              sleep: async (ms) => {
                now += ms;
              },
            },
          );

        expect(drain.status).toBe(
          "quiescent",
        );

        if (drain.status !== "quiescent") {
          throw new Error(
            "expected stable accounting snapshot",
          );
        }

        expect(
          drain.metrics.internalSendCredits,
        ).toBe(259);

        const result =
          classifyProbeReconciliationV39({
            ownerKind: "anchor_probe",
            externalCredits: 260,
            internalSendCredits: 259,
            costItemDisagreementCount: 0,
          });

        expect(result.status).toBe(
          "DELIVERY_GAP",
        );

        expect(
          result.deliveryGapCredits,
        ).toBe(1);

        expect(
          result.deliveryCompleteness,
        ).toBeCloseTo(
          259 / 260,
          12,
        );
      },
    );

    it(
      "does not hide accounting disagreement even when totals equal 260",
      () => {
        const result =
          classifyProbeReconciliationV39({
            ownerKind: "anchor_probe",
            externalCredits: 260,
            internalSendCredits: 260,
            costItemDisagreementCount: 1,
          });

        expect(result.status).toBe(
          "MISMATCH",
        );
      },
    );

    it(
      "does not authorize a one-credit tolerance",
      () => {
        expect(() =>
          classifyProbeReconciliationV39({
            ownerKind: "anchor_probe",
            externalCredits: 260,
            internalSendCredits: 259,
            costItemDisagreementCount: 0,
            deliveryCompletenessFloor:
              259 / 260,
          }),
        ).toThrow(
          "PROBE_NONZERO_RECONCILIATION_TOLERANCE_NOT_AUTHORIZED",
        );
      },
    );
  },
);
