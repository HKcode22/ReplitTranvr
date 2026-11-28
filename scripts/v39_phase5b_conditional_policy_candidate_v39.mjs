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
// Shared deterministic transform. The existing prospective compiler remains
// responsible for actual custody, clocks, rights and actor admission.
function buildConditionalDailyBytes(p,decision,fp,baseDailySha){
 const v=p.nativeLaterReview,day=v.dayAppendPolicy;
 const scope={protocolSha256:decision.protocolSha256,externalContentUseReviewSha256:decision.externalContentUseReviewSha256};
 const interval={validFromUtc:decision.effectiveUtc,validUntilUtc:decision.validUntilUtc};
 const delegation={approved:true,...scope,reviewerFingerprintSha256:fp,reportedScheduleSemanticsSha256:v.selectedTConfig.semanticsEvidenceSha256,...interval};
 const nextDaily={...p,conditionalPreFeatureReview:{schema:"v39.phase5.conditional-pre-feature-review-policy.v1",approved:true,...scope,rightsSha256:p.rightsSha256},
  conditionalT24PermitReview:{schema:"v39.phase5.conditional-t24-permit-review-delegation.v1",...delegation},
  conditionalLaterPermitReview:{schema:"v39.phase5.conditional-later-permit-review-delegation.v1",...delegation,standaloneNoT24ProtocolSha256:null},
  nativeLaterReview:{...v,conditionalT24Scope:scope,conditionalLaterDayAppendPolicy:{...day,...interval,conditionalLaterPreScope:scope},
   nativeT24PolicyTransition:{schema:"v39.phase5b.native-t24-policy-transition.v1",previousDailyPolicySha256:baseDailySha,firstConditionalRunDayIndex:decision.firstEligibleRunDayIndex,conditionalEffectiveUtc:decision.effectiveUtc}}};
 return Buffer.from(JSON.stringify(nextDaily));
}
function buildConditionalSigningBytes(q,decision){
 return Buffer.from(JSON.stringify({...q,conditionalServicePolicy:{schema:"v39.phase5.conditional-source-signing-policy.v1",
  protocolSha256:decision.protocolSha256,effectiveUtc:decision.effectiveUtc,firstEligibleRunDayIndex:decision.firstEligibleRunDayIndex,reviewedConditionalServiceScope:true}}));
}
function buildConditionalTransportBytes(r,b,s){
 return Buffer.from(JSON.stringify({...r,dailyPolicySha256:hash(b),signingPolicySha256:hash(s)}));
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
 const b=buildConditionalDailyBytes(p,decision,fp,baseDigests.daily);
 const s=buildConditionalSigningBytes(q,decision);
 const t=buildConditionalTransportBytes(r,b,s);
 const nextDaily=JSON.parse(b.toString("utf8"));
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

/** Protected preview only: external review binds the composite commitment;
 * exact constituent digests are recomputed internally, never disclosed. */
function compileP6ConditionalCandidateFromCommitment({dailyBytes,signingBytes,transportBytes,trust,reviewBytes,reviewSha256,publicPins,custody,reviewedPlanBytes}){
 if(custody?.status!=="P6_ACTUAL_PROTECTED_CONDITIONAL_POLICY_CUSTODY_READONLY"||
  !["exactThreePolicyDigestsValidated","exact31PlanPinsValidated","canonicalNativePredecessorBytes","nativePolicyPresent","baseIntervalCoversRemainingStudy","publicActorsVerified"].every(k=>custody[k]===true)||
  custody.conditionalPolicyFieldState!=="ABSENT"||custody.signingOrPublishingCapabilityPresent!==false||
  custody.actualConditionalPolicyInstalledVerified!==false||custody.actualConditionalPreCommitVerified!==false||
  !["providerCalls","databaseWrites","githubWrites","signaturesIssued"].every(k=>custody[k]===0)||custody.phase6PaidGo!==false)
  hold("PROTECTED_CUSTODY_REQUIRED");
 if(![dailyBytes,signingBytes,transportBytes].every(Buffer.isBuffer))hold("BASE_BYTES");
 const baseDigests={daily:hash(dailyBytes),signing:hash(signingBytes),transport:hash(transportBytes)};
 const commitment=hash(JSON.stringify({schema:"v39.phase5b.custody-base-commitment.v1",...baseDigests}));
 const d=parse(reviewBytes,reviewSha256,16000);
 if(!exact(d,["schema","ownerDelegatedTechnicalScopeReviewed","protocolSha256","externalContentUseReviewSha256","manifestSha256","rightsSha256","basePolicyCommitmentSha256","firstEligibleRunDayIndex","effectiveUtc","validUntilUtc","standaloneNoT24ProtocolSha256"])||
  d.schema!=="v39.phase5b.prospective-conditional-commissioning-commitment-review.v1"||
  d.basePolicyCommitmentSha256!==commitment||custody.basePolicyCommitmentSha256!==commitment)hold("CUSTODY_COMMITMENT_DRIFT");
 const {basePolicyCommitmentSha256:unused,...rest}=d;
 const internal=Buffer.from(JSON.stringify({...rest,schema:"v39.phase5b.prospective-conditional-commissioning-review.v1",baseDigests}));
 const c=prepareP6ConditionalPolicyCandidate({dailyBytes,signingBytes,transportBytes,baseDigests,trust,reviewBytes:internal,reviewSha256:hash(internal),publicPins,prospective:custody.prospective,observedUtc:custody.observedDbClockUtc,reviewedPlanBytes});
 const receipt=Object.freeze({status:"CONDITIONAL_POLICY_CANDIDATE_PREVIEW_NOT_INSTALLED",reviewSha256,
  basePolicyCommitmentSha256:commitment,candidateCommitmentSha256:hash(JSON.stringify({schema:"v39.phase5b.custody-candidate-commitment.v1",daily:c.dailySha256,signing:c.signingSha256,transport:c.transportSha256})),
  firstEligibleRunDayIndex:c.firstEligibleRunDayIndex,reviewedConditionalThroughUtc:c.reviewedConditionalThroughUtc,
  nativePolicyPreserved:true,standaloneNoT24Approved:false,actualConditionalPolicyInstalledVerified:false,actualConditionalPreCommitVerified:false,
  providerCalls:0,databaseWrites:0,githubWrites:0,signaturesIssued:0,phase6PaidGo:false});
 return {receipt,privatePolicyBytes:c.privatePolicyBytes};
}
export function previewP6ConditionalCandidateFromCommitment(args){return compileP6ConditionalCandidateFromCommitment(args).receipt;}
/** Only the separately owner-authorized protected staging path consumes these
 * bytes. The ordinary read-only preview never returns them. */
export function prepareP6ConditionalSuccessorStageFromCommitment(args,expectedCandidateCommitmentSha256){
 const x=compileP6ConditionalCandidateFromCommitment(args);
 if(!H.test(expectedCandidateCommitmentSha256??"")||x.receipt.candidateCommitmentSha256!==expectedCandidateCommitmentSha256)hold("EXPECTED_CANDIDATE_COMMITMENT_DRIFT");
 const result={...x.receipt};
 Object.defineProperty(result,"privatePolicyBytes",{value:x.privatePolicyBytes,enumerable:false,writable:false});
 return Object.freeze(result);
}

/** Tokenless commissioning building block. No secret writes, clock replay,
 * output of individual secret digests, activation or runtime authorization.
 * A future protected caller must authenticate its exact preview and owner
 * approval independently before pinning this recipe. Per-kind one-way
 * commitments permit existing least-privilege consumers to derive only
 * the policy they already possess; no need to distribute all three.
 */
const kinds=["daily","signing","transport"];
const maximum={daily:35000,signing:20000,transport:8000};
const policyCommit=(kind,side,digest)=>hash(JSON.stringify({schema:"v39.phase5b.conditional-derived-policy-commitment.v1",kind,side,digest}));
export function previewP6ConditionalDerivationRecipe(args){
 const x=compileP6ConditionalCandidateFromCommitment(args),v=x.receipt;
 const predecessor={daily:args.dailyBytes,signing:args.signingBytes,transport:args.transportBytes};
 const commitments=Object.fromEntries(kinds.map(k=>[k,Object.freeze({
  predecessor:policyCommit(k,"predecessor",hash(predecessor[k])),
  successor:policyCommit(k,"successor",hash(x.privatePolicyBytes[k]))
 })]));
 const recipe=Object.freeze({schema:"v39.phase5b.conditional-derivation-recipe.v1",reviewSha256:v.reviewSha256,
  basePolicyCommitmentSha256:v.basePolicyCommitmentSha256,candidateCommitmentSha256:v.candidateCommitmentSha256,
  commitments:Object.freeze(commitments)});
 return Object.freeze({status:"CONDITIONAL_DERIVATION_RECIPE_PREVIEW_NOT_ACTIVE",
  recipe,recipeSha256:hash(JSON.stringify(recipe)),actualConditionalPolicyInstalledVerified:false,
  actualConditionalPreCommitVerified:false,providerCalls:0,databaseWrites:0,githubWrites:0,signaturesIssued:0,phase6PaidGo:false});
}
export function deriveP6ConditionalPolicyFromReviewedRecipe({kind,baseBytes,expectedBaseSha256,reviewBytes,recipe,expectedRecipeSha256,
 laneFingerprintSha256,derivedDailyBytes,derivedSigningBytes}){
 if(!kinds.includes(kind)||!exact(recipe,["schema","reviewSha256","basePolicyCommitmentSha256","candidateCommitmentSha256","commitments"])||
  recipe.schema!=="v39.phase5b.conditional-derivation-recipe.v1"||
  ![recipe.reviewSha256,recipe.basePolicyCommitmentSha256,recipe.candidateCommitmentSha256,expectedRecipeSha256].every(v=>typeof v==="string"&&H.test(v))||
  hash(JSON.stringify(recipe))!==expectedRecipeSha256||!exact(recipe.commitments,kinds)||
  kinds.some(k=>!exact(recipe.commitments[k],["predecessor","successor"])||
    !Object.values(recipe.commitments[k]).every(v=>typeof v==="string"&&H.test(v))))
  hold("DERIVATION_RECIPE_PIN");
 const d=parse(reviewBytes,recipe.reviewSha256,16000);
 if(!exact(d,["schema","ownerDelegatedTechnicalScopeReviewed","protocolSha256","externalContentUseReviewSha256","manifestSha256","rightsSha256","basePolicyCommitmentSha256","firstEligibleRunDayIndex","effectiveUtc","validUntilUtc","standaloneNoT24ProtocolSha256"])||
  d.schema!=="v39.phase5b.prospective-conditional-commissioning-commitment-review.v1"||
  d.ownerDelegatedTechnicalScopeReviewed!==true||d.standaloneNoT24ProtocolSha256!==null||
  d.basePolicyCommitmentSha256!==recipe.basePolicyCommitmentSha256||
  ![d.protocolSha256,d.externalContentUseReviewSha256,d.manifestSha256,d.rightsSha256].every(v=>typeof v==="string"&&H.test(v))||
  !Number.isSafeInteger(d.firstEligibleRunDayIndex)||d.firstEligibleRunDayIndex<5||d.firstEligibleRunDayIndex>31||
  !iso(d.effectiveUtc)||!iso(d.validUntilUtc)||d.effectiveUtc>=d.validUntilUtc)
  hold("DERIVATION_REVIEW");
 const p=parse(baseBytes,expectedBaseSha256,maximum[kind]);
 if(policyCommit(kind,"predecessor",hash(baseBytes))!==recipe.commitments[kind].predecessor)
  hold("DERIVATION_PREDECESSOR");
 let out;
 if(kind==="daily"){
  if(typeof laneFingerprintSha256!=="string"||!H.test(laneFingerprintSha256)||derivedDailyBytes!==undefined||derivedSigningBytes!==undefined||
   p.manifestSha256!==d.manifestSha256||p.rightsSha256!==d.rightsSha256||!p.nativeLaterReview?.selectedTConfig||!p.nativeLaterReview?.dayAppendPolicy)
   hold("DERIVATION_DAILY_SCOPE");
  out=buildConditionalDailyBytes(p,d,laneFingerprintSha256,expectedBaseSha256);
 }else if(kind==="signing"){
  if(laneFingerprintSha256!==undefined||derivedDailyBytes!==undefined||derivedSigningBytes!==undefined||
   p.manifestSha256!==d.manifestSha256||p.rightsSha256!==d.rightsSha256)
   hold("DERIVATION_SIGNING_SCOPE");
  out=buildConditionalSigningBytes(p,d);
 }else{
  if(laneFingerprintSha256!==undefined||![derivedDailyBytes,derivedSigningBytes].every(Buffer.isBuffer)||
   policyCommit("daily","successor",hash(derivedDailyBytes))!==recipe.commitments.daily.successor||
   policyCommit("signing","successor",hash(derivedSigningBytes))!==recipe.commitments.signing.successor||
   policyCommit("daily","predecessor",p.dailyPolicySha256)!==recipe.commitments.daily.predecessor||
   policyCommit("signing","predecessor",p.signingPolicySha256)!==recipe.commitments.signing.predecessor)
   hold("DERIVATION_TRANSPORT_SCOPE");
  out=buildConditionalTransportBytes(p,derivedDailyBytes,derivedSigningBytes);
 }
 if(out.length>maximum[kind]||policyCommit(kind,"successor",hash(out))!==recipe.commitments[kind].successor)
  hold("DERIVATION_SUCCESSOR");
 return out;
}
