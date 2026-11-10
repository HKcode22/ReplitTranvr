/**
 * Default OFF Phase5 future POST GH dispatcher.
 * True SOURCE-role prior PRE readback (>=1 of 3), signed V0083 frame,
 * real PG clock and exact one-child GH no-replay. Parent never receives
 * API key, POST reserve/review login or performs charge/SQL writes.
 */
import {readFileSync,lstatSync} from "node:fs";
import {Pool} from "pg";
import {makeP5Stage28DedicatedRolePool}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {auditP5FuturePostActualPriorPre,
 type P5ReviewedFuturePostOneGet,
 type P5FuturePostActualPreReadback}
 from "../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39";
import {admitP5FuturePostFrozenForReadOnly,
 planP5FuturePostOneChild,
 type P5FuturePostSignedPins,type P5PostGhRunHistory}
 from "../server/lib/disruption/phase5FuturePostGithubReadonlyRelease_v39";
import type {P5SignedFuturePostPacket}
 from "./v39_phase5_one_signed_future_post_outcome_v0083_owner_v39";

const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const GH=/^[0-9]{5,25}$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const ROOT="https://api.github.com/repos/HKcode22/ReplitTranvr";
const CHILD="phase5-one-signed-future-post-v0083-main-manual.yml";
const CONFIRM="ONE_SIGNED_FUTURE_POST_V0083_MAX_2_UNITS_NO_RETRY";
function hold(m:string):never{
 throw Error("REFUSED_P5_FUTURE_POST_GH_DISPATCH_"+m);
}
export function admitP5FuturePostGithubParent(env:NodeJS.ProcessEnv){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="schedule"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    !GH.test(env.GITHUB_RUN_ID??"")||
    env.V39_P5_POST_APPROVED_CODE_SHA!==env.GITHUB_SHA||
    env.P5_POST_AUTO_DISPATCH_ENABLED!=="true"||
    env.ADB_AUTO_COLLECT!=="0"||
    env.AERODATABOX_API_KEY||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
    env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
    env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL||
    env.V39_P5_POST_OWNER_APPROVED!=="1"||
    env.V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1"||
    !PATH.test(env.P5_POST_FROZEN_PACKET_FILE??"")||
    ![env.V39_P5_POST_SIGNED_PACKET_SHA256,
       env.V39_P5_MANIFEST_SHA256,env.V39_P5_RIGHTS_SHA256,
       env.V39_P5_POST_CATEGORY_BUDGET_SHA256,
       env.V39_P5_POST_PROVIDER_CONTRACT_SHA256,
       env.V39_P5_POST_REVIEWED_REQUEST_SHA256,
       env.V39_P5_POST_CONTEXT_SHA256,env.V39_P5_FRAME_HASH,
       env.V39_P5_POST_PRICE_SHA256].every(x=>
       typeof x==="string"&&SHA.test(x))||
    typeof env.GITHUB_TOKEN!=="string"||
    env.GITHUB_TOKEN.length<20)
  hold("UNSIGNED_GITHUB_POST_RELEASE_RIGHTS_OR_PHYSICAL_BUDGET");
 let url:URL;
 try{url=new URL(env.V39_P5_SOURCE_DATABASE_URL??"");}
 catch{return hold("MISSING_RESTRICTED_POST_PRE_SOURCE_DB_LOGIN");}
 if(!["postgres:","postgresql:"].includes(url.protocol)||
    decodeURIComponent(url.username)!=="phase5_p5_source_login_20261108"||
    !url.password||!url.hostname||url.pathname!=="/neondb"||
    url.hash)
  hold("UNCOMMISSIONED_SOURCE_ROLE_FOR_POST_PRE_READBACK");
 const pins:P5FuturePostSignedPins={
  frozenPacketPath:env.P5_POST_FROZEN_PACKET_FILE!,
  expectedPacketSha256:env.V39_P5_POST_SIGNED_PACKET_SHA256!,
  approvedCodeSha:env.GITHUB_SHA!,
  currentGithubRunId:env.GITHUB_RUN_ID!,
  manifestSha256:env.V39_P5_MANIFEST_SHA256!,
  sourceRightsSha256:env.V39_P5_RIGHTS_SHA256!,
  categoryBudgetSha256:env.V39_P5_POST_CATEGORY_BUDGET_SHA256!,
  providerContractSha256:env.V39_P5_POST_PROVIDER_CONTRACT_SHA256!,
  requestSha256:env.V39_P5_POST_REVIEWED_REQUEST_SHA256!,
  requestContextSha256:env.V39_P5_POST_CONTEXT_SHA256!,
  frameSha256:env.V39_P5_FRAME_HASH!,
  providerPriceSha256:env.V39_P5_POST_PRICE_SHA256!
 };
 return{path:pins.frozenPacketPath,conn:env.V39_P5_SOURCE_DATABASE_URL!,
  pins,githubToken:env.GITHUB_TOKEN!};
}
async function readActualValidPreAndClock(
 connectionString:string,p:P5ReviewedFuturePostOneGet
):Promise<{pre:P5FuturePostActualPreReadback;dbClockUtc:string}>{
 const raw=new Pool({connectionString,max:1,connectionTimeoutMillis:8000,
  idleTimeoutMillis:1500,
  application_name:"p5_future_post_source_pre_readonly_gh"});
 try{
  const source=makeP5Stage28DedicatedRolePool(raw,{
   group:"source",reviewedDedicatedLogin:"phase5_p5_source_login_20261108",
   forbiddenApplicationLogin:"phase5_p30_prepare_login_20261107"
  });
  const pre=await auditP5FuturePostActualPriorPre(source,p);
  const q=await source.query("SELECT clock_timestamp() AS at");
  if(q.rowCount!==1)hold("NO_ACTUAL_SOURCE_DB_CLOCK_FOR_POST");
  const d=q.rows[0]?.at;
  const instant=d instanceof Date?d:new Date(String(d));
  if(!Number.isFinite(instant.getTime()))
   hold("INVALID_REAL_SOURCE_DB_CLOCK_FOR_POST");
  return{pre,dbClockUtc:instant.toISOString()};
 }finally{await raw.end().catch(()=>{});}
}
export async function runP5FuturePostGithubDispatcher(
 env:NodeJS.ProcessEnv,fetcher:typeof fetch=fetch,
 readback=readActualValidPreAndClock
){
 const admission=admitP5FuturePostGithubParent(env);
 const stat=lstatSync(admission.path);
 if(!stat.isFile()||stat.isSymbolicLink()||
    stat.size<300||stat.size>100000)
  hold("POST_SIGNED_PACKET_NOT_REGULAR_BOUNDED_FILE");
 const bytes=readFileSync(admission.path);
 let packet:P5SignedFuturePostPacket;
 try{packet=JSON.parse(bytes.toString("utf8")) as P5SignedFuturePostPacket;}
 catch{return hold("POST_SIGNED_PACKET_NOT_JSON");}
 const p=admitP5FuturePostFrozenForReadOnly(bytes,packet,admission.pins);
 let actual;
 try{actual=await readback(admission.conn,p);}
 catch(e){
  if(e instanceof Error&&
     e.message==="REFUSED_P5_FUTURE_POST_V0083_NO_VALID_NATIVE_T_SOURCE_PRE_FOR_THIS_POST")
   return{schema:"v39.phase5.github-future-post-auto-dispatch.v1" as const,
    status:"SKIP_NO_VALID_SOURCE_BOUND_PRE_COUNT_MISSINGNESS" as const,
    githubChildAcknowledged:false as const,providerCalls:0 as const,
    productionDatabaseWrites:0 as const};
  throw e;
 }
 // No GH request if source-bound PRE is absent or future POST is not due.
 const early=planP5FuturePostOneChild(
  p,actual.pre,actual.dbClockUtc,null,admission.path);
 if(!early.shouldDispatch&&early.status!=="FUTURE_POST_NOT_YET_IN_REVIEWED_WINDOW"&&
    early.status!=="FUTURE_POST_MISSED_OR_TOO_CLOSE_NO_LATE_GET")
  hold("UNEXPECTED_GITHUB_POST_EARLY_DECISION");
 if(early.status==="FUTURE_POST_NOT_YET_IN_REVIEWED_WINDOW"||
    early.status==="FUTURE_POST_MISSED_OR_TOO_CLOSE_NO_LATE_GET")
  return{schema:"v39.phase5.github-future-post-auto-dispatch.v1" as const,
   status:early.status,githubChildAcknowledged:false as const,
   providerCalls:0 as const,productionDatabaseWrites:0 as const};
 const at=Date.parse(actual.dbClockUtc);
 const from=new Date(at-3*3600000).toISOString();
 const through=new Date(at+60000).toISOString();
 const headers={
  Accept:"application/vnd.github+json",
  Authorization:"Bearer "+admission.githubToken,
  "X-GitHub-Api-Version":"2022-11-28"
 };
 const url=ROOT+"/actions/workflows/"+CHILD+"/runs"+
  "?event=workflow_dispatch&per_page=100"+
  "&created="+encodeURIComponent(from+".."+through);
 const get=await fetcher(url,{method:"GET",headers});
 if(!get.ok)hold("GH_POST_WORKFLOW_ATTEMPTS_UNAVAILABLE");
 const history=await get.json() as P5PostGhRunHistory;
 const decision=planP5FuturePostOneChild(
  p,actual.pre,actual.dbClockUtc,history,admission.path);
 if(!decision.shouldDispatch)
  return{schema:"v39.phase5.github-future-post-auto-dispatch.v1" as const,
   status:decision.status,githubChildAcknowledged:false as const,
   providerCalls:0 as const,productionDatabaseWrites:0 as const};
 const post=await fetcher(ROOT+"/actions/workflows/"+CHILD+"/dispatches",{
  method:"POST",headers:{...headers,"Content-Type":"application/json"},
  body:JSON.stringify({ref:"main",inputs:{
   frozen_future_post_packet:admission.path,confirm:CONFIRM
  }})
 });
 if(post.status!==204)
  hold("GH_POST_AMBIGUOUS_NO_PROVIDER_ATTEMPT_RETRY");
 return{schema:"v39.phase5.github-future-post-auto-dispatch.v1" as const,
  status:"ONE_SIGNED_GH_POST_CHILD_REQUESTED_NOT_V0083_RESERVATION" as const,
  githubChildAcknowledged:true as const,
  actualValidPreHorizonCount:actual.pre.observedValidHorizonCount,
  missingPreHorizonCount:actual.pre.missingPreHorizons.length,
  providerCalls:0 as const,productionDatabaseWrites:0 as const};
}
if(process.env.P5_POST_AUTO_DISPATCH_ENTRYPOINT==="1")
 runP5FuturePostGithubDispatcher(process.env).then(x=>{
  console.log(JSON.stringify(x));
 }).catch(e=>{
  const s=e instanceof Error?e.message:"";
  console.error(/^REFUSED_P5_(?:FUTURE_POST_GH|STAGE28_)[A-Z0-9_]+$/.test(s)?
   s:"REFUSED_P5_FUTURE_POST_GH_DISPATCH_UNVERIFIED_OR_UNCERTAIN_STOP");
  process.exitCode=2;
 });
