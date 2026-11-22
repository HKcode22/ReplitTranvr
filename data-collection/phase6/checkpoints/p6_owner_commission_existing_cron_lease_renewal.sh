#!/usr/bin/env bash
# Owner-only commission of the already reviewed Dec12-19 renewal environment.
# Existing cron jobs read-only. No job edits, provider, DB, target dispatch or paid flags.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/TravnrClockRelay
PIN=046d89d341fa9f24524ea11e2778e273e3f39533
test "$(gh api "repos/$R/git/ref/heads/main" --jq .object.sha)" = "$PIN"
test "$(gh api user --jq .login)" = HKcode22
T="$(mktemp -d)"
trap 'unset TRAVNR_CRON_ACCOUNT_KEY; rm -rf "$T"' EXIT
for spec in '2665bd0004e9ba8ce534382cc69ebabf9b11784f cron-admin.mjs' '246d1dbcb8bea96033aa8c1c0fe595b9634c8a12 cron-audit.mjs'; do
 read -r blob name <<< "$spec"
 gh api "repos/$R/git/blobs/$blob" --jq .content | base64 --decode >"$T/$name"
 test "$(git hash-object "$T/$name")" = "$blob"
 node --check "$T/$name"
done
if [[ -z "${TRAVNR_CRON_ACCOUNT_KEY:-}" ]]; then
 printf 'Existing cron-job.org API key (hidden input; not an AeroDataBox key): ' >&2
 IFS= read -rs TRAVNR_CRON_ACCOUNT_KEY </dev/tty
 printf '\n' >&2
