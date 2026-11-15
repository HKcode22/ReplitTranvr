import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {digestP5Stage24ReviewedReceipt,
 type P5Stage24ReviewedT24Receipt}
 from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39";
import type {P5UnsignedNativePreDossier,
 P5UnsignedPreReviewEntry}
 from "../server/lib/disruption/phase5SourceBoundUnsignedPreDossier_v39";
import {digestP5UnsignedNativePreDossier}
 from "../server/lib/disruption/phase5SourceBoundUnsignedPreDossier_v39";
import {
 completeP5NativeLaterPrePacketForIndependentSigning,completeP5NativeT24PrePacketForIndependentSigning,
 type P5ExternalNativeT24PreReviewArtifact,type P5ExternalNativeT24PacketPins,
 type P5ExternalNativeLaterPreReviewArtifact,
 type P5ExternalNativeLaterPacketPins}
 from "../server/lib/disruption/phase5IndependentLaterPrePacketCompletion_v39";
import {P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";

const H=(v:string)=>v.repeat(64);
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const selected="2027-02-10T12:00:00.000Z";
const cutoff="2027-02-10T06:00:00.000Z";
const uuid="a23e4567-e89b-42d3-a456-426614174000";
const code="e".repeat(40);
const flight="leg:prospective:one";
function fixture(){
 const entry:P5UnsignedPreReviewEntry={
  status:"ACTUAL_SOURCE_ELIGIBLE_FOR_EXTERNAL_REVIEW_NOT_SIGNED",
  source:{
   manifestSha256:H("1"),queryDigestSha256:H("2"),
   expectedSourcePopulationQueryId:uuid,
   expectedSourceResponseSha256:H("a"),
   runDayIndex:4,slot:"HUB",horizon:"T-6h",
   airportIcao:"WSSS",flightInstanceId:flight,
   expectedGithubSourceRunId:"42899999999",
   selectedTNativeUtc:selected,
   sourceMemberAvailableAtUtc:"2027-02-10T04:30:10.000Z",
   ownPreCutoffUtc:cutoff,
   expectedReviewedReleaseSha256:H("3"),
   expectedReviewedSourceRightsSha256:H("4"),
   expectedProviderContractSha256:H("5"),
   expectedEarlyDrawSha256:H("6")
  },
  sourceAuditSha256:H("b"),
  expectedSourceDayRegistrySha256:H("c"),
  requiredExternalReviews:{
   physicalOperatingLegIdentity:"NOT_CERTIFIED_BY_SOURCE_AUDIT",
   providerNativeScheduledTAndVersion:"NOT_CERTIFIED_BY_SOURCE_AUDIT",
   lawfulSourceContentPurposeAndRetention:"NOT_CERTIFIED_BY_SOURCE_AUDIT",
   independentStage14FrameAndConfig:"NOT_INCLUDED_IN_SOURCE_AUDIT",
   t24WitnessOrExplicitSeparatelyApprovedMissingT24:
    "UNRESOLVED_REVIEW_REQUIRED",
   phase5FreezeAndSeparatePaidPhase6Go:"NOT_GRANTED"
  }
 };
 const dossier:P5UnsignedNativePreDossier={
  schema:"v39.phase5.unsigned-native-pre-review-dossier.v1",
  status:"REAL_SOURCE_CANDIDATES_FOR_INDEPENDENT_REVIEW_NO_PACKET_SIGNED",
  sourceObservedDbClockUtc:"2027-02-10T05:00:00.000Z",
  reviewedMainCodeSha:code,sourceAuditSha256:H("b"),
  sourceDayRegistrySha256:H("c"),manifestSha256:H("1"),
  queryDigestSha256:H("2"),sourcePopulationQueryId:uuid,
  sourceResponseSha256:H("a"),sourceGithubRunId:"42899999999",
  runDayIndex:4,horizon:"T-6h",candidateCount:1,censoredCount:0,
  perFlightSourceMissingness:
   {ACTUAL_SOURCE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED:1} as
   P5UnsignedNativePreDossier["perFlightSourceMissingness"],
  entries:[entry],providerCalls:0,databaseReadsPerformedHere:0,
  databaseWrites:0,githubChildDispatches:0,signedPrePacketsIssued:0,
  legallyPermittedUseCertified:false,
  independentlyVerifiedPhysicalLegHere:false,
  independentSelectedNativeTReviewedHere:false,
  phase5FreezeGranted:false,phase6PaidGoGranted:false
 };
 const receiptBase:Omit<P5Stage24ReviewedT24Receipt,"receiptSha256">={
  schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1",
  snapshotId:"1001",flightInstanceId:flight,
  selectedTNativeUtc:selected,
  frozenT24CutoffUtc:"2027-02-09T12:00:00.000Z",
  expectedSelectedTVersion:"departure.scheduledTime.utc:v1:"+H("d"),
  t24OriginalFidsSha256:H("f"),
  t24SourceQueryDigestSha256:H("0"),
  t24FrameSha256:H("8"),t24ConfigSha256:H("9"),
  witnessDbObservedAtUtc:"2027-02-09T11:58:00.000Z",
  stage17PostCommitReadbackAtUtc:"2027-02-09T11:58:30.000Z"
 };
 const receipt:P5Stage24ReviewedT24Receipt={
  ...receiptBase,
  receiptSha256:digestP5Stage24ReviewedReceipt(receiptBase)
 };
 const review:P5ExternalNativeLaterPreReviewArtifact={
  schema:"v39.phase5.external-native-later-pre-packet-review.v1",
  reviewedCodeSha:code,
  reviewedSourceDossierSha256:digestP5UnsignedNativePreDossier(dossier),
  reviewedSourceAuditSha256:dossier.sourceAuditSha256,
  reviewedSourceDayRegistrySha256:dossier.sourceDayRegistrySha256,
  reviewedFlightInstanceId:flight,
  reviewedQueryDigestSha256:H("2"),
  reviewedSourcePopulationQueryId:uuid,
  reviewedSourceOriginalResponseSha256:H("a"),
  reviewedSourceGithubRunId:"42899999999",
  reviewedRunDayIndex:4,
  reviewedHorizon:"T-6h",
  reviewedNativeScheduledTUtc:selected,
  reviewedOwnCutoffUtc:cutoff,
  reviewedAtUtc:"2027-02-10T05:10:00.000Z",
  independentlyReviewedOperatingLegEvidenceSha256:H("7"),
  independentlyReviewedNativeTEvidenceSha256:H("7"),
  independentlyReviewedRunAndRetentionEvidenceSha256:H("5"),
  reviewedFrameSha256:H("8"),reviewedConfigSha256:H("9"),
  frozenBuilderSha256:H("a"),
  builderFrozenAtUtc:"2027-02-10T04:00:00.000Z",
  selectedTConfig:{
   milestone:"departure.scheduledTime.utc",version:"v1",
   artifactHash:H("d"),verifiedProviderNativeSchedule:true,
   semanticsEvidenceSha256:H("7")
  },
  maxPopulationStalenessSeconds:7200,
  externalNativeTPhysicalLegAndSourceUseReviewed:true,
  reviewedT24WitnessReceipt:receipt
 };
 const bytes=Buffer.from(JSON.stringify(review));
 const pins:P5ExternalNativeLaterPacketPins={
  expectedDossierSha256:review.reviewedSourceDossierSha256,
  expectedReviewArtifactSha256:sha(bytes),
  expectedApprovedMainCodeSha:code,
  expectedReviewedReleaseSha256:H("3"),
  expectedReviewedSourceRightsSha256:H("4"),
  expectedSourceDayRegistrySha256:H("c"),
  expectedT24ReceiptSha256:receipt.receiptSha256
 };
 return{dossier,entry,review,bytes,pins};
}
function complete(f:ReturnType<typeof fixture>){
 return completeP5NativeLaterPrePacketForIndependentSigning(
  f.dossier,f.entry,f.bytes,f.review,f.pins);
}
describe("externally pinned SOURCE review → exact unsigned Stage14 later PRE bytes",()=>{
 it("creates byte-deterministic existing v1 witness packet but never self-signs or activates",()=>{
  const f=fixture(),result=complete(f);
  expect(result.packetSha256).toBe(sha(result.packetBytes));
  expect(result.packet.schema)
   .toBe("v39.phase5.github-witnessed-later-pre-reviewed.v1");
  expect(result.packet.prePermit.expectedSourcePopulationQueryId).toBe(uuid);
  expect(result.packet.prePermit.expectedSourceResponseSha256).toBe(H("a"));
  expect(result.packet.prePermit.expectedRestrictedPreWriterRole)
   .toBe(P5_STAGE28_GROUPS.pre);
  expect(result.packet.prePermit.selectedTNativeUtc).toBe(selected);
  expect(result.packet.prePermit.horizon).toBe("T-6h");
  expect(result.packet.prePermit.reviewedT24WitnessReceipt)
   .toEqual(f.review.reviewedT24WitnessReceipt);
  expect(result.signedProductionRegistryPublished).toBe(false);
  expect(result.phase6PaidGoGranted).toBe(false);
  expect(result.nativePhysicalFlightCertifiedByThisFunction).toBe(false);
  expect(result.providerCalls).toBe(0);
  expect(result.databaseWrites).toBe(0);
 });
 it("remains correct after parsing independent docket JSON into new object",()=>{
  const f=fixture();
  const copied=JSON.parse(JSON.stringify(f.entry)) as typeof f.entry;
  const r=completeP5NativeLaterPrePacketForIndependentSigning(
   f.dossier,copied,f.bytes,f.review,f.pins);
  expect(r.packetSha256).toBe(complete(f).packetSha256);
 });
 it("rejects a substituted signed artifact byte even when object fields look approved",()=>{
  const f=fixture();
  const altered=Buffer.from(f.bytes.toString()+" ");
  expect(()=>completeP5NativeLaterPrePacketForIndependentSigning(
   f.dossier,f.entry,altered,f.review,f.pins))
   .toThrow("INDEPENDENT_REVIEW_BYTES_OR_PROTECTED_PINS_MISSING");
  const changed={...f.review,reviewedFlightInstanceId:"leg:wrong:new"};
  expect(()=>completeP5NativeLaterPrePacketForIndependentSigning(
   f.dossier,f.entry,f.bytes,changed,f.pins))
   .toThrow("DOSSIER_BYTES_NOT_INDEPENDENTLY_REVIEWED_OR_ENTRY_AMBIGUOUS");
 });
 it("rejects future data as PRE or a retrospective review when all bytes are rehashed",()=>{
  const f=fixture();
  const r={...f.review,reviewedAtUtc:"2027-02-10T05:48:00.000Z"};
  const bytes=Buffer.from(JSON.stringify(r));
  expect(()=>completeP5NativeLaterPrePacketForIndependentSigning(
   f.dossier,f.entry,bytes,r,{
    ...f.pins,expectedReviewArtifactSha256:sha(bytes)
   })).toThrow("SOURCE_OR_REVIEW_RETROSPECTIVE_NATIVE_CUTOFF");
 });
 it("rejects native time, source response, and rights scope tampering",()=>{
  const f=fixture();
  for(const partial of [
   {reviewedNativeScheduledTUtc:"2027-02-10T12:03:00.000Z"},
   {reviewedSourceOriginalResponseSha256:H("f")},
   {reviewedSourcePopulationQueryId:
    "a23e4567-e89b-42d3-a456-426614174001"},
   {reviewedSourceDayRegistrySha256:H("d")}
  ]){
   const r={...f.review,...partial};
   const bytes=Buffer.from(JSON.stringify(r));
   expect(()=>completeP5NativeLaterPrePacketForIndependentSigning(
    f.dossier,f.entry,bytes,r,{
     ...f.pins,expectedReviewArtifactSha256:sha(bytes)
    })).toThrow("REVIEW_SCOPE_RIGHTS_NATIVE_FLIGHT_OR_SOURCE_CHANGED");
  }
 });
 it("accepts separately reviewed honest later PRE with T24 missing, never impersonates witness",()=>{
  const f=fixture();
  const v2:P5ExternalNativeLaterPreReviewArtifact={
   ...f.review,reviewedT24WitnessReceipt:undefined,
   reviewedStandaloneLaterNoT24:{
    schema:"v39.phase5.standalone-later-asof-no-t24.v1",
    reviewedProtocolSha256:H("e"),
    reviewedOriginalResponseSha256:H("a"),
    reviewedNativeTSemanticsSha256:H("7"),
    missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED",
    independentLaterAsOfAndMissingnessReviewAttested:true
   }
  };
  const bytes=Buffer.from(JSON.stringify(v2));
  const result=completeP5NativeLaterPrePacketForIndependentSigning(
   f.dossier,f.entry,bytes,v2,{
    ...f.pins,expectedReviewArtifactSha256:sha(bytes),
    expectedT24ReceiptSha256:undefined,
    separatelyApprovedNoT24ProtocolSha256:H("e")
   });
  expect(result.packet.schema)
   .toBe("v39.phase5.github-standalone-later-pre-asof-reviewed.v2");
  expect(result.t24EvidenceTier)
   .toBe("SEPARATELY_REVIEWED_T24_MISSING_NO_BACKFILL");
  expect(result.packet.prePermit.reviewedT24WitnessReceipt).toBeUndefined();
  expect(result.packet.prePermit.reviewedStandaloneLaterNoT24?.
   missingT24Class).toBe("HONEST_T24_UNOBSERVED_NOT_BACKFILLED");
 });
 it("refuses v2 without an independent separately pinned no-T24 amendment",()=>{
  const f=fixture();
  const review:P5ExternalNativeLaterPreReviewArtifact={
   ...f.review,reviewedT24WitnessReceipt:undefined,
   reviewedStandaloneLaterNoT24:{
    schema:"v39.phase5.standalone-later-asof-no-t24.v1",
    reviewedProtocolSha256:H("e"),
    reviewedOriginalResponseSha256:H("a"),
    reviewedNativeTSemanticsSha256:H("7"),
    missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED",
    independentLaterAsOfAndMissingnessReviewAttested:true
   }
  };
  const bytes=Buffer.from(JSON.stringify(review));
  expect(()=>completeP5NativeLaterPrePacketForIndependentSigning(
   f.dossier,f.entry,bytes,review,{
    ...f.pins,expectedReviewArtifactSha256:sha(bytes),
    expectedT24ReceiptSha256:undefined
   })).toThrow("STANDALONE_LATER_REQUIRES_SEPARATE_APPROVED_MISSING_T24_PROTOCOL");
 });
 it("refuses forged T24 receipt and mixed T24+missing-T24 v2",()=>{
  const f=fixture();
  const review={
   ...f.review,
   reviewedStandaloneLaterNoT24:{
    schema:"v39.phase5.standalone-later-asof-no-t24.v1" as const,
    reviewedProtocolSha256:H("e"),
    reviewedOriginalResponseSha256:H("a"),
    reviewedNativeTSemanticsSha256:H("7"),
    missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED" as const,
    independentLaterAsOfAndMissingnessReviewAttested:true as const
   }
  };
  const bytes=Buffer.from(JSON.stringify(review));
  expect(()=>completeP5NativeLaterPrePacketForIndependentSigning(
   f.dossier,f.entry,bytes,review,{
    ...f.pins,expectedReviewArtifactSha256:sha(bytes),
    separatelyApprovedNoT24ProtocolSha256:H("e")
   })).toThrow("REAL_T24_OR_EXPLICIT_MISSING_T24_REQUIRED_EXACTLY_ONCE");
  const bad={
   ...f.review,
   reviewedT24WitnessReceipt:{
    ...f.review.reviewedT24WitnessReceipt!,
    selectedTNativeUtc:"2027-02-10T12:03:00.000Z"
   }
  };
  const badBytes=Buffer.from(JSON.stringify(bad));
  expect(()=>completeP5NativeLaterPrePacketForIndependentSigning(
   f.dossier,f.entry,badBytes,bad,{
    ...f.pins,expectedReviewArtifactSha256:sha(badBytes)
   })).toThrow("INDEPENDENT_T24_RECEIPT_UNBOUND_OR_CHANGED");
 });
});

import {verifyP5CdFrozenRoster} from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";
function nativeT24Fixture(){
 const f=fixture();
 const own="2027-02-09T12:00:00.000Z";
 const entry:P5UnsignedPreReviewEntry={...f.entry,source:{...f.entry.source,horizon:"T-24h",ownPreCutoffUtc:own,
  sourceMemberAvailableAtUtc:"2027-02-09T10:30:00.000Z"}};
 const dossier:P5UnsignedNativePreDossier={...f.dossier,horizon:"T-24h",sourceObservedDbClockUtc:"2027-02-09T11:00:00.000Z",entries:[entry]};
 const {reviewedT24WitnessReceipt,reviewedStandaloneLaterNoT24,...common}=f.review;
 const review:P5ExternalNativeT24PreReviewArtifact={...common,schema:"v39.phase5.external-native-t24-pre-packet-review.v1",
  reviewedSourceDossierSha256:digestP5UnsignedNativePreDossier(dossier),reviewedHorizon:"T-24h",reviewedOwnCutoffUtc:own,
  reviewedAtUtc:"2027-02-09T11:10:00.000Z",builderFrozenAtUtc:"2027-02-09T04:00:00.000Z",
  independentT24WitnessProtocolReviewed:true,reviewedWitnessOnlyRole:P5_STAGE28_GROUPS.witness};
 const bytes=Buffer.from(JSON.stringify(review));
 const {expectedT24ReceiptSha256,separatelyApprovedNoT24ProtocolSha256,...p}=f.pins;
 const pins:P5ExternalNativeT24PacketPins={...p,expectedDossierSha256:digestP5UnsignedNativePreDossier(dossier),expectedReviewArtifactSha256:sha(bytes)};
 return {dossier,entry,review,bytes,pins};
}
describe("same reviewed source dossier to original T24 PRE + distinct V0081 witness packet",()=>{
 it("produces original genuine T24 packet format; never an already committed receipt",()=>{
  const f=nativeT24Fixture(),x=completeP5NativeT24PrePacketForIndependentSigning(f.dossier,f.entry,f.bytes,f.review,f.pins);
  expect(x.packet.schema).toBe("v39.phase5.github-native-t24-pre-witness-reviewed.v1");
  expect(x.packet.prePermit.horizon).toBe("T-24h");
  expect(x.packet.witnessReview.expectedT24CutoffUtc).toBe(f.entry.source.ownPreCutoffUtc);
  expect(x.packet.witnessReview.expectedWitnessOnlyRole).toBe(P5_STAGE28_GROUPS.witness);
  expect(x.packet.witnessReview.expectedWitnessOnlyRole).not.toBe(x.packet.prePermit.expectedRestrictedPreWriterRole);
  expect(x.packet.prePermit.reviewedT24WitnessReceipt).toBeUndefined();
  expect(x.packet.prePermit.reviewedStandaloneLaterNoT24).toBeUndefined();
  expect(x.packet.witnessReview).not.toHaveProperty("expectedSnapshotId");
  expect(x.packetSha256).toBe(sha(x.packetBytes));
  expect(x.actualT24WitnessReceiptIssued).toBe(false);expect(x.phase6PaidGoGranted).toBe(false);
  expect(Object.keys(x)).not.toContain("packetBytes");expect(JSON.stringify(x)).not.toContain(flight);
  const filePath="data-collection/phase5/frozen/t24_review_fixture0001.json";
  const roster={schema:"v39.phase5.cd-existing-signed-pre-packet-roster.v1" as const,reviewedCodeSha:code,
   manifestSha256:H("1"),rightsSha256:H("4"),entries:[{filePath,packetSha256:x.packetSha256}]};
  const raw=Buffer.from(JSON.stringify(roster)),files=[{filePath,packetSha256:x.packetSha256,bytes:x.packetBytes}];
  const gate={schema:"v39.phase5.cd-gh-pre-explicit-release.v1" as const,releaseMode:"PHASE6_APPROVED" as const,approvedCodeSha:code,manifestSha256:H("1"),rightsSha256:H("4"),rosterSha256:sha(raw),stop:false as const,providerCalls:0 as const,scientificFreezeEstablishedByThisFunction:false as const};
  expect(verifyP5CdFrozenRoster(raw,roster,files,gate,"T24_WITH_SEPARATE_WITNESS").size).toBe(1);
  expect(()=>verifyP5CdFrozenRoster(raw,roster,files,gate)).toThrow("T24_WITNESS_OR_STANDALONE");
 });
 it("rejects independently rehashed late/changed T24, shared witness role or fabricated preexisting receipt",()=>{
  const f=nativeT24Fixture();
  for(const r of [{...f.review,reviewedAtUtc:"2027-02-09T11:50:00.000Z"},
   {...f.review,reviewedNativeScheduledTUtc:"2027-02-10T12:01:00.000Z"},
   {...f.review,reviewedWitnessOnlyRole:P5_STAGE28_GROUPS.pre},
   {...f.review,reviewedT24WitnessReceipt:{fake:true}}]){
   const bytes=Buffer.from(JSON.stringify(r));
   expect(()=>completeP5NativeT24PrePacketForIndependentSigning(f.dossier,f.entry,bytes,r,
    {...f.pins,expectedReviewArtifactSha256:sha(bytes)})).toThrow();
  }
 });
 it("does not reinterpret T6/T90 source audit as T24",()=>{
  const f=nativeT24Fixture(),later=fixture();
  expect(()=>completeP5NativeT24PrePacketForIndependentSigning(later.dossier,later.entry,f.bytes,f.review,f.pins)).toThrow();
 });
});

import type {P5EReviewedSupplementalBundle} from "../server/lib/disruption/phase5AmendmentESignedSupplementalFeatures_v39";
describe("existing optional FIDS feature bundle remains inside independently reviewed native PRE packet bytes",()=>{
 function supplement(f:ReturnType<typeof fixture>|ReturnType<typeof nativeT24Fixture>){
  const s=f.entry.source;
  const observations:P5EReviewedSupplementalBundle["observations"]=[{
   flightInstanceId:s.flightInstanceId,field:"provider_revised_departure_utc",value:"2027-02-10T12:15:00.000Z",
   source:"AERODATABOX_FIDS",sourceRecordId:s.expectedSourceResponseSha256,observedAtUtc:s.sourceMemberAvailableAtUtc,
   availableAtUtc:s.sourceMemberAvailableAtUtc,rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"}];
  const bundle:P5EReviewedSupplementalBundle={schema:"v39.phase5.e-signed-source-supplement.v1",flightInstanceId:s.flightInstanceId,
   populationQueryId:s.expectedSourcePopulationQueryId,originalResponseSha256:s.expectedSourceResponseSha256,
   observationsSha256:sha(Buffer.from(JSON.stringify(observations))),externalSourceAndContentsReviewReceiptSha256:H("c"),
   fields:["provider_revised_departure_utc","reported_pre_departure_status"],observations};
  return bundle;
 }
 it("includes original reviewed values only when both independent feature and Contents receipt pins match",()=>{
  const f=fixture(),bundle=supplement(f),r={...f.review,reviewedSupplementalFeatureBundle:bundle};
  const bytes=Buffer.from(JSON.stringify(r)),pins={...f.pins,expectedReviewArtifactSha256:sha(bytes),
   expectedReviewedSupplementalFeatureBundleSha256:sha(Buffer.from(JSON.stringify(bundle))),expectedExternalSupplementalContentUseReviewSha256:H("c")};
  const x=completeP5NativeLaterPrePacketForIndependentSigning(f.dossier,f.entry,bytes,r,pins);
  expect(x.packet.prePermit.reviewedSupplementalFeatureBundle).toEqual(bundle);
  expect(x.packetSha256).toBe(sha(x.packetBytes));expect(x.phase6PaidGoGranted).toBe(false);
  expect(()=>completeP5NativeLaterPrePacketForIndependentSigning(f.dossier,f.entry,bytes,r,{...pins,
   expectedReviewedSupplementalFeatureBundleSha256:undefined})).toThrow("SUPPLEMENTAL_ORIGINAL_FEATURE_REVIEW_NOT_PINNED");
  expect(()=>completeP5NativeLaterPrePacketForIndependentSigning(f.dossier,f.entry,bytes,r,{...pins,
   expectedExternalSupplementalContentUseReviewSha256:H("d")})).toThrow("SUPPLEMENTAL_ORIGINAL_FEATURE_REVIEW_NOT_PINNED");
 });
 it("keeps identical optional feature support for T24 without creating a T24 witness",()=>{
  const f=nativeT24Fixture(),bundle=supplement(f),r={...f.review,reviewedSupplementalFeatureBundle:bundle};
  const bytes=Buffer.from(JSON.stringify(r)),pins={...f.pins,expectedReviewArtifactSha256:sha(bytes),
   expectedReviewedSupplementalFeatureBundleSha256:sha(Buffer.from(JSON.stringify(bundle))),expectedExternalSupplementalContentUseReviewSha256:H("c")};
  const x=completeP5NativeT24PrePacketForIndependentSigning(f.dossier,f.entry,bytes,r,pins);
  expect(x.packet.prePermit.reviewedSupplementalFeatureBundle).toEqual(bundle);expect(x.actualT24WitnessReceiptIssued).toBe(false);
 });
 it("rejects feature observations available after SOURCE member even when review and bundle bytes were rehashed",()=>{
  const f=fixture(),b=supplement(f);
  b.observations[0].availableAtUtc="2027-02-10T05:20:00.000Z";b.observationsSha256=sha(Buffer.from(JSON.stringify(b.observations)));
  const r={...f.review,reviewedSupplementalFeatureBundle:b},bytes=Buffer.from(JSON.stringify(r));
  expect(()=>completeP5NativeLaterPrePacketForIndependentSigning(f.dossier,f.entry,bytes,r,{...f.pins,
   expectedReviewArtifactSha256:sha(bytes),expectedReviewedSupplementalFeatureBundleSha256:sha(Buffer.from(JSON.stringify(b))),
   expectedExternalSupplementalContentUseReviewSha256:H("c")})).toThrow("FIDS_SUPPLEMENT_NOT_SAME_BOUND_ORIGINAL");
 });
});
