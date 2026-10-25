import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 identityMatchV39,GATE4_IDENTITY_PIN_NAMES_V39
} from "../scripts/v39_gate4_next2_protected_identity_pins_v39";

const source=readFileSync(new URL(
 "../scripts/v39_gate4_next2_protected_identity_pins_v39.ts",
 import.meta.url),"utf8");

describe("Gate4 NEXT2 protected environment identity-only setup",()=>{
 const expected=Object.fromEntries(
  GATE4_IDENTITY_PIN_NAMES_V39.map(k=>[k,"fixed-"+k]));
 it("accepts exact current five identity matches",()=>{
  expect(GATE4_IDENTITY_PIN_NAMES_V39).toHaveLength(5);
  expect(identityMatchV39(expected,expected)).toBe(true);
 });
 it("rejects any individual missing/stale identity",()=>{
  for(const key of GATE4_IDENTITY_PIN_NAMES_V39){
   const stale={...expected,[key]:"NEXT1_STALE"};
   expect(identityMatchV39(stale,expected)).toBe(false);
  }
 });
 it("has only five exact protected identity names",()=>{
  expect(GATE4_IDENTITY_PIN_NAMES_V39).toEqual([
   "GATE4_SAFETY_APPROVED_SOURCE",
   "GATE4_SAFETY_APPROVED_SCOPE",
   "GATE4_SAFETY_APPROVED_AUTH",
   "GATE4_SAFETY_APPROVED_ICAO",
   "GATE4_SAFETY_APPROVED_SIGNER_SPKI_SHA256"
  ]);
 });
 it("requires GitHub reviewer and no running exact-owned STOP before changing settings",()=>{
  expect(source).toContain("if(!reviewer)hold()");
  expect(source).toContain("if(liveStopQueued())hold()");
  expect(source).toContain("REQUIRE_NO_RUNNING_GH_STOP");
  expect(source).toContain("IDENTITY_GO");
 });
 it("does not modify credit policy/window/runner, provider, or database",()=>{
  expect(source).toContain("creditFloorNotModified:true");
  expect(source).toContain("softTargetNotModified:true");
  expect(source).toContain("stopTimeNotModified:true");
  expect(source).toContain("runnerShaNotModified:true");
  expect(source).not.toContain("createGate4SingleWithRawReceiptV39");
  expect(source).not.toContain("deleteSubscriptionVerifiedStrict");
  expect(source).not.toContain("new pg.Client");
  expect(source).not.toContain("ALTER ROLE");
 });
});
