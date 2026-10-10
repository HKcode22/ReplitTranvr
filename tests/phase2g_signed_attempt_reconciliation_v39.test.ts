import {describe,it,expect} from "vitest";
import {
  signSyntheticSenderFrameV39,
  verifySyntheticSenderFrameV39,
  reconcileSyntheticSignedAttemptsV39,
  type SyntheticSenderFrameV39,
  type SyntheticInternalDeliveryV39,
  type SignedSyntheticSenderFrameV39
} from "../experiments/phase2g_rehearsal/signed_attempt_reconciliation_v39";
import {
  createSyntheticDualSourceMessageV2,
  type DualSourceMessageV2
} from "../experiments/phase2g_rehearsal/dual_source_wire_canonical_receipt_v39";

const SESSION="12345678-1234-4234-8234-123456789abc";
const SUB="synthetic-owned-subscription";
const OWNER="e".repeat(64);
const EDGEKEY="test-edge-key-"+ "a".repeat(64);
const SENDERKEY="independent-test-sender-key-"+ "b".repeat(64);
const START=Date.parse("2026-10-12T03:00:00.000Z");
const END="2026-10-12T05:00:00.000Z";
const NOW="2026-10-12T05:01:00.000Z";
const at=(i:number)=>new Date(START+i*25_000).toISOString();
type Fixture={sender:SignedSyntheticSenderFrameV39;
  receipts:DualSourceMessageV2[];
  internal:SyntheticInternalDeliveryV39[];};
async function fixture(n=3):Promise<Fixture>{
  const receipts=await Promise.all(Array.from({length:n},async(_,i)=>{
    const raw={
      id:"fictional-provider-"+String(i).padStart(4,"0"),
      timestampUtc:at(i),
      subscription:{id:SUB},
      deliveryAttempt:{seqNo:0,costCredits:1,timestampUtc:at(i)},
      flights:[]
    };
    return createSyntheticDualSourceMessageV2({
      rawBytes:new TextEncoder().encode(JSON.stringify(raw)),
      sessionId:SESSION,expectedProviderSubscriptionId:SUB,
      trustedReceivedAtUtc:at(i),
      privateEdgeSigningKey:EDGEKEY
    });
  }));
  const frame:SyntheticSenderFrameV39={
    schema:"v39.phase2g-synthetic-independent-sender.v1",
    mode:"synthetic-only",
    sessionId:SESSION,providerSubscriptionId:SUB,
    ownerFrozenRunSha256:OWNER,
    windowStartUtc:at(0),windowEndUtc:END,
    attempts:receipts.map(x=>({
      attemptKey:x.receipt.attemptKey,
      notificationId:x.receipt.notificationId,
      attemptSeqNo:x.receipt.attemptSeqNo,
      providerAttemptUtc:x.receipt.providerAttemptUtc,
      providerGeneratedUtc:x.receipt.providerGeneratedUtc,
      wireSha256:x.receipt.wireSha256,
      canonicalSha256:x.receipt.canonicalSha256,
      syntheticCostCredits:x.receipt.syntheticCostCredits,
      senderResponseStatus:200,senderResponseElapsedMs:320
    }))
  };
  return {
    sender:signSyntheticSenderFrameV39(frame,SENDERKEY),
    receipts,
    internal:receipts.map(x=>({
      attemptKey:x.receipt.attemptKey,
      canonicalSha256:x.receipt.canonicalSha256,
      rawObjectReadbackSha256:x.receipt.canonicalSha256,
      originalEdgeReceivedUtc:x.receipt.firstEdgeReceivedAtUtc,
      syntheticCostCredits:x.receipt.syntheticCostCredits
    }))
  };
}
type Mutable<T>=T extends readonly (infer U)[] ? Mutable<U>[] :
  T extends object ? {-readonly [K in keyof T]:Mutable<T[K]>} : T;
