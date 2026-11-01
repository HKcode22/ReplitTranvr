/**
 * Phase 4 Gate 5: ZERO-PROVIDER candidate license/retention evidence check.
 *
 * AeroDataBox Sep7 2026 terms announcement: Nov7 2026 existing subscriber
 * transition (subject to exceptions); current Terms art 5.5 defaults to
 * seven consecutive calendar days unless authenticated exceptions apply.
 * Content includes reformatting/selection of per-flight fields. Do not
 * automatically call normalized per-flight rows independently Derived Work.
 *
 * This is NOT legal advice, a legal clearance, an account-plan lookup, an
 * actual-flight/selected-T proof, an original source rehydrator, or a release
 * authorization. It does not delete protected source; an owner must separately
 * review rights and expiration under the actual plan and customer agreement.
 */
export const P4_GATE5_RETENTION_REVIEW_SCHEMA_V39 =
  "v39.phase4.gate5-retention-admissibility-review.v1" as const;
export const P4_GATE5_PROVIDER_TERMS_UPDATED_V39 = "2026-10-11" as const;
export const P4_GATE5_EXISTING_ACCOUNT_TRANSITION_DATE_V39 = "2026-11-07" as const;
export const P4_GATE5_PROVIDER_TERMS_URI_V39 = "https://aerodatabox.com/terms" as const;
export const P4_GATE5_PROVIDER_ANNOUNCEMENT_URI_V39 =
  "https://aerodatabox.com/2026-09-terms-update" as const;
export const P4_GATE5_STANDARD_SECONDS_V39 = 7 * 24 * 60 * 60;

export type P4Gate5SourceContentClassV39 =
  | "ORIGINAL_API_PAYLOAD"
  | "PER_FLIGHT_NORMALIZED_RECORD"
  | "CLAIMED_NONRECONSTRUCTABLE_DERIVED_WORK";
export type P4Gate5PlanEvidenceV39 =
  | "UNVERIFIED"
  | "STANDARD_SEVEN_DAY_CLAIM"
  | "EXTENDED_ACTIVE_SUBSCRIPTION_CLAIM"
  | "CUSTOM_CONTRACT_CLAIM";

