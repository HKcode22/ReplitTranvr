/**
 * Phase5 ONE Amendment E — reuse saved NOAA METAR receipts and the existing
 * bitemporal historical feature store. Pure conversion into the PR #593
 * signed-supplemental PRE packet, NO weather HTTP, new DB or writer.
 *
 * These are DRAFT observations: caller must independently verify the
 * original NOAA receipt, real durable artifact completion, history source
 * truth, provider/NOAA data rights, and the final signed GH packet.
 */
import {createHash} from "node:crypto";
import {selectP4DurableWeatherAsOf,
 type P4DurableWeatherReceipt}
 from "./phase4Gate5WeatherAsOfFeature_v39";
import {P4_G5_NOAA_METAR_SCHEMA_V39,
 type P4G5NoaaMetarReceiptV39}
 from "./phase4Gate5NoaaMetarReceipt_v39";
import type {HistoricalFeatureRow}
 from "./historicalFeatureStore_v3";
import {P5_E_SUPPLEMENTAL_FIELDS,
 type P5EReviewedSupplementalObservation,
 type P5EReviewedSupplementalBundle}
 from "./phase5AmendmentESignedSupplementalFeatures_v39";
const SHA=/^[0-9a-f]{64}$/;
const ICAO=/^[A-Z0-9]{4}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
function hold(s:string):never{
 throw Error("REFUSED_P5_E_EXISTING_WEATHER_HISTORY_"+s);
}
function t(v:unknown):number{
 if(typeof v!=="string"||!ISO.test(v)||
    !Number.isFinite(Date.parse(v))||
    new Date(Date.parse(v)).toISOString()!==v)
  hold("NONCANONICAL_PROSPECTIVE_SOURCE_UTC");
 return Date.parse(v);
}
const h=(v:unknown)=>createHash("sha256")
 .update(JSON.stringify(v)).digest("hex");

