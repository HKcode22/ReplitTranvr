/**
 * PRE-time handoff from the actual Stage14 native-route and signed supplement
 * feature selectors to the reviewed Packet B transform. Source values and
 * exact clocks are used in memory only. No provider requests, persistence,
 * retention extensions or review approvals are created here.
 */
import type {PreFeatureInput,PreHorizon} from "./preSnapshotBuilder_v3";
import {PRE_HORIZON_OFFSET_MIN} from "./preSnapshotBuilder_v3";
import {P5_E_ALLOWED_PRE_FEATURES,type P5EPreField} from "./phase5AmendmentEAsOfFeatureSelectionOffline_v39";
import {auditCanonicalPrePreservationWindow,type Phase7CanonicalFieldDisposition} from "./phase7CanonicalFieldParity_v39";
import {transformPhase7ReviewedSourceDecisions,type Phase7ReviewedTransformationProfile,type Phase7SourceDecision} from "./phase7ReviewedSourceTransformation_v39";
import type {Phase7DerivedReleaseContract,Phase7ReleaseSplit} from "./phase6DerivedTrainingReleaseContract_v39";
const fail=(s:string):never=>{throw Error("PHASE7_BOUND_PRE_PRESERVATION_REJECTED:"+s)};
const need=(v:unknown,s:string)=>{if(!v)fail(s)};
function clock(s:string){const t=Date.parse(s);need(Number.isFinite(t)&&new Date(t).toISOString()===s,"clock");return t}
const expected=new Set<string>(P5_E_ALLOWED_PRE_FEATURES);
const sourceFor:Record<P5EPreField,readonly string[]>={
 origin_icao:["AERODATABOX_FIDS"],destination_icao:["AERODATABOX_FIDS"],
 operating_carrier:["AERODATABOX_FIDS"],scheduled_arrival_utc:["AERODATABOX_FIDS"],
 provider_revised_departure_utc:["AERODATABOX_FIDS"],reported_pre_departure_status:["AERODATABOX_FIDS"],
 origin_metar_visibility_m:["NOAA_METAR"],origin_metar_wind_kt:["NOAA_METAR"],
 origin_taf_flight_category:["NOAA_TAF"],destination_taf_flight_category:["NOAA_TAF"],
 prior_aircraft_turnaround_minutes:["REVIEWED_HISTORIC_CONTEXT"],
 prior_aircraft_adsb_not_ground_reported:["ADSB_LOL"],prior_aircraft_adsb_position_age_seconds:["ADSB_LOL"],
 prior_route_departure_delay_median_minutes:["REVIEWED_HISTORIC_CONTEXT"],
 prior_airport_departure_delay_median_minutes:["REVIEWED_HISTORIC_CONTEXT"],
 airport_congestion_1h:["AERODATABOX_FIDS","REVIEWED_HISTORIC_CONTEXT"]
};
export interface Phase7BoundPrePreservationRequest {
 horizon:PreHorizon;
 selectedNativeTUtc:string;
 cutoffUtc:string;
 issuedAtUtc:string;
 transformedAtUtc:string;
 sourceExpiresAtUtc:string;
 split:Phase7ReleaseSplit;
 cohortBucket:number;
 /** Exact already-selected inputs from the real scoped PRE path. */
 features:readonly PreFeatureInput[];
 /** Feature-specific independent authorization is still an external input. */
 dispositions:readonly Phase7CanonicalFieldDisposition[];
 /** Separate lane proof must be verified by its actual owner before this call.
  * This helper checks scope/coverage, never grants reference or data rights. */
 separatelyVerifiedFields:readonly P5EPreField[];
}
export function preparePhase7BoundPrePreservation(contract:Phase7DerivedReleaseContract,profile:Phase7ReviewedTransformationProfile,req:Phase7BoundPrePreservationRequest){
 const native=clock(req.selectedNativeTUtc),cutoff=clock(req.cutoffUtc),issue=clock(req.issuedAtUtc),now=clock(req.transformedAtUtc),expiry=clock(req.sourceExpiresAtUtc);
 need(Object.hasOwn(PRE_HORIZON_OFFSET_MIN,req.horizon)&&native-cutoff===PRE_HORIZON_OFFSET_MIN[req.horizon]*60000&&issue<=cutoff&&issue<=now&&now<expiry,"asof-or-custody");
 need(Array.isArray(req.features)&&req.features.length<=expected.size&&new Set(req.features.map(f=>f.featureName)).size===req.features.length&&req.features.every(f=>expected.has(f.featureName)),"feature-scope");
 need(req.dispositions.length===expected.size&&new Set(req.dispositions.map(d=>d.field)).size===expected.size&&req.dispositions.every(d=>expected.has(d.field)),"disposition-denominator");
 const byField=new Map(req.features.map(f=>[f.featureName,f])),byDisposition=new Map(req.dispositions.map(d=>[d.field,d]));
 const features=profile.fields.filter(f=>f.role==="feature");
 need(features.length===contract.features.length&&features.every(f=>expected.has(f.sourceField)&&byDisposition.get(f.sourceField as P5EPreField)?.disposition==="REVIEWED_DERIVED_BUCKET"&&byDisposition.get(f.sourceField as P5EPreField)?.outputField===f.outputField),"exact-profile-field-binding");
 // No source identifier may be treated as a 1:1 category bucket to bypass
 // the deliberately separate purpose-bound reference lane.
 const identifiers=new Set(["origin_icao","destination_icao","operating_carrier"]);
 need(features.every(f=>!identifiers.has(f.sourceField)),"identifier-separate-lane");
 const sourceFields:P5EPreField[]= [...P5_E_ALLOWED_PRE_FEATURES];
 const sourceDecisions=new Map<P5EPreField,Phase7SourceDecision>();
 for(const field of sourceFields){
  const f=byField.get(field),available=f?.informationAvailableAt;
  // A null payload is missing even when the source record has a timestamp.
  const hasValue=f?.value!==undefined&&f?.value!==null;
  if(hasValue){
   need(["string","number","boolean"].includes(typeof f!.value)&&!(typeof f!.value==="number"&&!Number.isFinite(f!.value)),"invalid-source-value");
   need(available instanceof Date&&Number.isFinite(available.getTime())&&available.getTime()<=issue,"source-after-issue");
   need(typeof f!.source==="string"&&sourceFor[field].includes(f!.source)&&typeof f!.sourceVersion==="string"&&f!.sourceVersion.length>=5,"source-provenance");
  }
  sourceDecisions.set(field,{sourceField:field,value:hasValue?f!.value:null,availableAtUtc:hasValue?available!.toISOString():null,missingReason:hasValue?null:"SOURCE_VALUE_MISSING",rightsDisposition:hasValue&&byDisposition.get(field)?.disposition==="REVIEWED_DERIVED_BUCKET"?"EXTERNALLY_REVIEWED_ALLOW":"HOLD_UNVERIFIED"});
 }
 const decisions=features.map(f=>sourceDecisions.get(f.sourceField as P5EPreField)!);
 const transformed=transformPhase7ReviewedSourceDecisions(profile,contract,decisions,{horizon:req.horizon,cohortBucket:req.cohortBucket,split:req.split,censoring:"not_due",issuedAtUtc:req.issuedAtUtc,releasedAtUtc:req.transformedAtUtc});
 const audit=auditCanonicalPrePreservationWindow(contract,req.dispositions,[{
  horizon:req.horizon,issuedAtUtc:req.issuedAtUtc,sourceExpiresAtUtc:req.sourceExpiresAtUtc,
  sourceFields:sourceFields.map(field=>({field,present:sourceDecisions.get(field)!.value!==null,availableAtUtc:sourceDecisions.get(field)!.availableAtUtc})),
  separatelyVerifiedFields:req.separatelyVerifiedFields,derivedFeatureBuckets:transformed.input.featureBuckets
 }],req.transformedAtUtc);
 // Output contains the reviewed buckets and aggregate denominator only.
 // There is deliberately no source leg ID, source hash or exact time.
 return {schema:"v39.phase7.bound-pre-preservation-candidate.v1",input:transformed.input,audit,independentFieldPermissionCertifiedHere:false,sourceMembershipAuthenticatedHere:false,durableWriteCompleted:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}
