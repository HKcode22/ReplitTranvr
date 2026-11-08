import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

describe("Gate4 historical reviewed-content identity preserved after Phase5 release update",()=>{
 it("retains the original strictly pinned 84b7f15 builder as historical evidence",()=>{
  const script=readFileSync("scripts/v39_gate4_reviewed_source_build_v39.sh","utf8");
  const oldPin="84b7f1565d0402facc8c3b9aacedc599eb6e2af1";
  expect(script).toContain("PIN="+oldPin);
  expect(script).toContain('git merge-base --is-ancestor "$PIN" HEAD');
  expect(script).toContain('git diff --quiet "$PIN" HEAD');
  expect(script).toContain('git show "$PIN:.replit"');
  expect(script).toContain('cmp -s - .replit');
  expect(script).toContain('V39_BUILD_GIT_HEAD="$PIN" npm run build');
  expect(script).toContain("actual_replit_snapshot_git_head:snapshot");
  expect(script).not.toContain("AERODATABOX_API_KEY");
  // Historical builder is retained, not a valid way to deploy NEW source.
  const config=readFileSync(".replit","utf8");
  expect(config).not.toContain(
   'build = ["bash", "scripts/v39_gate4_reviewed_source_build_v39.sh"]');
 });
 it("does not silently disable callback-only or durable custody on the new path",()=>{
  const config=readFileSync(".replit","utf8");
  const phase5=readFileSync("scripts/v39_phase5_reviewed_source_build_v39.sh","utf8");
  expect(config).toContain(
   'build = ["bash", "scripts/v39_phase5_callback_release_v2_reviewed_build_v39.sh"]');
  expect(config).toContain('"V39_GATE05_DURABLE_CUSTODY_REQUIRED=1"');
  expect(config).toContain('"V39_CALLBACK_ONLY_RUNTIME=1"');
  expect(config).toContain('deploymentTarget = "autoscale"');
  expect(phase5).toContain("PIN=1ca938bece03b90ab952f1bb762f25aedb5ede18");
  expect(phase5).toContain('git merge-base --is-ancestor "$PIN" HEAD');
  expect(phase5).toContain('git diff --quiet "$PIN" HEAD');
  expect(phase5).toContain('git show "$PIN:.replit"');
  expect(phase5).toContain('cmp -s - .replit');
  expect(phase5).toContain('V39_BUILD_GIT_HEAD="$PIN" npm run build');
  expect(phase5).toContain("actual_replit_snapshot_git_head:snapshot");
  expect(phase5).toContain("phase6_paid_launch_authorized:false");
  expect(phase5).not.toContain("AERODATABOX_API_KEY");
 });
});
