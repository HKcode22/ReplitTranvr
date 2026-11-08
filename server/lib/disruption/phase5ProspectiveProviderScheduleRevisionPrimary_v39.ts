/**
 * Prospective Phase5 first-cycle provider-observable schedule revision endpoint.
 * A narrow future scientific claim; NOT actual delay, wheels-off, gate-out,
 * confirmed commercial coverage, legal Content-use approval or Phase6 GO.
 *
 * Uses pre-authenticated SOURCE original envelopes supplied by a different
 * reviewer; a 64-hex digest and boolean alone cannot authenticate that source.
 * No provider HTTP, database, clocks, retained payloads or random values.
 */
const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const MS_H=3600000;
const LAG={"T-24h":24*MS_H,"T-6h":6*MS_H,"T-90m":90*60000} as const;
export type P5ScheduleHorizon=keyof typeof LAG;
export const P5_SCHEDULE_REVISION_FIRST_CYCLE_SCHEMA=
 "v39.phase5.prospective-provider-schedule-revision-first-cycle.v1" as const;
export type P5ServiceEvidenceTier=
 "PROVIDER_NATIVE_OPERATING_LEG"|
 "CONDITIONAL_QUERY_FILTERED_SERVICE";
export type P5ScheduleRevisionState=
 "OBSERVED_REVISION_GE_15_MIN"|"OBSERVED_REVISION_LT_15_MIN"|
 "UNKNOWN_MISSING_FIRST_SCHEDULE"|"UNKNOWN_ASOF_SOURCE"|
 "UNKNOWN_POST_WATERMARK_SOURCE"|"UNKNOWN_SOURCE_INVALID_OR_EXPIRED"|
 "UNKNOWN_OPERATING_IDENTITY_CONFLICT"|"UNKNOWN_SCHEDULE_VALUE";
const deny=(code:string):never=>{throw Error("REFUSED_P5_SCHEDULE_REVISION_"+code);};
function time(v:unknown):number{
 if(typeof v!=="string"||!UTC.test(v))deny("INVALID_TIME");
 const ms=Date.parse(v as string);
 if(!Number.isFinite(ms)||new Date(ms).toISOString()!==v)deny("INVALID_TIME");
 return ms;
}
function allowedId(s:unknown):s is string{
 return typeof s==="string"&&/^[A-Z0-9]{3,12}$/.test(s);
}
export interface P5SourceScheduleObservation{
 originalSha256:string;
 /** Upstream attested immutable V0077 original query; SHA alone is not proof. */
 sourceQueryId:string;
 /** actual persisted-available timestamp, never provider event/estimated clock */
 availableAtUtc:string;
 /** recorded technical expiry only, not a claim of account legal permission */
 technicalExpiryAtUtc:string;
 scheduledDepartureUtc:string|null;
 reviewedStableServiceKeySha256:string;
 reviewerScope:"PROVIDER_NATIVE_OPERATING_LEG"|
  "QUERY_FILTERED_SCOPE_UNVERIFIED"|"MARKETING"|"UNKNOWN";
 /** One matching source-service key in this original or fewer = source HOLD */
 matchingServiceCount:number;
 nativeOperatingFlightId:string|null;
 operatorFlightNumber:string;
 originIcao:string;
 destinationIcao:string;
 /** True only for the same requested-airport direction and query as reviewed */
 inRequestedDepartureQuery:boolean;
}
export interface P5FirstCycleScheduleInput {
 reviewedManifestSha256:string;
 firstObservedNativeScheduledDepartureUtc:string|null;
 horizon:P5ScheduleHorizon;
 assessmentWatermarkUtc:string;
 /** Reviewed before outcome; independent immutable carrier + route + service date. */
 reviewedStableServiceKeySha256:string;
 evidenceTier:P5ServiceEvidenceTier;
 nativeOperatingFlightId:string|null;
 operatorFlightNumber:string;
 originIcao:string;destinationIcao:string;
 observations:readonly P5SourceScheduleObservation[];
}
function response(status:P5ScheduleRevisionState, input:P5FirstCycleScheduleInput,
 extra:Record<string,unknown>={}){
 return {
  schema:P5_SCHEDULE_REVISION_FIRST_CYCLE_SCHEMA,
  status,sourcePopulation:"PROVIDER_OBSERVABLE_SCHEDULED_SERVICE",
  identityEvidenceTier:input.evidenceTier,
  actualWheelsOffTimeMeasured:false as const,
  physicalDepartureDelayLabel:false as const,
  confirmedCommercialFlightInConditionalTier:false as const,
  nativeProviderLegIdVerifiedByThisFunction:false as const,
  licensedContentsUseCertifiedByThisFunction:false as const,
  noPostObservationMeansNoChange:false as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  phase5FreezePassed:false as const,phase6PaidGo:false as const,
  ...extra
 };
}
/**
 * Comparability uses latest <= cutoff provider schedule vs latest later
 * provider schedule available by fixed W=T+2h. We do not infer a 0 from
 * no source POST, unknown status, ambiguously matched source or silence.
 * A COND_SERVICE row is a prediction of a provider *service record*, not
 * a confirmed physical leg. Its cohort and denominators remain separate.
 */
