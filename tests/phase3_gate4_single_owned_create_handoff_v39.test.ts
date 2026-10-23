import {describe,it,expect,vi} from "vitest";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {runGate4SingleOwnedCreateHandoffV39,
 type Gate4PositiveCreateReceiptV39} from
 "../server/lib/disruption/gate4SingleOwnedCreateHandoff_v39";
import {gate4StopTicketSigningMessageV39} from
 "../server/lib/disruption/gate4SignedStopCustody_v39";
import type {WebhookSubscription} from
 "../server/lib/disruption/aerodataboxLimiter_v3";

const hash=(x:Buffer)=>createHash("sha256").update(x).digest("hex");
const scope={
 scopeId:"11111111-2222-3333-4444-555555555555",
 sourceCommit:"a".repeat(40),authorizationSha256:"b".repeat(64),
 airportIcao:"WSSS",startUtc:"2026-10-23T11:00:00.000Z",
 stopUtc:"2026-10-23T11:10:00.000Z",
 observedStartingCredits:2037,softCreditTarget:20,protectedCreditFloor:1000
};
const created:WebhookSubscription={
 id:"ownedSynthetic123",isActive:true,billingType:"CreditBased",
 subject:{type:"FlightByAirportIcao",id:"WSSS"}
};
const response:Gate4PositiveCreateReceiptV39={
 subscription:created,rawCreateResponseSha256:"c".repeat(64)
};
const binding={
 scopeId:scope.scopeId,authorizationSha256:scope.authorizationSha256,
 sourceCommit:scope.sourceCommit,airportIcao:scope.airportIcao,
 subscriptionId:created.id,
 reviewedCreateReceiptSha256:"c".repeat(64),
 signedStopTicketSha256:""
};
const ticket={
 schema:"v39.gate4.independent-stop-ticket.v1",
 sourceCommit:scope.sourceCommit,scopeId:scope.scopeId,
 authorizationSha256:scope.authorizationSha256,
 subscriptionId:created.id,subjectType:"FlightByAirportIcao",
 subjectId:"WSSS",startAtUtc:scope.startUtc,stopAtUtc:scope.stopUtc
};
const bytes=Buffer.from(JSON.stringify(ticket));
const pair=generateKeyPairSync("ed25519");
const spki=Buffer.from(pair.publicKey.export({format:"der",type:"spki"}));
const evidence={
 binding:{...binding,signedStopTicketSha256:hash(bytes)},
 custodyAnchor:{
  schema:"v39.gate4.custody-anchor.v1" as const,
  sourceCommit:scope.sourceCommit,scopeId:scope.scopeId,
  authorizationSha256:scope.authorizationSha256,subjectId:"WSSS",
  exactOwnedSubscriptionId:created.id,
  independentlyReviewedCreateReceiptSha256:"c".repeat(64),
  anchoredRevision:2,anchoredHeadDigestSha256:"d".repeat(64)
 },
 signedStop:{
  ticketBytes:bytes,signerSpkiDerBase64:spki.toString("base64"),
  detachedSignatureBase64:sign(null,
   gate4StopTicketSigningMessageV39(bytes),pair.privateKey).toString("base64"),
  independentPins:{
   independentlyReviewedTicketSha256:hash(bytes),
   independentlyReviewedSignerSpkiSha256:hash(spki),
   expectedSourceCommit:scope.sourceCommit,expectedScopeId:scope.scopeId,
   expectedAuthorizationSha256:scope.authorizationSha256,
   expectedSubscriptionId:created.id,expectedSubjectId:"WSSS",
   expectedStartAtUtc:scope.startUtc,expectedStopAtUtc:scope.stopUtc
  }
 }
};
function deps(){
 let listCall=0,isActive=true;
 const v={
  independentlyConfirmArmedStop:vi.fn(async()=>true),
  strictBalance:vi.fn(async()=>2037),
  strictInventory:vi.fn(async()=>{
   listCall++;
   return listCall===1?[]:(isActive?[created]:[]);
  }),
  createExactlyOne:vi.fn(async():Promise<Gate4PositiveCreateReceiptV39|null>=>response),
  prepareIndependentEvidence:vi.fn(async()=>evidence),
  bindingStore:{
   bindOnce:vi.fn(async()=>({committed:true,exactFieldsVerified:true})),
   readBack:vi.fn(async()=>({committed:true,exactFieldsVerified:true}))
  },
  deleteExactOwned:vi.fn(async (_id:string)=>{
   isActive=false;
   return true;
  }),
  recordIncident:vi.fn(async(_r:string,_known:boolean,_unknown:boolean)=>{})
 };
 return v;
}
describe("Gate4 single Alert CREATE->V0072 handoff (INJECTED MOCKS ONLY)",()=>{
 it("correct positive CREATE ID, signed ticket, strict LIST, PG receipt",async()=>{
  const d=deps();
  expect(await runGate4SingleOwnedCreateHandoffV39(scope,d)).toMatchObject({
   status:"V0072_BOUND_RECEIPT_ONLY_EXTERNAL_ATTESTATION_PENDING",
   providerCreateAttempts:1,independentlyAttestedStop:false,
   creditSettlementVerified:false,paidAuthorizationCertified:false
  });
  expect(d.createExactlyOne).toHaveBeenCalledTimes(1);
  expect(d.bindingStore.bindOnce).toHaveBeenCalledTimes(1);
  expect(d.deleteExactOwned).not.toHaveBeenCalled();
  expect(d.recordIncident).not.toHaveBeenCalled();
 });
 it("missing externally armed STOP rejects before inventory or CREATE",async()=>{
  const d=deps();
  d.independentlyConfirmArmedStop.mockResolvedValue(false);
  await expect(runGate4SingleOwnedCreateHandoffV39(scope,d))
   .rejects.toThrow("GATE4_HANDOFF_STOP_NOT_VERIFIABLY_ARMED_HOLD");
  expect(d.createExactlyOne).not.toHaveBeenCalled();
  expect(d.strictInventory).not.toHaveBeenCalled();
 });
 it("provider account balance drift rejects before paid CREATE",async()=>{
  const d=deps();d.strictBalance.mockResolvedValue(2036);
  await expect(runGate4SingleOwnedCreateHandoffV39(scope,d))
   .rejects.toThrow("GATE4_HANDOFF_ACCOUNT_PREFLIGHT_UNCONFIRMED_HOLD");
  expect(d.createExactlyOne).not.toHaveBeenCalled();
 });
 it("ambiguous provider CREATE never guesses ID or tries foreign DELETE",async()=>{
  const d=deps();d.createExactlyOne.mockResolvedValue(null);
  await expect(runGate4SingleOwnedCreateHandoffV39(scope,d))
   .rejects.toThrow("GATE4_HANDOFF_UNKNOWN_CREATE_RESULT_OPERATOR_RESCUE_HOLD");
  expect(d.createExactlyOne).toHaveBeenCalledTimes(1);
  expect(d.bindingStore.bindOnce).not.toHaveBeenCalled();
  expect(d.deleteExactOwned).not.toHaveBeenCalled();
  expect(d.recordIncident).toHaveBeenCalledWith(
   "CREATE_RESPONSE_AMBIGUOUS",false,true);
 });
 it("wrong independent evidence after known CREATE -> exact DELETE and HOLD",async()=>{
  const d=deps();
  d.prepareIndependentEvidence.mockResolvedValue({
   ...evidence,binding:{...evidence.binding,subscriptionId:"wrongID"}
  });
  await expect(runGate4SingleOwnedCreateHandoffV39(scope,d))
   .rejects.toThrow("GATE4_HANDOFF_COMPENSATED_NEEDS_THREE_BALANCE_SETTLEMENT_HOLD");
  expect(d.deleteExactOwned).toHaveBeenCalledExactlyOnceWith(created.id);
  expect(d.bindingStore.bindOnce).not.toHaveBeenCalled();
  expect(d.recordIncident).toHaveBeenCalledWith(
   "POST_CREATE_V0072_BIND_UNCONFIRMED",true,false);
 });
 it("uncertain exact DELETE never returns compensated success",async()=>{
  const d=deps();
  d.bindingStore.bindOnce.mockResolvedValue({
   committed:false,exactFieldsVerified:false
  });
  d.deleteExactOwned.mockResolvedValue(false);
  await expect(runGate4SingleOwnedCreateHandoffV39(scope,d))
   .rejects.toThrow("GATE4_HANDOFF_EXACT_STOP_OR_INCIDENT_UNCONFIRMED_HOLD");
  expect(d.deleteExactOwned).toHaveBeenCalledExactlyOnceWith(created.id);
  expect(d.recordIncident).toHaveBeenCalledWith(
   "POST_CREATE_V0072_BIND_UNCONFIRMED",true,true);
 });
 it("missing raw receipt with positive owned ID triggers exact-ID compensation",async()=>{
  const d=deps();
  d.createExactlyOne.mockResolvedValue({
   ...response,rawCreateResponseSha256:""
  });
  await expect(runGate4SingleOwnedCreateHandoffV39(scope,d))
   .rejects.toThrow("GATE4_HANDOFF_COMPENSATED_NEEDS_THREE_BALANCE_SETTLEMENT_HOLD");
  expect(d.createExactlyOne).toHaveBeenCalledTimes(1);
  expect(d.deleteExactOwned).toHaveBeenCalledExactlyOnceWith(created.id);
  expect(d.bindingStore.bindOnce).not.toHaveBeenCalled();
  expect(d.recordIncident).toHaveBeenCalledWith(
   "POST_CREATE_V0072_BIND_UNCONFIRMED",true,false);
 });
 it("mismatched raw CREATE HTTP response hash cannot bind V0072",async()=>{
  const d=deps();
  d.createExactlyOne.mockResolvedValue({
   ...response,rawCreateResponseSha256:"e".repeat(64)
  });
  await expect(runGate4SingleOwnedCreateHandoffV39(scope,d))
   .rejects.toThrow("GATE4_HANDOFF_COMPENSATED_NEEDS_THREE_BALANCE_SETTLEMENT_HOLD");
  expect(d.bindingStore.bindOnce).not.toHaveBeenCalled();
  expect(d.deleteExactOwned).toHaveBeenCalledExactlyOnceWith(created.id);
 });
 it("no duplicate second CREATE after bad signature or database refusal",async()=>{
  const d=deps();
  d.prepareIndependentEvidence.mockResolvedValue({
   ...evidence,signedStop:{
     ...evidence.signedStop,detachedSignatureBase64:"INVALID"
   }
  });
  await expect(runGate4SingleOwnedCreateHandoffV39(scope,d))
   .rejects.toThrow("GATE4_HANDOFF_COMPENSATED_NEEDS_THREE_BALANCE_SETTLEMENT_HOLD");
  expect(d.createExactlyOne).toHaveBeenCalledTimes(1);
  expect(d.deleteExactOwned).toHaveBeenCalledWith(created.id);
 });
});
