import {describe,expect,it} from "vitest";
import {compareSyntheticGapImpactV39 as audit,
  type SyntheticGapImpactInputV39} from
  "../experiments/phase2g_rehearsal/synthetic_short_vs_three_minute_gap_impact_v39";

const base=():SyntheticGapImpactInputV39=>({
  mode:"synthetic-only",windowSeconds:7200,
  healthUncertaintyIntervals:[{startSecond:3600,endSecond:3630}],
  observedEligibleFlightItems:117,
  observedMeanDepartureDelayMinutes:5,
  // ONLY a hypothetical bounded-delay sensitivity input, never a real
  // empirically justified cap on YSSY departure delay.
  assumedDelaySupportMinutes:[0,120],
  senderAttemptLedgerIndependentlyAuthenticated:false,
  originalRawAndItemIdentityCrosschecked:false,
  exactMissingEligibleFlightItems:null
});
const check=(patch:Partial<SyntheticGapImpactInputV39>={})=>
  audit({...base(),...patch});
const known={senderAttemptLedgerIndependentlyAuthenticated:true,
  originalRawAndItemIdentityCrosschecked:true} as const;

describe("P17: 30 seconds can be important; 3 minutes not magical SCIENTIFIC invalidity",()=>{
  it("30s: 99.5833% observed HEALTH time cannot tell if a sent provider item was lost",()=>{
    const v=check();
    expect(v.observedHealthUncertaintySeconds).toBe(30);
    expect(v.healthTimeCoverageFraction).toBeCloseTo(119.5/120,10);
    expect(v.actualMissingEligibleFlightItems).toBeNull();
    expect(v.maximumAbsoluteMeanShiftFromObservedMinutes).toBeNull();
    expect(v.scientificOriginalF8PassAuthorized).toBe(false);
  });
  it("180s: 97.5% observed HEALTH time also cannot tell whether flights were missing",()=>{
    const v=check({healthUncertaintyIntervals:[{startSecond:3600,endSecond:3780}]});
    expect(v.observedHealthUncertaintySeconds).toBe(180);
    expect(v.healthTimeCoverageFraction).toBeCloseTo(117/120,10);
    expect(v.actualMissingEligibleFlightItems).toBeNull();
    expect(v.sourceContinuityVerifiedByTimeAlone).toBe(false);
  });
  it.each([30,60,120,180])("%i-second gap does not auto-reject or auto-certify science from elapsed time alone",(seconds)=>{
    const v=check({healthUncertaintyIntervals:[{startSecond:900,endSecond:900+seconds}]});
    expect(v.observedHealthUncertaintySeconds).toBe(seconds);
    expect(v.elapsedUnknownSecondsBy15Min[1]).toBe(seconds);
    expect(v.sourceContinuityVerifiedByTimeAlone).toBe(false);
    expect(v.partialScienceAuthorized).toBe(false);
  });
  it("180 seconds of failed GETs but independent exact sender/source equality => zero missing items",()=>{
    const v=check({...known,exactMissingEligibleFlightItems:0,
      healthUncertaintyIntervals:[{startSecond:3600,endSecond:3780}]});
    expect(v.sourceMissingCountIsKnown).toBe(true);
    expect(v.actualMissingEligibleFlightItems).toBe(0);
    expect(v.hypotheticalFullMeanLowerMinutes).toBe(5);
    expect(v.hypotheticalFullMeanUpperMinutes).toBe(5);
    expect(v.scientificOriginalF8PassAuthorized).toBe(false);
  });
  it("30 seconds with THREE high-delay missing flights gives wider outcome bound than 180s verified zero missing",()=>{
    const short=check({...known,exactMissingEligibleFlightItems:3});
    const long=check({...known,exactMissingEligibleFlightItems:0,
      healthUncertaintyIntervals:[{startSecond:3600,endSecond:3780}]});
    expect(short.maximumAbsoluteMeanShiftFromObservedMinutes).toBeCloseTo(2.875);
    expect(long.maximumAbsoluteMeanShiftFromObservedMinutes).toBe(0);
    expect(short.hypotheticalFullMeanUpperMinutes).toBeCloseTo(7.875);
  });
  it("with only one provider-proven missing eligible item, 180s unknown time may have modest conditional bound",()=>{
    const v=check({...known,exactMissingEligibleFlightItems:1,
      healthUncertaintyIntervals:[{startSecond:3600,endSecond:3780}]});
    expect(v.hypotheticalFullMeanUpperMinutes).toBeCloseTo((117*5+120)/118);
    expect(v.maximumAbsoluteMeanShiftFromObservedMinutes).toBeCloseTo(115/118);
  });
  it("count without independently authenticated provider origin is NOT a source proof",()=>{
    const v=check({exactMissingEligibleFlightItems:1,
      senderAttemptLedgerIndependentlyAuthenticated:false,
      originalRawAndItemIdentityCrosschecked:true});
    expect(v.sourceMissingCountIsKnown).toBe(false);
    expect(v.hypotheticalFullMeanLowerMinutes).toBeNull();
    expect(v.maximumAbsoluteMeanShiftFromObservedMinutes).toBeNull();
  });
  it("four separate 30s incidents consume same 120s total as one two-minute interruption",()=>{
    const many=check({healthUncertaintyIntervals:[
      {startSecond:450,endSecond:480},{startSecond:1350,endSecond:1380},
      {startSecond:2250,endSecond:2280},{startSecond:3150,endSecond:3180}
    ]});
    const single=check({healthUncertaintyIntervals:[{startSecond:450,endSecond:570}]});
    expect(many.incidentCount).toBe(4);
    expect(single.incidentCount).toBe(1);
    expect(many.observedHealthUncertaintySeconds).toBe(120);
    expect(single.observedHealthUncertaintySeconds).toBe(120);
    expect(many.elapsedUnknownSecondsBy15Min).toEqual([30,30,30,30,0,0,0,0]);
  });
  it("overlapping health incident intervals are unioned, not counted twice",()=>{
    const v=check({healthUncertaintyIntervals:[
      {startSecond:0,endSecond:60},{startSecond:30,endSecond:120}
    ]});
    expect(v.observedHealthUncertaintySeconds).toBe(120);
    expect(v.incidentCount).toBe(1);
  });
  it("single incident crossing 15m boundaries is attributed to both original elapsed bins",()=>{
    const v=check({healthUncertaintyIntervals:[{startSecond:880,endSecond:940}]});
    expect(v.elapsedUnknownSecondsBy15Min).toEqual([20,40,0,0,0,0,0,0]);
    expect(v.incidentCount).toBe(1);
  });
  it("without scientifically established finite outcome support, no valid finite bias guarantee follows",()=>{
    const v=check({assumedDelaySupportMinutes:[0,500],...known,
      exactMissingEligibleFlightItems:3});
    expect(v.hypotheticalFullMeanUpperMinutes).toBeCloseTo((117*5+3*500)/120);
    expect(v.maximumAbsoluteMeanShiftFromObservedMinutes).toBeCloseTo(12.375);
  });
  it("fails closed on impossible durations and invented negative or unsupported item counts",()=>{
    expect(()=>check({healthUncertaintyIntervals:[{startSecond:7100,endSecond:7500}]}))
      .toThrow("GAP_INTERVAL_OUTSIDE_FROZEN_WINDOW");
    expect(()=>check({exactMissingEligibleFlightItems:-1}))
      .toThrow("SHORT_GAP_SENSITIVITY_INPUT_INVALID");
    expect(()=>check({assumedDelaySupportMinutes:[10,20]}))
      .toThrow("OBSERVED_DELAY_OUTSIDE_ASSUMED_SUPPORT");
  });
  it("each result is proposal only and never activates real paid 6+6 or F8 science approval",()=>{
    const v=check({...known,exactMissingEligibleFlightItems:0});
    expect(v.paidSixPlusSixAuthorized).toBe(false);
    expect(v.paidLaunchAuthorized).toBe(false);
    expect(v.partialScienceAuthorized).toBe(false);
    expect(v.scientificOriginalF8PassAuthorized).toBe(false);
  });
});
