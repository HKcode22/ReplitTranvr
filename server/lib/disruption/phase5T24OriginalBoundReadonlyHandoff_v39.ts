/**
 * Phase5 SOURCE -> native T24 readiness: signed PRE packet + ACTUAL SQL rows.
 *
 * A durable provider original and an independently reviewed native scheduled
 * time must BOTH exist before an unattended T24 PRE/witness child can be
 * considered. This does NOT dispatch the child or assert legal/physical
 * truth. Existing Stage14/17 remains the only write path.
 */
import {createHash} from "node:crypto";
import {P5_STAGE28_GROUPS}
 from "./phase5Stage28DedicatedRolePool_v39";
import {verifyP5T24PreWitnessCrossReview}
 from "./phase5T24PreIndependentWitnessChain_v39";
import type {P5NativeT24SignedReleasePacket}
 from "../../../scripts/v39_phase5_one_signed_native_t24_pre_witness_github_owner_v39";

const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=(x:string):never=>{throw Error("REFUSED_P5_T24_SOURCE_HANDOFF_"+x);};
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
function utc(value:unknown):number{
 const date=value instanceof Date?value:typeof value==="string"?new Date(value):null;
 if(!date||!Number.isFinite(date.getTime()))fail("INVALID_REAL_DB_UTC_INSTANT");
 return date.getTime();
}
export interface P5T24ActualOriginalReadback{
 observedDbClockUtc:Date|string;
 effectiveRole:string;
 databaseName:string;
 transactionReadOnly:"on";
 originalRows:readonly Record<string,unknown>[];
 memberRows:readonly Record<string,unknown>[];
 priorSnapshotCount:number;
 priorWitnessCount:number;
}
export interface P5T24SourceReadinessPins{
 frozenPacketPath:string;
 expectedPacketSha256:string;
 expectedApprovedMainSha:string;
 expectedManifestSha256:string;
 expectedQueryDigestSha256:string;
 expectedReleaseSha256:string;
 expectedRightsSha256:string;
 expectedFrameSha256:string;
 expectedConfigSha256:string;
 expectedNativeSemanticsSha256:string;
}
export type P5T24SourceReadinessStatus=
 "SIGNED_T24_READY_FOR_DISTINCT_WITNESS_CHILD_NO_DISPATCH"|
 "SIGNED_T24_NOT_YET_WITHIN_90_MINUTE_LEAD"|
 "SIGNED_T24_CUTOFF_TOO_CLOSE_FOR_SCHEDULED_DISPATCH"|
 "SIGNED_T24_CUTOFF_MISSED_CENSOR_NO_BACKFILL"|
 "SIGNED_T24_SOURCE_ORIGINAL_NOT_YET_BOUND"|
 "SIGNED_T24_SOURCE_INVALID_OR_EXPIRED_HOLD"|
 "SIGNED_T24_PRE_EXISTS_WITNESS_UNCERTAIN_NO_REPLAY"|
 "SIGNED_T24_ALREADY_COMMITTED_AND_WITNESSED_NO_REDISPATCH";
