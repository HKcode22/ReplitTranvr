import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
const s=readFileSync("scripts/v39_p25_prepare_exact_runtime_auth_drafts_v39.ts","utf8");

describe("P25 prospective draft bundle: exact published Git and zero paid authorization",()=>{
 it("binds actual tree-identical published Replit commit, not unreviewed PR HEAD",()=>{
  expect(s).toContain('const SOURCE="9c8ab21e98e86bcee52de2b1bbf0f9c6c20b3e30"');
  expect(s).toContain('const REVIEWED="89c3b170e56c89dc79df61dfaddbe94116280923"');
  expect(s).toContain("PUBLISHED_SOURCE_TREE_DIFF");
  expect(s).toContain('sourceGitHead:SOURCE');
  expect(s).toContain("sha(execFileSync(\"git\",[\"ls-tree\"");
  expect(s).not.toContain('sha(git(["ls-tree"');
 });
 it("requires SHA-pinned prospective file pair and keeps the one-shot budget",()=>{
  expect(s).toContain('const P25_APPROVED_SHA="f0162c4db03ba8478b6b0cb04dfe1457482d1953a91ce98dcdc6518a95a99d30"');
  expect(s).toContain('const P25_FROZEN_SHA="ea20048cb3cf912f3f9b70de9b4910e7f9994b3c89d3d82258c14dbbc42c6e86"');
  expect(s).toContain('const BUDGET="P2G-S1-20261012-03"');
  expect(s).toContain('const AUTH_ID="AUTH-20261012-P2G25"');
  expect(s).toContain('startNotBeforeUtc:"2026-10-12T03:00:00.000Z"');
  expect(s).toContain('expiresAtUtc:"2026-10-12T05:10:00.000Z"');
  expect(s).toContain("maxAlertCredits:500");
  expect(s).toContain("predecessorEvidenceIds:[binding.smoke.evidenceId,binding.evidenceId]");
 });
 it("writes only private /tmp drafts, never claims paid authorization",()=>{
  expect(s).toContain("mkdtempSync(path.join(tmpdir()");
  expect(s).toContain('writeFileSync(runtimePath,runtimeRaw,{flag:"wx",mode:0o600})');
  expect(s).toContain('writeFileSync(authPath,authRaw,{flag:"wx",mode:0o600})');
  expect(s).toContain('paid_auth_approved:false');
  expect(s).toContain('paid_preflight_passed:false');
  expect(s).toContain('paid_alert_credits_spent:0');
  expect(s).not.toContain("getBalance(");
  expect(s).not.toContain("deleteSubscriptionVerifiedStrict(");
  expect(s).not.toContain("pool.query(");
 });
});
