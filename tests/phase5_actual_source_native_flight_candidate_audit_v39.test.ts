import {describe,it,expect} from "vitest";
import {auditP5ActualSourceFlightCandidates,
 P5_ACTUAL_SOURCE_ALL_MEMBERS_READONLY_SQL,digestP5ActualSourceCandidateAudit,
 type P5ActualFlightPopulationRow,type P5ActualBoundOriginalRow,
 type P5ActualSourceCandidateScope}
 from "../server/lib/disruption/phase5ActualSourceNativeFlightCandidateAudit_v39";
const SHA=(v:string)=>v.repeat(64);
const utc=(s:string)=>new Date(s);
const selected="2027-02-10T12:00:00.000Z";
const memberID="a23e4567-e89b-42d3-a456-426614174000";
const scope:P5ActualSourceCandidateScope={
 manifestSha256:SHA("1"),queryDigestSha256:SHA("2"),
 reviewedReleaseSha256:SHA("3"),rightsReviewSha256:SHA("4"),
 providerContractSha256:SHA("5"),earlyDrawSha256:SHA("6"),
 runDayIndex:4,slot:"HUB",horizon:"T-6h",airportIcao:"WSSS",
 expectedSourceGithubRunId:"42899999999",
 maxPopulationStalenessSeconds:7200
};
function fixture(){
 const original:P5ActualBoundOriginalRow={
  manifest_sha256:scope.manifestSha256,
  run_day_index:4,slot_id:"HUB",horizon:"T-6h",
  airport_icao:"WSSS",github_run_id:scope.expectedSourceGithubRunId,
  state:"ACTIVE",early_draw_sha256:scope.earlyDrawSha256,
  reviewed_release_sha256:scope.reviewedReleaseSha256,
  rights_review_sha256:scope.rightsReviewSha256,
  provider_contract_sha256:scope.providerContractSha256,
  service_window_start_utc:utc("2027-02-10T11:00:00.000Z"),
  service_window_end_utc:utc("2027-02-10T13:00:00.000Z"),
  attempt_run_id:scope.expectedSourceGithubRunId,
  reserved_at:utc("2027-02-10T04:29:00.000Z"),
  population_query_id:memberID,original_response_hash:SHA("a"),
  bound_rights:scope.rightsReviewSha256,
  source_expires_at_utc:utc("2027-02-10T10:00:00.000Z"),
  normalized_members_count:3,bound_at_utc:utc("2027-02-10T04:31:00.000Z"),
  source_available:utc("2027-02-10T04:30:00.000Z"),
  fids_retrieval_utc:utc("2027-02-10T04:29:15.000Z"),
  raw_persisted_at_utc:utc("2027-02-10T04:29:20.000Z"),
  fids_response_hash:SHA("a"),fids_airport_icao:"WSSS",
  original_current:true
 };
 const m=(id:string):P5ActualFlightPopulationRow=>({
  population_query_id:memberID,
  analytic_identity_id:id,canonical_flight_instance_id:id,
  source_airport_icao:"WSSS",dep_airport_icao:"WSSS",
  population_role:"requested_airport_primary",
  scope_classification:"confirmed_core",
  codeshare_resolution_status:"confirmed_operating_leg",
  source_type:"fids",response_hash:SHA("a"),
  provider_content_expired_at_utc:null,
  available_at:utc("2027-02-10T04:30:10.000Z"),
  dep_scheduled_utc:utc(selected),
  population_member_id:"entry-"+id,
  flight_number:"AB123",arr_airport_icao:"OMAA",
  query_direction:"Departure"
 });
 const a=m("leg:source:a"),b=m("leg:source:b"),c=m("leg:source:c");
 return{original,members:[a,b,c],clock:utc("2027-02-10T05:00:00.000Z")};
}
const audit=(f:ReturnType<typeof fixture>,s=scope)=>
 auditP5ActualSourceFlightCandidates(s,[f.original],f.members,f.clock);
