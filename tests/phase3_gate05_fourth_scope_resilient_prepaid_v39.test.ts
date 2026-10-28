import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {gate05SciencePlanWindowV39,hasExactGate05PaidIntentV39} from
 "../scripts/v39_gate05_science_recommission_after_fourth_failed_watch_v39";
import {gate05GithubOwnerTimeAdmitV39,gate05GithubStopIsReallyLiveV39} from
 "../scripts/v39_gate05_github_owner_controller_retry4_v39";
import {gate05OnePaidLaunchReceiptChecksV39} from
 "../scripts/v39_gate05_science_one_paid_create_once_retry4_v39";

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
 it("does not mistake incident prose mentioning old scope for an actual paid intent",()=>{
  const scope="c631e164-feac-4550-b811-7585e88aaf0d";
  const prose="scope "+scope+" had NO ONE_CREATE_ATTEMPT_IMMINENT_DO_NOT_REPEAT receipt";
  expect(hasExactGate05PaidIntentV39([{body:prose}],scope)).toBe(false);
  expect(hasExactGate05PaidIntentV39([{body:JSON.stringify({
    schema:"v39.gate05.science-paid-create-intent.v1",
    status:"ONE_CREATE_ATTEMPT_IMMINENT_DO_NOT_REPEAT",scope
  })}],scope)).toBe(true);
  expect(hasExactGate05PaidIntentV39([{body:JSON.stringify({
    schema:"v39.gate05.science-paid-create-intent.v1",
    status:"ONE_CREATE_ATTEMPT_IMMINENT_DO_NOT_REPEAT",scope:"other"
  })}],scope)).toBe(false);
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
 it("actually recognizes authenticated independent STOP at T-9, not only T-5",()=>{
  const start=Date.parse("2026-10-28T11:00:00.000Z");
  const head="a".repeat(40),scope="c631e164-feac-4550-b811-7585e88aaf0d";
  const run={head_sha:head,event:"workflow_dispatch",run_attempt:1,
    display_title:"Gate05 Science STOP "+scope,status:"in_progress"};
  const jobs={jobs:[{name:"exact-owned-stop",status:"in_progress",
    steps:[{name:"Run independently authorized exact-owned STOP, never CREATE",
      status:"in_progress"}]}]};
  expect(gate05GithubStopIsReallyLiveV39(run,jobs,scope,head,start-9*60000,start)).toBe(true);
  expect(gate05GithubStopIsReallyLiveV39(run,jobs,scope,head,start-11*60000,start)).toBe(false);
  expect(gate05GithubStopIsReallyLiveV39(run,jobs,scope,head,start+16000,start)).toBe(false);
  expect(gate05GithubStopIsReallyLiveV39(
    {...run,status:"completed"},jobs,scope,head,start-9*60000,start)).toBe(false);
 });
 it("checks exact retry4 STOP workflow and authenticated ARMED receipt in paid preflight",()=>{
  const head="a".repeat(40);
  const scope="c631e164-feac-4550-b811-7585e88aaf0d";
  const receiver="1885703c04ba8f24bf8d1183f873eb86d1f83d7c";
  const m={scope,receiver,authorizationSha256:"b".repeat(64),
    stopTicketSha256:"c".repeat(64),
    stopUtc:"2026-10-28T09:15:00.000Z"};
  const run={head_sha:head,head_branch:"main",event:"workflow_dispatch",
    run_attempt:1,status:"in_progress",path:".github/workflows/phase3-gate05-science-exact-owned-stop-retry4.yml",
    display_title:"Gate05 Science STOP "+scope};
  const jobs={jobs:[{name:"exact-owned-stop",status:"in_progress",
    steps:[{name:"Run independently authorized exact-owned STOP, never CREATE",
      status:"in_progress"}]}]};
  const proof={created_at:"2026-10-28T08:05:07.000Z",
    user:{login:"github-actions[bot]"},body:JSON.stringify({
      schema:"v39.gate05.science-actions-stop-armed.v1",
      status:"LIVE_STOP_WATCH_ARMED_NO_PROVIDER_CREATE",
      scope,runner:head,receiver,stopUtc:m.stopUtc,
      softCreditStop:350,providerHardCap:false
    })};
  const now="2026-10-28T08:10:00.000Z";
  expect(gate05OnePaidLaunchReceiptChecksV39(run,jobs,[proof],m,head,now)).toBe(true);
  expect(gate05OnePaidLaunchReceiptChecksV39(
    {...run,path:".github/workflows/phase3-gate05-science-exact-owned-stop.yml"},
    jobs,[proof],m,head,now)).toBe(false);
  expect(gate05OnePaidLaunchReceiptChecksV39(
    {...run,status:"completed"},jobs,[proof],m,head,now)).toBe(false);
  expect(gate05OnePaidLaunchReceiptChecksV39(
    run,jobs,[{...proof,created_at:"2026-10-28T07:40:00.000Z"}],
    m,head,now)).toBe(false);
 });
 it("converts pre-intent database disconnect into safe identity-checked select retry",()=>{
  for(const t of [
   'c.on("error"', 'GATE05_PG_CONNECTION_INTERRUPTED_RECONCILE_BEFORE_PAID',
   'const precreateSelect=async', 'RECONNECTED_DB_IDENTITY_DRIFT',
   'if(providerAttempted||commitAttempted||existsSync(INTENT))',
   'await reconnectBeforeCreate()', 'precreateSelect(OWNER',
   'const rearmPreparedCallback=async()', 'if(lastCallback.rowCount===0)',
   'await rearmPreparedCallback()', 'maxDeliveryRetries:0', 'noBlindCreateRetry:true',
   'ONE_CREATE_ATTEMPT_IMMINENT_DO_NOT_REPEAT'
  ])expect(paid).toContain(t);
  expect(paid).not.toContain("maxDeliveryRetries:12");
  expect(paid.split("await rearmPreparedCallback()").length-1).toBe(2);
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
