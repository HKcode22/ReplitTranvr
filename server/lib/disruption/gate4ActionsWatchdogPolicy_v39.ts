/**
 * Gate4 minimal risk-managed, long-running GitHub Actions watchdog policy.
 * Source-only until reviewed main + deliberate workflow_dispatch.
 * No provider I/O in this module. The GH runner is independent of Replit
 * process but neither guaranteed to start nor guaranteed to remain alive.
 * Credits are charged on SEND; a soft ceiling cannot stop provider bursts.
 */
import type {WebhookSubscription} from "./aerodataboxLimiter_v3";
export type Gate4ActionsWatchScopeV39=Readonly<{
  scopeId:string;sourceCommit:string;authorizationSha256:string;
  airportIcao:string;startUtc:string;stopUtc:string;
  observedStartingCredits:number;softCreditTarget:number;
  protectedCreditFloor:number;
}>;
export type Gate4ActionsTickV39=Readonly<{
  action:"WATCH"|"STOP_EXACT_OWNED"|"HOLD_UNOWNED_ACTIVE"|"HOLD";
  reason:string;
  exactOwnedId:string|null;
  trialCreditsConsumed:number|null;
  hardProviderCreditCap:false;
  providerCreates:0;
  phase6Starts:0;
}>;
const sha=/^[a-f0-9]{40}$/,sha256=/^[a-f0-9]{64}$/,
  uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i,
  icao=/^[A-Z]{4}$/,id=/^[A-Za-z0-9_-]{6,128}$/;
export function reviewGate4ActionsWatchScopeV39(x:Gate4ActionsWatchScopeV39):boolean{
  if(!x||!sha.test(x.sourceCommit)||!sha256.test(x.authorizationSha256)||
    !uuid.test(x.scopeId)||!icao.test(x.airportIcao)||
    !Number.isSafeInteger(x.softCreditTarget)||x.softCreditTarget<1||
    x.softCreditTarget>100||
    !Number.isSafeInteger(x.protectedCreditFloor)||x.protectedCreditFloor<1000||
    !Number.isSafeInteger(x.observedStartingCredits)||
    x.observedStartingCredits-x.softCreditTarget<x.protectedCreditFloor)
    return false;
  const a=Date.parse(x.startUtc),b=Date.parse(x.stopUtc);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x.startUtc)&&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x.stopUtc)&&
    Number.isFinite(a)&&Number.isFinite(b)&&
    new Date(a).toISOString()===x.startUtc&&
    new Date(b).toISOString()===x.stopUtc&&
    b>a&&b-a<=120*60*1000;
}
const verdict=(action:Gate4ActionsTickV39["action"],reason:string,
  exactOwnedId:string|null,spent:number|null):Gate4ActionsTickV39=>({
  action,reason,exactOwnedId,trialCreditsConsumed:spent,
  hardProviderCreditCap:false,providerCreates:0,phase6Starts:0
});
/**
 * Owner ID must come from a separately verified V0072 record. NEVER use
 * a matching ICAO or a first-seen provider LIST item as positive ownership.
 * This tick can request exactly one known-ID STOP after source checks.
 */
