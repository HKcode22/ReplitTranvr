import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {
 auditP5ActualSourceFlightCandidates,
 type P5ActualSourceCandidateScope,
 type P5ActualBoundOriginalRow,
 type P5ActualFlightPopulationRow
} from "../server/lib/disruption/phase5ActualSourceNativeFlightCandidateAudit_v39";
import {
 projectP5DetachedActualSourceAuditToUnsignedReview,
 summarizeP5DetachedSourceAuditDossier,
 type P5DetachedActualSourceAuditPins
} from "../server/lib/disruption/phase5DetachedSourceAuditToUnsignedDossierHandoff_v39";
const H=(s:string)=>s.repeat(64);
const sha=(bytes:Buffer)=>
 createHash("sha256").update(bytes).digest("hex");
const UUID="a23e4567-e89b-42d3-a456-426614174000";
const code="d".repeat(40);
const scope:P5ActualSourceCandidateScope={
 manifestSha256:H("1"),queryDigestSha256:H("2"),
 reviewedReleaseSha256:H("3"),rightsReviewSha256:H("4"),
 providerContractSha256:H("5"),earlyDrawSha256:H("6"),
 runDayIndex:4,slot:"HUB",horizon:"T-6h",airportIcao:"WSSS",
 expectedSourceGithubRunId:"42899999999",
 maxPopulationStalenessSeconds:7200
};
function fixture(count=2){
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
 const members:P5ActualFlightPopulationRow[]=Array.from(
  {length:count},(_,i)=>({
   population_query_id:UUID,
   analytic_identity_id:`leg:future:${String(i).padStart(5,"0")}`,
   canonical_flight_instance_id:`leg:future:${String(i).padStart(5,"0")}`,
   source_airport_icao:"WSSS",dep_airport_icao:"WSSS",
   population_role:"requested_airport_primary",
   scope_classification:"confirmed_core",
   codeshare_resolution_status:"confirmed_operating_leg",
   source_type:"fids",response_hash:H("a"),
   provider_content_expired_at_utc:null,
   available_at:"2027-02-10T04:30:10.000Z",
   dep_scheduled_utc:"2027-02-10T12:00:00.000Z",
   population_member_id:`native-member-${i}`,
   flight_number:"AB123",arr_airport_icao:"OMAA",
   query_direction:"Departure"
  })
 );
 const audit=auditP5ActualSourceFlightCandidates(
  scope,[original],members,"2027-02-10T05:00:00.000Z"
 );
 const auditBytes=Buffer.from(JSON.stringify(audit));
 const pinned=sha(auditBytes);
 const pins:P5DetachedActualSourceAuditPins={
  expectedActualCandidateAuditSha256:pinned,
  independentlyReviewedExactAuditBytesSha256:pinned,
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
  expectedReviewedMainCodeSha:code,
  expectedRunDayIndex:4,expectedSlot:"HUB",
  expectedHorizon:"T-6h",expectedAirportIcao:"WSSS"
 };
 return{audit,auditBytes,pins};
}
describe("detached actual SOURCE audit -> offline UNSIGNED review pages",()=>{
 it("binds exact externally supplied audit SHA and emits digest only in redacted report",()=>{
  const {auditBytes,pins}=fixture();
  const result=projectP5DetachedActualSourceAuditToUnsignedReview(
   auditBytes,pins);
  expect(result.sourceAuditSha256).toBe(pins.expectedActualCandidateAuditSha256);
  expect(result.unsignedDossier.candidateCount).toBe(2);
  expect(result.unsignedPages.map(p=>p.candidateCountInPage)).toEqual([2]);
  expect(result.unsignedDossier.entries[0].source.flightInstanceId)
   .toBe("leg:future:00000");
  expect(result.signedPrePacketsIssued).toBe(0);
  expect(result.phase6PaidGoGranted).toBe(false);
  expect(result.providerCalls).toBe(0);
  const publicReport=summarizeP5DetachedSourceAuditDossier(result);
  expect(publicReport.eligibleCandidateCount).toBe(2);
  expect(JSON.stringify(publicReport)).not.toContain("leg:future");
  expect(publicReport.providerRightsCertified).toBe(false);
  expect(publicReport.fullFlightIdsOrContentsEmitted).toBe(false);
 });
 it("paginates 193 actual SOURCE candidates 96/96/1 without signing or child dispatch",()=>{
  const {auditBytes,pins}=fixture(193);
  const x=projectP5DetachedActualSourceAuditToUnsignedReview(
   auditBytes,pins);
  expect(x.unsignedPages.map(p=>p.candidateCountInPage)).
   toEqual([96,96,1]);
  expect(x.unsignedPages.every(p=>p.sourceDossierSha256===
   x.unsignedDossierSha256)).toBe(true);
  expect(x.githubChildDispatches).toBe(0);
  expect(x.unsignedPages.every(p=>p.signedPacketsIssued===0)).toBe(true);
 });
 it("accepts zero eligible flights as an honest no-packet result",()=>{
  const {auditBytes,pins}=fixture(0);
  const x=projectP5DetachedActualSourceAuditToUnsignedReview(
   auditBytes,pins);
  expect(x.unsignedDossier.entries).toEqual([]);
  expect(x.unsignedPages).toHaveLength(0);
  expect(x.redactedSummary.eligibleCandidateCount).toBe(0);
 });
 it("refuses changed flight identities or unreviewed source SHA",()=>{
  const {auditBytes,pins}=fixture();
  for(const badPins of [
   {...pins,independentlyReviewedExactAuditBytesSha256:H("f")},
   {...pins,expectedActualCandidateAuditSha256:H("f")},
   {...pins,expectedSourceDayRegistrySha256:"not-sha"},
   {...pins,expectedGithubSourceRunId:"123"}
  ]){
   expect(()=>projectP5DetachedActualSourceAuditToUnsignedReview(
    auditBytes,badPins)).toThrow(/REFUSED_P5_/);
  }
  const changed=JSON.parse(auditBytes.toString("utf8"));
  changed.candidates[0].flightInstanceId="leg:fake:inserted";
  const altered=Buffer.from(JSON.stringify(changed));
  expect(()=>projectP5DetachedActualSourceAuditToUnsignedReview(
   altered,pins)).toThrow("SOURCE_AUDIT_BYTES_NOT_DISTINCTLY_SHA_PINNED");
 });
 it("rejects pretty printed/reordered audits even if SHA was freshly pinned",()=>{
  const {audit,pins}=fixture();
  const pretty=Buffer.from(JSON.stringify(audit,null,2));
  const bad={
   ...pins,expectedActualCandidateAuditSha256:sha(pretty),
   independentlyReviewedExactAuditBytesSha256:sha(pretty)
  };
  expect(()=>projectP5DetachedActualSourceAuditToUnsignedReview(
   pretty,bad)).toThrow("NONCANONICAL_OR_UNREVIEWED_SOURCE_AUDIT_BYTES");
 });
 it("refuses post-cutoff source audit even if externally SHA pinned",()=>{
  const {audit,pins}=fixture();
  const late={...audit,actualDbClockUtc:"2027-02-10T06:01:00.000Z"};
  const raw=Buffer.from(JSON.stringify(late));
  const independentlyPinned={
   ...pins,
   expectedActualCandidateAuditSha256:sha(raw),
   independentlyReviewedExactAuditBytesSha256:sha(raw)
  };
  expect(()=>projectP5DetachedActualSourceAuditToUnsignedReview(
   raw,independentlyPinned)).toThrow(
    "RETROSPECTIVE_OR_CHANGED_FLIGHT_NATIVE_CUTOFF");
 });
 it("holds malformed or overlarge bytes before any source publication",()=>{
  const {pins}=fixture();
  for(const raw of [
   Buffer.from("not-json"),
   Buffer.alloc(4_000_001,0)
  ])expect(()=>projectP5DetachedActualSourceAuditToUnsignedReview(
   raw,pins)).toThrow("SOURCE_AUDIT_BYTES_NOT_DISTINCTLY_SHA_PINNED");
 });
});
