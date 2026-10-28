import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {gate05SciencePlanWindowV39} from
 "../scripts/v39_gate05_science_recommission_after_fourth_failed_watch_v39";
import {gate05GithubOwnerTimeAdmitV39} from
 "../scripts/v39_gate05_github_owner_controller_retry4_v39";

const root="scripts/";
const commission=readFileSync(root+"v39_gate05_science_recommission_after_fourth_failed_watch_v39.ts","utf8");
const controller=readFileSync(root+"v39_gate05_github_owner_controller_retry4_v39.ts","utf8");
const paid=readFileSync(root+"v39_gate05_science_one_paid_create_once_retry4_v39.ts","utf8");
const stop=readFileSync(root+"v39_gate05_science_exact_owned_actions_stop_retry4_v39.ts","utf8");
const workflow=readFileSync(".github/workflows/phase3-gate05-github-automated-retry4.yml","utf8");
const stopWorkflow=readFileSync(".github/workflows/phase3-gate05-science-exact-owned-stop-retry4.yml","utf8");

describe("Gate05 fourth scope, evidence-first resilient execution",()=>{
 it("requires reconciled previous ARMED paid-operator crash but no published CREATE intent",()=>{
  for(const evidence of [
   'const PRIOR_SCOPE="c631e164-feac-4550-b811-7585e88aaf0d"',
   'const PRIOR_STOP_RUN="40650693149"',
   'const PRIOR_CONTROLLER_RUN="40650576082"',
   'const PRIOR_SOURCE="26d107026fac1ff7a0f9efe735434ff6d88b5b1c"',
   'controllerFail.paidOperatorInvoked!==true',
   'controllerFail.providerCreateOutcomeUnconfirmed!==true',
   'stopFailure.reason!=="BALANCE_UNAVAILABLE: transport failure"',
   'RETRY4_PRIOR_STOP_WAS_NOT_ARMED',
   'RETRY4_ISSUE_INTENT_HISTORY_INCOMPLETE',
   'RETRY4_PRIOR_PAID_INTENT_FOUND_NO_REUSE',
   'CREDIT_BALANCE_NOT_STABLE_AFTER_NO_PAID_WINDOW',
   'FOREIGN_ACTIVE_PROVIDER',
   'RETRY4_PRIOR_LOGGED_OWNER_NOT_UNBILLED_PREPARED'
  ])expect(commission).toContain(evidence);
  expect(commission).not.toContain("createGate4SingleWithRawReceiptV39(");
  expect(commission).not.toContain("refillBalance(");
 });
 it("cuts pre-start wait to ~20-25m while preserving exactly 60m observation",()=>{
  const t=Date.parse("2026-10-28T10:02:00Z");
  const w=gate05SciencePlanWindowV39(t);
  expect(w.start).toBe("2026-10-28T10:25:00.000Z");
  expect(w.stop).toBe("2026-10-28T11:25:00.000Z");
  expect(w.sessionExpires).toBe("2026-10-28T11:45:00.000Z");
  gate05GithubOwnerTimeAdmitV39(t,Date.parse(w.start),Date.parse(w.stop),"dispatch");
  gate05GithubOwnerTimeAdmitV39(Date.parse(w.start)-9*60000,Date.parse(w.start),Date.parse(w.stop),"paid");
  expect(()=>gate05GithubOwnerTimeAdmitV39(
    Date.parse(w.start)-10*60000,Date.parse(w.start),Date.parse(w.stop),"paid")).toThrow();
 });
 it("converts pre-intent database disconnect into safe identity-checked select retry",()=>{
  for(const t of [
   'c.on("error"', 'GATE05_PG_CONNECTION_INTERRUPTED_RECONCILE_BEFORE_PAID',
   'const precreateSelect=async', 'RECONNECTED_DB_IDENTITY_DRIFT',
   'if(providerAttempted||commitAttempted||existsSync(INTENT))',
   'await reconnectBeforeCreate()', 'precreateSelect(OWNER',
   'maxDeliveryRetries:0', 'noBlindCreateRetry:true',
   'ONE_CREATE_ATTEMPT_IMMINENT_DO_NOT_REPEAT'
  ])expect(paid).toContain(t);
  expect(paid).not.toContain("maxDeliveryRetries:12");
 });
 it("lets transient free reads and pre-paid PG restarts recover without inventing scientific data",()=>{
  for(const t of [
   'c.on("error"', 'const ownerSelect=async',
   'GATE05_STOP_PRECREATE_POSTMASTER_CHANGED_WAIT_FOR_OWNER_REARM',
   'GATE05_STOP_TRANSIENT_FREE_TELEMETRY_GAP',
   'noCreditsAssumed:true', 'STOP_DEADLINE_DURING_TELEMETRY_OUTAGE',
   'deleteSubscriptionVerifiedStrict(knownExactId',
   'providerHardCap:false', 'LIVE_STOP_WATCH_ARMED_NO_PROVIDER_CREATE'
  ])expect(stop).toContain(t);
  expect(stop).not.toContain("createGate4SingleWithRawReceiptV39(");
 });
 it("preserves separate protected GitHub runners, automatic approval and one-use identity",()=>{
  expect(controller).toContain('"gate05-science-retry4"');
  expect(controller).toContain('recommissionGate05AfterFourthUnbilledWatchV39');
  expect(controller).toContain('v39_gate05_science_one_paid_create_once_retry4_v39.ts');
  expect(controller).toContain("GATE05_SAFETY_EXACT_GITHUB_PROTECTED_REVIEW_APPROVED");
  expect(controller).toContain("timeout:720000");
  expect(controller).toContain("phase3-gate05-science-exact-owned-stop-retry4.yml");
  expect(stopWorkflow).toContain("scripts/v39_gate05_science_exact_owned_actions_stop_retry4_v39.ts");
  expect(workflow).toContain("workflow_dispatch:");
  expect(workflow).toContain("environment: phase2g-paid");
  expect(workflow).toContain("v39_gate05_github_owner_controller_retry4_v39.ts");
  expect(workflow).not.toMatch(/^\\s+schedule:/m);
  expect(workflow).not.toMatch(/^\\s+push:/m);
 });
});
