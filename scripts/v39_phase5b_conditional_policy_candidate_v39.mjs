import {hasP6NativePreFeatureReview} from "../server/lib/disruption/phase6NativePreFeaturePolicy_v39.mjs";
/** Private candidate assembly only. No signing, provider, DB, GitHub
 * mutation or implicit scientific approval. Existing exact daily/signing/
 * transport bytes are the base, not reconstructed placeholder policies.
 * This module does not return secret values in enumerable output. */
import {createHash,createPublicKey} from "node:crypto";
import {sameP5TypedSourceBudgetBinding} from "../server/lib/disruption/phase5TypedSourceBudgetBinding_v39.mjs";
import {deriveP6ConditionalT24Scope,deriveP6NativeT24PolicyTransition} from "../server/lib/disruption/phase6PrivateT24RegistryTransport_v39.mjs";
import {admitP6ConditionalT24Reviewer,admitP6ConditionalLaterReviewer} from "./v39_phase6_stored_source_postcommit_native_later_v39.mjs";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const hash=b=>createHash("sha256").update(b).digest("hex");
const iso=s=>typeof s==="string"&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
const hold=s=>{throw Error("HOLD_P6_CONDITIONAL_POLICY_CANDIDATE_"+s)};
const exact=(o,fields)=>o&&typeof o==="object"&&!Array.isArray(o)&&Object.keys(o).sort().join("|")===fields.slice().sort().join("|");
const parse=(b,d,max)=>{
 if(!Buffer.isBuffer(b)||b.length<100||b.length>max||!H.test(d??"")||hash(b)!==d)hold("BASE_BYTES");
 try{const x=JSON.parse(b.toString("utf8"));if(!x||Array.isArray(x)||typeof x!=="object")hold("BASE_JSON");return x;}catch{hold("BASE_JSON")}
};
const pin=(b,f)=>{
 try{const k=createPublicKey(b);return k.asymmetricKeyType==="ed25519"&&hash(k.export({type:"spki",format:"der"}))===f;}catch{return false}
};
// The caller's observed DB receipt must still be authenticated separately.
 // Bind its proposed clock to the same exact 31 reviewed plans used by
 // the existing producer; a marker policy has no independent end-day field.
