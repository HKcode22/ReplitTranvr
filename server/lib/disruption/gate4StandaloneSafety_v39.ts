/**
 * Gate4 ISOLATED small-canary admission and independently callable exact-owned
 * STOP primitives. NO Phase6 startBatch; NO paid CREATE; NO account mutation
 * from preflight. This is a component, not a completed live Gate4 certificate.
 */
import type {WebhookSubscription} from "./aerodataboxLimiter_v3";

export interface Gate4StandaloneAccountEvidenceV39 {
  balances: readonly number[];
  quotaRemaining: readonly number[];
  activeCreditBased: number;
  activePhase6Batches: number;
  canaryCap: number;
  unsettledBurstReserve: number;
  protectedCreditFloor: number;
}
export type Gate4AccountVerdictV39 = Readonly<{
  readyForSeparateAuthorization:boolean;
  reason:string;
  observedBalance:number|null;
  maximumPlannedExposure:number|null;
  actualProviderHardCapCertified:false;
  paidAuthorization:false;
  liveGate4Certified:false;
}>;
function bad(reason:string):Gate4AccountVerdictV39 {
  return {readyForSeparateAuthorization:false,reason,
    observedBalance:null,maximumPlannedExposure:null,
    actualProviderHardCapCertified:false,paidAuthorization:false,
    liveGate4Certified:false};
}
/**
 * Three strict GET balance readings and one strict inventory. This is a
 * conservative planning bound, NOT a server-enforced upper credit limit.
 */
export function assessGate4StandaloneAccountV39(
  x:Gate4StandaloneAccountEvidenceV39
):Gate4AccountVerdictV39 {
  if(!x || !Number.isSafeInteger(x.canaryCap) || x.canaryCap<1 ||
     x.canaryCap>100 || !Number.isSafeInteger(x.unsettledBurstReserve) ||
     x.unsettledBurstReserve<1 || x.unsettledBurstReserve>100 ||
     !Number.isSafeInteger(x.protectedCreditFloor) ||
     x.protectedCreditFloor<1000)
    return bad("INVALID_SMALL_SCOPE_OR_RESERVE");
  if(!Array.isArray(x.balances)||x.balances.length!==3 ||
     x.balances.some(v=>!Number.isSafeInteger(v)||v<0) ||
     x.balances.some(v=>v!==x.balances[0]))
    return bad("THREE_STABLE_BALANCES_NOT_VERIFIED");
  if(!Array.isArray(x.quotaRemaining)||x.quotaRemaining.length!==3 ||
     x.quotaRemaining.some(v=>!Number.isSafeInteger(v)||v<0))
    return bad("PROVIDER_QUOTA_EVIDENCE_INVALID");
  if(!Number.isSafeInteger(x.activeCreditBased)||
     x.activeCreditBased!==0||
     !Number.isSafeInteger(x.activePhase6Batches)||
     x.activePhase6Batches!==0)
    return bad("ACTIVE_BILLABLE_OR_PHASE6_ACTIVITY");
  const maximumPlannedExposure=x.canaryCap+x.unsettledBurstReserve;
  if(x.balances[0]-maximumPlannedExposure<x.protectedCreditFloor)
    return bad("PROTECTED_FLOOR_AFTER_RESERVE_NOT_MET");
  return {
    readyForSeparateAuthorization:true,
    reason:"READONLY_ACCOUNT_FOUNDATION_ONLY",
    observedBalance:x.balances[0],maximumPlannedExposure,
    actualProviderHardCapCertified:false,
    paidAuthorization:false,liveGate4Certified:false
  };
}

export interface Gate4ExactOwnedStopScopeV39 {
  subscriptionId:string;
  subjectType:"FlightByAirportIcao";
  subjectId:string;
}
export type Gate4StopResultV39=Readonly<{
  status:"NO_ACTIVE_OWNED"|"DELETE_VERIFIED_PENDING_SETTLEMENT"|
    "HOLD_UNCONFIRMED";
  reason:string;
  independentAccountReadbackVerified:boolean;
  creditSettlementVerified:false;
  liveGate4Certified:false;
}>;
export interface Gate4ExactOwnedStopDepsV39 {
  listStrict:()=>Promise<WebhookSubscription[]>;
  deleteExactVerified:(subscriptionId:string)=>Promise<boolean>;
}
const hold=(reason:string):Gate4StopResultV39=>({
  status:"HOLD_UNCONFIRMED",reason,
  independentAccountReadbackVerified:false,
  creditSettlementVerified:false,liveGate4Certified:false
});
/**
 * Independently callable after a paid owner obtains an EXACT provider ID.
 * Never infers an owned ID from airport or creation time: a failed CREATE
 * response without an ID needs account isolation + HUMAN owned-rescue
 * adjudication and is NOT auto-deleted under this helper.
 *
 * Caller must separately verify approved scope/binding before invoking this
 * mutating STOP, and must retain a durable owner receipt.
 */
export async function stopGate4ExactOwnedV39(
  scope:Gate4ExactOwnedStopScopeV39,
  deps:Gate4ExactOwnedStopDepsV39
):Promise<Gate4StopResultV39> {
  if(!scope || typeof scope.subscriptionId!=="string" ||
     !/^[a-zA-Z0-9_-]{6,128}$/.test(scope.subscriptionId) ||
     scope.subjectType!=="FlightByAirportIcao" ||
     !/^[A-Z]{4}$/.test(scope.subjectId))
    return hold("EXACT_OWNER_SCOPE_INVALID");
  let before:WebhookSubscription[];
  try {before=await deps.listStrict();}catch {
    return hold("PRE_STOP_STRICT_INVENTORY_UNAVAILABLE");
  }
  if(!Array.isArray(before))
    return hold("PRE_STOP_INVENTORY_MALFORMED");
  const active=before.filter(v=>v?.isActive&&v.billingType==="CreditBased");
  const candidate=active.find(v=>v.id===scope.subscriptionId);
  if(active.length===0) {
    // A currently empty inventory can show zero active, but not prove
    // provider SEND credit settlement or a preceding physical DELETE.
    return {status:"NO_ACTIVE_OWNED",reason:"NO_ACTIVE_CREDIT_BASED",
      independentAccountReadbackVerified:true,
      creditSettlementVerified:false,liveGate4Certified:false};
  }
  // Emergency STOP must still attempt deletion of our exact known ID
  // even if another subscription appears concurrently. Refuse to DELETE
  // the unrelated resource; final all-account-clear remains a HOLD.
  if(!candidate || candidate.subject?.type!==scope.subjectType ||
     candidate.subject?.id!==scope.subjectId)
    return hold("OWNED_ID_ABSENT_OR_SUBJECT_MISMATCH");
  let returned=false;
  try {returned=await deps.deleteExactVerified(scope.subscriptionId)===true;}
  catch {returned=false;}
  if(!returned)return hold("EXACT_PROVIDER_DELETE_UNCONFIRMED");
  let after:WebhookSubscription[];
  try {after=await deps.listStrict();}catch {
    return hold("POST_STOP_STRICT_INVENTORY_UNAVAILABLE");
  }
  if(!Array.isArray(after) ||
     after.some(v=>v?.isActive&&v.billingType==="CreditBased"))
    return hold("POST_STOP_ACTIVE_OR_MALFORMED_INVENTORY");
  return {
    status:"DELETE_VERIFIED_PENDING_SETTLEMENT",
    reason:"EXACT_OWNED_DELETE_AND_ZERO_ACTIVE_VERIFIED",
    independentAccountReadbackVerified:true,
    creditSettlementVerified:false,liveGate4Certified:false
  };
}
