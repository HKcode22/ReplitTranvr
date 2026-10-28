import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {describe,it,expect} from "vitest";
import {gate05OnePaidLaunchReceiptChecksV39} from
 "../scripts/v39_gate05_science_one_paid_create_once_retry5_v39";
import {gate05GithubStopIsReallyLiveV39} from
 "../scripts/v39_gate05_github_owner_controller_retry5_v39";
import {gate05SciencePlanWindowV39,hasExactGate05PaidIntentV39} from
 "../scripts/v39_gate05_science_recommission_after_fifth_failed_watch_v39";

const p="scripts/";
const paid=readFileSync(p+"v39_gate05_science_one_paid_create_once_retry5_v39.ts","utf8");
const ctl=readFileSync(p+"v39_gate05_github_owner_controller_retry5_v39.ts","utf8");
const recover=readFileSync(p+"v39_gate05_science_recommission_after_fifth_failed_watch_v39.ts","utf8");
const stopWorkflow=readFileSync(".github/workflows/phase3-gate05-science-exact-owned-stop-retry5.yml","utf8");
const ownerWorkflow=readFileSync(".github/workflows/phase3-gate05-github-automated-retry5.yml","utf8");

const head="a".repeat(40);
const scope="9a2a2958-4c48-431b-a95e-1681f907012d";
const receiver="1885703c04ba8f24bf8d1183f873eb86d1f83d7c";
const start=Date.parse("2026-10-28T11:30:00.000Z");
const meta={
 scope,receiver,authorizationSha256:"b".repeat(64),stopTicketSha256:"c".repeat(64),
 stopUtc:new Date(start+3600000).toISOString()
};
const workflow=".github/workflows/phase3-gate05-science-exact-owned-stop-retry5.yml";
const run={status:"in_progress",head_sha:head,head_branch:"main",
 event:"workflow_dispatch",run_attempt:1,path:workflow,
 display_title:"Gate05 Science STOP "+scope};
const jobs={jobs:[{name:"exact-owned-stop",status:"in_progress",
 steps:[{name:"Run independently authorized exact-owned STOP, never CREATE",
 status:"in_progress"}]}]};
const now=new Date(start-9*60000).toISOString();
const proof={body:JSON.stringify({
 schema:"v39.gate05.science-actions-stop-armed.v1",
 status:"LIVE_STOP_WATCH_ARMED_NO_PROVIDER_CREATE",
 scope,runner:head,receiver,stopUtc:meta.stopUtc,
 softCreditStop:350,providerHardCap:false
}),created_at:new Date(start-9*60000-8000).toISOString(),
 user:{login:"github-actions[bot]"}};
const accept=(r:any=run,j:any=jobs,x:any[]= [proof],t=now)=>
 gate05OnePaidLaunchReceiptChecksV39(r,j,x,meta,head,t);

