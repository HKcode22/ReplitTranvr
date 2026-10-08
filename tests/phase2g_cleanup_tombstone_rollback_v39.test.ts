import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  poolQuery: vi.fn(),
  store: vi.fn(() => ({})),
  deleteBlob: vi.fn(),
}));

vi.mock("../server/lib/disruption/db_v39", () => ({
  v39Pool: {
    connect: mocks.connect,
    query: mocks.poolQuery,
  },
}));

vi.mock("../server/lib/disruption/replitProviderBlobStore_v39", () => ({
  createRequiredProviderBlobStoreV39: mocks.store,
}));

vi.mock("../server/lib/disruption/providerBlobStore_v39", () => ({
  deleteProviderBlobAtExpiryV39: mocks.deleteBlob,
}));

import {
  cleanupPrepaidProbeSessionLocalV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";

const SESSION = "12345678-1234-4234-8234-123456789abc";
const BLOB = "12345678-1234-4234-8234-123456789abd";

describe("Phase2G durable deletion tombstones", () => {
  it("preserves a verified tombstone if runtime transaction commit fails", async () => {
    vi.clearAllMocks();

    const events: string[] = [];
    let tombstoneCommitted = false;
    let runtimeRolledBack = false;

    const clientQuery = vi.fn(async (sql: string) => {
      const q = sql.replace(/\s+/g, " ").trim();

      if (q === "BEGIN" || q.startsWith("SET LOCAL")) {
        return { rowCount: null, rows: [] };
      }

      if (q.includes("FROM clean.prepaid_probe_session_runtime") &&
          q.includes("FOR UPDATE")) {
        events.push("session_locked");
        return {
          rowCount: 1,
          rows: [{ session_id: SESSION, state: "settling" }],
        };
      }

      if (q.includes("FROM clean.provider_content_blob_ref") &&
          q.includes("ORDER BY")) {
        return {
          rowCount: 1,
          rows: [{
            blob_ref_id: BLOB,
            storage_kind: "replit_app_storage",
            contract_version: "provider-blob-contract-v39@1.0.0",
            object_name: "synthetic-only",
            content_class: "raw_provider_content",
            content_sha256: "a".repeat(64),
            content_bytes: 12,
            persisted_at_utc: "2026-10-08T20:00:00Z",
            expires_at_utc: "2026-10-15T20:00:00Z",
            retention_hours: 168,
            deletion_verified_at_utc: null,
          }],
        };
      }

      if (q.includes("UPDATE clean.provider_content_blob_ref")) {
        throw new Error("TOMBSTONE_NOT_INDEPENDENT");
      }

      if (q.startsWith("DELETE FROM clean.prepaid_probe_")) {
        return { rowCount: 1, rows: [] };
      }

      if (q === "COMMIT") {
        events.push("runtime_commit_attempt");
        throw new Error("INJECTED_RUNTIME_COMMIT_FAILURE");
      }

      if (q === "ROLLBACK") {
        runtimeRolledBack = true;
        events.push("runtime_rolled_back");
        return { rowCount: null, rows: [] };
      }

      throw new Error(`UNEXPECTED_CLIENT_QUERY:${q}`);
    });

    const release = vi.fn();
    mocks.connect.mockResolvedValue({
      query: clientQuery,
      release,
    });

    mocks.deleteBlob.mockImplementation(async () => {
      events.push("storage_deletion_verified");
      return {
        blobRefId: BLOB,
        objectName: "synthetic-only",
        contentSha256: "a".repeat(64),
        deletedAtUtc: "2026-10-08T20:10:00Z",
      };
    });

    mocks.poolQuery.mockImplementation(async (sql: string) => {
      const q = sql.replace(/\s+/g, " ").trim();

      if (q.includes("UPDATE clean.provider_content_blob_ref")) {
        events.push("tombstone_committed");
        tombstoneCommitted = true;
        return { rowCount: 1, rows: [{ blob_ref_id: BLOB }] };
      }

      throw new Error(`UNEXPECTED_POOL_QUERY:${q}`);
    });

    await expect(
      cleanupPrepaidProbeSessionLocalV39(
        SESSION,
        "synthetic-deletion-run-01",
        async () => undefined,
      ),
    ).rejects.toThrow("INJECTED_RUNTIME_COMMIT_FAILURE");

    expect(tombstoneCommitted).toBe(true);
    expect(runtimeRolledBack).toBe(true);
    expect(release).toHaveBeenCalledOnce();

    expect(events).toEqual([
      "session_locked",
      "storage_deletion_verified",
      "tombstone_committed",
      "runtime_commit_attempt",
      "runtime_rolled_back",
    ]);
  });
});
