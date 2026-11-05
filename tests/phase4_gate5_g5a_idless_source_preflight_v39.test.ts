import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {G5A_CANCELLED_T24_IDENTITY_AGG_SQL_V39}
 from "../scripts/v39_phase4_gate5_g5a_cancelled_t24_identity_readonly";

describe("Gate5 real ID-less incident: finite pre-spend safeguards",()=>{
 it("diagnostic consumes only unexpired bound source, emits counts and never mutates DB/provider",()=>{
  const q=G5A_CANCELLED_T24_IDENTITY_AGG_SQL_V39;
  for(const required of ["clean.phase4_g5_fids_original_binding_v39",
    "f.raw_expired_at_utc IS NULL","b.source_use_expires_at_utc>clock_timestamp()",
    "jsonb_array_elements","provider_native_id_present",
    "provider_says_operator","provider_says_marketing",
    "composite_collision_rows","qualified_on_time_candidate_count"])
   expect(q).toContain(required);
  expect(q).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT)\b/i);
  const script=readFileSync(
   "scripts/v39_phase4_gate5_g5a_cancelled_t24_identity_readonly.ts","utf8");
  expect(script).toContain("REPEATABLE READ READ ONLY");
  expect(script).toContain("default_transaction_read_only=on");
  expect(script).toContain("providerCalls:0,databaseWrites:0");
  expect(script).not.toContain("fetchFidsAirport(");
 });
 it("real owner refuses subsequent paid slots when first one had zero identity keys",()=>{
  const owner=readFileSync(
   "scripts/v39_phase4_gate5_g5a_nov06_real_wsss_horizon_owner.ts","utf8");
  const stop=owner.indexOf('hold("FIRST_ORIGINAL_NO_QUALIFIED_OPERATING_IDENTITY_NO_MORE_PAID")');
  const reserve=owner.indexOf("SELECT clean.reserve_phase4_g5_fids_physical_attempt_v39");
  expect(stop).toBeGreaterThan(0);
  expect(reserve).toBeGreaterThan(stop);
  expect(owner).toContain("sourceOrdinal===0");
  expect(owner).toContain("G5A_FIRST_SOURCE_ASOF_ELIGIBILITY_SQL_V39");
  expect(owner).toContain("firstStoredSourceQueryId=one.populationQueryId");
  expect(owner).toContain("eligibleAsOfOperatingKeys:n");
  expect(owner).not.toContain("one.flightInstanceIds.length>0");
 });
 it("identity matching is prospectively opt-in; retrospective Nov6 remains inert",()=>{
  const source=readFileSync(
   "scripts/v39_phase4_gate5_g5a_nov06_real_wsss_horizon_owner.ts","utf8");
  const post=readFileSync(
   "scripts/v39_phase4_gate5_g5a_nov06_prospective_post_schedule_observation.ts","utf8");
  expect(source).not.toContain("g5aCompositeIdentityStudyStartUtc:");
  expect(post).not.toContain("g5aCompositeIdentityStudyStartUtc:");
  // A newly frozen future owner must set the SAME anchor on source and POST.
  const normalizer=readFileSync("server/lib/disruption/fidsCensus_v3.ts","utf8");
  expect(normalizer).toContain("FIDS_G5A_UNREVIEWED_COMPOSITE_IDENTITY_FRAME_HOLD");
  expect(normalizer).toContain("g5a_composite_duplicate_ambiguous");
 });
});
