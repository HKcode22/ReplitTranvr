/**
 * Gate4 NEXT2: private custody + independent protected GitHub admissions.
 * Source-only helper; imported code never makes network or provider calls.
 * No secret, authorization SHA or provider ID is printed to stdout.
 */
import "dotenv/config";
import {execFileSync} from "node:child_process";
import {ReplitProviderBlobStoreV39} from "../server/lib/disruption/replitProviderBlobStore_v39";
import {
 NEXT2_ID,gate4Next2StorageKeyV39,gate4Next2OpenSealedValuesV39
} from "../server/lib/disruption/gate4Next2SealedBootstrap_v39";
import {openWriterOnlyV39} from "./v39_gate4_next2_writer_only_durable_reissue_v39";
import {
 openGate4Next2SignerV39,SIGNER_BLOB_V39,
 SIGNER_SOURCE_V39,SIGNER_PREFIX_V39
} from "./v39_gate4_next2_durable_stop_signer_v39";
import {
 reviewGate4ActionsWatchScopeV39,
 type Gate4ActionsWatchScopeV39
} from "../server/lib/disruption/gate4ActionsWatchdogPolicy_v39";
import {gate4ReviewIndependentArmedProofV39} from
 "../server/lib/disruption/gate4ArmedRunProof_v39";

