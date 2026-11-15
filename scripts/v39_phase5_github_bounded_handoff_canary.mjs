/** Three-run, owner-started GitHub-to-GitHub handoff measurement.
 * Reuses the existing six-slot clock workflow; no cron change or flight
 * worker admission. Only this isolated canary may be dispatched.
 */
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
const REPO="HKcode22/ReplitTranvr";
const ROOT="https://api.github.com/repos/"+REPO;
const WF="phase5-autonomous-clock-canary-no-provider.yml";
const CONFIRM="MEASURE_THREE_GITHUB_HANDOFFS_NO_PROVIDER_NO_DB";
const H=/^[a-f0-9]{40}$/;
const CHAIN=/^[a-f0-9]{32}$/;
const ID=/^[1-9][0-9]{0,14}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
const fail=s=>{throw Error("HOLD_P5_GH_HANDOFF_"+s);};
const stamp=s=>typeof s==="string"&&UTC.test(s)&&Number.isFinite(Date.parse(s))?Date.parse(s):fail("INVALID_UTC");
const title=(chain,hop,parent)=>"P5 HANDOFF "+chain+" "+hop+" "+parent;
export function admitP5GithubHandoffCanary(env,now){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==REPO||
    env.GITHUB_REF!=="refs/heads/main"||env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||env.P5_GH_HANDOFF_CONFIRM!==CONFIRM||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||
    ["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","DATABASE_URL","V39_DATABASE_RUNTIME_URL",
     "V39_P5_SOURCE_DATABASE_URL","P5_V39_PRE_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL"].some(k=>env[k])||
    !H.test(env.GITHUB_SHA??"")||env.GITHUB_SHA!==env.P5_GH_HANDOFF_APPROVED_MAIN_SHA||
    !ID.test(env.GITHUB_RUN_ID??"")||!CHAIN.test(env.P5_GH_HANDOFF_CHAIN_ID??"")||
    !/^[012]$/.test(env.P5_GH_HANDOFF_HOP??"")||
    typeof env.GITHUB_TOKEN!=="string"||env.GITHUB_TOKEN.length<16||
    !Number.isFinite(now))fail("NOT_EXACT_MANUAL_CANARY");
 const hop=Number(env.P5_GH_HANDOFF_HOP),parent=env.P5_GH_HANDOFF_PARENT_RUN_ID;
 const deadline=stamp(env.P5_GH_HANDOFF_DEADLINE_UTC);
 if(deadline<=now||deadline-now>30*60_000)fail("OUTSIDE_BOUNDED_CHAIN_WINDOW");
 let sent=null;
 if(hop===0){
  if(parent!=="0"||env.P5_GH_HANDOFF_SENT_AT_UTC)fail("ROOT_MUST_NOT_HAVE_PARENT");
 }else{
  if(!ID.test(parent??"")||parent===env.GITHUB_RUN_ID)fail("INVALID_PARENT_RUN");
  sent=stamp(env.P5_GH_HANDOFF_SENT_AT_UTC);
  if(sent>now||sent>=deadline)fail("INVALID_PARENT_SEND_CLOCK");
 }
 return {hop,parent,sent,deadline,chain:env.P5_GH_HANDOFF_CHAIN_ID,sha:env.GITHUB_SHA,id:env.GITHUB_RUN_ID};
}
export async function runP5GithubHandoffCanary(env,{fetcher=fetch,now=()=>Date.now()}={}){
 const started=now(),a=admitP5GithubHandoffCanary(env,started);
 const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+env.GITHUB_TOKEN,
  "X-GitHub-Api-Version":"2022-11-28"};
 const read=async(path)=>{
  try{
   const res=await fetcher(ROOT+path,{method:"GET",headers,redirect:"error",signal:AbortSignal.timeout(10000)});
   if(!res.ok)fail("GITHUB_METADATA_UNAVAILABLE");
   return await res.json();
  }catch{fail("GITHUB_METADATA_UNAVAILABLE");}
 };
 const current=await read("/actions/runs/"+a.id);
 function exactRun(row,id){
  if(String(row?.id)!==id||row.path!==".github/workflows/"+WF||row.head_branch!=="main"||
     row.head_sha!==a.sha||row.event!=="workflow_dispatch"||row.run_attempt!==1)
   fail("RUN_IDENTITY_MISMATCH");
  return row;
 }
 exactRun(current,a.id);
 if(current.display_title!==title(a.chain,a.hop,a.parent))fail("CURRENT_CHAIN_TITLE_MISMATCH");
 const created=stamp(current.created_at);
 if(created>started||created>=a.deadline)fail("CURRENT_RUN_CLOCK_INVALID");
 let parentConclusion=null;
 if(a.hop>0){
  const previous=exactRun(await read("/actions/runs/"+a.parent),a.parent);
  const expectedPrefix="P5 HANDOFF "+a.chain+" "+(a.hop-1)+" ";
  if(!previous.display_title?.startsWith(expectedPrefix)||
     !(a.hop===1?previous.display_title===expectedPrefix+"0":ID.test(previous.display_title.slice(expectedPrefix.length)))||
     stamp(previous.created_at)>a.sent||
     (previous.status==="completed"&&previous.conclusion!=="success"))
   fail("PARENT_NOT_SAME_BOUNDED_CHAIN");
  parentConclusion=previous.conclusion??null;
 }
 const live=await read("/git/ref/heads/main");
 if(live?.object?.sha!==a.sha)fail("MAIN_CHANGED");
 const base={
  schema:"v39.phase5.github-bounded-handoff-canary.v1",chainId:a.chain,hop:a.hop,
  runId:a.id,parentRunId:a.parent,reviewedMainSha:a.sha,
  runCreatedAtUtc:current.created_at,runnerObservedAtUtc:new Date(started).toISOString(),
  dispatchToObservedRunnerMs:a.sent===null?null:started-a.sent,
  runCreationToObservedRunnerMs:started-created,parentConclusionObserved:parentConclusion,
  providerCalls:0,databaseReads:0,databaseWrites:0,phase6PaidGo:false
 };
 if(a.hop===2)return {...base,status:"TERMINAL_HANDOFF_OBSERVED_NO_MORE_DISPATCH",dispatchCount:0,nextRunId:null};
 const send=now();
 // Reserve at least 30 seconds for request/ACK; never extend root deadline.
 if(!Number.isFinite(send)||send<started||send>=a.deadline-30000)fail("NO_TIME_FOR_NEXT_HANDOFF");
 let next;
 try{
  const res=await fetcher(ROOT+"/actions/workflows/"+WF+"/dispatches",{
   method:"POST",headers:{...headers,"Content-Type":"application/json"},redirect:"error",
   signal:AbortSignal.timeout(10000),
   body:JSON.stringify({ref:"main",return_run_details:true,inputs:{
    mode:"BOUNDED_HANDOFF",handoff_confirm:CONFIRM,approved_main_sha:a.sha,
    chain_id:a.chain,hop:String(a.hop+1),parent_run_id:a.id,
    deadline_utc:new Date(a.deadline).toISOString(),sent_at_utc:new Date(send).toISOString()
   }})});
  if(res.status!==200)fail("UNVERIFIED_DISPATCH_ACK");
  const b=await res.json();
  if(!Number.isSafeInteger(b?.workflow_run_id)||b.workflow_run_id<1||
     String(b.workflow_run_id)===a.id||String(b.workflow_run_id)===a.parent||
     b.run_url!==ROOT+"/actions/runs/"+b.workflow_run_id||
     b.html_url!=="https://github.com/"+REPO+"/actions/runs/"+b.workflow_run_id)fail("UNVERIFIED_DISPATCH_ACK");
  next=String(b.workflow_run_id);
 }catch{fail("UNKNOWN_DISPATCH_NO_RETRY");}
 return {...base,status:"ONE_SUCCESSOR_ACKNOWLEDGED_NOT_EXECUTION_PROOF",dispatchCount:1,
  nextRunId:next,nextDispatchAtUtc:new Date(send).toISOString()};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await runP5GithubHandoffCanary(process.env)));}
 catch(e){
  console.error(/^HOLD_P5_GH_HANDOFF_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P5_GH_HANDOFF_REDACTED_NO_RETRY");
  process.exitCode=2;
 }
}
