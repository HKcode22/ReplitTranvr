/**
 * Gate05 one-command UNTIMED GitHub launch admission.
 *
 * It uses the owner's existing gh CLI session. NO keys are read, copied,
 * created or printed. Checks only protected environment SECRET NAMES.
 * It never calls AeroDataBox, touches SQL, or starts a Replit timer.
 * If admission passes it dispatches the already-reviewed GitHub owner workflow.
 * The workflow still requires both independent protected approvals and its
 * source-pinned live STOP before the one approved paid provider CREATE.
 *
 * This is intentionally NOT an alternative to the two existing secrets that
 * the current PR212 workflow requires. If absent, fail closed.
 */
import {spawnSync} from "node:child_process";

const REPO = "HKcode22/ReplitTranvr";
const WORKFLOW = "phase3-gate05-github-automated-onepilot.yml";
const MAIN = "a493bd3f197817612a31972e510d4fe79b5b32ea";
const OLD_STOP = "40623244833";
const APPROVAL = "6458170487";
const CONFIRMATION = "RUN_ALREADY_APPROVED_WSSS_ONCE_GITHUB_AUTOMATED";
const REQUIRED = [
  "GATE05_AUTOMATION_DATABASE_URL",
  "GATE05_GH_ADMIN_TOKEN",
  "V39_DATABASE_RUNTIME_URL",
  "AERODATABOX_API_KEY",
  "AERODATABOX_WEBHOOK_SECRET"
];
function hold(message) {
  throw new Error("GATE05_GITHUB_UNTIMED_LAUNCH_HOLD_" + message);
}
function gh(args) {
  const r=spawnSync("gh",args,{
    encoding:"utf8",timeout:20000,maxBuffer:2*1024*1024,
    stdio:["ignore","pipe","pipe"]
  });
  if(r.error || r.status !== 0) hold("GH_API_UNAVAILABLE");
  return r.stdout.trim();
}
function ghJSON(args) {
  try {return JSON.parse(gh(args));}
  catch {return hold("UNEXPECTED_GITHUB_RESPONSE");}
}
const account=ghJSON(["api","user"]);
if(account.login!=="HKcode22")hold("WRONG_OWNER_GITHUB_IDENTITY");
const sha=ghJSON(["api",`repos/${REPO}/git/ref/heads/main`])?.object?.sha;
if(sha!==MAIN)hold("MAIN_CHANGED_REVIEW_FIRST");
const owner=ghJSON(["api",`repos/${REPO}/issues/comments/${APPROVAL}`]);
if(owner?.user?.login!=="HKcode22"||
  !String(owner.body??"").includes("500 Alert")||
  !String(owner.body??"").includes("12 REST"))
  hold("BOUND_OWNER_APPROVAL_NOT_VERIFIED");
const stop=ghJSON(["api",`repos/${REPO}/actions/runs/${OLD_STOP}`]);
if(stop.status!=="completed"||stop.conclusion!=="success"||
  stop.run_attempt!==1)
  hold("PREVIOUS_STOP_NOT_COMPLETED");
const history=ghJSON(["api",
  `repos/${REPO}/actions/workflows/${WORKFLOW}/runs?event=workflow_dispatch&per_page=20`
]);
if(!Array.isArray(history.workflow_runs))hold("CANNOT_VERIFY_PRIOR_RUNS");
if(history.total_count!==0)hold("EXISTING_CONTROLLER_DISPATCH_DO_NOT_REPEAT");
const named=ghJSON(["api",
  `repos/${REPO}/environments/phase2g-paid/secrets?per_page=100`
]);
if(!Array.isArray(named.secrets)||named.total_count>named.secrets.length)
  hold("CANNOT_VERIFY_ENVIRONMENT_SECRET_NAMES");
const present=new Set(named.secrets.map(s=>s.name));
const missing=REQUIRED.filter(x=>!present.has(x));
if(missing.length){
  console.log(JSON.stringify({
    status:"HOLD_EXISTING_SECRETS_ABSENT",
    missingNames:missing,
    secretsCreated:0,
    paidProviderCreateAttempts:0,
    noTimedShellRequired:true
  }));
  process.exit(2);
}
// A secret NAME is NOT proof its value works. The protected owner workflow
// remains the authoritative live preflight and may safely HOLD.
if(process.argv.length!==3||process.argv[2]!==CONFIRMATION)
  hold("EXACT_ONE_SHOT_CONFIRMATION_REQUIRED");
gh(["workflow","run",WORKFLOW,"--repo",REPO,
  "--ref","main","-f",`confirmation=${CONFIRMATION}`]);
console.log(JSON.stringify({
  status:"GITHUB_ONE_SHOT_CONTROLLER_DISPATCH_REQUESTED",
  githubActionsUrl:`https://github.com/${REPO}/actions/workflows/${WORKFLOW}`,
  timingOwner:"GITHUB_ACTIONS_ONLY",
  paidProviderCreateConfirmed:false,
  protectedIndependentStopArmed:false,
  scientificPassed:false,
  secretsCreated:0,
  next:"Review phase2g-paid deployment and later independent gate05-safety deployment. Both reviews can be done early, not at exact clock times."
}));
