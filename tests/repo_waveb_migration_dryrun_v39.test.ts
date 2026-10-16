import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
describe("Wave B physical migration — replace outdated pre-move planner test",()=>{
 it("checks that all 460 originals actually moved without authorizing runtime deployment",()=>{
  const raw=execFileSync(process.execPath,["scripts/repo_waveb_verify_actual_move.mjs"],{encoding:"utf8",timeout:45000,maxBuffer:2*1024*1024});
  const x=JSON.parse(raw.trim().replace(/^REPO_WAVEB_460_RELOCATION=/,""));
  expect(x.exact_git_blob_mode_size_matches).toBe(460);
  expect(x.science).toBe(108);
  expect(x.artifacts).toBe(352);
  expect(x.errors).toEqual([]);
  expect(x.merge_authorized).toBe(false);
  expect(x.signed_runtime_paths_not_certified).toBe(true);
 },60000);
});
