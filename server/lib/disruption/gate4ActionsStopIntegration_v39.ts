/**
 * Draft Gate4 Actions watchdog integration. NO I/O at import, no CREATE.
 *
 * Transport adapters are passed by the caller and are prohibited in the
 * offline tests. A reviewer MUST bind the exact owned ID from a positive
 * provider CREATE receipt and V0072 custody table; neither callback body
 * nor strict LIST by itself can create ownership. Provider SEND charges
 * may exceed a soft limit before poll/DELETE; no hard billing cap claimed.
 */
import type {WebhookSubscription} from "./aerodataboxLimiter_v3";
import {decideGate4ActionsTickV39,
 type Gate4ActionsWatchScopeV39} from "./gate4ActionsWatchdogPolicy_v39";
import {reviewGate4ActionsWatchScopeV39} from "./gate4ActionsWatchdogPolicy_v39";

export type Gate4StopOwnerV39=Readonly<{
 scopeId:string;sourceCommit:string;authorizationSha256:string;
 airportIcao:string;subscriptionId:string;
}>;
export type Gate4StopTickDepsV39=Readonly<{
 readExactOwned:()=>Promise<Gate4StopOwnerV39|null>;
 strictCredits:()=>Promise<number>;
 strictInventory:()=>Promise<WebhookSubscription[]>;
 deleteOwnedExact:(id:string)=>Promise<boolean>;
}>;
export type Gate4StopTickResultV39=Readonly<{
 status:"WATCH"|"STOPPED_EXACT_PENDING_SETTLEMENT"|
   "HOLD_OWNER_REQUIRED"|"STOP_UNCONFIRMED";
 reason:string;ownerIdWasBound:boolean;
 providerCreateCount:0;
 attemptedExactDelete:boolean;
 noActiveExactIdVerified:boolean;
 threeBalanceSettlementVerified:false;
 hardProviderCreditCap:false;
}>;
const providerId=/^[A-Za-z0-9_-]{6,128}$/;
function done(status:Gate4StopTickResultV39["status"],
 reason:string,bound:boolean,attempted=false,noActive=false):
 Gate4StopTickResultV39{
 return {status,reason,ownerIdWasBound:bound,
  providerCreateCount:0,attemptedExactDelete:attempted,
  noActiveExactIdVerified:noActive,
  threeBalanceSettlementVerified:false,hardProviderCreditCap:false};
}
function ownsExact(scope:Gate4ActionsWatchScopeV39,
 owner:Gate4StopOwnerV39):boolean{
 return owner.scopeId===scope.scopeId&&
   owner.sourceCommit===scope.sourceCommit&&
   owner.authorizationSha256===scope.authorizationSha256&&
   owner.airportIcao===scope.airportIcao&&
   providerId.test(owner.subscriptionId);
}
export async function runGate4ActionsStopTickV39(
 scope:Gate4ActionsWatchScopeV39,
 utcNow:string,
 deps:Gate4StopTickDepsV39
):Promise<Gate4StopTickResultV39>{
 // Admission first: invalid SOURCE parameters mean NO provider API calls.
 if(!reviewGate4ActionsWatchScopeV39(scope)||
  !deps||typeof deps.readExactOwned!=="function"||
  typeof deps.strictCredits!=="function"||
  typeof deps.strictInventory!=="function"||
  typeof deps.deleteOwnedExact!=="function"||
  !Number.isFinite(Date.parse(utcNow))||
  new Date(Date.parse(utcNow)).toISOString()!==utcNow)
  return done("HOLD_OWNER_REQUIRED","INVALID_SCOPE_OR_CLOCK",false);
 let owner:Gate4StopOwnerV39|null;
 try{owner=await deps.readExactOwned();}
 catch{return done("HOLD_OWNER_REQUIRED","OWNER_CUSTODY_READ_FAILED",false);}
 if(owner&&!ownsExact(scope,owner))
  return done("HOLD_OWNER_REQUIRED","OWNER_CUSTODY_SCOPE_MISMATCH",false);
 const id=owner?.subscriptionId??null;
 let credits:number|null=null,inventory:WebhookSubscription[]|null=null;
 try{credits=await deps.strictCredits();}
 catch{/* Strict provider GET uncertainty triggers exact-owned emergency stop. */}
 try{inventory=await deps.strictInventory();}
 catch{/* Do not interpret failed strict LIST as an empty inventory. */}
 const verdict=decideGate4ActionsTickV39(scope,utcNow,credits,inventory,id);
 if(!id){
  if(verdict.action==="WATCH")
   return done("WATCH",verdict.reason,false);
  return done("HOLD_OWNER_REQUIRED",verdict.reason,false);
 }
 if(verdict.action==="WATCH")
  return done("WATCH",verdict.reason,true);
 // With trustworthy externally bound ID, an ambiguous balance/list read,
 // expired window or any policy HOLD should STOP exact owner, not just log it.
 // This may invoke DELETE even if strict pre-DELETE inventory is unavailable.
 let removed=false;
 try{removed=await deps.deleteOwnedExact(id);}
 catch{return done("STOP_UNCONFIRMED","EXACT_DELETE_THROWN",true,true);}
 if(!removed)return done("STOP_UNCONFIRMED","EXACT_DELETE_UNCONFIRMED",
  true,true);
 let after:WebhookSubscription[];
 try{after=await deps.strictInventory();}
 catch{return done("STOP_UNCONFIRMED","POST_STOP_STRICT_LIST_FAILED",
  true,true);}
 if(!Array.isArray(after)||after.some(x=>!x||
    typeof x.id!=="string"||typeof x.isActive!=="boolean"))
  return done("STOP_UNCONFIRMED","POST_STOP_STRICT_LIST_MALFORMED",
    true,true);
 if(after.some(x=>x.id===id&&x.isActive))
  return done("STOP_UNCONFIRMED","OWNED_ID_STILL_ACTIVE",true,true);
 // NOTE: no credit settlement claimed; that is later three stable GETs,
 // residual SEND/attempt assessment and a separate no-second-start gate.
 return done("STOPPED_EXACT_PENDING_SETTLEMENT",verdict.reason,
   true,true,true);
}
