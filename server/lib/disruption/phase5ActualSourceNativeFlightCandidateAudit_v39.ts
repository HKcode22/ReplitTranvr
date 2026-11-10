/**
 * Phase5: discover genuinely observed flight/horizon CANDIDATES from one
 * committed FIDS original and its PG16 flight_population rows.
 *
 * This does NOT create/synthesize a signed PRE permit, certify provider
 * Contents/retention rights, certify a provider-native operating leg, or
 * grant paid Phase6 GO. Real external physical identity & native schedule
 * review and signed future flight packets are still separate.
 *
 * Ordinary bounded missingness is censored PER FLIGHT instead of declaring
 * a whole sampled day corrupt. Structural conflicting originals/HASHES hold.
 */
import {createHash} from "node:crypto";
import type {P5Stage14SingleFlightPrePermit}
 from "./phase5V0079SingleBoundFlightPreWriter_v39";

const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ID=/^[a-zA-Z0-9_.:|-]{5,200}$/;
const GH=/^[0-9]{5,25}$/;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"];
const HORIZONS=["T-24h","T-6h","T-90m"] as const;
type Horizon=typeof HORIZONS[number];
const offset:Record<Horizon,number>={
 "T-24h":24*3600_000,"T-6h":6*3600_000,
 "T-90m":90*60_000
};
const MIN_LEAD=15*60_000;
const MAX_MEMBERS=500;
const fail=(what:string):never=>{
 throw Error("REFUSED_P5_ACTUAL_SOURCE_CANDIDATES_"+what);
};
function when(x:unknown):number{
 const v=x instanceof Date?x:typeof x==="string"?new Date(x):null;
 if(!v||!Number.isFinite(v.getTime()))
  fail("MALFORMED_OR_UNOBSERVED_NATIVE_UTC");
 return v.getTime();
}
const iso=(v:number)=>new Date(v).toISOString();
const sha=(x:unknown):x is string=>typeof x==="string"&&SHA.test(x);
export interface P5ActualSourceCandidateScope{
 manifestSha256:string;queryDigestSha256:string;
 reviewedReleaseSha256:string;rightsReviewSha256:string;
 providerContractSha256:string;earlyDrawSha256:string;
 runDayIndex:number;slot:string;horizon:Horizon;airportIcao:string;
 expectedSourceGithubRunId:string;
 maxPopulationStalenessSeconds:number;
}
export interface P5ActualBoundOriginalRow {
 manifest_sha256:string;run_day_index:number|string;slot_id:string;
 horizon:string;airport_icao:string;github_run_id:string;
 state:string;early_draw_sha256:string;reviewed_release_sha256:string;
 rights_review_sha256:string;provider_contract_sha256:string;
 service_window_start_utc:Date|string;
 service_window_end_utc:Date|string;
 attempt_run_id:string;reserved_at:Date|string;
 population_query_id:string;original_response_hash:string;
 bound_rights:string;source_expires_at_utc:Date|string;
 normalized_members_count:number|string;bound_at_utc:Date|string;
 source_available:Date|string;fids_retrieval_utc:Date|string;
 raw_persisted_at_utc:Date|string;fids_response_hash:string;
 fids_airport_icao:string;original_current:boolean;
}
export interface P5ActualFlightPopulationRow{
 population_query_id:string;analytic_identity_id:string;
 canonical_flight_instance_id:string;source_airport_icao:string;
 dep_airport_icao:string;population_role:string;
 scope_classification:string;codeshare_resolution_status:string;
 source_type:string;response_hash:string;
 provider_content_expired_at_utc:Date|string|null;
 available_at:Date|string;dep_scheduled_utc:Date|string;
 population_member_id:string;flight_number:string|null;
 arr_airport_icao:string|null;query_direction:string|null;
}
export type P5CandidateClassification=
 "ACTUAL_SOURCE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED"|
 "CENSORED_AMBIGUOUS_SOURCE_IDENTITY"|
 "CENSORED_NONNATIVE_OR_UNCONFIRMED_OPERATING_MEMBER"|
 "CENSORED_MEMBER_NOT_AVAILABLE_BY_ACTUAL_DB_CLOCK"|
 "CENSORED_MISSING_NATIVE_T"|
 "CENSORED_SOURCE_TOO_STALE_OR_EXPIRED"|
 "CENSORED_SOURCE_ARRIVED_AFTER_OWN_CUTOFF"|
 "CENSORED_NO_PROSPECTIVE_PRE_LEAD"|
 "CENSORED_OUTSIDE_APPROVED_SOURCE_WINDOW";
