/**
 * Phase5 optional, separately approved prospective later-only PRE evidence.
 * A genuine T6/T90 source acquired before its OWN cutoff can potentially be
 * useful even if T24 was honestly missed. This is NOT a T24 witness substitute.
 *
 * The caller must independently bind a reviewed protocol digest from a
 * protected release configuration; a digest repeated from packet data does
 * not authorize collection. DB writer must also establish no stored T24 or
 * witness and a qualified native source in its SERIALIZABLE transaction.
 */
export interface P5StandaloneLaterNoT24Review{
 schema:"v39.phase5.standalone-later-asof-no-t24.v1";
 reviewedProtocolSha256:string;
 reviewedOriginalResponseSha256:string;
 reviewedNativeTSemanticsSha256:string;
 missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED";
 independentLaterAsOfAndMissingnessReviewAttested:true;
}
export interface P5LaterPreEvidenceChoice{
 horizon:"T-24h"|"T-6h"|"T-90m";
 expectedSourceResponseSha256:string;
 independentlyReviewedNativeTEvidenceSha256:string;
 reviewedT24WitnessReceipt?:unknown;
 reviewedStandaloneLaterNoT24?:P5StandaloneLaterNoT24Review;
}
const SHA=/^[a-f0-9]{64}$/;
const hold=(x:string):never=>{throw Error("REFUSED_P5_LATER_PRE_EVIDENCE_"+x);};
export function decideP5LaterPreEvidencePath(
 p:P5LaterPreEvidenceChoice,
 independentlyApprovedStandaloneProtocolSha256?:string
):"NATIVE_T24"|"WITNESSED_T24_LATER"|"STANDALONE_ASOF_LATER_MISSING_T24"{
 if(!p||!["T-24h","T-6h","T-90m"].includes(p.horizon))
  hold("INVALID_HORIZON");
 if(p.horizon==="T-24h"){
  if(p.reviewedStandaloneLaterNoT24)hold("NO_STANDALONE_T24_SUBSTITUTION");
  return "NATIVE_T24";
 }
 const hasWitness=!!p.reviewedT24WitnessReceipt;
 const standalone=p.reviewedStandaloneLaterNoT24;
 if(hasWitness&&standalone)hold("CONFLICTING_WITNESS_AND_STANDALONE_TIERS");
 if(hasWitness)return "WITNESSED_T24_LATER";
 if(!standalone||
    standalone.schema!=="v39.phase5.standalone-later-asof-no-t24.v1"||
    !SHA.test(standalone.reviewedProtocolSha256??"")||
    !SHA.test(independentlyApprovedStandaloneProtocolSha256??"")||
    independentlyApprovedStandaloneProtocolSha256!==
      standalone.reviewedProtocolSha256||
    !SHA.test(p.expectedSourceResponseSha256??"")||
    standalone.reviewedOriginalResponseSha256!==
      p.expectedSourceResponseSha256||
    !SHA.test(p.independentlyReviewedNativeTEvidenceSha256??"")||
    standalone.reviewedNativeTSemanticsSha256!==
      p.independentlyReviewedNativeTEvidenceSha256||
    standalone.missingT24Class!==
      "HONEST_T24_UNOBSERVED_NOT_BACKFILLED"||
    standalone.independentLaterAsOfAndMissingnessReviewAttested!==true)
  hold("MISSING_SIGNED_INDEPENDENT_STANDALONE_REVIEW");
 return "STANDALONE_ASOF_LATER_MISSING_T24";
}
