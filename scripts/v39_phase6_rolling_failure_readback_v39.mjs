/** Existing heartbeat manual read-only mode. No paid credentials/dispatch.
 * Authenticate exact failed workflow/job/artifact identity before reading
 * the finite sanitized journal; known run GETs cannot certify settlement.
 */
import {execFileSync} from "node:child_process";
import {mkdtempSync,readdirSync,lstatSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {P6_ROLLING_CONTROLLER_WORKFLOW,parseP6RollingFailureCustody,reconcileP6FailureCustody} from "../server/lib/disruption/phase6RollingFailureCustodyReadback_v39.mjs";
const REPO="HKcode22/ReplitTranvr",ROOT="https://api.github.com/repos/"+REPO;
const CONFIRM="READONLY_FAILED_ROLLING_CUSTODY_NO_REPLAY_NO_PROVIDER";
const FILE="p6-rolling-failure-custody.jsonl",JOB="one-protected-bounded-session";
const STEP="Preserve failure-only operational attempt custody (never replay permission)";
const hold=s=>{throw Error("HOLD_P6_ROLLING_FAILURE_READBACK_"+s);};
const code=s=>typeof s==="string"&&/^[a-f0-9]{40}$/.test(s);
const id=s=>typeof s==="string"&&/^[1-9][0-9]{0,14}$/.test(s);
const failStates=new Set(["failure","cancelled","timed_out"]);
export function admitP6FailureReadback(env){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_RUN_ATTEMPT!=="1"||
    env.P6_CONTROLLER_HEARTBEAT_CONFIRM!==CONFIRM||!code(env.GITHUB_SHA)||
    env.P6_ROLLING_PREVIEW_APPROVED_MAIN!==env.GITHUB_SHA||
    !id(env.P6_ROLLING_FAILED_RUN_ID)||!code(env.P6_ROLLING_FAILED_MAIN_SHA)||
    env.P6_ROLLING_FAILED_RUN_ID===env.GITHUB_RUN_ID||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    ["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","DATABASE_URL","V39_DATABASE_RUNTIME_URL",
     "V39_P5_SOURCE_DATABASE_URL","P5_V39_PRE_DATABASE_URL","P5_V39_PREPARE_DATABASE_URL","P5_V39_T24_WITNESS_DATABASE_URL",
     "P6_PRIVATE_READER_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL","P5_RETENTION_READER_DATABASE_URL",
     "P5_V39_OTHER_REST_REVIEW_DATABASE_URL","P5_V39_OTHER_REST_RESERVE_DATABASE_URL"].some(k=>env[k])||
    typeof env.GITHUB_TOKEN!=="string"||env.GITHUB_TOKEN.length<16)hold("NOT_EXACT_READONLY_SCOPE");
 return {main:env.GITHUB_SHA,failedMain:env.P6_ROLLING_FAILED_MAIN_SHA,runId:Number(env.P6_ROLLING_FAILED_RUN_ID),token:env.GITHUB_TOKEN};
}
function download({runId,name,token}){
 const dir=mkdtempSync(join(tmpdir(),"p6-failure-readback-"));
 try{
  execFileSync("gh",["run","download",String(runId),"--repo",REPO,"--name",name,"--dir",dir],{
    env:{PATH:process.env.PATH,HOME:process.env.HOME,GH_TOKEN:token,GH_PROMPT_DISABLED:"1"},
    timeout:30000,stdio:"ignore"});
  const files=readdirSync(dir),p=join(dir,FILE);
  if(files.length!==1||files[0]!==FILE)hold("ARTIFACT_FILE");
  const s=lstatSync(p);
  if(!s.isFile()||s.size<100||s.size>65536)hold("ARTIFACT_FILE");
  return readFileSync(p);
 }catch{hold("ARTIFACT_DOWNLOAD_OR_FILE");}
 finally{rmSync(dir,{recursive:true,force:true});}
}
export async function runP6FailureReadback(env,{fetcher=fetch,readArtifact=download,now=Date.now}={}){
 const a=admitP6FailureReadback(env),started=now();
 if(!Number.isSafeInteger(started))hold("CLOCK");
 let requests=0;
 const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+a.token,"X-GitHub-Api-Version":"2022-11-28"};
 async function get(path){
  if(++requests>170||now()<started||now()-started>180000)hold("READ_BOUND");
  const u=new URL(ROOT+path);
  if(u.origin!=="https://api.github.com"||!u.pathname.startsWith("/repos/"+REPO+"/")||u.username||u.password||u.hash)hold("GET_SCOPE");
  const res=await fetcher(u.href,{method:"GET",headers,redirect:"error",signal:AbortSignal.timeout(10000)});
  if(!res.ok)hold("GITHUB_READ");
  return res.json();
 }
 async function main(){if((await get("/git/ref/heads/main"))?.object?.sha!==a.main)hold("MAIN_CHANGED");}
 await main();
 const run=await get("/actions/runs/"+a.runId);
 if(run?.id!==a.runId||run.path!==".github/workflows/"+P6_ROLLING_CONTROLLER_WORKFLOW||
    run.head_sha!==a.failedMain||run.head_branch!=="main"||run.event!=="workflow_dispatch"||
    run.run_attempt!==1||run.status!=="completed"||!failStates.has(run.conclusion))hold("FAILED_RUN_IDENTITY");
 const jr=await get("/actions/runs/"+a.runId+"/jobs?filter=latest&per_page=100");
 if(!Number.isSafeInteger(jr?.total_count)||jr.total_count<1||jr.total_count>100||
    !Array.isArray(jr.jobs)||jr.jobs.length!==jr.total_count)hold("JOB_HISTORY");
 const jobs=jr.jobs.filter(j=>j.name===JOB);
 if(jobs.length!==1||jobs[0].run_id!==a.runId||jobs[0].head_sha!==a.failedMain||jobs[0].run_attempt!==1||
    jobs[0].status!=="completed"||!failStates.has(jobs[0].conclusion))hold("FAILED_JOB_IDENTITY");
 const steps=jobs[0].steps?.filter(s=>s.name===STEP)??[];
 if(steps.length!==1||steps[0].status!=="completed"||steps[0].conclusion!=="success")hold("FAILURE_UPLOAD_STEP");
 const name="p6-rolling-failure-custody-"+a.runId;
 async function artifact(){
  const ar=await get("/actions/runs/"+a.runId+"/artifacts?per_page=100");
  if(!Number.isSafeInteger(ar?.total_count)||ar.total_count<1||ar.total_count>4||
     !Array.isArray(ar.artifacts)||ar.artifacts.length!==ar.total_count)hold("ARTIFACT_HISTORY");
  const m=ar.artifacts.filter(x=>x.name===name);
  if(m.length!==1||m[0].expired!==false||!Number.isSafeInteger(m[0].id)||m[0].id<1||
     !Number.isSafeInteger(m[0].size_in_bytes)||m[0].size_in_bytes<1||m[0].size_in_bytes>131072||
     (m[0].workflow_run&&Number(m[0].workflow_run.id)!==a.runId)||
     !/^sha256:[a-f0-9]{64}$/.test(m[0].digest??""))hold("ARTIFACT_METADATA");
  return {id:m[0].id,size:m[0].size_in_bytes,digest:m[0].digest};
 }
 const before=await artifact();
 const bytes=await readArtifact({runId:a.runId,name,token:a.token}),after=await artifact();
 if(before.id!==after.id||before.size!==after.size||before.digest!==after.digest)hold("ARTIFACT_CHANGED");
 const parsed=parseP6RollingFailureCustody(bytes,{runId:a.runId,mainSha:a.failedMain});
 const created=Date.parse(run.created_at);
 if(!Number.isFinite(created)||created<Date.parse(parsed.scope.epochUtc)-1000||
    created>=Date.parse(parsed.scope.chainDeadlineUtc))hold("FAILED_RUN_CLOCK");
 const diagnosis=await reconcileP6FailureCustody(parsed,{readRun:id=>get("/actions/runs/"+id)});
 await main();
 return {...diagnosis,reviewedReaderMainSha:a.main,artifactId:before.id,githubReadRequests:requests,
  artifactDownloads:1,artifactMetadataBound:true,artifactZipDigestIndependentlyVerified:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await runP6FailureReadback(process.env)));}
 catch(e){const m=e?.message??"";console.error(/^HOLD_P6_ROLLING_FAILURE_READBACK_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_ROLLING_FAILURE_READBACK_REDACTED_NO_REPLAY");process.exitCode=2;}
}
