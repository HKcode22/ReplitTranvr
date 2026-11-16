/** Prepare exactly one protected V4 APPLY run, never approve or POST it.
 * Owner-local existing custody, no new token, no provider or DB access.
 * Requires actual successful V4 VERIFY, environment reviewer gate, no
 * previous apply history or ambiguous intent. No automatic retry.
 */
import {execFileSync} from "node:child_process";
import {constants,openSync,fstatSync,lstatSync,readFileSync,writeFileSync,fsyncSync,closeSync} from "node:fs";
import {homedir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {independentlyReadP5VerifyProof} from "./v39_phase5_expiry_receiver_apply_once_v39.mjs";
import {verifyPublicIdentity,readBoundedJson} from "./v39_phase5_expiry_receiver_verify_once_v39.mjs";
const REPO="HKcode22/ReplitTranvr",ROOT="repos/"+REPO,WF="phase5-published-expiry-protected-one-batch.yml";
const V4="bfbfcdc15035995b8d2ed7f4befa1db74d71b7ac",V3="4436773f2c7e684d05c55878c6eb13b46f16ac06";
const ENV="phase5-expiry-one-batch",SHA=/^[a-f0-9]{40}$/,ID=/^[1-9][0-9]{0,14}$/,TOKEN=/^[a-f0-9]{64}$/;
const APPROVAL="PREPARE_ONE_WAITING_V4_DECLARED_EXPIRY_BATCH_NO_AUTO_APPROVAL_NO_GO";
const CONFIRM="APPLY_ONE_REVIEWED_DECLARED_EXPIRY_ONLY_BATCH_NO_PROVIDER_NO_GO";
const keys=["P5_EXPIRY_APPLY_AUTH_TOKEN","P5_EXPIRY_APPLY_APPROVAL","P5_EXPIRY_APPLY_ENABLED","P5_EXPIRY_APPLY_APPROVED_RUN_ID"];
const hold=s=>{throw Error("HOLD_P5_V4_APPLY_HANDOFF_"+s);};
const isId=x=>Number.isSafeInteger(x)&&x>0&&x<1e15;
const sleepDefault=ms=>new Promise(r=>setTimeout(r,ms));
export function admitP5V4ApplyHandoff(e){
 if(e.GITHUB_ACTIONS==="true"||e.P5_V4_APPLY_HANDOFF_CONFIRM!==APPROVAL||
   !SHA.test(e.P5_V4_APPLY_HANDOFF_MAIN_SHA??"")||!SHA.test(e.P5_V4_APPLY_HANDOFF_VERIFIED_MAIN_SHA??"")||
   !ID.test(e.P5_V4_APPLY_HANDOFF_VERIFIED_RUN_ID??"")||e.ADB_AUTO_COLLECT!=="0"||
   e.V39_PHASE6_PROCESS_ARMED!=="0"||e.V39_PHASE6_OWNER_APPROVED!=="0"||e.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
   ["DATABASE_URL","V39_DATABASE_RUNTIME_URL","AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY",
    "P5_EXPIRY_RECEIVER_AUTH_TOKEN","P5_EXPIRY_APPLY_AUTH_TOKEN","P5_RECURRING_EXPIRY_WRITER_URL","P5_RECURRING_EXPIRY_READER_URL"].some(k=>e[k]))
  hold("EXACT_OWNER_STOP_CONFIRM");
 return {main:e.P5_V4_APPLY_HANDOFF_MAIN_SHA,verifiedMain:e.P5_V4_APPLY_HANDOFF_VERIFIED_MAIN_SHA,
  verifiedRunId:Number(e.P5_V4_APPLY_HANDOFF_VERIFIED_RUN_ID),source:V4};
}
function environmentScope(x){
 if(x?.name!==ENV||!isId(x.id)||!Array.isArray(x.protection_rules))hold("PROTECTED_ENVIRONMENT");
 const r=x.protection_rules.filter(y=>y.type==="required_reviewers");
 if(r.length!==1||!Array.isArray(r[0].reviewers)||r[0].reviewers.length<1||
  r[0].reviewers.some(y=>!["User","Team"].includes(y.type)||!isId(y.reviewer?.id)))hold("REQUIRED_REVIEWERS");
 // Stable exact reviewer identity and prevent-self-review flag. Do not
 // change, disable, or bypass the environment, even from an owner shell.
 return {id:x.id,reviewers:r[0].reviewers.map(y=>y.type+":"+y.reviewer.id).sort(),
  preventSelfReview:r[0].prevent_self_review===true};
}
function exactPending(x,scope,id,gate){
 if(x?.id!==id||x.head_sha!==scope.main||x.head_branch!=="main"||x.event!=="workflow_dispatch"||
  x.run_attempt!==1||x.path!==".github/workflows/"+WF||!["queued","in_progress","waiting","pending","requested"].includes(x.status)||
  x.conclusion!==null)hold("RUN_NO_LONGER_PENDING_NO_RETRY");
}
export async function prepareP5V4ApplyHandoff(env,io){
 const a=admitP5V4ApplyHandoff(env);
 const local=await io.localReview(a);
 if(!local||!TOKEN.test(local.applyToken??"")||!TOKEN.test(local.verifyToken??"")||local.applyToken===local.verifyToken)
  hold("DISTINCT_LOCAL_PAIR");
 async function main(){
  if(await io.remoteMain()!==a.main||await io.sourceVariable()!==V4)hold("MAIN_OR_SOURCE_CHANGED");
 }
 async function health(){await io.verifyLiveSource(a.source);}
 await main();
 await io.verifyPrior(a);await health();await main();
 const gate=environmentScope(await io.environment());
 const names=await io.secretNames();
 if(!Array.isArray(names)||names.some(x=>keys.includes(x)))hold("EXISTING_ENVIRONMENT_APPROVAL_RECONCILE");
 const history=await io.previousRuns();
 if(!Array.isArray(history)||history.length!==0)hold("PREVIOUS_APPLY_HISTORY_NO_REPLAY");
 await io.writeIntent({main:a.main,source:V4,verifiedMain:a.verifiedMain,verifiedRunId:a.verifiedRunId,neverReplay:true});
 await main();
 let result;
 try{result=await io.dispatch({ref:"main",return_run_details:true,inputs:{confirm:CONFIRM,approved_main_sha:a.main,
  approved_deployed_sha:V4,verified_main_sha:a.verifiedMain,verified_run_id:String(a.verifiedRunId)}});}
 catch{hold("DISPATCH_UNKNOWN_NO_RETRY");}
 const id=result?.workflow_run_id;
 if(!isId(id)||id===a.verifiedRunId||result.run_url!=="https://api.github.com/"+ROOT+"/actions/runs/"+id||
  result.html_url!=="https://github.com/"+REPO+"/actions/runs/"+id)hold("DISPATCH_ACK_UNKNOWN_NO_RETRY");
 await io.writeAck({runId:id,main:a.main,source:V4,neverReplay:true});
 async function checkedWaiting(){
  await main();
  if(JSON.stringify(environmentScope(await io.environment()))!==JSON.stringify(gate))hold("ENVIRONMENT_CHANGED");
  exactPending(await io.run(id),a,id,gate);
  const pending=await io.pending(id);
  if(!Array.isArray(pending))hold("PENDING_ENVIRONMENT_HISTORY");
  if(!pending.length)return false;
  if(pending.length!==1||pending[0].environment?.name!==ENV||pending[0].environment?.id!==gate.id||
   !Array.isArray(pending[0].reviewers)||
   JSON.stringify(pending[0].reviewers.map(y=>y.type+":"+y.reviewer?.id).sort())!==JSON.stringify(gate.reviewers))
   hold("EXACT_WAITING_ENVIRONMENT");
  return true;
 }
 let waiting=false;
 for(let i=0;i<=8;i++){
  if(await checkedWaiting()){waiting=true;break;}
  if(i<8)await io.sleep(3000);
 }
 if(!waiting)hold("WAITING_ENVIRONMENT_UNPROVED_NO_RETRY");
 // A run-ID approval is registered LAST. Before it exists, this exact
 // workflow's admission denies APPLY. No review approval endpoint called.
 const values=[local.applyToken,"APPLY_BOUNDED_DECLARED_EXPIRY_ONLY_NO_PROVIDER","1",String(id)];
 for(let i=0;i<keys.length;i++){
  if(!await checkedWaiting())hold("ENVIRONMENT_WAIT_LOST_NO_RETRY");
  try{await io.setEnvironmentSecret(keys[i],values[i]);}catch{hold("SECRET_WRITE_UNKNOWN_NO_RETRY");}
  const read=await io.secretNames();
  if(!Array.isArray(read)||!keys.slice(0,i+1).every(k=>read.includes(k))||
   keys.slice(i+1).some(k=>read.includes(k)))hold("SECRET_NAME_READBACK_DRIFT_NO_RETRY");
 }
 if(!await checkedWaiting())hold("FINAL_WAIT_LOST_RECONCILE_NO_RETRY");
 return {status:"P5_V4_EXACT_APPLY_RUN_STAGED_AWAITING_HUMAN_ENVIRONMENT_REVIEW",runId:id,
  verifiedRunId:a.verifiedRunId,reviewedMainSha:a.main,reviewedSourceSha:V4,
  existingDistinctApplyTokenReused:true,environmentReviewRequired:true,environmentApprovalPerformed:false,
  secretNameReadbackCount:4,providerCalls:0,databaseWrites:0,objectDeletions:0,phase6PaidGo:false};
}
function cmd(name,args,input){
 return execFileSync(name,args,{encoding:"utf8",input,stdio:[input===undefined?"ignore":"pipe","pipe","ignore"],timeout:30000}).trim();
}
const git=args=>cmd("git",args),gh=(args,input)=>cmd("gh",args,input),api=path=>JSON.parse(gh(["api","--method","GET",ROOT+path]));
const directory=join(homedir(),".travnr-phase5-expiry");
function privateDir(){const st=lstatSync(directory);if(!st.isDirectory()||st.uid!==process.getuid?.()||st.mode&0o077)hold("PRIVATE_DIR");}
function privateRead(name){
 privateDir();const fd=openSync(join(directory,name),constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const st=fstatSync(fd);if(!st.isFile()||st.nlink!==1||st.uid!==process.getuid?.()||st.mode&0o077||st.size<2||st.size>16384)hold("PRIVATE_FILE");
  return JSON.parse(readFileSync(fd,"utf8"));}finally{closeSync(fd);}
}
function privateWrite(name,v){
 privateDir();const fd=openSync(join(directory,name),"wx",0o600);
 try{writeFileSync(fd,JSON.stringify(v));fsyncSync(fd);}finally{closeSync(fd);}
 const d=openSync(directory,"r");try{fsyncSync(d);}finally{closeSync(d);}
}
function ownerIO(){
 return {
  localReview:a=>{
   if(git(["rev-parse","HEAD"])!==a.main||git(["status","--porcelain","--untracked-files=normal"]))hold("EXACT_LOCAL_MAIN");
   if(cmd("bash",["scripts/v39_phase5_callback_release_v4_reviewed_build_v39.sh","--verify-only"])!==
    "PHASE5_V4_CALLBACK_SOURCE_EQUIVALENCE_VERIFIED_NOT_PUBLISHED")hold("SOURCE_EQUIVALENCE");
   const pair=privateRead("pair-handoff-"+V4+".json"),old=privateRead("handoff-"+V3+".json");
   if(Object.keys(pair).sort().join(",")!=="applyToken,neverReplay,previousSource,source"||
      pair.source!==V4||pair.previousSource!==V3||pair.neverReplay!==true||
      Object.keys(old).sort().join(",")!=="neverReplay,source,token"||old.source!==V3||old.neverReplay!==true)hold("PAIR_CUSTODY");
   return {applyToken:pair.applyToken,verifyToken:old.token};
  },
  remoteMain:()=>api("/git/ref/heads/main").object.sha,
  sourceVariable:()=>gh(["variable","get","P5_EXPIRY_RECEIVER_DEPLOYED_SOURCE_SHA","-R",REPO]),
  verifyPrior:async a=>{
   const ghToken=gh(["auth","token","--hostname","github.com"]);
   if(ghToken.length<16)hold("AUTH");
   await independentlyReadP5VerifyProof({mainSha:a.main,verifiedMainSha:a.verifiedMain,verifiedRunId:a.verifiedRunId,source:V4,ghToken});
  },
  verifyLiveSource:async source=>{
   const x=await fetch("https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime",
    {method:"GET",redirect:"error",signal:AbortSignal.timeout(20000),headers:{accept:"application/json"}});
   verifyPublicIdentity(await readBoundedJson(x),source);
  },
  environment:()=>api("/environments/"+ENV),
  secretNames:()=>JSON.parse(gh(["secret","list","-R",REPO,"--env",ENV,"--json","name"])).map(x=>x.name),
  previousRuns:()=>{
   const x=api("/actions/workflows/"+WF+"/runs?event=workflow_dispatch&branch=main&per_page=100");
   if(!Number.isSafeInteger(x.total_count)||!Array.isArray(x.workflow_runs)||x.total_count!==x.workflow_runs.length)hold("INCOMPLETE_APPLY_HISTORY");
   return x.workflow_runs;
  },
  writeIntent:v=>privateWrite("v4-protected-apply-intent-"+V4+".json",v),
  writeAck:v=>privateWrite("v4-protected-apply-ack-"+V4+".json",v),
  dispatch:body=>JSON.parse(gh(["api","--method","POST",ROOT+"/actions/workflows/"+WF+"/dispatches","--input","-"],JSON.stringify(body))),
  run:id=>api("/actions/runs/"+id),
  pending:id=>api("/actions/runs/"+id+"/pending_deployments"),
  setEnvironmentSecret:(name,value)=>gh(["secret","set",name,"-R",REPO,"--env",ENV],value),
  sleep:sleepDefault
 };
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href){
 try{if(process.argv.length!==2)hold("ARGS");console.log(JSON.stringify(await prepareP5V4ApplyHandoff(process.env,ownerIO())));}
 catch(e){const m=e?.message??"";console.error(/^HOLD_P5_V4_APPLY_HANDOFF_[A-Z0-9_]+$/.test(m)?m:"HOLD_P5_V4_APPLY_HANDOFF_REDACTED_RECONCILE_NO_RETRY");process.exitCode=2;}
}
