import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {draftP4Gate5ThreeHorizonGridV39} from "../server/lib/disruption/phase4Gate5FrozenGridDraft_v39";
import {utcIntervalToLocal} from "../server/lib/disruption/fidsCensus_v3";
const read=(s:string)=>readFileSync(s,"utf8");
const root="data-collection/phase4/GATE5_G5A_WSSS_20261106_1400Z_FROZEN_SOURCE_GRID.json";
const source="scripts/v39_phase4_gate5_g5a_nov06_1400z_real_wsss_horizon_owner.ts";
const post="scripts/v39_phase4_gate5_g5a_nov06_1400z_prospective_post_schedule_observation.ts";
const audit="scripts/v39_phase4_gate5_g5a_nov06_1400z_independent_real_cohort_readonly_audit.ts";
const sw=".github/workflows/phase4-gate5-g5a-nov06-1400z-real-wsss-prospective-owner.yml";
const pw=".github/workflows/phase4-gate5-g5a-nov06-1400z-wsss-real-post.yml";
const aw=".github/workflows/phase4-gate5-g5a-nov06-1400z-independent-final-audit.yml";
const obj=JSON.parse(read(root));
const grid=draftP4Gate5ThreeHorizonGridV39(obj.grid);
const crons=(s:string)=>[...s.matchAll(/- cron: "([^"]+)"/g)].map(x=>x[1]);
const ctime=(s:string)=>{const [m,h,d,M]=s.split(" ").map(Number);return Date.UTC(2026,M-1,d,h,m)};
const time=(s:string)=>Date.parse(s);
describe("future Nov6 14Z G5A true 3-horizon paid cohort, GH-only",()=>{
 it("frozen distinct manifest has just 9 bounded source queries and 24 unit total cap",()=>{
  expect(read(root)).toBe(JSON.stringify(obj,null,2)+"\n");
  expect(obj.cohortId).toBe("WSSS_G5A_20261106_1400Z");
  expect(obj.grid.serviceWindowStartUtc).toBe("2026-11-06T14:00:00.000Z");
  expect(obj.grid.assignmentFrozenAtUtc).toBe("2026-11-05T11:30:00.000Z");
  expect(obj.grid.githubPrearmLeadMinutes).toBe(15);
  expect(grid.queries).toHaveLength(9);
  expect(grid.expectedMaxApiUnits).toBe(18);
  expect(obj.grid.projectRestApiUnitsBudget).toBe(24);
  expect(obj.grid.maxAttemptsPerQuery).toBe(1);
  const old=read("data-collection/phase4/GATE5_G5A_WSSS_20261106_0900Z_FROZEN_SOURCE_GRID.json");
  expect(createHash("sha256").update(old).digest("hex"))
   .not.toBe(createHash("sha256").update(read(root)).digest("hex"));
 });
 it("source cron exactly matches all three real horizon starts and 15-minute GH deadline",()=>{
  const all=crons(read(sw));
  expect(all).toEqual([
   "37 12 5 11 *","47 12 5 11 *","57 12 5 11 *","7 13 5 11 *",
   "20 6 6 11 *","35 6 6 11 *","50 6 6 11 *","5 7 6 11 *",
   "50 10 6 11 *","5 11 6 11 *","20 11 6 11 *","35 11 6 11 *"
  ]);
  const expected=[
   ["T-24h","2026-11-05T13:30:00.000Z","2026-11-05T13:15:00.000Z"],
   ["T-6h","2026-11-06T07:30:00.000Z","2026-11-06T07:15:00.000Z"],
   ["T-90m","2026-11-06T12:00:00.000Z","2026-11-06T11:45:00.000Z"]
  ];
  expected.forEach(([h,first,deadline],i)=>{
   const g=grid.horizonOwners.find(o=>o.horizon===h)!;
   expect(g.earliestPhysicalStartUtc).toBe(first);
   expect(g.verifiedPrearmDeadlineUtc).toBe(deadline);
   expect(g.queryCount).toBe(3);
   expect(grid.queries.filter(q=>q.horizon===h).map(q=>q.plannedPhysicalStartUtc))
    .toEqual([0,30,60].map(n=>new Date(time(first)+n*60000).toISOString()));
   for(const c of all.slice(i*4,i*4+4)){
    expect(ctime(c)).toBeLessThanOrEqual(time(deadline));
    expect(ctime(c)).toBeGreaterThanOrEqual(time(first)-240*60000);
    expect(read(source)).toContain('"'+c+'"');
   }
  });
  expect((read(sw).match(/timeout-minutes: 340/g)||[])).toHaveLength(3);
 });
 it("POST slots and independent read-only audit follow flight service and fixed T+2h",()=>{
  expect(crons(read(pw))).toEqual([
   "40 14 6 11 *","52 14 6 11 *","7 15 6 11 *","22 15 6 11 *"
  ]);
  expect(crons(read(aw))).toEqual([
   "12 17 6 11 *","18 17 6 11 *","24 17 6 11 *","30 17 6 11 *"
  ]);
  for(const x of ["2026-11-06T15:40:00.000Z",
   "2026-11-06T16:10:00.000Z","2026-11-06T16:40:00.000Z"])
   expect(read(post)).toContain(x);
  expect(read(post)).toContain('const FINAL="2026-11-06T17:01:00.000Z"');
  expect(crons(read(aw)).every(x=>ctime(x)>time("2026-11-06T17:01:00.000Z"))).toBe(true);
  expect(read(audit)).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(read(post)).toContain("G5A_POST_COMPLETE_THREE_HORIZON_PRE_SQL_V39");
  // Do not rehydrate T−24h source after its 23h source-use window.
  // The actual on-time PRE feature is the only permitted frozen baseline.
  expect(read(post)).toContain("jsonb_array_elements(COALESCE(pre.features_json");
  expect(read(post)).toContain("fids_departure_schedule_asof");
  expect(read(post)).not.toContain("p.population_query_id::text=pre.population_query_id");
 });
 it("POST's cross-midnight Singapore local window exactly matches the frozen UTC interval",()=>{
  const local=utcIntervalToLocal(
   new Date("2026-11-06T13:00:00.000Z"),
   new Date("2026-11-06T17:00:00.000Z"),
   "Asia/Singapore");
  expect({
   fromLocal:local.fromLocal.replace(" ","T"),
   toLocal:local.toLocal.replace(" ","T")
  }).toEqual({
   fromLocal:"2026-11-06T21:00",toLocal:"2026-11-07T01:00"
  });
  const postCode=read(post);
  expect(postCode).toContain('fromLocal:"2026-11-06T21:00"');
  expect(postCode).toContain('toLocal:"2026-11-07T01:00"');
  expect(postCode).toContain('const FROM="2026-11-06T13:00:00.000Z",TO="2026-11-06T17:00:00.000Z"');
 });
 it("new future-only operating key is enabled in BOTH source and POST",()=>{
  expect(read(source)).toContain("g5aCompositeIdentityStudyStartUtc:new Date(start)");
  expect(read(post)).toContain('g5aCompositeIdentityStudyStartUtc:new Date("2026-11-06T14:00:00.000Z")');
  expect(read(source)).toContain("G5A_FIRST_SOURCE_ASOF_ELIGIBILITY_SQL_V39");
  expect(read(source)).toContain("G5A_T24_SOURCE_OR_PRE_MISSING_NO_SUCCESSOR_PAID");
  expect(read(post)).toContain("G5A_POST_SKIPPED_NO_COMMON_THREE_HORIZON_PRE_NO_PROVIDER");
  for(const s of [read(source),read(post),read(audit)]){
   expect(s).toContain("GATE5_G5A_WSSS_20261106_1400Z_FROZEN_SOURCE_GRID.json");
   expect(s).not.toContain("WSSS_G5A_20261106_0900Z");
  }
 });
 it("no paid workflow is reachable from a PR or push",()=>{
  for(const x of [sw,pw,aw]){
   const w=read(x);
   for(const k of ["  pull_request:","  push:","  workflow_dispatch:",
    "  schedule:","environment: phase2g-paid","cancel-in-progress: false"])
    expect(w).toContain(k);
   expect(w).toContain("github.event_name == 'pull_request' || github.event_name == 'push'");
  }
 });
});