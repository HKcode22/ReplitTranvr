import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {generateKeyPairSync,createHash} from "node:crypto";
import {
 NEXT3_SOURCE_V39,NEXT3_OWNER_ROLE_V39,NEXT3_OWNER_INTENT_V39,
 NEXT3_OWNER_BLOB_V39,sealNext3OwnerCustodyV39,openNext3OwnerCustodyV39,
 type Next3OwnerCustodyV39
} from "../scripts/v39_gate4_next3_no_provider_writer_signer_seal_v39";

const SRC="5878b90eed04b2edfe2b226735ff0f02d9be25f3";
const SCOPE="15bec7e1-8efc-49e7-9ee8-63521a76d71c";
const AUTH="a".repeat(64);
const env={
 V39_DATABASE_RUNTIME_URL:"postgresql://app:"+ "x".repeat(80)+
  "@fake.neon.test/neondb?sslmode=verify-full",
 AERODATABOX_WEBHOOK_SECRET:"z".repeat(72)
};
function fixture():Next3OwnerCustodyV39{
 const key=generateKeyPairSync("ed25519");
 const privateDer=Buffer.from(key.privateKey.export({
  format:"der",type:"pkcs8"}));
 const publicDer=Buffer.from(key.publicKey.export({
  format:"der",type:"spki"}));
 return {
  sourceSha:SRC,scopeId:SCOPE,authorizationSha256:AUTH,
  writerUrl:"postgresql://"+NEXT3_OWNER_ROLE_V39+":"+
   "writer-only-password-"+ "8".repeat(80)+
   "@fake.neon.test/neondb?sslmode=verify-full",
  writerExpiresUtc:"2026-10-25T13:20:25.382Z",
  signerPrivatePkcs8Base64:privateDer.toString("base64"),
  signerPublicSpkiBase64:publicDer.toString("base64"),
  signerSpkiSha256:createHash("sha256").update(publicDer).digest("hex")
 };
}
const source=readFileSync(new URL(
 "../scripts/v39_gate4_next3_no_provider_writer_signer_seal_v39.ts",
 import.meta.url),"utf8");
describe("NEXT3 one-shot private writer + Ed25519 STOP signer custody",()=>{
 it("encrypts, roundtrips and never exposes writer URL or signer key",()=>{
  const f=fixture();
  const one=sealNext3OwnerCustodyV39(f,env);
  const two=sealNext3OwnerCustodyV39(f,env);
  expect(one).not.toEqual(two);
  expect(one.toString()).not.toContain("writer-only-password");
  expect(one.toString()).not.toContain(f.signerPrivatePkcs8Base64);
  expect(openNext3OwnerCustodyV39(one,AUTH,env)).toEqual(f);
  expect(()=>openNext3OwnerCustodyV39(one,"b".repeat(64),env)).toThrow();
  expect(()=>openNext3OwnerCustodyV39(one,AUTH,{
   ...env,AERODATABOX_WEBHOOK_SECRET:"c".repeat(72)
  })).toThrow();
  const corrupt=Buffer.from(one);
  corrupt[corrupt.length-12]^=1;
  expect(()=>openNext3OwnerCustodyV39(corrupt,AUTH,env)).toThrow();
 });
 it("refuses foreign source, scope, wrong role, wrong signer fingerprint",()=>{
  const f=fixture();
  expect(()=>sealNext3OwnerCustodyV39({...f,sourceSha:"f".repeat(40)},env))
   .toThrow();
  expect(()=>sealNext3OwnerCustodyV39({...f,scopeId:"11111111-1111-4111-8111-111111111111"},env))
   .toThrow();
  expect(()=>sealNext3OwnerCustodyV39({
   ...f,writerUrl:f.writerUrl.replace(NEXT3_OWNER_ROLE_V39,"admin")
  },env)).toThrow();
  expect(()=>sealNext3OwnerCustodyV39({...f,signerSpkiSha256:"0".repeat(64)},env))
   .toThrow();
 });
 it("enforces source/scope and a durable one-shot intent before writer/signer blob",()=>{
  expect(NEXT3_SOURCE_V39).toBe(SRC);
  expect(NEXT3_OWNER_INTENT_V39).toContain(SRC);
  expect(NEXT3_OWNER_BLOB_V39).toContain(SRC);
  expect(source).toContain("if(await storage.exists(NEXT3_OWNER_INTENT_V39)||");
  expect(source).toContain("await storage.uploadBytes(NEXT3_OWNER_INTENT_V39,intent)");
  expect(source).toContain("await storage.uploadBytes(NEXT3_OWNER_BLOB_V39,blob)");
  expect(source).toContain('options:"-c default_transaction_read_only=on"');
  expect(source).toContain('GATE4_NEXT3_OWNER_CUSTODY_GO');
  expect(source).toContain('noAutomaticRetry:true');
  expect(source).not.toContain("ALTER ROLE ");
  expect(source).not.toContain("CREATE ROLE ");
  expect(source).not.toContain("CREATE POLICY ");
  expect(source).not.toContain("AERODATABOX_API_KEY");
  expect(source).not.toContain("createGate4SingleWithRawReceiptV39");
  expect(source).not.toContain("deleteSubscriptionVerifiedStrict");
  expect(source).toContain("providerCalls:0,databaseWrites:0");
 });
});
