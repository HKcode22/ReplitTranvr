import {describe,it,expect} from "vitest";
import {
 requireG5AIndependentAuditContextV39,
 G5A_SOURCE_AUDIT_SQL_V39,G5A_PRE_AUDIT_SQL_V39,
 G5A_POPULATION_AUDIT_SQL_V39,G5A_INDEPENDENT_AUDIT_SCHEMA_V39
} from "../scripts/v39_phase4_gate5_g5a_independent_real_cohort_readonly_audit";
const main="a".repeat(40),event="2026-11-07T05:12:30.000Z";
const env=()=>({
 GITHUB_ACTIONS:"true",
 GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",
 GITHUB_SHA:main,GITHUB_RUN_ATTEMPT:"1",
 GITHUB_EVENT_NAME:"schedule",
 GITHUB_EVENT_SCHEDULE:"12 5 7 11 *",
 GITHUB_JOB:"audit-independent",
 GITHUB_WORKFLOW:"Phase4 Gate5 G5A Independent Cohort Audit (No Provider)",
 GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-g5a-independent-final-audit.yml@refs/heads/main",
 GATE05_AUTOMATION_DATABASE_URL:"postgresql://audit:fixture@localhost/disposable",
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0"
});
describe("G5A real independent no-provider cohort read-only auditor",()=>{
 it("admits only true main, correct date, audit role, schedule/manual",()=>{
  expect(()=>requireG5AIndependentAuditContextV39(
   env(),main,Date.parse(event))).not.toThrow();
  expect(()=>requireG5AIndependentAuditContextV39({
    ...env(),GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_EVENT_SCHEDULE:""
   },main,Date.parse(event))).not.toThrow();
 });
 it("refuses source writer/paid key/admin URL and any fork/push/PR/replay",()=>{
  const errors=[
    {GITHUB_EVENT_NAME:"push"},{GITHUB_EVENT_NAME:"pull_request"},
    {GITHUB_REF:"refs/pull/375/merge"},
    {GITHUB_REPOSITORY:"another/fork"},
    {GITHUB_JOB:"not-independent"},
    {GITHUB_RUN_ATTEMPT:"2"},
    {GITHUB_SHA:"b".repeat(40)},
    {GITHUB_WORKFLOW:"another"},
    {GITHUB_WORKFLOW_REF:"another"},
    {GITHUB_EVENT_SCHEDULE:"0 0 * * *"},
    {GATE05_AUTOMATION_DATABASE_URL:""},
    {DATABASE_URL:"postgresql://admin:fixture@localhost/disposable"},
    {V39_DATABASE_RUNTIME_URL:"postgresql://app:fixture@localhost/disposable"},
    {P4_G5_SOURCE_OWNER_DATABASE_URL:"postgresql://writer:fixture@localhost/disposable"},
    {AERODATABOX_API_KEY:"fake-paid"},
    {ADB_AUTO_COLLECT:"1"},
    {V39_PHASE6_PROCESS_ARMED:"1"},
  ];
  for(const edit of errors)expect(()=>requireG5AIndependentAuditContextV39(
   {...env(),...edit},main,Date.parse(event)))
   .toThrow("P4_G5_G5A_INDEPENDENT_GITHUB_READER_DATE_OR_ISOLATION_HOLD");
 });
 it("refuses before physical T+2h and in another calendar year",()=>{
  for(const date of ["2026-11-06T23:50:00.000Z",
    "2026-11-07T05:09:59.999Z",
    "2027-11-07T05:12:00.000Z"])
   expect(()=>requireG5AIndependentAuditContextV39(
    env(),main,Date.parse(date)))
    .toThrow("P4_G5_G5A_INDEPENDENT_GITHUB_READER_DATE_OR_ISOLATION_HOLD");
 });
 it("source readback counts only actual V0076 committed physical reservations and exact V0077 original",()=>{
  expect(G5A_INDEPENDENT_AUDIT_SCHEMA_V39)
   .toBe("v39.phase4.g5a-independent-real-source-pre-post-counts.v1");
  for(const s of ["phase4_g5_fids_physical_owner_v39",
    "phase4_g5_fids_allowed_query_v39",
    "phase4_g5_fids_physical_attempt_v39",
    "phase4_g5_fids_original_binding_v39",
    "fids_query_response","manifest_sha256=$1",
    "q.prediction_cutoff_utc","original_response_sha256=s.response_hash"
  ]) expect(G5A_SOURCE_AUDIT_SQL_V39).toContain(s);
  expect(G5A_SOURCE_AUDIT_SQL_V39).not.toContain("o.cohort_id");
  expect(G5A_SOURCE_AUDIT_SQL_V39).not.toContain("raw_payload");
 });
 it("PRE audit compares actual created at/decision cutoff without backfilling",()=>{
  for(const s of ["flight_snapshots","frame_hash=$1",
   "prediction_state","s.created_at<=s.prediction_cutoff_utc",
   "s.created_at>s.prediction_cutoff_utc","fids_response_hash",
   "selected_t_version"])
   expect(G5A_PRE_AUDIT_SQL_V39).toContain(s);
  expect(G5A_PRE_AUDIT_SQL_V39).not.toContain("UPDATE ");
 });
 it("member denominator only comes from independently bound originals",()=>{
  for(const s of ["flight_population",
   "phase4_g5_fids_original_binding_v39",
   "p.population_query_id","b.manifest_sha256=$1",
   "confirmed_operating_leg","requested_airport_primary"])
   expect(G5A_POPULATION_AUDIT_SQL_V39).toContain(s);
 });
});
