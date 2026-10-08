import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  query: vi.fn(),
}));

vi.mock("../server/lib/disruption/db_v39", () => ({
  v39Pool: {
    connect: mocks.connect,
    query: mocks.query,
  },
}));

import {
  persistPrepaidProbeWebhookV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";

const SESSION = "12345678-1234-4234-8234-123456789abc";

describe("Phase2G failed callback serialization", () => {
  it("records a rejected callback before releasing its session lock", async () => {
    vi.clearAllMocks();

    const events: string[] = [];
    const client = {
      release: vi.fn(),
      query: vi.fn(async (sql: string) => {
        const q = sql.replace(/\s+/g, " ").trim();

        if (q === "BEGIN") {
          events.push("begin");
          return { rowCount: null, rows: [] };
        }

        if (
          q.includes(
            "FROM clean.prepaid_probe_session_runtime",
          ) &&
          q.includes("FOR UPDATE")
        ) {
          events.push("session_lock");
          return {
            rowCount: 1,
            rows: [{
              state: "settling",
              provider_subscription_id: "expected-sub",
              expires_at_utc: "2099-01-01T00:00:00Z",
            }],
          };
        }

        if (
          q.includes(
            "SET callback_requests_seen=callback_requests_seen+1",
          )
        ) {
          events.push("request_increment");
          return { rowCount: 1, rows: [] };
        }

        if (
          q === "SAVEPOINT phase2g_callback_payload"
        ) {
          events.push("savepoint");
          return { rowCount: null, rows: [] };
        }

        if (
          q ===
          "ROLLBACK TO SAVEPOINT phase2g_callback_payload"
        ) {
          events.push("payload_rollback");
          return { rowCount: null, rows: [] };
        }

        if (
          q.includes(
            "SET callback_failures=callback_failures+1",
          )
        ) {
          events.push("failure_increment");
          return {
            rowCount: 1,
            rows: [{ session_id: SESSION }],
          };
        }

        if (q === "COMMIT") {
          events.push("commit");
          return { rowCount: null, rows: [] };
        }

        if (q === "ROLLBACK") {
          events.push("full_rollback");
          return { rowCount: null, rows: [] };
        }

        throw new Error(`UNEXPECTED_QUERY:${q}`);
      }),
    };

    mocks.connect.mockResolvedValue(client);

    let failure: unknown;

    try {
      await persistPrepaidProbeWebhookV39({
        sessionId: SESSION,
        body: {
          subscription: { id: "wrong-sub" },
          flights: [],
        },
      });
    } catch (e) {
      failure = e;
    }

    expect(failure).toBeInstanceOf(Error);
    expect(String((failure as Error).message))
      .toContain("SUBSCRIPTION_MISMATCH");

    expect(
      (failure as { phase2gFailureRecorded?: boolean })
        .phase2gFailureRecorded,
    ).toBe(true);

    expect(events).toEqual([
      "begin",
      "session_lock",
      "request_increment",
      "savepoint",
      "payload_rollback",
      "failure_increment",
      "commit",
    ]);

    expect(client.release).toHaveBeenCalledOnce();
  });
});
