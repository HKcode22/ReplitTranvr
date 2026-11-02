import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {draftP4Gate5ThreeHorizonGridV39}
 from "../server/lib/disruption/phase4Gate5FrozenGridDraft_v39";
import {validatedContext}
 from "../scripts/v39_phase4_gate5_wsss_20261102_three_horizon_real_aggregate_paid_actions";
const path="data-collection/phase4/GATE5_WSSS_20261102_FROZEN_NONRETAINED_REAL_HORIZONS.json";
const bytes=readFileSync(path,"utf8"),m=JSON.parse(bytes);
const SHA="a".repeat(40);
function env(h:"T-24h"|"T-6h"|"T-90m"="T-24h"):NodeJS.ProcessEnv{
 return {
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_SHA:SHA,GITHUB_RUN_ATTEMPT:"1",
  GITHUB_RUN_ID:"41304087870",GITHUB_EVENT_NAME:h==="T-24h"?"push":"schedule",
  GITHUB_WORKFLOW:"Phase4 Gate5 WSSS Nov2 Three Horizon Real Paid Aggregate",
  GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-wsss-20261102-real-paid-aggregate-three-horizons.yml@refs/heads/main",
  GITHUB_JOB:h==="T-24h"?"owner-t24":h==="T-6h"?"owner-t6":"owner-t90",
  P4_G5_NOV2_HORIZON:h,
  P4_G5_NOV2_INTENT:"WSSS_NOV2_THREE_HORIZON_REAL_9_GET_18_UNIT_MAX_NO_PROVIDER_CONTENT",
  P4_G5_CRON:h==="T-6h"?"37 6 2 11 *":h==="T-90m"?"17 11 2 11 *":"",
  P4_G5_GH_READ_ONLY_TOKEN:"FAKE_READ_ONLY_TOKEN_NOT_REAL",
  AERODATABOX_API_KEY:"FAKE_TEST_KEY_NOT_REAL"
 };
}
describe("Gate5 real Nov2 future paid GH three-horizon source opportunities",()=>{
 it("freezes exactly 9 physical slots and 18 API units with true three owner deadlines",()=>{
  expect(bytes).toBe(JSON.stringify(m,null,2)+"\n");
  expect(m.mode).toBe("PAID_EPHEMERAL_SOURCE_FIELDS_ONLY_NOT_SCIENTIFIC_GATE5");
  const g=draftP4Gate5ThreeHorizonGridV39(m.grid);
  expect(g.queries).toHaveLength(9);
  expect(g.expectedMaxApiUnits).toBe(18);
  expect(m.physicalAttemptsMax).toBe(9);
  expect(m.expectedRestUnitsMax).toBe(18);
  expect(m.grid.maxAttemptsPerQuery).toBe(1);
  expect(g.horizonOwners.map(o=>[
   o.horizon,o.earliestPhysicalStartUtc,o.latestPhysicalStartUtc,
   o.verifiedPrearmDeadlineUtc,o.queryCount
  ])).toEqual([
   ["T-24h","2026-11-01T16:30:00.000Z","2026-11-01T17:30:00.000Z",
    "2026-11-01T15:30:00.000Z",3],
   ["T-6h","2026-11-02T10:30:00.000Z","2026-11-02T11:30:00.000Z",
    "2026-11-02T09:30:00.000Z",3],
   ["T-90m","2026-11-02T15:00:00.000Z","2026-11-02T16:00:00.000Z",
    "2026-11-02T14:00:00.000Z",3]
  ]);
  for(const q of g.queries){
   expect(q.providerQueryFromLocal).toBe("2026-11-03T01:00");
   expect(q.providerQueryToLocal).toBe("2026-11-03T02:00");
   expect(Date.parse(q.candidateGridCutoffUtc)-
     Date.parse(q.plannedPhysicalStartUtc)).toBe(30*60000);
  }
 });
 it("never certifies scientific T/actual labels or retains any provider Content",()=>{
  for(const f of [
   "rawOriginalRetentionAuthorized","persistPerFlightProviderRecords",
   "providerNativeScheduledRunwayTVerified","perRecordActualOnlyWheelsOffVerified",
   "physicalOperatingIdentityVerified","scientificGate5PassAuthorized"
  ])expect(m[f]).toBe(false);
  const s=readFileSync(
   "scripts/v39_phase4_gate5_wsss_20261102_three_horizon_real_aggregate_paid_actions.ts","utf8");
  for(const forbidden of ["new pg.Client","INSERT INTO",
   "fetchFidsPopulation","writeFileSync"])
   expect(s).not.toContain(forbidden);
  for(const required of ["inspectP4OnePaidNonretainedFidsV39",
   "sourceMissingNotZeroPopulation:true","strictGate5Passed:false",
   "Date.now()>latest",'job.status!=="in_progress"',
   "jobStart>deadline","oneAttemptStarted=true;started++",
   "AbortSignal.timeout(15000)","getBalanceEvidenceStrict()"])
   expect(s).toContain(required);
 });
 it("rejects the wrong GitHub event, job, SHA, secrets and expired dates",()=>{
  const now=Date.parse("2026-11-01T14:00:00.000Z");
  for(const h of ["T-24h","T-6h","T-90m"] as const)
   expect(validatedContext(env(h),SHA,now)).toBe(h);
  // Only the exact one-shot push rescue token can activate T-6h from push.
  expect(validatedContext({...env("T-6h"),
   GITHUB_EVENT_NAME:"push",P4_G5_CRON:"",
   P4_G5_T6_PUSH_RESCUE:"NOV2_T6_GH_PUSH_ONCE"},SHA,now)).toBe("T-6h");
  expect(()=>validatedContext({...env("T-6h"),
   GITHUB_EVENT_NAME:"push",P4_G5_CRON:"",
   P4_G5_T6_PUSH_RESCUE:"wrong"},SHA,now)).toThrow();
  expect(()=>validatedContext({...env("T-90m"),
   GITHUB_EVENT_NAME:"push",P4_G5_CRON:"",
   P4_G5_T6_PUSH_RESCUE:"NOV2_T6_GH_PUSH_ONCE"},SHA,now)).toThrow();
  // Standby T-90m push is accepted ONLY with exact dedicated token.
  const rescueAfterScheduleGrace=Date.parse("2026-11-02T11:30:00.000Z");
  expect(validatedContext({...env("T-90m"),
   GITHUB_EVENT_NAME:"push",P4_G5_CRON:"",
   P4_G5_T90_PUSH_RESCUE:"NOV2_T90_GH_PUSH_ONCE"},
   SHA,rescueAfterScheduleGrace)).toBe("T-90m");
  expect(()=>validatedContext({...env("T-90m"),
   GITHUB_EVENT_NAME:"push",P4_G5_CRON:"",
   P4_G5_T90_PUSH_RESCUE:"NOV2_T90_GH_PUSH_ONCE"},
   SHA,Date.parse("2026-11-02T11:26:59.000Z"))).toThrow();
  expect(()=>validatedContext({...env("T-90m"),
   GITHUB_EVENT_NAME:"push",P4_G5_CRON:"",
   P4_G5_T90_PUSH_RESCUE:"wrong"},SHA,rescueAfterScheduleGrace)).toThrow();
  expect(()=>validatedContext({...env("T-6h"),
   GITHUB_EVENT_NAME:"push",P4_G5_CRON:"",
   P4_G5_T90_PUSH_RESCUE:"NOV2_T90_GH_PUSH_ONCE"},SHA,now)).toThrow();
  for(const patch of [
   {GITHUB_EVENT_NAME:"schedule"},{GITHUB_JOB:"owner-t6"},
   {GITHUB_RUN_ATTEMPT:"2"},{GITHUB_RUN_ID:"invalid"},
   {GITHUB_SHA:"b".repeat(40)},{GITHUB_WORKFLOW:"other"},
   {GITHUB_WORKFLOW_REF:"invalid"},{DATABASE_URL:"postgres://prod"},
   {V39_DATABASE_RUNTIME_URL:"postgres://prod"},
   {GATE05_AUTOMATION_DATABASE_URL:"postgres://prod"},
   {RAPIDAPI_KEY:"SECRET"},{P4_G5_NOV2_INTENT:"wrong"},
   {P4_G5_GH_READ_ONLY_TOKEN:""},{AERODATABOX_API_KEY:""}
  ])expect(()=>validatedContext({...env(),...patch},SHA,now)).toThrow();
  expect(()=>validatedContext(env(),SHA,
   Date.parse("2026-11-03T00:00:00.000Z"))).toThrow();
  expect(()=>validatedContext({...env("T-6h"),P4_G5_CRON:"bad"},SHA,now))
   .toThrow();
 });
 it("earliest scheduled job on Nov1 evening is within actual GitHub lifetime and before cutoff",()=>{
  const g=draftP4Gate5ThreeHorizonGridV39(m.grid);
  const scheduled=[
   {horizon:"T-6h", cronUtc:"2026-11-02T06:37:00.000Z"}, // replaced by GH push once, retains original timing prearm proof
   {horizon:"T-90m",cronUtc:"2026-11-02T11:17:00.000Z"}
  ];
  for(const {horizon,cronUtc} of scheduled){
   const owner=g.horizonOwners.find(x=>x.horizon===horizon)!;
   const first=Date.parse(owner.earliestPhysicalStartUtc);
   const last=Date.parse(owner.latestPhysicalStartUtc);
   const prearmDeadline=Date.parse(owner.verifiedPrearmDeadlineUtc);
   const wait=Math.min(240,330-(last-first)/60000);
   const earliest=first-wait*60000;
   const started=Date.parse(cronUtc);
   expect(started).toBeGreaterThanOrEqual(earliest);
   expect(started).toBeLessThan(prearmDeadline);
   expect((last-started)/60000).toBeLessThan(330-10);
  }
  expect(new Date(Date.parse("2026-11-02T06:37:00.000Z")-
    8*3600000).toISOString()).toBe("2026-11-01T22:37:00.000Z");
 });
 it("GitHub paid trigger is one exact PR, with 2 early scheduled jobs",()=>{
  const w=readFileSync(
   ".github/workflows/phase4-gate5-wsss-20261102-real-paid-aggregate-three-horizons.yml","utf8");
  for(const required of ["Merge pull request #326",
   "P4_G5_NOV2_T6_ONE_SHOT_PUSH_RECOVERY",
   "P4_G5_T6_PUSH_RESCUE: NOV2_T6_GH_PUSH_ONCE",
   "P4_G5_NOV2_T90_ONE_SHOT_PUSH_RECOVERY",
   "P4_G5_T90_PUSH_RESCUE: NOV2_T90_GH_PUSH_ONCE",
   "  owner-t24:","  owner-t6:","  owner-t90:",
   "actions: read","phase2g-paid","timeout-minutes: 345",
   "secrets.AERODATABOX_API_KEY"])
   expect(w).toContain(required);
  expect(w).toContain('if: "${{');
  expect(w).not.toContain('- cron: "37 6 2 11 *"');
  expect(w).not.toContain('- cron: "17 11 2 11 *"');
  expect(w).not.toContain("  schedule:");
  expect(w).toContain("phase4-gate5-wsss-nov2-2026-real-aggregate-18unit-global");
  expect(w).toContain("cancel-in-progress: false");
  expect(w).not.toContain("workflow_dispatch:");
  expect(w).not.toContain("secrets.GATE05_AUTOMATION_DATABASE_URL");
  expect(w).not.toContain("secrets.V39_DATABASE_RUNTIME_URL");
 });
});
