/**
 * Gate5 free BTS U.S. reporting-carrier monthly actual wheels-off reference.
 * Provides a *candidate* for independently audited US-domestic matching,
 * never a universal runway target or as-of PRE feature.
 *
 * Source: BTS On-Time Reporting Carrier fields: FlightDate, Reporting_Airline,
 * Flight_Number, Origin, Dest, Cancelled, CRSDepTime, DepTime, WheelsOff.
 * BTS WheelsOff is ACTUAL local-time HHMM, NOT a UTC timestamp; converting it
 * requires explicit airport time zone/date rollover/DST evidence in a separate
 * independently reviewed source adapter.
 *
 * No provider API, identifiers or source row content in the return value.
 */
export const P4_BTS_REFERENCE_SCHEMA_V39=
  "v39.phase4.gate5-bts-independent-actual-wheels-off-candidate.v1" as const;
const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const DAY=/^\d{4}-\d\d-\d\d$/;
const AIRPORT=/^[A-Z]{3}$/;
const AIRLINE=/^[A-Z0-9]{2,3}$/;
const NUMBER=/^[0-9A-Z]{1,5}$/;
function instant(s:string,code:string):number{
 if(typeof s!=="string"||!UTC.test(s)||!Number.isFinite(Date.parse(s))||
    new Date(Date.parse(s)).toISOString()!==s)
   throw Error("P4_G5_BTS_INVALID_UTC_"+code);
 return Date.parse(s);
}
function hhmm(s:string|null):boolean{
 if(s===null)return true;
 if(typeof s!=="string"||!/^\d{4}$/.test(s))return false;
 const h=Number(s.slice(0,2)),m=Number(s.slice(2));
 return h<=23&&m<=59;
}
export interface P4BtsReferenceV39{
 dataReleasePublishedAtUtc:string;
 flightDate:string;
 reportingAirline:string;
 flightNumber:string;
 originIata:string;
 destinationIata:string;
 cancelled:boolean;
 /** BTS local clock HHmm; not intrinsically UTC or a gate movement. */
 wheelsOffLocalHHmm:string|null;
 /** BTS scheduled GATE departure HHmm, NOT scheduled wheels-off. */
 crsDepLocalHHmm:string|null;
 /** BTS ACTUAL GATE departure HHmm, not actual runway. */
 depLocalHHmm:string|null;
 originalRowSha256:string;
 /** Has original BTS data actually been independently inspected? */
 originalRowReadAndVerified:boolean;
}
export interface P4OperatingFlightReferenceLinkV39{
 date:string;airline:string;number:string;originIata:string;
 destinationIata:string;
 role:"CONFIRMED_PHYSICAL_OPERATING_LEG"|
  "MARKETING_CODESHARE"|"UNKNOWN";
 isUsDomesticBothAirportsVerified:boolean;
 independentLinkageEvidenceSha256:string|null;
 /** Matching keys alone are not independent physical-leg proof. */
 independentFlightMatchReviewed:boolean;
}
export interface P4BtsCrosscheckInputV39{
 row:P4BtsReferenceV39;
 link:P4OperatingFlightReferenceLinkV39;
 reviewedAtUtc:string;
 /** BTS original data and terms/integrity must be approved upstream. */
 btsSourceUseAndIntegrityReviewed:boolean;
 /** Separate independently reviewed local-to-UTC conversion if needed. */
 localToUtcConversionValidated:boolean;
 /** Optional computed UTC, null without independently validated conversion. */
 computedActualWheelsOffUtc:string|null;
}
export type P4BtsEvidenceStateV39=
 "ADMISSIBLE_POSTFLIGHT_BTS_REPORTED_ACTUAL_WHEELSOFF_REFERENCE"|
 "BTS_REPORT_NOT_YET_PUBLISHED_AT_REVIEW"|
 "BTS_SOURCE_OR_USE_UNVERIFIED"|
 "BTS_OUTSIDE_US_REPORTING_FLIGHT_SCOPE"|
 "BTS_FLIGHT_IDENTITY_UNVERIFIED"|
 "BTS_CANCELED_NO_WHEELSOFF"|
 "BTS_ACTUAL_WHEELSOFF_MISSING"|
 "BTS_UTC_RESOLUTION_UNVERIFIED";
