import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {G5A_RETIRED_T24_ELIGIBILITY_SQL_V39}
 from "../scripts/v39_phase4_gate5_g5a_cancelled_t24_cutoff_eligibility_readonly";
describe("Nov5 real ID-less FIDS preserved source cutoff read-only witness",()=>{
 it("uses persisted UTC timestamps, not provider string regex, to prove as-of",()=>{
  const sql=G5A_RETIRED_T24_ELIGIBILITY_SQL_V39;
  for(const required of [
   "f.raw_expired_at_utc IS NULL",
   "b.source_use_expires_at_utc>clock_timestamp()",
   "p.dep_scheduled_utc-interval '24 hours'",
   "member_at<=pre_cutoff AND original_at<=pre_cutoff",
   "source_asof_cutoff_qualified_idless_operators",
   "idless_operator_provisional_rows",
   "native_timestamp_space_prefix","native_timestamp_T_prefix"
  ])expect(sql).toContain(required);
  expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|GRANT)\b/i);
  // Native string formats are only counted; never gate the due/late verdict.
  const pos=sql.indexOf("source_asof_cutoff_qualified_idless_operators");
  expect(sql.indexOf("native_timestamp_space_prefix")).toBeGreaterThan(pos);
  expect(sql).not.toContain("departure_utc ~ '^2026-11-06T'");
 });
 it("has one retired manifest and never invokes provider, writable DB or logs raw Content",()=>{
  const source=readFileSync(
   "scripts/v39_phase4_gate5_g5a_cancelled_t24_cutoff_eligibility_readonly.ts","utf8");
  expect(source).toContain("7fe022a475447a082e1ccddd3805a5ad554f03885401afb22ee283a2a1b90aed");
  expect(source).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(source).toContain('default_transaction_read_only=on');
  expect(source).toContain("providerCalls:0,databaseWrites:0");
  expect(source).not.toContain("fetchFidsAirport(");
  expect(source).not.toContain("fetch(\"https://");
 });
});