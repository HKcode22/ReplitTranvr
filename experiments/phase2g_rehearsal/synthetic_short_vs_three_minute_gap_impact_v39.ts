/**
 * P15/P17 scientific risk comparison requested for real 30-second, 60-second,
 * 120-second, 180-second callback-health uncertainty over frozen 120 minutes.
 *
 * Pure OFFLINE sensitivity analysis: NO source/credit truth is claimed from
 * failed GET probes, SQL-delivery count, or from elapsed-time coverage.
 * Prospective model only; F.8 complete-science, cost, owner, deployed
 * 6+6 and paid-launch approvals remain FALSE.
 */
export type SyntheticGapV39=Readonly<{
  startSecond:number;
  endSecond:number;
}>;
export type SyntheticGapImpactInputV39=Readonly<{
  mode:"synthetic-only";
  windowSeconds:7200;
  healthUncertaintyIntervals:readonly SyntheticGapV39[];
  /** E.g. confirmed (operator) physical flight observations, NOT webhook count. */
  observedEligibleFlightItems:number;
  observedMeanDepartureDelayMinutes:number;
  /** Optional scientifically justified outcome support, not a factual YSSY limit. */
  assumedDelaySupportMinutes:readonly [number,number];
  /** Only known after provider-independent exact sender/receiver comparison. */
  senderAttemptLedgerIndependentlyAuthenticated:boolean;
  originalRawAndItemIdentityCrosschecked:boolean;
  exactMissingEligibleFlightItems:number|null;
}>;
export type SyntheticGapImpactV39=Readonly<{
  observedHealthUncertaintySeconds:number;
  observedHealthUncertaintyTimeFraction:number;
  healthTimeCoverageFraction:number;
  elapsedUnknownSecondsBy15Min:readonly number[];
  incidentCount:number;
  sourceMissingCountIsKnown:boolean;
  actualMissingEligibleFlightItems:number|null;
  hypotheticalFullMeanLowerMinutes:number|null;
  hypotheticalFullMeanUpperMinutes:number|null;
  maximumAbsoluteMeanShiftFromObservedMinutes:number|null;
  sourceContinuityVerifiedByTimeAlone:false;
  scientificOriginalF8PassAuthorized:false;
  partialScienceAuthorized:false;
  paidSixPlusSixAuthorized:false;
  paidLaunchAuthorized:false;
}>;
const safe=(x:number)=>Number.isSafeInteger(x)&&x>=0;
export function compareSyntheticGapImpactV39(x:SyntheticGapImpactInputV39):SyntheticGapImpactV39{
  if(x.mode!=="synthetic-only"||x.windowSeconds!==7200||
     !Array.isArray(x.healthUncertaintyIntervals)||
     x.healthUncertaintyIntervals.length>200||
     !safe(x.observedEligibleFlightItems)||
     !Number.isFinite(x.observedMeanDepartureDelayMinutes)||
     !Array.isArray(x.assumedDelaySupportMinutes)||
     x.assumedDelaySupportMinutes.length!==2||
     x.assumedDelaySupportMinutes.some(v=>!Number.isFinite(v))||
     x.assumedDelaySupportMinutes[0]>x.assumedDelaySupportMinutes[1]||
     !(x.exactMissingEligibleFlightItems===null||
       safe(x.exactMissingEligibleFlightItems)))
    throw Error("SHORT_GAP_SENSITIVITY_INPUT_INVALID");
  const [lower,upper]=x.assumedDelaySupportMinutes;
  if(x.observedEligibleFlightItems>0&&
     (x.observedMeanDepartureDelayMinutes<lower||
      x.observedMeanDepartureDelayMinutes>upper))
    throw Error("OBSERVED_DELAY_OUTSIDE_ASSUMED_SUPPORT");
  const by15=Array<number>(8).fill(0);
  const ordered=x.healthUncertaintyIntervals.map(g=>{
    if(!safe(g?.startSecond)||!safe(g?.endSecond)||
       g.endSecond<=g.startSecond||g.endSecond>x.windowSeconds)
      throw Error("GAP_INTERVAL_OUTSIDE_FROZEN_WINDOW");
    return {...g};
  }).sort((a,b)=>a.startSecond-b.startSecond||a.endSecond-b.endSecond);
  const merged:SyntheticGapV39[]=[];
  for(const span of ordered){
    const prior=merged[merged.length-1];
    if(prior&&span.startSecond<=prior.endSecond){
      merged[merged.length-1]={startSecond:prior.startSecond,
        endSecond:Math.max(prior.endSecond,span.endSecond)};
    }else merged.push(span);
  }
  for(const span of merged){
    for(let bin=0;bin<8;bin++){
      const overlap=Math.max(0,Math.min(span.endSecond,(bin+1)*900)-
        Math.max(span.startSecond,bin*900));
      by15[bin]+=overlap;
    }
  }
  const total=by15.reduce((a,b)=>a+b,0);
  const trusted=x.senderAttemptLedgerIndependentlyAuthenticated===true&&
    x.originalRawAndItemIdentityCrosschecked===true&&
    x.exactMissingEligibleFlightItems!==null;
  const missing=trusted?x.exactMissingEligibleFlightItems:null;
  const population=x.observedEligibleFlightItems+(missing??0);
  // No finite sensitivity bound from observed GET timing alone.
  // Bounds conditional on (i) provably COMPLETE external flight ITEM counts
  // and (ii) PRE-JUSTIFIED outcome support. One cannot assume 0..180 minutes
  // is a physically guaranteed YSSY delay range.
  const meanLow=trusted&&population>0?
    (x.observedEligibleFlightItems*x.observedMeanDepartureDelayMinutes+
      missing!*lower)/population:null;
  const meanHigh=trusted&&population>0?
    (x.observedEligibleFlightItems*x.observedMeanDepartureDelayMinutes+
      missing!*upper)/population:null;
  return {
    observedHealthUncertaintySeconds:total,
    observedHealthUncertaintyTimeFraction:total/7200,
    healthTimeCoverageFraction:1-total/7200,
    elapsedUnknownSecondsBy15Min:by15,
    incidentCount:merged.length,
    sourceMissingCountIsKnown:trusted,
    actualMissingEligibleFlightItems:missing,
    hypotheticalFullMeanLowerMinutes:meanLow,
    hypotheticalFullMeanUpperMinutes:meanHigh,
    maximumAbsoluteMeanShiftFromObservedMinutes:
      meanLow===null||meanHigh===null?null:
        Math.max(Math.abs(x.observedMeanDepartureDelayMinutes-meanLow),
          Math.abs(meanHigh-x.observedMeanDepartureDelayMinutes)),
    sourceContinuityVerifiedByTimeAlone:false,
    scientificOriginalF8PassAuthorized:false,
    partialScienceAuthorized:false,
    paidSixPlusSixAuthorized:false,
    paidLaunchAuthorized:false
  };
}
