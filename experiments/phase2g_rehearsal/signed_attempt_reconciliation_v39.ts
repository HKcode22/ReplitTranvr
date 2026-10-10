import {createHmac,timingSafeEqual} from "node:crypto";
import {
  verifySyntheticDualSourceMessageV2,
  type DualSourceMessageV2
} from "./dual_source_wire_canonical_receipt_v39";

/**
 * P13/P14 — SYNTHETIC-ONLY independent-sender/edge/SQL evidence comparison.
 *
 * Signs an emulator's complete delivered-attempt ledger independently of the
 * edge (DIFFERENT key/domain). Actual AeroDataBox accounting is NOT signed
 * by this emulator. The source receipts authenticate an experimental edge,
 * not the original provider. Internal rows are independently queried in
 * tests, not independently signed or production-trusted by this module.
 *
 * NEVER grants paid launch, scientific completion, or automatic post-crash
 * restoration. Identity-level consistency is only a prerequisite.
 */
export type SyntheticSenderAttemptV39=Readonly<{
  attemptKey:string;
  notificationId:string;
  attemptSeqNo:number;
  providerAttemptUtc:string;
  providerGeneratedUtc:string;
  wireSha256:string;
  canonicalSha256:string;
  syntheticCostCredits:number;
  senderResponseStatus:number;
  senderResponseElapsedMs:number;
}>;
export type SyntheticSenderFrameV39=Readonly<{
  schema:"v39.phase2g-synthetic-independent-sender.v1";
  mode:"synthetic-only";
  sessionId:string;
  providerSubscriptionId:string;
  ownerFrozenRunSha256:string;
  windowStartUtc:string;
  windowEndUtc:string;
  attempts:readonly SyntheticSenderAttemptV39[];
}>;
export type SignedSyntheticSenderFrameV39=Readonly<{
  frame:SyntheticSenderFrameV39;
  signature:string;
}>;
export type SyntheticInternalDeliveryV39=Readonly<{
  attemptKey:string;
  canonicalSha256:string;
  rawObjectReadbackSha256:string;
  originalEdgeReceivedUtc:string;
  syntheticCostCredits:number;
}>;
export type SyntheticAttemptReconciliationV39={
  attemptedCredits:number;
  edgeCredits:number;
  internallyCommittedCredits:number;
  senderAttemptCount:number;
  verifiedEdgeAttemptCount:number;
  internalAttemptCount:number;
  sourceBuckets:number[];
  attemptEvidenceConsistent:boolean;
  errors:string[];
  scientificCompletionAuthorized:false;
  automaticRecoveryAuthorized:false;
};

const H=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID=/^[A-Za-z0-9_.:-]{1,160}$/;
const iso=(v:unknown):v is string=>typeof v==="string"&&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&
  Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const digest=(v:unknown):v is string=>typeof v==="string"&&H.test(v);
const key=(v:unknown):v is string=>typeof v==="string"&&ID.test(v);
const credit=(v:unknown):v is number=>Number.isSafeInteger(v)&&
  (v===0||v===1);
