import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {addCanonicalFidsEnvelopeHashV39}
 from "../server/lib/disruption/fidsEnvelopeCanonical_v39";
import {compileP5AmendmentEFidsOriginalFeaturesV39,
 type P5EOriginalFidsCompilerInput}
 from "../server/lib/disruption/phase5AmendmentEFidsOriginalFeatureCompiler_v39";
import {selectP5EReviewedSupplementalFeatures}
 from "../server/lib/disruption/phase5AmendmentESignedSupplementalFeatures_v39";
const sha=(s:string|Buffer)=>createHash("sha256").update(s).digest("hex");
const fid="leg:ci:20261112:001",query="c23e4567-e89b-42d3-a456-426614174013";
const native="2035-11-25T12:00:00.000Z";
const memberAvailable="2035-11-25T05:02:00.000Z";
const fetched="2035-11-25T05:01:00.000Z";
function flight(){
 return{
  id:"native-001",number:"SQ 0078",codeshareStatus:"IsOperator",
  airline:{icao:"SIA"},
  departure:{
   airport:{icao:"WSSS"},
   scheduledTime:{utc:native},
   revisedTime:{utc:"2035-11-25T12:19:00.000Z"}
  },
  arrival:{
   airport:{icao:"YSSY"},
   scheduledTime:{utc:"2035-11-25T20:25:00.000Z"}
  },
  status:"Expected"
 };
}
function input(flights:Record<string,unknown>[]=[flight()]):P5EOriginalFidsCompilerInput{
 const decoded={departures:flights,arrivals:[]};
 const bytes=Buffer.from(JSON.stringify(decoded),"utf8");
 const decodedHash=sha(bytes);
 const raw=addCanonicalFidsEnvelopeHashV39({
  airport:"WSSS",
  fidsRequestContract:{schema:"v39.fids-request-frame.application-intent.v1",
   direction:"Departure",airportIcao:"WSSS"},
  payloadRepresentation:"RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES",
  originalHttpWireBytesPreserved:false,
  originalDecodedEntityBodyPreserved:true,
  originalDecodedEntityBodyEvidence:{
   schema:"v39.fids-fetch-decoded-source-body.v1",
   representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
   bodySha256:decodedHash,bodyLengthBytes:bytes.length,
   bodyBase64:bytes.toString("base64")
  },
  departures:flights,arrivals:[],
  fetchedAtUtc:fetched
 });
 const responseHash=sha(JSON.stringify(raw));
 return{
  rawPayload:raw,persistedResponseHash:responseHash,
  expectedBoundV0079ResponseHash:responseHash,
  expectedDecodedOriginalBodySha256:decodedHash,
  populationQueryId:query,flightInstanceId:fid,
  providerRecordKey:"native-001",
  normalizedOperatingFlightNumber:"SQ78",
  originalSelectedDepartureUtc:native,
  normalizedOriginIcao:"WSSS",normalizedDestinationIcao:"YSSY",
  normalizedAvailableAtUtc:memberAvailable,
  externallyReviewedSourceAndContentsSha256:"b".repeat(64)
 };
}
function compile(x:P5EOriginalFidsCompilerInput){
 return compileP5AmendmentEFidsOriginalFeaturesV39(x);
}
describe("Phase5 actual V0079-decoded-source FIDS feature packet compiler (offline)",()=>{
 it("converts integrity-checked existing bound original into four verified as-of PRE fields",()=>{
  const i=input(),r=compile(i);
  expect(r.evidencedFidsFields).toBe(4);
  expect(r.missingFidsFields).toEqual([]);
  expect(r.bundle.observations.map(x=>x.field)).toEqual([
   "operating_carrier","scheduled_arrival_utc",
   "provider_revised_departure_utc","reported_pre_departure_status"
  ]);
  expect(r.bundle.observations.every(x=>
   x.sourceRecordId===i.persistedResponseHash&&
   x.availableAtUtc===memberAvailable&&
   x.observedAtUtc===fetched)).toBe(true);
  expect(r.sourceBodyAndCanonicalEnvelopeIntegrityVerified).toBe(true);
  expect(r.physicalGateOutCertified).toBe(false);
  expect(r.sourceRightsIndependentlyCertifiedByThisFunction).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(JSON.stringify(r)).not.toContain("native-001");
  expect(JSON.stringify(r)).not.toContain("SQ 0078");
  const asof=selectP5EReviewedSupplementalFeatures({
   flightInstanceId:fid,horizon:"T-6h",
   selectedNativeTUtc:native,cutoffUtc:"2035-11-25T06:00:00.000Z",
   issuedAtUtc:"2035-11-25T05:58:00.000Z",
   sourceOriginalSha256:i.expectedBoundV0079ResponseHash,
   sourcePopulationQueryId:query,
   memberAvailableAtUtc:memberAvailable,
   originIcao:"WSSS",destinationIcao:"YSSY",bundle:r.bundle
  });
  expect(asof.features.map(x=>x.value)).toEqual([
   "SIA","2035-11-25T20:25:00.000Z",
   "2035-11-25T12:19:00.000Z","Expected"
  ]);
 });
 it("preserves missing source status and revised time as NULL without inventing",()=>{
  const f=flight();delete (f as Partial<typeof f>).status;
  delete (f.departure as Partial<typeof f.departure>).revisedTime;
  const r=compile(input([f]));
  expect(r.evidencedFidsFields).toBe(2);
  expect(r.missingFidsFields).toEqual([
   "provider_revised_departure_utc","reported_pre_departure_status"
  ]);
  expect(r.bundle.fields).toHaveLength(4);
 });
 it("cannot reclassify numeric unknown source status into an invented status",()=>{
  const f={...flight(),status:10};
  const r=compile(input([f]));
  expect(r.bundle.observations.some(x=>x.field==="reported_pre_departure_status"))
   .toBe(false);
 });
 it("rejects altered original, missing decoded body digest, and stale binding",()=>{
  const i=input();
  const raw=i.rawPayload as Record<string,any>;
  raw.departures[0].status="Departed";
  expect(()=>compile(i)).toThrow("ORIGINAL_DECODED_BODY_OR_ENVELOPE_INTEGRITY_UNVERIFIED");
  const j=input();
  j.expectedDecodedOriginalBodySha256="f".repeat(64);
  expect(()=>compile(j)).toThrow("ORIGINAL_DECODED_BODY_OR_ENVELOPE_INTEGRITY_UNVERIFIED");
  const k=input();
  k.expectedBoundV0079ResponseHash="e".repeat(64);
  expect(()=>compile(k)).toThrow("UNBOUND_SOURCE_OR_NORMALIZED_FLIGHT_IDENTITY");
 });
 it("rejects reused native provider ID in same original and marketing codeshare",()=>{
  const a=flight(),b={...flight(),number:"SQ 0080"};
  expect(()=>compile(input([a,b]))).toThrow(
   "PROVIDER_NATIVE_ID_MISSING_OR_DUPLICATE_IN_ORIGINAL");
  const m={...flight(),codeshareStatus:"IsCodeshared"};
  expect(()=>compile(input([m]))).toThrow("NOT_POSITIVELY_IDENTIFIED_OPERATING_MOVEMENT");
 });
 it("rejects foreign airport, retimed original selected T and mismatched flight number",()=>{
  const f=flight();
  const bad={...f,departure:{
   ...f.departure,airport:{icao:"OMAA"}
  }};
  expect(()=>compile(input([bad]))).toThrow("ORIGINAL_ROUTE_OR_NATIVE_T_DRIFT");
  const k=input();k.originalSelectedDepartureUtc="2035-11-25T12:30:00.000Z";
  expect(()=>compile(k)).toThrow("ORIGINAL_ROUTE_OR_NATIVE_T_DRIFT");
  const u=input();u.normalizedOperatingFlightNumber="SQ79";
  expect(()=>compile(u)).toThrow("ORIGINAL_FLIGHT_NUMBER_NOT_BOUND_NORMALIZED_MEMBER");
 });
 it("rejects source member time preceding retrieval and mismatched provider ID",()=>{
  const i=input();i.normalizedAvailableAtUtc="2035-11-25T04:59:00.000Z";
  expect(()=>compile(i)).toThrow("FIDS_FETCHED_AFTER_MEMBER_AVAILABLE");
  const j=input();j.providerRecordKey="native-missing";
  expect(()=>compile(j)).toThrow("PROVIDER_NATIVE_ID_MISSING_OR_DUPLICATE_IN_ORIGINAL");
 });
 it("does not turn legacy unverified decoded source into verified fields",()=>{
  const i=input();
  const raw=i.rawPayload as Record<string,unknown>;
  delete raw.canonicalEnvelopeSha256;
  delete raw.canonicalEnvelopeHashSchema;
  expect(()=>compile(i)).toThrow("ORIGINAL_DECODED_BODY_OR_ENVELOPE_INTEGRITY_UNVERIFIED");
 });
});
