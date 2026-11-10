/**
 * Phase5 nonpaid, proposal-only physical takeoff label uncertainty study.
 * Analyses independently supplied SAME-flight, actual-wheels-off paired
 * references against AeroDataBox estimated runway time or ADS-B trace proxies.
 * Raw flight data, credentials, SQL and network I/O are deliberately absent.
 * Never silently converts a gate departure into runway time or a conditional
 * scheduled-service key into an observed physical operating leg.
 */
export const P5_TAKEOFF_PROXY_CALIBRATION_SCHEMA=
 "v39.phase5.physical-takeoff-proxy-calibration.v1";
const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const PROXIES=["AERODATABOX_ESTIMATED_RUNWAY","ADSBLOL_TRAJECTORY_INFERRED"];
const REFERENCES=["AIRPORT_OPERATOR_ACTUAL_WHEELS_OFF","US_BTS_ACTUAL_WHEELS_OFF"];
const ICAO=/^[A-Z]{4}$/;
const fail=x=>{throw Error("REFUSED_P5_TAKEOFF_CALIBRATION_"+x);};
function stamp(s){
 if(typeof s!=="string"||!UTC.test(s)||!Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)fail("INVALID_UTC_TIMESTAMP");
 return Date.parse(s);
}
function quantile(xs,p){
 if(!xs.length)return null;
 const k=(xs.length-1)*p,lo=Math.floor(k),hi=Math.ceil(k);
 return xs[lo]+(xs[hi]-xs[lo])*(k-lo);
}
function makeStats(rows){
 const matched=rows.filter(r=>r.errorSec!==null);
 const allErrors=matched.map(r=>r.errorSec);
 const abs=allErrors.map(Math.abs).sort((a,b)=>a-b);
 const signed=allErrors.reduce((a,b)=>a+b,0);
 const brackets=rows.filter(r=>r.bracketSeconds!==null);
 return {
  eligibleRecords:rows.length,
  actualReferenceObserved:rows.filter(r=>r.hasActualReference).length,
  proxyEstimateAvailable:rows.filter(r=>r.hasProxyEstimate).length,
  pairedProxyAndActual:matched.length,
  unpairedOrUnknown:rows.length-matched.length,
  matchedFraction:rows.length?matched.length/rows.length:null,
  medianAbsoluteSeconds:quantile(abs,.5),
  p90AbsoluteSeconds:quantile(abs,.9),
  meanAbsoluteSeconds:abs.length?abs.reduce((a,b)=>a+b,0)/abs.length:null,
  signedMeanErrorSeconds:allErrors.length?signed/allErrors.length:null,
  within60SecShare:abs.length?abs.filter(n=>n<=60).length/abs.length:null,
  within300SecShare:abs.length?abs.filter(n=>n<=300).length/abs.length:null,
  within600SecShare:abs.length?abs.filter(n=>n<=600).length/abs.length:null,
  traceBracketsAvailable:brackets.length,
  medianGroundToAirGapSeconds:quantile(
   brackets.map(r=>r.bracketSeconds).sort((a,b)=>a-b),.5),
  // Bracket is not a guarantee of true wheels-off if surface/position is wrong.
  independentLabelValidityCertified:false
 };
}
/**
 * One row is one prospectively included operating-service observation.
 * A row without an independent actual reference contributes to coverage, not
 * a fake zero error. Restrict actual paired timestamps to independently
 * eligible historical records or TRAIN/VALIDATION days 1..25; TEST is forbidden.
 * The provided identity/source claims still need external signed review.
 */
