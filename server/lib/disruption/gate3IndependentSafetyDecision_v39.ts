/**
 * Gate3 independent watchdog: pure, provider-free STOP/ownership decision.
 *
 * An independent GitHub runner may use this AFTER separately verifying the
 * checked-in AUTH ledger, exact callback URL, baseline and durable Gate3
 * LOGGED owner. This policy never calls the provider or deletes a sub itself.
 *
 * Exact URL + WSSS subject and billing-type isolation is mandatory: a
 * different subscription must never be deleted to clear a foreign-account
 * alert. Soft 50 is a detection threshold, NOT a hard provider credit cap.
 */
import type {WebhookSubscription} from "./aerodataboxLimiter_v3";

export type Gate3IndependentSafetyInputV39=Readonly<{
  sessionId:string;
  ownerSessionId:string|null;
  icao:"WSSS";
  callbackUrl:string;
  ownerState:"PREPARED"|"SETTLED"|"FAILED"|null;
  approvedAuthSha256:string;
  ownerAuthSha256:string|null;
  startUtc:string;
  fixedSeconds:600;
  baselineCredits:number;
  currentCredits:number|null;
  softStopCredits:50;
  observedAtUtc:string;
  runtimeSessionVisible:boolean;
  subscriptions:readonly WebhookSubscription[];
}>;

export type Gate3IndependentSafetyDecisionV39=Readonly<{
  schema:"v39.gate3.independent-safety-decision.v1";
  decision:"MONITOR"|"DELETE_EXACT_OWNED"|"NO_EXACT_ACTIVE_SUBSCRIPTION"|"HOLD";
  reason:string;
  exactOwnedSubscriptionId:string|null;
  observedCreditSpend:number|null;
  authorizesAnotherCreate:false;
  guaranteesCreditCeiling:false;
  providerMutationsHere:0;
}>;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
function output(
  decision:Gate3IndependentSafetyDecisionV39["decision"],
  reason:string,id:string|null,spend:number|null,
):Gate3IndependentSafetyDecisionV39{
  return {schema:"v39.gate3.independent-safety-decision.v1",
    decision,reason,exactOwnedSubscriptionId:id,
    observedCreditSpend:spend,authorizesAnotherCreate:false,
    guaranteesCreditCeiling:false,providerMutationsHere:0};
}

export function decideGate3IndependentSafetyV39(
  x:Gate3IndependentSafetyInputV39,
):Gate3IndependentSafetyDecisionV39{
  if(!x||!UUID.test(x.sessionId)||x.ownerSessionId!==x.sessionId||
     !SHA.test(x.approvedAuthSha256)||
     x.ownerAuthSha256!==x.approvedAuthSha256||
     !["PREPARED","FAILED","SETTLED"].includes(String(x.ownerState))||
     x.icao!=="WSSS"||
     x.fixedSeconds!==600||x.softStopCredits!==50||
     typeof x.callbackUrl!=="string"||
     !x.callbackUrl.startsWith("https://")||
     !x.callbackUrl.endsWith("/prepaid/"+x.sessionId)||
     !Number.isSafeInteger(x.baselineCredits)||
     x.baselineCredits<1500||
     !Array.isArray(x.subscriptions))
    return output("HOLD","MISSING_EXACT_LOGGED_OWNER_OR_AUTH",null,null);
  const start=Date.parse(x.startUtc),now=Date.parse(x.observedAtUtc);
  if(!Number.isFinite(start)||!Number.isFinite(now))
    return output("HOLD","INVALID_OBSERVATION_WINDOW",null,null);
  if(x.subscriptions.some(s=>
     !s||typeof s.id!=="string"||s.id.length===0||
     typeof s.isActive!=="boolean"||
     !["CreditBased","LifetimeBased"].includes(s.billingType)))
    return output("HOLD","PROVIDER_LIST_MALFORMED",null,null);

  const exact=x.subscriptions.filter(s=>
    s.isActive&&s.billingType==="CreditBased"&&
    s.subject?.type==="FlightByAirportIcao"&&
    s.subject?.id==="WSSS"&&
    s.subscriber?.type==="WebHook"&&
    s.subscriber?.id===x.callbackUrl
  );
  if(exact.length>1)
    return output("HOLD","MULTIPLE_EXACT_ACTIVE_SUBSCRIPTIONS",null,null);
  if(exact.length===0)
    return output("NO_EXACT_ACTIVE_SUBSCRIPTION",
      "ZERO_EXACT_ACTIVE_NOT_PROOF_OF_SETTLEMENT",null,null);

  const subscriptionId=exact[0].id;
  // An unrelated active credit-based subscription contaminates account-wide
  // balance evidence. Stop OUR exact subscription, never the foreign one.
  if(x.subscriptions.some(s=>
       s.isActive&&s.billingType==="CreditBased"&&s.id!==subscriptionId))
    return output("DELETE_EXACT_OWNED",
      "FOREIGN_ACTIVE_BILLABLE_CONTAMINATION",subscriptionId,null);
  const current=x.currentCredits;
  if(current===null||!Number.isSafeInteger(current)||current<0)
    return output("DELETE_EXACT_OWNED",
      "PROVIDER_BALANCE_UNAVAILABLE_FAIL_CLOSED",subscriptionId,null);
  if(current>x.baselineCredits)
    return output("DELETE_EXACT_OWNED",
      "PROVIDER_BALANCE_INCREASE_IS_CONTAMINATION",subscriptionId,null);
  const spent=x.baselineCredits-current;
  if(x.ownerState!=="PREPARED")
    return output("DELETE_EXACT_OWNED",
      "TERMINAL_LOGGED_OWNER_WITH_ACTIVE_PROVIDER_SUBSCRIPTION",subscriptionId,spent);
  if(now<start-120_000)
    return output("DELETE_EXACT_OWNED",
      "SUBSCRIPTION_ACTIVE_BEFORE_AUTHORIZED_WINDOW",subscriptionId,spent);
  if(!x.runtimeSessionVisible)
    return output("DELETE_EXACT_OWNED",
      "UNLOGGED_SESSION_LOST_WHILE_PROVIDER_ACTIVE",subscriptionId,spent);
  if(now>=start+600_000)
    return output("DELETE_EXACT_OWNED",
      "TEN_MINUTE_WALL_CLOCK_EXPIRED",subscriptionId,spent);
  if(spent>=50)
    return output("DELETE_EXACT_OWNED",
      "SOFT_FIFTY_CREDITS_REACHED",subscriptionId,spent);
  return output("MONITOR","WITHIN_TIME_AND_SOFT_STOP",subscriptionId,spent);
}
