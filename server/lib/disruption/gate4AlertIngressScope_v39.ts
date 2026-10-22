/**
 * DRAFT Gate4 dedicated Alert receiver admission policy.
 * No transport, provider requests, database operations or paid authority.
 *
 * The positive expected subscription ID MUST be independently received from
 * a reviewed CREATE custody source; NEVER infer ID from airport/time/payload.
 * This check is necessary, NOT independent proof of token/key authenticity,
 * provider delivery, callback ACK or a hard credit cap.
 */
export type Gate4AlertIngressScopeV39=Readonly<{
  scopeId:string;
  authorizationSha256:string;
  sourceCommit:string;
  subscriptionId:string;
  airportIcao:string;
}>;
export type Gate4AlertIngressVerdictV39=Readonly<{
  allowed:boolean;
  reason:string;
  callbackDeliveryAndAckProven:false;
  paidAuthorization:false;
  providerRequests:0;
  databaseWrites:0;
}>;
const deny=(reason:string):Gate4AlertIngressVerdictV39=>({
  allowed:false,reason,callbackDeliveryAndAckProven:false,
  paidAuthorization:false,providerRequests:0,databaseWrites:0
});
export function assessGate4AlertIngressScopeV39(
  scope:Gate4AlertIngressScopeV39,
  raw:unknown
):Gate4AlertIngressVerdictV39 {
  if(!scope||
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(scope.scopeId)||
    !/^[a-f0-9]{64}$/.test(scope.authorizationSha256)||
    !/^[a-f0-9]{40}$/.test(scope.sourceCommit)||
    !/^[A-Za-z0-9_-]{6,128}$/.test(scope.subscriptionId)||
    !/^[A-Z]{4}$/.test(scope.airportIcao))
    return deny("UNREVIEWED_OR_MISSING_OWNED_SCOPE");
  if(raw===null||typeof raw!=="object"||Array.isArray(raw))
    return deny("INVALID_NOTIFICATION_ENVELOPE");
  const envelope=raw as Record<string,unknown>;
  const sub=envelope.subscription;
  if(!sub||typeof sub!=="object"||Array.isArray(sub))
    return deny("EXACT_SUBSCRIPTION_EVIDENCE_MISSING");
  const subscription=sub as Record<string,unknown>;
  // A missing subject type may reflect a provider payload variant; do not
  // invent ownership from that ambiguity. Provider wire contract must be
  // independently reconciled before any real canary.
  const subject=subscription.subject;
  if(!subject||typeof subject!=="object"||Array.isArray(subject))
    return deny("EXACT_SUBSCRIPTION_SUBJECT_MISSING");
  const route=subject as Record<string,unknown>;
  if(subscription.id!==scope.subscriptionId||
     route.type!=="FlightByAirportIcao"||
     route.id!==scope.airportIcao)
    return deny("FOREIGN_OR_MISMATCHED_SUBSCRIPTION");
  if(!Array.isArray(envelope.flights)||envelope.flights.length>250)
    return deny("FLIGHT_ITEM_ENVELOPE_INVALID");
  return {
    allowed:true,reason:"EXACT_OWNED_SCOPE_SHAPE_ONLY",
    callbackDeliveryAndAckProven:false,paidAuthorization:false,
    providerRequests:0,databaseWrites:0
  };
}