const requireFrame=(f:SyntheticSenderFrameV39)=>{
  if(f?.schema!=="v39.phase2g-synthetic-independent-sender.v1"||
     f.mode!=="synthetic-only"||!UUID.test(f.sessionId)||
     !key(f.providerSubscriptionId)||!digest(f.ownerFrozenRunSha256)||
     !iso(f.windowStartUtc)||!iso(f.windowEndUtc)||
     Date.parse(f.windowEndUtc)-Date.parse(f.windowStartUtc)!==7_200_000||
     !Array.isArray(f.attempts)||f.attempts.length<1||
     f.attempts.length>10000)
    throw new Error("SENDER_FRAME_INVALID");
  const seen=new Set<string>();
  for(const a of f.attempts){
    if(!digest(a?.attemptKey)||!key(a.notificationId)||
       !Number.isSafeInteger(a.attemptSeqNo)||a.attemptSeqNo<0||
       !iso(a.providerAttemptUtc)||!iso(a.providerGeneratedUtc)||
       !digest(a.wireSha256)||!digest(a.canonicalSha256)||
       !credit(a.syntheticCostCredits)||
       !Number.isSafeInteger(a.senderResponseStatus)||
       a.senderResponseStatus<0||a.senderResponseStatus>599||
       !Number.isFinite(a.senderResponseElapsedMs)||
       a.senderResponseElapsedMs<0||seen.has(a.attemptKey))
      throw new Error("SENDER_ATTEMPTS_INVALID_OR_DUPLICATED");
    seen.add(a.attemptKey);
  }
};
const signBytes=(frame:SyntheticSenderFrameV39)=>{
  requireFrame(frame);
  // Fixed-layout projection excludes arbitrary user-supplied object keys.
  return JSON.stringify([
    "p2g-synthetic-independent-sender-ledger-v1",
    frame.schema,frame.mode,frame.sessionId,frame.providerSubscriptionId,
    frame.ownerFrozenRunSha256,frame.windowStartUtc,frame.windowEndUtc,
    frame.attempts.map(a=>[
      a.attemptKey,a.notificationId,a.attemptSeqNo,a.providerAttemptUtc,
      a.providerGeneratedUtc,a.wireSha256,a.canonicalSha256,
      a.syntheticCostCredits,a.senderResponseStatus,a.senderResponseElapsedMs
    ])
  ]);
};
const signature=(text:string,k:string)=>{
  if(typeof k!=="string"||k.length<48)
    throw new Error("SENDER_INDEPENDENT_SIGNING_KEY_REQUIRED");
  return createHmac("sha256",k).update(text).digest("hex");
};
export function signSyntheticSenderFrameV39(
  frame:SyntheticSenderFrameV39,independentSenderKey:string
):SignedSyntheticSenderFrameV39{
  return {frame,signature:signature(signBytes(frame),independentSenderKey)};
}
export function verifySyntheticSenderFrameV39(input:{
  signed:SignedSyntheticSenderFrameV39;
  independentSenderKey:string;
  expectedSessionId:string;
  expectedProviderSubscriptionId:string;
  expectedOwnerFrozenRunSha256:string;
}):SyntheticSenderFrameV39{
  const f=input.signed.frame;
  const expected=signature(signBytes(f),input.independentSenderKey);
  const received=input.signed.signature;
  if(!digest(received)||!timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(received,"hex")))
    throw new Error("INDEPENDENT_SENDER_SIGNATURE_INVALID");
  if(f.sessionId!==input.expectedSessionId||
     f.providerSubscriptionId!==input.expectedProviderSubscriptionId||
     f.ownerFrozenRunSha256!==input.expectedOwnerFrozenRunSha256)
    throw new Error("INDEPENDENT_SENDER_FROZEN_CONTEXT_MISMATCH");
  return f;
}

