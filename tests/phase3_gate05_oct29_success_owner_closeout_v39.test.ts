import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {verifyOct29OwnerForCloseout,verifyOct29StopLog,verifyOct29FreeAccount} from "../scripts/v39_gate05_oct29_success_exact_owner_closeout_once_v39";
const ID="618582a3-ea3f-4a10-a756-c974c472af3c";
const owner=()=>({
  session_id:ID,state:"ACTIVE",airport_icao:"WSSS",
  source_commit:"84b7f1565d0402facc8c3b9aacedc599eb6e2af1",
  authorization_sha256:"1fcded99e76cc974dc518495bd127000a3a7a9cb4344e41b6b89cb9e01b98b23",
  reviewed_stop_ticket_sha256:"cd93866bc18a2d1368981837d4af8c036094e421c7d30dd03570e0b611f43746",
  provider_subscription_id:null as string|null,
  start_at_utc:"2026-10-29T03:45:00.000Z",
  stop_at_utc:"2026-10-29T04:45:00.000Z",
  alert_credit_ceiling:500,early_stop_credits:350,rest_api_units_ceiling:12,
  exact_owned_delete_verified:null as boolean|null,
  terminal_evidence_sha256:null as string|null,terminal_at_utc:null as string|null
});
const log=(extra:Record<string,unknown>={})=>
 "2026-10-29T04:45:11.0622906Z "+JSON.stringify({
   schema:"v39.gate05.science-actions-stop-terminal.v1",
   status:"STOP_PROVIDER_EXACT_INACTIVE",reason:"TIME_STOP",scope:ID,
   providerChargedCredits:151,exactOwnedProviderIdSeen:true,
   ownerFinalizationNotYetProven:true,fullSciencePassNotYetProven:true,
   noProviderCreates:true,providerDeletesKnownExactOnly:true,...extra
 });
describe("Oct29 WSSS exact-owner administrative STOP only",()=>{
 it("requires a unique exact independently verified STOP, not any job green",()=>{
   expect(verifyOct29StopLog(log())).toMatch(/^[a-f0-9]{64}$/);
   expect(()=>verifyOct29StopLog(log()+"\n"+log())).toThrow();
   for(const x of [
     {scope:"e69ffa34-d8a6-456f-a49c-9dd459e6d294"},
     {reason:"NO_ACTIVE_SUBSCRIPTION"},{providerChargedCredits:0},
     {exactOwnedProviderIdSeen:false},{noProviderCreates:false},
     {ownerFinalizationNotYetProven:false},
     {status:"UNKNOWN"},{fullSciencePassNotYetProven:false}
   ])expect(()=>verifyOct29StopLog(log(x))).toThrow();
 });
 it("holds on debit drift, unknown billing, active foreign/exact subscription",()=>{
   const ok={firstBalance:1830,secondBalance:1830,
     firstSubs:[] as {id:string;isActive:boolean}[],
     secondSubs:[] as {id:string;isActive:boolean}[]};
   expect(()=>verifyOct29FreeAccount(ok)).not.toThrow();
   for(const x of [
     {firstBalance:1830,secondBalance:1829},
     {firstBalance:1981,secondBalance:1981},
     {firstBalance:1831,secondBalance:1831},
     {firstSubs:[{id:"foreign",isActive:true}]},
     {secondSubs:[{id:"owned",isActive:true}]}
   ])expect(()=>verifyOct29FreeAccount({...ok,...x})).toThrow();
 });
 it("refuses another owner, stale owner, terminal owner or unknown exact ID",()=>{
   const o=owner();
   expect(()=>verifyOct29OwnerForCloseout(o)).toThrow("EXACT_BOUND_PROVIDER_ID_MISMATCH");
   for(const x of [
     {session_id:"e69ffa34-d8a6-456f-a49c-9dd459e6d294"},
     {state:"STOPPED"},{state:"PREPARED"},{state:"FAILED"},
     {source_commit:"0".repeat(40)},
     {authorization_sha256:"0".repeat(64)},
     {reviewed_stop_ticket_sha256:"0".repeat(64)},
     {airport_icao:"YSSY"},
     {start_at_utc:"2026-10-28T03:45:00.000Z"},
     {stop_at_utc:"2026-10-29T04:44:00.000Z"},
     {provider_subscription_id:"foreignID123456"},
     {exact_owned_delete_verified:true},
     {terminal_evidence_sha256:"a".repeat(64)},
     {terminal_at_utc:"2026-10-29T04:45:00.000Z"}
   ])expect(()=>verifyOct29OwnerForCloseout({...o,...x})).toThrow();
 });
 it("has no schedule or paid provider mutation path",()=>{
   const wf=readFileSync(".github/workflows/phase3-gate05-oct29-success-exact-owner-closeout.yml","utf8");
   const code=readFileSync("scripts/v39_gate05_oct29_success_exact_owner_closeout_once_v39.ts","utf8");
   expect(wf).toContain("workflow_dispatch:");
   expect(wf).toContain("environment: phase2g-paid");
   expect(wf).not.toMatch(/^\s+(?:schedule|push|pull_request):/m);
   expect(code).toContain("WHERE session_id=$1::uuid AND state='ACTIVE'");
   expect(code).toContain("terminal_evidence_sha256=$3");
   expect(code).not.toContain("deleteSubscriptionVerifiedStrict");
   expect(code).not.toContain("createSubscriptionStrict");
   expect(code).not.toContain("refillBalance(");
   expect(code).not.toContain("DELETE FROM clean.");
 });
});
