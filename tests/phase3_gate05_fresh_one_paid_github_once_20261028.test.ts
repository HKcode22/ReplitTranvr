import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

const workflow=readFileSync(
  ".github/workflows/phase3-gate05-fresh-science-owner-no-provider.yml","utf8");
const paid=readFileSync(
  "scripts/v39_gate05_science_one_paid_create_newscope_20261028_v39.ts","utf8");
const dispatch=readFileSync(
  "scripts/v39_gate05_dispatch_newscope_independent_stop_20261028.mjs","utf8");
const consent=
  "AUTHORIZE_NEW_WSSS_ONE_ALERT_CREATE_350_SOFT_STOP_500_PLANNING_12_REST_ACK_OVERSHOOT_AND_1900_FLOOR_OVERRIDE";
describe("Gate05 new source-bound GitHub ONE paid CREATE after independent STOP",()=>{
  it("defaults to NO_SPEND and requires new, explicit, protected consent",()=>{
    expect(workflow).toContain("fresh_paid_confirmation:");
    expect(workflow).toContain("default: NO_NEW_PAID_SPEND");
    expect(workflow).toContain(consent);
    expect(workflow).toContain("needs.one-new-owner-and-protected-stop.result == 'success'");
    expect(workflow).toContain("needs.dispatch-independent-retry6-stop-no-provider.result == 'success'");
    expect(workflow).toContain("inputs.fresh_paid_confirmation == '"+consent+"'");
    expect(workflow).not.toMatch(/\n {2}(?:push|schedule):|cron:/);
    expect(workflow).toContain("environment: phase2g-paid");
    expect(workflow).toContain("GITHUB_RUN_ATTEMPT");
    expect(paid).toContain('process.env.GITHUB_RUN_ATTEMPT!=="1"');
    expect(paid).toContain("process.env.GATE05_FRESH_FINANCIAL_AUTH!==CONFIRM");
    expect(paid).toContain('CONFIRM="'+consent+'"');
  });
  it("does not replay old paid private file or retired receiver and one-time authorization",()=>{
    expect(paid).not.toContain("recovery-before-commit.json");
    expect(paid).not.toContain("gate05-science-retry5");
    expect(paid).not.toContain("1885703c04ba8f24bf8d1183f873eb86d1f83d7c");
    expect(paid).toContain("84b7f1565d0402facc8c3b9aacedc599eb6e2af1");
    expect(paid).toContain("freshSourceBoundCommission(head)");
    expect(paid).toContain("rejectPreviouslySpentGithubIntent(m.scope)");
    expect(paid).toContain("PRIOR_GITHUB_PAID_INTENT_NO_NEW_CREATE");
    expect(paid).toContain("GATE05_FRESH_SCOPE");
    expect(paid).toContain("GATE05_FRESH_STOP_TICKET_SHA256");
    expect(paid).toContain("sessionExpiresUtc:new Date(Date.parse(stopUtc)+20*60000).toISOString()");
    expect(paid).toContain("GATE05_FRESH_STARTING_CREDITS");
    expect(paid).toContain('process.env.GITHUB_ACTOR!=="HKcode22"');
    expect(paid).toContain("historicNext4Floor1900WaivedForThisScope:true");
    expect(paid).toContain("providerHardCreditCap:false");
    expect(paid).toContain("newOneUseFinancialConsent:CONFIRM");
    expect(paid).toContain("protectedGithubWorkflowRunId:process.env.GITHUB_RUN_ID");
    expect(paid).toContain('openSync(path,"wx",0o600)');
  });
  it("only permits ONE new provider CREATE after real GitHub independent STOP proof",()=>{
    expect(paid.match(/createGate4SingleWithRawReceiptV39\("WSSS",/g)).toHaveLength(1);
    expect(paid).toContain("LIVE_STOP_WATCH_ARMED_NO_PROVIDER_CREATE");
    expect(paid).toContain('j.name==="exact-owned-stop"');
    expect(paid).toContain('s.status==="in_progress"');
    expect(paid).toContain("github-actions[bot]");
    expect(paid).toContain("liveSafety(input.stopRun,m,head)");
    expect(paid).toContain("ONE_CREATE_ATTEMPT_IMMINENT_DO_NOT_REPEAT");
    expect(paid).toContain("providerAttempted=true");
    expect(paid).toContain("noBlindCreateRetry:true");
    expect(paid).toContain("deleteSubscriptionVerifiedStrict(created");
    expect(paid).toContain("maxDeliveryRetries:0");
    expect(paid).not.toContain("refillBalance");
    expect(paid).not.toContain("GATE05_FRESH_ALLOW_AUTORETRY");
    expect(workflow).not.toContain("phase3-gate05-github-automated-retry5.yml");
  });
  it("requires a real STOP run ID, not just a dispatch acknowledgment",()=>{
    expect(dispatch).toContain('appendFileSync(output,"stop_run_id="+String(liveRun)+"\\n"');
    expect(dispatch).toContain("DUPLICATE_STOP_RUN_AMBIGUITY");
    expect(dispatch).toContain("STOP_DISPATCH_NOT_VISIBLE_NO_REPLAY");
    expect(dispatch).toContain("watchRunFound=true");
    expect(dispatch).toContain("independentStopArmed:false");
    expect(workflow).toContain("steps.dispatch.outputs.stop_run_id");
    expect(workflow).toContain("needs.dispatch-independent-retry6-stop-no-provider.outputs.stop_run_id");
    expect(workflow).toContain("FROZEN_T_GITHUB_PAID_PREFLIGHT_CLOCK_HOLD");
    expect(workflow).toContain("start-8*60000");
  });
  it("does not misclassify a technically successful one-hour Alert trial as full original science",()=>{
    expect(paid).toContain("strictSciencePassed:false");
    expect(workflow).toContain("T-24h/T-6h/T-90m");
    expect(workflow).toContain("actual vs estimated runway label semantics");
    expect(workflow).toContain("NOT provider enforced hard cap");
    expect(workflow).toContain("No refill");
  });
});