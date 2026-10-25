import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {randomBytes} from "node:crypto";
import {
 NEXT3_ID,NEXT3_RECEIVER_ROLE,
 gate4Next3StorageKeyV39,gate4Next3SealValuesV39,
 gate4Next3OpenSealedValuesV39,gate4Next3ValidateValuesV39
} from "../server/lib/disruption/gate4Next3SealedBootstrap_v39";
import {NEXT2_ID,gate4Next2StorageKeyV39} from
 "../server/lib/disruption/gate4Next2SealedBootstrap_v39";

const sha="a".repeat(40),auth="b".repeat(64);
const env={
 V39_DATABASE_RUNTIME_URL:"postgresql://runtime:"+"r".repeat(80)+
 "@secure.db.test/neondb?sslmode=verify-full",
 AERODATABOX_WEBHOOK_SECRET:"s".repeat(64)
};
const values={
 V39_GATE4_PREBIND_ADD_ON_PREPAID:"1",
 ADB_AUTO_COLLECT:"false",
 GATE4_PREBIND_RELEASE_REVIEW:"EXPLICIT_NO_PROVIDER_RECEIVER",
 GATE4_PREBIND_APPROVED_SOURCE_COMMIT:sha,
 GATE4_PREBIND_SCOPE_ID:NEXT3_ID,
 GATE4_PREBIND_AUTH_SHA256:auth,
 GATE4_PREBIND_AIRPORT_ICAO:"WSSS",
 GATE4_PREBIND_DATABASE_URL:"postgresql://"+NEXT3_RECEIVER_ROLE+
 ":"+"p".repeat(80)+"@secure.db.test/neondb?sslmode=verify-full",
 GATE4_PREBIND_APPROVED_DB_HOST:"secure.db.test",
 GATE4_PREBIND_WEBHOOK_SECRET:"w".repeat(64)
};
describe("Gate4 NEXT3 immutable new-session sealed receiver (zero provider)",()=>{
 it("has a fresh scope and independent private source object path",()=>{
  expect(NEXT3_ID).not.toEqual(NEXT2_ID);
  expect(gate4Next3StorageKeyV39(sha)).toBe(
   "internal/gate4/next3/"+sha+"/receiver-v1.aes256gcm.json");
  expect(gate4Next3StorageKeyV39(sha))
   .not.toEqual(gate4Next2StorageKeyV39(sha));
  expect(()=>gate4Next3StorageKeyV39("../bad")).toThrow();
 });
 it("encrypts by stable secrets but never exposes plaintext or provider IDs",()=>{
  const x=gate4Next3SealValuesV39(values,sha,env);
  expect(x.byteLength).toBeGreaterThan(200);
  expect(x.toString()).not.toContain(NEXT3_RECEIVER_ROLE);
  expect(x.toString()).not.toContain(values.GATE4_PREBIND_WEBHOOK_SECRET);
  expect(x.toString()).not.toContain("secure.db.test");
  expect(gate4Next3OpenSealedValuesV39(x,sha,env)).toEqual(values);
  expect(()=>gate4Next3OpenSealedValuesV39(
   x,"c".repeat(40),env)).toThrow();
  expect(()=>gate4Next3OpenSealedValuesV39(
   x,sha,{...env,AERODATABOX_WEBHOOK_SECRET:"x".repeat(64)}
  )).toThrow();
  expect(()=>gate4Next3OpenSealedValuesV39(
   x,sha,{...env,V39_DATABASE_RUNTIME_URL:
    env.V39_DATABASE_RUNTIME_URL+"other"})).toThrow();
 });
 it("rejects tampered ciphertext, wrong actor, stale or spent scope",()=>{
  const x=gate4Next3SealValuesV39(values,sha,env);
  const damaged=JSON.parse(x.toString());
  damaged.ciphertext=randomBytes(64).toString("base64");
  expect(()=>gate4Next3OpenSealedValuesV39(
   Buffer.from(JSON.stringify(damaged)),sha,env)).toThrow();
  for(const overrides of [
   {GATE4_PREBIND_SCOPE_ID:NEXT2_ID},
   {GATE4_PREBIND_SCOPE_ID:"d6c0fcac-798e-4913-bfd1-a561adb3dd82"},
   {GATE4_PREBIND_APPROVED_SOURCE_COMMIT:"f".repeat(40)},
   {ADB_AUTO_COLLECT:"true"},
   {GATE4_PREBIND_RELEASE_REVIEW:"PAID_AUTOMATIC"},
   {GATE4_PREBIND_DATABASE_URL:"postgresql://"+
     "gate4_receiver_2026_next2:p@secure.db.test/neondb?sslmode=verify-full"},
   {GATE4_PREBIND_WEBHOOK_SECRET:"short"},
   {GATE4_PREBIND_AIRPORT_ICAO:"YSSY"}
  ])expect(()=>gate4Next3ValidateValuesV39(
   {...values,...overrides},sha)).toThrow();
  expect(()=>gate4Next3ValidateValuesV39(
   {...values,EXTRA:"1"},sha)).toThrow();
 });
 it("loads alongside NEXT2 only on published callback-only runtime",()=>{
  const s=readFileSync("server/phase2gCallbackOnly.ts","utf8");
  expect(s).toContain("gate4Next2LoadPublishedConfigV39(");
  expect(s).toContain("gate4Next3LoadPublishedConfigV39(");
  expect(s.indexOf("gate4Next3LoadPublishedConfigV39("))
   .toBeGreaterThan(s.indexOf("gate4Next2LoadPublishedConfigV39("));
  expect(s).toContain(' "replit-published-deployment"');
  expect(s).toContain("previousScopedEnv,configBucket,configSource");
  expect(s).toContain("ADB_AUTO_COLLECT");
 });
});