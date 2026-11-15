/** NONPAID follow-on to the same actual stored SOURCE child. The existing
 * transport return is not proof of HTTP or COMMIT. Re-authenticate original
 * signed route and current revision, query through existing source-role
 * read-only auditor, bind actual committed original to this GitHub run.
 * No signature minting, publication, provider, writes or replay.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {readP6StableSourceTrust} from "../server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs";
import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39.ts";
import {readP6StoredPrivateReviewOnce} from "../server/lib/disruption/phase6StoredPrivateReviewReadOnce_v39.mjs";
import {hydrateP6DayEpochFullRegistriesReadOnly} from "../server/lib/disruption/phase6DayEpochFullRegistryReadOnce_v39.mjs";
import {selectP6CommittedNativeSourceQuery,auditP6StoredCommittedNativeSource,readP6PendingNativeLaterReview,buildP6PostcommitUnsignedPreReview} from "../server/lib/disruption/phase6StoredSourceNativeCandidateAudit_v39.mjs";
import {makeP5Stage28DedicatedRolePool} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39.ts";
import {compileP5EBoundOriginalBatchReadonly} from "../server/lib/disruption/phase5AmendmentEOriginalFidsReadonlyCompiler_v39.ts";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/,GH=/^[0-9]{5,25}$/;
const hold=x=>{throw Error("HOLD_P6_POSTCOMMIT_NATIVE_AUDIT_"+x);};
const sha=x=>createHash("sha256").update(x).digest("hex");
const srcLogin="phase5_p5_source_login_20261108";
const scope={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
function dbUrl(raw,login){
 let u;try{u=new URL(raw);}catch{hold("MISSING_RESTRICTED_DB_URL");}
 if(!sameP6NeonDatabaseEndpoint(u,u)||decodeURIComponent(u.username)!==login||!u.password||
    u.searchParams.getAll("sslmode").length!==1||u.searchParams.get("sslmode")!=="require"||
    [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require")))
  hold("WRONG_RESTRICTED_TLS_DB_URL");
 return u;
}
export function admitP6PostcommitNativeAudit(env,read=readFileSync){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||env.GITHUB_SHA!==env.V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA||
    env.V39_P5_ACTUAL_NATIVE_REVIEW_OWNER_APPROVED!=="1"||
    env.P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED!=="1"||env.P6_PRIVATE_SOURCE_TRANSPORT_INPUT!=="stored"||
    env.V39_P5_CHILD_CONFIRM!=="ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||env.ADB_AUTO_COLLECT!=="0"||env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    [env.DATABASE_URL,env.V39_DATABASE_RUNTIME_URL,env.RAPIDAPI_KEY,env.AERODATABOX_API_KEY,
     env.AERODATABOX_WEBHOOK_SECRET,env.P6_PRIVATE_PUBLISHER_DATABASE_URL,env.P5_V39_PRE_DATABASE_URL,
     env.P5_V39_PREPARE_DATABASE_URL,env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,
     env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,env.P5_V39_T24_WITNESS_DATABASE_URL].some(Boolean)||
    !GH.test(env.GITHUB_RUN_ID??"")||!SHA.test(env.P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST??"")||
    !SHA.test(env.P6_PRIVATE_DAY_INDEX_SHA256??"")||
    !/^(?:[1-9]|[12][0-9]|3[01])$/.test(env.P5_SOURCE_BATCH_RUN_DAY_INDEX??"")||
    !/^[1-9][0-9]{0,3}$/.test(env.P6_PRIVATE_DAY_INDEX_REVISION??"")||
    Number(env.P6_PRIVATE_DAY_INDEX_REVISION)>1024)
  hold("NOT_EXACT_NONPAID_STORED_SOURCE_CHILD_SCOPE");
 const trust=readP6StableSourceTrust(env);
 const readerUrl=dbUrl(env.P6_PRIVATE_READER_DATABASE_URL,trust.expectedReaderSessionLogin);
 const sourceUrl=dbUrl(env.V39_P5_SOURCE_DATABASE_URL,srcLogin);
 if(readerUrl.username===sourceUrl.username||!sameP6NeonDatabaseEndpoint(readerUrl,sourceUrl))
  hold("CROSS_DATABASE_OR_SHARED_READER");
 const day=Number(env.P5_SOURCE_BATCH_RUN_DAY_INDEX);
 const raw=env.P6_NONPAID_DAILY_POLICY_BASE64;
 if(typeof raw!=="string"||raw.length<100||raw.length>46668||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))
  hold("MISSING_EXACT_PROTECTED_DAILY_POLICY");
 let p;try{
  const b=Buffer.from(raw,"base64");
  if(b.length>35000||b.toString("base64")!==raw||
     !SHA.test(env.P6_NONPAID_DAILY_POLICY_SHA256??"")||sha(b)!==env.P6_NONPAID_DAILY_POLICY_SHA256)
   hold("UNPINNED_POLICY");
  p=JSON.parse(b.toString("utf8"));
 }catch{hold("INVALID_EXACT_POLICY_BYTES");}
 if(p?.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||
    p.delegatedDailyPacketProductionApproved!==true||p.approvedCodeSha!==env.GITHUB_SHA||
    !["manifestSha256","calendarSha256","rightsSha256","releaseSha256"].every(k=>p[k]===trust[k])||
    !SHA.test(p.providerContractSha256??"")||p.providerContractSha256!==env.V39_P5_PROVIDER_CONTRACT_SHA256||
    !Array.isArray(p.dayPlanSha256s)||p.dayPlanSha256s.length!==31||
    p.dayPlanSha256s.some((x,i)=>x?.runDayIndex!==i+1||!SHA.test(x.sha256??""))||
    new Set(p.dayPlanSha256s.map(x=>x.sha256)).size!==31)
  hold("DRIFTED_PROTECTED_DAY_POLICY");
 let plan;try{
  const b=read("data-collection/phase5/planning/phase6-source-day-"+String(day).padStart(2,"0")+".json");
  if(!Buffer.isBuffer(b)||b.length>500000||sha(b)!==p.dayPlanSha256s[day-1].sha256)hold("DAY_PLAN_HASH_DRIFT");
  plan=JSON.parse(b.toString("utf8"));
 }catch{hold("EXACT_APPROVED_DAY_PLAN_UNAVAILABLE");}
 const maxAge=plan?.reviewedRefreshTiming?.maxPopulationStalenessSeconds;
 if(plan?.schema!=="v39.phase6.reviewed-future-day-source-plan.v1"||plan.runDayIndex!==day||
    !Number.isSafeInteger(maxAge)||maxAge<1||maxAge>86400)
  hold("STALENESS_NOT_BOUND_TO_APPROVED_DAY");
 // Reuse the one protected daily review policy; a SOURCE acquisition
 // approval alone is not a new ML feature-derivation authorization.
 const featureReview=p.nativePreFeatureReview;
 if(featureReview!==undefined&&(!featureReview||featureReview.approved!==true||
    !SHA.test(featureReview.externalContentUseReviewSha256??"")||
    featureReview.rightsSha256!==trust.rightsSha256))
  hold("FEATURE_REVIEW_POLICY_OR_RIGHTS_DRIFT");
 return {trust,readerUrl:env.P6_PRIVATE_READER_DATABASE_URL,sourceUrl:env.V39_P5_SOURCE_DATABASE_URL,
  nativePreFeatureReview:featureReview===undefined?null:Object.freeze({...featureReview}),
  expectedSourceRunId:env.GITHUB_RUN_ID,
  selector:{runDayIndex:day,indexRevision:Number(env.P6_PRIVATE_DAY_INDEX_REVISION),
   indexSha256:env.P6_PRIVATE_DAY_INDEX_SHA256,queryDigestSha256:env.P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST},
  policy:{independentNativeCandidateReadOnlyApproved:true,existingPaidDispatchApproved:false,
   noProviderCredentialsInAudit:true,maximumPopulationStalenessSeconds:maxAge,providerContractSha256:p.providerContractSha256}};
}
/** A newer current revision may have added PRE/POST entries. Do not accept
 * removal/replacement of the exact original signed query. Original and
 * current index wires are authenticated and both exact packet identities
 * must match; no guessed query or replay. */
