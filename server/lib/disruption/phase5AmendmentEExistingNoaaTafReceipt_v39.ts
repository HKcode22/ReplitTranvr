/**
 * Phase5 ONE Amendment E: a BOUNDED already-fetched NOAA AviationWeather
 * TAF JSON response -> pre-issue, original-selected-T flight categories.
 * No HTTP, database access, packet signature or rights certification here.
 *
 * NOAA example schema: icaoId, issueTime (UTC), validTimeFrom/To Unix sec,
 * fcsts[].timeFrom/timeTo Unix sec, visib statute miles, clouds[] bases ft.
 * Only an unambiguous prevailing (null/FM) forecast is classified.
 * Overlapping TEMPO/PROB/BECMG, missing visibility, missing ceiling evidence,
 * post-issue artifact or contradictory source rows produce explicit missing.
 */
import {createHash} from "node:crypto";
import type {P5EReviewedSupplementalObservation}
 from "./phase5AmendmentESignedSupplementalFeatures_v39";

const SHA=/^[0-9a-f]{64}$/;
const ICAO=/^[A-Z]{4}$/;
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
type Category="VFR"|"MVFR"|"IFR"|"LIFR";
type TafField="origin_taf_flight_category"|"destination_taf_flight_category";
const FIELDS=["origin_taf_flight_category",
 "destination_taf_flight_category"] as const;
