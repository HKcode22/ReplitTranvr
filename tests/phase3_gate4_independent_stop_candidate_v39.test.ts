import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {
  assessGate4IndependentStopCandidateV39,
  executeGate4IndependentStopCandidateV39,
  type Gate4IndependentStopTicketV39,
  type Gate4IndependentStopPinsV39
} from "../server/lib/disruption/gate4IndependentStopCandidate_v39";
import type {WebhookSubscription} from
  "../server/lib/disruption/aerodataboxLimiter_v3";

const pins:Gate4IndependentStopPinsV39={
  sourceCommit:"a".repeat(40),
  scopeId:"11111111-2222-3333-4444-555555555555",
  authorizationSha256:"b".repeat(64),
  exactOwnedSubscriptionId:"exactID99",
  subjectId:"WSSS"
};
const ticket:Gate4IndependentStopTicketV39={
  schema:"v39.gate4.independent-stop-ticket.v1",
  sourceCommit:pins.sourceCommit,scopeId:pins.scopeId,
  authorizationSha256:pins.authorizationSha256,
  subscriptionId:pins.exactOwnedSubscriptionId,
  subjectType:"FlightByAirportIcao",subjectId:"WSSS",
  startAtUtc:"2026-10-22T20:00:00.000Z",
  stopAtUtc:"2026-10-22T20:10:00.000Z",
  controllerHeartbeatUtc:"2026-10-22T20:02:55.000Z"
};
const T=(ts:string)=>"2026-10-22T"+ts+".000Z";
const sub=(id="exactID99",airport="WSSS"):WebhookSubscription=>({
  id,isActive:true,billingType:"CreditBased",
  subject:{type:"FlightByAirportIcao",id:airport}
});
const deps=()=>{
  const listStrict=vi.fn(async():Promise<WebhookSubscription[]>=>[]);
  const deleteExactVerified=vi.fn(async(_id:string)=>true);
  return {listStrict,deleteExactVerified};
};

describe("Gate4 proposed independent STOP — fail-closed pure decision",()=>{
  it("does not arm a service or authorize a paid trial from a healthy ticket",()=>{
    const v=assessGate4IndependentStopCandidateV39(ticket,pins,T("20:03:00"));
    expect(v).toMatchObject({
      action:"WATCH",reason:"WITHIN_WINDOW_HEARTBEAT_RECENT",
      independentSupervisorArmed:false,
      paidAuthorization:false,liveGate4Certified:false
    });
  });
  it("stops at exact signed deadline, including after controller process death",()=>{
    for(const clock of [T("20:10:00"),T("20:15:00")]){
      expect(assessGate4IndependentStopCandidateV39(
        {...ticket,controllerHeartbeatUtc:null},pins,clock
      )).toMatchObject({action:"STOP",reason:"SIGNED_STOP_DEADLINE_REACHED"});
    }
    expect(assessGate4IndependentStopCandidateV39(
      ticket,pins,T("19:59:59")
    )).toMatchObject({action:"WATCH",reason:"BEFORE_SIGNED_START"});
  });
  it("requires STOP for missing, stale or future heartbeat during active window",()=>{
    expect(assessGate4IndependentStopCandidateV39({
      ...ticket,controllerHeartbeatUtc:null
    },pins,T("20:03:00")).reason).toBe("CONTROLLER_HEARTBEAT_MISSING");
    expect(assessGate4IndependentStopCandidateV39({
      ...ticket,controllerHeartbeatUtc:T("20:02:29")
    },pins,T("20:03:00")).reason).toBe("CONTROLLER_HEARTBEAT_STALE");
    expect(assessGate4IndependentStopCandidateV39({
      ...ticket,controllerHeartbeatUtc:T("20:03:06")
    },pins,T("20:03:00")).reason).toBe("CONTROLLER_CLOCK_SKEW");
    expect(assessGate4IndependentStopCandidateV39({
      ...ticket,controllerHeartbeatUtc:T("20:02:30")
    },pins,T("20:03:00")).action).toBe("WATCH");
  });
  it("holds on missing ID, scope/hash/source mismatch, noncanonical clock or wide window",()=>{
    const cases:Array<[Gate4IndependentStopTicketV39,
      Gate4IndependentStopPinsV39,string]>=[
      [{...ticket,subscriptionId:null},pins,T("20:10:00")],
      [{...ticket,subscriptionId:"foreignID"},pins,T("20:10:00")],
      [ticket,{...pins,exactOwnedSubscriptionId:"foreignID"},T("20:10:00")],
      [{...ticket,scopeId:"00000000-0000-0000-0000-000000000000"},pins,T("20:10:00")],
      [{...ticket,authorizationSha256:"c".repeat(64)},pins,T("20:10:00")],
      [{...ticket,sourceCommit:"c".repeat(40)},pins,T("20:10:00")],
      [{...ticket,subjectId:"KLAX"},pins,T("20:10:00")],
      [{...ticket,startAtUtc:"2026-10-22T19:00:00.000Z"},pins,T("20:10:00")],
      [ticket,pins,"2026-10-22"],
      [{...ticket,stopAtUtc:"invalid"},pins,T("20:10:00")]
    ];
    for(const [t,p,now] of cases){
      expect(assessGate4IndependentStopCandidateV39(t,p,now).action)
        .toBe("HOLD");
    }
  });
});

