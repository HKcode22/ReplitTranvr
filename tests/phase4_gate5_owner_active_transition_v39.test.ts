import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {prepareP4G5PhysicalOwnerV39}
 from "../server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39";
import {
 P4_G5_ACTIVE_LIVE_RELEASE_SHA_V39,
 requireP4G5ActiveLiveReleaseV39,
 assertP4G5ActiveTransitionInputV39,
 activateP4G5PreparedOwnerDbOnlyV39
} from "../server/lib/disruption/phase4Gate5OwnerActiveTransition_v39";
const bytes=readFileSync(
 "data-collection/phase4/GATE5_NEXT_COHORT_PREARM_SYNTHETIC_HOLD.json","utf8");
function fixture(){
 const m=JSON.parse(bytes);
 const d=createHash("sha256").update(bytes).digest("hex");
 const first=Date.parse(m.grid.serviceWindowStartUtc)-
  (1440+m.grid.acquisitionGuardMinutes)*60000;
 const owner=prepareP4G5PhysicalOwnerV39({
  cohortId:m.cohortId,frozenManifestBytes:bytes,
  reviewedManifestSha256:d,grid:m.grid,horizon:"T-24h",
  actualOwnerProcessStartedAtUtc:new Date(first-
   (m.grid.githubPrearmLeadMinutes+5)*60000).toISOString()
 });
 return {owner,githubRunId:"99110001",
  reviewedRunAuthorizationSha256:"a".repeat(64),
  providerNativeSelectedTEvidenceSha256:"b".repeat(64),
  perRecordActualOnlyRunwayEvidenceSha256:"c".repeat(64),
  operatingPhysicalLegEvidenceSha256:"d".repeat(64),
  lawfulContentRetentionEvidenceSha256:"e".repeat(64),
  independentlyAuthenticatedGitHubRunnerEvidenceSha256:"f".repeat(64)};
}
describe("V0076 low-level PREPARED -> ACTIVE remains production CLOSED",()=>{
 it("production release pin is NULL; SHA-shaped evidence cannot promote",()=>{
  expect(P4_G5_ACTIVE_LIVE_RELEASE_SHA_V39).toBe(null);
  const x=fixture();
  expect(()=>requireP4G5ActiveLiveReleaseV39(x.owner.manifestSha256))
   .toThrow("P4_G5_ACTIVE_LIVE_RELEASE_SOURCE_RIGHTS_NOT_APPROVED");
 });
 it("rejects malformed external proof references and untrusted owner/run inputs",()=>{
  const x=fixture();
  expect(()=>assertP4G5ActiveTransitionInputV39(x)).not.toThrow();
  for(const patch of [
   {providerNativeSelectedTEvidenceSha256:""},
   {perRecordActualOnlyRunwayEvidenceSha256:"z".repeat(64)},
   {lawfulContentRetentionEvidenceSha256:""},
   {independentlyAuthenticatedGitHubRunnerEvidenceSha256:""},
   {githubRunId:"not-numeric"},
   {reviewedRunAuthorizationSha256:"a"},
   {owner:{...x.owner,actualPaidOwnerAuthorized:true}}
  ]){
   expect(()=>assertP4G5ActiveTransitionInputV39({...x,...patch} as any))
    .toThrow("P4_G5_ACTIVE_UNVERIFIED_MANIFEST_OWNER_OR_PROOF_REFERENCE");
  }
 });
 it("refuses malformed input BEFORE database connect/BEGIN",async()=>{
  const q=viQuery();
  const x=fixture();
  await expect(activateP4G5PreparedOwnerDbOnlyV39(q,{
    ...x,operatingPhysicalLegEvidenceSha256:""
  })).rejects.toThrow("P4_G5_ACTIVE_UNVERIFIED_MANIFEST_OWNER_OR_PROOF_REFERENCE");
  expect(q.calls).toHaveLength(0);
 });
 it("only updates exact PREPARED role with Pg-clock cutoffs and rollback guards",()=>{
  const s=readFileSync(
   "server/lib/disruption/phase4Gate5OwnerActiveTransition_v39.ts","utf8");
  const w=readFileSync(
   ".github/workflows/phase4-gate5-v0076-active-transition-disposable-pg16.yml","utf8");
  const script=readFileSync(
   "scripts/v39_phase4_gate5_v0076_active_transition_disposable_pg16_actions.ts","utf8");
  expect(s).toContain("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  expect(s).toContain("pg_advisory_xact_lock(76,41)");
  expect(s).toContain("clock_timestamp()");
  expect(s).toContain("state='PREPARED'");
  expect(s).toContain("state='ACTIVE'");
  expect(s).toContain("ORDER BY query_index ASC FOR UPDATE");
  expect(s).toContain("r.query_digest!==e.queryDigest");
  expect(s).toContain("r.hard_latest_dispatch_utc");
  expect(s).toContain("r.prediction_cutoff_utc");
  expect(s).toContain("r.max_physical_attempts");
  expect(script).toContain("P4_G5_ACTIVE_DISPOSABLE_DRIFT_ALLOWED");
  expect(script).toContain("P4_G5_ACTIVE_DISPOSABLE_DRIFT_NOT_ROLLED_BACK");
  expect(s).toContain("ROLLBACK");
  expect(s).not.toContain("https://aerodatabox");
  expect(w).toContain("image: postgres:16");
  expect(w).toContain("gate5_activation");
  expect(w).not.toContain("secrets.");
  expect(w).not.toContain("workflow_dispatch:");
  expect(w).not.toContain("schedule:");
  expect(script).toContain("requireP4G5ActiveLiveReleaseV39");
  expect(script).toContain("P4_G5_ACTIVE_DISPOSABLE_PREMATURE_GET_NOT_REFUSED");
 });
});
function viQuery(){
 const calls:string[]=[];
 return {calls,async query(sql:string){
  calls.push(sql);return {rows:[]};
 }};
}
