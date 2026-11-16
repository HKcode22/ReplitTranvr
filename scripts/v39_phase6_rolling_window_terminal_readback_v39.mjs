/** Manual mode of the existing NO PROVIDER heartbeat. Verify complete
 * historical controller window with direct GETs + byte-exact artifact ZIP
 * digests. Caller-provided scope is not a release/settlement authority.
 */
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {verifyP6RollingWindowTerminalEvidence} from "../server/lib/disruption/phase6RollingWindowTerminalEvidence_v39.mjs";
const REPO="HKcode22/ReplitTranvr",ROOT="https://api.github.com/repos/"+REPO;
const WF="phase6-rolling-controller-bounded-session.yml",FILE="p6-rolling-terminal-receipt.json";
const CONFIRM="READONLY_TERMINAL_ROLLING_WINDOW_CUSTODY_NO_PROVIDER_NO_GO";
const CODE=/^[a-f0-9]{40}$/;
const H=/^[a-f0-9]{64}$/;
const id=x=>Number.isSafeInteger(x)&&x>0&&x<1e15;
const hold=s=>{throw Error("HOLD_P6_WINDOW_READBACK_"+s);};
const hash=b=>createHash("sha256").update(b).digest("hex");
const fields=["rootRunId","reviewedMainSha","policyCommitment","mode","windowStartUtc","windowEndUtc","epochUtc","chainDeadlineUtc"];
function time(s){if(typeof s!=="string"||!Number.isFinite(Date.parse(s))||new Date(s).toISOString()!==s)hold("SCOPE_CLOCK");return Date.parse(s);}
export function admitP6WindowTerminalReadback(env){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_RUN_ATTEMPT!=="1"||!CODE.test(env.GITHUB_SHA??"")||
    env.P6_CONTROLLER_HEARTBEAT_CONFIRM!==CONFIRM||env.P6_ROLLING_PREVIEW_APPROVED_MAIN!==env.GITHUB_SHA||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    ["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","DATABASE_URL","V39_DATABASE_RUNTIME_URL",
    "V39_P5_SOURCE_DATABASE_URL","P5_V39_PRE_DATABASE_URL","P5_V39_PREPARE_DATABASE_URL","P5_V39_T24_WITNESS_DATABASE_URL",
    "P6_PRIVATE_READER_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL","P5_RETENTION_READER_DATABASE_URL",
    "P5_V39_OTHER_REST_REVIEW_DATABASE_URL","P5_V39_OTHER_REST_RESERVE_DATABASE_URL"].some(k=>env[k])||
    typeof env.GITHUB_TOKEN!=="string"||env.GITHUB_TOKEN.length<16)hold("EXACT_READONLY_SCOPE");
 const raw=env.P6_ROLLING_WINDOW_SCOPE_JSON;
 if(typeof raw!=="string"||Buffer.byteLength(raw)<100||Buffer.byteLength(raw)>2048)hold("SCOPE_BYTES");
 let expected;try{expected=JSON.parse(raw);}catch{hold("SCOPE_BYTES");}
 if(!expected||Object.keys(expected).sort().join(",")!==[...fields].sort().join(",")||JSON.stringify(expected)!==raw||
   !id(expected.rootRunId)||String(expected.rootRunId)===env.GITHUB_RUN_ID||
   !CODE.test(expected.reviewedMainSha??"")||!H.test(expected.policyCommitment??"")||!["SINGLE","FOUR"].includes(expected.mode))
  hold("SCOPE_IDENTITY");
 const ws=time(expected.windowStartUtc),we=time(expected.windowEndUtc),epoch=time(expected.epochUtc),deadline=time(expected.chainDeadlineUtc);
 if(ws>=we||we-ws>120*60000||epoch<ws||epoch>=deadline||deadline>we||
   (expected.mode==="SINGLE"?deadline-epoch>30*60000:deadline-epoch<90*60000||deadline-epoch>120*60000))hold("SCOPE_CLOCK");
 return {main:env.GITHUB_SHA,expected,token:env.GITHUB_TOKEN};
}
function downloadArchive({artifactId,token}){
 try{return execFileSync("gh",["api","--hostname","github.com","--method","GET","repos/"+REPO+"/actions/artifacts/"+artifactId+"/zip"],{
  env:{PATH:process.env.PATH,HOME:process.env.HOME,GH_TOKEN:token,GH_PROMPT_DISABLED:"1"},timeout:30000,
  maxBuffer:131072,stdio:["ignore","pipe","ignore"]});}
 catch{hold("ARCHIVE_DOWNLOAD");}
}
export function unpackP6WindowReceiptArchive(bytes,meta){
 return unpackP6ControllerArtifactArchive(bytes,meta,"TERMINAL");
}
export function unpackP6ControllerArtifactArchive(bytes,meta,kind){
 if(!["TERMINAL","FAILURE"].includes(kind))hold("ARCHIVE_FILE_SCOPE");
 const name=kind==="TERMINAL"?FILE:"p6-rolling-failure-custody.jsonl",maxArchive=kind==="TERMINAL"?65536:131072,maxFile=kind==="TERMINAL"?32768:65536;
 if(!Buffer.isBuffer(bytes)||bytes.length!==meta.size||bytes.length<1||bytes.length>maxArchive||
   "sha256:"+hash(bytes)!==meta.digest)hold("ARCHIVE_SIZE_OR_DIGEST");
 const dir=mkdtempSync(join(tmpdir(),"p6-terminal-readback-")),path=join(dir,"receipt.zip");
 try{
  writeFileSync(path,bytes,{flag:"wx",mode:0o600});
  const list=execFileSync("unzip",["-Z1",path],{timeout:10000,maxBuffer:4096,stdio:["ignore","pipe","ignore"],encoding:"utf8"});
  if(list!==name+"\n"&&list!==name+"\r\n")hold("ARCHIVE_FILE_SCOPE");
  const raw=execFileSync("unzip",["-p",path,name],{timeout:10000,maxBuffer:maxFile,stdio:["ignore","pipe","ignore"]});
  if(raw.length<100||raw.length>maxFile)hold("RECEIPT_SIZE");
  return raw;
 }catch(e){if(/^HOLD_P6_WINDOW_READBACK_/.test(e?.message??""))throw e;hold("ARCHIVE_UNPACK");}
 finally{rmSync(dir,{recursive:true,force:true});}
}
export async function runP6WindowTerminalReadback(env,{fetcher=fetch,readArchive=downloadArchive,now=Date.now}={}){
 const a=admitP6WindowTerminalReadback(env),started=now();let requests=0,downloads=0;
 const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+a.token,"X-GitHub-Api-Version":"2022-11-28"};
 async function get(path){
  if(++requests>600||now()<started||now()-started>360000)hold("REQUEST_OR_TIME_BOUND");
  const u=new URL(ROOT+path);
  if(u.origin!=="https://api.github.com"||!u.pathname.startsWith("/repos/"+REPO+"/")||u.username||u.password||u.hash)hold("GET_SCOPE");
  const res=await fetcher(u.href,{method:"GET",headers,redirect:"error",signal:AbortSignal.timeout(10000)});
  if(!res.ok)hold("GITHUB_READ");
  const left=res.headers?.get?.("x-ratelimit-remaining");
  if(left!==null&&left!==undefined&&(!/^\d+$/.test(left)||Number(left)<25))hold("GITHUB_RATE_RESERVE");
  return res.json();
 }
 async function main(){if((await get("/git/ref/heads/main"))?.object?.sha!==a.main)hold("READER_MAIN_CHANGED");}
 function complete(body,key,limit){
  if(!Number.isSafeInteger(body?.total_count)||body.total_count<0||body.total_count>limit||
     !Array.isArray(body[key])||body[key].length!==body.total_count)hold("INCOMPLETE_HISTORY");
  return body[key];
 }
 async function artifact(runId){
  const m=complete(await get("/actions/runs/"+runId+"/artifacts?per_page=100"),"artifacts",4);
  const name="p6-rolling-terminal-"+runId;
  if(m.length!==1||m[0].name!==name||m[0].expired!==false||!id(m[0].id)||
    !Number.isSafeInteger(m[0].size_in_bytes)||m[0].size_in_bytes<1||m[0].size_in_bytes>65536||
    (m[0].workflow_run&&Number(m[0].workflow_run.id)!==runId)||!/^sha256:[a-f0-9]{64}$/.test(m[0].digest??""))hold("ARTIFACT_METADATA");
  return {id:m[0].id,name,size:m[0].size_in_bytes,digest:m[0].digest};
 }
 await main();
 const out=await verifyP6RollingWindowTerminalEvidence(a.expected,{
  now,
  readRun:runId=>get("/actions/runs/"+runId),
  readJobs:async runId=>complete(await get("/actions/runs/"+runId+"/jobs?filter=latest&per_page=100"),"jobs",100),
  readReceipt:async runId=>{
   if(++downloads>4||now()-started>330000)hold("DOWNLOAD_BOUND");
   const before=await artifact(runId),archive=await readArchive({artifactId:before.id,token:a.token});
   const bytes=unpackP6WindowReceiptArchive(archive,before),after=await artifact(runId);
   if(JSON.stringify(before)!==JSON.stringify(after))hold("ARTIFACT_CHANGED");
   return {artifactId:before.id,runId,name:before.name,bytes};
  },
  listControllers:async({fromUtc,untilUtc,scheduledRootRunId})=>{
   const q=new URLSearchParams({branch:"main",event:"workflow_dispatch",per_page:"100",created:fromUtc+".."+untilUtc});
   const rows=complete(await get("/actions/workflows/"+WF+"/runs?"+q),"workflow_runs",100);
   // GitHub's range is inclusive; admit only exact timestamps in the
   // half-open reviewed window. Reject out-of-range rows except the
   // exact upper boundary (a different window), never hide a partial page.
   const from=time(fromUtc),until=time(untilUtc);
   if(rows.some(x=>!Number.isFinite(Date.parse(x?.created_at))||Date.parse(x.created_at)<from||Date.parse(x.created_at)>until))hold("CHAIN_LIST_CLOCK_SCOPE");
   const selected=rows.filter(x=>Date.parse(x.created_at)<until);
   if(scheduledRootRunId)selected.push(await get("/actions/runs/"+scheduledRootRunId));
   return selected;
  }
 });
 await main();
 return {...out,reviewedReaderMainSha:a.main,githubReadRequests:requests,receiptArchiveDownloads:downloads,
  archiveDigestIndependentlyVerified:true,artifactMetadataBeforeAfterBound:true,actualDbOwnershipVerified:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await runP6WindowTerminalReadback(process.env)));}
 catch(e){const m=e?.message??"";console.error(/^HOLD_P6_WINDOW_(READBACK|TERMINAL)_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_WINDOW_READBACK_REDACTED_NO_GO");process.exitCode=2;}
}
