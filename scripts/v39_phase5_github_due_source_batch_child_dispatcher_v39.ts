/**
 * Phase5 first real GitHub-only due-source child-dispatch coordinator.
 *
 * Existing scheduled source observer supplies authentic restricted DB
 * readiness; independent external GO/Contents rights/UTC budgets are
 * separately required. No AeroDataBox key, request or DB write in this
 * controller. One child eventually reuses the existing one-GET worker.
 *
 * GitHub workflow-run index is a best-effort duplicate-run suppressor;
 * V0080 one-prearm and V0079/V0082 atomic DB charges are authoritative
 * duplicate-PAID-attempt protection. No uncertain POST is blindly retried.
 */
import {runP5GitHubSourceQueueObserver}
 from "./v39_phase5_github_source_upcoming_queue_readonly_v39";
import {readP5CompleteGithubWorkflowHistory,P5_COMPLETE_HISTORY_MAX}
 from "../server/lib/disruption/phase5GithubCompleteWorkflowHistory_v39";
import type {P5SourceBatchResult}
 from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";
const H=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const CHILD="phase5-one-signed-day-source-child-dispatch.yml";
const ORIGIN="https://api.github.com/repos/HKcode22/ReplitTranvr";
const PREFIX="P5 SOURCE ";
const CONFIRM="ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET";
const MAX_CHILDREN_PER_OBSERVER=4;
function hold(code:string):never{
 throw Error("REFUSED_P5_AUTO_SOURCE_DISPATCH_"+code);
}
export function admitP5GitHubDueChildDispatcher(env:NodeJS.ProcessEnv){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="schedule"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.V39_P5_QUEUE_APPROVED_CODE_SHA||
    env.GITHUB_SHA!==env.V39_P5_APPROVED_CODE_SHA||
    env.ADB_AUTO_COLLECT!=="0"||
    env.AERODATABOX_API_KEY||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
    env.P5_AUTO_SOURCE_DISPATCH_ENABLED!=="true"||
    env.P5_SOURCE_QUEUE_OBSERVER_ENABLED!=="true"||
    env.P5_SOURCE_BATCH_REGISTRY_OBSERVER_ENABLED!=="true"||
    env.P5_SOURCE_SIGNED_PACKET_OBSERVER_ENABLED==="true"||
    env.V39_P5_SOURCE_QUEUE_OWNER_APPROVED!=="1"||
    env.V39_P5_AUTO_SOURCE_DISPATCH_APPROVED!=="1"||
    env.V39_P5_SIGNED_DAY_REGISTRY_RELEASE!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1"||
    env.V39_P5_SOURCE_DB_ROLE_REVIEWED!=="1"||
    env.V39_P5_SEVEN_REST_BUDGET_SIGNED!=="1"||
    env.V39_P5_REST_UNIT_PRICE_APPROVED!=="2"||
    !H.test(env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256??"")||
    !H.test(env.V39_P5_MANIFEST_SHA256??"")||
    !H.test(env.V39_P5_RELEASE_SHA256??"")||
    !H.test(env.V39_P5_RIGHTS_SHA256??"")||
    !H.test(env.V39_P5_PROVIDER_CONTRACT_SHA256??"")||
    !FILE.test(env.P5_SOURCE_BATCH_REGISTRY_FILE??"")||
    !/^[1-9][0-9]*$/.test(env.P5_SOURCE_BATCH_RUN_DAY_INDEX??"")||
    !env.GITHUB_TOKEN||env.GITHUB_TOKEN.length<20)
  hold("UNSIGNED_GITHUB_PARENT_SOURCE_GO_OR_REGISTRY");
 const day=Number(env.P5_SOURCE_BATCH_RUN_DAY_INDEX);
 if(!Number.isSafeInteger(day)||day<1||day>31)
  hold("INVALID_SIGNED_RUN_DAY");
 return {
  day,registryFilePath:env.P5_SOURCE_BATCH_REGISTRY_FILE!,
  expectedRegistrySha256:env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256!,
  approvedMainSha:env.GITHUB_SHA!,
  token:env.GITHUB_TOKEN!
 };
}
export interface P5GithubChildRunBrief{
 display_title:string;status:string;conclusion:string|null;
 created_at:string;id:number;
}
export interface P5GithubRecentIndex{
 total_count:number;
 workflow_runs:P5GithubChildRunBrief[];
}
export interface P5ChildDispatchIntent{
 queryDigestSha256:string;
 frozenPacketPath?:string;
 registryFilePath:string;
 runDayIndex:number;
 plannedDispatchUtc:string;
}
function iso(s:unknown):number{
 if(typeof s!=="string"||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)||
    !Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)
  hold("INVALID_ACTUAL_SOURCE_DB_CLOCK");
 return Date.parse(s);
}
/**
 * Planning itself is pure. It emits at most four concrete child intents;
 * never creates a GH run and never treats a due status as a rights grant.
 * Any missing DB query HOLD blocks the entire signed batch instead of
 * silently replacing the flight/airport.
 */
