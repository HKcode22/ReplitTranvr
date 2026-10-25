import {describe,it,expect,vi} from "vitest";
import {runGate4OnePositiveOwnerV39} from
 "../server/lib/disruption/gate4LiveCreateOperator_v39";
import type {WebhookSubscription} from
 "../server/lib/disruption/aerodataboxLimiter_v3";

const scope={
 scopeId:"11111111-2222-3333-4444-555555555555",
 sourceCommit:"a".repeat(40),authorizationSha256:"b".repeat(64),
 airportIcao:"WSSS",startUtc:"2026-10-23T22:00:00.000Z",
 stopUtc:"2026-10-23T22:05:00.000Z",
 observedStartingCredits:2037,softCreditTarget:5,protectedCreditFloor:2000
};
const sub:WebhookSubscription={id:"realPositiveProviderId123",
 isActive:true,billingType:"CreditBased",
 subject:{type:"FlightByAirportIcao",id:"WSSS"}};
const receipt={subscription:sub,rawCreateResponseSha256:"c".repeat(64)};
function deps(){
 let live=true,listReads=0;
 const d={
  proveActualExternalStopArmed:vi.fn(async()=>true),
  strictBalance:vi.fn(async()=>2037),
  strictInventory:vi.fn(async()=>{
   listReads++;
   return listReads===1?[]:(live?[sub]:[]);
  }),
  reserveOneShotImmediatelyBeforeCreate:vi.fn(async()=>{}),
  createExactlyOne:vi.fn(async()=>receipt),
  persistPositiveIdPrivately:vi.fn(async()=>{}),
  signedStopEvidence:vi.fn(async()=>({
    signedTicketSha256:"d".repeat(64),
    signedTicketVerifiedAgainstProtectedSigner:true
  })),
  store:{
   bindOnce:vi.fn(async()=>({committed:true,exactFieldsVerified:true})),
   readBack:vi.fn(async()=>({committed:true,exactFieldsVerified:true}))
  },
  deleteKnownExact:vi.fn(async(id:string)=>{
   if(id!==sub.id)throw Error("foreign");live=false;return true;
  }),
  recordSafetyIncident:vi.fn(async(_kind:string,_known:boolean)=>{})
 };
 return d;
}
describe("Gate4 LIVE operator — mocked boundary, no network/provider",()=>{
 it("binds exact positive HTTPS CREATE ID and raw receipt only once",async()=>{
  const d=deps();
  expect(await runGate4OnePositiveOwnerV39(scope,d)).toMatchObject({
   exactOwnerReadBack:true,createAttempts:1,paidTrialComplete:false
  });
  expect(d.createExactlyOne).toHaveBeenCalledTimes(1);
  expect(d.store.bindOnce).toHaveBeenCalledWith({
    scopeId:scope.scopeId,authorizationSha256:scope.authorizationSha256,
    sourceCommit:scope.sourceCommit,airportIcao:scope.airportIcao,
    subscriptionId:sub.id,reviewedCreateReceiptSha256:"c".repeat(64),
    signedStopTicketSha256:"d".repeat(64)
  });
  expect(d.deleteKnownExact).not.toHaveBeenCalled();
 });
 it("runs final STOP, balance, and LIST before immutable intent and CREATE",async()=>{
  const d=deps();const order:string[]=[];
  d.proveActualExternalStopArmed.mockImplementation(async()=>{
   order.push("stop");return true;
  });
  d.strictBalance.mockImplementation(async()=>{
   order.push("balance");return 2037;
  });
  d.strictInventory.mockImplementation(async()=>{
   order.push("list");return [];
  });
  d.reserveOneShotImmediatelyBeforeCreate=vi.fn(async()=>{
   order.push("durable_intent");
  });
  d.createExactlyOne.mockImplementation(async()=>{
   order.push("post");return receipt;
  });
  await runGate4OnePositiveOwnerV39(scope,d);
  expect(order.slice(0,5)).toEqual([
   "stop","balance","list","durable_intent","post"
  ]);
  expect(d.reserveOneShotImmediatelyBeforeCreate).toHaveBeenCalledTimes(1);
  expect(d.createExactlyOne).toHaveBeenCalledTimes(1);
 });
 it("pre-POST STOP or balance failure must NOT consume new intent",async()=>{
  for(const mode of ["stop","balance","list"]){
   const d=deps();
   d.reserveOneShotImmediatelyBeforeCreate=vi.fn(async()=>{});
   if(mode==="stop")d.proveActualExternalStopArmed.mockResolvedValue(false);
   if(mode==="balance")d.strictBalance.mockRejectedValue(Error("429"));
   if(mode==="list")d.strictInventory.mockRejectedValue(Error("429"));
   await expect(runGate4OnePositiveOwnerV39(scope,d)).rejects.toThrow();
   expect(d.reserveOneShotImmediatelyBeforeCreate).not.toHaveBeenCalled();
   expect(d.createExactlyOne).not.toHaveBeenCalled();
  }
 });
 it("uncertain durable intent write must not issue a provider POST",async()=>{
  const d=deps();
  d.reserveOneShotImmediatelyBeforeCreate=vi.fn(async()=>{
   throw Error("ambiguous storage confirmation");
  });
  await expect(runGate4OnePositiveOwnerV39(scope,d))
   .rejects.toThrow("ONE_SHOT_INTENT_UNCONFIRMED_NO_CREATE_HOLD");
  expect(d.reserveOneShotImmediatelyBeforeCreate).toHaveBeenCalledTimes(1);
  expect(d.createExactlyOne).not.toHaveBeenCalled();
 });
 it("ambiguous POST consumes exactly one intent and never retries",async()=>{
  const d=deps();
  d.reserveOneShotImmediatelyBeforeCreate=vi.fn(async()=>{});
  d.createExactlyOne.mockRejectedValue(Error("connection lost"));
  await expect(runGate4OnePositiveOwnerV39(scope,d))
   .rejects.toThrow("CREATE_RESULT_UNKNOWN_MANUAL_RESCUE_HOLD");
  expect(d.reserveOneShotImmediatelyBeforeCreate).toHaveBeenCalledTimes(1);
  expect(d.createExactlyOne).toHaveBeenCalledTimes(1);
  expect(d.deleteKnownExact).not.toHaveBeenCalled();
 });
 it("won't touch account or CREATE unless actual GH job proof is positive",async()=>{
  const d=deps();
  d.proveActualExternalStopArmed.mockResolvedValue(false);
  await expect(runGate4OnePositiveOwnerV39(scope,d))
   .rejects.toThrow("GATE4_REAL_OWNER_INDEPENDENT_STOP_NOT_ARMED_HOLD");
  expect(d.strictBalance).not.toHaveBeenCalled();
  expect(d.createExactlyOne).not.toHaveBeenCalled();
 });
 it("rejects drifted account credits or preexisting billable",async()=>{
  const a=deps();a.strictBalance.mockResolvedValue(2036);
  await expect(runGate4OnePositiveOwnerV39(scope,a))
   .rejects.toThrow("PREFLIGHT_UNVERIFIED_HOLD");
  expect(a.createExactlyOne).not.toHaveBeenCalled();
  const b=deps();b.strictInventory.mockResolvedValue([sub]);
  await expect(runGate4OnePositiveOwnerV39(scope,b))
   .rejects.toThrow("PREFLIGHT_UNVERIFIED_HOLD");
  expect(b.createExactlyOne).not.toHaveBeenCalled();
 });
 it("unknown CREATE outcome never infers owner from LIST or retries",async()=>{
  const d=deps();
  d.createExactlyOne.mockRejectedValue(Error("network lost"));
  await expect(runGate4OnePositiveOwnerV39(scope,d))
   .rejects.toThrow("CREATE_RESULT_UNKNOWN_MANUAL_RESCUE_HOLD");
  expect(d.createExactlyOne).toHaveBeenCalledTimes(1);
  expect(d.strictInventory).toHaveBeenCalledTimes(1);
  expect(d.deleteKnownExact).not.toHaveBeenCalled();
  expect(d.recordSafetyIncident).toHaveBeenCalledWith(
   "CREATE_RESPONSE_UNKNOWN",false);
 });
 it("known exact CREATE with unsigned evidence compensates only owned ID",async()=>{
  const d=deps();
  d.signedStopEvidence.mockResolvedValue({
   signedTicketSha256:"e".repeat(64),
   signedTicketVerifiedAgainstProtectedSigner:false
  });
  await expect(runGate4OnePositiveOwnerV39(scope,d))
   .rejects.toThrow("COMPENSATED_REQUIRES_THREE_SETTLED_BALANCES_HOLD");
  expect(d.deleteKnownExact).toHaveBeenCalledExactlyOnceWith(sub.id);
  expect(d.store.bindOnce).not.toHaveBeenCalled();
 });
 it("PG write failure attempts immediate known-ID delete, not success",async()=>{
  const d=deps();
  d.store.bindOnce.mockRejectedValue(Error("PG offline"));
  await expect(runGate4OnePositiveOwnerV39(scope,d))
   .rejects.toThrow("COMPENSATED_REQUIRES_THREE_SETTLED_BALANCES_HOLD");
  expect(d.deleteKnownExact).toHaveBeenCalledExactlyOnceWith(sub.id);
  expect(d.recordSafetyIncident).toHaveBeenCalledWith(
   "KNOWN_CREATE_V0072_BIND_UNCONFIRMED",true);
 });
 it("uncertain exact DELETE is terminal rescue, never false compensation",async()=>{
  const d=deps();
  d.store.readBack.mockRejectedValue(Error("PG offline"));
  d.deleteKnownExact.mockResolvedValue(false);
  await expect(runGate4OnePositiveOwnerV39(scope,d))
   .rejects.toThrow("EXACT_KNOWN_ID_STOP_OR_CUSTODY_UNCONFIRMED_HOLD");
  expect(d.deleteKnownExact).toHaveBeenCalledExactlyOnceWith(sub.id);
 });
});