export async function selectP6CurrentPostcommitAuditSelector({readerClient,trust,selector}){
 const original=await readP6StoredPrivateReviewOnce({client:readerClient,trust,scope,
  selector:{kind:"EXACT_DAY",runDayIndex:selector.runDayIndex,indexRevision:selector.indexRevision,indexSha256:selector.indexSha256}});
 const current=await readP6StoredPrivateReviewOnce({client:readerClient,trust,scope,
  selector:{kind:"CURRENT_DAY",runDayIndex:selector.runDayIndex}});
 const now={...selector,indexRevision:current.pins.expectedIndexRevision,indexSha256:current.pins.expectedIndexSha256};
 if(now.indexRevision<selector.indexRevision||(now.indexRevision===selector.indexRevision&&now.indexSha256!==selector.indexSha256))
  hold("REVISION_ROLLBACK");
 if(now.indexSha256===selector.indexSha256)return selector;
 const load=(review,requireCurrentRevisionForPlanning)=>hydrateP6DayEpochFullRegistriesReadOnly({
  client:readerClient,pins:review.pins,wire:review.wire,publicKeyPem:review.publicKeyPem,
  scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning}});
 const previous=selectP6CommittedNativeSourceQuery(await load(original,false),selector,trust);
 const latest=selectP6CommittedNativeSourceQuery(await load(current,true),now,trust);
 if(previous.entry.filePath!==latest.entry.filePath||previous.entry.fileSha256!==latest.entry.fileSha256||
    previous.entry.shardIndex!==latest.entry.shardIndex||previous.q.filePath!==latest.q.filePath||
    previous.q.expectedPacketSha256!==latest.q.expectedPacketSha256)
  hold("ORIGINAL_SIGNED_QUERY_CHANGED");
 return now;
}
export function redactP6PostcommitNativeAudit(a,c){
 if(a?.status!=="ACTUAL_COMMITTED_SOURCE_CANDIDATES_AWAIT_INDEPENDENT_PRE_REVIEW"||
    a.runDayIndex!==c.selector.runDayIndex||a.privateSourceScope?.queryDigestSha256!==c.selector.queryDigestSha256||
    a.privateSourceScope?.expectedSourceGithubRunId!==c.expectedSourceRunId||
    a.providerCalls!==0||a.databaseWrites!==0||a.signedPrePacketsIssued!==0||a.phase6PaidGo!==false||
    !SHA.test(a.candidateAuditSha256??""))
  hold("ORIGINAL_COMMIT_NOT_SAME_GITHUB_RUN_OR_UNVERIFIED_AUDIT");
 return {status:"P6_SAME_CHILD_ACTUAL_SOURCE_NATIVE_CANDIDATE_AUDIT_NO_GO",
  runDayIndex:a.runDayIndex,horizon:a.horizon,candidateAuditSha256:a.candidateAuditSha256,
  observedMemberCount:a.observedMemberCount,candidateCount:a.candidateCount,censoredCount:a.censoredCount,
  classifications:a.classifications,sourceTimingDiagnostics:a.sourceTimingDiagnostics,observedDbClockUtc:a.actualDbClockUtc,
  providerCalls:0,databaseWrites:0,providerContentsPrinted:false,signedPrePacketsIssued:0,phase6PaidGo:false};
}
/** Invoke the existing read-only original compiler for the actual private
 * handoff, only if its independently approved rights purpose is pinned in
 * the protected study policy. Never output flight values in logs. */
