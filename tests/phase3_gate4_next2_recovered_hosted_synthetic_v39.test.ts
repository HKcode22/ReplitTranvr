import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {
 next2SyntheticWireV39,next2CurlPrivateConfigV39
} from "../scripts/v39_gate4_next2_recovered_hosted_synthetic_v39";

const source=readFileSync(new URL(
 "../scripts/v39_gate4_next2_recovered_hosted_synthetic_v39.ts",
 import.meta.url),"utf8");

describe("Gate4 NEXT2 sealed App Storage hosted synthetic, no provider",()=>{
 it("builds one unambiguously synthetic JSON Alert fixture",()=>{
  const wire=next2SyntheticWireV39(
   "g4synthetic_"+"b".repeat(24),
   "2026-10-24T17:45:00.000Z",
   "12345678-1234-4234-8234-123456789abc"
  );
  const x=JSON.parse(wire.toString("utf8"));
  expect(x).toMatchObject({
   subscription:{
    id:"g4synthetic_"+"b".repeat(24),
    subject:{type:"FlightByAirportIcao",id:"WSSS"},
    subscriber:{type:"Webhook",id:"gate4-next2-no-provider-synthetic"}
   },
   flights:[{number:"TEST0001"}],
   deliveryAttempt:{seqNo:0,costCredits:0}
  });
  expect(createHash("sha256").update(wire).digest("hex"))
   .toMatch(/^[a-f0-9]{64}$/);
 });
 it("rejects provider-looking IDs and malformed dates before sending",()=>{
  expect(()=>next2SyntheticWireV39(
   "real_provider_subscription","2026-10-24T17:45:00.000Z",
   "12345678-1234-4234-8234-123456789abc"
  )).toThrow();
  expect(()=>next2SyntheticWireV39(
   "g4synthetic_"+"a".repeat(24),"invalid",
   "12345678-1234-4234-8234-123456789abc"
  )).toThrow();
 });
 it("hides private bearer URL inside curl stdin config only",()=>{
  const secret="a".repeat(80);
  expect(next2CurlPrivateConfigV39(secret)).toBe(
   'url = "https://replit-tranvr--hk84164.replit.app/api/v1/webhooks/aerodatabox/'+secret+'"\n'
  );
  for(const unsafe of ["foo\r\nheader=x","x".repeat(10),"x".repeat(80)+'"']){
   expect(()=>next2CurlPrivateConfigV39(unsafe)).toThrow();
  }
  expect(source).toContain('"--config","-"');
  expect(source).toContain('next2CurlPrivateConfigV39(v.GATE4_PREBIND_WEBHOOK_SECRET)');
 });
 it("uses ONLY recovered NEXT2 restricted credential and exact source, one try",()=>{
  expect(source).toContain(
   'const SRC="087dc948c29d004f88eca141e1fc8e83c2844e3f"'
  );
  expect(source).toContain('const GO="STORE_ONE_SYNTHETIC_ORIGINAL_NO_PROVIDER"');
  expect(source).toContain('gate4Next2OpenSealedValuesV39(');
  expect(source).toContain('gate4Next2StorageKeyV39(SRC)');
  expect(source).toContain('storageFromExistingEnv()');
  expect(source).toContain('new ReplitProviderBlobStoreV39(b)');
  expect(source).toContain('new pg.Client({');
  expect(source).toContain('options:"-c default_transaction_read_only=on"');
  expect(source).toContain('await storage.uploadBytes(INTENT,intentBytes)');
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