export function assessP4Gate5BtsReferenceV39(input:P4BtsCrosscheckInputV39){
 if(!input||!input.row||!input.link)throw Error("P4_G5_BTS_MISSING_INPUT");
 const r=input.row,l=input.link;
 const published=instant(r.dataReleasePublishedAtUtc,"PUBLISHED");
 const asOf=instant(input.reviewedAtUtc,"REVIEW");
 if(!DAY.test(r.flightDate)||!Number.isFinite(Date.parse(r.flightDate+"T00:00:00.000Z"))||
  new Date(Date.parse(r.flightDate+"T00:00:00.000Z")).toISOString().slice(0,10)!==r.flightDate||
  !DAY.test(l.date)||![r.originIata,r.destinationIata,l.originIata,l.destinationIata]
   .every(x=>typeof x==="string"&&AIRPORT.test(x))||
  ![r.reportingAirline,l.airline].every(x=>typeof x==="string"&&AIRLINE.test(x))||
  ![r.flightNumber,l.number].every(x=>typeof x==="string"&&NUMBER.test(x))||
  ![r.wheelsOffLocalHHmm,r.crsDepLocalHHmm,r.depLocalHHmm].every(hhmm)||
  !SHA.test(r.originalRowSha256)||!(l.independentLinkageEvidenceSha256===null||
  SHA.test(l.independentLinkageEvidenceSha256))||
  !["CONFIRMED_PHYSICAL_OPERATING_LEG","MARKETING_CODESHARE","UNKNOWN"].includes(l.role)||
  [r.cancelled,r.originalRowReadAndVerified,l.isUsDomesticBothAirportsVerified,
   l.independentFlightMatchReviewed,input.btsSourceUseAndIntegrityReviewed,
   input.localToUtcConversionValidated].some(x=>typeof x!=="boolean"))
    throw Error("P4_G5_BTS_INVALID_SOURCE_SHAPE");
 const converted=input.computedActualWheelsOffUtc===null?null:
   instant(input.computedActualWheelsOffUtc,"CONVERSION");
 const keysMatch=r.flightDate===l.date&&r.reportingAirline===l.airline&&
  r.flightNumber===l.number&&r.originIata===l.originIata&&
  r.destinationIata===l.destinationIata;
 const linked=keysMatch&&l.independentFlightMatchReviewed&&
  l.independentLinkageEvidenceSha256!==null&&
  l.role==="CONFIRMED_PHYSICAL_OPERATING_LEG";
 let state:P4BtsEvidenceStateV39;
 if(asOf<published)state="BTS_REPORT_NOT_YET_PUBLISHED_AT_REVIEW";
 else if(!r.originalRowReadAndVerified||!input.btsSourceUseAndIntegrityReviewed)
  state="BTS_SOURCE_OR_USE_UNVERIFIED";
 else if(!l.isUsDomesticBothAirportsVerified)
  state="BTS_OUTSIDE_US_REPORTING_FLIGHT_SCOPE";
 else if(!linked)state="BTS_FLIGHT_IDENTITY_UNVERIFIED";
 else if(r.cancelled)state="BTS_CANCELED_NO_WHEELSOFF";
 else if(r.wheelsOffLocalHHmm===null)state="BTS_ACTUAL_WHEELSOFF_MISSING";
 else if(!input.localToUtcConversionValidated||converted===null||
  converted>asOf)state="BTS_UTC_RESOLUTION_UNVERIFIED";
 else state="ADMISSIBLE_POSTFLIGHT_BTS_REPORTED_ACTUAL_WHEELSOFF_REFERENCE";
 const actual=state==="ADMISSIBLE_POSTFLIGHT_BTS_REPORTED_ACTUAL_WHEELSOFF_REFERENCE";
 return {
  schema:P4_BTS_REFERENCE_SCHEMA_V39,
  state,
  isUsReportingCarrierDomesticSubset:l.isUsDomesticBothAirportsVerified,
  sourceActuallyPublishedByReview:asOf>=published,
  physicalOperatingFlightMatched:linked,
  sourceRowOriginalReviewed:r.originalRowReadAndVerified,
  candidateBtsReportedActualOnlyWheelsOff:actual,
  independentlyAuthenticatedFlightLevelBtsLinkRequired:true as const,
  referenceActualWheelsOffUtc:actual?input.computedActualWheelsOffUtc:null,
  scheduledDepartureWheelsOffTimeVerified:false as const,
  originalF8SelectedTProven:false as const,
  btsCrsDepIsScheduledRunwayTime:false as const,
  btsDepTimeIsActualRunwayTime:false as const,
  comparableWorldwideFlightPopulation:false as const,
  mayBackfillPredictionCutoff:false as const,
  validAsPreDepartureFeature:false as const,
  wholeGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
}
