/**
 * P05/P06 experimental, DISPOSABLE PostgreSQL16 two-phase raw receipt.
 *
 * This is deliberately NOT used by paid production. The purpose is to
 * independently evaluate a connection/lock-free blob upload with a LOGGED
 * opaque pending journal (no provider plaintext or per-flight identifiers).
 *
 * Critically: it is NOT independent webhook ingress. Crash before uploading
 * bytes can still lose sender content with provider retries disabled.
 * Pending intents, orphan blob retention and uncertain commits require
 * an independent audited cleanup/recovery protocol before any launch.
 */
import {createHash,randomUUID} from "node:crypto";
import {persistProviderBlobBeforeAckV39,providerBlobObjectNameV39,
  type ProviderBlobStoreV39} from "../../server/lib/disruption/providerBlobStore_v39";
import type {Pool} from "pg";

const sha256=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const HASH=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sleep=(n:number)=>new Promise<void>(r=>setTimeout(r,n));
export type SyntheticAdmissionResponseV39=Readonly<{
  outcome:"COMMITTED_SOURCE_RECEIPT"|"VERIFIED_DUPLICATE"|"PENDING_NOT_ACKNOWLEDGED";
  sourceBlobBytesVerified:boolean;
  pgCommitted:boolean;
  safeToReturn2xxToSyntheticSender:boolean;
  originalProviderAttemptWitnessVerified:false;
  realPaidLaunchAuthorized:false;
  originalF8ScientificPassAuthorized:false;
  upstreamProviderCallCount:0;
}>;
const reply=(outcome:SyntheticAdmissionResponseV39["outcome"]):
    SyntheticAdmissionResponseV39=>({
  outcome,
  sourceBlobBytesVerified:outcome!=="PENDING_NOT_ACKNOWLEDGED",
  pgCommitted:outcome!=="PENDING_NOT_ACKNOWLEDGED",
  safeToReturn2xxToSyntheticSender:outcome!=="PENDING_NOT_ACKNOWLEDGED",
  originalProviderAttemptWitnessVerified:false,
  realPaidLaunchAuthorized:false,originalF8ScientificPassAuthorized:false,
  upstreamProviderCallCount:0
});

