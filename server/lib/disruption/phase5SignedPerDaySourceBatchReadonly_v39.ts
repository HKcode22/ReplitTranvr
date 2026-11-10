/**
 * Phase5 per-day signed future SOURCE packet registry -> actual due queue.
 *
 * Multi-query, bounded and deliberately NONPAID. Uses PR #540's exact
 * one-packet reviewer for each entry; NEVER dispatches GitHub Actions or
 * reserves REST/API units. A versioned per-day registry supports prospective
 * schedule revisions without redefining prior days or predrawing later days.
 */
import {createHash} from "node:crypto";
import type {P5GitHubOneQueryReleaseEnvelope}
 from "./phase5GitHubOneQueryReleaseAdmission_v39";
import {reviewP5OneSignedPacketAgainstActualDueQueue,
 type P5OneSignedHandoffReview,type P5OneSignedPacketPins}
 from "./phase5SignedDueSourceOnePacketHandoff_v39";
import type {classifyP5SignedUpcomingSourceQueue}
 from "./phase5SourceUpcomingDueQueueReadonly_v39";

type Scan=ReturnType<typeof classifyP5SignedUpcomingSourceQueue>;
const H=/^[a-f0-9]{64}$/;
const REGISTRY_FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const fail=(c:string):never=>{throw Error("REFUSED_P5_SOURCE_BATCH_REGISTRY_"+c);};
const digest=(b:Buffer)=>createHash("sha256").update(b).digest("hex");

export interface P5SignedSourceBatchEntry{
 filePath:string;
 expectedPacketSha256:string;
 expectedQueryDigestSha256:string;
}
export interface P5SignedSourceBatchRegistry{
 schema:"v39.phase5.signed-per-day-source-batch-readonly.v1";
 manifestSha256:string;
 runDayIndex:number;
 entries:P5SignedSourceBatchEntry[];
}
export interface P5SourceBatchVerifiedPins {
 registryFilePath:string;
 expectedRegistrySha256:string;
 expectedManifestSha256:string;
 expectedReleaseSha256:string;
 expectedRightsSha256:string;
 expectedProviderContractSha256:string;
 expectedRunDayIndex:number;
}
export interface P5SourceBatchResult{
 schema:"v39.phase5.signed-per-day-source-batch-actual-db-handoff.v1";
 status:"BOUND_SIGNED_DAY_SOURCE_BATCH_REVIEWED_NO_DISPATCH";
 observedDbClockUtc:string;
 registrySha256:string;
 runDayIndex:number;
 inspectedQueryCount:number;
 dueForIndependentReviewCount:number;
 missedOrLateCount:number;
 alreadyPrearmedReservedCount:number;
 stoppedCount:number;
 dbMissingHoldCount:number;
 handoffs:P5OneSignedHandoffReview[];
 providerCalls:0;
 databaseWrites:0;
 githubChildDispatchCount:0;
 paidPhase6GoGranted:false;
 independentSourceUseReviewStillRequired:true;
 independentSevenRestUtcAndAlertBudgetsStillRequired:true;
}
/**
 * File reader is supplied by the caller and MUST only return local immutable
 * frozen JSON bytes. Tests use an in-memory deterministic map.
 *
 * A defect in any listed packet fails the entire registry closed; ordinary
 * missing slots are instead represented as explicit per-query statuses.
 */
