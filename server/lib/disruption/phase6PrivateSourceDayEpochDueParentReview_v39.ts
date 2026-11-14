/**
 * Phase5 -> Phase6: original scheduled SOURCE parent's missing PRIVATE day
 * registry / live due-queue bridge. This emits a review-only proposal.
 *
 * Authenticated day-epoch Ed25519 full private registry reader is upstream.
 * Existing original Stage28 SOURCE PostgreSQL READ ONLY queue observer is
 * upstream. Existing COMPLETE paginated GH child-history reader is upstream.
 * Do not use this pure metadata review as a paid or GH dispatch authority.
 *
 * No public checkout frozen/*.json, no third-party GET, no DB mutation,
 * no new collector, and no automatic paid GO. Real original one-GET child
 * still double-admits the exact per-query packet and pays through old
 * V0079/V0080/V0082 atomic limits, only after separate Phase5 freeze.
 */
import {createHash} from "node:crypto";
import type {P5CompleteGithubWorkflowHistory}
 from "./phase5GithubCompleteWorkflowHistory_v39";
import {P5_COMPLETE_HISTORY_MAX}
 from "./phase5GithubCompleteWorkflowHistory_v39";
import type {P5SourceUpcomingCandidate}
 from "./phase5SourceUpcomingDueQueueReadonly_v39";

export const P6_PRIVATE_SOURCE_PARENT_REVIEW_SCHEMA=
 "v39.phase6.private-day-source-parent-due-queue-review-no-dispatch.v1";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const REG=/^data-collection\/phase5\/frozen\/source_[A-Za-z0-9_.-]{8,125}\.json$/;
const PACK=/^data-collection\/phase5\/frozen\/sourceq_[A-Za-z0-9_.-]{8,110}\.json$/;
const CONFIRM="ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET";
const PRIVATE_CONFIRM="ONE_PRIVATE_SOURCE_ORIGINAL_P5_CHILD_SAME_JOB_ONE_GET";
const LIMIT=4;
const hold=(x:string):never=>{
 throw Error("HOLD_P6_PRIVATE_SOURCE_PARENT_"+x);
};
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
function time(x:unknown){
 // Explicit concrete string avoids TS strict-control-flow assumptions about
 // a never-returning failure helper in this dual JS/TS repository build.
 const value=typeof x==="string"?x:"";
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)||
    !Number.isFinite(Date.parse(value))||
    new Date(value).toISOString()!==value)
  hold("INVALID_ACTUAL_DB_CLOCK_OR_SOURCE_WINDOW");
 return Date.parse(value);
}
const sealed=(o:unknown,k:string)=>{
 const d=Object.getOwnPropertyDescriptor(o??{},k);
 return Boolean(d&&d.enumerable===false&&d.writable===false);
};
export interface PrivateReviewedDay{
 redactedSummary:{
  schema:string;status:string;runDayIndex:number;
  externallySignedDayEpochIndexSha256:string;
  observedRealPgClockUtc:string;
  reviewedEd25519SourceWasOriginalDayBytes:boolean;
  originalV0096GlobalChainNotUsed:boolean;
  derivedProjectionIsNotAnAdditionalReviewerSignature:boolean;
  phase6PaidGo:boolean;providerCalls:number;
  databaseWrites:number;githubChildDispatches:number;
 };
 privateRoutingCandidates:readonly {
  lane:string;runDayIndex:number;shardIndex:number;
  signedFrozenPath:string;signedFrozenSha256:string;
  routingIntentSha256:string;notBeforeUtc:string;hardLatestUtc:string;
  boundSourceRegistryPath:string|null;boundSourceRegistrySha256:string|null;
  privateBytesOnlyFromRestrictedReader:boolean;
  independentlyAuthenticatedGHHistoryRequired:boolean;
  newPaidDispatchAuthorizedHere:boolean;
 }[];
 getFrozen:(path:string)=>Buffer;
}
export interface ExistingSourceObserver{
 schema:string;checkedAtDatabaseUtc:string;
 manifestSha256:string;observedQueries:number;
 providerCalls:number;databaseWrites:number;externalGithubDispatches:number;
 signedDaySourceBatch:unknown;signedPacketHandoff:unknown;
 candidates:readonly P5SourceUpcomingCandidate[];
}
export interface ReviewedPrivateSourceIntent{
 runDayIndex:number;shardIndex:number;queryDigestSha256:string;
 registryFilePath:string;packetFilePath:string;
 routingIntentSha256:string;signedRegistrySha256:string;
 plannedDispatchUtc:string;
 existingChildWorkflow:"phase5-one-signed-day-source-child-dispatch.yml";
 childInputShape:{
  signed_registry_file:string;frozen_release_file:string;
  query_digest:string;run_day_index:string;
  confirm:string;private_transport:"true";private_confirm:string;
  routing_intent_sha256:string;
 };
}

