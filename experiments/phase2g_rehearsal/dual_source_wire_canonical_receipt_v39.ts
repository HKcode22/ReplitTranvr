/**
 * Stage-1 V3.9-F.8 TWO-REPRESENTATION source-receipt experiment (V2).
 * SYNTHETIC ONLY; no production ingress integration or cloud provision.
 *
 * Source-wire SHA256 and legacy canonicalized-JSON SHA256 have different
 * meanings and MUST NOT be mislabeled or interchanged. F.8 §§6,6.4 require
 * an immutable raw envelope/body/hash and first HTTP receipt timestamp.
 *
 * Prototype signer authenticates the EDGE OBSERVATION to Replit (a private
 * symmetric key), NOT the original AeroDataBox sender. Sender authenticity
 * still depends on verifying the real provider webhook auth contract.
 */
const enc = new TextEncoder();
const decoder = new TextDecoder("utf-8",{fatal:true});
const HASH=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9_.:-]{1,160}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const token=(x:unknown):x is string=>typeof x==="string"&&ID.test(x);
const uuid=(x:unknown):x is string=>typeof x==="string"&&UUID.test(x);
const hash64=(x:unknown):x is string=>typeof x==="string"&&HASH.test(x);

export type DualSourceReceiptV2 = Readonly<{
  schema:"v39.phase2g-synthetic-wire-and-canonical-receipt.v2";
  mode:"synthetic-only";
  v:2;
  sessionId:string;
  providerSubscriptionId:string;
  notificationId:string;
  attemptSeqNo:number;
  providerAttemptUtc:string;
  providerGeneratedUtc:string;
  syntheticCostCredits:number;
  firstEdgeReceivedAtUtc:string;
  wireBytes:number;
  wireSha256:string;
  canonicalSha256:string;
  attemptKey:string;
  receiptId:string;
}>;

export type DualSourceMessageV2 = Readonly<{
  receipt:DualSourceReceiptV2;
  signature:string;
  // Full original byte-for-byte JSON, retained in a *temporary* test queue.
  // Not a license to store provider payload indefinitely or in logged DB.
  rawBody:string;
}>;

function iso(s:string):boolean{
  return typeof s==="string"&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(s)&&
    Number.isFinite(Date.parse(s));
}
async function sha(input:Uint8Array|string):Promise<string>{
  const bytes=typeof input==="string"?enc.encode(input):input;
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
/** Exactly the same sort-key JSON canonicalization as current V3.9. */
export function legacyV39CanonicalJsonV2(value:unknown):string{
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return "["+value.map(legacyV39CanonicalJsonV2).join(",")+"]";
  const o=value as Record<string,unknown>;
  return "{"+Object.keys(o).sort().map(k=>JSON.stringify(k)+":"+legacyV39CanonicalJsonV2(o[k])).join(",")+"}";
}

/**
 * A small, strict JSON structural scanner to detect DUPLICATE OBJECT KEYS,
 * including escaped equivalents such as "id" vs "\u0069d". JSON.parse would
 * silently discard an earlier value, which can hide source provenance.
 * Invoked only AFTER successful JSON.parse, on capped synthetic bodies.
 */
export function assertNoDuplicateJsonObjectKeysV2(raw:string):void{
  let at=0,objects=0;
  const space=()=>{while(at<raw.length&&/\s/.test(raw[at]))at++};
  const fail=():never=>{throw new Error("SOURCE_JSON_STRUCTURE_UNSUPPORTED")};
  const string=():string=>{
    if(raw[at++]!=='"')return fail();
    const from=at-1;
    let escaped=false;
    while(at<raw.length){
      const c=raw[at++];
      if(!escaped&&c==='"')return JSON.parse(raw.slice(from,at)) as string;
      if(!escaped&&c==="\\")escaped=true;
      else escaped=false;
    }
    return fail();
  };
  const value=(depth:number):void=>{
    if(depth>64)throw new Error("SOURCE_JSON_NESTING_EXCEEDED");
    space();
    const c=raw[at];
    if(c==='"'){string();return;}
    if(c==="{"){
      at++;objects++;
      const keys=new Set<string>();
      space();
      if(raw[at]==="}"){at++;return;}
      for(;;){
        space();
        const key=string();
        if(keys.has(key))throw new Error("SOURCE_DUPLICATE_JSON_KEY");
        keys.add(key);
        space();if(raw[at++]!==":")return fail();
        value(depth+1);
        space();const sep=raw[at++];
        if(sep==="}")return;
        if(sep!==",")return fail();
      }
    }
    if(c==="["){
      at++;space();
      if(raw[at]==="]"){at++;return;}
      for(;;){
        value(depth+1);
        space();const sep=raw[at++];
        if(sep==="]")return;
        if(sep!==",")return fail();
      }
    }
    const start=at;
    while(at<raw.length&&!/[,\]\}\s]/.test(raw[at]))at++;
    if(at===start)return fail();
    try{const p=JSON.parse(raw.slice(start,at));if(typeof p==="object"&&p!==null)return fail()}
    catch{return fail()}
  };
  value(0);space();
  if(at!==raw.length||objects===0)fail();
}

