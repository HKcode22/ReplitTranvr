import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {bindOrCompensatePrepaidSubscriptionV39} from
  "../server/lib/disruption/prepaidSubscriptionBindingRecovery_v39";

const valid=()=>({sessionId:randomUUID(),subscriptionId:"sub-own-123"});
describe("Real prepaid CREATE→SQL BIND failure must not leave a billable orphan silently",()=>{
  it("on successful bind: no deletion, no provider creation or settlement claim",async()=>{
    const calls:string[]=[],x=valid();
    const result=await bindOrCompensatePrepaidSubscriptionV39(x,{
      bind:async(s,sub)=>{calls.push("bind:"+s+":"+sub);},
      deleteOwnedVerified:async()=>{calls.push("DELETE");return true;},
    });
    expect(result).toMatchObject({
      status:"BOUND",subscriptionDeleted:false,
      reconciliationRequired:false,paidRunSucceeded:false,
    });
    expect(calls).toEqual(["bind:"+x.sessionId+":"+x.subscriptionId]);
  });
  it("on SQL bind error: delete exactly the owned provider ID, never retry CREATE",async()=>{
    const calls:string[]=[],x=valid();
    const result=await bindOrCompensatePrepaidSubscriptionV39(x,{
      bind:async()=>{calls.push("bind");throw Error("postgres down");},
      deleteOwnedVerified:async(sub)=>{calls.push("DELETE:"+sub);return true;},
    });
    expect(result).toEqual({
      status:"BIND_FAILED_DELETED",
      subscriptionDeleted:true,reconciliationRequired:true,
      paidRunSucceeded:false,
    });
    expect(calls).toEqual(["bind","DELETE:sub-own-123"]);
  });
  it("when provider delete returns false: preserve unresolved ownership/stop",async()=>{
    const x=valid();
    const result=await bindOrCompensatePrepaidSubscriptionV39(x,{
      bind:async()=>{throw Error("SQL lost");},
      deleteOwnedVerified:async()=>false,
    });
    expect(result).toEqual({
      status:"BIND_FAILED_DELETE_UNRESOLVED",
      subscriptionDeleted:false,reconciliationRequired:true,
      paidRunSucceeded:false,
    });
  });
  it("ambiguous provider delete exception also preserves unresolved exposure",async()=>{
    const x=valid();
    const result=await bindOrCompensatePrepaidSubscriptionV39(x,{
      bind:async()=>{throw Error("SQL timeout");},
      deleteOwnedVerified:async()=>{throw Error("provider gateway timeout");},
    });
    expect(result.status).toBe("BIND_FAILED_DELETE_UNRESOLVED");
    expect(result.subscriptionDeleted).toBe(false);
    expect(result.paidRunSucceeded).toBe(false);
  });
  it("rejects malformed source ownership before calling either side effect",async()=>{
    for(const x of [
      {sessionId:"broken",subscriptionId:"sub-123"},
      {sessionId:randomUUID(),subscriptionId:""},
      {sessionId:randomUUID(),subscriptionId:"x".repeat(300)},
    ]){
      let called=false;
      await expect(bindOrCompensatePrepaidSubscriptionV39(x,{
        bind:async()=>{called=true;},
        deleteOwnedVerified:async()=>{called=true;return true;},
      })).rejects.toThrow("PREPAID_CREATE_BIND_COMPENSATION_INPUT_INVALID");
      expect(called).toBe(false);
    }
  });
  it("shared prepaid runner has compensation before exposing the live watch loop",()=>{
    const code=readFileSync("server/lib/disruption/prepaidProbeWindow_v39.ts","utf8");
    const create=code.indexOf('await createSubscription("FlightByAirportIcao"');
    const recovery=code.indexOf("await bindOrCompensatePrepaidSubscriptionV39({");
    const monitor=code.indexOf("while (Date.now() < deadline)");
    const hold=code.indexOf("subscription_bind_failed_delete_unresolved_emergency_stop");
    expect(create).toBeGreaterThan(0);
    expect(recovery).toBeGreaterThan(create);
    expect(hold).toBeGreaterThan(recovery);
    expect(monitor).toBeGreaterThan(recovery);
    expect(code).toContain("deleteOwnedVerified:deleteOwnedSubscriptionVerifiedV39");
    expect(code).toContain('reconciliationStatus:"UNRESOLVED"');
    expect(code).toContain("externalCredits:null");
    expect(code).toContain("cleanupVerifiedAtUtc:null");
    expect(code).not.toContain("await bindPrepaidProbeSubscriptionV39(session.sessionId, sub.id);");
  });
});
