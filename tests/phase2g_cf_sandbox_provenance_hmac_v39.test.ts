import {describe,it,expect} from "vitest";
import {
  signEdgeProvenanceV1,verifyEdgeProvenanceV1,envelopeCanonicalV1,
  type EdgeProvenanceV1
} from "../experiments/phase2g_cf_sandbox_ingress/provenance";

const secret="test-only-signing-key-"+"q".repeat(64);
const receipt:EdgeProvenanceV1={
  v:1,sessionId:"12345678-1234-4234-8234-123456789abc",
  receiptId:"a".repeat(64),providerAttemptId:"notification-1:0",
  sourceSha256:"b".repeat(64),
  edgeReceivedAtUtc:"2026-10-12T03:09:15.001Z"
};
const expected={
  sessionId:receipt.sessionId,receiptId:receipt.receiptId,
  sourceSha256:receipt.sourceSha256
};

describe("authenticated original edge receipt timing (sandbox, no secrets)",()=>{
  it("signs and verifies exact session, raw digest, receipt and first UTC time",async()=>{
    const signed=await signEdgeProvenanceV1(receipt,secret);
    expect(signed).toMatch(/^[a-f0-9]{64}$/);
    expect(await verifyEdgeProvenanceV1(receipt,secret,signed,expected)).toBe(true);
  });
  it("rejects forged earlier/later edge timestamp",async()=>{
    const signature=await signEdgeProvenanceV1(receipt,secret);
    expect(await verifyEdgeProvenanceV1({...receipt,edgeReceivedAtUtc:"2026-10-12T03:12:00.000Z"},
      secret,signature,expected)).toBe(false);
  });
  it("rejects altered notification attempt and raw source digest",async()=>{
    const sig=await signEdgeProvenanceV1(receipt,secret);
    expect(await verifyEdgeProvenanceV1({...receipt,providerAttemptId:"notification-1:1"},
      secret,sig,expected)).toBe(false);
    expect(await verifyEdgeProvenanceV1({...receipt,sourceSha256:"c".repeat(64)},
      secret,sig,expected)).toBe(false);
  });
  it("rejects different session, receipt or expected raw digest",async()=>{
    const sig=await signEdgeProvenanceV1(receipt,secret);
    expect(await verifyEdgeProvenanceV1(receipt,secret,sig,{
      ...expected,sourceSha256:"f".repeat(64)})).toBe(false);
    expect(await verifyEdgeProvenanceV1(receipt,secret,sig,{
      ...expected,receiptId:"f".repeat(64)})).toBe(false);
    expect(await verifyEdgeProvenanceV1(receipt,secret,sig,{
      ...expected,sessionId:"12345678-1234-4234-8234-123456789abd"})).toBe(false);
  });
  it("rejects corrupted HMAC and wrong signing key",async()=>{
    const sig=await signEdgeProvenanceV1(receipt,secret);
    expect(await verifyEdgeProvenanceV1(receipt,secret,"f".repeat(64),expected)).toBe(false);
    expect(await verifyEdgeProvenanceV1(receipt,"wrong-"+"y".repeat(60),sig,expected)).toBe(false);
    expect(await verifyEdgeProvenanceV1(receipt,secret,"nothex",expected)).toBe(false);
  });
  it("refuses invalid time, schema and short key",async()=>{
    expect(()=>envelopeCanonicalV1({...receipt,edgeReceivedAtUtc:"2026-10-12"})).toThrow("EDGE_PROVENANCE_INVALID");
    expect(()=>envelopeCanonicalV1({...receipt,v:2 as 1})).toThrow("EDGE_PROVENANCE_INVALID");
    await expect(signEdgeProvenanceV1(receipt,"too-short")).rejects.toThrow("EDGE_SIGNING_KEY_TOO_SHORT");
  });
});
