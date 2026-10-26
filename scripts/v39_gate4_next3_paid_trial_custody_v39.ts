/**
 * Gate4 NEXT3: private custody + independent protected GitHub admissions.
 * Source-only helper; imported code never makes network or provider calls.
 * No secret, authorization SHA or provider ID is printed to stdout.
 */
import "dotenv/config";
import {execFileSync} from "node:child_process";
import {ReplitProviderBlobStoreV39} from "../server/lib/disruption/replitProviderBlobStore_v39";
import {
 NEXT3_ID,gate4Next3StorageKeyV39,gate4Next3OpenSealedValuesV39
} from "../server/lib/disruption/gate4Next3SealedBootstrap_v39";
import {
 NEXT3_SOURCE_V39,NEXT3_OWNER_BLOB_V39,NEXT3_OWNER_PREFIX_V39,
 NEXT3_OWNER_INTENT_V39,openNext3OwnerCustodyV39
} from "./v39_gate4_next3_no_provider_writer_signer_seal_v39";
import {
 reviewGate4ActionsWatchScopeV39,
 type Gate4ActionsWatchScopeV39
} from "../server/lib/disruption/gate4ActionsWatchdogPolicy_v39";
import {gate4ReviewIndependentArmedProofV39} from
 "../server/lib/disruption/gate4ArmedRunProof_v39";
import {
 NEXT3_EXPIRY_INTENT_V39,NEXT3_EXPIRY_BLOB_V39,
 NEXT3_EXTENDED_EXPIRES_V39
} from "./v39_gate4_next3_extend_role_validity_to_9pm_v39";
import {
 NEXT3_NO_TTL_INTENT_V39,NEXT3_NO_TTL_BLOB_V39,
 NEXT3_INFINITE_VALIDITY_V39
} from "./v39_gate4_next3_no_expiry_roles_and_custody_v39";

