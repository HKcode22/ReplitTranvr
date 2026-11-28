/** F027: non-secret, exact review metadata only.
 * A public SHA-256 commitment is deliberately not the underlying policy
 * digest or policy bytes. Letter encoding avoids accidental masking of
 * small unrelated secret strings in the decimal/hex display. Never use
 * this function to encode credentials, private data or individual pins.
 */
import {createHash} from "node:crypto";
const H=/^[a-f0-9]{64}$/;
const hash=b=>createHash("sha256").update(b).digest("hex");
const hold=s=>{throw Error("HOLD_P6_CONDITIONAL_REVIEW_METADATA_"+s)};
const iso=s=>typeof s==="string"&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
const digits="0123456789abcdef",letters="abcdefghijklmnop";
export function encodeP6PublicPolicyCommitment(hex){
 if(!H.test(hex??""))hold("PUBLIC_COMMITMENT");
 return [...hex].map(c=>letters[digits.indexOf(c)]).join("");
}
export function decodeP6PublicPolicyCommitment(encoded){
 if(typeof encoded!=="string"||!/^[a-p]{64}$/.test(encoded))hold("PUBLIC_COMMITMENT");
 return [...encoded].map(c=>digits[letters.indexOf(c)]).join("");
}
// Retain the useful #982 review-package idea. Approval must be provided
// explicitly by the actual reviewer, not minted by a command's defaults.
export function buildP6ConditionalCommitmentReviewArtifact({ownerDelegatedTechnicalScopeReviewed,protocolSha256,
 externalContentUseReviewSha256,manifestSha256,rightsSha256,basePolicyCommitmentSha256,
 firstEligibleRunDayIndex,effectiveUtc,validUntilUtc,reviewedPlanBytes,maximumPreparationLookaheadMinutes}){
 if(ownerDelegatedTechnicalScopeReviewed!==true||!Number.isSafeInteger(firstEligibleRunDayIndex)||
  firstEligibleRunDayIndex<5||firstEligibleRunDayIndex>31||
  ![protocolSha256,externalContentUseReviewSha256,manifestSha256,rightsSha256,basePolicyCommitmentSha256].every(x=>H.test(x??""))||
  !iso(effectiveUtc)||!iso(validUntilUtc)||!Array.isArray(reviewedPlanBytes)||reviewedPlanBytes.length!==31||
  !Number.isSafeInteger(maximumPreparationLookaheadMinutes)||maximumPreparationLookaheadMinutes<15||maximumPreparationLookaheadMinutes>2880)
  hold("SCOPE");
 let first=Infinity,last=-Infinity;
 for(let i=0;i<31;i++){
  const b=reviewedPlanBytes[i];
  if(!Buffer.isBuffer(b)||b.length<100||b.length>500000)hold("PLAN_BYTES");
  const d=JSON.parse(b.toString("utf8"));
  if(d.schema!=="v39.phase6.reviewed-future-day-source-plan.v1"||d.runDayIndex!==i+1||
   !iso(d.expectedServiceStartUtc)||!Array.isArray(d.templates)||d.templates.length<12||d.templates.length>384||
   d.templates.some(t=>t.runDayIndex!==i+1||!iso(t.scheduledRequestUtc)||!iso(t.serviceWindowEndUtc)||t.scheduledRequestUtc>=t.serviceWindowEndUtc))
   hold("PLAN_SHAPE");
  if(i+1===firstEligibleRunDayIndex)first=Math.min(...d.templates.map(t=>Date.parse(t.scheduledRequestUtc)));
  if(i+1>=firstEligibleRunDayIndex)last=Math.max(last,...d.templates.map(t=>Date.parse(t.serviceWindowEndUtc)));
 }
 const preparationOpensUtc=new Date(first-maximumPreparationLookaheadMinutes*60000).toISOString();
 if(effectiveUtc>=preparationOpensUtc||Date.parse(validUntilUtc)<=last)hold("WINDOW");
 const review={schema:"v39.phase5b.prospective-conditional-commissioning-commitment-review.v1",
  ownerDelegatedTechnicalScopeReviewed,protocolSha256,externalContentUseReviewSha256,manifestSha256,rightsSha256,basePolicyCommitmentSha256,
  firstEligibleRunDayIndex,effectiveUtc,validUntilUtc,standaloneNoT24ProtocolSha256:null};
 const bytes=Buffer.from(JSON.stringify(review));
 return Object.freeze({status:"CONDITIONAL_COMMITMENT_REVIEW_METADATA_READY_FOR_PROTECTED_PREVIEW",
  reviewSha256:hash(bytes),reviewBase64:bytes.toString("base64"),review,firstEligibleRunDayIndex,preparationOpensUtc,
  firstRequestUtc:new Date(first).toISOString(),remainingServiceEndUtc:new Date(last).toISOString(),
  independentApprovalGrantedHere:false,actualConditionalPolicyInstalledVerified:false,providerCalls:0,databaseWrites:0,githubWrites:0,signaturesIssued:0,phase6PaidGo:false});
}
