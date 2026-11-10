/**
 * ONE reviewed FUTURE Phase5 POST FIDS observation, actual V0083 reservation,
 * original decoded source body + normalized rows, GitHub main manual ONLY.
 *
 * This is a paid-capable runtime, intentionally INERT until ALL independent
 * source-use, code, exact-packet, three different PostgreSQL worker roles and
 * Phase6 GO secrets exist. Nothing is automatically scheduled or installed.
 * A single failed/ambiguous physical attempt is never repeated here.
 */
import {readFileSync,statSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {Pool} from "pg";
import {fetchFidsAirport} from
 "../server/lib/disruption/aerodataboxLimiter_v3";
import {fetchFidsPopulation,persistFidsObservation,
 type FidsCensusParams,type PopulationRow,type FidsQueryObservation}
 from "../server/lib/disruption/fidsCensus_v3";
import {makeP5Stage28DedicatedRolePool} from
 "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {makeP5V0083RestDedicatedRolePool} from
 "../server/lib/disruption/phase5V0083RestDedicatedRolePool_v39";
import {
 auditP5FuturePostActualPriorPre,prepareP5FuturePostV0083ReviewedCall,
 reserveP5FuturePostV0083OnePhysicalGet,
 verifyP5FuturePostOriginalBeforeCommit,
 verifyP5FuturePostOriginalAfterCommit,
 verifyP5FuturePostReviewedFrame,
 type P5ReviewedFuturePostOneGet
} from "../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39";

const SHA=/^[0-9a-f]{64}$/,GH=/^[0-9a-f]{40}$/,RUN=/^[0-9]{5,25}$/;
const FILE=/^data-collection\/phase5\/frozen\/[a-zA-Z0-9_-]{8,100}\.json$/;
const REFUSE="REFUSED_P5_GITHUB_V0083_FUTURE_POST_";
const hold=(x:string):never=>{throw Error(REFUSE+x);};
export interface P5SignedFuturePostPacket{
 schema:"v39.phase5.github-future-post-reviewed-release.v1";
 approvedCodeSha:string;
 reviewed:Omit<P5ReviewedFuturePostOneGet,"githubRunId">;
 independentSourceContentsUseAndRESTReleaseAttested:true;
}
function validateDbUrl(raw:string|undefined,username:string,label:string){
 if(!raw)hold(label+"_DB_MISSING");
 let parsed:URL;
 try{parsed=new URL(raw);}catch{hold(label+"_DB_URL_INVALID");}
 if(!["postgres:","postgresql:"].includes(parsed.protocol)||
    parsed.username!==username||!parsed.hostname||
    !parsed.password||parsed.pathname!=="/neondb")
  hold(label+"_NOT_DEDICATED_REAL_NEONDB_LOGIN");
 return parsed;
}
export function admitP5SignedFuturePostGitHub(
 env:NodeJS.ProcessEnv,bytes:Buffer,packet:P5SignedFuturePostPacket,
 file:string
):P5ReviewedFuturePostOneGet{
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    env.P5_FUTURE_POST_CONFIRM!==
     "ONE_SIGNED_FUTURE_POST_V0083_MAX_2_UNITS_NO_RETRY"||
    !GH.test(env.GITHUB_SHA??"")||
    !RUN.test(env.GITHUB_RUN_ID??"")||
    env.V39_P5_POST_OWNER_APPROVED!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||
    !env.AERODATABOX_API_KEY)
  hold("MAIN_GITHUB_SIGNED_GO_OR_SOURCE_RIGHTS_NOT_PRESENT");
 if(!FILE.test(file)||!Buffer.isBuffer(bytes)||
    bytes.length<300||bytes.length>100000||
    !SHA.test(env.V39_P5_POST_SIGNED_PACKET_SHA256??"")||
    createHash("sha256").update(bytes).digest("hex")!==
      env.V39_P5_POST_SIGNED_PACKET_SHA256)
  hold("UNREVIEWED_POST_PACKET_BYTES_OR_PATH");
 if(!packet||packet.schema!==
      "v39.phase5.github-future-post-reviewed-release.v1"||
    packet.approvedCodeSha!==env.GITHUB_SHA||
    env.V39_P5_POST_APPROVED_CODE_SHA!==env.GITHUB_SHA||
    packet.independentSourceContentsUseAndRESTReleaseAttested!==true||
    Object.hasOwn(packet.reviewed??{},"githubRunId"))
  hold("SELF_APPROVED_OR_CROSS_RUN_SOURCE_PACKET");
 const p={...packet.reviewed,
   githubRunId:env.GITHUB_RUN_ID!} as P5ReviewedFuturePostOneGet;
 verifyP5FuturePostReviewedFrame(p);
 if(p.manifestSha256!==env.V39_P5_MANIFEST_SHA256||
    p.reviewedSourceRightsSha256!==env.V39_P5_RIGHTS_SHA256||
    p.reviewedCategoryBudgetSha256!==
      env.V39_P5_POST_CATEGORY_BUDGET_SHA256||
    p.reviewedProviderContractSha256!==env.V39_P5_POST_PROVIDER_CONTRACT_SHA256||
    p.requestSha256!==env.V39_P5_POST_REVIEWED_REQUEST_SHA256||
    p.reviewedRequestContextSha256!==env.V39_P5_POST_CONTEXT_SHA256||
    p.reviewedFrameSha256!==env.V39_P5_FRAME_HASH||
    p.reviewedProviderPriceSha256!==env.V39_P5_POST_PRICE_SHA256)
  hold("POST_FROZEN_MANIFEST_FRAME_RIGHTS_PRICE_DRIFT");
 const review=validateDbUrl(
  env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,
  "phase5_p5_other_rest_review_login_20261110","REVIEW");
 const reserve=validateDbUrl(
  env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,
  "phase5_p5_other_rest_reserve_login_20261110","RESERVE");
 const source=validateDbUrl(
  env.V39_P5_SOURCE_DATABASE_URL,
  "phase5_p5_source_login_20261108","SOURCE");
 if(new Set([review.username,reserve.username,source.username]).size!==3||
    [review,reserve,source].some(u=>[env.DATABASE_URL,
       env.V39_DATABASE_RUNTIME_URL].some(v=>{
      if(!v)return false;
      try{const a=new URL(v);return u.username===a.username&&
       u.hostname===a.hostname&&u.pathname===a.pathname;}
      catch{return false;}
    })))
  hold("REST_SOURCE_OR_APP_LOGIN_NOT_SEPARATE");
 return p;
}
export async function runP5SignedFuturePost(
 env:NodeJS.ProcessEnv,bytes:Buffer,packet:P5SignedFuturePostPacket,
 file:string
){
 const p=admitP5SignedFuturePostGitHub(env,bytes,packet,file);
 const reservePool=new Pool({
  connectionString:env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,
  max:1,connectionTimeoutMillis:8000,
  application_name:"p5_v0083_one_signed_future_post_reserve"
 });
 const reviewerPool=new Pool({
  connectionString:env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,
  max:1,connectionTimeoutMillis:8000,
  application_name:"p5_v0083_one_signed_future_post_review"
 });
 const sourcePool=new Pool({
  connectionString:env.V39_P5_SOURCE_DATABASE_URL,
  max:1,connectionTimeoutMillis:8000,
  application_name:"p5_v0083_one_signed_future_post_original"
 });
 const reviewer=makeP5V0083RestDedicatedRolePool(reviewerPool,{
  group:"review",
  reviewedDedicatedLogin:"phase5_p5_other_rest_review_login_20261110",
  forbiddenApplicationLogin:"phase5_p5_source_login_20261108"
 });
 const spender=makeP5V0083RestDedicatedRolePool(reservePool,{
  group:"reserve",
  reviewedDedicatedLogin:"phase5_p5_other_rest_reserve_login_20261110",
  forbiddenApplicationLogin:"phase5_p5_source_login_20261108"
 });
 const source=makeP5Stage28DedicatedRolePool(sourcePool,{
  group:"source",
  reviewedDedicatedLogin:"phase5_p5_source_login_20261108",
  forbiddenApplicationLogin:"phase5_p30_prepare_login_20261107"
 });
 try{
  // All PRE checks use actual same-flight SOURCE-role PostgreSQL records.
  // No source body, flight record or protected TEST outcomes are printed.
  const pre=await auditP5FuturePostActualPriorPre(source,p);
  // Independent REST-review role stages exactly this signed GitHub run ID;
  // the source paid reservation comes only from a separate REST role.
  await prepareP5FuturePostV0083ReviewedCall(reviewer,p);
  // This V0083 SERIALIZABLE commit irreversibly spends up to 2 actual API
  // units. Never retry on timeout, ambiguous return, provider 429 or CI.
  const attempt=await reserveP5FuturePostV0083OnePhysicalGet(spender,p);
  let budgetCalls=0,committedOriginal=false;
  let postReadback:
    Awaited<ReturnType<typeof verifyP5FuturePostOriginalAfterCommit>>|null=null;
  const params:FidsCensusParams={
   airportIcao:p.airportIcao,fromLocal:p.fromLocal,toLocal:p.toLocal,
   ianaTimezone:p.airportIanaTimezone,
   withCancelled:true,withCodeshared:true,withCargo:false,withPrivate:false,
   direction:"Departure",
   serviceWindowStartUtc:new Date(p.plannedSourceFromUtc),
   serviceWindowEndUtc:new Date(p.plannedSourceToUtc),
   cutoffUtc:new Date(p.postDispatchEarliestUtc),
   restCategory:"outcome",
   batchId:attempt.reservationSha256,
   phase5PostReservationSha256:attempt.reservationSha256,
   providerApiVersion:"V39-FUTURE-POST-REVIEWED-SOURCE-V1",
   fidsProtocolVersion:"P5-FUTURE-POST-V0083-ONE-GET-V1",
   openapiSha256:p.reviewedProviderContractSha256
  };
  const result=await fetchFidsPopulation(params,{
   fetchAirport:async(icao,from,to,opts)=>{
    if(icao!==p.airportIcao||from!==p.fromLocal||to!==p.toLocal||
       opts?.direction!=="Departure"||opts?.category!=="outcome"||
       opts?.strictDepartureList!==true||opts?.strictArrivalList!==false)
      hold("PROVIDER_FRAME_CHANGED_FROM_APPROVED_FIDS_QUERY");
    return fetchFidsAirport(icao,from,to,{
     ...opts,
     onePhysicalAttemptOnly:true,
     budgetOwner:{
      reserve:async(category,units,physicalAttempt)=>{
       budgetCalls++;
       if(budgetCalls!==1||category!=="outcome"||
          units!==2||physicalAttempt!==1)
        hold("SECOND_PROVIDER_GET_OR_WRONG_REST_CATEGORY_FORBIDDEN");
       return attempt.reservationSha256;
      }
     }
    });
   },
   persist:async(q:FidsQueryObservation,rows:PopulationRow[])=>{
    let checked=false;
    const n=await persistFidsObservation(q,rows,
      async(client,facts)=>{
       if(checked)hold("DUPLICATE_ORIGINAL_CUSTODY_HOOK");
       checked=true;
       await verifyP5FuturePostOriginalBeforeCommit(
        client,p,attempt,q,rows,facts);
      },source as unknown as Pool);
    if(!checked||n!==rows.length)
     hold("NO_ATOMIC_POST_ORIGINAL_AND_POPULATION_COMMIT");
    postReadback=await verifyP5FuturePostOriginalAfterCommit(
      source,p,attempt,q.populationQueryId,q.responseHash,n);
    committedOriginal=true;
    return n;
   }
  });
  if(!result||!committedOriginal||!postReadback)
   return{
    schema:"v39.phase5.github-one-future-post-result.v1" as const,
    status:"ONE_PAID_POST_RESERVED_OR_PROVIDER_UNOBSERVED_NO_RETRY" as const,
    manifestSha256:p.manifestSha256,requestSha256:p.requestSha256,
    flightPreReferenceCount:pre.observedValidHorizonCount,
    reservedApiUnits:2,providerOriginalCommitted:false,
    actualPhysicalEventCertified:false,phase6DataCollectionComplete:false
   };
  return{
   schema:"v39.phase5.github-one-future-post-result.v1" as const,
   status:"ONE_FUTURE_POST_SOURCE_ORIGINAL_DURABLE_NOT_PHYSICAL_LABEL" as const,
   manifestSha256:p.manifestSha256,requestSha256:p.requestSha256,
   flightPreReferenceCount:pre.observedValidHorizonCount,
   missingPreHorizonCount:pre.missingPreHorizons.length,
   reservedApiUnits:2,providerOriginalCommitted:true,
   normalizedPopulationRows:result.persistedPopulationRows,
   actualPhysicalEventCertified:false,phase6DataCollectionComplete:false
  };
 }finally{
  await Promise.allSettled([
   reviewerPool.end(),reservePool.end(),sourcePool.end()
  ]);
 }
}
async function main(){
 if(process.argv.length!==3||!FILE.test(process.argv[2]??""))
  hold("ONE_FROZEN_PACKET_PATH_REQUIRED");
 const file=process.argv[2];
 const stat=statSync(file);
 if(!stat.isFile()||stat.size<300||stat.size>100000)
  hold("UNREVIEWED_PACKET_SIZE");
 const raw=readFileSync(file);
 const packet=JSON.parse(raw.toString("utf8")) as P5SignedFuturePostPacket;
 const out=await runP5SignedFuturePost(process.env,raw,packet,file);
 console.log(JSON.stringify(out));
 if(out.status!=="ONE_FUTURE_POST_SOURCE_ORIGINAL_DURABLE_NOT_PHYSICAL_LABEL")
  process.exitCode=3;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{
  // Never display provider raw, SQL credentials or error messages from
  // unreviewed tool results. Only stable refusal codes appear in CI logs.
  const msg=e instanceof Error?e.message:"";
  const safe=/^REFUSED_P5_[A-Z0-9_]+$/.test(msg)?msg:
    "REFUSED_P5_GITHUB_V0083_FUTURE_POST_UNVERIFIED_OR_AMBIGUOUS_HOLD_NO_RETRY";
  console.error(safe);process.exitCode=2;
 });
