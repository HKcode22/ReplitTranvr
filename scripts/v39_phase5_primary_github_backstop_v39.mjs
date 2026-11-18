/** Bounded GitHub-only primary retention wake loop; no DB or provider credentials.
 * Child revalidates exact current approval and primary-only commissioning mode.
 * A failed/uncertain child stops this session. No automatic root or ACK replay.
 */
import {appendFileSync,openSync,closeSync,fsyncSync} from "node:fs";
import {resolve,join} from "node:path";
import {fileURLToPath} from "node:url";
export const ROOT="https://api.github.com/repos/HKcode22/ReplitTranvr";
export const WORKER="phase5-primary-fids-expiry-no-provider.yml";
export const PARENT="phase5-autonomous-clock-canary-no-provider.yml";
export const CONFIRM="RUN_BOUNDED_PRIMARY_FIDS_BACKSTOP_NO_PROVIDER_NO_PRIVATE_MUTATION";
export const CHILD_CONFIRM="APPLY_REVIEWED_PRIMARY_FIDS_BACKSTOP_NO_PRIVATE_MUTATION";
const APPLY="APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER";
const MIN=60000,SLOT=15*MIN,MAX=120*MIN;
const ACTIVE=["queued","in_progress","waiting","pending","requested"];
const hold=r=>{throw Error("HOLD_P5_PRIMARY_BACKSTOP_"+r);};
const id=x=>Number.isSafeInteger(x)&&x>0&&x<1e15;
const sha=x=>/^[a-f0-9]{40}$/.test(x??"");
const time=x=>{const n=Date.parse(x);if(!Number.isSafeInteger(n))hold("TIME");return n;};
const iso=x=>new Date(x).toISOString();
export function admit(env,now){
 const deadline=time(env.P5_BACKSTOP_DEADLINE),runId=Number(env.GITHUB_RUN_ID);
 if(!Number.isSafeInteger(now)||deadline-now>MAX||deadline-now<SLOT||
    !id(runId)||env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_RUN_ATTEMPT!=="1"||
    !sha(env.GITHUB_SHA)||env.P5_BACKSTOP_REQUESTED_MAIN!==env.GITHUB_SHA||
    env.P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA!==env.GITHUB_SHA||env.P5_BACKSTOP_CONFIRM!==CONFIRM||
    env.P5_PRIMARY_FIDS_BACKSTOP_ENABLED!=="true"||env.P5_PRIMARY_FIDS_EXPIRY_ENABLED!=="true"||
    env.P5_PRIMARY_FIDS_EXPIRY_APPROVAL!==APPLY||env.P6_PRIVATE_EPOCH_EXPIRY_MODE!=="COMMISSION_VERIFY_ONLY"||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||env.V39_PHASE6_OWNER_APPROVED!=="0"||
    !env.GITHUB_TOKEN||env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    ["DATABASE_URL","V39_DATABASE_RUNTIME_URL","AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET",
     "V39_P5_SOURCE_DATABASE_URL","P5_V39_PRE_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL",
     "P5_PRIMARY_FIDS_SWEEP_DATABASE_URL","P5_RETENTION_READER_DATABASE_URL"].some(k=>env[k]))hold("SCOPE");
 return {deadline,runId,sha:env.GITHUB_SHA,token:env.GITHUB_TOKEN};
}
function row(x,wf){
 if(!x||!id(x.id)||x.path!==".github/workflows/"+wf||x.head_branch!=="main"||!sha(x.head_sha)||
    x.run_attempt!==1||!["schedule","workflow_dispatch"].includes(x.event)||
    ![...ACTIVE,"completed"].includes(x.status)||!Number.isSafeInteger(Date.parse(x.created_at)))hold("RUN_IDENTITY");
 return x;
}
function rows(x,wf,max=100){
 if(!Number.isSafeInteger(x?.total_count)||x.total_count<0||x.total_count>max||!Array.isArray(x.workflow_runs)||
    x.workflow_runs.length!==x.total_count||new Set(x.workflow_runs.map(y=>y.id)).size!==x.total_count)hold("INCOMPLETE_HISTORY");
 return x.workflow_runs.map(y=>row(y,wf));
}
function positive(jobs,x){
 if(jobs?.total_count!==1||jobs.jobs?.length!==1)hold("WORKER_JOB");
 const j=jobs.jobs[0];
 if(!id(j.id)||j.run_id!==x.id||j.head_sha!==x.head_sha||j.run_attempt!==1||j.name!=="primary-fids-expiry"||
    j.status!=="completed"||j.conclusion!=="success"||
    j.steps?.filter(s=>s.name==="Verify exact main and execute only bounded primary FIDS expiry"&&s.status==="completed"&&s.conclusion==="success").length!==1)hold("WORKER_STEP");
 return time(j.completed_at);
}
export async function runBackstop(env,{now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),fetcher=fetch,emit=()=>{}}={}){
 const a=admit(env,now());let reads=0,posts=0,ticks=0;
 const accepted=[];
 const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+a.token,"X-GitHub-Api-Version":"2022-11-28"};
 async function get(path){
  if(++reads>280||now()>=a.deadline||!path.startsWith("/")||path.startsWith("//"))hold("READ_BOUND");
  const res=await fetcher(ROOT+path,{method:"GET",headers,redirect:"error",signal:AbortSignal.timeout(10000)});
  if(!res.ok)hold("GET");return res.json();
 }
 async function current(){if((await get("/git/ref/heads/main"))?.object?.sha!==a.sha)hold("MAIN_MOVED");}
 const history="/actions/workflows/"+WORKER+"/runs?branch=main&per_page=100";
 const jobs=x=>get("/actions/runs/"+x.id+"/jobs?filter=latest&per_page=100");
 const pause=async ms=>{const before=now();await sleep(ms);if(now()<before+ms-250)hold("CLOCK");};
 await current();
 const root=row(await get("/actions/runs/"+a.runId),PARENT);
 if(root.id!==a.runId||root.head_sha!==a.sha||root.event!=="workflow_dispatch"||root.display_title!=="P5 PRIMARY BACKSTOP ROOT"||
    root.status!=="in_progress"||time(root.created_at)>now()||a.deadline-time(root.created_at)>MAX)hold("ROOT");
 // No second manually launched root in this same authorization window.
 const since=encodeURIComponent(">="+iso(a.deadline-MAX));
 const roots=rows(await get("/actions/workflows/"+PARENT+"/runs?branch=main&event=workflow_dispatch&per_page=100&created="+since),PARENT);
 if(roots.filter(r=>r.display_title==="P5 PRIMARY BACKSTOP ROOT").length!==1||
    !roots.some(r=>r.id===a.runId))hold("ROOT_HISTORY");
 let next=now();
 while(ticks<8&&now()+11*MIN<a.deadline){
  if(now()<next)await pause(next-now());
  if(now()+11*MIN>=a.deadline)break;
  const tickAt=now();ticks++;next=(Math.floor(tickAt/SLOT)+1)*SLOT;
  await current();
  let busy=false;
  for(const state of ACTIVE){
   const h=rows(await get(history+"&status="+state),WORKER);
   if(h.some(x=>x.status!==state))hold("ACTIVE_HISTORY");
   if(h.length)busy=true;
  }
  if(busy){emit({event:"DEFER_ACTIVE_WORKER",tick:ticks,utc:iso(tickAt)});continue;}
  const recent=rows(await get(history+"&created="+encodeURIComponent(">="+iso(tickAt-2*MAX))),WORKER);
  if(recent.some(x=>x.status!=="completed")){emit({event:"DEFER_HISTORY_RACE",tick:ticks,utc:iso(tickAt)});continue;}
  const same=recent.filter(x=>x.head_sha===a.sha).sort((x,y)=>time(y.created_at)-time(x.created_at)||y.id-x.id);
  if(same.some(x=>x.conclusion!=="success"))hold("PRIOR_EXACT_WORKER_REVIEW_REQUIRED");
  // The cron outage can be much longer than the recent-history window.
  // Read exactly the latest workflow run (regardless of age); do not invent a
  // prior success, let an old-main run authorize current work, or submit again
  // if a newer run is queued, failed, or not yet visible in recent history.
  const latest=await get("/actions/workflows/"+WORKER+"/runs?branch=main&per_page=1");
  if(!Number.isSafeInteger(latest?.total_count)||latest.total_count<1||
     !Array.isArray(latest.workflow_runs)||latest.workflow_runs.length!==1)hold("LATEST_WORKER_HISTORY");
  const last=row(latest.workflow_runs[0],WORKER);
  if(last.head_sha!==a.sha)hold("PRIOR_EXACT_WORKER_REVIEW_REQUIRED");
  if(last.status!=="completed"){emit({event:"DEFER_LATEST_WORKER_RACE",tick:ticks,utc:iso(tickAt)});continue;}
  if(last.conclusion!=="success")hold("PRIOR_EXACT_WORKER_REVIEW_REQUIRED");
  if(same.length&&same[0].id!==last.id)hold("LATEST_WORKER_HISTORY_DRIFT");
  if(!same.length&&time(last.created_at)>=tickAt-2*MAX)hold("LATEST_WORKER_HISTORY_DRIFT");
  const previous=await get("/actions/runs/"+last.id);
  row(previous,WORKER);
  if(previous.id!==last.id||previous.head_sha!==a.sha||previous.status!=="completed"||previous.conclusion!=="success")hold("PRIOR_WORKER_DRIFT");
  const done=positive(await jobs(previous),previous);
  if(done>now()||done<time(previous.created_at))hold("PRIOR_JOB_TIME");
  // A successful VERIFY can defer work but is never called an expiry receipt.
  if(now()-done<SLOT){emit({event:"DEFER_RECENT_WORKER_STEP",runId:previous.id,tick:ticks});continue;}
  await current();
  if(now()+11*MIN>=a.deadline)break;
  const sent=now();emit({event:"DISPATCH_ATTEMPT",tick:ticks,utc:iso(sent)});posts++;
  let ack;
  try{
   const res=await fetcher(ROOT+"/actions/workflows/"+WORKER+"/dispatches",{method:"POST",headers:{...headers,"Content-Type":"application/json"},redirect:"error",
    signal:AbortSignal.timeout(10000),body:JSON.stringify({ref:"main",return_run_details:true,inputs:{confirm:CHILD_CONFIRM,approved_main_sha:a.sha}})});
   if(res.status!==200)hold("UNKNOWN_ACK_NO_RETRY");ack=await res.json();
   if(!id(ack?.workflow_run_id)||ack.run_url!==ROOT+"/actions/runs/"+ack.workflow_run_id||
    ack.html_url!=="https://github.com/HKcode22/ReplitTranvr/actions/runs/"+ack.workflow_run_id||ack.workflow_run_id===a.runId||ack.workflow_run_id===previous.id||accepted.includes(ack.workflow_run_id))hold("UNKNOWN_ACK_NO_RETRY");
  }catch{hold("UNKNOWN_ACK_NO_RETRY");}
  const childId=ack.workflow_run_id;accepted.push(childId);emit({event:"ACK",runId:childId,tick:ticks});
  const until=Math.min(a.deadline-MIN,now()+10*MIN);
  let terminal=false;
  for(let n=0;n<21&&now()<until;n++){
   // GitHub's acknowledged run can take a short time to become readable.
   // Retry the GET only, within the existing deadline and request count.
   let receipt;
   try{receipt=await get("/actions/runs/"+childId);}catch(e){
    if(e?.message!=="HOLD_P5_PRIMARY_BACKSTOP_GET"||n>=2||now()+30000>=until)throw e;
    await pause(30000);continue;
   }
   const child=row(receipt,WORKER);
   if(child.id!==childId||child.head_sha!==a.sha||child.event!=="workflow_dispatch"||child.display_title!=="P5 PRIMARY BACKSTOP CHILD"||time(child.created_at)<sent-1000||time(child.created_at)>now()+1000)hold("CHILD_IDENTITY");
   if(child.status==="completed"){
    if(child.conclusion!=="success")hold("CHILD_FAILED_NO_RETRY");const completed=positive(await jobs(child),child);if(completed<time(child.created_at)||completed>now())hold("CHILD_JOB_TIME");
    terminal=true;emit({event:"CHILD_JOB_COMPLETED_NOT_DELETION_PROOF",runId:childId,tick:ticks});break;
   }
   if(now()+30000>=until)break;await pause(30000);
  }
  if(!terminal)hold("CHILD_UNRESOLVED_NO_RETRY");
 }
 return {status:"BOUNDED_PRIMARY_BACKSTOP_TERMINAL",ticks,posts,accepted,providerCalls:0,controllerDatabaseWrites:0,childPrimaryWritesPossible:true,privateWritesPermitted:false,phase6PaidGo:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let fd;
 try{
  if(!process.env.RUNNER_TEMP)hold("TMP");
  fd=openSync(join(process.env.RUNNER_TEMP,"p5-primary-backstop.jsonl"),"wx",0o600);
  const emit=x=>{appendFileSync(fd,JSON.stringify(x)+"\n");fsyncSync(fd);console.log(JSON.stringify(x));};
  const result=await runBackstop(process.env,{emit});emit(result);
 }catch(e){const m=e?.message??"";console.error(/^HOLD_P5_PRIMARY_BACKSTOP_[A-Z0-9_]+$/.test(m)?m:"HOLD_P5_PRIMARY_BACKSTOP_UNKNOWN_NO_RETRY");process.exitCode=2;}
 finally{if(fd!==undefined)closeSync(fd);}
}
