import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {gate05MayCreateInTimeV39}
  from "../scripts/v39_gate05_science_one_paid_create_once_v39";

const paid=readFileSync("scripts/v39_gate05_science_one_paid_create_once_v39.ts","utf8");
const stop=readFileSync("scripts/v39_gate05_science_exact_owned_actions_stop_v39.ts","utf8");
const count=(source:string,needle:string)=>source.split(needle).length-1;

describe("Gate05 independent STOP + one paid CREATE: free read resilience and cutoff",()=>{
 it("read-only transient retry is bounded before AND during actual STOP",()=>{
  expect(count(stop,"await getBalanceEvidenceStrictWithRetry({maxAttempts:2})")).toBe(3);
  expect(count(stop,"listSubscriptionsStrictWithRetry({maxAttempts:2})")).toBe(3);
  expect(stop).not.toContain("await getBalanceEvidenceStrict();");
  expect(stop).toContain("GATE05_SCIENCE_STOP_UNCONFIRMED_REQUIRES_EXACT_OWNER_RESCUE");
  expect(stop).toContain("deleteSubscriptionVerifiedStrict(knownExactId");
  expect(stop).not.toContain("createGate4SingleWithRawReceiptV39(");
 });
 it("paid operator retries ONLY free preflight reads, not CREATE",()=>{
  expect(count(paid,"await getBalanceEvidenceStrictWithRetry({maxAttempts:2})")).toBe(3);
  expect(count(paid,"await listSubscriptionsStrictWithRetry({maxAttempts:2})")).toBe(3);
  expect(count(paid,"createGate4SingleWithRawReceiptV39(\"WSSS\"")).toBe(1);
  expect(paid).toContain("maxDeliveryRetries:0");
  expect(paid).not.toContain("refillBalance(");
 });
 it("rechecks frozen start after slow provider GETs and durable GitHub intent",()=>{
   expect(paid).toContain("PAID_FINAL_PROVIDER_PREFLIGHT_FINISHED_AFTER_CUTOFF");
   expect(paid).toContain("PAID_INTENT_RECORDED_BUT_START_WINDOW_EXPIRED_NO_CREATE");
   const first=paid.indexOf("PAID_FINAL_PROVIDER_PREFLIGHT_FINISHED_AFTER_CUTOFF");
   const intent=paid.indexOf("privateOnce(INTENT");
   const final=paid.indexOf("PAID_INTENT_RECORDED_BUT_START_WINDOW_EXPIRED_NO_CREATE");
   const call=paid.indexOf("const response=await createGate4SingleWithRawReceiptV39");
   expect(first).toBeGreaterThan(0);
   expect(first).toBeLessThan(intent);
   expect(final).toBeGreaterThan(intent);
   expect(final).toBeLessThan(call);
 });
 it("mathematically preserves the T± limits rather than extending exposure",()=>{
  const T=Date.parse("2026-10-29T06:15:00.000Z");
  for(const offset of [-90000,-5000,0,15000])
    expect(gate05MayCreateInTimeV39(T+offset,T,T+3600000)).toBe(true);
  for(const offset of [-90001,15001,30000])
    expect(gate05MayCreateInTimeV39(T+offset,T,T+3600000)).toBe(false);
  expect(gate05MayCreateInTimeV39(T,T,T+59*60000)).toBe(false);
 });
});
