import {readFileSync,existsSync} from "node:fs";
import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
const read=(p:string)=>readFileSync(p,"utf8");
describe("G5A Nov7 future distinct prospective source (UNARMED)",()=>{
 const sourcePath="scripts/v39_phase4_gate5_g5a_nov07_real_wsss_horizon_owner.ts";
 const manifestPath="data-collection/phase4/GATE5_G5A_WSSS_20261107_FROZEN_SOURCE_GRID.json";
 const workflowPath=".github/workflows/phase4-gate5-g5a-nov07-real-wsss-prospective-owner.yml";
 it("has distinct frozen manifest and no active GitHub paid workflow",()=>{
  const old=read("data-collection/phase4/GATE5_G5A_WSSS_20261105_1400Z_FROZEN_SOURCE_GRID.json");
  const fresh=read(manifestPath);
  const grid=JSON.parse(fresh);
  expect(grid.cohortId).toBe("WSSS_G5A_20261107_0200Z");
  expect(grid.grid.serviceWindowStartUtc).toBe("2026-11-07T02:00:00.000Z");
  expect(grid.grid.serviceWindowEndUtc).toBe("2026-11-07T03:00:00.000Z");
  expect(grid.grid.assignmentFrozenAtUtc).toBe("2026-11-04T06:00:00.000Z");
  expect(grid.grid.projectRestApiUnitsBudget).toBe(24);
  expect(createHash("sha256").update(fresh).digest("hex"))
   .not.toBe(createHash("sha256").update(old).digest("hex"));
  expect(existsSync(workflowPath)).toBe(false);
 });
 it("POST is distinct, unarmed, bound to real future cohort and no old paid schedule",()=>{
  const post=read("scripts/v39_phase4_gate5_g5a_nov07_prospective_post_schedule_observation.ts");
  const workflow=".github/workflows/phase4-gate5-g5a-nov07-wsss-real-post.yml";
  expect(existsSync(workflow)).toBe(false);
  expect(post).toContain(workflow);
  expect(post).toContain('endsWith("v39_phase4_gate5_g5a_nov07_prospective_post_schedule_observation.ts")');
  expect(post).toContain("GATE5_G5A_WSSS_20261107_FROZEN_SOURCE_GRID.json");
  expect(post).toContain('WSSS_G5A_20261107_0200Z');
  for(const t of [
    "2026-11-07T03:40:00.000Z","2026-11-07T04:10:00.000Z",
    "2026-11-07T04:40:00.000Z","2026-11-07T05:01:00.000Z"
  ])expect(post).toContain(t);
  expect(post).toContain("G5A_PRIOR_T24_PROVENANCE_SQL_V39");
  expect(post).toContain("G5A_POST_SKIPPED_MISSING_T24_SOURCE_OR_PRE_NO_PROVIDER");
  for(const old of ["2026-11-05","20261105","NOV05_1400Z","2026-11-06"])
    expect(post).not.toContain(old);
  for(const c of ["10 2 7 11 *","22 2 7 11 *",
    "37 2 7 11 *","52 2 7 11 *"])expect(post).toContain(c);
 });
 it("source is not authorized by old T24/Nov5 GH events or old failed-owner handoff",()=>{
  const s=read(sourcePath);
  expect(s).toContain(workflowPath);
  expect(s).toContain('endsWith("v39_phase4_gate5_g5a_nov07_real_wsss_horizon_owner.ts")');
  expect(s).toContain(manifestPath);
  expect(s).toContain('WSSS_NOV07_0200Z_G5A_ONE_PROSPECTIVE_THREE_HORIZON_18_UNIT_MAX');
  expect(s).toContain('WSSS_G5A_20261107_0200Z');
  expect(s).toContain('2026-11-07T05:30:00.000Z');
  for(const text of ["41810504164","G5A_VERIFIED_FAILED_T24_OWNER_ZERO_RESERVATION_HANDOFF",
    "20261105_1400Z","WSSS_NOV05_1400Z_G5A_ONE_PROSPECTIVE_THREE_HORIZON_18_UNIT_MAX"]){
   expect(s).not.toContain(text);
  }
  const expected=[
   "47 21 5 11 *","17 22 5 11 *","47 22 5 11 *","17 23 5 11 *",
   "47 15 6 11 *","17 16 6 11 *","47 16 6 11 *","17 17 6 11 *",
   "17 20 6 11 *","47 20 6 11 *","17 21 6 11 *","47 21 6 11 *"
  ];
  for(const cron of expected)expect(s).toContain('"'+cron+'"');
  expect(s).toContain("G5A_PRIOR_T24_PROVENANCE_SQL_V39");
  expect(s).toContain("G5A_NOV07_BACKUP_OWNER_DUPLICATE_SUPPRESSED_NO_PROVIDER");
  expect(s).toContain('hold("PROSPECTIVE_HORIZON_ZERO_DURABLE_SOURCE_OR_PRE")');
 });
});