describe("retry5 exact named STOP paid handoff — full real validator fixtures",()=>{
 it("admits exactly the reviewed retry5 STOP and fresh authenticated ARMED receipt",()=>{
  expect(accept()).toBe(true);
  expect(gate05GithubStopIsReallyLiveV39(
    run,jobs,scope,head,start-9*60000,start)).toBe(true);
 });
 it("rejects the exact stale retry3/retry4 and suffix substitution paths",()=>{
  for(const wrong of [
   ".github/workflows/phase3-gate05-science-exact-owned-stop.yml",
   ".github/workflows/phase3-gate05-science-exact-owned-stop-retry4.yml",
   workflow+".extra",
   "workflows/phase3-gate05-science-exact-owned-stop-retry5.yml"
  ]){
   expect(accept({...run,path:wrong})).toBe(false);
   expect(gate05GithubStopIsReallyLiveV39(
     {...run,path:wrong},jobs,scope,head,start-9*60000,start)).toBe(false);
  }
  expect(paid).toContain('run.path==="'+workflow+'"');
  expect(paid).not.toContain('run.path.includes("phase3-gate05-science-exact-owned-stop.yml")');
 });
 it("rejects non-live, wrong scope/sha, bad or missing safety step",()=>{
  expect(accept({...run,status:"completed"})).toBe(false);
  expect(accept({...run,head_sha:"0".repeat(40)})).toBe(false);
  expect(accept({...run,display_title:"Gate05 Science STOP other"})).toBe(false);
  expect(accept(run,{jobs:[]})).toBe(false);
  expect(accept(run,jobs,[])).toBe(false);
  expect(accept(run,jobs,[{...proof,user:{login:"attacker"}}])).toBe(false);
  expect(accept(run,jobs,[{...proof,body:JSON.stringify({
    ...JSON.parse(proof.body),scope:"another"
  })}])).toBe(false);
  expect(accept(run,jobs,[{...proof,created_at:new Date(start-60*60000).toISOString()}])).toBe(false);
 });
 it("requires recovered old controller complete and no paid CREATE evidence",()=>{
  for(const fragment of [
   'const PRIOR_SCOPE="9a2a2958-4c48-431b-a95e-1681f907012d"',
   'const PRIOR_CONTROLLER_RUN="40662211602"',
   'const PRIOR_STOP_RUN="40662357140"',
   'const PRIOR_SOURCE="09de69dfa3ea691dd9bb8f3e26210bbe3c72e366"',
   'priorRun?.conclusion!=="cancelled"',
   'paidFailure.providerCreateWasAttempted!==false',
   'paidFailure.databaseCommitMayBeAmbiguous!==false',
   'RETRY5_PRIOR_PAID_INTENT_FOUND_NO_REUSE',
   'q.state!=="PREPARED"||q.provider_subscription_id!==null',
   'CREDIT_BALANCE_NOT_STABLE_AFTER_NO_PAID_WINDOW',
   'FOREIGN_ACTIVE_PROVIDER'
  ])expect(recover).toContain(fragment);
  expect(hasExactGate05PaidIntentV39([{body:JSON.stringify({
   schema:"v39.gate05.science-paid-create-intent.v1",
   status:"ONE_CREATE_ATTEMPT_IMMINENT_DO_NOT_REPEAT",scope
  })}],scope)).toBe(true);
  expect(hasExactGate05PaidIntentV39([{body:"Plain incident note with "+scope}],scope)).toBe(false);
 });
 it("runs fifth CLI rather than an accidental no-op and keeps automated GitHub-only paths",()=>{
  expect(ctl).toContain('endsWith("v39_gate05_github_owner_controller_retry5_v39.ts")');
  expect(ctl).toContain("v39_gate05_science_one_paid_create_once_retry5_v39.ts");
  expect(ownerWorkflow).toContain("v39_gate05_github_owner_controller_retry5_v39.ts");
  // The old one-use retry5 paid CREATE controller remains historical
  // (it is job-disabled), while the EXISTING independent STOP action
  // deliberately advances its control-plane resilience to retry6.
  expect(stopWorkflow).toContain("v39_gate05_science_exact_owned_actions_stop_retry6_v39.ts");
  expect(stopWorkflow).not.toContain(
    "node --import tsx scripts/v39_gate05_science_exact_owned_actions_stop_retry5_v39.ts");
  expect(readFileSync(p+"v39_gate05_science_exact_owned_actions_stop_retry5_v39.ts","utf8"))
    .toContain("v39_gate05_science_exact_owned_actions_stop_retry5_v39.ts");
  const child=spawnSync(process.execPath,[
   "--import","tsx","scripts/v39_gate05_github_owner_controller_retry5_v39.ts"
  ],{encoding:"utf8",timeout:20000,
   env:{...process.env,GITHUB_ACTIONS:"",GITHUB_SHA:"",GH_TOKEN:"",
     DATABASE_URL:"",AERODATABOX_API_KEY:"",V39_DATABASE_RUNTIME_URL:""}});
  expect(child.error).toBeUndefined();
  expect(child.status).toBe(2);
  expect(child.stderr).toContain("GATE05_GITHUB_CONTROLLER_HELD_DO_NOT_RERUN");
 });
 it("preserves prospective 60min cohort and source-qualified non-hard 350 credit STOP",()=>{
  const w=gate05SciencePlanWindowV39(Date.parse("2026-10-28T11:01:00Z"));
  expect(Date.parse(w.stop)-Date.parse(w.start)).toBe(3600000);
  expect(Date.parse(w.start)-Date.parse("2026-10-28T11:01:00Z")).toBeGreaterThanOrEqual(20*60000);
  expect(paid).toContain("providerAttempted=true");
  expect(paid).toContain("maxDeliveryRetries:0");
  expect(stopWorkflow).toContain("GATE05_SAFETY_APPROVED_LIMIT");
  expect(ownerWorkflow).not.toMatch(/^\s+schedule:/m);
 });
});
