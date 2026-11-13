/**
 * Phase5/6 offline-only missing link:
 * existing independently REVIEW-READY later-PRE bytes -> bounded prospective
 * UNSIGNED day-registry proposal compatible with the existing verifier.
 *
 * The proposed on-disk schema has "signed" in its historical name. That name
 * does NOT make its SHA an external signature, authorize publication, grant
 * rights, populate V0091, or permit a Stage14 PRE. A separate reviewer must
 * independently approve/pin and publish exact packet+registry bytes before
 * the EXISTING signed registry/PG16 child path is considered.
 *
 * Source is a separately SHA-pinned, previously frozen per-day SOURCE
 * registry, not a new flight/provider observation. No IO or live clock.
 */
import {createHash} from "node:crypto";
import {digestP5Stage24ReviewedReceipt}
 from "./phase5T24WitnessedLaterHorizonGuard_v39";
import type {P5SignedSourceBatchRegistry}
 from "./phase5SignedPerDaySourceBatchReadonly_v39";
import type {P5ReviewReadyLaterPrePacketBytes}
 from "./phase5IndependentLaterPrePacketCompletion_v39";
import type {
 P5SignedLaterPreDayRegistry,
 P5SignedLaterPreRegistryEntry
} from "./phase5SignedLaterPreDayRegistry_v39";
import type {P5SignedWitnessedLaterPrePacket}
 from "../../../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39";

const SHA=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const SOURCE_FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const MAX_SHARD=96;
const fail=(why:string):never=>{
 throw Error("REFUSED_P5_REVIEWED_LATER_UNSIGNED_REGISTRY_"+why);
};
const hash=(v:Buffer)=>createHash("sha256").update(v).digest("hex");
function exactUtc(x:unknown):number{
 if(typeof x!=="string"||!UTC.test(x)||
    !Number.isFinite(Date.parse(x))||
    new Date(x).toISOString()!==x)
  fail("MALFORMED_OR_RETROSPECTIVE_SELECTED_NATIVE_T");
 return Date.parse(x as string);
}
export interface P5LaterPreUnsignedShardScope{
 expectedExternallyApprovedSourceRegistrySha256:string;
 sourceRegistryFilePath:string;
 proposedLaterRegistryFilePath:string;
 reviewedMainCodeSha:string;
 expectedManifestSha256:string;
 expectedReviewedReleaseSha256:string;
 expectedReviewedSourceRightsSha256:string;
 runDayIndex:number;
 shardIndex:number;
}
export interface P5ReviewReadyLaterFileProposal{
 /** Does not exist on disk unless a SEPARATE publisher writes it. */
 proposedFilePath:string;
 /** Protected independent review artifact expected, not self-issued here. */
 expectedExternallyPinnedReviewArtifactSha256:string;
 completed:P5ReviewReadyLaterPrePacketBytes;
}
export interface P5UnsignedLaterRegistryReviewPlan{
 schema:"v39.phase5.review-ready-later-pre-unsigned-registry-plan.v1";
 status:"REGISTRY_PACKET_BYTES_FOR_INDEPENDENT_EXTERNAL_SIGNATURE_NOT_PUBLISHED";
 sourceRegistrySha256:string;
 proposedRegistrySha256:string;
 proposedRegistryFilePath:string;
 /** Contains flight identity. Private handling/retention required. */
 registryProposal:P5SignedLaterPreDayRegistry;
 /** Exact future bytes for separate reviewer to sign and publish. */
 registryProposalBytes:Buffer;
 /** Sensitive full packet bytes; never serialize to CI logs. */
 proposedPacketFiles:{
  filePath:string;sha256:string;bytes:Buffer;
 }[];
 redactedSummary:{
  runDayIndex:number;shardIndex:number;
  proposedFlightHorizons:number;T6:number;T90:number;
  reviewedT24Witnesses:number;separatelyReviewedNoT24:number;
  sourceQueryCount:number;
 };
 independentlySignedRegistry:false;
 existingRegistryVerifierCalled:false;
 flightFilesPublished:0;registeredV0091Tasks:0;
 githubDispatches:0;databaseReads:0;databaseWrites:0;
 providerCalls:0;paidProviderCalls:0;
 phase5ScientificFreezeGranted:false;phase6PaidGoGranted:false;
}
export function summarizeP5UnsignedLaterRegistryReviewPlan(
 plan:P5UnsignedLaterRegistryReviewPlan
){
 if(plan?.schema!=="v39.phase5.review-ready-later-pre-unsigned-registry-plan.v1"||
    plan.status!==
      "REGISTRY_PACKET_BYTES_FOR_INDEPENDENT_EXTERNAL_SIGNATURE_NOT_PUBLISHED"||
    plan.independentlySignedRegistry!==false||
    plan.existingRegistryVerifierCalled!==false||
    plan.registeredV0091Tasks!==0||
    plan.flightFilesPublished!==0||
    plan.databaseWrites!==0||plan.providerCalls!==0||
    plan.phase6PaidGoGranted!==false)
  fail("UNSAFE_OR_UNVERIFIED_REDACTED_REPORT");
 return{
  status:plan.status,
  sourceRegistrySha256:plan.sourceRegistrySha256,
  proposedRegistrySha256:plan.proposedRegistrySha256,
  proposedRegistryFilePath:plan.proposedRegistryFilePath,
  ...plan.redactedSummary,
  flightIdentityOrPacketBytesLogged:false as const,
  signedFlightPacketsPublished:0 as const,
  registeredV0091Tasks:0 as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  phase6PaidGoGranted:false as const
 };
}
/**
 * Deterministic assembly ONLY. Hashes passed as externally pinned metadata
 * cannot prove reviewer independence; the actual signing/publishing system
 * must attest independent identity, full review, lawful retention and GO.
 */
