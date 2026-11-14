/**
 * REAL existing Phase5 10-minute SOURCE schedule: optional READ-ONLY
 * authenticated private run-day SOURCE due-review, never a GH dispatcher.
 * It reuses Stage28 dedicated SOURCE queue/DB clock, #661 signed day-epoch
 * restricted reader, and original complete paginated GH child-run history.
 *
 * Parent cannot call provider, write PG16, create an Action or approve paid
 * GO. The existing source one-GET child #662 still owns all paid admission,
 * original credit/STOP and exact private SOURCE packet verification.
 */
import pg from "pg";
import {hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly}
 from "../server/lib/disruption/phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {auditP5UpcomingSourceQueue}
 from "../server/lib/disruption/phase5SourceUpcomingDueQueueReadonly_v39.ts";
import {makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39.ts";
import {readP5CompleteGithubWorkflowHistory}
 from "../server/lib/disruption/phase5GithubCompleteWorkflowHistory_v39.ts";
import {reviewP6PrivateDaySourceDueParentNoDispatch}
 from "../server/lib/disruption/phase6PrivateSourceDayEpochDueParentReview_v39.ts";

export const P6_PRIVATE_SOURCE_REAL_RO_SCHEMA=
 "v39.phase6.source-parent-real-signed-day-epoch-ro-no-provider-no-dispatch.v1";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const CONFIRM="READ_ONLY_AUTHENTIC_PRIVATE_DAY_SOURCE_NO_PROVIDER_NO_DISPATCH";
const fail=c=>{throw Error("HOLD_P6_PRIVATE_SOURCE_PARENT_RO_"+c);};
const utf8=(value,limit,name)=>{
 if(typeof value!=="string"||value.length<8||
    value.length>limit*2||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))
  fail("INVALID_"+name+"_BASE64");
 const buf=Buffer.from(value,"base64");
 if(buf.length<8||buf.length>limit||
    buf.toString("base64")!==value)
  fail("INVALID_"+name+"_BASE64");
 return buf.toString("utf8");
};
const exactKeys=(x,keys)=>x&&typeof x==="object"&&!Array.isArray(x)&&
 Object.keys(x).sort().join("|")===keys.slice().sort().join("|");
function scopedURL(raw,user,which){
 let u;
 try{u=new URL(raw??"");}catch{fail("NO_"+which+"_PG_URL");}
 const params=new Set(["sslmode","channel_binding"]);
 if(!["postgresql:","postgres:"].includes(u.protocol)||
    decodeURIComponent(u.username)!==user||!u.password||
    !u.hostname.endsWith(".neon.tech")||
    u.pathname!=="/neondb"||u.hash||
    (u.port!==""&&u.port!=="5432")||
    u.searchParams.getAll("sslmode").length!==1||
    u.searchParams.get("sslmode")!=="require"||
    u.searchParams.has("channel_binding")&&(
      u.searchParams.getAll("channel_binding").length!==1||
      u.searchParams.get("channel_binding")!=="require")||
    [...u.searchParams.keys()].some(k=>!params.has(k)))
  fail("WRONG_TLS_RESTRICTED_"+which+"_DB_ROLE");
 return raw;
}
const canonicalUTC=x=>typeof x==="string"&&
 /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&
 Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
