import {
  describe,
  expect,
  it,
} from "vitest";

import {
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
    deliveryCount: internalSendCredits,
    notificationItemsReceived:
      internalSendCredits,
    explicitCostDeliveryCount:
      internalSendCredits,
    fallbackDeliveryCount: 0,
    costItemDisagreementCount: 0,
    callbackRequestsSeen:
      internalSendCredits,
    callbackSuccess2xx:
      internalSendCredits,
    callbackFailures: 0,
  };
}

const config = {
  initialWaitSeconds: 30,
  pollIntervalSeconds: 10,
  stableReadCount: 3,
  timeoutSeconds: 600,
};

describe(
  "Phase2G accounting quiescence",
  () => {
    it(
      "requires the frozen quiet interval even when accounting is immediately stable",
      async () => {
        let now = 0;
        let reads = 0;

        const result =
          await waitForPrepaidProbeAccountingQuiescenceV39(
            config,
            async () => {
              reads += 1;
              return metrics(10);
            },
            {
              nowMs: () => now,
              sleep: async (ms) => {
                now += ms;
              },
            },
          );

        expect(result.status).toBe(
          "quiescent",
        );

        if (result.status !== "quiescent")
          throw new Error("expected quiescent");

        /*
         * 30s initial-wait equivalent +
         * two 10s stability intervals = 50 seconds.
         */
        expect(result.quietWindowMs).toBe(
          50_000,
        );

        expect(now).toBeGreaterThanOrEqual(
          50_000,
        );

        expect(reads).toBeGreaterThanOrEqual(
          3,
        );

        expect(
          result.metrics.internalSendCredits,
        ).toBe(10);
      },
    );

    it(
      "resets stability when an in-flight callback changes accounting",
      async () => {
        let now = 0;
        let call = 0;

        const sequence = [
          10,
          10,
          10,
          10,
          11,
          11,
          11,
        ];

        const result =
          await waitForPrepaidProbeAccountingQuiescenceV39(
            config,
            async () => {
              const value =
                sequence[
                  Math.min(
                    call,
                    sequence.length - 1,
                  )
                ];

              call += 1;

              return metrics(value);
            },
            {
              nowMs: () => now,
              sleep: async (ms) => {
                now += ms;
              },
            },
          );

        expect(result.status).toBe(
          "quiescent",
        );

        if (result.status !== "quiescent")
          throw new Error("expected quiescent");

        /*
         * Accounting changed at the 40-second read.
         * The full frozen 50-second quiet window
         * must restart from that change.
         *
         * Earliest valid reconciliation is therefore
         * at or after 90 seconds.
         */
        expect(now).toBeGreaterThanOrEqual(
          90_000,
        );

        expect(
          result.metrics.internalSendCredits,
        ).toBe(11);
      },
    );

    it(
      "fails closed when accounting never stabilizes",
      async () => {
        let now = 0;
        let n = 0;

        const result =
          await waitForPrepaidProbeAccountingQuiescenceV39(
            {
              initialWaitSeconds: 1,
              pollIntervalSeconds: 1,
              stableReadCount: 3,
              timeoutSeconds: 5,
            },
            async () =>
              metrics(n++),
            {
              nowMs: () => now,
              sleep: async (ms) => {
                now += ms;
              },
            },
          );

        expect(result).toMatchObject({
          status: "unresolved",
          reason: "timeout",
        });
      },
    );

    it(
      "fails closed on an accounting-reader failure",
      async () => {
        let now = 0;

        const result =
          await waitForPrepaidProbeAccountingQuiescenceV39(
            config,
            async () => {
              throw new Error("db read");
            },
            {
              nowMs: () => now,
              sleep: async (ms) => {
                now += ms;
              },
            },
          );

        expect(result).toMatchObject({
          status: "unresolved",
          reason: "reader_failed",
        });
      },
    );
  },
);