export interface P5EExistingMetarSourceRequest{
 flightInstanceId:string;
 originAirportIcao:string;
 actualPredictionIssuedAtUtc:string;
 /** Already decoded by Phase4's existing NOAA METAR original parser. */
 receipt:P4G5NoaaMetarReceiptV39|null;
 independentlyReviewedSourcePurposeSha256:string;
}
export function compileP5ExistingNoaaMetarToE(
 r:P5EExistingMetarSourceRequest
):{
 schema:"v39.phase5.e-existing-noaa-metar-feature-draft.v1";
 fields:readonly ["origin_metar_visibility_m","origin_metar_wind_kt"];
 observations:P5EReviewedSupplementalObservation[];
 missingFields:string[];
 weatherReceiptSourceAuthenticityCertifiedHere:false;
 sourceContentsRightsCertifiedHere:false;
 paidProviderCalls:0;databaseWrites:0;
}{
 if(!r||typeof r.flightInstanceId!=="string"||
    r.flightInstanceId.length<5||r.flightInstanceId.length>200||
    !ICAO.test(r.originAirportIcao??"")||
    !SHA.test(r.independentlyReviewedSourcePurposeSha256??""))
  hold("INVALID_REVIEWED_WEATHER_SCOPE");
 const issued=t(r.actualPredictionIssuedAtUtc);
 const fields=["origin_metar_visibility_m","origin_metar_wind_kt"] as const;
 if(r.receipt===null)
  return{schema:"v39.phase5.e-existing-noaa-metar-feature-draft.v1",
   fields,observations:[],missingFields:[...fields],
   weatherReceiptSourceAuthenticityCertifiedHere:false,
   sourceContentsRightsCertifiedHere:false,
   paidProviderCalls:0,databaseWrites:0};
 const x=r.receipt;
 if(x.schema!==P4_G5_NOAA_METAR_SCHEMA_V39||
    x.source!=="NOAA_AVIATIONWEATHER_METAR_JSON"||
    x.sourceVersion!=="NOAA_AVIATIONWEATHER_API_METAR_JSON_V4"||
    x.sourceUrl!=="https://aviationweather.gov/api/data/metar"||
    x.airportIcao!==r.originAirportIcao||
    !SHA.test(x.sourceBodySha256??"")||
    !SHA.test(x.sourceRecordSha256??"")||
    x.originalSourceFlightIdentityAbsent!==true)
  hold("UNVERIFIED_OR_WRONG_AIRPORT_NOAA_RECEIPT");
 const observed=t(x.weatherObservationAtUtc),
  sourceIssued=t(x.weatherIssuedAtUtc),
  collected=t(x.collectedAtUtc);
 if(observed>sourceIssued||sourceIssued>collected)
  hold("FUTURE_OR_REVERSED_METAR_SOURCE_CLOCK");
 if(x.durableArtifactReadAtUtc!==null){
  const dur=t(x.durableArtifactReadAtUtc);
  if(dur<collected)
   hold("NOAA_DURABLE_EVIDENCE_BEFORE_FETCH_COMPLETED");
 }
 // Reuse the original Phase4 weather-as-of review, including METAR 6h
 // age, positive real source issue clock and persisted-before-issue.
 const saved:P4DurableWeatherReceipt[]=
  x.durableArtifactReadAtUtc===null?[]:[{
   source:"live_metar",airportIcao:x.airportIcao,
   sourceVersion:x.sourceVersion,contentSha256:x.sourceRecordSha256,
   firstAvailableAtUtc:new Date(collected),
   durablyStoredAtUtc:new Date(t(x.durableArtifactReadAtUtc)),
   issueTimeUtc:new Date(sourceIssued),
   observationTimeUtc:new Date(observed),
   validFromUtc:null,validToUtc:null,
   stationIcao:x.airportIcao,stationDistanceKm:0,
   gridCellId:null,featureValue:x.metrics
  }];
 const selected=selectP4DurableWeatherAsOf(saved,{
  airportIcao:r.originAirportIcao,cutoffUtc:new Date(issued),
  frozenGrid:"gfs"
 });
 const observations:P5EReviewedSupplementalObservation[]=[];
 if(selected.selected){
  const vis=x.metrics.visibilitySm,wind=x.metrics.windSpeedKt;
  // NOAA reports visib in statute miles; target field is meters.
  // Never mislabel "10+" or unavailable/over-range visibility as 10 km.
  const meters=typeof vis==="number"&&Number.isFinite(vis)?
   Math.round(vis*1609.344):null;
  if(meters!==null&&meters>=0&&meters<=100_000)
   observations.push({
    flightInstanceId:r.flightInstanceId,
    field:"origin_metar_visibility_m",value:meters,
    source:"NOAA_METAR",sourceRecordId:x.sourceRecordSha256,
    observedAtUtc:x.weatherObservationAtUtc,
    availableAtUtc:x.durableArtifactReadAtUtc,
    rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW",
    airportIcao:x.airportIcao,stationIcao:x.airportIcao,
    stationDistanceKm:0
   });
  if(typeof wind==="number"&&Number.isFinite(wind)&&
     wind>=0&&wind<=250)
   observations.push({
    flightInstanceId:r.flightInstanceId,
    field:"origin_metar_wind_kt",value:wind,
    source:"NOAA_METAR",sourceRecordId:x.sourceRecordSha256,
    observedAtUtc:x.weatherObservationAtUtc,
    availableAtUtc:x.durableArtifactReadAtUtc,
    rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW",
    airportIcao:x.airportIcao,stationIcao:x.airportIcao,
    stationDistanceKm:0
   });
 }
 return{
  schema:"v39.phase5.e-existing-noaa-metar-feature-draft.v1",
  fields,observations,
  missingFields:fields.filter(f=>!observations.some(x=>x.field===f)),
  weatherReceiptSourceAuthenticityCertifiedHere:false,
  sourceContentsRightsCertifiedHere:false,
  paidProviderCalls:0,databaseWrites:0
 };
}

