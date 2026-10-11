import { assertNoDuplicateJsonObjectKeysV2 } from "../phase2g_rehearsal/dual_source_wire_canonical_receipt_v39";
import { signEdgeProvenanceV1 } from "./provenance";
/**
 * PHASE 2G Stage-1 — isolated Cloudflare Workers + R2 + Queues candidate.
 *
 * NO DEPLOYMENT CONFIG, NO ACTIVE WEBHOOK CUTOVER, NO PROVIDER CALLS.
 * Requires explicit EDGE_EXECUTION_MODE=synthetic-only; does not allow any
 * live Stage-1 subscription or paid provider receipts. Relay is disabled
 * unless EDGE_ALLOW_SYNTHETIC_RELAY=1 and test-only destination is configured.
 *
 * R2 index is an append-only receipt manifest. ACK only after raw bytes,
 * index and queue send. Scheduled scanner repairs lost enqueue from durable
 * indexes. Queue consumer retries until a disposable test receiver commits.
 * A marker is stored after 2xx so a repeated queue message is idempotent.
 *
 * Not a finished science-correct relay: Replit currently stamps receive
 * time on processing, not edge acceptance. This module may NOT be used
 * for real samples until signed edge provenance + frozen protocol exists.
 */

type R2Item = {
  key: string;
  etag: string;
  size: number;
  customMetadata?: Record<string, string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
};
type R2Head = Pick<R2Item, "key" | "etag" | "size" | "customMetadata">;
type R2Store = {
  put(key: string, data: string | ArrayBuffer | Uint8Array, options?: {
    onlyIf?: { etagDoesNotMatch?: string; etagMatches?:string };
    customMetadata?: Record<string,string>;
    httpMetadata?: {contentType?:string};
  }): Promise<R2Head | null>;
  get(key:string): Promise<R2Item | null>;
  head(key:string): Promise<R2Head | null>;
  list(options?:{prefix?:string;limit?:number;cursor?:string}):Promise<{
    objects:R2Head[];truncated:boolean;cursor?:string;
  }>;
};
type QueueProducer = {send(value:{receiptKey:string}):Promise<void>};
type QueueMsg = {body:{receiptKey:string};ack():void;retry():void};
type QueueBatch = {messages:QueueMsg[]};

export type Env = {
  RAW:R2Store;
  DELIVERY_QUEUE:QueueProducer;
  EDGE_EXECUTION_MODE?:string;
  EDGE_ALLOW_SYNTHETIC_RELAY?:string;
  EDGE_TEST_SECRET?:string;
  EDGE_SANDBOX_RECEIVER_ORIGIN?:string;
  EDGE_TEST_RECEIVER_PATH_SECRET?:string;
  EDGE_PROVENANCE_SIGNING_KEY?:string;
  EDGE_MAX_BYTES?:string;
  EDGE_TEST_DIAGNOSTICS?:string;
};
type Receipt = {
  v:1;
  id:string;
  sourceSha256:string;
  sessionId:string;
  attemptId:string;
  firstEdgeReceivedAtUtc:string;
  rawKey:string;
  rawBytes:number;
};
const te=new TextEncoder();
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{
  status,headers:{"content-type":"application/json","cache-control":"no-store"}
});
const noCache={"cache-control":"no-store"};
const maxBytes=(e:Env)=>{
  const n=Number(e.EDGE_MAX_BYTES??"2097152");
  return Number.isSafeInteger(n)&&n>0&&n<=2097152?n:2097152;
};
async function digest(b:Uint8Array){
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256",b))].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function digestText(s:string){return digest(te.encode(s))}
async function equalSecrets(a:string,b:string){
  if(!b||b.length<32)return false;
  const x=te.encode(await digestText(a)),y=te.encode(await digestText(b));
  let mismatch=x.length^y.length;
  for(let i=0;i<Math.min(x.length,y.length);i++)mismatch|=x[i]^y[i];
  return mismatch===0;
}
function goodSession(s:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);}
function safeAttempt(s:string){return /^[a-zA-Z0-9_.:-]{1,160}$/.test(s)}
function parse<T>(s:string):T{return JSON.parse(s) as T}

