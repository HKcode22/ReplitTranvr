import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 G5A_PRIOR_T24_PROVENANCE_SQL_V39,
 assessG5AT24PreconditionV39
} from "../server/lib/disruption/phase4Gate5PriorSourceStop_v39";
import {sourceErrorSafeG5AV39}
 from "../scripts/v39_phase4_gate5_g5a_real_wsss_horizon_owner";

describe("G5A zero-source successor paid horizon refusal",()=>{
 it("read-only query is exact frozen cohort original and cutoff-safe T24 PRE",()=>{
  const q=G5A_PRIOR_T24_PROVENANCE_SQL_V39;
  expect(q).toContain("o.manifest_sha256=$1 AND o.horizon='T-24h'");
  expect(q).toContain("s.frame_hash=$1 AND s.horizon='T-24h'");
  expect(q).toContain("s.created_at<=s.prediction_cutoff_utc");
  expect(q).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|GRANT|TRUNCATE|DROP)\b/i);
 });
 it("stops 0 originals, 0 PRE or untrustworthy evidence",()=>{
  for(const r of [
   {bound_originals:0,ontime_pre:0},
   {bound_originals:1,ontime_pre:0},
   {bound_originals:0,ontime_pre:3}
  ])expect(assessG5AT24PreconditionV39([r]).allowPaidContinuation)
   .toBe(false);
  expect(assessG5AT24PreconditionV39([
   {bound_originals:1,ontime_pre:1}
  ]).allowPaidContinuation).toBe(true);
  for(const r of [{bound_originals:null,ontime_pre:1},
   {bound_originals:-1,ontime_pre:1},
   {bound_originals:"NaN",ontime_pre:1}]){
   expect(()=>assessG5AT24PreconditionV39([r])).toThrow();
  }
 });
 it("both live owners check T24 before next paid reservation",()=>{
  const source=readFileSync(
   "scripts/v39_phase4_gate5_g5a_real_wsss_horizon_owner.ts","utf8");
  const post=readFileSync(
   "scripts/v39_phase4_gate5_g5a_prospective_post_schedule_observation.ts","utf8");
  expect(source.indexOf("G5A_PRIOR_T24_PROVENANCE_SQL_V39"))
   .toBeLessThan(source.indexOf("stageP4G5PreparedOwnerDbOnlyV39(dbw,{"));
  expect(post.indexOf("G5A_PRIOR_T24_PROVENANCE_SQL_V39"))
   .toBeLessThan(post.indexOf("reserveG5APostSlotDbV39(db,manifestSha,cohortId,i)"));
  expect(source).toContain("G5A_T24_SOURCE_OR_PRE_MISSING_NO_SUCCESSOR_PAID");
  expect(source).toContain('hold("PROSPECTIVE_HORIZON_ZERO_DURABLE_SOURCE_OR_PRE")');
  expect(post).toContain("G5A_POST_SKIPPED_MISSING_T24_SOURCE_OR_PRE_NO_PROVIDER");
 });
 it("source failure reports safe SQLSTATE or known closed taxonomy, not messages",()=>{
  expect(sourceErrorSafeG5AV39({code:"23505",message:"raw secret"}))
   .toBe("P4_G5_G5A_SOURCE_SQLSTATE_23505_HOLD");
  expect(sourceErrorSafeG5AV39(new Error("FIDS_ORIGINAL_DECODED_BODY_SHA_MISMATCH_HOLD")))
   .toBe("FIDS_ORIGINAL_DECODED_BODY_SHA_MISMATCH_HOLD");
  expect(sourceErrorSafeG5AV39(new Error("password=secret")))
   .toBe("P4_G5_G5A_UNKNOWN_NO_CONTENT_LOGGED_HOLD");
 });
});
