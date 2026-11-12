/**
 * Phase5 ONE Amendment E: content-verified original FIDS body -> existing
 * source/horizon-bound supplemental feature packet. This is an offline
 * PREPARATION helper: no provider HTTP, no database, no new queue and NO
 * external licensing/identity authentication conferred by this function.
 *
 * A same-flight authority must independently establish the V0079 original,
 * unique normalized member, recorded provider record ID, original selected T,
 * retention/Content use and exact signed source receipt BEFORE invoking.
 * Output must be reviewed, signed and included inside the immutable GH
 * packet by an independently approved packet owner.
 */
import {createHash} from "node:crypto";
import {verifyCanonicalFidsEnvelopeV39}
 from "./fidsEnvelopeCanonical_v39";
import {verifyStoredDecodedFidsBodyV39}
 from "./phase4Gate5DecodedFidsReadback_v39";
import {
 type P5EReviewedSupplementalBundle,
 type P5EReviewedSupplementalObservation
} from "./phase5AmendmentESignedSupplementalFeatures_v39";
const SHA=/^[0-9a-f]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const ICAO=/^[A-Z0-9]{4}$/;
const MAX_ROWS=900;
const FIELDS=[
 "operating_carrier","scheduled_arrival_utc",
 "provider_revised_departure_utc","reported_pre_departure_status"
] as const;
function hold(why:string):never{
 throw Error("REFUSED_P5_E_FIDS_ORIGINAL_COMPILER_"+why);
}
function stamp(v:unknown):number{
 if(typeof v!=="string"||!UTC.test(v)||
    !Number.isFinite(Date.parse(v))||
    new Date(Date.parse(v)).toISOString()!==v)
  hold("NONCANONICAL_SOURCE_UTC");
 return Date.parse(v);
}
function obj(v:unknown):Record<string,unknown>|null{
 return v!==null&&typeof v==="object"&&!Array.isArray(v)?
  v as Record<string,unknown>:null;
}
function string(v:unknown):string|null{
 return typeof v==="string"&&v.trim()?v.trim():null;
}
function deep(v:unknown,...path:string[]):unknown{
 let current=v;
 for(const key of path){
  const p=obj(current);
  if(!p)return null;
  current=p[key];
 }
 return current;
}
export interface P5EOriginalFidsCompilerInput{
 /** Stored original V0077 FIDS envelope, not a fabricated new response. */
 rawPayload:unknown;
 /** Exact preserved V0079 response_hash, which cannot be recomputed from
  * PostgreSQL jsonb insertion ordering. */
 persistedResponseHash:string;
 expectedBoundV0079ResponseHash:string;
 /** Independently joined decoded body SHA, from V0079 original binding. */
 expectedDecodedOriginalBodySha256:string;
 populationQueryId:string;
 flightInstanceId:string;
 /** Normalized source row's provider_record_key from SAME original. */
 providerRecordKey:string;
 /** Normalized row fields from SAME bound query; caller must verify join. */
 normalizedOperatingFlightNumber:string;
 originalSelectedDepartureUtc:string;
 normalizedOriginIcao:string;
 normalizedDestinationIcao:string;
 /** Actual DB committed available_at for bound flight_population member. */
 normalizedAvailableAtUtc:string;
 /** Independently reviewed source rights/retention/purpose receipt digest. */
 externallyReviewedSourceAndContentsSha256:string;
}
export function compileP5AmendmentEFidsOriginalFeaturesV39(
 input:P5EOriginalFidsCompilerInput
):{
 schema:"v39.phase5.e-original-fids-packet-compiler.v1";
 bundle:P5EReviewedSupplementalBundle;
 evidencedFidsFields:number;
 missingFidsFields:string[];
 sourceBodyAndCanonicalEnvelopeIntegrityVerified:true;
 sameOriginalNativeOperatingLegBoundOnly:true;
 sourceRightsIndependentlyCertifiedByThisFunction:false;
 physicalGateOutCertified:false;
 providerCalls:0;databaseWrites:0;phase6PaidGo:false;
}{
 const e=input?.rawPayload;
 if(!obj(e)||!SHA.test(input.persistedResponseHash??"")||
    !SHA.test(input.expectedBoundV0079ResponseHash??"")||
    input.persistedResponseHash!==input.expectedBoundV0079ResponseHash||
    !SHA.test(input.expectedDecodedOriginalBodySha256??"")||
    !SHA.test(input.externallyReviewedSourceAndContentsSha256??"")||
    !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(input.populationQueryId??"")||
    typeof input.flightInstanceId!=="string"||
    input.flightInstanceId.length<5||input.flightInstanceId.length>200||
    typeof input.providerRecordKey!=="string"||
    input.providerRecordKey.length<3||input.providerRecordKey.length>180||
    typeof input.normalizedOperatingFlightNumber!=="string"||
    !/^[A-Z0-9]{2}[0-9]{1,4}$/.test(input.normalizedOperatingFlightNumber)||
    !ICAO.test(input.normalizedOriginIcao??"")||
    !ICAO.test(input.normalizedDestinationIcao??""))
  hold("UNBOUND_SOURCE_OR_NORMALIZED_FLIGHT_IDENTITY");
 const selected=stamp(input.originalSelectedDepartureUtc);
 const available=stamp(input.normalizedAvailableAtUtc);
 const row={payload:e,persisted_response_hash:input.persistedResponseHash};
 if(verifyStoredDecodedFidsBodyV39(row)!=="verified"||
    verifyCanonicalFidsEnvelopeV39(e)!=="verified"||
    deep(e,"originalDecodedEntityBodyEvidence","bodySha256")!==
     input.expectedDecodedOriginalBodySha256)
  hold("ORIGINAL_DECODED_BODY_OR_ENVELOPE_INTEGRITY_UNVERIFIED");
 if(deep(e,"fidsRequestContract","direction")!=="Departure"||
    deep(e,"fidsRequestContract","airportIcao")!==
       input.normalizedOriginIcao)
  hold("ORIGINAL_REQUEST_DIRECTION_OR_AIRPORT_CHANGED");
 const retrieved=stamp(deep(e,"fetchedAtUtc"));
 if(retrieved>available)hold("FIDS_FETCHED_AFTER_MEMBER_AVAILABLE");
 const movements=e.departures;
 if(!Array.isArray(movements)||movements.length>MAX_ROWS)
  hold("ORIGINAL_DEPARTURE_COUNT_OUT_OF_BOUNDS");
 // Positive original-native flight ID is required for this exact first
 // compiler version. A conditional id-less source does NOT become a
 // physical flight merely via flight number/schedule matching.
 const candidates=movements.filter((f:unknown)=>
  deep(f,"id")===input.providerRecordKey);
 if(candidates.length!==1)
  hold("PROVIDER_NATIVE_ID_MISSING_OR_DUPLICATE_IN_ORIGINAL");
 const movement=candidates[0];
 const code=deep(movement,"codeshareStatus");
 if(code!=="IsOperator"&&code!==1)
  hold("NOT_POSITIVELY_IDENTIFIED_OPERATING_MOVEMENT");
 const flightRaw=string(deep(movement,"number"));
 const matched=flightRaw?.match(/^([A-Z0-9]{2})[ \t]*([0-9]{1,4})$/i);
 const canonical=matched?
  matched[1].toUpperCase()+(matched[2].replace(/^0+/,"")||"0"):null;
 if(canonical!==input.normalizedOperatingFlightNumber)
  hold("ORIGINAL_FLIGHT_NUMBER_NOT_BOUND_NORMALIZED_MEMBER");
 const origin=deep(movement,"departure","airport","icao");
 const destination=deep(movement,"arrival","airport","icao");
 if(origin!==input.normalizedOriginIcao||
    destination!==input.normalizedDestinationIcao||
    stamp(deep(movement,"departure","scheduledTime","utc"))!==selected)
  hold("ORIGINAL_ROUTE_OR_NATIVE_T_DRIFT");
 const values:Record<(typeof FIELDS)[number],unknown>={
  operating_carrier:deep(movement,"airline","icao"),
  scheduled_arrival_utc:deep(movement,"arrival","scheduledTime","utc"),
  provider_revised_departure_utc:deep(movement,"departure","revisedTime","utc"),
  reported_pre_departure_status:deep(movement,"status")
 };
 const observations:P5EReviewedSupplementalObservation[]=[];
 const missing:string[]=[];
 for(const field of FIELDS){
  const value=values[field];
  let acceptable=false;
  if(field==="scheduled_arrival_utc"||
     field==="provider_revised_departure_utc"){
   acceptable=typeof value==="string"&&UTC.test(value)&&
    Number.isFinite(Date.parse(value))&&
    new Date(Date.parse(value)).toISOString()===value;
  }else if(field==="operating_carrier"){
   acceptable=typeof value==="string"&&
    /^[A-Z0-9]{2,3}$/.test(value);
  }else{
   acceptable=typeof value==="string"&&
    value.length>0&&value.length<=80&&
    /^[A-Za-z0-9_: .-]+$/.test(value);
  }
  if(!acceptable){
   missing.push(field);
   continue;
  }
  observations.push({
   flightInstanceId:input.flightInstanceId,field,
   value:value as string,source:"AERODATABOX_FIDS",
   sourceRecordId:input.expectedBoundV0079ResponseHash,
   // This is the system fetch observation, NOT an actual runway event.
   observedAtUtc:new Date(retrieved).toISOString(),
   availableAtUtc:new Date(available).toISOString(),
   rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"
  });
 }
 const bundle:P5EReviewedSupplementalBundle={
  schema:"v39.phase5.e-signed-source-supplement.v1",
  flightInstanceId:input.flightInstanceId,
  populationQueryId:input.populationQueryId,
  originalResponseSha256:input.expectedBoundV0079ResponseHash,
  fields:[...FIELDS],
  observations,
  observationsSha256:createHash("sha256")
   .update(JSON.stringify(observations)).digest("hex"),
  externalSourceAndContentsReviewReceiptSha256:
   input.externallyReviewedSourceAndContentsSha256
 };
 return{
  schema:"v39.phase5.e-original-fids-packet-compiler.v1",
  bundle,evidencedFidsFields:observations.length,
  missingFidsFields:missing,
  sourceBodyAndCanonicalEnvelopeIntegrityVerified:true,
  sameOriginalNativeOperatingLegBoundOnly:true,
  sourceRightsIndependentlyCertifiedByThisFunction:false,
  physicalGateOutCertified:false,
  providerCalls:0,databaseWrites:0,phase6PaidGo:false
 };
}
