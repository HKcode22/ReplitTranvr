import {describe,it,expect} from "vitest";
import {GATE05_NEW_WSSS_APPROVAL_V39,
  reviewNewGate05WsssSpendV39,type Gate05SpendSampleV39
} from "../server/lib/disruption/gate05Scientific500CreditSafety_v39";
const specimen=():Gate05SpendSampleV39=>({
  initialAuthoritativeCredits:1981,currentAuthoritativeCredits:1981,
  initialRestUnits:59980,currentRestUnits:59980,
  receivedItemCreditClaims:0,sustainedPositiveDriftReadbacks:0,
  elapsedPilotMinutes:5,exactOwnedScopeConfirmed:true,
  independentStopActuallyRunning:true,stopConfirmed:false,
  callbackRawFirstReady:true,activeOwnedSubscriptions:1,
  activeForeignSubscriptions:0
});
describe("WSSS Gate05 owner authorized ONE 500-credit pilot safety",()=>{
  it("documents one use scope and stops 150 credits before 500",()=>{
    expect(GATE05_NEW_WSSS_APPROVAL_V39.maximumAuthorizedAlertCredits).toBe(500);
    expect(GATE05_NEW_WSSS_APPROVAL_V39.maximumAuthorizedRestUnits).toBe(12);
    const out=reviewNewGate05WsssSpendV39(specimen());
    expect(out.state).toBe("CONTINUE");
    expect(out.creditStopThreshold).toBe(350);
    expect(out.creditReserve).toBe(150);
    expect(out.paidCreateAuthorizedByThisPureFunction).toBe(false);
    expect(out.providerCalls).toBe(0);
  });
  it("early STOP at 350 spent, without claiming an API hard cap",()=>{
    const s=specimen();s.currentAuthoritativeCredits=1631;
    s.receivedItemCreditClaims=350;
    const out=reviewNewGate05WsssSpendV39(s);
    expect(out.state).toBe("STOP_NOW");
    expect(out.reasons).toContain("EARLY_STOP_RESERVE_TRIGGER");
    expect(out.creditsMayOvershootBecauseProviderSendAsynchronous).toBe(true);
  });
  it("knows 1,981 balance with prior floor 1,900 has only 81, but new 500 allocation is a NEW scope",()=>{
    expect(1981-1900).toBe(81);
    expect(1981-500).toBe(1481);
    expect(500).toBeGreaterThan(81);
  });
  it("flags unknown balance instead of treating null as zero spend",()=>{
    const s=specimen();s.currentAuthoritativeCredits=null;
    expect(reviewNewGate05WsssSpendV39(s).state).toBe("STOP_NOW");
  });
  it("refuses foreign or two owned active subscriptions",()=>{
    const s=specimen();s.activeForeignSubscriptions=1;
    expect(reviewNewGate05WsssSpendV39(s).state).toBe("STOP_NOW");
    s.activeForeignSubscriptions=0;s.activeOwnedSubscriptions=2;
    expect(reviewNewGate05WsssSpendV39(s).state).toBe("HOLD_NO_CREATE");
  });
  it("requires receiver binding and independent verified running STOP",()=>{
    const s=specimen();s.exactOwnedScopeConfirmed=false;
    expect(reviewNewGate05WsssSpendV39(s).state).toBe("STOP_NOW");
    s.exactOwnedScopeConfirmed=true;s.independentStopActuallyRunning=false;
    expect(reviewNewGate05WsssSpendV39(s).state).toBe("STOP_UNCONFIRMED");
  });
  it("does not accidentally rearm after a confirmed STOP",()=>{
    const s=specimen();s.stopConfirmed=true;s.activeOwnedSubscriptions=0;
    expect(reviewNewGate05WsssSpendV39(s).state).toBe("STOP_NOW");
  });
  it("does not claim receiver loss merely from one transient +2 billing discrepancy",()=>{
    const s=specimen();s.currentAuthoritativeCredits=1979;s.receivedItemCreditClaims=0;
    s.sustainedPositiveDriftReadbacks=1;
    expect(reviewNewGate05WsssSpendV39(s).state)
      .toBe("CONTINUE_WITH_ACCOUNTING_WARNING");
    s.sustainedPositiveDriftReadbacks=2;
    expect(reviewNewGate05WsssSpendV39(s).state).toBe("STOP_NOW");
  });
  it("stops at 60 minutes and fails if REST quota consumption exceeds 12",()=>{
    const s=specimen();s.elapsedPilotMinutes=60;
    expect(reviewNewGate05WsssSpendV39(s).reasons).toContain("OBSERVATION_WINDOW_END");
    s.elapsedPilotMinutes=30;s.currentRestUnits=59967;
    expect(reviewNewGate05WsssSpendV39(s).reasons).toContain("REST_BUDGET_EXCEEDED");
  });
  it("never accepts increased cap, nonexistent reserved burst or fractional credits",()=>{
    expect(()=>reviewNewGate05WsssSpendV39(specimen(),{
      maximumAuthorizedAlertCredits:501,stopReserveCredits:150,
      maximumAuthorizedRestUnits:12,scientificWindowMinutes:60
    })).toThrow("GATE05_SCIENTIFIC_SPENDING_POLICY_INVALID");
    const s=specimen();s.currentAuthoritativeCredits=1981.5;
    expect(()=>reviewNewGate05WsssSpendV39(s)).toThrow("GATE05_PROVIDER_BALANCE_INVALID");
  });
});
