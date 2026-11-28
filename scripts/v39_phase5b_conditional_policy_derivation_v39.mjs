/** Deterministic protected policy derivation, intentionally dependency-free.
 * No DB, network, signing, secret mutation or activation.
 */
import {createHash} from "node:crypto";
const H=/^[a-f0-9]{64}$/;
const hash=b=>createHash("sha256").update(b).digest("hex");
const iso=s=>typeof s==="string"&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
const hold=s=>{throw Error("HOLD_P6_CONDITIONAL_POLICY_CANDIDATE_"+s)};
const exact=(o,fields)=>o&&typeof o==="object"&&!Array.isArray(o)&&Object.keys(o).sort().join("|")===fields.slice().sort().join("|");
const parse=(b,d,max)=>{
 if(!Buffer.isBuffer(b)||b.length<100||b.length>max||typeof d!=="string"||!H.test(d)||hash(b)!==d)hold("BASE_BYTES");
 try{const x=JSON.parse(b.toString("utf8"));if(!x||Array.isArray(x)||typeof x!=="object")hold("BASE_JSON");return x;}catch{hold("BASE_JSON")}
};
export function buildConditionalDailyBytes(p,decision,fp,baseDailySha){
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
export function buildConditionalSigningBytes(q,decision){
 return Buffer.from(JSON.stringify({...q,conditionalServicePolicy:{schema:"v39.phase5.conditional-source-signing-policy.v1",
  protocolSha256:decision.protocolSha256,effectiveUtc:decision.effectiveUtc,firstEligibleRunDayIndex:decision.firstEligibleRunDayIndex,reviewedConditionalServiceScope:true}}));
}
export function buildConditionalTransportBytes(r,b,s){
 return Buffer.from(JSON.stringify({...r,dailyPolicySha256:hash(b),signingPolicySha256:hash(s)}));
}
const kinds=["daily","signing","transport"];
const maximum={daily:35000,signing:20000,transport:8000};
export const policyCommit=(kind,side,digest)=>hash(JSON.stringify({schema:"v39.phase5b.conditional-derived-policy-commitment.v1",kind,side,digest}));
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

const ENV_KEYS=["P6_PHASE5B_DERIVATION_APPROVAL_BASE64","P6_PHASE5B_DERIVATION_STAGED_APPROVAL_BASE64","P6_PHASE5B_DERIVATION_LEGACY_SELECTOR","P6_PHASE5B_DERIVATION_LANE_FINGERPRINT_SHA256","P6_PHASE5B_DERIVATION_EXECUTABLE_SHA"];
const FULL="scripts/v39_phase6_nonpaid_source_day_github_runtime_v39.mjs";
const REPO="HKcode22/ReplitTranvr",C=/^[a-f0-9]{40}$/;
const CUSTODY="VERIFY_FUTURE_CONDITIONAL_POLICY_CUSTODY_NO_PROVIDER";
const STAGED="VERIFY_STAGED_CONDITIONAL_SUCCESSOR",ACTIVE="VERIFY_ACTIVE_CONDITIONAL_SUCCESSOR";
const decode=(x,max)=>{
 if(typeof x!=="string"||x.length<8||x.length>Math.ceil(max/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(x))hold("DERIVATION_APPROVAL_BYTES");
 const b=Buffer.from(x,"base64");
 if(b.length>max||b.toString("base64")!==x)hold("DERIVATION_APPROVAL_BYTES");return b;
};
const stems={daily:"DAILY_POLICY",signing:"SIGNING_POLICY",transport:"TRANSPORT_TRUST"};
export function deriveP6ConditionalRuntimeEnvironment(env,target){
 const active=env.P6_PHASE5B_DERIVATION_APPROVAL_BASE64||"",staged=env.P6_PHASE5B_DERIVATION_STAGED_APPROVAL_BASE64||"";
 const out={...env};for(const k of ENV_KEYS)delete out[k];
 if(!active&&!staged)return {env:out,maskValues:[],derived:false};
 if(active&&staged||env.P6_PHASE5B_DERIVATION_LEGACY_SELECTOR||env.P6_PHASE5B_CONDITIONAL_ACTIVE_PROTOCOL_SHA256||
    env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_RUN_ATTEMPT!=="1"||!C.test(env.GITHUB_SHA??"")||env.GITHUB_SHA!==env.P6_PHASE5B_DERIVATION_EXECUTABLE_SHA)
  hold("DERIVATION_RUNTIME_SCOPE");
 const custody=target===FULL&&env.P6_NONPAID_SOURCE_CONFIRM===CUSTODY;
 if(staged&&(!custody||env.P6_PHASE5B_CONDITIONAL_INSTALL_ACTION!==STAGED)||
    active&&custody&&env.P6_PHASE5B_CONDITIONAL_INSTALL_ACTION!==ACTIVE||
    custody&&(env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_ACTOR!=="HKcode22")||
    env.P6_PHASE5B_CONDITIONAL_INSTALL_TOKEN)
  hold("DERIVATION_RUNTIME_ACTION");
 const a=JSON.parse(decode(active||staged,24000).toString("utf8"));
 if(!exact(a,["schema","reviewBase64","recipe","recipeSha256"])||a.schema!=="v39.phase5b.conditional-derivation-approval.v1")
  hold("DERIVATION_APPROVAL_SHAPE");
 const reviewBytes=decode(a.reviewBase64,16000),d=JSON.parse(reviewBytes.toString("utf8"));
 if(custody&&(env.P6_CONDITIONAL_COMMITMENT_REVIEW_BASE64!==a.reviewBase64||
    env.P6_CONDITIONAL_COMMITMENT_REVIEW_SHA256!==a.recipe?.reviewSha256||
    env.P6_PHASE5B_CONDITIONAL_EXPECTED_CANDIDATE_SHA256!==a.recipe?.candidateCommitmentSha256||
    env.P6_PHASE5B_CONDITIONAL_REVIEW_PROTOCOL_SHA256!==d.protocolSha256))
  hold("DERIVATION_READBACK_REVIEW_DRIFT");
 if(env.P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256&&env.P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256!==d.protocolSha256)
  hold("DERIVATION_PROTOCOL_DRIFT");
 const args={reviewBytes,recipe:a.recipe,expectedRecipeSha256:a.recipeSha256};
 const base={},next={},maskValues=[];
 for(const k of target===FULL?kinds:["daily"]){
  const prefix="P6_NONPAID_"+stems[k],b=decode(env[prefix+"_BASE64"],maximum[k]),expectedBaseSha256=env[prefix+"_SHA256"];
  base[k]=hash(b);
  next[k]=deriveP6ConditionalPolicyFromReviewedRecipe({...args,kind:k,baseBytes:b,expectedBaseSha256,
   ...(k==="daily"?{laneFingerprintSha256:env.P6_PHASE5B_DERIVATION_LANE_FINGERPRINT_SHA256}:{}),
   ...(k==="transport"?{derivedDailyBytes:next.daily,derivedSigningBytes:next.signing}:{})});
  const b64=next[k].toString("base64"),digest=hash(next[k]);
  out[prefix+"_BASE64"]=b64;out[prefix+"_SHA256"]=digest;maskValues.push(b64,digest);
 }
 if(target===FULL){
  const composite=(side,digests)=>hash(JSON.stringify({schema:"v39.phase5b.custody-"+side+"-commitment.v1",...digests}));
  if(composite("base",base)!==a.recipe.basePolicyCommitmentSha256||
     composite("candidate",Object.fromEntries(kinds.map(k=>[k,hash(next[k])])) )!==a.recipe.candidateCommitmentSha256)
   hold("DERIVATION_COMPOSITE_DRIFT");
  if(active)out.P6_PHASE5B_CONDITIONAL_ACTIVE_PROTOCOL_SHA256=d.protocolSha256;
 }
 if(Object.hasOwn(out,"P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256")||target===FULL)out.P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256=d.protocolSha256;
 if(Object.hasOwn(out,"P6_CONDITIONAL_LATER_METADATA_READ_ENABLED")||custody)out.P6_CONDITIONAL_LATER_METADATA_READ_ENABLED="1";
 return {env:out,maskValues,derived:true};
}
