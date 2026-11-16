/** Candidate acceptance caller for ONE declared-expiry-only batch.
 * No scheduled activation, provider/DB credentials, object selectors,
 * retry or production approval. Requires exact independently proven prior
 * VERIFY_ONLY run, same deployed source, one actual explicitly approved
 * GitHub run ID and distinct apply token. No arbitrary target URLs.
 */
import {join} from "node:path";
import {tmpdir} from "node:os";
import {mkdtempSync,readdirSync,lstatSync,readFileSync,rmSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {readBoundedJson,verifyPublicIdentity,checkP5ExpiryVerificationArtifact,
 P5_EXPIRY_VERIFY_WORKFLOW,P5_EXPIRY_VERIFY_ARTIFACT_FILE} from "./v39_phase5_expiry_receiver_verify_once_v39.mjs";
const REPO="HKcode22/ReplitTranvr",ROOT="https://api.github.com/repos/"+REPO;
const ORIGIN="https://replit-tranvr--hk84164.replit.app";
const SHA=/^[a-f0-9]{40}$/,TOKEN=/^[a-f0-9]{64}$/,ID=/^[1-9][0-9]{0,14}$/;
const CONFIRM="APPLY_ONE_REVIEWED_DECLARED_EXPIRY_ONLY_BATCH_NO_PROVIDER_NO_GO";
const VERIFY_STEPS=["One exact published receiver verification; never retry unknown POST","Preserve exact aggregate VERIFY ONLY acceptance evidence"];
const hold=s=>{throw Error("HOLD_P5_PUBLISHED_EXPIRY_APPLY_"+s);};
export function admitP5PublishedExpiryApply(env){
 const mainSha=env.GITHUB_SHA,source=env.P5_EXPIRY_APPLY_DEPLOYED_SOURCE_SHA,
  verifiedMainSha=env.P5_EXPIRY_APPLY_VERIFIED_MAIN_SHA,verifiedRun=env.P5_EXPIRY_APPLY_VERIFIED_RUN_ID,
  token=env.P5_EXPIRY_APPLY_AUTH_TOKEN,ghToken=env.GITHUB_TOKEN;
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_RUN_ATTEMPT!=="1"||!ID.test(env.GITHUB_RUN_ID??"")||
    env.P5_EXPIRY_APPLY_APPROVED_RUN_ID!==env.GITHUB_RUN_ID||!SHA.test(mainSha??"")||
    env.P5_EXPIRY_APPLY_APPROVED_MAIN_SHA!==mainSha||!SHA.test(source??"")||
    env.P5_EXPIRY_APPLY_APPROVED_DEPLOYED_SHA!==source||!SHA.test(verifiedMainSha??"")||!ID.test(verifiedRun??"")||
    verifiedRun===env.GITHUB_RUN_ID||!TOKEN.test(token??"")||typeof ghToken!=="string"||ghToken.length<16||
    env.P5_EXPIRY_APPLY_ENABLED!=="1"||env.P5_EXPIRY_APPLY_CONFIRM!==CONFIRM||
    env.P5_EXPIRY_APPLY_APPROVAL!=="APPLY_BOUNDED_DECLARED_EXPIRY_ONLY_NO_PROVIDER"||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    ["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","DATABASE_URL","V39_DATABASE_RUNTIME_URL",
     "P5_RECURRING_EXPIRY_WRITER_URL","P5_RECURRING_EXPIRY_READER_URL","P5_EXPIRY_RECEIVER_AUTH_TOKEN"].some(k=>env[k]))
  hold("ADMISSION");
 return Object.freeze({mainSha,source,verifiedMainSha,verifiedRunId:Number(verifiedRun),runId:Number(env.GITHUB_RUN_ID),token,ghToken});
}
function downloadProof({runId,name,ghToken}){
 const dir=mkdtempSync(join(tmpdir(),"p5-expiry-verify-"));
 try{
  execFileSync("gh",["run","download",String(runId),"-R",REPO,"--name",name,"--dir",dir],
   {env:{PATH:process.env.PATH,HOME:process.env.HOME,GH_TOKEN:ghToken,GH_PROMPT_DISABLED:"1"},stdio:"ignore",timeout:30000});
  const files=readdirSync(dir),path=join(dir,P5_EXPIRY_VERIFY_ARTIFACT_FILE);
  if(files.length!==1||files[0]!==P5_EXPIRY_VERIFY_ARTIFACT_FILE)hold("ARTIFACT_FILES");
  const st=lstatSync(path);if(!st.isFile()||st.size<30||st.size>16384)hold("ARTIFACT_SIZE");
  return JSON.parse(readFileSync(path,"utf8"));
 }catch{hold("ARTIFACT_DOWNLOAD");}finally{rmSync(dir,{recursive:true,force:true});}
}
export async function independentlyReadP5VerifyProof(scope,{fetcher=fetch,readProof=downloadProof,now=Date.now}={}){
 const headers={accept:"application/vnd.github+json",authorization:"Bearer "+scope.ghToken,"X-GitHub-Api-Version":"2022-11-28"};
 const get=async(path)=>{
  const res=await fetcher(ROOT+path,{method:"GET",headers,redirect:"error",signal:AbortSignal.timeout(12000)});
  if(!res.ok)hold("GITHUB_READ");return res.json();
 };
 if((await get("/git/ref/heads/main"))?.object?.sha!==scope.mainSha)hold("MAIN_CHANGED");
 const run=await get("/actions/runs/"+scope.verifiedRunId);
 if(run?.id!==scope.verifiedRunId||run.path!==".github/workflows/"+P5_EXPIRY_VERIFY_WORKFLOW||
    run.head_sha!==scope.verifiedMainSha||run.head_branch!=="main"||run.event!=="workflow_dispatch"||
    run.run_attempt!==1||run.status!=="completed"||run.conclusion!=="success"||
    !Number.isFinite(Date.parse(run.created_at))||!Number.isFinite(Date.parse(run.updated_at))||
    Date.parse(run.created_at)>Date.parse(run.updated_at)||Date.parse(run.updated_at)>now()+5000)hold("VERIFY_RUN_IDENTITY");
 const jobs=await get("/actions/runs/"+scope.verifiedRunId+"/jobs?filter=latest&per_page=100");
 if(!Number.isSafeInteger(jobs?.total_count)||jobs.total_count<1||jobs.total_count>100||
    !Array.isArray(jobs.jobs)||jobs.jobs.length!==jobs.total_count)hold("VERIFY_JOB_HISTORY");
 const matches=jobs.jobs.filter(x=>x.name==="actual-verify-only");
 if(matches.length!==1||matches[0].run_id!==scope.verifiedRunId||matches[0].run_attempt!==1||
    matches[0].head_sha!==scope.verifiedMainSha||matches[0].status!=="completed"||matches[0].conclusion!=="success")hold("VERIFY_JOB_IDENTITY");
 for(const name of VERIFY_STEPS){
  const step=matches[0].steps?.filter(x=>x.name===name)??[];
  if(step.length!==1||step[0].status!=="completed"||step[0].conclusion!=="success")hold("VERIFY_STEP");
 }
 const ar=await get("/actions/runs/"+scope.verifiedRunId+"/artifacts?per_page=100"),name="p5-expiry-verify-"+scope.verifiedRunId;
 if(ar?.total_count!==1||!Array.isArray(ar.artifacts)||ar.artifacts.length!==1)hold("ARTIFACT_HISTORY");
 const item=ar.artifacts[0];
 if(item.name!==name||item.expired!==false||!Number.isSafeInteger(item.id)||item.id<1||
    !Number.isSafeInteger(item.size_in_bytes)||item.size_in_bytes<1||item.size_in_bytes>32768||
    (item.workflow_run&&Number(item.workflow_run.id)!==scope.verifiedRunId))hold("ARTIFACT_METADATA");
 const proof=checkP5ExpiryVerificationArtifact(await readProof({runId:scope.verifiedRunId,name,ghToken:scope.ghToken}),
  {runId:scope.verifiedRunId,source:scope.source,mainSha:scope.verifiedMainSha});
 const at=Date.parse(proof.verifiedAtUtc);
 if(at<Date.parse(run.created_at)-1000||at>Date.parse(run.updated_at)+1000)hold("ARTIFACT_CLOCK");
 if((await get("/git/ref/heads/main"))?.object?.sha!==scope.mainSha)hold("MAIN_CHANGED");
 return proof;
}
const COUNTS=["selectedCount","verifiedNowCount","alreadyVerifiedCount","independentlyReadBackCount",
 "recoveredReadbackCount","remainingAtCutoff","remainingUnwitnessedMarkersAtCutoff"];
