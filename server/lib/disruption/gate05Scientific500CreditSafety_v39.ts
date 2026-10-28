/**
 * Gate05 new WSSS 60-minute Alert scientific pilot, spending-safety decision.
 *
 * PURE arithmetic. It cannot place provider calls, enforce a provider-side
 * cap, dispatch a STOP or certify exact scientific PASS. The caller MUST wire
 * it to an independently armed and live exact-owned provider STOP.
 * The old NEXT4 1900 floor was particular to that old scope; this new
 * reviewed owner approval allows at most 500 *observed* credit expenditure.
 * A burst after the last read and DELETE in flight can exceed that amount.
 */
export const GATE05_NEW_WSSS_APPROVAL_V39={
  airportIcao:"WSSS",
  scientificWindowMinutes:60,
  maximumAuthorizedAlertCredits:500,
  stopReserveCredits:150,
  latestObservedInitialCredits:1981,
  maximumAuthorizedRestUnits:12,
  permitKind:"ONE_NEW_SCIENTIFIC_PILOT_NOT_FOREVER"
} as const;
export type Gate05SpendingStateV39="HOLD_NO_CREATE"|"CONTINUE"|
  "CONTINUE_WITH_ACCOUNTING_WARNING"|"STOP_NOW"|"STOP_UNCONFIRMED";
