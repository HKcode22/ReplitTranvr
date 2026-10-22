/**
 * Gate4 read-only published Alert route review.
 * A historical paid-prepaid receiver may be healthy but BLOCK ordinary Alert
 * ingress. This checker NEVER treats prepaid route success, generic full-app
 * routing, or a self-reported field as live Gate4 delivery/ACK certification.
 * No networking, provider mutation, database read or write in this module.
 */
export type Gate4AlertRouteReadinessV39=Readonly<{
  schema:"v39.gate4.alert-route-readiness.v1";
  status:"HOLD"|"ROUTE_DECLARED_NOT_LIVE_PROVEN";
  reason:string;
  publishedGitHeadMatched:boolean;
  prepaidOnlyReceiver:boolean;
  alertRouteDeclared:boolean;
  callbackDeliveryAndAckProven:false;
  providerSubscriptionCreated:false;
  independentStopArmed:false;
  liveGate4Certified:false;
  paidAuthorization:false;
  providerRequests:0;
  databaseWrites:0;
}>;
const SHA=/^[a-f0-9]{40}$/;
const PREPAID_OWNER=
  "server/phase2gCallbackOnly.ts+server/routes_v3.ts";
const FULL_APP_OWNER=
  "server/index.ts+server/routes_v3.ts";
const report=(
  status:Gate4AlertRouteReadinessV39["status"],
  reason:string,
  matched:boolean,
  prepaid:boolean,
  declared:boolean
):Gate4AlertRouteReadinessV39=>({
  schema:"v39.gate4.alert-route-readiness.v1",
  status,reason,
  publishedGitHeadMatched:matched,
  prepaidOnlyReceiver:prepaid,
  alertRouteDeclared:declared,
  callbackDeliveryAndAckProven:false,
  providerSubscriptionCreated:false,
  independentStopArmed:false,
  liveGate4Certified:false,
  paidAuthorization:false,
  providerRequests:0,databaseWrites:0
});
export function assessGate4AlertRouteReadinessV39(
  health:unknown,
  expectedGitHead:string
):Gate4AlertRouteReadinessV39{
  if(!SHA.test(expectedGitHead))
    return report("HOLD","EXPECTED_GIT_HEAD_INVALID",false,false,false);
  if(!health||typeof health!=="object"||Array.isArray(health))
    return report("HOLD","PUBLISHED_HEALTH_MALFORMED",false,false,false);
  const x=health as Record<string,unknown>;
  const matched=x.git_head===expectedGitHead;
  if(x.schema!=="v39.phase2f-workspace-runtime.v1"||
    x.status!=="PASS"||
    x.runtime_owner_mode!=="replit-published-deployment"||
    x.published_deployment!==true||
    !matched)
    return report("HOLD","PUBLISHED_SOURCE_OR_RUNTIME_NOT_MATCHED",matched,
      x.route_owner===PREPAID_OWNER,false);
  if(x.route_owner===PREPAID_OWNER)
    return report("HOLD","PUBLISHED_PREPAID_ONLY_ALERT_ROUTE_BLOCKED",
      true,true,false);
  if(x.route_owner!==FULL_APP_OWNER)
    return report("HOLD","UNREVIEWED_PUBLISHED_ROUTE_OWNER",true,false,false);
  // Unknown/missing fields from older deployments are NOT interpreted as true.
  if(x.gate4_alert_ingress_registered!==true)
    return report("HOLD","GATE4_ALERT_ROUTE_NOT_DECLARED",true,false,false);
  if(x.gate4_alert_callback_proven!==false)
    return report("HOLD","UNREVIEWED_DELIVERY_PROOF_FLAG",true,false,false);
  return report(
    "ROUTE_DECLARED_NOT_LIVE_PROVEN",
    "CALLBACK_AND_PROVIDER_DELIVERY_ACK_STILL_UNVERIFIED",
    true,false,true
  );
}
