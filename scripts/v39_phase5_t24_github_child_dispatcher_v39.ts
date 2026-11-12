/**
 * Default-OFF actual GitHub T24 child controller; one flight at a time.
 * Reuses the READ ONLY source original bound reviewer and the ORIGINAL
 * Stage14 PRE / independent Stage17 V0081 GitHub worker. Nothing paid here.
 */
import {runP5T24SourceReadonlyOwner}
 from "./v39_phase5_native_t24_source_original_readonly_owner_v39";
import {planP5T24WitnessedChild,
 type P5T24GhRunHistory}
 from "../server/lib/disruption/phase5T24GithubChildDispatchDecision_v39";

const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const ROOT="https://api.github.com/repos/HKcode22/ReplitTranvr";
const CHILD="phase5-one-signed-native-t24-pre-witness-main-manual.yml";
const CONFIRM="ONE_SIGNED_NATIVE_T24_PRE_AND_WITNESS_NO_PROVIDER";
function hold(m:string):never{
 throw Error("REFUSED_P5_T24_GH_DISPATCH_"+m);
}
export function admitP5T24GithubDispatcher(env:NodeJS.ProcessEnv){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_EVENT_NAME!=="schedule"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.V39_P5_T24_APPROVED_CODE_SHA||
    env.P5_T24_AUTO_DISPATCH_ENABLED!=="true"||
    env.P5_CD_GH_T24_SCHEDULE_ENABLED==="1"||
    env.P5_T24_SOURCE_READONLY_ENABLED!=="true"||
    env.ADB_AUTO_COLLECT!=="0"||
    env.AERODATABOX_API_KEY||env.DATABASE_URL||
    env.V39_DATABASE_RUNTIME_URL||env.V39_P5_SOURCE_DATABASE_URL||
    env.P5_V39_T24_WITNESS_DATABASE_URL||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1"||
    env.V39_P5_T24_OWNER_APPROVED!=="1"||
    !PATH.test(env.P5_T24_READONLY_SIGNED_PACKET_FILE??"")||
    !SHA.test(env.V39_P5_T24_SIGNED_PACKET_SHA256??"")||
    typeof env.GITHUB_TOKEN!=="string"||
    env.GITHUB_TOKEN.length<20)
  hold("GITHUB_MAIN_T24_RIGHTS_GO_OR_SIGNATURE_NOT_APPROVED");
 return{
  path:env.P5_T24_READONLY_SIGNED_PACKET_FILE!,
  sha:env.V39_P5_T24_SIGNED_PACKET_SHA256!,
  token:env.GITHUB_TOKEN!
 };
}
export async function runP5T24GithubChildDispatcher(
 env:NodeJS.ProcessEnv,
 fetcher:typeof fetch=fetch,
 inspect=runP5T24SourceReadonlyOwner
){
 const permit=admitP5T24GithubDispatcher(env);
 const readiness=await inspect(env); // TRUE PG16 original/member READ ONLY
 if(readiness.reviewedFrozenPacketSha256!==permit.sha)
  hold("SOURCE_DB_RESULT_SIGNED_PACKET_MISMATCH");
 if(readiness.status!=="SIGNED_T24_READY_FOR_DISTINCT_WITNESS_CHILD_NO_DISPATCH"){
  return{schema:"v39.phase5.signed-native-t24-gh-child-dispatch.v1" as const,
   status:readiness.status,acknowledgedGithubChild:false as const,
   providerCalls:0 as const,databaseWrites:0 as const,
   preWitnessCommitsCertifiedByParent:false as const};
 }
 const observedMs=Date.parse(readiness.observedDbClockUtc);
 if(!Number.isFinite(observedMs))hold("INVALID_OBSERVED_REAL_DB_CLOCK");
 const first=new Date(observedMs-3*3600_000).toISOString();
 const last=new Date(observedMs+60_000).toISOString();
 const url=ROOT+"/actions/workflows/"+CHILD+"/runs"+
  "?event=workflow_dispatch&per_page=100"+
  "&created="+encodeURIComponent(first+".."+last);
 const headers={
  Accept:"application/vnd.github+json",
  Authorization:"Bearer "+permit.token,
  "X-GitHub-Api-Version":"2022-11-28"
 };
 const response=await fetcher(url,{method:"GET",headers});
 if(!response.ok)hold("GITHUB_T24_RUN_HISTORY_UNAVAILABLE");
 const history=await response.json() as P5T24GhRunHistory;
 const decision=planP5T24WitnessedChild(
  readiness,history,permit.path,permit.sha);
 if(!decision.shouldDispatch)
  return{schema:"v39.phase5.signed-native-t24-gh-child-dispatch.v1" as const,
   status:decision.status,acknowledgedGithubChild:false as const,
   providerCalls:0 as const,databaseWrites:0 as const,
   preWitnessCommitsCertifiedByParent:false as const};
 const post=await fetcher(ROOT+"/actions/workflows/"+CHILD+"/dispatches",{
  method:"POST",headers:{...headers,"Content-Type":"application/json"},
  body:JSON.stringify({ref:"main",inputs:{
   frozen_native_t24_packet:permit.path,confirm:CONFIRM
  }})
 });
 // Unknown 5xx / timeout is ambiguous: fail and DO NOT retry in job.
 if(post.status!==204)
  hold("AMBIGUOUS_GITHUB_T24_WORKFLOW_POST_NO_BLIND_RETRY");
 return{schema:"v39.phase5.signed-native-t24-gh-child-dispatch.v1" as const,
  status:"ONE_T24_CHILD_GITHUB_ACCEPTED_NOT_DB_COMMIT" as const,
  acknowledgedGithubChild:true as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  preWitnessCommitsCertifiedByParent:false as const};
}
if(process.env.P5_T24_AUTO_DISPATCH_ENTRYPOINT==="1")
 runP5T24GithubChildDispatcher(process.env).then(result=>{
  console.log(JSON.stringify(result));
 }).catch(e=>{
  const msg=e instanceof Error?e.message:"";
  console.error(/^REFUSED_P5_T24_GH_(?:DISPATCH|CHILD)_[A-Z0-9_]+$/.test(msg)?
   msg:"REFUSED_P5_T24_GH_DISPATCH_UNVERIFIED_RUNTIME_NO_REPLAY");
  process.exitCode=2;
 });
