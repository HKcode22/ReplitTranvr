import { randomUUID } from "node:crypto";
import { v39Pool as pool } from "./db_v39";
import { deleteProviderBlobAtExpiryV39, type ProviderBlobRefV39 } from "./providerBlobStore_v39";
import { createRequiredProviderBlobStoreV39 } from "./replitProviderBlobStore_v39";

export interface ProviderBlobExpiryCandidateV39 {
  blobRefId: string;
  objectName: string;
  contentClass: "raw_provider_content" | "live_fids_cache";
  contentSha256: string;
  expiresAtUtc: string;
  ref: ProviderBlobRefV39;
}

function rowToRef(row: any): ProviderBlobRefV39 {
  return {
    blobRefId: String(row.blob_ref_id),
    contractVersion: String(row.contract_version) as ProviderBlobRefV39["contractVersion"],
    storageKind: String(row.storage_kind) as ProviderBlobRefV39["storageKind"],
    objectName: String(row.object_name),
    contentClass: String(row.content_class) as ProviderBlobRefV39["contentClass"],
    contentSha256: String(row.content_sha256),
    contentBytes: Number(row.content_bytes),
    persistedAtUtc: new Date(row.persisted_at_utc).toISOString(),
    expiresAtUtc: new Date(row.expires_at_utc).toISOString(),
    retentionHours: Number(row.retention_hours),
  };
}

export async function collectExpiredProviderBlobsV39(now: Date, limit: number): Promise<ProviderBlobExpiryCandidateV39[]> {
  if (!Number.isFinite(now.getTime())) throw new Error("PROVIDER_BLOB_EXPIRY_NOW_INVALID");
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("PROVIDER_BLOB_EXPIRY_LIMIT_INVALID");
  const result = await pool.query(
    `SELECT blob_ref_id,storage_kind,contract_version,object_name,content_class,content_sha256,content_bytes,
            persisted_at_utc,expires_at_utc,retention_hours
       FROM clean.provider_content_blob_ref
      WHERE deletion_verified_at_utc IS NULL AND expires_at_utc <= $1
      ORDER BY expires_at_utc,blob_ref_id
      LIMIT $2`,
    [now, limit],
  );
  return result.rows.map((row: any) => ({
    blobRefId: String(row.blob_ref_id),
    objectName: String(row.object_name),
    contentClass: String(row.content_class) as ProviderBlobExpiryCandidateV39["contentClass"],
    contentSha256: String(row.content_sha256),
    expiresAtUtc: new Date(row.expires_at_utc).toISOString(),
    ref: rowToRef(row),
  }));
}

async function openDeletionIncident(candidate: ProviderBlobExpiryCandidateV39, error: unknown): Promise<void> {
  await pool.query(
    `INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
     VALUES('deletion',now(),$1::jsonb,false)`,
    [JSON.stringify({
      owner: "providerBlobExpiry_v39",
      blobRefId: candidate.blobRefId,
      contentClass: candidate.contentClass,
      contentSha256: candidate.contentSha256,
      errorType: error instanceof Error ? error.name : "unknown",
    })],
  ).catch(() => undefined);
}

export async function applyExpiredProviderBlobsV39(
  candidates: readonly ProviderBlobExpiryCandidateV39[],
): Promise<{ runId: string; expiredCount: number }> {
  const runId = `provider-blob-expiry-${randomUUID()}`;
  const store = createRequiredProviderBlobStoreV39();
  let expiredCount = 0;
  for (const candidate of candidates) {
    try {
      const deleted = await deleteProviderBlobAtExpiryV39({
        store,
        ref: candidate.ref,
        now: new Date(),
      });
      const updated = await pool.query(
        `UPDATE clean.provider_content_blob_ref
            SET deleted_at_utc=$2,deletion_verified_at_utc=$2,deletion_run_id=$3
          WHERE blob_ref_id=$1 AND deletion_verified_at_utc IS NULL
          RETURNING blob_ref_id`,
        [candidate.blobRefId, deleted.deletedAtUtc, runId],
      );
      if (updated.rowCount !== 1) throw new Error("PROVIDER_BLOB_EXPIRY_TOMBSTONE_UPDATE_FAILED");
      expiredCount += 1;
    } catch (error) {
      await openDeletionIncident(candidate, error);
      throw error;
    }
  }
  return { runId, expiredCount };
}
