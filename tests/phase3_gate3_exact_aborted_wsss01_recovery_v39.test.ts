import {describe,it,expect} from "vitest";
import {reviewGate3UnpaidOriginalAbortV39,
  GATE3_UNPAID_ABORT_UNSETTLED_SQL_V39,
  type OldGate3OwnerRow}
  from "../scripts/v39_gate3_abort_unpaid_prepared_wsss01_v39";

const UUID="b010a425-7ad6-4490-893d-534bd1bb59b9";
const SHA="7ef03886961fa8a84677062862c675a00a1a6b646eb1407269be4e3831cb2746";
const NOW=new Date("2026-10-18T03:05:00Z");
function owner(change:Partial<OldGate3OwnerRow>={}):OldGate3OwnerRow{
 return {
  session_id:UUID,icao:"WSSS",authorization_evidence_sha256:SHA,
  canary_credit_ceiling:50,fixed_exposure_seconds:600,
  state:"PREPARED",failure_reason:null,
  created_at_utc:new Date("2026-10-18T02:53:00Z"),
  runtime_session_id:null,owner_kind:null,
  runtime_state:null,provider_subscription_id:null,
  callback_requests_seen:null,callback_success_2xx:null,callback_failures:null,
  ...change
 };
}
const unsettled=[{session_id:UUID,state:"PREPARED"}];
describe("WSSS01 aborted-before-paid gate3 recovery — fail-closed source guard",()=>{
 it("reads a second unresolved owner instead of hiding it behind LIMIT 1",()=>{
  expect(GATE3_UNPAID_ABORT_UNSETTLED_SQL_V39).toMatch(/\bLIMIT 2$/);
  expect(GATE3_UNPAID_ABORT_UNSETTLED_SQL_V39).toMatch(/CREATE_AMBIGUOUS_ACCOUNT_HOLD/);
 });
 it("accepts exclusively the original UNLOGGED-lost owner, never produces a paid authorization",()=>{
  expect(()=>reviewGate3UnpaidOriginalAbortV39(owner(),unsettled,NOW)).not.toThrow();
 });
 it("accepts existing pristine armed UNLOGGED session but NEVER subscribed ID",()=>{
  expect(()=>reviewGate3UnpaidOriginalAbortV39(owner({
   runtime_session_id:UUID,owner_kind:"phase3_credit_canary",
   runtime_state:"armed",callback_requests_seen:0,
   callback_success_2xx:0,callback_failures:0
  }),unsettled,NOW)).not.toThrow();
 });
 it.each([
  ["wrong owner", {session_id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}],
  ["other AUTH", {authorization_evidence_sha256:"a".repeat(64)}],
  ["not PREPARED", {state:"FAILED"}],
  ["already received callback", {runtime_session_id:UUID,
   owner_kind:"phase3_credit_canary",runtime_state:"armed",
   callback_requests_seen:1,callback_success_2xx:1,callback_failures:0}],
  ["already bound sub", {provider_subscription_id:"real-external-id"}],
  ["wrong time", {created_at_utc:"2026-10-18T03:01:00.000Z"}],
  ["unlogged partial structure", {owner_kind:"phase3_credit_canary"}],
  ["wrong ICAO",{icao:"YSSY"}],
 ] as const)("rejects %s",(_,change)=>{
  expect(()=>reviewGate3UnpaidOriginalAbortV39(
   owner(change as Partial<OldGate3OwnerRow>),unsettled,NOW)).toThrow(/^GATE3_/);
 });
 it("rejects a competing PREPARED or ambiguous failed provider owner",()=>{
  expect(()=>reviewGate3UnpaidOriginalAbortV39(owner(),
    [...unsettled,{session_id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      state:"PREPARED"}],NOW)).toThrow(/OTHER_UNSETTLED/);
  expect(()=>reviewGate3UnpaidOriginalAbortV39(owner(),[
    {session_id:UUID,state:"FAILED"}],NOW)).toThrow(/OTHER_UNSETTLED/);
 });
 it("never terminalizes before original paid clock boundary",()=>{
  expect(()=>reviewGate3UnpaidOriginalAbortV39(
   owner(),unsettled,new Date("2026-10-18T02:59:59Z")
  )).toThrow(/HISTORICAL_TIME/);
 });
});
