/**
 * Gate4 pure SEND-aware watchdog decision. It cannot enforce an exact
 * server-side hard cap against delayed/unobserved provider SEND.
 * No provider calls, persistence, clock or process globals.
 */
export interface Gate4SpendInputV39 {
  cap: number;
  softStopMargin: number;
  unsettledBurstReserve: number;
  openingBalance: number | null;
  currentBalance: number | null;
  receivedItemUnits: number;
  deliveryFailures: number;
}
export type Gate4ActionV39="CONTINUE"|"STOP"|"HOLD_STOP";
export interface Gate4SpendDecisionV39 {
  action: Gate4ActionV39;
  reason: string;
  observedExternalSpend: number|null;
  observedInternalUnits: number|null;
  threshold: number|null;
  providerRequests: 0;
  liveHardCapCertified: false;
}
const int=(v:unknown):v is number =>
  typeof v==="number"&&Number.isSafeInteger(v)&&v>=0;
const result=(action:Gate4ActionV39,reason:string,
  external:number|null,internal:number|null,threshold:number|null
):Gate4SpendDecisionV39=>({
  action,reason,observedExternalSpend:external,
  observedInternalUnits:internal,threshold,
  providerRequests:0,liveHardCapCertified:false
});
export function assessGate4SpendV39(x:Gate4SpendInputV39):Gate4SpendDecisionV39 {
  if(!x||!int(x.cap)||x.cap<2||!int(x.softStopMargin)||
     x.softStopMargin>=x.cap||!int(x.unsettledBurstReserve)||
     x.unsettledBurstReserve>x.softStopMargin||
     !int(x.receivedItemUnits)||!int(x.deliveryFailures))
    return result("HOLD_STOP","INVALID_OR_UNBOUNDED_BUDGET",null,null,null);
  const threshold=x.cap-x.softStopMargin;
  if(!int(x.openingBalance)||!int(x.currentBalance))
    return result("HOLD_STOP","PROVIDER_BALANCE_UNAVAILABLE",
      null,x.receivedItemUnits,threshold);
  const external=x.openingBalance-x.currentBalance;
  const internal=x.receivedItemUnits;
  if(external<0)
    return result("HOLD_STOP","PROVIDER_BALANCE_INCREASED",
      external,internal,threshold);
  if(x.deliveryFailures>0)
    return result("HOLD_STOP","WEBHOOK_DELIVERY_FAILURE",
      external,internal,threshold);
  if(Math.max(external,internal)>x.cap)
    return result("HOLD_STOP","OBSERVED_HARD_CAP_EXCEEDED",
      external,internal,threshold);
  if(Math.abs(external-internal)>x.unsettledBurstReserve)
    return result("HOLD_STOP","SEND_ACCOUNTING_GAP_EXCEEDS_RESERVE",
      external,internal,threshold);
  if(Math.max(external,internal)>=threshold)
    return result("STOP","SOFT_STOP_THRESHOLD",external,internal,threshold);
  return result("CONTINUE","BELOW_THRESHOLD",external,internal,threshold);
}
export function assessGate4SecondStartV39(
  prior:string
):Readonly<{allowed:boolean;reason:string;paidAuthorized:false}> {
  if(prior==="none"||prior==="closed_settled")
    return {allowed:true,reason:"PREDECESSOR_ONLY_PASS",paidAuthorized:false};
  if(prior==="active"||prior==="closed_unsettled")
    return {allowed:false,reason:"PREDECESSOR_ACTIVE_OR_UNSETTLED",paidAuthorized:false};
  return {allowed:false,reason:"PREDECESSOR_UNKNOWN",paidAuthorized:false};
}