const HIST_FIELDS={
 prior_aircraft_turnaround_minutes:"tail",
 prior_route_departure_delay_median_minutes:"route",
 prior_airport_departure_delay_median_minutes:"airport",
 airport_congestion_1h:"airport"
} as const;
type HistoryField=keyof typeof HIST_FIELDS;
export interface P5EExistingHistorySourceRequest{
 flightInstanceId:string;
 originAirportIcao:string;
 /** MUST be the exact signed frozen route entity lookup key, not guessed. */
 reviewedRouteEntityId:string|null;
 /** Optional independently authenticated tail, never inferred from flight number. */
 reviewedTailEntityId:string|null;
 actualPredictionIssuedAtUtc:string;
 /** Already retrieved from the existing bitemporal historicalFeatureStore. */
 retrievedAsOfRows:readonly HistoricalFeatureRow[];
 independentlyReviewedSourcePurposeSha256:string;
}
export function compileP5ExistingHistoryToE(
 r:P5EExistingHistorySourceRequest
):{
 schema:"v39.phase5.e-existing-bitemporal-history-feature-draft.v1";
 observations:P5EReviewedSupplementalObservation[];
 missingFields:string[];
 historicalSourceAuthenticityCertifiedHere:false;
 sourceContentsRightsCertifiedHere:false;
 paidProviderCalls:0;databaseWrites:0;
}{
 if(!r||typeof r.flightInstanceId!=="string"||
    r.flightInstanceId.length<5||r.flightInstanceId.length>200||
    !ICAO.test(r.originAirportIcao??"")||
    !SHA.test(r.independentlyReviewedSourcePurposeSha256??"")||
    !Array.isArray(r.retrievedAsOfRows)||
    r.retrievedAsOfRows.length>32)
  hold("INVALID_HISTORICAL_SOURCE_REVIEW_SCOPE");
 const issued=t(r.actualPredictionIssuedAtUtc);
 const observations:P5EReviewedSupplementalObservation[]=[];
 const fields=Object.keys(HIST_FIELDS) as HistoryField[];
 for(const row of r.retrievedAsOfRows){
  if(!row||!Object.hasOwn(HIST_FIELDS,row.featureName))
   hold("UNREVIEWED_HISTORICAL_FEATURE_NAME");
  const field=row.featureName as HistoryField;
  const requiredType=HIST_FIELDS[field];
  const requiredId=requiredType==="airport"?r.originAirportIcao:
   requiredType==="route"?r.reviewedRouteEntityId:
   r.reviewedTailEntityId;
  if(!requiredId||row.entityType!==requiredType||
     row.entityId!==requiredId)
   hold("HISTORICAL_ENTITY_UNVERIFIED_OR_WRONG_FLIGHT");
  const available=t(row.informationAvailableTimestamp),
   from=t(row.validFrom);
  const end=row.validTo===null?null:t(row.validTo);
  const sourceAt=row.sourceTimestamp===null?null:t(row.sourceTimestamp);
  if(end!==null&&end<=from)
   hold("INVALID_BITEMPORAL_VALIDITY_INTERVAL");
  // Database outages must throw in the existing historic store. Null,
  // post-issue and legitimately absent source facts remain NULL.
  if(sourceAt===null||row.featureValue===null||
     available>issued||from>issued||
     (end!==null&&end<=issued))
   continue;
  if(sourceAt>available||
     !SHA.test(row.payloadSha256??"")||
     typeof row.sourceVersion!=="string"||!row.sourceVersion.trim()||
     typeof row.source!=="string"||!row.source.trim()||
     !Number.isFinite(row.featureValue))
   hold("HISTORICAL_SOURCE_TIME_VALUE_OR_DIGEST_UNVERIFIED");
  observations.push({
   flightInstanceId:r.flightInstanceId,field,
   value:row.featureValue,
   source:"REVIEWED_HISTORIC_CONTEXT",
   sourceRecordId:row.payloadSha256!,
   observedAtUtc:row.sourceTimestamp,
   availableAtUtc:row.informationAvailableTimestamp,
   rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW",
   validFromUtc:row.validFrom,validToUtc:row.validTo
  });
 }
 return{
  schema:"v39.phase5.e-existing-bitemporal-history-feature-draft.v1",
  observations,
  missingFields:fields.filter(f=>!observations.some(x=>x.field===f)),
  historicalSourceAuthenticityCertifiedHere:false,
  sourceContentsRightsCertifiedHere:false,
  paidProviderCalls:0,databaseWrites:0
 };
}
/**
 * Assemble FIDS + NOAA + historic AS-OF receipts into ONE existing
 * 12-field supplement packet. Optional already-durable NOAA TAF as-of
 * observations may be included; absent or ambiguous TAF remains MISSING.
 * This produces a DRAFT; separate frozen GH packet/release still required.
 */
