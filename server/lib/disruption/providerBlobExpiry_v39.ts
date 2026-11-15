import { randomUUID } from "node:crypto";
import { v39Pool as pool } from "./db_v39";
import { deleteProviderBlobAtExpiryV39, validateProviderBlobRefV39, type ProviderBlobRefV39, type ProviderBlobStoreV39 } from "./providerBlobStore_v39";
import type { Pool } from "pg";
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

/** Reuse the existing immutable blob-reference row as the per-object fence.
 * No new schema or lease. Network deletion cannot be rolled back; a later
 * explicitly admitted run can reconcile authoritative absence under the same
 * unique, immutable object key. Never silently retry an unknown COMMIT.
 */
export async function verifyOneExpiredProviderBlobV39(
  db: Pick<Pool,"connect">,
  store: Pick<ProviderBlobStoreV39,"exists"|"delete">,
  candidate: ProviderBlobExpiryCandidateV39,
  runId: string,
): Promise<"VERIFIED_NOW"|"ALREADY_VERIFIED"> {
  validateProviderBlobRefV39(candidate.ref);
  if(candidate.blobRefId!==candidate.ref.blobRefId||
     candidate.objectName!==candidate.ref.objectName||
     candidate.contentClass!==candidate.ref.contentClass||
     candidate.contentSha256!==candidate.ref.contentSha256||
     candidate.expiresAtUtc!==candidate.ref.expiresAtUtc||
     !/^provider-blob-expiry-[a-f0-9-]{36}$/.test(runId))
    throw Error("PROVIDER_BLOB_EXPIRY_CANDIDATE_SCOPE_MISMATCH");
  const client=await db.connect();
  let tx=false,commitAttempted=false,destroy=false;
  try {
    await client.query("BEGIN");tx=true;
    await client.query("SET LOCAL lock_timeout='5000ms'");
    await client.query("SET LOCAL statement_timeout='10000ms'");
    const result=await client.query(
      `SELECT blob_ref_id,storage_kind,contract_version,object_name,content_class,
              content_sha256,content_bytes,persisted_at_utc,expires_at_utc,retention_hours,
              deleted_at_utc,deletion_verified_at_utc,deletion_run_id
         FROM clean.provider_content_blob_ref
        WHERE blob_ref_id=$1 FOR UPDATE`,[candidate.blobRefId]);
    if(result.rowCount!==1)throw Error("PROVIDER_BLOB_EXPIRY_REF_MISSING");
    const row=result.rows[0],actual=rowToRef(row);
    validateProviderBlobRefV39(actual);
    if((Object.keys(actual) as (keyof ProviderBlobRefV39)[]).some(k=>actual[k]!==candidate.ref[k]))
      throw Error("PROVIDER_BLOB_EXPIRY_REF_DRIFT");
    // Clock sampled AFTER waiting for row lock; compare exact SQL timestamp,
    // not the application wall clock or a truncated microsecond boundary.
    const nowResult=await client.query(
      "SELECT clock_timestamp() AS db_now, expires_at_utc<=clock_timestamp() AS is_due FROM clean.provider_content_blob_ref WHERE blob_ref_id=$1",
      [candidate.blobRefId]);
    const clock=nowResult.rows[0];
    if(clock?.is_due!==true)throw Error("PROVIDER_BLOB_DELETE_BEFORE_EXPIRY_REFUSED");
    if(row.deletion_verified_at_utc!==null){
      if(!row.deleted_at_utc||!row.deletion_run_id||await store.exists(actual.objectName))
        throw Error("PROVIDER_BLOB_VERIFIED_MARKER_OBJECT_DISAGREES");
      await client.query("ROLLBACK");tx=false;
      return "ALREADY_VERIFIED";
    }
    // If an earlier delete succeeded but its SQL acknowledgement did not,
    // confirm absence again under the lock. Do not redownload any bytes.
    if(await store.exists(actual.objectName)){
      // The original delete/verify primitive only uses these two operations.
      await deleteProviderBlobAtExpiryV39({store:{
        ...store,exists:(name)=>store.exists(name),delete:(name)=>store.delete(name),
        uploadBytes:async()=>{throw Error("EXPIRY_UPLOAD_FORBIDDEN");},
        downloadBytes:async()=>{throw Error("EXPIRY_DOWNLOAD_FORBIDDEN");}
      },ref:actual,now:new Date(clock.db_now)});
    }
    if(await store.exists(actual.objectName))throw Error("PROVIDER_BLOB_DELETE_VERIFICATION_FAILED");
    // Marker is the observed absence time (not an invented exact remote
    // deletion timestamp), recorded from the DB clock AFTER verification.
    const updated=await client.query(
      `WITH stamp AS (SELECT clock_timestamp() AS at)
       UPDATE clean.provider_content_blob_ref
          SET deleted_at_utc=stamp.at,deletion_verified_at_utc=stamp.at,deletion_run_id=$2
         FROM stamp
        WHERE blob_ref_id=$1 AND deletion_verified_at_utc IS NULL AND expires_at_utc<=stamp.at
        RETURNING blob_ref_id`,[candidate.blobRefId,runId]);
    if(updated.rowCount!==1)throw Error("PROVIDER_BLOB_EXPIRY_TOMBSTONE_UPDATE_FAILED");
    commitAttempted=true;
    await client.query("COMMIT");tx=false;
    return "VERIFIED_NOW";
  } catch(error) {
    if(commitAttempted){destroy=true;throw Error("PROVIDER_BLOB_EXPIRY_COMMIT_UNKNOWN_INDEPENDENT_READBACK");}
    if(tx){try{await client.query("ROLLBACK");tx=false;}catch{destroy=true;}}
    throw error;
  } finally {
    client.release(destroy?new Error("PROVIDER_BLOB_EXPIRY_CONNECTION_DISCARD"):undefined);
  }
}

export async function applyExpiredProviderBlobsV39(
  candidates: readonly ProviderBlobExpiryCandidateV39[],
): Promise<{ runId: string; expiredCount: number; alreadyVerifiedCount:number }> {
  const runId = `provider-blob-expiry-${randomUUID()}`;
  if(candidates.length>1000||new Set(candidates.map(c=>c.blobRefId)).size!==candidates.length)
    throw Error("PROVIDER_BLOB_EXPIRY_UNBOUNDED_OR_DUPLICATE_BATCH");
  const store = createRequiredProviderBlobStoreV39();
  let expiredCount = 0,alreadyVerifiedCount=0;
  for (const candidate of candidates) {
    try {
      const result=await verifyOneExpiredProviderBlobV39(pool,store,candidate,runId);
      if(result==="VERIFIED_NOW")expiredCount++;else alreadyVerifiedCount++;
    } catch (error) {
      await openDeletionIncident(candidate, error);
      throw error;
    }
  }
  return { runId, expiredCount, alreadyVerifiedCount };
}
