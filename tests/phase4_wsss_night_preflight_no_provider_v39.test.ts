import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {
 requireP4NightBeforeContextV39,
 auditP4NightInfrastructureV39,
 P4_NIGHT_PREFLIGHT_SQL,
 P4_NIGHT_PREFLIGHT_STOP_UTC
} from "../scripts/v39_phase4_night_preflight_no_provider_actions";
const e={
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"push",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),
 P4_NIGHT_PRECHECK_INTENT:"PHASE4_WSSS_DB_READONLY_INFRASTRUCTURE_NO_PROVIDER"
} as NodeJS.ProcessEnv;
const now=Date.parse("2026-10-31T02:00:00.000Z");
const valid={raw_exists:true,population_exists:true,raw_insert:true,
 population_insert:true,raw_immutable:true,raw_expiry:true,recent_source_receipts:1};
describe("WSSS pre-scheduled DB infrastructure readiness with no provider",()=>{
 it("accepts only fixed main push, first attempt, pre-3am night-before window",()=>{
  expect(()=>requireP4NightBeforeContextV39(e,now)).not.toThrow();
  for(const bad of [
   {GITHUB_REPOSITORY:"other/repo"},
   {GITHUB_REF:"refs/heads/pr"},
   {GITHUB_EVENT_NAME:"schedule"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {GITHUB_SHA:"missing"},
   {P4_FIDS_SCHEDULE_CRON:"7 10 31 10 *"},
   {AERODATABOX_API_KEY:"MUST_NOT_BE_PASSED"},
   {P4_NIGHT_PRECHECK_INTENT:"SOMETHING_PAID"}
  ])expect(()=>requireP4NightBeforeContextV39({...e,...bad},now))
    .toThrow("P4_NIGHT_PRECHECK_CONTEXT_HOLD");
  expect(()=>requireP4NightBeforeContextV39(e,Date.parse(P4_NIGHT_PREFLIGHT_STOP_UTC)))
    .toThrow();
  expect(()=>requireP4NightBeforeContextV39(e,Date.parse("2026-10-30T21:59:59.000Z")))
    .toThrow();
 });
 it("verifies true writer/schema preflight without reporting credits or science pass",async()=>{
  const db={query:vi.fn(async()=>({rows:[valid]}))};
  const r=await auditP4NightInfrastructureV39(db);
  expect(r.status).toBe("PRE_PAID_INFRASTRUCTURE_DB_WRITER_READY_NOT_QUOTA_PROVEN");
  expect(r.writerInsertGrantsVerified).toBe(true);
  expect(r.existingWsssRetainedSourceReceipts).toBe(1);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
  expect(r.strictGate5Passed).toBe(false);
  expect(db.query).toHaveBeenCalledWith(P4_NIGHT_PREFLIGHT_SQL,[]);
 });
 it("zero receipts is not a zero-flight denominator; missing grants fail",async()=>{
  const zero=await auditP4NightInfrastructureV39({query:async()=>({
    rows:[{...valid,recent_source_receipts:0}]
  })});
  expect(zero.databaseWriterReady).toBe(true);
  expect(zero.sourceMayBeMissingWithoutMeaningZeroFlights).toBe(true);
  const no=await auditP4NightInfrastructureV39({query:async()=>({
    rows:[{...valid,raw_insert:false}]
  })});
  expect(no.status).toBe("HOLD_DB_SCHEMA_WRITER_OR_RETENTION");
  expect(no.databaseWriterReady).toBe(false);
  for(const broken of [{...valid,recent_source_receipts:-1},
    {...valid,raw_immutable:null},{...valid,recent_source_receipts:"1"}]){
   await expect(auditP4NightInfrastructureV39({query:async()=>({rows:[broken]})})).rejects.toThrow();
  }
 });
 it("GitHub action is one-time main push, cannot access the paid API, script is SQL read only",()=>{
  const wf=readFileSync(".github/workflows/phase4-wsss-night-preflight-no-provider.yml","utf8");
  const code=readFileSync("scripts/v39_phase4_night_preflight_no_provider_actions.ts","utf8");
  expect(wf).toContain("branches: [main]");
  expect(wf).not.toContain("workflow_dispatch");
  expect(wf).not.toContain("on:\n  schedule");
  expect(wf).not.toContain("secrets.AERODATABOX_API_KEY");
  expect(wf).not.toContain("P4_FIDS_SCHEDULE_CRON:");
  expect(wf).toContain("environment: phase2g-paid");
  expect(code).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(code).toContain('c.query("ROLLBACK")');
  expect(code).not.toContain("fetchFidsAirport");
  expect(code).not.toContain("getBalanceEvidenceStrict");
  expect(P4_NIGHT_PREFLIGHT_SQL).not.toMatch(/\b(?:UPDATE|INSERT INTO|DELETE|TRUNCATE|CREATE|DROP)\b/i);
 });
});
