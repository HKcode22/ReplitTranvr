import {describe,it,expect} from "vitest";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";

describe("Gate4 reviewed-content stable Replit build identity",()=>{
 it("validates the approved source-equivalence before building",()=>{
  const out=execFileSync("bash",[
   "scripts/v39_gate4_reviewed_source_build_v39.sh","--verify-only"
  ],{encoding:"utf8",timeout:15000});
  expect(out.trim()).toBe("GATE4_REVIEWED_CONTENT_PREFLIGHT_PASS");
 });
 it("preserves truthful snapshot identity in a separate private manifest",()=>{
  const script=readFileSync(
   "scripts/v39_gate4_reviewed_source_build_v39.sh","utf8");
  const config=readFileSync(".replit","utf8");
  expect(config).toContain(
   'build = ["bash", "scripts/v39_gate4_reviewed_source_build_v39.sh"]'
  );
  expect(script).toContain('git diff --quiet "$PIN" HEAD');
  expect(script).toContain('git merge-base --is-ancestor "$PIN" HEAD');
  expect(script).toContain('V39_BUILD_GIT_HEAD="$PIN" npm run build');
  expect(script).toContain("actual_replit_snapshot_git_head:snapshot");
  expect(script).toContain("reviewed_runtime_source_commit:reviewed");
  expect(script).not.toContain("AERODATABOX_API_KEY");
 });
});
