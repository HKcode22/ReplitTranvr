/** One-time owner-local delivery of already-commissioned scoped credentials.
 * Never creates a DB account, connects to PG, requests provider or deletes
 * objects. Credentials and raw auth token never enter Git or command args.
 */
import {createHash,randomBytes,timingSafeEqual} from "node:crypto";
import {execFileSync} from "node:child_process";
import {constants,openSync,fstatSync,lstatSync,readFileSync,closeSync,writeFileSync,fsyncSync} from "node:fs";
import {homedir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {P5_EXPIRY_BUCKET,P5_EXPIRY_DB_ENDPOINT,p5ExpirySealKey,sealP5ExpiryValues,openP5ExpiryValues,validateP5ExpirySealedValues} from "../server/lib/disruption/phase5ExpirySealedHandoff_v39";
import {createRequiredProviderBlobStoreV39} from "../server/lib/disruption/replitProviderBlobStore_v39";
const REPO="HKcode22/ReplitTranvr",COMMISSION_SHA="335e77398f3a326721186014c2903ef729e64c03";
const TOKEN_NAME="P5_EXPIRY_RECEIVER_AUTH_TOKEN",VAR_NAME="P5_EXPIRY_RECEIVER_DEPLOYED_SOURCE_SHA";
const ROOT=join(homedir(),".travnr-phase5-expiry");
const SHA=/^[a-f0-9]{40}$/,HEX=/^[a-f0-9]{64}$/;
const hold=(s:string):never=>{throw Error("HOLD_P5_EXPIRY_HANDOFF_"+s);};
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const same=(a:unknown,b:unknown)=>{
 const x=Buffer.from(JSON.stringify(a)),y=Buffer.from(JSON.stringify(b));
 try{return x.length===y.length&&timingSafeEqual(x,y);}finally{x.fill(0);y.fill(0);}
};
function privateRoot(){
 const st=lstatSync(ROOT);
 if(!st.isDirectory()||st.mode&0o077||st.uid!==process.getuid?.())hold("CUSTODY_DIR");
}
function privateRead(name:string){
 privateRoot();
 const fd=openSync(join(ROOT,name),constants.O_RDONLY|constants.O_NOFOLLOW);
 try{
  const st=fstatSync(fd);
  if(!st.isFile()||st.mode&0o077||st.nlink!==1||st.uid!==process.getuid?.()||st.size<2||st.size>16384)hold("CUSTODY_FILE");
  return JSON.parse(readFileSync(fd,"utf8"));
 }finally{closeSync(fd);}
}
function privateWrite(name:string,contents:unknown){
 privateRoot();
 const fd=openSync(join(ROOT,name),"wx",0o600);
 try{writeFileSync(fd,JSON.stringify(contents));fsyncSync(fd);}finally{closeSync(fd);}
 const dir=openSync(ROOT,"r");try{fsyncSync(dir);}finally{closeSync(dir);}
}
function command(args:string[],input?:string){
 return execFileSync("gh",args,{encoding:"utf8",input,stdio:[input===undefined?"ignore":"pipe","pipe","ignore"],timeout:30000}).trim();
}
function git(args:string[]){
 return execFileSync("git",args,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:15000}).trim();
}
function source(){
 const sha=process.env.P5_EXPIRY_HANDOFF_DEPLOYED_SHA??"",main=process.env.P5_EXPIRY_HANDOFF_MAIN_SHA??"";
 if(!SHA.test(sha)||!SHA.test(main)||git(["rev-parse","HEAD"])!==main||
   git(["status","--porcelain","--untracked-files=normal"])||
   command(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"])!==main||
   process.env.P5_EXPIRY_HANDOFF_APPROVAL!=="DELIVER_EXISTING_EXPIRY_VERIFY_ONLY_NO_DELETE_NO_GO"||
   process.env.GITHUB_ACTIONS==="true"||process.env.ADB_AUTO_COLLECT!=="0"||
   process.env.V39_PHASE6_PROCESS_ARMED!=="0"||process.env.V39_PHASE6_OWNER_APPROVED!=="0"||
   process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY||
   process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
   process.env.V39_PROVIDER_BLOB_MODE!=="required"||process.env.V39_PROVIDER_BLOB_BUCKET_ID!==P5_EXPIRY_BUCKET)hold("EXACT_REVIEWED_STOP_SCOPE");
 git(["merge-base","--is-ancestor",sha,main]);
 git(["diff","--quiet",sha,main,"--","client","server","shared","package.json","package-lock.json","scripts/build.ts",
  "vite.config.ts","tsconfig.json","postcss.config.js","tailwind.config.ts","components.json","drizzle.config.ts"]);
 return sha;
}
type Custody={source:string;token:string;neverReplay:true};
export function makeP5ExpiryHandoffValues(input:unknown,sha:string,token:string){
 if(!input||typeof input!=="object"||Array.isArray(input)||!HEX.test(token))return hold("CUSTODY_VALUES");
 const x=input as Record<string,unknown>;
 const keys=["P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA","ADB_AUTO_COLLECT","P5_RECURRING_EXPIRY_MODE",
  "V39_PROVIDER_BLOB_MODE","V39_PROVIDER_BLOB_BUCKET_ID","P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID",
  "P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256","P5_RECURRING_EXPIRY_WRITER_ROLE","P5_RECURRING_EXPIRY_READER_ROLE",
  "P5_RECURRING_EXPIRY_WRITER_URL","P5_RECURRING_EXPIRY_READER_URL"];
 if(Object.keys(x).sort().join(",")!==keys.sort().join(",")||!keys.every(k=>typeof x[k]==="string")||
    x.P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA!==COMMISSION_SHA||x.ADB_AUTO_COLLECT!=="0"||
    x.P5_RECURRING_EXPIRY_MODE!=="VERIFY_ONLY"||x.V39_PROVIDER_BLOB_MODE!=="required"||
    x.V39_PROVIDER_BLOB_BUCKET_ID!==P5_EXPIRY_BUCKET||x.P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID!==P5_EXPIRY_BUCKET||
    x.P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256!==P5_EXPIRY_DB_ENDPOINT)return hold("COMMISSION_RECEIPT_MISMATCH");
 return validateP5ExpirySealedValues({
  P5_RECURRING_EXPIRY_HTTP_ENABLED:"1",P5_RECURRING_EXPIRY_HTTP_AUTH_SHA256:hash(token),
  P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA:sha,P5_RECURRING_EXPIRY_MODE:"VERIFY_ONLY",
  P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID:x.P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID,
  P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256:x.P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256,
  P5_RECURRING_EXPIRY_WRITER_ROLE:x.P5_RECURRING_EXPIRY_WRITER_ROLE,
  P5_RECURRING_EXPIRY_READER_ROLE:x.P5_RECURRING_EXPIRY_READER_ROLE,
  P5_RECURRING_EXPIRY_WRITER_URL:x.P5_RECURRING_EXPIRY_WRITER_URL,
  P5_RECURRING_EXPIRY_READER_URL:x.P5_RECURRING_EXPIRY_READER_URL
 },sha);
}
function custody(sha:string):Custody{
 const x=privateRead("handoff-"+sha+".json");
 if(!x||Object.keys(x).sort().join(",")!=="neverReplay,source,token"||
    x.source!==sha||!HEX.test(x.token??"")||x.neverReplay!==true)return hold("TOKEN_CUSTODY");
 return x;
}
async function main(){
 let stage="INIT";
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||!["--seal-once","--verify-only","--register-token-once"].includes(mode))hold("MODE");
  const sha=source(),name="handoff-"+sha+".json",object=p5ExpirySealKey(sha);
  const input=privateRead("runtime-private.json"),store=createRequiredProviderBlobStoreV39();
  if(mode==="--seal-once"){
   stage="SEALED_INTENT";
   if(await store.exists(object)!==false)hold("EXISTING_SEALED_OBJECT");
   const token=randomBytes(32).toString("hex");
   const values=makeP5ExpiryHandoffValues(input,sha,token),bytes=sealP5ExpiryValues(values,sha,process.env);
   privateWrite(name,{source:sha,token,neverReplay:true});
   stage="SEALED_WRITE_UNKNOWN_NO_RETRY";
   if(await store.exists(object)!==false)hold("EXISTING_SEALED_OBJECT");
   await store.uploadBytes(object,bytes);
  }
  stage="SEALED_READBACK";
  const state=custody(sha),expected=makeP5ExpiryHandoffValues(input,sha,state.token);
  if(await store.exists(object)!==true||!same(openP5ExpiryValues(await store.downloadBytes(object),sha,process.env),expected))hold("SEALED_READBACK");
  if(mode==="--register-token-once"){
   stage="REGISTER_SCOPE";
   const names=command(["api","repos/"+REPO+"/actions/secrets","--paginate","--jq",".secrets[].name"]).split("\n");
   const existing=command(["api","repos/"+REPO+"/actions/variables","--paginate","--jq",".variables[] | select(.name == \""+VAR_NAME+"\") | .value"]);
   if(names.includes(TOKEN_NAME)||(existing&&existing!==sha))hold("EXISTING_GITHUB_CUSTODY_RECONCILE");
   if(source()!==sha)hold("SOURCE_CHANGED");
   privateWrite("token-registration-"+sha+".json",{source:sha,neverReplay:true});
   stage="GITHUB_TOKEN_WRITE_UNKNOWN_NO_RETRY";
   command(["secret","set",TOKEN_NAME,"-R",REPO],state.token);
   if(!existing)command(["variable","set",VAR_NAME,"-R",REPO,"--body",sha]);
   if(!command(["api","repos/"+REPO+"/actions/secrets","--paginate","--jq",".secrets[].name"]).split("\n").includes(TOKEN_NAME)||
      command(["variable","get",VAR_NAME,"-R",REPO])!==sha)hold("GITHUB_METADATA_READBACK");
  }
  console.log(JSON.stringify({status:mode==="--register-token-once"?"P5_EXPIRY_GITHUB_TOKEN_METADATA_READY_VERIFY_ONLY":
   "P5_EXPIRY_SEALED_CONFIG_READBACK_PASS_VERIFY_ONLY",reviewedSourceSha:sha,
   existingRolesReused:true,providerCalls:0,databaseWrites:0,objectDeletions:0,phase6PaidGo:false,
   deploymentVerified:false,tokenValueVerifiedByGithub:false}));
 }catch(e){
  const m=e instanceof Error?e.message:"";
  console.error("HOLD_P5_EXPIRY_HANDOFF_STAGE_"+stage);
  if(/^HOLD_P5_EXPIRY_HANDOFF_[A-Z0-9_]+$/.test(m))console.error(m);
  process.exitCode=2;
 }
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href)void main();
