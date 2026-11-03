/**
 * Phase4 Gate5: independent per-horizon webhook capture accounting over the
 * provider-observable FIDS source frame (f.8 §5, Log §1.9).
 *
 * NO IO. A source/physical-identity-admitted upstream adapter must supply
 * truthful source and delivery facts. This does not authenticate source wire,
 * DB rows or licensing, nor automatically approve Gate5/Phase5/6.
 *
 * Critically:
 * - A missed webhook never removes an eligible population/PRE row.
 * - A matched delivery for a known flight not observed by its original
 *   prediction cutoff is NOT an independent "outside provider universe" flight.
 * - Unresolved delivery IDs cannot be forced into inside/outside counts;
 *   repeated delivery attempts are de-duplicated by exact notification ID.
 * - All counts per horizon are distinct physical operating-flight DIGESTS,
 *   not FIDS refresh rows, notification items, attempts or marketing aliases.
 */
export const P4G5_CAPTURE_PARTITION_SCHEMA_V39=
 "v39.phase4.gate5-independent-capture-partition.v1" as const;
export const P4G5_CAPTURE_HORIZONS_V39=
 ["T-24h","T-6h","T-90m"] as const;
export type P4G5CaptureHorizonV39=
 typeof P4G5_CAPTURE_HORIZONS_V39[number];
export type P4G5OperatingRoleV39=
 "CONFIRMED_OPERATING_LEG"|"MARKETING_CODESHARE"|"UNKNOWN";
