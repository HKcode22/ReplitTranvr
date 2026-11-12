import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {P4_G5_NOAA_METAR_SCHEMA_V39,
 type P4G5NoaaMetarReceiptV39}
 from "../server/lib/disruption/phase4Gate5NoaaMetarReceipt_v39";
import type {HistoricalFeatureRow}
 from "../server/lib/disruption/historicalFeatureStore_v3";
import {
 compileP5ExistingNoaaMetarToE,
 compileP5ExistingHistoryToE,
 draftP5ECombinedExistingSourcesPacket
} from "../server/lib/disruption/phase5AmendmentENoaaHistoricalReceiptCompiler_v39";
import {selectP5EReviewedSupplementalFeatures,
 type P5EReviewedSupplementalBundle}
 from "../server/lib/disruption/phase5AmendmentESignedSupplementalFeatures_v39";
const hash=(s:string)=>s.repeat(64);
const fid="leg:ci:weather:hist:001";
const now="2035-11-25T05:59:00.000Z";
const native="2035-11-25T12:00:00.000Z";
function metar():P4G5NoaaMetarReceiptV39{
 return{
  schema:P4_G5_NOAA_METAR_SCHEMA_V39,
  source:"NOAA_AVIATIONWEATHER_METAR_JSON",
  sourceUrl:"https://aviationweather.gov/api/data/metar",
  airportIcao:"WSSS",
  sourceVersion:"NOAA_AVIATIONWEATHER_API_METAR_JSON_V4",
  collectedAtUtc:"2035-11-25T05:30:00.000Z",
  durableArtifactReadAtUtc:"2035-11-25T05:35:00.000Z",
  weatherObservationAtUtc:"2035-11-25T05:00:00.000Z",
  weatherIssuedAtUtc:"2035-11-25T05:05:00.000Z",
  noaaReceiptClockAtUtc:null,
  sourceBodySha256:hash("a"),sourceRecordSha256:hash("b"),
  metrics:{visibilitySm:6,windSpeedKt:15},
  originalSourceFlightIdentityAbsent:true,
  frozenFlightPreCertified:false,scientificGate5Passed:false
 };
}
function weather(x=metar()){
 return compileP5ExistingNoaaMetarToE({
  flightInstanceId:fid,originAirportIcao:"WSSS",
  actualPredictionIssuedAtUtc:now,
  receipt:x,independentlyReviewedSourcePurposeSha256:hash("c")
 });
}
function historic(name:HistoricalFeatureRow["featureName"],
 entity:HistoricalFeatureRow["entityType"],id:string,
 value:number):HistoricalFeatureRow{
 return{
  entityType:entity,entityId:id,featureName:name,
  featureValue:value,featureText:null,source:"historical_project_v39",
  sourceVersion:"v39-reviewed-asof",sourceTimestamp:"2035-11-25T04:00:00.000Z",
  informationAvailableTimestamp:"2035-11-25T05:20:00.000Z",
  validFrom:"2035-11-25T04:10:00.000Z",
  validTo:null,batchId:"prior:day:ci",payloadSha256:hash("d")
 };
}
const rows=()=>[
 historic("prior_aircraft_turnaround_minutes","tail","9V-CI",45),
 historic("prior_route_departure_delay_median_minutes","route","WSSS:YSSY",22),
 historic("prior_airport_departure_delay_median_minutes","airport","WSSS",9),
 historic("airport_congestion_1h","airport","WSSS",36)
];
function history(r=rows()){
 return compileP5ExistingHistoryToE({
  flightInstanceId:fid,originAirportIcao:"WSSS",
  reviewedRouteEntityId:"WSSS:YSSY",
  reviewedTailEntityId:"9V-CI",
  actualPredictionIssuedAtUtc:now,
  retrievedAsOfRows:r,
  independentlyReviewedSourcePurposeSha256:hash("e")
 });
}
function fids():P5EReviewedSupplementalBundle{
 const names=[
  "operating_carrier","scheduled_arrival_utc",
  "provider_revised_departure_utc","reported_pre_departure_status"
 ] as const;
 const values=["SIA","2035-11-25T20:30:00.000Z",
  "2035-11-25T12:28:00.000Z","Expected"];
 const o=names.map((field,i)=>({
  flightInstanceId:fid,field,value:values[i],
  source:"AERODATABOX_FIDS" as const,
  sourceRecordId:hash("f"),
  observedAtUtc:"2035-11-25T05:01:00.000Z",
  availableAtUtc:"2035-11-25T05:02:00.000Z",
  rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW" as const
 }));
 return{
  schema:"v39.phase5.e-signed-source-supplement.v1",
  flightInstanceId:fid,populationQueryId:"c23e4567-e89b-42d3-a456-426614174013",
  originalResponseSha256:hash("f"),
  externalSourceAndContentsReviewReceiptSha256:hash("a"),
  fields:[...names],observations:o,
  observationsSha256:createHash("sha256")
   .update(JSON.stringify(o)).digest("hex")
 };
}
describe("Phase5 existing NOAA + historic data into original signed Stage14 PRE",()=>{
 it("reuses actual NOAA receipt, converts 6 statute miles to meters, keeps wind in knots",()=>{
  const x=weather();
  expect(x.observations.map(z=>[z.field,z.value])).toEqual([
   ["origin_metar_visibility_m",9656],
   ["origin_metar_wind_kt",15]
  ]);
  expect(x.missingFields).toEqual([]);
  expect(x.observations.every(y=>y.availableAtUtc==="2035-11-25T05:35:00.000Z"))
   .toBe(true);
  expect(x.sourceContentsRightsCertifiedHere).toBe(false);
  expect(x.paidProviderCalls).toBe(0);
 });
 it("rejects wrong airport and impossible source clock; preserves unknown durable weather",()=>{
  const a=metar();a.airportIcao="OMAA";
  expect(()=>weather(a)).toThrow("UNVERIFIED_OR_WRONG_AIRPORT_NOAA_RECEIPT");
  const b=metar();b.weatherIssuedAtUtc="2035-11-25T05:45:00.000Z";
  expect(()=>weather(b)).toThrow("FUTURE_OR_REVERSED_METAR_SOURCE_CLOCK");
  const c=metar();c.durableArtifactReadAtUtc=null;
  expect(weather(c).observations).toEqual([]);
  expect(weather(c).missingFields).toHaveLength(2);
  const d=metar();d.durableArtifactReadAtUtc="2035-11-25T06:05:00.000Z";
  expect(weather(d).observations).toEqual([]);
  expect(weather(d).missingFields).toHaveLength(2);
 });
 it("does not invent visibility for '+' or missing numeric METAR",()=>{
  const x=metar();delete x.metrics.visibilitySm;
  const r=weather(x);
  expect(r.missingFields).toContain("origin_metar_visibility_m");
  expect(r.observations).toHaveLength(1);
 });
 it("reuses four independently entity-bound bitemporal historic fields",()=>{
  const r=history();
  expect(r.observations.map(x=>[x.field,x.value])).toEqual([
   ["prior_aircraft_turnaround_minutes",45],
   ["prior_route_departure_delay_median_minutes",22],
   ["prior_airport_departure_delay_median_minutes",9],
   ["airport_congestion_1h",36]
  ]);
  expect(r.missingFields).toEqual([]);
  expect(r.sourceContentsRightsCertifiedHere).toBe(false);
  expect(r.databaseWrites).toBe(0);
 });
 it("refuses wrong route/tail cross joins and source future validity",()=>{
  const x=rows();x[1].entityId="OTHER:ROUTE";
  expect(()=>history(x)).toThrow("HISTORICAL_ENTITY_UNVERIFIED_OR_WRONG_FLIGHT");
  const y=rows();y[0].validTo="2035-11-25T04:59:00.000Z";
  const r=history(y);
  expect(r.missingFields).toContain("prior_aircraft_turnaround_minutes");
  const z=rows();z[3].informationAvailableTimestamp="2035-11-25T06:01:00.000Z";
  expect(history(z).missingFields).toContain("airport_congestion_1h");
  const w=rows();w[1].sourceTimestamp="2035-11-25T05:45:00.000Z";
  expect(()=>history(w)).toThrow("HISTORICAL_SOURCE_TIME_VALUE_OR_DIGEST_UNVERIFIED");
 });
 it("creates ONE existing 12-field supplement with TAF unavailable, no fake values",()=>{
  const m=weather(),hist=history();
  const joint=draftP5ECombinedExistingSourcesPacket({
   existingV0079FidsBundle:fids(),
   weather:m.observations,historical:hist.observations,
   externallyReviewedWholePacketUseSha256:hash("9")
  });
  expect(joint.bundle.fields).toHaveLength(12);
  expect(joint.bundle.observations).toHaveLength(10);
  expect(joint.tafFeaturesAvailableFromThisAdapter).toBe(false);
  const selected=selectP5EReviewedSupplementalFeatures({
   flightInstanceId:fid,horizon:"T-6h",
   selectedNativeTUtc:native,cutoffUtc:"2035-11-25T06:00:00.000Z",
   issuedAtUtc:now,sourceOriginalSha256:hash("f"),
   sourcePopulationQueryId:"c23e4567-e89b-42d3-a456-426614174013",
   memberAvailableAtUtc:"2035-11-25T05:02:00.000Z",
   originIcao:"WSSS",destinationIcao:"YSSY",
   bundle:joint.bundle
  });
  expect(selected.features).toHaveLength(12);
  expect(selected.missing.origin_taf_flight_category).toBe("NO_RECORD");
  expect(selected.missing.destination_taf_flight_category).toBe("NO_RECORD");
  expect(selected.features.find(z=>z.featureName==="origin_metar_visibility_m")?.value)
   .toBe(9656);
  expect(selected.features.find(z=>z.featureName==="prior_route_departure_delay_median_minutes")?.value)
   .toBe(22);
  expect(joint.independentContentsRightsCertifiedHere).toBe(false);
  expect(joint.phase6PaidGo).toBe(false);
 });
 it("rejects supplementary same-field collisions and another flight's weather",()=>{
  const x=weather();
  x.observations[0].flightInstanceId="other:flight";
  expect(()=>draftP5ECombinedExistingSourcesPacket({
   existingV0079FidsBundle:fids(),
   weather:x.observations,historical:history().observations,
   externallyReviewedWholePacketUseSha256:hash("9")
  })).toThrow("UNVERIFIED_OR_CROSS_FLIGHT_PACKET_MERGE");
  const y=weather();
  expect(()=>draftP5ECombinedExistingSourcesPacket({
   existingV0079FidsBundle:fids(),
   weather:[y.observations[0],y.observations[0]],
   historical:history().observations,
   externallyReviewedWholePacketUseSha256:hash("9")
  })).toThrow("SOURCE_FIELD_OWNERSHIP_COLLISION");
 });
});
