import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

const workflow=".github/workflows/phase4-gate5-g5a-t24-one-shot-reviewed-relay-20261104.yml";
describe("Nov4 single GitHub-only non-provider recovery relay",()=>{
 const s=readFileSync(workflow,"utf8");
 it("is one-shot push-scoped to new file and main, not a recurring collector",()=>{
  expect(s).toContain("on:\n  push:\n    branches: [main]");
  expect(s).toContain('      - "'+workflow+'"');
  expect(s).toContain("github.ref == 'refs/heads/main'");
  expect(s).toContain('test "${GITHUB_RUN_ATTEMPT}" = "1"');
  expect(s).not.toContain("schedule:");
  expect(s).not.toContain("pull_request:");
 });
 it("uses only scoped GitHub Actions write with no provider/db secret",()=>{
  expect(s).toContain("permissions:\n  actions: write\n  contents: read");
  expect(s).toContain("GH_TOKEN: ${{ github.token }}");
  for(const name of ["AERODATABOX_API_KEY","RAPIDAPI_KEY",
   "P4_G5_SOURCE_OWNER_DATABASE_URL","V39_DATABASE_RUNTIME_URL",
   "DATABASE_URL"])expect(s).not.toContain(name);
  expect(s).toContain("timeout-minutes: 3");
 });
 it("fails closed before prospective deadline and refuses overlapping/older owners",()=>{
  expect(s).toContain("2026-11-04T12:20:00Z");
  expect(s).toContain("NOW <= LO || NOW >= HI");
  expect(s).toContain("HOLD_MAIN_MOVED_NO_DISPATCH");
  expect(s).toContain("HOLD_TARGET_WORKFLOW_DISABLED");
  expect(s).toContain("41810504164");
  expect(s).toContain("41813236781");
  expect(s).toContain("HOLD_SECOND_OWNER_JOB_NOT_TERMINAL");
  expect(s).toContain("G5A_T24_DISPATCH_SKIPPED_EXISTING_REAL_OWNER_RUN");
  expect(s).toContain("G5A_T24_ONE_SHOT_GITHUB_DISPATCH_ACCEPTED_NO_PROVIDER_BY_RELAY");
 });
 it("only dispatches real reviewed T-24h github workflow on main",()=>{
  expect(s).toContain('"phase4-gate5-g5a-real-wsss-prospective-owner.yml"');
  expect(s).toContain('{"ref":"main","inputs":{"horizon":"T-24h"}}');
  expect(s).toContain("gh api --method POST");
  expect(s).not.toContain("owner-t6");
  expect(s).not.toContain("owner-t90");
 });
});
