import {describe,expect,it,vi} from "vitest";
import {runGate3IndependentWatchdogTickV39,
  type Gate3WatchdogOwnerRowV39,
  type Gate3WatchdogScopeV39}
  from "../server/lib/disruption/gate3IndependentWatchdogTick_v39";
const sid="1789c946-f0f1-4b51-a25b-3fb41d7caf97";
const url=`https://replit-tranvr--hk84164.replit.app/api/v1/webhooks/aerodatabox/secret-injected/prepaid/${sid}`;
const scope:Gate3WatchdogScopeV39={
  sessionId:sid,authSha256:"a".repeat(64),callbackUrl:url,
  startUtc:"2026-10-20T12:00:00Z",baselineCredits:1600
};
const own:Gate3WatchdogOwnerRowV39={
  sessionId:sid,ownerState:"PREPARED",icao:"WSSS",
  authorizationEvidenceSha256:"a".repeat(64),
  fixedExposureSeconds:600,canaryCreditCeiling:50,
  runtimeSessionVisible:true,boundProviderSubscriptionId:"own1",
};
const exact={
  id:"own1",isActive:true,billingType:"CreditBased" as const,
  subject:{type:"FlightByAirportIcao",id:"WSSS"},
  subscriber:{type:"WebHook",id:url}
};
const foreign={...exact,id:"foreign",
  subscriber:{type:"WebHook",id:"https://somewhere.else/webhook"}};
