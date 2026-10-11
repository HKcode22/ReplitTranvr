import {readBoundedSourceWireV39,SourceWireBodyErrorV39} from "./bounded_wire_body";
import { assertNoDuplicateJsonObjectKeysV2 } from "../phase2g_rehearsal/dual_source_wire_canonical_receipt_v39";
import {signEdgeProvenanceV1} from "./provenance";

/**
 * NO-R2 ALTERNATIVE — TEST-ONLY Worker prototype, NOT DEPLOYABLE FOR
 * PRODUCTION. Uses Cloudflare Queues Free to hold COMPLETE source payloads
 * during a short Replit outage; unlike R2, undelivered bytes expire after
 * the Free queue's 24h retention. The live scientific 168h raw-blob rule
 * must still be enforced after a successful Replit persistence ACK.
 *
 * No secrets, provider signature code, authorization or paid-run cutover.
 * Only accepts synthetic test IDs, never a genuine provider message.
 * No account-wide quota counter exists here: require separate truthful
 * Cloudflare usage/remaining quota monitoring for any real use.
 */
type QueueProducer={send(v:QueueOnlyMessage):Promise<unknown>};
type QueueMsg={body:QueueOnlyMessage;ack():void;retry():void};
export type QueueOnlyMessage={
  v:1;
  sessionId:string;
  providerAttemptId:string;
  receiptId:string;
  rawBody:string;
  rawSha256:string;
  firstEdgeReceivedAtUtc:string;
};
export type QueueOnlyEnv={
  TEST_QUEUE:QueueProducer;
  EDGE_EXECUTION_MODE?:string;
  EDGE_SYNTHETIC_SECRET?:string;
  EDGE_TEST_RECEIVER_ORIGIN?:string;
  EDGE_TEST_RECEIVER_KEY?:string;
  EDGE_TEST_HMAC_KEY?:string;
  EDGE_TEST_RELAY_ENABLED?:string;
  EDGE_QUEUE_MESSAGE_MAX_BYTES?:string;
  EDGE_MAX_BACKLOG_SECONDS?:string;
};
const te=new TextEncoder();
const response=(status:number,reason:string)=>new Response(JSON.stringify({status,reason}),{
  status,headers:{"content-type":"application/json","cache-control":"no-store"}
});
async function sha(b:Uint8Array){
  const hash=await crypto.subtle.digest("SHA-256",b);
  return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,"0")).join("");
}
async function sameSecret(a:string,b:string){
  if(!b||b.length<32)return false;
  const x=te.encode(await sha(te.encode(a)));
  const y=te.encode(await sha(te.encode(b)));
  let bad=x.length^y.length;
  for(let i=0;i<Math.min(x.length,y.length);i++)bad|=x[i]^y[i];
  return bad===0;
}
const isSession=(x:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const isAttempt=(x:string)=>/^[a-zA-Z0-9_.:-]{1,160}$/.test(x);
const bodyCap=(e:QueueOnlyEnv)=>{
  const val=Number(e.EDGE_QUEUE_MESSAGE_MAX_BYTES??"120000");
  return Number.isSafeInteger(val)&&val>=1024&&val<=127000?val:120000;
};
const maxAge=(e:QueueOnlyEnv)=>{
  const val=Number(e.EDGE_MAX_BACKLOG_SECONDS??"2100");
  return Number.isSafeInteger(val)&&val>0&&val<=60*60?val:2100;
};
export async function queueOnlyIngest(r:Request,e:QueueOnlyEnv):Promise<Response>{
  if(e.EDGE_EXECUTION_MODE!=="synthetic-only")return response(503,"DISABLED_FOR_PROVIDER");
  if(r.method!=="POST")return response(405,"POST_REQUIRED");
  const firstEdgeReceivedAtUtc=new Date().toISOString();
  const path=new URL(r.url).pathname;
  const match=/^\/__p2g-free-queue-sandbox\/([^/]+)\/([^/]+)$/.exec(path);
  if(!match)return response(404,"NOT_FOUND");
  if(!(await sameSecret(decodeURIComponent(match[1]),e.EDGE_SYNTHETIC_SECRET??"")))
    return response(404,"NOT_FOUND");
  const sessionId=match[2];
  const providerAttemptId=r.headers.get("x-p2g-synthetic-attempt-id")??"";
  if(!isSession(sessionId)||!isAttempt(providerAttemptId))return response(400,"INVALID_SYNTHETIC_ID");
  if((r.headers.get("content-type")??"").split(";")[0].trim().toLowerCase()!=="application/json")
    return response(415,"JSON_REQUIRED");
  let rawBytes:Uint8Array;
  try{
    rawBytes=await readBoundedSourceWireV39(r,127000);
  }catch(error){
    if(error instanceof SourceWireBodyErrorV39)
      return response(error.reason==="SOURCE_WIRE_TOO_LARGE"?413:400,error.reason);
    throw error;
  }
  if(!rawBytes.length)return response(413,"QUEUE_SIZE_LIMIT");
  let rawBody:string;
  try{
    rawBody=new TextDecoder("utf-8",{fatal:true}).decode(rawBytes);
    const parsed=JSON.parse(rawBody);
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))
      return response(400,"INVALID_JSON");
    // Block duplicate wire JSON keys before an upstream synthetic ACK.
    assertNoDuplicateJsonObjectKeysV2(rawBody);
  }catch{return response(400,"INVALID_JSON");}
  const rawSha256=await sha(rawBytes);
  const receiptId=await sha(te.encode(sessionId+"\n"+providerAttemptId+"\n"+rawSha256));
  const message:QueueOnlyMessage={
    v:1,sessionId,providerAttemptId,receiptId,rawBody,rawSha256,firstEdgeReceivedAtUtc
  };
  // The QUEUE MESSAGE (not the HTTP body) must fit 128KB, including internal
  // metadata. Cap at 120KB to reserve >=8KB for CF internal overhead.
  const serialized=te.encode(JSON.stringify(message));
  if(serialized.length>bodyCap(e))return response(413,"SERIALIZED_QUEUE_MESSAGE_TOO_LARGE");
  try{
    await e.TEST_QUEUE.send(message);
    // No R2 receipt exists here. ACK assumes Queues has durably committed.
    return response(200,"QUEUED_COMPLETE_SYNTHETIC_NOTIFICATION");
  }catch{
    // No provider retry is configured in live V3.9. Failed ACK is NOT
    // recoverable under that contract; STOP if such error occurs in a test.
    return response(503,"QUEUE_DURABILITY_UNCONFIRMED");
  }
}
export async function queueOnlyConsume(
  batch:{messages:QueueMsg[]},e:QueueOnlyEnv
):Promise<void>{
  for(const msg of batch.messages){
    try{
      if(e.EDGE_EXECUTION_MODE!=="synthetic-only"||
         e.EDGE_TEST_RELAY_ENABLED!=="1"){msg.retry();continue;}
      const m=msg.body;
      if(m.v!==1||!isSession(m.sessionId)||!isAttempt(m.providerAttemptId)||
         !/^[0-9a-f]{64}$/.test(m.receiptId)||!/^[0-9a-f]{64}$/.test(m.rawSha256)||
         !Number.isFinite(Date.parse(m.firstEdgeReceivedAtUtc))){
        msg.retry();continue;
      }
      const ageSeconds=(Date.now()-Date.parse(m.firstEdgeReceivedAtUtc))/1000;
      if(ageSeconds<0||ageSeconds>maxAge(e)){msg.retry();continue;}
      const bytes=te.encode(m.rawBody);
      if(await sha(bytes)!==m.rawSha256 ||
         await sha(te.encode(m.sessionId+"\n"+m.providerAttemptId+"\n"+m.rawSha256))!==m.receiptId){
        msg.retry();continue;
      }
      const origin=e.EDGE_TEST_RECEIVER_ORIGIN??"";
      if(!/^https:\/\/[a-z0-9.-]+$/i.test(origin) ||
         (e.EDGE_TEST_RECEIVER_KEY??"").length<32 ||
         (e.EDGE_TEST_HMAC_KEY??"").length<48){msg.retry();continue;}
      const mac=await signEdgeProvenanceV1({
        v:1,sessionId:m.sessionId,providerAttemptId:m.providerAttemptId,
        receiptId:m.receiptId,sourceSha256:m.rawSha256,
        edgeReceivedAtUtc:m.firstEdgeReceivedAtUtc
      },e.EDGE_TEST_HMAC_KEY!);
      const result=await fetch(origin+"/__p2g-sandbox-verify",{
        method:"POST",redirect:"error",signal:AbortSignal.timeout(8000),
        headers:{
          "content-type":"application/json",
          "x-p2g-sandbox-auth":e.EDGE_TEST_RECEIVER_KEY!,
          "x-p2g-edge-provenance-hmac":mac,
          "x-p2g-edge-received-at":m.firstEdgeReceivedAtUtc,
          "x-p2g-edge-receipt-id":m.receiptId,
          "x-p2g-edge-provider-attempt-id":m.providerAttemptId,
          "x-p2g-edge-source-sha256":m.rawSha256
        },
        body:bytes
      });
      if(result.status!==200){msg.retry();continue;}
      const ack=await result.json().catch(()=>null) as null | {persisted?:boolean;sourceSha256?:string};
      if(!ack?.persisted||ack.sourceSha256!==m.rawSha256){msg.retry();continue;}
      // Synthetic test receiver promises it has already written original
      // bytes to durable 168h storage; here only verify the test's ACK shape.
      msg.ack();
    }catch{msg.retry();}
  }
}
export default {
  fetch:queueOnlyIngest,
  queue:queueOnlyConsume
};
