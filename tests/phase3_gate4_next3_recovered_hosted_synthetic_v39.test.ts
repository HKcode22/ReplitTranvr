import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {
 next3SyntheticWireV39,next3CurlPrivateConfigV39
} from "../scripts/v39_gate4_next3_recovered_hosted_synthetic_v39";

const source=readFileSync(new URL(
 "../scripts/v39_gate4_next3_recovered_hosted_synthetic_v39.ts",
 import.meta.url),"utf8");

describe("Gate4 NEXT3 sealed App Storage hosted synthetic, no provider",()=>{
 it("builds one unambiguously synthetic JSON Alert fixture",()=>{
  const wire=next3SyntheticWireV39(
   "g4synthetic_"+"b".repeat(24),
   "2026-10-25T12:00:00.000Z",
   "12345678-1234-4234-8234-123456789abc"
  );
  const x=JSON.parse(wire.toString("utf8"));
  expect(x).toMatchObject({
   subscription:{
    id:"g4synthetic_"+"b".repeat(24),
    subject:{type:"FlightByAirportIcao",id:"WSSS"},
    subscriber:{type:"Webhook",id:"gate4-next3-no-provider-synthetic"}
   },
   flights:[{number:"TEST0001"}],
   deliveryAttempt:{seqNo:0,costCredits:0}
  });
  expect(createHash("sha256").update(wire).digest("hex"))
   .toMatch(/^[a-f0-9]{64}$/);
 });
 it("rejects provider-looking IDs and malformed dates before sending",()=>{
  expect(()=>next3SyntheticWireV39(
   "real_provider_subscription","2026-10-25T12:00:00.000Z",
   "12345678-1234-4234-8234-123456789abc"
  )).toThrow();
  expect(()=>next3SyntheticWireV39(
   "g4synthetic_"+"a".repeat(24),"invalid",
   "12345678-1234-4234-8234-123456789abc"
  )).toThrow();
 });
 it("hides private bearer URL inside curl stdin config only",()=>{
  const secret="a".repeat(80);
  expect(next3CurlPrivateConfigV39(secret)).toBe(
   'url = "https://replit-tranvr--hk84164.replit.app/api/v1/webhooks/aerodatabox/'+secret+'"\n'
  );
  for(const unsafe of ["foo\r\nheader=x","x".repeat(10),"x".repeat(80)+'"']){
   expect(()=>next3CurlPrivateConfigV39(unsafe)).toThrow();
  }
  expect(source).toContain('"--config","-"');
  expect(source).toContain('next3CurlPrivateConfigV39(v.GATE4_PREBIND_WEBHOOK_SECRET)');
 });
 it("uses ONLY recovered NEXT3 restricted credential and exact source, one try",()=>{
  expect(source).toContain(
   'const SRC="5878b90eed04b2edfe2b226735ff0f02d9be25f3"'
  );
  expect(source).toContain('const GO="STORE_ONE_SYNTHETIC_ORIGINAL_NO_PROVIDER"');
  expect(source).toContain('gate4Next3OpenSealedValuesV39(');
  expect(source).toContain('gate4Next3StorageKeyV39(SRC)');
  expect(source).toContain('storageFromExistingEnv()');
  expect(source).toContain('new ReplitProviderBlobStoreV39(b)');
  expect(source).toContain('new pg.Client({');
  expect(source).toContain('options:"-c default_transaction_read_only=on"');
  expect(source).toContain('await storage.uploadBytes(INTENT,intentBytes)');
  expect(source).toContain('const PREFIX="internal/gate4/next3/"+SRC+"/"');
  expect(source).toContain('if(await storage.exists(INTENT)||await storage.exists(RECEIPT))hold()');
  expect(source).toContain('providerDelivered:false,paidScienceExcluded:true,noRetry:true');
  expect(source).toContain('if(existing?.n!==0)hold()');
  expect(source).toContain('h.git_head===SRC');
  expect(source).not.toContain("gate4_receiver_2026_next2");
  expect(source).toContain('await storage.uploadBytes(RECEIPT');
  expect(source).toContain('row.original_wire.equals(wire)');
  expect(source).toContain("providerQualifiedOriginal:false");
  expect(source).toContain('noAutomaticRetry:true');
  expect(source).not.toContain("AERODATABOX_API_KEY");
  expect(source).not.toContain("RAPIDAPI_KEY");
  expect(source).not.toContain("createGate4SingleWithRawReceiptV39");
  expect(source).not.toContain("refillBalance(");
 });
});