export interface P5ActualFlightCandidateReview{
 flightInstanceId:string;
 sourcePopulationQueryId:string;
 sourceResponseSha256:string;
 manifestSha256:string;queryDigestSha256:string;
 runDayIndex:number;slot:string;horizon:Horizon;
 sourceAirportIcao:string;
 selectedTNativeUtc:string|null;
 actualMemberAvailableUtc:string|null;
 ownCutoffUtc:string|null;
 status:P5CandidateClassification;
 externalNativeTAndPhysicalIdentityReviewRequired:true;
 contentsRightsCertifiedHere:false;
 stage14PermitIssuedHere:false;
 providerCalls:0;
 databaseWrites:0;
}
export interface P5ActualSourceCandidateAudit{
 schema:"v39.phase5.actual-source-native-flight-candidates-readonly.v1";
 status:"ACTUAL_SOURCE_CANDIDATE_REVIEW_NOT_PACKET_SIGNING";
 actualDbClockUtc:string;sourcePopulationQueryId:string;
 sourceResponseSha256:string;queryDigestSha256:string;
 observedMemberCount:number;candidateCount:number;
 censoredCount:number;
 classifications:Record<P5CandidateClassification,number>;
 candidates:P5ActualFlightCandidateReview[];
 providerCalls:0;databaseWrites:0;
 signedPrePacketsCreated:0;alertCreates:0;
 providerContentsRightsCertified:false;
 physicalOperatingLegIndependentlyCertified:false;
 nativeTIndependentlyCertified:false;
 phase5ScientificFreezeGranted:false;
 phase6PaidGoGranted:false;
}
/**
 * To discover up to 500 real SOURCE normalized members without choosing a
 * desired flight ID first. Exactly the existing Stage14 member projection,
 * against the SOURCE's already post-COMMIT population_query_id.
 * LIMIT 501 is intentional: excess volume HOLD, never silently truncate
 * and pretend a full population was reviewed.
 */