fi
export TRAVNR_CRON_ACCOUNT_KEY
cat >"$T/commission.mjs" <<'JS'
import {execFileSync} from "node:child_process";
import {ACTUAL_PAIR,managedSpec,exactManaged} from "./cron-admin.mjs";
import {REPO,WF} from "./cron-audit.mjs";
const PIN="046d89d341fa9f24524ea11e2778e273e3f39533",E="travnr-cron-lease-renewal",ROOT="repos/"+REPO,ep=ROOT+"/environments/"+E,KEY="TRAVNR_CRON_ACCOUNT_KEY",PAT="TRAVNR_CRON_RELAY_TOKEN",READY="TRAVNR_LEASE_ENV_READY",ARM="TRAVNR_LEASE_CONTINUITY_ARMED";
const need=(v,s)=>{if(!v)throw Error("HOLD_"+s)};
const ghEnv={GH_HOST:"github.com",GH_PROMPT_DISABLED:"1"};
for(const k of ["PATH","HOME","GH_CONFIG_DIR","XDG_CONFIG_HOME","GH_TOKEN","GITHUB_TOKEN"])if(process.env[k])ghEnv[k]=process.env[k];
function gh(args,input){try{return execFileSync("gh",args,{env:ghEnv,input,encoding:"utf8",timeout:30000,maxBuffer:2000000,stdio:[input===undefined?"ignore":"pipe","pipe","pipe"]}).trim()}catch{throw Error("HOLD_GITHUB_OPERATION_UNVERIFIED_INSPECT_NO_REPLAY")}}
function api(method,p,body){return JSON.parse(gh(["api","--method",method,p,...(body?["--input","-"]:[])],body?JSON.stringify(body):undefined)||"null")}
const stable=()=>need(api("GET",ROOT+"/git/ref/heads/main")?.object?.sha===PIN,"RELAY_PIN_DRIFT");
const key=process.env[KEY];
const log=x=>console.log(JSON.stringify({...x,providerCalls:0,databaseWrites:0,cronMutations:0,paidAuthorityGranted:false}));
async function main(){
 need(process.env.GITHUB_ACTIONS!=="true"&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0","OWNER_TLS_SCOPE");
 need(typeof key==="string"&&key.length>=16,"EXISTING_CRON_ACCOUNT_KEY_REQUIRED");
 need(Date.now()<Date.parse("2026-12-12T08:00:00.000Z"),"PRE_RENEWAL_COMMISSION_WINDOW");
 need(api("GET","user")?.login==="HKcode22","OWNER_IDENTITY");
 stable();
 const vars=api("GET",ROOT+"/actions/variables?per_page=100");
 need(Number.isSafeInteger(vars?.total_count)&&vars.total_count<=100&&vars.variables?.length===vars.total_count,"VARIABLE_INVENTORY");
 const v=Object.fromEntries(vars.variables.map(x=>[x.name,x.value]));
 need(v.TRAVNR_RELAY_MODE==="MULTI_LANE"&&v.TRAVNR_RELAY_PRIMARY_ENABLED==="1"&&v.TRAVNR_RELAY_ROLLING_ENABLED==="1","EXISTING_LANES_REQUIRED");
 need([ARM,READY].every(k=>v[k]===undefined||v[k]==="0"),"EXISTING_OR_PARTIAL_RENEWAL_COMMISSION_INSPECT");
 const environments=api("GET",ROOT+"/environments?per_page=100");
 need(Number.isSafeInteger(environments?.total_count)&&environments.total_count<=100&&environments.environments?.length===environments.total_count,"ENV_INVENTORY");
 need(!environments.environments.some(x=>x.name===E),"RENEWAL_ENV_ALREADY_EXISTS_INSPECT_NO_REPLAY");
 // Read-only same-account inspection; retain token solely in process memory.
 const readCron=async p=>{
  const r=await fetch("https://api.cron-job.org"+p,{headers:{Authorization:"Bearer "+key},redirect:"error",signal:AbortSignal.timeout(12000)});
  need(r.ok,"CRON_READ_HTTP_"+r.status);
  return r.json();
 };
 const l=await readCron("/jobs");
 need(l?.someFailed===false&&Array.isArray(l.jobs)&&l.jobs.length<=100,"CRON_LIST");
 const rows=[];
 for(const x of ACTUAL_PAIR){
  const j=(await readCron("/jobs/"+x.jobId)).jobDetails;
  const h=Object.fromEntries(Object.entries(j?.extendedData?.headers??{}).map(([k,v])=>[k.toLowerCase(),v]));
  const token=typeof h.authorization==="string"?h.authorization.replace(/^Bearer /,""):"";
  need(/^github_pat_[A-Za-z0-9_]{25,}$/.test(token),"EXISTING_RELAY_TOKEN_UNAVAILABLE");
  const s=managedSpec({lane:x.lane,until:"2026-12-19T08:00:00.000Z",token,now:Date.now()});
  need(l.jobs.filter(k=>k.title===s.title&&k.jobId===x.jobId).length===1,"EXACT_JOB_ID");
  exactManaged(j,s,x.jobId,true);
  rows.push({lane:x.lane,id:x.jobId,token});
 }
 need(rows[0].token===rows[1].token,"EXISTING_PAIR_TOKEN_MISMATCH");
 const token=rows[0].token;
 const probe=await fetch("https://api.github.com/"+ROOT+"/actions/workflows/"+WF,{headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json"},redirect:"error",signal:AbortSignal.timeout(10000)});
 need(probe.ok,"EXISTING_RELAY_TOKEN_PROBE");
 const wf=await probe.json();
 need(wf.path===".github/workflows/"+WF&&wf.state==="active","RELAY_WORKFLOW_PROBE");
 stable();
 log({status:"EXACT_EXISTING_CRON_PAIR_AND_TOKEN_READONLY_PASS",jobs:rows.map(({lane,id})=>({lane,id})),currentLeaseUntilUtc:"2026-12-19T08:00:00.000Z"});
 // Create only the previously reviewed main-only renewal environment.
 const policy={protected_branches:false,custom_branch_policies:true};
 api("PUT",ep,{wait_timer:0,prevent_self_review:false,can_admins_bypass:false,reviewers:[],deployment_branch_policy:policy});
 const e=api("GET",ep);
 need(e?.name===E&&e.can_admins_bypass===false&&e.deployment_branch_policy?.protected_branches===false&&e.deployment_branch_policy?.custom_branch_policies===true&&Array.isArray(e.protection_rules)&&e.protection_rules.every(x=>x.type==="branch_policy"),"RENEWAL_ENV_PROTECTION");
 const branchPolicies=()=>api("GET",ep+"/deployment-branch-policies?per_page=100");
 let p=branchPolicies();
 need(p?.total_count===0&&p.branch_policies?.length===0,"RENEWAL_ENV_BRANCH_NOT_EMPTY");
 api("POST",ep+"/deployment-branch-policies",{name:"main",type:"branch"});
 p=branchPolicies();need(p?.total_count===1&&p.branch_policies?.length===1&&p.branch_policies[0].name==="main"&&p.branch_policies[0].type==="branch","RENEWAL_MAIN_ONLY");
 const names=()=>JSON.parse(gh(["secret","list","-R",REPO,"--env",E,"--json","name"])).map(x=>x.name).sort();
 need(names().length===0,"RENEWAL_ENV_SECRET_NOT_EMPTY");
 stable();
 gh(["secret","set",KEY,"-R",REPO,"--env",E],key);
 gh(["secret","set",PAT,"-R",REPO,"--env",E],token);
 need(JSON.stringify(names())===JSON.stringify([KEY,PAT].sort()),"RENEWAL_SECRET_NAMES_READBACK");
 stable();
 for(const k of [READY,ARM]){
  gh(["variable","set",k,"-R",REPO,"--body","1"]);
  need(gh(["variable","get",k,"-R",REPO])==="1","RENEWAL_SWITCH_READBACK");
 }
 stable();
 log({status:"EXISTING_DECEMBER_LEASE_RENEWAL_COMMISSIONED_NO_CRON_MUTATION",environment:E,mainOnly:true,secretNamesVerified:true,renewalArmed:true,renewalWindowStartUtc:"2026-12-12T08:00:00.000Z",renewalWindowEndUtc:"2026-12-19T07:30:00.000Z",intendedLeaseUntilUtc:"2026-12-30T08:00:00.000Z",rollingPaidPolicyUntilPresent:Boolean(v.TRAVNR_ROLLING_POLICY_UNTIL_UTC),actualRenewalNotYetExecuted:true});
}
main().catch(e=>{console.error(/^HOLD_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_RENEWAL_COMMISSION_REDACTED_INSPECT_NO_REPLAY");process.exitCode=2});
JS
node --check "$T/commission.mjs"
node "$T/commission.mjs"
