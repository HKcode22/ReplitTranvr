/**
 * Phase3 Gate3 - independent WSSS rescue tick.
 *
 * Unlike the actual paid owner, this only reacts to an ALREADY existing,
 * uniquely identified, account-level CreditBased subscription. No CREATE,
 * FIDS, webhook POST, SQL write, foreign-subscription DELETE, provider-account
 * values or callback secrets are persisted or emitted.
 *
 * The named deps are injectable ONLY to run disposable no-provider tests.
 * Real GitHub Actions entrypoint must separately authenticate exact SHA,
 * ledger-approved AUTH bytes, LOGGED owner, start time, unique callback URL,
 * and be ARMED before the paid owner's CREATE.
 */
import type {WebhookSubscription} from "./aerodataboxLimiter_v3";
import {decideGate3IndependentSafetyV39,
  type Gate3IndependentSafetyDecisionV39}
  from "./gate3IndependentSafetyDecision_v39";

export type Gate3WatchdogOwnerRowV39=Readonly<{
  sessionId:string;
  ownerState:"PREPARED"|"SETTLED"|"FAILED";
  icao:string;
  authorizationEvidenceSha256:string;
  fixedExposureSeconds:number;
  canaryCreditCeiling:number;
  runtimeSessionVisible:boolean;
  boundProviderSubscriptionId:string|null;
}>;

export type Gate3WatchdogScopeV39=Readonly<{
  sessionId:string;authSha256:string;callbackUrl:string;
  startUtc:string;baselineCredits:number;
}>;

export type Gate3WatchdogDepsV39=Readonly<{
  readOwner:()=>Promise<Gate3WatchdogOwnerRowV39|null>;
  list:()=>Promise<readonly WebhookSubscription[]>;
  balance:()=>Promise<number|null>;
  deleteExact: (providerSubscriptionId:string)=>Promise<boolean>;
  now:()=>Date;
}>;

export type Gate3WatchdogTickResultV39=Readonly<{
  schema:"v39.gate3.independent-watchdog-tick.v1";
  status:"MONITOR"|"ZERO_EXACT_SUBSCRIPTIONS"|"STOP_VERIFIED"|"HOLD";
  reason:string;
  ownsProviderSubscription:boolean;
  providerDeleteAttempted:boolean;
  verifiedExactSubscriptionAbsent:boolean;
  otherBillablePresent:boolean|null;
  authorizesAnotherCreate:false;
  guaranteesCreditCeiling:false;
  // No account balance, secret URL or raw subscription ID is returned.
}>;

function result(
  status:Gate3WatchdogTickResultV39["status"],reason:string,
  owned=false,attempted=false,absent=false,foreign:boolean|null=null
):Gate3WatchdogTickResultV39{
  return {schema:"v39.gate3.independent-watchdog-tick.v1",
    status,reason,ownsProviderSubscription:owned,
    providerDeleteAttempted:attempted,
    verifiedExactSubscriptionAbsent:absent,otherBillablePresent:foreign,
    authorizesAnotherCreate:false,guaranteesCreditCeiling:false};
}

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[0-9a-f]{64}$/;
function validScope(s:Gate3WatchdogScopeV39):boolean{
  return !!s && UUID.test(s.sessionId) && SHA.test(s.authSha256) &&
    Number.isSafeInteger(s.baselineCredits)&&s.baselineCredits>=1500 &&
    typeof s.callbackUrl==="string"&&
    /^https:\/\/[^/]+\/api\/v1\/webhooks\/aerodatabox\/[^/]+\/prepaid\//.test(s.callbackUrl)&&
    s.callbackUrl.endsWith("/prepaid/"+s.sessionId)&&
    Number.isFinite(Date.parse(s.startUtc));
}
function belongs(o:Gate3WatchdogOwnerRowV39|null,s:Gate3WatchdogScopeV39):boolean{
  return !!o&&o.sessionId===s.sessionId&&
    o.authorizationEvidenceSha256===s.authSha256&&
    o.icao==="WSSS"&&o.fixedExposureSeconds===600&&
    o.canaryCreditCeiling===50&&
    ["PREPARED","SETTLED","FAILED"].includes(o.ownerState)&&
    (o.boundProviderSubscriptionId===null||
      (typeof o.boundProviderSubscriptionId==="string"&&
        o.boundProviderSubscriptionId.length>0));
}
function matched(
  inventory:readonly WebhookSubscription[],s:Gate3WatchdogScopeV39,
):WebhookSubscription[]{
  return inventory.filter(sub=>sub.isActive&&
    sub.billingType==="CreditBased"&&
    sub.subject?.type==="FlightByAirportIcao"&&sub.subject?.id==="WSSS"&&
    sub.subscriber?.type==="WebHook"&&sub.subscriber?.id===s.callbackUrl);
}

/**
 * Real READ-ONLY DB snapshot and GET-only provider reads precede every
 * mutation decision. An exact DELETE needs a fresh full strict LIST.
 * Any malformed state or ambiguous/mismatched subscription => HOLD.
 * Unknown DELETE response => HOLD; NEVER re-CREATE or infer success.
 */
