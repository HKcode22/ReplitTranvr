import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  poolQuery: vi.fn(),
}));

vi.mock("../server/lib/disruption/db_v39", () => ({
  v39Pool: {
    connect: mocks.connect,
    query: mocks.poolQuery,
  },
}));

import {
  persistPrepaidProbeWebhookV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";

const SESSION = "12345678-1234-4234-8234-123456789abc";

describe("Phase2G failed callback accounting after rollback", () => {
  it("preserves request+failure accounting on delivery lookup failure", async () => {
    vi.clearAllMocks();

    const events: string[] = [];

    const client = {
      release: vi.fn(),
      query: vi.fn(async (sql: string) => {
        const q = sql.replace(/\s+/g, " ").trim();

        if (q === "BEGIN") {
          events.push("BEGIN");
          return { rowCount: null, rows: [] };
        }

        if (
          q.includes("FROM clean.prepaid_probe_session_runtime") &&
          q.includes("FOR UPDATE")
        ) {
          events.push("SESSION_LOCK");
          return {
            rowCount: 1,
            rows: [{
              state: "settling",
              provider_subscription_id: "synthetic-sub",
              expires_at_utc: "2099-01-01T00:00:00Z",
            }],
          };
        }

        if (
          q.includes(
            "SET callback_requests_seen=callback_requests_seen+1",
          )
        ) {
          events.push("REQUEST_COUNTED");
          return { rowCount: 1, rows: [] };
        }

        if (q === "SAVEPOINT phase2g_callback_payload") {
          events.push("SAVEPOINT");
          return { rowCount: null, rows: [] };
        }

        if (
          q.includes("FROM clean.prepaid_probe_delivery_runtime")
        ) {
          events.push("LOOKUP_FAILED");
          throw new Error("INJECTED_DELIVERY_LOOKUP_FAILURE");
        }

        if (
          q === "ROLLBACK TO SAVEPOINT phase2g_callback_payload"
        ) {
          events.push("PAYLOAD_ROLLBACK");
          return { rowCount: null, rows: [] };
        }

        if (
          q.includes(
            "SET callback_failures=callback_failures+1",
          )
        ) {
          events.push("FAILURE_COUNTED");
          return {
            rowCount: 1,
            rows: [{ session_id: SESSION }],
          };
        }

        if (q === "COMMIT") {
          events.push("COMMIT");
          return { rowCount: null, rows: [] };
        }

        if (q === "ROLLBACK") {
          events.push("FULL_ROLLBACK");
          return { rowCount: null, rows: [] };
        }

        throw new Error(`UNEXPECTED_CLIENT_QUERY:${q}`);
      }),
    };

    mocks.connect.mockResolvedValue(client);

    let caught: unknown;

    try {
      await persistPrepaidProbeWebhookV39({
        sessionId: SESSION,
        body: {
          subscription: { id: "synthetic-sub" },
          flights: [],
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);

    expect((caught as Error).message)
      .toContain("INJECTED_DELIVERY_LOOKUP_FAILURE");

    expect(
      (caught as { phase2gFailureRecorded?: boolean })
        .phase2gFailureRecorded,
    ).toBe(true);

    expect(events).toEqual([
      "BEGIN",
      "SESSION_LOCK",
      "REQUEST_COUNTED",
      "SAVEPOINT",
      "LOOKUP_FAILED",
      "PAYLOAD_ROLLBACK",
      "FAILURE_COUNTED",
      "COMMIT",
    ]);

    expect(client.release).toHaveBeenCalledOnce();
    expect(mocks.poolQuery).not.toHaveBeenCalled();
  });
});