describe("actual post-COMMIT source native-flight candidates, no invented packet",()=>{
 it("finds three actual source-bound prospective flight candidates but signs none",()=>{
  const f=fixture(),r=audit(f);
  expect(r.candidateCount).toBe(3);
  expect(r.censoredCount).toBe(0);
  expect(r.candidates.map(x=>x.flightInstanceId)).toEqual([
   "leg:source:a","leg:source:b","leg:source:c"
  ]);
  expect(r.candidates[0].selectedTNativeUtc).toBe(selected);
  expect(r.candidates[0].ownCutoffUtc).toBe("2027-02-10T06:00:00.000Z");
  expect(r.signedPrePacketsCreated).toBe(0);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
  expect(r.providerContentsRightsCertified).toBe(false);
  expect(r.physicalOperatingLegIndependentlyCertified).toBe(false);
  expect(digestP5ActualSourceCandidateAudit(r)).toMatch(/^[a-f0-9]{64}$/);
 });
 it("censors one missing native T without invalidating other legitimate flights",()=>{
  const f=fixture();
  f.members[1]={...f.members[1],dep_scheduled_utc:null};
  const r=audit(f);
  expect(r.candidateCount).toBe(2);
  expect(r.censoredCount).toBe(1);
  expect(r.candidates[1].status).toBe("CENSORED_MISSING_NATIVE_T");
 });
 it("censors same-flight duplicate ambiguous identity independently",()=>{
  const f=fixture();
  f.members[1]={...f.members[1],
   analytic_identity_id:"leg:source:a",
   canonical_flight_instance_id:"leg:source:a"};
  const r=audit(f);
  expect(r.candidateCount).toBe(1);
  expect(r.censoredCount).toBe(2);
  expect(r.classifications.CENSORED_AMBIGUOUS_SOURCE_IDENTITY).toBe(2);
 });
 it("censors future-dated members, unconfirmed codeshares and off-airport rows",()=>{
  const f=fixture();
  f.members[0]={...f.members[0],
   available_at:utc("2027-02-10T05:20:00.000Z")};
  f.members[1]={...f.members[1],
   codeshare_resolution_status:"not_resolved"};
  f.members[2]={...f.members[2],dep_airport_icao:"OMAA"};
  const r=audit(f);
  expect(r.candidateCount).toBe(0);
  expect(r.classifications.CENSORED_MEMBER_NOT_AVAILABLE_BY_ACTUAL_DB_CLOCK)
   .toBe(1);
  expect(r.classifications.CENSORED_NONNATIVE_OR_UNCONFIRMED_OPERATING_MEMBER)
   .toBe(2);
 });
 it("preserves cutoff and no-backfill; no pretending a late source is on time",()=>{
  const f=fixture();
  expect(audit({...f,clock:utc("2027-02-10T05:50:00.000Z")})
   .classifications.CENSORED_NO_PROSPECTIVE_PRE_LEAD).toBe(3);
  const late={...f,original:{...f.original,
   reserved_at:utc("2027-02-10T06:09:00.000Z"),
   fids_retrieval_utc:utc("2027-02-10T06:09:20.000Z"),
   raw_persisted_at_utc:utc("2027-02-10T06:09:30.000Z"),
   source_available:utc("2027-02-10T06:10:00.000Z"),
   bound_at_utc:utc("2027-02-10T06:11:00.000Z"),
   source_expires_at_utc:utc("2027-02-10T10:00:00.000Z")
  },members:f.members.map(m=>({...m,
   available_at:utc("2027-02-10T06:10:10.000Z") })),
   clock:utc("2027-02-10T06:15:00.000Z")};
  expect(audit(late).classifications.CENSORED_MEMBER_NOT_AVAILABLE_BY_ACTUAL_DB_CLOCK)
   .toBe(3);
 });
 it("never misclassifies a too-stale or expired source as a valid PRE",()=>{
  const f=fixture();
  const original={...f.original,
   reserved_at:utc("2027-02-10T03:59:00.000Z"),
   fids_retrieval_utc:utc("2027-02-10T03:59:10.000Z"),
   raw_persisted_at_utc:utc("2027-02-10T03:59:20.000Z"),
   source_available:utc("2027-02-10T04:00:00.000Z"),
   bound_at_utc:utc("2027-02-10T04:01:00.000Z")
  };
  const members=f.members.map(m=>({...m,
   available_at:utc("2027-02-10T04:00:10.000Z")}));
  expect(audit({...f,original,members},
   {...scope,maxPopulationStalenessSeconds:3600})
   .classifications.CENSORED_SOURCE_TOO_STALE_OR_EXPIRED).toBe(3);
 });
 it("holds on tampered source original hashes, manifest, rights, duplicate original and over-limit",()=>{
  const f=fixture();
  const bad=[{...f.original,
    original_response_hash:SHA("b")}];
  expect(()=>auditP5ActualSourceFlightCandidates(scope,bad,f.members,f.clock))
   .toThrow("NONAUTHENTIC_OR_EXPIRED_ORIGINAL_SOURCE_METADATA");
  expect(()=>auditP5ActualSourceFlightCandidates(
   {...scope,rightsReviewSha256:SHA("0")},[f.original],f.members,f.clock))
   .toThrow("NONAUTHENTIC_OR_EXPIRED_ORIGINAL_SOURCE_METADATA");
  expect(()=>auditP5ActualSourceFlightCandidates(
   scope,[f.original,f.original],f.members,f.clock))
   .toThrow("UNSIGNED_SOURCE_SCOPE_OR_UNBOUNDED_POPULATION");
  expect(()=>auditP5ActualSourceFlightCandidates(
   scope,[f.original],Array.from({length:2501},
    (_,i)=>({...f.members[0],analytic_identity_id:"leg:"+i+":x"})),f.clock))
   .toThrow("UNSIGNED_SOURCE_SCOPE_OR_UNBOUNDED_POPULATION");
 });
 it("uses bounded true source normalized member SELECT, not paid or arbitrary source",()=>{
  expect(P5_ACTUAL_SOURCE_ALL_MEMBERS_READONLY_SQL)
   .toContain("WHERE p.population_query_id=$1::uuid");
  expect(P5_ACTUAL_SOURCE_ALL_MEMBERS_READONLY_SQL).toContain("LIMIT 2501");
  expect(P5_ACTUAL_SOURCE_ALL_MEMBERS_READONLY_SQL)
   .not.toContain("INSERT");
  const f=fixture();
  const r=audit({...f,members:[]});
  expect(r.observedMemberCount).toBe(0);
  expect(r.signedPrePacketsCreated).toBe(0);
 });
});
