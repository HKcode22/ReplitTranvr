import {describe,expect,it} from "vitest";
import {assessP4Gate5BtsReferenceV39,
 type P4BtsCrosscheckInputV39} from
 "../server/lib/disruption/phase4Gate5BtsIndependentReference_v39";
const base=():P4BtsCrosscheckInputV39=>({
 row:{
  dataReleasePublishedAtUtc:"2026-10-15T12:00:00.000Z",
  flightDate:"2026-08-17",reportingAirline:"UA",flightNumber:"123",
  originIata:"SFO",destinationIata:"LAX",
  cancelled:false,wheelsOffLocalHHmm:"1132",
  crsDepLocalHHmm:"1100",depLocalHHmm:"1120",
  originalRowSha256:"a".repeat(64),originalRowReadAndVerified:true
 },
 link:{
  date:"2026-08-17",airline:"UA",number:"123",
  originIata:"SFO",destinationIata:"LAX",
  role:"CONFIRMED_PHYSICAL_OPERATING_LEG",
  isUsDomesticBothAirportsVerified:true,
  independentLinkageEvidenceSha256:"b".repeat(64),
  independentFlightMatchReviewed:true
 },
 reviewedAtUtc:"2026-11-03T06:00:00.000Z",
 btsSourceUseAndIntegrityReviewed:true,
 localToUtcConversionValidated:true,
 computedActualWheelsOffUtc:"2026-08-17T18:32:00.000Z"
});
describe("Gate 5: free BTS reporting-carrier actual reference is a limited labeled subcohort",()=>{
 it("can admit verified, released, exact operating-leg linked actual wheelsoff as POST-only",()=>{
  const v=assessP4Gate5BtsReferenceV39(base());
  expect(v.state).toBe("ADMISSIBLE_POSTFLIGHT_BTS_REPORTED_ACTUAL_WHEELSOFF_REFERENCE");
  expect(v.candidateBtsReportedActualOnlyWheelsOff).toBe(true);
  expect(v.referenceActualWheelsOffUtc).toBe("2026-08-17T18:32:00.000Z");
  expect(v.scheduledDepartureWheelsOffTimeVerified).toBe(false);
  expect(v.originalF8SelectedTProven).toBe(false);
  expect(v.validAsPreDepartureFeature).toBe(false);
  expect(v.mayBackfillPredictionCutoff).toBe(false);
  expect(v.wholeGate5Passed).toBe(false);
  expect(v.phase5FreezeAuthorized).toBe(false);
 });
 it("newer BTS source cannot be used as prior-to-publication ground truth",()=>{
  const x=base();x.reviewedAtUtc="2026-08-18T00:00:00.000Z";
  expect(assessP4Gate5BtsReferenceV39(x).state)
   .toBe("BTS_REPORT_NOT_YET_PUBLISHED_AT_REVIEW");
 });
 it("WSSS or any international flight cannot become BTS US domestic reference",()=>{
  const x=base();x.link.isUsDomesticBothAirportsVerified=false;
  expect(assessP4Gate5BtsReferenceV39(x).state)
   .toBe("BTS_OUTSIDE_US_REPORTING_FLIGHT_SCOPE");
 });
 it("uncertain codeshares, keys and flight-identity evidence cannot count",()=>{
  const mods:Array<(x:P4BtsCrosscheckInputV39)=>void>=[
   x=>{x.link.role="MARKETING_CODESHARE";},
   x=>{x.link.role="UNKNOWN";},
   x=>{x.link.independentFlightMatchReviewed=false;},
   x=>{x.link.independentLinkageEvidenceSha256=null;},
   x=>{x.row.flightNumber="124";},
   x=>{x.link.originIata="LAX";}
  ];
  for(const f of mods){
   const x=base();f(x);
   expect(assessP4Gate5BtsReferenceV39(x).state)
    .toBe("BTS_FLIGHT_IDENTITY_UNVERIFIED");
  }
 });
 it("canceled no runway, absent time no actual label, unreviewed local-to-UTC refused",()=>{
  const a=base();a.row.cancelled=true;
  expect(assessP4Gate5BtsReferenceV39(a).state).toBe("BTS_CANCELED_NO_WHEELSOFF");
  const b=base();b.row.wheelsOffLocalHHmm=null;
  expect(assessP4Gate5BtsReferenceV39(b).state).toBe("BTS_ACTUAL_WHEELSOFF_MISSING");
  const c=base();c.localToUtcConversionValidated=false;
  expect(assessP4Gate5BtsReferenceV39(c).state).toBe("BTS_UTC_RESOLUTION_UNVERIFIED");
  const d=base();d.computedActualWheelsOffUtc=null;
  expect(assessP4Gate5BtsReferenceV39(d).state).toBe("BTS_UTC_RESOLUTION_UNVERIFIED");
 });
 it("BTS row use/integrity must be independently checked",()=>{
  const x=base();x.btsSourceUseAndIntegrityReviewed=false;
  expect(assessP4Gate5BtsReferenceV39(x).state)
   .toBe("BTS_SOURCE_OR_USE_UNVERIFIED");
 });
 it("rejects impossible HHMM/day and evidence hashes",()=>{
  for(const f of [
   (x:P4BtsCrosscheckInputV39)=>{x.row.wheelsOffLocalHHmm="2460";},
   (x:P4BtsCrosscheckInputV39)=>{x.row.flightDate="2026-02-30";},
   (x:P4BtsCrosscheckInputV39)=>{x.row.originalRowSha256="abc";},
   (x:P4BtsCrosscheckInputV39)=>{x.link.independentLinkageEvidenceSha256="nope";},
   (x:P4BtsCrosscheckInputV39)=>{x.reviewedAtUtc="yesterday";}
  ]){
   const x=base();f(x);
   expect(()=>assessP4Gate5BtsReferenceV39(x)).toThrow();
  }
 });
 it("no paid calls and no lifecycle gates in this offline evidence parser",()=>{
  const v=assessP4Gate5BtsReferenceV39(base());
  expect(v.providerCalls).toBe(0);
  expect(v.databaseWrites).toBe(0);
  expect(v.comparableWorldwideFlightPopulation).toBe(false);
  expect(v.btsCrsDepIsScheduledRunwayTime).toBe(false);
  expect(v.btsDepTimeIsActualRunwayTime).toBe(false);
 });
});
