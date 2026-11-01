import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {attestP4G5RunningRehearsalJobV39}
 from "../server/lib/disruption/phase4Gate5GitHubRunningJobEvidence_v39";

const SHA="f".repeat(40);
const started="2026-11-01T10:00:10Z";
function fixture(jobName:"owner-t24"|"owner-t6"|"owner-t90"="owner-t24"){
 const env={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_EVENT_NAME:"push",GITHUB_REF:"refs/heads/main",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"41297067196",
  GITHUB_RUN_NUMBER:"12",GITHUB_JOB:jobName,
  GITHUB_WORKFLOW:"Phase4 Gate5 Three GitHub Physical Owner Rehearsal",
  GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-three-physical-owner-rehearsal.yml@refs/heads/main",
  GITHUB_SHA:SHA,P4_G5_OWNER_REHEARSAL_INTENT:"SIMULATED_TIMES_NO_PROVIDER"
 };
 const run={
  id:41297067196,run_attempt:1,run_number:12,event:"push",
  head_branch:"main",head_sha:SHA,
  name:"Phase4 Gate5 Three GitHub Physical Owner Rehearsal",
  repository:{full_name:"HKcode22/ReplitTranvr"},status:"in_progress",
  conclusion:null,created_at:"2026-11-01T10:00:00Z",
  run_started_at:"2026-11-01T10:00:05Z"
 };
 const job={
  id:124820018825,run_id:41297067196,name:jobName,
  status:"in_progress",conclusion:null,head_sha:SHA,
  workflow_name:run.name,started_at:started
 };
 return {env,run,job};
}
const observed="2026-11-01T10:02:10Z";
const verified="2026-11-01T10:02:12Z";
function admit(f:ReturnType<typeof fixture>,o=observed,v=verified){
 return attestP4G5RunningRehearsalJobV39(f.env,SHA,f.run,f.job,o,v);
}
describe("Gate5 real GitHub API active-owner proof, rehearsal only",()=>{
 it.each(["owner-t24","owner-t6","owner-t90"] as const)(
  "valid running API job %s yields actual job and script observation clocks, never a source permit",
  name=>{
   const r=admit(fixture(name));
   expect(r.independentlyVerifiedRunningJobMetadata).toBe(true);
   expect(r.actualGitHubJobStartedAtUtc).toBe("2026-11-01T10:00:10.000Z");
   expect(r.realFutureHorizonPrearmed).toBe(false);
   expect(r.paidProviderDispatchAuthorized).toBe(false);
   expect(r.strictGate5Passed).toBe(false);
  });
 it("rejects mismatched real run ID, run number, owner job and sha",()=>{
  for(const patch of [
   {env:{GITHUB_RUN_ID:"41297067197"}},
   {env:{GITHUB_RUN_NUMBER:"13"}},
   {env:{GITHUB_SHA:"a".repeat(40)}},
   {env:{GITHUB_JOB:"owner-other"}},
   {run:{head_sha:"a".repeat(40)}},
   {job:{run_id:41297067197}},
   {job:{name:"owner-t90"}}
  ]){
   const f=fixture();
   Object.assign(f.env,patch.env??{});
   Object.assign(f.run,patch.run??{});
   Object.assign(f.job,patch.job??{});
   expect(()=>admit(f)).toThrow();
  }
 });
 it("rejects queued, completed, fake workflow, branch and time/replay drift",()=>{
  for(const patch of [
   {run:{status:"completed"}},{run:{conclusion:"success"}},
   {run:{run_attempt:2}},{run:{event:"workflow_dispatch"}},
   {run:{head_branch:"not-main"}},{run:{name:"Other workflow"}},
   {run:{repository:{full_name:"other/repo"}}},
   {job:{status:"queued"}},{job:{status:"completed"}},
   {job:{conclusion:"success"}},
   {job:{started_at:"2026-11-01T10:03:00Z"}},
   {job:{started_at:"2026-11-01T09:40:00Z"}},
   {run:{run_started_at:"2026-11-01T10:05:00Z"}}
  ]){
   const f=fixture();
   Object.assign(f.run,patch.run??{});
   Object.assign(f.job,patch.job??{});
   expect(()=>admit(f)).toThrow();
  }
  expect(()=>admit(fixture(),"2026-11-01T10:02:10Z",
   "2026-11-01T10:05:30Z")).toThrow();
  expect(()=>admit(fixture(),"2026-11-01T09:59:59Z",
   "2026-11-01T10:00:00Z")).toThrow();
 });
 it("rejects API object omissions and injected production/provider credentials",()=>{
  const f=fixture();
  for(const key of ["created_at","run_started_at","id","status"]){
   const bad=structuredClone(f.run) as Record<string,unknown>;
   delete bad[key];
   expect(()=>attestP4G5RunningRehearsalJobV39(
    f.env,SHA,bad,f.job,observed,verified)).toThrow();
  }
  for(const key of ["AERODATABOX_API_KEY","RAPIDAPI_KEY","DATABASE_URL",
    "GATE05_AUTOMATION_DATABASE_URL"]){
   expect(()=>admit({...f,env:{...f.env,[key]:"dummy"}})).toThrow();
  }
 });
 it("only runs from three authorized push jobs with read-only GH token",()=>{
  const yaml=readFileSync(
   ".github/workflows/phase4-gate5-three-physical-owner-rehearsal.yml","utf8");
  const cli=readFileSync(
   "scripts/v39_phase4_gate5_github_live_job_attestation_actions.ts","utf8");
  expect(yaml).toContain("actions: read");
  expect(yaml).toContain("github.token");
  expect(yaml).toContain("v39_phase4_gate5_github_live_job_attestation_actions.ts");
  expect(yaml).not.toContain("workflow_dispatch:");
  expect(yaml).not.toContain("schedule:");
  expect(cli).toContain("/actions/runs/");
  expect(cli).not.toContain("aerodatabox.com");
  expect(cli).not.toContain("reserve_phase4_g5");
 });
});