function fixture(p?:{
  owner?:Gate3WatchdogOwnerRowV39|null;
  subscriptions?:any[];balance?:number|null;
  after?:any[];now?:string;
}){
  const owner=p?.owner===undefined?own:p.owner;
  const inventory=p?.subscriptions??[exact];
  const readOwner=vi.fn(async()=>owner);
  let count=0;
  const list=vi.fn(async()=>{
    count++;
    return count>=3 && p?.after!==undefined?p.after:inventory;
  });
  const balance=vi.fn(async()=>p?.balance===undefined?1599:p.balance);
  const deleteExact=vi.fn(async(_id:string)=>true);
  const now=vi.fn(()=>new Date(p?.now??"2026-10-20T12:03:00Z"));
  return {d:{readOwner,list,balance,deleteExact,now},list,deleteExact};
}
describe("actual Gate3 independent provider watchdog tick, disposable providers only",()=>{
  it("MONITOR: no DELETE beneath soft cap and before deadline",async()=>{
    const f=fixture();
    const x=await runGate3IndependentWatchdogTickV39(scope,f.d);
    expect(x.status).toBe("MONITOR");
    expect(x.authorizesAnotherCreate).toBe(false);
    expect(x.guaranteesCreditCeiling).toBe(false);
    expect(f.deleteExact).not.toHaveBeenCalled();
  });
  it("DELETE exact after observing 50 credits; verify true provider LIST absence",async()=>{
    const f=fixture({balance:1550,after:[]});
    const x=await runGate3IndependentWatchdogTickV39(scope,f.d);
    expect(x.status).toBe("STOP_VERIFIED");
    expect(x.verifiedExactSubscriptionAbsent).toBe(true);
    expect(x.providerDeleteAttempted).toBe(true);
    expect(f.deleteExact).toHaveBeenCalledExactlyOnceWith("own1");
    expect(f.list).toHaveBeenCalledTimes(3);
  });
  it("DELETE at wall time regardless of credit count",async()=>{
    const f=fixture({now:"2026-10-20T12:10:00Z",after:[]});
    expect((await runGate3IndependentWatchdogTickV39(scope,f.d)).status)
      .toBe("STOP_VERIFIED");
  });
  it("DELETE active owned after UNLOGGED receiver-session loss",async()=>{
    const f=fixture({owner:{...own,runtimeSessionVisible:false},after:[]});
    expect((await runGate3IndependentWatchdogTickV39(scope,f.d)).reason)
      .toBe("UNLOGGED_SESSION_LOST_WHILE_PROVIDER_ACTIVE");
    expect(f.deleteExact).toHaveBeenCalledExactlyOnceWith("own1");
  });
  it("DELETE exact own on foreign billable without touching foreign",async()=>{
    const f=fixture({subscriptions:[exact,foreign],after:[foreign]});
    const x=await runGate3IndependentWatchdogTickV39(scope,f.d);
    expect(x.status).toBe("STOP_VERIFIED");
    expect(x.otherBillablePresent).toBe(true);
    expect(f.deleteExact).toHaveBeenCalledExactlyOnceWith("own1");
  });
  it("stops exact own on a provider-balance transport failure",async()=>{
    const f=fixture({balance:null,after:[]});
    const x=await runGate3IndependentWatchdogTickV39(scope,f.d);
    expect(x.status).toBe("STOP_VERIFIED");
    expect(x.reason).toBe("PROVIDER_BALANCE_UNAVAILABLE_FAIL_CLOSED");
  });
  it("never deletes when two exact active subscriptions are ambiguous",async()=>{
    const f=fixture({subscriptions:[exact,{...exact,id:"own2"}]});
    expect((await runGate3IndependentWatchdogTickV39(scope,f.d)).status)
      .toBe("HOLD");
    expect(f.deleteExact).not.toHaveBeenCalled();
  });
  it("never deletes when live bound ID disagrees with strict LIST id",async()=>{
    const f=fixture({owner:{...own,boundProviderSubscriptionId:"other"}});
    const x=await runGate3IndependentWatchdogTickV39(scope,f.d);
    expect(x.reason).toBe("BOUND_PROVIDER_ID_MISMATCH_NEVER_DELETE");
    expect(f.deleteExact).not.toHaveBeenCalled();
  });
  it("never deletes when approval SHA doesn't match durable owner",async()=>{
    const f=fixture({owner:{...own,authorizationEvidenceSha256:"b".repeat(64)}});
    expect((await runGate3IndependentWatchdogTickV39(scope,f.d)).status)
      .toBe("HOLD");
    expect(f.list).not.toHaveBeenCalled();
  });
  it("never deletes a foreign subscription without exact active callback match",async()=>{
    const f=fixture({subscriptions:[foreign]});
    const x=await runGate3IndependentWatchdogTickV39(scope,f.d);
    expect(x.status).toBe("ZERO_EXACT_SUBSCRIPTIONS");
    expect(x.verifiedExactSubscriptionAbsent).toBe(true);
    expect(f.deleteExact).not.toHaveBeenCalled();
  });
  it("refuses unexpected provider list changes between observation and delete",async()=>{
    const f=fixture({balance:1550});
    f.list.mockResolvedValueOnce([exact] as any);
    f.list.mockResolvedValueOnce([] as any);
    const x=await runGate3IndependentWatchdogTickV39(scope,f.d);
    expect(x.reason).toBe("EXACT_SUBSCRIPTION_CHANGED_BEFORE_DELETE");
    expect(f.deleteExact).not.toHaveBeenCalled();
  });
  it("refuses an unconfirmed DELETE, not a false green",async()=>{
    const f=fixture({balance:1550});
    f.deleteExact.mockResolvedValue(false);
    const x=await runGate3IndependentWatchdogTickV39(scope,f.d);
    expect(x.status).toBe("HOLD");
    expect(x.verifiedExactSubscriptionAbsent).toBe(false);
  });
  it("refuses an active same ID after verified DELETE returned true",async()=>{
    const f=fixture({balance:1550,after:[exact]});
    const x=await runGate3IndependentWatchdogTickV39(scope,f.d);
    expect(x.reason).toBe("EXACT_DELETE_STILL_ACTIVE");
  });
  it("refuses missing LOGGED owner without any provider call",async()=>{
    const f=fixture({owner:null});
    expect((await runGate3IndependentWatchdogTickV39(scope,f.d)).status)
      .toBe("HOLD");
    expect(f.list).not.toHaveBeenCalled();
  });
  it("refuses invalid callback URL before provider/SQL IO",async()=>{
    const f=fixture();
    const x=await runGate3IndependentWatchdogTickV39(
      {...scope,callbackUrl:"http://localhost"},f.d);
    expect(x.status).toBe("HOLD");
    expect(f.list).not.toHaveBeenCalled();
  });
});