export function auditP5PhysicalTakeoffProxyCalibration(input){
 if(!input||input.schema!==P5_TAKEOFF_PROXY_CALIBRATION_SCHEMA||
    input.dataScope!=="HISTORICAL_INDEPENDENT_VALIDATION"&&
    input.dataScope!=="PHASE6_TRAIN_VALIDATION_ONLY"||
    input.protectedTestOutcomesIncluded!==false||
    !SHA.test(input.sampleProtocolSha256??"")||
    !Array.isArray(input.rows)||input.rows.length>10000)
  fail("UNREVIEWED_SCOPE_OR_TEST_LEAKAGE");
 const seen=new Set(),result=[];
 for(const row of input.rows){
  if(!row||!SHA.test(row.flightIdentitySha256??"")||
     !PROXIES.includes(row.proxySource)||
     !ICAO.test(row.originIcao??"")||
     (input.dataScope==="HISTORICAL_INDEPENDENT_VALIDATION"?
       row.runDayIndex!==null:
       !Number.isSafeInteger(row.runDayIndex)||row.runDayIndex<1||
       row.runDayIndex>25)||
     !["NATIVE_OPERATING_LEG","CONDITIONAL_SERVICE"].includes(row.identityTier)||
     typeof row.identityMatchedToReference!=="boolean"||
     !REFERENCES.includes(row.referenceSource)||
     !["VERIFIED_ACTUAL_ONLY","UNOBSERVED_OR_UNVERIFIED"].includes(row.referenceStatus))
   fail("INVALID_IDENTITY_COHORT_OR_ACTUAL_MILESTONE");
  const id=row.flightIdentitySha256+"|"+row.proxySource;
  if(seen.has(id))fail("DUPLICATED_AIRCRAFT_SOURCE_COMPARISON");
  seen.add(id);
  const reference=row.referenceActualWheelsOffUtc===null?null:
   stamp(row.referenceActualWheelsOffUtc);
  const estimate=row.proxyEstimatedTakeoffUtc===null?null:
   stamp(row.proxyEstimatedTakeoffUtc);
  if((reference!==null)!==(row.referenceStatus==="VERIFIED_ACTUAL_ONLY")||
     (reference!==null&&
      (row.identityTier!=="NATIVE_OPERATING_LEG"||
       row.identityMatchedToReference!==true)))
   fail("NO_VERIFIED_SAME_FLIGHT_ACTUAL_REFERENCE");
  // BTS reports actual wheels-off for covered *US domestic* operations;
  // it is useful for eligible US MID/REGIONAL airports, not 4 non-US HUBs.
  // A source declaration alone does not certify the cross-provider join.
  if(row.referenceSource==="US_BTS_ACTUAL_WHEELS_OFF"&&reference!==null&&
     (!row.usDomesticOperatingFlightMatched||
      ["WSSS","OMAA","SKBO","YSSY"].includes(row.originIcao)))
   fail("UNVERIFIED_US_DOMESTIC_BTS_JOIN_OR_NONUS_HUB");
  // Retain unverified conditional-service proxy metadata descriptively.
  // A conditional key cannot be promoted to a physically matched label.
  const hasGround=row.lastObservedGroundUtc!==null,
    hasAir=row.firstObservedAirborneUtc!==null;
  if(hasGround!==hasAir)fail("INCOMPLETE_GROUND_AIR_INTERVAL");
  let gap=null;
  if(hasGround){
   if(row.proxySource!=="ADSBLOL_TRAJECTORY_INFERRED")
    fail("GROUND_AIR_INTERVAL_NOT_FROM_ADSB");
   const last=stamp(row.lastObservedGroundUtc),
    first=stamp(row.firstObservedAirborneUtc);
   if(last>=first)fail("GROUND_AIR_INTERVAL_REVERSED");
   gap=(first-last)/1000;
   // No threshold-based deletion of wide but honest receiver gaps.
  }
  result.push({
   originIcao:row.originIcao,proxySource:row.proxySource,
   hasActualReference:reference!==null,
   hasProxyEstimate:estimate!==null,
   errorSec:reference!==null&&estimate!==null?
    (estimate-reference)/1000:null,
   bracketSeconds:gap
  });
 }
 const groupBy=fn=>{
  const m=new Map();
  for(const x of result){const key=fn(x);if(!m.has(key))m.set(key,[]);
   m.get(key).push(x);}
  return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0]))
   .map(([key,rs])=>({group:key,...makeStats(rs)}));
 };
 return{
  schema:"v39.phase5.physical-departure-proxy-calibration-report.v1",
  status:"DESCRIPTIVE_VALIDATION_RESEARCH_ONLY_NOT_LABEL_APPROVAL",
  dataScope:input.dataScope,
  total:makeStats(result),
  byAirport:groupBy(r=>r.originIcao),
  byProxy:groupBy(r=>r.proxySource),
  byAirportProxy:groupBy(r=>r.originIcao+"|"+r.proxySource),
  note:"Matched actual references must be independently attested; sample selection and source independence are not proven by this function.",
  sameFlightIdentityIndependentlyCertifiedByFunction:false,
  preFeatureUseOfPostDepartureEvidencePermitted:false,
  proxyAccuracyTransferableToUnmeasuredAirports:false,
  proxyAutomaticallyAcceptedAsActualWheelsOff:false,
  legalRightsOrRetentionProven:false,
  phase5FreezePassed:false,phase6PaidGo:false,
  providerCalls:0,databaseWrites:0
 };
}