describe("Gate4 injectable STOP — no-provider fault simulation",()=>{
  it("a WATCH never calls even free LIST, much less DELETE",async()=>{
    const d=deps();
    const out=await executeGate4IndependentStopCandidateV39(
      ticket,pins,T("20:03:00"),d
    );
    expect(out).toMatchObject({
      decision:{action:"WATCH"},stopResult:null,
      independentSupervisorArmed:false,creditSettlementVerified:false
    });
    expect(d.listStrict).not.toHaveBeenCalled();
    expect(d.deleteExactVerified).not.toHaveBeenCalled();
  });
  it("untrusted or missing exact-owned ID never invokes remote provider",async()=>{
    const d=deps();
    const out=await executeGate4IndependentStopCandidateV39(
      {...ticket,subscriptionId:null},pins,T("20:10:00"),d
    );
    expect(out.decision.action).toBe("HOLD");
    expect(out.stopResult).toBeNull();
    expect(d.listStrict).not.toHaveBeenCalled();
    expect(d.deleteExactVerified).not.toHaveBeenCalled();
  });
  it("expired ticket deletes only exact matching owned ID with strict pre/post LIST",async()=>{
    const d=deps();
    d.listStrict.mockResolvedValueOnce([sub()])
      .mockResolvedValueOnce([]);
    const out=await executeGate4IndependentStopCandidateV39(
      {...ticket,controllerHeartbeatUtc:null},pins,T("20:10:00"),d
    );
    expect(d.deleteExactVerified).toHaveBeenCalledExactlyOnceWith("exactID99");
    expect(d.listStrict).toHaveBeenCalledTimes(2);
    expect(out).toMatchObject({
      decision:{action:"STOP"},
      stopResult:{status:"DELETE_VERIFIED_PENDING_SETTLEMENT",
        creditSettlementVerified:false},
      independentSupervisorArmed:false,
      creditSettlementVerified:false,paidAuthorization:false,
      liveGate4Certified:false
    });
    expect(JSON.stringify(out)).not.toContain("exactID99");
  });
  it("wrong provider subject blocks DELETE even with correct ticket and ID",async()=>{
    const d=deps();
    d.listStrict.mockResolvedValueOnce([sub("exactID99","KLAX")]);
    const out=await executeGate4IndependentStopCandidateV39(
      ticket,pins,T("20:10:00"),d
    );
    expect(out.stopResult?.status).toBe("HOLD_UNCONFIRMED");
    expect(d.deleteExactVerified).not.toHaveBeenCalled();
  });
  it("foreign active subscription does not obstruct exact owned delete but blocks account-clear",async()=>{
    const d=deps();
    d.listStrict.mockResolvedValueOnce([sub(),sub("otherSubID","KLAX")])
      .mockResolvedValueOnce([sub("otherSubID","KLAX")]);
    const out=await executeGate4IndependentStopCandidateV39(
      ticket,pins,T("20:10:00"),d
    );
    expect(d.deleteExactVerified).toHaveBeenCalledExactlyOnceWith("exactID99");
    expect(out.stopResult?.status).toBe("HOLD_UNCONFIRMED");
    expect(out.creditSettlementVerified).toBe(false);
  });
  it("strict provider LIST failure is HOLD, never zero active",async()=>{
    const d=deps();
    d.listStrict.mockRejectedValueOnce(new Error("secret provider error"));
    const out=await executeGate4IndependentStopCandidateV39(
      ticket,pins,T("20:10:00"),d
    );
    expect(out.stopResult?.status).toBe("HOLD_UNCONFIRMED");
    expect(d.deleteExactVerified).not.toHaveBeenCalled();
    expect(JSON.stringify(out)).not.toContain("secret");
  });
  it("DELETE failure or post-delete still active cannot certify terminal STOP",async()=>{
    const d=deps();
    d.listStrict.mockResolvedValue([sub()]);
    d.deleteExactVerified.mockResolvedValue(false);
    const failed=await executeGate4IndependentStopCandidateV39(
      ticket,pins,T("20:10:00"),d
    );
    expect(failed.stopResult?.status).toBe("HOLD_UNCONFIRMED");
    const d2=deps();
    d2.listStrict.mockResolvedValue([sub()]);
    const stillActive=await executeGate4IndependentStopCandidateV39(
      ticket,pins,T("20:10:00"),d2
    );
    expect(stillActive.stopResult?.status).toBe("HOLD_UNCONFIRMED");
  });
  it("no source-level transport, env credential, DB or auto-run code",()=>{
    const code=readFileSync(new URL(
      "../server/lib/disruption/gate4IndependentStopCandidate_v39.ts",
      import.meta.url
    ),"utf8");
    expect(code).not.toContain("process.env");
    expect(code).not.toContain("fetch(");
    expect(code).not.toContain("setInterval(");
    expect(code).not.toContain("createSubscription(");
    expect(code).not.toContain("startBatch(");
    expect(code).toContain("stopGate4ExactOwnedV39(");
  });
});
