import {describe,it,expect} from "vitest";
import {
  createSyntheticDualSourceMessageV2,
  verifySyntheticDualSourceMessageV2,
  legacyV39CanonicalJsonV2,
  assertNoDuplicateJsonObjectKeysV2,
} from "../experiments/phase2g_rehearsal/dual_source_wire_canonical_receipt_v39";

const sess="12345678-1234-4234-8234-123456789abc";
const sub="synthetic-owned-subscription";
const secret="synthetic-private-edge-secret-".padEnd(72,"z");
const received="2026-10-12T03:01:02.000Z";
const now="2026-10-12T03:01:06.000Z";
const wire='{\n "subscription":{"id":"'+sub+'"}, "id":"synth-notice-1",'+
  '"flights":[],"timestampUtc":"2026-10-12T03:01:00.000Z",'+
  '"deliveryAttempt":{"seqNo":0,"costCredits":1,"timestampUtc":"2026-10-12T03:01:01.000Z"} \n}';
const te=new TextEncoder();
function make(body=wire,context:Partial<Parameters<typeof createSyntheticDualSourceMessageV2>[0]>={}){
  return createSyntheticDualSourceMessageV2({
    rawBytes:te.encode(body),sessionId:sess,
    expectedProviderSubscriptionId:sub,
    privateEdgeSigningKey:secret,trustedReceivedAtUtc:received,
    ...context
  });
}
function verify(m:Awaited<ReturnType<typeof make>>,changes:Partial<Parameters<typeof verifySyntheticDualSourceMessageV2>[0]>={}){
  return verifySyntheticDualSourceMessageV2({
    message:m,expectedSessionId:sess,expectedProviderSubscriptionId:sub,
    trustedNowUtc:now,privateEdgeSigningKey:secret,...changes
  });
}
async function fails(p:Promise<unknown>,fragment:string){
  await expect(p).rejects.toThrow(fragment);
}

