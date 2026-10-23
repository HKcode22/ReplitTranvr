import {describe,it,expect,vi} from "vitest";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {bindGate4ExactVerifiedOwnerCandidateV39,
 type Gate4OwnedBindingV39,type Gate4OwnedBindingStoreV39}
 from "../server/lib/disruption/gate4VerifiedOwnerBinding_v39";
import {gate4StopTicketSigningMessageV39} from
 "../server/lib/disruption/gate4SignedStopCustody_v39";
import type {WebhookSubscription} from
 "../server/lib/disruption/aerodataboxLimiter_v3";

const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const pair=generateKeyPairSync("ed25519");
const spki=Buffer.from(pair.publicKey.export({format:"der",type:"spki"}));
const b:Gate4OwnedBindingV39={
 scopeId:"11111111-2222-3333-4444-555555555555",
 authorizationSha256:"a".repeat(64),
 sourceCommit:"b".repeat(40),airportIcao:"WSSS",
 subscriptionId:"exactID99",reviewedCreateReceiptSha256:"c".repeat(64),
 signedStopTicketSha256:""
};
const ticket={
 schema:"v39.gate4.independent-stop-ticket.v1",
 sourceCommit:b.sourceCommit,scopeId:b.scopeId,
 authorizationSha256:b.authorizationSha256,subscriptionId:b.subscriptionId,
 subjectType:"FlightByAirportIcao",subjectId:b.airportIcao,
 startAtUtc:"2026-10-22T20:00:00.000Z",
 stopAtUtc:"2026-10-22T20:10:00.000Z"
};
const bytes=Buffer.from(JSON.stringify(ticket));
const binding={...b,signedStopTicketSha256:sha(bytes)};
const signedStop=()=>({
 ticketBytes:bytes,signerSpkiDerBase64:spki.toString("base64"),
 detachedSignatureBase64:sign(null,
   gate4StopTicketSigningMessageV39(bytes),pair.privateKey).toString("base64"),
 independentPins:{
   independentlyReviewedTicketSha256:sha(bytes),
   independentlyReviewedSignerSpkiSha256:sha(spki),
   expectedSourceCommit:b.sourceCommit,expectedScopeId:b.scopeId,
   expectedAuthorizationSha256:b.authorizationSha256,
   expectedSubscriptionId:b.subscriptionId,expectedSubjectId:b.airportIcao,
   expectedStartAtUtc:ticket.startAtUtc,expectedStopAtUtc:ticket.stopAtUtc
 }
});
const anchor={
 schema:"v39.gate4.custody-anchor.v1" as const,
 sourceCommit:b.sourceCommit,scopeId:b.scopeId,
 authorizationSha256:b.authorizationSha256,subjectId:b.airportIcao,
 exactOwnedSubscriptionId:b.subscriptionId,
 independentlyReviewedCreateReceiptSha256:b.reviewedCreateReceiptSha256,
 anchoredRevision:2,anchoredHeadDigestSha256:"d".repeat(64)
};
const provider=(id=b.subscriptionId,icao="WSSS"):WebhookSubscription=>({
 id,isActive:true,billingType:"CreditBased",
 subject:{type:"FlightByAirportIcao",id:icao}
});
function store():Gate4OwnedBindingStoreV39{
 const records=new Map<string,Gate4OwnedBindingV39>();
 return {
   async bindOnce(input){
     const prior=records.get(input.scopeId);
     if(prior&&JSON.stringify(prior)!==JSON.stringify(input))
       return {committed:false,exactFieldsVerified:false};
     records.set(input.scopeId,input);
     return {committed:true,exactFieldsVerified:true};
   },
   async readBack(input){
     const saved=records.get(input.scopeId);
     const ok=JSON.stringify(saved)===JSON.stringify(input);
     return {committed:ok,exactFieldsVerified:ok};
   }
 };
}
const call=(changes:Record<string,unknown>={})=>{
 const deps={
  binding, custodyAnchor:anchor,signedStop:signedStop(),
  providerListStrict:vi.fn(async()=>[provider()]),
  store:store()
 };
 return {...deps,...changes};
};
describe("Gate4 exact CREATE owner binding: mocked strict provider LIST",()=>{
 it("correct scope, ticket and unique provider ID write only an untrusted-to-external-review receipt",async()=>{
   const r=await bindGate4ExactVerifiedOwnerCandidateV39(call());
   expect(r).toMatchObject({
    status:"BOUND_RECEIPT_ONLY_NOT_EXTERNAL_ATTESTATION",
    sourceOwnerAttested:false,externallyAnchoredIdentityAttested:false,
    quarantinedEventsAttributed:false,independentStopArmed:false,
    providerMutationCount:0,paidAuthorization:false
   });
   expect(JSON.stringify(r)).not.toContain(binding.subscriptionId);
 });
 it("absent CREATE receipt/foreign subscription or wrong airport HOLDs before DB write",async()=>{
   for(const change of [
     {binding:{...binding,reviewedCreateReceiptSha256:null}},
     {binding:{...binding,subscriptionId:"foreignID"}},
     {binding:{...binding,airportIcao:"KLAX"}}
   ]){
     const d=call(change);
     const spy=vi.spyOn(d.store,"bindOnce");
     const r=await bindGate4ExactVerifiedOwnerCandidateV39(d as any);
     expect(r.status).toBe("HOLD");
     expect(spy).not.toHaveBeenCalled();
   }
 });
 it("signed ticket tamper blocks even strict provider inventory GET",async()=>{
   const d=call();
   d.signedStop={...signedStop(),detachedSignatureBase64:"INVALID"};
   const res=await bindGate4ExactVerifiedOwnerCandidateV39(d);
   expect(res.status).toBe("HOLD");
   expect(d.providerListStrict).not.toHaveBeenCalled();
 });
 it("signed ticket digest must be exact digest referenced by binding",async()=>{
   const d=call({binding:{...binding,signedStopTicketSha256:"e".repeat(64)}});
   expect((await bindGate4ExactVerifiedOwnerCandidateV39(d)).reason)
      .toBe("SIGNED_TICKET_DIGEST_MISMATCH");
   expect(d.providerListStrict).not.toHaveBeenCalled();
 });
 it("foreign active or two active provider subscriptions cannot establish ownership",async()=>{
   for(const x of [[provider("foreignID")],
     [provider(),provider("otherID")],
     [provider(b.subscriptionId,"KLAX")],[]]){
     const d=call({providerListStrict:async()=>x});
     const r=await bindGate4ExactVerifiedOwnerCandidateV39(d);
     expect(r.status).toBe("HOLD");
   }
 });
 it("strict LIST outage and malformed LIST cannot be interpreted as empty",async()=>{
   const offline=call({providerListStrict:async()=>{throw Error("SECRET");}});
   const x=await bindGate4ExactVerifiedOwnerCandidateV39(offline);
   expect(x).toMatchObject({status:"HOLD",reason:"STRICT_PROVIDER_INVENTORY_UNAVAILABLE"});
   expect(JSON.stringify(x)).not.toContain("SECRET");
   const malformed=call({providerListStrict:async()=>[null]});
   expect((await bindGate4ExactVerifiedOwnerCandidateV39(malformed as any))
     .status).toBe("HOLD");
 });
 it("database write conflict never returns an owner receipt",async()=>{
   const d=call({store:{
     bindOnce:async()=>({committed:false,exactFieldsVerified:false}),
     readBack:async()=>({committed:true,exactFieldsVerified:true})
   }});
   expect((await bindGate4ExactVerifiedOwnerCandidateV39(d)).reason)
     .toBe("EXACT_OWNER_BIND_COMMIT_UNCONFIRMED");
 });
 it("lost DB ACK is HOLD and does not blindly retry owner binding",async()=>{
   const write=vi.fn(async()=>{throw Error("lost COMMIT ACK");});
   const d=call({store:{
     bindOnce:write,
     readBack:async()=>({committed:true,exactFieldsVerified:true})
   }});
   const r=await bindGate4ExactVerifiedOwnerCandidateV39(d);
   expect(r.status).toBe("HOLD");
   expect(write).toHaveBeenCalledTimes(1);
 });
 it("post-commit inconsistent readback is HOLD, never science release",async()=>{
   const d=call({store:{
     bindOnce:async()=>({committed:true,exactFieldsVerified:true}),
     readBack:async()=>({committed:true,exactFieldsVerified:false})
   }});
   const r=await bindGate4ExactVerifiedOwnerCandidateV39(d);
   expect(r).toMatchObject({status:"HOLD",
     quarantinedEventsAttributed:false});
 });
 it("independent custody anchor with swapped ID or source is rejected before provider reads",async()=>{
   const d=call({custodyAnchor:{...anchor,exactOwnedSubscriptionId:"foreignID"}});
   const r=await bindGate4ExactVerifiedOwnerCandidateV39(d);
   expect(r.reason).toBe("INDEPENDENT_ANCHOR_FIELDS_MISMATCH");
   expect(d.providerListStrict).not.toHaveBeenCalled();
 });
});
