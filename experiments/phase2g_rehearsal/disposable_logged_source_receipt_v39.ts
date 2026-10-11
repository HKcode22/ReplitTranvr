import {createHmac} from "node:crypto";
import type {PoolClient} from "pg";
import type {DualSourceMessageV2} from "./dual_source_wire_canonical_receipt_v39";
import {verifySyntheticDualSourceMessageV2} from "./dual_source_wire_canonical_receipt_v39";

/**
 * EXPERIMENTAL ONLY, requires local disposable PostgreSQL 16.
 * Proves that privacy-limited RECEIPT METADATA survives unclean DB restarts,
 * unlike V3.9's actual UNLOGGED scientific session.
 *
 * HMAC-blinded attempt key, two digests, first trusted UTC and signed receipt
 * ID only. NO raw JSON, original IDs, provider subscription or flight in DB.
 * No production schema/migration, no scientific run-recovery authorization.
 */
const TABLE="p2g_dual_receipt_crash_fixture.receipt_metadata";
function assertDisposablePostgres(){
  if(process.env.P2G_DISPOSABLE_POSTGRES!=="YES"||
     process.env.V39_DATABASE_RUNTIME_URL||
     process.env.AERODATABOX_API_KEY)
    throw new Error("PRODUCTION_DATABASE_OR_PROVIDER_CONTEXT_REFUSED");
  let url:URL;
  try{url=new URL(process.env.P2G_FIXTURE_POSTGRES_URL??"")}
  catch{throw new Error("DISPOSABLE_POSTGRES_URL_REQUIRED")}
  if(url.hostname!=="127.0.0.1"||url.pathname!=="/p2g_stage1_fixture")
    throw new Error("DISPOSABLE_POSTGRES_TARGET_REQUIRED");
}
export async function recordSyntheticSignedReceiptMetadataV2(input:{
  client:Pick<PoolClient,"query">;
  message:DualSourceMessageV2;
  privateEdgeSigningKey:string;
  persistentAttemptBlindKey:string;
  sessionId:string;
  providerSubscriptionId:string;
  trustedNowUtc:string;
  queueAccepted:boolean;
}):Promise<{
  savedFirstEdgeUtc:string;duplicate:boolean;
  wireSha256:string;canonicalSha256:string;
}>{
  assertDisposablePostgres();
  if(!input.queueAccepted)throw new Error("DURABLE_QUEUE_ADMISSION_NOT_PROVEN");
  if(input.persistentAttemptBlindKey.length<48)
    throw new Error("BLINDING_KEY_TOO_SHORT");
  const verified=await verifySyntheticDualSourceMessageV2({
    message:input.message,expectedSessionId:input.sessionId,
    expectedProviderSubscriptionId:input.providerSubscriptionId,
    privateEdgeSigningKey:input.privateEdgeSigningKey,
    trustedNowUtc:input.trustedNowUtc
  });
  if(!verified.verified)throw new Error("SYNTHETIC_EDGE_RECEIPT_UNVERIFIED");
  const r=input.message.receipt;
  const privateAttemptHmac=createHmac("sha256",input.persistentAttemptBlindKey)
    .update("p2g-test-only-attempt-record-v2:\n"+r.attemptKey).digest("hex");
  const inserted=await input.client.query(
    "INSERT INTO "+TABLE+
    " (attempt_hmac,wire_sha256,canonical_sha256,first_edge_received_utc,receipt_sha256)"+
    " VALUES ($1,$2,$3,$4,$5) ON CONFLICT (attempt_hmac) DO NOTHING"+
    " RETURNING attempt_hmac",
    [privateAttemptHmac,r.wireSha256,r.canonicalSha256,
      r.firstEdgeReceivedAtUtc,r.receiptId]
  );
  const row=await input.client.query(
    "SELECT wire_sha256,canonical_sha256,first_edge_received_utc,"+
    " receipt_sha256 FROM "+TABLE+" WHERE attempt_hmac=$1",
    [privateAttemptHmac]
  );
  if(row.rowCount!==1)throw new Error("DURABLE_SOURCE_RECEIPT_NOT_FOUND");
  const old=row.rows[0];
  if(old.wire_sha256!==r.wireSha256 ||
     old.canonical_sha256!==r.canonicalSha256 ||
     old.receipt_sha256!==r.receiptId)
     throw new Error("DURABLE_SOURCE_ATTEMPT_CONFLICT");
  // Exact attempt redelivery does NOT overwrite original edge receipt UTC.
  return {savedFirstEdgeUtc:new Date(old.first_edge_received_utc).toISOString(),
    duplicate:inserted.rowCount===0,wireSha256:old.wire_sha256,
    canonicalSha256:old.canonical_sha256};
}
