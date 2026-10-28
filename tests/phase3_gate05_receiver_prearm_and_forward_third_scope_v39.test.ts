import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {gate05SciencePlanWindowV39} from
 "../scripts/v39_gate05_science_recommission_after_third_failed_watch_v39";
const commissioning=readFileSync("scripts/v39_gate05_science_recommission_after_third_failed_watch_v39.ts","utf8");
const controller=readFileSync("scripts/v39_gate05_github_owner_controller_retry3_v39.ts","utf8");
const paid=readFileSync("scripts/v39_gate05_science_one_paid_create_once_retry3_v39.ts","utf8");
const workflow=readFileSync(".github/workflows/phase3-gate05-github-automated-retry3.yml","utf8");
describe("Third independent Gate05 scope: never rerun old CREATE / old timestamps",()=>{
 it("verifies exact previous controller and STOP terminal no-CREATE evidence",()=>{
   for(const token of [
    'const PRIOR_SCOPE="a478863f-f88e-40c7-a2d9-3ee3396076b4"',
    'const PRIOR_CONTROLLER_RUN="40642457228"',
    'const PRIOR_STOP_RUN="40642537874"',
    'const PRIOR_SOURCE="0ebebce37b1c41e27e8b918b9e5786f25b24bd22"',
    'previousController?.conclusion!=="failure"',
    'priorRun?.conclusion!=="failure"',
    'controllerFail.paidOperatorInvoked!==false',
    'controllerFail.noProviderCreateFromThisControllerIfNotInvoked!==true',
    'stopFailure.providerCreateAttempted!==false',
    'stopFailure.reason!=="The operation was aborted due to timeout"',
    'RETRY3_PRIOR_UNEXPECTEDLY_ARMED'
   ])expect(commissioning).toContain(token);
 });
 it("validates provider zero-active, unbilled logged owner and pinned receiver before fresh scope",()=>{
  for(const token of [
   'getBalanceEvidenceStrictWithRetry()',
   'listSubscriptionsStrictWithRetry()',
   'CREDIT_BALANCE_NOT_STABLE_AFTER_NO_PAID_WINDOW',
   'FOREIGN_ACTIVE_PROVIDER',
   'readGate05PublishedReceiverHealthV39',
   'maxAttempts:3,timeoutMs:20000',
   'PUBLISHED_DB_BIND_AUTHENTICATION',
   'RETRY3_PRIOR_LOGGED_OWNER_NOT_UNBILLED_PREPARED',
   'provider_subscription_id IS NULL RETURNING session_id',
   'const scope=randomUUID()',
   'CREATE ROLE',
   'GRANT SELECT ON TABLE',
   '"gate05-science-retry3"'
  ])expect(commissioning).toContain(token);
  for(const forbidden of [
    'createGate4SingleWithRawReceiptV39(',
    'refillBalance(',
    'deleteSubscriptionVerifiedStrict('
  ])expect(commissioning).not.toContain(forbidden);
 });
 it("isolates signed new paid attempt and preserves verified exact STOP",()=>{
  expect(controller).toContain("recommissionGate05AfterThirdUnbilledWatchV39");
  expect(controller).toContain('"gate05-science-retry3"');
  expect(controller).toContain('m.priorClosedScope!=="a478863f-f88e-40c7-a2d9-3ee3396076b4"');
  expect(controller).toContain("v39_gate05_science_one_paid_create_once_retry3_v39.ts");
  expect(paid).toContain('"gate05-science-retry3"');
  expect(paid).toContain('endsWith("v39_gate05_science_one_paid_create_once_retry3_v39.ts")');
  expect(paid).toContain('readGate05PublishedReceiverHealthV39');
  expect(paid).toContain('maxAttempts:3,timeoutMs:20000');
  expect(paid).toContain("maxDeliveryRetries:0");
  expect(controller).not.toContain("createGate4SingleWithRawReceiptV39(");
  expect(commissioning).not.toContain('const PRIOR_SCOPE="1082959c-21c5-4ac2-a649-0a627f565f86"');
 });
 it("new future window is prospective and not the expired owner's clock",()=>{
  const x=gate05SciencePlanWindowV39(Date.parse("2026-10-28T07:15:00Z"));
  expect(x.start).toBe("2026-10-28T08:00:00.000Z");
  expect(x.stop).toBe("2026-10-28T09:00:00.000Z");
  expect(x.sessionExpires).toBe("2026-10-28T09:20:00.000Z");
 });
 it("a single workflow_dispatch lets GitHub controller review exact protected STOP",()=>{
  for(const token of [
   'protectedReviewSubmitted=false',
   'run.status==="waiting"',
   'AUTO_REVIEW_ENVIRONMENT_SCOPE_OR_SOURCE_DRIFT',
   'pending_deployments',
   'current_user_can_approve!==true',
   'AUTO_REVIEW_GITHUB_POLICY_DENIES_REVIEW',
   'environment_ids[]=',
   'state=approved',
   'AUTO_REVIEW_APPROVAL_UNCONFIRMED',
   'GATE05_SAFETY_EXACT_GITHUB_PROTECTED_REVIEW_APPROVED'
  ])expect(controller).toContain(token);
  expect(controller).not.toContain("bypass_protection");
  expect(workflow).toContain("workflow_dispatch:");
  expect(workflow).toContain("environment: phase2g-paid");
  expect(workflow).toContain("v39_gate05_github_owner_controller_retry3_v39.ts");
  expect(workflow).not.toMatch(/^\\s+schedule:/m);
  expect(workflow).not.toMatch(/^\\s+push:/m);
 });
});
