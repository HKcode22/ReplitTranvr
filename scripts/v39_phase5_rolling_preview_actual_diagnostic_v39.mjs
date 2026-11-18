/** PR-only real GitHub metadata measurement, no production worker,
 * provider, DB, approval, authenticated dispatch or impersonation of main.
 * Uses the same read-only snapshot core as the failed rehearsal. */
import {readP6RollingGithubSnapshot} from "../server/lib/disruption/phase6RollingGithubController_v39.mjs";
const ROOT="https://api.github.com/repos/HKcode22/ReplitTranvr";
const token=process.env.GITHUB_TOKEN;
if(process.env.GITHUB_ACTIONS!=="true"||process.env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
 process.env.GITHUB_EVENT_NAME!=="pull_request"||!token||
 ["DATABASE_URL","AERODATABOX_API_KEY","RAPIDAPI_KEY","V39_DATABASE_RUNTIME_URL","P6_PRIVATE_READER_DATABASE_URL"].some(k=>process.env[k]))throw Error("HOLD_DIAGNOSTIC_SCOPE");
const h={Accept:"application/vnd.github+json",Authorization:"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28"};
let requests=0,maximumPending=0,pending=0;const errors=[];
async function read(url,init){
 const u=new URL(url);
 if(init?.method!=="GET"||u.origin!=="https://api.github.com"||!u.pathname.startsWith("/repos/HKcode22/ReplitTranvr/")||++requests>205)throw Error("HOLD_DIAGNOSTIC_READ_BOUND");
 const kind=u.pathname.includes("/workflows/")?"WORKFLOW_HISTORY":u.pathname.endsWith("/jobs")?"JOB_HISTORY":u.pathname.endsWith("/actions/runs")?"ACTIVE_SWEEP":"MAIN";
 maximumPending=Math.max(maximumPending,++pending);
 try{const res=await fetch(url,{...init,redirect:"error",signal:AbortSignal.timeout(10000)});
  if(!res.ok)errors.push({kind,httpStatus:res.status});return res;
 }catch{errors.push({kind,transport:true});throw Error("HOLD_DIAGNOSTIC_TRANSPORT");}
 finally{pending--;}
}
const main=await read(ROOT+"/git/ref/heads/main",{method:"GET",headers:h});if(!main.ok)throw Error("HOLD_DIAGNOSTIC_MAIN");
const sha=(await main.json()).object.sha;
let status,reason,assessments;
try{const now=Date.now(),epoch=Math.floor((now-3*3600000)/1000)*1000;
 const result=await readP6RollingGithubSnapshot({sha,epoch,token,fetcher:read});
 status=result.plan.status;assessments=result.plan.assessments.map(a=>({lane:a.lane,state:a.state,runId:a.runId??a.lastRunId??null}));
}catch(e){status="ACTUAL_READONLY_SNAPSHOT_HOLD";reason=/^HOLD_P6_ROLLING_CONTROLLER_[A-Z0-9_]{1,90}$/.test(e?.message??"")?e.message:"REDACTED";}
console.log(JSON.stringify({status,reason,assessments,sha,requests,maximumPending,errors,providerCalls:0,databaseReads:0,databaseWrites:0,dispatches:0,phase6PaidGo:false}));
