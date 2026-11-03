import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {deriveP4G5FutureHorizonPreScopeV39} from
 "../server/lib/disruption/phase4Gate5FutureHorizonPreScope_v39";

const fixture=JSON.parse(readFileSync(
 "data-collection/phase4/GATE5_NEXT_COHORT_PREARM_SYNTHETIC_HOLD.json",
 "utf8")) as {cohortId:string;grid:Record<string,unknown>};
function prepare(){
 // Offline data is explicitly SYNTHETIC. Never use this as real release proof.
 const frozen=JSON.stringify({cohortId:fixture.cohortId,grid:fixture.grid},null,2)+"\n";
 return {
  reviewedFrozenGridBytes:frozen,
  independentlyReviewedFrozenGridSha256:
   createHash("sha256").update(frozen,"utf8").digest("hex"),
  expectedCohortId:fixture.cohortId,
  githubAttestedSourceRunId:"55555555123",
  githubAttestedHorizon:"T-24h" as const,
  actualReadAtUtc:"2027-01-14T17:00:00.000Z"
 };
}
describe("Gate5 prospective source GitHub-run -> preexpiry PRE provenance scope",()=>{
 it("binds exact frozen airport/window and GH run/horizon without T alias promotion",()=>{
  const s=deriveP4G5FutureHorizonPreScopeV39(prepare());
  expect(s.airportIcao).toBe("WSSS");
  expect(s.serviceStartUtc).toBe("2027-01-15T17:00:00.000Z");
  expect(s.serviceEndUtc).toBe("2027-01-15T18:00:00.000Z");
  expect(s.horizon).toBe("T-24h");
  expect(s.expectedOwnerGithubRunId).toBe("55555555123");
  expect(s.reviewedManifestSha256).toBe(
   prepare().independentlyReviewedFrozenGridSha256);
  expect(s.readAtUtc).toBe("2027-01-14T17:00:00.000Z");
 });
 it("supports T-6h and T-90m without borrowing another run's identity",()=>{
  for(const h of ["T-6h","T-90m"] as const){
   const s=deriveP4G5FutureHorizonPreScopeV39({
    ...prepare(),githubAttestedHorizon:h,
    actualReadAtUtc:"2027-01-15T13:00:00.000Z"
   });
   expect(s.horizon).toBe(h);
   expect(s.expectedOwnerGithubRunId).toBe("55555555123");
  }
 });
 it("rejects mutated frozen grid even when caller reuses the approved digest",()=>{
  const a=prepare();a.reviewedFrozenGridBytes=a.reviewedFrozenGridBytes
   .replace("WSSS","YSSY");
  expect(()=>deriveP4G5FutureHorizonPreScopeV39(a))
   .toThrow("P4_G5_FUTURE_PRE_SCOPE_REVIEWED_GRID_SHA_CHANGED_HOLD");
 });
 it("rejects unverified run ID and noncanonical JSON",()=>{
  const a=prepare();a.githubAttestedSourceRunId="not-verified";
  expect(()=>deriveP4G5FutureHorizonPreScopeV39(a))
   .toThrow("P4_G5_FUTURE_PRE_SCOPE_INVALID_INPUT_HOLD");
  const b=prepare();b.reviewedFrozenGridBytes=b.reviewedFrozenGridBytes.trim();
  b.independentlyReviewedFrozenGridSha256=
   createHash("sha256").update(b.reviewedFrozenGridBytes).digest("hex");
  expect(()=>deriveP4G5FutureHorizonPreScopeV39(b))
   .toThrow("P4_G5_FUTURE_PRE_SCOPE_CANONICAL_COHORT_HOLD");
 });
 it("rejects after-retention distant/audited wrong service interval",()=>{
  const a=prepare();a.actualReadAtUtc="2027-01-22T18:00:00.000Z";
  expect(()=>deriveP4G5FutureHorizonPreScopeV39(a))
   .toThrow("P4_G5_FUTURE_PRE_SCOPE_READ_OUTSIDE_COHORT_HORIZON_HOLD");
 });
 it("does not alter approved master selected-T semantics or mount production secrets",()=>{
  const body=readFileSync(
   "server/lib/disruption/phase4Gate5FutureHorizonPreScope_v39.ts","utf8");
  expect(body).toContain("draftP4Gate5ThreeHorizonGridV39");
  expect(body).not.toContain("GATE05_AUTOMATION_DATABASE_URL");
  expect(body).not.toContain("persistPreSnapshot(");
  expect(body).not.toContain("AERODATABOX_API_KEY");
 });
});
