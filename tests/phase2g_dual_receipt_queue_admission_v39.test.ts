import {describe,it,expect,vi} from "vitest";
import {
  SyntheticDualQueueAdmissionV2,
  verifyQueuedSyntheticSourceBeforeReplayV2
} from "../experiments/phase2g_rehearsal/synthetic_dual_receipt_queue_admission_v39";
import type {DualSourceMessageV2} from "../experiments/phase2g_rehearsal/dual_source_wire_canonical_receipt_v39";

const session="12345678-1234-4234-8234-123456789abc",sub="synthetic-owned-subscription",
  secret="synthetic-only-".padEnd(64,"k");
const t1="2026-10-12T03:01:02.000Z",t2="2026-10-12T03:02:20.000Z",
  now="2026-10-12T03:03:02.000Z";
const enc=new TextEncoder();
function wire(id="noti-1",n=0){
  return JSON.stringify({
    subscription:{id:sub},id,timestampUtc:"2026-10-12T03:01:00.000Z",
    deliveryAttempt:{seqNo:n,costCredits:1,timestampUtc:"2026-10-12T03:01:01.000Z"},
    flights:[]
  });
}
function source(text:string,received=t1){
  return {rawBytes:enc.encode(text),sessionId:session,
    expectedProviderSubscriptionId:sub,trustedReceivedAtUtc:received,
    privateEdgeSigningKey:secret};
}
function fixture(){
  const messages:DualSourceMessageV2[]=[];
  let fail=false;
  let delay=0;
  const send=vi.fn(async(m:DualSourceMessageV2)=>{
    if(delay)await new Promise(r=>setTimeout(r,delay));
    if(fail)throw new Error("SYNTHETIC_QUEUE_UNAVAILABLE");
    messages.push(m);
  });
  const gate=new SyntheticDualQueueAdmissionV2({send});
  return {gate,send,messages,setFail(x:boolean){fail=x},setDelay(ms:number){delay=ms}};
}

