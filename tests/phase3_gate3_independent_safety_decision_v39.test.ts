import {describe,expect,it} from "vitest";
import {decideGate3IndependentSafetyV39} from
  "../server/lib/disruption/gate3IndependentSafetyDecision_v39";

const id="1789c946-f0f1-4b51-a25b-3fb41d7caf97";
const cb=`https://example.com/api/v1/webhooks/aerodatabox/secure-path/prepaid/${id}`;
const exact={
  id:"provider-owned-WSSS-1",isActive:true,billingType:"CreditBased" as const,
  subject:{type:"FlightByAirportIcao",id:"WSSS"},
  subscriber:{type:"WebHook",id:cb}
};
const foreign={
  ...exact,id:"foreign-other-sub",
  subscriber:{type:"WebHook",id:"https://example.com/foreign"}
};
const base={
  sessionId:id,ownerSessionId:id,
  icao:"WSSS" as const,callbackUrl:cb,
  ownerState:"PREPARED" as const,
  approvedAuthSha256:"a".repeat(64),
  ownerAuthSha256:"a".repeat(64),
  startUtc:"2026-10-20T12:00:00Z",
  fixedSeconds:600 as const,baselineCredits:1600,
  currentCredits:1599,softStopCredits:50 as const,
  observedAtUtc:"2026-10-20T12:02:00Z",
  runtimeSessionVisible:true,
  subscriptions:[exact]
};

describe("independent Gate3 WSSS safety decision; pure, no provider mutations",()=>{
  it("continues before deadline and below soft-stop threshold",()=>{
    const a=decideGate3IndependentSafetyV39(base);
    expect(a.decision).toBe("MONITOR");
    expect(a.exactOwnedSubscriptionId).toBe(exact.id);
    expect(a.observedCreditSpend).toBe(1);
    expect(a.guaranteesCreditCeiling).toBe(false);
    expect(a.providerMutationsHere).toBe(0);
  });
  it("stops exact owned subscription at observed 50-credit target",()=>{
    const a=decideGate3IndependentSafetyV39({...base,currentCredits:1550});
    expect(a.decision).toBe("DELETE_EXACT_OWNED");
    expect(a.exactOwnedSubscriptionId).toBe(exact.id);
    expect(a.reason).toBe("SOFT_FIFTY_CREDITS_REACHED");
  });
  it("stops at 10-minute boundary regardless of credit consumption",()=>{
    const a=decideGate3IndependentSafetyV39({
      ...base,observedAtUtc:"2026-10-20T12:10:00Z"
    });
    expect(a.decision).toBe("DELETE_EXACT_OWNED");
    expect(a.reason).toBe("TEN_MINUTE_WALL_CLOCK_EXPIRED");
  });
  it("stops exact owned active subscription after UNLOGGED state loss",()=>{
    const a=decideGate3IndependentSafetyV39({
      ...base,runtimeSessionVisible:false
    });
    expect(a.reason).toBe("UNLOGGED_SESSION_LOST_WHILE_PROVIDER_ACTIVE");
    expect(a.decision).toBe("DELETE_EXACT_OWNED");
  });
  it("stops exact owned active subscription even when LOGGED owner is FAILED",()=>{
    const a=decideGate3IndependentSafetyV39({
      ...base,ownerState:"FAILED"
    });
    expect(a.decision).toBe("DELETE_EXACT_OWNED");
    expect(a.reason).toBe("TERMINAL_LOGGED_OWNER_WITH_ACTIVE_PROVIDER_SUBSCRIPTION");
  });
  it("stops exact owned subscription on loss of provider balance visibility",()=>{
    const a=decideGate3IndependentSafetyV39({
      ...base,currentCredits:null
    });
    expect(a.decision).toBe("DELETE_EXACT_OWNED");
    expect(a.reason).toBe("PROVIDER_BALANCE_UNAVAILABLE_FAIL_CLOSED");
  });
  it("stops exact owned subscription if balance increased during run",()=>{
    const a=decideGate3IndependentSafetyV39({
      ...base,currentCredits:1601
    });
    expect(a.decision).toBe("DELETE_EXACT_OWNED");
    expect(a.reason).toBe("PROVIDER_BALANCE_INCREASE_IS_CONTAMINATION");
  });
  it("stops exact subscription created too early",()=>{
    const a=decideGate3IndependentSafetyV39({
      ...base,observedAtUtc:"2026-10-20T11:50:00Z"
    });
    expect(a.reason).toBe("SUBSCRIPTION_ACTIVE_BEFORE_AUTHORIZED_WINDOW");
  });
  it("never authorizes deleting foreign subscriber with same WSSS subject",()=>{
    const a=decideGate3IndependentSafetyV39({
      ...base,subscriptions:[foreign]
    });
    expect(a.decision).toBe("NO_EXACT_ACTIVE_SUBSCRIPTION");
    expect(a.exactOwnedSubscriptionId).toBeNull();
  });
  it("stops ONLY our exact subscription if a foreign billable appears",()=>{
    const a=decideGate3IndependentSafetyV39({
      ...base,subscriptions:[exact,foreign]
    });
    expect(a.decision).toBe("DELETE_EXACT_OWNED");
    expect(a.exactOwnedSubscriptionId).toBe(exact.id);
    expect(a.reason).toBe("FOREIGN_ACTIVE_BILLABLE_CONTAMINATION");
  });
  it("never guesses among two exact callback subscriptions",()=>{
    const a=decideGate3IndependentSafetyV39({
      ...base,subscriptions:[exact,{...exact,id:"another-exact"}]
    });
    expect(a.decision).toBe("HOLD");
    expect(a.exactOwnedSubscriptionId).toBeNull();
  });
  it("refuses hash-mismatched owner without any delete authorization",()=>{
    const a=decideGate3IndependentSafetyV39({
      ...base,ownerAuthSha256:"b".repeat(64)
    });
    expect(a.decision).toBe("HOLD");
    expect(a.exactOwnedSubscriptionId).toBeNull();
  });
  it("refuses session ID mismatch and URL that only contains a partial match",()=>{
    for(const patch of [
      {ownerSessionId:"ffb41e11-b4ce-4b54-9973-70668bc22926"},
      {callbackUrl:cb+"/other"},
    ]){
      const a=decideGate3IndependentSafetyV39({...base,...patch});
      expect(a.decision).toBe("HOLD");
    }
  });
  it("does not claim zero active means provider deletion or reconciliation certified",()=>{
    const a=decideGate3IndependentSafetyV39({
      ...base,subscriptions:[]
    });
    expect(a.decision).toBe("NO_EXACT_ACTIVE_SUBSCRIPTION");
    expect(a.reason).toBe("ZERO_EXACT_ACTIVE_NOT_PROOF_OF_SETTLEMENT");
    expect(a.guaranteesCreditCeiling).toBe(false);
  });
  it("rejects malformed subscription inventory",()=>{
    const a=decideGate3IndependentSafetyV39({
      ...base,subscriptions:[{...exact,isActive:"true" as any}]
    });
    expect(a.decision).toBe("HOLD");
  });
});
