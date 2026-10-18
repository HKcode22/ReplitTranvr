import {describe,it,expect} from "vitest";
import {reviewWsss03DispatchInputsV39} from
  "../scripts/v39_gate3_dispatch_wsss03_watchdog_v39";
const HEAD="539f56d404d7997397ed2d5fd90215f31c98b955";
const NEW="4e8dd4d6-b10d-49fa-8e8f-702d5d4e6120";
const START=Date.parse("2026-10-18T04:30:00Z");
describe("WSSS03 manual dispatch input boundary (no GitHub/provider I/O)",()=>{
  it("accepts fresh UUID only during bounded prestart window",()=>{
    expect(()=>reviewWsss03DispatchInputsV39(
      NEW,HEAD,new Date(START-300_000))).not.toThrow();
  });
  it.each([
    ["too early", NEW, new Date(START-480_001)],
    ["too late", NEW, new Date(START-59_999)],
    ["old WSSS01", "b010a425-7ad6-4490-893d-534bd1bb59b9",new Date(START-300_000)],
    ["old WSSS02", "7985f9d2-b20f-49fa-b7ae-0ec62348d291",new Date(START-300_000)],
    ["bad uuid","not-a-uuid",new Date(START-300_000)],
  ] as const)("rejects %s",(_,session,now)=>{
    expect(()=>reviewWsss03DispatchInputsV39(session,HEAD,now)).toThrow(/^GATE3_/);
  });
});