export function admitP6RealPrivateSourceParentReadOnly(env){
 if(!env||env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    !["schedule","workflow_dispatch"].includes(env.GITHUB_EVENT_NAME)||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA||
    env.P6_PRIVATE_SOURCE_PARENT_RO_OWNER_APPROVED!=="1"||
    (env.GITHUB_EVENT_NAME==="schedule"?
     env.P6_PRIVATE_SOURCE_PARENT_RO_ENABLED!=="true":
     env.P6_PRIVATE_SOURCE_PARENT_RO_CONFIRM!==CONFIRM)||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||
    [
     env.AERODATABOX_API_KEY,env.AERODATABOX_WEBHOOK_SECRET,
     env.RAPIDAPI_KEY,env.DATABASE_URL,env.V39_DATABASE_RUNTIME_URL,
     env.P5_V39_PRE_DATABASE_URL,env.P5_V39_PREPARE_DATABASE_URL,
     env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,
     env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL
    ].some(x=>x!==""&&x!==undefined)||
    typeof env.GITHUB_TOKEN!=="string"||env.GITHUB_TOKEN.length<20||
    ![env.V39_P5_MANIFEST_SHA256,env.V39_P5_RELEASE_SHA256,
      env.V39_P5_RIGHTS_SHA256,
      env.V39_P5_PROVIDER_CONTRACT_SHA256].every(x=>SHA.test(x??"")))
  fail("NOT_MAIN_OWNER_STOP_NO_PROVIDER_REVIEW_ONLY");
 const source=scopedURL(env.V39_P5_SOURCE_DATABASE_URL,
    "phase5_p5_source_login_20261108","ORIGINAL_SOURCE");
 const bundleRaw=utf8(
  env.P6_PRIVATE_SOURCE_PARENT_RO_DAY_REVIEWS_BASE64,
  60000,"INDEPENDENT_DAY_REVIEWS");
 let reviews;
 try{reviews=JSON.parse(bundleRaw);}
 catch{fail("NONJSON_INDEPENDENT_DAY_REVIEWS");}
 if(!Array.isArray(reviews)||reviews.length<1||reviews.length>2)
  fail("NO_BOUNDED_PROSPECTIVE_REVIEWED_STUDY_DAYS");
 let readerLogin=null;
 const usedDays=new Set();
 for(const b of reviews){
  if(!exactKeys(b,["pins","wire","publicKeyPem"])||
     typeof b.publicKeyPem!=="string"||
     !b.publicKeyPem.startsWith("-----BEGIN PUBLIC KEY-----")||
     !b.publicKeyPem.includes("-----END PUBLIC KEY-----")||
     !exactKeys(b.wire,["review","signatureBase64"])||
     !exactKeys(b.pins,[
      "independentExternalReviewerSignaturePinsApproved",
      "privateDayIndexReadOnlyApproved","existingPaidGithubDispatchApproved",
      "expectedReaderSessionLogin","expectedRunDayIndex",
      "expectedIndexRevision","expectedIndexSha256",
      "expectedPreviousIndexSha256","expectedReviewedCodeSha",
      "expectedManifestSha256","expectedCalendarSha256",
      "expectedReleaseSha256","expectedRightsSha256",
      "expectedExternalReviewEvidenceSha256",
      "expectedReviewerPublicKeyFingerprintSha256"
     ])||
     b.pins.independentExternalReviewerSignaturePinsApproved!==true||
     b.pins.privateDayIndexReadOnlyApproved!==true||
     b.pins.existingPaidGithubDispatchApproved!==false||
     !Number.isSafeInteger(b.pins.expectedRunDayIndex)||
     b.pins.expectedRunDayIndex<1||b.pins.expectedRunDayIndex>31||
     usedDays.has(b.pins.expectedRunDayIndex)||
     b.pins.expectedReviewedCodeSha!==env.GITHUB_SHA||
     b.pins.expectedManifestSha256!==env.V39_P5_MANIFEST_SHA256||
     b.pins.expectedReleaseSha256!==env.V39_P5_RELEASE_SHA256||
     b.pins.expectedRightsSha256!==env.V39_P5_RIGHTS_SHA256||
     ![b.pins.expectedIndexSha256,b.pins.expectedCalendarSha256,
      b.pins.expectedExternalReviewEvidenceSha256,
      b.pins.expectedReviewerPublicKeyFingerprintSha256].every(x=>
       SHA.test(x??""))||
     (b.pins.expectedIndexRevision===1?
      b.pins.expectedPreviousIndexSha256!==null:
      !SHA.test(b.pins.expectedPreviousIndexSha256??""))||
     !Number.isSafeInteger(b.pins.expectedIndexRevision)||
     b.pins.expectedIndexRevision<1||b.pins.expectedIndexRevision>1024||
     b.wire.review?.runDayIndex!==b.pins.expectedRunDayIndex||
     b.wire.review?.indexRevision!==b.pins.expectedIndexRevision||
     !canonicalUTC(b.wire.review?.reviewedAtUtc??"")||
     !canonicalUTC(b.wire.review?.validUntilUtc??"")||
     !canonicalUTC(b.wire.review?.retentionNotAfterUtc??""))
   fail("DRIFTED_DAY_ED25519_REVIEW_SOURCE_SCOPE");
  usedDays.add(b.pins.expectedRunDayIndex);
  if(readerLogin===null)readerLogin=b.pins.expectedReaderSessionLogin;
  if(readerLogin!==b.pins.expectedReaderSessionLogin)
   fail("MULTIPLE_READER_CREDENTIALS_FOR_ONE_JOB");
 }
 if(typeof readerLogin!=="string"||
    !/^phase6_private_reader_login_[a-z0-9_]{6,50}$/.test(readerLogin))
  fail("REVIEWED_PRIVATE_READER_LOGIN_MISSING");
 const reader=scopedURL(env.P6_PRIVATE_READER_DATABASE_URL,
    readerLogin,"PRIVATE_READONLY");
 return Object.freeze({
  schema:P6_PRIVATE_SOURCE_REAL_RO_SCHEMA,
  sourceUrl:source,readerUrl:reader,
  reviews,
  mainSha:env.GITHUB_SHA,ghToken:env.GITHUB_TOKEN,
  scope:{
   expectedManifestSha256:env.V39_P5_MANIFEST_SHA256,
   expectedReleaseSha256:env.V39_P5_RELEASE_SHA256,
   expectedRightsSha256:env.V39_P5_RIGHTS_SHA256,
   expectedProviderContractSha256:env.V39_P5_PROVIDER_CONTRACT_SHA256,
   expectedSourceRole:P5_STAGE28_GROUPS.source
  }
 });
}

