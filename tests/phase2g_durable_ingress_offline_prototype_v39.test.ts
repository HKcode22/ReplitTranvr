import {describe,it,expect} from "vitest";
import {
  admitSyntheticWebhook,classifySyntheticIngressHealth,
  type DurableReceiptStore,type DurableQueue,type Receipt
} from "../experiments/phase2g_durable_ingress_offline_prototype_v39";

const enc=(s:string)=>new TextEncoder().encode(s);
function fake(){
  const receipts=new Map<string,Receipt>();
  const bytes=new Map<string,Uint8Array>();
  const pointers:string[]=[];
  const events:string[]=[];
  let rawFail=false,queueFail=false;
  const store:DurableReceiptStore={
    async putIfAbsent(r,raw){
      events.push("WRITE_DURABLE_RAW_AND_MANIFEST");
      if(rawFail)throw new Error("fake_store_unavailable");
      if(!receipts.has(r.receiptId)){
        receipts.set(r.receiptId,r);
        bytes.set(r.receiptId,new Uint8Array(raw));
      }
      return receipts.get(r.receiptId)!;
    }
  };
  const queue:DurableQueue={
    async send(id){
      events.push("QUEUE_SEND_DURABLE_POINTER");
      if(queueFail)throw new Error("fake_queue_unavailable");
      pointers.push(id);
    }
  };
  const input={
    sessionId:"offline-session-1",providerAttemptId:"notif-1:attempt-0",
    raw:enc('{"notification":"n1","flights":[{"id":"fictional"}]}'),
    authorized:true,edgeNowUtc:"2026-10-12T03:10:00.000Z"
  };
  return {store,queue,input,events,pointers,receipts,bytes,
    failStore:(v:boolean)=>{rawFail=v},failQueue:(v:boolean)=>{queueFail=v}};
}

describe("Phase2G durable frontdoor only offline prototype",()=>{
  it("2xx only after raw/manifest and queue pointer are durably accepted",async()=>{
    const h=fake();
    const x=await admitSyntheticWebhook(h.input,h.store,h.queue);
    expect(x.http).toBe(200);
    expect(x.reason).toBe("durable_and_enqueued");
    expect(h.events).toEqual(["WRITE_DURABLE_RAW_AND_MANIFEST","QUEUE_SEND_DURABLE_POINTER"]);
    expect(h.receipts.size).toBe(1);
    expect(h.bytes.get(x.receiptId!)!.byteLength).toBe(h.input.raw.byteLength);
  });
  it("a Replit-process retry retains the FIRST edge source timestamp and original receipt ID",async()=>{
    const h=fake();
    const a=await admitSyntheticWebhook(h.input,h.store,h.queue);
    const b=await admitSyntheticWebhook({...h.input,edgeNowUtc:"2026-10-12T04:25:00.000Z"},h.store,h.queue);
    expect(a.http).toBe(200);expect(b.http).toBe(200);
    expect(a.receiptId).toBe(b.receiptId);
    expect(h.receipts.size).toBe(1);
    expect(h.receipts.get(a.receiptId!)!.edgeReceivedAtUtc).toBe("2026-10-12T03:10:00.000Z");
    expect(h.pointers).toHaveLength(2); // at-least-once, consumer must dedupe
  });
  it("an edge object store fault returns 503, never a success ACK",async()=>{
    const h=fake();h.failStore(true);
    const a=await admitSyntheticWebhook(h.input,h.store,h.queue);
    expect(a.http).toBe(503);expect(h.pointers).toHaveLength(0);
    expect(h.receipts.size).toBe(0);
  });
  it("queue failure returns 503 despite stored raw bytes; a retry can recover",async()=>{
    const h=fake();h.failQueue(true);
    const a=await admitSyntheticWebhook(h.input,h.store,h.queue);
    expect(a.http).toBe(503);expect(h.receipts.size).toBe(1);
    expect(h.pointers).toHaveLength(0);
    h.failQueue(false);
    const b=await admitSyntheticWebhook({...h.input,edgeNowUtc:"2026-10-12T03:12:00Z"},h.store,h.queue);
    expect(b.http).toBe(200);expect(h.receipts.size).toBe(1);
    expect(h.receipts.get(b.receiptId!)!.edgeReceivedAtUtc).toBe("2026-10-12T03:10:00.000Z");
  });
  it("invalid credentials, oversized body and malformed input never reach storage",async()=>{
    const h=fake();
    expect((await admitSyntheticWebhook({...h.input,authorized:false},h.store,h.queue)).http).toBe(403);
    expect((await admitSyntheticWebhook({...h.input,sessionId:".. bad"},h.store,h.queue)).http).toBe(400);
    expect((await admitSyntheticWebhook({...h.input,raw:new Uint8Array(2*1024*1024+1)},h.store,h.queue)).http).toBe(413);
    expect(h.events).toEqual([]);
  });
  it("distinguishes provider-delivery retry attempt from internal relay retry",async()=>{
    const h=fake();
    const a=await admitSyntheticWebhook(h.input,h.store,h.queue);
    const b=await admitSyntheticWebhook({...h.input,providerAttemptId:"notif-1:attempt-1"},h.store,h.queue);
    expect(a.receiptId).not.toBe(b.receiptId);
    expect(h.receipts.size).toBe(2); // provider attempts separately accounted
    const c=await admitSyntheticWebhook({...h.input,edgeNowUtc:"2026-10-12T05:11:00Z"},h.store,h.queue);
    expect(a.receiptId).toBe(c.receiptId); // relay retry does NOT create a provider send
  });
  it("classifies durable backup when Replit dies but hard-stops storage/queue failure or stale backlog",()=>{
    const healthy={
      edgeAvailable:true,rawStoreAvailable:true,queueAvailable:true,
      replitAvailable:true,oldestBacklogAgeSeconds:20,allowedBacklogAgeSeconds:90
    };
    expect(classifySyntheticIngressHealth(healthy)).toBe("HEALTHY");
    expect(classifySyntheticIngressHealth({...healthy,replitAvailable:false})).toBe("DEGRADED_BUT_DURABLE");
    expect(classifySyntheticIngressHealth({...healthy,replitAvailable:false,queueAvailable:false})).toBe("FAIL_CLOSED");
    expect(classifySyntheticIngressHealth({...healthy,replitAvailable:false,rawStoreAvailable:false})).toBe("FAIL_CLOSED");
    expect(classifySyntheticIngressHealth({...healthy,replitAvailable:false,oldestBacklogAgeSeconds:91})).toBe("FAIL_CLOSED");
  });
});
