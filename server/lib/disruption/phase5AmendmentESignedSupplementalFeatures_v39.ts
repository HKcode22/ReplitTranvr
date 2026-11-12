/**
 * ONE Amendment E: optional reviewed time-safe feature receipts ALREADY
 * bundled in the existing immutable, SHA-pinned GH source roster packet.
 * This module does not fetch sources, write the DB, certify licenses or
 * prove that self-declared metadata came from a real provider. Admission
 * requires independent packet/source review and a separate owner feature
 * release; this only checks the numerical/identity/time safety of inputs.
 */
import {createHash} from "node:crypto";
import {
 selectP5AmendmentEAsOfFeaturesOffline,
 type P5EAsOfObservation,type P5EPreField
} from "./phase5AmendmentEAsOfFeatureSelectionOffline_v39";
import type {PreFeatureInput,PreHorizon}
 from "./preSnapshotBuilder_v3";
const SHA=/^[0-9a-f]{64}$/;
const ICAO=/^[A-Z0-9]{4}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const FIDS=new Set<P5EPreField>([
 "operating_carrier","scheduled_arrival_utc",
 "provider_revised_departure_utc","reported_pre_departure_status"
]);
const METAR=new Set<P5EPreField>([
 "origin_metar_visibility_m","origin_metar_wind_kt"
]);
const TAF=new Set<P5EPreField>([
 "origin_taf_flight_category","destination_taf_flight_category"
]);
const HIST=new Set<P5EPreField>([
 "prior_aircraft_turnaround_minutes",
 "prior_route_departure_delay_median_minutes",
 "prior_airport_departure_delay_median_minutes","airport_congestion_1h"
]);
export const P5_E_SUPPLEMENTAL_FIELDS=[...FIDS,...METAR,...TAF,...HIST];
type SupplementalField=typeof P5_E_SUPPLEMENTAL_FIELDS[number];
export interface P5EReviewedSupplementalObservation
 extends P5EAsOfObservation{
 field:SupplementalField;
 /** Forecast validity or historical valid-time interval, if required. */
 validFromUtc?:string|null;
 validToUtc?:string|null;
 airportIcao?:string|null;
 stationIcao?:string|null;
 stationDistanceKm?:number|null;
}
export interface P5EReviewedSupplementalBundle{
 schema:"v39.phase5.e-signed-source-supplement.v1";
 flightInstanceId:string;
 populationQueryId:string;
 originalResponseSha256:string;
 /** Content-integrity check, NOT independent source/license attestation. */
 observationsSha256:string;
 /** Must be independently justified outside this function; self-claim isn't evidence. */
 externalSourceAndContentsReviewReceiptSha256:string;
 fields:SupplementalField[];
 observations:P5EReviewedSupplementalObservation[];
}
export interface P5EReviewSupplementRequest{
 flightInstanceId:string;horizon:PreHorizon;
 selectedNativeTUtc:string;cutoffUtc:string;issuedAtUtc:string;
 sourceOriginalSha256:string;sourcePopulationQueryId:string;
 /** The originally bound normalized flight_population.available_at DB time. */
 memberAvailableAtUtc:string;
 originIcao:string;destinationIcao:string|null;
 bundle:P5EReviewedSupplementalBundle;
}
const hold=(why:string):never=>{
 throw Error("REFUSED_P5_E_SIGNED_SUPPLEMENT_"+why);
};
function timestamp(v:unknown){
 const literal:string=typeof v==="string"?v:hold("NONCANONICAL_UTC");
 if(!ISO.test(literal)||!Number.isFinite(Date.parse(literal))||
    new Date(Date.parse(literal)).toISOString()!==literal)
  hold("NONCANONICAL_UTC");
 return Date.parse(literal);
}
const hash=(value:unknown)=>createHash("sha256")
 .update(JSON.stringify(value)).digest("hex");