export function selectP5DueSignedSourceChildIntents(
 batch:P5SourceBatchResult,recent:P5GithubRecentIndex,
 registryFilePath:string
){
 if(!batch||
    batch.schema!=="v39.phase5.signed-per-day-source-batch-actual-db-handoff.v1"||
    batch.status!=="BOUND_SIGNED_DAY_SOURCE_BATCH_REVIEWED_NO_DISPATCH"||
    batch.githubChildDispatchCount!==0||
    batch.databaseWrites!==0||batch.providerCalls!==0||
    batch.paidPhase6GoGranted!==false||
    !FILE.test(registryFilePath)||
    !Array.isArray(batch.handoffs)||
    batch.handoffs.length!==batch.inspectedQueryCount||
    batch.inspectedQueryCount<1||batch.inspectedQueryCount>96||
    batch.dbMissingHoldCount!==0)
  hold("UNVERIFIED_BATCH_OR_UNEXPECTED_DB_MISSING");
 const now=iso(batch.observedDbClockUtc);
 if(!recent||!Number.isSafeInteger(recent.total_count)||
    recent.total_count<0||recent.total_count>P5_COMPLETE_HISTORY_MAX||
    !Array.isArray(recent.workflow_runs)||
    recent.workflow_runs.length!==recent.total_count)
  hold("UNBOUNDED_OR_INCOMPLETE_GITHUB_RUN_HISTORY");
 const seenRuns=new Set<string>();
 for(const run of recent.workflow_runs){
  if(!run||typeof run.display_title!=="string"||
     !Number.isSafeInteger(run.id)||run.id<1||
     !["queued","in_progress","completed","waiting","requested","pending"].includes(run.status)||
     !Number.isFinite(Date.parse(run.created_at)))
   hold("UNTRUSTED_GITHUB_RUN_HISTORY_RECORD");
  if(run.display_title.startsWith(PREFIX)){
   const digest=run.display_title.slice(PREFIX.length);
   if(!H.test(digest))hold("MALFORMED_GITHUB_CHILD_RUN_IDENTITY");
   seenRuns.add(digest);
  }
 }
 const toDispatch:P5ChildDispatchIntent[]=[];
 const seenBatch=new Set<string>();
 let eligible=0,alreadyGitHubDispatched=0;
 for(const h of batch.handoffs){
  if(!h||h.schema!=="v39.phase5.one-signed-unattended-due-queue-handoff.v1"||
     h.runDayIndex!==batch.runDayIndex||
     !H.test(h.queryDigestSha256)||
     seenBatch.has(h.queryDigestSha256))
   hold("DUPLICATED_OR_MIXED_DAY_DB_HANDOFF");
  seenBatch.add(h.queryDigestSha256);
  if(h.status!=="SIGNED_QUERY_DUE_FOR_INDEPENDENT_RELEASE_NO_DISPATCH")
   continue;
  eligible++;
  const planned=iso(h.plannedDispatchUtc);
  if(planned-now<15*60000||planned-now>105*60000)
   hold("UNSAFE_LEAD_TIME_TO_SOURCE_CUTOFF");
  if(seenRuns.has(h.queryDigestSha256)){
   alreadyGitHubDispatched++;
   continue;
  }
  if(toDispatch.length<MAX_CHILDREN_PER_OBSERVER)
   toDispatch.push({
    queryDigestSha256:h.queryDigestSha256,

    registryFilePath,runDayIndex:batch.runDayIndex,
    plannedDispatchUtc:h.plannedDispatchUtc
   });
 }
 // The source batch handoff intentionally excludes raw packet paths. The
 // caller must rebind each query to its EXACT independently SHA-pinned
 // registry entry; the queue alone is insufficient to route a child.
 return{
  schema:"v39.phase5.due-source-github-child-intents.v1" as const,
  eligibleCount:eligible,alreadyGitHubDispatched,
  selectedForIndependentReleaseCount:toDispatch.length,
  deferredDueCount:eligible-alreadyGitHubDispatched-toDispatch.length,
  intents:toDispatch,
  providerCalls:0 as const,databaseWrites:0 as const,
  githubChildDispatchedByPurePlanner:0 as const,
  independentPaidGoStillRequired:true as const
 };
}
export function bindP5ExactChildIntentFiles(
 proposal:ReturnType<typeof selectP5DueSignedSourceChildIntents>,
 batch:P5SourceBatchResult,
 registryEntries:readonly{
  filePath:string;expectedQueryDigestSha256:string;
 }[]
){
 if(!Array.isArray(registryEntries)||
    registryEntries.length!==batch.inspectedQueryCount)
  hold("REGISTRY_ENTRY_COUNT_MISMATCH");
 const index=new Map<string,string>();
 for(const entry of registryEntries){
  if(!FILE.test(entry.filePath??"")||
     !H.test(entry.expectedQueryDigestSha256??"")||
     index.has(entry.expectedQueryDigestSha256))
   hold("DUPLICATE_OR_MALFORMED_SIGNED_SOURCE_REGISTRY");
  index.set(entry.expectedQueryDigestSha256,entry.filePath);
 }
 return proposal.intents.map(intent=>{
  const path=index.get(intent.queryDigestSha256);
  if(!path||path===intent.registryFilePath)
   hold("MISSING_EXACT_SIGNED_SOURCE_CHILD_FILE");
  return {...intent,frozenPacketPath:path};
 });
}
export async function runP5GitHubDueChildDispatcher(
 env:NodeJS.ProcessEnv,
 fetchImpl:typeof fetch=fetch
){
 const admission=admitP5GitHubDueChildDispatcher(env);
 // This invokes the SAME existing restricted SOURCE database read-only
 // observer; it does NOT load or expose the AeroDataBox API key.
 const scanned=await runP5GitHubSourceQueueObserver(env);
 const batch=scanned.signedDaySourceBatch;
 if(!batch||batch.runDayIndex!==admission.day||
    batch.registrySha256!==admission.expectedRegistrySha256)
  hold("REAL_SIGNED_DAY_DB_QUEUE_NOT_OBSERVED");
 const dbTime=iso(batch.observedDbClockUtc);
 const createdFrom=new Date(dbTime-3*3600000).toISOString();
 const createdTo=new Date(dbTime+60000).toISOString();
 const url=ORIGIN+"/actions/workflows/"+CHILD+"/runs"+
  "?event=workflow_dispatch&per_page=100"+
  "&created="+encodeURIComponent(createdFrom+".."+createdTo);
 const recent=await readP5CompleteGithubWorkflowHistory(url,fetchImpl,{
   Accept:"application/vnd.github+json",
   Authorization:"Bearer "+admission.token,
   "X-GitHub-Api-Version":"2022-11-28"
  }) as P5GithubRecentIndex;
 const proposal=selectP5DueSignedSourceChildIntents(
  batch,recent,admission.registryFilePath);
 // Load the exact registry AGAIN after the PostgreSQL observer finishes;
 // verify SHA + day + every entry; a changed checkout file cannot reroute.
 const fs=await import("node:fs");
 const crypto=await import("node:crypto");
 const bytes=fs.readFileSync(admission.registryFilePath);
 if(crypto.createHash("sha256").update(bytes).digest("hex")!==
    admission.expectedRegistrySha256)
  hold("SIGNED_REGISTRY_CHANGED_AFTER_READONLY_SOURCE_SCAN");
 const registry=JSON.parse(bytes.toString("utf8")) as {
  runDayIndex:number;entries:{filePath:string;expectedQueryDigestSha256:string}[];
 };
 if(registry.runDayIndex!==admission.day)
  hold("REGISTRY_DAY_CHANGED_AFTER_DB_SCAN");
 const selected=bindP5ExactChildIntentFiles(proposal,batch,registry.entries);
 const submitted:string[]=[];
 for(const intent of selected){
  // Parent cannot authorize budget by itself: the child rechecks signed
  // release, V0080 prearm and V0079/V0082 atomic physical reservation.
  const out=await fetchImpl(ORIGIN+"/actions/workflows/"+CHILD+"/dispatches",{
   method:"POST",headers:{
    Accept:"application/vnd.github+json",
    Authorization:"Bearer "+admission.token,
    "X-GitHub-Api-Version":"2022-11-28",
    "Content-Type":"application/json"
   },
   body:JSON.stringify({
    ref:"main",
    inputs:{
     signed_registry_file:admission.registryFilePath,
     frozen_release_file:intent.frozenPacketPath,
     query_digest:intent.queryDigestSha256,
     run_day_index:String(intent.runDayIndex),
     confirm:CONFIRM
    }
   })
  });
  if(out.status!==204)
   hold("DISPATCH_ACK_NOT_204_AMBIGUOUS_STOP_NO_REPLAY");
  submitted.push(intent.queryDigestSha256);
 }
 return{
  schema:"v39.phase5.github-signed-source-child-dispatch-controller.v1" as const,
  actualDbObservedAtUtc:batch.observedDbClockUtc,
  runDayIndex:admission.day,registrySha256:admission.expectedRegistrySha256,
  eligibleCount:proposal.eligibleCount,
  previouslySubmittedChildCount:proposal.alreadyGitHubDispatched,
  newlyAcknowledgedGithubChildCount:submitted.length,
  deferredDueCount:proposal.deferredDueCount,
  acknowledgedQueryDigests:submitted,
  providerCallsByParent:0 as const,
  sourceDatabaseWritesByParent:0 as const,
  paidFidsGetsCertifiedByParent:0 as const,
  independentSourceUseAndBudgetApprovalStillSeparate:true as const
 };
}
if(process.env.P5_AUTO_SOURCE_DISPATCH_ENTRYPOINT==="1")
 runP5GitHubDueChildDispatcher(process.env).then(result=>{
  console.log(JSON.stringify(result));
 }).catch(e=>{
  const s=e instanceof Error?e.message:"";
  console.error(/^REFUSED_P5_AUTO_SOURCE_DISPATCH_[A-Z0-9_]+$/.test(s)?
   s:"REFUSED_P5_AUTO_SOURCE_DISPATCH_UNVERIFIED_RUNTIME_HOLD");
  process.exitCode=2;
 });
