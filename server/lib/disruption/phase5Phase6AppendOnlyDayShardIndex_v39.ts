/**
 * Phase5 -> 6: nonpaid, nonwriting, SHA-pinned append-only day/shard registry
 * INDEX. Not a packet signer, rights/GO attestor or child dispatcher.
 *
 * A single global GitHub repo variable pointing at one run day would strand
 * the remaining 30 study days. This layer independently verifies metadata
 * about ALREADY REVIEWED source/later-PRE/POST frozen files, preserves history
 * across revisions, and selects the bounded due shards by actual PG clock.
 *
 * Endpoints/Stage14/SQL/billing/roles are intentionally untouched. Existing
 * SOURCE, Stage14/V0081, T6/T90 and V0083 child guards are authoritative.
 */
import {createHash} from "node:crypto";

const H=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const MAX_INDEX=1024;
const MAX_BYTES=1024*1024;
const SOURCE_SCHEMA="v39.phase5.signed-per-day-source-batch-readonly.v1";
const LATER_SCHEMA="v39.phase5.signed-later-pre-day-registry.v1";
const POST_SCHEMA="v39.phase5.github-future-post-reviewed-release.v1";
export const P5_SHARD_LANES=["SOURCE","LATER_PRE","POST"] as const;
export type P5ShardLane=typeof P5_SHARD_LANES[number];
const hold=(why:string):never=>{
 throw Error("REFUSED_P5_PHASE6_APPEND_ONLY_SHARD_INDEX_"+why);
};
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const validTime=(v:unknown):v is string=>
 typeof v==="string"&&ISO.test(v)&&
 Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const exactKeys=(v:object,expected:string[])=>
 Object.keys(v).sort().join("|")===expected.slice().sort().join("|");
