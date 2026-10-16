import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
describe("Wave B exact 460-blob physical migration candidate",()=>{
 it("preserves every original scientific source/artifact SHA, size and mode without colliding with navigation",()=>{
  const raw=execFileSync(process.execPath,["scripts/repo_waveb_verify_actual_move.mjs"],{encoding:"utf8",timeout:45000,maxBuffer:1024*1024}).trim();
  const x=JSON.parse(raw.replace(/^REPO_WAVEB_460_RELOCATION=/,""));
  expect(x.status).toBe("SOURCE_IDENTITY_VERIFIED_RUNTIME_COMPATIBILITY_NOT_YET_VERIFIED");
  expect(x.expected_files).toBe(460);
  expect(x.exact_git_blob_mode_size_matches).toBe(460);
  expect(x.science).toBe(108);
  expect(x.artifacts).toBe(352);
  expect(x.casefold_targets_unique).toBe(true);
  expect(x.errors).toEqual([]);
  expect(x.merge_authorized).toBe(false);
  expect(x.provider_calls).toBe(0);
 },60000);
});
