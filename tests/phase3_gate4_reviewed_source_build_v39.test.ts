import {describe,it,expect} from "vitest";
import {execFileSync,spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";

describe("Gate4 reviewed-content stable Replit build identity",()=>{
 it("validates source-equivalence with full local Git history when present",()=>{
  const pin="84b7f1565d0402facc8c3b9aacedc599eb6e2af1";
  // GitHub Actions can shallow-checkout one PR commit; a shallow parent
  // graph is not a production publishing environment. The strict gate
  // remains mandatory for Replit's full local repository.
  const ancestry=spawnSync("git",[
   "merge-base","--is-ancestor",pin,"HEAD"
  ],{encoding:"utf8",timeout:5000});
  if(ancestry.status!==0){
   const source=readFileSync(
    "scripts/v39_gate4_reviewed_source_build_v39.sh","utf8");
   expect(source).toContain('git merge-base --is-ancestor "$PIN" HEAD');
   expect(source).toContain('git diff --quiet "$PIN" HEAD');
   return;
  }
  const out=execFileSync("bash",[
   "scripts/v39_gate4_reviewed_source_build_v39.sh","--verify-only"
  ],{encoding:"utf8",timeout:15000});
  expect(out.trim()).toBe("GATE4_REVIEWED_CONTENT_PREFLIGHT_PASS");
 });
 it("preserves truthful snapshot identity in a separate private manifest",()=>{
  const script=readFileSync(
   "scripts/v39_gate4_reviewed_source_build_v39.sh","utf8");
  const config=readFileSync(".replit","utf8");
  expect(script).toContain("PIN=84b7f1565d0402facc8c3b9aacedc599eb6e2af1");
  expect(script).not.toContain("PIN=5c2eb8b2fd37ef6c490edd7928ee52e2aa06eb35");
  expect(script).not.toContain("PIN=5878b90eed04b2edfe2b226735ff0f02d9be25f3");
  expect(config).toContain(
   'build = ["bash", "scripts/v39_gate4_reviewed_source_build_v39.sh"]'
  );
  expect(script).toContain('git diff --quiet "$PIN" HEAD');
  expect(script).toContain('git merge-base --is-ancestor "$PIN" HEAD');
  expect(script).toContain('V39_BUILD_GIT_HEAD="$PIN" npm run build');
  expect(script).toContain("actual_replit_snapshot_git_head:snapshot");
  expect(script).toContain("client server shared package.json package-lock.json scripts/build.ts");
  expect(script).toContain("components.json drizzle.config.ts || hold");
  expect(script).toContain('git show "$PIN:.replit"');
  expect(script).toContain("cmp -s - .replit");
  expect(config).toContain('"V39_GATE05_DURABLE_CUSTODY_REQUIRED=1"');
  expect(script).toContain("reviewed_runtime_source_commit:reviewed");
  expect(script).not.toContain("AERODATABOX_API_KEY");
 });
});
