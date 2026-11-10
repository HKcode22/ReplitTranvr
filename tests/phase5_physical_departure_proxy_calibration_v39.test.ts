import {describe,it,expect} from "vitest";
import {
 auditP5PhysicalTakeoffProxyCalibration,
 P5_TAKEOFF_PROXY_CALIBRATION_SCHEMA
} from "../server/lib/disruption/phase5PhysicalDepartureProxyCalibration_v39.mjs";
const sha=(c:string)=>c.repeat(64);
function entry(code:string,id:string,source:
 "AERODATABOX_ESTIMATED_RUNWAY"|"ADSBLOL_TRAJECTORY_INFERRED"){
 return {
  flightIdentitySha256:sha(id),originIcao:code,proxySource:source,
  runDayIndex:null as number|null,
  identityTier:"NATIVE_OPERATING_LEG",
  identityMatchedToReference:true,
  referenceSource:"AIRPORT_OPERATOR_ACTUAL_WHEELS_OFF",
  referenceStatus:"VERIFIED_ACTUAL_ONLY",
  referenceActualWheelsOffUtc:"2026-11-08T10:00:00.000Z",
  proxyEstimatedTakeoffUtc:"2026-11-08T10:02:00.000Z",
  lastObservedGroundUtc:null as string|null,
  firstObservedAirborneUtc:null as string|null,
  usDomesticOperatingFlightMatched:false
 };
}
function packet(rows:any[]=[],scope="HISTORICAL_INDEPENDENT_VALIDATION"){
 return{
  schema:P5_TAKEOFF_PROXY_CALIBRATION_SCHEMA,
  dataScope:scope,
  sampleProtocolSha256:sha("f"),
  protectedTestOutcomesIncluded:false,
  rows
 };
}
describe("Physical departure research: compare matched actual vs ADS-B and ADB proxies",()=>{
 it("does not infer any error, perfect quality or GO from missing actual labels",()=>{
  const x=auditP5PhysicalTakeoffProxyCalibration(packet([]));
  expect(x.total.pairedProxyAndActual).toBe(0);
  expect(x.total.meanAbsoluteSeconds).toBeNull();
  expect(x.total.within60SecShare).toBeNull();
  expect(x.proxyAutomaticallyAcceptedAsActualWheelsOff).toBe(false);
  expect(x.phase5FreezePassed).toBe(false);
  expect(x.phase6PaidGo).toBe(false);
 });
 it("computes paired source+site error and interval coverage without false universal precision",()=>{
  const adsb={...entry("WSSS","a","ADSBLOL_TRAJECTORY_INFERRED"),
   proxyEstimatedTakeoffUtc:"2026-11-08T10:00:50.000Z",
   lastObservedGroundUtc:"2026-11-08T09:59:50.000Z",
   firstObservedAirborneUtc:"2026-11-08T10:01:30.000Z"};
  const adb=entry("YSSY","b","AERODATABOX_ESTIMATED_RUNWAY");
  const missing={...entry("OMAA","c","ADSBLOL_TRAJECTORY_INFERRED"),
   referenceStatus:"UNOBSERVED_OR_UNVERIFIED",
   referenceActualWheelsOffUtc:null,identityMatchedToReference:false};
  const conditional={...entry("SKBO","d","AERODATABOX_ESTIMATED_RUNWAY"),
   identityTier:"CONDITIONAL_SERVICE",identityMatchedToReference:false,
   referenceStatus:"UNOBSERVED_OR_UNVERIFIED",
   referenceActualWheelsOffUtc:null};
  const x=auditP5PhysicalTakeoffProxyCalibration(
   packet([adb,adsb,missing,conditional]));
  expect(x.total.eligibleRecords).toBe(4);
  expect(x.total.actualReferenceObserved).toBe(2);
  expect(x.total.proxyEstimateAvailable).toBe(4);
  expect(x.total.pairedProxyAndActual).toBe(2);
  expect(x.total.meanAbsoluteSeconds).toBe(85);
  expect(x.total.medianAbsoluteSeconds).toBe(85);
  expect(x.total.p90AbsoluteSeconds).toBeCloseTo(113);
  expect(x.total.within60SecShare).toBe(.5);
  expect(x.total.traceBracketsAvailable).toBe(1);
  expect(x.total.medianGroundToAirGapSeconds).toBe(100);
  expect(x.byAirport).toHaveLength(4);
  expect(x.byProxy).toHaveLength(2);
  expect(x.proxyAccuracyTransferableToUnmeasuredAirports).toBe(false);
  expect(x.preFeatureUseOfPostDepartureEvidencePermitted).toBe(false);
 });
 it("permits delayed BTS US domestic reference only on explicitly matched operating leg",()=>{
  const b={...entry("KBUF","e","ADSBLOL_TRAJECTORY_INFERRED"),
   referenceSource:"US_BTS_ACTUAL_WHEELS_OFF",
   usDomesticOperatingFlightMatched:true};
  const x=auditP5PhysicalTakeoffProxyCalibration(packet([b]));
  expect(x.total.pairedProxyAndActual).toBe(1);
  expect(()=>auditP5PhysicalTakeoffProxyCalibration(
   packet([{...b,usDomesticOperatingFlightMatched:false}])))
   .toThrow("UNVERIFIED_US_DOMESTIC_BTS_JOIN_OR_NONUS_HUB");
  expect(()=>auditP5PhysicalTakeoffProxyCalibration(
   packet([{...b,originIcao:"WSSS"}])))
   .toThrow("UNVERIFIED_US_DOMESTIC_BTS_JOIN_OR_NONUS_HUB");
 });
 it("refuses conditional flight elevated into actual and unverified physical label",()=>{
  const x=entry("WSSS","a","AERODATABOX_ESTIMATED_RUNWAY");
  expect(()=>auditP5PhysicalTakeoffProxyCalibration(
   packet([{...x,identityTier:"CONDITIONAL_SERVICE"}])))
   .toThrow("NO_VERIFIED_SAME_FLIGHT_ACTUAL_REFERENCE");
  expect(()=>auditP5PhysicalTakeoffProxyCalibration(
   packet([{...x,referenceStatus:"UNOBSERVED_OR_UNVERIFIED"}])))
   .toThrow("NO_VERIFIED_SAME_FLIGHT_ACTUAL_REFERENCE");
  expect(()=>auditP5PhysicalTakeoffProxyCalibration(
   packet([{...x,identityMatchedToReference:false}])))
   .toThrow("NO_VERIFIED_SAME_FLIGHT_ACTUAL_REFERENCE");
 });
 it("refuses impossible ADS-B bracket, but does not erase honestly wide gaps",()=>{
  const x={...entry("WSSS","a","ADSBLOL_TRAJECTORY_INFERRED"),
   lastObservedGroundUtc:"2026-11-08T09:50:00.000Z",
   firstObservedAirborneUtc:"2026-11-08T10:20:00.000Z"};
  expect(auditP5PhysicalTakeoffProxyCalibration(packet([x]))
   .total.medianGroundToAirGapSeconds).toBe(1800);
  expect(()=>auditP5PhysicalTakeoffProxyCalibration(
   packet([{...x,firstObservedAirborneUtc:"2026-11-08T09:50:00.000Z"}])))
   .toThrow("GROUND_AIR_INTERVAL_REVERSED");
  expect(()=>auditP5PhysicalTakeoffProxyCalibration(
   packet([{...x,firstObservedAirborneUtc:null}])))
   .toThrow("INCOMPLETE_GROUND_AIR_INTERVAL");
  expect(()=>auditP5PhysicalTakeoffProxyCalibration(
   packet([{...x,proxySource:"AERODATABOX_ESTIMATED_RUNWAY"}])))
   .toThrow("GROUND_AIR_INTERVAL_NOT_FROM_ADSB");
 });
 it("protects 26-31 TEST outcomes, duplicates, invalid timestamps, wrong review sources",()=>{
  const x=entry("WSSS","a","AERODATABOX_ESTIMATED_RUNWAY");
  expect(()=>auditP5PhysicalTakeoffProxyCalibration(
   packet([{...x,runDayIndex:26}],"PHASE6_TRAIN_VALIDATION_ONLY")))
   .toThrow("INVALID_IDENTITY_COHORT_OR_ACTUAL_MILESTONE");
  expect(()=>auditP5PhysicalTakeoffProxyCalibration(
   packet([x,x])))
   .toThrow("DUPLICATED_AIRCRAFT_SOURCE_COMPARISON");
  expect(()=>auditP5PhysicalTakeoffProxyCalibration(
   packet([{...x,proxyEstimatedTakeoffUtc:"2026-11-08T10:00:00Z"}])))
   .toThrow("INVALID_UTC_TIMESTAMP");
  expect(()=>auditP5PhysicalTakeoffProxyCalibration(
   {...packet([x]),protectedTestOutcomesIncluded:true}))
   .toThrow("UNREVIEWED_SCOPE_OR_TEST_LEAKAGE");
 });
});
