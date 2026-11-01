import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {compileP4G5OfflinePrearms,requireP4G5PrearmOfflineActionsContext,
 type P4G5OfflineTemplate}
 from "../server/lib/disruption/phase4Gate5OfflineThreeOwnerPrearm_v39";

const path="data-collection/phase4/GATE5_NEXT_COHORT_PREARM_SYNTHETIC_HOLD.json";
const bytes=()=>readFileSync(path,"utf8");
const base=():P4G5OfflineTemplate=>JSON.parse(bytes());
const compile=()=>compileP4G5OfflinePrearms(base(),bytes());
const goodEnv=():NodeJS.ProcessEnv=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"push",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),
 GITHUB_JOB:"compile-offline-three-owners",
 GITHUB_WORKFLOW:"Phase4 Gate5 Offline Three Horizon GitHub Prearm Planner",
 GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-offline-three-horizon-owner-prearm.yml@refs/heads/main",
 P4_G5_PREARM_INTENT:"SYNTHETIC_THREE_HORIZONS_ZERO_PROVIDER"
});
describe("Phase4 Gate5 three independent GitHub horizon owner plans",()=>{
 it("reserves all 9 source requests and 27 physical attempts in three owners",()=>{
  const r=compile();
  expect(r.status).toBe("ENGINEERING_OFFLINE_NOT_ARMED");
  expect(r.owners.map(x=>x.horizon)).toEqual(["T-24h","T-6h","T-90m"]);
  expect(r.owners.map(x=>x.queryCount)).toEqual([3,3,3]);
  expect(r.owners.map(x=>x.reservedPhysicalAttempts)).toEqual([9,9,9]);
  expect(r.owners.map(x=>x.reservedApiUnits)).toEqual([18,18,18]);
  expect(r.fullGridRequests).toBe(9);
  expect(r.fullGridWorstCaseApiUnits).toBe(54);
  expect(new Set(r.owners.map(x=>x.ownerDigest)).size).toBe(3);
  expect(r.owners.every(o=>o.entries.every(e=>
   Date.parse(e.targetPhysicalDispatchUtc)<=
   Date.parse(e.latestPermittedPhysicalDispatchUtc)))).toBe(true);
  expect(r.owners.every(o=>Date.parse(o.prearmWindowOpensUtc)<
   Date.parse(o.runningGitHubJobMustBeVerifiedByUtc))).toBe(true);
  expect(r.owners.every(o=>o.actualGitHubRunnerObserved===false)).toBe(true);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
  expect(r.strictGate5Passed).toBe(false);
 });
 it("does not promote edited synthetic mode, proof flags or modified bytes to paid",()=>{
  const b=base();
  expect(()=>compileP4G5OfflinePrearms({...b,paidSourceActivationAuthorized:true} as any,
   JSON.stringify({...b,paidSourceActivationAuthorized:true})))
   .toThrow("P4_PREARM_SYNTHETIC_HOLD_TEMPLATE_REQUIRED");
  expect(()=>compileP4G5OfflinePrearms({...b,mode:"PAID"} as any,
   JSON.stringify({...b,mode:"PAID"})))
   .toThrow("P4_PREARM_SYNTHETIC_HOLD_TEMPLATE_REQUIRED");
  expect(()=>compileP4G5OfflinePrearms(b,bytes()+" "))
   .toThrow("P4_PREARM_ORIGINAL_TEMPLATE_CHANGED_HOLD");
 });
 it("rejects insufficient 15-minute guard, budget, and late freeze",()=>{
  const a=base();a.grid.acquisitionGuardMinutes=14;
  expect(()=>compileP4G5OfflinePrearms(a,JSON.stringify(a)))
   .toThrow("P4_PREARM_DISPATCH_GUARD_BELOW_15M");
  const b=base();b.grid.projectRestApiUnitsBudget=53;
  expect(()=>compileP4G5OfflinePrearms(b,JSON.stringify(b)))
   .toThrow("P4_GRID_WORST_CASE_API_UNITS_OVER_BUDGET");
  const c=base();c.grid.assignmentFrozenAtUtc="2027-01-14T16:00:00.000Z";
  expect(()=>compileP4G5OfflinePrearms(c,JSON.stringify(c)))
   .toThrow("P4_GRID_FREEZE_TOO_LATE_FOR_EARLIEST_PREARM");
 });
 it("rejects wrong GitHub event, retry, checkout, provider or database credentials",()=>{
  const e=goodEnv();
  expect(()=>requireP4G5PrearmOfflineActionsContext(e,"a".repeat(40))).not.toThrow();
  for(const patch of [
   {GITHUB_EVENT_NAME:"schedule"},{GITHUB_RUN_ATTEMPT:"2"},
   {GITHUB_JOB:"paid-owner"},{GITHUB_REF:"refs/heads/dev"},
   {AERODATABOX_API_KEY:"secret"},{RAPIDAPI_KEY:"secret"},
   {DATABASE_URL:"secret"},{V39_DATABASE_RUNTIME_URL:"secret"},
   {GATE05_AUTOMATION_DATABASE_URL:"secret"}
  ])expect(()=>requireP4G5PrearmOfflineActionsContext({...e,...patch},"a".repeat(40)))
   .toThrow("P4_PREARM_GITHUB_EVENT_OR_SECRET_HOLD");
  expect(()=>requireP4G5PrearmOfflineActionsContext(e,"b".repeat(40)))
   .toThrow("P4_PREARM_GITHUB_EVENT_OR_SECRET_HOLD");
 });
 it("GitHub offline workflow never uses secrets, provider, database or timers",()=>{
  const y=readFileSync(".github/workflows/phase4-gate5-offline-three-horizon-owner-prearm.yml","utf8");
  const src=readFileSync("server/lib/disruption/phase4Gate5OfflineThreeOwnerPrearm_v39.ts","utf8");
  const runner=readFileSync("scripts/v39_phase4_gate5_prearm_offline_actions.ts","utf8");
  expect(y).toContain("branches: [main]");
  expect(y).toContain("persist-credentials: false");
  expect(y).not.toContain("secrets.");
  expect(y).not.toContain("workflow_dispatch:");
  expect(y).not.toContain("schedule:");
  expect(src).not.toContain("fetch(");
  expect(src).not.toContain("INSERT INTO");
  expect(runner).not.toContain("fetch(");
  expect(runner).not.toContain("new pg.Client");
  expect(base().cohortId).toContain("SYNTHETIC");
 });
});