function validValue(o:P5EReviewedSupplementalObservation):boolean{
 const v=o.value;
 if(v===null)return true; // as-of selector explicitly preserves missing
 if(FIDS.has(o.field)){
  if(o.field==="scheduled_arrival_utc"||
     o.field==="provider_revised_departure_utc"){
   if(typeof v!=="string")return false;
   timestamp(v);return true;
  }
  return typeof v==="string"&&v.length>0&&v.length<=80&&
   /^[A-Za-z0-9_: .-]+$/.test(v);
 }
 if(METAR.has(o.field)){
  if(typeof v!=="number"||!Number.isFinite(v))return false;
  return o.field==="origin_metar_visibility_m"?
   v>=0&&v<=100000:v>=0&&v<=250;
 }
 if(TAF.has(o.field))
  return typeof v==="string"&&
   ["VFR","MVFR","IFR","LIFR"].includes(v);
 return typeof v==="number"&&Number.isFinite(v)&&
  (o.field==="airport_congestion_1h"?v>=0&&v<=100000:
   o.field==="prior_aircraft_turnaround_minutes"?v>=0&&v<=2880:
   v>=-1440&&v<=2880);
}
/** Converts already reviewed, signed receipts to PRE builder inputs. */
export function selectP5EReviewedSupplementalFeatures(
 r:P5EReviewSupplementRequest
):{
 schema:"v39.phase5.e-supplement-receipt-feature-selection.v1";
 features:PreFeatureInput[];
 missing:Record<string,string|null>;
 independentSourceRightsCertifiedHere:false;
 noProviderRequests:true;
}{
 const b=r?.bundle;
 if(!b||b.schema!=="v39.phase5.e-signed-source-supplement.v1"||
    !SHA.test(r.sourceOriginalSha256??"")||
    !SHA.test(b.originalResponseSha256??"")||
    b.originalResponseSha256!==r.sourceOriginalSha256||
    !SHA.test(b.observationsSha256??"")||
    !SHA.test(b.externalSourceAndContentsReviewReceiptSha256??"")||
    b.flightInstanceId!==r.flightInstanceId||
    b.populationQueryId!==r.sourcePopulationQueryId||
    !ICAO.test(r.originIcao??"")||
    (r.destinationIcao!==null&&!ICAO.test(r.destinationIcao??""))||
    !Array.isArray(b.fields)||b.fields.length<1||
    b.fields.length>P5_E_SUPPLEMENTAL_FIELDS.length||
    new Set(b.fields).size!==b.fields.length||
    b.fields.some(x=>!P5_E_SUPPLEMENTAL_FIELDS.includes(x))||
    !Array.isArray(b.observations)||b.observations.length>48||
    hash(b.observations)!==b.observationsSha256)
  hold("FROZEN_SOURCE_IDENTITY_AND_CONTENT_DIGEST_NOT_MATCHED");
 const issue=timestamp(r.issuedAtUtc),
  native=timestamp(r.selectedNativeTUtc);
 const member=timestamp(r.memberAvailableAtUtc);
 timestamp(r.cutoffUtc);
 if(member>issue)hold("BOUND_FIDS_MEMBER_NOT_KNOWN_AT_ISSUE");
 const obs:P5EAsOfObservation[]=[];
 for(const row of b.observations){
  if(!row||row.flightInstanceId!==r.flightInstanceId||
     !b.fields.includes(row.field)||
     !P5_E_SUPPLEMENTAL_FIELDS.includes(row.field)||
     !SHA.test(row.sourceRecordId??"")||
     row.rightsDisposition!=="EXTERNALLY_REVIEWED_ALLOW"||
     !validValue(row))
   hold("UNREVIEWED_FIELD_SOURCE_OR_VALUE");
  const available=timestamp(row.availableAtUtc);
  const observed:number=row.observedAtUtc===null?
   hold("UNVERIFIED_OBSERVATION_CLOCK"):timestamp(row.observedAtUtc);
  if(observed>available)
   hold("UNVERIFIED_OBSERVATION_CLOCK");
  if(FIDS.has(row.field)){
   if(row.source!=="AERODATABOX_FIDS"||
      row.sourceRecordId!==r.sourceOriginalSha256||
      available!==member)
    hold("FIDS_SUPPLEMENT_NOT_SAME_BOUND_ORIGINAL");
  }else if(METAR.has(row.field)||TAF.has(row.field)){
   const metar=METAR.has(row.field);
   const expectedAirport=
    row.field==="destination_taf_flight_category"?
    r.destinationIcao:r.originIcao;
   if(!expectedAirport||
      row.source!==(metar?"NOAA_METAR":"NOAA_TAF")||
      row.airportIcao!==expectedAirport||
      !ICAO.test(row.stationIcao??"")||
      row.stationIcao!==expectedAirport)
    hold("WEATHER_AIRPORT_OR_SOURCE_MISMATCH");
   if(metar){
    if(typeof row.stationDistanceKm!=="number"||
       !Number.isFinite(row.stationDistanceKm)||
       row.stationDistanceKm<0||row.stationDistanceKm>30||
       observed>issue||observed<issue-6*3_600_000)
     hold("METAR_STATION_OR_STALENESS_NOT_VERIFIED");
   }else{
    const from=timestamp(row.validFromUtc),
     to=timestamp(row.validToUtc);
    if(observed>issue||from>native||to<native||from>to)
     hold("TAF_NOT_ISSUED_FOR_ORIGINAL_NATIVE_DEPARTURE");
   }
  }else if(HIST.has(row.field)){
   const from=timestamp(row.validFromUtc);
   const to=row.validToUtc===null||row.validToUtc===undefined?
    null:timestamp(row.validToUtc);
   if(row.source!=="REVIEWED_HISTORIC_CONTEXT"||
      from>issue||(to!==null&&to<=issue))
    hold("HISTORY_NOT_VALID_AS_OF_ISSUE");
  }else hold("FIELD_NOT_PREDECLARED");
  // Latest eligible observation wins; late arrivals turn into missing.
  obs.push({
   flightInstanceId:row.flightInstanceId,field:row.field,
   value:row.value,source:row.source,
   sourceRecordId:row.sourceRecordId,
   observedAtUtc:row.observedAtUtc,
   availableAtUtc:row.availableAtUtc,
   rightsDisposition:row.rightsDisposition
  });
 }
 const selected=selectP5AmendmentEAsOfFeaturesOffline({
  flightInstanceId:r.flightInstanceId,horizon:r.horizon,
  selectedNativeTUtc:r.selectedNativeTUtc,
  cutoffUtc:r.cutoffUtc,issuedAtUtc:r.issuedAtUtc,
  fields:b.fields,observations:obs
 });
 return{
  schema:"v39.phase5.e-supplement-receipt-feature-selection.v1",
  features:selected.builderInputs,
  missing:Object.fromEntries(selected.fields.map(x=>
   [x.field,x.missingReason])),
  independentSourceRightsCertifiedHere:false,
  noProviderRequests:true
 };
}