export async function reconcileSyntheticSignedAttemptsV39(input:{
  signedSender:SignedSyntheticSenderFrameV39;
  independentSenderKey:string;
  edgeSigningKey:string;
  expectedSessionId:string;
  expectedProviderSubscriptionId:string;
  expectedOwnerFrozenRunSha256:string;
  trustedAuditUtc:string;
  signedEdgeReceipts:readonly DualSourceMessageV2[];
  committedInternal:readonly SyntheticInternalDeliveryV39[];
}):Promise<SyntheticAttemptReconciliationV39>{
  const f=verifySyntheticSenderFrameV39({
    signed:input.signedSender,independentSenderKey:input.independentSenderKey,
    expectedSessionId:input.expectedSessionId,
    expectedProviderSubscriptionId:input.expectedProviderSubscriptionId,
    expectedOwnerFrozenRunSha256:input.expectedOwnerFrozenRunSha256
  });
  if(!iso(input.trustedAuditUtc)||
     Date.parse(input.trustedAuditUtc)<Date.parse(f.windowStartUtc)||
     Date.parse(input.trustedAuditUtc)-Date.parse(f.windowEndUtc)>86_400_000)
    throw new Error("SYNTHETIC_AUDIT_TIME_OUT_OF_BOUNDS");
  if(!Array.isArray(input.signedEdgeReceipts)||!Array.isArray(input.committedInternal))
    throw new Error("SYNTHETIC_ATTEMPT_ARRAYS_REQUIRED");
  const errs=new Set<string>();
  const add=(v:string)=>errs.add(v);
  const expected=new Map(f.attempts.map(a=>[a.attemptKey,a]));
  const edges=new Map<string,DualSourceMessageV2>();
  const bins=new Array<number>(8).fill(0);
  let edgeCredits=0,internalCredits=0;
  const from=Date.parse(f.windowStartUtc),end=Date.parse(f.windowEndUtc);
  for(const e of input.signedEdgeReceipts){
    try{
      await verifySyntheticDualSourceMessageV2({
        message:e,expectedSessionId:f.sessionId,
        expectedProviderSubscriptionId:f.providerSubscriptionId,
        privateEdgeSigningKey:input.edgeSigningKey,
        trustedNowUtc:input.trustedAuditUtc,
        maxBacklogSeconds:86400
      });
    }catch{add("EDGE_RECEIPT_AUTH_OR_SOURCE_INVALID");continue;}
    const r=e.receipt,prior=edges.get(r.attemptKey);
    if(prior){
      if(JSON.stringify(prior)!==JSON.stringify(e))
        add("EDGE_DUPLICATE_CONFLICT");
      // At-least-once exact Queue redelivery is NOT a new provider attempt.
      continue;
    }
    edges.set(r.attemptKey,e);
    const sender=expected.get(r.attemptKey);
    if(!sender){add("EDGE_ATTEMPT_NOT_IN_INDEPENDENT_SENDER");continue;}
    if(sender.notificationId!==r.notificationId||
       sender.attemptSeqNo!==r.attemptSeqNo||
       sender.providerAttemptUtc!==r.providerAttemptUtc||
       sender.providerGeneratedUtc!==r.providerGeneratedUtc||
       sender.wireSha256!==r.wireSha256||
       sender.canonicalSha256!==r.canonicalSha256||
       sender.syntheticCostCredits!==r.syntheticCostCredits)
      add("SENDER_EDGE_ATTEMPT_IDENTITY_OR_HASH_MISMATCH");
    const recv=Date.parse(r.firstEdgeReceivedAtUtc);
    if(!Number.isFinite(recv)||recv<from||recv>=end)
      add("EDGE_SOURCE_OUTSIDE_FROZEN_WINDOW");
    else bins[Math.floor((recv-from)/900000)]++;
    edgeCredits+=r.syntheticCostCredits;
  }
  for(const a of f.attempts){
    if(!edges.has(a.attemptKey))add("BILLED_SENDER_ATTEMPT_MISSING_AT_EDGE");
    if(a.providerAttemptUtc<f.windowStartUtc||
       a.providerAttemptUtc>=f.windowEndUtc)
      add("SENDER_ATTEMPT_OUTSIDE_FROZEN_WINDOW");
    if(a.senderResponseStatus!==200||
       a.senderResponseElapsedMs>10000)
      add("SENDER_TIMELY_ACK_NOT_PROVEN");
  }
  const internal=new Map<string,SyntheticInternalDeliveryV39>();
  for(const row of input.committedInternal){
    if(!digest(row?.attemptKey)||!digest(row.canonicalSha256)||
       !digest(row.rawObjectReadbackSha256)||
       !iso(row.originalEdgeReceivedUtc)||!credit(row.syntheticCostCredits)){
      add("INTERNAL_DELIVERY_SCHEMA_INVALID");continue;
    }
    if(internal.has(row.attemptKey)){
      add("DUPLICATE_INTERNAL_PROVIDER_ATTEMPT");continue;
    }
    internal.set(row.attemptKey,row);
    internalCredits+=row.syntheticCostCredits;
    const e=edges.get(row.attemptKey);
    if(!e){add("INTERNAL_WITHOUT_AUTHENTICATED_EDGE");continue;}
    if(row.canonicalSha256!==e.receipt.canonicalSha256||
       row.rawObjectReadbackSha256!==e.receipt.canonicalSha256)
      add("INTERNAL_CANONICAL_SHA_OR_READBACK_MISMATCH");
    if(row.originalEdgeReceivedUtc!==e.receipt.firstEdgeReceivedAtUtc)
      add("INTERNAL_ORIGINAL_SOURCE_UTC_SHIFTED");
    if(row.syntheticCostCredits!==e.receipt.syntheticCostCredits)
      add("INTERNAL_PROVIDER_ATTEMPT_COST_MISMATCH");
  }
  for(const a of f.attempts)
    if(!internal.has(a.attemptKey))add("BILLED_SENDER_ATTEMPT_MISSING_INTERNAL");
  if(edges.size!==expected.size)add("SENDER_EDGE_CARDINALITY_MISMATCH");
  if(internal.size!==expected.size)add("SENDER_INTERNAL_CARDINALITY_MISMATCH");
  const sentCredits=f.attempts.reduce((sum,a)=>sum+a.syntheticCostCredits,0);
  if(sentCredits!==edgeCredits||sentCredits!==internalCredits)
    add("SYNTHETIC_BILLED_CREDIT_GAP");
  return {
    attemptedCredits:sentCredits,edgeCredits,
    internallyCommittedCredits:internalCredits,
    senderAttemptCount:f.attempts.length,
    verifiedEdgeAttemptCount:edges.size,
    internalAttemptCount:internal.size,
    sourceBuckets:bins,
    attemptEvidenceConsistent:errs.size===0,
    errors:[...errs].sort(),
    scientificCompletionAuthorized:false,
    automaticRecoveryAuthorized:false
  };
}
