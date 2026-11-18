/** No-provider rolling continuation rehearsal. Reuses the actual read-only
 * rolling preview and existing canary workflow. It is deliberately not a
 * production session, signer, queue owner, or collection release authority.
 */
import {resolve,join} from "node:path";
import {mkdtempSync,readFileSync,readdirSync,rmSync,statSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {runP6RollingPreview} from "./v39_phase6_rolling_github_preview_v39.mjs";
const REPO="HKcode22/ReplitTranvr",ROOT="https://api.github.com/repos/"+REPO;
const WF="phase5-autonomous-clock-canary-no-provider.yml",PATH=".github/workflows/"+WF;
const CONFIRM="REHEARSE_THREE_ROLLING_SESSIONS_NO_PROVIDER_NO_DB";
export const SUSTAINED_CONFIRM="REHEARSE_THREE_SUSTAINED_GITHUB_CLOCK_SESSIONS_NO_PROVIDER_NO_DB";
const SLOT_MS=5*60000, SUSTAINED_HOP_MS=45*60000, SUSTAINED_WINDOW_MS=180*60000;
const SUSTAINED_DRAIN_MS=120000;
const JOB="rolling-no-provider-rehearsal";
const STEP="Observe two real read-only rolling waves and admit at most one rehearsal successor";
const RECEIPT_STEP="Publish exact non-sensitive rehearsal successor receipt";
const RECEIPT_FILE="p5-rolling-rehearsal-receipt.json";
const fail=s=>{throw Error("HOLD_P5_ROLLING_REHEARSAL_"+s);};
export function p5RehearsalSafeError(e){
 const m=e?.message??"";
 return /^HOLD_(P5_ROLLING_REHEARSAL|P6_ROLLING_PREVIEW|P6_ROLLING_CONTROLLER)_[A-Z0-9_]{1,90}$/.test(m)?m:"HOLD_P5_ROLLING_REHEARSAL_REDACTED_NO_RETRY";
}
const idok=x=>typeof x==="string"&&/^[1-9][0-9]{0,14}$/.test(x);
const stamp=x=>typeof x==="string"&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x?Date.parse(x):fail("UTC");
const title=(chain,hop,parent)=>"P5 ROLLING "+chain+" "+hop+" "+parent;
const sleepDefault=ms=>new Promise(r=>setTimeout(r,ms));
export function admitP5RollingRehearsal(e,now){
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!==REPO||e.GITHUB_REF!=="refs/heads/main"||
    e.GITHUB_EVENT_NAME!=="workflow_dispatch"||e.GITHUB_RUN_ATTEMPT!=="1"||
    !idok(e.GITHUB_RUN_ID)||!/^[a-f0-9]{40}$/.test(e.GITHUB_SHA??"")||
    e.GITHUB_SHA!==e.P5_ROLLING_REHEARSAL_SHA||![CONFIRM,SUSTAINED_CONFIRM].includes(e.P5_ROLLING_REHEARSAL_CONFIRM)||
    !/^[a-f0-9]{32}$/.test(e.P5_ROLLING_REHEARSAL_CHAIN??"")||
    !/^[012]$/.test(e.P5_ROLLING_REHEARSAL_HOP??"")||
    e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||e.V39_PHASE6_OWNER_APPROVED!=="0"||
    e.P6_ROLLING_CONTROLLER_ENABLED!=="0"||e.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    ["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","DATABASE_URL","V39_DATABASE_RUNTIME_URL",
     "V39_P5_SOURCE_DATABASE_URL","P5_V39_PRE_DATABASE_URL","P5_V39_PREPARE_DATABASE_URL","P5_V39_T24_WITNESS_DATABASE_URL",
     "P6_PRIVATE_READER_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL","P5_RETENTION_READER_DATABASE_URL"].some(k=>e[k])||
    typeof e.GITHUB_TOKEN!=="string"||e.GITHUB_TOKEN.length<16||!Number.isSafeInteger(now))fail("SCOPE");
 const hop=Number(e.P5_ROLLING_REHEARSAL_HOP),parent=e.P5_ROLLING_REHEARSAL_PARENT,
  deadline=stamp(e.P5_ROLLING_REHEARSAL_DEADLINE),
  sustained=e.P5_ROLLING_REHEARSAL_CONFIRM===SUSTAINED_CONFIRM,
  epoch=deadline-(sustained?SUSTAINED_WINDOW_MS:30*60000);
 if(now<epoch||now>=deadline-60000)fail("DEADLINE");
 if(sustained&&deadline-now<SUSTAINED_HOP_MS+SUSTAINED_DRAIN_MS)fail("SUSTAINED_INSUFFICIENT_REMAINING_TIME");
 let sent=null;
 if(hop===0){if(parent!=="0"||e.P5_ROLLING_REHEARSAL_SENT)fail("ROOT_PARENT");}
 else{
  if(!idok(parent)||parent===e.GITHUB_RUN_ID)fail("PARENT_ID");
  sent=stamp(e.P5_ROLLING_REHEARSAL_SENT);
  if(sent<epoch||sent>now||sent>=deadline-30000)fail("PARENT_CLOCK");
 }
 return {id:e.GITHUB_RUN_ID,sha:e.GITHUB_SHA,chain:e.P5_ROLLING_REHEARSAL_CHAIN,hop,parent,epoch,deadline,sent,sustained,confirm:e.P5_ROLLING_REHEARSAL_CONFIRM};
}
/** Observe a bounded in-run UTC clock. A late wake records missed slots instead
 * of delivering retrospective ticks. No provider, SQL, or dispatch here. */
