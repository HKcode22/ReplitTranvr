/**
 * Experimental P06 ORIGINAL source-intent custody on the ACTUAL prepaid
 * receiver. DEFAULT OFF; assumes draft V0064 exists on the target database.
 * This does NOT release the paid session lock during App Storage I/O,
 * authorize a live DB migration, or imply the provider sent any lost HTTP POST.
 *
 * PENDING is durable METADATA ONLY. VERIFIED means exact canonical SOURCE
 * bytes matched an object at a point in time; never a prepaid science ACK.
 */
import {createHash,randomUUID} from "node:crypto";
import {v39Pool as pool} from "./db_v39";
import {
  persistProviderBlobBeforeAckV39,providerBlobObjectNameV39,
  validateProviderBlobRefV39,type ProviderBlobStoreV39,
  type ProviderBlobRefV39
} from "./providerBlobStore_v39";

const sha=(b:Uint8Array)=>createHash("sha256").update(b).digest("hex");
const SOURCE_HOURS=168;
const TTL_MS=SOURCE_HOURS*3_600_000;

export function prepaidSourcePendingIntentApprovedV39(
  env:NodeJS.ProcessEnv=process.env
):boolean{
  // The source must not be deleted if normalized scientific SQL later fails.
  // Require the existing failed-source LOGGED journal approval as well.
  return env.V39_CALLBACK_ONLY_RUNTIME==="1"&&
    env.V39_PREPAID_FAILED_SOURCE_JOURNAL_APPROVED==="1"&&
    env.V39_PREPAID_SOURCE_PENDING_INTENT_APPROVED==="1";
}

export async function persistPrepaidSourceWithPendingIntentV39(input:{
  sessionId:string;deliveryId:string;bodySha256:string;
  originalCanonical:Uint8Array;firstNodeUtc:Date;
  store:ProviderBlobStoreV39;
}):Promise<{ref:ProviderBlobRefV39;firstNodeUtc:Date;wasPendingBeforeCall:boolean}>{
  if(!prepaidSourcePendingIntentApprovedV39())
    throw Error("P06_PREPAID_SOURCE_PENDING_INTENT_NOT_APPROVED");
  const body=input.originalCanonical;
  if(!(body instanceof Uint8Array)||body.length<1||body.length>2*1024*1024||
     sha(body)!==input.bodySha256||
     !Number.isFinite(input.firstNodeUtc.getTime()))
    throw Error("P06_PREPAID_SOURCE_PENDING_INTENT_INPUT_INVALID");
  const uuid=randomUUID();
  const name=providerBlobObjectNameV39("raw_provider_content",uuid);
  // This statement autocommits using an INDEPENDENT pool connection before
  // any external upload, even while prepaid session SQL holds its row lock.
  // No FOREIGN KEY to UNLOGGED runtime: it must survive its crash/reset.
  const reserved=await pool.query(`
    INSERT INTO clean.phase2g_prepaid_source_intent_v39
      (session_id,delivery_id,source_sha256,source_bytes,blob_ref_id,
       object_name,first_node_received_utc,source_retention_until)
    VALUES($1,$2,$3,$4,$5::uuid,$6,$7::timestamptz,
           $7::timestamptz+interval '168 hours')
    ON CONFLICT(session_id,delivery_id) DO NOTHING
    RETURNING blob_ref_id
  `,[input.sessionId,input.deliveryId,input.bodySha256,body.byteLength,
     uuid,name,input.firstNodeUtc.toISOString()]);
  const fresh=reserved.rowCount===1;
  const result=await pool.query(`
    SELECT source_sha256,source_bytes,blob_ref_id,object_name,
           first_node_received_utc,source_retention_until,state
    FROM clean.phase2g_prepaid_source_intent_v39
    WHERE session_id=$1 AND delivery_id=$2
  `,[input.sessionId,input.deliveryId]);
  if(result.rowCount!==1)
    throw Error("P06_PREPAID_SOURCE_PENDING_INTENT_RESERVATION_MISSING");
  const row=result.rows[0];
  const first=new Date(row.first_node_received_utc);
  const expires=new Date(row.source_retention_until);
  const key=String(row.blob_ref_id).toLowerCase();
  if(row.source_sha256!==input.bodySha256||
     Number(row.source_bytes)!==body.byteLength||
     row.object_name!==providerBlobObjectNameV39("raw_provider_content",key)||
     !Number.isFinite(first.getTime())||!Number.isFinite(expires.getTime())||
     expires.getTime()-first.getTime()!==TTL_MS||
     expires.getTime()<=Date.now()||
     !["PENDING","VERIFIED"].includes(row.state))
    throw Error("P06_PREPAID_SOURCE_PENDING_INTENT_CONFLICT_NO_ACK");
  let ref:ProviderBlobRefV39;
  if(fresh){
    // The opt-in variant deliberately prevents deleting a successfully
    // uploaded original after a LOST upload response or readback timeout.
    // The LOGGED PENDING row is the only durable custody metadata at that
    // point. It is NOT proof the original object exists.
    ref=await persistProviderBlobBeforeAckV39({
      store:input.store,bytes:body,contentClass:"raw_provider_content",
      retentionHours:SOURCE_HOURS,now:first,uuid:key,
      failureCleanup:"retain"
    });
  }else{
    // Never blindly upload over a previously reserved original. An earlier
    // attempt may have completed remotely while our reply was lost.
    let bytes:Uint8Array;
    try{bytes=await input.store.downloadBytes(row.object_name);}
    catch{throw Error("P06_PREPAID_SOURCE_PENDING_ORIGINAL_NOT_READABLE_NO_ACK");}
    if(bytes.byteLength!==body.byteLength||
       sha(bytes)!==input.bodySha256||
       !Buffer.from(bytes).equals(Buffer.from(body)))
      throw Error("P06_PREPAID_SOURCE_PENDING_ORIGINAL_SHA_CONFLICT_NO_ACK");
    ref={
      blobRefId:key,contractVersion:"provider-blob-contract-v39@1.0.0",
      storageKind:"replit_app_storage",objectName:row.object_name,
      contentClass:"raw_provider_content",
      contentSha256:input.bodySha256,contentBytes:body.byteLength,
      persistedAtUtc:first.toISOString(),expiresAtUtc:expires.toISOString(),
      retentionHours:SOURCE_HOURS
    };
    validateProviderBlobRefV39(ref);
  }
  if(row.state==="PENDING"){
    const marked=await pool.query(`
      UPDATE clean.phase2g_prepaid_source_intent_v39
         SET state='VERIFIED',verified_at_utc=clock_timestamp()
       WHERE session_id=$1 AND delivery_id=$2
         AND source_sha256=$3 AND blob_ref_id=$4::uuid
         AND object_name=$5 AND state='PENDING'
         AND source_retention_until>clock_timestamp()
      RETURNING blob_ref_id
    `,[input.sessionId,input.deliveryId,input.bodySha256,key,row.object_name]);
    if(marked.rowCount!==1)
      throw Error("P06_PREPAID_SOURCE_PENDING_VERIFY_COMMIT_UNCERTAIN_NO_ACK");
  }
  return {ref,firstNodeUtc:first,wasPendingBeforeCall:!fresh};
}
