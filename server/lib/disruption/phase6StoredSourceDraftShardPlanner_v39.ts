/**
 * Partition the entire independently reviewed Stage8 proposal into bounded
 * unsigned SOURCE registry drafts. No signatures, publication, or dispatch.
 * The actual publisher must separately prove commit time and signed bytes.
 */
import {createHash} from "node:crypto";
import type {P5CommittedDayReadonlyResult} from "./phase5CommittedDayGridReadonly_v39";
import type {Stage8DayProposalResult} from "./phase5V0079DailyPreparedQueryProposals_v39";
import {draftP5OneGetFromActualPreparedSource,
 type P5PreparedToGetDraftReview,type P5UnapprovedOneGetCandidate}
 from "./phase5PreparedQueryToOneGetDraft_v39";
const minute=60_000;
const sha=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const hold=(why:string):never=>{throw Error("HOLD_P6_SOURCE_DRAFT_SHARDS_"+why);};
const utc=(s:string)=>{
 const n=Date.parse(s);
 if(!Number.isFinite(n)||new Date(n).toISOString()!==s)hold("BAD_UTC");
 return n;
};
const iso=(n:number)=>new Date(n).toISOString();
type Entry={queryDigestSha256:string;plannedDispatchUtc:string;
 hardLatestUtc:string;earliestParentReviewUtc:string;latestParentReviewUtc:string;
 unsignedDraft:P5UnapprovedOneGetCandidate};
type Shard={shardIndex:number;earliestProposedNotBeforeUtc:string;
 hardLatestUtc:string;latestFirstQueryParentReviewUtc:string;
 entries:Entry[];alreadyTooCloseAtReadCount:number};
export function planP6StoredSourceDraftShards(
 stage7:P5CommittedDayReadonlyResult,stage8:Stage8DayProposalResult,
 review:Omit<P5PreparedToGetDraftReview,"queryDigestSha256">
){
 if(!stage7||!stage8||!review||!Array.isArray(stage8.queries)||
    !Array.isArray(stage8.sourcePartitionPins)||!stage8.reviewedSegmentedSource||
    stage8.queries.length<12||stage8.queries.length>384||
    stage8.sourceQueryCount!==stage8.queries.length||
    stage8.dayProposalSha256!==review.expectedDayProposalSha256||
    sha({manifest:review.expectedManifestSha256,
      source:review.expectedCandidateGridSha256,proposals:stage8.queries,
      checked:stage8.actualUtcChargeBudgets,reviewedSegmentedSource:stage8.reviewedSegmentedSource,
      sourcePartitionPins:stage8.sourcePartitionPins})!==review.expectedDayProposalSha256)
  hold("ALTERED_OR_INCOMPLETE_REVIEWED_PROPOSAL");
 const observed=utc(stage7.dbClockAtReadUtc),seen=new Set<string>();
 const entries=stage8.queries.map(q=>{
  if(seen.has(q.query_digest))hold("DUPLICATE_QUERY");
  seen.add(q.query_digest);
  const planned=utc(q.planned_dispatch_utc),latest=utc(q.hard_latest_dispatch_utc);
  if(latest<planned||latest>planned+minute)hold("UNEXPECTED_DISPATCH_WINDOW");
  return {queryDigestSha256:q.query_digest,plannedDispatchUtc:q.planned_dispatch_utc,
    hardLatestUtc:q.hard_latest_dispatch_utc,
    earliestParentReviewUtc:iso(planned-105*minute),
    latestParentReviewUtc:iso(planned-15*minute),
    unsignedDraft:draftP5OneGetFromActualPreparedSource(stage7,stage8,
      {...review,queryDigestSha256:q.query_digest})};
 }).sort((a,b)=>a.plannedDispatchUtc.localeCompare(b.plannedDispatchUtc)||
   a.queryDigestSha256.localeCompare(b.queryDigestSha256));
 const shards:Shard[]=[];
 for(const entry of entries){
  let s=shards[shards.length-1];
  const open=Math.max(observed,utc(entry.earliestParentReviewUtc));
  const close=utc(entry.hardLatestUtc);
  if(close<=open)hold("QUERY_WINDOW_ALREADY_EXPIRED");
  const tooClose=observed>utc(entry.latestParentReviewUtc)?1:0;
  if(!s||s.entries.length===96||
     // Membership must stay stable across runner restart even if the
     // independent readback occurs later than the original review lead.
     Math.max(utc(s.hardLatestUtc),close)-utc(s.entries[0].earliestParentReviewUtc)>180*minute){
   s={shardIndex:shards.length+1,earliestProposedNotBeforeUtc:iso(open),
      hardLatestUtc:entry.hardLatestUtc,
      latestFirstQueryParentReviewUtc:entry.latestParentReviewUtc,
      entries:[],alreadyTooCloseAtReadCount:0};
   shards.push(s);
  }
  s.entries.push(entry);
  s.hardLatestUtc=iso(Math.max(utc(s.hardLatestUtc),close));
  s.alreadyTooCloseAtReadCount+=tooClose;
 }
 // The actual index contract allows at most four concurrently due shards.
 // This is a diagnostic, not a claim that those queries will fit worker capacity.
 const peak=Math.max(...shards.map(s=>shards.filter(t=>
   utc(t.earliestProposedNotBeforeUtc)<=utc(s.earliestProposedNotBeforeUtc)&&
   utc(t.hardLatestUtc)>utc(s.earliestProposedNotBeforeUtc)).length));
 const result={
  schema:"v39.phase6.unsigned-stored-source-draft-shards.v1" as const,
  runDayIndex:stage8.runDayIndex,
  queryCount:entries.length,shardCount:shards.length,
  alreadyTooCloseAtReadCount:shards.reduce((n,s)=>n+s.alreadyTooCloseAtReadCount,0),
  peakConcurrentDraftShards:peak,
  exceedsExistingFourDueShardLimit:peak>4,
  observedDatabaseClockUtc:stage7.dbClockAtReadUtc,
  sourceProposalSha256:review.expectedDayProposalSha256,
  independentlySigned:false as const,publicationProven:false as const,
  phase6PaidGo:false as const,providerCalls:0 as const,databaseWrites:0 as const,
 } as const;
 return Object.defineProperty(result,"privateDraftShards",{
  value:shards,enumerable:false,writable:false,configurable:false
 }) as typeof result & {readonly privateDraftShards:readonly Shard[]};
}