/** Offline tests may inject data sources; real GH entrypoint never does. */
export async function runP6RealPrivateSourceParentReadOnly(
 env,options={}
){
 const ctx=admitP6RealPrivateSourceParentReadOnly(env);
 const readSource=options.readSource??(async()=>{
  const pool=new pg.Pool({
   connectionString:ctx.sourceUrl,max:1,
   connectionTimeoutMillis:8000,idleTimeoutMillis:1000
  });
  try{
   const scoped=makeP5Stage28DedicatedRolePool(pool,{
    group:"source",
    reviewedDedicatedLogin:"phase5_p5_source_login_20261108",
    forbiddenApplicationLogin:"phase5_p30_prepare_login_20261107"
   });
   const scan=await auditP5UpcomingSourceQueue(scoped,ctx.scope);
   return{
    schema:"v39.phase5.github-upcoming-source-queue-observer.v1",
    checkedAtDatabaseUtc:scan.dbClockUtc,
    manifestSha256:scan.manifestSha256,
    observedQueries:scan.observedQueries,
    providerCalls:0,databaseWrites:0,externalGithubDispatches:0,
    signedDaySourceBatch:null,signedPacketHandoff:null,
    candidates:scan.candidates
   };
  }finally{await pool.end();}
 });
 const readDays=options.readDays??(async()=>{
  const c=new pg.Client({
   connectionString:ctx.readerUrl,connectionTimeoutMillis:8000,
   query_timeout:25000
  });
  await c.connect();
  try{
   await c.query("SET ROLE phase6_private_frozen_reader_v39");
   const all=[];
   for(const b of ctx.reviews)
    all.push(await hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly({
     client:c,pins:b.pins,wire:b.wire,publicKeyPem:b.publicKeyPem,
     scope:{privateDayRegistryReadOnlyApproved:true,
      existingPaidDispatchApproved:false}
    }));
   return all;
  }finally{await c.end();}
 });
 const readHistory=options.readHistory??(async scan=>{
  const now=new Date(scan.checkedAtDatabaseUtc).getTime();
  if(!Number.isFinite(now))fail("INVALID_REAL_SOURCE_DB_CLOCK");
  const left=new Date(now-3*3600000).toISOString();
  const right=new Date(now+60000).toISOString();
  const url="https://api.github.com/repos/HKcode22/ReplitTranvr/actions/workflows/"+
   "phase5-one-signed-day-source-child-dispatch.yml/runs"+
   "?event=workflow_dispatch&per_page=100&created="+
   encodeURIComponent(left+".."+right);
  return readP5CompleteGithubWorkflowHistory(url,fetch,{
   Accept:"application/vnd.github+json",
   Authorization:"Bearer "+ctx.ghToken,
   "X-GitHub-Api-Version":"2022-11-28"
  });
 });
 try{
  // Two different unprivileged PG16 sessions. No provider key is present.
  const scan=await readSource(ctx);
  const days=await readDays(ctx);
  const history=await readHistory(scan,ctx);
  const planned=reviewP6PrivateDaySourceDueParentNoDispatch({
   days,sourceObserver:scan,history,
   expectedManifestSha256:ctx.scope.expectedManifestSha256,
   expectedMainSha:ctx.mainSha
  });
  if(planned.redactedSummary.providerCalls!==0||
     planned.redactedSummary.databaseWrites!==0||
     planned.redactedSummary.githubDispatches!==0||
     planned.redactedSummary.phase6PaidGo!==false)
   fail("UNSAFE_PRIVATE_SOURCE_PARENT_PLANNER");
  return Object.freeze({...planned.redactedSummary,
   realPgQueriesReadWithOriginalSourceLogin:true,
   protectedDayEpochsReadWithSeparateReaderLogin:true,
   completeGHChildRunHistoryConsulted:true,
   actualGithubChildDispatch:false,
   privateSourceQueryContentsNotPrinted:true,
   paidPhase6Go:false
  });
 }catch{
  // Never print private path/query/provider JSON, DB credentials or failed
  // external fetch responses; fail closed on missing GitHub or PG evidence.
  fail("AUTHENTICATED_PRIVATE_SOURCE_QUEUE_OR_HISTORY_HOLD_REDACTED");
 }
}
if(process.env.P6_PRIVATE_SOURCE_PARENT_RO_ENTRYPOINT==="1"){
 runP6RealPrivateSourceParentReadOnly(process.env)
  .then(s=>console.log(JSON.stringify(s)))
  .catch(()=>{
   console.error("HOLD_P6_PRIVATE_SOURCE_PARENT_RO_NO_PROVIDER_NO_GO_REDACTED");
   process.exitCode=2;
  });
}
