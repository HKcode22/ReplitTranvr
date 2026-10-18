import {describe,it,expect} from "vitest";
import {reviewGate3UnpaidWsss02AbortV39,
  GATE3_WSSS02_ABORT_UNSETTLED_SQL_V39,
  type OldGate3OwnerRow}
  from "../scripts/v39_gate3_abort_unpaid_prepared_wsss02_v39";

const UUID="7985f9d2-b20f-49fa-b7ae-0ec62348d291";
const SHA="69fdc332ae3224c9bfd1ebc4b8a0ee6719982245bf9b1202b9b1d3ca3aae9db6";
const NOW=new Date("2026-10-18T04:05:00Z");
function owner(change:Partial<OldGate3OwnerRow>={}):OldGate3OwnerRow{
 return {
  session_id:UUID,icao:"WSSS",authorization_evidence_sha256:SHA,
  canary_credit_ceiling:50,fixed_exposure_seconds:600,
  state:"PREPARED",failure_reason:null,
  created_at_utc:new Date("2026-10-18T03:53:00Z"),
  runtime_session_id:null,owner_kind:null,
  runtime_state:null,provider_subscription_id:null,
  callback_requests_seen:null,callback_success_2xx:null,callback_failures:null,
  ...change
 };
}
const unsettled=[{session_id:UUID,state:"PREPARED"}];
describe("WSSS02 watchdog failed-before-paid gate3 recovery — fail-closed source guard",()=>{
 it("reads a second unresolved owner instead of hiding it behind LIMIT 1",()=>{
  expect(GATE3_WSSS02_ABORT_UNSETTLED_SQL_V39).toMatch(/\bLIMIT 2$/);
  expect(GATE3_WSSS02_ABORT_UNSETTLED_SQL_V39).toMatch(/CREATE_AMBIGUOUS_ACCOUNT_HOLD/);
 });
 it("accepts exclusively the original UNLOGGED-lost owner, never produces a paid authorization",()=>{
  expect(()=>reviewGate3UnpaidWsss02AbortV39(owner(),unsettled,NOW)).not.toThrow();
 });
 it("accepts existing pristine armed UNLOGGED session but NEVER subscribed ID",()=>{
  expect(()=>reviewGate3UnpaidWsss02AbortV39(owner({
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
  ["wrong time", {created_at_utc:"2026-10-18T04:01:00.000Z"}],
  ["unlogged partial structure", {owner_kind:"phase3_credit_canary"}],
  ["wrong ICAO",{icao:"YSSY"}],
 ] as const)("rejects %s",(_,change)=>{
  expect(()=>reviewGate3UnpaidWsss02AbortV39(
   owner(change as Partial<OldGate3OwnerRow>),unsettled,NOW)).toThrow(/^GATE3_/);
 });
 it("rejects a competing PREPARED or ambiguous failed provider owner",()=>{
  expect(()=>reviewGate3UnpaidWsss02AbortV39(owner(),
    [...unsettled,{session_id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      state:"PREPARED"}],NOW)).toThrow(/OTHER_UNSETTLED/);
  expect(()=>reviewGate3UnpaidWsss02AbortV39(owner(),[
    {session_id:UUID,state:"FAILED"}],NOW)).toThrow(/OTHER_UNSETTLED/);
 });
 it("never terminalizes before original paid clock boundary",()=>{
  expect(()=>reviewGate3UnpaidWsss02AbortV39(
   owner(),unsettled,new Date("2026-10-18T04:00:14Z")
  )).toThrow(/HISTORICAL_TIME/);
 });
});
