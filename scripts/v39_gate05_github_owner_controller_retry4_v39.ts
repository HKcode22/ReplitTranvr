/**
 * Gate05 one-shot GitHub Actions owner controller. No Replit Shell, local
 * timers, cron drift or recurring provider calls. Authenticated GitHub
 * workflow_dispatch + protected phase2g-paid environment only.
 *
 * REQUIRES one-time GitHub environment secrets (never printed):
 *   GATE05_AUTOMATION_DATABASE_URL (live production owner PostgreSQL)
 *   GATE05_GH_ADMIN_TOKEN (HKcode22 identity; repo env variables/secrets
 *       plus Actions workflow dispatch rights)
 * Existing phase2g-paid secrets:
 *   V39_DATABASE_RUNTIME_URL, AERODATABOX_API_KEY,
 *   AERODATABOX_WEBHOOK_SECRET.
 *
 * The independently protected gate05-safety STOP receives ONLY its
 * separately commissioned read-only role. GitHub owner automatically
 * submits the exact protected deployment review using its existing admin
 * identity; GitHub policy still decides whether it is an eligible reviewer.
 * Fail closed on denied review/arming by T-5m; no Replit shell timing.
 *
 * Only ONE CREATE operator invocation, no repeat even on ambiguity.
 */
import "dotenv/config";
import {readFileSync,statSync,existsSync} from "node:fs";
import {join} from "node:path";
import {homedir} from "node:os";
import {execFileSync,spawnSync} from "node:child_process";
import {recommissionGate05AfterFourthUnbilledWatchV39}
 from "./v39_gate05_science_recommission_after_fourth_failed_watch_v39";

