/**
 * Amendment E: OFFLINE deterministic feature-selection contract.
 * Does not fetch provider data, train a model, insert PRE, or grant use rights.
 *
 * The existing Stage14 writer now supports an explicitly reviewed,
 * separately released source-bound route and supplementary as-of feature
 * path; the default stays empty without opt-in. Neither the time selector
 * nor a signed packet alone proves source rights or model readiness.
 */
import type {PreFeatureInput}
 from "./preSnapshotBuilder_v3";

export const P5_E_ALLOWED_PRE_FEATURES=[
 "origin_icao","destination_icao","operating_carrier",
 "scheduled_arrival_utc","provider_revised_departure_utc",
 "reported_pre_departure_status",
 "origin_metar_visibility_m","origin_metar_wind_kt",
 "origin_taf_flight_category","destination_taf_flight_category",
 "prior_aircraft_turnaround_minutes",
 "prior_aircraft_adsb_not_ground_reported",
 "prior_aircraft_adsb_position_age_seconds",
 "prior_route_departure_delay_median_minutes",
 "prior_airport_departure_delay_median_minutes","airport_congestion_1h"
] as const;
export type P5EPreField=typeof P5_E_ALLOWED_PRE_FEATURES[number];
export type P5ESource="AERODATABOX_FIDS"|"NOAA_METAR"|"NOAA_TAF"|
 "ADSB_LOL"|"REVIEWED_HISTORIC_CONTEXT";
export interface P5EAsOfObservation{
 flightInstanceId:string;
 field:P5EPreField;
 value:string|number|boolean|null;
 source:P5ESource;
 sourceRecordId:string;
 /** When the provider/source observation occurred, not when processed. */
 observedAtUtc:string|null;
 /** Latest time content was actually available to our system. */
 availableAtUtc:string|null;
 /** External source-use review status, not authentication by this function. */
 rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"|"HOLD_UNVERIFIED";
}
export interface P5EAsOfRequest{
 flightInstanceId:string;
 horizon:"T-24h"|"T-6h"|"T-90m";
 selectedNativeTUtc:string;
 cutoffUtc:string;
 /** Actual issuance may be EARLIER than the mathematical horizon cutoff. */
 issuedAtUtc:string;
 fields:readonly P5EPreField[];
 observations:readonly P5EAsOfObservation[];
}
export type P5EAsOfMissingReason=
 "NO_RECORD"|"RIGHTS_UNVERIFIED"|"NOT_AVAILABLE_BY_ISSUE"|
 "MISSING_TIMESTAMP"|"AMBIGUOUS_LATEST_SOURCE"|"SOURCE_VALUE_MISSING";
export interface P5EAsOfFieldDecision{
 field:P5EPreField;value:string|number|boolean|null;
 source:P5ESource|null;
 sourceRecordId:string|null;
 availableAtUtc:string|null;
 missingReason:P5EAsOfMissingReason|null;
}
const offsets={"T-24h":86_400_000,"T-6h":21_600_000,"T-90m":5_400_000};
const allowedSources=new Set<P5ESource>([
 "AERODATABOX_FIDS","NOAA_METAR","NOAA_TAF","ADSB_LOL",
 "REVIEWED_HISTORIC_CONTEXT"]);
const allowedFields=new Set<string>(P5_E_ALLOWED_PRE_FEATURES);
function hold(msg:string):never{throw Error("REFUSED_P5_AMENDMENT_E_ASOF_"+msg);}
function stamp(s:string):number{
 if(typeof s!=="string"||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s)||
    !Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)hold("INVALID_TIMESTAMP");
 return Date.parse(s);
}
const no=(field:P5EPreField,missingReason:P5EAsOfMissingReason):
 P5EAsOfFieldDecision=>({field,value:null,source:null,sourceRecordId:null,
 availableAtUtc:null,missingReason});

