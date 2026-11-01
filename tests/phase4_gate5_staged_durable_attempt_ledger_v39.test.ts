import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

const migration="migrations/staged/V0076__phase4_gate5_logged_physical_fids_attempt_owner_v39.sql";
const testSql="tests/sql/phase4_gate5_staged_physical_attempt_ledger_v39.sql";
const workflow=".github/workflows/phase4-gate5-staged-physical-ledger-disposable-pg16.yml";
describe("Phase4 Gate5 staged logged unique physical attempt owner, NO production installation",()=>{
 it("creates separate complete manifest project-cap, actual GitHub owner, source query and irreversible attempt tables",()=>{
  const s=readFileSync(migration,"utf8");
  for(const name of [
   "phase4_g5_fids_cohort_budget_v39",
   "phase4_g5_fids_physical_owner_v39",
   "phase4_g5_fids_allowed_query_v39",
   "phase4_g5_fids_physical_attempt_v39",
   "reserve_phase4_g5_fids_physical_attempt_v39",
   "P4_G5_IRREVERSIBLE_PHYSICAL_RESERVATION",
   "UNIQUE(query_digest,physical_attempt_number)",
   "FOR UPDATE",
   "clock_timestamp()",
   "reserved_units=reserved_units+2",
   "last_reserved_attempt=p_physical_attempt_number",
   "p_github_run_id",
   "p_manifest_sha256",
   "p_expected_reservation_sha256",
   "hard_latest_dispatch_utc",
   "prediction_cutoff_utc-INTERVAL '15 minutes'",
   "SECURITY DEFINER",
   "REVOKE EXECUTE",
   "REVOKE ALL ON",
   "sha256(convert_to("
  ])expect(s).toContain(name);
  expect(s).not.toContain("DROP TABLE");
  expect(s).not.toContain("TRUNCATE");
  expect(s).not.toContain("ALTER TABLE clean.flight_population");
  expect(s).not.toContain("GRANT EXECUTE");
 });
 it("test SQL checks duplicate owner run, global budget, no refund and no actual calls",()=>{
  const t=readFileSync(testSql,"utf8");
  for(const phrase of [
   "P4_G5_TEST_DUPLICATE_WAS_ACCEPTED",
   "P4_G5_TEST_FOREIGN_RUN_ACCEPTED",
   "P4_G5_TEST_OVERBUDGET_ACCEPTED",
   "P4_G5_TEST_REFUND_ALLOWED",
   "P4_G5_V0076_DISPOSABLE_PG16_PHYSICAL_ATTEMPT_RESERVATION_PASS_NO_PROVIDER",
   "ROLLBACK;"
  ])expect(t).toContain(phrase);
  expect(t).not.toContain("AERODATABOX_API_KEY");
  expect(t).not.toContain("fetch(");
 });
 it("workflow applies only on disposable PG16 and excludes production secrets/paid calls",()=>{
  const y=readFileSync(workflow,"utf8");
  expect(y).toContain("postgres:16");
  expect(y).toContain("gate5_disposable");
  expect(y).toContain("psql -h localhost");
  expect(y).toContain("ON_ERROR_STOP=1");
  expect(y).toContain("persist-credentials: false");
  expect(y).not.toContain("secrets.");
  expect(y).not.toContain("workflow_dispatch:");
  expect(y).not.toContain("schedule:");
  expect(y).not.toContain("GATE05_AUTOMATION_DATABASE_URL: ");
  expect(y).not.toContain("V39_DATABASE_RUNTIME_URL: ");
 });
});
