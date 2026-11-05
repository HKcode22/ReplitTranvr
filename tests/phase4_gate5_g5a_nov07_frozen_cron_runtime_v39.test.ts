import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {draftP4Gate5ThreeHorizonGridV39}
 from "../server/lib/disruption/phase4Gate5FrozenGridDraft_v39";

const sourcePath=".github/workflows/phase4-gate5-g5a-nov07-real-wsss-prospective-owner.yml";
const postPath=".github/workflows/phase4-gate5-g5a-nov07-wsss-real-post.yml";
const auditPath=".github/workflows/phase4-gate5-g5a-nov07-independent-final-audit.yml";
const frozenPath="data-collection/phase4/GATE5_G5A_WSSS_20261107_FROZEN_SOURCE_GRID.json";
const read=(p:string)=>readFileSync(p,"utf8");
const t=(s:string)=>Date.parse(s);
const minutes=(n:number)=>n*60_000;
function chrono(cron:string){
 const bits=cron.split(" ");
 if(bits.length!==5||bits[4]!=="*")throw Error("CRON_NOT_ANNUAL_FIXED");
 const [min,hour,day,month]=bits.slice(0,4).map(Number);
 if([min,hour,day,month].some(x=>!Number.isInteger(x)))throw Error("CRON_NOT_NUMERIC");
 return Date.UTC(2026,month-1,day,hour,min);
}
const scheduled=(s:string)=>[...s.matchAll(/- cron: "([^"]+)"/g)].map(x=>x[1]);
const {grid,...manifest}=JSON.parse(read(frozenPath));
const draft=draftP4Gate5ThreeHorizonGridV39(grid);
const by=(h:string)=>draft.horizonOwners.find(o=>o.horizon===h)!;
const queries=(h:string)=>draft.queries.filter(q=>q.horizon===h);
const ownerSource=read("scripts/v39_phase4_gate5_g5a_nov07_real_wsss_horizon_owner.ts");
const postSource=read("scripts/v39_phase4_gate5_g5a_nov07_prospective_post_schedule_observation.ts");
const auditSource=read("scripts/v39_phase4_gate5_g5a_nov07_independent_real_cohort_readonly_audit.ts");

describe("Nov7 WSSS genuine prospective GH windows and frozen timeline (NO PROVIDER)",()=>{
 it("computes exact, distinct physical horizons and 24-unit hard upper bound",()=>{
  expect(manifest.cohortId).toBe("WSSS_G5A_20261107_0200Z");
  expect(draft.queries).toHaveLength(9);
  expect(draft.horizonOwners).toHaveLength(3);
  expect(draft.expectedMaxApiUnits).toBe(18);
  expect(draft.projectRestApiUnitsBudget).toBe(24);
  expect(t(grid.assignmentFrozenAtUtc)).toBeLessThan(t(by("T-24h").verifiedPrearmDeadlineUtc));
  const entries=[
   ["T-24h","2026-11-06T01:30:00.000Z","2026-11-06T00:30:00.000Z"],
   ["T-6h","2026-11-06T19:30:00.000Z","2026-11-06T18:30:00.000Z"],
   ["T-90m","2026-11-07T00:00:00.000Z","2026-11-06T23:00:00.000Z"]
  ] as const;
  for(const [h,first,deadline] of entries){
   expect(by(h).earliestPhysicalStartUtc).toBe(first);
   expect(by(h).verifiedPrearmDeadlineUtc).toBe(deadline);
   expect(by(h).queryCount).toBe(3);
   expect(queries(h).map(x=>x.plannedPhysicalStartUtc))
    .toEqual([0,30,60].map(x=>new Date(t(first)+minutes(x)).toISOString()));
  }
 });
 it("each of twelve GitHub cron backups starts in genuine prearm window",()=>{
  const yaml=read(sourcePath);
  const crons=scheduled(yaml);
  expect(crons).toHaveLength(12);
  expect(new Set(crons).size).toBe(12);
  const headings=["T-24h","T-6h","T-90m"] as const;
  headings.forEach((h,i)=>{
   const owner=by(h),first=t(owner.earliestPhysicalStartUtc),
    deadline=t(owner.verifiedPrearmDeadlineUtc);
   // Real builder allows at most 240 minutes before first physical slot.
   const open=first-minutes(240);
   for(const c of crons.slice(i*4,(i+1)*4)){
    const start=chrono(c);
    expect(start).toBeGreaterThanOrEqual(open);
    expect(start).toBeLessThanOrEqual(deadline);
    // GitHub Actions timeout=340 min; leave >=20min before last PRE cutoff.
    const lastCutoff=t(queries(h).at(-1)!.candidateGridCutoffUtc);
    expect(lastCutoff-start).toBeLessThanOrEqual(minutes(320));
   }
   expect(ownerSource).toContain("GITHUB_RUN_NOT_EARLY_ENOUGH");
  });
  expect((yaml.match(/timeout-minutes: 340/g)??[])).toHaveLength(3);
  expect(yaml).toContain("cancel-in-progress: false");
  expect(yaml).toContain("environment: phase2g-paid");
  expect(ownerSource).toContain("PROSPECTIVE_HORIZON_ZERO_DURABLE_SOURCE_OR_PRE");
 });
 it("POST prearms precede real source times, and independent audit follows POST",()=>{
  const postCrons=scheduled(read(postPath)).map(chrono);
  const auditCrons=scheduled(read(auditPath)).map(chrono);
  expect(postCrons).toHaveLength(4);
  expect(auditCrons).toHaveLength(4);
  const postTimes=[
   "2026-11-07T03:40:00.000Z","2026-11-07T04:10:00.000Z",
   "2026-11-07T04:40:00.000Z"
  ].map(t);
  expect(postCrons.every(x=>x<postTimes[0]&&x>=postTimes[0]-minutes(120))).toBe(true);
  expect(postCrons.every(x=>postTimes.at(-1)!+minutes(21)-x<minutes(240))).toBe(true);
  expect(auditCrons.every(x=>x>t("2026-11-07T05:01:00.000Z"))).toBe(true);
  expect(auditCrons.every(x=>x<t("2026-11-07T05:40:00.000Z"))).toBe(true);
  expect(postSource).toContain('G5A_POST_SKIPPED_MISSING_T24_SOURCE_OR_PRE_NO_PROVIDER');
  expect(auditSource).toContain('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  expect(postSource).toContain('2026-11-07T05:01:00.000Z');
 });
 it("all source and POST budgets remain one bounded attempt, no backfill",()=>{
  expect(ownerSource).toContain('G5A_SECOND_PHYSICAL_PAID_GET_FORBIDDEN');
  expect(ownerSource).toContain('maxAttemptsPerQuery!==1');
  expect(postSource).toContain('POST_RESERVATION_REPLAY_OR_FOREIGN_SLOT');
  expect(postSource).toContain('REVIEWED_NOV07_0200Z_POST_ONLY_WITHIN_PREARM');
  expect(ownerSource).not.toContain('G5A_VERIFIED_FAILED_T24_OWNER_ZERO_RESERVATION_HANDOFF');
 });
});