export function selectP5AmendmentEAsOfFeaturesOffline(req:P5EAsOfRequest):{
 schema:"v39.phase5.amendment-e-pre-asof-feature-selection.v1";
 flightInstanceId:string;
 horizon:P5EAsOfRequest["horizon"];
 issuedAtUtc:string;
 fields:P5EAsOfFieldDecision[];
 builderInputs:PreFeatureInput[];
 independentSourceLicenseVerifiedByThisFunction:false;
 actualStage14WriterUpdated:false;
 phase6PaidGo:false;
}{
 if(!req||typeof req.flightInstanceId!=="string"||
    req.flightInstanceId.length<5||req.flightInstanceId.length>200||
    !Object.hasOwn(offsets,req.horizon)||
    !Array.isArray(req.fields)||req.fields.length>32||
    !Array.isArray(req.observations)||req.observations.length>512)
   hold("INVALID_BOUNDED_REQUEST");
 const native=stamp(req.selectedNativeTUtc),cutoff=stamp(req.cutoffUtc),
  issued=stamp(req.issuedAtUtc);
 if(native-cutoff!==offsets[req.horizon]||issued>cutoff)
  hold("HORIZON_OR_FORECAST_ISSUED_AFTER_CUTOFF");
 const names=new Set<string>();
 for(const f of req.fields){
  if(!allowedFields.has(f)||names.has(f))hold("UNREVIEWED_OR_REPEATED_FEATURE");
  names.add(f);
 }
 const buckets=new Map<P5EPreField,P5EAsOfObservation[]>();
 for(const row of req.observations){
  if(!row||row.flightInstanceId!==req.flightInstanceId||
     !allowedFields.has(row.field)||!names.has(row.field)||
     !allowedSources.has(row.source)||
     !["EXTERNALLY_REVIEWED_ALLOW","HOLD_UNVERIFIED"]
      .includes(row.rightsDisposition)||
     typeof row.sourceRecordId!=="string"||
     row.sourceRecordId.length<5||row.sourceRecordId.length>200||
     ![null,"string","number","boolean"].includes(
       row.value===null?null:typeof row.value)||
     (typeof row.value==="number"&&!Number.isFinite(row.value)))
   hold("UNVERIFIED_FIELD_IDENTITY_OR_VALUE");
  if(row.observedAtUtc!==null)stamp(row.observedAtUtc);
  if(row.availableAtUtc!==null){
   const available=stamp(row.availableAtUtc);
   if(row.observedAtUtc!==null&&stamp(row.observedAtUtc)>available)
    hold("OBSERVED_AFTER_SYSTEM_AVAILABLE");
  }
  const list=buckets.get(row.field)??[];
  list.push(row);buckets.set(row.field,list);
 }
 const decisions:P5EAsOfFieldDecision[]=[];
 for(const field of req.fields){
  const all=buckets.get(field)??[];
  const withTime=all.filter(x=>x.availableAtUtc!==null);
  const eligible=withTime.filter(x=>
    stamp(x.availableAtUtc!)<=issued&&
    x.rightsDisposition==="EXTERNALLY_REVIEWED_ALLOW"
  ).sort((a,b)=>stamp(b.availableAtUtc!)-stamp(a.availableAtUtc!));
  if(!eligible.length){
   decisions.push(no(field,all.length===0?"NO_RECORD":
    all.some(x=>x.availableAtUtc===null)?"MISSING_TIMESTAMP":
    withTime.some(x=>stamp(x.availableAtUtc!)<=issued&&
      x.rightsDisposition==="HOLD_UNVERIFIED")?"RIGHTS_UNVERIFIED":
    "NOT_AVAILABLE_BY_ISSUE"));
   continue;
  }
  const newestAt=eligible[0].availableAtUtc;
  const newest=eligible.filter(x=>x.availableAtUtc===newestAt);
  // Never resolve two equal-time contradictory originals by array order.
  const keys=new Set(newest.map(x=>
   JSON.stringify([x.value,x.source,x.sourceRecordId])));
  if(keys.size!==1){
   decisions.push(no(field,"AMBIGUOUS_LATEST_SOURCE"));
   continue;
  }
  const selected=newest[0];
  if(selected.value===null){
   decisions.push(no(field,"SOURCE_VALUE_MISSING"));
   continue;
  }
  decisions.push({
   field,value:selected.value,source:selected.source,
   sourceRecordId:selected.sourceRecordId,
   availableAtUtc:selected.availableAtUtc,missingReason:null
  });
 }
 // Preserve missingness as null in the builder. The detailed reasons
 // remain separate in fields; builder only has coarse timestamp reasons.
 return {
  schema:"v39.phase5.amendment-e-pre-asof-feature-selection.v1",
  flightInstanceId:req.flightInstanceId,horizon:req.horizon,
  issuedAtUtc:req.issuedAtUtc,fields:decisions,
  builderInputs:decisions.map(d=>({
   featureName:d.field,value:d.value,
   informationAvailableAt:d.availableAtUtc?new Date(d.availableAtUtc):null,
   source:d.source,sourceVersion:d.sourceRecordId
  })),
  independentSourceLicenseVerifiedByThisFunction:false,
  actualStage14WriterUpdated:false,phase6PaidGo:false
 };
}
