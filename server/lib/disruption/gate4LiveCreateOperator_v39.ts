/**
 * Gate4 practical ONE positive CREATE -> exact V0072 ownership handoff.
 * No I/O at import, no provider transport in this module. Live adapters
 * must externally verify the protected GH STOP ARMED receipt and pin an
 * independently preapproved Ed25519 public-key fingerprint.
 *
 * A direct HTTPS positive response is the only admissible source of the
 * provider-assigned ID. Unknown CREATE outcome is an operator-rescue HOLD,
 * NEVER a second CREATE nor an arbitrary LIST-derived DELETE.
 */
import type {WebhookSubscription} from "./aerodataboxLimiter_v3";
import type {Gate4PositiveCreateReceiptTransportV39} from
 "./aerodataboxLimiter_v3";
import type {Gate4OwnedBindingV39,Gate4OwnedBindingStoreV39} from
 "./gate4VerifiedOwnerBinding_v39";
import {reviewGate4ActionsWatchScopeV39,
 type Gate4ActionsWatchScopeV39} from "./gate4ActionsWatchdogPolicy_v39";

const hex=/^[a-f0-9]{64}$/;
const providerId=/^[A-Za-z0-9_-]{6,128}$/;
function fail(s:string):never{throw Error("GATE4_REAL_OWNER_"+s+"_HOLD");}
export type Gate4OperatorSignedEvidenceV39={
 signedTicketSha256:string;
 signedTicketVerifiedAgainstProtectedSigner:boolean;
};
export type Gate4RealOwnerDepsV39=Readonly<{
 proveActualExternalStopArmed:()=>Promise<boolean>;
 strictBalance:()=>Promise<number>;
 strictInventory:()=>Promise<WebhookSubscription[]>;
 createExactlyOne:()=>Promise<Gate4PositiveCreateReceiptTransportV39>;
 persistPositiveIdPrivately:(r:Gate4PositiveCreateReceiptTransportV39)=>Promise<void>;
 signedStopEvidence:(r:Gate4PositiveCreateReceiptTransportV39)=>
   Promise<Gate4OperatorSignedEvidenceV39>;
 store:Gate4OwnedBindingStoreV39;
 deleteKnownExact:(id:string)=>Promise<boolean>;
 recordSafetyIncident:(reason:string,positiveIdKnown:boolean)=>Promise<void>;
}>;
/** Return has no provider ID, key, callback URL, ticket or sensitive body. */
export async function runGate4OnePositiveOwnerV39(
 scope:Gate4ActionsWatchScopeV39,
 d:Gate4RealOwnerDepsV39
):Promise<{
 status:"POSITIVE_TLS_CREATE_BOUND_V0072_NEEDS_EXTERNAL_ANCHOR_AND_SETTLEMENT";
 createAttempts:1;exactOwnerReadBack:true;paidTrialComplete:false;
}>{
 if(!reviewGate4ActionsWatchScopeV39(scope)||!d||
   Object.values(d).some(fn=>typeof fn!=="function"&&
     fn!==d.store)||
   !d.store||typeof d.store.bindOnce!=="function"||
   typeof d.store.readBack!=="function")
   fail("BAD_CONFIGURATION");
 // No provider call before proof of actual separately executing STOP job.
 let armed=false;
 try{armed=await d.proveActualExternalStopArmed()===true;}catch{}
 if(!armed)fail("INDEPENDENT_STOP_NOT_ARMED");
 try{
   const credits=await d.strictBalance();
   const subs=await d.strictInventory();
   if(credits!==scope.observedStartingCredits||
      !Array.isArray(subs)||
      subs.some(x=>!x||!providerId.test(x.id)||
        !["LifetimeBased","CreditBased"].includes(x.billingType)||
        typeof x.isActive!=="boolean")||
      subs.some(x=>x.isActive&&x.billingType==="CreditBased"))
     fail("PREFLIGHT_CHANGED");
 }catch{fail("PROVIDER_PREFLIGHT_UNVERIFIED");}
 let response:Gate4PositiveCreateReceiptTransportV39;
 try{response=await d.createExactlyOne();}
 catch{
   try{await d.recordSafetyIncident("CREATE_RESPONSE_UNKNOWN",false);}catch{}
   fail("CREATE_RESULT_UNKNOWN_MANUAL_RESCUE");
 }
 const p=response?.subscription;
 if(!p||!providerId.test(p.id)||p.isActive!==true||
    p.billingType!=="CreditBased"||
    p.subject?.type!=="FlightByAirportIcao"||
    p.subject.id!==scope.airportIcao){
   try{await d.recordSafetyIncident("CREATE_RESULT_UNTRUSTED",false);}catch{}
   fail("CREATE_ID_UNTRUSTED_MANUAL_RESCUE");
 }
 const id=p.id; // ONLY provider-positive CREATE response.
 try{
   if(!hex.test(response.rawCreateResponseSha256))
     fail("RAW_POSITIVE_RECEIPT_MISSING");
   await d.persistPositiveIdPrivately(response);
   const signed=await d.signedStopEvidence(response);
   if(!signed||!hex.test(signed.signedTicketSha256)||
      signed.signedTicketVerifiedAgainstProtectedSigner!==true)
     fail("STOP_SIGNER_NOT_INDEPENDENTLY_PINNED");
   const binding:Gate4OwnedBindingV39={
     scopeId:scope.scopeId,sourceCommit:scope.sourceCommit,
     authorizationSha256:scope.authorizationSha256,
     airportIcao:scope.airportIcao,subscriptionId:id,
     reviewedCreateReceiptSha256:response.rawCreateResponseSha256,
     signedStopTicketSha256:signed.signedTicketSha256
   };
   const saved=await d.store.bindOnce(binding);
   const verified=await d.store.readBack(binding);
   if(saved.committed!==true||saved.exactFieldsVerified!==true||
      verified.committed!==true||verified.exactFieldsVerified!==true)
     fail("V0072_EXACT_READBACK_MISSING");
   return {
     status:"POSITIVE_TLS_CREATE_BOUND_V0072_NEEDS_EXTERNAL_ANCHOR_AND_SETTLEMENT",
     createAttempts:1,exactOwnerReadBack:true,paidTrialComplete:false
   };
 }catch{
   // Capture the exact ID already known from the positive CREATE response,
   // then compensate only that id. Never infer, guess or choose from LIST.
   let removed=false,clear=false;
   try{removed=await d.deleteKnownExact(id)===true;}catch{}
   if(removed){
     try{
       const after=await d.strictInventory();
       clear=Array.isArray(after)&&!after.some(x=>x?.id===id&&x.isActive);
     }catch{}
   }
   let recorded=false;
   try{
     await d.recordSafetyIncident("KNOWN_CREATE_V0072_BIND_UNCONFIRMED",true);
     recorded=true;
   }catch{}
   if(!removed||!clear||!recorded)
     fail("EXACT_KNOWN_ID_STOP_OR_CUSTODY_UNCONFIRMED");
   fail("COMPENSATED_REQUIRES_THREE_SETTLED_BALANCES");
 }
}