export async function reviewP6PostcommitNativeFeatures(pool,a,review,c){
 if(c.nativePreFeatureReview===null)return null;
 const d=review?.privateOriginalDossier,s=a?.privateSourceScope;
 if(review?.status!=="UNSIGNED_PRE_REVIEW_HANDOFF_NOT_AUTHORIZED"||!d||!s||
    d.sourceAuditSha256!==a.candidateAuditSha256||d.queryDigestSha256!==s.queryDigestSha256||
    d.manifestSha256!==c.trust.manifestSha256||d.sourceResponseSha256!==JSON.parse(a.privateAuditBytes.toString("utf8")).sourceResponseSha256||
    !Array.isArray(review.privateReviewEntries)||review.privateReviewEntries.length!==review.reviewEntryCount||
    c.nativePreFeatureReview?.approved!==true||c.nativePreFeatureReview.rightsSha256!==c.trust.rightsSha256||
    !SHA.test(c.nativePreFeatureReview.externalContentUseReviewSha256??""))
  hold("EXACT_FEATURE_REVIEW_HANDOFF_REQUIRED");
 // Preserve the original positive leg-ID condition as ordinary per-flight
 // missingness rather than failing all selected candidates.
 const selected=review.privateReviewEntries.filter(e=>/^leg:[a-zA-Z0-9:|._-]{5,196}$/.test(e.source.flightInstanceId));
 const unsupported=review.reviewEntryCount-selected.length;
 if(!selected.length)return {status:"NO_NATIVE_FEATURE_CANDIDATES_NO_SQL",selectedCount:review.reviewEntryCount,
  unsupportedNativeIdentityCount:unsupported,matchedCount:0,originalBodyReadCount:0,providerCalls:0,dbWrites:0,phase6PaidGo:false};
 const result=await compileP5EBoundOriginalBatchReadonly(pool,{
  source:s,expectedPopulationQueryId:d.sourcePopulationQueryId,expectedResponseSha256:d.sourceResponseSha256,
  externalContentUseReviewSha256:c.nativePreFeatureReview.externalContentUseReviewSha256,
  selected:selected.map(e=>({flightInstanceId:e.source.flightInstanceId,expectedSelectedNativeTUtc:e.source.selectedTNativeUtc,
   expectedForecastCutoffUtc:e.source.ownPreCutoffUtc,expectedMemberAvailableUtc:e.source.sourceMemberAvailableAtUtc}))});
 const out={...result,unsupportedNativeIdentityCount:unsupported,totalPendingCount:review.reviewEntryCount};
 return Object.freeze(Object.defineProperty(out,"privateDecisions",{value:result.privateDecisions,enumerable:false}));
}
export async function runP6PostcommitNativeAudit(env){
 const c=admitP6PostcommitNativeAudit(env);
 const reader=new pg.Client({connectionString:c.readerUrl,connectionTimeoutMillis:8000,query_timeout:25000,
  application_name:"p6_same_child_native_audit_private_reader"});
 const source=new pg.Pool({connectionString:c.sourceUrl,max:1,connectionTimeoutMillis:8000,
  query_timeout:25000,application_name:"p6_same_child_committed_native_source_readonly"});
 try{
  await reader.connect();await reader.query("SET ROLE phase6_private_frozen_reader_v39");
  const pool=makeP5Stage28DedicatedRolePool(source,{group:"source",reviewedDedicatedLogin:srcLogin,
   forbiddenApplicationLogin:"phase5_runtime_application_login"});
  const selector=await selectP6CurrentPostcommitAuditSelector({readerClient:reader,trust:c.trust,selector:c.selector});
  const a=await auditP6StoredCommittedNativeSource({readerClient:reader,sourcePool:pool,trust:c.trust,selector,policy:c.policy});
  const report=redactP6PostcommitNativeAudit(a,c);
  const pending=a.horizon==="T-24h"?null:await readP6PendingNativeLaterReview({readerClient:reader,trust:c.trust,a,selector,policy:c.policy});
  const review=buildP6PostcommitUnsignedPreReview(a,c.trust,pending);
  const features=await reviewP6PostcommitNativeFeatures(pool,a,review,c);
  const result={...report,unsignedPreReview:{...review},
   ...(features?{nativeFeatureReview:{...features}}:{}),
   ...(pending?{pendingLaterReview:{indexRevision:pending.indexRevision,indexSha256:pending.indexSha256,
   originalEligibleCount:pending.originalEligibleCount,alreadyIndexed:pending.alreadyIndexed,changedNativeT:pending.changedNativeT,
   tooLate:pending.tooLate,notYetWithinShardWindow:pending.notYetWithinShardWindow,pendingCount:pending.pendingCount,
   independentReviewStillRequired:true}}:{})};
  // Existing CLI prints only the aggregate. A subsequent authorized
  // in-process reviewer may consume the exact private handoff.
  return Object.freeze(Object.defineProperties(result,{privateUnsignedPreReview:{value:review,enumerable:false},
   privateNativeFeatureReview:{value:features,enumerable:false}}));
 }finally{await Promise.allSettled([reader.end(),source.end()]);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const r=await runP6PostcommitNativeAudit(process.env);console.log(JSON.stringify(r));}
 catch(e){
  const s=String(e?.message??"");
  console.error(/^HOLD_P6_POSTCOMMIT_NATIVE_AUDIT_[A-Z0-9_]+$/.test(s)?s:"HOLD_P6_POSTCOMMIT_NATIVE_AUDIT_UNVERIFIED_REDACTED");
  process.exitCode=2;
 }
}
