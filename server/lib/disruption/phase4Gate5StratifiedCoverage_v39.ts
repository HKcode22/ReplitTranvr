/**
 * Phase4 Gate5 P4-F: independent stratified OFFLINE CANDIDATE coverage.
 * Normative f.8 §5: FIDS population precedes callback; snapshots are independent
 * of capture/features. No FIDS source-completeness / labels / PASS certified.
 * Public report deliberately hides small cells and raw flight identifiers.
 */
import type {FidsFact,WebhookFact,SnapshotFact,Gate5Horizon}
 from "./phase4Gate5OfflineFunnel_v39";
import {GATE5_HORIZONS_V39} from "./phase4Gate5OfflineFunnel_v39";

export const P4_STRATA_SCHEMA_V39="v39.phase4.gate5-strata-candidate.v1" as const;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
const ICAO=/^[A-Z]{4}$/;
const IATA=/^[A-Z0-9]{2,3}$/;
const COUNTRY=/^[A-Z]{2}$/;
const ZERO_REASON="ZERO_CANDIDATE_DENOMINATOR_SOURCE_UNCERTIFIED";
type NullableRate={numerator:number;denominator:number;candidateValue:number|null;reason:string|null};
const rate=(n:number,d:number):NullableRate=>({
 numerator:n,denominator:d,candidateValue:d===0?null:n/d,
 reason:d===0?ZERO_REASON:null
});
function utc(s:string):number{
 if(typeof s!=="string"||!UTC.test(s))throw Error("P4_STRATA_UTC_REQUIRED");
 const n=Date.parse(s);
 if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,19)!==s.slice(0,19))
  throw Error("P4_STRATA_UTC_INVALID");
 return n;
}
export interface P4StrataFidsFact extends FidsFact{
 carrierIata:string|null;
 originIcao:string|null;
 destinationIcao:string|null;
 airportTimezone:string;
 // Provider-source country facts, NOT heuristics inferred from ICAO prefix.
 sourceDepartureCountry:string|null;
 sourceArrivalCountry:string|null;
}
export interface P4StrataScope{
 airport:string;tier:string;region:string;serviceStartUtc:string;
 serviceEndUtc:string;receivedStartUtc:string;receivedEndUtc:string;
 auditAsOfUtc:string;
}
export interface P4StrataInput{
 scope:P4StrataScope;
 fids:readonly P4StrataFidsFact[];
 webhookResolved:readonly WebhookFact[];
 snapshots:readonly SnapshotFact[];
 // Not joinable. Never assign these to a flight, carrier or route.
 webhookItemsWithoutProvenIdentity:number;
}
export interface P4StrataCell{
 horizon:Gate5Horizon;airport:string;tier:string;region:string;
 operatingAirline:string;route:string;operationalCountryType:
  "DOMESTIC"|"INTERNATIONAL"|"UNKNOWN";
 airportLocalServiceHour:string;
 expected:number;created:number;captured:number;
 requiredFeaturesComplete:number;optionalFeatureMissing:number;
 targetApplicable:number;targetObservedWithSourceFlag:number;
 rates:{snapshot:NullableRate;capture:NullableRate;required:NullableRate;
  optionalMissing:NullableRate;target:NullableRate};
}
export interface P4StrataHorizon{
 horizon:Gate5Horizon;
 candidatePrimaryFlights:number;
 candidateAsOfEligible:number;
 noInitialScheduleT:number;
 noPopulationBeforeCutoff:number;
 capturedAsOfEligible:number;
 capturedOutsideCandidatePrimary:number;
 capturedKnownPrimaryButNotCutoffEligible:number;
 snapshotNotAsOfOrMismatched:number;
 suppressedSmallCellGroups:number;
 suppressedSmallCellEligibleFlights:number;
 unsuppressedGroups:number;
 zeroEligibleDenominator:boolean;
 captureRate:NullableRate;
 snapshotRate:NullableRate;
}
export interface P4StrataReport{
 schema:typeof P4_STRATA_SCHEMA_V39;
 status:"OFFLINE_CANDIDATE_SOURCE_NOT_INDEPENDENTLY_CERTIFIED";
 FidsReceiptCompletenessCertified:false;
 webhookOriginalCompletenessCertified:false;
 providerLabelAndFirstTProven:false;
 populationRepresentativenessCertified:false;
 strictGate5Passed:false;phase6Authorized:false;
 airport:string;tier:string;region:string;
 inputFidsRows:number;
 inputResolvedWebhookItems:number;
 unresolvedWebhookItems:number;
 sourceQueryCount:number;
 horizons:P4StrataHorizon[];
 // Suppress cells with denominator <3 for public summaries.
 publicCandidateCells:P4StrataCell[];
 providerCalls:0;databaseWrites:0;
}
function partition(f:P4StrataFidsFact,tz:string):Omit<P4StrataCell,
 "horizon"|"airport"|"tier"|"region"|"expected"|"created"|"captured"|
 "requiredFeaturesComplete"|"optionalFeatureMissing"|"targetApplicable"|
 "targetObservedWithSourceFlag"|"rates">{
 const carrier=f.carrierIata&&IATA.test(f.carrierIata)?f.carrierIata:"UNKNOWN";
 const route=f.originIcao&&ICAO.test(f.originIcao)&&
 f.destinationIcao&&ICAO.test(f.destinationIcao)?
 f.originIcao+"-"+f.destinationIcao:"UNKNOWN";
 const a=f.sourceDepartureCountry,b=f.sourceArrivalCountry;
 const country=a&&b&&COUNTRY.test(a)&&COUNTRY.test(b)?
 a===b?"DOMESTIC":"INTERNATIONAL":"UNKNOWN";
 const t=utc(f.movementScheduledUtc!);
 const part=new Intl.DateTimeFormat("en-GB",{timeZone:tz,hour:"2-digit",
  hourCycle:"h23"}).format(new Date(t));
 return {operatingAirline:carrier,route,
  operationalCountryType:country as "DOMESTIC"|"INTERNATIONAL"|"UNKNOWN",
  airportLocalServiceHour:part};
}
export function assessP4Gate5StrataCandidates(x:P4StrataInput):P4StrataReport{
 if(!x||!x.scope||!Array.isArray(x.fids)||!Array.isArray(x.webhookResolved)||
  !Array.isArray(x.snapshots)||x.fids.length>50000||
  x.webhookResolved.length>50000||x.snapshots.length>100000||
  !Number.isSafeInteger(x.webhookItemsWithoutProvenIdentity)||
  x.webhookItemsWithoutProvenIdentity<0||x.webhookItemsWithoutProvenIdentity>100000)
  throw Error("P4_STRATA_INPUT_INVALID");
 const q=x.scope;
 if(!ICAO.test(q.airport)||typeof q.tier!=="string"||!q.tier||
  typeof q.region!=="string"||!q.region)throw Error("P4_STRATA_SCOPE_INVALID");
 const start=utc(q.serviceStartUtc),end=utc(q.serviceEndUtc),
  recvStart=utc(q.receivedStartUtc),recvEnd=utc(q.receivedEndUtc),
  read=utc(q.auditAsOfUtc);
 if(start>=end||end-start>7*86400000||recvStart>=recvEnd||
  recvEnd-recvStart>7*86400000||read<recvStart)
  throw Error("P4_STRATA_WINDOWS_INVALID");
 const all=new Map<string,P4StrataFidsFact[]>(),queryIds=new Set<string>();
 const seenRows=new Set<string>();
 for(const f of x.fids){
  if(!f||typeof f.flightId!=="string"||!f.flightId||
   typeof f.queryId!=="string"||!f.queryId||
   f.airport!==q.airport||!["requested_airport_primary","opposite_movement_context"].includes(f.role)||
   !["confirmed_core","unknown","auxiliary"].includes(f.scope)||
   !["confirmed_operating_leg","resolved_marketing","ambiguous_unknown"].includes(f.codeshare))
   throw Error("P4_STRATA_FIDS_INVALID");
  try{new Intl.DateTimeFormat("en-GB",{timeZone:f.airportTimezone});}
  catch{throw Error("P4_STRATA_BAD_AIRPORT_TIMEZONE");}
  for(const s of [f.availableAtUtc,f.firstSelectedTUtc,f.movementScheduledUtc])
   if(s!==null)utc(s);
  if(utc(f.availableAtUtc)>read)throw Error("P4_STRATA_FIDS_AFTER_AUDIT_WATERMARK");
  const key=f.queryId+"|"+f.flightId+"|"+f.role;
  if(seenRows.has(key))throw Error("P4_STRATA_DUPLICATE_SOURCE_ROW");
  seenRows.add(key);queryIds.add(f.queryId);
  if(f.role!=="requested_airport_primary"||
    f.codeshare!=="confirmed_operating_leg"||f.scope!=="confirmed_core"||
    f.movementScheduledUtc===null)continue;
  const dep=utc(f.movementScheduledUtc);
  if(dep<start||dep>=end)continue;
  const a=all.get(f.flightId)??[];a.push(f);all.set(f.flightId,a);
 }
 for(const events of all.values())
  events.sort((a,b)=>utc(a.availableAtUtc)-utc(b.availableAtUtc)||
    a.queryId.localeCompare(b.queryId));
 const captures=new Set<string>();
 for(const w of x.webhookResolved){
  if(!w||typeof w.flightId!=="string"||!w.flightId||w.airport!==q.airport)
   throw Error("P4_STRATA_CALLBACK_SCOPE_INVALID");
  const t=utc(w.receivedAtUtc);
  if(t>=recvStart&&t<recvEnd&&t<=read)captures.add(w.flightId);
 }
 const allSnap=new Set<string>();
 for(const s of x.snapshots){
  if(!s||!s.flightId||!s.populationQueryId||
   !(s.horizon in GATE5_HORIZONS_V39)||
   [s.requiredComplete,s.optionalMissing,s.targetApplicable,
    s.targetObserved,s.targetSourceVerified].some(v=>typeof v!=="boolean"))
   throw Error("P4_STRATA_SNAPSHOT_INVALID");
  const key=s.flightId+"|"+s.horizon+"|"+utc(s.cutoffUtc);
  if(allSnap.has(key))throw Error("P4_STRATA_SNAPSHOT_DUPLICATE");
  allSnap.add(key);
 }
 const publicCells:P4StrataCell[]=[],horizons:P4StrataHorizon[]=[];
 for(const [horizon,delta] of Object.entries(GATE5_HORIZONS_V39) as
  [Gate5Horizon,number][]){
  type Count={f:P4StrataFidsFact;at:number;query:string};
  const asOf=new Map<string,Count>();
  let noT=0,noSource=0;
  for(const [flightId,events] of all){
   const first=events[0];
   if(first.firstSelectedTUtc===null){noT++;continue;}
   const cutoff=utc(first.firstSelectedTUtc)-delta;
   const latest=events.filter(f=>utc(f.availableAtUtc)<=cutoff).at(-1);
   if(!latest){noSource++;continue;}
   asOf.set(flightId,{f:latest,at:cutoff,query:latest.queryId});
  }
  type Mutable={flights:Set<string>;created:number;capture:number;
   required:number;missing:number;applicable:number;observed:number;
   dims:ReturnType<typeof partition>};
  const groups=new Map<string,Mutable>();
  for(const [fid,e] of asOf){
   const dims=partition(e.f,e.f.airportTimezone);
   const key=JSON.stringify(dims);
   let g=groups.get(key);
   if(!g){g={flights:new Set(),created:0,capture:0,required:0,
    missing:0,applicable:0,observed:0,dims};groups.set(key,g);}
   g.flights.add(fid);
   if(captures.has(fid))g.capture++;
  }
  let errors=0,totalCreated=0;
  for(const s of x.snapshots.filter(v=>v.horizon===horizon)){
   const expect=asOf.get(s.flightId);
   if(!expect||utc(s.cutoffUtc)!==expect.at||s.populationQueryId!==expect.query){
    errors++;continue;
   }
   const g=groups.get(JSON.stringify(partition(expect.f,expect.f.airportTimezone)))!;
   g.created++;totalCreated++;
   if(s.requiredComplete)g.required++;
   if(s.optionalMissing)g.missing++;
   if(s.targetApplicable){
    g.applicable++;
    if(s.targetObserved&&s.targetSourceVerified)g.observed++;
   }
   // Merely supplied targetSourceVerified is NOT an independent certificate.
  }
  let suppressed=0,suppressedFlights=0,unsuppressed=0;
  for(const g of groups.values()){
   const n=g.flights.size;
   if(n<3){suppressed++;suppressedFlights+=n;continue;}
   unsuppressed++;
   publicCells.push({
    horizon,airport:q.airport,tier:q.tier,region:q.region,
    ...g.dims,
    expected:n,created:g.created,captured:g.capture,
    requiredFeaturesComplete:g.required,optionalFeatureMissing:g.missing,
    targetApplicable:g.applicable,targetObservedWithSourceFlag:g.observed,
    rates:{
     snapshot:rate(g.created,n),capture:rate(g.capture,n),
     required:rate(g.required,g.created),optionalMissing:rate(g.missing,g.created),
     target:rate(g.observed,g.applicable)
    }
   });
  }
  const inside=[...captures].filter(id=>asOf.has(id)).length;
  const outside=[...captures].filter(id=>!all.has(id)).length;
  const knownUnqualified=captures.size-inside-outside;
  horizons.push({
   horizon,candidatePrimaryFlights:all.size,
   candidateAsOfEligible:asOf.size,noInitialScheduleT:noT,
   noPopulationBeforeCutoff:noSource,capturedAsOfEligible:inside,
   capturedOutsideCandidatePrimary:outside,
   capturedKnownPrimaryButNotCutoffEligible:knownUnqualified,
   snapshotNotAsOfOrMismatched:errors,
   suppressedSmallCellGroups:suppressed,
   suppressedSmallCellEligibleFlights:suppressedFlights,
   unsuppressedGroups:unsuppressed,
   zeroEligibleDenominator:asOf.size===0,
   captureRate:rate(inside,asOf.size),snapshotRate:rate(totalCreated,asOf.size)
  });
 }
 return {
  schema:P4_STRATA_SCHEMA_V39,
  status:"OFFLINE_CANDIDATE_SOURCE_NOT_INDEPENDENTLY_CERTIFIED",
  FidsReceiptCompletenessCertified:false,
  webhookOriginalCompletenessCertified:false,
  providerLabelAndFirstTProven:false,
  populationRepresentativenessCertified:false,
  strictGate5Passed:false,phase6Authorized:false,
  airport:q.airport,tier:q.tier,region:q.region,
  inputFidsRows:x.fids.length,inputResolvedWebhookItems:x.webhookResolved.length,
  unresolvedWebhookItems:x.webhookItemsWithoutProvenIdentity,
  sourceQueryCount:queryIds.size,horizons,publicCandidateCells:publicCells,
  providerCalls:0,databaseWrites:0
 };
}
