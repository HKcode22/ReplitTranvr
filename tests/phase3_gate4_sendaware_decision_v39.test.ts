import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {assessGate4SpendV39,assessGate4SecondStartV39,
  type Gate4SpendInputV39
} from "../server/lib/disruption/gate4SendAwareDecision_v39";
const base:Gate4SpendInputV39={
  cap:100,softStopMargin:10,unsettledBurstReserve:10,
  openingBalance:500,currentBalance:500,
  receivedItemUnits:0,deliveryFailures:0
};
describe("Gate4 no-provider decision and reviewed watchdog wiring",()=>{
  it("uses the same 100/10 threshold for real V3.9 watchdog logic",()=>{
    expect(assessGate4SpendV39({...base,currentBalance:411,
      receivedItemUnits:89}).action).toBe("CONTINUE");
    expect(assessGate4SpendV39({...base,currentBalance:410,
      receivedItemUnits:90})).toMatchObject({
        action:"STOP",threshold:90,reason:"SOFT_STOP_THRESHOLD",
        providerRequests:0,liveHardCapCertified:false
      });
  });
  it("counts internal delivery before a lagging provider quota update",()=>{
    expect(assessGate4SpendV39({...base,currentBalance:420,
      receivedItemUnits:90}).action).toBe("STOP");
  });
  it("refuses loss of provider, increase and unexpected SEND gap",()=>{
    expect(assessGate4SpendV39({...base,currentBalance:null}).reason)
      .toBe("PROVIDER_BALANCE_UNAVAILABLE");
    expect(assessGate4SpendV39({...base,currentBalance:501}).action)
      .toBe("HOLD_STOP");
    expect(assessGate4SpendV39({...base,currentBalance:480,
      receivedItemUnits:0}).reason)
      .toBe("SEND_ACCOUNTING_GAP_EXCEEDS_RESERVE");
  });
  it("refuses cap excess, callback failure and unsafe reserve",()=>{
    expect(assessGate4SpendV39({...base,currentBalance:399,
      receivedItemUnits:101}).reason).toBe("OBSERVED_HARD_CAP_EXCEEDED");
    expect(assessGate4SpendV39({...base,deliveryFailures:1}).action)
      .toBe("HOLD_STOP");
    expect(assessGate4SpendV39({...base,softStopMargin:9}).reason)
      .toBe("INVALID_OR_UNBOUNDED_BUDGET");
  });
  it("explicitly refuses second start without a settled predecessor",()=>{
    for(const s of ["active","closed_unsettled","invalid"])
      expect(assessGate4SecondStartV39(s).allowed).toBe(false);
    for(const s of ["none","closed_settled"])
      expect(assessGate4SecondStartV39(s)).toMatchObject({
        allowed:true,paidAuthorized:false
      });
  });
  it("source contract wires real watchdog and owned stop, not fake PASS",()=>{
    const source=readFileSync(new URL(
      "../server/lib/disruption/adbCollectionController_v39.ts",
      import.meta.url),"utf8");
    expect(source).toContain("assessGate4SpendV39({");
    expect(source).toContain("BUDGET_WITNESS_READ_FAILED");
    expect(source).toContain("executeGate4SafetyActionV39(decision,");
    expect(source).toContain("assessGate4SecondStartV39(predecessor.status)");
    expect(source).toContain("REFUSED_GATE4_SECOND_START:");
    expect(source).toContain("GATE4_UNHANDLED_WATCHDOG_FAULT_STOP_UNCONFIRMED_DB");
    expect(source).toContain("GATE4_WATCHDOG_STOP_NOT_CONFIRMED");
    expect(source).toContain("GATE4_OWNED_STOP_NOT_CONFIRMED");
    expect(source).toContain("if (watchdogTickInFlight) return;");
    expect(source).toContain("watchdogTickInFlight = false;");
    const owner=readFileSync(new URL(
      "../scripts/v39_gate4_owner_v39.ts",import.meta.url),"utf8");
    expect(owner).toContain("formalGate4Passed:false");
  });
});
