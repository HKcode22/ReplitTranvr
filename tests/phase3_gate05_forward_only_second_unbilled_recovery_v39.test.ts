import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {gate05SciencePlanWindowV39} from
  "../scripts/v39_gate05_science_recommission_after_second_failed_watch_v39";
import {validateGate05ScienceStopPinsV39} from
  "../scripts/v39_gate05_science_exact_owned_actions_stop_v39";
const recover=readFileSync(
 "scripts/v39_gate05_science_recommission_after_second_failed_watch_v39.ts","utf8");
const controller=readFileSync(
 "scripts/v39_gate05_github_owner_controller_retry2_v39.ts","utf8");
const paid=readFileSync(
 "scripts/v39_gate05_science_one_paid_create_once_retry2_v39.ts","utf8");
const stop=readFileSync(
 "scripts/v39_gate05_science_exact_owned_actions_stop_v39.ts","utf8");
const workflow=readFileSync(
 ".github/workflows/phase3-gate05-github-automated-retry2.yml","utf8");

describe("Gate05 recovery2: verified failed watch, no paid POST and fresh ID",()=>{
 it("requires BOTH original GitHub runs failed terminal and pinned sources",()=>{
   for(const token of [
     'const PRIOR_SCOPE="1082959c-21c5-4ac2-a649-0a627f565f86"',
     'const PRIOR_STOP_RUN="40637802818"',
     'const PRIOR_CONTROLLER_RUN="40637660062"',
     'const PRIOR_SOURCE="59d482534d0b25407686777f3f26742c73561972"',
     'previousController?.conclusion!=="failure"',
     'previousController?.run_attempt!==1',
     'priorRun?.conclusion!=="failure"',
     'priorRun?.run_attempt!==1',
     '"schema":"v39.gate05.science-commission-new-scope.v1"',
     '"status":"GATE05_GITHUB_CONTROLLER_HELD_DO_NOT_RERUN"',
     '"status":"GATE05_SCIENCE_STOP_UNCONFIRMED_REQUIRES_EXACT_OWNER_RESCUE"',
     '"status":"GATE05_EMERGENCY_EXACT_STOP_ATTEMPT"',
     'controllerFail.paidOperatorInvoked!==false',
     'controllerFail.noProviderCreateFromThisControllerIfNotInvoked!==true',
     'stopFailure.providerCreateAttempted!==false',
     'stopEmergency.exactOwnedIdEstablished!==false'
   ])expect(recover).toContain(token);
 });
 it("reconciles current provider, source, old DB owner in an atomic forward-only operation",()=>{
   for(const token of [
     "getBalanceEvidenceStrictWithRetry()",
     "listSubscriptionsStrictWithRetry()",
     "CREDIT_BALANCE_NOT_STABLE_AFTER_NO_PAID_WINDOW",
     "FOREIGN_ACTIVE_PROVIDER",
     "PUBLISHED_DB_BIND_AUTHENTICATION",
     "RETRY2_PRIOR_LOGGED_OWNER_NOT_UNBILLED_PREPARED",
     "provider_subscription_id IS NULL RETURNING session_id",
     "CREATE ROLE",
     "GRANT SELECT ON TABLE",
     'const scope=randomUUID()',
     '"gate05-science-retry2"'
   ])expect(recover).toContain(token);
   for(const forbidden of ["createGate4SingleWithRawReceiptV39(",
     "refillBalance(","deleteSubscriptionVerifiedStrict("])
     expect(recover).not.toContain(forbidden);
   const x=gate05SciencePlanWindowV39(Date.parse("2026-10-28T05:56:00Z"));
   expect(x.start).toBe("2026-10-28T06:45:00.000Z");
   expect(x.stop).toBe("2026-10-28T07:45:00.000Z");
 });
 it("separates immutable new second-attempt files from the earlier job",()=>{
  expect(controller).toContain('recommissionGate05AfterSecondUnbilledWatchV39');
  expect(controller).toContain('m.priorClosedScope!=="1082959c-21c5-4ac2-a649-0a627f565f86"');
  expect(controller).toContain('"gate05-science-retry2"');
  expect(controller).toContain('v39_gate05_science_one_paid_create_once_retry2_v39.ts');
  expect(controller).toContain('endsWith("v39_gate05_github_owner_controller_retry2_v39.ts")');
  expect(paid).toContain('"gate05-science-retry2"');
  expect(paid).toContain('endsWith("v39_gate05_science_one_paid_create_once_retry2_v39.ts")');
  expect(paid).toContain("maxDeliveryRetries:0");
  expect(controller).not.toContain('createGate4SingleWithRawReceiptV39(');
  expect(recover).not.toContain('const PRIOR_SCOPE="98bbf760-6211-4eaa-908c-240be91e7b0d"');
 });
 it("STOP pre-paid retry only with immutable PREPARED owner and no exact paid ID",()=>{
   expect(stop).toContain('current.state==="PREPARED"');
   expect(stop).toContain("current.provider_subscription_id===null");
   expect(stop).toContain("knownExactId===null");
   expect(stop).toContain("now<policy.startMs-5*60000");
   expect(stop).toContain("getBalanceEvidenceStrictWithRetry({maxAttempts:3})");
   expect(stop).toContain("maxAttempts:safePreCreate?3:1");
   expect(stop).toContain("await getBalanceEvidenceStrict();");
   expect(stop).toContain("deleteSubscriptionVerifiedStrict(knownExactId");
   expect(stop).not.toContain("createGate4SingleWithRawReceiptV39(");
 });
 it("new release is GitHub-only, reviewer protected, no cron or auto-paid push",()=>{
    expect(workflow).toContain("environment: phase2g-paid");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("scripts/v39_gate05_github_owner_controller_retry2_v39.ts");
    expect(workflow).not.toMatch(/^\s+schedule:/m);
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).not.toContain("replit dev");
    expect(workflow).not.toContain("refillBalance");
 });
});
