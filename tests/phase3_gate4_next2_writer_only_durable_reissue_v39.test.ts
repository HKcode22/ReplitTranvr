import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 sealWriterOnlyV39,openWriterOnlyV39
} from "../scripts/v39_gate4_next2_writer_only_durable_reissue_v39";

const script=readFileSync(new URL(
 "../scripts/v39_gate4_next2_writer_only_durable_reissue_v39.ts",
 import.meta.url),"utf8");
const SRC="087dc948c29d004f88eca141e1fc8e83c2844e3f";
const SCOPE="16f819c6-7c68-4d5a-82cf-3820e9294dc7";
const auth="a".repeat(64);
const url="postgresql://gate4_owner_writer_2026_next2:PLACEHOLDER_PASSWORD_"+
  "2".repeat(40)+"@mock.example.test/neondb?sslmode=verify-full";
const fakeEnv={
 V39_DATABASE_RUNTIME_URL:
  "postgresql://readonly:NOT_REAL_PASSWORD"+"9".repeat(40)+
  "@db.example.test/neondb?sslmode=verify-full",
 AERODATABOX_WEBHOOK_SECRET:"TEST_ONLY"+"0".repeat(50)
};
function withFakeSecrets<T>(f:()=>T):T{
 const a=process.env.V39_DATABASE_RUNTIME_URL;
 const b=process.env.AERODATABOX_WEBHOOK_SECRET;
 process.env.V39_DATABASE_RUNTIME_URL=fakeEnv.V39_DATABASE_RUNTIME_URL;
 process.env.AERODATABOX_WEBHOOK_SECRET=fakeEnv.AERODATABOX_WEBHOOK_SECRET;
 try{return f();}
 finally{
  if(a===undefined)delete process.env.V39_DATABASE_RUNTIME_URL;
  else process.env.V39_DATABASE_RUNTIME_URL=a;
  if(b===undefined)delete process.env.AERODATABOX_WEBHOOK_SECRET;
  else process.env.AERODATABOX_WEBHOOK_SECRET=b;
 }
}
describe("NEXT2 writer-only durable sealed custody, no provider",()=>{
 it("AES-GCM roundtrip with exact fixed writer, scope/auth/source",()=>{
  withFakeSecrets(()=>{
   const d={writerUrl:url,sourceSha:SRC,scopeId:SCOPE,
    authorizationSha256:auth,expiresUtc:"2026-10-26T20:00:00.000Z"};
   const a=sealWriterOnlyV39(d);
   const b=sealWriterOnlyV39(d);
   expect(a).not.toEqual(b);
   expect(a.toString()).not.toContain("PLACEHOLDER_PASSWORD");
   expect(openWriterOnlyV39(a,auth))
    .toEqual({writerUrl:url,expiresUtc:d.expiresUtc});
   expect(()=>openWriterOnlyV39(a,"b".repeat(64))).toThrow();
   const mutated=Buffer.from(a);
   mutated[mutated.length-20]^=1;
   expect(()=>openWriterOnlyV39(mutated,auth)).toThrow();
  });
 });
 it("denies any foreign DB role, source or scope",()=>{
  withFakeSecrets(()=>{
   const standard={writerUrl:url,sourceSha:SRC,scopeId:SCOPE,
    authorizationSha256:auth,expiresUtc:"2026-10-26T20:00:00.000Z"};
   expect(()=>sealWriterOnlyV39({...standard,
    writerUrl:url.replace("owner_writer","receiver")})).toThrow();
   expect(()=>sealWriterOnlyV39({...standard,
    sourceSha:"f".repeat(40)})).toThrow();
   expect(()=>sealWriterOnlyV39({...standard,
    scopeId:"11111111-1111-4111-8111-111111111111"})).toThrow();
  });
 });
 it("only ALTERs fixed NEXT2 writer, one-shot durable intent before rotation",()=>{
  expect(script).toContain('const ROLE="gate4_owner_writer_2026_next2"');
  expect(script).toContain('if(await storage.exists(INTENT)||await storage.exists(WRITER))hold()');
  expect(script).toContain('await storage.uploadBytes(INTENT,intent)');
  expect(script).toContain('await storage.uploadBytes(WRITER,blob)');
  expect(script).toContain('ALTER ROLE "+ROLE+" PASSWORD');
  expect(script).not.toContain('ALTER POLICY');
  expect(script).not.toContain('gate4_receiver_2026_next2"+" PASSWORD');
  expect(script).not.toContain('createGate4SingleWithRawReceiptV39');
  expect(script).not.toContain('createSubscription(');
  expect(script).not.toContain('deleteSubscriptionVerifiedStrict(');
  expect(script).not.toContain('refillBalance');
  expect(script).toContain("providerCalls:0,providerCreates:0");
  expect(script).toContain("noAutomaticRetry:true");
 });
 it("read-only audit explicitly rejects synthetic ambiguity and existing paid binding",()=>{
  expect(script).toContain('if(rows.rows.length!==1||owners.rows[0]?.n!==0||');
  expect(script).toContain('/^g4synthetic_[a-f0-9]{24}$/');
  expect(script).toContain('sha(r.original_wire)!==r.original_sha256');
  expect(script).toContain('r.source_commit!==SRC||r.authorization_sha256!==auth');
  expect(script).toContain('await client.query("BEGIN READ ONLY")');
  expect(script).toContain('status:"GATE4_NEXT2_WRITER_ONLY_REISSUE_READONLY_READY"');
 });
});