const hold=(s:string):never=>{
 throw Error("REFUSED_P5_E_NOAA_TAF_REVIEWED_SOURCE_"+s);
};
function instant(v:unknown):number{
 if(typeof v!=="string"||!UTC.test(v)||
    !Number.isFinite(Date.parse(v))||
    new Date(Date.parse(v)).toISOString()!==v)
  hold("INVALID_CANONICAL_SOURCE_OR_ISSUE_TIME");
 return Date.parse(v);
}
function noaaIssued(v:unknown):number{
 if(typeof v!=="string")hold("TAF_ISSUED_TIME_MISSING");
 return instant(v.replace(" ","T"));
}
function seconds(v:unknown):number{
 if(typeof v!=="number"||!Number.isSafeInteger(v)||
    v<946684800||v>4102444800)
  hold("TAF_INVALID_UNIX_SECONDS");
 return v*1000;
}
function item(v:unknown):Record<string,unknown>|null{
 return v&&typeof v==="object"&&!Array.isArray(v)?
  v as Record<string,unknown>:null;
}
function sm(v:unknown):number|null{
 if(typeof v==="number")return Number.isFinite(v)&&v>=0&&v<=100?v:null;
 if(typeof v!=="string")return null;
 // NOAA "6+" denotes visibility above six statute miles. The lower bound
 // suffices only for the VFR visibility threshold; not an exact distance.
 if(v==="6+"||v==="P6")return 6.01;
 if(!/^(?:[0-9]{1,2})(?:\.[0-9]{1,2})?$/.test(v))return null;
 const n=Number(v);return n>=0&&n<=100?n:null;
}
function prevailingCategory(row:Record<string,unknown>):Category|null{
 const vis=sm(row.visib);
 const clouds=row.clouds;
 if(vis===null||!Array.isArray(clouds)||clouds.length<1||
    clouds.length>16)return null;
 let ceiling=Infinity,saw=false;
 for(const cloud of clouds){
  const x=item(cloud);
  if(!x||typeof x.cover!=="string")return null;
  if(["FEW","SCT","SKC","CLR","NSC"].includes(x.cover)){
   saw=true;continue;
  }
  if(!["BKN","OVC","VV"].includes(x.cover)||
     typeof x.base!=="number"||!Number.isFinite(x.base)||
     x.base<0||x.base>65000)
   return null;
  saw=true;
  ceiling=Math.min(ceiling,x.base);
 }
 if(!saw)return null;
 if(vis<1||ceiling<500)return "LIFR";
 if(vis<3||ceiling<1000)return "IFR";
 if(vis<=5||ceiling<=3000)return "MVFR";
 return "VFR";
}
export interface P5ENoaaTafAlreadyDurableReviewInput{
 flightInstanceId:string;
 originAirportIcao:string;
 destinationAirportIcao:string|null;
 originalSelectedNativeDepartureUtc:string;
 actualPredictionIssuedAtUtc:string;
 sourceJsonText:string;
 /** completion time of the exact fetched response, NOT simulated issue time */
 fetchedAtUtc:string;
 /** actual later read of completed durable GH artifact, not local file save */
 durableArtifactReadAtUtc:string|null;
 /** independently compared against retained raw source bytes */
 independentlyReviewedResponseBytesSha256:string;
 /** separately reviewed receipt metadata; digest is NOT a license */
 independentlyReviewedPurposeSha256:string;
}
export interface P5ENoaaTafDraft{
 schema:"v39.phase5.e-existing-noaa-taf-asof-draft.v1";
 fields:readonly TafField[];
 observations:P5EReviewedSupplementalObservation[];
 missingFields:TafField[];
 missingReasons:Record<TafField,string|null>;
 originalTafSourceResponseSha256:string;
 sourceRightsCertifiedHere:false;
 durableArtifactAuthenticityCertifiedHere:false;
 providerCalls:0;databaseWrites:0;phase6PaidGo:false;
}
export function compileP5AlreadyDurableNoaaTafAsOfV39(
 input:P5ENoaaTafAlreadyDurableReviewInput
):P5ENoaaTafDraft{
 if(!input||typeof input.flightInstanceId!=="string"||
    input.flightInstanceId.length<5||input.flightInstanceId.length>200||
    !ICAO.test(input.originAirportIcao??"")||
    (input.destinationAirportIcao!==null&&
     !ICAO.test(input.destinationAirportIcao??""))||
    input.destinationAirportIcao===input.originAirportIcao||
    !SHA.test(input.independentlyReviewedResponseBytesSha256??"")||
    !SHA.test(input.independentlyReviewedPurposeSha256??"")||
    typeof input.sourceJsonText!=="string"||
    input.sourceJsonText.length>1_000_000)
  hold("UNREVIEWED_TAF_SOURCE_OR_FLIGHT_SCOPE");
 const target=instant(input.originalSelectedNativeDepartureUtc),
  issue=instant(input.actualPredictionIssuedAtUtc),
  fetched=instant(input.fetchedAtUtc);
 const stored=input.durableArtifactReadAtUtc===null?
  null:instant(input.durableArtifactReadAtUtc);
 if(target<=issue||fetched>issue+3*86400000||
    (stored!==null&&stored<fetched))
  hold("NONPROSPECTIVE_OR_INVALID_DURABLE_SOURCE_CLOCK");
 const actualSha=createHash("sha256")
  .update(input.sourceJsonText,"utf8").digest("hex");
 if(actualSha!==input.independentlyReviewedResponseBytesSha256)
  hold("PRESERVED_TAF_SOURCE_BYTES_SHA_MISMATCH");
 let parsed:unknown;
 try{parsed=JSON.parse(input.sourceJsonText);}catch{
  hold("NOT_NOAA_TAF_JSON");
 }
 if(!Array.isArray(parsed)||parsed.length>40||
    parsed.some(x=>!item(x)))
  hold("NOT_BOUNDED_NOAA_TAF_ROWS");
 const observed:P5EReviewedSupplementalObservation[]=[];
 const missingReasons:Record<TafField,string|null>={
  origin_taf_flight_category:null,
  destination_taf_flight_category:null
 };
 const airports=[
  {field:"origin_taf_flight_category" as const,
   airport:input.originAirportIcao},
  {field:"destination_taf_flight_category" as const,
   airport:input.destinationAirportIcao}
 ];
 for(const {field,airport} of airports){
  if(!airport){missingReasons[field]="NO_DESTINATION_AIRPORT";continue;}
  const rows=(parsed as Record<string,unknown>[]).filter(x=>x.icaoId===airport);
  if(rows.length===0){missingReasons[field]="NO_AIRPORT_TAF";continue;}
  if(stored===null||stored>issue){
   missingReasons[field]="NOT_DURABLY_AVAILABLE_AT_PREDICTION_ISSUE";continue;
  }
  const possible:Array<{raw:Record<string,unknown>;issued:number;
   from:number;to:number}>=[];
  for(const row of rows){
   if(typeof row.issueTime!=="string"){
    missingReasons[field]="UNVERIFIED_ISSUE_TIME";continue;
   }
   const issued=noaaIssued(row.issueTime);
   const from=seconds(row.validTimeFrom),to=seconds(row.validTimeTo);
   if(to<=from||issued>fetched)
    hold("TAF_VALIDITY_OR_ISSUE_AFTER_FETCH");
   if(issued>issue||target<from||target>=to)continue;
   if(!Array.isArray(row.fcsts)||row.fcsts.length>70)
    hold("NO_BOUNDED_FORECAST_SEGMENTS");
   possible.push({raw:row,issued,from,to});
  }
  if(possible.length===0){
   missingReasons[field]=missingReasons[field]??"NO_ISSUED_TAF_VALID_FOR_NATIVE_T";
   continue;
  }
  const latest=Math.max(...possible.map(x=>x.issued));
  const selected=possible.filter(x=>x.issued===latest);
  if(selected.length!==1){
   missingReasons[field]="AMBIGUOUS_SAME_ISSUE_TAF";continue;
  }
  const row=selected[0].raw;
  const periods:(Record<string,unknown>)[]=[];
  for(const raw of row.fcsts as unknown[]){
   const period=item(raw);
   if(!period)hold("UNVERIFIED_TAF_SEGMENT_SHAPE");
   const from=seconds(period.timeFrom),to=seconds(period.timeTo);
   if(to<=from)hold("INVALID_TAF_SEGMENT_INTERVAL");
   if(target>=from&&target<to)periods.push(period);
  }
  const baseline=periods.filter(x=>x.fcstChange===null||x.fcstChange==="FM");
  if(periods.length!==1||baseline.length!==1){
   missingReasons[field]="AMBIGUOUS_TEMPO_OR_OVERLAPPING_TAF";continue;
  }
  const category=prevailingCategory(baseline[0]);
  if(!category){
   missingReasons[field]="INSUFFICIENT_FORECAST_CEILING_OR_VISIBILITY";
   continue;
  }
  const recordSha=createHash("sha256")
   .update(JSON.stringify(row)).digest("hex");
  observed.push({
   flightInstanceId:input.flightInstanceId,field,value:category,
   source:"NOAA_TAF",sourceRecordId:recordSha,
   observedAtUtc:new Date(latest).toISOString(),
   availableAtUtc:new Date(stored).toISOString(),
   validFromUtc:new Date(seconds(baseline[0].timeFrom)).toISOString(),
   validToUtc:new Date(seconds(baseline[0].timeTo)).toISOString(),
   airportIcao:airport,stationIcao:airport,
   rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"
  });
 }
 return{
  schema:"v39.phase5.e-existing-noaa-taf-asof-draft.v1",
  fields:[...FIELDS],observations:observed,
  missingFields:FIELDS.filter(x=>!observed.some(y=>y.field===x)),
  missingReasons,
  originalTafSourceResponseSha256:actualSha,
  sourceRightsCertifiedHere:false,
  durableArtifactAuthenticityCertifiedHere:false,
  providerCalls:0,databaseWrites:0,phase6PaidGo:false
 };
}
