import {describe,it,expect,vi,afterEach} from "vitest";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {ReplitProviderBlobStoreV39} from
 "../server/lib/disruption/replitProviderBlobStore_v39";
import {
 NEXT4_RECEIVER_ROLE_V39,
 NEXT4_KEYS_V39,
 gate4Next4ConfigStorageKeyV39,
 gate4Next4ValidateValuesV39,
 gate4Next4SealValuesV39,
 gate4Next4OpenSealedValuesV39,
 gate4Next4LoadPublishedConfigV39
} from "../server/lib/disruption/gate4Next4SealedBootstrap_v39";
import {NEXT3_ID} from
 "../server/lib/disruption/gate4Next3SealedBootstrap_v39";
import {NEXT2_ID} from
 "../server/lib/disruption/gate4Next2SealedBootstrap_v39";

const sha="5".repeat(40);
const other="6".repeat(40);
const scope="45dcf5c2-2cf4-469e-9a51-30b58a48f1e5";
const env={
 V39_DATABASE_RUNTIME_URL:
  "postgresql://runner:long_stable_password@neon.test/neondb?sslmode=verify-full",
 AERODATABOX_WEBHOOK_SECRET:"EXISTING_STABLE_PREPAID_SECRET_ONLY_FOR_CI",
 V39_PROVIDER_BLOB_BUCKET_ID:"replit-objstore-00000000-0000-0000-0000-000000000001"
} as NodeJS.ProcessEnv;
function valid(){
 return {
  V39_GATE4_PREBIND_ADD_ON_PREPAID:"1",
  ADB_AUTO_COLLECT:"false",
  GATE4_PREBIND_RELEASE_REVIEW:"EXPLICIT_NO_PROVIDER_RECEIVER",
  GATE4_PREBIND_APPROVED_SOURCE_COMMIT:sha,
  GATE4_PREBIND_SCOPE_ID:scope,
  GATE4_PREBIND_AUTH_SHA256:"b".repeat(64),
  GATE4_PREBIND_AIRPORT_ICAO:"WSSS",
  GATE4_PREBIND_DATABASE_URL:
   "postgresql://"+NEXT4_RECEIVER_ROLE_V39+
    ":new_receiver_test_password@neon.test/neondb?sslmode=verify-full",
  GATE4_PREBIND_APPROVED_DB_HOST:"neon.test",
  GATE4_PREBIND_WEBHOOK_SECRET:"N".repeat(80)
 };
}
afterEach(()=>vi.restoreAllMocks());
describe("Gate4 NEXT4 forward-only production receiver bootstrap",()=>{
 it("validates new scope and source, encrypts with AES GCM, binds recipient scope+SHA",()=>{
  const x=valid();
  expect(Object.keys(x).sort()).toEqual([...NEXT4_KEYS_V39].sort());
  expect(gate4Next4ValidateValuesV39(x,sha)).toEqual(x);
  const sealed=gate4Next4SealValuesV39(x,sha,env);
  const reopened=gate4Next4OpenSealedValuesV39(sealed,sha,env);
  expect(reopened).toEqual(x);
  expect(sealed.toString()).not.toContain("new_receiver_test_password");
  expect(sealed.toString()).not.toContain("N".repeat(80));
  expect(gate4Next4ConfigStorageKeyV39(sha)).toContain("next4/");
  expect(()=>gate4Next4OpenSealedValuesV39(sealed,other,env)).toThrow();
  expect(()=>gate4Next4OpenSealedValuesV39(sealed,sha,{
   ...env,AERODATABOX_WEBHOOK_SECRET:"changed-stable-secret-for-test-only"
  })).toThrow();
  const tampered=JSON.parse(sealed.toString());
  tampered.scopeId=randomUUID();
  expect(()=>gate4Next4OpenSealedValuesV39(
   Buffer.from(JSON.stringify(tampered)),sha,env)).toThrow();
  const flipped=JSON.parse(sealed.toString());
  const ct=Buffer.from(flipped.ciphertext,"base64");
  ct[3]^=1;
  flipped.ciphertext=ct.toString("base64");
  expect(()=>gate4Next4OpenSealedValuesV39(
   Buffer.from(JSON.stringify(flipped)),sha,env)).toThrow();
 });
 it("never reuses spent NEXT2/NEXT3 or mismatched new source, role or RLS database",()=>{
  for(const old of [NEXT2_ID,NEXT3_ID,
   "d6c0fcac-798e-4913-bfd1-a561adb3dd82",
   "498dccd7-5da3-4687-a6ea-e0dc03b54398"]){
   expect(()=>gate4Next4ValidateValuesV39({
     ...valid(),GATE4_PREBIND_SCOPE_ID:old
   },sha)).toThrow();
  }
  expect(()=>gate4Next4ValidateValuesV39({
   ...valid(),GATE4_PREBIND_APPROVED_SOURCE_COMMIT:other
  },sha)).toThrow();
  expect(()=>gate4Next4ValidateValuesV39({
   ...valid(),GATE4_PREBIND_DATABASE_URL:
    "postgresql://gate4_receiver_2026_next3:password@neon.test/neondb?sslmode=verify-full"
  },sha)).toThrow();
  expect(()=>gate4Next4ValidateValuesV39({
   ...valid(),GATE4_PREBIND_DATABASE_URL:
    "postgresql://"+NEXT4_RECEIVER_ROLE_V39+
    ":pw@neon.test/neondb?sslmode=require"
  },sha)).toThrow();
  expect(()=>gate4Next4ValidateValuesV39({
   ...valid(),GATE4_PREBIND_SCOPE_ID:"not-a-valid-uuid"
  },sha)).toThrow();
 });
 it("does not silently overwrite already-enabled previous scope",async()=>{
  const sealed=gate4Next4SealValuesV39(valid(),sha,env);
  const exists=vi.spyOn(ReplitProviderBlobStoreV39.prototype,"exists")
   .mockResolvedValue(true);
  const download=vi.spyOn(ReplitProviderBlobStoreV39.prototype,"downloadBytes")
   .mockResolvedValue(sealed);
  await expect(gate4Next4LoadPublishedConfigV39({
    ...env,V39_GATE4_PREBIND_ADD_ON_PREPAID:"1",
    GATE4_PREBIND_SCOPE_ID:NEXT3_ID
  },env.V39_PROVIDER_BLOB_BUCKET_ID!,sha)).rejects.toThrow();
  expect(download).not.toHaveBeenCalled();
  expect(exists).toHaveBeenCalledOnce();
  const next=await gate4Next4LoadPublishedConfigV39(
    env,env.V39_PROVIDER_BLOB_BUCKET_ID!,sha);
  expect(next.GATE4_PREBIND_SCOPE_ID).toBe(scope);
  expect(next.V39_GATE4_PREBIND_ADD_ON_PREPAID).toBe("1");
  expect(next.GATE4_PREBIND_APPROVED_SOURCE_COMMIT).toBe(sha);
 });
 it("leaves default prepaid-only config unchanged when next4 bundle absent",async()=>{
  const spy=vi.spyOn(ReplitProviderBlobStoreV39.prototype,"exists")
   .mockResolvedValue(false);
  const x=await gate4Next4LoadPublishedConfigV39(
    env,env.V39_PROVIDER_BLOB_BUCKET_ID!,sha);
  expect(x).toBe(env);
  expect(spy).toHaveBeenCalledOnce();
 });
 it("is only activated inside callback-only published process, no provider mutations",()=>{
  const code=readFileSync("server/phase2gCallbackOnly.ts","utf8");
  const bootstrap=readFileSync(
   "server/lib/disruption/gate4Next4SealedBootstrap_v39.ts","utf8");
  expect(code).toContain("gate4Next4LoadPublishedConfigV39(");
  expect(code).toContain("const gate4ConfigEnv=published");
  expect(code).toContain("gate4PrebindAdditiveConfigV39(gate4ConfigEnv)");
  for(const forbidden of [
   "createGate4SingleWithRawReceiptV39","refillBalance(",
   "deleteSubscriptionVerifiedStrict","pg.Client(","ALTER ROLE","CREATE ROLE"
  ])expect(bootstrap).not.toContain(forbidden);
 });
});