function requireObject(o:unknown):Record<string,any>{
  if(!o||typeof o!=="object"||Array.isArray(o))throw new Error("SOURCE_JSON_OBJECT_REQUIRED");
  return o as Record<string,any>;
}

function validateReceipt(r:DualSourceReceiptV2):void{
  if(r.schema!=="v39.phase2g-synthetic-wire-and-canonical-receipt.v2"||
     r.mode!=="synthetic-only"||r.v!==2||
     !uuid(r.sessionId)||
     !token(r.providerSubscriptionId)||
     !token(r.notificationId)||
     !Number.isSafeInteger(r.attemptSeqNo)||r.attemptSeqNo<0||
     !Number.isSafeInteger(r.syntheticCostCredits)||r.syntheticCostCredits<0||
     !iso(r.providerAttemptUtc)||!iso(r.providerGeneratedUtc)||
     !iso(r.firstEdgeReceivedAtUtc)||
     !Number.isSafeInteger(r.wireBytes)||r.wireBytes<1||
     ![r.wireSha256,r.canonicalSha256,r.attemptKey,r.receiptId].every(hash64))
    throw new Error("SOURCE_RECEIPT_SCHEMA_INVALID");
}

function signingText(r:DualSourceReceiptV2):string{
  validateReceipt(r);
  // Length-prefixed base64 data would be another safe encoding; here every
  // identity is a strict no-newline token and fields follow fixed order.
  return [
    r.schema,r.mode,String(r.v),r.sessionId,r.providerSubscriptionId,
    r.notificationId,String(r.attemptSeqNo),
    r.providerAttemptUtc,r.providerGeneratedUtc,
    String(r.syntheticCostCredits),r.firstEdgeReceivedAtUtc,
    String(r.wireBytes),r.wireSha256,r.canonicalSha256,r.attemptKey,r.receiptId
  ].join("\n");
}
async function macHex(secret:string,msg:string):Promise<string>{
  if(secret.length<48)throw new Error("SOURCE_SIGNING_SECRET_TOO_SHORT");
  const key=await crypto.subtle.importKey("raw",enc.encode(secret),
    {name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const sig=await crypto.subtle.sign("HMAC",key,enc.encode(msg));
  return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function equalHash(x:string,y:string):boolean{
  if(!hash64(x)||!hash64(y))return false;
  let diff=0;
  for(let i=0;i<64;i++)diff|=x.charCodeAt(i)^y.charCodeAt(i);
  return diff===0;
}

export async function createSyntheticDualSourceMessageV2(input:{
  rawBytes:Uint8Array;
  sessionId:string;
  expectedProviderSubscriptionId:string;
  trustedReceivedAtUtc:string;
  privateEdgeSigningKey:string;
  maxWireBytes?:number;
}):Promise<DualSourceMessageV2>{
  if(!uuid(input.sessionId)||!token(input.expectedProviderSubscriptionId)||
     !iso(input.trustedReceivedAtUtc))throw new Error("SOURCE_TRUSTED_CONTEXT_INVALID");
  const ceiling=input.maxWireBytes??60_000;
  if(!Number.isSafeInteger(ceiling)||ceiling<1||ceiling>120_000)
    throw new Error("SOURCE_WIRE_LIMIT_INVALID");
  if(!(input.rawBytes instanceof Uint8Array)||input.rawBytes.length<1||
     input.rawBytes.length>ceiling)throw new Error("SOURCE_WIRE_SIZE_EXCEEDED");
  let raw:string,obj:Record<string,any>;
  try{
    raw=decoder.decode(input.rawBytes);
    obj=requireObject(JSON.parse(raw));
  }catch{throw new Error("SOURCE_JSON_INVALID_UTF8_OR_SYNTAX")}
  assertNoDuplicateJsonObjectKeysV2(raw);
  const notice=obj.id,providerSub=obj.subscription?.id,
    att=obj.deliveryAttempt,attemptSeq=att?.seqNo,cost=att?.costCredits,
    attemptTime=att?.timestampUtc,generatedTime=obj.timestampUtc;
  if(!token(notice)||!token(providerSub)||providerSub!==input.expectedProviderSubscriptionId||
     !Number.isSafeInteger(attemptSeq)||attemptSeq<0||
     !Number.isSafeInteger(cost)||cost<0||
     typeof attemptTime!=="string"||!iso(attemptTime)||
     typeof generatedTime!=="string"||!iso(generatedTime))
     throw new Error("SOURCE_PINNED_ATTEMPT_CONTRACT_INVALID");
  const wireSha256=await sha(input.rawBytes);
  const canonicalSha256=await sha(legacyV39CanonicalJsonV2(obj));
  const attemptKey=await sha([
    "p2g-synthetic-provider-attempt-v2",
    input.sessionId,providerSub,notice,String(attemptSeq)
  ].join("\n"));
  const receiptId=await sha([
    "p2g-synthetic-dual-receipt-v2",attemptKey,wireSha256
  ].join("\n"));
  const receipt:DualSourceReceiptV2={
    schema:"v39.phase2g-synthetic-wire-and-canonical-receipt.v2",
    mode:"synthetic-only",v:2,sessionId:input.sessionId,
    providerSubscriptionId:providerSub,notificationId:notice,
    attemptSeqNo:attemptSeq,providerAttemptUtc:attemptTime,
    providerGeneratedUtc:generatedTime,syntheticCostCredits:cost,
    firstEdgeReceivedAtUtc:input.trustedReceivedAtUtc,wireBytes:input.rawBytes.length,
    wireSha256,canonicalSha256,attemptKey,receiptId
  };
  return {receipt,signature:await macHex(input.privateEdgeSigningKey,signingText(receipt)),rawBody:raw};
}

/** Verify the complete body and both digests before honoring edge timestamps. */
export async function verifySyntheticDualSourceMessageV2(input:{
  message:DualSourceMessageV2;
  expectedSessionId:string;
  expectedProviderSubscriptionId:string;
  privateEdgeSigningKey:string;
  trustedNowUtc:string;
  maxBacklogSeconds?:number;
}):Promise<{verified:true;canonicalSha256:string;firstEdgeReceivedAtUtc:string}>{
  const {message:m}=input;
  validateReceipt(m.receipt);
  if(m.receipt.sessionId!==input.expectedSessionId||
     m.receipt.providerSubscriptionId!==input.expectedProviderSubscriptionId)
    throw new Error("SOURCE_RECEIPT_CONTEXT_MISMATCH");
  if(!iso(input.trustedNowUtc))throw new Error("SOURCE_VALIDATION_TIME_INVALID");
  const allowed=input.maxBacklogSeconds??2100;
  if(!Number.isSafeInteger(allowed)||allowed<0||allowed>1440*60)
    throw new Error("SOURCE_BACKLOG_WINDOW_INVALID");
  const age=(Date.parse(input.trustedNowUtc)-Date.parse(m.receipt.firstEdgeReceivedAtUtc))/1000;
  if(age< -30||age>allowed)throw new Error("SOURCE_RECEIPT_TOO_OLD_OR_FUTURE");
  const expected=await macHex(input.privateEdgeSigningKey,signingText(m.receipt));
  if(!equalHash(expected,m.signature))throw new Error("SOURCE_SIGNATURE_INVALID");
  // Rebuild receipt independently from the ACTUAL reserialized original bytes;
  // cannot trust an edge-submitted canonical SHA or timestamp by itself.
  const rebuilt=await createSyntheticDualSourceMessageV2({
    rawBytes:enc.encode(m.rawBody),
    sessionId:m.receipt.sessionId,
    expectedProviderSubscriptionId:m.receipt.providerSubscriptionId,
    trustedReceivedAtUtc:m.receipt.firstEdgeReceivedAtUtc,
    privateEdgeSigningKey:input.privateEdgeSigningKey,
    maxWireBytes:120_000
  });
  if(!equalHash(rebuilt.receipt.wireSha256,m.receipt.wireSha256)||
     !equalHash(rebuilt.receipt.canonicalSha256,m.receipt.canonicalSha256)||
     rebuilt.receipt.wireBytes!==m.receipt.wireBytes||
     !equalHash(rebuilt.receipt.attemptKey,m.receipt.attemptKey)||
     !equalHash(rebuilt.receipt.receiptId,m.receipt.receiptId)||
     rebuilt.receipt.providerGeneratedUtc!==m.receipt.providerGeneratedUtc||
     rebuilt.receipt.providerAttemptUtc!==m.receipt.providerAttemptUtc||
     rebuilt.receipt.syntheticCostCredits!==m.receipt.syntheticCostCredits)
    throw new Error("SOURCE_DUAL_HASH_OR_ATTEMPT_CONFLICT");
  return {verified:true,canonicalSha256:m.receipt.canonicalSha256,
    firstEdgeReceivedAtUtc:m.receipt.firstEdgeReceivedAtUtc};
}