export function measureP5FirstCycleScheduleRevision(input:P5FirstCycleScheduleInput){
 if(!input||!SHA.test(input.reviewedManifestSha256)||
    !SHA.test(input.reviewedStableServiceKeySha256)||
    !Object.hasOwn(LAG,input.horizon)||
    !allowedId(input.operatorFlightNumber)||
    !/^[A-Z]{4}$/.test(input.originIcao??"")||
    !/^[A-Z]{4}$/.test(input.destinationIcao??"")||
    input.originIcao===input.destinationIcao||
    !["PROVIDER_NATIVE_OPERATING_LEG",
      "CONDITIONAL_QUERY_FILTERED_SERVICE"].includes(input.evidenceTier)||
    !Array.isArray(input.observations)||input.observations.length>128)
  deny("INVALID_REVIEWED_SCOPE");
 const W=time(input.assessmentWatermarkUtc);
 if(input.firstObservedNativeScheduledDepartureUtc===null)
  return response("UNKNOWN_MISSING_FIRST_SCHEDULE",input);
 const T=time(input.firstObservedNativeScheduledDepartureUtc);
 const C=T-LAG[input.horizon];
 if(W!==T+2*MS_H)deny("ASSESSMENT_WATERMARK_NOT_PREDECLARED_T_PLUS_2H");
 if(input.evidenceTier==="PROVIDER_NATIVE_OPERATING_LEG"&&
    (!input.nativeOperatingFlightId||
    !/^[A-Za-z0-9:_-]{3,160}$/.test(input.nativeOperatingFlightId)))
  return response("UNKNOWN_OPERATING_IDENTITY_CONFLICT",input);
 if(input.evidenceTier==="CONDITIONAL_QUERY_FILTERED_SERVICE"&&
    input.nativeOperatingFlightId!==null)
  deny("CONDITIONAL_CANNOT_SELF_CERTIFY_NATIVE_OPERATING_LEG");
 if(input.observations.length===0)
  return response("UNKNOWN_ASOF_SOURCE",input);
 const rows:{at:number,sched:number,queryId:string}[]=[];
 const seen=new Set<string>();
 let invalidSources=0,missingSchedule=0;
 for(const o of input.observations){
  if(!o||!SHA.test(o.originalSha256)||
    typeof o.sourceQueryId!=="string"||
    !/^[0-9a-f-]{36}$/.test(o.sourceQueryId)||
    !SHA.test(o.reviewedStableServiceKeySha256))
   deny("MALFORMED_SOURCE_ORIGINAL_ENVELOPE");
  if(seen.has(o.sourceQueryId))deny("DUPLICATE_SOURCE_QUERY");
  seen.add(o.sourceQueryId);
  const a=time(o.availableAtUtc),expiry=time(o.technicalExpiryAtUtc);
  if(expiry<=a||expiry>a+24*MS_H){invalidSources++;continue;}
  if(o.reviewedStableServiceKeySha256!==input.reviewedStableServiceKeySha256||
     o.matchingServiceCount!==1||
     o.inRequestedDepartureQuery!==true||
     o.operatorFlightNumber!==input.operatorFlightNumber||
     o.originIcao!==input.originIcao||
     o.destinationIcao!==input.destinationIcao||
     (input.evidenceTier==="PROVIDER_NATIVE_OPERATING_LEG"&&
       (o.reviewerScope!=="PROVIDER_NATIVE_OPERATING_LEG"||
        o.nativeOperatingFlightId!==input.nativeOperatingFlightId))||
     (input.evidenceTier==="CONDITIONAL_QUERY_FILTERED_SERVICE"&&
       (o.reviewerScope!=="QUERY_FILTERED_SCOPE_UNVERIFIED"||
        o.nativeOperatingFlightId!==null)))
   return response("UNKNOWN_OPERATING_IDENTITY_CONFLICT",input);
  if(a>W)continue;
  if(o.scheduledDepartureUtc===null){missingSchedule++;continue;}
  const scheduled=time(o.scheduledDepartureUtc);
  rows.push({at:a,sched:scheduled,queryId:o.sourceQueryId});
 }
 if(!rows.length)
  return response(invalidSources?
    "UNKNOWN_SOURCE_INVALID_OR_EXPIRED":"UNKNOWN_SCHEDULE_VALUE",input,
    {invalidSourceCount:invalidSources,missingScheduleCount:missingSchedule});
 rows.sort((a,b)=>a.at-b.at||a.queryId.localeCompare(b.queryId));
 // Conflicting versions at the identical source availability timestamp
 // cannot be sorted into a favorable negative label.
 for(let i=1;i<rows.length;i++)
  if(rows[i].at===rows[i-1].at&&rows[i].sched!==rows[i-1].sched)
   return response("UNKNOWN_SCHEDULE_VALUE",input);
 if(rows[0].sched!==T||rows[0].at>C)
  return response("UNKNOWN_ASOF_SOURCE",input);
 const before=rows.filter(x=>x.at<=C);
 if(!before.length)return response("UNKNOWN_ASOF_SOURCE",input);
 const after=rows.filter(x=>x.at>C&&x.at<=W);
 if(!after.length)
  return response("UNKNOWN_POST_WATERMARK_SOURCE",input,
   {asofSourceCount:before.length,postCutoffSourceCount:0});
 const baseline=before.at(-1)!,last=after.at(-1)!;
 const revisionMinutes=(last.sched-baseline.sched)/60000;
 if(!Number.isFinite(revisionMinutes))deny("INVALID_REVISION_ARITHMETIC");
 return response(Math.abs(revisionMinutes)>=15?
  "OBSERVED_REVISION_GE_15_MIN":"OBSERVED_REVISION_LT_15_MIN",
  input,{
   scheduledRevisionMinutes:revisionMinutes,
   revisionMagnitudeMinutes:Math.abs(revisionMinutes),
   primaryBinaryOutcome:Math.abs(revisionMinutes)>=15?1:0,
   predictionCutoffUtc:new Date(C).toISOString(),
   fixedAssessmentWatermarkUtc:new Date(W).toISOString(),
   asofSourceCount:before.length,postCutoffSourceCount:after.length,
   sourceObservationCount:rows.length,
   outcomeIsProviderReportedScheduleRevisionNotPhysicalDelay:true
  });
}
export interface P5FirstCycleMetricPlan{
 schema:"v39.phase5.first-cycle-model-outcome-metric-plan.v1";
 endpoint:"PROVIDER_SCHEDULE_REVISION_ABS_GE_15_MIN";
 horizon:"T-6h";
 assessment:"FIRST_T_PLUS_2H";
 metric:"BRIER_SCORE";
 comparator:"TRAIN_ONLY_HISTORICAL_PREVALENCE";
 split:"CHRONOLOGICAL_BATCH_DAY_1_20_TRAIN_21_25_VALID_26_31_TEST";
 secondaryMetrics:readonly string[];
}
export function auditP5FirstCycleMetricPlan(p:P5FirstCycleMetricPlan){
 if(!p||p.schema!=="v39.phase5.first-cycle-model-outcome-metric-plan.v1"||
    p.endpoint!=="PROVIDER_SCHEDULE_REVISION_ABS_GE_15_MIN"||
    p.horizon!=="T-6h"||p.assessment!=="FIRST_T_PLUS_2H"||
    p.metric!=="BRIER_SCORE"||
    p.comparator!=="TRAIN_ONLY_HISTORICAL_PREVALENCE"||
    p.split!=="CHRONOLOGICAL_BATCH_DAY_1_20_TRAIN_21_25_VALID_26_31_TEST"||
    !Array.isArray(p.secondaryMetrics)||
    p.secondaryMetrics.some(s=>!["LOG_LOSS","ECE_15_BINS","AUROC_WHEN_BOTH_CLASSES_PRESENT",
      "PROVIDER_STATUS_REPORTED","REVISION_SIGNED_MINUTES_EXPLORATORY"].includes(s))||
    p.secondaryMetrics.includes("ACTUAL_WHEELS_OFF_MAE"))
  deny("METRIC_TARGET_INCOMPATIBLE_OR_UNFROZEN");
 return {
  status:"PROSPECTIVE_METRIC_CONTRACT_STRUCTURALLY_VALID_NOT_FREEZE",
  headlineMetric:"BRIER_SCORE",primaryHorizon:"T-6h",
  primaryIsPhysicalDepartureDelay:false,
  original2MinuteMaeImprovementThresholdApplicable:false,
  trainingBaselineUsesHeldoutTestLabels:false,
  futureTestRowsObserved:false,phase5FreezePassed:false,phase6PaidGo:false
 };
}
