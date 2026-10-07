import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock(
  "../server/lib/disruption/db_v39",
  () => ({
    v39Pool: {
      query: queryMock,
    },
  }),
);

import {
  prepaidProbeMetricsV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";

const SESSION =
  "00000000-0000-4000-8000-000000000001";

const START =
  new Date("2026-10-06T03:05:00.000Z");

const END =
  new Date("2026-10-06T05:05:00.000Z");

function mockEmptyScientificWindowWithAccounting(
  accounting: {
    deliveryCount: number;
    notificationItems: number;
    internalCredits: number;
    explicitCostCount: number;
    fallbackCount: number;
    disagreementCount: number;
  },
) {
  /*
   * Query 1: scientific item rows.
   * These remain strictly [START,END).
   */
  queryMock.mockResolvedValueOnce({
    rowCount: 0,
    rows: [],
  });

  /*
   * Query 2: subscription-lifecycle delivery accounting.
   * This deliberately represents accounting evidence even
   * when no scientific item rows are inside the window.
   */
  queryMock.mockResolvedValueOnce({
    rowCount: 1,
    rows: [{
      delivery_count: accounting.deliveryCount,
      notification_items: accounting.notificationItems,
      internal_credits: accounting.internalCredits,
      explicit_cost_count: accounting.explicitCostCount,
      fallback_count: accounting.fallbackCount,
      cost_item_disagreement_count:
        accounting.disagreementCount,
    }],
  });

  /*
   * Query 3: session-wide callback counters.
   */
  queryMock.mockResolvedValueOnce({
    rowCount: 1,
    rows: [{
      callback_requests_seen:
        accounting.deliveryCount,
      callback_success_2xx:
        accounting.deliveryCount,
      callback_failures:
        0,
    }],
  });
}

describe(
  "Phase2G prepaid reconciliation aperture",
  () => {
    beforeEach(() => {
      queryMock.mockReset();
    });

    it(
      "keeps scientific rows window-bounded but accounting session-wide",
      async () => {
        mockEmptyScientificWindowWithAccounting({
          deliveryCount: 1,
          notificationItems: 1,
          internalCredits: 1,
          explicitCostCount: 1,
          fallbackCount: 0,
          disagreementCount: 0,
        });

        const metrics =
          await prepaidProbeMetricsV39(
            SESSION,
            START,
            END,
          );

        expect(queryMock).toHaveBeenCalledTimes(3);

        const scientificSql =
          String(queryMock.mock.calls[0][0]);

        const accountingSql =
          String(queryMock.mock.calls[1][0]);

        const scientificArgs =
          queryMock.mock.calls[0][1];

        const accountingArgs =
          queryMock.mock.calls[1][1];

        /*
         * Scientific identity/yield remains exact half-open
         * [start,end).
         */
        expect(scientificSql).toContain(
          "received_at_utc >= $2",
        );

        expect(scientificSql).toContain(
          "received_at_utc < $3",
        );

        expect(scientificArgs).toEqual([
          SESSION,
          START,
          END,
        ]);

        /*
         * Credit reconciliation must span the complete exact
         * owned session, not the scientific observation window.
         */
        expect(accountingSql).toContain(
          "WHERE session_id=$1",
        );

        expect(accountingSql).not.toContain(
          "received_at_utc >=",
        );

        expect(accountingSql).not.toContain(
          "received_at_utc <",
        );

        expect(accountingArgs).toEqual([
          SESSION,
        ]);

        /*
         * A lifecycle accounting delivery can therefore exist
         * without becoming a scientific-window observation.
         */
        expect(metrics.rowsDelivered).toBe(0);
        expect(metrics.internalSendCredits).toBe(1);
        expect(metrics.deliveryCount).toBe(1);
        expect(
          metrics.notificationItemsReceived,
        ).toBe(1);
        expect(
          metrics.explicitCostDeliveryCount,
        ).toBe(1);
        expect(
          metrics.fallbackDeliveryCount,
        ).toBe(0);
        expect(
          metrics.costItemDisagreementCount,
        ).toBe(0);
      },
    );

    it(
      "does not weaken exact reconciliation accounting semantics",
      async () => {
        mockEmptyScientificWindowWithAccounting({
          deliveryCount: 2,
          notificationItems: 2,
          internalCredits: 2,
          explicitCostCount: 2,
          fallbackCount: 0,
          disagreementCount: 0,
        });

        const metrics =
          await prepaidProbeMetricsV39(
            SESSION,
            START,
            END,
          );

        expect(metrics.internalSendCredits).toBe(2);
        expect(metrics.deliveryCount).toBe(2);
        expect(
          metrics.costItemDisagreementCount,
        ).toBe(0);

        /*
         * This patch changes accounting aperture only.
         * It does NOT introduce a one-credit tolerance.
         */
        expect(metrics.rowsDelivered).toBe(0);
      },
    );
  },
);
