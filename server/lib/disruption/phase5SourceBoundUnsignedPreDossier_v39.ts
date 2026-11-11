/**
 * Phase5 real post-COMMIT SOURCE → UNSIGNED future PRE review dossier.
 *
 * Connects actual restricted PG16 candidate audit (#555) to the immutable
 * independently reviewed PRE packet signer boundary (#552/#557).
 *
 * Dossier bytes, SHA or flags alone CANNOT create a Stage14 PRE permit,
 * certify physical operating-leg/native T, legal Contents use, or GO.
 * No provider network calls, SQL, GH dispatch, private keys, file IO, or
 * real current system clock. All source timestamps come from the actual
 * PG16 read-only observation passed by the audited caller.
 *
 * Candidates missing T24 remain a valid review class for separately approved
 * v2 later-only PRE; never fabricate a T24 witness or invalidate unrelated
 * ontime T6/T90.
 */
import {createHash} from "node:crypto";
import {digestP5ActualSourceCandidateAudit,
 type P5ActualSourceCandidateAudit,
 type P5ActualFlightCandidateReview,
 type P5CandidateClassification}
 from "./phase5ActualSourceNativeFlightCandidateAudit_v39";

const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const ID=/^[A-Za-z0-9_.:|-]{5,200}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const HORIZON_MS={
 "T-24h":24*3600_000,"T-6h":6*3600_000,
 "T-90m":90*60000
} as const;
const MAX=2500;
const KNOWN_STATUSES:P5CandidateClassification[]=[
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
const hold=(why:string):never=>{
 throw Error("REFUSED_P5_SOURCE_BOUND_UNSIGNED_DOSSIER_"+why);
};
function timestamp(value:unknown):number{
 if(typeof value!=="string"||!ISO.test(value)||
    !Number.isFinite(Date.parse(value))||
    new Date(value).toISOString()!==value)
  hold("UNREVIEWED_OR_MALFORMED_REAL_SOURCE_UTC");
 return Date.parse(value as string);
}
const hash=(data:string)=>createHash("sha256").update(data).digest("hex");
export interface P5UnsignedSourceDossierPins{
 expectedActualCandidateAuditSha256:string;
 expectedManifestSha256:string;
 expectedQueryDigestSha256:string;
 expectedSourceResponseSha256:string;
 expectedSourcePopulationQueryId:string;
 expectedSourceGithubRunId:string;
 expectedReviewedReleaseSha256:string;
 expectedReviewedSourceRightsSha256:string;
 expectedEarlyDrawSha256:string;
 expectedProviderContractSha256:string;
 expectedSourceDayRegistrySha256:string;
 expectedReviewedMainCodeSha:string;
 expectedRunDayIndex:number;
 expectedSlot:"HUB"|"MID_A"|"MID_B"|"REGIONAL";
 expectedHorizon:"T-24h"|"T-6h"|"T-90m";
 expectedAirportIcao:string;
}
export interface P5UnsignedPreSourceReference{
 manifestSha256:string;
 queryDigestSha256:string;
 expectedSourcePopulationQueryId:string;
 expectedSourceResponseSha256:string;
 runDayIndex:number;
 slot:"HUB"|"MID_A"|"MID_B"|"REGIONAL";
 horizon:"T-24h"|"T-6h"|"T-90m";
 airportIcao:string;
 flightInstanceId:string;
 expectedGithubSourceRunId:string;
 selectedTNativeUtc:string;
 sourceMemberAvailableAtUtc:string;
 ownPreCutoffUtc:string;
 expectedReviewedReleaseSha256:string;
 expectedReviewedSourceRightsSha256:string;
 expectedProviderContractSha256:string;
 expectedEarlyDrawSha256:string;
}
export interface P5UnsignedPreReviewEntry{
 status:"ACTUAL_SOURCE_ELIGIBLE_FOR_EXTERNAL_REVIEW_NOT_SIGNED";
 source:P5UnsignedPreSourceReference;
 sourceAuditSha256:string;
 expectedSourceDayRegistrySha256:string;
 requiredExternalReviews:{
  physicalOperatingLegIdentity:"NOT_CERTIFIED_BY_SOURCE_AUDIT";
  providerNativeScheduledTAndVersion:"NOT_CERTIFIED_BY_SOURCE_AUDIT";
  lawfulSourceContentPurposeAndRetention:"NOT_CERTIFIED_BY_SOURCE_AUDIT";
  independentStage14FrameAndConfig:"NOT_INCLUDED_IN_SOURCE_AUDIT";
  t24WitnessOrExplicitSeparatelyApprovedMissingT24:
    "UNRESOLVED_REVIEW_REQUIRED";
  phase5FreezeAndSeparatePaidPhase6Go:"NOT_GRANTED";
 };
}
export interface P5UnsignedNativePreDossier{
 schema:"v39.phase5.unsigned-native-pre-review-dossier.v1";
 status:"REAL_SOURCE_CANDIDATES_FOR_INDEPENDENT_REVIEW_NO_PACKET_SIGNED";
 sourceObservedDbClockUtc:string;
 reviewedMainCodeSha:string;
 sourceAuditSha256:string;
 sourceDayRegistrySha256:string;
 manifestSha256:string;
 queryDigestSha256:string;
 sourcePopulationQueryId:string;
 sourceResponseSha256:string;
 sourceGithubRunId:string;
 runDayIndex:number;
 horizon:"T-24h"|"T-6h"|"T-90m";
 candidateCount:number;
 censoredCount:number;
 perFlightSourceMissingness:Record<P5CandidateClassification,number>;
 entries:P5UnsignedPreReviewEntry[];
 providerCalls:0;
 databaseReadsPerformedHere:0;
 databaseWrites:0;
 githubChildDispatches:0;
 signedPrePacketsIssued:0;
 legallyPermittedUseCertified:false;
 independentlyVerifiedPhysicalLegHere:false;
 independentSelectedNativeTReviewedHere:false;
 phase5FreezeGranted:false;
 phase6PaidGoGranted:false;
}
/** Pure bounded projection, independently bind SHA of the real PG16
 * audit rather than accepting arbitrary in-memory candidate booleans. */
export function buildP5UnsignedNativePreReviewDossier(
 audit:P5ActualSourceCandidateAudit,
 pins:P5UnsignedSourceDossierPins
):P5UnsignedNativePreDossier{
 if(!pins||
    ![pins.expectedActualCandidateAuditSha256,
      pins.expectedManifestSha256,pins.expectedQueryDigestSha256,
      pins.expectedSourceResponseSha256,
      pins.expectedReviewedReleaseSha256,
      pins.expectedReviewedSourceRightsSha256,
      pins.expectedEarlyDrawSha256,
      pins.expectedProviderContractSha256,
      pins.expectedSourceDayRegistrySha256].every(s=>
       typeof s==="string"&&SHA.test(s))||
    !UUID.test(pins.expectedSourcePopulationQueryId??"")||
    !/^[0-9]{5,25}$/.test(pins.expectedSourceGithubRunId??"")||
    !CODE.test(pins.expectedReviewedMainCodeSha??"")||
    !Number.isSafeInteger(pins.expectedRunDayIndex)||
    pins.expectedRunDayIndex<1||pins.expectedRunDayIndex>31||
    !["HUB","MID_A","MID_B","REGIONAL"].includes(pins.expectedSlot)||
    !["T-24h","T-6h","T-90m"].includes(pins.expectedHorizon)||
    !/^[A-Z]{4}$/.test(pins.expectedAirportIcao??""))
  hold("UNSIGNED_OR_INVALID_INDEPENDENT_SOURCE_SCOPE");
 if(!audit||
    audit.schema!=="v39.phase5.actual-source-native-flight-candidates-readonly.v1"||
    audit.status!=="ACTUAL_SOURCE_CANDIDATE_REVIEW_NOT_PACKET_SIGNING"||
    audit.signedPrePacketsCreated!==0||
    audit.providerCalls!==0||audit.databaseWrites!==0||
    audit.providerContentsRightsCertified!==false||
    audit.physicalOperatingLegIndependentlyCertified!==false||
    audit.nativeTIndependentlyCertified!==false||
    audit.phase5ScientificFreezeGranted!==false||
    audit.phase6PaidGoGranted!==false||
    !Array.isArray(audit.candidates)||
    audit.candidates.length>MAX||
    audit.observedMemberCount!==audit.candidates.length||
    audit.candidateCount+audit.censoredCount!==audit.candidates.length||
    audit.sourcePopulationQueryId!==pins.expectedSourcePopulationQueryId||
    audit.sourceResponseSha256!==pins.expectedSourceResponseSha256||
    audit.queryDigestSha256!==pins.expectedQueryDigestSha256)
  hold("CANDIDATE_AUDIT_UNAUTHENTICATED_OR_SCOPE_CHANGED");
 // Full audit SHA is an independently pinned external readback receipt,
 // not a new signer. A fake SHA repeated only from this object is no proof.
 if(digestP5ActualSourceCandidateAudit(audit)!==
    pins.expectedActualCandidateAuditSha256)
  hold("ACTUAL_SOURCE_CANDIDATE_BYTES_HASH_CHANGED");
 if(!audit.classifications||
    Object.keys(audit.classifications).length!==KNOWN_STATUSES.length||
    KNOWN_STATUSES.some(k=>!Number.isSafeInteger(audit.classifications[k])||
       audit.classifications[k]<0))
  hold("MISSING_OR_EXTRA_SOURCE_CENSOR_REASON");
 const now=timestamp(audit.actualDbClockUtc);
 const seen=new Set<string>();
 const entries:P5UnsignedPreReviewEntry[]=[];
 const tally={} as Record<P5CandidateClassification,number>;
 for(const [key,value] of Object.entries(audit.classifications)){
  if(!Number.isSafeInteger(value)||value<0)
   hold("UNTRUSTED_SOURCE_MISSINGNESS_COUNTS");
  tally[key as P5CandidateClassification]=0;
 }
 for(const c of audit.candidates){
  if(!c||!ID.test(c.flightInstanceId??"")||
     c.manifestSha256!==pins.expectedManifestSha256||
     c.queryDigestSha256!==pins.expectedQueryDigestSha256||
     c.sourcePopulationQueryId!==pins.expectedSourcePopulationQueryId||
     c.sourceResponseSha256!==pins.expectedSourceResponseSha256||
     c.runDayIndex!==pins.expectedRunDayIndex||
     c.slot!==pins.expectedSlot||
     c.horizon!==pins.expectedHorizon||
     c.sourceAirportIcao!==pins.expectedAirportIcao||
     c.externalNativeTAndPhysicalIdentityReviewRequired!==true||
     c.contentsRightsCertifiedHere!==false||
     c.stage14PermitIssuedHere!==false||
     c.providerCalls!==0||c.databaseWrites!==0||
     (seen.has(c.flightInstanceId)&&
      c.status!=="CENSORED_AMBIGUOUS_SOURCE_IDENTITY"))
   hold("CROSS_DAY_DUPLICATE_OR_SELF_CERTIFIED_FLIGHT");
  seen.add(c.flightInstanceId);
  if(!Object.prototype.hasOwnProperty.call(audit.classifications,c.status))
   hold("UNKNOWN_CANDIDATE_MISSINGNESS_STATUS");
  tally[c.status]=(tally[c.status]??0)+1;
  if(c.status!=="ACTUAL_SOURCE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED")
   continue;
  if(typeof c.selectedTNativeUtc!=="string"||
     typeof c.ownCutoffUtc!=="string"||
     typeof c.actualMemberAvailableUtc!=="string")
   hold("ELIGIBLE_FLIGHT_MISSING_ORIGINAL_NATIVE_TIME");
  const selected=timestamp(c.selectedTNativeUtc),
    cutoff=timestamp(c.ownCutoffUtc),
    available=timestamp(c.actualMemberAvailableUtc);
  if(selected-cutoff!==HORIZON_MS[pins.expectedHorizon]||
     cutoff-now<=15*60000||
     available>now||available>cutoff)
   hold("RETROSPECTIVE_OR_CHANGED_FLIGHT_NATIVE_CUTOFF");
  entries.push({
   status:"ACTUAL_SOURCE_ELIGIBLE_FOR_EXTERNAL_REVIEW_NOT_SIGNED",
   source:{
    manifestSha256:pins.expectedManifestSha256,
    queryDigestSha256:pins.expectedQueryDigestSha256,
    expectedSourcePopulationQueryId:pins.expectedSourcePopulationQueryId,
    expectedSourceResponseSha256:pins.expectedSourceResponseSha256,
    runDayIndex:pins.expectedRunDayIndex,
    slot:pins.expectedSlot,
    horizon:pins.expectedHorizon,
    airportIcao:pins.expectedAirportIcao,
    flightInstanceId:c.flightInstanceId,
    expectedGithubSourceRunId:pins.expectedSourceGithubRunId,
    selectedTNativeUtc:c.selectedTNativeUtc,
    sourceMemberAvailableAtUtc:c.actualMemberAvailableUtc,
    ownPreCutoffUtc:c.ownCutoffUtc,
    expectedReviewedReleaseSha256:pins.expectedReviewedReleaseSha256,
    expectedReviewedSourceRightsSha256:
     pins.expectedReviewedSourceRightsSha256,
    expectedProviderContractSha256:pins.expectedProviderContractSha256,
    expectedEarlyDrawSha256:pins.expectedEarlyDrawSha256
   },
   sourceAuditSha256:pins.expectedActualCandidateAuditSha256,
   expectedSourceDayRegistrySha256:pins.expectedSourceDayRegistrySha256,
   requiredExternalReviews:{
    physicalOperatingLegIdentity:"NOT_CERTIFIED_BY_SOURCE_AUDIT",
    providerNativeScheduledTAndVersion:"NOT_CERTIFIED_BY_SOURCE_AUDIT",
    lawfulSourceContentPurposeAndRetention:"NOT_CERTIFIED_BY_SOURCE_AUDIT",
    independentStage14FrameAndConfig:"NOT_INCLUDED_IN_SOURCE_AUDIT",
    t24WitnessOrExplicitSeparatelyApprovedMissingT24:
      "UNRESOLVED_REVIEW_REQUIRED",
    phase5FreezeAndSeparatePaidPhase6Go:"NOT_GRANTED"
   }
  });
 }
 for(const [key,value] of Object.entries(audit.classifications))
  if(tally[key as P5CandidateClassification]!==value)
   hold("CENSOR_AND_CANDIDATE_COUNTS_NOT_RECONCILED");
 if(entries.length!==audit.candidateCount)
  hold("ACTUAL_CANDIDATE_COUNT_NOT_RECONCILED");
 entries.sort((a,b)=>
  a.source.ownPreCutoffUtc.localeCompare(b.source.ownPreCutoffUtc)||
  a.source.flightInstanceId.localeCompare(b.source.flightInstanceId));
 return{
  schema:"v39.phase5.unsigned-native-pre-review-dossier.v1",
  status:"REAL_SOURCE_CANDIDATES_FOR_INDEPENDENT_REVIEW_NO_PACKET_SIGNED",
  sourceObservedDbClockUtc:audit.actualDbClockUtc,
  reviewedMainCodeSha:pins.expectedReviewedMainCodeSha,
  sourceAuditSha256:pins.expectedActualCandidateAuditSha256,
  sourceDayRegistrySha256:pins.expectedSourceDayRegistrySha256,
  manifestSha256:pins.expectedManifestSha256,
  queryDigestSha256:pins.expectedQueryDigestSha256,
  sourcePopulationQueryId:pins.expectedSourcePopulationQueryId,
  sourceResponseSha256:pins.expectedSourceResponseSha256,
  sourceGithubRunId:pins.expectedSourceGithubRunId,
  runDayIndex:pins.expectedRunDayIndex,horizon:pins.expectedHorizon,
  candidateCount:audit.candidateCount,censoredCount:audit.censoredCount,
  perFlightSourceMissingness:{...audit.classifications},
  entries,providerCalls:0,databaseReadsPerformedHere:0,
  databaseWrites:0,githubChildDispatches:0,signedPrePacketsIssued:0,
  legallyPermittedUseCertified:false,
  independentlyVerifiedPhysicalLegHere:false,
  independentSelectedNativeTReviewedHere:false,
  phase5FreezeGranted:false,phase6PaidGoGranted:false
 };
}
/** Stable printable digest, not an authority signature. A protected
 * independently approved expected SHA must be bound by the downstream
 * reviewer in addition to the original actual source audit hash. */
export function digestP5UnsignedNativePreDossier(
 dossier:P5UnsignedNativePreDossier
):string{
 if(!dossier||
    dossier.schema!=="v39.phase5.unsigned-native-pre-review-dossier.v1"||
    dossier.signedPrePacketsIssued!==0||
    dossier.phase5FreezeGranted!==false||
    dossier.phase6PaidGoGranted!==false)
  hold("SIGNER_SCOPE_NOT_AN_UNSIGNED_SOURCE_DOSSIER");
 return hash(JSON.stringify(dossier));
}

/**
 * Deterministic *unsigned* 96-entry review pages for a busy HUB. A page
 * digest is NEVER a signed SOURCE/PRE registry SHA. The real signer must
 * separately approve packet bytes, code, rights and each future day.
 * This function consumes only one already observed original source,
 * never rotates future day/calendar slots or draws future airports.
 */
export interface P5UnsignedNativePreReviewPage{
 schema:"v39.phase5.unsigned-native-pre-review-page.v1";
 status:"REVIEW_PAGE_NOT_SIGNED_PACKET_OR_PRODUCTION_REGISTRY";
 sourceDossierSha256:string;
 originalSourceAuditSha256:string;
 runDayIndex:number;
 pageIndex:number;
 totalPages:number;
 candidateCountInPage:number;
 entries:P5UnsignedPreReviewEntry[];
 signedPacketsIssued:0;
 independentRightsCertified:false;
 providerCalls:0;databaseWrites:0;paidPhase6GoGranted:false;
}
export function pageP5UnsignedNativePreReviewDossier(
 dossier:P5UnsignedNativePreDossier
):P5UnsignedNativePreReviewPage[]{
 const digest=digestP5UnsignedNativePreDossier(dossier);
 if(!Array.isArray(dossier.entries)||
    dossier.entries.length!==dossier.candidateCount||
    dossier.entries.length>MAX||
    dossier.entries.some(e=>
     !e||e.status!=="ACTUAL_SOURCE_ELIGIBLE_FOR_EXTERNAL_REVIEW_NOT_SIGNED"||
     e.source.runDayIndex!==dossier.runDayIndex||
     e.source.queryDigestSha256!==dossier.queryDigestSha256||
     e.source.sourceResponseSha256===undefined))
  hold("UNTRUSTED_UNSIGNED_REVIEW_PAGE_SOURCE_SCOPE");
 const total=Math.ceil(dossier.entries.length/96);
 const pages:P5UnsignedNativePreReviewPage[]=[];
 for(let i=0;i<total;i++){
  const entries=dossier.entries.slice(i*96,(i+1)*96);
  pages.push({
   schema:"v39.phase5.unsigned-native-pre-review-page.v1",
   status:"REVIEW_PAGE_NOT_SIGNED_PACKET_OR_PRODUCTION_REGISTRY",
   sourceDossierSha256:digest,
   originalSourceAuditSha256:dossier.sourceAuditSha256,
   runDayIndex:dossier.runDayIndex,pageIndex:i+1,totalPages:total,
   candidateCountInPage:entries.length,entries,
   signedPacketsIssued:0,independentRightsCertified:false,
   providerCalls:0,databaseWrites:0,paidPhase6GoGranted:false
  });
 }
 return pages;
}
