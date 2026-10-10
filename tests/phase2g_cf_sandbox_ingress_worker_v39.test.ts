import { verifyEdgeProvenanceV1 } from "../experiments/phase2g_cf_sandbox_ingress/provenance";
import {describe,it,expect,vi} from "vitest";
import {
 ingest,consume,scanUnfinished,type Env
} from "../experiments/phase2g_cf_sandbox_ingress/worker";
import {createHash} from "node:crypto";

const secret="s".repeat(40);
const session="12345678-1234-4234-8234-123456789abc";
const testUrl="https://edge.sandbox.invalid/api/v1/webhooks/aerodatabox/"+secret+"/prepaid/"+session;
const raw=JSON.stringify({notificationId:"synthetic-n1",flights:[{id:"fictional-F1"}]});

function harness(){
  const map=new Map<string,{data:Uint8Array;etag:string}>();
  const messages:{receiptKey:string}[]=[];
  const events:string[]=[];
  let failPut=false,failSend=false,corruptRaw=false,consumerCalls=0;
  const enc=new TextEncoder();
  const bucket={
    async put(key:string,value:string|ArrayBuffer|Uint8Array,opt?:{onlyIf?:{etagDoesNotMatch?:string;etagMatches?:string}}){
      events.push("put:"+key.split("/")[1]);
      if(failPut)throw new Error("FAKE_R2_FAIL");
      if(opt?.onlyIf?.etagDoesNotMatch==="*"&&map.has(key))return null;
      if(opt?.onlyIf?.etagMatches&&map.get(key)?.etag!==opt.onlyIf.etagMatches)return null;
      const data=typeof value==="string"?enc.encode(value):new Uint8Array(value);
      const etag=createHash("md5").update(data).digest("hex");
      map.set(key,{data:new Uint8Array(data),etag});
      return {key,etag,size:data.length};
    },
    async head(key:string){
      const v=map.get(key);return v?{key,size:v.data.length,etag:v.etag}:null;
    },
    async get(key:string){
      const v=map.get(key);if(!v)return null;
      let data=v.data;
      if(corruptRaw&&key.includes("/raw/"))data=enc.encode("corrupted");
      return {
        key,size:data.byteLength,etag:v.etag,
        text:async()=>new TextDecoder().decode(data),
        arrayBuffer:async()=>data.slice().buffer
      };
    },
    async list(opts?:{prefix?:string;cursor?:string;limit?:number}){
      const items=[...map.keys()].filter(k=>k.startsWith(opts?.prefix??"")).sort();
      // Local deterministic mock pagination: opaque Cloudflare cursors are
      // simulated using the last seen object key, never sent to real R2.
      const available=opts?.cursor?items.filter(key=>key>opts.cursor!):items;
      const limit=opts?.limit??1000;
      const page=available.slice(0,limit);
      const truncated=available.length>page.length;
      return {
        objects:page.map(key=>({
          key,etag:map.get(key)!.etag,size:map.get(key)!.data.length
        })),
        truncated,cursor:truncated?page.at(-1):undefined
      };
    },
  };
  const env:Env={
    RAW:bucket,DELIVERY_QUEUE:{async send(v){events.push("queue:send");if(failSend)throw new Error("FAKE_QUEUE");messages.push(v)}},
    EDGE_EXECUTION_MODE:"synthetic-only",EDGE_TEST_SECRET:secret,EDGE_TEST_DIAGNOSTICS:"1",
    EDGE_ALLOW_SYNTHETIC_RELAY:"0",EDGE_SANDBOX_RECEIVER_ORIGIN:"https://sandbox.mock.invalid",
    EDGE_TEST_RECEIVER_PATH_SECRET:"t".repeat(40),
    EDGE_PROVENANCE_SIGNING_KEY:"k".repeat(64)
  };
  function request(options?:{attempt?:string;body?:string;secret?:string;method?:string;type?:string}){
    const url=testUrl.replace("/"+secret+"/","/"+(options?.secret??secret)+"/");
    return new Request(url,{
      method:options?.method??"POST",
      headers:{"content-type":options?.type??"application/json","x-p2g-synthetic-attempt-id":options?.attempt??"n1:0"},
      ...((options?.method??"POST")==="POST"?{body:options?.body??raw}:{})
    });
  }
  return {env,map,messages,events,request,bucket,
    putFail(v:boolean){failPut=v},sendFail(v:boolean){failSend=v},
    corrupt(v:boolean){corruptRaw=v},consumerCalls:()=>consumerCalls,
    incConsumer(){consumerCalls++}
  };
}