export function reviewP6PrivateDaySourceDueParentNoDispatch({
 days,sourceObserver,history,expectedManifestSha256,
 expectedMainSha
}:{
 days:readonly PrivateReviewedDay[];
 sourceObserver:ExistingSourceObserver;
 history:P5CompleteGithubWorkflowHistory;
 expectedManifestSha256:string;
 expectedMainSha:string;
}){
 if(!Array.isArray(days)||days.length<1||days.length>2||
    !SHA.test(expectedManifestSha256??"")||
    !CODE.test(expectedMainSha??"")||
    sourceObserver?.schema!=="v39.phase5.github-upcoming-source-queue-observer.v1"||
    sourceObserver.manifestSha256!==expectedManifestSha256||
    sourceObserver.providerCalls!==0||
    sourceObserver.databaseWrites!==0||
    sourceObserver.externalGithubDispatches!==0||
    sourceObserver.signedDaySourceBatch!==null||
    sourceObserver.signedPacketHandoff!==null||
    !Array.isArray(sourceObserver.candidates)||
    sourceObserver.candidates.length!==sourceObserver.observedQueries||
    sourceObserver.candidates.length>700)
  hold("NOT_ORIGINAL_LIVE_SOURCE_METADATA_OR_UNBOUNDED_DAY_SET");
 const now=time(sourceObserver.checkedAtDatabaseUtc);
 if(!history||!Number.isSafeInteger(history.total_count)||
    history.total_count<0||history.total_count>P5_COMPLETE_HISTORY_MAX||
    !Array.isArray(history.workflow_runs)||
    history.workflow_runs.length!==history.total_count)
  hold("INCOMPLETE_OR_UNREVIEWED_GH_CHILD_HISTORY");
 const seenGithubIds=new Set<number>(),alreadySubmitted=new Set<string>();
 for(const run of history.workflow_runs){
  if(!run||!Number.isSafeInteger(run.id)||run.id<1||
     seenGithubIds.has(run.id)||
     !["queued","in_progress","completed","pending","waiting","requested"].includes(run.status)||
     typeof run.display_title!=="string"||run.display_title.length>240||
     typeof run.created_at!=="string"||!Number.isFinite(Date.parse(run.created_at))||
     run.conclusion!==null&&typeof run.conclusion!=="string")
   hold("UNTRUSTED_OR_DUPLICATE_GH_CHILD_HISTORY");
  seenGithubIds.add(run.id);
  if(run.display_title.startsWith("P5 SOURCE ")){
   const digest=run.display_title.slice("P5 SOURCE ".length);
   if(!SHA.test(digest))hold("INVALID_PREVIOUS_SOURCE_CHILD_ID");
   alreadySubmitted.add(digest);
  }
 }
 const queue=new Map<string,P5SourceUpcomingCandidate>();
 for(const row of sourceObserver.candidates){
  if(!row||!SHA.test(row.queryDigestSha256??"")||
     queue.has(row.queryDigestSha256)||
     !Number.isSafeInteger(row.runDayIndex)||row.runDayIndex<1||
     row.runDayIndex>31||
     typeof row.status!=="string")
   hold("DUPLICATE_OR_UNAUTHENTICATED_SOURCE_QUEUE");
  queue.set(row.queryDigestSha256,row);
 }
 const usedDays=new Set<number>(),usedRegistries=new Set<string>();
 const seenSourceQueries=new Set<string>();
 const candidates:ReviewedPrivateSourceIntent[]=[];
 let sourceRegistryCount=0,notInQueueWindow=0,alreadyDispatched=0,
     deferredDue=0,missedOrStopped=0,notYetDue=0,activeDue=0;
 for(const day of days){
  const s=day?.redactedSummary;
  if(!s||s.schema!==
     "v39.phase6.day-epoch-exact-source-pre-post-original-semantics-no-go.v1"||
     s.status!=="ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO"||
     !s.reviewedEd25519SourceWasOriginalDayBytes||
     !s.originalV0096GlobalChainNotUsed||
     !s.derivedProjectionIsNotAnAdditionalReviewerSignature||
     s.phase6PaidGo!==false||s.providerCalls!==0||
     s.databaseWrites!==0||s.githubChildDispatches!==0||
     !Number.isSafeInteger(s.runDayIndex)||s.runDayIndex<1||
     s.runDayIndex>31||usedDays.has(s.runDayIndex)||
     !SHA.test(s.externallySignedDayEpochIndexSha256??"")||
     !sealed(day,"getFrozen")||
     !sealed(day,"privateRoutingCandidates")||
     typeof day.getFrozen!=="function"||
     !Array.isArray(day.privateRoutingCandidates)||
     day.privateRoutingCandidates.length>12||
     Math.abs(time(s.observedRealPgClockUtc)-now)>120000)
   hold("NOT_ONE_VERIFIED_SIGNED_DAY_OR_FRESH_DB_CLOCK");
  usedDays.add(s.runDayIndex);
  const sources=day.privateRoutingCandidates.filter(x=>x.lane==="SOURCE");
  if(sources.length>4)hold("UNBOUNDED_SIGNED_SOURCE_SHARDS");
  for(const route of sources){
   if(!route||route.runDayIndex!==s.runDayIndex||
      !Number.isSafeInteger(route.shardIndex)||
      route.shardIndex<1||route.shardIndex>100000||
      !REG.test(route.signedFrozenPath??"")||
      !SHA.test(route.signedFrozenSha256??"")||
      !SHA.test(route.routingIntentSha256??"")||
      usedRegistries.has(route.signedFrozenPath)||
      route.boundSourceRegistryPath!==null||
      route.boundSourceRegistrySha256!==null||
      route.newPaidDispatchAuthorizedHere!==false||
      route.privateBytesOnlyFromRestrictedReader!==true||
      route.independentlyAuthenticatedGHHistoryRequired!==true||
      now<time(route.notBeforeUtc)||
      now>=time(route.hardLatestUtc))
    hold("NOT_UNIQUE_GENUINELY_DUE_SIGNED_SOURCE_ROUTE");
   usedRegistries.add(route.signedFrozenPath);
   let raw:Buffer=Buffer.alloc(0);
   try{raw=day.getFrozen(route.signedFrozenPath);}
   catch{hold("EXACT_SIGNED_PRIVATE_SOURCE_REGISTRY_NOT_AVAILABLE");}
   if(!Buffer.isBuffer(raw)||raw.length<100||raw.length>100000||
      sha(raw)!==route.signedFrozenSha256)
    hold("UNSIGNED_OR_CHANGED_PRIVATE_SOURCE_REGISTRY_BYTES");
   let registry:any;
   try{registry=JSON.parse(raw.toString("utf8"));}
   catch{hold("INVALID_SIGNED_SOURCE_REGISTRY_JSON");}
   if(registry?.schema!=="v39.phase5.signed-per-day-source-batch-readonly.v1"||
      registry.runDayIndex!==s.runDayIndex||
      registry.manifestSha256!==expectedManifestSha256||
      !Array.isArray(registry.entries)||
      registry.entries.length<1||registry.entries.length>96)
    hold("CROSS_DAY_OR_UNREVIEWED_SOURCE_REGISTRY");
   sourceRegistryCount++;
   const seenFiles=new Set<string>();
   for(const entry of registry.entries){
    if(!entry||!PACK.test(entry.filePath??"")||
       !SHA.test(entry.expectedPacketSha256??"")||
       !SHA.test(entry.expectedQueryDigestSha256??"")||
       seenFiles.has(entry.filePath)||
       seenSourceQueries.has(entry.expectedQueryDigestSha256))
     hold("DUPLICATE_SIGNED_SOURCE_QUERY_OR_PACKET_PATH");
    seenFiles.add(entry.filePath);
    seenSourceQueries.add(entry.expectedQueryDigestSha256);
    const row=queue.get(entry.expectedQueryDigestSha256);
    if(!row){notInQueueWindow++;continue;}
    if(row.runDayIndex!==s.runDayIndex)
     hold("SIGNED_DAY_VERSUS_REAL_SOURCE_QUEUE_DRIFT");
    if(row.status==="MISSED_DISPATCH_CUTOFF_NO_BACKFILL"||
       row.status==="TOO_LATE_FOR_SAFE_SCHEDULED_DISPATCH"||
       row.status==="ALREADY_STOPPED_NO_DISPATCH"){
     missedOrStopped++;continue;
    }
    if(row.status!=="DUE_SOON_REVIEW_REQUIRED_NO_PAID_DISPATCH"){
     notYetDue++;continue;
    }
    if(alreadySubmitted.has(entry.expectedQueryDigestSha256)){
     alreadyDispatched++;continue;
    }
    const planned=time(row.plannedDispatchUtc),latest=time(row.latestDispatchUtc);
    if(planned-now<15*60000||planned-now>105*60000||
       latest<=now||planned>=latest)
     hold("REAL_DB_LEAD_OR_CUTOFF_CHANGED");
    activeDue++;
    if(candidates.length>=LIMIT){deferredDue++;continue;}
    candidates.push({
     runDayIndex:s.runDayIndex,shardIndex:route.shardIndex,
     queryDigestSha256:entry.expectedQueryDigestSha256,
     registryFilePath:route.signedFrozenPath,
     packetFilePath:entry.filePath,
     routingIntentSha256:route.routingIntentSha256,
     signedRegistrySha256:route.signedFrozenSha256,
     plannedDispatchUtc:row.plannedDispatchUtc,
     existingChildWorkflow:"phase5-one-signed-day-source-child-dispatch.yml",
     childInputShape:{
      signed_registry_file:route.signedFrozenPath,
      frozen_release_file:entry.filePath,
      query_digest:entry.expectedQueryDigestSha256,
      run_day_index:String(s.runDayIndex),
      confirm:CONFIRM,
      private_transport:"true",
      private_confirm:PRIVATE_CONFIRM,
      routing_intent_sha256:route.routingIntentSha256
     }
    });
   }
  }
 }
 const result={redactedSummary:Object.freeze({
  schema:P6_PRIVATE_SOURCE_PARENT_REVIEW_SCHEMA,
  status:"SIGNED_PRIVATE_DAY_SOURCE_AND_ACTUAL_DB_DUE_REVIEW_ONLY_NO_DISPATCH",
  reviewedMainSha:expectedMainSha,
  studyDayCount:usedDays.size,
  sourceRegistryCount,
  observedActualSourceQueueQueries:queue.size,
  signedQueriesNotVisibleInBoundedQueueWindow:notInQueueWindow,
  alreadySubmittedGitHubChildren:alreadyDispatched,
  missedOrStoppedCensored:missedOrStopped,
  notYetDueOrPrearmed:notYetDue,
  eligibleDueUnsubmitted:activeDue,
  candidateCount:candidates.length,
  deferredDueCount:deferredDue,
  originalChildStillMustVerifyIndividualSignedPacket:true,
  parentDoesNotApproveSourceContentsBudgetOrPaidGo:true,
  noPublicFrozenCheckoutBytes:true,
  realOperatingFlightOutcomeVerifiedHere:false,
  providerCalls:0,databaseWrites:0,githubDispatches:0,
  phase5ScientificFreezeCertified:false,phase6PaidGo:false
 })};
 Object.defineProperty(result,"privateChildProposals",{
  enumerable:false,writable:false,value:Object.freeze(candidates)
 });
 return Object.freeze(result);
}
