import { describe, expect, it } from "vitest";
import {
 NEXT2_SRC_V39, NEXT2_SCOPE_V39, next2ProtectedScopeV39
} from "../scripts/v39_gate4_next2_paid_trial_custody_v39";

const auth = "a".repeat(64);
const signer = "b".repeat(64);
const vars = {
 GATE4_SAFETY_APPROVED_SOURCE: NEXT2_SRC_V39,
 GATE4_SAFETY_APPROVED_SCOPE: NEXT2_SCOPE_V39,
 GATE4_SAFETY_APPROVED_AUTH: auth,
 GATE4_SAFETY_APPROVED_ICAO: "WSSS",
 GATE4_SAFETY_APPROVED_SIGNER_SPKI_SHA256: signer,
 GATE4_SAFETY_APPROVED_RUNNER_SHA: "c".repeat(40),
 GATE4_SAFETY_APPROVED_START_UTC: "2026-11-01T01:00:00.000Z",
 GATE4_SAFETY_APPROVED_STOP_UTC: "2026-11-01T01:20:00.000Z",
 GATE4_SAFETY_APPROVED_SOFT_TARGET: "5",
 GATE4_SAFETY_APPROVED_PROTECTED_FLOOR: "1900"
};
describe("NEXT2 scope admission - offline",()=>{
 it("accepts precisely matched scope and budget",()=>{
  expect(next2ProtectedScopeV39(vars,{auth,signerSpkiSha256:signer},1991).scope)
   .toMatchObject({scopeId:NEXT2_SCOPE_V39,softCreditTarget:5,protectedCreditFloor:1900});
 });
 it("rejects the obsolete credit floor",()=>{
  expect(()=>next2ProtectedScopeV39(
   {...vars,GATE4_SAFETY_APPROVED_PROTECTED_FLOOR:"2000"},
   {auth,signerSpkiSha256:signer},1991)).toThrow();
 });
 it("rejects stale scope, signer or a larger soft target",()=>{
  for(const patch of [
   {GATE4_SAFETY_APPROVED_SCOPE:"d6c0fcac-798e-4913-bfd1-a561adb3dd82"},
   {GATE4_SAFETY_APPROVED_SIGNER_SPKI_SHA256:"f".repeat(64)},
   {GATE4_SAFETY_APPROVED_SOFT_TARGET:"12"}
  ])expect(()=>next2ProtectedScopeV39(
   {...vars,...patch},{auth,signerSpkiSha256:signer},1991)).toThrow();
 });
});
