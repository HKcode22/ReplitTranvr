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
     !/^provider-blob-expiry-(?:recurring-v39-)?[a-f0-9-]{36}$/.test(runId))
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

/** Use the EXISTING append-only object-surface retention tombstone ledger
 * as durable post-commit readback evidence. Historic one-time markers have
 * a different run ID and are not swept/re-deleted by this recurring protocol.
 * The hash is a deterministic receipt identity, NOT a policy signature.
 */
const RECURRING_RUN_PREFIX="provider-blob-expiry-recurring-v39-";
const RECURRING_WITNESS_HASH_SQL=
  "encode(sha256(convert_to('v39.provider-blob-recurring-primary-readback.v1|'||b.blob_ref_id::text||'|'||b.content_sha256||'|'||b.deletion_run_id,'UTF8')),'hex')";
const RECURRING_WITNESS_MATCH_SQL=`
  t.surface='object' AND t.record_id='provider_content_blob_ref:'||b.blob_ref_id::text
  AND t.content_hash=b.content_sha256 AND t.expired_at=b.expires_at_utc
  AND t.plan_hash=${RECURRING_WITNESS_HASH_SQL}
  AND t.content_class=b.content_class AND t.source_table='clean.provider_content_blob_ref'
  AND t.retention_rule='provider_blob_declared_expiry'
  AND t.expiry_run_id=b.deletion_run_id
  AND t.deletion_mode='independent-primary-object-absence'
  AND t.tombstoned_at_utc>=b.deletion_verified_at_utc`;
const RECURRING_UNWITNESSED_SQL=`
  b.deletion_verified_at_utc IS NOT NULL
  AND b.deletion_run_id LIKE 'provider-blob-expiry-recurring-v39-%'
  AND NOT EXISTS(SELECT 1 FROM clean.retention_tombstone t
    WHERE ${RECURRING_WITNESS_MATCH_SQL})`;

/**
 * One bounded recurring expiry batch, using the existing immutable ref,
 * original row-lock deletion primitive, and existing object-surface ledger.
 * A marker committed before an interrupted independent readback is a
 * durable recovery obligation. Recover it FIRST without issuing DELETE.
 * Historic one-off cleanup is not replayed. No new table or production
 * role/scheduler/owner authority is granted here.
 */
