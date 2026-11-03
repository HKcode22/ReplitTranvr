import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {
 P4_G5_FUTURE_HORIZON_MANIFEST_PATH_V39,
 P4_G5_FUTURE_SOURCE_WORKFLOW_V39,
 P4_G5_FUTURE_SOURCE_WORKFLOW_PATH_V39,
 P4_G5_FUTURE_GRID_PATH_V39,
 P4_G5_FUTURE_HORIZON_APPROVED_SHA256_V39,
 admitP4G5FutureHorizonManifestV39,
 attestP4G5FutureSourceGitHubV39,
 assertP4G5FutureHorizonGitHubContextV39
} from "../server/lib/disruption/phase4Gate5FutureHorizonGithubAdmission_v39";
const hash=(s:string)=>createHash("sha256").update(s,"utf8").digest("hex");
const canon=(x:unknown)=>JSON.stringify(x,null,2)+"\n";
const hold=readFileSync(P4_G5_FUTURE_HORIZON_MANIFEST_PATH_V39,"utf8");
const reviewed=()=>{
 const m=JSON.parse(hold);
 return {...m,mode:"REVIEWED_FUTURE_SOURCE_READONLY",
  cohortId:"WSSS_FUTURE_REVIEWED_CI",frozenGridPath:P4_G5_FUTURE_GRID_PATH_V39,
  frozenGridSha256:"a".repeat(64),sourceOwnerHeadSha:"b".repeat(40),
  sourceRightsEvidenceSha256:"c".repeat(64),
  metadataProofStorageRightsReviewed:true,readOnlyDbApproved:true
 };
};
const approval=()=>{
 const bytes=canon(reviewed()),r=admitP4G5FutureHorizonManifestV39(
  bytes,hash(bytes));
 if(r.status!=="REVIEWED_FUTURE_HORIZON_READONLY")
  throw Error("TEST_APPROVAL_NOT_RESOLVED");
 return r;
};
const gh=(jobName="owner-t24")=>{
 const run={id:987654321,name:P4_G5_FUTURE_SOURCE_WORKFLOW_V39,
  path:P4_G5_FUTURE_SOURCE_WORKFLOW_PATH_V39,
  head_sha:"b".repeat(40),head_branch:"main",event:"push",
  run_attempt:1,status:"completed",conclusion:"success",
  repository:{full_name:"HKcode22/ReplitTranvr"},
  head_repository:{full_name:"HKcode22/ReplitTranvr"}};
 const jobs={total_count:1,jobs:[{name:jobName,run_id:987654321,
  status:"completed",conclusion:"success"}]};
 return {run,jobs};
};
describe("future pre-expiry GitHub original-source audit is inert unless reviewed",()=>{
 it("current production manifest stays HOLD and code pin NULL",()=>{
  expect(P4_G5_FUTURE_HORIZON_APPROVED_SHA256_V39).toBeNull();
  const r=admitP4G5FutureHorizonManifestV39(hold,null);
  expect(r.status).toBe("HOLD_NO_APPROVED_FUTURE_AUDIT");
  expect(JSON.parse(hold).readOnlyDbApproved).toBe(false);
 });
 it("rejects mutated hold, self-declared approved flag, unpinned SHA and extra keys",()=>{
  expect(()=>admitP4G5FutureHorizonManifestV39(
   canon({...JSON.parse(hold),readOnlyDbApproved:true}),null)).toThrow("HOLD");
  const m=reviewed(),bytes=canon(m);
  expect(()=>admitP4G5FutureHorizonManifestV39(bytes,null)).toThrow("HOLD");
  expect(()=>admitP4G5FutureHorizonManifestV39(bytes,"f".repeat(64))).toThrow("HOLD");
  expect(()=>admitP4G5FutureHorizonManifestV39(
   canon({...m,unexpected:true}),hash(canon({...m,unexpected:true})))).toThrow("HOLD");
  expect(()=>admitP4G5FutureHorizonManifestV39(
   canon({...m,sourceWorkflowPath:"other.yml"}),hash(canon({
    ...m,sourceWorkflowPath:"other.yml"})))).toThrow("HOLD");
 });
 it("authenticates exact independently fetched GitHub source run AND one horizon job",()=>{
  const review=approval();
  for(const [name,horizon] of [
   ["owner-t24","T-24h"],["owner-t6","T-6h"],["owner-t90","T-90m"]
  ]){
   const {run,jobs}=gh(name);
   const attested=attestP4G5FutureSourceGitHubV39(review,987654321,run,jobs);
   expect(attested.horizon).toBe(horizon);
   expect(attested.runId).toBe("987654321");
  }
 });
 it("refuses missed, duplicate, wrong-horizon and cross-repo job evidence",()=>{
  const review=approval();
  for(const mutate of [
   (run:any,jobs:any)=>{run.head_sha="d".repeat(40);},
   (run:any,jobs:any)=>{run.event="workflow_dispatch";},
   (run:any,jobs:any)=>{run.head_branch="other";},
   (run:any,jobs:any)=>{run.run_attempt=2;},
   (run:any,jobs:any)=>{run.repository.full_name="attacker/repo";},
   (run:any,jobs:any)=>{jobs.jobs[0].name="owner-t24-extra";},
   (run:any,jobs:any)=>{jobs.jobs[0].conclusion="skipped";},
   (run:any,jobs:any)=>{jobs.total_count=2;},
   (run:any,jobs:any)=>{jobs.jobs[0].run_id=8;}
  ]){
   const {run,jobs}=gh();mutate(run,jobs);
   expect(()=>attestP4G5FutureSourceGitHubV39(
    review,987654321,run,jobs)).toThrow("HOLD");
  }
  const {run,jobs}=gh();
  expect(()=>attestP4G5FutureSourceGitHubV39(
   review,987654320,run,jobs)).toThrow("HOLD");
 });
 it("checks GH trusted workflow context and no provider/DB secrets in admission",()=>{
  const env={
   GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
   GITHUB_EVENT_NAME:"workflow_run",GITHUB_REF:"refs/heads/main",
   GITHUB_RUN_ATTEMPT:"1",
   GITHUB_WORKFLOW:"Phase4 Gate5 Future Pre-expiry Independent Original Audit",
   GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-future-preexpiry-original-audit.yml@refs/heads/main",
   GITHUB_JOB:"admit-future-horizon",
   GITHUB_SHA:"1".repeat(40),
   P4_G5_HORIZON_READONLY_INTENT:"VERIFY_FUTURE_ORIGINALS_NO_PROVIDER"
  };
  expect(()=>assertP4G5FutureHorizonGitHubContextV39(
   env,"admit-future-horizon","1".repeat(40))).not.toThrow();
  expect(()=>assertP4G5FutureHorizonGitHubContextV39(
   {...env,GATE05_AUTOMATION_DATABASE_URL:"secret"},
   "admit-future-horizon","1".repeat(40))).toThrow("HOLD");
  expect(()=>assertP4G5FutureHorizonGitHubContextV39(
   {...env,AERODATABOX_API_KEY:"secret"},
   "admit-future-horizon","1".repeat(40))).toThrow("HOLD");
  expect(()=>assertP4G5FutureHorizonGitHubContextV39(
   {...env,GITHUB_EVENT_NAME:"push"},
   "admit-future-horizon","1".repeat(40))).toThrow("HOLD");
 });
 it("only triggered by future producer completion; never by Nov2 paid main push",()=>{
  const yaml=readFileSync(
   ".github/workflows/phase4-gate5-future-preexpiry-original-audit.yml","utf8");
  expect(yaml).toContain("workflow_run:");
  expect(yaml).toContain('Phase4 Gate5 Future Reviewed Source Owner');
  expect(yaml).not.toMatch(/(^|\n)  push:/);
  expect(yaml).not.toContain("workflow_dispatch:");
  expect(yaml).not.toContain("AERODATABOX_API_KEY: ${{ secrets.");
  expect(yaml).toContain("GATE05_AUTOMATION_DATABASE_URL: ${{ secrets.");
  const script=readFileSync(
   "scripts/v39_phase4_gate5_future_horizon_originals_readonly_actions.ts","utf8");
  expect(script).toContain("auditP4G5DiscoveredHorizonOriginalBeforeExpiryV39");
  expect(script).toContain("expectedOwnerGithubRunId:source.runId");
  expect(script).toContain("REPEATABLE READ READ ONLY");
  expect(script).not.toContain("INSERT INTO");
  expect(script).not.toContain("DELETE FROM");
 });
});
