import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  query: vi.fn(),
  store: vi.fn(() => ({})),
  persistBlob: vi.fn(),
  deleteBlob: vi.fn(),
}));

vi.mock("../server/lib/disruption/db_v39", () => ({
  v39Pool: {
    connect: mocks.connect,
    query: mocks.query,
  },
}));

vi.mock("../server/lib/disruption/replitProviderBlobStore_v39", () => ({
  createRequiredProviderBlobStoreV39: mocks.store,
}));

vi.mock("../server/lib/disruption/providerBlobStore_v39", () => ({
  persistProviderBlobBeforeAckV39: mocks.persistBlob,
  deleteProviderBlobAtExpiryV39: mocks.deleteBlob,
}));

import {
  persistPrepaidProbeWebhookV39,
  cleanupPrepaidProbeSessionLocalV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";

const SESSION = "12345678-1234-4234-8234-123456789abc";
const BLOB = "12345678-1234-4234-8234-123456789abd";

const blobRow = {
  blob_ref_id: BLOB,
  storage_kind: "replit_app_storage",
  contract_version: "provider-blob-contract-v39@1.0.0",
  object_name: "synthetic-only",
  content_class: "raw_provider_content",
  content_sha256: "a".repeat(64),
  content_bytes: 10,
  persisted_at_utc: "2026-10-08T20:00:00Z",
  expires_at_utc: "2026-10-15T20:00:00Z",
  retention_hours: 168,
  deletion_verified_at_utc: null,
};

describe("Phase2G callback/cleanup concurrency", () => {
  it("does not delete while an admitted callback holds the session lock", async () => {
    vi.resetAllMocks();

    const events: string[] = [];

    let releaseBlob!: () => void;
    let signalBlob!: () => void;
    let releaseRowLock!: () => void;
    let signalCleanupAttempt!: () => void;

    const blobGate = new Promise<void>(resolve => {
      releaseBlob = resolve;
    });

    const blobEntered = new Promise<void>(resolve => {
      signalBlob = resolve;
    });

    const rowLockGate = new Promise<void>(resolve => {
      releaseRowLock = resolve;
    });

    const cleanupAttempted = new Promise<void>(resolve => {
      signalCleanupAttempt = resolve;
    });

    mocks.persistBlob.mockImplementation(async () => {
      events.push("callback_blob_write_started");
      signalBlob();
      await blobGate;

      return {
        blobRefId: BLOB,
        storageKind: blobRow.storage_kind,
        contractVersion: blobRow.contract_version,
        objectName: blobRow.object_name,
        contentClass: blobRow.content_class,
        contentSha256: blobRow.content_sha256,
        contentBytes: blobRow.content_bytes,
        persistedAtUtc: blobRow.persisted_at_utc,
        expiresAtUtc: blobRow.expires_at_utc,
        retentionHours: blobRow.retention_hours,
      };
    });

    mocks.deleteBlob.mockImplementation(async () => {
      events.push("storage_deleted");
      return {
        blobRefId: BLOB,
        objectName: blobRow.object_name,
        contentSha256: blobRow.content_sha256,
        deletedAtUtc: "2026-10-08T20:10:00Z",
      };
    });

    const callbackClient = {
      query: vi.fn(async (sql: string) => {
        const q = sql.replace(/\s+/g, " ").trim();

        if (q === "BEGIN" || q.startsWith("SAVEPOINT ")) {
          return { rowCount: null, rows: [] };
        }

        if (q.includes("FROM clean.prepaid_probe_session_runtime") &&
            q.includes("FOR UPDATE")) {
          events.push("callback_lock_acquired");
          return {
            rowCount: 1,
            rows: [{
              state: "settling",
              provider_subscription_id: "synthetic-sub",
              expires_at_utc: "2099-01-01T00:00:00Z",
            }],
          };
        }

        if (q.includes("SELECT blob_ref_id,raw_body_sha256")) {
          return { rowCount: 0, rows: [] };
        }

        if (q.includes("INSERT INTO clean.provider_content_blob_ref") ||
            q.includes("INSERT INTO clean.prepaid_probe_delivery_runtime") ||
            q.includes("SET callback_requests_seen=") ||
            q.includes("SET callback_success_2xx=") ||
            q.includes("provider_subscription_id=COALESCE")) {
          return { rowCount: 1, rows: [] };
        }

        if (q === "COMMIT") {
          events.push("callback_committed");
          releaseRowLock();
          return { rowCount: null, rows: [] };
        }

        if (q === "ROLLBACK") {
          releaseRowLock();
          return { rowCount: null, rows: [] };
        }

        throw new Error(`UNEXPECTED_CALLBACK_QUERY:${q}`);
      }),
      release: vi.fn(),
    };

    const cleanupClient = {
      query: vi.fn(async (sql: string) => {
        const q = sql.replace(/\s+/g, " ").trim();

        if (q === "BEGIN" || q.startsWith("SET LOCAL")) {
          return { rowCount: null, rows: [] };
        }

        if (q.includes("FROM clean.prepaid_probe_session_runtime") &&
            q.includes("FOR UPDATE")) {
          events.push("cleanup_lock_requested");
          signalCleanupAttempt();
          await rowLockGate;
          events.push("cleanup_lock_acquired");
          return {
            rowCount: 1,
            rows: [{ session_id: SESSION, state: "settling" }],
          };
        }

        if (q.includes("FROM clean.provider_content_blob_ref") &&
            q.includes("ORDER BY")) {
          return { rowCount: 1, rows: [blobRow] };
        }

        if (q.startsWith("DELETE FROM clean.prepaid_probe_")) {
          return { rowCount: 1, rows: [] };
        }

        if (q === "COMMIT") {
          events.push("cleanup_committed");
          return { rowCount: null, rows: [] };
        }

        if (q === "ROLLBACK") {
          return { rowCount: null, rows: [] };
        }

        throw new Error(`UNEXPECTED_CLEANUP_QUERY:${q}`);
      }),
      release: vi.fn(),
    };

    mocks.connect
      .mockResolvedValueOnce(callbackClient)
      .mockResolvedValueOnce(cleanupClient);

    mocks.query.mockImplementation(async (sql: string) => {
      const q = sql.replace(/\s+/g, " ").trim();

      if (q.includes("UPDATE clean.provider_content_blob_ref")) {
        events.push("tombstone_committed");
        return { rowCount: 1, rows: [{ blob_ref_id: BLOB }] };
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

    const callback = persistPrepaidProbeWebhookV39({
      sessionId: SESSION,
      body: {
        subscription: { id: "synthetic-sub" },
        flights: [],
      },
    });

    await blobEntered;

    let cleanupFinished = false;
    const cleanup = cleanupPrepaidProbeSessionLocalV39(
      SESSION,
      "synthetic-safe-concurrency-run",
    ).then(result => {
      cleanupFinished = true;
      return result;
    });

    try {
      await cleanupAttempted;

      expect(cleanupFinished).toBe(false);
      expect(mocks.deleteBlob).not.toHaveBeenCalled();
      expect(events).not.toContain("cleanup_lock_acquired");

      releaseBlob();

      const persisted = await callback;
      const cleaned = await cleanup;

      expect(persisted.duplicate).toBe(false);
      expect(cleaned.deletedBlobs).toBe(1);
      expect(cleanupFinished).toBe(true);

      expect(events.indexOf("callback_committed")).toBeLessThan(
        events.indexOf("cleanup_lock_acquired"),
      );
      expect(events.indexOf("cleanup_lock_acquired")).toBeLessThan(
        events.indexOf("storage_deleted"),
      );
      expect(events.indexOf("storage_deleted")).toBeLessThan(
        events.indexOf("tombstone_committed"),
      );
      expect(events.indexOf("tombstone_committed")).toBeLessThan(
        events.indexOf("cleanup_committed"),
      );
    } finally {
      releaseBlob();
      releaseRowLock();
      await Promise.allSettled([callback, cleanup]);
    }
  });
});
