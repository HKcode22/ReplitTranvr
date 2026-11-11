/**
 * Amendment E: one real-source, first PRE feature bridge, not a new collector.
 * Converts the SAME normalized FIDS flight_population row that existing
 * Stage14 independently binds to its immutable provider original into
 * two categorical model inputs (origin/destination ICAO).
 *
 * No estimated departure, arrival outcome, gate-out, weather, tail, route
 * history or status is inferred here. Missing destination stays missing
 * without invalidating otherwise source-qualified PRE.
 * The existing as-of selector controls issuance cutoff and rights metadata.
 *
 * Authorization and retention are external; a SHA alone proves neither.
 */
import {
 selectP5AmendmentEAsOfFeaturesOffline,
 type P5EAsOfFieldDecision,
 type P5EAsOfObservation
} from "./phase5AmendmentEAsOfFeatureSelectionOffline_v39";
import type {PreFeatureInput,PreHorizon}
 from "./preSnapshotBuilder_v3";
const SHA=/^[0-9a-f]{64}$/;
const ICAO=/^[A-Z0-9]{4}$/;
function hold(s:string):never{throw Error("REFUSED_P5_E_STAGE14_BOUND_ROUTE_"+s);}
function iso(x:unknown,required:boolean):string|null{
 if(x===null||x===undefined){
  if(required)hold("MEMBER_AVAILABLE_AT_MISSING");
  return null;
 }
 const date=x instanceof Date?x:
  typeof x==="string"?new Date(x):null;
 if(!date||!Number.isFinite(date.getTime()))
  hold("SOURCE_TIMESTAMP_MALFORMED");
 return date.toISOString();
}
export interface P5EStage14BoundMemberRouteRequest{
 flightInstanceId:string;
 horizon:PreHorizon;
 selectedNativeTUtc:string;
 cutoffUtc:string;
 issuedAtUtc:string;
 expectedOriginalResponseSha256:string;
 expectedPopulationQueryId:string;
 originalSourceUseIndependentlyReviewedOutsideThisFunction:true;
 normalizedMember:{
  analytic_identity_id:unknown;
  population_query_id:unknown;
  response_hash:unknown;
  dep_airport_icao:unknown;
  arr_airport_icao:unknown;
  available_at:unknown;
  fids_retrieval_utc:unknown;
 };
}
export interface P5EStage14BoundRouteResult{
 schema:"v39.phase5.e-stage14-bound-route-categorical.v1";
 features:PreFeatureInput[];
 decisions:P5EAsOfFieldDecision[];
 sourceOriginalSha256:string;
 databaseMemberIdentityMatched:true;
 independentLicenseVerifiedHere:false;
 physicalGateOutOutcomeCertified:false;
 weatherAndHistorySourceBridgeComplete:false;
}
export function selectP5EStage14BoundRouteFeatures(
 r:P5EStage14BoundMemberRouteRequest
):P5EStage14BoundRouteResult{
 const m=r?.normalizedMember;
 if(!r||!m||typeof r.flightInstanceId!=="string"||
   r.flightInstanceId.length<5||r.flightInstanceId.length>200||
   !SHA.test(r.expectedOriginalResponseSha256??"")||
   typeof r.expectedPopulationQueryId!=="string"||
   !/^[0-9a-f-]{36}$/.test(r.expectedPopulationQueryId)||
   r.originalSourceUseIndependentlyReviewedOutsideThisFunction!==true||
   m.analytic_identity_id!==r.flightInstanceId||
   m.population_query_id!==r.expectedPopulationQueryId||
   m.response_hash!==r.expectedOriginalResponseSha256)
  hold("SOURCE_OR_FLIGHT_IDENTITY_NOT_MATCHED");
 const origin=m.dep_airport_icao;
 if(typeof origin!=="string"||!ICAO.test(origin))
  hold("FIDS_ORIGIN_INVALID");
 const dest=typeof m.arr_airport_icao==="string"&&
  ICAO.test(m.arr_airport_icao)?m.arr_airport_icao:null;
 const whenAvailable=iso(m.available_at,true);
 const whenObserved=iso(m.fids_retrieval_utc,false);
 const observations:P5EAsOfObservation[]=[
  {
   flightInstanceId:r.flightInstanceId,
   field:"origin_icao",value:origin,
   source:"AERODATABOX_FIDS",
   sourceRecordId:r.expectedOriginalResponseSha256,
   observedAtUtc:whenObserved,availableAtUtc:whenAvailable,
   rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"
  }
 ];
 if(dest!==null){
  observations.push({
   flightInstanceId:r.flightInstanceId,
   field:"destination_icao",value:dest,
   source:"AERODATABOX_FIDS",
   sourceRecordId:r.expectedOriginalResponseSha256,
   observedAtUtc:whenObserved,availableAtUtc:whenAvailable,
   rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"
  });
 }
 const selected=selectP5AmendmentEAsOfFeaturesOffline({
  flightInstanceId:r.flightInstanceId,horizon:r.horizon,
  selectedNativeTUtc:r.selectedNativeTUtc,cutoffUtc:r.cutoffUtc,
  issuedAtUtc:r.issuedAtUtc,
  fields:["origin_icao","destination_icao"],observations
 });
 return{
  schema:"v39.phase5.e-stage14-bound-route-categorical.v1",
  features:selected.builderInputs,decisions:selected.fields,
  sourceOriginalSha256:r.expectedOriginalResponseSha256,
  databaseMemberIdentityMatched:true,
  independentLicenseVerifiedHere:false,
  physicalGateOutOutcomeCertified:false,
  weatherAndHistorySourceBridgeComplete:false
 };
}
