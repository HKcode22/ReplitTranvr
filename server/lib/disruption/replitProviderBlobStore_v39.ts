import { Client } from "@replit/object-storage";
import type { ProviderBlobStoreV39 } from "./providerBlobStore_v39";

export const V39_PROVIDER_BLOB_BUCKET_ENV = "V39_PROVIDER_BLOB_BUCKET_ID" as const;
export const V39_PROVIDER_BLOB_MODE_ENV = "V39_PROVIDER_BLOB_MODE" as const;
export const V39_PROVIDER_BLOB_REQUIRED_MODE = "required" as const;

function message(error: unknown): string {
  if (!error) return "unknown object-storage error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  try { return JSON.stringify(error); } catch { return "unserializable object-storage error"; }
}

/**
 * Thin adapter over Replit's official @replit/object-storage SDK.
 *
 * We require an explicitly named dedicated bucket for provider content. Falling
 * back to the app's default bucket is intentionally forbidden so prerequisite-P
 * can reason about one isolated deletion/access surface rather than whatever
 * other application objects happen to share the default bucket.
 */
export class ReplitProviderBlobStoreV39 implements ProviderBlobStoreV39 {
  private readonly client: Client;

  constructor(bucketId: string) {
    const normalized = bucketId.trim();
    if (!normalized) throw new Error("V39_PROVIDER_BLOB_BUCKET_ID_REQUIRED");
    this.client = new Client({ bucketId: normalized });
  }

  async uploadBytes(objectName: string, bytes: Uint8Array): Promise<void> {
    const result = await this.client.uploadFromBytes(objectName, Buffer.from(bytes), { compress: false });
    if (!result.ok) throw new Error(`V39_PROVIDER_BLOB_UPLOAD_FAILED:${message(result.error)}`);
  }

  async downloadBytes(objectName: string): Promise<Uint8Array> {
    const result = await this.client.downloadAsBytes(objectName, { decompress: false });
    if (!result.ok) throw new Error(`V39_PROVIDER_BLOB_DOWNLOAD_FAILED:${message(result.error)}`);
    const tuple = result.value;
    const buffer = tuple?.[0];
    if (!buffer) throw new Error("V39_PROVIDER_BLOB_DOWNLOAD_EMPTY_RESULT");
    return new Uint8Array(buffer);
  }

  async exists(objectName: string): Promise<boolean> {
    const result = await this.client.exists(objectName);
    if (!result.ok) throw new Error(`V39_PROVIDER_BLOB_EXISTS_FAILED:${message(result.error)}`);
    return result.value;
  }

  async delete(objectName: string): Promise<void> {
    const result = await this.client.delete(objectName, { ignoreNotFound: true });
    if (!result.ok) throw new Error(`V39_PROVIDER_BLOB_DELETE_FAILED:${message(result.error)}`);
  }
}

export function providerBlobStorageRequiredV39(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env[V39_PROVIDER_BLOB_MODE_ENV] ?? "").trim().toLowerCase() === V39_PROVIDER_BLOB_REQUIRED_MODE;
}

/**
 * Production construction is intentionally fail-closed. `required` mode with a
 * missing dedicated bucket is a configuration error, never a fallback to
 * PostgreSQL plaintext or the app's default object bucket.
 */
export function createRequiredProviderBlobStoreV39(env: NodeJS.ProcessEnv = process.env): ReplitProviderBlobStoreV39 {
  if (!providerBlobStorageRequiredV39(env)) throw new Error("V39_PROVIDER_BLOB_MODE_NOT_REQUIRED");
  const bucketId = String(env[V39_PROVIDER_BLOB_BUCKET_ENV] ?? "").trim();
  if (!bucketId) throw new Error("V39_PROVIDER_BLOB_BUCKET_ID_REQUIRED");
  return new ReplitProviderBlobStoreV39(bucketId);
}