const cloneFrame=(v:Fixture)=>JSON.parse(JSON.stringify(v.sender.frame)) as Mutable<SyntheticSenderFrameV39>;
const run=(v:Fixture)=>reconcileSyntheticSignedAttemptsV39({
  signedSender:v.sender,independentSenderKey:SENDERKEY,
  edgeSigningKey:EDGEKEY,
  expectedSessionId:SESSION,
  expectedProviderSubscriptionId:SUB,
  expectedOwnerFrozenRunSha256:OWNER,
  trustedAuditUtc:NOW,
  signedEdgeReceipts:v.receipts,
  committedInternal:v.internal
});
async function refused(v:Fixture,reason:string){
  const r=await run(v);
  expect(r.attemptEvidenceConsistent).toBe(false);
  expect(r.errors).toContain(reason);
  expect(r.scientificCompletionAuthorized).toBe(false);
  expect(r.automaticRecoveryAuthorized).toBe(false);
}
describe("P13/P14 independently signed SYNTHETIC provider-attempt accounting",()=>{
  it("matches exact sender/edge/internal attempt keys, SHA, original timestamps and costs without authorizing science",async()=>{
    const r=await run(await fixture(3));
    expect(r).toMatchObject({
      attemptedCredits:3,edgeCredits:3,internallyCommittedCredits:3,
      senderAttemptCount:3,verifiedEdgeAttemptCount:3,internalAttemptCount:3,
      attemptEvidenceConsistent:true,errors:[],
      scientificCompletionAuthorized:false,automaticRecoveryAuthorized:false
    });
    expect(r.sourceBuckets).toHaveLength(8);
    expect(r.sourceBuckets.reduce((a,b)=>a+b,0)).toBe(3);
  });
  it("does not count duplicate at-least-once relay as a new billed provider attempt",async()=>{
    const v=await fixture();
    v.receipts.push(v.receipts[0]);
    const r=await run(v);
    expect(r.attemptEvidenceConsistent).toBe(true);
    expect(r.edgeCredits).toBe(3);
    expect(r.verifiedEdgeAttemptCount).toBe(3);
  });
  it("the exact historical 260 sender credits versus 259 internal cannot pass, even with full signed edges",async()=>{
    const v=await fixture(260);
    v.internal.pop();
    const r=await run(v);
    expect([r.attemptedCredits,r.edgeCredits,r.internallyCommittedCredits])
      .toEqual([260,260,259]);
    expect(r.errors).toEqual(expect.arrayContaining([
      "SYNTHETIC_BILLED_CREDIT_GAP",
      "BILLED_SENDER_ATTEMPT_MISSING_INTERNAL",
      "SENDER_INTERNAL_CARDINALITY_MISMATCH"
    ]));
    expect(r.attemptEvidenceConsistent).toBe(false);
  },30000);
  it("detects equal-total but wrong internal attempt keys",async()=>{
    const v=await fixture();
    v.internal[1]={...v.internal[1],attemptKey:"c".repeat(64)};
    await refused(v,"BILLED_SENDER_ATTEMPT_MISSING_INTERNAL");
    const r=await run(v);
    expect(r.attemptedCredits).toBe(r.internallyCommittedCredits);
    expect(r.errors).toContain("INTERNAL_WITHOUT_AUTHENTICATED_EDGE");
  });
  it("detects a signed sender attempt absent from the edge, even though internal says committed",async()=>{
    const v=await fixture();
    v.receipts.pop();
    await refused(v,"BILLED_SENDER_ATTEMPT_MISSING_AT_EDGE");
  });
  it("rejects conflicting signed duplicate delivery of same attempt with shifted edge-first UTC",async()=>{
    const v=await fixture();
    const x=v.receipts[0];
    const newReceipt=await createSyntheticDualSourceMessageV2({
      rawBytes:new TextEncoder().encode(x.rawBody),
      sessionId:SESSION,expectedProviderSubscriptionId:SUB,
      trustedReceivedAtUtc:"2026-10-12T03:00:04.000Z",
      privateEdgeSigningKey:EDGEKEY
    });
    v.receipts.push(newReceipt);
    await refused(v,"EDGE_DUPLICATE_CONFLICT");
  });
  it("detects sender-wire mismatch even when the forged sender ledger was resigned",async()=>{
    const v=await fixture();
    const altered=cloneFrame(v);
    altered.attempts[1].wireSha256="f".repeat(64);
    v.sender=signSyntheticSenderFrameV39(altered,SENDERKEY);
    await refused(v,"SENDER_EDGE_ATTEMPT_IDENTITY_OR_HASH_MISMATCH");
  });
  it("detects internal raw readback SHA mismatch and source-clock drift independently",async()=>{
    const v=await fixture();
    v.internal[1]={...v.internal[1],rawObjectReadbackSha256:"0".repeat(64)};
    await refused(v,"INTERNAL_CANONICAL_SHA_OR_READBACK_MISMATCH");
    const w=await fixture();
    w.internal[0]={...w.internal[0],originalEdgeReceivedUtc:"2026-10-12T03:02:00.000Z"};
    await refused(w,"INTERNAL_ORIGINAL_SOURCE_UTC_SHIFTED");
  });
  it("rejects two internal credits for one attempt even if total cost seems correct",async()=>{
    const v=await fixture();
    v.internal.push({...v.internal[0]});
    await refused(v,"DUPLICATE_INTERNAL_PROVIDER_ATTEMPT");
  });
  it("rejects sender-side timely ACK failures despite later internal durable commit",async()=>{
    const v=await fixture();
    const altered=cloneFrame(v);
    altered.attempts[2].senderResponseStatus=0;
    altered.attempts[2].senderResponseElapsedMs=10001;
    v.sender=signSyntheticSenderFrameV39(altered,SENDERKEY);
    await refused(v,"SENDER_TIMELY_ACK_NOT_PROVEN");
  });
  it("refuses all unapproved provider retry attempts in current frozen zero-retry Stage-1",async()=>{
    const v=await fixture();
    const altered=cloneFrame(v);
    altered.attempts[1].attemptSeqNo=1;
    v.sender=signSyntheticSenderFrameV39(altered,SENDERKEY);
    await refused(v,"PROVIDER_RETRY_NOT_AUTHORIZED_BY_FROZEN_STAGE1");
  });
  it("rejects tampered independent-sender manifest signature and wrong frozen owner binding",async()=>{
    const v=await fixture();
    const altered=cloneFrame(v);
    altered.attempts[0].syntheticCostCredits=0;
    const forged={frame:altered,signature:v.sender.signature};
    await expect(run({...v,sender:forged})).rejects.toThrow(
      "INDEPENDENT_SENDER_SIGNATURE_INVALID"
    );
    const b=await fixture();
    const replacement=cloneFrame(b);
    replacement.ownerFrozenRunSha256="f".repeat(64);
    b.sender=signSyntheticSenderFrameV39(replacement,SENDERKEY);
    await expect(run(b)).rejects.toThrow(
      "INDEPENDENT_SENDER_FROZEN_CONTEXT_MISMATCH"
    );
  });
  it("refuses modified edge bytes and signed evidence older than the bounded audit window",async()=>{
    const v=await fixture();
    const e=v.receipts[0];
    v.receipts[0]={...e,rawBody:e.rawBody+" "};
    await refused(v,"EDGE_RECEIPT_AUTH_OR_SOURCE_INVALID");
    const old=await fixture();
    const r=await reconcileSyntheticSignedAttemptsV39({
      signedSender:old.sender,independentSenderKey:SENDERKEY,
      edgeSigningKey:EDGEKEY,expectedSessionId:SESSION,
      expectedProviderSubscriptionId:SUB,
      expectedOwnerFrozenRunSha256:OWNER,
      trustedAuditUtc:"2026-10-14T05:01:00.000Z",
      signedEdgeReceipts:old.receipts,committedInternal:old.internal
    }).catch(e=>e);
    expect(r).toBeInstanceOf(Error);
    expect(r.message).toBe("SYNTHETIC_AUDIT_TIME_OUT_OF_BOUNDS");
  });
});