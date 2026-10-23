import {describe,it,expect,vi} from "vitest";
import {
  assessGate4StandaloneAccountV39,
  stopGate4ExactOwnedV39,
  type Gate4StandaloneAccountEvidenceV39
} from "../server/lib/disruption/gate4StandaloneSafety_v39";
import type {WebhookSubscription} from
 "../server/lib/disruption/aerodataboxLimiter_v3";

const foundation:Gate4StandaloneAccountEvidenceV39={
  balances:[2037,2037,2037],
  quotaRemaining:[59996,59996,59996],
  activeCreditBased:0,activePhase6Batches:0,
  canaryCap:20,unsettledBurstReserve:10,protectedCreditFloor:1000
};
const sub=(id="exactID99",subject="WSSS"):WebhookSubscription=>({
 id,isActive:true,billingType:"CreditBased",
 subject:{type:"FlightByAirportIcao",id:subject}
});
const scope={
 subscriptionId:"exactID99",
 subjectType:"FlightByAirportIcao" as const,subjectId:"WSSS"
};
describe("Gate4 independent small-canary free account foundation",()=>{
 it("accepts three stable free reads but NEVER issues paid authorization",()=>{
  expect(assessGate4StandaloneAccountV39(foundation)).toMatchObject({
    readyForSeparateAuthorization:true,
    maximumPlannedExposure:30,actualProviderHardCapCertified:false,
    paidAuthorization:false,liveGate4Certified:false
  });
 });
 it("rejects differing/partial/invalid three-reading balances",()=>{
  for(const balances of [[2037],[2037,2036,2037],[2037,-1,2037],
      [2037,NaN,2037]])
   expect(assessGate4StandaloneAccountV39({...foundation,balances})
    .readyForSeparateAuthorization).toBe(false);
 });
 it("rejects foreign active, active Phase6 and low floor",()=>{
  for(const p of [
    {activeCreditBased:1},{activePhase6Batches:1},
    {balances:[1020,1020,1020]}
   ])
   expect(assessGate4StandaloneAccountV39({...foundation,...p})
    .readyForSeparateAuthorization).toBe(false);
 });
 it("rejects missing burst reserve and above-small-scope cap",()=>{
  for(const p of [
    {unsettledBurstReserve:0},{canaryCap:101},
    {protectedCreditFloor:999}
   ])
   expect(assessGate4StandaloneAccountV39({...foundation,...p})
    .readyForSeparateAuthorization).toBe(false);
 });
});
describe("Gate4 independently callable exact-ID provider STOP",()=>{
 it("deletes only explicitly owned matching provider ID, then strict LIST",async()=>{
   const list=vi.fn()
     .mockResolvedValueOnce([sub()])
     .mockResolvedValueOnce([]);
   const del=vi.fn().mockResolvedValue(true);
   const r=await stopGate4ExactOwnedV39(scope,{
     listStrict:list,deleteExactVerified:del
   });
   expect(del).toHaveBeenCalledExactlyOnceWith("exactID99");
   expect(list).toHaveBeenCalledTimes(2);
   expect(r).toMatchObject({
     status:"DELETE_VERIFIED_PENDING_SETTLEMENT",
     independentAccountReadbackVerified:true,
     creditSettlementVerified:false,liveGate4Certified:false
   });
 });
 it("refuses unknown CREATE orphan without ID rather than deleting by airport",async()=>{
   const del=vi.fn().mockResolvedValue(true);
   const r=await stopGate4ExactOwnedV39(
     {...scope,subscriptionId:"lostResponse"},{
       listStrict:async()=>[sub()],deleteExactVerified:del
     });
   expect(r.status).toBe("HOLD_UNCONFIRMED");
   expect(del).not.toHaveBeenCalled();
 });
 it("refuses to delete a subscription ID with the wrong subject",async()=>{
   const del=vi.fn().mockResolvedValue(true);
   const r=await stopGate4ExactOwnedV39(scope,{
     listStrict:async()=>[sub("exactID99","KLAX")],
     deleteExactVerified:del
   });
   expect(r.status).toBe("HOLD_UNCONFIRMED");
   expect(del).not.toHaveBeenCalled();
 });
 it("refuses ambiguous duplicate provider IDs rather than deleting",async()=>{
   const del=vi.fn().mockResolvedValue(true);
   const r=await stopGate4ExactOwnedV39(scope,{
     listStrict:async()=>[sub(),sub("exactID99","KLAX")],
     deleteExactVerified:del
   });
   expect(r).toMatchObject({
     status:"HOLD_UNCONFIRMED",creditSettlementVerified:false
   });
   expect(del).not.toHaveBeenCalled();
 });
 it("tries exact OWNED STOP even if foreign active subscription appears",async()=>{
   const del=vi.fn().mockResolvedValue(true);
   const inventory=vi.fn()
      .mockResolvedValueOnce([sub(),sub("foreignID")])
      .mockResolvedValueOnce([sub("foreignID")]);
   const r=await stopGate4ExactOwnedV39(scope,{
      listStrict:inventory,deleteExactVerified:del
   });
   expect(del).toHaveBeenCalledTimes(1);
   expect(del).toHaveBeenCalledWith("exactID99");
   expect(r.status).toBe("HOLD_UNCONFIRMED");
   expect(r.creditSettlementVerified).toBe(false);
 });
 it("never treats failure, missing DELETE, or post STOP active as verified",async()=>{
   const del=vi.fn().mockRejectedValue(Error("network lost"));
   const f=await stopGate4ExactOwnedV39(scope,{
     listStrict:async()=>[sub()],deleteExactVerified:del
   });
   expect(f.status).toBe("HOLD_UNCONFIRMED");
   const r=await stopGate4ExactOwnedV39(scope,{
     listStrict:vi.fn().mockResolvedValue([sub()]),
     deleteExactVerified:async()=>true
   });
   expect(r.status).toBe("HOLD_UNCONFIRMED");
   const n=await stopGate4ExactOwnedV39(scope,{
     listStrict:async()=>{throw Error("503")},deleteExactVerified:del
   });
   expect(n.status).toBe("HOLD_UNCONFIRMED");
 });
 it("zero active does not certify settlement or earlier physical deletion",async()=>{
   const del=vi.fn();
   const r=await stopGate4ExactOwnedV39(scope,{
     listStrict:async()=>[],deleteExactVerified:del
   });
   expect(r).toMatchObject({status:"NO_ACTIVE_OWNED",
     creditSettlementVerified:false,liveGate4Certified:false});
   expect(del).not.toHaveBeenCalled();
 });
});