export const NEXT2_REPO_V39="HKcode22/ReplitTranvr";
export const NEXT2_SRC_V39=SIGNER_SOURCE_V39;
export const NEXT2_SCOPE_V39=NEXT2_ID;
export const NEXT2_INTENT_V39=SIGNER_PREFIX_V39+"paid-one-create-intent-v1.json";
export const NEXT2_POSITIVE_V39=SIGNER_PREFIX_V39+"paid-positive-create-v1.json";
export const NEXT2_WRITER_V39=SIGNER_PREFIX_V39+"writer-one-shot-reissue-v1.aes256gcm.json";
const hex40=/^[a-f0-9]{40}$/,hex64=/^[a-f0-9]{64}$/;
const hold=(s:string):never=>{throw Error("GATE4_NEXT2_"+s+"_HOLD");};
export function next2GitHubGetV39(path:string):any{
 return JSON.parse(execFileSync("gh",["api",path],{
  encoding:"utf8",timeout:12000,maxBuffer:3*1024*1024,
  stdio:["ignore","pipe","ignore"]
 }));
}
export async function next2LoadPrivateV39():Promise<{
 storage:ReplitProviderBlobStoreV39;auth:string;secret:string;
 writerUrl:string;writerExpiresUtc:string;signerPrivateDer:Buffer;
 signerPublicDer:Buffer;signerSpkiSha256:string;
}>{
 const bucket=String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??"");
 if(!bucket.startsWith("replit-objstore-"))hold("PRIVATE_BUCKET");
 const storage=new ReplitProviderBlobStoreV39(bucket);
 const receiverKey=gate4Next2StorageKeyV39(NEXT2_SRC_V39);
 if(!await storage.exists(receiverKey)||
    !await storage.exists(NEXT2_WRITER_V39)||
    !await storage.exists(SIGNER_BLOB_V39))hold("PRIVATE_OBJECTS_MISSING");
 const receiver=gate4Next2OpenSealedValuesV39(
  await storage.downloadBytes(receiverKey),NEXT2_SRC_V39,process.env);
 const writer=openWriterOnlyV39(
  Buffer.from(await storage.downloadBytes(NEXT2_WRITER_V39)),
  receiver.GATE4_PREBIND_AUTH_SHA256);
 const signer=openGate4Next2SignerV39(
  Buffer.from(await storage.downloadBytes(SIGNER_BLOB_V39)),
  receiver.GATE4_PREBIND_AUTH_SHA256);
 if(Date.parse(writer.expiresUtc)<Date.now()+45*60000)hold("WRITER_EXPIRY");
 return {
  storage,auth:receiver.GATE4_PREBIND_AUTH_SHA256,
  secret:receiver.GATE4_PREBIND_WEBHOOK_SECRET,
  writerUrl:writer.writerUrl,writerExpiresUtc:writer.expiresUtc,
  signerPrivateDer:signer.privateDer,signerPublicDer:signer.publicDer,
  signerSpkiSha256:signer.spkiSha256
 };
}
export function next2ProtectedScopeV39(
 v:Record<string,string>,
 privateData:{auth:string;signerSpkiSha256:string},
 base:number
):{scope:Gate4ActionsWatchScopeV39;runnerSha:string}{
 const runnerSha=v.GATE4_SAFETY_APPROVED_RUNNER_SHA??"";
 const scope:Gate4ActionsWatchScopeV39={
  sourceCommit:NEXT2_SRC_V39,scopeId:NEXT2_SCOPE_V39,
  authorizationSha256:privateData.auth,airportIcao:"WSSS",
  startUtc:v.GATE4_SAFETY_APPROVED_START_UTC??"",
  stopUtc:v.GATE4_SAFETY_APPROVED_STOP_UTC??"",
  observedStartingCredits:base,
  softCreditTarget:Number(v.GATE4_SAFETY_APPROVED_SOFT_TARGET),
  protectedCreditFloor:Number(v.GATE4_SAFETY_APPROVED_PROTECTED_FLOOR)
 };
 if(!hex40.test(runnerSha)||!hex64.test(privateData.auth)||
    !hex64.test(privateData.signerSpkiSha256)||
    v.GATE4_SAFETY_APPROVED_SOURCE!==NEXT2_SRC_V39||
    v.GATE4_SAFETY_APPROVED_SCOPE!==NEXT2_SCOPE_V39||
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
export function next2ProtectedVariablesV39():Record<string,string>{
 const path="repos/"+NEXT2_REPO_V39+"/environments/gate4-safety";
 const data=next2GitHubGetV39(path+"/variables?per_page=100");
 if(!Array.isArray(data.variables))hold("GH_VARIABLES");
 return Object.fromEntries(data.variables.map((x:any)=>[x.name,x.value]));
}
/**
 * STOP must be in_progress at the executing STOP step, with fresh genuine
 * GitHub Actions bot issue #38 ARMED receipt from this run and exact scope.
 * Merely dispatching it, seeing a green badge or inferring arming is invalid.
 */
export function next2StopArmedV39(
 scope:Gate4ActionsWatchScopeV39,runner:string,runId:number
):boolean{
 try{
  if(!Number.isSafeInteger(runId)||runId<=0)return false;
  const base="repos/"+NEXT2_REPO_V39;
  const run=next2GitHubGetV39(base+"/actions/runs/"+runId);
  const workflow=next2GitHubGetV39(base+"/actions/workflows/"+run.workflow_id);
  if(workflow?.path!==
     ".github/workflows/phase3-gate4-live-exact-stop-candidate.yml")return false;
  const jobs=next2GitHubGetV39(base+"/actions/runs/"+runId+"/jobs?per_page=100");
  const since=encodeURIComponent(new Date(Date.now()-120_000).toISOString());
  const comments=next2GitHubGetV39(
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
export function next2ObserverRunningV39(runId:number,runner:string):boolean{
 try{
  if(!Number.isSafeInteger(runId)||runId<=0)return false;
  const base="repos/"+NEXT2_REPO_V39;
  const run=next2GitHubGetV39(base+"/actions/runs/"+runId);
  const workflow=next2GitHubGetV39(base+"/actions/workflows/"+run.workflow_id);
  if(workflow?.path!==
   ".github/workflows/phase3-gate4-next2-callback-health-sixplus6.yml"||
   run?.status!=="in_progress"||run?.event!=="workflow_dispatch"||
   run?.head_branch!=="main"||run?.head_sha!==runner)return false;
  const jobs=next2GitHubGetV39(base+"/actions/runs/"+runId+"/jobs?per_page=100");
  return Array.isArray(jobs.jobs)&&jobs.jobs.some((j:any)=>
   j.name==="gate4-hosted-health"&&j.status==="in_progress"&&
   j.steps?.some((s:any)=>s.name?.includes("Run NEXT2 live health")&&
      s.status==="in_progress"));
 }catch{return false;}
}
export async function next2PutOnceV39(
 storage:ReplitProviderBlobStoreV39,path:string,data:unknown
):Promise<void>{
 if(await storage.exists(path))hold("ONE_TIME_OBJECT_ALREADY_EXISTS");
 const bytes=Buffer.from(JSON.stringify(data)+"\n","utf8");
 await storage.uploadBytes(path,bytes);
 if(!Buffer.from(await storage.downloadBytes(path)).equals(bytes))
  hold("ONE_TIME_OBJECT_READBACK_UNKNOWN");
}
