import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {draftP4Gate5ThreeHorizonGridV39} from "../server/lib/disruption/phase4Gate5FrozenGridDraft_v39";
const read=(p:string)=>readFileSync(p,"utf8"),ts=(s:string)=>Date.parse(s),mins=(n:number)=>n*60000;
const frozen="data-collection/phase4/GATE5_G5A_WSSS_20261106_0900Z_FROZEN_SOURCE_GRID.json";
const oldFrozen="data-collection/phase4/GATE5_G5A_WSSS_20261107_FROZEN_SOURCE_GRID.json";
const src="scripts/v39_phase4_gate5_g5a_nov06_real_wsss_horizon_owner.ts";
const post="scripts/v39_phase4_gate5_g5a_nov06_prospective_post_schedule_observation.ts";
const audit="scripts/v39_phase4_gate5_g5a_nov06_independent_real_cohort_readonly_audit.ts";
const sourceYml=".github/workflows/phase4-gate5-g5a-nov06-real-wsss-prospective-owner.yml";
const postYml=".github/workflows/phase4-gate5-g5a-nov06-wsss-real-post.yml";
const auditYml=".github/workflows/phase4-gate5-g5a-nov06-independent-final-audit.yml";
const oldYml=[
".github/workflows/phase4-gate5-g5a-nov07-real-wsss-prospective-owner.yml",
".github/workflows/phase4-gate5-g5a-nov07-wsss-real-post.yml",
".github/workflows/phase4-gate5-g5a-nov07-independent-final-audit.yml"
];
const obj=JSON.parse(read(frozen)),draft=draftP4Gate5ThreeHorizonGridV39(obj.grid);
const crons=(s:string)=>[...s.matchAll(/- cron: "([^"]+)"/g)].map(x=>x[1]);
const when=(s:string)=>{const [m,h,d,mo]=s.split(" ").map(Number);return Date.UTC(2026,mo-1,d,h,m)};
describe("G5A entire 17h earlier WSSS prospective cohort and paid isolation",()=>{
 it("keeps immutable 24-unit distinct frozen cohort and exact first window",()=>{
  expect(read(frozen)).toBe(JSON.stringify(obj,null,2)+"\n");
  expect(obj.cohortId).toBe("WSSS_G5A_20261106_0900Z");
  expect(obj.grid.serviceWindowStartUtc).toBe("2026-11-06T09:00:00.000Z");
  expect(obj.grid.serviceWindowEndUtc).toBe("2026-11-06T10:00:00.000Z");
  expect(obj.grid.assignmentFrozenAtUtc).toBe("2026-11-05T03:39:00.000Z");
  expect(ts(obj.grid.serviceWindowStartUtc)-ts(JSON.parse(read(oldFrozen)).grid.serviceWindowStartUtc)).toBe(-mins(1020));
  expect(createHash("sha256").update(read(frozen)).digest("hex"))
   .not.toBe(createHash("sha256").update(read(oldFrozen)).digest("hex"));
  expect(draft.queries).toHaveLength(9);
  expect(draft.projectRestApiUnitsBudget).toBe(24);
  expect(draft.expectedMaxApiUnits).toBe(18);
  expect(obj.grid.maxAttemptsPerQuery).toBe(1);
 });
 it("validates twelve real source cron starts, T24/T6/T90 source cutoffs and GH timeout",()=>{
  const w=read(sourceYml),sched=crons(w);
  expect(sched).toHaveLength(12);expect(new Set(sched).size).toBe(12);
  const cases=[
   ["T-24h","2026-11-05T08:30:00.000Z","2026-11-05T07:30:00.000Z"],
   ["T-6h","2026-11-06T02:30:00.000Z","2026-11-06T01:30:00.000Z"],
   ["T-90m","2026-11-06T07:00:00.000Z","2026-11-06T06:00:00.000Z"]
  ] as const;
  cases.forEach(([h,first,last],i)=>{
   const owner=draft.horizonOwners.find(o=>o.horizon===h)!;
   expect(owner.earliestPhysicalStartUtc).toBe(first);
   expect(owner.verifiedPrearmDeadlineUtc).toBe(last);
   expect(owner.queryCount).toBe(3);
   const queries=draft.queries.filter(q=>q.horizon===h);
   expect(queries.map(q=>q.plannedPhysicalStartUtc))
    .toEqual([0,30,60].map(x=>new Date(ts(first)+mins(x)).toISOString()));
   for(const c of sched.slice(i*4,i*4+4)){
    expect(when(c)).toBeGreaterThanOrEqual(ts(first)-mins(240));
    expect(when(c)).toBeLessThanOrEqual(ts(last));
    expect(ts(queries.at(-1)!.candidateGridCutoffUtc)-when(c)).toBeLessThanOrEqual(mins(320));
   }
  });
  expect(when(sched[0])).toBe(ts("2026-11-05T04:47:00.000Z"));
  expect((w.match(/timeout-minutes: 340/g)??[])).toHaveLength(3);
  expect(w).toContain("environment: phase2g-paid");
  expect(w).toContain("cancel-in-progress: false");
  expect(read(src)).toContain("GITHUB_RUN_NOT_EARLY_ENOUGH");
  expect(read(src)).toContain("PROSPECTIVE_HORIZON_ZERO_DURABLE_SOURCE_OR_PRE");
 });
 it("preserves POST, audit, least-privileged credential and cutoff intervals",()=>{
  const pc=crons(read(postYml)).map(when),ac=crons(read(auditYml)).map(when);
  const slots=["2026-11-06T10:40:00.000Z","2026-11-06T11:10:00.000Z","2026-11-06T11:40:00.000Z"];
  expect(pc).toHaveLength(4);expect(ac).toHaveLength(4);
  for(const x of slots)expect(read(post)).toContain(x);
  expect(pc.every(x=>x>=ts(slots[0])-mins(120)&&x<ts(slots[0]))).toBe(true);
  expect(ac.every(x=>x>ts("2026-11-06T12:01:00.000Z")&&x<ts("2026-11-06T12:40:00.000Z"))).toBe(true);
  expect(read(post)).toContain("G5A_POST_SKIPPED_MISSING_T24_SOURCE_OR_PRE_NO_PROVIDER");
  expect(read(post)).toContain("POST_RESERVATION_REPLAY_OR_FOREIGN_SLOT");
  expect(read(audit)).toContain("v39_phase4_gate5_g5a_nov06_prospective_post_schedule_observation");
  expect(read(audit)).toContain("P4_G5_G5A_NOV07_AUDIT_DATABASE_URL");
  expect(read(audit)).toContain("INDEPENDENT_READER_NOT_LEAST_PRIVILEGED");
  expect(read(audit)).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
 });
 it("retires all five prior Nov7 paid/audit jobs while leaving old evidence immutable",()=>{
  for(const [i,path] of oldYml.entries()){
   const w=read(path);
   expect(w.match(/if: \x24\{\{ false \}\}/g)?.length).toBe(i===0?3:1);
   expect(w).toContain("RETIRED");
  }
  expect(crons(read(oldYml[0]))).toHaveLength(12);
  for(const w of [read(sourceYml),read(postYml),read(auditYml)]){
   expect(w).not.toMatch(/if: \x24\{\{ false \}\}/);
   expect(w).toContain("  pull_request:");
   expect(w).toContain("  push:");
   expect(w).toContain("  schedule:");
  }
  for(const x of [read(src),read(post),read(audit)]){
   expect(x).toContain("GATE5_G5A_WSSS_20261106_0900Z_FROZEN_SOURCE_GRID.json");
   expect(x).not.toContain("WSSS_G5A_20261107_0200Z");
  }
 });
});