export async function observeP5SustainedClock({now=Date.now,sleep=sleepDefault,emit=()=>{},span=SUSTAINED_HOP_MS,deadline}={}){
 const start=now(),end=start+span;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(deadline)||span!==SUSTAINED_HOP_MS||end+SUSTAINED_DRAIN_MS>deadline)fail("SUSTAINED_CLOCK_SCOPE");
 const first=Math.floor(start/SLOT_MS)*SLOT_MS+SLOT_MS;
 const ticks=[]; let slot=first,missed=0,previous=start;
 while(slot<=end){
  const before=now();if(!Number.isSafeInteger(before)||before<previous)fail("SUSTAINED_CLOCK_REGRESSED");
  if(before<slot)await sleep(slot-before);
  const observed=now();
  if(!Number.isSafeInteger(observed)||observed<Math.max(before,slot)-250||observed>=deadline-60000)fail("SUSTAINED_CLOCK_WAKE");
  if(observed<slot)fail("SUSTAINED_CLOCK_EARLY");
  const latest=Math.floor(observed/SLOT_MS)*SLOT_MS;
  if(latest>end){missed+=Math.floor((end-slot)/SLOT_MS)+1;break;}
  const skipped=Math.floor((latest-slot)/SLOT_MS);
  missed+=skipped;
  const tick={slotUtc:new Date(latest).toISOString(),observedUtc:new Date(observed).toISOString(),
   latenessMs:observed-latest,missedBefore:skipped};
  ticks.push(tick);emit({status:"P5_SUSTAINED_CLOCK_TICK_NO_PROVIDER",...tick});
  previous=observed;slot=latest+SLOT_MS;
 }
 if(ticks.length+missed!==9)fail("SUSTAINED_CLOCK_ACCOUNTING");
 return {startUtc:new Date(start).toISOString(),endUtc:new Date(end).toISOString(),ticks,missed,expectedSlots:9};
}
export function validateP5SustainedClockReceipt(x){
 if(!x||!Array.isArray(x.ticks)||x.ticks.length>9||!Number.isInteger(x.missed)||x.missed<0||
    x.expectedSlots!==9||x.ticks.length+x.missed!==9)return false;
 try{
  const start=stamp(x.startUtc),end=stamp(x.endUtc);if(end-start!==SUSTAINED_HOP_MS)return false;
  let prev=Math.floor(start/SLOT_MS)*SLOT_MS,missed=0,priorObserved=start;
  for(const t of x.ticks){
   const slot=stamp(t.slotUtc),observed=stamp(t.observedUtc);
   if(slot%SLOT_MS||slot<=prev||slot>end||observed<slot||observed<priorObserved||
      observed-slot>=SLOT_MS||t.latenessMs!==observed-slot||t.missedBefore!==(slot-prev)/SLOT_MS-1)return false;
   missed+=t.missedBefore;prev=slot;priorObserved=observed;
  }
  return missed+Math.floor((end-prev)/SLOT_MS)===x.missed;
 }catch{return false;}
}
// Only the fixed metadata artifact on the independently verified predecessor
// may be downloaded. The artifact contains no provider or DB values.
function downloadReceipt({parent,name,token}){
 const dir=mkdtempSync(join(tmpdir(),"p5-rolling-receipt-"));
 try{
  execFileSync("gh",["run","download",parent,"--repo",REPO,"--name",name,"--dir",dir],{
   env:{PATH:process.env.PATH,HOME:process.env.HOME,GH_TOKEN:token,GH_PROMPT_DISABLED:"1"},
   timeout:30000,stdio:"ignore"});
  if(readdirSync(dir).length!==1||readdirSync(dir)[0]!==RECEIPT_FILE)fail("RECEIPT_FILES");
  const path=join(dir,RECEIPT_FILE),info=statSync(path);
  if(!info.isFile()||info.size<30||info.size>16384)fail("RECEIPT_SIZE");
  return JSON.parse(readFileSync(path,"utf8"));
 }catch{fail("RECEIPT_UNAVAILABLE");}
 finally{rmSync(dir,{recursive:true,force:true});}
}
export async function runP5RollingRehearsal(env,{now=Date.now,sleep=sleepDefault,fetcher=fetch,emit=()=>{},readReceipt=downloadReceipt}={}){
 const a=admitP5RollingRehearsal(env,now());
 let gets=0,posts=0,parentReceiptVerified=false;
 const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+env.GITHUB_TOKEN,"X-GitHub-Api-Version":"2022-11-28"};
 async function read(url,init){
  const u=new URL(url);
  if(init?.method!=="GET"||u.origin!=="https://api.github.com"||!u.pathname.startsWith("/repos/"+REPO+"/")||
     u.username||u.password||u.hash||now()>=a.deadline-12000||++gets>420)fail("GET_SCOPE_OR_BOUND");
  return fetcher(url,{...init,redirect:"error",signal:AbortSignal.timeout(10000)});
 }
 async function get(path){
  const res=await read(ROOT+path,{method:"GET",headers});
  if(!res.ok)fail("READ_UNAVAILABLE");
  return res.json();
 }
 async function main(){if((await get("/git/ref/heads/main"))?.object?.sha!==a.sha)fail("MAIN_CHANGED");}
 function exact(row,id){
  const created=Date.parse(row?.created_at);
  if(String(row?.id)!==id||row.path!==PATH||row.head_branch!=="main"||
     row.head_sha!==a.sha||row.event!=="workflow_dispatch"||row.run_attempt!==1||
     !Number.isFinite(created)||created<a.epoch-1000||created>now()+1000)fail("RUN_IDENTITY");
  return row;
 }
 async function pause(ms){const prior=now();await sleep(ms);if(now()<prior+ms-250||now()>=a.deadline-12000)fail("PAUSE_CLOCK");}
 async function lineage(){
  // Workflow API creation timestamps have whole-second resolution. Include the
  // enclosing second in history; exact() independently checks the admitted epoch.
  const from=encodeURIComponent(">="+new Date(Math.floor(a.epoch/1000)*1000).toISOString());
  const v=await get("/actions/workflows/"+WF+"/runs?branch=main&event=workflow_dispatch&per_page=100&created="+from);
  if(!Number.isSafeInteger(v?.total_count)||v.total_count<1||v.total_count>100||
     !Array.isArray(v.workflow_runs)||v.workflow_runs.length!==v.total_count)fail("HISTORY_INCOMPLETE");
  const prefix="P5 ROLLING "+a.chain+" ";
  const rows=v.workflow_runs.filter(x=>typeof x.display_title==="string"&&x.display_title.startsWith(prefix));
  if(rows.length!==a.hop+1||new Set(rows.map(x=>x.id)).size!==rows.length)fail("DUPLICATE_OR_MISSING_CHAIN");
  let previous="0",lastCreated=-Infinity;
  for(let i=0;i<=a.hop;i++){
   const found=rows.filter(x=>x.display_title===title(a.chain,i,previous));
   if(found.length!==1)fail("CHAIN_TITLE_OR_PARENT");
   const row=exact(found[0],String(found[0].id)),created=Date.parse(row.created_at);
   if(created<lastCreated)fail("CHAIN_CLOCK");
   if(i===a.hop){
    if(String(row.id)!==a.id||previous!==a.parent||row.status!=="in_progress"||row.conclusion!==null||
       (a.sent!==null&&created<a.sent-1000))fail("CURRENT_RUN");
   }else if(row.status!=="completed"||row.conclusion!=="success")fail("PREDECESSOR_NOT_TERMINAL");
   if(i===a.hop-1){
    if(created>a.sent||String(row.id)!==a.parent)fail("PARENT_CLOCK_OR_ID");
    const direct=exact(await get("/actions/runs/"+previousId(row)),String(row.id));
    if(direct.display_title!==row.display_title||direct.status!=="completed"||direct.conclusion!=="success")fail("PARENT_TERMINAL_READBACK");
    const j=await get("/actions/runs/"+row.id+"/jobs?filter=latest&per_page=100");
    if(!Number.isSafeInteger(j?.total_count)||j.total_count<1||j.total_count>100||!Array.isArray(j.jobs)||j.jobs.length!==j.total_count)fail("PARENT_JOBS_INCOMPLETE");
    const jobs=j.jobs.filter(x=>x.name===JOB);
    if(jobs.length!==1||jobs[0].status!=="completed"||jobs[0].conclusion!=="success")fail("PARENT_JOB");
    for(const step of [STEP,RECEIPT_STEP]){
     const steps=jobs[0].steps?.filter(x=>x.name===step)??[];
     if(steps.length!==1||steps[0].status!=="completed"||steps[0].conclusion!=="success")fail("PARENT_STEP");
    }
    if(!parentReceiptVerified){
     const name="phase5-rolling-rehearsal-"+a.parent;
     const artifacts=await get("/actions/runs/"+a.parent+"/artifacts?per_page=100");
     if(artifacts?.total_count!==1||!Array.isArray(artifacts.artifacts)||artifacts.artifacts.length!==1)fail("PARENT_RECEIPT_HISTORY");
     const artifact=artifacts.artifacts[0];
     if(artifact.name!==name||!Number.isSafeInteger(artifact.id)||artifact.id<1||artifact.expired!==false||
        !Number.isSafeInteger(artifact.size_in_bytes)||artifact.size_in_bytes<1||artifact.size_in_bytes>32768||
        (artifact.workflow_run&&String(artifact.workflow_run.id)!==a.parent))fail("PARENT_RECEIPT_IDENTITY");
     const receipt=await readReceipt({parent:a.parent,name,token:env.GITHUB_TOKEN});
     if(receipt?.schema!=="v39.phase5.rolling-continuation-rehearsal.v1"||
        receipt.status!=="ONE_REHEARSAL_SUCCESSOR_ACKNOWLEDGED"||
        receipt.chainId!==a.chain||receipt.hop!==a.hop-1||receipt.runId!==a.parent||
        receipt.parentRunId!==previous||receipt.reviewedMainSha!==a.sha||
        receipt.deadlineUtc!==new Date(a.deadline).toISOString()||
        receipt.nextDispatchAtUtc!==new Date(a.sent).toISOString()||
        receipt.nextRunId!==a.id||receipt.rehearsalDispatches!==1||
        (a.sustained?(receipt.profile!=="SUSTAINED_45M"||!validateP5SustainedClockReceipt(receipt.clock)):
          (receipt.profile!==undefined||receipt.clock!==undefined))||
        receipt.collectionDispatches!==0||receipt.providerCalls!==0||receipt.databaseReads!==0||
        receipt.databaseWrites!==0||receipt.phase6PaidGo!==false||
        !Array.isArray(receipt.waves)||receipt.waves.length!==2||
        receipt.waves.some((w,i)=>w.wave!==i+1||w.lanes!==8))fail("PARENT_RECEIPT_ACK_MISMATCH");
     parentReceiptVerified=true;
    }
   }
   previous=String(row.id);lastCreated=created;
  }
 }
 const previousId=row=>String(row.id);
 await main();
 // GitHub can still report the predecessor as running immediately after
 // its concurrency slot releases. Only retry this read-only transition.
 for(let i=0;;i++){
  try{await lineage();break;}
  catch(e){if(e?.message!=="HOLD_P5_ROLLING_REHEARSAL_PREDECESSOR_NOT_TERMINAL"||i>=5||now()+70000>=a.deadline)throw e;await pause(5000);}
 }
 const summaries=[];let sustainedClock;
 for(let wave=1;wave<=2;wave++){
  emit({status:"P5_READONLY_PREVIEW_START",wave,githubReads:gets});
  const p=await runP6RollingPreview({...env,P6_CONTROLLER_HEARTBEAT_CONFIRM:"PREVIEW_ROLLING_CONTROLLER_READONLY_NO_PROVIDER_NO_DISPATCH",
   P6_ROLLING_PREVIEW_APPROVED_MAIN:a.sha},{now,fetcher:read,emit});
  if(p.status!=="ACTUAL_GITHUB_ROLLING_PREVIEW_ONLY_NO_GO"||p.dispatchCount!==0||p.providerCalls!==0||p.databaseReads!==0||p.databaseWrites!==0||p.phase6PaidGo!==false)fail("PREVIEW_SCOPE");
  const summary={wave,observedAtUtc:p.observedAtUtc,plan:p.observedPlanStatus,lanes:p.assessments.length,
   hypotheticalDue:p.hypotheticallyDue.length};
  summaries.push(summary);emit({status:"REAL_READONLY_ROLLING_WAVE",...summary});
  if(wave===1){
   if(a.sustained)sustainedClock=await observeP5SustainedClock({now,sleep,emit,deadline:a.deadline});
   else await pause(15000);
  }
 }
 await lineage();await main();
 const base={schema:"v39.phase5.rolling-continuation-rehearsal.v1",chainId:a.chain,hop:a.hop,runId:a.id,parentRunId:a.parent,
  reviewedMainSha:a.sha,deadlineUtc:new Date(a.deadline).toISOString(),waves:summaries,githubReads:gets,
  ...(a.sustained?{profile:"SUSTAINED_45M",clock:sustainedClock}:{}),
  providerCalls:0,databaseReads:0,databaseWrites:0,collectionDispatches:0,phase6PaidGo:false};
 if(a.hop===2)return {...base,status:"TERMINAL_REHEARSAL_NO_MORE_DISPATCH",rehearsalDispatches:0,nextRunId:null};
 const sent=now();
 if(sent>=a.deadline-60000)fail("SUCCESSOR_DEADLINE");
 emit({status:"REHEARSAL_SUCCESSOR_ATTEMPT_BEFORE_ACK",hop:a.hop});
 try{
  if(++posts!==1)fail("DUPLICATE_POST");
  const res=await fetcher(ROOT+"/actions/workflows/"+WF+"/dispatches",{method:"POST",headers:{...headers,"Content-Type":"application/json"},
   redirect:"error",signal:AbortSignal.timeout(10000),body:JSON.stringify({ref:"main",return_run_details:true,inputs:{
    mode:"ROLLING_REHEARSAL",handoff_confirm:a.confirm,approved_main_sha:a.sha,chain_id:a.chain,hop:String(a.hop+1),parent_run_id:a.id,
    deadline_utc:new Date(a.deadline).toISOString(),sent_at_utc:new Date(sent).toISOString()}})});
  if(res.status!==200)fail("ACK");
  const b=await res.json(),id=b?.workflow_run_id;
  if(!Number.isSafeInteger(id)||id<1||String(id)===a.id||String(id)===a.parent||
     b.run_url!==ROOT+"/actions/runs/"+id||b.html_url!=="https://github.com/"+REPO+"/actions/runs/"+id)fail("ACK");
  return {...base,status:"ONE_REHEARSAL_SUCCESSOR_ACKNOWLEDGED",rehearsalDispatches:1,nextRunId:String(id),nextDispatchAtUtc:new Date(sent).toISOString()};
 }catch{fail("UNKNOWN_ACK_NO_RETRY");}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const result=await runP5RollingRehearsal(process.env,{emit:e=>console.log(JSON.stringify(e))});
  const out=JSON.stringify(result);
  if(!process.env.RUNNER_TEMP)fail("RUNNER_TEMP_REQUIRED");
  writeFileSync(join(process.env.RUNNER_TEMP,RECEIPT_FILE),out,{flag:"wx",mode:0o600});
  console.log(out);
 }
 catch(e){console.error(p5RehearsalSafeError(e));process.exitCode=2;}
}
