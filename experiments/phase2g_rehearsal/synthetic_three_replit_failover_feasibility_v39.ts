/**
 * P09/P15/P18: three-Replit receiver architecture feasibility, synthetic-only.
 *
 * Does not create Replit apps, change provider subscriptions, publish,
 * provision DNS, write any production database, or authorize paid collection.
 * A health-monitored list of Replit URLs cannot redirect an Aerodatabox
 * flight-alert POST bound to ONE immutable subscription callback URL.
 */
export type ThreeReplitPlanV39=Readonly<{
  mode:"synthetic-only";
  layout:"direct-three-domain-list"|"multiple-paid-subscriptions"|
    "delete-recreate-during-run"|"one-frontdoor-to-three-verified-receivers";
  providerCallbackOrigin:string;
  providerSubscriptionCount:number;
  originalSubscriptionRemainsOneContinuousOwner:boolean;
  pinnedFrontdoorOrigin:string|null;
  frontdoorRoutingAvailableWithoutPrimaryApp:boolean;
  routingAndFailoverTestedBeforeCollection:boolean;
  senderAckMaxMilliseconds:10000;
  worstCaseFailoverAckMilliseconds:number|null;
  backups:readonly Readonly<{
    origin:string;
    purpose:"primary"|"backup";
    sourceRevisionExact:boolean;
    publishedDeployment:boolean;
    ownedOrPublishedWithExplicitPermission:boolean;
    independentEndpointReachabilityVerified:boolean;
    sameScientificDbBindingVerified:boolean;
    originalProviderBlobReadbackAcrossInstancesVerified:boolean;
    singleOwnerSubscriptionAndDedupVerified:boolean;
  }>[];
  historicalOriginalRawSourceWitnessIndependentOfReplit:boolean;
}>;
export type ThreeReplitAssessmentV39=Readonly<{
  topology:"NOT_A_WEBHOOK_FAILOVER"|"DUPLICATE_BILLING_RISK"|
    "DESTROYS_FROZEN_EXPERIMENT_CONTINUITY"|"UNVERIFIED_FRONTDOOR_CONTRACT"|
    "ELIGIBLE_FOR_ZERO_PROVIDER_CREDIT_REHEARSAL";
  reasons:readonly string[];
  providerWebhookAutoRedirectSupported:false;
  currentLiveSixPlusSixPermitted:false;
  paidOwnerLaunchAuthorized:false;
  thirdReplitAccountCreated:false;
  safeOriginalF8PassAuthorized:false;
}>;
const httpsOrigin=(s:unknown):s is string=>{
  if(typeof s!=="string")return false;
  try{
    const u=new URL(s);
    return u.protocol==="https:"&&u.username===""&&u.password===""&&
      u.hostname.length>0&&u.pathname==="/"&&u.search===""&&
      u.hash===""&&u.origin===s.replace(/\/$/,"");
  }catch{return false;}
};
export function assessThreeReplitFailoverV39(p:ThreeReplitPlanV39):ThreeReplitAssessmentV39{
  const reasons:string[]=[];
  if(p.mode!=="synthetic-only")throw Error("THREE_REPLIT_ONLY_SYNTHETIC");
  if(!httpsOrigin(p.providerCallbackOrigin)||
     (p.pinnedFrontdoorOrigin!==null&&!httpsOrigin(p.pinnedFrontdoorOrigin)))
    throw Error("THREE_REPLIT_CALLBACK_OR_FRONTDOOR_ORIGIN_INVALID");
  if(!Array.isArray(p.backups)||p.backups.length!==3||
     p.backups.filter(x=>x.purpose==="primary").length!==1||
     new Set(p.backups.map(x=>x.origin)).size!==3||
     p.backups.some(x=>!httpsOrigin(x.origin)))
    throw Error("THREE_REPLIT_THREE_DISTINCT_HTTPS_ORIGINS_REQUIRED");
  if(!Number.isSafeInteger(p.providerSubscriptionCount)||
      p.providerSubscriptionCount<0||
     !(p.worstCaseFailoverAckMilliseconds===null||
       (Number.isSafeInteger(p.worstCaseFailoverAckMilliseconds)&&
        p.worstCaseFailoverAckMilliseconds>=0))||
      p.senderAckMaxMilliseconds!==10000)
    throw Error("THREE_REPLIT_SENDER_CONTRACT_INVALID");

  let topology:ThreeReplitAssessmentV39["topology"];
  if(p.layout==="direct-three-domain-list"){
    topology="NOT_A_WEBHOOK_FAILOVER";
    reasons.push("PROVIDER_SUBSCRIPTION_IS_PINNED_TO_ONLY_ONE_DESTINATION");
    reasons.push("THREE_URLS_DO_NOT_FORWARD_AN_IN_FLIGHT_POST");
  }else if(p.layout==="multiple-paid-subscriptions"){
    topology="DUPLICATE_BILLING_RISK";
    reasons.push("THREE_PARALLEL_ALERT_SUBSCRIPTIONS_MULTIPLY_SENDER_CREDITS");
    reasons.push("ONE_OWNER_ONE_FROZEN_SUBSCRIPTION_CONTRACT_VIOLATED");
  }else if(p.layout==="delete-recreate-during-run"){
    topology="DESTROYS_FROZEN_EXPERIMENT_CONTINUITY";
    reasons.push("SWITCHING_SUBSCRIPTION_DURING_PAID_RUN_CREATES_UNOBSERVED_SEND_GAP");
    reasons.push("NEW_SUBSCRIPTION_ID_OWNER_AND_CREDIT_ATTRIBUTION_CHANGED");
  }else if(p.layout==="one-frontdoor-to-three-verified-receivers"){
    topology="UNVERIFIED_FRONTDOOR_CONTRACT";
    if(p.providerSubscriptionCount!==1||
       !p.originalSubscriptionRemainsOneContinuousOwner)
      reasons.push("FROZEN_SINGLE_SUBSCRIPTION_OWNER_UNPROVEN");
    if(p.pinnedFrontdoorOrigin!==p.providerCallbackOrigin||
       !p.frontdoorRoutingAvailableWithoutPrimaryApp)
      reasons.push("NO_INDEPENDENT_FIXED_HTTP_FRONTDOOR");
    if(!p.routingAndFailoverTestedBeforeCollection)
      reasons.push("REAL_HTTP_ROUTE_FAILOVER_NOT_DEMONSTRATED");
    if(p.worstCaseFailoverAckMilliseconds===null||
      p.worstCaseFailoverAckMilliseconds>p.senderAckMaxMilliseconds)
      reasons.push("BACKUP_ACK_CANNOT_BE_PROVEN_INSIDE_10_SECONDS");
    if(p.backups.some(x=>!x.sourceRevisionExact||!x.publishedDeployment||
        !x.ownedOrPublishedWithExplicitPermission||
        !x.independentEndpointReachabilityVerified||
        !x.sameScientificDbBindingVerified||
        !x.originalProviderBlobReadbackAcrossInstancesVerified||
        !x.singleOwnerSubscriptionAndDedupVerified))
      reasons.push("BACKUP_RECEIVER_PARITY_STORAGE_OR_OWNER_UNVERIFIED");
    if(!p.historicalOriginalRawSourceWitnessIndependentOfReplit)
      reasons.push("REPLIT_CORRELATED_FAILURE_AND_SOURCE_INDEPENDENCE_UNPROVEN");
    if(reasons.length===0)
      topology="ELIGIBLE_FOR_ZERO_PROVIDER_CREDIT_REHEARSAL";
  }else throw Error("THREE_REPLIT_UNKNOWN_LAYOUT");

  return {
    topology,reasons,providerWebhookAutoRedirectSupported:false,
    currentLiveSixPlusSixPermitted:false,paidOwnerLaunchAuthorized:false,
    thirdReplitAccountCreated:false,safeOriginalF8PassAuthorized:false
  };
}