/**
 * Real signed-provider parsing isn't implemented here: expect test-only
 * X-P2G-Synthetic-Attempt-ID header. Never enable real traffic.
 */
export async function ingest(request:Request,e:Env):Promise<Response>{
  if(e.EDGE_EXECUTION_MODE!=="synthetic-only"){
    return json({accepted:false,error:"NOT_ACTIVATED_FOR_PROVIDER"},503);
  }
  if(request.method!=="POST")return json({error:"POST_REQUIRED"},405);
  // Preserve source arrival at the edge, not delayed R2/queue completion.
  const firstReceivedAtUtc=new Date().toISOString();
  const url=new URL(request.url);
  const match=/^\/api\/v1\/webhooks\/aerodatabox\/([^/]+)\/prepaid\/([^/]+)$/.exec(url.pathname);
  if(!match)return json({error:"NOT_FOUND"},404);
  if(!(await equalSecrets(decodeURIComponent(match[1]),e.EDGE_TEST_SECRET??"")))
    return json({error:"NOT_FOUND"},404);
  const sessionId=match[2];
  const attemptId=request.headers.get("x-p2g-synthetic-attempt-id")??"";
  if(!goodSession(sessionId)||!safeAttempt(attemptId))
    return json({error:"TEST_ATTEMPT_OR_SESSION_INVALID"},400);
  if((request.headers.get("content-type")??"").split(";")[0].trim().toLowerCase()!=="application/json")
    return json({error:"CONTENT_TYPE"},415);
  const max=maxBytes(e),length=Number(request.headers.get("content-length")??"0");
  if(Number.isFinite(length)&&length>max)return json({error:"BODY_TOO_LARGE"},413);
  const bytes=new Uint8Array(await request.arrayBuffer());
  if(!bytes.byteLength||bytes.byteLength>max)return json({error:"BODY_TOO_LARGE"},413);
  try{
    // Reject lossy UTF-8 decoding and top-level arrays BEFORE raw write and
    // 2xx; downstream V3.9 requires an object and exact source-byte proof.
    const originalWireJson=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
    const v=parse<unknown>(originalWireJson);
    if(typeof v!=="object"||v===null||Array.isArray(v))
      return json({error:"INVALID_JSON_OBJECT"},400);
    // JSON.parse overwrites duplicate fields: refuse before durable ACK.
    // Decode escaped key spellings before comparing (e.g. id vs \\u0069d).
    assertNoDuplicateJsonObjectKeysV2(originalWireJson);
  }catch{return json({error:"INVALID_JSON"},400)}

  const sourceSha256=await digest(bytes);
  // Attempt index is unique to one synthetic provider delivery attempt.
  // No sensitive token or raw provider content in R2 object key.
  const attemptHash=await digestText(sessionId+"\n"+attemptId);
  const receiptKey="p2g-sandbox/index/"+attemptHash+".json";
  const rawKey="p2g-sandbox/raw/"+sourceSha256+".json";
  try{
    // R2 immutable raw payload via conditional put; even a duplicate is safe.
    await e.RAW.put(rawKey,bytes,{
      onlyIf:{etagDoesNotMatch:"*"},
      httpMetadata:{contentType:"application/json"}
    });
    const stored=await e.RAW.get(rawKey);
    if(!stored||stored.size!==bytes.byteLength||
       await digest(new Uint8Array(await stored.arrayBuffer()))!==sourceSha256)
      return json({accepted:false,error:"RAW_DURABILITY_NOT_VERIFIED"},503);

    const candidate:Receipt={
      v:1,id:attemptHash,sessionId,attemptId,sourceSha256,rawKey,
      firstEdgeReceivedAtUtc:firstReceivedAtUtc,rawBytes:bytes.byteLength
    };
    const created=await e.RAW.put(receiptKey,JSON.stringify(candidate),{
      onlyIf:{etagDoesNotMatch:"*"},httpMetadata:{contentType:"application/json"}
    });
    // Conditional put failed on a duplicate; retain FIRST receipt timestamp.
    const index=await e.RAW.get(receiptKey);
    if(!index)return json({accepted:false,error:"MISSING_DURABLE_RECEIPT"},503);
    const durable=parse<Receipt>(await index.text());
    if(durable.v!==1||durable.id!==attemptHash||
       durable.sessionId!==sessionId||durable.attemptId!==attemptId||
       durable.sourceSha256!==sourceSha256||durable.rawKey!==rawKey||
       durable.rawBytes!==bytes.byteLength||
       !Number.isFinite(Date.parse(durable.firstEdgeReceivedAtUtc)))
      return json({accepted:false,error:"CONFLICTING_PROVIDER_ATTEMPT"},409);
    // Always enqueue even on duplicate; at-least-once delivery is intentional.
    await e.DELIVERY_QUEUE.send({receiptKey});
    return json({accepted:true,receiptId:attemptHash,durablyEnqueued:true,duplicate:created===null});
  }catch(error){
    // A raw/index object may remain. A scheduled scanner can recover it.
    // Never 2xx unless BOTH durability and enqueue have been confirmed.
    return json({accepted:false,error:"STORE_OR_QUEUE_UNAVAILABLE",
      ...(e.EDGE_TEST_DIAGNOSTICS==="1"?{testOnlyErrorName: error instanceof Error?error.name:"unknown"}:{})
    },503);
  }
}