export async function runBoundedProviderBlobExpiryBatchV39(
  db: Pick<Pool,"query"|"connect">,
  store: Pick<ProviderBlobStoreV39,"exists"|"delete">,
  readback: Pick<Pool,"query">,
  readbackStore: Pick<ProviderBlobStoreV39,"exists">,
  limit: number,
  canBeginCandidate:()=>boolean=()=>true,
): Promise<{
  status:"DUE_AT_CUTOFF_CLEARED"|"BACKLOG_REMAINS_AT_CUTOFF";
  selectedCount:number; verifiedNowCount:number; alreadyVerifiedCount:number;
  independentlyReadBackCount:number; recoveredReadbackCount:number;
  remainingAtCutoff:number; remainingUnwitnessedMarkersAtCutoff:number;
}> {
  if(!Number.isSafeInteger(limit)||limit<1||limit>100||typeof canBeginCandidate!=="function")
    throw Error("PROVIDER_BLOB_RECURRING_BATCH_LIMIT_INVALID");
  const clock=await db.query("SELECT clock_timestamp()::text AS cutoff");
  const cutoff=clock.rows[0]?.cutoff;
  if(typeof cutoff!=="string"||!Number.isFinite(Date.parse(cutoff)))
    throw Error("PROVIDER_BLOB_RECURRING_DB_CLOCK_INVALID");
  const due=await db.query(
    `SELECT b.blob_ref_id,b.storage_kind,b.contract_version,b.object_name,b.content_class,
            b.content_sha256,b.content_bytes,b.persisted_at_utc,b.expires_at_utc,b.retention_hours,
            (b.deletion_verified_at_utc IS NOT NULL) AS recover_readback
       FROM clean.provider_content_blob_ref b
      WHERE b.expires_at_utc <= $1::timestamptz
        AND (b.deletion_verified_at_utc IS NULL OR (${RECURRING_UNWITNESSED_SQL}))
      ORDER BY (b.deletion_verified_at_utc IS NULL),b.expires_at_utc,b.blob_ref_id LIMIT $2`,[cutoff,limit]);
  const candidates=due.rows.map(row=>{
    const ref=rowToRef(row);validateProviderBlobRefV39(ref);
    if(typeof row.recover_readback!=="boolean")throw Error("PROVIDER_BLOB_RECURRING_SCOPE_INVALID");
    const candidate:ProviderBlobExpiryCandidateV39={blobRefId:ref.blobRefId,objectName:ref.objectName,
      contentClass:ref.contentClass,contentSha256:ref.contentSha256,expiresAtUtc:ref.expiresAtUtc,ref};
    return {candidate,recoverReadback:row.recover_readback as boolean};
  });
  if(candidates.length>limit||new Set(candidates.map(c=>c.candidate.blobRefId)).size!==candidates.length)
    throw Error("PROVIDER_BLOB_RECURRING_SCOPE_INVALID");
  const runId=RECURRING_RUN_PREFIX+randomUUID();
  let verifiedNowCount=0,alreadyVerifiedCount=0,independentlyReadBackCount=0,recoveredReadbackCount=0;
  for(const {candidate,recoverReadback} of candidates){
    // Only stop between complete candidates. Never interrupt a successful
    // delete before its marker/readback merely because the ordinary work
    // start budget has elapsed. Backlog is counted from actual DB state.
    const begin=canBeginCandidate();
    if(begin===false)break;
    if(begin!==true)throw Error("PROVIDER_BLOB_RECURRING_WORK_BOUND_INVALID");
    // A pending marker is immutable. Never issue another physical delete
    // on a readback recovery (an unexpected present object is HOLD).
    const result=recoverReadback?"ALREADY_VERIFIED":
      await verifyOneExpiredProviderBlobV39(db,store,candidate,runId);
    if(result==="VERIFIED_NOW")verifiedNowCount++;else alreadyVerifiedCount++;
    const proof=await readback.query(
      `SELECT blob_ref_id,storage_kind,contract_version,object_name,content_class,
              content_sha256,content_bytes,persisted_at_utc,expires_at_utc,retention_hours,
              deletion_run_id,
              (deleted_at_utc>=expires_at_utc AND deletion_verified_at_utc>=deleted_at_utc
                AND deletion_run_id IS NOT NULL) AS marker_valid
         FROM clean.provider_content_blob_ref WHERE blob_ref_id=$1`,[candidate.blobRefId]);
    const row=proof.rows[0];
    if(proof.rowCount!==1||row?.marker_valid!==true||
       typeof row.deletion_run_id!=="string"||
       !/^provider-blob-expiry-recurring-v39-[a-f0-9-]{36}$/.test(row.deletion_run_id)||
       (result==="VERIFIED_NOW"&&row.deletion_run_id!==runId))
      throw Error("PROVIDER_BLOB_RECURRING_MARKER_READBACK_FAILED");
    const actual=rowToRef(row);
    if((Object.keys(actual) as (keyof ProviderBlobRefV39)[]).some(k=>actual[k]!==candidate.ref[k])||
       await readbackStore.exists(candidate.objectName))
      throw Error("PROVIDER_BLOB_RECURRING_PRIMARY_READBACK_FAILED");
    // A durable receipt is written ONLY after the independent marker and
    // primary absence checks. This reuses the old append-only tombstone
    // table; no raw bytes or backup-surface claims. Unknown insert/COMMIT
    // stops this run; a subsequent admission reads the actual durable row.
    await db.query(
      `INSERT INTO clean.retention_tombstone
        (surface,record_id,content_hash,expired_at,tombstoned_at_utc,plan_hash,
         content_class,source_table,retention_rule,expiry_run_id,deletion_mode)
       SELECT 'object','provider_content_blob_ref:'||b.blob_ref_id::text,b.content_sha256,
         b.expires_at_utc,clock_timestamp(),${RECURRING_WITNESS_HASH_SQL},b.content_class,
         'clean.provider_content_blob_ref','provider_blob_declared_expiry',b.deletion_run_id,
         'independent-primary-object-absence'
       FROM clean.provider_content_blob_ref b
       WHERE b.blob_ref_id=$1 AND b.deletion_run_id=$2
         AND b.deleted_at_utc>=b.expires_at_utc AND b.deletion_verified_at_utc>=b.deleted_at_utc
       ON CONFLICT(surface,record_id) DO NOTHING`,[candidate.blobRefId,row.deletion_run_id]);
    const witness=await readback.query(
      `SELECT EXISTS(SELECT 1 FROM clean.retention_tombstone t WHERE ${RECURRING_WITNESS_MATCH_SQL}) AS exact
       FROM clean.provider_content_blob_ref b WHERE b.blob_ref_id=$1 AND b.deletion_run_id=$2`,
      [candidate.blobRefId,row.deletion_run_id]);
    if(witness.rowCount!==1||witness.rows[0]?.exact!==true)
      throw Error("PROVIDER_BLOB_RECURRING_WITNESS_READBACK_FAILED");
    independentlyReadBackCount++;
    if(recoverReadback)recoveredReadbackCount++;
  }
  const remaining=await readback.query(
    `SELECT count(*) FILTER(WHERE b.deletion_verified_at_utc IS NULL)::text AS n,
        count(*) FILTER(WHERE ${RECURRING_UNWITNESSED_SQL})::text AS pending
       FROM clean.provider_content_blob_ref b WHERE b.expires_at_utc <= $1::timestamptz`,[cutoff]);
  const remainingAtCutoff=Number(remaining.rows[0]?.n),
    remainingUnwitnessedMarkersAtCutoff=Number(remaining.rows[0]?.pending);
  if(remaining.rowCount!==1||![remainingAtCutoff,remainingUnwitnessedMarkersAtCutoff].every(n=>Number.isSafeInteger(n)&&n>=0))
    throw Error("PROVIDER_BLOB_RECURRING_BACKLOG_READBACK_FAILED");
  return {status:remainingAtCutoff===0&&remainingUnwitnessedMarkersAtCutoff===0?
      "DUE_AT_CUTOFF_CLEARED":"BACKLOG_REMAINS_AT_CUTOFF",
    selectedCount:candidates.length,verifiedNowCount,alreadyVerifiedCount,independentlyReadBackCount,
    recoveredReadbackCount,remainingAtCutoff,remainingUnwitnessedMarkersAtCutoff};
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
