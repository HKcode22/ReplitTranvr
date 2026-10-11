/**
 * PHASE2G OFFLINE PROTOTYPE ONLY. NOT IMPORTED BY PRODUCTION CODE.
 * No network, database, secrets, external provider or storage client imports.
 * No change to existing GitHub owner, callback server or scientific metrics.
 */
import { createHash } from "node:crypto";

export type Receipt = Readonly<{
  receiptId:string;sessionId:string;providerAttemptId:string;
  rawSha256:string;rawLength:number;edgeReceivedAtUtc:string;
}>;
export interface DurableReceiptStore {
  /** Atomically persist bytes+receipt first; duplicate preserves original timestamp. */
  putIfAbsent(receipt:Receipt,raw:Uint8Array):Promise<Receipt>;
}
export interface DurableQueue {
  /** Durably enqueue receipt pointer or throw; duplicate pointer enqueue is allowed. */
  send(receiptId:string):Promise<void>;
}
export interface EdgeAdmission {
  sessionId:string;providerAttemptId:string;raw:Uint8Array;
  authorized:boolean;edgeNowUtc:string;
}
export type AdmissionOutcome = Readonly<{
  http:200|400|403|413|503;receiptId:string|null;reason:string;
}>;
const safeId=(v:string)=>/^[A-Za-z0-9_.:-]{1,128}$/.test(v);
const sha=(v:Uint8Array|string)=>createHash("sha256").update(v).digest("hex");

/** Pure-logic fixture; real Cloudflare auth and R2 outbox need separate review. */
export async function admitSyntheticWebhook(
  input:EdgeAdmission,store:DurableReceiptStore,queue:DurableQueue,
):Promise<AdmissionOutcome> {
  if(!input.authorized)return {http:403,receiptId:null,reason:"unauthenticated"};
  if(!safeId(input.sessionId)||!safeId(input.providerAttemptId)||
     !Number.isFinite(Date.parse(input.edgeNowUtc)))
    return {http:400,receiptId:null,reason:"invalid_identifiers_or_timestamp"};
  if(!input.raw.byteLength||input.raw.byteLength>2*1024*1024)
    return {http:413,receiptId:null,reason:"body_limit"};
  const rawSha256=sha(input.raw);
  const receiptId="p2g-edge-"+sha(input.sessionId+"\0"+input.providerAttemptId+"\0"+rawSha256);
  const candidate:Receipt={
    receiptId,sessionId:input.sessionId,providerAttemptId:input.providerAttemptId,
    rawSha256,rawLength:input.raw.byteLength,
    edgeReceivedAtUtc:new Date(input.edgeNowUtc).toISOString(),
  };
  try{
    const receipt=await store.putIfAbsent(candidate,input.raw);
    if(receipt.receiptId!==receiptId||receipt.rawSha256!==rawSha256||
       receipt.sessionId!==input.sessionId||
       receipt.providerAttemptId!==input.providerAttemptId)
      return {http:503,receiptId:null,reason:"durable_receipt_conflict"};
    await queue.send(receiptId);
    return {http:200,receiptId,reason:"durable_and_enqueued"};
  }catch{
    // Stored bytes alone are not sufficient for positive ACK without
    // a demonstrated, recoverable enqueue/outbox.
    return {http:503,receiptId:null,reason:"storage_or_enqueue_not_confirmed"};
  }
}
export type IngressState="HEALTHY"|"DEGRADED_BUT_DURABLE"|"FAIL_CLOSED";
export function classifySyntheticIngressHealth(x:{
  edgeAvailable:boolean;rawStoreAvailable:boolean;queueAvailable:boolean;
  replitAvailable:boolean;oldestBacklogAgeSeconds:number;allowedBacklogAgeSeconds:number;
}):IngressState {
  if(!x.edgeAvailable||!x.rawStoreAvailable||!x.queueAvailable||
     !Number.isFinite(x.oldestBacklogAgeSeconds)||
     !Number.isFinite(x.allowedBacklogAgeSeconds)||
     x.oldestBacklogAgeSeconds<0||x.allowedBacklogAgeSeconds<0||
     x.oldestBacklogAgeSeconds>x.allowedBacklogAgeSeconds)
    return "FAIL_CLOSED";
  return x.replitAvailable?"HEALTHY":"DEGRADED_BUT_DURABLE";
}
