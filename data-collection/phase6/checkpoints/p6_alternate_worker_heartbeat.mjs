// Independent metadata-only diagnostic. No provider, database or dispatch.
// Never replaces signed calendar/cutoff evidence, or the existing native alert.
import {fileURLToPath} from "node:url";
const REPO="HKcode22/ReplitTranvr",ROOT="https://api.github.com/repos/"+REPO;
const SHA=/^[a-f0-9]{40}$/, MIN=60000;
const lane=(name,workflow,max,requirements)=>({name,workflow,max,requirements});
export const LANES=[
 lane("EARLY_DRAW","phase5-six-slot-approved-early-four-airport-draw.yml",330,[["gated-exact-early-parent","Select max ONE genuinely due future parent under actual DB clock and existing serializable owner"]]),
 lane("SOURCE","phase5-source-upcoming-queue-main-scheduled-readonly.yml",90,[["separately-authorized-stored-source-children","Dispatch stored SOURCE exact children",true],["separately-authorized-current-private-post-children","Dispatch current private POST exact children",true],["separately-authorized-native-post-producer","Review and publish bounded current POST windows with independent readback"]]),
 lane("PRE","phase5-cd-github-bounded-pre-tick.yml",90,[["bounded-reviewed-real-pre","One signed bounded lease tick — original Stage14 and no paid provider"]]),
 lane("PRE_RECOVERY","phase5-cd-github-existing-queue-lease-watchdog.yml",90,[["reviewed-existing-queue-watchdog","Bounded existing V0087 reaper, UNKNOWN quarantines never replay"]]),
 lane("DAILY_PREPARE","phase6-nonpaid-source-day-prepare-publish.yml",90,[["protected-main-one-day-nonpaid","Prepare and publish at most one eligible independently reviewed future day"]]),
 lane("PRE_ENROLLMENT","phase6-private-later-enrollment.yml",90,[["enroll-current-signed-day",null],["enroll-current-signed-t24-day",null]]),
 lane("T24","phase5-cd-github-one-queued-t24-witness-main-manual.yml",90,[["current-private-native-t24","Current signed T24 packets through original Stage14 and independent V0081"]])
];
const dispositions=["SAFE_PREFLIGHT_HOLD","MISSING_EVIDENCE","NO_DUE_WORK","NO_NEW_ACK","ACKNOWLEDGED_NOT_PAID_RECEIPT"];
const goodStep=s=>s.status==="completed"&&s.conclusion==="success";
const exactStep=(job,name)=>Array.isArray(job.steps)&&job.steps.filter(s=>s.name===name&&goodStep(s)).length===1;
const validId=n=>Number.isSafeInteger(n)&&n>0;
export function verifyWorker(run,body,route,sha,now){
 const rejected=reason=>({verified:false,reason,runId:run?.id??null});
 if(!run||!validId(run.id)||run.head_sha!==sha||run.head_branch!=="main"||run.path!==".github/workflows/"+route.workflow||
    !["schedule","workflow_dispatch"].includes(run.event)||run.run_attempt!==1||run.status!=="completed"||run.conclusion!=="success"||
    !Number.isFinite(Date.parse(run.created_at))||Date.parse(run.created_at)>now+5000||now-Date.parse(run.created_at)>route.max*MIN)
  return rejected("STALE_OR_UNVERIFIED_RUN");
 if(!Number.isSafeInteger(body?.total_count)||body.total_count<1||body.total_count>50||!Array.isArray(body.jobs)||body.jobs.length!==body.total_count||
    new Set(body.jobs.map(j=>j.id)).size!==body.jobs.length||body.jobs.some(j=>!validId(j.id)||j.run_id!==run.id||j.head_sha!==sha||j.run_attempt!==1||j.status!=="completed"))
  return rejected("INCOMPLETE_JOB_IDENTITY");
 for(const [name,step,parent] of route.requirements){
  const jobs=body.jobs.filter(j=>j.name===name);
  if(jobs.length!==1||jobs[0].conclusion!=="success"||step&&!exactStep(jobs[0],step))return rejected("REQUIRED_JOB_OR_STEP_UNVERIFIED");
  if(parent){
   const markers=jobs[0].steps?.filter(s=>s.name.startsWith("Parent outcome "))??[];
   if(markers.length!==dispositions.length||new Set(markers.map(s=>s.name)).size!==dispositions.length||
      markers.some(s=>!dispositions.includes(s.name.slice(15))||s.status!=="completed"||!["success","skipped"].includes(s.conclusion)))
    return rejected("PARENT_OUTCOME_UNVERIFIED");
   const selected=markers.filter(goodStep);
   if(selected.length!==1||["Parent outcome SAFE_PREFLIGHT_HOLD","Parent outcome MISSING_EVIDENCE"].includes(selected[0].name))
    return rejected("PARENT_HOLD_OR_MISSING_EVIDENCE");
  }
 }
 return {verified:true,reason:"EXACT_RECENT_EXECUTED_JOBS_NOT_COLLECTION_PROOF",runId:run.id};
}
function newest(body,route,event,sha,now){
 if(!Number.isSafeInteger(body?.total_count)||body.total_count<0||!Array.isArray(body.workflow_runs)||
    body.workflow_runs.length!==Math.min(body.total_count,15)||new Set(body.workflow_runs.map(r=>r.id)).size!==body.workflow_runs.length||
    body.workflow_runs.some(r=>!validId(r.id)||r.head_branch!=="main"||r.event!==event||r.path!==".github/workflows/"+route.workflow||
      !SHA.test(r.head_sha??"")||!Number.isFinite(Date.parse(r.created_at))||Date.parse(r.created_at)>now+5000))
  throw Error("HOLD_HEARTBEAT_HISTORY_IDENTITY");
 return [...body.workflow_runs].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||b.id-a.id)[0]??null;
}
export async function observe(read,sha,now){
 if(!SHA.test(sha)||!Number.isFinite(now))throw Error("HOLD_HEARTBEAT_SCOPE");
 const results=[];
 for(const route of LANES){
  const evidence={};
  for(const event of ["schedule","workflow_dispatch"]){
   const run=newest(await read(ROOT+"/actions/workflows/"+route.workflow+"/runs?branch=main&event="+event+"&per_page=15"),route,event,sha,now);
   const fresh=run&&run.head_sha===sha&&run.run_attempt===1&&now-Date.parse(run.created_at)<=route.max*MIN;
   const state=run?{id:run.id,ageMinutes:Math.round((now-Date.parse(run.created_at))/MIN),conclusion:run.conclusion,status:run.status}:null;
   let checked={verified:false,reason:"NO_RECENT_SUCCESS",runId:run?.id??null};
   if(fresh&&run.status==="completed"&&run.conclusion==="success"){
    checked=verifyWorker(run,await read(ROOT+"/actions/runs/"+run.id+"/jobs?filter=latest&per_page=50"),route,sha,now);
   }
   evidence[event]={latest:state,...checked};
  }
  const native=evidence.schedule,alternate=evidence.workflow_dispatch;
  // Never erase a recent current native failure, even with alternate evidence.
  const nativeFailed=native.latest&&native.latest.ageMinutes<=route.max&&native.latest.status==="completed"&&
   !["success","skipped"].includes(native.latest.conclusion);
  const state=nativeFailed?"NATIVE_FAILURE_REVIEW":native.verified?"NATIVE_EXECUTED":
   alternate.verified?"NATIVE_GAP_ALTERNATE_EXECUTED":"NO_RECENT_VERIFIED_WORKER_EXECUTION";
  results.push({lane:route.name,state,native,alternate,dueWorkVerified:false,collectionVerified:false});
 }
 return {status:"P6_DUAL_PATH_WORKER_OBSERVATION_NO_COLLECTION_PROOF",mainSha:sha,observedAtUtc:new Date(now).toISOString(),lanes:results,
   providerCalls:0,databaseReads:0,databaseWrites:0,dispatches:0};
}
async function main(){
 if(process.env.GITHUB_ACTIONS!=="true"||process.env.GITHUB_REPOSITORY!==REPO||
    process.env.GITHUB_REF!=="refs/heads/phase6/20261122-g8-502-readback-evidence"||process.env.GITHUB_RUN_ATTEMPT!=="1"||
    !process.env.GITHUB_TOKEN||process.env.DATABASE_URL||process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY)
  throw Error("HOLD_HEARTBEAT_HOST");
 const read=async url=>{
  const r=await fetch(url,{headers:{Authorization:"Bearer "+process.env.GITHUB_TOKEN,Accept:"application/vnd.github+json"},redirect:"error"});
  if(!r.ok)throw Error("HOLD_HEARTBEAT_API_"+r.status);
  return r.json();
 };
 const sha=(await read(ROOT+"/git/ref/heads/main")).object.sha;
 const result=await observe(read,sha,Date.now());
 if((await read(ROOT+"/git/ref/heads/main")).object.sha!==sha)throw Error("HOLD_HEARTBEAT_MAIN_MOVED");
 console.log(JSON.stringify(result));
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(e=>{console.error(/^HOLD_HEARTBEAT_[A-Z0-9_]+$/.test(e.message)?e.message:"HOLD_HEARTBEAT_REDACTED");process.exitCode=2});