const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
function ms(value:string,code:string):number{
 if(typeof value!=="string"||!UTC.test(value)||
    !Number.isFinite(Date.parse(value))||
    new Date(Date.parse(value)).toISOString()!==value)
   throw Error("P4_G5_CAPTURE_INVALID_UTC_"+code);
 return Date.parse(value);
}
const rate=(n:number,d:number)=>({
 numerator:n,denominator:d,value:d>0?n/d:null,
 reason:d===0?"ZERO_VERIFIED_ASOF_ELIGIBLE_CANDIDATES":null
});
export interface P4G5CapturePhysicalPopulationFactV39{
 /** Stable confidential local digest, never emitted by this audit. */
 physicalLegDigest:string;
 horizon:P4G5CaptureHorizonV39;
 primaryFidsObservedInReviewedServiceFrame:boolean;
 operatingLegRole:P4G5OperatingRoleV39;
 /** Source availability of that flight at the actual horizon cutoff. */
 sourceAvailableAtUtc:string|null;
 /** Independently configured nominal prediction cutoff for this flight/horizon. */
 predictionCutoffUtc:string|null;
 /** Actual DB PRE present (this truth must be verified by upstream adapter). */
 prePersisted:boolean;
}
export interface P4G5CaptureWebhookFactV39{
 /** Stable provider notification identifier digest for retry de-duplication. */
 notificationDigest:string;
 receivedAtUtc:string;
 identityStatus:"RESOLVED"|"UNRESOLVED"|"CONFLICT";
 physicalLegDigest:string|null;
 /** Each actual delivery attempt of the notification in the measurement window. */
 attemptCount:number;
}
export interface P4G5CapturePartitionInputV39{
 airportIcao:string;
 reviewedFrozenManifestSha256:string;
 captureWindowStartUtc:string;
 captureWindowEndUtc:string;
 auditAsOfUtc:string;
 population:readonly P4G5CapturePhysicalPopulationFactV39[];
 deliveries:readonly P4G5CaptureWebhookFactV39[];
}
export interface P4G5CapturePerHorizonV39{
 horizon:P4G5CaptureHorizonV39;
 observedPrimaryPhysicalLegCandidates:number;
 qualifiedOperatingLegAsOfEligible:number;
 actualPrePersistedCandidates:number;
 missingPreCandidates:number;
 knownPrimaryButNoAsOfSource:number;
 ambiguousOrMarketingRoleCount:number;
 distinctResolvedMatchedInside:number;
 distinctResolvedKnownPrimaryButNotEligible:number;
 distinctResolvedOutsideObservedPrimaryFrame:number;
 unresolvedUniqueNotifications:number;
 conflictingUniqueNotifications:number;
 outsideSourceFrameIsNotProviderUniverse:true;
 captureRate:{
  numerator:number;denominator:number;value:number|null;reason:string|null
 };
 preRate:{
  numerator:number;denominator:number;value:number|null;reason:string|null
 };
}
export interface P4G5CapturePartitionReportV39{
 schema:typeof P4G5_CAPTURE_PARTITION_SCHEMA_V39;
 airportIcao:string;
 horizonReports:P4G5CapturePerHorizonV39[];
 distinctObservedNotificationIds:number;
 physicalDeliveryAttempts:number;
 duplicateDeliveryAttempts:number;
 notificationsOutOfAuditedWindow:number;
 unresolvedNotificationRowsNotSilentlyAssigned:number;
 originalFlightSourceRightsVerified:false;
 operatingLegDenominatorIndependentlyCertified:false;
 observedPreRowsIndependentlyCertified:false;
 unknownNotAssumedZero:true;
 absentWebhookIsNotNegativeOutcome:true;
 noProviderCalls:true;
 noDatabaseWrites:true;
 gate5ScientificPass:false;
 phase5FreezeAuthorized:false;
 phase6Authorized:false;
}
export function partitionP4G5IndependentCaptureV39(
 input:P4G5CapturePartitionInputV39
):P4G5CapturePartitionReportV39{
 if(!input||!/^[A-Z]{4}$/.test(input.airportIcao)||
    !SHA.test(input.reviewedFrozenManifestSha256)||
    !Array.isArray(input.population)||!Array.isArray(input.deliveries)||
    input.population.length>90000||input.deliveries.length>90000)
   throw Error("P4_G5_CAPTURE_INVALID_FRAME");
 const start=ms(input.captureWindowStartUtc,"WINDOW_START");
 const end=ms(input.captureWindowEndUtc,"WINDOW_END");
 const audit=ms(input.auditAsOfUtc,"AUDIT");
 if(end<=start||end-start>7*86400_000||audit<end||
   audit-end>7*86400_000)
   throw Error("P4_G5_CAPTURE_WINDOW_OR_AUDIT_HOLD");
 const byHorizon=new Map<P4G5CaptureHorizonV39,
   Map<string,P4G5CapturePhysicalPopulationFactV39>>();
 for(const h of P4G5_CAPTURE_HORIZONS_V39)byHorizon.set(h,new Map());
 for(const p of input.population){
  if(!p||!SHA.test(p.physicalLegDigest)||
     !P4G5_CAPTURE_HORIZONS_V39.includes(p.horizon)||
     !["CONFIRMED_OPERATING_LEG","MARKETING_CODESHARE","UNKNOWN"]
      .includes(p.operatingLegRole)||
     typeof p.primaryFidsObservedInReviewedServiceFrame!=="boolean"||
     typeof p.prePersisted!=="boolean")
    throw Error("P4_G5_CAPTURE_INVALID_SOURCE_POPULATION");
  const asof=p.sourceAvailableAtUtc===null?null:
    ms(p.sourceAvailableAtUtc,"SOURCE_AVAILABLE");
  const cutoff=p.predictionCutoffUtc===null?null:
    ms(p.predictionCutoffUtc,"PREDICTION_CUTOFF");
  if(asof!==null&&asof>audit||cutoff!==null&&cutoff>audit||
     p.prePersisted&&(!p.primaryFidsObservedInReviewedServiceFrame||
       p.operatingLegRole!=="CONFIRMED_OPERATING_LEG"||
       asof===null||cutoff===null||asof>cutoff))
    throw Error("P4_G5_CAPTURE_PRE_AFTER_CUTOFF_OR_ROLE_HOLD");
  if(p.primaryFidsObservedInReviewedServiceFrame&&asof===null)
    throw Error("P4_G5_CAPTURE_PRIMARY_MISSING_SOURCE_CLOCK");
  const seen=byHorizon.get(p.horizon)!;
  if(seen.has(p.physicalLegDigest))
    throw Error("P4_G5_CAPTURE_DUPLICATE_FLIGHT_HORIZON");
  seen.set(p.physicalLegDigest,p);
 }
 const attemptsByNotification=new Map<string,P4G5CaptureWebhookFactV39>();
 let outside=0,attempts=0,duplicated=0;
 for(const d of input.deliveries){
  if(!d||!SHA.test(d.notificationDigest)||
    !["RESOLVED","UNRESOLVED","CONFLICT"].includes(d.identityStatus)||
    !(d.physicalLegDigest===null||SHA.test(d.physicalLegDigest))||
    (d.identityStatus==="RESOLVED")!==(d.physicalLegDigest!==null)||
    !Number.isSafeInteger(d.attemptCount)||d.attemptCount<1||
    d.attemptCount>12)
    throw Error("P4_G5_CAPTURE_INVALID_DELIVERY");
  const received=ms(d.receivedAtUtc,"RECEIVED");
  if(received>audit)throw Error("P4_G5_CAPTURE_FUTURE_DELIVERY_HOLD");
  if(received<start||received>=end){outside++;continue;}
  if(attemptsByNotification.has(d.notificationDigest))
    throw Error("P4_G5_CAPTURE_DUPLICATE_NOTIFICATION_DIGEST_ROW");
  attemptsByNotification.set(d.notificationDigest,d);
  attempts+=d.attemptCount;duplicated+=d.attemptCount-1;
 }
 const resolved=[...attemptsByNotification.values()].filter(
  x=>x.identityStatus==="RESOLVED");
 const unresolved=[...attemptsByNotification.values()].filter(
  x=>x.identityStatus==="UNRESOLVED").length;
 const conflicting=[...attemptsByNotification.values()].filter(
  x=>x.identityStatus==="CONFLICT").length;
 const horizonReports:P4G5CapturePerHorizonV39[]=[];
 for(const horizon of P4G5_CAPTURE_HORIZONS_V39){
  const population=byHorizon.get(horizon)!;
  let eligible=0,pre=0,ambiguous=0,knownNoAsOf=0,primary=0;
  const eligibleIds=new Set<string>();
  const primaryIds=new Set<string>();
  for(const [digest,p] of population){
   if(!p.primaryFidsObservedInReviewedServiceFrame)continue;
   primary++;
   primaryIds.add(digest);
   if(p.operatingLegRole!=="CONFIRMED_OPERATING_LEG"){
    ambiguous++;continue;
   }
   const available=ms(p.sourceAvailableAtUtc!,"SOURCE_AVAILABLE");
   const cutoff=p.predictionCutoffUtc===null?null:
    ms(p.predictionCutoffUtc,"PREDICTION_CUTOFF");
   if(cutoff===null||available>cutoff){knownNoAsOf++;continue;}
   eligible++;eligibleIds.add(digest);
   if(p.prePersisted)pre++;
  }
  const inside=new Set<string>(),notAsOf=new Set<string>(),
        outOfFrame=new Set<string>();
  for(const d of resolved){
   const digest=d.physicalLegDigest!;
   if(eligibleIds.has(digest))inside.add(digest);
   else if(primaryIds.has(digest))notAsOf.add(digest);
   else outOfFrame.add(digest);
  }
  if(inside.size>eligible||pre>eligible)
   throw Error("P4_G5_CAPTURE_INVALID_INSIDE_OR_PRE_NUMERATOR");
  horizonReports.push({
   horizon,
   observedPrimaryPhysicalLegCandidates:primary,
   qualifiedOperatingLegAsOfEligible:eligible,
   actualPrePersistedCandidates:pre,
   missingPreCandidates:eligible-pre,
   knownPrimaryButNoAsOfSource:knownNoAsOf,
   ambiguousOrMarketingRoleCount:ambiguous,
   distinctResolvedMatchedInside:inside.size,
   distinctResolvedKnownPrimaryButNotEligible:notAsOf.size,
   distinctResolvedOutsideObservedPrimaryFrame:outOfFrame.size,
   unresolvedUniqueNotifications:unresolved,
   conflictingUniqueNotifications:conflicting,
   outsideSourceFrameIsNotProviderUniverse:true,
   captureRate:rate(inside.size,eligible),preRate:rate(pre,eligible)
  });
 }
 return {
  schema:P4G5_CAPTURE_PARTITION_SCHEMA_V39,
  airportIcao:input.airportIcao,
  horizonReports,
  distinctObservedNotificationIds:attemptsByNotification.size,
  physicalDeliveryAttempts:attempts,duplicateDeliveryAttempts:duplicated,
  notificationsOutOfAuditedWindow:outside,
  unresolvedNotificationRowsNotSilentlyAssigned:unresolved,
  originalFlightSourceRightsVerified:false,
  operatingLegDenominatorIndependentlyCertified:false,
  observedPreRowsIndependentlyCertified:false,
  unknownNotAssumedZero:true,absentWebhookIsNotNegativeOutcome:true,
  noProviderCalls:true,noDatabaseWrites:true,
  gate5ScientificPass:false,phase5FreezeAuthorized:false,
  phase6Authorized:false
 };
}
