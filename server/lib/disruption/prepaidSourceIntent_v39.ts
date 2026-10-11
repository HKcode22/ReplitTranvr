/**
 * Experimental P06 ORIGINAL source-intent custody on the ACTUAL prepaid
 * receiver. DEFAULT OFF; assumes draft V0064 exists on the target database.
 * Three flags preserve the original lock-across-I/O behavior. A separate
 * fourth approval permits a short admission transaction followed by App
 * Storage I/O outside the session lock. Neither mode authorizes a live DB
 * migration or implies the provider sent any lost HTTP POST.
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

export function prepaidSourceOutsideSessionLockApprovedV39(
  env:NodeJS.ProcessEnv=process.env
):boolean{
  return prepaidSourcePendingIntentApprovedV39(env)&&
    env.V39_PREPAID_SOURCE_OUTSIDE_SESSION_LOCK_APPROVED==="1";
}

export interface PrepaidSourceIntentQueryV39{
  query(text:string,params?:unknown[]):Promise<{
    rowCount:number|null;rows:any[];
  }>;
}

export interface PrepaidSourceIntentReservationV39{
  sessionId:string;
  deliveryId:string;
  sourceSha256:string;
  sourceBytes:number;
  blobRefId:string;
  objectName:string;
  firstNodeUtc:Date;
  expiresAtUtc:Date;
  state:"PENDING"|"VERIFIED";
  fresh:boolean;
}

export async function reservePrepaidSourceIntentV39(input:{
  sessionId:string;deliveryId:string;bodySha256:string;
  originalCanonical:Uint8Array;firstNodeUtc:Date;
  query?:PrepaidSourceIntentQueryV39;
}):Promise<PrepaidSourceIntentReservationV39>{
  if(!prepaidSourcePendingIntentApprovedV39())
    throw Error("P06_PREPAID_SOURCE_PENDING_INTENT_NOT_APPROVED");
  const body=input.originalCanonical;
  if(!(body instanceof Uint8Array)||body.length<1||body.length>2*1024*1024||
     sha(body)!==input.bodySha256||
     !Number.isFinite(input.firstNodeUtc.getTime()))
    throw Error("P06_PREPAID_SOURCE_PENDING_INTENT_INPUT_INVALID");
  const db=input.query??pool;
  const uuid=randomUUID();
  const name=providerBlobObjectNameV39("raw_provider_content",uuid);
  const reserved=await db.query(`
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
  const result=await db.query(`
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
  return {
    sessionId:input.sessionId,deliveryId:input.deliveryId,
    sourceSha256:input.bodySha256,sourceBytes:body.byteLength,
    blobRefId:key,objectName:row.object_name,firstNodeUtc:first,
    expiresAtUtc:expires,state:row.state,fresh
  };
}

export async function persistReservedPrepaidSourceIntentV39(input:{
  sessionId:string;deliveryId:string;bodySha256:string;
  originalCanonical:Uint8Array;store:ProviderBlobStoreV39;
  reservation:PrepaidSourceIntentReservationV39;
}):Promise<{ref:ProviderBlobRefV39;firstNodeUtc:Date;wasPendingBeforeCall:boolean}>{
  if(!prepaidSourcePendingIntentApprovedV39())
    throw Error("P06_PREPAID_SOURCE_PENDING_INTENT_NOT_APPROVED");
  const body=input.originalCanonical;
  const row=input.reservation;
  if(!(body instanceof Uint8Array)||body.length<1||body.length>2*1024*1024||
     sha(body)!==input.bodySha256||
     row.sessionId!==input.sessionId||row.deliveryId!==input.deliveryId||
     row.sourceSha256!==input.bodySha256||row.sourceBytes!==body.byteLength||
     !Number.isFinite(row.firstNodeUtc.getTime())||
     !Number.isFinite(row.expiresAtUtc.getTime())||
     row.expiresAtUtc.getTime()-row.firstNodeUtc.getTime()!==TTL_MS||
     row.expiresAtUtc.getTime()<=Date.now()||
     row.objectName!==providerBlobObjectNameV39(
       "raw_provider_content",row.blobRefId)||
     !["PENDING","VERIFIED"].includes(row.state))
    throw Error("P06_PREPAID_SOURCE_PENDING_INTENT_CONFLICT_NO_ACK");
  let ref:ProviderBlobRefV39;
  if(row.fresh){
    ref=await persistProviderBlobBeforeAckV39({
      store:input.store,bytes:body,contentClass:"raw_provider_content",
      retentionHours:SOURCE_HOURS,now:row.firstNodeUtc,uuid:row.blobRefId,
      failureCleanup:"retain"
    });
  }else{
    let bytes:Uint8Array;
    try{bytes=await input.store.downloadBytes(row.objectName);}
    catch{throw Error("P06_PREPAID_SOURCE_PENDING_ORIGINAL_NOT_READABLE_NO_ACK");}
    if(bytes.byteLength!==body.byteLength||
       sha(bytes)!==input.bodySha256||
       !Buffer.from(bytes).equals(Buffer.from(body)))
      throw Error("P06_PREPAID_SOURCE_PENDING_ORIGINAL_SHA_CONFLICT_NO_ACK");
    ref={
      blobRefId:row.blobRefId,
      contractVersion:"provider-blob-contract-v39@1.0.0",
      storageKind:"replit_app_storage",objectName:row.objectName,
      contentClass:"raw_provider_content",
      contentSha256:input.bodySha256,contentBytes:body.byteLength,
      persistedAtUtc:row.firstNodeUtc.toISOString(),
      expiresAtUtc:row.expiresAtUtc.toISOString(),
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
    `,[input.sessionId,input.deliveryId,input.bodySha256,row.blobRefId,
       row.objectName]);
    if(marked.rowCount!==1)
      throw Error("P06_PREPAID_SOURCE_PENDING_VERIFY_COMMIT_UNCERTAIN_NO_ACK");
  }
  return {
    ref,firstNodeUtc:row.firstNodeUtc,wasPendingBeforeCall:!row.fresh
  };
}

export async function persistPrepaidSourceWithPendingIntentV39(input:{
  sessionId:string;deliveryId:string;bodySha256:string;
  originalCanonical:Uint8Array;firstNodeUtc:Date;
  store:ProviderBlobStoreV39;
}):Promise<{ref:ProviderBlobRefV39;firstNodeUtc:Date;wasPendingBeforeCall:boolean}>{
  const reservation=await reservePrepaidSourceIntentV39({
    sessionId:input.sessionId,deliveryId:input.deliveryId,
    bodySha256:input.bodySha256,originalCanonical:input.originalCanonical,
    firstNodeUtc:input.firstNodeUtc
  });
  return persistReservedPrepaidSourceIntentV39({
    sessionId:input.sessionId,deliveryId:input.deliveryId,
    bodySha256:input.bodySha256,originalCanonical:input.originalCanonical,
    store:input.store,reservation
  });
}
