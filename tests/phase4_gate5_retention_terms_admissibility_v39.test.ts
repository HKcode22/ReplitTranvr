import {describe,it,expect} from "vitest";
import {
 assessP4Gate5RetentionEvidenceV39,
 P4_GATE5_EXISTING_ACCOUNT_TRANSITION_DATE_V39,
 P4_GATE5_PROVIDER_TERMS_UPDATED_V39,
 type P4Gate5RetentionReviewInputV39
} from "../server/lib/disruption/phase4Gate5RetentionTermsAdmissibility_v39";
const fixture=():P4Gate5RetentionReviewInputV39=>({
 retrievedAtUtc:"2026-10-31T14:37:02.771Z",
 proposedReadAtUtc:"2026-11-01T03:24:29.066Z",
 sourceTechnicallyRetained:true,
 technicalExpiresAtUtc:"2026-11-03T14:37:02.771Z",
 sourceContentClass:"ORIGINAL_API_PAYLOAD",
 sourceChannel:"RAPIDAPI",
 subscriptionPlanEvidence:"UNVERIFIED",
 verifiedAccountPlanDocumentSha256:null,
 originalResponseCacheControlMaxAgeSeconds:null,
 originalCacheHeaderAuthenticated:false,
 permittedPurposeIndependentReviewComplete:false,
 independentDerivedWorkQualificationReviewed:false,
 originalSourceProviderActualityCertified:false,
 originalSourceSelectedTMilestoneCertified:false
});
describe("Phase4 Gate5 provider retention terms: conservative proof gate",()=>{
 it("shows seven-day review window but never licenses raw source from time alone",()=>{
  const result=assessP4Gate5RetentionEvidenceV39(fixture());
  expect(result.standardSevenDayReviewCutoffUtc)
    .toBe("2026-11-07T14:37:02.771Z");
  expect(result.withinStandardSevenDayTimingCandidate).toBe(true);
  expect(result.technicallyRetainedAtRead).toBe(true);
  expect(result.independentAccountPlanRightsCertified).toBe(false);
  expect(result.scientificGate5Passed).toBe(false);
  expect(result.phase5FreezeAuthorized).toBe(false);
  expect(result.phase6Authorized).toBe(false);
  expect(result.providerCalls).toBe(0);
  expect(result.databaseWrites).toBe(0);
  expect(result.blockers).toContain("ACCOUNT_SPECIFIC_PLAN_RIGHTS_UNVERIFIED");
 });
 it("flags Nov7 announced transition and elapsed standard seven-day ceiling",()=>{
  const x=fixture();x.proposedReadAtUtc="2026-11-08T14:37:02.771Z";
  const a=assessP4Gate5RetentionEvidenceV39(x);
  expect(P4_GATE5_EXISTING_ACCOUNT_TRANSITION_DATE_V39).toBe("2026-11-07");
  expect(P4_GATE5_PROVIDER_TERMS_UPDATED_V39).toBe("2026-10-11");
  expect(a.withinStandardSevenDayTimingCandidate).toBe(false);
  expect(a.blockers).toContain("NOV7_TERMS_ACCOUNT_TRANSITION_REVIEW");
  expect(a.blockers).toContain("BEYOND_DEFAULT_SEVEN_DAY_CEILING_NEEDS_EXCEPTION_PROOF");
  expect(a.technicallyRetainedAtRead).toBe(false);
 });
 it("considers unknown technical expiration UNKNOWN even when payload is present",()=>{
  const x=fixture();x.technicalExpiresAtUtc=null;
  const a=assessP4Gate5RetentionEvidenceV39(x);
  expect(a.technicalExpiryKnown).toBe(false);
  expect(a.technicallyRetainedAtRead).toBe(false);
  expect(a.blockers).toContain("TECHNICAL_EXPIRY_UNKNOWN");
 });
 it("marks normalized individual flight records as Contents candidate, never auto derived work",()=>{
  const x=fixture();x.sourceContentClass="PER_FLIGHT_NORMALIZED_RECORD";
  const a=assessP4Gate5RetentionEvidenceV39(x);
  expect(a.normalizingFlightRowsDoesNotAutomaticallyProduceDerivedWork).toBe(true);
  expect(a.blockers).toContain("PER_FLIGHT_NORMALIZATION_IS_NOT_AUTOMATIC_DERIVED_WORK");
  expect(a.derivedWorkOrExceptionPermitted).toBe(false);
 });
 it("self-reported extended subscription and hash do not prove rights",()=>{
  const x=fixture();
  x.subscriptionPlanEvidence="EXTENDED_ACTIVE_SUBSCRIPTION_CLAIM";
  x.verifiedAccountPlanDocumentSha256="a".repeat(64);
  x.originalSourceProviderActualityCertified=true;
  x.originalSourceSelectedTMilestoneCertified=true;
  x.permittedPurposeIndependentReviewComplete=true;
  const a=assessP4Gate5RetentionEvidenceV39(x);
  expect(a.blockers).toContain("ACCOUNT_PLAN_ASSERTION_REQUIRES_INDEPENDENT_VALIDATION");
  expect(a.sourceOriginalPayloadRightsCertified).toBe(false);
  expect(a.independentlyActualOnlyWheelsOffCertified).toBe(false);
  expect(a.independentSelectedTProofCertified).toBe(false);
  expect(a.scientificGate5Passed).toBe(false);
 });
 it("cache header cannot silently extend provider rights",()=>{
  const x=fixture();
  x.originalResponseCacheControlMaxAgeSeconds=30*86400;
  x.originalCacheHeaderAuthenticated=false;
  const a=assessP4Gate5RetentionEvidenceV39(x);
  expect(a.blockers).toContain("UNAUTHENTICATED_CACHE_CONTROL_CANNOT_EXTEND_RETENTION");
  x.originalCacheHeaderAuthenticated=true;
  const b=assessP4Gate5RetentionEvidenceV39(x);
  expect(b.blockers).toContain("CACHE_CONTROL_EXCEPTION_REQUIRES_INDEPENDENT_RIGHTS_REVIEW");
  expect(b.independentAccountPlanRightsCertified).toBe(false);
 });
 it("claimed derived work remains review-only even when marked independently reviewed",()=>{
  const x=fixture();
  x.sourceContentClass="CLAIMED_NONRECONSTRUCTABLE_DERIVED_WORK";
  x.independentDerivedWorkQualificationReviewed=true;
  const a=assessP4Gate5RetentionEvidenceV39(x);
  expect(a.blockers).toContain("DERIVED_WORK_QUALIFICATION_STILL_NEEDS_LICENSE_REVIEW");
  expect(a.derivedWorkOrExceptionPermitted).toBe(false);
 });
 it("refuses impossible date, second-before-retrieval, unknown class and invalid hash",()=>{
  const x=fixture();x.proposedReadAtUtc="2026-10-31T14:37:02.770Z";
  expect(()=>assessP4Gate5RetentionEvidenceV39(x))
    .toThrow("P4_GATE5_RIGHTS_READ_BEFORE_RETRIEVAL");
  const y=fixture();y.retrievedAtUtc="2026-02-30T14:37:02.771Z";
  expect(()=>assessP4Gate5RetentionEvidenceV39(y))
    .toThrow("P4_GATE5_RIGHTS_INVALID_TIMESTAMP");
  const z=fixture();z.verifiedAccountPlanDocumentSha256="not-sha";
  expect(()=>assessP4Gate5RetentionEvidenceV39(z))
    .toThrow("P4_GATE5_RIGHTS_EVIDENCE_FORMAT_HOLD");
  const p=fixture();p.sourceChannel="OTHER" as any;
  expect(()=>assessP4Gate5RetentionEvidenceV39(p))
    .toThrow("P4_GATE5_RIGHTS_EVIDENCE_FORMAT_HOLD");
 });
});
