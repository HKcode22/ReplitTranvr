/**
 * Phase5 independently reviewed, but still UNSIGNED, later PRE packet
 * completion from a true post-COMMIT SOURCE candidate dossier (#558).
 *
 * Offline pure byte assembler only. Does not independently decide legal
 * Contents use, physical operating-leg identity, provider-native selected T,
 * rightful retention, private review ownership, freeze or paid Phase6 GO.
 * Those must be independently authenticated in a separately SHA-pinned
 * external review artifact and later approved signed GitHub registry/secret.
 *
 * No provider, network, file IO, role grant, database read/write, GitHub
 * child dispatch or clock substitution. Existing #552/#557 Stage14 performs
 * actual DB-clock source/member/T24/own cutoff and POST-COMMIT enforcement.
 */
import {createHash} from "node:crypto";
import type {P5UnsignedNativePreDossier,
 P5UnsignedPreReviewEntry}
 from "./phase5SourceBoundUnsignedPreDossier_v39";
import {digestP5UnsignedNativePreDossier}
 from "./phase5SourceBoundUnsignedPreDossier_v39";
import type {P5Stage14SingleFlightPrePermit}
 from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {P5_STAGE28_GROUPS}
 from "./phase5Stage28DedicatedRolePool_v39";
import {digestP5Stage24ReviewedReceipt,
 type P5Stage24ReviewedT24Receipt}
 from "./phase5T24WitnessedLaterHorizonGuard_v39";
import type {P5StandaloneLaterNoT24Review}
 from "./phase5StandaloneLaterPreWithoutT24Decision_v39";
import type {SelectedTMilestoneConfig}
 from "./preSnapshotBuilder_v3";
import type {P5SignedWitnessedLaterPrePacket}
 from "../../../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39";

const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const hold=(reason:string):never=>{
 throw Error("REFUSED_P5_INDEPENDENT_LATER_PACKET_"+reason);
};
const digest=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
function time(s:unknown):number{
 if(typeof s!=="string"||!ISO.test(s)||
    !Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)
  hold("INVALID_SOURCE_OR_REVIEW_NATIVE_UTC");
 return Date.parse(s as string);
}
export interface P5ExternalNativeLaterPreReviewArtifact{
 schema:"v39.phase5.external-native-later-pre-packet-review.v1";
 reviewedCodeSha:string;
 reviewedSourceDossierSha256:string;
 reviewedSourceAuditSha256:string;
 reviewedSourceDayRegistrySha256:string;
 reviewedFlightInstanceId:string;
 reviewedQueryDigestSha256:string;
 reviewedSourcePopulationQueryId:string;
 reviewedSourceOriginalResponseSha256:string;
 reviewedSourceGithubRunId:string;
 reviewedRunDayIndex:number;
 reviewedHorizon:"T-6h"|"T-90m";
 reviewedNativeScheduledTUtc:string;
 reviewedOwnCutoffUtc:string;
 reviewedAtUtc:string;
 independentlyReviewedOperatingLegEvidenceSha256:string;
 independentlyReviewedNativeTEvidenceSha256:string;
 independentlyReviewedRunAndRetentionEvidenceSha256:string;
 reviewedFrameSha256:string;
 reviewedConfigSha256:string;
 frozenBuilderSha256:string;
 builderFrozenAtUtc:string;
 selectedTConfig:SelectedTMilestoneConfig;
 maxPopulationStalenessSeconds:number;
 externalNativeTPhysicalLegAndSourceUseReviewed:true;
 /** Exactly one of these two evidence tiers, no silent T24 substitution. */
 reviewedT24WitnessReceipt?:P5Stage24ReviewedT24Receipt;
 reviewedStandaloneLaterNoT24?:P5StandaloneLaterNoT24Review;
}
export interface P5ExternalNativeLaterPacketPins{
 expectedDossierSha256:string;
 expectedReviewArtifactSha256:string;
 expectedApprovedMainCodeSha:string;
 expectedReviewedReleaseSha256:string;
 expectedReviewedSourceRightsSha256:string;
 expectedSourceDayRegistrySha256:string;
 expectedT24ReceiptSha256?:string;
 separatelyApprovedNoT24ProtocolSha256?:string;
}
export interface P5ReviewReadyLaterPrePacketBytes{
 schema:"v39.phase5.review-ready-native-later-pre-packet-unsigned.v1";
 status:"PACKET_BYTES_NEED_EXTERNAL_FROZEN_REGISTRY_SHA_APPROVAL_NOT_GO";
 reviewArtifactSha256:string;
 sourceDossierSha256:string;
 sourceAuditSha256:string;
 sourceDayRegistrySha256:string;
 reviewedCodeSha:string;
 packetSha256:string;
 packetBytes:Buffer;
 packet:P5SignedWitnessedLaterPrePacket;
 horizon:"T-6h"|"T-90m";
 t24EvidenceTier:"REVIEWED_REAL_T24_RECEIPT"|
  "SEPARATELY_REVIEWED_T24_MISSING_NO_BACKFILL";
 sourceContentsLawfulUseCertifiedByThisFunction:false;
 nativePhysicalFlightCertifiedByThisFunction:false;
 signedProductionRegistryPublished:false;
 phase5ScientificFreezeGranted:false;
 phase6PaidGoGranted:false;
 providerCalls:0;
 databaseWrites:0;
 githubDispatches:0;
}
/** Does not grant source-use permissions. It verifies a separately pinned
 * REVIEW ARTIFACT exact byte digest, then assembles bytes which *still*
 * require an independently pinned signed production registry and all
 * downstream active-GO gates before any Stage14 write. */