export async function runGate3IndependentWatchdogTickV39(
  s:Gate3WatchdogScopeV39,d:Gate3WatchdogDepsV39,
):Promise<Gate3WatchdogTickResultV39>{
  if(!validScope(s)||!d||
    !["readOwner","list","balance","deleteExact","now"].every(
      k=>typeof (d as unknown as Record<string,unknown>)[k]==="function"))
    return result("HOLD","WATCHDOG_SCOPE_OR_DEPENDENCIES_INVALID");
  try{
    const owner=await d.readOwner();
    if(!belongs(owner,s))return result("HOLD","DURABLE_OWNER_AUTH_OR_SCOPE_MISSING");
    const inventory=await d.list();
    if(!Array.isArray(inventory)||inventory.some(x=>!x||
      typeof x.isActive!=="boolean"||
      typeof x.id!=="string"||x.id.length<1||
      !["CreditBased","LifetimeBased"].includes(x.billingType)))
      return result("HOLD","PROVIDER_INVENTORY_MALFORMED");
    const exact=matched(inventory,s);
    if(exact.length>1)return result("HOLD","MULTIPLE_EXACT_OWNED_SUBSCRIPTIONS");
    if(exact.length===1&&owner!.boundProviderSubscriptionId!==null&&
       owner!.boundProviderSubscriptionId!==exact[0].id)
      return result("HOLD","BOUND_PROVIDER_ID_MISMATCH_NEVER_DELETE");
    if(exact.length===0){
      if(owner!.boundProviderSubscriptionId!==null &&
         inventory.some(x=>x.id===owner!.boundProviderSubscriptionId&&x.isActive))
        return result("HOLD","BOUND_SUBSCRIPTION_ACTIVE_WITH_DIFFERENT_CALLBACK");
      const others=inventory.some(x=>x.isActive&&x.billingType==="CreditBased");
      return result("ZERO_EXACT_SUBSCRIPTIONS",
        "NO_OWNED_ACTIVE_SUBSCRIPTION_NOT_A_SETTLEMENT_PROOF",
        false,false,true,others);
    }
    let balance:number|null=null;
    try{balance=await d.balance()}catch{balance=null}
    const n=d.now();if(!(n instanceof Date)||!Number.isFinite(n.getTime()))
      return result("HOLD","INVALID_WATCHDOG_CLOCK");
    const decision:Gate3IndependentSafetyDecisionV39=
      decideGate3IndependentSafetyV39({
        sessionId:s.sessionId,ownerSessionId:owner!.sessionId,
        icao:"WSSS",callbackUrl:s.callbackUrl,
        ownerState:owner!.ownerState,
        approvedAuthSha256:s.authSha256,
        ownerAuthSha256:owner!.authorizationEvidenceSha256,
        startUtc:s.startUtc,fixedSeconds:600,
        baselineCredits:s.baselineCredits,
        currentCredits:balance,softStopCredits:50,
        observedAtUtc:n.toISOString(),
        runtimeSessionVisible:owner!.runtimeSessionVisible,
        subscriptions:inventory,
      });
    if(decision.decision==="HOLD")
      return result("HOLD",decision.reason,true);
    if(decision.decision==="MONITOR")
      return result("MONITOR",decision.reason,true);
    if(decision.decision!=="DELETE_EXACT_OWNED"||
       decision.exactOwnedSubscriptionId!==exact[0].id)
      return result("HOLD","DECISION_ID_OR_STATE_UNEXPECTED",true);

    // Take a second authoritative subscription LIST immediately before any
    // mutation: never DELETE based on a stale or caller-supplied provider ID.
    const fresh=await d.list();
    if(!Array.isArray(fresh)||
       fresh.some(x=>!x||typeof x.id!=="string"||
         typeof x.isActive!=="boolean"||
         !["CreditBased","LifetimeBased"].includes(x.billingType)))
      return result("HOLD","REFRESHED_PROVIDER_INVENTORY_INVALID",true);
    const newExact=matched(fresh,s);
    if(newExact.length!==1||newExact[0].id!==exact[0].id)
      return result("HOLD","EXACT_SUBSCRIPTION_CHANGED_BEFORE_DELETE",true);
    const ok=await d.deleteExact(exact[0].id);
    if(ok!==true)
      return result("HOLD","EXACT_DELETE_NOT_CONFIRMED",true,true);
    const after=await d.list();
    if(!Array.isArray(after)||after.some(x=>!x||
       typeof x.id!=="string"||typeof x.isActive!=="boolean"||
       !["CreditBased","LifetimeBased"].includes(x.billingType)))
      return result("HOLD","POST_DELETE_INVENTORY_INVALID",true,true);
    const still=matched(after,s);
    if(still.length!==0||after.some(x=>x.id===exact[0].id&&x.isActive))
      return result("HOLD","EXACT_DELETE_STILL_ACTIVE",true,true);
    return result("STOP_VERIFIED",decision.reason,true,true,true,
      after.some(x=>x.isActive&&x.billingType==="CreditBased"));
  }catch{
    // No account URLs, credentials, provider raw errors, or balance values in
    // the external receipt. The operator must continue independent recovery.
    return result("HOLD","WATCHDOG_SQL_OR_PROVIDER_UNAVAILABLE");
  }
}
