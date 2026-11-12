import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 normalizeGate05AdsbLolOfflineV39
} from "../server/lib/disruption/gate05ZeroCostAdsbEvidence_v39";
import {
 type P5AdsbPreInboundContextInputV39
} from "../server/lib/disruption/phase5AdsbLolCrossPhaseRotationEvidence_v39";
import {compileP5AdsbInboundOptionalFeatureCandidateV39}
 from "../server/lib/disruption/phase5AdsbInboundSignedSupplementCandidate_v39";
import {selectP5EReviewedSupplementalFeatures,
 type P5EReviewedSupplementalObservation,
 type P5EReviewedSupplementalBundle}
 from "../server/lib/disruption/phase5AmendmentESignedSupplementalFeatures_v39";
const H=(ch:string)=>ch.repeat(64);
const hash=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const SOURCE=H("a"),CAPTURE=H("b"),LINK=H("c"),RIGHTS=H("d");
function fixture(){
 const received="2027-01-02T07:58:10.000Z";
 const observed=normalizeGate05AdsbLolOfflineV39({
  now:Date.parse(received),
  ac:[{
   hex:"abc123",lat:1.36,lon:103.99,flight:"SIA123",
   alt_baro:8000,gs:190,type:"adsb_icao",seen_pos:2
  }]
 },received).points[0];
 const current={
  operatingLegId:"ADB-UNIQUE-OPERATING-OUTBOUND-0001",
  originIcao:"WSSS",destinationIcao:"YSSY",
  exactAeroDataBoxOperatingLegReviewed:true,
  originalAeroDataBoxResponseSha256:SOURCE,
  tailRegistration:"9VABC",aircraftIcao24Hex:"abc123",
  tailAssignmentAsOfUtc:"2027-01-02T07:00:00.000Z",
  aircraftLinkIndependentlyReviewed:true,
  aircraftSwapOrConflict:false
 };
 const context:P5AdsbPreInboundContextInputV39={
  flightInstanceId:"UNIQUE-FIDS-FLIGHT-ORIGINAL-0001",
  horizon:"T-6h",
  selectedNativeTUtc:"2027-01-02T14:00:00.000Z",
  cutoffUtc:"2027-01-02T08:00:00.000Z",
  issuedAtUtc:"2027-01-02T07:59:00.000Z",
  current,
  inbound:{
   ...current,
   operatingLegId:"ADB-UNIQUE-OPERATING-INBOUND-0000",
   originIcao:"OMAA",destinationIcao:"WSSS",
   originalAeroDataBoxResponseSha256:H("e")
  },
  inboundPosition:observed,
  source:{
   adsbSourceAndODbLReviewed:true,
   reviewedODbLAttributionAndDerivedDataPolicySha256:RIGHTS,
   liveAPIProductionAccessApproved:false,
   originalAeroDataBoxUseRightsReviewed:true
  },
  offlineResearchSourceProvenanceIndependentlyReviewed:true
 };
 const review={
  originalAdsbCaptureSha256:CAPTURE,
  reviewedPhysicalAircraftLinkSha256:LINK,
  reviewedODbLUseReviewSha256:RIGHTS
 };
 const makeBundle=(observations:P5EReviewedSupplementalObservation[]):
 P5EReviewedSupplementalBundle=>({
  schema:"v39.phase5.e-signed-source-supplement.v1",
  flightInstanceId:context.flightInstanceId,
  populationQueryId:"P5-PRIMARY-QUERY-000001",
  originalResponseSha256:SOURCE,
  externalSourceAndContentsReviewReceiptSha256:H("f"),
  observationsSha256:hash(observations),
  fields:["prior_aircraft_adsb_not_ground_reported",
   "prior_aircraft_adsb_position_age_seconds"],
  observations
 });
 const signed=(observations:P5EReviewedSupplementalObservation[])=>
  selectP5EReviewedSupplementalFeatures({
   flightInstanceId:context.flightInstanceId,horizon:"T-6h",
   selectedNativeTUtc:context.selectedNativeTUtc,
   cutoffUtc:context.cutoffUtc,
   issuedAtUtc:context.issuedAtUtc,
   sourceOriginalSha256:SOURCE,
   sourcePopulationQueryId:"P5-PRIMARY-QUERY-000001",
   memberAvailableAtUtc:"2027-01-02T07:00:00.000Z",
   originIcao:"WSSS",destinationIcao:"YSSY",
   bundle:makeBundle(observations)
  });
 return {context,review,signed};
}
describe("ADSB.lol reviewed incoming tail feature Stage14 signed-supplement research path",()=>{
 it("compiles from original validated position to existing optional signed PRE supplement, never directly inserts",()=>{
  const f=fixture();
  const c=compileP5AdsbInboundOptionalFeatureCandidateV39(f.context,f.review);
  expect(c.status).toBe("ASOF_SOURCE_METADATA_CANDIDATE_FOR_INDEPENDENT_SIGNATURE");
  expect(c.stage14SupplementPacketSigned).toBe(false);
  expect(c.sourceRightsCertifiedHere).toBe(false);
  expect(c.sourceCalls).toBe(0);expect(c.dbWrites).toBe(0);
  expect(c.observations).toHaveLength(2);
  expect(c.observations[0]).toMatchObject({
   source:"ADSB_LOL",field:"prior_aircraft_adsb_not_ground_reported",
   value:true,sourceRecordId:CAPTURE,airportIcao:"WSSS",
   reviewedPhysicalAircraftLinkSha256:LINK,
   reviewedODbLUseReviewSha256:RIGHTS
  });
  expect(c.observations[1]).toMatchObject({
   field:"prior_aircraft_adsb_position_age_seconds",value:52
  });
  const out=f.signed(c.observations);
  expect(out.schema).toBe("v39.phase5.e-supplement-receipt-feature-selection.v1");
  expect(out.features).toHaveLength(2);
  expect(out.features[0]).toMatchObject({
   featureName:"prior_aircraft_adsb_not_ground_reported",
   value:true,source:"ADSB_LOL",sourceVersion:CAPTURE
  });
  expect(out.features[1]).toMatchObject({
   featureName:"prior_aircraft_adsb_position_age_seconds",
   value:52,source:"ADSB_LOL",sourceVersion:CAPTURE
  });
  expect(out.independentSourceRightsCertifiedHere).toBe(false);
  expect(out.noProviderRequests).toBe(true);
  const json=JSON.stringify(out);
  for(const secret of ["abc123","SIA123","9VABC","103.99"])
   expect(json).not.toContain(secret);
 });
 it("source compiler refuses missing original SHA, fake independent review and mismatched ODbL hash",()=>{
  const f=fixture();
  for(const review of [
   {...f.review,originalAdsbCaptureSha256:"not-an-original"},
   {...f.review,reviewedPhysicalAircraftLinkSha256:""},
   {...f.review,reviewedODbLUseReviewSha256:H("0")}
  ])expect(()=>compileP5AdsbInboundOptionalFeatureCandidateV39(
   f.context,review)).toThrow("MISSING_EXTERNAL_ORIGINAL_AND_LINK_RIGHTS_REVIEW");
 });
 it("unlinked inbound, late receipt, tail swap or unknown rights cannot create optional PRE fields",()=>{
  const f=fixture();
  for(const context of [
   {...f.context,inbound:null},
   {...f.context,inbound:{...f.context.inbound!,
    aircraftSwapOrConflict:true}},
   {...f.context,inbound:{...f.context.inbound!,
    tailRegistration:"UNKNOWN"}},
   {...f.context,source:{...f.context.source,
    adsbSourceAndODbLReviewed:false}},
   {...f.context,issuedAtUtc:"2027-01-02T07:40:00.000Z"}
  ]){
   const c=compileP5AdsbInboundOptionalFeatureCandidateV39(
    context,f.review);
   expect(c.observations).toHaveLength(0);
   expect(c.status).toBe("MISSING_OR_UNVERIFIED_ASOF_SOURCE");
  }
 });
 it("signed selector refuses backdated, unreviewed or fabricated late/age/source values",()=>{
  const f=fixture();
  const c=compileP5AdsbInboundOptionalFeatureCandidateV39(
   f.context,f.review);
  const attempts=[
   c.observations.map(o=>({...o,reviewedPhysicalAircraftLinkSha256:null})),
   c.observations.map(o=>({...o,reviewedODbLUseReviewSha256:null})),
   c.observations.map(o=>({...o,source:"REVIEWED_HISTORIC_CONTEXT" as const})),
   c.observations.map(o=>({...o,airportIcao:"OMAA"})),
   c.observations.map(o=>({...o,availableAtUtc:"2027-01-02T08:01:00.000Z"})),
   c.observations.map(o=>({...o,observedAtUtc:"2027-01-02T07:30:00.000Z"})),
   c.observations.map(o=>({...o,value:o.field==="prior_aircraft_adsb_position_age_seconds"?0:o.value}))
  ];
  for(const observations of attempts)
   expect(()=>f.signed(observations)).toThrow();
 });
 it("ADS-B ground-reported status is not actual previous gate-in, and unknown state stays null",()=>{
  const f=fixture();
  f.context.inboundPosition={
   ...f.context.inboundPosition!,groundState:"GROUND_REPORTED"
  };
  const ground=compileP5AdsbInboundOptionalFeatureCandidateV39(
   f.context,f.review);
  expect(ground.observations[0].value).toBe(false);
  f.context.inboundPosition={
   ...f.context.inboundPosition!,groundState:"UNKNOWN"
  };
  const unknown=compileP5AdsbInboundOptionalFeatureCandidateV39(
   f.context,f.review);
  expect(unknown.observations[0].value).toBeNull();
  const selected=f.signed(unknown.observations);
  expect(selected.missing.prior_aircraft_adsb_not_ground_reported)
   .toBe("SOURCE_VALUE_MISSING");
 });
});
