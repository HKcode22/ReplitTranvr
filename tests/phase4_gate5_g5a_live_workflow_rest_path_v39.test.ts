import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {isP4G5ReviewedMainWorkflowRestPathV39}
 from "../server/lib/disruption/phase4Gate5GithubRestPathGuard_v39";

const PRE=".github/workflows/phase4-gate5-g5a-real-wsss-prospective-owner.yml";
const POST=".github/workflows/phase4-gate5-g5a-wsss-real-post.yml";
describe("real Gate5 owner REST workflow_run.path admission",()=>{
 it("accepts documented GitHub @main and exact reviewed main branch only",()=>{
  for(const f of [PRE,POST]){
   expect(isP4G5ReviewedMainWorkflowRestPathV39(f,f)).toBe(true);
   expect(isP4G5ReviewedMainWorkflowRestPathV39(f+"@main",f)).toBe(true);
   expect(isP4G5ReviewedMainWorkflowRestPathV39(f+"@refs/heads/main",f)).toBe(true);
  }
 });
 it("rejects foreign workflow, fork, tag, SHA, PR or subpath substitution",()=>{
  for(const f of [PRE,POST]){
   for(const bad of [
     f+"@refs/pull/100/merge",
     f+"@refs/heads/release",
     f+"@feature", f+"@v1",f+"@refs/tags/v1",
     f+"@"+("a".repeat(40)),
     f.replace(".yml","-attacker.yml")+"@main",
     f+"@main/../../bad",f+"@main ",
     "not-a-workflow.yml@main",null,42,""
   ]) expect(isP4G5ReviewedMainWorkflowRestPathV39(bad,f)).toBe(false);
  }
 });
 it("makes BOTH real paid source & POST use this guard before paid requests",()=>{
  const paths=[
   "scripts/v39_phase4_gate5_g5a_real_wsss_horizon_owner.ts",
   "scripts/v39_phase4_gate5_g5a_prospective_post_schedule_observation.ts"
  ];
  for(const path of paths){
   const s=readFileSync(path,"utf8");
   expect(s).toContain("isP4G5ReviewedMainWorkflowRestPathV39(run.path,");
   expect(s).not.toContain("run.path!==WORKFLOW_PATH");
   expect(s).not.toContain("run.path!==PATH");
   expect(s.indexOf("isP4G5ReviewedMainWorkflowRestPathV39(run.path"))
    .toBeLessThan(s.indexOf("await db.connect()"));
  }
 });
});
