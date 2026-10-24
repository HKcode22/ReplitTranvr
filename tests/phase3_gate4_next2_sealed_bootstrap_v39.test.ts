import {describe,it,expect} from "vitest";
import {randomBytes} from "node:crypto";
import {
 NEXT2_ID,gate4Next2SealValuesV39,gate4Next2OpenSealedValuesV39,
 gate4Next2StorageKeyV39,gate4Next2ValidateValuesV39
} from "../server/lib/disruption/gate4Next2SealedBootstrap_v39";

const sha="f".repeat(40),auth="a".repeat(64);
const db="postgresql://gate4_receiver_2026_next2:"+
 "x".repeat(80)+"@secure.db.test/neondb?sslmode=verify-full";
const env={
 V39_DATABASE_RUNTIME_URL:"postgresql://runtime:"+"z".repeat(80)+
 "@secure.db.test/neondb?sslmode=verify-full",
 AERODATABOX_WEBHOOK_SECRET:"s".repeat(48)
};
const values={
 V39_GATE4_PREBIND_ADD_ON_PREPAID:"1",
 ADB_AUTO_COLLECT:"false",
 GATE4_PREBIND_RELEASE_REVIEW:"EXPLICIT_NO_PROVIDER_RECEIVER",
 GATE4_PREBIND_APPROVED_SOURCE_COMMIT:sha,
 GATE4_PREBIND_SCOPE_ID:NEXT2_ID,
 GATE4_PREBIND_AUTH_SHA256:auth,
 GATE4_PREBIND_AIRPORT_ICAO:"WSSS",
 GATE4_PREBIND_DATABASE_URL:db,
 GATE4_PREBIND_APPROVED_DB_HOST:"secure.db.test",
 GATE4_PREBIND_WEBHOOK_SECRET:"w".repeat(80)
};
describe("Gate4 NEXT2 no-UI sealed Replit App Storage config",()=>{
 it("uses revision-separated fixed private object name",()=>{
  expect(gate4Next2StorageKeyV39(sha))
   .toBe("internal/gate4/next2/"+sha+"/receiver-v1.aes256gcm.json");
  expect(()=>gate4Next2StorageKeyV39("../unsafe")).toThrow();
 });
 it("round trips true bytes through AES-GCM without exposing plaintext in blob",()=>{
  const sealed=gate4Next2SealValuesV39(values,sha,env);
  expect(sealed.length).toBeGreaterThan(200);
  expect(sealed.toString()).not.toContain("secure.db.test");
  expect(sealed.toString()).not.toContain(values.GATE4_PREBIND_WEBHOOK_SECRET);
  const decoded=gate4Next2OpenSealedValuesV39(sealed,sha,env);
  expect(decoded).toEqual(values);
  const modified=JSON.parse(sealed.toString());
  modified.ciphertext=randomBytes(64).toString("base64");
  expect(()=>gate4Next2OpenSealedValuesV39(
   Buffer.from(JSON.stringify(modified)),sha,env)).toThrow();
 });
 it("is bound to currently built SHA, private app keys and exact scope",()=>{
  const sealed=gate4Next2SealValuesV39(values,sha,env);
  expect(()=>gate4Next2OpenSealedValuesV39(
   sealed,"e".repeat(40),env)).toThrow();
  expect(()=>gate4Next2OpenSealedValuesV39(sealed,sha,{
   ...env,AERODATABOX_WEBHOOK_SECRET:"x".repeat(48)
  })).toThrow();
  expect(()=>gate4Next2OpenSealedValuesV39(sealed,sha,{
   ...env,V39_DATABASE_RUNTIME_URL:env.V39_DATABASE_RUNTIME_URL+"changed"
  })).toThrow();
 });
 it("refuses missing/extra settings, wrong actor, source and secret",()=>{
  expect(()=>gate4Next2ValidateValuesV39({
   ...values,GATE4_PREBIND_SCOPE_ID:"d6c0fcac-798e-4913-bfd1-a561adb3dd82"
  },sha)).toThrow();
  expect(()=>gate4Next2ValidateValuesV39({
   ...values,GATE4_PREBIND_APPROVED_SOURCE_COMMIT:"e".repeat(40)
  },sha)).toThrow();
  expect(()=>gate4Next2ValidateValuesV39({
   ...values,GATE4_PREBIND_WEBHOOK_SECRET:"short"
  },sha)).toThrow();
  expect(()=>gate4Next2ValidateValuesV39({
   ...values,GATE4_PREBIND_DATABASE_URL:"postgresql://runtime:pass@secure.db.test/neondb?sslmode=verify-full"
  },sha)).toThrow();
  expect(()=>gate4Next2ValidateValuesV39({...values,EXTRA:"bad"},sha))
   .toThrow();
 });
});
