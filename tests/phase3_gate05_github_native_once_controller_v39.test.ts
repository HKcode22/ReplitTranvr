import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 gate05GithubOwnerTimeAdmitV39,gate05GithubStopIsReallyLiveV39
} from "../scripts/v39_gate05_github_owner_controller_once_v39";
const controller=readFileSync(
 "scripts/v39_gate05_github_owner_controller_once_v39.ts","utf8");
const bootstrap=readFileSync(
 "scripts/v39_gate05_science_recommission_after_zero_create_v39.ts","utf8");
const wf=readFileSync(
 ".github/workflows/phase3-gate05-github-automated-onepilot.yml","utf8");
const stop=readFileSync(
 ".github/workflows/phase3-gate05-science-exact-owned-stop.yml","utf8");
const start=Date.parse("2026-10-28T06:00:00.000Z");
const end=start+3600000;
const head="1".repeat(40),scope="98bbf760-6211-4eaa-908c-240be91e7b0d";
const live={head_sha:head,event:"workflow_dispatch",run_attempt:1,
 status:"in_progress",display_title:"Gate05 Science STOP "+scope};
const jobs={jobs:[{name:"exact-owned-stop",status:"in_progress",
 steps:[{name:"Run independently authorized exact-owned STOP, never CREATE",
 status:"in_progress"}]}]};
describe("GitHub-only Gate05 one-use controller, no Replit Shell",()=>{
 it("does not permit too-early, expired or non-60m provider authorization",()=>{
  expect(()=>gate05GithubOwnerTimeAdmitV39(start-60*60000,start,end,"dispatch")).not.toThrow();
  expect(()=>gate05GithubOwnerTimeAdmitV39(start-10*60000,start,end,"dispatch")).toThrow();
  expect(()=>gate05GithubOwnerTimeAdmitV39(start-90*60000,start,end,"dispatch")).toThrow();
  expect(()=>gate05GithubOwnerTimeAdmitV39(start-5*60000,start,end,"paid")).not.toThrow();
  expect(()=>gate05GithubOwnerTimeAdmitV39(start+16000,start,end,"paid")).toThrow();
  expect(()=>gate05GithubOwnerTimeAdmitV39(start-5*60000,start,end-60000,"paid")).toThrow();
 });
 it("requires the independent exact STOP step actually in progress",()=>{
  expect(gate05GithubStopIsReallyLiveV39(live,jobs,scope,head,start-3*60000,start)).toBe(true);
  for(const bad of [
   {...live,status:"queued"}, {...live,head_sha:"2".repeat(40)},
   {...live,run_attempt:2},{...live,event:"push"},
   {...live,display_title:"Gate05 Science STOP other"}
  ])expect(gate05GithubStopIsReallyLiveV39(
   bad,jobs,scope,head,start-3*60000,start)).toBe(false);
  expect(gate05GithubStopIsReallyLiveV39(
   live,{jobs:[{name:"exact-owned-stop",status:"waiting"}]},
   scope,head,start-3*60000,start)).toBe(false);
 });
 it("requires original already-approved one-pilot and no repeated CREATE",()=>{
  for(const text of [
    'GATE05_AUTOMATION_APPROVED_ONCE',
    'YES_ONE_WSSS_500_ALERT_12_REST',
    'GITHUB_EVENT_NAME!=="workflow_dispatch"',
    'GITHUB_RUN_ATTEMPT!=="1"',
    'if(existsSync(FILE))hold("PRIOR_NEW_OWNER_INTENT_EXISTS_NO_REPEAT")',
    'recommissionGate05AfterUnbilledWindowV39',
    'NEW_STOP_DISPATCHED_AWAITING_PROTECTED_APPROVAL',
    'gate05GithubStopIsReallyLiveV39',
    'if(existsSync(join(DIR,"one-paid-create-intent.json")))',
    '"EXACT_OWNER_APPROVED_GATE05_ONE_WSSS_500_ALERT_CREATE"',
    'ONE_PAID_OPERATOR_UNCONFIRMED_NO_AUTOMATIC_RETRY',
    'sciencePassed:false'
  ])expect(controller).toContain(text);
  expect(controller).not.toContain("setInterval(");
  expect(controller).not.toContain("deleteSubscriptionVerifiedStrict(");
  expect(controller).not.toContain("createGate4SingleWithRawReceiptV39(");
 });
 it("GitHub runner independently proves old paid failure without Replit home files",()=>{
  expect(bootstrap).toContain('process.env.GITHUB_ACTIONS==="true"');
  expect(bootstrap).toContain('process.env.GITHUB_EVENT_NAME==="workflow_dispatch"');
  expect(bootstrap).toContain("PRIOR_REPLIT_FILES_UNEXPECTED");
  expect(bootstrap).toContain("6458844605");
  expect(bootstrap).toContain("6459454399");
  expect(bootstrap).toContain("providerCreateWasAttempted=false");
  expect(bootstrap).toContain("OLD_OPERATOR_GITHUB_EVIDENCE_NOT_VERIFIED");
  expect(bootstrap).toContain("PRIOR_OWNER_ZERO_PROVIDER_SETTLEMENT_NOT_PROVEN");
  expect(bootstrap).toContain("PRIOR_LOGGED_OWNER_NOT_UNBILLED_PREPARED");
  expect(bootstrap).toContain("GITHUB_ISSUE_LOGGED_OWNER_STOP_PROVIDER");
 });
 it("uses one protected GitHub click rather than push/cron or Replit shell",()=>{
  expect(wf).toContain("workflow_dispatch:");
  expect(wf).not.toMatch(/^\s+schedule:/m);
  expect(wf).not.toMatch(/^\s+push:/m);
  expect(wf).toContain("environment: phase2g-paid");
  expect(wf).toContain("secrets.GATE05_AUTOMATION_DATABASE_URL");
  expect(wf).toContain("secrets.GATE05_GH_ADMIN_TOKEN");
  expect(wf).toContain("secrets.V39_DATABASE_RUNTIME_URL");
  expect(wf).toContain("secrets.AERODATABOX_WEBHOOK_SECRET");
  expect(wf).toContain("scripts/v39_gate05_github_owner_controller_once_v39.ts");
  expect(wf).not.toContain("replit dev");
 });
 it("permits early protected review, waits GitHub UTC to T-10 before actual STOP",()=>{
  expect(stop).toContain("Wait on GitHub clock until T-10 minutes");
  expect(stop).toContain("while(Date.now()<start-10*60000)");
  expect(stop).toContain("Run independently authorized exact-owned STOP, never CREATE");
  expect(stop).toContain("environment: gate05-safety");
  expect(stop).not.toContain("GATE05_PROVIDER_CREATE_ALLOWED: true");
 });
});