describe("Phase2G no-Cloudflare synthetic first-edge dual-hash Queue admission",()=>{
  it("only ACKs after full message accepted, preserves first edge UTC and both hashes",async()=>{
    const f=fixture();const a=await f.gate.admit(source(wire()));
    expect(a).toMatchObject({ackAfterQueueAcceptance:true,duplicate:false});
    expect(f.send).toHaveBeenCalledOnce();
    const message=f.messages[0];
    expect(message.receipt).toEqual(a.receipt);
    expect(message.receipt.firstEdgeReceivedAtUtc).toBe(t1);
    expect(message.receipt.canonicalSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(message.receipt.wireSha256).toMatch(/^[a-f0-9]{64}$/);
    const proved=await verifyQueuedSyntheticSourceBeforeReplayV2({
      message,privateEdgeSigningKey:secret,sessionId:session,
      providerSubscriptionId:sub,trustedNowUtc:now
    });
    expect(proved).toMatchObject({
      validated:true,originalEdgeReceivedAtUtc:t1,
      legacyV39CanonicalSha256:a.receipt.canonicalSha256
    });
  });
  it("never returns acknowledged success when Queue refuses full payload",async()=>{
    const f=fixture();f.setFail(true);
    await expect(f.gate.admit(source(wire()))).rejects.toThrow("SYNTHETIC_QUEUE_UNAVAILABLE");
    expect(f.gate.locallyRememberedAttempts).toBe(0);
    expect(f.messages).toHaveLength(0);
    f.setFail(false);
    expect((await f.gate.admit(source(wire()))).duplicate).toBe(false);
    expect(f.messages).toHaveLength(1);
  });
  it("parallel same-attempt admission sends ONCE, both ACK only after Queue promise settles",async()=>{
    const f=fixture();f.setDelay(80);
    const [a,b]=await Promise.all([
      f.gate.admit(source(wire(),t1)),f.gate.admit(source(wire(),t2))
    ]);
    expect([a.duplicate,b.duplicate].sort()).toEqual([false,true]);
    expect(f.send).toHaveBeenCalledOnce();
    expect(f.messages).toHaveLength(1);
    expect(a.receipt.receiptId).toBe(b.receipt.receiptId);
    expect(a.receipt.firstEdgeReceivedAtUtc).toBe(t1);
    expect(b.receipt.firstEdgeReceivedAtUtc).toBe(t1);
  });
  it("repeated parallel competing arrivals preserve the first invoked timestamp despite async signing",async()=>{
    for(let i=0;i<20;i++){
      const f=fixture();f.setDelay(1);
      const [a,b]=await Promise.all([
        f.gate.admit(source(wire("same-"+i),t1)),
        f.gate.admit(source(wire("same-"+i),t2))
      ]);
      expect([a.duplicate,b.duplicate]).toEqual([false,true]);
      expect(f.send).toHaveBeenCalledOnce();
      expect(f.messages).toHaveLength(1);
      expect(f.messages[0].receipt.firstEdgeReceivedAtUtc).toBe(t1);
      expect(a.receipt.firstEdgeReceivedAtUtc).toBe(t1);
      expect(b.receipt.firstEdgeReceivedAtUtc).toBe(t1);
    }
  });
  it("parallel same-attempt different-wire cannot smuggle a conflicting body behind the first in-flight receipt",async()=>{
    const f=fixture();f.setDelay(20);
    const pretty=JSON.stringify(JSON.parse(wire("conflict")),null,2);
    const first=f.gate.admit(source(wire("conflict"),t1));
    const second=f.gate.admit(source(pretty,t2));
    const a=await first;
    expect(a.duplicate).toBe(false);
    await expect(second).rejects.toThrow("SOURCE_ATTEMPT_CONFLICT_REFUSED");
    expect(f.messages).toHaveLength(1);
    expect(f.messages[0].receipt.firstEdgeReceivedAtUtc).toBe(t1);
  });
  it("parallel callers never ACK when the first Queue admission fails; next attempt may retry cleanly",async()=>{
    const f=fixture();f.setFail(true);f.setDelay(5);
    const results=await Promise.allSettled([
      f.gate.admit(source(wire("queue-fail"),t1)),
      f.gate.admit(source(wire("queue-fail"),t2))
    ]);
    expect(results.every(x=>x.status==="rejected")).toBe(true);
    expect(f.messages).toHaveLength(0);
    expect(f.gate.locallyRememberedAttempts).toBe(0);
    f.setFail(false);
    const later=await f.gate.admit(source(wire("queue-fail"),t2));
    expect(later.duplicate).toBe(false);
    expect(f.messages).toHaveLength(1);
  });
  it("same attempt with different source wire format is NOT silently admitted",async()=>{
    const f=fixture();const pretty=JSON.stringify(JSON.parse(wire()),null,2);
    await f.gate.admit(source(wire()));
    await expect(f.gate.admit(source(pretty,t2)))
      .rejects.toThrow("SOURCE_ATTEMPT_CONFLICT_REFUSED");
    expect(f.send).toHaveBeenCalledOnce();
  });
  it("distinct notification or attempt sequence yields distinct ledger receipt",async()=>{
    const f=fixture();
    const a=await f.gate.admit(source(wire("n-1",0)));
    const b=await f.gate.admit(source(wire("n-1",1)));
    const c=await f.gate.admit(source(wire("n-2",0)));
    expect(new Set([a.receipt.attemptKey,b.receipt.attemptKey,c.receipt.attemptKey]).size).toBe(3);
    expect(f.gate.locallyRememberedAttempts).toBe(3);
    expect(f.messages).toHaveLength(3);
  });
  it("consumer refuses changing source wire but keeping signed old receipt",async()=>{
    const f=fixture();await f.gate.admit(source(wire()));
    const m=f.messages[0];
    const modified={...m,rawBody:m.rawBody.replace('"seqNo":0','"seqNo":8')};
    await expect(verifyQueuedSyntheticSourceBeforeReplayV2({
      message:modified,privateEdgeSigningKey:secret,sessionId:session,
      providerSubscriptionId:sub,trustedNowUtc:now
    })).rejects.toThrow("SOURCE_DUAL_HASH_OR_ATTEMPT_CONFLICT");
  });
  it("source Queue message serialization cap, not just raw-byte cap, stops overexpanded JSON",async()=>{
    const f=fixture();
    // Escaped control characters inflate the Queues JSON envelope.
    const base=JSON.parse(wire());
    base.padding="\n".repeat(45_000);
    await expect(f.gate.admit({...source(JSON.stringify(base),t1),maxWireBytes:120_000}))
      .rejects.toThrow("SOURCE_QUEUE_SERIALIZED_OVERFLOW");
    expect(f.messages).toHaveLength(0);
  });
  it("in-memory receipt map does NOT survive a new process: duplicate can be requeued, so durable idempotency still required",async()=>{
    const f=fixture();const first=await f.gate.admit(source(wire()));
    const secondProcess=new SyntheticDualQueueAdmissionV2({send:f.send});
    const second=await secondProcess.admit(source(wire(),t2));
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(false);
    expect(f.messages).toHaveLength(2);
    expect(first.receipt.attemptKey).toBe(second.receipt.attemptKey);
    expect(first.receipt.firstEdgeReceivedAtUtc).not.toBe(second.receipt.firstEdgeReceivedAtUtc);
    // Must not promote this prototype to live without independently durable
    // first-arrival identity and downstream exact-once scientific receipt.
  });
});
