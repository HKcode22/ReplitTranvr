import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("../server/lib/disruption/db_v39", () => ({
  v39Pool: {
    query: mocks.query,
  },
}));

import {
  recordPrepaidProbeCallbackFailureV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";

const SESSION =
  "12345678-1234-4234-8234-123456789abc";

describe("Phase2G callback fallback accounting", () => {
  it("updates request and failure together", async () => {
    mocks.query.mockReset();

    mocks.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ session_id: SESSION }],
    });

    await recordPrepaidProbeCallbackFailureV39(SESSION);

    expect(mocks.query).toHaveBeenCalledOnce();

    const [sql, params] = mocks.query.mock.calls[0];

    expect(sql).toContain(
      "callback_requests_seen=callback_requests_seen+1",
    );

    expect(sql).toContain(
      "callback_failures=callback_failures+1",
    );

    expect(sql).toContain("RETURNING session_id");
    expect(params).toEqual([SESSION]);
  });

  it("fails closed when session is missing", async () => {
    mocks.query.mockReset();

    mocks.query.mockResolvedValueOnce({
      rowCount: 0,
      rows: [],
    });

    await expect(
      recordPrepaidProbeCallbackFailureV39(SESSION),
    ).rejects.toThrow();
  });
});
