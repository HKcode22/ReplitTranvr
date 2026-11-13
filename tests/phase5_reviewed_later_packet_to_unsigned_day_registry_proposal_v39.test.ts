import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 proposeP5ReviewedLaterPacketsAsUnsignedDayShard,
 summarizeP5UnsignedLaterRegistryReviewPlan,
 type P5LaterPreUnsignedShardScope,
 type P5ReviewReadyLaterFileProposal
} from "../server/lib/disruption/phase5ReviewedLaterPacketToUnsignedDayRegistryProposal_v39";
import {digestP5Stage24ReviewedReceipt}
 from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39";
import {verifyP5SignedLaterPreDayRegistry}
 from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";
import type {P5SignedSourceBatchRegistry}
 from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";
import type {P5ReviewReadyLaterPrePacketBytes}
 from "../server/lib/disruption/phase5IndependentLaterPrePacketCompletion_v39";
import type {P5Stage24ReviewedT24Receipt}
 from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39";
import type {P5SignedWitnessedLaterPrePacket}
 from "../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39";
const H=(s:string)=>s.repeat(64);
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const hash=(s:string)=>sha(Buffer.from(s));
const uuid="a23e4567-e89b-42d3-a456-426614174000";
const code="e".repeat(40);
const srcFile="data-collection/phase5/frozen/source_day_0004.json";
const registryPath="data-collection/phase5/frozen/later_day_shard_0001.json";
function makeWitness(flight:string,native:string){
 const millis=Date.parse(native);
 const original:Omit<P5Stage24ReviewedT24Receipt,"receiptSha256">={
  schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1",
  snapshotId:"1001",flightInstanceId:flight,
  selectedTNativeUtc:native,
  frozenT24CutoffUtc:new Date(millis-24*3600_000).toISOString(),
  expectedSelectedTVersion:"departure.scheduledTime.utc:v1:"+H("d"),
  t24OriginalFidsSha256:H("f"),
  t24SourceQueryDigestSha256:H("2"),
  t24FrameSha256:H("8"),t24ConfigSha256:H("9"),
  witnessDbObservedAtUtc:new Date(millis-24*3600_000-120_000).toISOString(),
  stage17PostCommitReadbackAtUtc:
   new Date(millis-24*3600_000-90_000).toISOString()
 };
 return {...original,receiptSha256:digestP5Stage24ReviewedReceipt(original)};
}
function fixture(){
 const source:P5SignedSourceBatchRegistry={
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:H("1"),runDayIndex:4,
  entries:[{
   filePath:"data-collection/phase5/frozen/source_query_a0001.json",
   expectedPacketSha256:H("7"),
   expectedQueryDigestSha256:H("2")
  }]
 };
 const sourceBytes=Buffer.from(JSON.stringify(source));
 const scope:P5LaterPreUnsignedShardScope={
  expectedExternallyApprovedSourceRegistrySha256:sha(sourceBytes),
  sourceRegistryFilePath:srcFile,
  proposedLaterRegistryFilePath:registryPath,
  reviewedMainCodeSha:code,
  expectedManifestSha256:H("1"),
  expectedReviewedReleaseSha256:H("3"),
  expectedReviewedSourceRightsSha256:H("4"),
  runDayIndex:4,shardIndex:1
 };
 function file(i:number,horizon:"T-6h"|"T-90m"="T-6h",
  noT24=false,flightOverride?:string):P5ReviewReadyLaterFileProposal{
  const flight=flightOverride??"leg:observed:"+String(i).padStart(5,"0");
  const native=new Date(Date.parse("2027-02-10T12:00:00.000Z")+
   i*60_000).toISOString();
  const receipt=noT24?undefined:makeWitness(flight,native);
  const packet={
   schema:noT24?
    "v39.phase5.github-standalone-later-pre-asof-reviewed.v2":
    "v39.phase5.github-witnessed-later-pre-reviewed.v1",
   reviewedCodeSha:code,
   ...(noT24?
    {independentlyReviewedLaterWithoutT24AsOfAttested:true}:
    {independentLaterHorizonAndT24ReviewAttested:true}),
   prePermit:{
    manifestSha256:H("1"),queryDigestSha256:H("2"),
    expectedSourcePopulationQueryId:uuid,
    expectedSourceResponseSha256:H("a"),
    expectedReviewedReleaseSha256:H("3"),
    expectedReviewedSourceRightsSha256:H("4"),
    expectedProviderContractSha256:H("5"),
    expectedEarlyDrawSha256:H("6"),
    expectedGithubSourceRunId:"42899999999",
    runDayIndex:4,slot:"HUB",airportIcao:"WSSS",
    flightInstanceId:flight,horizon,selectedTNativeUtc:native,
    identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG",
    externalNativeTPhysicalLegAndSourceUseReviewed:true,
    independentlyReviewedOperatingLegEvidenceSha256:H("7"),
    independentlyReviewedNativeTEvidenceSha256:H("8"),
    independentlyReviewedRunAndRetentionEvidenceSha256:H("9"),
    ...(noT24?{
     reviewedStandaloneLaterNoT24:{
      schema:"v39.phase5.standalone-later-asof-no-t24.v1",
      missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED",
      reviewedProtocolSha256:H("c"),
      reviewedOriginalResponseSha256:H("a"),
      reviewedNativeTSemanticsSha256:H("8"),
      independentLaterAsOfAndMissingnessReviewAttested:true
     }}:{reviewedT24WitnessReceipt:receipt})
   }
  } as unknown as P5SignedWitnessedLaterPrePacket;
  const packetBytes=Buffer.from(JSON.stringify(packet));
  const reviewSha=hash("synthetic-external-review-"+String(i)+"-"+horizon);
  const completed:P5ReviewReadyLaterPrePacketBytes={
   schema:"v39.phase5.review-ready-native-later-pre-packet-unsigned.v1",
   status:"PACKET_BYTES_NEED_EXTERNAL_FROZEN_REGISTRY_SHA_APPROVAL_NOT_GO",
   reviewArtifactSha256:reviewSha,
   sourceDossierSha256:H("b"),
   sourceAuditSha256:H("c"),
   sourceDayRegistrySha256:sha(sourceBytes),
   reviewedCodeSha:code,
   packetSha256:sha(packetBytes),packetBytes,packet,horizon,
   t24EvidenceTier:noT24?
    "SEPARATELY_REVIEWED_T24_MISSING_NO_BACKFILL":
    "REVIEWED_REAL_T24_RECEIPT",
   sourceContentsLawfulUseCertifiedByThisFunction:false,
   nativePhysicalFlightCertifiedByThisFunction:false,
   signedProductionRegistryPublished:false,
   phase5ScientificFreezeGranted:false,
   phase6PaidGoGranted:false,
   providerCalls:0,databaseWrites:0,githubDispatches:0
  };
  return{
   proposedFilePath:"data-collection/phase5/frozen/later_review_"+
    String(i).padStart(4,"0")+"_"+horizon.replace(/[^A-Za-z0-9]/g,"")+
    ".json",
   expectedExternallyPinnedReviewArtifactSha256:reviewSha,
   completed
  };
 }
 return{scope,source,sourceBytes,file};
}
describe("review-ready real SOURCE-derived later PRE -> UNSIGNED bounded day shard candidate",()=>{
 it("creates exact existing later registry wire schema without publishing or self-approving",()=>{
  const f=fixture(),files=[f.file(1),f.file(2,"T-90m",true)];
  const p=proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   f.sourceBytes,f.source,f.scope,files);
  expect(p.registryProposal.entries).toHaveLength(2);
  expect(p.redactedSummary).toMatchObject({
   runDayIndex:4,proposedFlightHorizons:2,T6:1,T90:1,
   reviewedT24Witnesses:1,separatelyReviewedNoT24:1,
   sourceQueryCount:1
  });
  expect(sha(p.registryProposalBytes)).toBe(p.proposedRegistrySha256);
  expect(p.registryProposal.sourceDayRegistrySha256)
   .toBe(f.scope.expectedExternallyApprovedSourceRegistrySha256);
  expect(p.proposedPacketFiles.map(x=>x.sha256))
   .toEqual(p.registryProposal.entries.map(x=>x.expectedPacketSha256));
  expect(p.independentlySignedRegistry).toBe(false);
  expect(p.existingRegistryVerifierCalled).toBe(false);
  expect(p.flightFilesPublished).toBe(0);
  expect(p.registeredV0091Tasks).toBe(0);
  expect(p.phase6PaidGoGranted).toBe(false);
  const safe=summarizeP5UnsignedLaterRegistryReviewPlan(p);
  expect(JSON.stringify(safe)).not.toContain("leg:observed");
  expect(JSON.stringify(safe)).not.toContain("reviewedOperating");
  expect(safe.flightIdentityOrPacketBytesLogged).toBe(false);
 });
 it("only after a separate synthetic CI-only SHA pin is the existing reader wire compatible",()=>{
  const f=fixture(),inputs=[f.file(1),f.file(2,"T-90m",true)];
  const p=proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   f.sourceBytes,f.source,f.scope,inputs);
  const files=new Map(p.proposedPacketFiles.map(x=>[x.filePath,x.bytes]));
  // TEST ONLY: This synthetic SHA pin does not constitute an independent
  // reviewer, signature, production Contents permission, or Phase6 GO.
  const verified=verifyP5SignedLaterPreDayRegistry(
   p.registryProposalBytes,p.registryProposal,
   f.sourceBytes,f.source,{
    registryFilePath:registryPath,
    expectedRegistrySha256:p.proposedRegistrySha256,
    expectedSourceDayRegistrySha256:sha(f.sourceBytes),
    expectedManifestSha256:H("1"),expectedApprovedMainSha:code,
    expectedRunDayIndex:4,expectedReleaseSha256:H("3"),
    expectedRightsSha256:H("4")
   },path=>files.get(path)??Buffer.from("{}")
  );
  expect(verified.entries).toHaveLength(2);
  expect(verified.providerCalls).toBe(0);
  expect(verified.phase6PaidGoGrantedByRegistry).toBe(false);
 });
 it("requires 1..96 review-ready flights, never silently drops a busy HUB",()=>{
  const f=fixture();
  expect(()=>proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   f.sourceBytes,f.source,f.scope,[])).toThrow("EXTERNAL_SOURCE_REGISTRY_OR_SHARD_SCOPE_NOT_PINNED");
  const hundred=Array.from({length:96},(_,i)=>f.file(i+1));
  const x=proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   f.sourceBytes,f.source,f.scope,hundred);
  expect(x.redactedSummary.proposedFlightHorizons).toBe(96);
  expect(()=>proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   f.sourceBytes,f.source,f.scope,[...hundred,f.file(97)]))
   .toThrow("EXTERNAL_SOURCE_REGISTRY_OR_SHARD_SCOPE_NOT_PINNED");
 });
 it("refuses altered prior source registry bytes and drifted manifest/day/provenance",()=>{
  const f=fixture(),files=[f.file(1)];
  for(const x of [
   {scope:{...f.scope,expectedExternallyApprovedSourceRegistrySha256:H("d")},
    source:f.source,raw:f.sourceBytes},
   {scope:f.scope,source:f.source,
    raw:Buffer.concat([f.sourceBytes,Buffer.from(" ")])},
   {scope:{...f.scope,runDayIndex:5},source:f.source,raw:f.sourceBytes},
   {scope:{...f.scope,expectedManifestSha256:H("e")},
    source:f.source,raw:f.sourceBytes}
  ])expect(()=>proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   x.raw,x.source,x.scope,files)).toThrow(/REFUSED_P5_REVIEWED_LATER_UNSIGNED_REGISTRY_/);
 });
 it("refuses changed packet after the separately pinned review and a fake external receipt",()=>{
  const f=fixture(),a=f.file(1);
  expect(()=>proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   f.sourceBytes,f.source,f.scope,[{
    ...a,expectedExternallyPinnedReviewArtifactSha256:H("d")
   }])).toThrow("UNAUTHENTICATED_COMPLETION_OR_SELF_CERTIFIED_PUBLISH");
  const altered={...a,completed:{
   ...a.completed,
   packetBytes:Buffer.concat([a.completed.packetBytes,Buffer.from(" ")])
  }};
  expect(()=>proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   f.sourceBytes,f.source,f.scope,[altered]))
   .toThrow("UNAUTHENTICATED_COMPLETION_OR_SELF_CERTIFIED_PUBLISH");
  const illegal={...a,completed:{
   ...a.completed,sourceContentsLawfulUseCertifiedByThisFunction:true as false
  }};
  expect(()=>proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   f.sourceBytes,f.source,f.scope,[illegal]))
   .toThrow("UNAUTHENTICATED_COMPLETION_OR_SELF_CERTIFIED_PUBLISH");
 });
 it("refuses unauthorized cross-day, unknown SOURCE query and packet file shadowing",()=>{
  const f=fixture(),a=f.file(1);
  const wrong:P5SignedWitnessedLaterPrePacket={
   ...a.completed.packet,
   prePermit:{...a.completed.packet.prePermit,queryDigestSha256:H("d")}
  };
  const raw=Buffer.from(JSON.stringify(wrong));
  const q={...a,completed:{
   ...a.completed,packet:wrong,
   packetSha256:sha(raw),packetBytes:raw
  }};
  expect(()=>proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   f.sourceBytes,f.source,f.scope,[q]))
   .toThrow("NATIVE_FLIGHT_DAY_SOURCE_RELEASE_OR_RIGHTS_NOT_BOUND");
  expect(()=>proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   f.sourceBytes,f.source,f.scope,[{
    ...a,proposedFilePath:registryPath
   }])).toThrow("REVIEW_PACKET_PATH_NOT_PRIVATE_FROZEN_OR_DUPLICATED");
 });
 it("refuses same flight+horizon twice, permits one flight at distinct T6/T90",()=>{
  const f=fixture(),a=f.file(1),b=f.file(2,"T-6h",false,
   "leg:observed:00001");
  expect(()=>proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   f.sourceBytes,f.source,f.scope,[a,b]))
   .toThrow("DUPLICATE_NATIVE_FLIGHT_SAME_HORIZON");
  const c=f.file(2,"T-90m",true,"leg:observed:00001");
  const x=proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   f.sourceBytes,f.source,f.scope,[a,c]);
  expect(x.redactedSummary.proposedFlightHorizons).toBe(2);
 });
 it("refuses forged T24 and a fake missing-T24 evidence tier",()=>{
  const f=fixture(),a=f.file(1);
  const receipt=a.completed.packet.prePermit.reviewedT24WitnessReceipt!;
  const packet={...a.completed.packet,prePermit:{
   ...a.completed.packet.prePermit,reviewedT24WitnessReceipt:{
    ...receipt,flightInstanceId:"leg:wrong:flight"
   }
  }} as P5SignedWitnessedLaterPrePacket;
  const bytes=Buffer.from(JSON.stringify(packet));
  const bad={...a,completed:{...a.completed,packet,packetBytes:bytes,
   packetSha256:sha(bytes)}};
  expect(()=>proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   f.sourceBytes,f.source,f.scope,[bad]))
   .toThrow("T24_WITNESS_DIGEST_OR_TIER_NOT_GENUINE");
  const v2=f.file(2,"T-90m",true);
  const fake={...v2,completed:{
   ...v2.completed,t24EvidenceTier:"REVIEWED_REAL_T24_RECEIPT" as
    "REVIEWED_REAL_T24_RECEIPT"
  }};
  expect(()=>proposeP5ReviewedLaterPacketsAsUnsignedDayShard(
   f.sourceBytes,f.source,f.scope,[fake]))
   .toThrow("NO_T24_REQUIRES_SEPARATE_SIGNED_MISSINGNESS_PROTOCOL");
 });
});
