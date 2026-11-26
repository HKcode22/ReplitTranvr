/** Explicit conditional packet schemas reuse the existing C+D roster, queue,
 * Stage14 and witness. Native packet schemas must never carry this tier.
 * No signer or database permission is introduced. */
import {createHash} from "node:crypto";
import type {P5Stage14SingleFlightPrePermit} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {preflightP5Stage14ReviewedPermitV39} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {verifyP5T24PreWitnessCrossReview,type P5IndependentT24WitnessReview} from "./phase5T24PreIndependentWitnessChain_v39";
import {digestP5Stage24ReviewedReceipt} from "./phase5T24WitnessedLaterHorizonGuard_v39";
import {assertPhase7PreProofMetadataShape} from "./phase7SignedPreFieldProof_v39";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
export const P5_CONDITIONAL_T24_PACKET="v39.phase5.github-conditional-t24-pre-witness-reviewed.v1";
export const P5_CONDITIONAL_WITNESSED_LATER_PACKET="v39.phase5.github-conditional-witnessed-later-pre-reviewed.v1";
export const P5_CONDITIONAL_STANDALONE_PACKET="v39.phase5.github-conditional-standalone-later-pre-asof-reviewed.v1";
export type P5ConditionalQueueScope={protocolSha256:string;externalContentUseReviewSha256:string};
type Gate={releaseMode:string;approvedCodeSha:string;rightsSha256:string;manifestSha256:string;conditionalPreScope?:P5ConditionalQueueScope;independentlyApprovedStandaloneProtocolSha256?:string};
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const hold=(s:string):never=>{throw Error("REFUSED_P5_CONDITIONAL_QUEUE_PACKET_"+s);};
const exact=(x:any,ks:string[])=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).sort().join("|")===ks.slice().sort().join("|");
export function isP5ConditionalQueuePacketSchema(schema:unknown){
 return schema===P5_CONDITIONAL_T24_PACKET||schema===P5_CONDITIONAL_WITNESSED_LATER_PACKET||schema===P5_CONDITIONAL_STANDALONE_PACKET;
}
export function assertP5ConditionalQueuePermitScope(p:P5Stage14SingleFlightPrePermit,g:Gate,proof:unknown){
 if(p.identityEvidenceTier!=="CONDITIONAL_QUERY_FILTERED_SERVICE")return;
 const s=g.conditionalPreScope,w=proof as {payloadBase64?:string;signatureBase64?:string};
 if(g.releaseMode!=="PHASE6_APPROVED"||!s||!H.test(s.protocolSha256??"")||!H.test(s.externalContentUseReviewSha256??"")||
  p.manifestSha256!==g.manifestSha256||p.expectedReviewedSourceRightsSha256!==g.rightsSha256||
  p.reviewedProtocolAmendmentSha256!==s.protocolSha256||p.requireProspectiveConditionalSourceMarker!==true||
  p.externalConditionalScheduleSourceAndUseReviewed!==true||p.externalNativeTPhysicalLegAndSourceUseReviewed!==undefined||
  p.reviewedSupplementalFeatureBundle?.externalSourceAndContentsReviewReceiptSha256!==s.externalContentUseReviewSha256||
  !exact(w,["payloadBase64","signatureBase64"])||typeof w.payloadBase64!=="string"||w.payloadBase64.length<4||w.payloadBase64.length>21848||
  typeof w.signatureBase64!=="string"||!/^[A-Za-z0-9+/]{86}==$/.test(w.signatureBase64))
  return hold("SEPARATE_PROSPECTIVE_SCOPE_AND_PROOF_REQUIRED");
 const bytes=Buffer.from(w.payloadBase64!,"base64");if(bytes.length>16384||bytes.toString("base64")!==w.payloadBase64)hold("PROOF_BYTES");
 let meta:unknown;try{meta=JSON.parse(bytes.toString("utf8"));}catch{return hold("PROOF_BYTES");}
 assertPhase7PreProofMetadataShape(meta);
 if(meta.manifestSha256!==p.manifestSha256||meta.rightsSha256!==p.expectedReviewedSourceRightsSha256||meta.permitSha256!==hashPhase7DurableCandidate(p))hold("EXACT_PROOF_PERMIT");
 // Signature/field-value verification is performed by the existing mandatory
 // Phase7 resolver before any claim or WRITE_STARTED. This is metadata only.
 preflightP5Stage14ReviewedPermitV39(p,g.independentlyApprovedStandaloneProtocolSha256);
}
export function verifyP5ConditionalQueuePacket(packet:any,g:Gate,accepted:"LATER_ONLY"|"T24_WITH_SEPARATE_WITNESS"){
 const schema=packet?.schema,t24=schema===P5_CONDITIONAL_T24_PACKET,fallback=schema===P5_CONDITIONAL_STANDALONE_PACKET,p=packet?.prePermit as P5Stage14SingleFlightPrePermit;
 if(!isP5ConditionalQueuePacketSchema(schema)||!exact(packet,["schema","reviewedCodeSha","reviewArtifactSha256","independentlyReviewedConditionalScheduleServiceAndSourceAttested","reviewedConditionalProtocolSha256","prePermit","phase7FieldProof",...(t24?["witnessReview"]:[])])||
  packet.reviewedCodeSha!==g.approvedCodeSha||!C.test(packet.reviewedCodeSha??"")||!H.test(packet.reviewArtifactSha256??"")||
  packet.independentlyReviewedConditionalScheduleServiceAndSourceAttested!==true||!p||p.identityEvidenceTier!=="CONDITIONAL_QUERY_FILTERED_SERVICE"||
  packet.reviewedConditionalProtocolSha256!==p.reviewedProtocolAmendmentSha256||
  (t24?(accepted!=="T24_WITH_SEPARATE_WITNESS"||p.horizon!=="T-24h"):(accepted!=="LATER_ONLY"||!["T-6h","T-90m"].includes(p.horizon)))||
  (fallback?(!p.reviewedStandaloneLaterNoT24||!!p.reviewedT24WitnessReceipt):!!p.reviewedStandaloneLaterNoT24))
  return hold("PACKET_SCHEMA_OR_HORIZON");
 assertP5ConditionalQueuePermitScope(p,g,packet.phase7FieldProof);
 let witnessReview:P5IndependentT24WitnessReview|undefined;
 if(t24){witnessReview=packet.witnessReview;verifyP5T24PreWitnessCrossReview(p,witnessReview!);}
 else if(!fallback){const w=p.reviewedT24WitnessReceipt;
  if(!w||digestP5Stage24ReviewedReceipt(w)!==w.receiptSha256)return hold("T24_WITNESS_DIGEST");
 }
 return {permit:p,...(witnessReview?{witnessReview}:{}),phase7FieldProof:packet.phase7FieldProof};
}
