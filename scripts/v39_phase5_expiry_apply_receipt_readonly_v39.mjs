/** Read-only independent reconciliation of ONE historical protected expiry run.
 * Never dispatch, replay, approve, call receiver, read DB or infer physical
 * storage/backup certification. Exact GitHub archive bytes and semantic proof.
 */
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {checkP5ApplyReceipt,P5_EXPIRY_APPLY_RECEIPT_FILE} from "./v39_phase5_expiry_receiver_apply_once_v39.mjs";
import {P5_EXPIRY_VERIFY_WORKFLOW} from "./v39_phase5_expiry_receiver_verify_once_v39.mjs";
const REPO="HKcode22/ReplitTranvr",WF=".github/workflows/phase5-published-expiry-protected-one-batch.yml";
const JOB="protected-one-batch",STEPS=["One protected due-only batch, never replay uncertain POST","Preserve exact aggregate one-batch receipt"];
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^sha256:[a-f0-9]{64}$/,id=v=>Number.isSafeInteger(v)&&v>0&&v<1e15;
const hold=s=>{throw Error("HOLD_P5_APPLY_READBACK_"+s);};
const hash=b=>createHash("sha256").update(b).digest("hex");
const facts={providerCalls:0,databaseWrites:0,objectDeletions:0,dispatchCount:0,permitReplay:false,permitRecurringApply:false,phase6PaidGo:false};
const keys=(obj,expected)=>obj&&typeof obj==="object"&&!Array.isArray(obj)&&Object.keys(obj).sort().join(",")===expected.split(",").sort().join(",");
function clock(v){const n=typeof v==="string"?Date.parse(v):NaN;if(!Number.isFinite(n))hold("CLOCK");return n;}
function scope(s){
 if(!s||!id(s.runId)||!id(s.verifiedRunId)||s.runId===s.verifiedRunId||
    !SHA.test(s.mainSha??"")||!SHA.test(s.verifiedMainSha??"")||!SHA.test(s.source??""))hold("SCOPE");
 return s;
}
function completedRun(r,runId,code,path){
 if(r?.id!==runId||r.path!==path||r.head_sha!==code||r.head_branch!=="main"||
    r.event!=="workflow_dispatch"||r.run_attempt!==1)hold("RUN_IDENTITY");
}
function exactList(body,key){
 if(!Number.isSafeInteger(body?.total_count)||body.total_count<0||body.total_count>100||
    !Array.isArray(body[key])||body[key].length!==body.total_count)hold("INCOMPLETE_HISTORY");
 return body[key];
}
export function unpackP5ApplyArchive(bytes,meta){
 if(!Buffer.isBuffer(bytes)||bytes.length!==meta.size||bytes.length<1||bytes.length>32768||
    "sha256:"+hash(bytes)!==meta.digest)hold("ARCHIVE_SIZE_OR_DIGEST");
 const dir=mkdtempSync(join(tmpdir(),"p5-apply-readback-")),path=join(dir,"receipt.zip");
 try{
  writeFileSync(path,bytes,{flag:"wx",mode:0o600});
  const out=execFileSync("unzip",["-Z1",path],{encoding:"utf8",timeout:10000,maxBuffer:4096,stdio:["ignore","pipe","ignore"]});
  if(out!==P5_EXPIRY_APPLY_RECEIPT_FILE+"\n"&&out!==P5_EXPIRY_APPLY_RECEIPT_FILE+"\r\n")hold("ARCHIVE_ENTRY");
  const raw=execFileSync("unzip",["-p",path,P5_EXPIRY_APPLY_RECEIPT_FILE],{timeout:10000,maxBuffer:16384,stdio:["ignore","pipe","ignore"]});
  if(raw.length<100||raw.length>16384)hold("RECEIPT_SIZE");
  return raw;
 }catch(e){if(/^HOLD_P5_APPLY_READBACK_/.test(e?.message??""))throw e;hold("ARCHIVE_UNPACK");}
 finally{rmSync(dir,{recursive:true,force:true});}
}
export async function readP5ProtectedApplyReceipt(input,{get,readArchive,unpack=unpackP5ApplyArchive,now=Date.now}){
 const s=scope(input);
 if(typeof get!=="function"||typeof readArchive!=="function")hold("READERS");
 const run=await get("/actions/runs/"+s.runId);
 completedRun(run,s.runId,s.mainSha,WF);
 const base={runId:s.runId,verifiedRunId:s.verifiedRunId,reviewedMainSha:s.mainSha,
  reviewedSourceSha:s.source,...facts};
 if(["waiting","queued","in_progress","pending","requested"].includes(run.status)&&run.conclusion===null)
  return {...base,status:"PENDING_NO_REPLAY",independentReceiptVerified:false};
 if(run.status!=="completed")hold("RUN_STATE");
 if(run.conclusion!=="success")
  return {...base,status:"TERMINAL_UNCERTAIN_NO_REPLAY",independentReceiptVerified:false};
 const start=clock(run.created_at),end=clock(run.updated_at);
 if(end<start||end>now()+5000)hold("RUN_CLOCK");
 const prior=await get("/actions/runs/"+s.verifiedRunId);
 completedRun(prior,s.verifiedRunId,s.verifiedMainSha,".github/workflows/"+P5_EXPIRY_VERIFY_WORKFLOW);
 if(prior.status!=="completed"||prior.conclusion!=="success"||clock(prior.updated_at)>start)hold("PRIOR_VERIFY");
 const jobs=exactList(await get("/actions/runs/"+s.runId+"/jobs?filter=latest&per_page=100"),"jobs");
 if(jobs.length!==1)hold("JOB_COUNT");
 const j=jobs[0];
 if(!id(j.id)||j.name!==JOB||j.run_id!==s.runId||j.head_sha!==s.mainSha||j.run_attempt!==1||
    j.status!=="completed"||j.conclusion!=="success")hold("JOB_IDENTITY");
 const js=clock(j.started_at),je=clock(j.completed_at);
 if(js<start-1000||je<js||je>end+1000)hold("JOB_CLOCK");
 for(const n of STEPS){
  const step=j.steps?.filter(x=>x.name===n)??[];
  if(step.length!==1||step[0].status!=="completed"||step[0].conclusion!=="success")hold("REQUIRED_STEP");
 }
 async function metadata(){
  const items=exactList(await get("/actions/runs/"+s.runId+"/artifacts?per_page=100"),"artifacts");
  const a=items[0];
  if(items.length!==1||!id(a?.id)||a.name!=="p5-expiry-apply-"+s.runId||a.expired!==false||
     !Number.isSafeInteger(a.size_in_bytes)||a.size_in_bytes<1||a.size_in_bytes>32768||
     !DIGEST.test(a.digest??"")||(a.workflow_run&&Number(a.workflow_run.id)!==s.runId))hold("ARTIFACT_METADATA");
  return {id:a.id,size:a.size_in_bytes,digest:a.digest};
 }
 const before=await metadata(),archive=await readArchive(before.id);
 const raw=unpack(archive,before),after=await metadata();
 if(JSON.stringify(before)!==JSON.stringify(after))hold("ARTIFACT_CHANGED");
 let receipt;try{receipt=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw));}catch{hold("RECEIPT_JSON");}
 if(!keys(receipt,"schema,runId,reviewedMainSha,verifiedMainSha,completedAtUtc,status,verifiedRunId,reviewedSourceSha,verification,providerCalls,objectDownloads,phase6PaidGo")||
   receipt.schema!=="v39.phase5.published-expiry-apply-receipt.v1"||
   receipt.runId!==s.runId||receipt.verifiedRunId!==s.verifiedRunId||receipt.reviewedMainSha!==s.mainSha||
   receipt.verifiedMainSha!==s.verifiedMainSha||receipt.reviewedSourceSha!==s.source||
   receipt.status!=="P5_PUBLISHED_ONE_DECLARED_EXPIRY_BATCH_RECEIPT"||receipt.providerCalls!==0||
   receipt.objectDownloads!==0||receipt.phase6PaidGo!==false)hold("RECEIPT_IDENTITY");
 const at=clock(receipt.completedAtUtc);
 if(new Date(at).toISOString()!==receipt.completedAtUtc||at<js-1000||at>je+1000)hold("RECEIPT_CLOCK");
 const verified=checkP5ApplyReceipt(receipt.verification,s.source);
 const final=await get("/actions/runs/"+s.runId);
 completedRun(final,s.runId,s.mainSha,WF);
 if(final.status!==run.status||final.conclusion!==run.conclusion||final.updated_at!==run.updated_at)hold("RUN_CHANGED");
 return {...base,status:verified.status==="DUE_AT_CUTOFF_CLEARED"?"VERIFIED_DUE_CUTOFF_CLEARED_NO_REPLAY":"VERIFIED_BACKLOG_REMAINS_NO_REPLAY",
  independentReceiptVerified:true,archiveDigestVerified:true,artifactId:before.id,receiptSha256:hash(raw),
  completedAtUtc:receipt.completedAtUtc,applyReported:verified,
  independentStorageIamVerified:false,backupRetentionVerified:false,fullRetentionCertified:false};
}
async function main(){
 if(process.argv.length!==7||!/^\d{1,15}$/.test(process.argv[2])||!/^\d{1,15}$/.test(process.argv[4])||
    process.env.GITHUB_ACTIONS==="true")hold("LOCAL_ARGS");
 const input=scope({runId:Number(process.argv[2]),mainSha:process.argv[3],verifiedRunId:Number(process.argv[4]),verifiedMainSha:process.argv[5],source:process.argv[6]});
 const safe={PATH:process.env.PATH,HOME:process.env.HOME,GH_PROMPT_DISABLED:"1",
    ...(process.env.GH_TOKEN?{GH_TOKEN:process.env.GH_TOKEN}:{})};
 const api=path=>execFileSync("gh",["api","--hostname","github.com","--method","GET","repos/"+REPO+path],
    {env:safe,timeout:30000,maxBuffer:524288,stdio:["ignore","pipe","ignore"]});
 const result=await readP5ProtectedApplyReceipt(input,{get:async path=>JSON.parse(api(path).toString("utf8")),
    readArchive:async artifactId=>{if(!id(artifactId))hold("ARTIFACT_ID");return api("/actions/artifacts/"+artifactId+"/zip");}});
 console.log(JSON.stringify(result));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{const m=e?.message??"";console.error(/^HOLD_P5_(APPLY_READBACK|PUBLISHED_EXPIRY_APPLY)_[A-Z0-9_]+$/.test(m)?m:"HOLD_P5_APPLY_READBACK_UNCERTAIN_NO_REPLAY");process.exitCode=2;});
}
