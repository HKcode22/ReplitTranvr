/**
 * G5A prospective schedule-revision target (not actual flight delay).
 * Read-only, pure, grounded only in provider-original-bound observations.
 *
 * This deliberately links a physical operating flight using an externally
 * observed stable provider ID, independent of its mutable scheduled time:
 * V3.9's older schedule-derived canonical ID may change on a retime.
 *
 * For every prediction horizon, baseline is the latest qualified observed
 * schedule available by cutoff C; outcome is the latest qualified observed
 * schedule as of the *frozen* W>C. A missing W observation is UNKNOWN, never 0.
 * No network, DB writes, source retention claims or synthetic GO permit.
 */
export const P4_G5_G5A_SCHEDULE_TARGET_V39=
 "v39.phase4.gate5-g5a-prospective-schedule-revision-target.v1" as const;
export type G5AHorizonV39="T-24h"|"T-6h"|"T-90m";
export type G5ARevisionOutcomeV39=
 "OBSERVED_REVISION_GE_15_MIN"|"OBSERVED_REVISION_LT_15_MIN"|
 "UNKNOWN_NO_ASOF_BASELINE"|"UNKNOWN_NO_POSTCUTOFF_REOBSERVATION"|
 "UNKNOWN_IDENTITY_UNVERIFIED"|"UNKNOWN_NATIVE_T_UNAVAILABLE"|
 "UNKNOWN_SOURCE_INVALID_OR_EXPIRED";
