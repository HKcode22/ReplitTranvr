import {describe,it,expect} from "vitest";
import {assessGate05dRunwayEvidenceV39,type Gate05dEvidenceInputV39}
 from "../server/lib/disruption/gate05dRunwayEvidenceAssessment_v39";

const evidence:Gate05dEvidenceInputV39={
  paidAttempts:2,apiUnitsSpent:4,alertCreditsSpent:0,
  maturedWindowAgeMinutes:[235,255],
  fids:{objects:20,scheduledPresent:20,revisedPresent:20,
    runwayPresent:3,operatorRecords:9,marketingRecords:11,
    liveDeparture:20,departedOrArrived:19,lastUpdatedPresent:0},
  flightStatus:{objects:1,scheduledPresent:1,revisedPresent:1,
    runwayPresent:1,operatorRecords:1,marketingRecords:0,
    liveDeparture:1,departedOrArrived:0,lastUpdatedPresent:1,
    matchedWsssWithinOneHour:1,rawReturnedCount:1,
    fieldActualityIndependentlyEstablished:false,
    scheduledRunwayBaselinePresent:false}
};
describe("Gate05d signed received aggregate science, no paid provider",()=>{
  it("reports real 3/20 FIDS runway field coverage, not 3 actual runway labels",()=>{
    const x=assessGate05dRunwayEvidenceV39(evidence);
    expect(x.technicalBilling).toBe("PASS");
    expect(x.fidsRunwayPresentRecords).toBe(3);
    expect(x.fidsResponseRecords).toBe(20);
    expect(x.fidsRunwayPresentFraction).toBeCloseTo(0.15);
    expect(x.fidsRunwayMissingRecords).toBe(17);
    expect(x.exactVerifiedRunwayDelayLabels).toBe(0);
    expect(x.otherReceivedObservationsUsableForQualifiedResearch).toBe(true);
    expect(x.paidProviderCallsByAssessment).toBe(0);
  });
  it("does not interpret a single preferentially selected match as population coverage",()=>{
    const x=assessGate05dRunwayEvidenceV39(evidence);
    expect(x.matchedFlightStatusRecords).toBe(1);
    expect(x.matchedFlightStatusRunwayRecords).toBe(1);
    expect(x.statusSelection).toBe("DELIBERATELY_PREFERENTIAL_NOT_RANDOM");
    expect(x.matchedWithinFlightRunwayIncrementMeasured).toBe(false);
    expect(x.crossCohortAgeEffectCausal).toBe(false);
    expect(x.denominatorUnit).toBe("FIDS_RESPONSE_RECORDS_NOT_DISTINCT_PHYSICAL_LEGS");
    expect(x.sourceActualityIndependentlyVerified).toBe(false);
    expect(x.scheduledWheelsOffReferenceVerified).toBe(false);
    expect(x.sourceAsOfCutoffTVerified).toBe(false);
  });
  it("rejects impossible row counters and inconsistent cross-provider claims",()=>{
    expect(()=>assessGate05dRunwayEvidenceV39({...evidence,
      fids:{...evidence.fids,runwayPresent:21}})).toThrow();
    expect(()=>assessGate05dRunwayEvidenceV39({...evidence,
      fids:{...evidence.fids,operatorRecords:14}})).toThrow();
    expect(()=>assessGate05dRunwayEvidenceV39({...evidence,
      flightStatus:{...evidence.flightStatus,
       fieldActualityIndependentlyEstablished:true}})).toThrow();
    expect(()=>assessGate05dRunwayEvidenceV39({...evidence,
      paidAttempts:3})).toThrow();
    expect(()=>assessGate05dRunwayEvidenceV39({...evidence,
      alertCreditsSpent:2})).toThrow();
  });
});