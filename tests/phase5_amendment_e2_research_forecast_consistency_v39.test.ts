import {describe,it,expect} from "vitest";
import {reviewP5E2ForecastCandidateOffline,
 type P5E2Pre,type P5E2Airborne}
 from "../server/lib/disruption/phase5AmendmentE2ForecastConsistencyOffline_v39";
const pre: P5E2Pre={
 forecastId:"synthetic-validated-only-as-structure",
 issuedAtUtc:"2027-02-11T12:00:00.000Z",
 maxInputAvailableAtUtc:"2027-02-11T11:59:56.000Z",
 stage:"PRE_DEPARTURE",modelStatus:"RESEARCH_ONLY_NOT_VALIDATED",
 horizon:"T-6h",cutoffUtc:"2027-02-11T12:00:00.000Z",
 operatedFlightDelayMinutes:{
   q10:0,q50:20,q90:65,
   pAtLeast15:0.6,pAtLeast30:0.36,pAtLeast60:0.12,
   pAtLeast120:0.02,isConditionalOnActuallyOperating:true
 },
 airborneTrackEvidence:null,arrivalEtaUtc:null
};
const air: P5E2Airborne={
 forecastId:"synthetic-airborne-eta-research-only",
 issuedAtUtc:"2027-02-11T18:00:00.000Z",
 maxInputAvailableAtUtc:"2027-02-11T17:59:55.000Z",
 stage:"AIRBORNE",modelStatus:"RESEARCH_ONLY_NOT_VALIDATED",
 horizon:null,cutoffUtc:null,operatedFlightDelayMinutes:null,
 airborneTrackEvidence:{
  independentlyAuthenticatedOutsideThisFunction:false,
  latestPositionReceivedAtUtc:"2027-02-11T17:59:55.000Z"
 },
 arrivalEtaUtc:{
  q10:"2027-02-11T19:00:00.000Z",
  q50:"2027-02-11T19:12:00.000Z",
  q90:"2027-02-11T19:40:00.000Z",
  requestedArrivalMilestone:"WHEELS_ON"
 }
};
describe("Amendment E2: research-only PRE vs AIRBORNE mathematical as-of consistency",()=>{
 it("accepts a coherent PRE minutes + monotone risk research sample, does not pretend to model",()=>{
  const r=reviewP5E2ForecastCandidateOffline(pre);
  expect(r.status).toContain("RESEARCH_ONLY_NOT_DEPLOYED");
  expect(r.realPredictionGenerated).toBe(false);
  expect(r.phase6PaidGo).toBe(false);
 });
 it("rejects probabilities where larger delays falsely have more event chance",()=>{
  expect(()=>reviewP5E2ForecastCandidateOffline({
   ...pre,operatedFlightDelayMinutes:{
    ...pre.operatedFlightDelayMinutes!,pAtLeast60:0.8
   }
  })).toThrow("IMPOSSIBLE_THRESHOLD_PROBABILITY_ORDER");
 });
 it("rejects quantile crossing and NaN",()=>{
  expect(()=>reviewP5E2ForecastCandidateOffline({
   ...pre,operatedFlightDelayMinutes:{
    ...pre.operatedFlightDelayMinutes!,q50:90
   }
  })).toThrow("INVALID_DELAY_QUANTILES");
  expect(()=>reviewP5E2ForecastCandidateOffline({
   ...pre,operatedFlightDelayMinutes:{
    ...pre.operatedFlightDelayMinutes!,q50:NaN
   }
  })).toThrow("INVALID_DELAY_QUANTILES");
 });
 it("allows real PRE forecast issuance earlier than its cutoff, but never after it",()=>{
  const early=reviewP5E2ForecastCandidateOffline({
   ...pre,issuedAtUtc:"2027-02-11T11:58:00.000Z",
   maxInputAvailableAtUtc:"2027-02-11T11:57:56.000Z"
  });
  expect(early.stage).toBe("PRE_DEPARTURE");
  expect(()=>reviewP5E2ForecastCandidateOffline({
   ...pre,issuedAtUtc:"2027-02-11T12:00:01.000Z",
   maxInputAvailableAtUtc:"2027-02-11T11:59:56.000Z"
  })).toThrow("PRE_FORECAST_AFTER_OWN_CUTOFF");
 });
 it("rejects POST data masquerading as a T6 PRE feature",()=>{
  expect(()=>reviewP5E2ForecastCandidateOffline({
   ...pre,maxInputAvailableAtUtc:"2027-02-11T12:00:01.000Z"
  })).toThrow("FUTURE_DATA_LEAKAGE");
  expect(()=>reviewP5E2ForecastCandidateOffline({
   ...pre,airborneTrackEvidence:air.airborneTrackEvidence
  } as unknown as P5E2Pre)).toThrow("POST_DEPARTURE_DATA_IN_PRE");
 });
 it("accepts separately identified in-flight ETA research sample, no physical-groundtruth claim",()=>{
  const r=reviewP5E2ForecastCandidateOffline(air);
  expect(r.stage).toBe("AIRBORNE");
  expect(r.actualFlightAndLabelTruthCertifiedByThisFunction).toBe(false);
 });
 it("rejects future ADS-B track, reversed ETA or past ETA",()=>{
  expect(()=>reviewP5E2ForecastCandidateOffline({
   ...air,airborneTrackEvidence:{...air.airborneTrackEvidence,
    latestPositionReceivedAtUtc:"2027-02-11T18:00:01.000Z"}
  })).toThrow("MISSING_OR_FUTURE_AIRBORNE_TRACK_PROVENANCE");
  expect(()=>reviewP5E2ForecastCandidateOffline({
   ...air,arrivalEtaUtc:{
    ...air.arrivalEtaUtc!,q10:"2027-02-11T20:00:00.000Z"}
  })).toThrow("INVALID_OR_PAST_ARRIVAL_ETA_QUANTILES");
 });
 it("null physically unsupported PRE/ETA outcomes are explicit, not invented zeros",()=>{
  const r=reviewP5E2ForecastCandidateOffline({
    ...pre,operatedFlightDelayMinutes:null
  });
  expect(r.modelAccuracyEvaluated).toBe(false);
  const a=reviewP5E2ForecastCandidateOffline({
    ...air,arrivalEtaUtc:null
  });
  expect(a.realPredictionGenerated).toBe(false);
 });
});
