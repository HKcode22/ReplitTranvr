/**
 * Phase5 read-only, nonpaid signed per-day later PRE packet registry.
 *
 * One independently SHA-pinned registry delegates up to 96 future per-flight
 * T6/T90 packet byte digests. Unlike one global packet secret per flight,
 * it is tied to the already signed SOURCE day registry and the same sampled
 * run-day. No date, T, physical flight, Contents right or source response
 * is invented. No DATABASE_URL, provider, GitHub dispatch or SQL here.
 *
 * A registry shard is intentionally bounded: additional same-day shards
 * require another separately signed prospective approval, not an auto grant.
 */
import {createHash} from "node:crypto";
import type {P5SignedSourceBatchRegistry}
 from "./phase5SignedPerDaySourceBatchReadonly_v39";
import type {P5SignedWitnessedLaterPrePacket}
 from "../../../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39";

const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const hash=(v:Buffer)=>createHash("sha256").update(v).digest("hex");
const hold=(s:string):never=>{throw Error("REFUSED_P5_LATER_DAY_REGISTRY_"+s);};
const validTime=(s:string)=>typeof s==="string"&&ISO.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
export interface P5SignedLaterPreRegistryEntry{
 filePath:string;
 expectedPacketSha256:string;
 expectedQueryDigestSha256:string;
 expectedFlightInstanceId:string;
 expectedHorizon:"T-6h"|"T-90m";
 expectedSelectedTNativeUtc:string;
 expectedSourcePopulationQueryId:string;
 expectedT24ReceiptSha256?:string;
}
export interface P5SignedLaterPreDayRegistry{
 schema:"v39.phase5.signed-later-pre-day-registry.v1";
 manifestSha256:string;
 reviewedCodeSha:string;
 sourceDayRegistrySha256:string;
 runDayIndex:number;
 shardIndex:number;
 entries:P5SignedLaterPreRegistryEntry[];
}
export interface P5SignedLaterPreDayRegistryPins{
 registryFilePath:string;
 expectedRegistrySha256:string;
 expectedSourceDayRegistrySha256:string;
 expectedManifestSha256:string;
 expectedApprovedMainSha:string;
 expectedRunDayIndex:number;
 expectedReleaseSha256:string;
 expectedRightsSha256:string;
}
export interface P5VerifiedLaterPreRegistryEntry{
 filePath:string;
 packetSha256:string;
 queryDigestSha256:string;
 flightInstanceId:string;
 horizon:"T-6h"|"T-90m";
 selectedTNativeUtc:string;
 t24ReceiptSha256?:string;
 bytes:Buffer;
 packet:P5SignedWitnessedLaterPrePacket;
}
export interface P5VerifiedLaterPreDayRegistry{
 schema:"v39.phase5.verified-later-pre-day-registry.v1";
 registryFilePath:string;
 registrySha256:string;
 sourceDayRegistrySha256:string;
 manifestSha256:string;
 approvedCodeSha:string;
 runDayIndex:number;
 shardIndex:number;
 entries:P5VerifiedLaterPreRegistryEntry[];
 providerCalls:0;
 databaseWrites:0;
 githubChildDispatches:0;
 phase5ScientificFreezeCertifiedByRegistry:false;
 phase6PaidGoGrantedByRegistry:false;
}
export function verifyP5SignedLaterPreDayRegistry(
 registryBytes:Buffer,registry:P5SignedLaterPreDayRegistry,
 sourceBytes:Buffer,source:P5SignedSourceBatchRegistry,
 pins:P5SignedLaterPreDayRegistryPins,
 readFrozenPacket:(path:string)=>Buffer
):P5VerifiedLaterPreDayRegistry{
 if(!pins||!FILE.test(pins.registryFilePath??"")||
    ![pins.expectedRegistrySha256,pins.expectedSourceDayRegistrySha256,
      pins.expectedManifestSha256,pins.expectedReleaseSha256,
      pins.expectedRightsSha256].every(x=>typeof x==="string"&&SHA.test(x))||
    !CODE.test(pins.expectedApprovedMainSha??"")||
    !Number.isInteger(pins.expectedRunDayIndex)||
    pins.expectedRunDayIndex<1||pins.expectedRunDayIndex>31||
    !Buffer.isBuffer(registryBytes)||registryBytes.length<100||
    registryBytes.length>250000||
    hash(registryBytes)!==pins.expectedRegistrySha256||
    !Buffer.isBuffer(sourceBytes)||sourceBytes.length<100||
    sourceBytes.length>100000||
    hash(sourceBytes)!==pins.expectedSourceDayRegistrySha256)
  hold("UNSIGNED_REGISTRY_OR_SOURCE_REGISTRY_BYTES");
 if(!registry||
    registry.schema!=="v39.phase5.signed-later-pre-day-registry.v1"||
    registry.manifestSha256!==pins.expectedManifestSha256||
    registry.reviewedCodeSha!==pins.expectedApprovedMainSha||
    registry.sourceDayRegistrySha256!==pins.expectedSourceDayRegistrySha256||
    registry.runDayIndex!==pins.expectedRunDayIndex||
    !Number.isSafeInteger(registry.shardIndex)||
    registry.shardIndex<1||registry.shardIndex>100000||
    !Array.isArray(registry.entries)||registry.entries.length<1||
    registry.entries.length>96||
    !source||
    source.schema!=="v39.phase5.signed-per-day-source-batch-readonly.v1"||
    source.manifestSha256!==pins.expectedManifestSha256||
    source.runDayIndex!==pins.expectedRunDayIndex||
    !Array.isArray(source.entries)||source.entries.length<1||
    source.entries.length>96)
  hold("REGISTRY_RUN_DAY_CODE_MANIFEST_OR_SHARD_NOT_AUTHORIZED");
 const sourceDigests=new Set<string>(),sourcePaths=new Set<string>();
 for(const s of source.entries){
  if(!s||!FILE.test(s.filePath??"")||
     !SHA.test(s.expectedQueryDigestSha256??"")||
     !SHA.test(s.expectedPacketSha256??"")||
     sourceDigests.has(s.expectedQueryDigestSha256)||
     sourcePaths.has(s.filePath))
   hold("DUPLICATE_OR_INVALID_SOURCE_REGISTRY_ENTRY");
  sourceDigests.add(s.expectedQueryDigestSha256);
  sourcePaths.add(s.filePath);
 }
 const verified:P5VerifiedLaterPreRegistryEntry[]=[];
 const seenFile=new Set<string>(),seenFlightHorizon=new Set<string>();
 for(const e of registry.entries){
  if(!e||!FILE.test(e.filePath??"")||
     e.filePath===pins.registryFilePath||
     sourcePaths.has(e.filePath)||
     !SHA.test(e.expectedPacketSha256??"")||
     !SHA.test(e.expectedQueryDigestSha256??"")||
     !sourceDigests.has(e.expectedQueryDigestSha256)||
     !validTime(e.expectedSelectedTNativeUtc)||
     typeof e.expectedFlightInstanceId!=="string"||
     e.expectedFlightInstanceId.length<5||
     e.expectedFlightInstanceId.length>200||
     !["T-6h","T-90m"].includes(e.expectedHorizon)||
     !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(e.expectedSourcePopulationQueryId??"")||
     seenFile.has(e.filePath)||
     seenFlightHorizon.has(e.expectedFlightInstanceId+"|"+e.expectedHorizon))
   hold("DUPLICATE_CROSS_SOURCE_OR_UNAUTHENTICATED_FLIGHT_ENTRY");
  seenFile.add(e.filePath);
  seenFlightHorizon.add(e.expectedFlightInstanceId+"|"+e.expectedHorizon);
  const bytes=readFrozenPacket(e.filePath);
  if(!Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>200000||
     hash(bytes)!==e.expectedPacketSha256)
   hold("FROZEN_FLIGHT_PACKET_BYTES_NOT_AUTHENTIC");
  let packet:P5SignedWitnessedLaterPrePacket;
  try{packet=JSON.parse(bytes.toString("utf8")) as P5SignedWitnessedLaterPrePacket;}
  catch{return hold("SIGNED_FLIGHT_PACKET_NOT_JSON");}
  const p=packet?.prePermit;
  if(!p||packet.reviewedCodeSha!==pins.expectedApprovedMainSha||
     p.runDayIndex!==pins.expectedRunDayIndex||
     p.manifestSha256!==pins.expectedManifestSha256||
     p.expectedReviewedReleaseSha256!==pins.expectedReleaseSha256||
     p.expectedReviewedSourceRightsSha256!==pins.expectedRightsSha256||
     p.queryDigestSha256!==e.expectedQueryDigestSha256||
     p.flightInstanceId!==e.expectedFlightInstanceId||
     p.horizon!==e.expectedHorizon||
     p.selectedTNativeUtc!==e.expectedSelectedTNativeUtc||
     p.expectedSourcePopulationQueryId!==e.expectedSourcePopulationQueryId||
     (p.identityEvidenceTier??"PROVIDER_NATIVE_OPERATING_LEG")!==
       "PROVIDER_NATIVE_OPERATING_LEG"||
     p.externalNativeTPhysicalLegAndSourceUseReviewed!==true)
   hold("CROSS_DAY_CHANGED_NATIVE_FLIGHT_OR_SOURCE_RIGHTS");
  let receipt:string|undefined;
  if(packet.schema==="v39.phase5.github-witnessed-later-pre-reviewed.v1"){
   receipt=p.reviewedT24WitnessReceipt?.receiptSha256;
   if(packet.independentLaterHorizonAndT24ReviewAttested!==true||
      !SHA.test(receipt??"")||
      p.reviewedStandaloneLaterNoT24!==undefined||
      receipt!==e.expectedT24ReceiptSha256)
    hold("T24_WITNESS_RECEIPT_NOT_BOUND_TO_SIGNED_REGISTRY");
  }else if(packet.schema===
           "v39.phase5.github-standalone-later-pre-asof-reviewed.v2"){
   if(packet.independentlyReviewedLaterWithoutT24AsOfAttested!==true||
      e.expectedT24ReceiptSha256!==undefined||
      p.reviewedT24WitnessReceipt!==undefined||
      !p.reviewedStandaloneLaterNoT24||
      p.reviewedStandaloneLaterNoT24.missingT24Class!==
         "HONEST_T24_UNOBSERVED_NOT_BACKFILLED")
    hold("NO_T24_STANDALONE_REQUIRES_EXPLICIT_SEPARATE_AMENDMENT");
  }else hold("UNKNOWN_LATER_PRE_PACKET_SCHEMA");
  verified.push({
   filePath:e.filePath,packetSha256:e.expectedPacketSha256,
   queryDigestSha256:e.expectedQueryDigestSha256,
   flightInstanceId:e.expectedFlightInstanceId,
   horizon:e.expectedHorizon,
   selectedTNativeUtc:e.expectedSelectedTNativeUtc,
   t24ReceiptSha256:receipt,
   bytes,packet
  });
 }
 return{
  schema:"v39.phase5.verified-later-pre-day-registry.v1",
  registryFilePath:pins.registryFilePath,
  registrySha256:pins.expectedRegistrySha256,
  sourceDayRegistrySha256:pins.expectedSourceDayRegistrySha256,
  manifestSha256:pins.expectedManifestSha256,
  approvedCodeSha:pins.expectedApprovedMainSha,
  runDayIndex:pins.expectedRunDayIndex,shardIndex:registry.shardIndex,
  entries:verified,providerCalls:0,databaseWrites:0,
  githubChildDispatches:0,
  phase5ScientificFreezeCertifiedByRegistry:false,
  phase6PaidGoGrantedByRegistry:false
 };
}
export function selectP5LaterPreDueRegistryEntries(
 verified:P5VerifiedLaterPreDayRegistry,
 observedDbClockUtc:string,
 limit=4
){
 if(!verified||verified.schema!==
   "v39.phase5.verified-later-pre-day-registry.v1"||
    verified.providerCalls!==0||verified.databaseWrites!==0||
    verified.githubChildDispatches!==0||
    verified.phase6PaidGoGrantedByRegistry!==false||
    verified.phase5ScientificFreezeCertifiedByRegistry!==false||
    !Array.isArray(verified.entries)||verified.entries.length<1||
    verified.entries.length>96||
    !Number.isSafeInteger(limit)||limit<1||limit>4||
    !validTime(observedDbClockUtc))
  hold("UNVERIFIED_REGISTRY_OR_REAL_DB_CLOCK");
 const now=Date.parse(observedDbClockUtc);
 const due:P5VerifiedLaterPreRegistryEntry[]=[];
 const statuses:{filePath:string;state:string;cutoffUtc:string}[]=[];
 const seen=new Set<string>();
 for(const e of verified.entries){
  if(!e||!FILE.test(e.filePath)||seen.has(e.filePath)||
     !validTime(e.selectedTNativeUtc))
   hold("DUPLICATE_OR_MALFORMED_VERIFIED_REGISTRY_ENTRY");
  seen.add(e.filePath);
  const cutoff=Date.parse(e.selectedTNativeUtc)-
   (e.horizon==="T-6h"?21600_000:5400_000);
  const left=cutoff-now;
  const state=left<=15*60000?"MISSED_OR_TOO_CLOSE_CENSOR":
   left>90*60000?"NOT_YET_DUE":"DUE_FOR_REAL_SOURCE_REVIEW";
  statuses.push({filePath:e.filePath,state,
   cutoffUtc:new Date(cutoff).toISOString()});
  if(state==="DUE_FOR_REAL_SOURCE_REVIEW")due.push(e);
 }
 // Stable ascending cutoff, not a data-based ranking or site redraw.
 due.sort((a,b)=>{
  const ca=Date.parse(a.selectedTNativeUtc)-
   (a.horizon==="T-6h"?21600_000:5400_000);
  const cb=Date.parse(b.selectedTNativeUtc)-
   (b.horizon==="T-6h"?21600_000:5400_000);
  return ca-cb||a.filePath.localeCompare(b.filePath);
 });
 return{
  schema:"v39.phase5.later-pre-registry-clock-due-selection.v1" as const,
  observedDbClockUtc,
  totalSignedFlightHorizons:verified.entries.length,
  dueForActualPgReadback:due.length,
  selectedForActualPgReadback:due.slice(0,limit),
  deferredWithinWindowCount:Math.max(0,due.length-limit),
  statuses,providerCalls:0 as const,databaseWrites:0 as const,
  githubChildDispatches:0 as const,phase6PaidGoGrantedHere:false as const
 };
}
