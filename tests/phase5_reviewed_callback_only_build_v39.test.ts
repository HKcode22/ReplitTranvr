import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const PIN="1ca938bece03b90ab952f1bb762f25aedb5ede18";
const SCRIPT="scripts/v39_phase5_reviewed_source_build_v39.sh";
describe("Phase5 callback-only reviewed source Replit build (NO provider)",()=>{
 it("is syntax valid and refuses arbitrary arguments",()=>{
  const parsed=spawnSync("bash",["-n",SCRIPT],{encoding:"utf8",timeout:10000});
  expect(parsed.status).toBe(0);
  const invalid=spawnSync("bash",[SCRIPT,"--publish-unreviewed"],{
   encoding:"utf8",timeout:10000
  });
  expect(invalid.status).not.toBe(0);
  expect(invalid.stderr).toContain("PHASE5_CALLBACK_REVIEWED_SOURCE_BUILD_HOLD");
 });
 it("pins exact code SHA, source tree, public metadata and config delta",()=>{
  const source=readFileSync(SCRIPT,"utf8");
  const replit=readFileSync(".replit","utf8");
  expect(source).toContain("PIN="+PIN);
  expect(replit).toContain(
   'build = ["bash", "scripts/v39_phase5_reviewed_source_build_v39.sh"]');
  expect(source).toContain("OLD_BUILD=");
  expect(source).toContain("NEW_BUILD=");
  expect(source).toContain('git merge-base --is-ancestor "$PIN" HEAD');
  expect(source).toContain('git diff --quiet "$PIN" HEAD --');
  expect(source).toContain('git diff --quiet HEAD --');
  expect(source).toContain('git diff --cached --quiet --');
  expect(source).toContain('git show "$PIN:.replit"');
  expect(source).toContain("cmp -s - .replit");
  expect(source).toContain('V39_BUILD_GIT_HEAD="$PIN" npm run build');
  expect(source).toContain("runtime_inputs_identical_to_reviewed:true");
  expect(source).toContain("phase5_freeze_passed:false");
  expect(source).toContain("phase6_paid_launch_authorized:false");
  expect(source).toContain("PHASE5_CALLBACK_SOURCE_EQUIVALENT_BUILD_COMPLETE_NOT_DEPLOYED");
  expect(source).not.toContain("AERODATABOX_API_KEY");
  expect(source).not.toContain("DATABASE_URL");
  expect(source).not.toContain("gh workflow run");
  expect(source).not.toContain("db:push");
  const preserved=readFileSync("scripts/v39_gate4_reviewed_source_build_v39.sh","utf8");
  expect(preserved).toContain(
   "PIN=84b7f1565d0402facc8c3b9aacedc599eb6e2af1");
  expect(replit).toContain("V39_GATE05_DURABLE_CUSTODY_REQUIRED=1");
 });
 it("passes exact review with full Git history or asserts fail-closed checks on shallow PR clones",()=>{
  const ancestry=spawnSync("git",["merge-base","--is-ancestor",PIN,"HEAD"],{
   encoding:"utf8",timeout:10000
  });
  if(ancestry.status!==0){
   const source=readFileSync(SCRIPT,"utf8");
   expect(source).toContain('git cat-file -e "$PIN^{commit}"');
   expect(source).toContain('git merge-base --is-ancestor "$PIN" HEAD');
   return;
  }
  const out=spawnSync("bash",[SCRIPT,"--verify-only"],{
   encoding:"utf8",timeout:10000
  });
  // Historical V1 is now deliberately dormant: its exact reviewed .replit
  // build path is no longer active, and must refuse to republish.
  expect(out.status).not.toBe(0);
  expect(out.stderr).toContain("PHASE5_CALLBACK_REVIEWED_SOURCE_BUILD_HOLD");
 });
});