const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d\.\d{3}Z$/;
const LAG:Record<G5AHorizonV39,number>={
 "T-24h":24*3600000,"T-6h":6*3600000,"T-90m":90*60000
};
const HOR=["T-24h","T-6h","T-90m"];
function t(value:unknown):number{
 if(typeof value!=="string"||!UTC.test(value))
  throw Error("P4_G5_G5A_INVALID_UTC_HOLD");
 const n=Date.parse(value);
 if(!Number.isFinite(n)||new Date(n).toISOString()!==value)
  throw Error("P4_G5_G5A_INVALID_UTC_HOLD");
 return n;
}
export interface G5AOriginalScheduleObservationV39{
 queryId:string;
 // Must be authenticated from original source + V0077 receipt upstream.
 sourceOriginalSha256:string;
 availableAtUtc:string;
 sourceUseExpiresAtUtc:string;
 nativeScheduledDepartureUtc:string|null;
 providerFlightId:string|null;
 operatingRole:"CONFIRMED_OPERATING"|"MARKETING"|"UNKNOWN";
 operatorFlightNumber:string;
 originIcao:string;
 destinationIcao:string;
}
export interface G5AScheduleTargetInputV39{
 reviewedManifestSha256:string;
 horizon:G5AHorizonV39;
 // Frozen to the first provider-native schedule *seen before cutoff*.
 firstObservedNativeTAtUtc:string|null;
 // G5A always uses a preregistered fixed W, never a retrospective selection.
 assessmentWatermarkUtc:string;
 // Authenticated physical operating ID, not constructed using mutable time.
 reviewedProviderFlightId:string|null;
 operatorFlightNumber:string;
 originIcao:string;
 destinationIcao:string;
 observations:readonly G5AOriginalScheduleObservationV39[];
}
function result(status:G5ARevisionOutcomeV39,
  extra:Record<string,unknown>={}){
 return{
  schema:P4_G5_G5A_SCHEDULE_TARGET_V39,
  status,
  nativeGateOrWheelsOffTimeClaimed:false as const,
  actualDepartureDelayClaimed:false as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  scientificGate5Passed:false as const,
  ...extra
 };
}
export function measureP4G5G5AScheduleRevisionV39(input:G5AScheduleTargetInputV39){
 if(!input||!SHA.test(input.reviewedManifestSha256)||
    !HOR.includes(input.horizon)||!Array.isArray(input.observations)||
    input.observations.length>100||input.observations.length===0||
    !/^[A-Z0-9]{3,12}$/.test(input.operatorFlightNumber)||
    !/^[A-Z]{4}$/.test(input.originIcao)||
    !/^[A-Z]{4}$/.test(input.destinationIcao)||
    input.originIcao===input.destinationIcao)
  throw Error("P4_G5_G5A_SCOPE_HOLD");
 const W=t(input.assessmentWatermarkUtc);
 if(input.firstObservedNativeTAtUtc===null)
  return result("UNKNOWN_NATIVE_T_UNAVAILABLE");
 const T=t(input.firstObservedNativeTAtUtc);
 const C=T-LAG[input.horizon];
 if(W<=C||W>T+24*3600000)
  throw Error("P4_G5_G5A_FROZEN_WATERMARK_HOLD");
 if(!input.reviewedProviderFlightId||
    !/^[A-Za-z0-9:_-]{3,160}$/.test(input.reviewedProviderFlightId))
  return result("UNKNOWN_IDENTITY_UNVERIFIED");
 let invalidContent=0,validObs=0;
 const inScope: Array<{at:number,sched:number,queryId:string}>=[];
 const seen=new Set<string>();
 for(const o of input.observations){
  if(!o||typeof o.queryId!=="string"||
     !/^[0-9a-f-]{36}$/.test(o.queryId)||
     !SHA.test(o.sourceOriginalSha256))
   throw Error("P4_G5_G5A_SOURCE_RECEIPT_SHAPE_HOLD");
  if(seen.has(o.queryId))throw Error("P4_G5_G5A_DUPLICATE_QUERY_HOLD");
  seen.add(o.queryId);
  const a=t(o.availableAtUtc),expiry=t(o.sourceUseExpiresAtUtc);
  // No observed end-of-source/lifetime permit can be inferred from SHA shape.
  // The independent collector verifies rights. Here enforce 24h technical TTL.
  if(expiry<=a||expiry>a+86400000){invalidContent++;continue}
  if(o.providerFlightId!==input.reviewedProviderFlightId||
     o.operatorFlightNumber!==input.operatorFlightNumber||
     o.originIcao!==input.originIcao||
     o.destinationIcao!==input.destinationIcao||
     o.operatingRole!=="CONFIRMED_OPERATING")
   return result("UNKNOWN_IDENTITY_UNVERIFIED");
  if(o.nativeScheduledDepartureUtc===null){invalidContent++;continue}
  const d=t(o.nativeScheduledDepartureUtc);
  // Do not use observations after expiration or future of W; those are
  // unavailable for prospective target evaluation and not counted.
  if(a>=expiry||a>W)continue;
  validObs++;
  inScope.push({at:a,sched:d,queryId:o.queryId});
 }
 if(!validObs)return result("UNKNOWN_SOURCE_INVALID_OR_EXPIRED",
   {invalidOrMissingSourceCount:invalidContent});
 inScope.sort((a,b)=>a.at-b.at||a.queryId.localeCompare(b.queryId));
 // First recorded provider schedule CANNOT be fabricated from a later
 // version. Invariant must be externally supported before G5A admission.
 const first=inScope[0];
 if(first.sched!==T)
  return result("UNKNOWN_NATIVE_T_UNAVAILABLE");
 const asof=inScope.filter(x=>x.at<=C);
 if(asof.length===0)return result("UNKNOWN_NO_ASOF_BASELINE",
    {sourceObservations:inScope.length});
 const after=inScope.filter(x=>x.at>C&&x.at<=W);
 if(after.length===0)return result("UNKNOWN_NO_POSTCUTOFF_REOBSERVATION",
    {sourceObservations:inScope.length,asofSourceCount:asof.length});
 const baseline=asof[asof.length-1],final=after[after.length-1];
 const signed=(final.sched-baseline.sched)/60000;
 if(!Number.isFinite(signed)||!Number.isSafeInteger(signed*60000))
  throw Error("P4_G5_G5A_RETIME_ARITHMETIC_HOLD");
 return result(Math.abs(signed)>=15?
  "OBSERVED_REVISION_GE_15_MIN":"OBSERVED_REVISION_LT_15_MIN",{
    scheduledRevisionMinutes:signed,
    thresholdMinutes:15,
    predictionCutoffUtc:new Date(C).toISOString(),
    assessmentWatermarkUtc:new Date(W).toISOString(),
    asofSourceCount:asof.length,
    postCutoffSourceCount:after.length,
    sourceObservations:inScope.length,
    // No provider flight ID or timestamp-of-event is printed beyond
    // the preregistered cutoff & watermark; source hashes stay upstream.
    identityLinkKind:"EXPLICIT_PROVIDER_ID_AND_OPERATING_LEG_MATCH" as const,
    outcomeIsScheduledRevisionNotActualDelay:true as const
  });
}
