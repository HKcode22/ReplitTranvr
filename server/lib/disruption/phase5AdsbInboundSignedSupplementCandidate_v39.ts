/**
 * ONE Amendment E: convert already independently reviewed, cutoff-safe
 * ADSB.lol same-aircraft inbound context into source-specific OPTIONAL
 * supplemental fields understood by the existing single Stage14 writer.
 *
 * This does NOT sign a packet, fetch, insert a source, write PRE, grant
 * license permission or prove tail assignment. All external reviewers must
 * examine the original decoded ADB/FIDS leg plus ADSB original and clocks.
 */
import {assessP5AdsbInboundAsOfPreV39,
 type P5AdsbPreInboundContextInputV39}
 from "./phase5AdsbLolCrossPhaseRotationEvidence_v39";
import type {P5EReviewedSupplementalObservation} from
 "./phase5AmendmentESignedSupplementalFeatures_v39";

const SHA=/^[0-9a-f]{64}$/;
const hold=(x:string):never=>{
 throw Error("REFUSED_P5_ADSB_PRE_SIGNED_SUPPLEMENT_CANDIDATE_"+x);
};
export function compileP5AdsbInboundOptionalFeatureCandidateV39(
 context:P5AdsbPreInboundContextInputV39,
 input:{
  /** Bytes/provenance of the actually captured ADSB original, not hash of
   * fabricated model position or monthly BTS data. */
  originalAdsbCaptureSha256:string;
  /** External independently verified unique ADB operated-leg/tail link. */
  reviewedPhysicalAircraftLinkSha256:string;
  /** External ODbL and source-use review, not given by this SHA alone. */
  reviewedODbLUseReviewSha256:string;
 }
){
 if(!input||!SHA.test(input.originalAdsbCaptureSha256??"")||
    !SHA.test(input.reviewedPhysicalAircraftLinkSha256??"")||
    !SHA.test(input.reviewedODbLUseReviewSha256??"")||
    input.reviewedODbLUseReviewSha256!==
     context?.source?.reviewedODbLAttributionAndDerivedDataPolicySha256)
  hold("MISSING_EXTERNAL_ORIGINAL_AND_LINK_RIGHTS_REVIEW");
 const evidence=assessP5AdsbInboundAsOfPreV39(context);
 if(!evidence.eligible||!context.inboundPosition){
  return {
   schema:"v39.phase5.adb-linked-adsblol-inbound-signed-feature-candidate.v1",
   status:"MISSING_OR_UNVERIFIED_ASOF_SOURCE",
   missingReason:evidence.reason,
   observations:[] as P5EReviewedSupplementalObservation[],
   stage14SupplementPacketSigned:false,
   sourceRightsCertifiedHere:false,sourceCalls:0,dbWrites:0,phase6PaidGo:false
  };
 }
 const p=context.inboundPosition;
 const common={
  flightInstanceId:context.flightInstanceId,
  source:"ADSB_LOL" as const,
  sourceRecordId:input.originalAdsbCaptureSha256,
  observedAtUtc:p.approximatePositionUtc,
  availableAtUtc:p.receivedAtUtc,
  rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW" as const,
  airportIcao:context.current.originIcao,
  reviewedPhysicalAircraftLinkSha256:
   input.reviewedPhysicalAircraftLinkSha256,
  reviewedODbLUseReviewSha256:input.reviewedODbLUseReviewSha256
 };
 const observations:P5EReviewedSupplementalObservation[]=[
  {...common,field:"prior_aircraft_adsb_not_ground_reported",
   value:evidence.incomingGroundState==="UNKNOWN"?null:
    evidence.incomingGroundState==="NOT_GROUND_REPORTED"},
  {...common,field:"prior_aircraft_adsb_position_age_seconds",
   value:evidence.availablePositionAgeAtIssueSeconds}
 ];
 return {
  schema:"v39.phase5.adb-linked-adsblol-inbound-signed-feature-candidate.v1",
  status:"ASOF_SOURCE_METADATA_CANDIDATE_FOR_INDEPENDENT_SIGNATURE",
  missingReason:null,observations,
  stage14SupplementPacketSigned:false,
  sourceRightsCertifiedHere:false,sourceCalls:0,dbWrites:0,phase6PaidGo:false
 };
}
