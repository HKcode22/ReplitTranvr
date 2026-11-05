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
 it("source is not authorized by old T24/Nov5 GH events or old failed-owner handoff",()=>{
  const s=read(sourcePath);
  expect(s).toContain(workflowPath);
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
