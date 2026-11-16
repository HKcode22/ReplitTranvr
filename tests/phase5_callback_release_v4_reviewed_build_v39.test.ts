import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const PIN="bfbfcdc15035995b8d2ed7f4befa1db74d71b7ac";
const FILE="scripts/v39_phase5_callback_release_v4_reviewed_build_v39.sh";
describe("Phase5 V4 reviewed callback receiver / mode-separated expiry release",()=>{
 it("preserves earlier reviewed builders and changes only the reviewedBuild path",()=>{
  const old=readFileSync("scripts/v39_phase5_callback_release_v3_reviewed_build_v39.sh","utf8"),source=readFileSync(FILE,"utf8"),cfg=readFileSync(".replit","utf8");
  expect(old).toContain("PIN=4436773f2c7e684d05c55878c6eb13b46f16ac06");
  expect(source).toContain("PIN="+PIN);
  expect(source).toContain('git merge-base --is-ancestor "$PIN" HEAD');
  expect(source).toContain('git diff --quiet "$PIN" HEAD');
  expect(source).toContain('git diff --quiet HEAD');
  expect(source).toContain('git diff --cached --quiet');
  expect(source).toContain('git show "$PIN:.replit"');
  expect(source).toContain('cmp -s - .replit');
  expect(source).toContain('V49_CALLBACK_ONLY_BUILD=1 V49_BUILD_GIT_HEAD="$PIN" npm run build');
  expect(source).toContain('phase6_paid_launch_authorized:false');
  expect(source).toContain('phase5_freeze_passed:false');
  expect(cfg).toContain('build = ["bash", "'+FILE+'"]');
  expect(cfg).not.toContain('P5_RECURRING_EXPIRY_HTTP_ENABLED');
  for(const bad of ["AERODATABOX_API_KEY","DATABASE_URL","gh workflow run","db:push","replit publish"])
   expect(source).not.toContain(bad);
 });
 it("syntax valid and refuses any publish argument",()=>{
  expect(spawnSync("bash",["-n",FILE],{encoding:"utf8",timeout:10000}).status).toBe(0);
  expect(spawnSync("bash",[FILE,"--publish"],{encoding:"utf8",timeout:10000}).status).not.toBe(0);
 });
 it("actual source-equivalence when the pinned ancestry is present; otherwise fails closed",()=>{
  const ancestor=spawnSync("git",["merge-base","--is-ancestor",PIN,"HEAD"],{encoding:"utf8",timeout:10000});
  const result=spawnSync("bash",[FILE,"--verify-only"],{encoding:"utf8",timeout:10000});
  if(ancestor.status!==0){
   expect(result.status).not.toBe(0);
  }else{
   expect(result.status).toBe(0);
   expect(result.stdout.trim()).toBe("PHASE5_V4_CALLBACK_SOURCE_EQUIVALENCE_VERIFIED_NOT_PUBLISHED");
  }
 });
});