export const NEXT3_REPO_V39="HKcode22/ReplitTranvr";
export const NEXT3_SRC_V39=NEXT3_SOURCE_V39;
export const NEXT3_SCOPE_V39=NEXT3_ID;
export const NEXT3_INTENT_V39=NEXT3_OWNER_PREFIX_V39+"paid-one-create-intent-v1.json";
export const NEXT3_POSITIVE_V39=NEXT3_OWNER_PREFIX_V39+"paid-positive-create-v1.json";
const hex40=/^[a-f0-9]{40}$/,hex64=/^[a-f0-9]{64}$/;
const hold=(s:string):never=>{throw Error("GATE4_NEXT3_"+s+"_HOLD");};
export function next3GitHubGetV39(path:string):any{
 return JSON.parse(execFileSync("gh",["api",path],{
  encoding:"utf8",timeout:12000,maxBuffer:3*1024*1024,
  stdio:["ignore","pipe","ignore"]
 }));
}
export async function next3LoadPrivateV39(options?:{allowExpiredWriterForReadOnly?:boolean}):Promise<{
 storage:ReplitProviderBlobStoreV39;auth:string;secret:string;
 writerUrl:string;writerExpiresUtc:string;signerPrivateDer:Buffer;
 signerPublicDer:Buffer;signerSpkiSha256:string;
}>{
 const bucket=String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??"");
 if(!bucket.startsWith("replit-objstore-"))hold("PRIVATE_BUCKET");
 const storage=new ReplitProviderBlobStoreV39(bucket);
 const receiverKey=gate4Next3StorageKeyV39(NEXT3_SRC_V39);
 if(!await storage.exists(receiverKey)||
    !await storage.exists(NEXT3_OWNER_INTENT_V39)||
    !await storage.exists(NEXT3_OWNER_BLOB_V39))hold("PRIVATE_OBJECTS_MISSING");
 const receiver=gate4Next3OpenSealedValuesV39(
  await storage.downloadBytes(receiverKey),NEXT3_SRC_V39,process.env);
 const original=openNext3OwnerCustodyV39(
  await storage.downloadBytes(NEXT3_OWNER_BLOB_V39),
  receiver.GATE4_PREBIND_AUTH_SHA256,process.env);
 const hasIntent=await storage.exists(NEXT3_EXPIRY_INTENT_V39);
 const hasExtended=await storage.exists(NEXT3_EXPIRY_BLOB_V39);
 if(hasIntent!==hasExtended)hold("EXTENSION_PARTIAL_OR_UNCONFIRMED");
 const custody=hasExtended?openNext3OwnerCustodyV39(
  await storage.downloadBytes(NEXT3_EXPIRY_BLOB_V39),
  receiver.GATE4_PREBIND_AUTH_SHA256,process.env):original;
 if(hasExtended&&(
  custody.writerExpiresUtc!==NEXT3_EXTENDED_EXPIRES_V39||
  custody.writerUrl!==original.writerUrl||
  custody.signerPrivatePkcs8Base64!==original.signerPrivatePkcs8Base64||
  custody.signerPublicSpkiBase64!==original.signerPublicSpkiBase64||
  custody.signerSpkiSha256!==original.signerSpkiSha256))
  hold("EXTENSION_UNTRUSTED_OR_DRIFT");
 const noTtlIntent=await storage.exists(NEXT3_NO_TTL_INTENT_V39);
 const noTtlBlob=await storage.exists(NEXT3_NO_TTL_BLOB_V39);
 if(noTtlIntent!==noTtlBlob)hold("NO_EXPIRY_CUSTODY_PARTIAL");
 if(noTtlBlob&&!hasExtended)hold("NO_EXPIRY_PREVIOUS_EXT_MISSING");
 const current=noTtlBlob?openNext3OwnerCustodyV39(
   await storage.downloadBytes(NEXT3_NO_TTL_BLOB_V39),
   receiver.GATE4_PREBIND_AUTH_SHA256,process.env):custody;
 if(noTtlBlob&&(
   current.writerExpiresUtc!==NEXT3_INFINITE_VALIDITY_V39||
   current.writerUrl!==custody.writerUrl||
   current.signerPrivatePkcs8Base64!==custody.signerPrivatePkcs8Base64||
   current.signerPublicSpkiBase64!==custody.signerPublicSpkiBase64||
   current.signerSpkiSha256!==custody.signerSpkiSha256))
   hold("NO_EXPIRY_CUSTODY_UNTRUSTED");
 // Do not impose a rolling 45-minute requirement after the owner has
 // approved a shorter trial ending safely before this restricted role expires.
 // The paid operator separately verifies validity beyond exact STOP deadline.
 // READ-ONLY diagnostics may inspect previously verified AES custody even
 // after the SQL role expires; they may neither authenticate as the writer
 // nor issue a provider CREATE. The paid path retains the validity guard.
 if(current.writerExpiresUtc!==NEXT3_INFINITE_VALIDITY_V39&&
   (!Number.isFinite(Date.parse(current.writerExpiresUtc))||
    (!options?.allowExpiredWriterForReadOnly&&
     Date.parse(current.writerExpiresUtc)<=Date.now()+2*60000)))
  hold("WRITER_EXPIRY");
 return {
  storage,auth:receiver.GATE4_PREBIND_AUTH_SHA256,
  secret:receiver.GATE4_PREBIND_WEBHOOK_SECRET,
  writerUrl:current.writerUrl,writerExpiresUtc:current.writerExpiresUtc,
  signerPrivateDer:Buffer.from(current.signerPrivatePkcs8Base64,"base64"),
  signerPublicDer:Buffer.from(current.signerPublicSpkiBase64,"base64"),
  signerSpkiSha256:current.signerSpkiSha256
 };
}
export function next3ProtectedScopeV39(
 v:Record<string,string>,
 privateData:{auth:string;signerSpkiSha256:string},
 base:number
):{scope:Gate4ActionsWatchScopeV39;runnerSha:string}{
 const runnerSha=v.GATE4_SAFETY_APPROVED_RUNNER_SHA??"";
 const scope:Gate4ActionsWatchScopeV39={
  sourceCommit:NEXT3_SRC_V39,scopeId:NEXT3_SCOPE_V39,
  authorizationSha256:privateData.auth,airportIcao:"WSSS",
  startUtc:v.GATE4_SAFETY_APPROVED_START_UTC??"",
  stopUtc:v.GATE4_SAFETY_APPROVED_STOP_UTC??"",
  observedStartingCredits:base,
  softCreditTarget:Number(v.GATE4_SAFETY_APPROVED_SOFT_TARGET),
  protectedCreditFloor:Number(v.GATE4_SAFETY_APPROVED_PROTECTED_FLOOR)
 };
 if(!hex40.test(runnerSha)||!hex64.test(privateData.auth)||
    !hex64.test(privateData.signerSpkiSha256)||
    v.GATE4_SAFETY_APPROVED_SOURCE!==NEXT3_SRC_V39||
    v.GATE4_SAFETY_APPROVED_SCOPE!==NEXT3_SCOPE_V39||
    v.GATE4_SAFETY_APPROVED_AUTH!==privateData.auth||
    v.GATE4_SAFETY_APPROVED_ICAO!=="WSSS"||
    v.GATE4_SAFETY_APPROVED_SIGNER_SPKI_SHA256!==
      privateData.signerSpkiSha256||
    !Number.isSafeInteger(base)||base<1000||
    !reviewGate4ActionsWatchScopeV39(scope)||
    scope.softCreditTarget!==5||
    scope.protectedCreditFloor!==1900)
  hold("PROTECTED_SCOPE_OR_FINANCIAL_PINS");
 return {scope,runnerSha};
}
export function next3ProtectedVariablesV39():Record<string,string>{
 const path="repos/"+NEXT3_REPO_V39+"/environments/gate4-safety";
 const data=next3GitHubGetV39(path+"/variables?per_page=100");
 if(!Array.isArray(data.variables))hold("GH_VARIABLES");
 return Object.fromEntries(data.variables.map((x:any)=>[x.name,x.value]));
}
/**
 * STOP must be in_progress at the executing STOP step, with fresh genuine
 * GitHub Actions bot issue #38 ARMED receipt from this run and exact scope.
 * Merely dispatching it, seeing a green badge or inferring arming is invalid.
 */
