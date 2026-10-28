/**
 * ONE operator command, NOT a scheduler.
 * Creates one GitHub-only Gate05 run and, using the same authenticated
 * human GitHub CLI identity, submits review for THAT exact independently
 * pinned gate05-safety STOP deployment. After approval all timing happens on
 * GitHub. Never removes reviewers or environment protection, never performs
 * provider GET/CREATE/DELETE or accesses database secrets.
 *
 * If protection rules prohibit self-review, FAIL CLOSED with the GitHub
 * error. No hidden bypass, no second run, no auto-spending from a push.
 */
import {execFileSync} from "node:child_process";

const REPO="HKcode22/ReplitTranvr";
const WORKFLOW="phase3-gate05-github-automated-retry3.yml";
const STOP="phase3-gate05-science-exact-owned-stop.yml";
const CONFIRM="RUN_ALREADY_APPROVED_WSSS_ONCE_GITHUB_AUTOMATED";
const SHA=/^[0-9a-f]{40}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function gh(args,input){
  return execFileSync("gh",args,{
    encoding:"utf8",input,timeout:20000,maxBuffer:2*1024*1024,
    stdio:["pipe","pipe","pipe"]
  }).trim();
}
const get=p=>JSON.parse(gh(["api",p]));
const hold=reason=>{throw Error("GATE05_ONE_COMMAND_HOLD_"+reason);};
const runs=name=>get(`repos/${REPO}/actions/workflows/${name}/runs?per_page=30`)
  .workflow_runs??[];

async function main(){
  if(process.argv.length>2)hold("NO_ARGUMENTS");
  const current=get(`repos/${REPO}/git/ref/heads/main`).object?.sha;
  if(!SHA.test(current))hold("MAIN_SOURCE_NOT_PINNED");
  const person=get("user").login;
  if(person!=="HKcode22")hold("GITHUB_OPERATOR_IDENTITY");
  const env=get(`repos/${REPO}/environments/gate05-safety`);
  const reviewerRules=(env.protection_rules??[])
    .filter(p=>p.type==="required_reviewers");
  if(reviewerRules.length!==1||!reviewerRules[0].reviewers?.length)
    hold("PROTECTED_REVIEWER_RULE_NOT_PRESENT");
  if(runs(WORKFLOW).some(r=>r.status!=="completed"))
    hold("ANOTHER_OWNER_CONTROLLER_IS_ACTIVE");
  const oldIds=new Set(runs(WORKFLOW).map(r=>Number(r.id)));
  // Exactly one user-selected dispatch; no shell-timer for paid flight work.
  gh(["workflow","run",WORKFLOW,"--repo",REPO,"--ref","main",
      "-f","confirmation="+CONFIRM]);
  console.log("GATE05_NEW_GITHUB_CONTROLLER_DISPATCHED");
  let controller;
  for(let i=0;i<30;i++){
    const candidates=runs(WORKFLOW).filter(r=>
      !oldIds.has(Number(r.id))&&r.head_sha===current&&
      r.event==="workflow_dispatch"&&r.run_attempt===1&&
      r.actor?.login===person);
    if(candidates.length>1)hold("DUPLICATE_NEW_CONTROLLER");
    if(candidates.length===1){controller=candidates[0];break;}
    await sleep(3000);
  }
  if(!controller)hold("NEW_CONTROLLER_NOT_VISIBLE");
  console.log("GATE05_CONTROLLER_URL="+controller.html_url);
  const oldStopIds=new Set(runs(STOP)
    .filter(r=>new Date(r.created_at)<new Date(controller.created_at))
    .map(r=>Number(r.id)));
  for(let i=0;i<70;i++){
    const latest=get(`repos/${REPO}/actions/runs/${controller.id}`);
    if(latest.status==="completed")hold("NEW_CONTROLLER_TERMINATED_BEFORE_STOP_REVIEW");
    // The reviewer environment variables are written by the new controller
    // as part of exact LOGGED owner commission, never by this launcher.
    let scope;
    try{
      scope=get(`repos/${REPO}/environments/gate05-safety/variables/GATE05_SAFETY_APPROVED_SCOPE`).value;
    }catch{await sleep(3000);continue;}
    if(!UUID.test(scope))hold("APPROVED_STOP_SCOPE_INVALID");
    const matches=runs(STOP).filter(r=>
      !oldStopIds.has(Number(r.id))&&
      r.display_title==="Gate05 Science STOP "+scope&&
      r.head_sha===current&&r.event==="workflow_dispatch"&&
      r.run_attempt===1);
    if(matches.length>1)hold("DUPLICATE_NEW_STOP");
    if(matches.length===0){await sleep(3000);continue;}
    const run=matches[0];
    if(run.status==="completed")hold("STOP_TERMINATED_BEFORE_PROTECTED_REVIEW");
    if(run.status==="in_progress"){
      console.log("GATE05_STOP_ALREADY_STARTED_URL="+run.html_url);
      return;
    }
    const pending=get(`repos/${REPO}/actions/runs/${run.id}/pending_deployments`);
    const target=pending.filter(d=>d.environment?.name==="gate05-safety");
    if(target.length>1)hold("MULTIPLE_PROTECTED_DEPLOYMENTS");
    if(target.length===0){await sleep(3000);continue;}
    const envId=Number(target[0].environment.id);
    if(!Number.isSafeInteger(envId)||envId<1)hold("INVALID_ENVIRONMENT_ID");
    const approval={
      environment_ids:[envId],state:"approved",
      comment:"Owner's one-command approval for this exact Gate05 independent STOP; preserve separate exact-ID budget controls"
    };
    // Uses only the user's existing GitHub review permission.
    // Github rejects forbidden self-review rather than bypassing it.
    const result=JSON.parse(gh([
      "api","-X","POST",
      `repos/${REPO}/actions/runs/${run.id}/pending_deployments`,
      "--input","-"
    ],JSON.stringify(approval)));
    if(!Array.isArray(result)||result.length<1)
      hold("REVIEW_POST_RESULT_UNVERIFIED");
    console.log("GATE05_EXACT_STOP_GITHUB_REVIEW_SUBMITTED_URL="+run.html_url);
    console.log("GATE05_GITHUB_OWNS_FUTURE_UTC_AND_PAID_CREATE_NO_REPLIT_TIMING");
    return;
  }
  hold("STOP_APPROVAL_NOT_AVAILABLE_NO_REPEAT_DISPATCH");
}
await main().catch(err=>{
  console.error(err instanceof Error?err.message:"GATE05_ONE_COMMAND_UNKNOWN_HOLD");
  process.exitCode=2;
});
