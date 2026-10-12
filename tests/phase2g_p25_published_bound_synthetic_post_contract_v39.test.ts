import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";

const s=readFileSync("scripts/v39_phase2g_verify_live_callback_v39.ts","utf8");
describe("P25 opt-in real published bound synthetic POST, no paid provider",()=>{
 it("uses a fake runtime-only bound subscription and matching body identity",()=>{
  expect(s).toContain('process.argv.includes("--synthetic-bound-subscription")');
  expect(s).toContain("bindPrepaidProbeSubscriptionV39(session.sessionId,syntheticSubId)");
  expect(s).toContain("P25-NO-PROVIDER-BOUND-");
  expect(s).toContain("subscription:{id:syntheticSubId}");
  expect(s).toContain("WHERE session_id=$1::uuid AND state='VERIFIED'");
  expect(s).toContain("BOUND_SYNTHETIC_V0064_VERIFIED_INTENT_MISSING");
  expect(s).toContain("published_bound_outside_lock_path_exercised: boundSynthetic");
  expect(s).toContain("actual_paid_provider_subscription_created: false");
 });
 it("requires same exact hosted git, custody flags and doesn't waive old incident30 paid hold",()=>{
  expect(s).toContain("REFUSED:PUBLISHED_RUNTIME_GIT_HEAD_OR_CONTRACT_MISMATCH");
  expect(s).toContain("BOUND_SYNTHETIC_OUTSIDE_LOCK_FLAGS_NOT_FULLY_ENABLED");
  for(const name of [
   "V39_CALLBACK_ONLY_RUNTIME",
   "V39_PREPAID_FAILED_SOURCE_JOURNAL_APPROVED",
   "V39_PREPAID_SOURCE_PENDING_INTENT_APPROVED",
   "V39_PREPAID_SOURCE_OUTSIDE_SESSION_LOCK_APPROVED"
  ])expect(s).toContain(`process.env.${name}!=="1"`);
  expect(s).toContain("historical_incident30_paid_launch_authorized: false");
  expect(s).toContain("historical_incident30_closure_or_deletion_authorized: false");
 });
 it("still preserves original wrong-secret and admitted 8s test and exact cleanup",()=>{
  expect(s).toContain("wrong_secret_rejected_404: true");
  expect(s).toContain("correct_secret_accepted_200: true");
  expect(s).toContain("PHASE2G_CALLBACK_ADMISSION_BUDGET_MS = 8_000");
  expect(s).toContain("cleanupPrepaidProbeSessionV39(");
  expect(s).toContain("provider_subscription_created: false");
  expect(s).toContain("alert_credits_spent: 0");
 });
});
