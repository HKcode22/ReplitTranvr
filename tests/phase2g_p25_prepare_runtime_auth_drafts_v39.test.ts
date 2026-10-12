import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
const s=readFileSync("scripts/v39_p25_prepare_exact_runtime_auth_drafts_v39.ts","utf8");

describe("P25 prospective draft bundle: exact published Git and zero paid authorization",()=>{
 it("binds actual tree-identical published Replit commit, not unreviewed PR HEAD",()=>{
  expect(s).toContain('const SOURCE_BRANCH="origin/phase2g-p25-20261012-integrated-release-review"');
  expect(s).toContain('const REVIEWED="9c8ab21e98e86bcee52de2b1bbf0f9c6c20b3e30"');
  expect(s).toContain("REVIEWED_PUBLISHED_BASE_NOT_ANCESTOR");
  expect(s).toContain('sourceGitHead:SOURCE');
  expect(s).toContain("sha(execFileSync(\"git\",[\"ls-tree\"");
  expect(s).not.toContain('sha(git(["ls-tree"');
 });
 it("requires SHA-pinned prospective file pair and keeps the one-shot budget",()=>{
  expect(s).toContain('const P25_APPROVED_SHA="4ac004e0150a3816e272cbec37907e598bb0605870c65a63477e526e2ba81c61"');
  expect(s).toContain('const P25_FROZEN_SHA="b54256346a35354d71e46e18a44d175056cba3228d93313d0036cc08af2f4f94"');
  expect(s).toContain('const BUDGET="P2G-S1-20261013-03"');
  expect(s).toContain('const AUTH_ID="AUTH-20261013-P2G25"');
  expect(s).toContain('startNotBeforeUtc:"2026-10-13T03:00:00.000Z"');
  expect(s).toContain('expiresAtUtc:"2026-10-13T05:25:00.000Z"');
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
