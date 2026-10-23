import {describe,it,expect,vi} from "vitest";
import {runGate4ActionsStopTickV39,type Gate4StopTickDepsV39}
 from "../server/lib/disruption/gate4ActionsStopIntegration_v39";
import type {WebhookSubscription} from
 "../server/lib/disruption/aerodataboxLimiter_v3";
const scope={
 scopeId:"11111111-2222-3333-4444-555555555555",
 sourceCommit:"a".repeat(40),authorizationSha256:"b".repeat(64),
 airportIcao:"WSSS",startUtc:"2026-10-22T20:00:00.000Z",
 stopUtc:"2026-10-22T20:10:00.000Z",
 observedStartingCredits:2037,softCreditTarget:20,protectedCreditFloor:1000
};
const ownId="exactOWN99";
const owner={scopeId:scope.scopeId,sourceCommit:scope.sourceCommit,
 authorizationSha256:scope.authorizationSha256,airportIcao:"WSSS",
 subscriptionId:ownId};
const active:WebhookSubscription={
 id:ownId,isActive:true,billingType:"CreditBased",
 subject:{type:"FlightByAirportIcao",id:"WSSS"}
};
function deps():Gate4StopTickDepsV39 & {
 deleteOwnedExact:ReturnType<typeof vi.fn>;
 strictInventory:ReturnType<typeof vi.fn>
}{
 let isActive=true;
 return {
  readExactOwned:vi.fn(async()=>owner),
  strictCredits:vi.fn(async()=>2037),
  strictInventory:vi.fn(async()=>isActive?[active]:[]),
  deleteOwnedExact:vi.fn(async(id:string)=>{
   if(id!==ownId)throw Error("attempted foreign delete");
   isActive=false;return true;
  })
 };
}
const now="2026-10-22T20:11:00.000Z";
describe("Gate4 Actions actual policy-to-exact-delete integration: mock transport",()=>{
 it("verified owner at deadline: exact DELETE, second strict LIST, no settlement claim",async()=>{
  const d=deps();
  const v=await runGate4ActionsStopTickV39(scope,now,d);
  expect(v).toMatchObject({status:"STOPPED_EXACT_PENDING_SETTLEMENT",
   attemptedExactDelete:true,noActiveExactIdVerified:true,
   threeBalanceSettlementVerified:false,hardProviderCreditCap:false,
   providerCreateCount:0});
  expect(d.deleteOwnedExact).toHaveBeenCalledExactlyOnceWith(ownId);
  expect(d.strictInventory).toHaveBeenCalledTimes(2);
 });
 it("before soft budget and before deadline performs no DELETE",async()=>{
  const d=deps();
  const v=await runGate4ActionsStopTickV39(
   scope,"2026-10-22T20:05:00.000Z",d);
  expect(v).toMatchObject({status:"WATCH",attemptedExactDelete:false});
  expect(d.deleteOwnedExact).not.toHaveBeenCalled();
 });
 it("soft spending trigger sends exact owned STOP",async()=>{
  const d=deps();
  const r=await runGate4ActionsStopTickV39(
   scope,"2026-10-22T20:04:00.000Z",
   {...d,strictCredits:async()=>2017});
  expect(r.status).toBe("STOPPED_EXACT_PENDING_SETTLEMENT");
  expect(d.deleteOwnedExact).toHaveBeenCalledWith(ownId);
 });
 it("provider balance GET outage with exact custody triggers emergency STOP",async()=>{
  const d=deps();
  const r=await runGate4ActionsStopTickV39(scope,now,{
    ...d,strictCredits:async()=>{throw Error("provider timeout");}
  });
  expect(r.status).toBe("STOPPED_EXACT_PENDING_SETTLEMENT");
  expect(d.deleteOwnedExact).toHaveBeenCalledExactlyOnceWith(ownId);
 });
 it("provider LIST outage with exact custody still attempts DELETE then strict verify",async()=>{
  const d=deps();let c=0;
  const r=await runGate4ActionsStopTickV39(scope,now,{
    ...d,
    strictInventory:async()=>{
      c++;if(c===1)throw Error("provider LIST timeout");
      return [];
    }
  });
  expect(r.status).toBe("STOPPED_EXACT_PENDING_SETTLEMENT");
  expect(d.deleteOwnedExact).toHaveBeenCalledExactlyOnceWith(ownId);
 });
 it("no bound ID and active billable returns owner HOLD without deleting unknown",async()=>{
  const d=deps();
  const r=await runGate4ActionsStopTickV39(scope,now,{
    ...d,readExactOwned:async()=>null
  });
  expect(r).toMatchObject({status:"HOLD_OWNER_REQUIRED",
    ownerIdWasBound:false,attemptedExactDelete:false});
  expect(d.deleteOwnedExact).not.toHaveBeenCalled();
 });
 it("wrong scope bind fails before provider or DELETE",async()=>{
  const d=deps();
  const credits=vi.fn(async()=>2037);
  const r=await runGate4ActionsStopTickV39(scope,now,{
    ...d,readExactOwned:async()=>({...owner,airportIcao:"KLAX"}),
    strictCredits:credits
  });
  expect(r.reason).toBe("OWNER_CUSTODY_SCOPE_MISMATCH");
  expect(credits).not.toHaveBeenCalled();
  expect(d.deleteOwnedExact).not.toHaveBeenCalled();
 });
 it("failed exact DELETE is not a certified STOP",async()=>{
  const d=deps();
  const r=await runGate4ActionsStopTickV39(scope,now,{
    ...d,deleteOwnedExact:vi.fn(async()=>false)
  });
  expect(r).toMatchObject({status:"STOP_UNCONFIRMED",
    attemptedExactDelete:true,threeBalanceSettlementVerified:false});
 });
 it("post-delete inventory still shows owned active: STOP_UNCONFIRMED",async()=>{
  const d=deps();
  const r=await runGate4ActionsStopTickV39(scope,now,{
    ...d,deleteOwnedExact:vi.fn(async()=>true)
  });
  expect(r).toMatchObject({status:"STOP_UNCONFIRMED",
    reason:"OWNED_ID_STILL_ACTIVE",noActiveExactIdVerified:false});
 });
 it("post-delete strict LIST error does not become false success",async()=>{
  const d=deps();let n=0;
  const r=await runGate4ActionsStopTickV39(scope,now,{
    ...d,strictInventory:async()=>{
      n++;if(n===2)throw Error("offline");return [active];
    }
  });
  expect(r).toMatchObject({status:"STOP_UNCONFIRMED",
    reason:"POST_STOP_STRICT_LIST_FAILED"});
 });
 it("bad startup/clock has no provider calls, no DELETE",async()=>{
  const d=deps();
  const r=await runGate4ActionsStopTickV39(scope,"not a time",d);
  expect(r.status).toBe("HOLD_OWNER_REQUIRED");
  expect(d.deleteOwnedExact).not.toHaveBeenCalled();
  expect(d.strictInventory).not.toHaveBeenCalled();
 });
});
