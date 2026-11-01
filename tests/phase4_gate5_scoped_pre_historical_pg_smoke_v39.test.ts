import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {requireP4G5PreHistoricalContext,P4_G5_PRE_HIST_SHA,
 P4_G5_PRE_HIST_MANIFEST}
 from "../scripts/v39_phase4_gate5_scoped_pre_historical_smoke_actions";

const src=()=>readFileSync(P4_G5_PRE_HIST_MANIFEST,"utf8");
const env=():NodeJS.ProcessEnv=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_EVENT_NAME:"push",GITHUB_REF:"refs/heads/main",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),
 GITHUB_JOB:"historical-pre-source-sql-smoke",
 GITHUB_WORKFLOW:"Phase4 Gate5 Original-as-of PRE Source SQL Read-Only Smoke",
 GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-scoped-pre-original-sql-readonly.yml@refs/heads/main",
 P4_PRE_HIST_SMOKE_INTENT:"OCT31_SOURCE_ASOF_ONLY_NO_PROVIDER"
});
describe("Gate5 scoped PRE actual DB SQL historical smoke caller guard",()=>{
 it("preserves original byte-hash-locked October31 historical scope",()=>{
  expect(P4_G5_PRE_HIST_SHA).toBe(
   "c3785cfae051fd0cf4ef3dd68a3a9d8b0079c89cd34c002fe5610000ff318853");
  expect(()=>requireP4G5PreHistoricalContext(env(),"a".repeat(40),src()))
   .not.toThrow();
  expect(()=>requireP4G5PreHistoricalContext(env(),"a".repeat(40),src()+" "))
   .toThrow("P4_G5_PRE_HIST_SOURCE_MANIFEST_MUTATED");
 });
 it("refuses scheduled/manual/rerun/foreign branches, checkout or provider creds",()=>{
  for(const patch of [
   {GITHUB_EVENT_NAME:"schedule"},{GITHUB_RUN_ATTEMPT:"2"},
   {GITHUB_REF:"refs/heads/develop"},{GITHUB_JOB:"other"},
   {GITHUB_WORKFLOW_REF:"wrong"},{AERODATABOX_API_KEY:"secret"},
   {RAPIDAPI_KEY:"secret"},{DATABASE_URL:"secret"},
   {V39_DATABASE_RUNTIME_URL:"secret"}
  ])expect(()=>requireP4G5PreHistoricalContext({...env(),...patch},
   "a".repeat(40),src())).toThrow("P4_G5_PRE_HIST_EVENT_OR_SOURCE_SECRET_HOLD");
  expect(()=>requireP4G5PreHistoricalContext(env(),"b".repeat(40),src()))
   .toThrow("P4_G5_PRE_HIST_EVENT_OR_SOURCE_SECRET_HOLD");
 });
 it("uses protected reader secret only at SQL step and never starts paid workflow",()=>{
  const workflow=readFileSync(
   ".github/workflows/phase4-gate5-scoped-pre-original-sql-readonly.yml","utf8");
  const operator=readFileSync(
   "scripts/v39_phase4_gate5_scoped_pre_historical_smoke_actions.ts","utf8");
  expect(workflow).toContain("branches: [main]");
  expect(workflow).toContain("environment: phase2g-paid");
  expect(workflow).toContain("persist-credentials: false");
  expect(workflow).toContain("secrets.GATE05_AUTOMATION_DATABASE_URL");
  expect(workflow).not.toContain("secrets.AERODATABOX_API_KEY");
  expect(workflow).not.toContain("workflow_dispatch:");
  expect(workflow).not.toContain("schedule:");
  expect(operator).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(operator).toContain("ROLLBACK");
  expect(operator).toContain("stageP4G5ScopedPreV39(db");
  expect(operator).not.toContain("persistP4G5ReviewedPreForCohortV39");
  expect(operator).not.toContain("fetch(");
  expect(operator).not.toContain("INSERT INTO");
 });
});