export function next3StopArmedV39(
 scope:Gate4ActionsWatchScopeV39,runner:string,runId:number
):boolean{
 try{
  if(!Number.isSafeInteger(runId)||runId<=0)return false;
  const base="repos/"+NEXT3_REPO_V39;
  const run=next3GitHubGetV39(base+"/actions/runs/"+runId);
  const workflow=next3GitHubGetV39(base+"/actions/workflows/"+run.workflow_id);
  if(workflow?.path!==
     ".github/workflows/phase3-gate4-live-exact-stop-candidate.yml")return false;
  const jobs=next3GitHubGetV39(base+"/actions/runs/"+runId+"/jobs?per_page=100");
  const since=encodeURIComponent(new Date(Date.now()-120_000).toISOString());
  const comments=next3GitHubGetV39(
   base+"/issues/38/comments?since="+since+"&per_page=100");
  return gate4ReviewIndependentArmedProofV39({
   scope,runnerSha:runner,runId,workflowId:run.workflow_id,
   nowUtc:new Date().toISOString(),run,jobs:jobs.jobs??[],comments
  });
 }catch{return false;}
}
/**
 * Separate health monitor MUST be executing, same main SHA, protected job.
 * This is a non-provider GET monitor, not a credit STOP or SEND proof.
 */
export function next3ObserverRunningV39(runId:number,runner:string):boolean{
 try{
  if(!Number.isSafeInteger(runId)||runId<=0)return false;
  const base="repos/"+NEXT3_REPO_V39;
  const run=next3GitHubGetV39(base+"/actions/runs/"+runId);
  const workflow=next3GitHubGetV39(base+"/actions/workflows/"+run.workflow_id);
  if(workflow?.path!==
   ".github/workflows/phase3-gate4-next3-callback-health-sixplus6.yml"||
   run?.status!=="in_progress"||run?.event!=="workflow_dispatch"||
   run?.head_branch!=="main"||run?.head_sha!==runner)return false;
  const jobs=next3GitHubGetV39(base+"/actions/runs/"+runId+"/jobs?per_page=100");
  return Array.isArray(jobs.jobs)&&jobs.jobs.some((j:any)=>
   j.name==="gate4-hosted-health"&&j.status==="in_progress"&&
   j.steps?.some((s:any)=>s.name?.includes("Run NEXT3 live health")&&
      s.status==="in_progress"));
 }catch{return false;}
}
export async function next3PutOnceV39(
 storage:ReplitProviderBlobStoreV39,path:string,data:unknown
):Promise<void>{
 if(await storage.exists(path))hold("ONE_TIME_OBJECT_ALREADY_EXISTS");
 const bytes=Buffer.from(JSON.stringify(data)+"\n","utf8");
 await storage.uploadBytes(path,bytes);
 if(!Buffer.from(await storage.downloadBytes(path)).equals(bytes))
  hold("ONE_TIME_OBJECT_READBACK_UNKNOWN");
}
