import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

const worker=readFileSync(
 "scripts/v39_phase4_gate5_future_horizon_originals_readonly_actions.ts","utf8");
const workflow=readFileSync(
 ".github/workflows/phase4-gate5-future-preexpiry-original-audit.yml","utf8");
const admission=readFileSync(
 "server/lib/disruption/phase4Gate5FutureHorizonGithubAdmission_v39.ts","utf8");
const hold=JSON.parse(readFileSync(
 "data-collection/phase4/GATE5_NEXT_HORIZON_ORIGINAL_AUDIT_HOLD.json","utf8")
) as Record<string,unknown>;

describe("Gate5 future GH source→PRE readback is still inert and rights-held",()=>{
 it("same read-only transaction verifies source first and then actual PRE as-of",()=>{
  const a=worker.indexOf("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const b=worker.indexOf("auditP4G5DiscoveredHorizonOriginalBeforeExpiryV39(");
  const c=worker.indexOf("deriveP4G5FutureHorizonPreScopeV39(");
  const d=worker.indexOf("auditP4G5HorizonPreexpiryV39(");
  const e=worker.indexOf('await db.query("ROLLBACK")');
  expect(a).toBeGreaterThan(0);
  expect(b).toBeGreaterThan(a);
  expect(c).toBeGreaterThan(b);
  expect(d).toBeGreaterThan(c);
  expect(e).toBeGreaterThan(d);
  expect(worker).toContain("actualPersistedPreCandidateReview:preCandidate");
  expect(worker).toContain("persistedPreCertified:false");
  expect(worker).toContain("scientificGate5Passed:false");
  expect(worker).not.toContain("persistP4G5ReviewedPreForCohortV39(");
 });
 it("read-only job authenticates original owner from GitHub API, not just event",()=>{
  expect(worker).toContain("attestP4G5FutureSourceGitHubV39");
  expect(worker).toContain('"/actions/runs/"+sourceId');
  expect(worker).toContain('"/actions/runs/"+sourceId+"/jobs?per_page=100"');
  expect(worker).toContain("GATE05_AUTOMATION_DATABASE_URL");
  expect(worker).not.toContain("AERODATABOX_API_KEY: process.env");
  expect(workflow).toContain("permissions:");
  expect(workflow).toContain("contents: read");
  expect(workflow).toContain("actions: read");
  expect(workflow).toContain("persist-credentials: false");
  expect(workflow).toContain("Attested horizon V0077 three originals plus real persisted PRE as-of read (READ ONLY)");
 });
 it("NO source owner or licensed future cohort is armed by this PR",()=>{
  expect(admission).toContain(
   "P4_G5_FUTURE_HORIZON_APPROVED_SHA256_V39:string|null=null");
  expect(hold.mode).toBe("HOLD_NO_APPROVED_FUTURE_SOURCE");
  expect(hold.cohortId).toBeNull();
  expect(hold.sourceRightsEvidenceSha256).toBeNull();
  expect(hold.metadataProofStorageRightsReviewed).toBe(false);
  expect(hold.scientificGate5Passed).toBe(false);
  expect(hold.phase6Authorized).toBe(false);
 });
});
