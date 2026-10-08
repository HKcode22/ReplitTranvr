import { describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  connect: vi.fn(),
  query: vi.fn(),
  store: vi.fn(() => ({})),
}));

vi.mock("../server/lib/disruption/db_v39", () => ({
  v39Pool: {
    connect: m.connect,
    query: m.query,
  },
}));

vi.mock("../server/lib/disruption/replitProviderBlobStore_v39", () => ({
  createRequiredProviderBlobStoreV39: m.store,
}));

import {
  cleanupPrepaidProbeSessionLocalV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";

const SESSION = "12345678-1234-4234-8234-123456789abc";
const RUN = "synthetic-journal-run-001";
const SHA = "a".repeat(64);

describe("Phase2G cleanup journal lifecycle", () => {
  it("commits STARTED before deletion and VERIFIED with runtime commit", async () => {
    vi.clearAllMocks();

    const events: string[] = [];

    const client = {
      release: vi.fn(),
      query: vi.fn(async (sql: string) => {
        const q = sql.replace(/\s+/g, " ").trim();

        if (q === "BEGIN" || q.startsWith("SET LOCAL"))
          return { rowCount: null, rows: [] };

        if (q.includes("FROM clean.prepaid_probe_session_runtime") &&
            q.includes("FOR UPDATE")) {
          events.push("locked");
          return {
            rowCount: 1,
            rows: [{ session_id: SESSION, state: "settling" }],
          };
        }

        if (q.includes("FROM clean.provider_content_blob_ref") &&
            q.includes("ORDER BY"))
          return { rowCount: 0, rows: [] };

        if (q.startsWith("DELETE FROM clean.prepaid_probe_")) {
          events.push("runtime_delete");
          return { rowCount: 1, rows: [] };
        }

        if (q.includes("UPDATE clean.phase2g_cleanup_journal_v39")) {
          events.push("verified_update");
          return { rowCount: 1, rows: [{ session_id: SESSION }] };
        }

        if (q === "COMMIT") {
          events.push("committed");
          return { rowCount: null, rows: [] };
        }

        if (q === "ROLLBACK")
          return { rowCount: null, rows: [] };

        throw new Error(`UNEXPECTED_CLIENT_QUERY:${q}`);
      }),
    };

    m.connect.mockResolvedValue(client);

    m.query.mockImplementation(async (sql: string) => {
      const q = sql.replace(/\s+/g, " ").trim();

      if (q.includes("INSERT INTO clean.phase2g_cleanup_journal_v39")) {
        events.push("started_committed");
        return { rowCount: 1, rows: [] };
      }

      if (q.includes("FROM clean.phase2g_cleanup_journal_v39")) {
        return {
          rowCount: 1,
          rows: [{
            probe_id: 42,
            deletion_run_id: RUN,
            request_sha256: SHA,
            expected_live_blobs: 0,
            state: "STARTED",
          }],
        };
      }

      if (q.includes("FROM clean.provider_content_blob_ref") &&
          q.includes("FILTER")) {
        return {
          rowCount: 1,
          rows: [{ total: 0, verified: 0, live: 0 }],
        };
      }

      if (q.includes("(SELECT count(*) FROM clean.prepaid_probe_item_runtime")) {
        return {
          rowCount: 1,
          rows: [{
            items: 0,
            deliveries: 0,
            sessions: 0,
            live_blobs: 0,
          }],
        };
      }

      throw new Error(`UNEXPECTED_POOL_QUERY:${q}`);
    });

    const result = await cleanupPrepaidProbeSessionLocalV39(
      SESSION,
      RUN,
      async () => undefined,
      {
        probeId: 42,
        expectedLiveBlobs: 0,
        requestSha256: SHA,
      },
    );

    expect(result.deletedRuntimeRows).toBe(3);
    expect(events).toEqual([
      "locked",
      "started_committed",
      "runtime_delete",
      "runtime_delete",
      "runtime_delete",
      "verified_update",
      "committed",
    ]);
    expect(client.release).toHaveBeenCalledOnce();
  });
});
