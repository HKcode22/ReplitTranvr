/**
 * One genuine V0079 bound FIDS original -> EXISTING V0087 task registration.
 * Reuses the already LIVE V0091 SECURITY DEFINER function and restricted
 * Stage30 PREPARE role. This module NEVER directly INSERTs queue tasks.
 *
 * A SHA and source-review flag are not a legal licence: external review
 * is required by the signed GitHub release and documented separately.
 * Exact packet bytes and full Stage14 permit are validated BEFORE SQL.
 */
import type {P5CdTaskExecutor} from "./phase5CdDurableQueueClient_v39";
import {preflightP5Stage14ReviewedPermitV39}
 from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {digestP5Stage24ReviewedReceipt}
 from "./phase5T24WitnessedLaterHorizonGuard_v39";
import {
 verifyP5CdFrozenRoster,type P5CdFrozenRoster,
 type P5CdFrozenRosterEntry,type P5CdVerifiedTaskPacket
} from "./phase5CdGithubBoundedPreTick_v39";
import {
 requireP5CdGithubSourceEnrollRelease,
 type P5CdGithubSourceEnrollRelease
} from "./phase5CdGithubSourceEnrollGate_v39";

const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const fail=(s:string):never=>{
 throw Error("REFUSED_P5_CD_GH_SOURCE_ENROLL_"+s);
};
export interface P5CdSourceEnrollEvidence{
 schema:"v39.phase5.cd-v0091-one-source-future-flight-enrollment.v1";
 status:"REGISTERED_RETURNED_TASK_ID_INDEPENDENT_READBACK_PENDING";
 taskId:string;
 horizon:"T-6h"|"T-90m";
 flightInstanceId:string;
 nativeTUtc:string;
 frozenPacketSha256:string;
 sourceResponseSha256:string;
 providerCalls:0;
 taskEnrollmentsRequested:1;
 independentDatabaseReadbackHere:false;
 futureSourceRightsIndependentlyCertifiedHere:false;
 phase5FreezeGrantedHere:false;
 phase6PaidGoGrantedHere:false;
}
export function verifyP5CdOneFrozenSourceEnrollment(
 release:P5CdGithubSourceEnrollRelease,
 rawRoster:Buffer,roster:P5CdFrozenRoster,
 entries:P5CdFrozenRosterEntry[]
):P5CdVerifiedTaskPacket{
 const packets=verifyP5CdFrozenRoster(rawRoster,roster,entries,release);
 const selected=packets.get(release.packetSha256);
 if(!selected)return fail("SELECTED_PACKET_NOT_IN_EXACT_ROSTER");
 const p=selected.permit;
 if(p.horizon!=="T-6h"&&p.horizon!=="T-90m")
  fail("T24_REQUIRES_SEPARATE_STAGE17_WITNESS_CONTROLLER");
 if(p.expectedRestrictedPreWriterRole!==
    "phase5_fids_pre_writer_prod_20261107"||
    p.identityEvidenceTier==="CONDITIONAL_QUERY_FILTERED_SERVICE"||
    p.externalNativeTPhysicalLegAndSourceUseReviewed!==true||
    !p.reviewedT24WitnessReceipt||p.reviewedStandaloneLaterNoT24||
    !SHA.test(p.queryDigestSha256??"")||
    !UUID.test(p.expectedSourcePopulationQueryId??"")||
    !SHA.test(p.expectedSourceResponseSha256??"")||
    !SHA.test(p.expectedReviewedSourceRightsSha256??"")||
    p.expectedReviewedSourceRightsSha256!==release.rightsSha256||
    p.manifestSha256!==release.manifestSha256||
    !Number.isSafeInteger(p.maxPopulationStalenessSeconds)||
    p.maxPopulationStalenessSeconds<1||p.maxPopulationStalenessSeconds>86_400)
  fail("V0091_PREPARE_NATIVE_LEG_OR_SIGNED_SOURCE_NOT_REVIEWED");
 // The digest is only an integrity check on the externally reviewed
 // Stage17 T24 receipt; Stage14 later verifies a REAL persisted V0081
 // witness in the serializable database transaction.
 const w=p.reviewedT24WitnessReceipt;
 if(w?.schema!==
    "v39.phase5.stage24.externally-reviewed-stage17-receipt.v1"||
    w.flightInstanceId!==p.flightInstanceId||
    w.selectedTNativeUtc!==p.selectedTNativeUtc||
    w.t24FrameSha256!==p.reviewedFrameSha256||
    w.t24ConfigSha256!==p.reviewedConfigSha256||
    w.expectedSelectedTVersion!==p.selectedTConfig.milestone+":"+
      p.selectedTConfig.version+":"+p.selectedTConfig.artifactHash||
    !SHA.test(w.receiptSha256??"")||
    digestP5Stage24ReviewedReceipt(w)!==w.receiptSha256)
   fail("EXTERNAL_T24_STAGE17_RECEIPT_DIGEST_OR_NATIVE_T_DRIFT");
 // Shares the ORIGINAL Stage14 transform/native-T/T24 evidence checks,
 // not a replacement copied preflight. SQL V0091 independently verifies
 // paid original/body, physical member, expiry and DB-clock cutoff.
 const native=preflightP5Stage14ReviewedPermitV39(p);
 if(native!==p.selectedTNativeUtc)
  fail("ORIGINAL_STAGE14_NATIVE_T_NOT_CANONICAL");
 return selected;
}
export async function registerOneP5CdGithubSourceFlightV39(
 env:NodeJS.ProcessEnv,
 db:P5CdTaskExecutor,
 verified:P5CdVerifiedTaskPacket
):Promise<P5CdSourceEnrollEvidence>{
 const release=requireP5CdGithubSourceEnrollRelease(env);
 if(!db||typeof db.query!=="function"||!verified||
    verified.packetSha256!==release.packetSha256)
  fail("DB_OR_EXACT_FROZEN_PACKET_MISSING");
 // This API intentionally takes only a PRE-validated packet. The
 // caller must invoke verifyP5CdOneFrozenSourceEnrollment before DB
 // connection (GH runner does so). A second identity check stays here.
 const p=verified.permit;
 if(p.horizon!=="T-6h"&&p.horizon!=="T-90m"||
    p.manifestSha256!==release.manifestSha256||
    p.expectedReviewedSourceRightsSha256!==release.rightsSha256||
    preflightP5Stage14ReviewedPermitV39(p)!==p.selectedTNativeUtc)
  fail("SOURCE_REVIEW_DRIFT_BEFORE_DB_INSERT");
 // V0091 validates the real V0079 ACTIVE allowed query, genuine paid
 // attempt, bound original + normalized leg, original expiry, and first
 // provider-native scheduled T, then inserts one immutable V0087 task.
 const args=[
  p.manifestSha256,p.queryDigestSha256,p.flightInstanceId,p.horizon,
  p.selectedTNativeUtc,verified.packetSha256,
  p.expectedSourcePopulationQueryId,p.expectedSourceResponseSha256,
  p.expectedReviewedSourceRightsSha256,p.maxPopulationStalenessSeconds
 ];
 let r:{rows:any[]}|undefined;
 try{
  r=await db.query(
   "SELECT clean.phase5_cd_register_source_flight_v39("+
   "$1,$2,$3,$4,$5::timestamptz,$6,$7,$8,$9,$10::integer)"+
   " AS task_id",args);
 }catch{
  // A dropped connection after SELECT can hide a committed insertion.
  // Even a known SQL exception requires owner read-only reconciliation.
  // NEVER automatically retry with a different packet or issue a new T.
  fail("REGISTRATION_RESULT_OR_COMMIT_UNKNOWN_INDEPENDENT_AUDIT_NO_RETRY");
 }
 const task=r?.rows?.[0]?.task_id;
 if(!r||r.rows.length!==1||
    !(typeof task==="string"||typeof task==="number")||
    !/^[1-9][0-9]{0,18}$/.test(String(task)))
  fail("REGISTRATION_TASK_ACK_AMBIGUOUS_INDEPENDENT_AUDIT_NO_RETRY");
 return{
  schema:"v39.phase5.cd-v0091-one-source-future-flight-enrollment.v1",
  status:"REGISTERED_RETURNED_TASK_ID_INDEPENDENT_READBACK_PENDING",
  taskId:String(task),
  horizon:p.horizon==="T-6h"?"T-6h":"T-90m",
  flightInstanceId:p.flightInstanceId,
  nativeTUtc:p.selectedTNativeUtc,
  frozenPacketSha256:verified.packetSha256,
  sourceResponseSha256:p.expectedSourceResponseSha256,
  providerCalls:0,taskEnrollmentsRequested:1,
  independentDatabaseReadbackHere:false,
  futureSourceRightsIndependentlyCertifiedHere:false,
  phase5FreezeGrantedHere:false,phase6PaidGoGrantedHere:false
 };
}
