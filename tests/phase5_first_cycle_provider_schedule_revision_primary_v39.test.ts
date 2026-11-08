import {describe,it,expect} from "vitest";
import {
 measureP5FirstCycleScheduleRevision,auditP5FirstCycleMetricPlan,
 type P5FirstCycleScheduleInput,type P5SourceScheduleObservation
} from "../server/lib/disruption/phase5ProspectiveProviderScheduleRevisionPrimary_v39";
const SHA="b".repeat(64),KEY="c".repeat(64);
const T="2026-11-10T12:00:00.000Z";
const W="2026-11-10T14:00:00.000Z";
const iso=(n:number)=>new Date(n).toISOString();
const uid=(n:number)=>"00000000-0000-4000-8000-"+n.toString().padStart(12,"0");
const obs=(i:number,available:string,scheduled:string|null):P5SourceScheduleObservation=>({
 sourceQueryId:uid(i),originalSha256:SHA,
 reviewedStableServiceKeySha256:KEY,availableAtUtc:available,
 technicalExpiryAtUtc:iso(Date.parse(available)+24*3600000),
 scheduledDepartureUtc:scheduled,
 reviewerScope:"QUERY_FILTERED_SCOPE_UNVERIFIED",
 matchingServiceCount:1,nativeOperatingFlightId:null,
 operatorFlightNumber:"SQ123",originIcao:"WSSS",destinationIcao:"YSSY",
 inRequestedDepartureQuery:true
});
const input=():P5FirstCycleScheduleInput=>({
 reviewedManifestSha256:SHA,firstObservedNativeScheduledDepartureUtc:T,
 horizon:"T-6h",assessmentWatermarkUtc:W,
 reviewedStableServiceKeySha256:KEY,
 evidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",
 nativeOperatingFlightId:null,
 operatorFlightNumber:"SQ123",originIcao:"WSSS",destinationIcao:"YSSY",
 observations:[
  obs(1,"2026-11-10T00:00:00.000Z",T),
  obs(2,"2026-11-10T05:00:00.000Z","2026-11-10T12:03:00.000Z"),
  obs(3,"2026-11-10T13:00:00.000Z","2026-11-10T12:18:00.000Z")
 ]
});
describe("Phase5 first-cycle provider OBSERVABLE schedule revision, not actual departure",()=>{
 it("correctly compares latest as-of T6 version to later fixed W original with 15min boundary",()=>{
  const r=measureP5FirstCycleScheduleRevision(input());
  expect(r.status).toBe("OBSERVED_REVISION_GE_15_MIN");
  expect(r.scheduledRevisionMinutes).toBe(15);
  expect(r.primaryBinaryOutcome).toBe(1);
  expect(r.asofSourceCount).toBe(2);
  expect(r.postCutoffSourceCount).toBe(1);
  expect(r.predictionCutoffUtc).toBe("2026-11-10T06:00:00.000Z");
  expect(r.actualWheelsOffTimeMeasured).toBe(false);
  expect(r.confirmedCommercialFlightInConditionalTier).toBe(false);
  expect(r.licensedContentsUseCertifiedByThisFunction).toBe(false);
  expect(r.phase6PaidGo).toBe(false);
 });
 it("a valid later unchanged provider schedule is a real measured 0 for THIS proxy, not physical on-time",()=>{
  const d=input();d.observations[2].scheduledDepartureUtc="2026-11-10T12:03:00.000Z";
  const r=measureP5FirstCycleScheduleRevision(d);
  expect(r.status).toBe("OBSERVED_REVISION_LT_15_MIN");
  expect(r.primaryBinaryOutcome).toBe(0);
  expect(r.actualWheelsOffTimeMeasured).toBe(false);
 });
 it("no POST or no valid earlier original is UNKNOWN, never a negative",()=>{
  const d=input();d.observations=d.observations.slice(0,2);
  const r=measureP5FirstCycleScheduleRevision(d);
  expect(r.status).toBe("UNKNOWN_POST_WATERMARK_SOURCE");
  expect(r.primaryBinaryOutcome).toBeUndefined();
  expect(r.noPostObservationMeansNoChange).toBe(false);
  const e=input();e.observations=e.observations.slice(2);
  expect(measureP5FirstCycleScheduleRevision(e).status).toBe("UNKNOWN_ASOF_SOURCE");
 });
 it("query-filtered service identity cannot silently become a native physical leg",()=>{
  const d=input();d.observations[1].reviewerScope="MARKETING";
  expect(measureP5FirstCycleScheduleRevision(d).status)
   .toBe("UNKNOWN_OPERATING_IDENTITY_CONFLICT");
  const e=input();e.observations[1].matchingServiceCount=2;
  expect(measureP5FirstCycleScheduleRevision(e).status)
   .toBe("UNKNOWN_OPERATING_IDENTITY_CONFLICT");
  const f=input();f.nativeOperatingFlightId="provider-123";
  expect(()=>measureP5FirstCycleScheduleRevision(f))
   .toThrow("REFUSED_P5_SCHEDULE_REVISION_CONDITIONAL_CANNOT_SELF_CERTIFY_NATIVE_OPERATING_LEG");
 });
 it("confirmed operating ID requires evidence from all original source observations",()=>{
  const d=input();d.evidenceTier="PROVIDER_NATIVE_OPERATING_LEG";
  d.nativeOperatingFlightId="provider-123";
  for(const o of d.observations){
   o.reviewerScope="PROVIDER_NATIVE_OPERATING_LEG";
   o.nativeOperatingFlightId="provider-123";
  }
  expect(measureP5FirstCycleScheduleRevision(d).status).toBe("OBSERVED_REVISION_GE_15_MIN");
  d.observations[2].nativeOperatingFlightId="provider-999";
  expect(measureP5FirstCycleScheduleRevision(d).status)
   .toBe("UNKNOWN_OPERATING_IDENTITY_CONFLICT");
 });
 it("source expiry metadata must be bounded and cannot certify legal retention",()=>{
  const d=input();
  d.observations[0].technicalExpiryAtUtc="2026-11-13T00:00:00.000Z";
  const r=measureP5FirstCycleScheduleRevision(d);
  expect(r.licensedContentsUseCertifiedByThisFunction).toBe(false);
  expect(r.status).toBe("UNKNOWN_ASOF_SOURCE");
  const e=input();for(const o of e.observations) o.technicalExpiryAtUtc=o.availableAtUtc;
  expect(measureP5FirstCycleScheduleRevision(e).status)
   .toBe("UNKNOWN_SOURCE_INVALID_OR_EXPIRED");
 });
 it("never retimes fixed assessment watermark W to favor an outcome",()=>{
  const d=input();d.assessmentWatermarkUtc="2026-11-10T12:30:00.000Z";
  expect(()=>measureP5FirstCycleScheduleRevision(d))
   .toThrow("REFUSED_P5_SCHEDULE_REVISION_ASSESSMENT_WATERMARK_NOT_PREDECLARED_T_PLUS_2H");
 });
 it("simultaneous incompatible original versions are UNKNOWN, not cherry-picked",()=>{
  const d=input();
  d.observations.push(obs(4,"2026-11-10T13:00:00.000Z","2026-11-10T13:10:00.000Z"));
  expect(measureP5FirstCycleScheduleRevision(d).status).toBe("UNKNOWN_SCHEDULE_VALUE");
 });
 it("first native reference T cannot be inferred after T6 cutoff",()=>{
  const d=input();d.firstObservedNativeScheduledDepartureUtc=null;
  expect(measureP5FirstCycleScheduleRevision(d).status)
   .toBe("UNKNOWN_MISSING_FIRST_SCHEDULE");
  expect(()=>measureP5FirstCycleScheduleRevision({...input(),horizon:"T-24h",
    assessmentWatermarkUtc:"2026-11-10T14:00:00.000Z"})).not.toThrow();
 });
 it("freezes a Brier binary contract, not original 2-minute MAE delay win",()=>{
  const metric={
   schema:"v39.phase5.first-cycle-model-outcome-metric-plan.v1" as const,
   endpoint:"PROVIDER_SCHEDULE_REVISION_ABS_GE_15_MIN" as const,
   horizon:"T-6h" as const,
   assessment:"FIRST_T_PLUS_2H" as const,
   metric:"BRIER_SCORE" as const,
   comparator:"TRAIN_ONLY_HISTORICAL_PREVALENCE" as const,
   split:"CHRONOLOGICAL_BATCH_DAY_1_20_TRAIN_21_25_VALID_26_31_TEST" as const,
   secondaryMetrics:["LOG_LOSS","ECE_15_BINS","AUROC_WHEN_BOTH_CLASSES_PRESENT"]
  };
  const r=auditP5FirstCycleMetricPlan(metric);
  expect(r.status).toBe("PROSPECTIVE_METRIC_CONTRACT_STRUCTURALLY_VALID_NOT_FREEZE");
  expect(r.original2MinuteMaeImprovementThresholdApplicable).toBe(false);
  expect(r.phase5FreezePassed).toBe(false);
  expect(()=>auditP5FirstCycleMetricPlan({
    ...metric,metric:"MAE" as never
  })).toThrow("REFUSED_P5_SCHEDULE_REVISION_METRIC_TARGET_INCOMPATIBLE_OR_UNFROZEN");
 });
});
