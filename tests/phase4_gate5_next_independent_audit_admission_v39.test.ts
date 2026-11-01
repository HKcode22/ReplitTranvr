import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {
 NEXT_AUDIT_MANIFEST_PATH_V39,NEXT_AUDIT_APPROVED_SHA256_V39,
 validateP4NextCohortAuditManifestV39,
 assertP4NextAuditGitHubV39
} from "../server/lib/disruption/phase4Gate5NextIndependentAuditAdmission_v39";
import {P4_FRESH_COHORT_SOURCE_SQL_V39}
 from "../server/lib/disruption/phase4Gate5FreshCohortReadOnly_v39";
const bytes=()=>readFileSync(NEXT_AUDIT_MANIFEST_PATH_V39,"utf8");
const now="2026-11-01T05:25:00.000Z";
const canonical=(m:Record<string,unknown>)=>JSON.stringify(m,null,2)+"\n";
function active(){
 const m=JSON.parse(bytes());
 m.mode="REVIEWED_NEW_COHORT_READONLY";
 m.cohortId="WSSS_FUTURE_REVIEWED_001";
 m.airportIcao="WSSS";
 m.serviceWindowStartUtc="2026-11-03T17:00:00.000Z";
 m.serviceWindowEndUtc="2026-11-03T18:00:00.000Z";
 m.reviewedFrozenGridSha256="a".repeat(64);
 m.sourceRetentionReviewArtifactSha256="b".repeat(64);
 m.providerNativeSemanticsEvidenceSha256="c".repeat(64);
 return m as Record<string,unknown>;
}
const digest=(s:string)=>createHash("sha256").update(s).digest("hex");
function github(job:"validate-next-cohort-manifest"|"independent-next-cohort-readonly"){
 return {
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_EVENT_NAME:"push",GITHUB_REF:"refs/heads/main",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"e".repeat(40),
 GITHUB_JOB:job,
 GITHUB_WORKFLOW:"Phase4 Gate5 Future Cohort Independent Read-Only Audit",
 GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-future-independent-readonly.yml@refs/heads/main",
 P4_NEXT_AUDIT_EXACT_INTENT:"NO_PROVIDER_NEW_COHORT_READONLY"
 } as NodeJS.ProcessEnv;
}
describe("Gate5 future cohort independent audit admission is inert until separate SHA-review",()=>{
 it("actual new-cohort template is explicitly unassigned and cannot reach DB",()=>{
  const result=validateP4NextCohortAuditManifestV39(bytes(),null,now);
  expect(result.status).toBe("HOLD_NO_NEW_COHORT");
  expect(result.scope).toBeNull();
  expect(result.manifestSha256).toBe(digest(bytes()));
  expect(NEXT_AUDIT_APPROVED_SHA256_V39).toBeNull();
 });
 it("requires a separately code-pinned future exact frozen manifest before READONLY audit",()=>{
  const m=active(),text=canonical(m),sha=digest(text);
  expect(()=>validateP4NextCohortAuditManifestV39(text,null,
   "2026-11-03T20:00:00.000Z")).toThrow("P4_NEXT_AUDIT_UNAPPROVED_OR_CHANGED_MANIFEST");
  const r=validateP4NextCohortAuditManifestV39(text,sha,
   "2026-11-03T20:00:00.000Z");
  expect(r.status).toBe("APPROVED_READONLY_COHORT_AUDIT");
  if(r.status!=="APPROVED_READONLY_COHORT_AUDIT")throw Error("type");
  expect(r.scope.airportIcao).toBe("WSSS");
  expect(r.scope.serviceWindowStartUtc).toBe("2026-11-03T17:00:00.000Z");
  expect(r.scope.reviewedFrozenManifestSha256).toBe(sha);
 });
 it("frozen bytes and future window prohibit old Oct31, early audit and expired source",()=>{
  const m=active(),s=canonical(m),sha=digest(s);
  expect(()=>validateP4NextCohortAuditManifestV39(s+" ",sha,
   "2026-11-03T20:00:00.000Z")).toThrow("P4_NEXT_AUDIT_MANIFEST_CANONICAL_HOLD");
  expect(()=>validateP4NextCohortAuditManifestV39(s,"f".repeat(64),
   "2026-11-03T20:00:00.000Z")).toThrow("P4_NEXT_AUDIT_UNAPPROVED_OR_CHANGED_MANIFEST");
  expect(()=>validateP4NextCohortAuditManifestV39(s,sha,
   "2026-11-03T17:30:00.000Z")).toThrow("P4_NEXT_AUDIT_COHORT_TIME_OR_SOURCE_EXPIRY_HOLD");
  expect(()=>validateP4NextCohortAuditManifestV39(s,sha,
   "2026-11-11T20:00:00.000Z")).toThrow("P4_NEXT_AUDIT_COHORT_TIME_OR_SOURCE_EXPIRY_HOLD");
  const old={...m,serviceWindowStartUtc:"2026-10-31T17:00:00.000Z",serviceWindowEndUtc:"2026-10-31T18:00:00.000Z"};
  const b=canonical(old);
  expect(()=>validateP4NextCohortAuditManifestV39(b,digest(b),
   "2026-11-01T05:30:00.000Z")).toThrow("P4_NEXT_AUDIT_COHORT_TIME_OR_SOURCE_EXPIRY_HOLD");
 });
 it("wrong GitHub event/run/branch/secret never admitted",()=>{
  const e=github("validate-next-cohort-manifest");
  expect(()=>assertP4NextAuditGitHubV39(e,"e".repeat(40),"validate-next-cohort-manifest")).not.toThrow();
  const runner=github("independent-next-cohort-readonly");
  runner.GATE05_AUTOMATION_DATABASE_URL="reader-url";
  expect(()=>assertP4NextAuditGitHubV39(runner,"e".repeat(40),"independent-next-cohort-readonly")).not.toThrow();
  for(const change of [
   {GITHUB_EVENT_NAME:"schedule"},{GITHUB_RUN_ATTEMPT:"2"},
   {GITHUB_REF:"refs/heads/dev"},{GITHUB_JOB:"paid-worker"},
   {AERODATABOX_API_KEY:"secret"},{RAPIDAPI_KEY:"secret"},
   {V39_DATABASE_RUNTIME_URL:"secret"},{DATABASE_URL:"secret"}
  ])expect(()=>assertP4NextAuditGitHubV39({...e,...change},
   "e".repeat(40),"validate-next-cohort-manifest")).toThrow("P4_NEXT_AUDIT_GITHUB_CONTEXT_OR_SECRET_HOLD");
  expect(()=>assertP4NextAuditGitHubV39(e,"f".repeat(40),
   "validate-next-cohort-manifest")).toThrow("P4_NEXT_AUDIT_GITHUB_CONTEXT_OR_SECRET_HOLD");
  expect(()=>assertP4NextAuditGitHubV39({...e,GATE05_AUTOMATION_DATABASE_URL:"secret"},
   "e".repeat(40),"validate-next-cohort-manifest")).toThrow("P4_NEXT_AUDIT_GITHUB_CONTEXT_OR_SECRET_HOLD");
 });
 it("read-only job gated by validation; provider API secret never passed",()=>{
  const y=readFileSync(".github/workflows/phase4-gate5-future-independent-readonly.yml","utf8");
  const code=readFileSync("scripts/v39_phase4_gate5_future_independent_audit_actions.ts","utf8");
  expect(y).toContain("needs: [validate-next-cohort-manifest]");
  expect(y).toContain("needs.validate-next-cohort-manifest.outputs.ready == 'true'");
  expect(y).toContain("persist-credentials: false");
  expect(y).toContain("secrets.GATE05_AUTOMATION_DATABASE_URL");
  expect(y).not.toContain("secrets.AERODATABOX_API_KEY");
  expect(y).not.toContain("workflow_dispatch:");
  expect(y).not.toContain("schedule:");
  expect(code).toContain("REPEATABLE READ READ ONLY");
  expect(code).toContain("ROLLBACK");
  expect(code).not.toContain("INSERT INTO");
  expect(code).not.toContain("fetch(");
  expect(P4_FRESH_COHORT_SOURCE_SQL_V39).toContain("source_hash IS NULL");
  expect(P4_FRESH_COHORT_SOURCE_SQL_V39).toContain("member_available IS NULL");
 });
});