type ProcessedReceiptMarker = {
  v:1;
  receiptKey:string;
  receiptId:string;
  sourceSha256:string;
  firstEdgeReceivedAtUtc:string;
  receiverDurablyPersisted:true;
  processedAtUtc:string;
};
/**
 * An existing R2 key is NOT sufficient proof that a source notification was
 * durably relayed. Verify its EXACT immutable receipt identity and readback
 * before ack() or skipping the signed test receiver.
 *
 * In-memory sandbox only, never source authority for real paid science.
 */
async function checkedProcessedMarker(
  e:Env,processedKey:string,receiptKey:string,r:Receipt
):Promise<"missing"|"verified"|"corrupt">{
  const marker=await e.RAW.get(processedKey);
  if(!marker)return "missing";
  try{
    const m=parse<Partial<ProcessedReceiptMarker>>(await marker.text());
    if(m?.v!==1||m.receiptKey!==receiptKey||m.receiptId!==r.id||
       m.sourceSha256!==r.sourceSha256||
       m.firstEdgeReceivedAtUtc!==r.firstEdgeReceivedAtUtc||
       m.receiverDurablyPersisted!==true||
       !m.processedAtUtc||!Number.isFinite(Date.parse(m.processedAtUtc)))
      return "corrupt";
    return "verified";
  }catch{return "corrupt";}
}

/**
 * A historical R2 processed marker can survive while Replit UNLOGGED
 * scientific rows disappear. NEVER use the marker alone to ACK a Queue
 * redelivery or to permanently skip a scanned receipt. Require a fresh,
 * separately authenticated, read-only database observation from a TEST-ONLY
 * sandbox endpoint; NOT a substitute for an independent real provider ledger.
 *
 * The sandbox receiver endpoint is intentionally NOT deployed by this code.
 * Until deployed equivalently in permitted staging this returns false.
 */
async function confirmCurrentDisposableScience(e:Env,r:Receipt):Promise<boolean>{
  const origin=e.EDGE_SANDBOX_RECEIVER_ORIGIN??"";
  const token=e.EDGE_TEST_RECEIVER_PATH_SECRET??"";
  const signingKey=e.EDGE_PROVENANCE_SIGNING_KEY??"";
  if(!/^https:\/\/[a-z0-9.-]+$/i.test(origin)||
     token.length<32||signingKey.length<48)
    return false;
  const proof={
    v:1 as const,sessionId:r.sessionId,receiptId:r.id,
    providerAttemptId:r.attemptId,sourceSha256:r.sourceSha256,
    edgeReceivedAtUtc:r.firstEdgeReceivedAtUtc
  };
  const signature=await signEdgeProvenanceV1(proof,signingKey);
  const response=await fetch(origin+"/__p2g-sandbox-confirm",{
    method:"POST",headers:{
      "content-type":"application/json",
      "x-p2g-sandbox-auth":token,
      "x-p2g-edge-provenance-hmac":signature
    },
    body:JSON.stringify(proof),
    signal:AbortSignal.timeout(8000),redirect:"error"
  });
  if(response.status!==200)return false;
  const answer=await response.json().catch(()=>null) as Record<string,unknown>|null;
  return answer?.v===1&&answer.currentlyPersisted===true&&
    answer.sessionId===r.sessionId&&
    answer.providerAttemptId===r.attemptId&&
    answer.receiptId===r.id&&answer.sourceSha256===r.sourceSha256&&
    answer.originalEdgeReceivedAtUtc===r.firstEdgeReceivedAtUtc;
}

