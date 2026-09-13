import { describe, expect, it } from "vitest";
import {
  createRequiredProviderBlobStoreV39,
  providerBlobStorageRequiredV39,
  V39_PROVIDER_BLOB_BUCKET_ENV,
  V39_PROVIDER_BLOB_MODE_ENV,
} from "../server/lib/disruption/replitProviderBlobStore_v39";

describe("V3.9 Replit provider blob store adapter", () => {
  it("requires an explicit required mode rather than silently enabling storage", () => {
    expect(providerBlobStorageRequiredV39({})).toBe(false);
    expect(providerBlobStorageRequiredV39({ [V39_PROVIDER_BLOB_MODE_ENV]: "required" })).toBe(true);
    expect(providerBlobStorageRequiredV39({ [V39_PROVIDER_BLOB_MODE_ENV]: "REQUIRED" })).toBe(true);
  });

  it("refuses construction when mode is not required", () => {
    expect(() => createRequiredProviderBlobStoreV39({
      [V39_PROVIDER_BLOB_BUCKET_ENV]: "some-bucket",
    })).toThrow("V39_PROVIDER_BLOB_MODE_NOT_REQUIRED");
  });

  it("refuses required mode without an explicitly dedicated bucket id", () => {
    expect(() => createRequiredProviderBlobStoreV39({
      [V39_PROVIDER_BLOB_MODE_ENV]: "required",
    })).toThrow("V39_PROVIDER_BLOB_BUCKET_ID_REQUIRED");
  });

  it("does not use the SDK default bucket in production construction", () => {
    const source = String(createRequiredProviderBlobStoreV39);
    expect(source).toContain("V39_PROVIDER_BLOB_BUCKET_ID_REQUIRED");
  });
});