export interface P5Phase6DayShardEntry{
 lane:P5ShardLane;
 runDayIndex:number;
 shardIndex:number;
 filePath:string;
 fileSha256:string;
 publishedAtUtc:string;
 notBeforeUtc:string;
 hardLatestUtc:string;
 reviewEvidenceSha256:string;
 /** Mandatory for LATER_PRE and POST; never inferred from missing data. */
 sourceRegistryFilePath:string|null;
 sourceRegistrySha256:string|null;
}
export interface P5Phase6DayShardIndex{
 schema:"v39.phase5.phase6-append-only-day-shard-index.v1";
 manifestSha256:string;
 calendarSha256:string;
 reviewedCodeSha:string;
 reviewedReleaseSha256:string;
 reviewedRightsSha256:string;
 revision:number;
 previousIndexSha256:string|null;
 entries:P5Phase6DayShardEntry[];
}
export interface P5Phase6DayShardPins{
 expectedIndexSha256:string;
 expectedManifestSha256:string;
 expectedCalendarSha256:string;
 expectedCodeSha:string;
 expectedReleaseSha256:string;
 expectedRightsSha256:string;
 observedDbClockUtc:string;
 /** Independent publisher's acknowledged digest, not generated here. */
 exactExternallyReviewedIndexSha256:string;
}
export interface P5Phase6DueShard{
 lane:P5ShardLane;
 runDayIndex:number;
 shardIndex:number;
 filePath:string;
 fileSha256:string;
 sourceRegistryFilePath:string|null;
 sourceRegistrySha256:string|null;
 notBeforeUtc:string;
 hardLatestUtc:string;
}
export function auditP5Phase6AppendOnlyDayShardIndex(
 raw:Buffer,
 index:P5Phase6DayShardIndex,
 pins:P5Phase6DayShardPins,
 getFrozen:(path:string)=>Buffer,
 priorRaw:Buffer|null=null,
 prior:P5Phase6DayShardIndex|null=null
){
 if(!pins||!Buffer.isBuffer(raw)||raw.length<100||
    raw.length>MAX_BYTES||!H.test(pins.expectedIndexSha256??"")||
    pins.expectedIndexSha256!==pins.exactExternallyReviewedIndexSha256||
    sha(raw)!==pins.expectedIndexSha256||
    ![pins.expectedManifestSha256,pins.expectedCalendarSha256,
      pins.expectedReleaseSha256,pins.expectedRightsSha256].every(x=>
       H.test(x??""))||
    !CODE.test(pins.expectedCodeSha??"")||
    !validTime(pins.observedDbClockUtc)||
    typeof getFrozen!=="function")
  hold("UNPINNED_OR_UNREVIEWED_INDEX_AND_DB_CLOCK");
 if(!index||!exactKeys(index,[
    "schema","manifestSha256","calendarSha256","reviewedCodeSha",
    "reviewedReleaseSha256","reviewedRightsSha256","revision",
    "previousIndexSha256","entries"
   ])||
    index.schema!=="v39.phase5.phase6-append-only-day-shard-index.v1"||
    index.manifestSha256!==pins.expectedManifestSha256||
    index.calendarSha256!==pins.expectedCalendarSha256||
    index.reviewedCodeSha!==pins.expectedCodeSha||
    index.reviewedReleaseSha256!==pins.expectedReleaseSha256||
    index.reviewedRightsSha256!==pins.expectedRightsSha256||
    !Number.isSafeInteger(index.revision)||index.revision<1||
    index.revision>MAX_INDEX||
    !Array.isArray(index.entries)||index.entries.length<1||
    index.entries.length>MAX_INDEX)
  hold("MALFORMED_INDEX_OR_UNREVIEWED_RELEASE_IDENTITY");
 if(index.revision===1){
  if(index.previousIndexSha256!==null||priorRaw!==null||prior!==null)
   hold("GENESIS_NOT_INDEPENDENTLY_PINNED");
 }else{
  if(!H.test(index.previousIndexSha256??"")||
     !Buffer.isBuffer(priorRaw)||!prior||
     sha(priorRaw)!==index.previousIndexSha256||
     prior.schema!==index.schema||
     prior.revision!==index.revision-1||
     prior.manifestSha256!==index.manifestSha256||
     prior.calendarSha256!==index.calendarSha256||
     prior.reviewedCodeSha!==index.reviewedCodeSha||
     prior.reviewedReleaseSha256!==index.reviewedReleaseSha256||
     prior.reviewedRightsSha256!==index.reviewedRightsSha256||
     !Array.isArray(prior.entries)||
     prior.entries.length>=index.entries.length||
     prior.entries.some((row,i)=>JSON.stringify(row)!==
       JSON.stringify(index.entries[i])))
   hold("NON_MONOTONIC_OR_REWRITTEN_PREVIOUS_SHARDS");
 }
 const now=Date.parse(pins.observedDbClockUtc);
 const seenKey=new Set<string>(),seenFile=new Set<string>();
 const sources=new Map<string,P5Phase6DayShardEntry>();
 let prevPublished=-Infinity;
 const seenSourceQueries=new Set<string>();
 const seenLaterFlightHorizons=new Set<string>();
 const seenPostRequests=new Set<string>();
 // First pass: immutable index shape and monotonic review chronology.
 for(const e of index.entries){
  if(!e||!exactKeys(e,[
      "lane","runDayIndex","shardIndex","filePath","fileSha256",
      "publishedAtUtc","notBeforeUtc","hardLatestUtc",
      "reviewEvidenceSha256","sourceRegistryFilePath",
      "sourceRegistrySha256"
     ])||
     !P5_SHARD_LANES.includes(e.lane)||
     !Number.isSafeInteger(e.runDayIndex)||e.runDayIndex<1||
     e.runDayIndex>31||
     !Number.isSafeInteger(e.shardIndex)||e.shardIndex<1||
     e.shardIndex>100000||
     !FILE.test(e.filePath??"")||
     !H.test(e.fileSha256??"")||
     !H.test(e.reviewEvidenceSha256??"")||
     !validTime(e.publishedAtUtc)||
     !validTime(e.notBeforeUtc)||
     !validTime(e.hardLatestUtc))
   hold("UNREVIEWED_DAY_SHARD_IDENTITY_OR_CLOCK");
  const published=Date.parse(e.publishedAtUtc);
  const earliest=Date.parse(e.notBeforeUtc);
  const last=Date.parse(e.hardLatestUtc);
  const maxWindow=e.lane==="POST"?60:180;
  if(published>now||published>earliest||
     last<=earliest||last-earliest>maxWindow*60_000||
     prevPublished>published)
   hold("RETROSPECTIVE_OR_OVERLONG_SHARD_RELEASE");
  prevPublished=published;
  const key=[e.lane,e.runDayIndex,e.shardIndex].join("|");
  if(seenKey.has(key)||seenFile.has(e.filePath))
   hold("DUPLICATE_DAY_SHARD_OR_FROZEN_PATH");
  seenKey.add(key);seenFile.add(e.filePath);
  if(e.lane==="SOURCE"){
   if(e.sourceRegistryFilePath!==null||
      e.sourceRegistrySha256!==null)
    hold("SOURCE_CANNOT_LINK_TO_ANOTHER_SOURCE_REGISTRY");
   sources.set(e.filePath,e);
  }else if(!FILE.test(e.sourceRegistryFilePath??"")||
            !H.test(e.sourceRegistrySha256??""))
   hold("LATER_OR_POST_NEEDS_GENUINE_BOUND_SOURCE_DAY");
 }
 // Second pass: validate immutable raw file digest and semantic day scope.
 for(const e of index.entries){
  const source=e.lane==="SOURCE"?null:
    sources.get(e.sourceRegistryFilePath!);
  if(e.lane!=="SOURCE"&&
    (!source||source.runDayIndex!==e.runDayIndex||
     source.fileSha256!==e.sourceRegistrySha256||
     Date.parse(source.publishedAtUtc)>Date.parse(e.publishedAtUtc)))
   hold("NONEXISTENT_OR_LATER_SOURCE_PROVENANCE");
  const data=getFrozen(e.filePath);
  if(!Buffer.isBuffer(data)||data.length<80||
     data.length>250000||sha(data)!==e.fileSha256)
   hold("UNVERIFIED_FROZEN_REGISTRY_BYTES");
  let p:any;
  try{p=JSON.parse(data.toString("utf8"));}
  catch{return hold("NON_JSON_FROZEN_REGISTRY");}
  if(!p||typeof p!=="object"||Array.isArray(p))
   hold("NOT_A_PROSPECTIVE_REGISTRY");
  if(e.lane==="SOURCE"){
   if(p.schema!==SOURCE_SCHEMA||
      p.manifestSha256!==pins.expectedManifestSha256||
      p.runDayIndex!==e.runDayIndex||
      !Array.isArray(p.entries)||p.entries.length<1||
      p.entries.length>96||
      p.entries.some((x:any)=>
       !FILE.test(x?.filePath??"")||
       !H.test(x?.expectedPacketSha256??"")||
       !H.test(x?.expectedQueryDigestSha256??"")))
    hold("SOURCE_NOT_AN_EXACT_EXISTING_SIGNED_DAY_REGISTRY");
   for(const item of p.entries){
    if(seenSourceQueries.has(item.expectedQueryDigestSha256))
     hold("SOURCE_QUERY_REPEATED_ACROSS_DAY_SHARDS");
    seenSourceQueries.add(item.expectedQueryDigestSha256);
   }
  }else if(e.lane==="LATER_PRE"){
   if(p.schema!==LATER_SCHEMA||
      p.manifestSha256!==pins.expectedManifestSha256||
      p.reviewedCodeSha!==pins.expectedCodeSha||
      p.runDayIndex!==e.runDayIndex||
      p.shardIndex!==e.shardIndex||
      p.sourceDayRegistryFilePath!==e.sourceRegistryFilePath||
      p.sourceDayRegistrySha256!==e.sourceRegistrySha256||
      !Array.isArray(p.entries)||p.entries.length<1||
      p.entries.length>96||
      p.entries.some((x:any)=>
       !FILE.test(x?.filePath??"")||
       !H.test(x?.expectedPacketSha256??"")||
       !H.test(x?.expectedQueryDigestSha256??"")||
       typeof x?.expectedFlightInstanceId!=="string"||
       x.expectedFlightInstanceId.length<5||
       x.expectedFlightInstanceId.length>200||
       !["T-6h","T-90m"].includes(x?.expectedHorizon)))
    hold("LATER_NOT_AN_EXACT_EXISTING_SIGNED_REGISTRY");
   for(const item of p.entries){
    const key=item.expectedFlightInstanceId+"|"+item.expectedHorizon;
    if(seenLaterFlightHorizons.has(key))
     hold("DUPLICATE_FLIGHT_HORIZON_ACROSS_LATER_SHARDS");
    seenLaterFlightHorizons.add(key);
   }
  }else{
   if(p.schema!==POST_SCHEMA||
      p.approvedCodeSha!==pins.expectedCodeSha||
      p.reviewed?.manifestSha256!==pins.expectedManifestSha256||
      p.reviewed?.runDayIndex!==e.runDayIndex||
      !H.test(p.reviewed?.requestSha256??"")||
      p.reviewed?.independentFuturePostRequestAndRightsReview!==true||
      p.independentSourceContentsUseAndRESTReleaseAttested!==true)
    hold("POST_NOT_AN_EXACT_REVIEWED_ORIGINAL_PACKET");
   if(seenPostRequests.has(p.reviewed.requestSha256))
    hold("DUPLICATE_PAID_POST_REQUEST_ACROSS_SHARDS");
   seenPostRequests.add(p.reviewed.requestSha256);
  }
 }
 const due:{SOURCE:P5Phase6DueShard[];LATER_PRE:P5Phase6DueShard[];POST:P5Phase6DueShard[]}={
  SOURCE:[],LATER_PRE:[],POST:[]
 };
 const expired={SOURCE:0,LATER_PRE:0,POST:0};
 const future={SOURCE:0,LATER_PRE:0,POST:0};
 for(const e of index.entries){
  if(now>=Date.parse(e.hardLatestUtc)){
   expired[e.lane]++;continue;
  }
  if(now<Date.parse(e.notBeforeUtc)){
   future[e.lane]++;continue;
  }
  due[e.lane].push({
   lane:e.lane,runDayIndex:e.runDayIndex,
   shardIndex:e.shardIndex,filePath:e.filePath,
   fileSha256:e.fileSha256,
   sourceRegistryFilePath:e.sourceRegistryFilePath,
   sourceRegistrySha256:e.sourceRegistrySha256,
   notBeforeUtc:e.notBeforeUtc,hardLatestUtc:e.hardLatestUtc
  });
 }
 for(const lane of P5_SHARD_LANES)
  due[lane].sort((a,b)=>
   a.hardLatestUtc.localeCompare(b.hardLatestUtc)||
   a.runDayIndex-b.runDayIndex||
   a.shardIndex-b.shardIndex);
 return{
  schema:"v39.phase5.phase6-readonly-due-day-shard-selection.v1" as const,
  indexSha256:pins.expectedIndexSha256,
  manifestSha256:pins.expectedManifestSha256,
  revision:index.revision,
  publishedShardCount:index.entries.length,
  observedDbClockUtc:pins.observedDbClockUtc,
  dueShardCounts:{
   SOURCE:due.SOURCE.length,LATER_PRE:due.LATER_PRE.length,
   POST:due.POST.length
  },
  selectedForIndependentChildReview:{
   SOURCE:due.SOURCE.slice(0,4),
   LATER_PRE:due.LATER_PRE.slice(0,4),
   POST:due.POST.slice(0,4)
  },
  deferredDueShardCounts:{
   SOURCE:Math.max(0,due.SOURCE.length-4),
   LATER_PRE:Math.max(0,due.LATER_PRE.length-4),
   POST:Math.max(0,due.POST.length-4)
  },
  missedCensoredShardCounts:expired,
  notYetDueShardCounts:future,
  ownerReviewedIndexClaimIsNotCryptographicAuthorization:true as const,
  doesNotVerifyEveryUnderlyingFlightPacket:true as const,
  doesNotAuthorizeSourceRightsBudgetOrGO:true as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  githubChildDispatches:0 as const,
  phase5ScientificFreeze:false as const,phase6PaidGo:false as const
 };
}
