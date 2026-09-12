import { describe, expect, it } from "vitest";
import {
  deleteProviderBlobAtExpiryV39,
  persistProviderBlobBeforeAckV39,
  providerBlobObjectNameV39,
  verifyProviderBlobStorageEvidenceV39,
  type ProviderBlobStoreV39,
} from "../server/lib/disruption/providerBlobStore_v39";

class MemoryBlobStore implements ProviderBlobStoreV39 {
  readonly objects = new Map<string, Uint8Array>();
  corruptRoundTrip = false;
  refuseDelete = false;

  async uploadBytes(objectName: string, bytes: Uint8Array): Promise<void> {
    this.objects.set(objectName, new Uint8Array(bytes));
  }
  async downloadBytes(objectName: string): Promise<Uint8Array> {
    const value = this.objects.get(objectName);
    if (!value) throw new Error("missing");
    const copy = new Uint8Array(value);
    if (this.corruptRoundTrip && copy.length) copy[0] ^= 0xff;
    return copy;
  }
  async exists(objectName: string): Promise<boolean> { return this.objects.has(objectName); }
  async delete(objectName: string): Promise<void> {
    if (!this.refuseDelete) this.objects.delete(objectName);
  }
}

const UUID = "123e4567-e89b-42d3-a456-426614174000";

describe("V3.9 provider-blob storage boundary", () => {
  it("uses opaque object names with no provider identity", () => {
    const name = providerBlobObjectNameV39("raw_provider_content", UUID);
    expect(name).toBe("v39/provider/raw_provider_content/12/123e4567-e89b-42d3-a456-426614174000.blob");
    expect(name).not.toMatch(/flight|airport|carrier|subscription/i);
  });

  it("round-trip verifies raw content before returning the durable-before-2xx ref", async () => {
    const store = new MemoryBlobStore();
    const bytes = new TextEncoder().encode(JSON.stringify({ provider: "fixture", value: 123 }));
    const ref = await persistProviderBlobBeforeAckV39({
      store,
      bytes,
      contentClass: "raw_provider_content",
      retentionHours: 168,
      now: new Date("2026-09-12T12:00:00Z"),
      uuid: UUID,
    });
    expect(await store.exists(ref.objectName)).toBe(true);
    expect(ref.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(ref.expiresAtUtc).toBe("2026-09-19T12:00:00.000Z");
  });

  it("fails closed and cleans up when the uploaded bytes do not round-trip exactly", async () => {
    const store = new MemoryBlobStore();
    store.corruptRoundTrip = true;
    const bytes = new TextEncoder().encode("sensitive-provider-fixture");
    await expect(persistProviderBlobBeforeAckV39({
      store,
      bytes,
      contentClass: "live_fids_cache",
      retentionHours: 24,
      now: new Date("2026-09-12T12:00:00Z"),
      uuid: UUID,
    })).rejects.toThrow(/ROUNDTRIP_MISMATCH/);
    expect(store.objects.size).toBe(0);
  });

  it("enforces 24h FIDS and 168h raw maximums", async () => {
    const store = new MemoryBlobStore();
    const bytes = new TextEncoder().encode("x");
    await expect(persistProviderBlobBeforeAckV39({
      store, bytes, contentClass: "live_fids_cache", retentionHours: 25,
      now: new Date("2026-09-12T12:00:00Z"), uuid: UUID,
    })).rejects.toThrow(/RETENTION_OVER_HARD_LIMIT:live_fids_cache/);
    await expect(persistProviderBlobBeforeAckV39({
      store, bytes, contentClass: "raw_provider_content", retentionHours: 169,
      now: new Date("2026-09-12T12:00:00Z"), uuid: UUID,
    })).rejects.toThrow(/RETENTION_OVER_HARD_LIMIT:raw_provider_content/);
  });

  it("verifies object absence after hard deletion", async () => {
    const store = new MemoryBlobStore();
    const ref = await persistProviderBlobBeforeAckV39({
      store,
      bytes: new TextEncoder().encode("delete-me"),
      contentClass: "live_fids_cache",
      retentionHours: 24,
      now: new Date("2026-09-12T12:00:00Z"),
      uuid: UUID,
    });
    const tombstone = await deleteProviderBlobAtExpiryV39({
      store,
      ref,
      now: new Date("2026-09-13T12:00:00Z"),
    });
    expect(await store.exists(ref.objectName)).toBe(false);
    expect(tombstone.contentSha256).toBe(ref.contentSha256);
  });

  it("refuses to claim deployment PASS without actual bucket round-trip/delete proof and zero DB plaintext", () => {
    const blocked = verifyProviderBlobStorageEvidenceV39({
      schemaVersion: "v3.9-provider-blob-storage-evidence-1",
      storageKind: "replit_app_storage",
      state: "NOT_DEPLOYED",
      deletionSemantics: "permanent_irreversible",
      postgresPitrIndependent: true,
      bucketAccessScoped: true,
      liveUploadRoundTripVerified: false,
      liveDeleteThenAbsentVerified: false,
      providerPlaintextStoredInPostgres: true,
      verifiedAtUtc: "2026-09-12T12:00:00Z",
      source: "fixture",
    });
    expect(blocked.pass).toBe(false);
    expect(blocked.failures).toEqual(expect.arrayContaining([
      "blob-storage-not-deployed:NOT_DEPLOYED",
      "blob-storage-live-roundtrip-unverified",
      "blob-storage-live-delete-unverified",
      "provider-plaintext-still-in-postgres",
    ]));
  });
});