export function proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
 sourceRegistryBytes:Buffer,
 sourceRegistry:P5SignedSourceBatchRegistry,
 scope:P5LaterPreUnsignedShardScope,
 proposedFiles:readonly P5ReviewReadyLaterFileProposal[]
):P5UnsignedLaterRegistryReviewPlan{
 if(!scope||
    ![scope.expectedExternallyApprovedSourceRegistrySha256,
      scope.expectedManifestSha256,
      scope.expectedReviewedReleaseSha256,
      scope.expectedReviewedSourceRightsSha256].every(s=>
        typeof s==="string"&&SHA.test(s))||
    !CODE.test(scope.reviewedMainCodeSha??"")||
    !FILE.test(scope.proposedLaterRegistryFilePath??"")||
    !SOURCE_FILE.test(scope.sourceRegistryFilePath??"")||
    scope.proposedLaterRegistryFilePath===scope.sourceRegistryFilePath||
    !Number.isSafeInteger(scope.runDayIndex)||
    scope.runDayIndex<1||scope.runDayIndex>31||
    !Number.isSafeInteger(scope.shardIndex)||
    scope.shardIndex<1||scope.shardIndex>100_000||
    !Buffer.isBuffer(sourceRegistryBytes)||
    sourceRegistryBytes.length<100||sourceRegistryBytes.length>100_000||
    hash(sourceRegistryBytes)!==
      scope.expectedExternallyApprovedSourceRegistrySha256||
    !Array.isArray(proposedFiles)||proposedFiles.length<1||
    proposedFiles.length>MAX_SHARD)
  fail("EXTERNAL_SOURCE_REGISTRY_OR_SHARD_SCOPE_NOT_PINNED");
 let parsedSource:P5SignedSourceBatchRegistry;
 try{parsedSource=JSON.parse(sourceRegistryBytes.toString("utf8"))
   as P5SignedSourceBatchRegistry;}
 catch{return fail("EXTERNAL_SOURCE_REGISTRY_NOT_JSON");}
 if(JSON.stringify(parsedSource)!==JSON.stringify(sourceRegistry)||
    sourceRegistry?.schema!==
      "v39.phase5.signed-per-day-source-batch-readonly.v1"||
    sourceRegistry.manifestSha256!==scope.expectedManifestSha256||
    sourceRegistry.runDayIndex!==scope.runDayIndex||
    !Array.isArray(sourceRegistry.entries)||
    sourceRegistry.entries.length<1||
    sourceRegistry.entries.length>96)
  fail("SOURCE_REGISTRY_SCOPE_OR_EXACT_BYTES_CHANGED");
 const sources=new Set<string>(),sourcePaths=new Set<string>();
 for(const e of sourceRegistry.entries){
  if(!e||!SOURCE_FILE.test(e.filePath??"")||
     !SHA.test(e.expectedPacketSha256??"")||
     !SHA.test(e.expectedQueryDigestSha256??"")||
     sources.has(e.expectedQueryDigestSha256)||
     sourcePaths.has(e.filePath)||
     e.filePath===scope.sourceRegistryFilePath||
     e.filePath===scope.proposedLaterRegistryFilePath)
   fail("DUPLICATE_OR_MISSING_SOURCE_QUERY_IN_FROZEN_DAY");
  sources.add(e.expectedQueryDigestSha256);
  sourcePaths.add(e.filePath);
 }
 const entries:P5SignedLaterPreRegistryEntry[]=[];
 const bytesByPath=new Map<string,Buffer>();
 const usedFlightHorizon=new Set<string>();
 const seenPacketSha=new Set<string>();
 const seenReviewSha=new Set<string>();
 let T6=0,T90=0,t24=0,missingT24=0;
 for(const f of proposedFiles){
  if(!f||!FILE.test(f.proposedFilePath??"")||
     f.proposedFilePath===scope.proposedLaterRegistryFilePath||
     f.proposedFilePath===scope.sourceRegistryFilePath||
     sourcePaths.has(f.proposedFilePath)||
     bytesByPath.has(f.proposedFilePath)||
     !SHA.test(f.expectedExternallyPinnedReviewArtifactSha256??""))
   fail("REVIEW_PACKET_PATH_NOT_PRIVATE_FROZEN_OR_DUPLICATED");
  const v=f.completed;
  if(!v||v.schema!==
      "v39.phase5.review-ready-native-later-pre-packet-unsigned.v1"||
     v.status!==
      "PACKET_BYTES_NEED_EXTERNAL_FROZEN_REGISTRY_SHA_APPROVAL_NOT_GO"||
     v.reviewedCodeSha!==scope.reviewedMainCodeSha||
     v.sourceDayRegistrySha256!==
      scope.expectedExternallyApprovedSourceRegistrySha256||
     v.reviewArtifactSha256!==
      f.expectedExternallyPinnedReviewArtifactSha256||
     !SHA.test(v.sourceDossierSha256??"")||
     !SHA.test(v.sourceAuditSha256??"")||
     !SHA.test(v.packetSha256??"")||
     v.sourceContentsLawfulUseCertifiedByThisFunction!==false||
     v.nativePhysicalFlightCertifiedByThisFunction!==false||
     v.signedProductionRegistryPublished!==false||
     v.phase5ScientificFreezeGranted!==false||
     v.phase6PaidGoGranted!==false||
     v.providerCalls!==0||v.databaseWrites!==0||
     v.githubDispatches!==0||
     !Buffer.isBuffer(v.packetBytes)||
     v.packetBytes.length<100||v.packetBytes.length>200_000||
     hash(v.packetBytes)!==v.packetSha256||
     seenPacketSha.has(v.packetSha256)||
     seenReviewSha.has(v.reviewArtifactSha256))
   fail("UNAUTHENTICATED_COMPLETION_OR_SELF_CERTIFIED_PUBLISH");
  let pkt:P5SignedWitnessedLaterPrePacket;
  try{pkt=JSON.parse(v.packetBytes.toString("utf8"))
    as P5SignedWitnessedLaterPrePacket;}
  catch{return fail("REVIEW_READY_NATIVE_PRE_PACKET_NONJSON");}
  if(JSON.stringify(pkt)!==JSON.stringify(v.packet))
   fail("BYTE_CHANGED_AFTER_INDEPENDENT_PACKET_REVIEW");
  const p=pkt?.prePermit;
  if(!p||pkt.reviewedCodeSha!==scope.reviewedMainCodeSha||
     p.runDayIndex!==scope.runDayIndex||
     p.manifestSha256!==scope.expectedManifestSha256||
     p.expectedReviewedReleaseSha256!==
      scope.expectedReviewedReleaseSha256||
     p.expectedReviewedSourceRightsSha256!==
      scope.expectedReviewedSourceRightsSha256||
     !sources.has(p.queryDigestSha256)||
     !UUID.test(p.expectedSourcePopulationQueryId??"")||
     !SHA.test(p.expectedSourceResponseSha256??"")||
     !SHA.test(p.independentlyReviewedOperatingLegEvidenceSha256??"")||
     !SHA.test(p.independentlyReviewedNativeTEvidenceSha256??"")||
     !SHA.test(p.independentlyReviewedRunAndRetentionEvidenceSha256??"")||
     p.externalNativeTPhysicalLegAndSourceUseReviewed!==true||
     p.identityEvidenceTier!=="PROVIDER_NATIVE_OPERATING_LEG"||
     typeof p.flightInstanceId!=="string"||
     p.flightInstanceId.length<5||p.flightInstanceId.length>200||
     p.horizon!==v.horizon||
     !["T-6h","T-90m"].includes(p.horizon)||
     (p.horizon==="T-6h"&&v.horizon!=="T-6h")||
     (p.horizon==="T-90m"&&v.horizon!=="T-90m"))
   fail("NATIVE_FLIGHT_DAY_SOURCE_RELEASE_OR_RIGHTS_NOT_BOUND");
  const selectedT=exactUtc(p.selectedTNativeUtc);
  const ownCutoff=selectedT-
   (p.horizon==="T-6h"?6*3600_000:90*60_000);
  const key=p.flightInstanceId+"|"+p.horizon;
  if(usedFlightHorizon.has(key))
   fail("DUPLICATE_NATIVE_FLIGHT_SAME_HORIZON");
  usedFlightHorizon.add(key);
  let witness:string|undefined;
  if(pkt.schema==="v39.phase5.github-witnessed-later-pre-reviewed.v1"){
   witness=p.reviewedT24WitnessReceipt?.receiptSha256;
   if(pkt.independentLaterHorizonAndT24ReviewAttested!==true||
      p.reviewedStandaloneLaterNoT24!==undefined||
      !SHA.test(witness??"")||
      !p.reviewedT24WitnessReceipt||
      digestP5Stage24ReviewedReceipt(p.reviewedT24WitnessReceipt)!==
        witness||
      v.t24EvidenceTier!=="REVIEWED_REAL_T24_RECEIPT")
    fail("T24_WITNESS_DIGEST_OR_TIER_NOT_GENUINE");
   t24++;
  }else if(pkt.schema===
       "v39.phase5.github-standalone-later-pre-asof-reviewed.v2"){
   if(pkt.independentlyReviewedLaterWithoutT24AsOfAttested!==true||
      p.reviewedT24WitnessReceipt!==undefined||
      p.reviewedStandaloneLaterNoT24?.missingT24Class!==
       "HONEST_T24_UNOBSERVED_NOT_BACKFILLED"||
      !SHA.test(p.reviewedStandaloneLaterNoT24?.reviewedProtocolSha256??"")||
      v.t24EvidenceTier!==
       "SEPARATELY_REVIEWED_T24_MISSING_NO_BACKFILL")
    fail("NO_T24_REQUIRES_SEPARATE_SIGNED_MISSINGNESS_PROTOCOL");
   missingT24++;
  }else fail("UNREVIEWED_LATER_PACKET_TYPE");
  if(p.horizon==="T-6h")T6++;else T90++;
  entries.push({
   filePath:f.proposedFilePath,
   expectedPacketSha256:v.packetSha256,
   expectedQueryDigestSha256:p.queryDigestSha256,
   expectedFlightInstanceId:p.flightInstanceId,
   expectedHorizon:p.horizon as "T-6h"|"T-90m",
   expectedSelectedTNativeUtc:new Date(selectedT).toISOString(),
   expectedSourcePopulationQueryId:p.expectedSourcePopulationQueryId,
   ...(witness?{expectedT24ReceiptSha256:witness}:{})
  });
  bytesByPath.set(f.proposedFilePath,v.packetBytes);
  seenPacketSha.add(v.packetSha256);
  seenReviewSha.add(v.reviewArtifactSha256);
  // Not a prospective runtime-clock check. The independent publisher
  // must verify actual DB clock and reject cutoff/late evidence.
  void ownCutoff;
 }
 entries.sort((a,b)=>{
  const aCut=Date.parse(a.expectedSelectedTNativeUtc)-
   (a.expectedHorizon==="T-6h"?21600_000:5400_000);
  const bCut=Date.parse(b.expectedSelectedTNativeUtc)-
   (b.expectedHorizon==="T-6h"?21600_000:5400_000);
  return aCut-bCut||a.expectedFlightInstanceId.localeCompare(
   b.expectedFlightInstanceId)||a.filePath.localeCompare(b.filePath);
 });
 const registryProposal:P5SignedLaterPreDayRegistry={
  schema:"v39.phase5.signed-later-pre-day-registry.v1",
  manifestSha256:scope.expectedManifestSha256,
  reviewedCodeSha:scope.reviewedMainCodeSha,
  sourceDayRegistrySha256:
   scope.expectedExternallyApprovedSourceRegistrySha256,
  sourceDayRegistryFilePath:scope.sourceRegistryFilePath,
  runDayIndex:scope.runDayIndex,
  shardIndex:scope.shardIndex,
  entries
 };
 const registryProposalBytes=Buffer.from(JSON.stringify(registryProposal));
 if(registryProposalBytes.length<100||
    registryProposalBytes.length>250_000)
  fail("DAY_REGISTRY_EXCEEDS_VERIFIER_BYTE_BOUND");
 return{
  schema:"v39.phase5.review-ready-later-pre-unsigned-registry-plan.v1",
  status:"REGISTRY_PACKET_BYTES_FOR_INDEPENDENT_EXTERNAL_SIGNATURE_NOT_PUBLISHED",
  sourceRegistrySha256:
   scope.expectedExternallyApprovedSourceRegistrySha256,
  proposedRegistrySha256:hash(registryProposalBytes),
  proposedRegistryFilePath:scope.proposedLaterRegistryFilePath,
  registryProposal,registryProposalBytes,
  proposedPacketFiles:entries.map(e=>({
   filePath:e.filePath,
   sha256:e.expectedPacketSha256,
   bytes:bytesByPath.get(e.filePath)!
  })),
  redactedSummary:{
   runDayIndex:scope.runDayIndex,shardIndex:scope.shardIndex,
   proposedFlightHorizons:entries.length,T6,T90,
   reviewedT24Witnesses:t24,separatelyReviewedNoT24:missingT24,
   sourceQueryCount:sources.size
  },
  independentlySignedRegistry:false,
  existingRegistryVerifierCalled:false,
  flightFilesPublished:0,registeredV0091Tasks:0,
  githubDispatches:0,databaseReads:0,databaseWrites:0,
  providerCalls:0,paidProviderCalls:0,
  phase5ScientificFreezeGranted:false,phase6PaidGoGranted:false
 };
}
