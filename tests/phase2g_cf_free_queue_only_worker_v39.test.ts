import {describe,it,expect,vi} from "vitest";
import {queueOnlyIngest,queueOnlyConsume,type QueueOnlyEnv,type QueueOnlyMessage}
  from "../experiments/phase2g_cf_sandbox_ingress/worker_queue_only";
import {verifyEdgeProvenanceV1}
  from "../experiments/phase2g_cf_sandbox_ingress/provenance";
const secret="q".repeat(40),session="12345678-1234-4234-8234-123456789abc";
const url="https://sandbox.edge.invalid/__p2g-free-queue-sandbox/"+secret+"/"+session;
const raw=JSON.stringify({notification:"synthetic",flights:[{id:"fictional-yssy"}]});
const msg=(e:QueueOnlyEnv)=>new Request(url,{
  method:"POST",headers:{
    "content-type":"application/json",
    "x-p2g-synthetic-attempt-id":"fixture:0"
  },body:raw
});
function setup(){
  const queued:QueueOnlyMessage[]=[];
  let reject=false;
  const env:QueueOnlyEnv={
    EDGE_EXECUTION_MODE:"synthetic-only",
    EDGE_SYNTHETIC_SECRET:secret,
    EDGE_TEST_RELAY_ENABLED:"0",
    EDGE_TEST_RECEIVER_ORIGIN:"https://sandbox.mock.invalid",
    EDGE_TEST_RECEIVER_KEY:"r".repeat(40),
    EDGE_TEST_HMAC_KEY:"h".repeat(64),
    TEST_QUEUE:{async send(x){
      if(reject)throw new Error("SIMULATED_QUEUE_UNAVAILABLE");
      queued.push(x);
    }}
  };
  return {env,queued,setReject(x:boolean){reject=x}};
}
describe("Phase2G free-only queue Worker, synthetic-only and no R2",()=>{
  it("ACKs only after full payload accepted by Queue, preserves original UTC and hash",async()=>{
    const h=setup();
    const r=await queueOnlyIngest(msg(h.env),h.env);
    expect(r.status).toBe(200);
    expect(h.queued).toHaveLength(1);
    const q=h.queued[0];
    expect(q.rawBody).toBe(raw);
    expect(q.firstEdgeReceivedAtUtc).toMatch(/Z$/);
    expect(q.rawSha256).toMatch(/^[0-9a-f]{64}$/);
  });
  it("a free Queue write failure never returns 200 or pretends Replit persisted",async()=>{
    const h=setup();h.setReject(true);
    const r=await queueOnlyIngest(msg(h.env),h.env);
    expect(r.status).toBe(503);
    expect(h.queued).toHaveLength(0);
  });
  it("refuses oversized serialized envelope, even when body length alone might fit",async()=>{
    const h=setup();
    const huge=JSON.stringify({payload:"x".repeat(120_000)});
    const r=await queueOnlyIngest(new Request(url,{
      method:"POST",headers:{"content-type":"application/json","x-p2g-synthetic-attempt-id":"fixture:0"},
      body:huge
    }),h.env);
    expect(r.status).toBe(413);
    expect(h.queued).toHaveLength(0);
  });
  it("hard-refuses real provider activation, wrong secret and invalid attempt ID",async()=>{
    const h=setup();h.env.EDGE_EXECUTION_MODE="paid-provider";
    expect((await queueOnlyIngest(msg(h.env),h.env)).status).toBe(503);
    h.env.EDGE_EXECUTION_MODE="synthetic-only";
    const wrong=new Request(url.replace(secret,"not-secret"),{
      method:"POST",headers:{"content-type":"application/json","x-p2g-synthetic-attempt-id":"fixture:0"},body:raw
    });
    expect((await queueOnlyIngest(wrong,h.env)).status).toBe(404);
    const missing=new Request(url,{method:"POST",headers:{"content-type":"application/json"},body:raw});
    expect((await queueOnlyIngest(missing,h.env)).status).toBe(400);
    expect(h.queued).toHaveLength(0);
  });
  it("does not ACK queued message while Replit receiver is unavailable",async()=>{
    const h=setup();await queueOnlyIngest(msg(h.env),h.env);
    const ack=vi.fn(),retry=vi.fn();
    await queueOnlyConsume({messages:[{body:h.queued[0],ack,retry}]},h.env);
    expect(ack).not.toHaveBeenCalled();
    expect(retry).toHaveBeenCalledOnce();
  });
  it("forwards original signed time/bytes ONLY to disposable receiver and ACKs on committed digest",async()=>{
    const h=setup();await queueOnlyIngest(msg(h.env),h.env);
    h.env.EDGE_TEST_RELAY_ENABLED="1";
    const old=globalThis.fetch;
    const calls:any[]=[];
    globalThis.fetch=vi.fn(async(url,init)=>{
      calls.push({url:String(url),init});
      return new Response(JSON.stringify({persisted:true,sourceSha256:h.queued[0].rawSha256}),
        {status:200,headers:{"content-type":"application/json"}});
    }) as typeof fetch;
    try{
      const ack=vi.fn(),retry=vi.fn();
      await queueOnlyConsume({messages:[{body:h.queued[0],ack,retry}]},h.env);
      expect(ack).toHaveBeenCalledOnce();expect(retry).not.toHaveBeenCalled();
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe("https://sandbox.mock.invalid/__p2g-sandbox-verify");
      expect(new TextDecoder().decode(calls[0].init.body)).toBe(raw);
      const headers=calls[0].init.headers as Record<string,string>;
      expect(await verifyEdgeProvenanceV1({
        v:1,sessionId:session,receiptId:h.queued[0].receiptId,
        providerAttemptId:h.queued[0].providerAttemptId,
        sourceSha256:h.queued[0].rawSha256,
        edgeReceivedAtUtc:h.queued[0].firstEdgeReceivedAtUtc,
      },"h".repeat(64),headers["x-p2g-edge-provenance-hmac"],{
        sessionId:session,receiptId:h.queued[0].receiptId,
        sourceSha256:h.queued[0].rawSha256
      })).toBe(true);
    }finally{globalThis.fetch=old;}
  });
  it("stale queued message older than frozen 35-minute outage bound is never marked successfully processed",async()=>{
    const h=setup();await queueOnlyIngest(msg(h.env),h.env);
    h.env.EDGE_TEST_RELAY_ENABLED="1";
    const old=globalThis.fetch;
    const fake=vi.fn();
    globalThis.fetch=fake as typeof fetch;
    try{
      const ack=vi.fn(),retry=vi.fn();
      h.queued[0].firstEdgeReceivedAtUtc=new Date(Date.now()-36*60_000).toISOString();
      await queueOnlyConsume({messages:[{body:h.queued[0],ack,retry}]},h.env);
      expect(retry).toHaveBeenCalledOnce();
      expect(ack).not.toHaveBeenCalled();
      expect(fake).not.toHaveBeenCalled();
    }finally{globalThis.fetch=old;}
  });
  it("malformed or modified queued bytes cannot be acknowledged as valid",async()=>{
    const h=setup();await queueOnlyIngest(msg(h.env),h.env);
    h.env.EDGE_TEST_RELAY_ENABLED="1";
    const corrupted={...h.queued[0],rawBody:'{"incorrect":true}'};
    const ack=vi.fn(),retry=vi.fn();
    await queueOnlyConsume({messages:[{body:corrupted,ack,retry}]},h.env);
    expect(retry).toHaveBeenCalledOnce();expect(ack).not.toHaveBeenCalled();
  });
});