async function relayReceipt(e:Env,receiptKey:string):Promise<"done"|"retry">{
  if(e.EDGE_EXECUTION_MODE!=="synthetic-only"||
     e.EDGE_ALLOW_SYNTHETIC_RELAY!=="1")return "retry";
  if(!/^p2g-sandbox\/index\/[0-9a-f]{64}\.json$/.test(receiptKey))return "retry";
  const processedKey=receiptKey.replace("/index/","/processed/");
  const index=await e.RAW.get(receiptKey);
  if(!index)return "retry";
  const r=parse<Receipt>(await index.text());
  if(r.v!==1||r.id!==receiptKey.split("/").at(-1)?.slice(0,-5)||
     !goodSession(r.sessionId)||!safeAttempt(r.attemptId)||
     r.id!==await digestText(r.sessionId+"\n"+r.attemptId)||
     !/^p2g-sandbox\/raw\/[0-9a-f]{64}\.json$/.test(r.rawKey)||
     r.rawKey!=="p2g-sandbox/raw/"+r.sourceSha256+".json"||
     !Number.isSafeInteger(r.rawBytes)||r.rawBytes<=0||
     r.rawBytes>maxBytes(e)||
     !Number.isFinite(Date.parse(r.firstEdgeReceivedAtUtc))||
     new Date(r.firstEdgeReceivedAtUtc).toISOString()!==r.firstEdgeReceivedAtUtc)
    return "retry";
  const raw=await e.RAW.get(r.rawKey);
  if(!raw||raw.size!==r.rawBytes)return "retry";
  const body=new Uint8Array(await raw.arrayBuffer());
  if(await digest(body)!==r.sourceSha256)return "retry";
  const markerState=await checkedProcessedMarker(e,processedKey,receiptKey,r);
  if(markerState==="verified"){
    // Re-check CURRENT downstream scientific persistence. An old marker
    // after UNLOGGED loss is not proof of a currently committed delivery.
    return await confirmCurrentDisposableScience(e,r)?"done":"retry";
  }
  if(markerState==="corrupt")return "retry";

  // Hard guard: A REAL prepaid callback route is NOT an acceptable sandbox
  // destination. Only a dedicated /__p2g-sandbox-verify test endpoint, which
  // must be separately built/reviewed, may be configured here.
  const origin=e.EDGE_SANDBOX_RECEIVER_ORIGIN??"";
  if(!/^https:\/\/[a-z0-9.-]+$/i.test(origin))return "retry";
  const path="/__p2g-sandbox-verify";
  const token=e.EDGE_TEST_RECEIVER_PATH_SECRET??"";
  if(token.length<32)return "retry";
  const signingKey=e.EDGE_PROVENANCE_SIGNING_KEY??"";
  if(signingKey.length<48)return "retry";
  const signature=await signEdgeProvenanceV1({
    v:1,sessionId:r.sessionId,receiptId:r.id,
    providerAttemptId:r.attemptId,sourceSha256:r.sourceSha256,
    edgeReceivedAtUtc:r.firstEdgeReceivedAtUtc
  },signingKey);
  const response=await fetch(origin+path,{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "x-p2g-sandbox-auth":token,
      "x-p2g-edge-received-at":r.firstEdgeReceivedAtUtc,
      "x-p2g-edge-source-sha256":r.sourceSha256,
      "x-p2g-edge-receipt-id":r.id,
      "x-p2g-edge-provider-attempt-id":r.attemptId,
      "x-p2g-edge-provenance-hmac":signature
    },
    body,
    signal:AbortSignal.timeout(8000),
    redirect:"error",
  });
  if(response.status!==200)return "retry";
  const answer=await response.json().catch(()=>null) as null | {persisted?:boolean;sourceSha256?:string};
  if(!answer?.persisted||answer.sourceSha256!==r.sourceSha256)return "retry";
  // Only ACK the queue when the disposable TEST receiver claims a full
  // durable commit AND the R2 processed marker itself is read back and
  // compared to this exact immutable source identity. Receiver's ACK is
  // a TEST ASSERTION, not real authenticated PostgreSQL scientific recovery.
  const marker:ProcessedReceiptMarker={
    v:1,receiptKey,receiptId:r.id,sourceSha256:r.sourceSha256,
    firstEdgeReceivedAtUtc:r.firstEdgeReceivedAtUtc,
    receiverDurablyPersisted:true,processedAtUtc:new Date().toISOString()
  };
  const committed=await e.RAW.put(processedKey,JSON.stringify(marker));
  if(!committed||
     await checkedProcessedMarker(e,processedKey,receiptKey,r)!=="verified")
    return "retry";
  return "done";
}

