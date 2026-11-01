import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {
 prepareP4G5PhysicalOwnerV39,
 assessP4G5PhysicalAttemptV39,
 assertP4G5OwnerGitHubContextV39,
 type P4G5PhysicalOwnerPlanInputV39
} from "../server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39";
import type {P4Gate5GridHorizonV39}
 from "../server/lib/disruption/phase4Gate5FrozenGridDraft_v39";

const file="data-collection/phase4/GATE5_NEXT_COHORT_PREARM_SYNTHETIC_HOLD.json";
const bytes=()=>readFileSync(file,"utf8");
const fixture=()=>JSON.parse(bytes());
function manifest(h:P4Gate5GridHorizonV39="T-24h"){
 const m=fixture();
 const lag=h==="T-24h"?1440:h==="T-6h"?360:90;
 const first=Date.parse(m.grid.serviceWindowStartUtc)-
  lag*60000-m.grid.acquisitionGuardMinutes*60000;
 return {
  cohortId:m.cohortId,
  frozenManifestBytes:bytes(),
  reviewedManifestSha256:createHash("sha256").update(bytes()).digest("hex"),
  grid:m.grid,horizon:h,
  actualOwnerProcessStartedAtUtc:
   new Date(first-m.grid.githubPrearmLeadMinutes*60000-5*60000).toISOString()
 } as P4G5PhysicalOwnerPlanInputV39;
}
const owned=(h:P4Gate5GridHorizonV39="T-24h")=>
 prepareP4G5PhysicalOwnerV39(manifest(h));