export const P5_ACTUAL_SOURCE_ALL_MEMBERS_READONLY_SQL=[
 "SELECT p.population_query_id,p.analytic_identity_id,",
 "p.canonical_flight_instance_id,p.source_airport_icao,",
 "p.dep_airport_icao,p.population_role,p.scope_classification,",
 "p.codeshare_resolution_status,p.source_type,p.response_hash,",
 "p.provider_content_expired_at_utc,p.available_at,",
 "p.dep_scheduled_utc,p.population_member_id,",
 "p.flight_number,p.arr_airport_icao,p.query_direction",
 "FROM clean.flight_population p WHERE p.population_query_id=$1::uuid",
 "ORDER BY p.analytic_identity_id,p.available_at,p.id LIMIT 501"
].join(" ");
export function auditP5ActualSourceFlightCandidates(
 scope:P5ActualSourceCandidateScope,
 originalRows:readonly P5ActualBoundOriginalRow[],
 memberRows:readonly P5ActualFlightPopulationRow[],
 actualDbClockUtc:Date|string
):P5ActualSourceCandidateAudit{
 if(!scope||![scope.manifestSha256,scope.queryDigestSha256,
   scope.reviewedReleaseSha256,scope.rightsReviewSha256,
   scope.providerContractSha256,scope.earlyDrawSha256].every(sha)||
   !Number.isSafeInteger(scope.runDayIndex)||scope.runDayIndex<1||
   scope.runDayIndex>31||!SLOTS.includes(scope.slot)||
   !HORIZONS.includes(scope.horizon)||
   !/^[A-Z]{4}$/.test(scope.airportIcao??"")||
   !GH.test(scope.expectedSourceGithubRunId??"")||
   !Number.isSafeInteger(scope.maxPopulationStalenessSeconds)||
   scope.maxPopulationStalenessSeconds<1||
   scope.maxPopulationStalenessSeconds>86400||
   !Array.isArray(originalRows)||originalRows.length!==1||
   !Array.isArray(memberRows)||memberRows.length>MAX_MEMBERS)
  fail("UNSIGNED_SOURCE_SCOPE_OR_UNBOUNDED_POPULATION");
 const o=originalRows[0];
 const clock=when(actualDbClockUtc);
 if(!o||o.manifest_sha256!==scope.manifestSha256||
   Number(o.run_day_index)!==scope.runDayIndex||
   o.slot_id!==scope.slot||o.horizon!==scope.horizon||
   o.airport_icao!==scope.airportIcao||
   o.github_run_id!==scope.expectedSourceGithubRunId||
   o.attempt_run_id!==scope.expectedSourceGithubRunId||
   o.state!=="ACTIVE"||
   o.early_draw_sha256!==scope.earlyDrawSha256||
   o.reviewed_release_sha256!==scope.reviewedReleaseSha256||
   o.rights_review_sha256!==scope.rightsReviewSha256||
   o.provider_contract_sha256!==scope.providerContractSha256||
   o.bound_rights!==scope.rightsReviewSha256||
   o.fids_airport_icao!==scope.airportIcao||
   !UUID.test(o.population_query_id??"")||
   !sha(o.original_response_hash)||!sha(o.fids_response_hash)||
   o.original_response_hash!==o.fids_response_hash||
   !Number.isSafeInteger(Number(o.normalized_members_count))||
   Number(o.normalized_members_count)<0||
   o.original_current!==true)
  fail("NONAUTHENTIC_OR_EXPIRED_ORIGINAL_SOURCE_METADATA");
 const reserved=when(o.reserved_at),retrieved=when(o.fids_retrieval_utc),
  persisted=when(o.raw_persisted_at_utc),
  sourceAt=when(o.source_available),bound=when(o.bound_at_utc),
  expires=when(o.source_expires_at_utc),
  windowStart=when(o.service_window_start_utc),
  windowEnd=when(o.service_window_end_utc);
 if(reserved>retrieved||retrieved>persisted||persisted>sourceAt||
    sourceAt>bound||bound>clock||
    expires<=clock||expires<=sourceAt||
    expires>sourceAt+23*3600_000||windowStart>=windowEnd)
  fail("CHANGED_OR_NONPROSPECTIVE_SOURCE_TIME_CUSTODY");
 if(memberRows.length===0)
  return{
   schema:"v39.phase5.actual-source-native-flight-candidates-readonly.v1",
   status:"ACTUAL_SOURCE_CANDIDATE_REVIEW_NOT_PACKET_SIGNING",
   actualDbClockUtc:iso(clock),
   sourcePopulationQueryId:o.population_query_id,
   sourceResponseSha256:o.original_response_hash,
   queryDigestSha256:scope.queryDigestSha256,
   observedMemberCount:0,candidateCount:0,censoredCount:0,
   classifications:{
    ACTUAL_SOURCE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED:0,
    CENSORED_AMBIGUOUS_SOURCE_IDENTITY:0,
    CENSORED_NONNATIVE_OR_UNCONFIRMED_OPERATING_MEMBER:0,
    CENSORED_MEMBER_NOT_AVAILABLE_BY_ACTUAL_DB_CLOCK:0,
    CENSORED_MISSING_NATIVE_T:0,
    CENSORED_SOURCE_TOO_STALE_OR_EXPIRED:0,
    CENSORED_SOURCE_ARRIVED_AFTER_OWN_CUTOFF:0,
    CENSORED_NO_PROSPECTIVE_PRE_LEAD:0,
    CENSORED_OUTSIDE_APPROVED_SOURCE_WINDOW:0
   },
   candidates:[],providerCalls:0,databaseWrites:0,
   signedPrePacketsCreated:0,alertCreates:0,
   providerContentsRightsCertified:false,
   physicalOperatingLegIndependentlyCertified:false,
   nativeTIndependentlyCertified:false,
   phase5ScientificFreezeGranted:false,phase6PaidGoGranted:false
  };
 const frequency=new Map<string,number>();
 for(const m of memberRows){
  if(!m||!ID.test(m.analytic_identity_id??""))
   fail("INVALID_NONRECONCILABLE_FLIGHT_ID");
  frequency.set(m.analytic_identity_id,
    (frequency.get(m.analytic_identity_id)??0)+1);
 }
 const out:P5ActualFlightCandidateReview[]=[];
 for(const m of memberRows){
  const identity=m.analytic_identity_id;
  const candidate:P5ActualFlightCandidateReview={
   flightInstanceId:identity,
   sourcePopulationQueryId:o.population_query_id,
   sourceResponseSha256:o.original_response_hash,
   manifestSha256:scope.manifestSha256,
   queryDigestSha256:scope.queryDigestSha256,
   runDayIndex:scope.runDayIndex,
   slot:scope.slot,horizon:scope.horizon,
   sourceAirportIcao:scope.airportIcao,
   selectedTNativeUtc:null,actualMemberAvailableUtc:null,
   ownCutoffUtc:null,
   status:"CENSORED_NONNATIVE_OR_UNCONFIRMED_OPERATING_MEMBER",
   externalNativeTAndPhysicalIdentityReviewRequired:true,
   contentsRightsCertifiedHere:false,stage14PermitIssuedHere:false,
   providerCalls:0,databaseWrites:0
  };
  if((frequency.get(identity)??0)!==1){
   candidate.status="CENSORED_AMBIGUOUS_SOURCE_IDENTITY";
  }else if(m.population_query_id!==o.population_query_id||
    m.canonical_flight_instance_id!==identity||
    m.source_airport_icao!==scope.airportIcao||
    m.dep_airport_icao!==scope.airportIcao||
    m.population_role!=="requested_airport_primary"||
    m.scope_classification!=="confirmed_core"||
    m.codeshare_resolution_status!=="confirmed_operating_leg"||
    m.source_type!=="fids"||
    m.response_hash!==o.original_response_hash||
    m.provider_content_expired_at_utc!==null||
    m.query_direction!=="Departure"||
    typeof m.population_member_id!=="string"||
    m.population_member_id.length===0){
   candidate.status="CENSORED_NONNATIVE_OR_UNCONFIRMED_OPERATING_MEMBER";
  }else if(m.dep_scheduled_utc===null||
    m.dep_scheduled_utc===undefined){
   candidate.status="CENSORED_MISSING_NATIVE_T";
  }else{
   const native=when(m.dep_scheduled_utc);
   const arrived=when(m.available_at);
   const cutoff=native-offset[scope.horizon];
   candidate.selectedTNativeUtc=iso(native);
   candidate.actualMemberAvailableUtc=iso(arrived);
   candidate.ownCutoffUtc=iso(cutoff);
   if(arrived>clock||arrived<sourceAt||
      arrived>cutoff){
    candidate.status="CENSORED_MEMBER_NOT_AVAILABLE_BY_ACTUAL_DB_CLOCK";
   }else if(native<windowStart||native>=windowEnd){
    candidate.status="CENSORED_OUTSIDE_APPROVED_SOURCE_WINDOW";
   }else if(sourceAt>cutoff){
    candidate.status="CENSORED_SOURCE_ARRIVED_AFTER_OWN_CUTOFF";
   }else if(expires<=cutoff||
      cutoff-sourceAt>scope.maxPopulationStalenessSeconds*1000){
    candidate.status="CENSORED_SOURCE_TOO_STALE_OR_EXPIRED";
   }else if(clock>=cutoff-MIN_LEAD){
    candidate.status="CENSORED_NO_PROSPECTIVE_PRE_LEAD";
   }else{
    candidate.status="ACTUAL_SOURCE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED";
   }
  }
  out.push(candidate);
 }
 const classifications={} as Record<P5CandidateClassification,number>;
 const keys:P5CandidateClassification[]=[
  "ACTUAL_SOURCE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED",
  "CENSORED_AMBIGUOUS_SOURCE_IDENTITY",
  "CENSORED_NONNATIVE_OR_UNCONFIRMED_OPERATING_MEMBER",
  "CENSORED_MEMBER_NOT_AVAILABLE_BY_ACTUAL_DB_CLOCK",
  "CENSORED_MISSING_NATIVE_T",
  "CENSORED_SOURCE_TOO_STALE_OR_EXPIRED",
  "CENSORED_SOURCE_ARRIVED_AFTER_OWN_CUTOFF",
  "CENSORED_NO_PROSPECTIVE_PRE_LEAD",
  "CENSORED_OUTSIDE_APPROVED_SOURCE_WINDOW"
 ];
 for(const k of keys)classifications[k]=out.filter(x=>x.status===k).length;
 const eligible=classifications.ACTUAL_SOURCE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED;
 return{
  schema:"v39.phase5.actual-source-native-flight-candidates-readonly.v1",
  status:"ACTUAL_SOURCE_CANDIDATE_REVIEW_NOT_PACKET_SIGNING",
  actualDbClockUtc:iso(clock),
  sourcePopulationQueryId:o.population_query_id,
  sourceResponseSha256:o.original_response_hash,
  queryDigestSha256:scope.queryDigestSha256,
  observedMemberCount:out.length,candidateCount:eligible,
  censoredCount:out.length-eligible,
  classifications,candidates:out,
  providerCalls:0,databaseWrites:0,
  signedPrePacketsCreated:0,alertCreates:0,
  providerContentsRightsCertified:false,
  physicalOperatingLegIndependentlyCertified:false,
  nativeTIndependentlyCertified:false,
  phase5ScientificFreezeGranted:false,phase6PaidGoGranted:false
 };
}
/** Exact linkage fields an external reviewer would still need to supply
 * when independently signing a future Stage14 packet. Never auto-approve. */
export type P5FutureExternalReviewPacketFields=Pick<
 P5Stage14SingleFlightPrePermit,
 "independentlyReviewedOperatingLegEvidenceSha256"|
 "independentlyReviewedNativeTEvidenceSha256"|
 "independentlyReviewedRunAndRetentionEvidenceSha256"|
 "frozenBuilderSha256"|"selectedTConfig"|
 "externalNativeTPhysicalLegAndSourceUseReviewed"
>;
export function digestP5ActualSourceCandidateAudit(
 x:P5ActualSourceCandidateAudit
):string{
 if(x?.schema!=="v39.phase5.actual-source-native-flight-candidates-readonly.v1"||
    x.signedPrePacketsCreated!==0||x.providerCalls!==0||
    x.databaseWrites!==0||x.phase6PaidGoGranted!==false)
  fail("UNTRUSTED_SOURCED_CANDIDATE_AUDIT");
 return createHash("sha256").update(JSON.stringify(x)).digest("hex");
}
