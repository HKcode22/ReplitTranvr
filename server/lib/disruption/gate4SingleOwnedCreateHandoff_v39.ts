/**
 * DRAFT: one Gate4 Alert CREATE-response -> V0072 ownership handoff.
 * No I/O at import, no live CLI, no automatic retry of provider CREATE.
 * Injected functions are NOT proof of external authenticity or STOP liveness;
 * a separate owner-reviewed runtime must establish those facts before use.
 */
import type {WebhookSubscription} from "./aerodataboxLimiter_v3";
import {reviewGate4ActionsWatchScopeV39,
 type Gate4ActionsWatchScopeV39} from "./gate4ActionsWatchdogPolicy_v39";
import {bindGate4ExactVerifiedOwnerCandidateV39,
 type Gate4OwnedBindingV39,type Gate4OwnedBindingStoreV39}
 from "./gate4VerifiedOwnerBinding_v39";
import type {Gate4CustodyExternalAnchorV39} from
 "./gate4DurableCustodyReview_v39";
import type {Gate4SignedStopTicketInputV39} from
 "./gate4SignedStopCustody_v39";

export type Gate4HandoffEvidenceV39=Readonly<{
 binding:Gate4OwnedBindingV39;
 custodyAnchor:Gate4CustodyExternalAnchorV39;
 signedStop:Gate4SignedStopTicketInputV39;
}>;
export type Gate4HandoffDepsV39=Readonly<{
 independentlyConfirmArmedStop:()=>Promise<boolean>;
 strictBalance:()=>Promise<number>;
 strictInventory:()=>Promise<WebhookSubscription[]>;
 createExactlyOne:()=>Promise<WebhookSubscription|null>;
 prepareIndependentEvidence:(created:WebhookSubscription)=>
   Promise<Gate4HandoffEvidenceV39>;
 bindingStore:Gate4OwnedBindingStoreV39;
 deleteExactOwned:(id:string)=>Promise<boolean>;
 recordIncident:(reason:string,knownId:boolean,unconfirmed:boolean)=>
   Promise<void>;
}>;
export type Gate4HandoffResultV39=Readonly<{
 status:"V0072_BOUND_RECEIPT_ONLY_EXTERNAL_ATTESTATION_PENDING";
 providerCreateAttempts:1;
 independentlyAttestedStop:false;
 paidAuthorizationCertified:false;
 creditSettlementVerified:false;
}>;
const validId=/^[A-Za-z0-9_-]{6,128}$/;
const hold=(reason:string):never=>{
 throw Error("GATE4_HANDOFF_"+reason+"_HOLD");
};
function matches(s:WebhookSubscription|null,
 scope:Gate4ActionsWatchScopeV39):s is WebhookSubscription{
 return !!s&&validId.test(s.id)&&s.isActive===true&&
   s.billingType==="CreditBased"&&
   s.subject?.type==="FlightByAirportIcao"&&
   s.subject?.id===scope.airportIcao;
}
export async function runGate4SingleOwnedCreateHandoffV39(
 scope:Gate4ActionsWatchScopeV39,
 deps:Gate4HandoffDepsV39
):Promise<Gate4HandoffResultV39>{
 if(!reviewGate4ActionsWatchScopeV39(scope)||!deps||
    typeof deps.independentlyConfirmArmedStop!=="function"||
    typeof deps.strictBalance!=="function"||
    typeof deps.strictInventory!=="function"||
    typeof deps.createExactlyOne!=="function"||
    typeof deps.prepareIndependentEvidence!=="function"||
    typeof deps.bindingStore?.bindOnce!=="function"||
    typeof deps.bindingStore?.readBack!=="function"||
    typeof deps.deleteExactOwned!=="function"||
    typeof deps.recordIncident!=="function")
   hold("INVALID_DEPS_OR_SCOPE");
 let armed=false;
 try{armed=await deps.independentlyConfirmArmedStop()===true;}
 catch{/* A failed external status read does not arm a STOP. */}
 if(!armed)hold("STOP_NOT_VERIFIABLY_ARMED");
 try{
   const balance=await deps.strictBalance();
   const list=await deps.strictInventory();
   if(!Number.isSafeInteger(balance)||
      balance!==scope.observedStartingCredits||
      !Array.isArray(list)||list.some(s=>!s||
        typeof s.isActive!=="boolean"||!validId.test(s.id)||
        !["CreditBased","LifetimeBased"].includes(s.billingType))||
      list.some(s=>s.isActive&&s.billingType==="CreditBased"))
     hold("ACCOUNT_BASELINE_OR_INVENTORY_CHANGED");
 }catch{hold("ACCOUNT_PREFLIGHT_UNCONFIRMED");}

 // One attempt only. Null/timeout/invalid response MUST NOT infer ownership
 // from LIST, because a payment-capable subscription may already exist.
 let created:WebhookSubscription|null=null;
 try{created=await deps.createExactlyOne();}
 catch{/* unconfirmed provider CREATE */}
 if(!matches(created,scope)){
   try{await deps.recordIncident("CREATE_RESPONSE_AMBIGUOUS",false,true);}
   catch{/* still unsafe */}
   hold("UNKNOWN_CREATE_RESULT_OPERATOR_RESCUE");
 }
 const id=created.id; // Positive CREATE response only; never webhook/LIST.
 try{
   const e=await deps.prepareIndependentEvidence(created);
   if(!e?.binding||e.binding.subscriptionId!==id||
      e.binding.airportIcao!==scope.airportIcao||
      e.binding.scopeId!==scope.scopeId||
      e.binding.sourceCommit!==scope.sourceCommit||
      e.binding.authorizationSha256!==scope.authorizationSha256)
     hold("FOREIGN_OR_MISSING_EVIDENCE");
   const bound=await bindGate4ExactVerifiedOwnerCandidateV39({
     ...e,providerListStrict:deps.strictInventory,store:deps.bindingStore
   });
   if(bound.status!=="BOUND_RECEIPT_ONLY_NOT_EXTERNAL_ATTESTATION")
     hold("V0072_BIND_NOT_CONFIRMED");
   // A PostgreSQL receipt alone cannot independently attest signer, anchor,
   // STOP liveness, or paid authorization. No second CREATE permitted.
   return {
     status:"V0072_BOUND_RECEIPT_ONLY_EXTERNAL_ATTESTATION_PENDING",
     providerCreateAttempts:1,independentlyAttestedStop:false,
     paidAuthorizationCertified:false,creditSettlementVerified:false
   };
 }catch{
   // Known positive CREATE ID: attempt exact-owned DELETE before returning.
   // Do not claim successful settlement after a DELETE response alone.
   let deleted=false,absent=false;
   try{deleted=await deps.deleteExactOwned(id)===true;}
   catch{/* DELETE uncertain */}
   if(deleted){
     try{
       const list=await deps.strictInventory();
       absent=Array.isArray(list)&&list.every(s=>s&&
         validId.test(s.id)&&typeof s.isActive==="boolean"&&
         !(s.id===id&&s.isActive));
     }catch{/* LIST uncertain */}
   }
   const unknown=!deleted||!absent;
   let incidentSaved=false;
   try{
     await deps.recordIncident("POST_CREATE_V0072_BIND_UNCONFIRMED",
       true,unknown);
     incidentSaved=true;
   }catch{/* incident uncertain */}
   if(unknown||!incidentSaved)hold("EXACT_STOP_OR_INCIDENT_UNCONFIRMED");
   hold("COMPENSATED_NEEDS_THREE_BALANCE_SETTLEMENT");
 }
}
