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
    onlyIf?: { etagDoesNotMatch?: string };
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
  EDGE_MAX_BYTES?:string;
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
    const v=parse<unknown>(new TextDecoder().decode(bytes));
    if(typeof v!=="object"||v===null)return json({error:"INVALID_JSON_OBJECT"},400);
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
      firstEdgeReceivedAtUtc,rawBytes:bytes.byteLength
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
  }catch{
    // A raw/index object may remain. A scheduled scanner can recover it.
    // Never 2xx unless BOTH durability and enqueue have been confirmed.
    return json({accepted:false,error:"STORE_OR_QUEUE_UNAVAILABLE"},503);
  }
}

async function relayReceipt(e:Env,receiptKey:string):Promise<"done"|"retry">{
  if(e.EDGE_EXECUTION_MODE!=="synthetic-only"||
     e.EDGE_ALLOW_SYNTHETIC_RELAY!=="1")return "retry";
  if(!/^p2g-sandbox\/index\/[0-9a-f]{64}\.json$/.test(receiptKey))return "retry";
  const processedKey=receiptKey.replace("/index/","/processed/");
  if(await e.RAW.head(processedKey))return "done";
  const index=await e.RAW.get(receiptKey);
  if(!index)return "retry";
  const r=parse<Receipt>(await index.text());
  if(r.v!==1||r.id!==receiptKey.split("/").at(-1)?.slice(0,-5)||
     !goodSession(r.sessionId)||!safeAttempt(r.attemptId)||
     !/^p2g-sandbox\/raw\/[0-9a-f]{64}\.json$/.test(r.rawKey))return "retry";
  const raw=await e.RAW.get(r.rawKey);
  if(!raw||raw.size!==r.rawBytes)return "retry";
  const body=new Uint8Array(await raw.arrayBuffer());
  if(await digest(body)!==r.sourceSha256)return "retry";

  // Hard guard: A REAL prepaid callback route is NOT an acceptable sandbox
  // destination. Only a dedicated /__p2g-sandbox-verify test endpoint, which
  // must be separately built/reviewed, may be configured here.
  const origin=e.EDGE_SANDBOX_RECEIVER_ORIGIN??"";
  if(!/^https:\/\/[a-z0-9.-]+$/i.test(origin))return "retry";
  const path="/__p2g-sandbox-verify";
  const token=e.EDGE_TEST_RECEIVER_PATH_SECRET??"";
  if(token.length<32)return "retry";
  const response=await fetch(origin+path,{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "x-p2g-sandbox-auth":token,
      "x-p2g-edge-received-at":r.firstEdgeReceivedAtUtc,
      "x-p2g-edge-source-sha256":r.sourceSha256,
      "x-p2g-edge-receipt-id":r.id
    },
    body,
    signal:AbortSignal.timeout(8000),
    redirect:"error",
  });
  if(response.status!==200)return "retry";
  const answer=await response.json().catch(()=>null) as null | {persisted?:boolean;sourceSha256?:string};
  if(!answer?.persisted||answer.sourceSha256!==r.sourceSha256)return "retry";
  // Only ACK the queue when a durable commit is explicitly attested by
  // disposable TEST receiver, and processed-marker write succeeds.
  await e.RAW.put(processedKey,JSON.stringify({
    sourceSha256:r.sourceSha256,processedAtUtc:new Date().toISOString()
  }));
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

/** Outbox recovery if index persisted but crash occurred before queue ACK. */
export async function scanUnfinished(e:Env):Promise<{scanned:number,requeued:number,errors:number}>{
  if(e.EDGE_EXECUTION_MODE!=="synthetic-only")return {scanned:0,requeued:0,errors:0};
  let cursor: string|undefined,scanned=0,requeued=0,errors=0;
  // Bounded scan by design; no unbounded request bill or infinite cursor walk.
  for(let page=0;page<3;page++){
    const result=await e.RAW.list({prefix:"p2g-sandbox/index/",limit:100,cursor});
    for(const item of result.objects){
      scanned++;
      const processedKey=item.key.replace("/index/","/processed/");
      try{
        // Index must already be mature before recovering, so immediate upload
        // has a chance to enqueue normally. Scan only if object age is known.
        const index=await e.RAW.get(item.key);
        if(!index)continue;
        const r=parse<Receipt>(await index.text());
        const age=Date.now()-Date.parse(r.firstEdgeReceivedAtUtc);
        if(!Number.isFinite(age)||age<60_000)continue;
        if(await e.RAW.head(processedKey))continue;
        await e.DELIVERY_QUEUE.send({receiptKey:item.key});
        requeued++;
      }catch{errors++;}
    }
    if(!result.truncated||!result.cursor)break;
    cursor=result.cursor;
  }
  return {scanned,requeued,errors};
}

export default {
  async fetch(req:Request,env:Env):Promise<Response>{return ingest(req,env);},
  async queue(batch:QueueBatch,env:Env):Promise<void>{return consume(batch,env);},
  async scheduled(_event:unknown,env:Env):Promise<void>{await scanUnfinished(env);}
};