export function draftP5ECombinedExistingSourcesPacket(
 input:{
  existingV0079FidsBundle:P5EReviewedSupplementalBundle;
  weather:P5EReviewedSupplementalObservation[];
  historical:P5EReviewedSupplementalObservation[];
  /** Only from the existing already-durable NOAA TAF decoder, optional. */
  taf?:P5EReviewedSupplementalObservation[];
  externallyReviewedWholePacketUseSha256:string;
 }
):{
 schema:"v39.phase5.e-combined-existing-receipts-draft.v1";
 bundle:P5EReviewedSupplementalBundle;
 tafFeaturesAvailableFromThisAdapter:boolean;
 independentContentsRightsCertifiedHere:false;
 paidProviderCalls:0;databaseWrites:0;phase6PaidGo:false;
}{
 const f=input?.existingV0079FidsBundle;
 const extras=[...(input?.weather??[]),...(input?.historical??[]),
  ...(input?.taf??[])];
 if(!f||f.schema!=="v39.phase5.e-signed-source-supplement.v1"||
    !SHA.test(f.originalResponseSha256??"")||
    !SHA.test(f.observationsSha256??"")||
    !SHA.test(input.externallyReviewedWholePacketUseSha256??"")||
    h(f.observations)!==f.observationsSha256||
    f.observations.length>4||extras.length>32||
    extras.some(x=>!x||x.flightInstanceId!==f.flightInstanceId||
     !["NOAA_METAR","NOAA_TAF","REVIEWED_HISTORIC_CONTEXT"].includes(x.source)||
     !SHA.test(x.sourceRecordId??"")||
     !P5_E_SUPPLEMENTAL_FIELDS.includes(x.field)))
  hold("UNVERIFIED_OR_CROSS_FLIGHT_PACKET_MERGE");
 const observed=[...f.observations,...extras];
 if(observed.length>48||new Set(observed.map(x=>x.field)).size!==
    observed.length||
    f.observations.some(x=>x.source!=="AERODATABOX_FIDS")||
    extras.some(x=>x.source==="NOAA_METAR"&&
     !["origin_metar_visibility_m","origin_metar_wind_kt"].includes(x.field))||
    extras.some(x=>x.source==="REVIEWED_HISTORIC_CONTEXT"&&
     !Object.hasOwn(HIST_FIELDS,x.field))||
    extras.some(x=>x.source==="NOAA_TAF"&&
     !["origin_taf_flight_category",
       "destination_taf_flight_category"].includes(x.field)))
  hold("SOURCE_FIELD_OWNERSHIP_COLLISION");
 const allFields=[...P5_E_SUPPLEMENTAL_FIELDS];
 const bundle:P5EReviewedSupplementalBundle={
  schema:"v39.phase5.e-signed-source-supplement.v1",
  flightInstanceId:f.flightInstanceId,
  populationQueryId:f.populationQueryId,
  originalResponseSha256:f.originalResponseSha256,
  externalSourceAndContentsReviewReceiptSha256:
   input.externallyReviewedWholePacketUseSha256,
  fields:allFields,observations:observed,
  observationsSha256:h(observed)
 };
 return{
  schema:"v39.phase5.e-combined-existing-receipts-draft.v1",
  bundle,tafFeaturesAvailableFromThisAdapter:
   extras.some(x=>x.source==="NOAA_TAF"),
  independentContentsRightsCertifiedHere:false,
  paidProviderCalls:0,databaseWrites:0,phase6PaidGo:false
 };
}
