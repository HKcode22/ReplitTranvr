import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {gate4SyntheticWireV39} from
 "../scripts/v39_gate4_next2_hosted_no_provider_acceptance_v39";

const source=readFileSync(new URL(
 "../scripts/v39_gate4_next2_hosted_no_provider_acceptance_v39.ts",
 import.meta.url),"utf8");
describe("Gate4 next2 hosted no-provider one-shot acceptance",()=>{
 it("creates distinguishable schema-shaped non-provider original",()=>{
  const wire=gate4SyntheticWireV39(
   "g4synthetic_"+"b".repeat(24),
   "2026-10-24T07:50:00.000Z",
   "12345678-1234-4234-8234-123456789abc"
  );
  const parsed=JSON.parse(wire.toString("utf8"));
  expect(parsed).toMatchObject({
   id:"12345678-1234-4234-8234-123456789abc",
   subscription:{
    id:"g4synthetic_"+"b".repeat(24),
    subject:{type:"FlightByAirportIcao",id:"WSSS"}
   },
   deliveryAttempt:{seqNo:0,costCredits:0},
   flights:[{number:"TEST0001"}]
  });
  expect(createHash("sha256").update(wire).digest("hex"))
   .toMatch(/^[a-f0-9]{64}$/);
 });
 it("rejects ambiguous synthetic subscription and timestamp before networking",()=>{
  expect(()=>gate4SyntheticWireV39(
   "realproviderid","2026-10-24T07:50:00.000Z",
   "12345678-1234-4234-8234-123456789abc"
  )).toThrow("GATE4_HOSTED_ACCEPTANCE_HOLD");
  expect(()=>gate4SyntheticWireV39(
   "g4synthetic_"+"b".repeat(24),"not-a-date",
   "12345678-1234-4234-8234-123456789abc"
  )).toThrow("GATE4_HOSTED_ACCEPTANCE_HOLD");
 });
 it("is inert at import and never links any provider billing API",()=>{
  expect(source).toContain('const REVIEWED_RECEIVER_SHA="29d3e0dff8b8863f55f6d73e609e21480b8e46db"');
  expect(source).toContain('const GO="STORE_ONE_SYNTHETIC_ORIGINAL_NO_PROVIDER"');
  expect(source).toContain('if(mode==="--check")');
  expect(source).toContain("writeOnce(intent,");
  expect(source).toContain("if(existsSync(intent)||existsSync(receipt))hold()");
  expect(source).toContain("row.original_wire.equals(wire)");
  expect(source).toContain("GATE4_PUBLISHED_VALID_JSON_V0071_DURABLE_PASS");
  expect(source).toContain("doNotCountTowardPaidScience:true");
  expect(source).not.toContain("createGate4SingleWithRawReceiptV39");
  expect(source).not.toContain("refillBalance(");
  expect(source).not.toContain("deleteSubscriptionVerifiedStrict");
  expect(source).not.toContain("AERODATABOX_API_KEY");
  expect(source).not.toContain("RAPIDAPI_KEY");
 });
});