export interface P4Gate5RetentionReviewInputV39 {
  retrievedAtUtc:string;
  proposedReadAtUtc:string;
  sourceTechnicallyRetained:boolean;
  technicalExpiresAtUtc:string|null;
  sourceContentClass:P4Gate5SourceContentClassV39;
  sourceChannel:"RAPIDAPI"|"APIMARKET"|"DIRECT";
  subscriptionPlanEvidence:P4Gate5PlanEvidenceV39;
  verifiedAccountPlanDocumentSha256:string|null;
  originalResponseCacheControlMaxAgeSeconds:number|null;
  originalCacheHeaderAuthenticated:boolean;
  permittedPurposeIndependentReviewComplete:boolean;
  independentDerivedWorkQualificationReviewed:boolean;
  originalSourceProviderActualityCertified:boolean;
  originalSourceSelectedTMilestoneCertified:boolean;
}
const EXACT_UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const SHA=/^[a-f0-9]{64}$/;
function utc(value:string,reason:string):number {
 if(typeof value!=="string"||!EXACT_UTC.test(value))
  throw Error("P4_GATE5_RIGHTS_INVALID_TIMESTAMP:"+reason);
 const n=Date.parse(value);
 if(!Number.isFinite(n)||new Date(n).toISOString()!==value)
  throw Error("P4_GATE5_RIGHTS_INVALID_TIMESTAMP:"+reason);
 return n;
}
export function assessP4Gate5RetentionEvidenceV39(input:P4Gate5RetentionReviewInputV39) {
 if(!input||typeof input!=="object")
  throw Error("P4_GATE5_RIGHTS_MISSING_INPUT");
 const retrieved=utc(input.retrievedAtUtc,"retrieved");
 const proposed=utc(input.proposedReadAtUtc,"read");
 if(proposed<retrieved)
  throw Error("P4_GATE5_RIGHTS_READ_BEFORE_RETRIEVAL");
 const expiry=input.technicalExpiresAtUtc===null?null:
  utc(input.technicalExpiresAtUtc,"technical_expiry");
 if(!["ORIGINAL_API_PAYLOAD","PER_FLIGHT_NORMALIZED_RECORD",
  "CLAIMED_NONRECONSTRUCTABLE_DERIVED_WORK"].includes(input.sourceContentClass)||
  !["RAPIDAPI","APIMARKET","DIRECT"].includes(input.sourceChannel)||
  !["UNVERIFIED","STANDARD_SEVEN_DAY_CLAIM",
   "EXTENDED_ACTIVE_SUBSCRIPTION_CLAIM","CUSTOM_CONTRACT_CLAIM"]
    .includes(input.subscriptionPlanEvidence)||
  typeof input.sourceTechnicallyRetained!=="boolean"||
  typeof input.originalCacheHeaderAuthenticated!=="boolean"||
  typeof input.permittedPurposeIndependentReviewComplete!=="boolean"||
  typeof input.independentDerivedWorkQualificationReviewed!=="boolean"||
  typeof input.originalSourceProviderActualityCertified!=="boolean"||
  typeof input.originalSourceSelectedTMilestoneCertified!=="boolean"||
  !(input.verifiedAccountPlanDocumentSha256===null||
    (typeof input.verifiedAccountPlanDocumentSha256==="string"&&
      SHA.test(input.verifiedAccountPlanDocumentSha256)))||
  !(input.originalResponseCacheControlMaxAgeSeconds===null||
    (Number.isSafeInteger(input.originalResponseCacheControlMaxAgeSeconds)&&
     input.originalResponseCacheControlMaxAgeSeconds>=0&&
     input.originalResponseCacheControlMaxAgeSeconds<=365*24*3600)))
  throw Error("P4_GATE5_RIGHTS_EVIDENCE_FORMAT_HOLD");

 const cutoffMs=retrieved+P4_GATE5_STANDARD_SECONDS_V39*1000;
 const beyondDefault=proposed>=cutoffMs;
 const afterTechnicalExpiry=expiry!==null&&proposed>=expiry;
 const blockers:string[]=[];
 if(!input.sourceTechnicallyRetained)
  blockers.push("SOURCE_NOT_RETAINED_AT_REVIEW");
 if(expiry===null)blockers.push("TECHNICAL_EXPIRY_UNKNOWN");
 if(afterTechnicalExpiry)blockers.push("TECHNICAL_SOURCE_EXPIRED_AT_REVIEW");
 // No inferred subscription age, provider contractual exemption, or
 // actual-plan rights. User-supplied SHA is a pointer, not authenticated proof.
 if(input.subscriptionPlanEvidence==="UNVERIFIED"||
   input.verifiedAccountPlanDocumentSha256===null)
  blockers.push("ACCOUNT_SPECIFIC_PLAN_RIGHTS_UNVERIFIED");
 else blockers.push("ACCOUNT_PLAN_ASSERTION_REQUIRES_INDEPENDENT_VALIDATION");
 if(beyondDefault)blockers.push("BEYOND_DEFAULT_SEVEN_DAY_CEILING_NEEDS_EXCEPTION_PROOF");
 if(input.originalResponseCacheControlMaxAgeSeconds!==null){
  blockers.push(input.originalCacheHeaderAuthenticated
   ?"CACHE_CONTROL_EXCEPTION_REQUIRES_INDEPENDENT_RIGHTS_REVIEW"
   :"UNAUTHENTICATED_CACHE_CONTROL_CANNOT_EXTEND_RETENTION");
 }
 if(!input.permittedPurposeIndependentReviewComplete)
  blockers.push("PERMITTED_PURPOSE_UNVERIFIED");
 if(input.sourceContentClass==="PER_FLIGHT_NORMALIZED_RECORD")
  blockers.push("PER_FLIGHT_NORMALIZATION_IS_NOT_AUTOMATIC_DERIVED_WORK");
 if(input.sourceContentClass==="CLAIMED_NONRECONSTRUCTABLE_DERIVED_WORK")
  blockers.push(input.independentDerivedWorkQualificationReviewed
   ?"DERIVED_WORK_QUALIFICATION_STILL_NEEDS_LICENSE_REVIEW"
   :"DERIVED_WORK_QUALIFICATION_UNVERIFIED");
 if(!input.originalSourceSelectedTMilestoneCertified)
  blockers.push("SELECTED_PROVIDER_NATIVE_T_UNVERIFIED");
 if(!input.originalSourceProviderActualityCertified)
  blockers.push("PER_VALUE_ACTUAL_WHEELS_OFF_UNVERIFIED");
 // The November 7 announcement does not specify a universal exact UTC
 // hour nor prove whether an account is grandfathered or its plan is active.
 // This is a calendar-date warning, not an expiry operation.
 const transitionReviewFlag=input.proposedReadAtUtc.slice(0,10)>=
  P4_GATE5_EXISTING_ACCOUNT_TRANSITION_DATE_V39;
 if(transitionReviewFlag)blockers.push("NOV7_TERMS_ACCOUNT_TRANSITION_REVIEW");
 return {
  schema:P4_GATE5_RETENTION_REVIEW_SCHEMA_V39,
  status:"RIGHTS_AND_SCIENTIFIC_SOURCE_EVIDENCE_HOLD" as const,
  providerTermsLastUpdatedDate:P4_GATE5_PROVIDER_TERMS_UPDATED_V39,
  existingAccountTransitionReviewDate:P4_GATE5_EXISTING_ACCOUNT_TRANSITION_DATE_V39,
  sourceChannel:input.sourceChannel,
  sourceClass:input.sourceContentClass,
  normalizingFlightRowsDoesNotAutomaticallyProduceDerivedWork:
   input.sourceContentClass==="PER_FLIGHT_NORMALIZED_RECORD",
  standardSevenDayReviewCutoffUtc:new Date(cutoffMs).toISOString(),
  withinStandardSevenDayTimingCandidate:!beyondDefault,
  technicallyRetainedAtRead:input.sourceTechnicallyRetained&&
   expiry!==null&&!afterTechnicalExpiry,
  technicalExpiryKnown:expiry!==null,
  sourceOriginalPayloadRightsCertified:false as const,
  independentAccountPlanRightsCertified:false as const,
  independentlyActualOnlyWheelsOffCertified:false as const,
  independentSelectedTProofCertified:false as const,
  derivedWorkOrExceptionPermitted:false as const,
  blockers,
  scientificGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const,
  paidPilotDispatched:false as const,
  providerCalls:0 as const,
  databaseWrites:0 as const
 };
}
