import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const PIN="c3c3050e12c4e327f9c82c35c95f856f3c1cbd20";
const FILE="scripts/v39_phase5_callback_release_v5_reviewed_build_v39.sh";
describe("Phase5 V5 reviewed callback receiver / mode-separated expiry release",()=>{
 it("preserves earlier reviewed builders and changes only the reviewedBuild path",()=>{
  const old=readFileSync("scripts/v39_phase5_callback_release_v4_reviewed_build_v39.sh","utf8"),source=readFileSync(FILE,"utf8"),cfg=readFileSync(".replit","utf8");
  expect(old).toContain("PIN=bfbfcdc15035995b8d2ed7f4befa1db74d71b7ac");
  expect(source).toContain("PIN="+PIN);
  expect(source).toContain('git merge-base --is-ancestor "$PIN" HEAD');
  expect(source).toContain('git diff --quiet "$PIN" HEAD');
  expect(source).toContain('git diff --quiet HEAD');
  expect(source).toContain('git diff --cached --quiet');
  expect(source).toContain('git show "$PIN:.replit"');
  expect(source).toContain('cmp -s - .replit');
  expect(source).toContain('V39_CALLBACK_ONLY_BUILD=1 V39_BUILD_GIT_HEAD="$PIN" npm run build');
  expect(source).not.toContain('V49_');
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
 it("T125 actual source-equivalence requires unchanged reviewed inputs as well as pinned ancestry",()=>{
  const ancestor=spawnSync("git",["merge-base","--is-ancestor",PIN,"HEAD"],{encoding:"utf8",timeout:10000});
  const result=spawnSync("bash",[FILE,"--verify-only"],{encoding:"utf8",timeout:10000});
  // An ancestor can have later executable descendants. The wrapper correctly
  // rejects that drift; ancestor presence alone must never imply publishability.
  const reviewedInputs=spawnSync("git",["diff","--quiet",PIN,"HEAD","--",
   "client","server","shared","package.json","package-lock.json","scripts/build.ts",
   "vite.config.ts","tsconfig.json","postcss.config.js","tailwind.config.ts","tailwind.config.js",
   "components.json","drizzle.config.ts"],{encoding:"utf8",timeout:10000});
  if(ancestor.status!==0||reviewedInputs.status!==0){
   expect(result.status).toBe(2);
   expect(result.stderr).toContain("PHASE5_CALLBACK_REVIEWED_SOURCE_BUILD_HOLD");
   expect(result.stdout).not.toContain("SOURCE_EQUIVALENCE_VERIFIED");
  }else{
   expect(result.status).toBe(0);
   expect(result.stdout.trim()).toBe("PHASE5_V5_CALLBACK_SOURCE_EQUIVALENCE_VERIFIED_NOT_PUBLISHED");
  }
 });
});
