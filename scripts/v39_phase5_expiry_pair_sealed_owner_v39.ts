/** Owner-local delivery for a NEW independently reviewed mode-separated release.
 * Reuse the previously live-authenticated VERIFY token and existing scoped DB
 * actors. Never print or copy passwords/tokens into Git or command arguments.
 * No DB connection, provider request, DELETE, apply-secret registration or GO.
 */
import {createHash,randomBytes,timingSafeEqual} from "node:crypto";
import {execFileSync} from "node:child_process";
import {constants,openSync,fstatSync,lstatSync,readFileSync,closeSync,writeFileSync,fsyncSync} from "node:fs";
import {homedir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {makeP5ExpiryHandoffValues} from "./v39_phase5_expiry_sealed_handoff_v39";
import {P5_EXPIRY_BUCKET,p5ExpirySealKey,sealP5ExpiryValues,openP5ExpiryValues,validateP5ExpirySealedValues} from "../server/lib/disruption/phase5ExpirySealedHandoff_v39";
import {createRequiredProviderBlobStoreV39} from "../server/lib/disruption/replitProviderBlobStore_v39";
const REPO="HKcode22/ReplitTranvr",OLD="4436773f2c7e684d05c55878c6eb13b46f16ac06";
const ORIGINAL_MAIN="0c5b2c1f22b757477426a4f3b67d04d84675564b",ORIGINAL_RUN="43799576071";
const ROOT=join(homedir(),".travnr-phase5-expiry"),SHA=/^[a-f0-9]{40}$/,TOKEN=/^[a-f0-9]{64}$/;
const WRAPPER="scripts/v39_phase5_callback_release_v4_reviewed_build_v39.sh";
const APPROVAL="DELIVER_SEPARATE_REVIEWED_EXPIRY_PAIR_NO_DELETE_NO_GO";
const hold=(x:string):never=>{throw Error("HOLD_P5_EXPIRY_PAIR_OWNER_"+x);};
const hash=(x:string)=>createHash("sha256").update(x).digest("hex");
function privateRoot(){
 const st=lstatSync(ROOT);
 if(!st.isDirectory()||st.mode&0o077||st.uid!==process.getuid?.())hold("PRIVATE_ROOT");
}
function privateRead(name:string){
 privateRoot();const fd=openSync(join(ROOT,name),constants.O_RDONLY|constants.O_NOFOLLOW);
 try{
  const st=fstatSync(fd);
  if(!st.isFile()||st.mode&0o077||st.nlink!==1||st.uid!==process.getuid?.()||st.size<2||st.size>16384)hold("PRIVATE_FILE");
  return JSON.parse(readFileSync(fd,"utf8"));
 }finally{closeSync(fd);}
}
function privateWrite(name:string,value:unknown){
 privateRoot();const fd=openSync(join(ROOT,name),"wx",0o600);
 try{writeFileSync(fd,JSON.stringify(value));fsyncSync(fd);}finally{closeSync(fd);}
 const dir=openSync(ROOT,"r");try{fsyncSync(dir);}finally{closeSync(dir);}
}
function cmd(name:string,args:string[]){
 return execFileSync(name,args,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:20000}).trim();
}
const git=(args:string[])=>cmd("git",args),gh=(args:string[])=>cmd("gh",args);
function source(){
 const sha=process.env.P5_EXPIRY_PAIR_DEPLOYED_SHA??"",main=process.env.P5_EXPIRY_PAIR_MAIN_SHA??"";
 if(!SHA.test(sha)||sha===OLD||!SHA.test(main)||git(["rev-parse","HEAD"])!==main||
    git(["status","--porcelain","--untracked-files=normal"])||
    gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"])!==main||
    process.env.P5_EXPIRY_PAIR_APPROVAL!==APPROVAL||process.env.GITHUB_ACTIONS==="true"||
    process.env.ADB_AUTO_COLLECT!=="0"||process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
    process.env.V39_PHASE6_OWNER_APPROVED!=="0"||process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY||
    process.env.DATABASE_URL||process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    process.env.V39_PROVIDER_BLOB_MODE!=="required"||process.env.V39_PROVIDER_BLOB_BUCKET_ID!==P5_EXPIRY_BUCKET)
  hold("EXACT_REVIEWED_STOP_SCOPE");
 git(["merge-base","--is-ancestor",sha,main]);
 const wrapper=git(["show",main+":"+WRAPPER]);
 if(wrapper.split("\n").filter(x=>x==="PIN="+sha).length!==1||
    cmd("bash",[WRAPPER,"--verify-only"])!=="PHASE5_V4_CALLBACK_SOURCE_EQUIVALENCE_VERIFIED_NOT_PUBLISHED")
  hold("V4_REVIEWED_WRAPPER");
 return sha;
}
function verifyOriginalRun(){
 const run=JSON.parse(gh(["api","repos/"+REPO+"/actions/runs/"+ORIGINAL_RUN]));
 if(String(run.id)!==ORIGINAL_RUN||run.head_sha!==ORIGINAL_MAIN||run.head_branch!=="main"||
    run.path!==".github/workflows/phase5-published-expiry-transport-verify-only.yml"||
    run.event!=="workflow_dispatch"||run.run_attempt!==1||run.status!=="completed"||run.conclusion!=="success")
  hold("ORIGINAL_LIVE_VERIFY_RUN");
 const jobs=JSON.parse(gh(["api","repos/"+REPO+"/actions/runs/"+ORIGINAL_RUN+"/jobs?filter=latest&per_page=100"]));
 const j=jobs.jobs?.filter((x:any)=>x.name==="actual-verify-only");
 if(jobs.total_count!==jobs.jobs?.length||j?.length!==1||j[0].run_id!==Number(ORIGINAL_RUN)||j[0].run_attempt!==1||
    j[0].head_sha!==ORIGINAL_MAIN||j[0].status!=="completed"||j[0].conclusion!=="success"||
    !["One exact published receiver verification; never retry unknown POST","Preserve exact aggregate VERIFY ONLY acceptance evidence"]
      .every(n=>j[0].steps?.filter((x:any)=>x.name===n&&x.status==="completed"&&x.conclusion==="success").length===1))
  hold("ORIGINAL_LIVE_VERIFY_JOB");
}
function same(a:unknown,b:unknown){
 const x=Buffer.from(JSON.stringify(a)),y=Buffer.from(JSON.stringify(b));
 try{return x.length===y.length&&timingSafeEqual(x,y);}finally{x.fill(0);y.fill(0);}
}
export function makeP5ExpiryPairValues(input:unknown,sha:string,verifyToken:string,applyToken:string){
 if(!SHA.test(sha)||sha===OLD||!TOKEN.test(verifyToken)||!TOKEN.test(applyToken)||verifyToken===applyToken)hold("TOKEN_SEPARATION");
 const verify=makeP5ExpiryHandoffValues(input,sha,verifyToken);
 const apply=validateP5ExpirySealedValues({...verify,P5_RECURRING_EXPIRY_MODE:"APPLY_DUE_ONLY",
  P5_RECURRING_EXPIRY_HTTP_AUTH_SHA256:hash(applyToken),
  P5_RECURRING_EXPIRY_APPROVAL:"APPLY_BOUNDED_DECLARED_EXPIRY_ONLY_NO_PROVIDER",P5_RECURRING_EXPIRY_LIMIT:"10"},sha,"APPLY_DUE_ONLY");
 return {verify,apply};
}
async function bounded<T>(fn:()=>Promise<T>):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([fn(),new Promise<never>((_,reject)=>{
  timer=setTimeout(()=>reject(Error("HOLD_P5_EXPIRY_PAIR_OWNER_STORAGE_UNKNOWN_NO_RETRY")),15000);
 })]);}finally{if(timer)clearTimeout(timer);}
}
async function main(){
 let stage="INIT";
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||!["--seal-once","--readback-only"].includes(mode))hold("MODE");
  const sha=source();verifyOriginalRun();
  const input=privateRead("runtime-private.json"),old=privateRead("handoff-"+OLD+".json");
  if(!old||Object.keys(old).sort().join(",")!=="neverReplay,source,token"||
     old.source!==OLD||old.neverReplay!==true||!TOKEN.test(old.token??""))hold("ORIGINAL_TOKEN_CUSTODY");
  const store=createRequiredProviderBlobStoreV39(),oldKey=p5ExpirySealKey(OLD);
  if(await bounded(()=>store.exists(oldKey))!==true||
     !same(openP5ExpiryValues(await bounded(()=>store.downloadBytes(oldKey)),OLD,process.env),
       makeP5ExpiryHandoffValues(input,OLD,old.token)))hold("ORIGINAL_SEALED_READBACK");
  const name="pair-handoff-"+sha+".json",vk=p5ExpirySealKey(sha),ak=p5ExpirySealKey(sha,"APPLY_DUE_ONLY");
  if(mode==="--seal-once"){
   stage="PRE_WRITE";
   if(await bounded(()=>store.exists(vk))!==false||await bounded(()=>store.exists(ak))!==false)hold("EXISTING_OBJECT_RECONCILE");
   const applyToken=randomBytes(32).toString("hex"),v=makeP5ExpiryPairValues(input,sha,old.token,applyToken);
   const vb=sealP5ExpiryValues(v.verify,sha,process.env),ab=sealP5ExpiryValues(v.apply,sha,process.env,"APPLY_DUE_ONLY");
   privateWrite(name,{source:sha,previousSource:OLD,applyToken,neverReplay:true});
   stage="WRITE_UNKNOWN_NO_RETRY";
   if(source()!==sha||await bounded(()=>store.exists(vk))!==false||await bounded(()=>store.exists(ak))!==false)
    hold("EXISTING_OBJECT_RECONCILE");
   await bounded(()=>store.uploadBytes(vk,vb));
   await bounded(()=>store.uploadBytes(ak,ab));
  }
  stage="PAIR_READBACK";
  const state=privateRead(name);
  if(!state||Object.keys(state).sort().join(",")!=="applyToken,neverReplay,previousSource,source"||
     state.source!==sha||state.previousSource!==OLD||state.neverReplay!==true||!TOKEN.test(state.applyToken??""))
   hold("PAIR_INTENT");
  const values=makeP5ExpiryPairValues(input,sha,old.token,state.applyToken);
  if(await bounded(()=>store.exists(vk))!==true||await bounded(()=>store.exists(ak))!==true||
     !same(openP5ExpiryValues(await bounded(()=>store.downloadBytes(vk)),sha,process.env),values.verify)||
     !same(openP5ExpiryValues(await bounded(()=>store.downloadBytes(ak)),sha,process.env,"APPLY_DUE_ONLY"),values.apply))
   hold("PAIR_READBACK");
  console.log(JSON.stringify({status:"P5_EXPIRY_PAIR_SEALED_READBACK_PASS_NOT_PUBLISHED",reviewedSourceSha:sha,
   existingRolesReused:true,existingVerifyTokenReused:true,distinctApplyToken:true,applyTokenRegistered:false,
   providerCalls:0,databaseWrites:0,objectDeletions:0,phase6PaidGo:false}));
 }catch(e){
  const message=e instanceof Error?e.message:"";
  console.error("HOLD_P5_EXPIRY_PAIR_OWNER_STAGE_"+stage);
  if(/^HOLD_P5_EXPIRY_PAIR_OWNER_[A-Z0-9_]+$/.test(message))console.error(message);
  process.exitCode=2;
 }
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href)void main();