/** Fixture DDL contains ONLY synthetic source SHA, opaque object ref and TTL. */
export const DISPOSABLE_ADMISSION_INTENT_DDL_V39=`
CREATE TABLE clean.p2g_synthetic_raw_admission_intent (
  session_id uuid NOT NULL,
  synthetic_attempt_hmac text NOT NULL,
  source_sha256 text NOT NULL,
  original_opaque_blob_uuid uuid NOT NULL,
  original_opaque_blob_path text NOT NULL,
  owner_token uuid NOT NULL,
  state text NOT NULL CHECK (state IN ('PENDING','COMMITTED')),
  source_retention_until timestamptz NOT NULL,
  created_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
  committed_utc timestamptz,
  PRIMARY KEY(session_id,synthetic_attempt_hmac)
)`;
export async function runDisposableParallelRawAdmissionV39(arg:{
  mode:"P2G_DISPOSABLE_ONLY";
  pool:Pool;
  store:ProviderBlobStoreV39;
  sessionId:string;
  syntheticAttemptHmac:string;
  exactOriginalSyntheticBytes:Uint8Array;
  maxPendingWaitMs?:number;
}):Promise<SyntheticAdmissionResponseV39>{
  if(arg.mode!=="P2G_DISPOSABLE_ONLY"||
     process.env.P2G_DISPOSABLE_POSTGRES!=="YES"||
     process.env.V39_DATABASE_RUNTIME_URL||
     process.env.AERODATABOX_API_KEY||
     !UUID.test(arg.sessionId)||
     !HASH.test(arg.syntheticAttemptHmac)||
     !(arg.exactOriginalSyntheticBytes instanceof Uint8Array)||
     arg.exactOriginalSyntheticBytes.byteLength===0||
     arg.exactOriginalSyntheticBytes.byteLength>65_536)
    throw Error("P06_CANDIDATE_NON_DISPOSABLE_INPUT_REFUSED");
  const db=await arg.pool.query("SELECT current_database() AS db");
  if(db.rows?.[0]?.db!=="p2g_stage1_fixture")
    throw Error("P06_CANDIDATE_DISPOSABLE_DATABASE_REQUIRED");
  const maxWait=arg.maxPendingWaitMs??2000;
  if(!Number.isSafeInteger(maxWait)||maxWait<0||maxWait>10000)
    throw Error("P06_CANDIDATE_PENDING_WAIT_INVALID");
  const contentHash=sha256(arg.exactOriginalSyntheticBytes);
  const uuid=randomUUID();
  const owner=randomUUID();
  const objectName=providerBlobObjectNameV39("raw_provider_content",uuid);

  // The INSERT commits and frees the connection BEFORE any upload occurs.
  // First claimant owns the object name; duplicates MUST NOT upload again.
  const created=await arg.pool.query(`
    INSERT INTO clean.p2g_synthetic_raw_admission_intent
      (session_id,synthetic_attempt_hmac,source_sha256,
       original_opaque_blob_uuid,original_opaque_blob_path,
       owner_token,state,source_retention_until)
    VALUES ($1,$2,$3,$4,$5,$6,'PENDING',clock_timestamp()+interval '168 hours')
    ON CONFLICT DO NOTHING
    RETURNING owner_token
  `,[arg.sessionId,arg.syntheticAttemptHmac,contentHash,uuid,objectName,owner]);

  if(created.rowCount===1){
    // If upload fails/crashes, logged PENDING remains. Never send 2xx.
    // An orphan object may exist; no automatic deletion or fake replay.
    await persistProviderBlobBeforeAckV39({
      store:arg.store,bytes:arg.exactOriginalSyntheticBytes,
      contentClass:"raw_provider_content",retentionHours:168,
      now:new Date(),uuid
    });
    // Atomically publish a VERIFIED blob receipt with a short SQL UPDATE.
    // Unknown COMMIT outcome always fails closed and retains the blob;
    // later duplicate processing can inspect the committed source intent.
    const q=await arg.pool.query(`
      UPDATE clean.p2g_synthetic_raw_admission_intent
      SET state='COMMITTED',committed_utc=clock_timestamp()
      WHERE session_id=$1 AND synthetic_attempt_hmac=$2
        AND source_sha256=$3 AND owner_token=$4 AND state='PENDING'
      RETURNING source_sha256
    `,[arg.sessionId,arg.syntheticAttemptHmac,contentHash,owner]);
    if(q.rowCount!==1)
      throw Error("P06_CANDIDATE_ORIGINAL_COMMIT_UNCERTAIN_NO_ACK");
    return reply("COMMITTED_SOURCE_RECEIPT");
  }

  const until=Date.now()+maxWait;
  while(true){
    const existing=await arg.pool.query(`
      SELECT source_sha256,original_opaque_blob_path,state
      FROM clean.p2g_synthetic_raw_admission_intent
      WHERE session_id=$1 AND synthetic_attempt_hmac=$2
    `,[arg.sessionId,arg.syntheticAttemptHmac]);
    if(existing.rowCount!==1)
      throw Error("P06_CANDIDATE_INTENT_DISAPPEARED_NO_ACK");
    const row=existing.rows[0];
    if(row.source_sha256!==contentHash)
      throw Error("P06_CANDIDATE_ATTEMPT_HASH_CONFLICT_NO_ACK");
    if(row.state==="COMMITTED"){
      const original=await arg.store.downloadBytes(row.original_opaque_blob_path);
      if(sha256(original)!==contentHash||
         !Buffer.from(original).equals(Buffer.from(arg.exactOriginalSyntheticBytes)))
        throw Error("P06_CANDIDATE_DUPLICATE_ORIGINAL_SOURCE_CHANGED_NO_ACK");
      return reply("VERIFIED_DUPLICATE");
    }
    if(Date.now()>=until)return reply("PENDING_NOT_ACKNOWLEDGED");
    await sleep(Math.min(25,Math.max(1,until-Date.now())));
  }
}