export interface P5T24ActualSourceHandoffDecision{
 schema:"v39.phase5.native-t24-bound-original-db-readonly-handoff.v1";
 status:P5T24SourceReadinessStatus;
 reviewedFrozenPacketSha256:string;
 manifestSha256:string;queryDigestSha256:string;
 runDayIndex:number;flightInstanceId:string;
 sourcePopulationQueryId:string;
 selectedNativeScheduledT:string;
 selectedT24CutoffUtc:string;
 observedDbClockUtc:string;
 originalRowCount:number;memberRowCount:number;
 existingT24Snapshots:number;existingT24Witnesses:number;
 providerCalls:0;productionDatabaseWrites:0;githubChildDispatches:0;
 nativePhysicalLegCertifiedByThisReadback:false;
 legalSourceRightsCertifiedByThisReadback:false;
 phase5ScientificFreezeCertifiedHere:false;
 phase6PaidGoGrantedHere:false;
}
export function reviewP5OneNativeT24RealSourceHandoff(
 bytes:Buffer,
 packet:P5NativeT24SignedReleasePacket,
 pins:P5T24SourceReadinessPins,
 actual:P5T24ActualOriginalReadback
):P5T24ActualSourceHandoffDecision{
 if(!pins||!PATH.test(pins.frozenPacketPath??"")||
    !CODE.test(pins.expectedApprovedMainSha??"")||
    ![pins.expectedPacketSha256,pins.expectedManifestSha256,
      pins.expectedQueryDigestSha256,pins.expectedReleaseSha256,
      pins.expectedRightsSha256,pins.expectedFrameSha256,
      pins.expectedConfigSha256,pins.expectedNativeSemanticsSha256]
      .every(x=>typeof x==="string"&&SHA.test(x))||
    !Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>200000||
    hash(bytes)!==pins.expectedPacketSha256)
   fail("FROZEN_PRE_PACKET_NOT_BYTE_AUTHENTICATED");
 const pre=packet?.prePermit,review=packet?.witnessReview;
 if(!packet||
    packet.schema!=="v39.phase5.github-native-t24-pre-witness-reviewed.v1"||
    packet.independentNativeT24AndSourceReviewAttested!==true||
    packet.reviewedCodeSha!==pins.expectedApprovedMainSha||
    !pre||!review||pre.horizon!=="T-24h"||
    pre.identityEvidenceTier==="CONDITIONAL_QUERY_FILTERED_SERVICE"||
    pre.externalNativeTPhysicalLegAndSourceUseReviewed!==true||
    pre.manifestSha256!==pins.expectedManifestSha256||
    pre.queryDigestSha256!==pins.expectedQueryDigestSha256||
    pre.expectedReviewedReleaseSha256!==pins.expectedReleaseSha256||
    pre.expectedReviewedSourceRightsSha256!==pins.expectedRightsSha256||
    pre.reviewedFrameSha256!==pins.expectedFrameSha256||
    pre.reviewedConfigSha256!==pins.expectedConfigSha256||
    pre.independentlyReviewedNativeTEvidenceSha256!==pins.expectedNativeSemanticsSha256||
    pre.selectedTConfig?.verifiedProviderNativeSchedule!==true||
    pre.selectedTConfig?.semanticsEvidenceSha256!==pins.expectedNativeSemanticsSha256||
    pre.expectedRestrictedPreWriterRole!==P5_STAGE28_GROUPS.pre||
    review.expectedWitnessOnlyRole!==P5_STAGE28_GROUPS.witness||
    !UUID.test(pre.expectedSourcePopulationQueryId??"")||
    !/^[0-9]{5,25}$/.test(pre.expectedGithubSourceRunId??"")||
    !/^[A-Z]{4}$/.test(pre.airportIcao??""))
   fail("UNREVIEWED_NATIVE_T_SOURCE_WITNESS_OR_RELEASE");
 verifyP5T24PreWitnessCrossReview(pre,review);
 const selectedT=utc(pre.selectedTNativeUtc),
       cutoff=selectedT-24*3600_000;
 if(!Number.isFinite(cutoff)||
    cutoff!==utc(review.expectedT24CutoffUtc)||
    !actual||actual.effectiveRole!==P5_STAGE28_GROUPS.pre||
    actual.databaseName!=="neondb"||
    actual.transactionReadOnly!=="on"||
    !Array.isArray(actual.originalRows)||
    !Array.isArray(actual.memberRows)||
    actual.originalRows.length>1||actual.memberRows.length>1||
    !Number.isInteger(actual.priorSnapshotCount)||
    !Number.isInteger(actual.priorWitnessCount)||
    actual.priorSnapshotCount<0||actual.priorSnapshotCount>2||
    actual.priorWitnessCount<0||actual.priorWitnessCount>2)
   fail("UNTRUSTED_DB_ROLE_OR_SOURCE_MULTIPLICITY");
 const now=utc(actual.observedDbClockUtc);
 let status:P5T24SourceReadinessStatus;
 if(actual.priorSnapshotCount>1||actual.priorWitnessCount>1||
    actual.priorWitnessCount>actual.priorSnapshotCount)
   fail("DUPLICATE_OR_ORPHANED_T24_WITNESS_RECORD");
 if(actual.priorSnapshotCount===1&&actual.priorWitnessCount===1)
   status="SIGNED_T24_ALREADY_COMMITTED_AND_WITNESSED_NO_REDISPATCH";
 else if(actual.priorSnapshotCount===1||actual.priorWitnessCount===1)
   status="SIGNED_T24_PRE_EXISTS_WITNESS_UNCERTAIN_NO_REPLAY";
 else if(now>=cutoff)
   status="SIGNED_T24_CUTOFF_MISSED_CENSOR_NO_BACKFILL";
 else if(actual.originalRows.length===0||actual.memberRows.length===0)
   status="SIGNED_T24_SOURCE_ORIGINAL_NOT_YET_BOUND";
 else{
  const a=actual.originalRows[0],m=actual.memberRows[0];
  const eq:Record<string,string|number>={
   manifest_sha256:pre.manifestSha256,
   query_digest:pre.queryDigestSha256,
   run_day_index:pre.runDayIndex,
   slot_id:pre.slot,horizon:pre.horizon,airport_icao:pre.airportIcao,
   github_run_id:pre.expectedGithubSourceRunId,
   attempt_run_id:pre.expectedGithubSourceRunId,
   state:"ACTIVE",
   early_draw_sha256:pre.expectedEarlyDrawSha256,
   reviewed_release_sha256:pre.expectedReviewedReleaseSha256,
   rights_review_sha256:pre.expectedReviewedSourceRightsSha256,
   provider_contract_sha256:pre.expectedProviderContractSha256,
   population_query_id:pre.expectedSourcePopulationQueryId,
   original_response_hash:pre.expectedSourceResponseSha256,
   fids_response_hash:pre.expectedSourceResponseSha256,
   fids_airport_icao:pre.airportIcao,
   bound_rights:pre.expectedReviewedSourceRightsSha256
  };
  const memberValid=
   m.population_query_id===pre.expectedSourcePopulationQueryId&&
   m.analytic_identity_id===pre.flightInstanceId&&
   m.canonical_flight_instance_id===pre.flightInstanceId&&
   m.source_airport_icao===pre.airportIcao&&
   m.dep_airport_icao===pre.airportIcao&&
   m.population_role==="requested_airport_primary"&&
   m.scope_classification==="confirmed_core"&&
   m.codeshare_resolution_status==="confirmed_operating_leg"&&
   m.source_type==="fids"&&
   m.response_hash===pre.expectedSourceResponseSha256&&
   m.provider_content_expired_at_utc===null&&
   Boolean(m.population_member_id)&&
   utc(m.dep_scheduled_utc)===selectedT;
  const sourceTimesOk=
   utc(a.reserved_at)<=utc(a.fids_retrieval_utc)&&
   utc(a.fids_retrieval_utc)<=utc(a.raw_persisted_at_utc)&&
   utc(a.raw_persisted_at_utc)<=utc(a.source_available)&&
   utc(a.source_available)<=utc(a.bound_at_utc)&&
   utc(a.bound_at_utc)<=now&&
   utc(a.source_available)<=cutoff&&
   utc(a.source_expires_at_utc)>cutoff&&
   utc(a.source_expires_at_utc)>now&&
   cutoff-utc(a.source_available)<=pre.maxPopulationStalenessSeconds*1000&&
   utc(m.available_at)>=utc(a.source_available)&&
   utc(m.available_at)<=cutoff;
  const sourceValid=Object.entries(eq).every(([key,value])=>a[key]===value)&&
    a.original_current===true&&
    Number(a.normalized_members_count)>=1&&
    memberValid&&sourceTimesOk&&
    utc(a.service_window_start_utc)<=selectedT&&
    selectedT<utc(a.service_window_end_utc);
  if(!sourceValid)
    status="SIGNED_T24_SOURCE_INVALID_OR_EXPIRED_HOLD";
  else if(cutoff-now>90*60000)
    status="SIGNED_T24_NOT_YET_WITHIN_90_MINUTE_LEAD";
  else if(cutoff-now<=15*60000)
    status="SIGNED_T24_CUTOFF_TOO_CLOSE_FOR_SCHEDULED_DISPATCH";
  else
    status="SIGNED_T24_READY_FOR_DISTINCT_WITNESS_CHILD_NO_DISPATCH";
 }
 return{
  schema:"v39.phase5.native-t24-bound-original-db-readonly-handoff.v1",
  status,reviewedFrozenPacketSha256:pins.expectedPacketSha256,
  manifestSha256:pre.manifestSha256,
  queryDigestSha256:pre.queryDigestSha256,
  runDayIndex:pre.runDayIndex,
  flightInstanceId:pre.flightInstanceId,
  sourcePopulationQueryId:pre.expectedSourcePopulationQueryId,
  selectedNativeScheduledT:new Date(selectedT).toISOString(),
  selectedT24CutoffUtc:new Date(cutoff).toISOString(),
  observedDbClockUtc:new Date(now).toISOString(),
  originalRowCount:actual.originalRows.length,
  memberRowCount:actual.memberRows.length,
  existingT24Snapshots:actual.priorSnapshotCount,
  existingT24Witnesses:actual.priorWitnessCount,
  providerCalls:0,productionDatabaseWrites:0,githubChildDispatches:0,
  nativePhysicalLegCertifiedByThisReadback:false,
  legalSourceRightsCertifiedByThisReadback:false,
  phase5ScientificFreezeCertifiedHere:false,
  phase6PaidGoGrantedHere:false
 };
}