export interface Gate05SpendSampleV39 {
  initialAuthoritativeCredits:number;
  currentAuthoritativeCredits:number|null;
  initialRestUnits:number;
  currentRestUnits:number|null;
  receivedItemCreditClaims:number;
  sustainedPositiveDriftReadbacks:number;
  elapsedPilotMinutes:number;
  exactOwnedScopeConfirmed:boolean;
  independentStopActuallyRunning:boolean;
  stopConfirmed:boolean;
  callbackRawFirstReady:boolean;
  activeOwnedSubscriptions:number;
  activeForeignSubscriptions:number;
}
export interface Gate05SpendDecisionV39 {
  schema:"v39.gate05.new-500-credit-pilot-safety.v1";
  state:Gate05SpendingStateV39;
  reasons:string[];
  providerChargedCredits:number|null;
  restUnitsConsumed:number|null;
  creditStopThreshold:number;
  creditReserve:number;
  maximumAuthorizedCredits:number;
  receiverCreditGap:number|null;
  minimumDurationReached:boolean;
  creditsMayOvershootBecauseProviderSendAsynchronous:true;
  noHardProviderCreditLimitAttested:true;
  providerCalls:0;
  databaseWrites:0;
  paidCreateAuthorizedByThisPureFunction:false;
}
const valid=(n:unknown)=>typeof n==="number"&&Number.isSafeInteger(n)&&n>=0;
export function reviewNewGate05WsssSpendV39(
  sample:Gate05SpendSampleV39,
  policy:{
    maximumAuthorizedAlertCredits:number;
    stopReserveCredits:number;
    maximumAuthorizedRestUnits:number;
    scientificWindowMinutes:number;
  }=GATE05_NEW_WSSS_APPROVAL_V39
):Gate05SpendDecisionV39 {
  if(!sample||typeof sample!=="object"||
     !valid(policy.maximumAuthorizedAlertCredits)||
     !valid(policy.stopReserveCredits)||
     !valid(policy.maximumAuthorizedRestUnits)||
     !Number.isFinite(policy.scientificWindowMinutes)||
     policy.scientificWindowMinutes<=0||
     policy.maximumAuthorizedAlertCredits>500||
     policy.maximumAuthorizedAlertCredits<=policy.stopReserveCredits||
     policy.stopReserveCredits<100||
     policy.maximumAuthorizedRestUnits>12||
     !valid(sample.initialAuthoritativeCredits)||
     !valid(sample.initialRestUnits)||
     !valid(sample.receivedItemCreditClaims)||
     !valid(sample.sustainedPositiveDriftReadbacks)||
     !Number.isFinite(sample.elapsedPilotMinutes)||
     sample.elapsedPilotMinutes<0||
     [
       sample.exactOwnedScopeConfirmed,
       sample.independentStopActuallyRunning,
       sample.stopConfirmed,
       sample.callbackRawFirstReady
     ].some(v=>typeof v!=="boolean")||
     !valid(sample.activeOwnedSubscriptions)||
     !valid(sample.activeForeignSubscriptions))
    throw Error("GATE05_SCIENTIFIC_SPENDING_POLICY_INVALID");
  if((sample.currentAuthoritativeCredits!==null&&
      !valid(sample.currentAuthoritativeCredits))||
     (sample.currentRestUnits!==null&&
      !valid(sample.currentRestUnits)))
    throw Error("GATE05_PROVIDER_BALANCE_INVALID");
  const reasons:string[]=[];
  const spent=sample.currentAuthoritativeCredits===null?null:
    sample.initialAuthoritativeCredits-sample.currentAuthoritativeCredits;
  const rest=sample.currentRestUnits===null?null:
    sample.initialRestUnits-sample.currentRestUnits;
  const threshold=policy.maximumAuthorizedAlertCredits-policy.stopReserveCredits;
  const elapsed=sample.elapsedPilotMinutes>=policy.scientificWindowMinutes;
  const diff=spent===null?null:spent-sample.receivedItemCreditClaims;
  let state:Gate05SpendingStateV39="CONTINUE";
  // First priority: unknown account and multiple/foreign subscriptions are
  // never permission to create a new subscription or to keep an owned one.
  if(spent===null||rest===null||spent<0||rest<0||
     sample.activeForeignSubscriptions!==0||
     sample.activeOwnedSubscriptions>1||
     (!sample.stopConfirmed&&sample.activeOwnedSubscriptions!==1)||
     sample.initialAuthoritativeCredits<policy.maximumAuthorizedAlertCredits||
     !sample.exactOwnedScopeConfirmed||
     !sample.callbackRawFirstReady){
    reasons.push("EXACT_SOURCE_ACCOUNT_OR_SCOPE_UNCERTAIN");
    state=sample.activeOwnedSubscriptions===1?"STOP_NOW":"HOLD_NO_CREATE";
  }else if(sample.stopConfirmed){
    reasons.push("STOP_CONFIRMED_NO_NEW_CREATE");
    state="STOP_NOW";
  }else if(!sample.independentStopActuallyRunning){
    reasons.push("INDEPENDENT_EXACT_SCOPE_STOP_NOT_LIVE");
    state=sample.activeOwnedSubscriptions===1?"STOP_UNCONFIRMED":"HOLD_NO_CREATE";
  }else if(rest>policy.maximumAuthorizedRestUnits){
    reasons.push("REST_BUDGET_EXCEEDED");
    state="STOP_NOW";
  }else if(spent>policy.maximumAuthorizedAlertCredits){
    reasons.push("ALERT_CREDITS_ALREADY_OVER_AUTHORIZED_BOUND");
    state="STOP_NOW";
  }else if(spent>=threshold){
    reasons.push("EARLY_STOP_RESERVE_TRIGGER");
    state="STOP_NOW";
  }else if(elapsed){
    reasons.push("OBSERVATION_WINDOW_END");
    state="STOP_NOW";
  }else if(diff!==null&&diff>=2&&sample.sustainedPositiveDriftReadbacks>=2){
    // An unmapped +2 credit drift may be pending balance or real lost SEND,
    // not two certified lost HTTP requests. Stop further blind paid exposure.
    reasons.push("SUSTAINED_UNEXPLAINED_BILLING_DRIFT");
    state="STOP_NOW";
  }else if(diff!==null&&diff>0){
    reasons.push("UNSETTLED_PROVIDER_RECEIVER_DIFFERENCE");
    state="CONTINUE_WITH_ACCOUNTING_WARNING";
  }
  return {
    schema:"v39.gate05.new-500-credit-pilot-safety.v1",
    state,reasons,providerChargedCredits:spent,
    restUnitsConsumed:rest,creditStopThreshold:threshold,
    creditReserve:policy.stopReserveCredits,
    maximumAuthorizedCredits:policy.maximumAuthorizedAlertCredits,
    receiverCreditGap:diff,minimumDurationReached:elapsed,
    creditsMayOvershootBecauseProviderSendAsynchronous:true,
    noHardProviderCreditLimitAttested:true,
    providerCalls:0,databaseWrites:0,
    paidCreateAuthorizedByThisPureFunction:false
  };
}