function attempt(o=owned(),n=0,k=1,patch:Record<string,unknown>={}){
 const row=o.entries[n];
 return {
  owner:o,queryIndex:n,physicalAttemptNumber:k,
  actualReservationCommittedAtUtc:new Date(
   Date.parse(row.plannedPhysicalStartUtc)-1000).toISOString(),
  actualFetchStartUtc:row.plannedPhysicalStartUtc,
  currentAccountApiUnitsRemaining:59974,
  currentProjectApiUnitsRemaining:50000,
  projectUnitsAlreadyReservedForOtherSourceQueries:0,
  accountedThisOwnerPhysicalAttemptUnits:0,
  ...patch
 } as Parameters<typeof assessP4G5PhysicalAttemptV39>[0];
}
function context(job:string):NodeJS.ProcessEnv{
 return {
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_EVENT_NAME:"push",GITHUB_REF:"refs/heads/main",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),
  GITHUB_JOB:job,
  GITHUB_WORKFLOW:"Phase4 Gate5 Three GitHub Physical Owner Rehearsal",
  GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-three-physical-owner-rehearsal.yml@refs/heads/main",
  P4_G5_OWNER_REHEARSAL_INTENT:"SIMULATED_TIMES_NO_PROVIDER"
 };
}
describe("Gate5 real physical attempt guard / simulated three-job GitHub owners",()=>{
 it("prepares three independent full-horizon owners and unique source-query IDs",()=>{
  const a=owned("T-24h"),b=owned("T-6h"),c=owned("T-90m");
  expect([a.githubJob,b.githubJob,c.githubJob]).toEqual(["owner-t24","owner-t6","owner-t90"]);
  expect([a.expectedQueries,b.expectedQueries,c.expectedQueries]).toEqual([3,3,3]);
  expect([a.horizonWorstCaseApiUnits,b.horizonWorstCaseApiUnits,c.horizonWorstCaseApiUnits])
   .toEqual([18,18,18]);
  expect(a.fullGridWorstCaseApiUnits).toBe(54);
  expect(new Set([a.ownerDigest,b.ownerDigest,c.ownerDigest]).size).toBe(3);
  expect(new Set([...a.entries,...b.entries,...c.entries].map(x=>x.queryDigest)).size).toBe(9);
  for(const x of [a,b,c]){
   expect(Date.parse(x.ownerActuallyObservedAtUtc)).toBeLessThanOrEqual(
    Date.parse(x.ownerDeadlineUtc));
   expect(x.status).toContain("NEEDS_TRUSTED_DURABLE_ATTEMPT_LEDGER");
   expect(x.actualPaidOwnerAuthorized).toBe(false);
  }
 });
 it("actual runner starts too late or unreasonably early cannot be called prearmed",()=>{
  const input=manifest();
  input.actualOwnerProcessStartedAtUtc="2027-01-14T16:31:00.000Z";
  expect(()=>prepareP4G5PhysicalOwnerV39(input))
   .toThrow("P4_PHYSICAL_GITHUB_OWNER_NOT_ACTUALLY_PREARMED");
  input.actualOwnerProcessStartedAtUtc="2027-01-13T01:00:00.000Z";
  expect(()=>prepareP4G5PhysicalOwnerV39(input))
   .toThrow("P4_PHYSICAL_GITHUB_OWNER_NOT_ACTUALLY_PREARMED");
 });
 it("rejects wrong manifest SHA, altered bytes and an attempted arbitrary cohort",()=>{
  const m=manifest();
  expect(()=>prepareP4G5PhysicalOwnerV39({...m,reviewedManifestSha256:"0".repeat(64)}))
   .toThrow("P4_PHYSICAL_MANIFEST_SHA_MISMATCH");
  const whitespace=m.frozenManifestBytes+" ";
  expect(()=>prepareP4G5PhysicalOwnerV39({...m,
   frozenManifestBytes:whitespace,
   reviewedManifestSha256:createHash("sha256").update(whitespace).digest("hex")}))
   .toThrow("P4_PHYSICAL_MANIFEST_BYTES_NOT_CANONICAL");
  expect(()=>prepareP4G5PhysicalOwnerV39({...m,cohortId:"OTHER_PRODUCTION_2026"}))
   .toThrow("P4_PHYSICAL_COHORT_OR_GRID_MISMATCH");
 });
 it("valid early physical reservation and dispatch is ALWAYS not a paid permit",()=>{
  const a=owned();
  for(let i=0;i<a.entries.length;i++){
   const x=assessP4G5PhysicalAttemptV39(attempt(a,i));
   expect(x.status).toBe("TIMING_AND_COST_CHECKED_DURABLE_DB_RESERVATION_STILL_REQUIRED");
   expect(x.durableDbUniqueAttemptReservationProven).toBe(false);
   expect(x.authorizedProviderDispatch).toBe(false);
   expect(x.providerCalls).toBe(0);
   expect(x.databaseWrites).toBe(0);
   expect(x.strictGate5Passed).toBe(false);
  }
 });
 it("hard fails late arrival, early arrival and reservation-after-fetch clock",()=>{
  const o=owned(),q=o.entries[0];
  for(const [patch,message] of [
   [{actualFetchStartUtc:new Date(Date.parse(q.hardLatestPhysicalStartUtc)+1).toISOString()},
    "P4_PHYSICAL_MISSED_OR_EARLY_CUTOFF_NO_RETRY"],
   [{actualFetchStartUtc:new Date(Date.parse(q.plannedPhysicalStartUtc)-1).toISOString()},
    "P4_PHYSICAL_MISSED_OR_EARLY_CUTOFF_NO_RETRY"],
   [{actualReservationCommittedAtUtc:new Date(Date.parse(q.plannedPhysicalStartUtc)+1).toISOString()},
    "P4_PHYSICAL_MISSED_OR_EARLY_CUTOFF_NO_RETRY"]
  ] as const){
   expect(()=>assessP4G5PhysicalAttemptV39(attempt(o,0,1,patch)))
    .toThrow(message);
  }
 });
 it("enforces per-query physical attempt ceiling and nonrefundable project/account reserve",()=>{
  const o=owned();
  for(const patch of [
   {physicalAttemptNumber:4},{physicalAttemptNumber:0}
  ])expect(()=>assessP4G5PhysicalAttemptV39(attempt(o,0,1,patch)))
   .toThrow("P4_PHYSICAL_ATTEMPT_LIMIT_HOLD");
  for(const patch of [
   {currentAccountApiUnitsRemaining:1},
   {currentProjectApiUnitsRemaining:1},
   {projectUnitsAlreadyReservedForOtherSourceQueries:53},
   {accountedThisOwnerPhysicalAttemptUnits:18},
   {currentAccountApiUnitsRemaining:-1}
  ]){
   expect(()=>assessP4G5PhysicalAttemptV39(attempt(o,0,1,patch)))
    .toThrow();
  }
 });
 it("repeated attempt yields identical ticket, different retry distinct; DB uniqueness STILL required",()=>{
  const o=owned(),a=assessP4G5PhysicalAttemptV39(attempt(o));
  const b=assessP4G5PhysicalAttemptV39(attempt(o));
  const c=assessP4G5PhysicalAttemptV39(attempt(o,0,2));
  expect(a.expectedUniqueReservationId).toBe(b.expectedUniqueReservationId);
  expect(a.expectedUniqueReservationId).not.toBe(c.expectedUniqueReservationId);
  expect(a.durableDbUniqueAttemptReservationProven).toBe(false);
 });
 it("rejects wrong physical GitHub owner/job/rerun/ref and any provider or database secret",()=>{
  for(const [h,job] of [
   ["T-24h","owner-t24"],["T-6h","owner-t6"],["T-90m","owner-t90"]
  ] as const)
   expect(()=>assertP4G5OwnerGitHubContextV39(context(job),"a".repeat(40),h))
    .not.toThrow();
  for(const patch of [
   {GITHUB_JOB:"owner-t6"},{GITHUB_EVENT_NAME:"schedule"},
   {GITHUB_RUN_ATTEMPT:"2"},{GITHUB_REF:"refs/heads/dev"},
   {AERODATABOX_API_KEY:"secret"},{RAPIDAPI_KEY:"secret"},
   {V39_DATABASE_RUNTIME_URL:"secret"},
   {GATE05_AUTOMATION_DATABASE_URL:"secret"},
   {DATABASE_URL:"secret"}
  ]){
   expect(()=>assertP4G5OwnerGitHubContextV39({...context("owner-t24"),...patch},
    "a".repeat(40),"T-24h")).toThrow("P4_PHYSICAL_GITHUB_REHEARSAL_CONTEXT_OR_SECRETS_HOLD");
  }
  expect(()=>assertP4G5OwnerGitHubContextV39(context("owner-t24"),
   "b".repeat(40),"T-24h")).toThrow("P4_PHYSICAL_GITHUB_REHEARSAL_CONTEXT_OR_SECRETS_HOLD");
 });
 it("new workflow genuinely has three distinct GitHub jobs, no billable secrets, times are SIMULATED",()=>{
  const y=readFileSync(".github/workflows/phase4-gate5-three-physical-owner-rehearsal.yml","utf8");
  const script=readFileSync("scripts/v39_phase4_gate5_three_owner_physical_rehearsal_actions.ts","utf8");
  const source=readFileSync(
   "server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39.ts","utf8");
  for(const job of ["owner-t24:","owner-t6:","owner-t90:"])expect(y).toContain(job);
  expect(y).toContain("persist-credentials: false");
  expect(y).not.toContain("secrets.");
  expect(y).not.toContain("workflow_dispatch:");
  expect(y).not.toContain("schedule:");
  expect(script).toContain("simulatedOwnerStartUtc");
  expect(script).toContain("noActualPrearmVerified:true");
  expect(script).not.toContain("fetch(");
  expect(script).not.toContain("new pg.Client");
  expect(source).not.toContain("INSERT INTO");
  expect(source).not.toContain("fetch(");
 });
});
