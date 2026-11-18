/** One real GH-only preview of the rolling controller. No dispatch path
 * reachable through this entrypoint. History may legitimately HOLD while
 * production is inert; the report must not imply release approval. */
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {readP6RollingGithubSnapshot} from "../server/lib/disruption/phase6RollingGithubController_v39.mjs";
const ROOT="https://api.github.com/repos/HKcode22/ReplitTranvr";
const CONFIRM="PREVIEW_ROLLING_CONTROLLER_READONLY_NO_PROVIDER_NO_DISPATCH";
const hold=s=>{throw Error("HOLD_P6_ROLLING_PREVIEW_"+s);};
export async function runP6RollingPreview(env,{now=Date.now,fetcher=fetch,emit=()=>{}}={}){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||env.P6_CONTROLLER_HEARTBEAT_CONFIRM!==CONFIRM||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")||
    env.P6_ROLLING_PREVIEW_APPROVED_MAIN!==env.GITHUB_SHA||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||env.P6_ROLLING_CONTROLLER_ENABLED==="1"||
    ["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","DATABASE_URL",
     "V39_DATABASE_RUNTIME_URL","V39_P5_SOURCE_DATABASE_URL","P5_V39_PRE_DATABASE_URL",
     "P5_V39_T24_WITNESS_DATABASE_URL","P5_V39_PREPARE_DATABASE_URL","P6_PRIVATE_READER_DATABASE_URL",
     "P6_PRIVATE_PUBLISHER_DATABASE_URL","P5_RETENTION_READER_DATABASE_URL"].some(k=>env[k])||
    typeof env.GITHUB_TOKEN!=="string"||env.GITHUB_TOKEN.length<16)
  hold("NOT_EXACT_READONLY_MAIN_SCOPE");
 const started=now(),epoch=Math.floor((started-3*3600000)/1000)*1000;
 if(!Number.isSafeInteger(started)||epoch<0)hold("INVALID_CLOCK");
 let requests=0;
 const read=async(url,init)=>{
  const u=new URL(url);
  if(init?.method!=="GET"||u.origin!=="https://api.github.com"||
     !u.pathname.startsWith("/repos/HKcode22/ReplitTranvr/")||
     u.username||u.password||u.hash||++requests>200)hold("UNREVIEWED_GET_OR_REQUEST_BOUND");
  const kind=u.pathname.includes("/workflows/")?"WORKFLOW_HISTORY":u.pathname.endsWith("/jobs")?"JOB_HISTORY":u.pathname.endsWith("/actions/runs")?"ACTIVE_SWEEP":"MAIN";
  try{
   const res=await fetcher(url,{...init,redirect:"error",signal:AbortSignal.timeout(10000)});
   if(!res.ok)emit({status:"P6_READONLY_PREVIEW_HTTP_FAILURE",kind,httpStatus:res.status,request:requests});
   return res;
  }catch(e){emit({status:"P6_READONLY_PREVIEW_TRANSPORT_FAILURE",kind,request:requests});throw e;}
 };
 const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+env.GITHUB_TOKEN,"X-GitHub-Api-Version":"2022-11-28"};
 async function checkMain(){
  const r=await read(ROOT+"/git/ref/heads/main",{method:"GET",headers});
  if(!r.ok||(await r.json())?.object?.sha!==env.GITHUB_SHA)hold("MAIN_CHANGED_OR_UNAVAILABLE");
 }
 await checkMain();
 const {plan,context}=await readP6RollingGithubSnapshot({sha:env.GITHUB_SHA,epoch,token:env.GITHUB_TOKEN,now,fetcher:read});
 await checkMain();
 return {schema:"v39.phase6.rolling-github-preview.v1",status:"ACTUAL_GITHUB_ROLLING_PREVIEW_ONLY_NO_GO",
  reviewedMainSha:env.GITHUB_SHA,historyFromUtc:new Date(epoch).toISOString(),observedAtUtc:new Date(context.clock).toISOString(),
  observedPlanStatus:plan.status,assessments:plan.assessments,hypotheticallyDue:plan.due,
  githubReadRequests:requests,dispatchCount:0,providerCalls:0,databaseReads:0,databaseWrites:0,phase6PaidGo:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await runP6RollingPreview(process.env)));}
 catch(e){const m=e?.message??"";console.error(/^HOLD_P6_ROLLING_(PREVIEW|CONTROLLER)_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_ROLLING_PREVIEW_REDACTED");process.exitCode=2;}
}
