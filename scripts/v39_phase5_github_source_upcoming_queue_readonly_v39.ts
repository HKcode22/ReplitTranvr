/**
 * Optional GitHub source-queue OBSERVER, never the paid dispatcher.
 * Uses the pre-existing exact SOURCE login/NOLOGIN-group checks;
 * schedules are disabled unless independently enabled as repo VAR.
 */
import {Pool} from "pg";
import {readFileSync,statSync} from "node:fs";
import {reviewP5OneSignedPacketAgainstActualDueQueue}
 from "../server/lib/disruption/phase5SignedDueSourceOnePacketHandoff_v39";
import type {P5GitHubOneQueryReleaseEnvelope}
 from "../server/lib/disruption/phase5GitHubOneQueryReleaseAdmission_v39";
import {makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {auditP5UpcomingSourceQueue}
 from "../server/lib/disruption/phase5SourceUpcomingDueQueueReadonly_v39";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
function reject(why:string):never{
 throw Error("REFUSED_P5_SOURCE_QUEUE_OWNER_"+why);
}
export function admitP5GitHubSourceQueueObserver(env:NodeJS.ProcessEnv){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    !["schedule","workflow_dispatch"].includes(env.GITHUB_EVENT_NAME??"")||
    (env.GITHUB_EVENT_NAME==="workflow_dispatch"&&
     env.P5_SOURCE_QUEUE_MANUAL_CONFIRM!==
      "READ_ONLY_PREPARED_SOURCE_QUEUE_NO_PROVIDER")||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.V39_P5_QUEUE_APPROVED_CODE_SHA||
    env.ADB_AUTO_COLLECT!=="0"||
    env.AERODATABOX_API_KEY||
    env.V39_P5_SOURCE_QUEUE_OWNER_APPROVED!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1")
  reject("UNSIGNED_PROSPECTIVE_MAIN_OR_SOURCE_USE_GO");
 const scope={
  expectedManifestSha256:env.V39_P5_MANIFEST_SHA256,
  expectedReleaseSha256:env.V39_P5_RELEASE_SHA256,
  expectedRightsSha256:env.V39_P5_RIGHTS_SHA256,
  expectedProviderContractSha256:env.V39_P5_PROVIDER_CONTRACT_SHA256,
  expectedSourceRole:P5_STAGE28_GROUPS.source
 };
 if(![scope.expectedManifestSha256,scope.expectedReleaseSha256,
      scope.expectedRightsSha256,scope.expectedProviderContractSha256]
      .every(x=>typeof x==="string"&&SHA.test(x)))
  reject("UNSIGNED_MANIFEST_RELEASE_RIGHTS_PROVIDER");
 const conn=env.V39_P5_SOURCE_DATABASE_URL;
 let parsed:URL;
 try{parsed=new URL(conn??"");}catch{return reject("MISSING_SOURCE_DB_LOGIN");}
 if(!["postgres:","postgresql:"].includes(parsed.protocol)||
    decodeURIComponent(parsed.username)!=="phase5_p5_source_login_20261108"||
    !parsed.password||!parsed.hostname||parsed.pathname!=="/neondb")
  reject("WRONG_PREEXISTING_COMMISSIONED_SOURCE_LOGIN");
 for(const forbidden of [env.DATABASE_URL,env.V39_DATABASE_RUNTIME_URL]){
  if(!forbidden)continue;
  let u:URL;
  try{u=new URL(forbidden);}catch{continue;}
  if(u.username===parsed.username&&u.hostname===parsed.hostname&&
     u.pathname===parsed.pathname)
   reject("APPLICATION_SOURCE_ROLE_REUSE");
 }
 return {scope:{
  expectedManifestSha256:scope.expectedManifestSha256!,
  expectedReleaseSha256:scope.expectedReleaseSha256!,
  expectedRightsSha256:scope.expectedRightsSha256!,
  expectedProviderContractSha256:scope.expectedProviderContractSha256!,
  expectedSourceRole:scope.expectedSourceRole
 },sourceConnectionString:conn!};
}
export async function runP5GitHubSourceQueueObserver(env:NodeJS.ProcessEnv){
 const ctx=admitP5GitHubSourceQueueObserver(env);
 const raw=new Pool({
  connectionString:ctx.sourceConnectionString,
  max:1,connectionTimeoutMillis:8000,idleTimeoutMillis:1500,
  application_name:"v39_p5_upcoming_readonly_source_queue"
 });
 const scoped=makeP5Stage28DedicatedRolePool(raw,{
  group:"source",
  reviewedDedicatedLogin:"phase5_p5_source_login_20261108",
  forbiddenApplicationLogin:"phase5_p30_prepare_login_20261107"
 });
 try{
  const scanned=await auditP5UpcomingSourceQueue(scoped,ctx.scope);
  // Optional signed packet handoff reports readiness only. Zero GH child
  // dispatch, source GET, paid reservation or source-use authorization.
  let signedPacketHandoff:
   ReturnType<typeof reviewP5OneSignedPacketAgainstActualDueQueue>|null=null;
  if(env.P5_SOURCE_SIGNED_PACKET_OBSERVER_ENABLED==="true"){
   const path=env.P5_SOURCE_SIGNED_FROZEN_PACKET_FILE??"";
   if(!new RegExp("^data-collection/phase5/frozen/[A-Za-z0-9_.-]{8,125}[.]json$").test(path))
    reject("UNREVIEWED_FROZEN_SIGNED_SOURCE_FILE_PATH");
   const stat=statSync(path);
   if(!stat.isFile()||stat.size<100||stat.size>200000)
    reject("INVALID_SIGNED_SOURCE_FILE");
   const bytes=readFileSync(path);
   const packet=JSON.parse(bytes.toString("utf8")) as P5GitHubOneQueryReleaseEnvelope;
   signedPacketHandoff=reviewP5OneSignedPacketAgainstActualDueQueue(
    scanned,bytes,packet,{
     filePath:path,
     expectedPacketSha256:env.V39_P5_SIGNED_QUERY_JSON_SHA256??"",
     expectedQueryDigestSha256:env.V39_P5_QUERY_DIGEST??"",
     expectedManifestSha256:ctx.scope.expectedManifestSha256,
     expectedReleaseSha256:ctx.scope.expectedReleaseSha256,
     expectedRightsSha256:ctx.scope.expectedRightsSha256,
     expectedProviderContractSha256:ctx.scope.expectedProviderContractSha256
    });
  }
  return {
   schema:"v39.phase5.github-upcoming-source-queue-observer.v1" as const,
   status:scanned.status,
   manifestSha256:scanned.manifestSha256,
   checkedAtDatabaseUtc:scanned.dbClockUtc,
   observedQueries:scanned.observedQueries,
   readyForIndependentPaidReviewCount:scanned.candidates.filter(
    q=>q.status==="DUE_SOON_REVIEW_REQUIRED_NO_PAID_DISPATCH").length,
   candidates:scanned.candidates,
   signedPacketHandoff,
   providerCalls:0 as const,
   databaseWrites:0 as const,
   externalGithubDispatches:0 as const,
   actualSourcePrearmWrites:0 as const,
   independentlyCertifiedSevenRestCategories:false as const,
   independentlyCertifiedSourceRights:false as const,
   paidPhase6AuthorizedByThisObserver:false as const
  };
 }finally{await raw.end().catch(()=>{});}
}
if(process.env.P5_GITHUB_SOURCE_QUEUE_ENTRYPOINT==="1")
 runP5GitHubSourceQueueObserver(process.env).then(x=>{
  console.log(JSON.stringify(x));
 }).catch(e=>{
  const m=e instanceof Error?e.message:"";
  console.error(/^REFUSED_(?:P5|PHASE5)_[A-Z0-9_]+$/.test(m)?
   m:"REFUSED_P5_SOURCE_QUEUE_OWNER_UNVERIFIED_OR_SQL_HOLD");
  process.exitCode=2;
 });
