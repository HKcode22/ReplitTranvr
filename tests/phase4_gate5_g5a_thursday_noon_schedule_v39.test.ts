import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {draftP4Gate5ThreeHorizonGridV39} from "../server/lib/disruption/phase4Gate5FrozenGridDraft_v39";
const path="data-collection/phase4/GATE5_G5A_WSSS_20261105_1400Z_FROZEN_SOURCE_GRID.json";
const owner=".github/workflows/phase4-gate5-g5a-real-wsss-prospective-owner.yml";
const post=".github/workflows/phase4-gate5-g5a-wsss-real-post.yml";
const audit=".github/workflows/phase4-gate5-g5a-independent-final-audit.yml";
const source="scripts/v39_phase4_gate5_g5a_real_wsss_horizon_owner.ts";
const postScript="scripts/v39_phase4_gate5_g5a_prospective_post_schedule_observation.ts";
const auditor="scripts/v39_phase4_gate5_g5a_independent_real_cohort_readonly_audit.ts";
const read=(p:string)=>readFileSync(p,"utf8");
describe("G5A Wed T-24h through Thursday November 5 noon PST audit",()=>{
 it("preregisters frozen WSSS service with real 3-horizon UTC cutoffs",()=>{
  const b=read(path),m=JSON.parse(b);
  expect(b).toBe(JSON.stringify(m,null,2)+"\n");
  expect(m.cohortId).toBe("WSSS_G5A_20261105_1400Z");
  expect(m.grid.serviceWindowStartUtc).toBe("2026-11-05T14:00:00.000Z");
  expect(m.grid.serviceWindowEndUtc).toBe("2026-11-05T15:00:00.000Z");
  const g=draftP4Gate5ThreeHorizonGridV39(m.grid);
  expect(g.queries).toHaveLength(9);
  expect(g.expectedMaxApiUnits).toBe(18);
  expect(g.sourceRangeLocal).toEqual({from:"2026-11-05T22:00",to:"2026-11-05T23:00"});
  expect(g.horizonOwners.map(x=>x.earliestPhysicalStartUtc)).toEqual([
   "2026-11-04T13:30:00.000Z","2026-11-05T07:30:00.000Z",
   "2026-11-05T12:00:00.000Z"]);
  expect(g.horizonOwners.map(x=>x.verifiedPrearmDeadlineUtc)).toEqual([
   "2026-11-04T12:30:00.000Z","2026-11-05T06:30:00.000Z",
   "2026-11-05T11:00:00.000Z"]);
  expect(Date.parse(m.grid.assignmentFrozenAtUtc)).toBeLessThan(
   Date.parse("2026-11-04T09:47:00.000Z"));
 });
 it("all 12 owner cron backups match exact TypeScript admission and workflow if",()=>{
  const wf=read(owner),s=read(source);
  const expected=["47 9 4 11 *","17 10 4 11 *","47 10 4 11 *","17 11 4 11 *",
   "47 3 5 11 *","17 4 5 11 *","47 4 5 11 *","17 5 5 11 *",
   "17 8 5 11 *","47 8 5 11 *","17 9 5 11 *","47 9 5 11 *"];
  expect([...wf.matchAll(/^ {4}- cron: "([^"]+)"$/gm)].map(m=>m[1])).toEqual(expected);
  for(const cron of expected){expect(wf).toContain(cron);expect(s).toContain(cron);}
  expect(wf).toContain("WSSS_NOV05_1400Z_G5A_ONE_PROSPECTIVE");
  expect(s).toContain("WSSS_G5A_20261105_1400Z");
  expect(s).not.toContain("GATE5_G5A_WSSS_20261107_FROZEN_SOURCE_GRID.json");
 });
 it("POST four backups and true 3 observations finish before audit",()=>{
  const wf=read(post),s=read(postScript);
  const expected=["10 14 5 11 *","22 14 5 11 *","37 14 5 11 *","52 14 5 11 *"];
  expect([...wf.matchAll(/^ {4}- cron: "([^"]+)"$/gm)].map(m=>m[1])).toEqual(expected);
  for(const cron of expected)expect(s).toContain(cron);
  for(const t of ["2026-11-05T15:40:00.000Z",
   "2026-11-05T16:10:00.000Z","2026-11-05T16:40:00.000Z",
   "2026-11-05T17:01:00.000Z"])expect(s).toContain(t);
  expect(s).toContain("G5A_NOV05_1400Z_POST_THREE_2_UNIT_REQUESTS_MAX");
  expect(Date.parse("2026-11-05T17:01:00.000Z"))
   .toBeLessThan(Date.parse("2026-11-05T20:00:00.000Z"));
 });
 it("independent audit GitHub cron is Thursday November 5 exactly noon PST",()=>{
  expect(read(audit)).toContain('cron: "0 20 5 11 *"');
  const s=read(auditor);
  expect(s).toContain('const CRON="0 20 5 11 *"');
  expect(s).toContain("2026-11-05T19:45:00.000Z");
  expect(s).toContain("GATE5_G5A_WSSS_20261105_1400Z_FROZEN_SOURCE_GRID.json");
  expect(s).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const d=new Date("2026-11-05T20:00:00.000Z");
  const local=new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",
    year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",
    hourCycle:"h23"}).format(d);
  expect(local).toContain("11/05/2026");
  expect(local).toContain("12");
 });
});
