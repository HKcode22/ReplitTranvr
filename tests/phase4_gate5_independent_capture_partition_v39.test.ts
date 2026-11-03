import {describe,it,expect} from "vitest";
import {partitionP4G5IndependentCaptureV39,
 type P4G5CapturePartitionInputV39}
 from "../server/lib/disruption/phase4Gate5IndependentCapturePartition_v39";
const digest=(c:string)=>c.repeat(64);
const frame=():P4G5CapturePartitionInputV39=>{
 const horizon="T-90m" as const;
 const population=[
  {physicalLegDigest:digest("a"),horizon,
    primaryFidsObservedInReviewedServiceFrame:true,
    operatingLegRole:"CONFIRMED_OPERATING_LEG" as const,
    sourceAvailableAtUtc:"2026-11-04T00:00:00.000Z",
    predictionCutoffUtc:"2026-11-04T01:30:00.000Z",prePersisted:true},
  {physicalLegDigest:digest("b"),horizon,
    primaryFidsObservedInReviewedServiceFrame:true,
    operatingLegRole:"CONFIRMED_OPERATING_LEG" as const,
    sourceAvailableAtUtc:"2026-11-04T02:30:00.000Z",
    predictionCutoffUtc:"2026-11-04T01:30:00.000Z",prePersisted:false},
  {physicalLegDigest:digest("c"),horizon,
    primaryFidsObservedInReviewedServiceFrame:true,
    operatingLegRole:"MARKETING_CODESHARE" as const,
    sourceAvailableAtUtc:"2026-11-04T00:00:00.000Z",
    predictionCutoffUtc:"2026-11-04T01:30:00.000Z",prePersisted:false},
  {physicalLegDigest:digest("d"),horizon,
    primaryFidsObservedInReviewedServiceFrame:true,
    operatingLegRole:"CONFIRMED_OPERATING_LEG" as const,
    sourceAvailableAtUtc:"2026-11-04T00:00:00.000Z",
    predictionCutoffUtc:"2026-11-04T01:30:00.000Z",prePersisted:false},
  {physicalLegDigest:digest("e"),horizon,
    primaryFidsObservedInReviewedServiceFrame:true,
    operatingLegRole:"UNKNOWN" as const,
    sourceAvailableAtUtc:"2026-11-04T00:00:00.000Z",
    predictionCutoffUtc:"2026-11-04T01:30:00.000Z",prePersisted:false}
 ];
 const mk=(ch:string,leg:string|null,status:"RESOLVED"|"UNRESOLVED"|"CONFLICT",attemptCount=1)=>({
  notificationDigest:digest(ch),receivedAtUtc:"2026-11-04T02:00:00.000Z",
  identityStatus:status,physicalLegDigest:leg===null?null:digest(leg),attemptCount
 });
 const deliveries=[
  mk("1","a","RESOLVED",3),mk("2","d","RESOLVED"),
  mk("3","b","RESOLVED"),mk("4","c","RESOLVED"),
  mk("5","f","RESOLVED"),mk("6",null,"UNRESOLVED"),
  mk("7",null,"CONFLICT")
 ];
 return {
  airportIcao:"WSSS",reviewedFrozenManifestSha256:digest("f"),
  captureWindowStartUtc:"2026-11-04T00:00:00.000Z",
  captureWindowEndUtc:"2026-11-04T04:00:00.000Z",
  auditAsOfUtc:"2026-11-04T05:00:00.000Z",
  population,deliveries
 };
};
describe("Gate5 independent webhook/flight capture partition, no source certification",()=>{
 it("counts as-of operating legs once and matches inside independently of optional PRE/webhooks",()=>{
  const report=partitionP4G5IndependentCaptureV39(frame());
  const h=report.horizonReports.find(x=>x.horizon==="T-90m")!;
  expect(h.observedPrimaryPhysicalLegCandidates).toBe(5);
  expect(h.qualifiedOperatingLegAsOfEligible).toBe(2);
  expect(h.actualPrePersistedCandidates).toBe(1);
  expect(h.missingPreCandidates).toBe(1);
  expect(h.knownPrimaryButNoAsOfSource).toBe(1);
  expect(h.ambiguousOrMarketingRoleCount).toBe(2);
  expect(h.distinctResolvedMatchedInside).toBe(2);
  expect(h.distinctResolvedKnownPrimaryButNotEligible).toBe(2);
  expect(h.distinctResolvedOutsideObservedPrimaryFrame).toBe(1);
  expect(h.unresolvedUniqueNotifications).toBe(1);
  expect(h.conflictingUniqueNotifications).toBe(1);
  expect(h.captureRate.value).toBe(1);
  expect(h.preRate.value).toBe(0.5);
  expect(report.distinctObservedNotificationIds).toBe(7);
  expect(report.physicalDeliveryAttempts).toBe(9);
  expect(report.duplicateDeliveryAttempts).toBe(2);
  expect(report.originalFlightSourceRightsVerified).toBe(false);
  expect(report.operatingLegDenominatorIndependentlyCertified).toBe(false);
  expect(report.gate5ScientificPass).toBe(false);
  expect(report.phase6Authorized).toBe(false);
 });
 it("zero as-of denominator returns NULL, not a fabricated zero-percentage capture",()=>{
  const x=frame();x.population=[];
  const report=partitionP4G5IndependentCaptureV39(x);
  for(const h of report.horizonReports){
   expect(h.qualifiedOperatingLegAsOfEligible).toBe(0);
   expect(h.captureRate.value).toBeNull();
   expect(h.captureRate.reason).toBe("ZERO_VERIFIED_ASOF_ELIGIBLE_CANDIDATES");
   expect(h.distinctResolvedOutsideObservedPrimaryFrame).toBe(5);
   expect(h.unresolvedUniqueNotifications).toBe(1);
  }
 });
 it("repeated FIDS refreshes/codeshare must not duplicate same leg/horizon",()=>{
  const x=frame();x.population=[...x.population,x.population[0]];
  expect(()=>partitionP4G5IndependentCaptureV39(x))
   .toThrow("P4_G5_CAPTURE_DUPLICATE_FLIGHT_HORIZON");
 });
 it("a replay notification with attempts is one item, not three captured flights",()=>{
  const x=frame();
  x.deliveries=x.deliveries.slice(0,1);
  const report=partitionP4G5IndependentCaptureV39(x);
  const h=report.horizonReports[2];
  expect(h.distinctResolvedMatchedInside).toBe(1);
  expect(report.distinctObservedNotificationIds).toBe(1);
  expect(report.physicalDeliveryAttempts).toBe(3);
  expect(report.duplicateDeliveryAttempts).toBe(2);
 });
 it("PRE cannot exist if source was post-cutoff, marketing, or not in frame",()=>{
  for(const f of [
   (x:P4G5CapturePartitionInputV39)=>{x.population[1].prePersisted=true;},
   (x:P4G5CapturePartitionInputV39)=>{x.population[2].prePersisted=true;},
   (x:P4G5CapturePartitionInputV39)=>{x.population[0].primaryFidsObservedInReviewedServiceFrame=false;}
  ]){
   const x=frame();f(x);
   expect(()=>partitionP4G5IndependentCaptureV39(x))
    .toThrow("P4_G5_CAPTURE_PRE_AFTER_CUTOFF_OR_ROLE_HOLD");
  }
 });
 it("unknown or conflicting notifications never become inside or outside flights",()=>{
  const x=frame();x.deliveries=x.deliveries.filter(z=>z.identityStatus!=="RESOLVED");
  const r=partitionP4G5IndependentCaptureV39(x).horizonReports[2];
  expect(r.distinctResolvedMatchedInside).toBe(0);
  expect(r.distinctResolvedOutsideObservedPrimaryFrame).toBe(0);
  expect(r.unresolvedUniqueNotifications).toBe(1);
  expect(r.conflictingUniqueNotifications).toBe(1);
  expect(r.captureRate.value).toBe(0);
 });
 it("out-of-time deliveries never count as captured, but are separately visible",()=>{
  const x=frame();x.deliveries[0].receivedAtUtc="2026-11-03T22:00:00.000Z";
  const r=partitionP4G5IndependentCaptureV39(x);
  expect(r.notificationsOutOfAuditedWindow).toBe(1);
  expect(r.horizonReports[2].distinctResolvedMatchedInside).toBe(1);
 });
 it("rejects conflicting duplicate notification, malformed scope and future receipts",()=>{
  const a=frame();a.deliveries=[...a.deliveries,a.deliveries[0]];
  expect(()=>partitionP4G5IndependentCaptureV39(a))
   .toThrow("P4_G5_CAPTURE_DUPLICATE_NOTIFICATION_DIGEST_ROW");
  const b=frame();b.reviewedFrozenManifestSha256="unreviewed";
  expect(()=>partitionP4G5IndependentCaptureV39(b))
   .toThrow("P4_G5_CAPTURE_INVALID_FRAME");
  const c=frame();c.deliveries[0].receivedAtUtc="2026-11-04T06:00:00.000Z";
  expect(()=>partitionP4G5IndependentCaptureV39(c))
   .toThrow("P4_G5_CAPTURE_FUTURE_DELIVERY_HOLD");
  const d=frame();d.deliveries[0].attemptCount=13;
  expect(()=>partitionP4G5IndependentCaptureV39(d))
   .toThrow("P4_G5_CAPTURE_INVALID_DELIVERY");
  const e=frame();e.deliveries[0].identityStatus="UNRESOLVED";
  expect(()=>partitionP4G5IndependentCaptureV39(e))
   .toThrow("P4_G5_CAPTURE_INVALID_DELIVERY");
 });
 it("all required per-horizon outputs exist even when no PRE is persisted",()=>{
  const x=frame();x.population[0].prePersisted=false;
  const r=partitionP4G5IndependentCaptureV39(x);
  expect(r.horizonReports.map(h=>h.horizon)).toEqual(["T-24h","T-6h","T-90m"]);
  expect(r.horizonReports[2].missingPreCandidates).toBe(2);
  expect(r.horizonReports[2].preRate.value).toBe(0);
  expect(r.absentWebhookIsNotNegativeOutcome).toBe(true);
  expect(r.noProviderCalls).toBe(true);
  expect(r.noDatabaseWrites).toBe(true);
 });
});