describe("V3.9 F.8 synthetic source-wire and canonical-JSON dual-attestation (NOT DEPLOYED)",()=>{
  it("verifies BOTH independent raw-wire and legacy canonical content SHA256, signed source first time",async()=>{
    const m=await make();
    const verified=await verify(m);
    expect(verified).toMatchObject({verified:true,firstEdgeReceivedAtUtc:received});
    expect(m.receipt.wireSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(m.receipt.canonicalSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(m.receipt.wireSha256).not.toBe(m.receipt.canonicalSha256);
    expect(m.receipt.wireBytes).toBe(te.encode(wire).length);
    expect(m.receipt.syntheticCostCredits).toBe(1);
    expect(m.rawBody).toBe(wire);
    expect(JSON.parse(wire).id).toBe(m.receipt.notificationId);
  });

  it("P14 retains ONE signed provider attempt containing FIVE physical flight items and FIVE billable credits",async()=>{
    const body=JSON.parse(wire);
    body.flights=Array.from({length:5},(_,i)=>({id:"synthetic-flight-"+i}));
    body.deliveryAttempt.costCredits=5;
    const m=await make(JSON.stringify(body));
    expect(m.receipt.syntheticCostCredits).toBe(5);
    expect(m.receipt.attemptSeqNo).toBe(0);
    expect((await verify(m)).verified).toBe(true);
    // A signed edge observation MUST NOT accept 1 credit for five
    // original provider flight items merely because the webhook count is 1.
    body.deliveryAttempt.costCredits=1;
    await fails(make(JSON.stringify(body)),
      "SOURCE_FLIGHT_ITEM_CREDIT_COUNT_MISMATCH");
    body.deliveryAttempt.costCredits=6;
    await fails(make(JSON.stringify(body)),
      "SOURCE_FLIGHT_ITEM_CREDIT_COUNT_MISMATCH");
  });

  it("equivalent JSON whitespace or key order yields same legacy canonical SHA but DIFFERENT original-wire SHA",async()=>{
    const pretty=await make();
    const minified=await make(JSON.stringify(JSON.parse(wire)));
    expect(pretty.receipt.canonicalSha256).toBe(minified.receipt.canonicalSha256);
    expect(pretty.receipt.wireSha256).not.toBe(minified.receipt.wireSha256);
    expect(pretty.receipt.attemptKey).toBe(minified.receipt.attemptKey);
    expect(pretty.receipt.receiptId).not.toBe(minified.receipt.receiptId);
    expect((await verify(pretty)).verified).toBe(true);
    expect((await verify(minified)).verified).toBe(true);
  });

  it("legacy canonicalizer keeps original V3.9 sorted JSON, arrays and nested objects",()=>{
    expect(legacyV39CanonicalJsonV2({z:1,a:{q:2,b:[{z:"é",a:3},null]}}))
      .toBe('{"a":{"b":[{"a":3,"z":"é"},null],"q":2},"z":1}');
  });

  it("rejects body modification on relay, even if signed receipt itself was valid",async()=>{
    const m=await make();
    await fails(verify({...m,rawBody:m.rawBody.replace('"seqNo":0','"seqNo":9')}),"SOURCE_DUAL_HASH_OR_ATTEMPT_CONFLICT");
  });

  it("rejects spoofed first trusted receipt timestamp, wire SHA or signed attempt number",async()=>{
    const m=await make();
    await fails(verify({...m,receipt:{...m.receipt,firstEdgeReceivedAtUtc:"2026-10-12T03:00:00.000Z"}}),
      "SOURCE_SIGNATURE_INVALID");
    await fails(verify({...m,receipt:{...m.receipt,wireSha256:"f".repeat(64)}}),
      "SOURCE_SIGNATURE_INVALID");
    await fails(verify({...m,receipt:{...m.receipt,attemptSeqNo:1}}),
      "SOURCE_SIGNATURE_INVALID");
  });

  it("refuses wrong signing key or different intended session and subscription",async()=>{
    const m=await make();
    await fails(verify(m,{privateEdgeSigningKey:"other-private-".padEnd(72,"q")}),"SOURCE_SIGNATURE_INVALID");
    await fails(verify(m,{expectedSessionId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}),
      "SOURCE_RECEIPT_CONTEXT_MISMATCH");
    await fails(verify(m,{expectedProviderSubscriptionId:"fake-wrong"}),
      "SOURCE_RECEIPT_CONTEXT_MISMATCH");
  });

  it("rejects stale/future time or malicious huge backlog window",async()=>{
    const m=await make();
    await fails(verify(m,{trustedNowUtc:"2026-10-12T03:37:00.000Z"}),"SOURCE_RECEIPT_TOO_OLD_OR_FUTURE");
    await fails(verify(m,{trustedNowUtc:"2026-10-12T03:00:00.000Z"}),"SOURCE_RECEIPT_TOO_OLD_OR_FUTURE");
    await fails(verify(m,{maxBacklogSeconds:86401}),"SOURCE_BACKLOG_WINDOW_INVALID");
  });

  it("detects plain duplicate JSON object keys, including escaped equivalent nested keys",async()=>{
    const bad=wire.replace('"id":"synth-notice-1"', '"id":"good","id":"bad"');
    await fails(make(bad),"SOURCE_DUPLICATE_JSON_KEY");
    // A JSON parser by itself silently accepts both and retains last value.
    const nested=wire.replace('"seqNo":0','"seqNo":0,"\\u0073eqNo":1');
    await fails(make(nested),"SOURCE_DUPLICATE_JSON_KEY");
    expect(()=>assertNoDuplicateJsonObjectKeysV2('{"a":{"id":1},"b":{"id":2}}'))
      .not.toThrow();
  });

  it("rejects invalid JSON, invalid UTF-8, and non-object JSON body",async()=>{
    await fails(make('{"id":'),"SOURCE_JSON_INVALID_UTF8_OR_SYNTAX");
    await fails(make('[1,2,3]'),"SOURCE_JSON_INVALID_UTF8_OR_SYNTAX");
    await fails(createSyntheticDualSourceMessageV2({
      rawBytes:new Uint8Array([0xc3,0x28]),sessionId:sess,
      expectedProviderSubscriptionId:sub,trustedReceivedAtUtc:received,
      privateEdgeSigningKey:secret
    }),"SOURCE_JSON_INVALID_UTF8_OR_SYNTAX");
  });

  it("rejects missing pinned notification id, provider attempt seq/credit and mismatched subscription",async()=>{
    await fails(make(wire.replace('"seqNo":0','"seqNo":null')),"SOURCE_PINNED_ATTEMPT_CONTRACT_INVALID");
    await fails(make(wire.replace('"costCredits":1','"costCredits":-1')),"SOURCE_PINNED_ATTEMPT_CONTRACT_INVALID");
    await fails(make(wire.replace('"id":"synth-notice-1"', '"id":null')),"SOURCE_PINNED_ATTEMPT_CONTRACT_INVALID");
    await fails(make(wire.replace(sub,"other-synthetic-sub")),"SOURCE_PINNED_ATTEMPT_CONTRACT_INVALID");
  });

  it("rejects source oversize and dangerous deep JSON nesting before hashing",async()=>{
    await fails(make(wire,{maxWireBytes:40}),"SOURCE_WIRE_SIZE_EXCEEDED");
    await fails(make(wire,{maxWireBytes:130_000}),"SOURCE_WIRE_LIMIT_INVALID");
    const nested='['.repeat(66)+'0'+']'.repeat(66);
    await fails(make(wire.replace('[]',nested)),"SOURCE_JSON_NESTING_EXCEEDED");
  });

  it("remains explicitly test-only and never accepts arbitrary runtime mode or provider billing",async()=>{
    const m=await make();
    expect(m.receipt.mode).toBe("synthetic-only");
    await fails(verify({...m,receipt:{...m.receipt,mode:"paid" as "synthetic-only"}}),
      "SOURCE_RECEIPT_SCHEMA_INVALID");
    expect(m).not.toHaveProperty("providerApiKey");
    expect(m).not.toHaveProperty("providerRequestUrl");
  });
});
