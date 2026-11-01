import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {attestP4G5V0076DisposableRunningOwnerV39}
 from "../server/lib/disruption/phase4Gate5V0076DisposableRunningOwner_v39";
const sha="c".repeat(40);
function fixture(){
 const env:NodeJS.ProcessEnv={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_EVENT_NAME:"push",GITHUB_REF:"refs/heads/main",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"41298537801",
  GITHUB_RUN_NUMBER:"5",GITHUB_JOB:"disposable-v0076-activation",
  GITHUB_WORKFLOW:"Phase4 Gate5 V0076 Disposable PREPARED to ACTIVE",
  GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-v0076-active-transition-disposable-pg16.yml@refs/heads/main",
  GITHUB_SHA:sha,P4_G5_ACTIVE_DISPOSABLE_INTENT:"SYNTHETIC_ZERO_PROVIDER_NULL_RELEASE",
  DATABASE_URL:"postgresql://postgres:postgres@localhost:5432/gate5_activation"
 };
 const run={
  id:41298537801,run_number:5,run_attempt:1,event:"push",
  head_branch:"main",head_sha:sha,
  name:"Phase4 Gate5 V0076 Disposable PREPARED to ACTIVE",
  repository:{full_name:"HKcode22/ReplitTranvr"},
  status:"in_progress",conclusion:null,
  created_at:"2026-11-01T10:00:00Z",run_started_at:"2026-11-01T10:00:02Z"
 };
 const job={
  id:123456789012,run_id:41298537801,name:"disposable-v0076-activation",
  status:"in_progress",conclusion:null,head_sha:sha,
  workflow_name:run.name,started_at:"2026-11-01T10:00:05Z"
 };
 return {env,run,job};
}
function check(x=fixture(),obs="2026-11-01T10:00:15Z",
 verified="2026-11-01T10:00:16Z"){
 return attestP4G5V0076DisposableRunningOwnerV39(
  x.env,sha,x.run,x.job,obs,verified);
}
describe("Gate5 V0076 real GH running identity, disposable DB-only",()=>{
 it("returns verified GitHub job timing but never a future cohort or source permit",()=>{
  const y=check();
  expect(y.actualGitHubJobStartedAtUtc).toBe("2026-11-01T10:00:05.000Z");
  expect(y.githubRunId).toBe("41298537801");
  expect(y.githubRunningJobApiVerified).toBe(true);
  expect(y.futureCohortPrearmVerified).toBe(false);
  expect(y.realProviderCallsAuthorized).toBe(false);
  expect(y.strictGate5Passed).toBe(false);
 });
 it("fails closed on incompatible event, token target, checkout and secrets",()=>{
  for(const patch of [
   {GITHUB_EVENT_NAME:"schedule"},{GITHUB_REF:"refs/heads/other"},
   {GITHUB_RUN_ATTEMPT:"2"},{GITHUB_JOB:"owner-t90"},
   {GITHUB_RUN_ID:"41298537802"},{GITHUB_RUN_NUMBER:"6"},
   {GITHUB_SHA:"f".repeat(40)},
   {DATABASE_URL:"postgresql://production/db"},
   {AERODATABOX_API_KEY:"should-not-exist"},
   {RAPIDAPI_KEY:"should-not-exist"},
   {GATE05_AUTOMATION_DATABASE_URL:"should-not-exist"},
   {V39_DATABASE_RUNTIME_URL:"should-not-exist"},
   {P4_G5_ACTIVE_DISPOSABLE_INTENT:"REAL_PAID"}
  ])expect(()=>check({...fixture(),env:{...fixture().env,...patch}}))
     .toThrow();
 });
 it("rejects spoofed metadata, completed/queued jobs and run mismatch",()=>{
  for(const diff of [
   {run:{id:41298537802}},{run:{run_number:6}},
   {run:{head_sha:"f".repeat(40)}},{run:{status:"completed"}},
   {run:{conclusion:"success"}},{run:{event:"workflow_dispatch"}},
   {run:{name:"another workflow"}},{run:{run_attempt:2}},
   {run:{repository:{full_name:"other/repo"}}},
   {job:{run_id:41298537802}},{job:{name:"other"}},
   {job:{status:"queued"}},{job:{status:"completed"}},
   {job:{conclusion:"success"}},
   {job:{workflow_name:"another workflow"}},
   {job:{head_sha:"f".repeat(40)}}
  ]){
   const x=fixture();
   Object.assign(x.run,diff.run??{});
   Object.assign(x.job,diff.job??{});
   expect(()=>check(x)).toThrow();
  }
 });
 it("rejects reversed, fabricated, late and stale real clock evidence",()=>{
  for(const diff of [
   {run:{created_at:"2026-11-01T10:10:00Z"}},
   {run:{run_started_at:"2026-11-01T10:15:00Z"}},
   {job:{started_at:"2026-11-01T09:55:00Z"}},
   {job:{started_at:"2026-11-01T10:20:00Z"}},
   {job:{started_at:"not-a-time"}}
  ]){
   const x=fixture();
   Object.assign(x.run,diff.run??{});
   Object.assign(x.job,diff.job??{});
   expect(()=>check(x)).toThrow();
  }
  expect(()=>check(fixture(),"2026-11-01T10:20:15Z",
   "2026-11-01T10:20:16Z")).toThrow();
  expect(()=>check(fixture(),"2026-11-01T10:00:15Z",
   "2026-11-01T10:05:00Z")).toThrow();
 });
 it("workflow is isolated, read-only GH API + disposable PG16, not provider",()=>{
  const w=readFileSync(".github/workflows/phase4-gate5-v0076-active-transition-disposable-pg16.yml","utf8");
  const s=readFileSync("scripts/v39_phase4_gate5_v0076_active_transition_disposable_pg16_actions.ts","utf8");
  const api=readFileSync("scripts/v39_phase4_gate5_v0076_gh_running_disposable_attestation.ts","utf8");
  expect(w).toContain("actions: read");
  expect(w).toContain("github.token");
  expect(w).toContain("image: postgres:16");
  expect(w).toContain("gate5_activation");
  expect(w).not.toContain("secrets.");
  expect(w).not.toContain("workflow_dispatch:");
  expect(w).not.toContain("schedule:");
  expect(api).toContain("/actions/runs/");
  expect(s).toContain("requireP4G5V0076DisposableGitHubProof");
  expect(s).toContain("gh.actualGitHubJobStartedAtUtc");
  expect(s).toContain("githubRunId:gh.githubRunId");
  expect(api).not.toContain("aerodatabox.com");
  expect(api).not.toContain("reserve_phase4_g5");
 });
});