function requirePlanCoverage(p,r,reviewedPlanBytes,prospective,decision){
 const pins=p.dayPlanSha256s;
 if(!Array.isArray(pins)||pins.length!==31||!Array.isArray(reviewedPlanBytes)||reviewedPlanBytes.length!==31||
    pins.some((d,i)=>!exact(d,["runDayIndex","sha256"])||d.runDayIndex!==i+1||!H.test(d.sha256??""))||
    new Set(pins.map(d=>d.sha256)).size!==31||
    !Number.isSafeInteger(r.minimumPreparationLeadMinutes)||r.minimumPreparationLeadMinutes<15||r.minimumPreparationLeadMinutes>180||
    !Number.isSafeInteger(r.maximumPreparationLookaheadMinutes)||r.maximumPreparationLookaheadMinutes<r.minimumPreparationLeadMinutes||
    r.maximumPreparationLookaheadMinutes>2880)hold("REVIEWED_PLAN_PINS");
 let first=Infinity,last=-Infinity;
 for(let i=0;i<31;i++){
  const d=parse(reviewedPlanBytes[i],pins[i].sha256,500000);
  if(d.schema!=="v39.phase6.reviewed-future-day-source-plan.v1"||d.runDayIndex!==i+1||!iso(d.expectedServiceStartUtc)||
     !Array.isArray(d.templates)||d.templates.length<12||d.templates.length>384||
     d.templates.some(t=>t?.runDayIndex!==i+1||!iso(t.scheduledRequestUtc)||!iso(t.serviceWindowEndUtc)||
      Date.parse(t.scheduledRequestUtc)>=Date.parse(t.serviceWindowEndUtc)))hold("REVIEWED_PLAN_SHAPE");
  if(i+1===prospective.runDayIndex)first=Math.min(...d.templates.map(t=>Date.parse(t.scheduledRequestUtc)));
  if(i+1>=prospective.runDayIndex)last=Math.max(last,...d.templates.map(t=>Date.parse(t.serviceWindowEndUtc)));
 }
 if(first!==Date.parse(prospective.firstRequestUtc)||first-r.maximumPreparationLookaheadMinutes*60000!==Date.parse(prospective.preparationOpensUtc))
  hold("REVIEWED_PLAN_CLOCK");
 // Since the current SOURCE marker is prospective for all subsequent
 // study days, refuse a truncated delegation rather than silently sign
 // later days whose conditional PRE reviewer has expired.
 if(Date.parse(decision.validUntilUtc)<=last)hold("REVIEWED_PLAN_INTERVAL");
 return new Date(last).toISOString();
}
export function prepareP6ConditionalPolicyCandidate({dailyBytes,signingBytes,transportBytes,baseDigests,trust,reviewBytes,reviewSha256,publicPins,prospective,observedUtc,reviewedPlanBytes}){
 // A reviewed decision must name exact old policy hashes and a future,
 // still-unpublished study day. An owner generic GO is not this record.
 if(!exact(baseDigests,["daily","signing","transport"])||!iso(observedUtc)||
    !exact(prospective,["runDayIndex","firstRequestUtc","preparationOpensUtc","genesisAbsent","preparedQueryCount"])||
    !Number.isSafeInteger(prospective.runDayIndex)||prospective.runDayIndex<5||prospective.runDayIndex>31||
    !iso(prospective.firstRequestUtc)||!iso(prospective.preparationOpensUtc)||
    prospective.genesisAbsent!==true||prospective.preparedQueryCount!==0||
    observedUtc>=prospective.preparationOpensUtc||prospective.preparationOpensUtc>=prospective.firstRequestUtc)hold("FUTURE_UNSIGNED_DAY");
 const p=parse(dailyBytes,baseDigests.daily,35000),q=parse(signingBytes,baseDigests.signing,20000),r=parse(transportBytes,baseDigests.transport,8000);
 const decision=parse(reviewBytes,reviewSha256,16000),v=p.nativeLaterReview,day=v?.dayAppendPolicy;
 if(!exact(decision,["schema","ownerDelegatedTechnicalScopeReviewed","protocolSha256","externalContentUseReviewSha256","manifestSha256","rightsSha256","baseDigests","firstEligibleRunDayIndex","effectiveUtc","validUntilUtc","standaloneNoT24ProtocolSha256"])||
    decision.schema!=="v39.phase5b.prospective-conditional-commissioning-review.v1"||
    decision.ownerDelegatedTechnicalScopeReviewed!==true||decision.standaloneNoT24ProtocolSha256!==null||
    ![decision.protocolSha256,decision.externalContentUseReviewSha256].every(x=>H.test(x??""))||
    !exact(decision.baseDigests,["daily","signing","transport"])||
    !Object.keys(baseDigests).every(k=>baseDigests[k]===decision.baseDigests[k])||
    decision.firstEligibleRunDayIndex!==prospective.runDayIndex||
    !iso(decision.effectiveUtc)||!iso(decision.validUntilUtc)||decision.effectiveUtc<observedUtc||
    decision.effectiveUtc>=prospective.preparationOpensUtc||decision.validUntilUtc<=prospective.firstRequestUtc||
    decision.manifestSha256!==trust?.manifestSha256||decision.rightsSha256!==trust?.rightsSha256)hold("EXACT_PROSPECTIVE_REVIEW");
 if(trust.independentStudyTrustPinsApproved!==true||!C.test(trust.reviewedCodeSha??"")||
    p.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||p.delegatedDailyPacketProductionApproved!==true||
    q.schema!=="v39.phase6.delegated-source-review-policy.v1"||q.delegatedAutomatedSourceSigningApproved!==true||
    r.schema!=="v39.phase6.approved-nonpaid-source-transport-trust.v1"||r.independentTransportAndSigningScopeApproved!==true||
    r.dailyPolicySha256!==baseDigests.daily||r.signingPolicySha256!==baseDigests.signing||r.reviewedMainSha!==trust.reviewedCodeSha||
    p.approvedCodeSha!==trust.reviewedCodeSha||q.approvedCodeSha!==trust.reviewedCodeSha||
    !["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>H.test(trust[k]??"")&&p[k]===trust[k]&&q[k]===trust[k])||
    !["configSha256","frameSha256","providerContractSha256","reviewedCategoryBudgetSha256"].every(k=>H.test(p[k]??"")&&p[k]===q[k])||
    !sameP5TypedSourceBudgetBinding(p,q)||p.expectedPrepareRole!==q.expectedPrepareRole||
    q.queryReviewerFingerprintSha256!==trust.queryReviewerFingerprintSha256||q.registryReviewerFingerprintSha256!==trust.dayReviewerFingerprintSha256||
    r.expectedReaderSessionLogin!==trust.expectedReaderSessionLogin||
    !hasP6NativePreFeatureReview(p.nativePreFeatureReview,trust.rightsSha256)||
    v?.approved!==true||v.nativeT24ReviewApproved!==true||v.independentT24WitnessProtocolReviewed!==true||
    !day||day.delegatedAutomatedLaterDayAppendApproved!==true||
    ![p.validFromUtc,p.validUntilUtc,q.validFromUtc,q.validUntilUtc,v.validFromUtc,v.validUntilUtc,day.validFromUtc,day.validUntilUtc].every(iso)||
    [p.validFromUtc,q.validFromUtc,v.validFromUtc,day.validFromUtc].some(x=>decision.effectiveUtc<x)||
    [p.validUntilUtc,q.validUntilUtc,v.validUntilUtc,day.validUntilUtc].some(x=>decision.validUntilUtc>x)||
    !H.test(v.selectedTConfig?.semanticsEvidenceSha256??"")||
    Object.hasOwn(p,"conditionalPreFeatureReview")||Object.hasOwn(p,"conditionalT24PermitReview")||
    Object.hasOwn(p,"conditionalLaterPermitReview")||Object.hasOwn(q,"conditionalServicePolicy")||
    Object.hasOwn(v,"conditionalT24Scope")||Object.hasOwn(v,"conditionalLaterDayAppendPolicy")||Object.hasOwn(v,"nativeT24PolicyTransition")||
    Object.hasOwn(day,"conditionalLaterPreScope"))hold("EXACT_BASE_POLICY");
 if(!Buffer.from(JSON.stringify(p)).equals(dailyBytes))hold("NONCANONICAL_PREDECESSOR_BYTES");
 const reviewedConditionalThroughUtc=requirePlanCoverage(p,r,reviewedPlanBytes,prospective,decision);
 const fp=publicPins?.laneFingerprintSha256,proof=publicPins?.proofFingerprintSha256,raw=publicPins?.lanePublicKeyBase64,proofRaw=publicPins?.proofPublicKeyBase64;
 const publicKeyMatches=(b,f)=>typeof b==="string"&&b.length<=5500&&Buffer.from(b,"base64").toString("base64")===b&&pin(Buffer.from(b,"base64"),f);
 if(![fp,proof,v.laterReviewerFingerprintSha256,trust.dayReviewerFingerprintSha256,trust.queryReviewerFingerprintSha256].every(x=>H.test(x??""))||
    new Set([fp,proof,v.laterReviewerFingerprintSha256,trust.dayReviewerFingerprintSha256,trust.queryReviewerFingerprintSha256]).size!==5||
    !publicKeyMatches(raw,fp)||!publicKeyMatches(proofRaw,proof))hold("EXISTING_PUBLIC_ACTOR_PINS");
 const scope={protocolSha256:decision.protocolSha256,externalContentUseReviewSha256:decision.externalContentUseReviewSha256};
 const interval={validFromUtc:decision.effectiveUtc,validUntilUtc:decision.validUntilUtc};
 const delegation={approved:true,...scope,reviewerFingerprintSha256:fp,reportedScheduleSemanticsSha256:v.selectedTConfig.semanticsEvidenceSha256,...interval};
 const nextDaily={...p,conditionalPreFeatureReview:{schema:"v39.phase5.conditional-pre-feature-review-policy.v1",approved:true,...scope,rightsSha256:p.rightsSha256},
  conditionalT24PermitReview:{schema:"v39.phase5.conditional-t24-permit-review-delegation.v1",...delegation},
  conditionalLaterPermitReview:{schema:"v39.phase5.conditional-later-permit-review-delegation.v1",...delegation,standaloneNoT24ProtocolSha256:null},
  nativeLaterReview:{...v,conditionalT24Scope:scope,conditionalLaterDayAppendPolicy:{...day,...interval,conditionalLaterPreScope:scope},
   nativeT24PolicyTransition:{schema:"v39.phase5b.native-t24-policy-transition.v1",previousDailyPolicySha256:baseDigests.daily,firstConditionalRunDayIndex:decision.firstEligibleRunDayIndex,conditionalEffectiveUtc:decision.effectiveUtc}}};
 const nextSigning={...q,conditionalServicePolicy:{schema:"v39.phase5.conditional-source-signing-policy.v1",protocolSha256:scope.protocolSha256,effectiveUtc:decision.effectiveUtc,
  firstEligibleRunDayIndex:decision.firstEligibleRunDayIndex,reviewedConditionalServiceScope:true}};
 const b=Buffer.from(JSON.stringify(nextDaily)),s=Buffer.from(JSON.stringify(nextSigning));
 const nextTransport={...r,dailyPolicySha256:hash(b),signingPolicySha256:hash(s)},t=Buffer.from(JSON.stringify(nextTransport));
 if(b.length>35000||s.length>20000||t.length>8000)hold("CANDIDATE_SIZE");
 // Reuse the actual protected public reviewer admission, not a new
 // weaker replica. These calls have no database or signing capability.
 const e={P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256:fp,P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:proof,
  P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PUBLIC_KEY_BASE64:raw,P6_CONDITIONAL_LATER_METADATA_READ_ENABLED:"1"};
 if(!deriveP6NativeT24PolicyTransition(nextDaily)||!deriveP6ConditionalT24Scope(nextDaily)||!admitP6ConditionalT24Reviewer(e,nextDaily,trust)||!admitP6ConditionalLaterReviewer(e,nextDaily,trust))hold("ACTUAL_ADMISSION");
 const result={status:"CONDITIONAL_POLICY_CANDIDATE_PREPARED_NOT_INSTALLED",firstEligibleRunDayIndex:prospective.runDayIndex,
  dailySha256:hash(b),signingSha256:hash(s),transportSha256:hash(t),reviewSha256,reviewedConditionalThroughUtc,
  nativePolicyPreserved:true,standaloneNoT24Approved:false,protectedActualReadbackVerified:false,providerCalls:0,databaseWrites:0,githubWrites:0,paidGo:false};
 Object.defineProperty(result,"privatePolicyBytes",{value:Object.freeze({daily:b,signing:s,transport:t}),enumerable:false,writable:false});
 return Object.freeze(result);
}
