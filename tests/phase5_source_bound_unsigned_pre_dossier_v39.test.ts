import {describe,it,expect} from "vitest";
import {auditP5ActualSourceFlightCandidates,
 digestP5ActualSourceCandidateAudit,
 type P5ActualBoundOriginalRow,
 type P5ActualFlightPopulationRow,
 type P5ActualSourceCandidateScope}
 from "../server/lib/disruption/phase5ActualSourceNativeFlightCandidateAudit_v39";
import {
 buildP5UnsignedNativePreReviewDossier,
 digestP5UnsignedNativePreDossier,
 pageP5UnsignedNativePreReviewDossier,
 type P5UnsignedSourceDossierPins}
 from "../server/lib/disruption/phase5SourceBoundUnsignedPreDossier_v39";
const H=(x:string)=>x.repeat(64);
const UUID="a23e4567-e89b-42d3-a456-426614174000";
const selectedT="2027-02-10T12:00:00.000Z";
const scope:P5ActualSourceCandidateScope={
 manifestSha256:H("1"),queryDigestSha256:H("2"),
 reviewedReleaseSha256:H("3"),rightsReviewSha256:H("4"),
 providerContractSha256:H("5"),earlyDrawSha256:H("6"),
 runDayIndex:4,slot:"HUB",horizon:"T-6h",airportIcao:"WSSS",
 expectedSourceGithubRunId:"42899999999",
 maxPopulationStalenessSeconds:7200
};
function actual(count=3){
 const original:P5ActualBoundOriginalRow={
  manifest_sha256:scope.manifestSha256,run_day_index:4,
  slot_id:"HUB",horizon:"T-6h",airport_icao:"WSSS",
  github_run_id:scope.expectedSourceGithubRunId,
  state:"ACTIVE",early_draw_sha256:scope.earlyDrawSha256,
  reviewed_release_sha256:scope.reviewedReleaseSha256,
  rights_review_sha256:scope.rightsReviewSha256,
  provider_contract_sha256:scope.providerContractSha256,
  service_window_start_utc:"2027-02-10T11:00:00.000Z",
  service_window_end_utc:"2027-02-10T13:00:00.000Z",
  attempt_run_id:scope.expectedSourceGithubRunId,
  reserved_at:"2027-02-10T04:29:00.000Z",
  population_query_id:UUID,original_response_hash:H("a"),
  bound_rights:scope.rightsReviewSha256,
  source_expires_at_utc:"2027-02-10T10:00:00.000Z",
  normalized_members_count:count,
  bound_at_utc:"2027-02-10T04:31:00.000Z",
  source_available:"2027-02-10T04:30:00.000Z",
  fids_retrieval_utc:"2027-02-10T04:29:15.000Z",
  raw_persisted_at_utc:"2027-02-10T04:29:20.000Z",
  fids_response_hash:H("a"),fids_airport_icao:"WSSS",
  original_current:true
 };
 const members:P5ActualFlightPopulationRow[]=
  Array.from({length:count},(_,i)=>{
   const id="leg:future:"+String(i).padStart(5,"0");
   return{
    population_query_id:UUID,analytic_identity_id:id,
    canonical_flight_instance_id:id,
    source_airport_icao:"WSSS",dep_airport_icao:"WSSS",
    population_role:"requested_airport_primary",
    scope_classification:"confirmed_core",
    codeshare_resolution_status:"confirmed_operating_leg",
    source_type:"fids",response_hash:H("a"),
    provider_content_expired_at_utc:null,
    available_at:"2027-02-10T04:30:10.000Z",
    dep_scheduled_utc:selectedT,
    population_member_id:"member-"+i,
    flight_number:"AB123",arr_airport_icao:"OMAA",
    query_direction:"Departure"
   };
  });
 const audit=auditP5ActualSourceFlightCandidates(
  scope,[original],members,"2027-02-10T05:00:00.000Z");
 const pins:P5UnsignedSourceDossierPins={
  expectedActualCandidateAuditSha256:
   digestP5ActualSourceCandidateAudit(audit),
  expectedManifestSha256:scope.manifestSha256,
  expectedQueryDigestSha256:scope.queryDigestSha256,
  expectedSourceResponseSha256:H("a"),
  expectedSourcePopulationQueryId:UUID,
  expectedSourceGithubRunId:scope.expectedSourceGithubRunId,
  expectedReviewedReleaseSha256:scope.reviewedReleaseSha256,
  expectedReviewedSourceRightsSha256:scope.rightsReviewSha256,
  expectedEarlyDrawSha256:scope.earlyDrawSha256,
  expectedProviderContractSha256:scope.providerContractSha256,
  expectedSourceDayRegistrySha256:H("b"),
  expectedReviewedMainCodeSha:"d".repeat(40),
  expectedRunDayIndex:4,
  expectedSlot:"HUB",expectedHorizon:"T-6h",
  expectedAirportIcao:"WSSS"
 };
 return{audit,pins};
}
describe("actual SOURCE → UNSIGNED future PRE reviewer dossier",()=>{
 it("projects only genuine prospective native flight and source hash, not independent attestations",()=>{
  const {audit,pins}=actual();
  const docket=buildP5UnsignedNativePreReviewDossier(audit,pins);
  expect(docket.candidateCount).toBe(3);
  expect(docket.entries).toHaveLength(3);
  expect(docket.entries[0].source.expectedSourceResponseSha256)
   .toBe(H("a"));
  expect(docket.entries[0].source.flightInstanceId)
   .toBe("leg:future:00000");
  expect(docket.entries[0].source.ownPreCutoffUtc)
   .toBe("2027-02-10T06:00:00.000Z");
  expect(docket.entries[0].requiredExternalReviews.physicalOperatingLegIdentity)
   .toBe("NOT_CERTIFIED_BY_SOURCE_AUDIT");
  expect(docket.entries[0].requiredExternalReviews.
   t24WitnessOrExplicitSeparatelyApprovedMissingT24)
   .toBe("UNRESOLVED_REVIEW_REQUIRED");
  expect(docket.signedPrePacketsIssued).toBe(0);
  expect(docket.phase6PaidGoGranted).toBe(false);
  expect(docket.legallyPermittedUseCertified).toBe(false);
  expect(digestP5UnsignedNativePreDossier(docket))
   .toMatch(/^[a-f0-9]{64}$/);
 });
 it("rejects post-COMMIT source candidate audit altered after independent SHA pin",()=>{
  const {audit,pins}=actual();
  const changed={...audit,sourceResponseSha256:H("f")};
  expect(()=>buildP5UnsignedNativePreReviewDossier(changed,pins))
   .toThrow("CANDIDATE_AUDIT_UNAUTHENTICATED_OR_SCOPE_CHANGED");
  const mutated={...audit,candidates:audit.candidates.map((c,i)=>
   i===0?{...c,flightInstanceId:"leg:injected:future"}:c)};
  expect(()=>buildP5UnsignedNativePreReviewDossier(mutated,pins))
   .toThrow("ACTUAL_SOURCE_CANDIDATE_BYTES_HASH_CHANGED");
  expect(()=>buildP5UnsignedNativePreReviewDossier(audit,{
   ...pins,expectedSourceDayRegistrySha256:"not-signed"
  })).toThrow("UNSIGNED_OR_INVALID_INDEPENDENT_SOURCE_SCOPE");
 });
 it("keeps ordinary missing T per-flight, without creating a fake packet or invalidating others",()=>{
  const {audit,pins}=actual();
  const newCandidate=audit.candidates.map((c,i)=>
   i===1?{...c,status:"CENSORED_MISSING_NATIVE_T" as const,
    selectedTNativeUtc:null,ownCutoffUtc:null}:c);
  const amended={
   ...audit,candidates:newCandidate,
   candidateCount:2,censoredCount:1,
   classifications:{...audit.classifications,
    ACTUAL_SOURCE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED:2,
    CENSORED_MISSING_NATIVE_T:1}
  };
  const d=buildP5UnsignedNativePreReviewDossier(amended,{
   ...pins,expectedActualCandidateAuditSha256:
    digestP5ActualSourceCandidateAudit(amended)});
  expect(d.candidateCount).toBe(2);
  expect(d.censoredCount).toBe(1);
  expect(d.entries).toHaveLength(2);
  expect(d.perFlightSourceMissingness.CENSORED_MISSING_NATIVE_T).toBe(1);
  expect(d.signedPrePacketsIssued).toBe(0);
 });
 it("accepts duplicate ambiguous identity only as censored, never issues duplicate review packets",()=>{
  const {audit,pins}=actual();
  const ids=audit.candidates.map((c,i)=>
   i<2?{...c,flightInstanceId:"leg:duplicate:1",
    status:"CENSORED_AMBIGUOUS_SOURCE_IDENTITY" as const}:c);
  const change={
   ...audit,candidates:ids,
   candidateCount:1,censoredCount:2,
   classifications:{...audit.classifications,
    ACTUAL_SOURCE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED:1,
    CENSORED_AMBIGUOUS_SOURCE_IDENTITY:2}
  };
  const d=buildP5UnsignedNativePreReviewDossier(change,{
   ...pins,expectedActualCandidateAuditSha256:
    digestP5ActualSourceCandidateAudit(change)});
  expect(d.entries).toHaveLength(1);
  expect(d.censoredCount).toBe(2);
 });
 it("fails a forged eligible candidate past own cutoff even if caller supplies new matching digest",()=>{
  const {audit,pins}=actual();
  const altered={
   ...audit,actualDbClockUtc:"2027-02-10T06:03:00.000Z"};
  expect(()=>buildP5UnsignedNativePreReviewDossier(altered,{
   ...pins,expectedActualCandidateAuditSha256:
    digestP5ActualSourceCandidateAudit(altered)
  })).toThrow("RETROSPECTIVE_OR_CHANGED_FLIGHT_NATIVE_CUTOFF");
 });
 it("rejects fabricated review booleans and changed source response across individual flights",()=>{
  const {audit,pins}=actual();
  const candidates=audit.candidates.map((c,i)=>
   i===0?{...c,contentsRightsCertifiedHere:true as false}:c);
  const fake={...audit,candidates};
  expect(()=>buildP5UnsignedNativePreReviewDossier(fake,{
   ...pins,expectedActualCandidateAuditSha256:
    digestP5ActualSourceCandidateAudit(fake)
  })).toThrow("CROSS_DAY_DUPLICATE_OR_SELF_CERTIFIED_FLIGHT");
 });
 it("deterministically paginates 193 real-eligible future PRE candidates 96/96/1 without signing",()=>{
  const {audit,pins}=actual(193);
  const dossier=buildP5UnsignedNativePreReviewDossier(audit,pins);
  const pages=pageP5UnsignedNativePreReviewDossier(dossier);
  expect(pages.map(p=>p.candidateCountInPage)).toEqual([96,96,1]);
  expect(pages.map(p=>p.pageIndex)).toEqual([1,2,3]);
  expect(pages.every(p=>p.sourceDossierSha256===
   digestP5UnsignedNativePreDossier(dossier))).toBe(true);
  expect(pages.every(p=>p.signedPacketsIssued===0)).toBe(true);
  expect(pages[2].entries[0].source.flightInstanceId)
   .toBe("leg:future:00192");
 });
 it("does not manufacture a 31-day registry or create pages if source had zero candidates",()=>{
  const {audit,pins}=actual(0);
  const docket=buildP5UnsignedNativePreReviewDossier(audit,pins);
  expect(docket.entries).toHaveLength(0);
  expect(pageP5UnsignedNativePreReviewDossier(docket)).toEqual([]);
  expect(docket.phase5FreezeGranted).toBe(false);
 });
});