export function reviewP5SignedSourceDayBatchAgainstActualQueue(
 scan:Scan,
 registryRawBytes:Buffer,
 registry:P5SignedSourceBatchRegistry,
 pins:P5SourceBatchVerifiedPins,
 readFrozenBytes:(path:string)=>Buffer
):P5SourceBatchResult{
 if(!scan||scan.schema!=="v39.phase5.source-upcoming-queue-readonly.v1"||
    scan.providerCalls!==0||scan.dbWrites!==0||
    scan.paidGetDispatched!==false||
    !pins||!REGISTRY_FILE.test(pins.registryFilePath??"")||
    ![pins.expectedRegistrySha256,pins.expectedManifestSha256,
      pins.expectedReleaseSha256,pins.expectedRightsSha256,
      pins.expectedProviderContractSha256].every(x=>
       typeof x==="string"&&H.test(x))||
    !Buffer.isBuffer(registryRawBytes)||
    registryRawBytes.length<100||registryRawBytes.length>100000||
    digest(registryRawBytes)!==pins.expectedRegistrySha256)
  fail("UNSIGNED_REGISTRY_BYTES_OR_UNREVIEWED_QUEUE");
 if(!registry||
    registry.schema!=="v39.phase5.signed-per-day-source-batch-readonly.v1"||
    registry.manifestSha256!==pins.expectedManifestSha256||
    registry.manifestSha256!==scan.manifestSha256||
    !Number.isSafeInteger(registry.runDayIndex)||
    registry.runDayIndex<1||registry.runDayIndex>31||
    registry.runDayIndex!==pins.expectedRunDayIndex||
    !Array.isArray(registry.entries)||registry.entries.length<1||
    registry.entries.length>96)
  fail("REGISTRY_DAY_SCOPE_COUNT_OR_MANIFEST_NOT_APPROVED");
 const seenFiles=new Set<string>(),seenDigests=new Set<string>();
 const handoffs:P5OneSignedHandoffReview[]=[];
 // Registry order is immutable and deterministically preserved; not a
 // scientific site ranking and not a permission to dispatch paid children.
 for(const e of registry.entries){
  if(!e||!REGISTRY_FILE.test(e.filePath??"")||
     !H.test(e.expectedPacketSha256??"")||
     !H.test(e.expectedQueryDigestSha256??"")||
     e.filePath===pins.registryFilePath||
     seenFiles.has(e.filePath)||seenDigests.has(e.expectedQueryDigestSha256))
   fail("DUPLICATED_OR_UNBOUNDED_SIGNED_QUERY_FILE");
  seenFiles.add(e.filePath);seenDigests.add(e.expectedQueryDigestSha256);
  const bytes=readFrozenBytes(e.filePath);
  if(!Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>200000)
   fail("INVALID_FROZEN_PACKET_BYTES");
  let packet:P5GitHubOneQueryReleaseEnvelope;
  try{packet=JSON.parse(bytes.toString("utf8")) as P5GitHubOneQueryReleaseEnvelope;}
  catch{fail("NONJSON_SIGNED_SOURCE_PACKET");}
  if(!packet?.plan?.acquisition||
     packet.plan.acquisition.runDayIndex!==registry.runDayIndex||
     packet.queryDigestSha256!==e.expectedQueryDigestSha256)
   fail("CROSS_DAY_OR_CROSS_QUERY_SIGNED_PACKET");
  const one:P5OneSignedPacketPins={
   filePath:e.filePath,
   expectedPacketSha256:e.expectedPacketSha256,
   expectedQueryDigestSha256:e.expectedQueryDigestSha256,
   expectedManifestSha256:pins.expectedManifestSha256,
   expectedReleaseSha256:pins.expectedReleaseSha256,
   expectedRightsSha256:pins.expectedRightsSha256,
   expectedProviderContractSha256:pins.expectedProviderContractSha256
  };
  const review=reviewP5OneSignedPacketAgainstActualDueQueue(
   scan,bytes,packet,one);
  if(review.runDayIndex!==registry.runDayIndex||
     review.queryDigestSha256!==e.expectedQueryDigestSha256)
   fail("CROSS_DAY_OR_CROSS_QUERY_SIGNED_PACKET");
  handoffs.push(review);
 }
 const count=(label:string)=>handoffs.filter(x=>x.status===label).length;
 return{
  schema:"v39.phase5.signed-per-day-source-batch-actual-db-handoff.v1",
  status:"BOUND_SIGNED_DAY_SOURCE_BATCH_REVIEWED_NO_DISPATCH",
  observedDbClockUtc:scan.dbClockUtc,
  registrySha256:pins.expectedRegistrySha256,
  runDayIndex:registry.runDayIndex,
  inspectedQueryCount:handoffs.length,
  dueForIndependentReviewCount:
   count("SIGNED_QUERY_DUE_FOR_INDEPENDENT_RELEASE_NO_DISPATCH"),
  missedOrLateCount:count("SIGNED_QUERY_MISSED_OR_TOO_LATE_CENSOR"),
  alreadyPrearmedReservedCount:
   count("SIGNED_QUERY_ALREADY_PREARMED_OR_RESERVED_NO_REDISPATCH"),
  stoppedCount:count("SIGNED_QUERY_STOPPED_NO_DISPATCH"),
  dbMissingHoldCount:count("SIGNED_QUERY_EXPECTED_DB_ROW_MISSING_HOLD"),
  handoffs,
  providerCalls:0,databaseWrites:0,githubChildDispatchCount:0,
  paidPhase6GoGranted:false,
  independentSourceUseReviewStillRequired:true,
  independentSevenRestUtcAndAlertBudgetsStillRequired:true
 };
}