const REPO="HKcode22/ReplitTranvr";
const WORKFLOW="phase3-gate05-science-exact-owned-stop-retry4.yml";
const DIR=join(homedir(),".config","replittranvr","gate05-science-retry4");
const FILE=join(DIR,"recovery-before-commit.json");
const STOP_NAME=(scope:string)=>"Gate05 Science STOP "+scope;
const SHA=/^[0-9a-f]{40}$/;
const HASH=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const hold=(m:string):never=>{throw Error("GATE05_ACTIONS_OWNER_HOLD_"+m);};
let paidOperatorInvoked=false;
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
function gh(args:string[]):string{
  const x=execFileSync("gh",args,{
   encoding:"utf8",timeout:20000,maxBuffer:2*1024*1024,
   stdio:["ignore","pipe","ignore"]
  });return x;
}
function json(args:string[]):any{
 try{return JSON.parse(gh(args));}catch{return hold("GH_JSON_INVALID");}
}
export function gate05GithubOwnerTimeAdmitV39(
 now:number,start:number,stop:number,stage:"dispatch"|"paid"
):void{
 if(![now,start,stop].every(Number.isFinite)||stop-start!==3600000)
   hold("FROZEN_HOUR_INVALID");
 if(stage==="dispatch"&&
    (now>=start-11*60000||now<start-85*60000))
   hold("NOT_ENOUGH_TIME_FOR_SEPARATE_STOP_APPROVAL");
 if(stage==="paid"&&(now<start-9*60000||now>start+15000))
   hold("PAID_CUTOFF_OR_TOO_EARLY");
}
export function gate05GithubStopIsReallyLiveV39(
 run:any,jobs:any,scope:string,head:string,now:number,start:number
):boolean{
 return run?.head_sha===head&&run?.event==="workflow_dispatch"&&
  run?.run_attempt===1&&run?.display_title===STOP_NAME(scope)&&
  run?.status==="in_progress"&&
  Math.abs(now-start)<5*60000&&
  jobs?.jobs?.some((j:any)=>
    j.name==="exact-owned-stop"&&j.status==="in_progress"&&
    j.steps?.some((s:any)=>
      s.name==="Run independently authorized exact-owned STOP, never CREATE"&&
      s.status==="in_progress"));
}
function requireAutomatedOwnerAuth(head:string){
 if(process.env.GITHUB_ACTIONS!=="true"||
    process.env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    process.env.GITHUB_REF!=="refs/heads/main"||
    process.env.GITHUB_SHA!==head||
    process.env.GITHUB_RUN_ATTEMPT!=="1"||
    process.env.GATE05_AUTOMATION_APPROVED_ONCE!=="YES_ONE_WSSS_500_ALERT_12_REST"||
    !SHA.test(head)||!process.env.GH_TOKEN||
    !process.env.DATABASE_URL||
    !process.env.V39_DATABASE_RUNTIME_URL||
    !process.env.AERODATABOX_API_KEY||
    !process.env.AERODATABOX_WEBHOOK_SECRET)
   hold("REVIEWED_ACTIONS_OWNER_ENVIRONMENT_NOT_READY");
 if(json(["api","user"])?.login!=="HKcode22")
   hold("GITHUB_ADMIN_IDENTITY_INVALID");
 if(json(["api",`repos/${REPO}/git/ref/heads/main`])?.object?.sha!==head)
   hold("GITHUB_MAIN_MOVED");
 if(execFileSync("git",["rev-parse","HEAD"],{
   encoding:"utf8",stdio:["ignore","pipe","ignore"]
 }).trim()!==head)hold("CHECKOUT_HEAD_NOT_PINNED");
 if(existsSync(FILE))hold("PRIOR_NEW_OWNER_INTENT_EXISTS_NO_REPEAT");
}
async function main(){
 const head=String(process.env.GITHUB_SHA??"");
 requireAutomatedOwnerAuth(head);
 // Source-reviewed existing atomic commission checks original ZERO billed
 // safety run; closes only old PREPARED/null provider owner; creates new
 // signed scope and guard credentials in a single DB transaction.
 // All GitHub variable/secrets setup is done from GH_TOKEN, not GITHUB_TOKEN.
 await recommissionGate05AfterFourthUnbilledWatchV39({
   head,confirm:"REVIEWED_GATE05_NO_PAID_EXPIRED_OWNER_FORWARD_RECOMMISSION"
 });
 if(!existsSync(FILE)||(statSync(FILE).mode&0o077)!==0)
   hold("FRESH_COMMISSION_FILE_NOT_PRIVATE");
 const m=JSON.parse(readFileSync(FILE,"utf8"));
 if(m.schema!=="v39.gate05.science-private-one-use-commission.v1"||
    m.source!==head||
    m.receiver!=="1885703c04ba8f24bf8d1183f873eb86d1f83d7c"||
    !UUID.test(m.scope)||!HASH.test(m.authorizationSha256)||
    !HASH.test(m.stopTicketSha256)||m.startingCredits!==1981||
    m.priorClosedScope!=="c631e164-feac-4550-b811-7585e88aaf0d")
   hold("NEW_COMMISSION_IDENTITY_INVALID");
 const start=Date.parse(m.startUtc),stop=Date.parse(m.stopUtc);
 gate05GithubOwnerTimeAdmitV39(Date.now(),start,stop,"dispatch");
 const previous=json(["api",`repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=100`]);
 if(previous?.workflow_runs?.some((r:any)=>r.display_title===STOP_NAME(m.scope)))
   hold("STOP_ALREADY_DISPATCHED");
 const fields={
  confirmation:"WATCH_GATE05_SCIENCE_500_STOP_NO_CREATE",
  runner_sha:head,receiver_sha:m.receiver,scope_id:m.scope,
  authorization_sha256:m.authorizationSha256,
  stop_ticket_sha256:m.stopTicketSha256,
  start_utc:m.startUtc,stop_utc:m.stopUtc,
  starting_credits:String(m.startingCredits)
 };
 const args=["workflow","run",WORKFLOW,"--repo",REPO,"--ref","main"];
 for(const [k,v] of Object.entries(fields))args.push("-f",`${k}=${v}`);
 gh(args);
 console.log(JSON.stringify({
  schema:"v39.gate05.github-owned-science-controller.v1",
  status:"NEW_STOP_DISPATCHED_AWAITING_PROTECTED_APPROVAL",
  scope:m.scope,startUtc:m.startUtc,stopUtc:m.stopUtc,
  paidProviderCreateCalls:0,
  approval:"GitHub owner controller requests the normal exact protected STOP review automatically"
 }));
 const cutoff=start-4*60000;
 let stopRunId:number|null=null;
 let protectedReviewSubmitted=false;
 while(Date.now()<cutoff){
  const runs=json(["api",`repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=100`]);
  const matching=(runs.workflow_runs??[]).filter((r:any)=>
    r.display_title===STOP_NAME(m.scope)&&r.head_sha===head&&
    r.event==="workflow_dispatch"&&r.run_attempt===1);
  if(matching.length>1)hold("DUPLICATE_NEW_STOP");
  if(matching.length===1){
   const r=matching[0];
   if(r.status==="completed")hold("NEW_INDEPENDENT_STOP_TERMINATED_EARLY");
   stopRunId=Number(r.id);
  }
  if(stopRunId!==null){
   const run=json(["api",`repos/${REPO}/actions/runs/${stopRunId}`]);
   // The GitHub owner controller—not the Replit shell—performs the user's
   // ordinary scoped deployment review with its already-authorized GH token.
   // GitHub reviewer permissions, including prevent-self-review, still apply.
   if(run.status==="waiting"&&!protectedReviewSubmitted){
    const envScope=json(["api",
      `repos/${REPO}/environments/gate05-safety/variables/GATE05_SAFETY_APPROVED_SCOPE`]);
    const envSource=json(["api",
      `repos/${REPO}/environments/gate05-safety/variables/GATE05_SAFETY_APPROVED_RUNNER_SHA`]);
    if(envScope?.value!==m.scope||envSource?.value!==head)
      hold("AUTO_REVIEW_ENVIRONMENT_SCOPE_OR_SOURCE_DRIFT");
    const pending=json(["api",
      `repos/${REPO}/actions/runs/${stopRunId}/pending_deployments`]);
    const matches=(Array.isArray(pending)?pending:[]).filter((x:any)=>
      x.environment?.name==="gate05-safety");
    if(matches.length>1)hold("AUTO_REVIEW_MULTIPLE_PENDING_ENVIRONMENTS");
    if(matches.length===1){
     if(matches[0].current_user_can_approve!==true)
       hold("AUTO_REVIEW_GITHUB_POLICY_DENIES_REVIEW");
     const envId=Number(matches[0].environment.id);
     if(!Number.isSafeInteger(envId)||envId<1)
       hold("AUTO_REVIEW_INVALID_ENVIRONMENT_ID");
     // ONE native review request, no protection bypass or mutation of rules.
     // Ambiguous POST outcome is terminal, never blindly retried.
     const approved=json(["api","-X","POST",
       `repos/${REPO}/actions/runs/${stopRunId}/pending_deployments`,
       "-f","state=approved",
       "-f","comment=Owner's one-command approval for exact Gate05 independent STOP",
       "-F",`environment_ids[]=${envId}`]);
     if(!Array.isArray(approved)||approved.length<1)
       hold("AUTO_REVIEW_APPROVAL_UNCONFIRMED");
     protectedReviewSubmitted=true;
     console.log(JSON.stringify({
       status:"GATE05_SAFETY_EXACT_GITHUB_PROTECTED_REVIEW_APPROVED",
       scope:m.scope,safetyRunId:stopRunId,noProviderCreate:true
     }));
    }
   }
   const jobs=json(["api",`repos/${REPO}/actions/runs/${stopRunId}/jobs?per_page=100`]);
   if(gate05GithubStopIsReallyLiveV39(run,jobs,m.scope,head,Date.now(),start)){
    // The paid operator itself REQUIRES bot's independent exact ARMED
    // receipt and repeats safety checks immediately before provider POST.
    break;
   }
  }
  await sleep(7000);
 }
 if(stopRunId===null)hold("NO_GITHUB_STOP_RUN_OBSERVED");
 if(Date.now()>cutoff)hold("STOP_NOT_ARMED_BEFORE_CREATE_DEADLINE");
 while(Date.now()<start-9*60000){
  await sleep(Math.min(1000,start-9*60000-Date.now()));
 }
 gate05GithubOwnerTimeAdmitV39(Date.now(),start,stop,"paid");
 const r=json(["api",`repos/${REPO}/actions/runs/${stopRunId}`]);
 const j=json(["api",`repos/${REPO}/actions/runs/${stopRunId}/jobs?per_page=100`]);
 if(!gate05GithubStopIsReallyLiveV39(r,j,m.scope,head,Date.now(),start))
   hold("STOP_NOT_LIVE_AT_PAID_GATE");
 if(existsSync(join(DIR,"one-paid-create-intent.json")))
   hold("PREEXISTING_PAID_INTENT_NO_RETRY");
 console.log(JSON.stringify({
   schema:"v39.gate05.github-owned-science-controller.v1",
   status:"INDEPENDENT_STOP_LIVE_ONE_PAID_OWNER_INVOKE",
   scope:m.scope,safetyRunId:stopRunId,
   noProviderHardCreditCap:true
 }));
 // One and ONLY ONE paid invocation. No retries: child writes fsynced
 // intent before non-idempotent provider CREATE, then exact owner receipt.
 paidOperatorInvoked=true;
 const result=spawnSync("node",[
   "--import","tsx","scripts/v39_gate05_science_one_paid_create_once_retry4_v39.ts",
   "--head",head,"--safety-run",String(stopRunId),
   "--confirm","EXACT_OWNER_APPROVED_GATE05_ONE_WSSS_500_ALERT_CREATE"
 ],{
   encoding:"utf8",stdio:"inherit",timeout:720000,
   env:process.env
 });
 if(result.error||result.status!==0)
   hold("ONE_PAID_OPERATOR_UNCONFIRMED_NO_AUTOMATIC_RETRY");
 console.log(JSON.stringify({
   schema:"v39.gate05.github-owned-science-controller.v1",
   status:"ONE_PAID_OPERATOR_RETURNED_ZERO_EXIT_STOP_CONTINUES_ON_INDEPENDENT_GITHUB_RUN",
   safetyRunId:stopRunId,scope:m.scope,
   sciencePassed:false,exactProviderSettlementNotYetProven:true
 }));
}
if(process.argv[1]?.endsWith("v39_gate05_github_owner_controller_retry3_v39.ts"))
 void main().catch(error=>{
   console.error(JSON.stringify({
     status:"GATE05_GITHUB_CONTROLLER_HELD_DO_NOT_RERUN",
     reason:error instanceof Error?error.message:"UNKNOWN",
     paidOperatorInvoked,
     providerCreateOutcomeUnconfirmed:paidOperatorInvoked,
     noProviderCreateFromThisControllerIfNotInvoked:!paidOperatorInvoked,
     ownerScienceNotPassed:true
   }));
   process.exitCode=2;
 });