export async function consume(batch:QueueBatch,e:Env):Promise<void>{
  for(const msg of batch.messages){
    try{
      if(await relayReceipt(e,msg.body.receiptKey)==="done")msg.ack();
      else msg.retry();
    }catch{msg.retry();}
  }
}

/**
 * Durable scan cursor: a scanner that blindly re-lists the FIRST 300 index
 * records on every invocation can permanently starve later orphaned source
 * notifications. Synthetic R2 checkpoint restores forward progress across
 * invocations/worker replacement. Still NOT a production/outage-safe queue.
 *
 * Checkpoint uses R2 compare-and-swap; concurrent scanners may requeue a
 * receipt redundantly (at-least-once), but must never silently claim that
 * an uncommitted cursor advanced. No provider traffic or live bindings.
 */
const scannerCursorKey="p2g-sandbox/control/scanner-cursor-v1.json";
type ScannerCheckpoint={
  v:1;cursor:string|null;observedAtUtc:string
};
async function getScannerCursor(e:Env):Promise<{
  cursor:string|undefined;etag:string|undefined;
}>{
  const stored=await e.RAW.get(scannerCursorKey);
  if(!stored)return {cursor:undefined,etag:undefined};
  const state=parse<ScannerCheckpoint>(await stored.text());
  const validCursor=state?.cursor===null||
    (typeof state.cursor==="string"&&state.cursor.length>0&&
     state.cursor.length<=4096);
  if(state?.v!==1||!validCursor||
     !Number.isFinite(Date.parse(state.observedAtUtc))||
     typeof stored.etag!=="string"||!stored.etag)
    throw new Error("UNTRUSTED_SCAN_CURSOR_CHECKPOINT");
  return {
    cursor:state.cursor===null?undefined:state.cursor,
    etag:stored.etag
  };
}
/** Outbox recovery if index persisted but crash occurred before queue ACK. */
export async function scanUnfinished(e:Env):Promise<{scanned:number,requeued:number,errors:number}>{
  if(e.EDGE_EXECUTION_MODE!=="synthetic-only")return {scanned:0,requeued:0,errors:0};
  let scanned=0,requeued=0,errors=0;
  let previous:{cursor:string|undefined;etag:string|undefined};
  try{previous=await getScannerCursor(e);}
  catch{return {scanned:0,requeued:0,errors:1};}
  let cursor=previous.cursor;
  let finished=false;
  // Bounded page count remains 3 x 100. Unlike the old code, the
  // next invocation resumes after the LAST successfully scanned page.
  for(let page=0;page<3;page++){
    const pageErrorsBefore=errors;
    let pageHasUnmaturedSource=false;
    // Preserve the cursor at the start of this page until all its sources
    // have been checked. Never skip malformed/undeliverable source receipts.
    let result:Awaited<ReturnType<Env["RAW"]["list"]>>;
    try{
      result=await e.RAW.list({
        prefix:"p2g-sandbox/index/",limit:100,cursor
      });
    }catch{errors++;break;}
    for(const item of result.objects){
      scanned++;
      const processedKey=item.key.replace("/index/","/processed/");
      try{
        const index=await e.RAW.get(item.key);
        if(!index){errors++;continue;}
        const r=parse<Receipt>(await index.text());
        const age=Date.now()-Date.parse(r.firstEdgeReceivedAtUtc);
        if(!Number.isFinite(age)||age<0){errors++;continue;}
        if(r.v!==1||r.id!==item.key.split("/").at(-1)?.slice(0,-5)||
           !goodSession(r.sessionId)||!safeAttempt(r.attemptId)||
           r.id!==await digestText(r.sessionId+"\n"+r.attemptId)||
           !/^p2g-sandbox\/raw\/[0-9a-f]{64}\.json$/.test(r.rawKey)||
           !/^[0-9a-f]{64}$/.test(r.sourceSha256)||
           r.rawKey!=="p2g-sandbox/raw/"+r.sourceSha256+".json"||
           !Number.isSafeInteger(r.rawBytes)||r.rawBytes<=0||
           r.rawBytes>maxBytes(e)||
           new Date(r.firstEdgeReceivedAtUtc).toISOString()!==r.firstEdgeReceivedAtUtc){
          errors++;continue;
        }
        // Recent receipts may still be in-flight with first queue send.
        if(age<60_000){
          // Deliberately defer a recently indexed notification, but DON'T
          // move the scanner cursor beyond it. The original enqueue could
          // have failed during a crash and would otherwise be skipped.
          pageHasUnmaturedSource=true;
          continue;
        }
        const marker=await checkedProcessedMarker(e,processedKey,item.key,r);
        if(marker==="verified"){
          // A processed marker is durable at the edge, NOT an active DB
          // continuity proof. Failed read-only confirmation blocks cursor
          // advancement and never drops this historical receipt.
          if(!await confirmCurrentDisposableScience(e,r))errors++;
          continue;
        }
        if(marker==="corrupt"){errors++;continue;}
        const raw=await e.RAW.get(r.rawKey);
        if(!raw||raw.size!==r.rawBytes||
           await digest(new Uint8Array(await raw.arrayBuffer()))!==r.sourceSha256){
          errors++;continue;
        }
        await e.DELIVERY_QUEUE.send({receiptKey:item.key});
        requeued++;
      }catch{errors++;}
    }
    if(errors!==pageErrorsBefore||pageHasUnmaturedSource){
      // A young source is pending rather than corrupt: do not count it as
      // an error, but never checkpoint past its unverified Queue admission.
      // Later retries may duplicate successful sends (at-least-once),
      // but cannot silently skip the failed source on this page.
      break;
    }
    if(!result.truncated){
      finished=true;
      cursor=undefined;
      break;
    }
    if(!result.cursor||result.cursor===cursor){
      errors++;break;
    }
    cursor=result.cursor;
  }
  // Fail closed on an unpersisted progress checkpoint. This is NOT a
  // guarantee of uninterrupted recovery: if the cursor write fails, next
  // run re-scans safely and eventual coverage must be separately audited.
  const checkpoint:ScannerCheckpoint={
    v:1,cursor:finished?null:(cursor??null),
    observedAtUtc:new Date().toISOString()
  };
  try{
    const saved=await e.RAW.put(scannerCursorKey,
      JSON.stringify(checkpoint),{
        onlyIf:previous.etag?
          {etagMatches:previous.etag}:{etagDoesNotMatch:"*"}
      });
    if(!saved)errors++;
    else{
      const confirmed=await e.RAW.get(scannerCursorKey);
      if(!confirmed||await confirmed.text()!==JSON.stringify(checkpoint))
        errors++;
    }
  }catch{errors++;}
  return {scanned,requeued,errors};
}

export default {
  async fetch(req:Request,env:Env):Promise<Response>{return ingest(req,env);},
  async queue(batch:QueueBatch,env:Env):Promise<void>{return consume(batch,env);},
  async scheduled(_event:unknown,env:Env):Promise<void>{await scanUnfinished(env);}
};