export function checkP5ApplyReceipt(got,source){
 const base={reviewedSourceSha:source,mode:"APPLY_DUE_ONLY",providerCalls:0,objectDownloads:0,
  distinctDbActorsVerified:true,separateStorageReadRequests:true,independentStorageIamVerified:false,
  backupRetentionVerified:false,phase6PaidGo:false,declaredExpiryOnly:true};
 if(!got||typeof got!=="object"||Array.isArray(got)||
    Object.keys(got).sort().join(",")!==[...Object.keys(base),"status",...COUNTS].sort().join(",")||
    !Object.entries(base).every(([k,v])=>got[k]===v)||!["DUE_AT_CUTOFF_CLEARED","BACKLOG_REMAINS_AT_CUTOFF"].includes(got.status)||
    !COUNTS.every(k=>Number.isSafeInteger(got[k])&&got[k]>=0)||got.selectedCount>25||
    got.verifiedNowCount+got.alreadyVerifiedCount>got.selectedCount||
    got.independentlyReadBackCount!==got.verifiedNowCount+got.alreadyVerifiedCount||
    got.recoveredReadbackCount>got.alreadyVerifiedCount||
    (got.status==="DUE_AT_CUTOFF_CLEARED")!==(got.remainingAtCutoff===0&&got.remainingUnwitnessedMarkersAtCutoff===0))
  hold("RECEIPT_MISMATCH_NO_RETRY");
 return {...base,status:got.status,...Object.fromEntries(COUNTS.map(k=>[k,got[k]]))};
}
export async function applyP5PublishedExpiryOnce(env,{fetcher=fetch,readProof=downloadProof,now=Date.now}={}){
 const scope=admitP5PublishedExpiryApply(env);
 await independentlyReadP5VerifyProof(scope,{fetcher,readProof,now});
 // No authorization header on public health. Distinct scoped APPLY token
 // goes only to fixed reviewed receiver after GitHub and live source proof.
 let health;
 try{health=await fetcher(ORIGIN+"/__v39/workspace-runtime",{method:"GET",redirect:"error",signal:AbortSignal.timeout(20000),headers:{accept:"application/json"}});}
 catch{hold("PUBLIC_GET");}
 verifyPublicIdentity(await readBoundedJson(health),scope.source);
 let response;
 try{response=await fetcher(ORIGIN+"/__v39/phase5/recurring-expiry",{method:"POST",redirect:"error",
  signal:AbortSignal.timeout(120000),headers:{accept:"application/json",authorization:"Bearer "+scope.token,
   "x-p5-expiry-reviewed-sha":scope.source,"x-p5-expiry-mode":"APPLY_DUE_ONLY"}});}
 catch{hold("POST_OUTCOME_UNKNOWN_NO_RETRY");}
 const verification=checkP5ApplyReceipt(await readBoundedJson(response),scope.source);
 return {status:"P5_PUBLISHED_ONE_DECLARED_EXPIRY_BATCH_RECEIPT",verifiedRunId:scope.verifiedRunId,
  reviewedSourceSha:scope.source,verification,providerCalls:0,objectDownloads:0,phase6PaidGo:false};
}
// Deliberately no CLI entry, workflow dispatch, schedule or secret setting
// until actual VERIFY_ONLY and separately reviewed APPLY delivery/activation.