describe("P2G Stage-1 real Cloudflare Worker interface in-memory R2+Queues (NO LIVE DEPLOY)",()=>{
  it("HTTP 200 occurs only AFTER verified immutable raw, index and durable queue send",async()=>{
    const h=harness();
    const response=await ingest(h.request(),h.env);
    expect(response.status,await response.clone().text()).toBe(200);
    const result=await response.json() as {receiptId:string;durablyEnqueued:boolean;duplicate:boolean};
    expect(result.durablyEnqueued).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(h.map.size).toBe(2);
    expect(h.messages).toHaveLength(1);
    expect(h.events.filter(x=>x.startsWith("put:"))).toEqual(["put:raw","put:index"]);
    expect(h.events.at(-1)).toBe("queue:send");
  });

  it("same provider attempt is idempotent with first timestamp; different attempt is distinguishable",async()=>{
    const h=harness();
    const a=await (await ingest(h.request(),h.env)).json() as {receiptId:string};
    const indexKey=h.messages[0].receiptKey;
    const before=JSON.parse(new TextDecoder().decode(h.map.get(indexKey)!.data));
    const b=await (await ingest(h.request(),h.env)).json() as {receiptId:string;duplicate:boolean};
    const after=JSON.parse(new TextDecoder().decode(h.map.get(indexKey)!.data));
    expect(b.receiptId).toBe(a.receiptId);
    expect(b.duplicate).toBe(true);
    expect(after.firstEdgeReceivedAtUtc).toBe(before.firstEdgeReceivedAtUtc);
    expect(h.map.size).toBe(2);
    const c=await (await ingest(h.request({attempt:"n1:1"}),h.env)).json() as {receiptId:string};
    expect(c.receiptId).not.toBe(a.receiptId);
    expect(h.map.size).toBe(3);
  });

  it("same attempt with DIFFERENT body is rejected as conflict, not counted as 2xx",async()=>{
    const h=harness();
    expect((await ingest(h.request(),h.env)).status).toBe(200);
    const b=await ingest(h.request({body:JSON.stringify({notificationId:"altered",flights:[]})}),h.env);
    expect(b.status).toBe(409);
    expect(h.messages).toHaveLength(1);
  });

  it("R2 failure, queue failure, broken raw roundtrip all fail 503 before ACK",async()=>{
    const a=harness();a.putFail(true);
    expect((await ingest(a.request(),a.env)).status).toBe(503);
    expect(a.messages).toHaveLength(0);
    const b=harness();b.sendFail(true);
    expect((await ingest(b.request(),b.env)).status).toBe(503);
    expect(b.map.size).toBe(2);
    expect(b.messages).toHaveLength(0);
    const c=harness();c.corrupt(true);
    expect((await ingest(c.request(),c.env)).status).toBe(503);
    expect(c.messages).toHaveLength(0);
  });

  it("rejects wrong secret, media type, oversized body, invalid JSON and real traffic mode",async()=>{
    const h=harness();
    expect((await ingest(h.request({secret:"invalid"}),h.env)).status).toBe(404);
    expect((await ingest(h.request({type:"text/plain"}),h.env)).status).toBe(415);
    expect((await ingest(h.request({body:"not JSON"}),h.env)).status).toBe(400);
    expect((await ingest(h.request({body:" ".repeat(2*1024*1024+1)}),h.env)).status).toBe(413);
    expect(h.map.size).toBe(0);
    h.env.EDGE_EXECUTION_MODE="production";
    expect((await ingest(h.request(),h.env)).status).toBe(503);
  });

  it("queue consumer retries safely until authenticated sandbox receiver acknowledges persisted hash",async()=>{
    const h=harness();
    expect((await ingest(h.request(),h.env)).status).toBe(200);
    const ack=vi.fn(),retry=vi.fn();
    const batch={messages:[{body:h.messages[0],ack,retry}]};
    await consume(batch,h.env);
    expect(retry).toHaveBeenCalledTimes(1);expect(ack).not.toHaveBeenCalled();
    h.env.EDGE_ALLOW_SYNTHETIC_RELAY="1";
    const oldFetch=globalThis.fetch;const sent:{url:string,headers?:HeadersInit,body?:BodyInit|null}[]=[];
    globalThis.fetch=vi.fn(async(url,options)=>{
      sent.push({url:String(url),headers:options?.headers,body:options?.body});
      const receipt=JSON.parse(new TextDecoder().decode(h.map.get(h.messages[0].receiptKey)!.data));
      return new Response(JSON.stringify({persisted:true,sourceSha256:receipt.sourceSha256}),{
        status:200,headers:{"content-type":"application/json"}
      });
    }) as typeof fetch;
    try{
      await consume(batch,h.env);
      expect(ack).toHaveBeenCalledTimes(1);
      expect(sent).toHaveLength(1);
      expect(sent[0].url).toBe("https://sandbox.mock.invalid/__p2g-sandbox-verify");
      const headers=sent[0].headers as Record<string,string>;
      expect(headers["x-p2g-edge-received-at"]).toBeTruthy();
      const receipt=JSON.parse(new TextDecoder().decode(h.map.get(h.messages[0].receiptKey)!.data));
      const signed=await verifyEdgeProvenanceV1({
        v:1,sessionId:receipt.sessionId,receiptId:receipt.id,
        providerAttemptId:receipt.attemptId,
        sourceSha256:receipt.sourceSha256,
        edgeReceivedAtUtc:receipt.firstEdgeReceivedAtUtc
      },"k".repeat(64),headers["x-p2g-edge-provenance-hmac"],{
        sessionId:receipt.sessionId,receiptId:receipt.id,sourceSha256:receipt.sourceSha256
      });
      expect(signed).toBe(true);
      expect(h.map.size).toBe(3); // processed marker
      await consume(batch,h.env);
      expect(sent).toHaveLength(1);
    }finally{globalThis.fetch=oldFetch;}
  });

  it("scheduled outbox scanner re-enqueues an orphaned manifest after queue failure",async()=>{
    const h=harness();h.sendFail(true);
    const response=await ingest(h.request(),h.env);
    expect(response.status).toBe(503);
    expect(h.messages).toHaveLength(0);
    const indexKey=[...h.map.keys()].find(x=>x.includes("/index/"))!;
    const existing=JSON.parse(new TextDecoder().decode(h.map.get(indexKey)!.data));
    existing.firstEdgeReceivedAtUtc=new Date(Date.now()-5*60_000).toISOString();
    await h.bucket.put(indexKey,JSON.stringify(existing));
    h.sendFail(false);
    const stats=await scanUnfinished(h.env);
    expect(stats.scanned).toBe(1);
    expect(stats.requeued).toBe(1);
    expect(stats.errors).toBe(0);
    expect(h.messages[0].receiptKey).toBe(indexKey);
  });

  it("outbox scanner is bounded, no-op for unauthorized mode, ignores newly written receipt",async()=>{
    const h=harness();
    expect((await ingest(h.request(),h.env)).status).toBe(200);
    const a=await scanUnfinished(h.env);
    expect(a.requeued).toBe(0);
    h.env.EDGE_EXECUTION_MODE="disabled";
    const b=await scanUnfinished(h.env);
    expect(b).toEqual({scanned:0,requeued:0,errors:0});
  });
  it("P09/P12 forged processed marker NEVER makes Queue ACK or skips true source retry",async()=>{
    const h=harness();
    expect((await ingest(h.request(),h.env)).status).toBe(200);
    const receiptKey=h.messages[0].receiptKey;
    const processedKey=receiptKey.replace("/index/","/processed/");
    await h.bucket.put(processedKey,JSON.stringify({
      sourceSha256:"f".repeat(64),processedAtUtc:new Date().toISOString()
    }));
    h.env.EDGE_ALLOW_SYNTHETIC_RELAY="1";
    const ack=vi.fn(),retry=vi.fn();
    const oldFetch=globalThis.fetch;
    const fetchMock=vi.fn(async()=>new Response(JSON.stringify({
      persisted:true,sourceSha256:"f".repeat(64)
    }),{status:200}));
    globalThis.fetch=fetchMock as typeof fetch;
    try{
      await consume({messages:[{body:h.messages[0],ack,retry}]},h.env);
      expect(ack).not.toHaveBeenCalled();
      expect(retry).toHaveBeenCalledTimes(1);
      expect(fetchMock).not.toHaveBeenCalled();
    }finally{globalThis.fetch=oldFetch;}
  });

  it("P09/P12 processed marker must not conceal loss of original raw bytes",async()=>{
    const h=harness();
    expect((await ingest(h.request(),h.env)).status).toBe(200);
    const receiptKey=h.messages[0].receiptKey;
    const idx=JSON.parse(new TextDecoder().decode(h.map.get(receiptKey)!.data));
    await h.bucket.put(receiptKey.replace("/index/","/processed/"),
      JSON.stringify({
        v:1,receiptKey,receiptId:idx.id,
        sourceSha256:idx.sourceSha256,
        firstEdgeReceivedAtUtc:idx.firstEdgeReceivedAtUtc,
        receiverDurablyPersisted:true,processedAtUtc:new Date().toISOString()
      })
    );
    h.map.delete(idx.rawKey);
    const ack=vi.fn(),retry=vi.fn();
    await consume({messages:[{body:h.messages[0],ack,retry}]},h.env);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(ack).not.toHaveBeenCalled();
  });

  it("P09/P12 receiver 200 with matching SHA does not Queue ACK if processed marker durability fails",async()=>{
    const h=harness();
    expect((await ingest(h.request(),h.env)).status).toBe(200);
    h.env.EDGE_ALLOW_SYNTHETIC_RELAY="1";
    h.putFail(true); // force R2 failure only AFTER source ingress succeeded
    const idx=JSON.parse(new TextDecoder().decode(h.map.get(h.messages[0].receiptKey)!.data));
    const ack=vi.fn(),retry=vi.fn();
    const oldFetch=globalThis.fetch;
    globalThis.fetch=vi.fn(async()=>new Response(JSON.stringify({
      persisted:true,sourceSha256:idx.sourceSha256
    }),{status:200})) as typeof fetch;
    try{
      await consume({messages:[{body:h.messages[0],ack,retry}]},h.env);
      expect(ack).not.toHaveBeenCalled();
      expect(retry).toHaveBeenCalledTimes(1);
      expect(h.map.has(h.messages[0].receiptKey.replace("/index/","/processed/")))
        .toBe(false);
    }finally{globalThis.fetch=oldFetch;}
  });

  it("P09/P12 scanner treats a mismatched processed marker as error, never an accepted complete receipt",async()=>{
    const h=harness();
    expect((await ingest(h.request(),h.env)).status).toBe(200);
    const key=h.messages[0].receiptKey;
    const receipt=JSON.parse(new TextDecoder().decode(h.map.get(key)!.data));
    receipt.firstEdgeReceivedAtUtc=new Date(Date.now()-300_000).toISOString();
    await h.bucket.put(key,JSON.stringify(receipt));
    await h.bucket.put(key.replace("/index/","/processed/"),
      JSON.stringify({v:1,receiptKey:key,receiptId:receipt.id,
        sourceSha256:"0".repeat(64),
        firstEdgeReceivedAtUtc:receipt.firstEdgeReceivedAtUtc,
        processedAtUtc:new Date().toISOString(),receiverDurablyPersisted:true}));
    const before=h.messages.length;
    const stats=await scanUnfinished(h.env);
    expect(stats).toMatchObject({scanned:1,requeued:0,errors:1});
    expect(h.messages.length).toBe(before);
  });

  it("P09/P12 scanner refuses to requeue durable metadata when original raw object has vanished",async()=>{
    const h=harness();
    expect((await ingest(h.request(),h.env)).status).toBe(200);
    const key=h.messages[0].receiptKey;
    const receipt=JSON.parse(new TextDecoder().decode(h.map.get(key)!.data));
    receipt.firstEdgeReceivedAtUtc=new Date(Date.now()-300_000).toISOString();
    await h.bucket.put(key,JSON.stringify(receipt));
    h.map.delete(receipt.rawKey);
    const before=h.messages.length;
    const stats=await scanUnfinished(h.env);
    expect(stats).toMatchObject({scanned:1,requeued:0,errors:1});
    expect(h.messages.length).toBe(before);
  });

  it("P09/P12 verified processed marker survives duplicate Queue relay without second sandbox receiver POST",async()=>{
    const h=harness();
    expect((await ingest(h.request(),h.env)).status).toBe(200);
    h.env.EDGE_ALLOW_SYNTHETIC_RELAY="1";
    const receipt=JSON.parse(new TextDecoder().decode(h.map.get(h.messages[0].receiptKey)!.data));
    const ack=vi.fn(),retry=vi.fn();
    const oldFetch=globalThis.fetch;
    const fetched=vi.fn(async()=>new Response(JSON.stringify({
      persisted:true,sourceSha256:receipt.sourceSha256
    }),{status:200}));
    globalThis.fetch=fetched as typeof fetch;
    try{
      const batch={messages:[{body:h.messages[0],ack,retry}]};
      await consume(batch,h.env);
      expect(ack).toHaveBeenCalledTimes(1);
      expect(retry).not.toHaveBeenCalled();
      const markerKey=h.messages[0].receiptKey.replace("/index/","/processed/");
      const marker=JSON.parse(new TextDecoder().decode(h.map.get(markerKey)!.data));
      expect(marker).toMatchObject({
        v:1,receiptKey:h.messages[0].receiptKey,
        receiptId:receipt.id,
        sourceSha256:receipt.sourceSha256,
        firstEdgeReceivedAtUtc:receipt.firstEdgeReceivedAtUtc,
        receiverDurablyPersisted:true
      });
      await consume(batch,h.env);
      expect(ack).toHaveBeenCalledTimes(2);
      expect(fetched).toHaveBeenCalledTimes(1);
    }finally{globalThis.fetch=oldFetch;}
  });

  it("P12 351 receipt indexes: restarted bounded scanner advances its R2 cursor beyond first 300 processed, finds last orphan",async()=>{
    const h=harness();
    const bodyBytes=new TextEncoder().encode(raw);
    const sourceSha256=createHash("sha256").update(bodyBytes).digest("hex");
    const rawKey="p2g-sandbox/raw/"+sourceSha256+".json";
    await h.bucket.put(rawKey,bodyBytes);
    const indexKeys:string[]=[];
    const firstEdgeReceivedAtUtc=new Date(Date.now()-300_000).toISOString();
    for(let i=0;i<351;i++){
      const attemptId="attempt-"+String(i).padStart(4,"0");
      const id=createHash("sha256").update(session+"\n"+attemptId).digest("hex");
      const receiptKey="p2g-sandbox/index/"+id+".json";
      indexKeys.push(receiptKey);
      await h.bucket.put(receiptKey,JSON.stringify({
        v:1,id,sourceSha256,sessionId:session,
        attemptId,firstEdgeReceivedAtUtc,rawKey,rawBytes:bodyBytes.length
      }));
    }
    indexKeys.sort();
    // First 350 signed synthetic source receipts are already processed.
    // Lexically last one is an orphan after crash-before-Queue-enqueue.
    for(const key of indexKeys.slice(0,350)){
      const id=key.slice("p2g-sandbox/index/".length,-5);
      await h.bucket.put(key.replace("/index/","/processed/"),
        JSON.stringify({
          v:1,receiptKey:key,receiptId:id,sourceSha256,
          firstEdgeReceivedAtUtc,receiverDurablyPersisted:true,
          processedAtUtc:new Date().toISOString()
        }));
    }
    const first=await scanUnfinished(h.env);
    expect(first).toEqual({scanned:300,requeued:0,errors:0});
    expect(h.messages).toHaveLength(0);
    const cursorKey="p2g-sandbox/control/scanner-cursor-v1.json";
    const progress=JSON.parse(new TextDecoder().decode(h.map.get(cursorKey)!.data));
    expect(progress.v).toBe(1);
    expect(progress.cursor).toBeTruthy();
    const second=await scanUnfinished(h.env);
    expect(second).toEqual({scanned:51,requeued:1,errors:0});
    expect(h.messages).toEqual([{receiptKey:indexKeys[350]}]);
    const final=JSON.parse(new TextDecoder().decode(h.map.get(cursorKey)!.data));
    expect(final.cursor).toBe(null);
  });

  it("P12 corrupt durable scan cursor refuses to falsely advance/announce recovery",async()=>{
    const h=harness();
    await h.bucket.put("p2g-sandbox/control/scanner-cursor-v1.json",
      JSON.stringify({v:1,cursor:{"forged":true},observedAtUtc:"not UTC"}));
    expect(await scanUnfinished(h.env))
      .toEqual({scanned:0,requeued:0,errors:1});
    expect(h.messages).toHaveLength(0);
  });

  it("P12 uncommitted R2 checkpoint write signals error and cannot claim fully durable scanner cursor",async()=>{
    const h=harness();
    expect((await ingest(h.request(),h.env)).status).toBe(200);
    h.putFail(true);
    const s=await scanUnfinished(h.env);
    expect(s).toMatchObject({scanned:1,requeued:0,errors:1});
    expect(h.map.has("p2g-sandbox/control/scanner-cursor-v1.json")).toBe(false);
  });

});