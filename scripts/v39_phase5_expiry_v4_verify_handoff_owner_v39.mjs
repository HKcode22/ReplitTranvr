/** Owner-local V4 metadata promotion plus exactly one authenticated VERIFY_ONLY
 * dispatch. No secret writes, provider, DB, apply, publication or replay.
 * Existing V3 token is reused; a new source is not authorized until live GET.
 */
import {execFileSync} from "node:child_process";
import {constants,openSync,fstatSync,lstatSync,readFileSync,writeFileSync,fsyncSync,closeSync} from "node:fs";
import {homedir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {verifyPublicIdentity,readBoundedJson,P5_EXPIRY_VERIFY_WORKFLOW} from "./v39_phase5_expiry_receiver_verify_once_v39.mjs";
const REPO="HKcode22/ReplitTranvr",ROOT="repos/"+REPO,OLD="4436773f2c7e684d05c55878c6eb13b46f16ac06";
const SOURCE="bfbfcdc15035995b8d2ed7f4befa1db74d71b7ac",VAR="P5_EXPIRY_RECEIVER_DEPLOYED_SOURCE_SHA",TOKEN="P5_EXPIRY_RECEIVER_AUTH_TOKEN";
const CONFIRM="VERIFY_PUBLISHED_EXPIRY_TRANSPORT_NO_PROVIDER_NO_DELETE";
const WRAPPER="scripts/v39_phase5_callback_release_v4_reviewed_build_v39.sh";
const SHA=/^[a-f0-9]{40}$/;
const hold=x=>{throw Error("HOLD_P5_V4_VERIFY_HANDOFF_"+x);};
export function admitV4VerifyHandoff(e){
 const main=e.P5_EXPIRY_V4_VERIFY_MAIN_SHA;
 if(!SHA.test(main??"")||e.P5_EXPIRY_V4_VERIFY_CONFIRM!=="PROMOTE_LIVE_V4_SOURCE_AND_VERIFY_ONLY_ONCE"||
   e.GITHUB_ACTIONS==="true"||e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||
   e.V39_PHASE6_OWNER_APPROVED!=="0"||e.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
   ["DATABASE_URL","AERODATABOX_API_KEY","RAPIDAPI_KEY"].some(k=>e[k]))hold("SCOPE");
 return {main,source:SOURCE};
}
export async function runV4VerifyHandoff(env,{localReview,remoteMain,sourceVariable,secretNames,previousRuns,writeIntent,setSource,dispatch,fetcher=fetch}){
 const a=admitV4VerifyHandoff(env);
 async function main(){if(await remoteMain()!==a.main)hold("MAIN_CHANGED");}
 async function health(){
  let res;
  try{res=await fetcher("https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime",
   {method:"GET",redirect:"error",signal:AbortSignal.timeout(20000),headers:{accept:"application/json"}});}
  catch{hold("PUBLIC_GET");}
  verifyPublicIdentity(await readBoundedJson(res),a.source);
 }
 await localReview(a);
 await main();
 if(await sourceVariable()!==OLD)hold("EXISTING_SOURCE_RECONCILE");
 const names=await secretNames();if(!Array.isArray(names)||!names.includes(TOKEN))hold("EXISTING_VERIFY_TOKEN_MISSING");
 const runs=await previousRuns(a);
 if(!Array.isArray(runs)||runs.length!==0)hold("PREVIOUS_VERIFY_RUN_RECONCILE");
 await health();await main();
 // Persist before modifying source metadata. A partial or unknown operation
 // is recovered by readback, not by another write or dispatch.
 await writeIntent({source:a.source,previousSource:OLD,main:a.main,neverReplay:true});
 try{await setSource(a.source);}catch{hold("SOURCE_WRITE_UNKNOWN_NO_RETRY");}
 if(await sourceVariable()!==a.source)hold("SOURCE_READBACK_NO_RETRY");
 await main();await health();await main();
 let result;
 try{result=await dispatch({ref:"main",return_run_details:true,inputs:{confirm:CONFIRM,
   approved_main_sha:a.main,approved_deployed_sha:a.source}});}
 catch{hold("DISPATCH_UNKNOWN_NO_RETRY");}
 if(!Number.isSafeInteger(result?.workflow_run_id)||result.workflow_run_id<1||
    result.run_url!=="https://api.github.com/"+ROOT+"/actions/runs/"+result.workflow_run_id||
    result.html_url!=="https://github.com/"+REPO+"/actions/runs/"+result.workflow_run_id)hold("DISPATCH_ACK_UNKNOWN_NO_RETRY");
 return {status:"P5_V4_VERIFY_ONLY_DISPATCH_ACK",runId:result.workflow_run_id,reviewedMainSha:a.main,
  reviewedSourceSha:a.source,existingTokenReused:true,secretWrites:0,providerCalls:0,databaseWrites:0,objectDeletions:0,phase6PaidGo:false};
}
function command(name,args,input){
 return execFileSync(name,args,{encoding:"utf8",input,stdio:[input===undefined?"ignore":"pipe","pipe","ignore"],timeout:30000}).trim();
}
const git=args=>command("git",args),gh=(args,input)=>command("gh",args,input);
function ownerOperations(){
 const dir=join(homedir(),".travnr-phase5-expiry");
 const checkDir=()=>{const st=lstatSync(dir);if(!st.isDirectory()||st.uid!==process.getuid?.()||st.mode&0o077)hold("PRIVATE_DIR");};
 return {
  localReview:({main,source})=>{
   checkDir();
   if(git(["rev-parse","HEAD"])!==main||git(["status","--porcelain","--untracked-files=normal"]))hold("EXACT_LOCAL_MAIN");
   if(git(["show",main+":"+WRAPPER]).split("\n").filter(x=>x==="PIN="+source).length!==1||
     command("bash",[WRAPPER,"--verify-only"])!=="PHASE5_V4_CALLBACK_SOURCE_EQUIVALENCE_VERIFIED_NOT_PUBLISHED")hold("REVIEWED_BUILD");
   const fd=openSync(join(dir,"pair-handoff-"+source+".json"),constants.O_RDONLY|constants.O_NOFOLLOW);
   try{
    const st=fstatSync(fd);if(!st.isFile()||st.mode&0o077||st.nlink!==1||st.uid!==process.getuid?.()||st.size>16384)hold("PAIR_FILE");
    const x=JSON.parse(readFileSync(fd,"utf8"));
    if(Object.keys(x).sort().join(",")!=="applyToken,neverReplay,previousSource,source"||x.source!==source||
      x.previousSource!==OLD||x.neverReplay!==true||!/^[a-f0-9]{64}$/.test(x.applyToken??""))hold("PAIR_CUSTODY");
   }finally{closeSync(fd);}
  },
  remoteMain:()=>gh(["api",ROOT+"/git/ref/heads/main","--jq",".object.sha"]),
  sourceVariable:()=>gh(["variable","get",VAR,"-R",REPO]),
  secretNames:()=>gh(["api",ROOT+"/actions/secrets?per_page=100","--paginate","--jq",".secrets[].name"]).split("\n"),
  previousRuns:({main})=>JSON.parse(gh(["run","list","-R",REPO,"--workflow",P5_EXPIRY_VERIFY_WORKFLOW,
   "--event","workflow_dispatch","--commit",main,"--limit","10","--json","databaseId"])),
  writeIntent:value=>{
   checkDir();const fd=openSync(join(dir,"v4-source-verify-dispatch-"+SOURCE+".json"),"wx",0o600);
   try{writeFileSync(fd,JSON.stringify(value));fsyncSync(fd);}finally{closeSync(fd);}
   const d=openSync(dir,"r");try{fsyncSync(d);}finally{closeSync(d);}
  },
  setSource:source=>gh(["variable","set",VAR,"-R",REPO,"--body",source]),
  dispatch:body=>JSON.parse(gh(["api","--method","POST",ROOT+"/actions/workflows/"+P5_EXPIRY_VERIFY_WORKFLOW+"/dispatches","--input","-"],JSON.stringify(body)))
 };
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href){
 try{
  if(process.argv.length!==2)hold("ARGS");
  console.log(JSON.stringify(await runV4VerifyHandoff(process.env,ownerOperations())));
 }catch(e){
  console.error(/^HOLD_P5_(V4_VERIFY_HANDOFF|EXPIRY_RECEIVER_VERIFY)_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P5_V4_VERIFY_HANDOFF_REDACTED_RECONCILE_NO_RETRY");
  process.exitCode=2;
 }
}
