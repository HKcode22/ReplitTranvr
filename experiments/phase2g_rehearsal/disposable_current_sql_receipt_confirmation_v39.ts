import {createHash} from "node:crypto";
import type {PoolClient} from "pg";
import {
  verifyEdgeProvenanceV1,
  type EdgeProvenanceV1
} from "../phase2g_cf_sandbox_ingress/provenance";

/**
 * P12 TEST-ONLY Node/PG read-only persistence confirmation behind the proposed
 * /__p2g-sandbox-confirm endpoint. This module does NOT define or mount a
 * published route. The independent source is simulated with a local fixture
 * HMAC, NOT genuine AeroDataBox sender/billed-attempt authentication.
 *
 * It confirms that a specific ORIGINAL notification remains present in
 * current UNLOGGED delivery+flight tables and matches original UTC/wire.
 * An R2 processed marker or GET 200 can NEVER replace this current check.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const hash=(b:string|Uint8Array)=>createHash("sha256").update(b).digest("hex");
function canonical(v:unknown):string{
  if(v===null||typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  const obj=v as Record<string,unknown>;
  return "{"+Object.keys(obj).sort().map(k=>
    JSON.stringify(k)+":"+canonical(obj[k])
  ).join(",")+"}";
}
function fixtureOnly(){
  if(process.env.P2G_DISPOSABLE_POSTGRES!=="YES"||
     process.env.AERODATABOX_API_KEY||
     process.env.V39_DATABASE_RUNTIME_URL)
    throw Error("P12_SQL_CONFIRM_DISPOSABLE_ONLY");
  let u:URL;
  try{u=new URL(process.env.P2G_FIXTURE_POSTGRES_URL??"")}
  catch{throw Error("P12_SQL_CONFIRM_DISPOSABLE_URL_REQUIRED")}
  if(u.hostname!=="127.0.0.1"||u.pathname!=="/p2g_stage1_fixture")
    throw Error("P12_SQL_CONFIRM_PRODUCTION_DB_FORBIDDEN");
}
export type P12CurrentSqlConfirmationV39=Readonly<{
  v:1;
  currentlyPersisted:boolean;
  sessionId:string;
  providerAttemptId:string;
  receiptId:string;
  sourceSha256:string;
  originalEdgeReceivedAtUtc:string;
  reason:string;
  independentProviderLedgerVerified:false;
  scientificPassAuthorized:false;
  paidOwnerResumed:false;
}>;
export async function confirmCurrentDisposableV39ScienceReceipt(input:{
  client:Pick<PoolClient,"query">;
  edge:P12CurrentEdgeEvidenceV39;
  originalWire:Uint8Array;
  signingKey:string;
  expectedSessionId:string;
  expectedSubscriptionId:string;
}):Promise<P12CurrentSqlConfirmationV39>{
  fixtureOnly();
  const x=input.edge;
  if(!x||!x.proof||!UUID.test(input.expectedSessionId)||
     typeof input.expectedSubscriptionId!=="string"||
     !SHA.test(x.proof.sourceSha256)||!SHA.test(x.proof.receiptId)||
     input.originalWire.byteLength>2_097_152||
     input.originalWire.byteLength===0)
    throw Error("P12_SQL_CONFIRM_INPUT_INVALID");
  if(x.proof.sessionId!==input.expectedSessionId||
     x.proof.receiptId!==hash(
       x.proof.sessionId+"\n"+x.proof.providerAttemptId)||
     hash(input.originalWire)!==x.proof.sourceSha256||
     !await verifyEdgeProvenanceV1(
       x.proof,input.signingKey,x.hmac,{
         sessionId:input.expectedSessionId,
         receiptId:x.proof.receiptId,
         sourceSha256:x.proof.sourceSha256
       }
     ))
    throw Error("P12_SQL_CONFIRM_ORIGINAL_EDGE_PROVENANCE_INVALID");
  let decoded:unknown;
  try{decoded=JSON.parse(new TextDecoder("utf-8",{fatal:true})
    .decode(input.originalWire))}
  catch{throw Error("P12_SQL_CONFIRM_ORIGINAL_SOURCE_JSON_INVALID")}
  if(!decoded||typeof decoded!=="object"||Array.isArray(decoded))
    throw Error("P12_SQL_CONFIRM_SOURCE_TOP_LEVEL_OBJECT_REQUIRED");
  const body=decoded as Record<string,any>;
  const notice=body.id??body.notification?.id;
  if(typeof notice!=="string"||notice.length===0||
     notice.length>160||
     body.subscription?.id!==input.expectedSubscriptionId||
     !Array.isArray(body.flights)||
     body.flights.length>5000)
    throw Error("P12_SQL_CONFIRM_SOURCE_IDENTITY_INVALID");
  // Derive the ACTUAL V3.9 logical delivery ID, not the provider's raw
  // notification ID. V3.9 hashes {session,canonical body SHA, provider
  // notification ID, attempt sequence, attempt UTC} into ppd_<SHA256>.
  const attempt=body.deliveryAttempt??body.delivery?.attempt??null;
  const rawSeq=attempt?.seqNo;
  const asSeq=rawSeq===undefined||rawSeq===null||rawSeq===""?
    null:Number(rawSeq);
  const seq=asSeq!==null&&Number.isInteger(asSeq)&&asSeq>=0?asSeq:null;
  const attemptDate=attempt?.timestampUtc?new Date(String(attempt.timestampUtc)):null;
  const atUtc=attemptDate&&Number.isFinite(attemptDate.getTime())?
    attemptDate.toISOString():null;
  const bodySha256=hash(canonical(body));
  const deliveryId="ppd_"+hash(canonical({
    sessionId:input.expectedSessionId,bodySha256,
    notificationId:notice,attemptSeqNo:seq,attemptUtc:atUtc
  }));
  const response=(valid:boolean,reason:string):P12CurrentSqlConfirmationV39=>({
    v:1,currentlyPersisted:valid,sessionId:x.proof.sessionId,
    receiptId:x.proof.receiptId,
    providerAttemptId:x.proof.providerAttemptId,
    sourceSha256:x.proof.sourceSha256,
    originalEdgeReceivedAtUtc:x.proof.edgeReceivedAtUtc,
    reason,independentProviderLedgerVerified:false,
    scientificPassAuthorized:false,paidOwnerResumed:false
  });
  const delivery=await input.client.query(
    "SELECT d.delivery_id,d.raw_body_sha256,d.notification_items,"+
    "d.provider_subscription_id,d.received_at_utc "+
    "FROM clean.prepaid_probe_delivery_runtime d "+
    "WHERE d.session_id=$1::uuid AND d.delivery_id=$2",
    [input.expectedSessionId,deliveryId]
  );
  if(delivery.rowCount!==1)return response(false,"CURRENT_DELIVERY_MISSING_AFTER_DB_EPOCH");
  const d=delivery.rows[0];
  if(d.provider_subscription_id!==input.expectedSubscriptionId||
     d.raw_body_sha256!==hash(canonical(body))||
     Number(d.notification_items)!==body.flights.length||
     new Date(d.received_at_utc).toISOString()!==x.proof.edgeReceivedAtUtc)
    return response(false,"CURRENT_DELIVERY_SHA_TIME_OR_OWNER_CONFLICT");
  const items=await input.client.query(
    "SELECT item_index,raw_item_sha256,received_at_utc "+
    "FROM clean.prepaid_probe_item_runtime "+
    "WHERE session_id=$1::uuid AND delivery_id=$2 ORDER BY item_index",
    [input.expectedSessionId,deliveryId]
  );
  if(items.rowCount!==body.flights.length)
    return response(false,"CURRENT_FLIGHT_ITEM_COUNT_MISMATCH");
  for(let i=0;i<body.flights.length;i++){
    const row=items.rows[i];
    if(Number(row.item_index)!==i||
       row.raw_item_sha256!==hash(canonical(body.flights[i]))||
       new Date(row.received_at_utc).toISOString()!==x.proof.edgeReceivedAtUtc)
      return response(false,"CURRENT_FLIGHT_ITEM_SOURCE_SHA_OR_UTC_CHANGED");
  }
  const source=await input.client.query(
    "SELECT content_sha256,content_bytes "+
    "FROM clean.provider_content_blob_ref "+
    "WHERE source_kind='webhook' AND source_record_id=$1",
    ["prepaid:"+input.expectedSessionId+":"+deliveryId]
  );
  if(source.rowCount!==1||
     source.rows[0].content_sha256!==hash(canonical(body))||
     Number(source.rows[0].content_bytes)!==new TextEncoder().encode(
       canonical(body)).byteLength)
    return response(false,"CURRENT_UNIQUE_LOGGED_BLOB_REF_NOT_MATCHED");
  return response(true,"CURRENT_SOURCE_DELIVERY_ITEMS_AND_UTC_VERIFIED");
}
export type P12CurrentEdgeEvidenceV39=Readonly<{
  proof:EdgeProvenanceV1;hmac:string;
}>;