export function decideGate4ActionsTickV39(
  scope:Gate4ActionsWatchScopeV39,
  nowUtc:string,
  accountCredits:number|null,
  strictInventory:readonly WebhookSubscription[]|null,
  boundProviderId:string|null
):Gate4ActionsTickV39 {
  if(!reviewGate4ActionsWatchScopeV39(scope))
    return verdict("HOLD","INVALID_SCOPE",null,null);
  const now=Date.parse(nowUtc);
  if(!Number.isFinite(now)||new Date(now).toISOString()!==nowUtc)
    return verdict("HOLD","CLOCK_INVALID",null,null);
  if(!Array.isArray(strictInventory))
    return verdict("HOLD","STRICT_INVENTORY_UNAVAILABLE",null,null);
  if(accountCredits===null||!Number.isSafeInteger(accountCredits)||
    accountCredits<0)
    return verdict("HOLD","STRICT_BALANCE_UNAVAILABLE",null,null);
  // A balance increase is unrelated account activity/refill, NOT a safe
  // negative consumption reading. This invalidates this trial's baseline.
  if(accountCredits>scope.observedStartingCredits)
    return verdict("HOLD","UNEXPECTED_ACCOUNT_CREDIT_INCREASE",null,null);
  const spent=scope.observedStartingCredits-accountCredits;
  // Malformed rows must not be silently discarded as inactive.
  if(strictInventory.some(x=>!x||typeof x.id!=="string"||
    typeof x.isActive!=="boolean"||
    !["CreditBased","LifetimeBased"].includes(x.billingType)))
    return verdict("HOLD","STRICT_INVENTORY_ROW_MALFORMED",null,spent);
  const active=strictInventory.filter(x=>x.isActive&&x.billingType==="CreditBased");
  // A second active subscription is a known risk even if the owned ID can be
  // deleted; this policy never authorizes deletion of the other subscription.
  if(boundProviderId!==null && !id.test(boundProviderId))
    return verdict("HOLD","BOUND_ID_INVALID",null,spent);
  if(boundProviderId===null){
    if(active.length>0)
      return verdict("HOLD_UNOWNED_ACTIVE","BILLABLE_ACTIVE_WITHOUT_OWNER_ID",
        null,spent);
    if(now>=Date.parse(scope.stopUtc))
      return verdict("HOLD","WINDOW_EXPIRED_NO_OWNED_ID",null,spent);
    if(spent>0)return verdict("HOLD","SPEND_WITHOUT_OWNED_ID",null,spent);
    return verdict("WATCH","NO_ACTIVE_OWNED_ID_YET",null,spent);
  }
  const owned=active.filter(x=>x.id===boundProviderId&&
    x.subject?.type==="FlightByAirportIcao"&&
    x.subject?.id===scope.airportIcao);
  if(owned.length===0){
    if(active.some(x=>x.id===boundProviderId))
      return verdict("HOLD","OWNED_ID_SUBJECT_CHANGED",null,spent);
    if(active.length>0)
      return verdict("HOLD","UNRELATED_ACTIVE_BILLABLE",null,spent);
    // Absence of active provider ID cannot certify the prior physical DELETE,
    // lingering paid SENDs, delivery/ACK or three stable settlement balances.
    return verdict("HOLD","OWNED_ID_NOT_ACTIVE_SETTLEMENT_UNPROVEN",null,spent);
  }
  if(owned.length!==1)
    return verdict("HOLD","DUPLICATE_OWNED_PROVIDER_ID",null,spent);
  // Emergency policy: remove our exact verified ID when ANY unrelated active
  // billable resource appears. The other ID is never deleted by this worker;
  // account-wide clean settlement must remain a separate HOLD.
  if(active.some(x=>x.id!==boundProviderId))
    return verdict("STOP_EXACT_OWNED","UNRELATED_ACTIVE_BILLABLE_STOP_OWNED",
      boundProviderId,spent);
  // CREATE before its approved UTC window requires immediate exact STOP.
  if(now<Date.parse(scope.startUtc))
    return verdict("STOP_EXACT_OWNED","ACTIVE_OWNED_BEFORE_APPROVED_START",
      boundProviderId,spent);
  if(now>=Date.parse(scope.stopUtc))
    return verdict("STOP_EXACT_OWNED","HARD_TIME_DEADLINE",
      boundProviderId,spent);
  if(accountCredits<=scope.protectedCreditFloor||
     spent>=scope.softCreditTarget)
    return verdict("STOP_EXACT_OWNED","SOFT_BALANCE_LIMIT_REACHED",
      boundProviderId,spent);
  return verdict("WATCH","ACTIVE_OWNED_WITHIN_SOFT_ENVELOPE",
    boundProviderId,spent);
}
