/** One actual read-only GitHub -> existing published Replit expiry verification.
 * Fixed origin and VERIFY_ONLY mode, no redirects/retries, no DB/provider key,
 * no raw response/header output. No automatic expiry or production activation.
 */
import {pathToFileURL} from "node:url";
import {writeFileSync} from "node:fs";
import {join} from "node:path";
export const P5_EXPIRY_VERIFY_ARTIFACT_FILE="p5-published-expiry-verify-receipt.json";
export const P5_EXPIRY_VERIFY_WORKFLOW="phase5-published-expiry-transport-verify-only.yml";
const ORIGIN="https://replit-tranvr--hk84164.replit.app";
const HEALTH=ORIGIN+"/__v39/workspace-runtime";
const ENDPOINT=ORIGIN+"/__v39/phase5/recurring-expiry";
const SHA=/^[a-f0-9]{40}$/,TOKEN=/^[a-f0-9]{64}$/;
const HOLD=code=>{throw Error("HOLD_P5_EXPIRY_RECEIVER_VERIFY_"+code);};
export function admitExpiryReceiverVerify(env){
 const source=env.P5_EXPIRY_RECEIVER_DEPLOYED_SOURCE_SHA,token=env.P5_EXPIRY_RECEIVER_AUTH_TOKEN;
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_RUN_ATTEMPT!=="1"||!SHA.test(env.GITHUB_SHA??"")||
    env.P5_EXPIRY_RECEIVER_APPROVED_MAIN_SHA!==env.GITHUB_SHA||
    !SHA.test(source??"")||env.P5_EXPIRY_RECEIVER_APPROVED_DEPLOYED_SHA!==source||
    !TOKEN.test(token??"")||env.P5_EXPIRY_RECEIVER_CONFIRM!=="VERIFY_PUBLISHED_EXPIRY_TRANSPORT_NO_PROVIDER_NO_DELETE"||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    ["DATABASE_URL","V39_DATABASE_RUNTIME_URL","AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY",
     "P5_RECURRING_EXPIRY_WRITER_URL","P5_RECURRING_EXPIRY_READER_URL"].some(k=>env[k]))
  HOLD("ADMISSION");
 return {source,token};
}
export async function readBoundedJson(response){
 if(!response||response.status!==200||response.redirected||!response.body||
    !/^application\/json(?:;|$)/i.test(response.headers.get("content-type")??""))HOLD("HTTP_OR_CONTENT_HOLD");
 const declared=response.headers.get("content-length");
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>16384))HOLD("RESPONSE_LIMIT");
 const reader=response.body.getReader(),parts=[];let bytes=0;
 try{
  for(;;){
   const item=await reader.read();
   if(item.done)break;
   if(!(item.value instanceof Uint8Array))HOLD("RESPONSE_TYPE");
   bytes+=item.value.byteLength;if(bytes>16384)HOLD("RESPONSE_LIMIT");
   parts.push(Buffer.from(item.value));
  }
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 try{return JSON.parse(Buffer.concat(parts).toString("utf8"));}catch{HOLD("JSON");}
}
export function verifyPublicIdentity(h,source){
 if(h?.schema!=="v39.phase2f-workspace-runtime.v1"||h?.status!=="PASS"||h?.git_head!==source||
    h?.prepaid_route_registered!==true||h?.provider_mutation!==false||
    h?.runtime_owner_mode!=="replit-published-deployment"||h?.managed_replit_workflow!==false||
    h?.published_deployment!==true||!["autoscale","reserved-vm"].includes(h?.runtime_durability_class))
  HOLD("PUBLIC_SOURCE_IDENTITY");
}
const RECEIPT={
 status:"SCOPED_RUNTIME_VERIFY_ONLY_NO_WRITES",mode:"VERIFY_ONLY",providerCalls:0,objectDownloads:0,
 distinctDbActorsVerified:true,separateStorageReadRequests:true,independentStorageIamVerified:false,
 backupRetentionVerified:false,phase6PaidGo:false,databaseWrites:0,objectDeletions:0
};
export async function verifyExpiryReceiverOnce(config,fetchImpl=fetch){
 if(!config||!SHA.test(config.source??"")||!TOKEN.test(config.token??""))HOLD("CONFIG");
 // Public identity first. Do not transmit even the dedicated token to a
 // receiver not independently reporting the exact reviewed source.
 let health;
 try{health=await fetchImpl(HEALTH,{method:"GET",redirect:"error",signal:AbortSignal.timeout(20000),
  headers:{accept:"application/json"}});}catch{HOLD("PUBLIC_GET_FAILED");}
 verifyPublicIdentity(await readBoundedJson(health),config.source);
 let response;
 try{response=await fetchImpl(ENDPOINT,{method:"POST",redirect:"error",signal:AbortSignal.timeout(120000),
  headers:{accept:"application/json",authorization:"Bearer "+config.token,
   "x-p5-expiry-reviewed-sha":config.source,"x-p5-expiry-mode":"VERIFY_ONLY"}});}
 catch{HOLD("POST_OUTCOME_UNKNOWN_NO_RETRY");}
 const got=await readBoundedJson(response),expected={...RECEIPT,reviewedSourceSha:config.source};
 if(!got||typeof got!=="object"||Array.isArray(got)||
    Object.keys(got).length!==Object.keys(expected).length||
    !Object.entries(expected).every(([k,v])=>got[k]===v))
  HOLD("RECEIPT_MISMATCH_NO_RETRY");
 return {status:"P5_PUBLISHED_EXPIRY_VERIFY_ONLY_PASS",reviewedSourceSha:config.source,
  verification:expected,actualHttpsRequests:2,providerCalls:0,objectDeletions:0,databaseWrites:0,phase6PaidGo:false};
}
// Only aggregate operational evidence, never provider content, credentials
// or a claim of independent IAM/backup compliance.
export function buildP5ExpiryVerificationArtifact(result,{source,mainSha,runId,verifiedAtUtc}){
 const expected={status:"P5_PUBLISHED_EXPIRY_VERIFY_ONLY_PASS",reviewedSourceSha:source,
  verification:{...RECEIPT,reviewedSourceSha:source},actualHttpsRequests:2,
  providerCalls:0,objectDeletions:0,databaseWrites:0,phase6PaidGo:false};
 if(!SHA.test(source??"")||!SHA.test(mainSha??"")||!Number.isSafeInteger(runId)||runId<1||
    typeof verifiedAtUtc!=="string"||!Number.isFinite(Date.parse(verifiedAtUtc))||
    new Date(verifiedAtUtc).toISOString()!==verifiedAtUtc||
    !result||typeof result!=="object"||Array.isArray(result)||
    Object.keys(result).length!==Object.keys(expected).length||
    Object.entries(expected).some(([k,x])=>k!=="verification"&&result[k]!==x)||
    !result.verification||Array.isArray(result.verification)||
    Object.keys(result.verification).length!==Object.keys(expected.verification).length||
    Object.entries(expected.verification).some(([k,x])=>result.verification[k]!==x))
  HOLD("ARTIFACT_RECEIPT");
 return {schema:"v39.phase5.published-expiry-verify-receipt.v1",runId,reviewedMainSha:mainSha,
  reviewedSourceSha:source,verifiedAtUtc,verification:expected};
}
export function checkP5ExpiryVerificationArtifact(artifact,scope){
 if(!artifact||typeof artifact!=="object"||Array.isArray(artifact)||
    Object.keys(artifact).sort().join(",")!=="reviewedMainSha,reviewedSourceSha,runId,schema,verification,verifiedAtUtc"||
    artifact.schema!=="v39.phase5.published-expiry-verify-receipt.v1"||
    artifact.reviewedMainSha!==scope.mainSha||artifact.reviewedSourceSha!==scope.source||artifact.runId!==scope.runId)
  HOLD("ARTIFACT_IDENTITY");
 const proof=buildP5ExpiryVerificationArtifact(artifact.verification,{...scope,verifiedAtUtc:artifact.verifiedAtUtc});
 return proof;
}
async function main(){
 try{
  if(process.argv.length!==2)HOLD("NO_ARGUMENTS");
  const scope=admitExpiryReceiverVerify(process.env),runId=Number(process.env.GITHUB_RUN_ID);
  if(!/^[1-9][0-9]{0,14}$/.test(process.env.GITHUB_RUN_ID??"")||
     !Number.isSafeInteger(runId)||!process.env.RUNNER_TEMP)HOLD("ARTIFACT_RUN_ID");
  const result=await verifyExpiryReceiverOnce(scope);
  const artifact=buildP5ExpiryVerificationArtifact(result,{source:scope.source,
   mainSha:process.env.GITHUB_SHA,runId,verifiedAtUtc:new Date().toISOString()});
  writeFileSync(join(process.env.RUNNER_TEMP,P5_EXPIRY_VERIFY_ARTIFACT_FILE),JSON.stringify(artifact),{flag:"wx",mode:0o600});
  console.log(JSON.stringify(result));
 }catch(error){
  const message=error instanceof Error?error.message:"";
  console.error(/^HOLD_P5_EXPIRY_RECEIVER_VERIFY_[A-Z0-9_]+$/.test(message)?message:"HOLD_P5_EXPIRY_RECEIVER_VERIFY_UNKNOWN_NO_RETRY");
  process.exitCode=2;
 }
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href)void main();