export function completeP5NativeLaterPrePacketForIndependentSigning(
 dossier:P5UnsignedNativePreDossier,
 entry:P5UnsignedPreReviewEntry,
 reviewBytes:Buffer,
 review:P5ExternalNativeLaterPreReviewArtifact,
 pins:P5ExternalNativeLaterPacketPins
):P5ReviewReadyLaterPrePacketBytes{
 if(!pins||!
    [pins.expectedDossierSha256,pins.expectedReviewArtifactSha256,
     pins.expectedReviewedReleaseSha256,
     pins.expectedReviewedSourceRightsSha256,
     pins.expectedSourceDayRegistrySha256].every(x=>
      typeof x==="string"&&SHA.test(x))||
    !CODE.test(pins.expectedApprovedMainCodeSha??"")||
    !Buffer.isBuffer(reviewBytes)||reviewBytes.length<100||
    reviewBytes.length>200000||
    digest(reviewBytes)!==pins.expectedReviewArtifactSha256)
  hold("INDEPENDENT_REVIEW_BYTES_OR_PROTECTED_PINS_MISSING");
 let parsed:P5ExternalNativeLaterPreReviewArtifact;
 try{parsed=JSON.parse(reviewBytes.toString("utf8")) as
    P5ExternalNativeLaterPreReviewArtifact;}
 catch{return hold("REVIEW_ARTIFACT_NOT_JSON");}
 if(JSON.stringify(parsed)!==JSON.stringify(review)||
    !dossier||dossier.schema!==
     "v39.phase5.unsigned-native-pre-review-dossier.v1"||
    dossier.status!==
     "REAL_SOURCE_CANDIDATES_FOR_INDEPENDENT_REVIEW_NO_PACKET_SIGNED"||
    dossier.signedPrePacketsIssued!==0||
    dossier.legallyPermittedUseCertified!==false||
    dossier.phase5FreezeGranted!==false||
    dossier.phase6PaidGoGranted!==false||
    digestP5UnsignedNativePreDossier(dossier)!==
     pins.expectedDossierSha256||
    !Array.isArray(dossier.entries)||
    !entry||entry.status!==
      "ACTUAL_SOURCE_ELIGIBLE_FOR_EXTERNAL_REVIEW_NOT_SIGNED"||
    dossier.entries.filter(e=>e.source.flightInstanceId===
      entry.source.flightInstanceId&&
      e.source.horizon===entry.source.horizon).length!==1||
    !dossier.entries.some(e=>JSON.stringify(e)===JSON.stringify(entry)))
  hold("DOSSIER_BYTES_NOT_INDEPENDENTLY_REVIEWED_OR_ENTRY_AMBIGUOUS");
 const s=entry.source;
 if(!s||!["T-6h","T-90m"].includes(s.horizon)||
    review?.schema!=="v39.phase5.external-native-later-pre-packet-review.v1"||
    review.reviewedCodeSha!==pins.expectedApprovedMainCodeSha||
    review.reviewedCodeSha!==dossier.reviewedMainCodeSha||
    review.reviewedSourceDossierSha256!==pins.expectedDossierSha256||
    review.reviewedSourceAuditSha256!==dossier.sourceAuditSha256||
    review.reviewedSourceDayRegistrySha256!==
     pins.expectedSourceDayRegistrySha256||
    review.reviewedSourceDayRegistrySha256!==dossier.sourceDayRegistrySha256||
    review.reviewedFlightInstanceId!==s.flightInstanceId||
    review.reviewedQueryDigestSha256!==s.queryDigestSha256||
    review.reviewedSourcePopulationQueryId!==
     s.expectedSourcePopulationQueryId||
    review.reviewedSourceOriginalResponseSha256!==
     s.expectedSourceResponseSha256||
    review.reviewedSourceGithubRunId!==s.expectedGithubSourceRunId||
    review.reviewedRunDayIndex!==s.runDayIndex||
    review.reviewedHorizon!==s.horizon||
    review.reviewedNativeScheduledTUtc!==s.selectedTNativeUtc||
    review.reviewedOwnCutoffUtc!==s.ownPreCutoffUtc||
    pins.expectedReviewedReleaseSha256!==s.expectedReviewedReleaseSha256||
    pins.expectedReviewedSourceRightsSha256!==
     s.expectedReviewedSourceRightsSha256||
    review.externalNativeTPhysicalLegAndSourceUseReviewed!==true||
    ![
     review.independentlyReviewedOperatingLegEvidenceSha256,
     review.independentlyReviewedNativeTEvidenceSha256,
     review.independentlyReviewedRunAndRetentionEvidenceSha256,
     review.reviewedFrameSha256,review.reviewedConfigSha256,
     review.frozenBuilderSha256].every(x=>typeof x==="string"&&SHA.test(x))||
    !Number.isSafeInteger(review.maxPopulationStalenessSeconds)||
    review.maxPopulationStalenessSeconds<1||
    review.maxPopulationStalenessSeconds>86400)
  hold("REVIEW_SCOPE_RIGHTS_NATIVE_FLIGHT_OR_SOURCE_CHANGED");
 const selected=time(s.selectedTNativeUtc);
 const cutoff=time(s.ownPreCutoffUtc);
 const reviewed=time(review.reviewedAtUtc);
 const builderFrozen=time(review.builderFrozenAtUtc);
 const memberAvailable=time(s.sourceMemberAvailableAtUtc);
 const audited=time(dossier.sourceObservedDbClockUtc);
 if(selected-cutoff!==(s.horizon==="T-6h"?21600_000:5400_000)||
    reviewed<audited||reviewed>=cutoff-15*60000||
    memberAvailable>audited||memberAvailable>cutoff||
    builderFrozen>reviewed||builderFrozen>cutoff)
  hold("SOURCE_OR_REVIEW_RETROSPECTIVE_NATIVE_CUTOFF");
 const cfg=review.selectedTConfig;
 if(!cfg||cfg.verifiedProviderNativeSchedule!==true||
    cfg.milestone!=="departure.scheduledTime.utc"||
    !cfg.version?.trim()||
    !SHA.test(cfg.artifactHash??"")||
    cfg.semanticsEvidenceSha256!==
     review.independentlyReviewedNativeTEvidenceSha256)
  hold("REVIEWED_SELECTED_NATIVE_T_SEMANTICS_NOT_BINDING");
 const witness=review.reviewedT24WitnessReceipt;
 const standalone=review.reviewedStandaloneLaterNoT24;
 if(Boolean(witness)===Boolean(standalone))
  hold("REAL_T24_OR_EXPLICIT_MISSING_T24_REQUIRED_EXACTLY_ONCE");
 let schema:P5SignedWitnessedLaterPrePacket["schema"];
 let evidenceTier:P5ReviewReadyLaterPrePacketBytes["t24EvidenceTier"];
 if(witness){
  const receiptVersion=
   cfg.milestone+":"+cfg.version+":"+cfg.artifactHash;
  if(!SHA.test(pins.expectedT24ReceiptSha256??"")||
     pins.separatelyApprovedNoT24ProtocolSha256!==undefined||
     witness.schema!==
       "v39.phase5.stage24.externally-reviewed-stage17-receipt.v1"||
     witness.receiptSha256!==pins.expectedT24ReceiptSha256||
     digestP5Stage24ReviewedReceipt(witness)!==witness.receiptSha256||
     witness.flightInstanceId!==s.flightInstanceId||
     witness.selectedTNativeUtc!==s.selectedTNativeUtc||
     witness.frozenT24CutoffUtc!==
      new Date(selected-24*3600_000).toISOString()||
     witness.expectedSelectedTVersion!==receiptVersion||
     witness.t24FrameSha256!==review.reviewedFrameSha256||
     witness.t24ConfigSha256!==review.reviewedConfigSha256)
   hold("INDEPENDENT_T24_RECEIPT_UNBOUND_OR_CHANGED");
  schema="v39.phase5.github-witnessed-later-pre-reviewed.v1";
  evidenceTier="REVIEWED_REAL_T24_RECEIPT";
 }else{
  if(!standalone||
     pins.expectedT24ReceiptSha256!==undefined||
     !SHA.test(pins.separatelyApprovedNoT24ProtocolSha256??"")||
     standalone.reviewedProtocolSha256!==
      pins.separatelyApprovedNoT24ProtocolSha256||
     standalone.schema!=="v39.phase5.standalone-later-asof-no-t24.v1"||
     standalone.reviewedOriginalResponseSha256!==
      s.expectedSourceResponseSha256||
     standalone.reviewedNativeTSemanticsSha256!==
      review.independentlyReviewedNativeTEvidenceSha256||
     standalone.missingT24Class!==
      "HONEST_T24_UNOBSERVED_NOT_BACKFILLED"||
     standalone.independentLaterAsOfAndMissingnessReviewAttested!==true)
   hold("STANDALONE_LATER_REQUIRES_SEPARATE_APPROVED_MISSING_T24_PROTOCOL");
  schema="v39.phase5.github-standalone-later-pre-asof-reviewed.v2";
  evidenceTier="SEPARATELY_REVIEWED_T24_MISSING_NO_BACKFILL";
 }
 const prePermit:P5Stage14SingleFlightPrePermit={
  manifestSha256:s.manifestSha256,
  queryDigestSha256:s.queryDigestSha256,
  expectedSourcePopulationQueryId:s.expectedSourcePopulationQueryId,
  expectedSourceResponseSha256:s.expectedSourceResponseSha256,
  runDayIndex:s.runDayIndex,slot:s.slot,horizon:s.horizon,
  airportIcao:s.airportIcao,
  flightInstanceId:s.flightInstanceId,
  expectedGithubSourceRunId:s.expectedGithubSourceRunId,
  expectedReviewedReleaseSha256:s.expectedReviewedReleaseSha256,
  expectedReviewedSourceRightsSha256:s.expectedReviewedSourceRightsSha256,
  expectedProviderContractSha256:s.expectedProviderContractSha256,
  expectedEarlyDrawSha256:s.expectedEarlyDrawSha256,
  reviewedFrameSha256:review.reviewedFrameSha256,
  reviewedConfigSha256:review.reviewedConfigSha256,
  independentlyReviewedOperatingLegEvidenceSha256:
   review.independentlyReviewedOperatingLegEvidenceSha256,
  independentlyReviewedNativeTEvidenceSha256:
   review.independentlyReviewedNativeTEvidenceSha256,
  independentlyReviewedRunAndRetentionEvidenceSha256:
   review.independentlyReviewedRunAndRetentionEvidenceSha256,
  frozenBuilderSha256:review.frozenBuilderSha256,
  builderFrozenAtUtc:review.builderFrozenAtUtc,
  selectedTConfig:review.selectedTConfig,
  selectedTNativeUtc:s.selectedTNativeUtc,
  maxPopulationStalenessSeconds:review.maxPopulationStalenessSeconds,
  expectedRestrictedPreWriterRole:P5_STAGE28_GROUPS.pre,
  externalNativeTPhysicalLegAndSourceUseReviewed:true,
  identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG",
  ...(witness?{reviewedT24WitnessReceipt:witness}:
              {reviewedStandaloneLaterNoT24:standalone})
 };
 const packet:P5SignedWitnessedLaterPrePacket={
  schema,
  reviewedCodeSha:pins.expectedApprovedMainCodeSha,
  ...(witness?{independentLaterHorizonAndT24ReviewAttested:true}:
              {independentlyReviewedLaterWithoutT24AsOfAttested:true}),
  prePermit
 };
 const packetBytes=Buffer.from(JSON.stringify(packet),"utf8");
 if(packetBytes.length<100||packetBytes.length>200000)
  hold("UNBOUNDED_COMPLETED_REVIEW_PACKET");
 return{
  schema:"v39.phase5.review-ready-native-later-pre-packet-unsigned.v1",
  status:"PACKET_BYTES_NEED_EXTERNAL_FROZEN_REGISTRY_SHA_APPROVAL_NOT_GO",
  reviewArtifactSha256:pins.expectedReviewArtifactSha256,
  sourceDossierSha256:pins.expectedDossierSha256,
  sourceAuditSha256:dossier.sourceAuditSha256,
  sourceDayRegistrySha256:dossier.sourceDayRegistrySha256,
  reviewedCodeSha:pins.expectedApprovedMainCodeSha,
  packetSha256:digest(packetBytes),packetBytes,packet,
  horizon:s.horizon,t24EvidenceTier:evidenceTier,
  sourceContentsLawfulUseCertifiedByThisFunction:false,
  nativePhysicalFlightCertifiedByThisFunction:false,
  signedProductionRegistryPublished:false,
  phase5ScientificFreezeGranted:false,phase6PaidGoGranted:false,
  providerCalls:0,databaseWrites:0,githubDispatches:0
 };
}
