import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {selectP5EReviewedSupplementalFeatures,
 type P5EReviewSupplementRequest,
 type P5EReviewedSupplementalObservation}
 from "../server/lib/disruption/phase5AmendmentESignedSupplementalFeatures_v39";
const sha=(c:string)=>c.repeat(64);
const fid="leg:ci:e:rich:001";
const original=sha("a"),query="c23e4567-e89b-42d3-a456-426614174013";
const native="2035-11-25T12:00:00.000Z";
const fids=(field:P5EReviewedSupplementalObservation["field"],
 value:string|number|null):P5EReviewedSupplementalObservation=>({
 flightInstanceId:fid,field,value,source:"AERODATABOX_FIDS",
 sourceRecordId:original,
 observedAtUtc:"2035-11-25T05:29:00.000Z",
 availableAtUtc:"2035-11-25T05:30:00.000Z",
 rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"
});
const metar=(field:P5EReviewedSupplementalObservation["field"],
 value:string|number|null):P5EReviewedSupplementalObservation=>({
 flightInstanceId:fid,field,value,source:"NOAA_METAR",
 sourceRecordId:sha("b"),airportIcao:"WSSS",stationIcao:"WSSS",
 stationDistanceKm:0,
 observedAtUtc:"2035-11-25T05:20:00.000Z",
 availableAtUtc:"2035-11-25T05:35:00.000Z",
 rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"
});
const taf=(field:P5EReviewedSupplementalObservation["field"],
 value:string|number|null,airport:string):P5EReviewedSupplementalObservation=>({
 flightInstanceId:fid,field,value,source:"NOAA_TAF",
 sourceRecordId:sha("c"),airportIcao:airport,stationIcao:airport,
 observedAtUtc:"2035-11-25T04:00:00.000Z",
 availableAtUtc:"2035-11-25T04:15:00.000Z",
 validFromUtc:"2035-11-25T10:00:00.000Z",
 validToUtc:"2035-11-25T18:00:00.000Z",
 rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"
});
const history=(field:P5EReviewedSupplementalObservation["field"],
 value:string|number|null):P5EReviewedSupplementalObservation=>({
 flightInstanceId:fid,field,value,source:"REVIEWED_HISTORIC_CONTEXT",
 sourceRecordId:sha("d"),
 observedAtUtc:"2035-11-25T04:50:00.000Z",
 availableAtUtc:"2035-11-25T05:10:00.000Z",
 validFromUtc:"2035-11-25T05:00:00.000Z",validToUtc:null,
 rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"
});
function fixture():P5EReviewSupplementRequest{
 const observations=[
  fids("operating_carrier","SQ"),
  fids("scheduled_arrival_utc","2035-11-25T21:20:00.000Z"),
  fids("provider_revised_departure_utc","2035-11-25T12:18:00.000Z"),
  fids("reported_pre_departure_status","BOARDING"),
  metar("origin_metar_visibility_m",9000),
  metar("origin_metar_wind_kt",14),
  taf("origin_taf_flight_category","VFR","WSSS"),
  taf("destination_taf_flight_category","IFR","YSSY"),
  history("prior_aircraft_turnaround_minutes",52),
  history("prior_route_departure_delay_median_minutes",13),
  history("prior_airport_departure_delay_median_minutes",9),
  history("airport_congestion_1h",42)
 ];
 return{
  flightInstanceId:fid,horizon:"T-6h",
  selectedNativeTUtc:native,cutoffUtc:"2035-11-25T06:00:00.000Z",
  issuedAtUtc:"2035-11-25T05:59:00.000Z",
  sourceOriginalSha256:original,sourcePopulationQueryId:query,
  memberAvailableAtUtc:"2035-11-25T05:30:00.000Z",
  originIcao:"WSSS",destinationIcao:"YSSY",
  bundle:{
   schema:"v39.phase5.e-signed-source-supplement.v1",
   flightInstanceId:fid,populationQueryId:query,
   originalResponseSha256:original,
   observationsSha256:createHash("sha256").update(
    JSON.stringify(observations)).digest("hex"),
   externalSourceAndContentsReviewReceiptSha256:sha("e"),
   fields:observations.map(x=>x.field),
   observations
  }
 };
}
function amend(r:P5EReviewSupplementRequest){
 r.bundle.observationsSha256=createHash("sha256").update(
  JSON.stringify(r.bundle.observations)).digest("hex");
 return r;
}
describe("Phase5 same-Stage14 reviewed 12 supplementary prediction features",()=>{
 it("materializes 12 distinct as-of inputs across FIDS, METAR, TAF and history",()=>{
  const r=selectP5EReviewedSupplementalFeatures(fixture());
  expect(r.features).toHaveLength(12);
  expect(new Set(r.features.map(f=>f.featureName)).size).toBe(12);
  expect(r.features.find(f=>f.featureName==="provider_revised_departure_utc")?.value)
   .toBe("2035-11-25T12:18:00.000Z");
  expect(r.features.find(f=>f.featureName==="origin_metar_wind_kt")?.value)
   .toBe(14);
  expect(r.features.find(f=>f.featureName==="prior_route_departure_delay_median_minutes")?.value)
   .toBe(13);
  expect(r.features.every(f=>f.informationAvailableAt instanceof Date)).toBe(true);
  expect(r.noProviderRequests).toBe(true);
  expect(r.independentSourceRightsCertifiedHere).toBe(false);
 });
 it("nulls a late available weather value rather than leaking after actual issue",()=>{
  const x=fixture(),w=x.bundle.observations.find(
   v=>v.field==="origin_metar_wind_kt")!;
  w.availableAtUtc="2035-11-25T06:03:00.000Z";
  const r=selectP5EReviewedSupplementalFeatures(amend(x));
  expect(r.features.find(f=>f.featureName==="origin_metar_wind_kt")?.value)
   .toBeNull();
  expect(r.missing.origin_metar_wind_kt).toBe("NOT_AVAILABLE_BY_ISSUE");
 });
 it("nulls entirely missing optional features rather than dropping flight",()=>{
  const x=fixture();
  x.bundle.observations=x.bundle.observations.filter(
   v=>v.field!=="prior_aircraft_turnaround_minutes");
  const r=selectP5EReviewedSupplementalFeatures(amend(x));
  expect(r.missing.prior_aircraft_turnaround_minutes).toBe("NO_RECORD");
  expect(r.features.find(f=>f.featureName==="prior_aircraft_turnaround_minutes")?.value)
   .toBeNull();
 });
 it("does not resolve contradictory equal-time FIDS statuses by arbitrary order",()=>{
  const x=fixture();
  x.bundle.observations.push(fids("reported_pre_departure_status","CANCELLED"));
  const r=selectP5EReviewedSupplementalFeatures(amend(x));
  expect(r.missing.reported_pre_departure_status)
   .toBe("AMBIGUOUS_LATEST_SOURCE");
  expect(r.features.find(f=>f.featureName==="reported_pre_departure_status")?.value)
   .toBeNull();
 });
 it("refuses different original SHA, flight, member time or changed signed bytes",()=>{
  const x=fixture();
  x.bundle.originalResponseSha256=sha("f");
  expect(()=>selectP5EReviewedSupplementalFeatures(x))
   .toThrow("FROZEN_SOURCE_IDENTITY_AND_CONTENT_DIGEST_NOT_MATCHED");
  const y=fixture();y.bundle.observations[0].value="TRAMPER";
  expect(()=>selectP5EReviewedSupplementalFeatures(y))
   .toThrow("FROZEN_SOURCE_IDENTITY_AND_CONTENT_DIGEST_NOT_MATCHED");
  const z=fixture();
  z.memberAvailableAtUtc="2035-11-25T06:01:00.000Z";
  expect(()=>selectP5EReviewedSupplementalFeatures(z))
   .toThrow("BOUND_FIDS_MEMBER_NOT_KNOWN_AT_ISSUE");
 });
 it("never uses free-floating FIDS statuses detached from bound source original",()=>{
  const x=fixture();x.bundle.observations[0].sourceRecordId=sha("f");
  expect(()=>selectP5EReviewedSupplementalFeatures(amend(x)))
   .toThrow("FIDS_SUPPLEMENT_NOT_SAME_BOUND_ORIGINAL");
  const y=fixture();y.bundle.observations[0].availableAtUtc=
   "2035-11-25T05:45:00.000Z";
  expect(()=>selectP5EReviewedSupplementalFeatures(amend(y)))
   .toThrow("FIDS_SUPPLEMENT_NOT_SAME_BOUND_ORIGINAL");
 });
 it("rejects wrong NOAA airport, stale METAR and TAF outside original departure",()=>{
  const x=fixture(),m=x.bundle.observations.find(
   v=>v.field==="origin_metar_wind_kt")!;
  m.stationIcao="YSSY";
  expect(()=>selectP5EReviewedSupplementalFeatures(amend(x)))
   .toThrow("WEATHER_AIRPORT_OR_SOURCE_MISMATCH");
  const y=fixture(),stale=y.bundle.observations.find(
   v=>v.field==="origin_metar_wind_kt")!;
  stale.observedAtUtc="2035-11-24T22:00:00.000Z";
  expect(()=>selectP5EReviewedSupplementalFeatures(amend(y)))
   .toThrow("METAR_STATION_OR_STALENESS_NOT_VERIFIED");
  const z=fixture(),t=z.bundle.observations.find(
   v=>v.field==="destination_taf_flight_category")!;
  t.validToUtc="2035-11-25T11:00:00.000Z";
  expect(()=>selectP5EReviewedSupplementalFeatures(amend(z)))
   .toThrow("TAF_NOT_ISSUED_FOR_ORIGINAL_NATIVE_DEPARTURE");
 });
 it("rejects future/expired historical values and invalid numeric weather",()=>{
  const x=fixture(),h=x.bundle.observations.find(
   v=>v.field==="airport_congestion_1h")!;
  h.validFromUtc="2035-11-25T06:05:00.000Z";
  expect(()=>selectP5EReviewedSupplementalFeatures(amend(x)))
   .toThrow("HISTORY_NOT_VALID_AS_OF_ISSUE");
  const y=fixture(),met=y.bundle.observations.find(
   v=>v.field==="origin_metar_wind_kt")!;
  met.value=9999;
  expect(()=>selectP5EReviewedSupplementalFeatures(amend(y)))
   .toThrow("UNREVIEWED_FIELD_SOURCE_OR_VALUE");
 });
 it("T24/T90 have their own actual issued clocks; later values never backfill",()=>{
  const x=fixture();x.horizon="T-24h";
  x.issuedAtUtc="2035-11-24T11:59:00.000Z";
  x.cutoffUtc="2035-11-24T12:00:00.000Z";
  x.memberAvailableAtUtc="2035-11-24T11:20:00.000Z";
  // The packet still truthfully records FIDS being first available the next day.
  expect(()=>selectP5EReviewedSupplementalFeatures(x))
   .toThrow("FIDS_SUPPLEMENT_NOT_SAME_BOUND_ORIGINAL");
  const y=fixture();y.horizon="T-90m";
  y.cutoffUtc="2035-11-25T10:30:00.000Z";
  y.issuedAtUtc="2035-11-25T10:29:00.000Z";
  expect(selectP5EReviewedSupplementalFeatures(y).features)
   .toHaveLength(12);
 });
});
