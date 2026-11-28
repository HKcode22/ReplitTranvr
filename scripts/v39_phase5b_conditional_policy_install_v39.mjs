/** Additive policy commissioning. Keep the three active native predecessor
 * policies intact. Stage only six successor values in this repository; a
 * separate actual protected readback and owner-controlled single selector
 * activate them. No signer, provider, publisher or database write authority.
 */
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {deriveP6NativeT24PolicyTransition,deriveP6ConditionalT24Scope} from "../server/lib/disruption/phase6PrivateT24RegistryTransport_v39.mjs";
import {admitP6ConditionalT24Reviewer,admitP6ConditionalLaterReviewer} from "./v39_phase6_stored_source_postcommit_native_later_v39.mjs";
import {encodeP6PublicPolicyCommitment} from "./v39_phase5b_conditional_review_metadata_v39.mjs";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const hash=b=>createHash("sha256").update(b).digest("hex");
const hold=s=>{throw Error("HOLD_P6_CONDITIONAL_INSTALL_"+s)};
const REPO="HKcode22/ReplitTranvr",ENVIRONMENT="phase6-protected-runtime";
export const P6_CONDITIONAL_INSTALL_ACTIONS=Object.freeze({
 PREVIEW:"PREVIEW",STAGE:"STAGE_EXACT_REVIEWED_CONDITIONAL_SUCCESSOR",
 VERIFY_STAGED:"VERIFY_STAGED_CONDITIONAL_SUCCESSOR",VERIFY_ACTIVE:"VERIFY_ACTIVE_CONDITIONAL_SUCCESSOR"});
const BASE="P6_NONPAID_",NEXT="P6_PHASE5B_CONDITIONAL_";
const stems=Object.freeze({daily:"DAILY_POLICY",signing:"SIGNING_POLICY",transport:"TRANSPORT_TRUST"});
export const P6_CONDITIONAL_SUCCESSOR_SECRET_NAMES=Object.freeze(Object.values(stems).flatMap(x=>[NEXT+x+"_BASE64",NEXT+x+"_SHA256"]));
const oldNames=Object.values(stems).flatMap(x=>[BASE+x+"_BASE64",BASE+x+"_SHA256"]);
export function p6ConditionalCommitment(kind,digests){
 if(!["base","candidate"].includes(kind)||!Object.keys(stems).every(k=>H.test(digests?.[k]??"")))hold("COMMITMENT_SHAPE");
 return hash(JSON.stringify({schema:"v39.phase5b.custody-"+kind+"-commitment.v1",daily:digests.daily,signing:digests.signing,transport:digests.transport}));
}
export function admitP6ConditionalInstallAction(env,mode){
 const a=env.P6_PHASE5B_CONDITIONAL_INSTALL_ACTION||P6_CONDITIONAL_INSTALL_ACTIONS.PREVIEW;
 const token=env.P6_PHASE5B_CONDITIONAL_INSTALL_TOKEN??"",expected=env.P6_PHASE5B_CONDITIONAL_EXPECTED_CANDIDATE_SHA256??"",protocol=env.P6_PHASE5B_CONDITIONAL_REVIEW_PROTOCOL_SHA256??"";
 if(!Object.values(P6_CONDITIONAL_INSTALL_ACTIONS).includes(a))hold("ACTION");
 if(a===P6_CONDITIONAL_INSTALL_ACTIONS.PREVIEW){
  if(token||expected||protocol)hold("PREVIEW_SCOPE");return a;
 }
 if(mode!=="conditional_custody"||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=="refs/heads/main"||
  env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_ACTOR!=="HKcode22"||env.GITHUB_RUN_ATTEMPT!=="1"||
  !C.test(env.GITHUB_SHA??"")||env.GITHUB_SHA!==env.P6_PHASE5B_RUNTIME_EXECUTABLE_SHA||
  !H.test(expected)||!H.test(protocol)||!H.test(env.P6_CONDITIONAL_COMMITMENT_REVIEW_SHA256??"")||
  !env.P6_CONDITIONAL_COMMITMENT_REVIEW_BASE64)hold("EXACT_OWNER_PROTECTED_SCOPE");
 const active=env.P6_PHASE5B_CONDITIONAL_ACTIVE_PROTOCOL_SHA256??"";
 if(a===P6_CONDITIONAL_INSTALL_ACTIONS.VERIFY_ACTIVE?active!==protocol:Boolean(active))hold("ACTIVE_SELECTOR_DRIFT");
 if(a===P6_CONDITIONAL_INSTALL_ACTIONS.STAGE){
  // Only a separately owner-created repository-scoped fine-grained token.
  // Never forward a classic owner token, default GITHUB_TOKEN or a signer.
  if(!/^github_pat_[A-Za-z0-9_]{30,255}$/.test(token)||
   env.P6_CONDITIONAL_LATER_METADATA_READ_ENABLED==="1"||env.P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256)hold("INACTIVE_STAGE_SCOPE_OR_TOKEN");
 }else if(token)hold("READBACK_WRITE_CAPABILITY_FORBIDDEN");
 return a;
}
export function buildP6ConditionalSuccessorStagePlan(candidate,expected){
 if(candidate?.status!=="CONDITIONAL_POLICY_CANDIDATE_PREVIEW_NOT_INSTALLED"||
  !H.test(expected??"")||candidate.candidateCommitmentSha256!==expected||
  candidate.actualConditionalPolicyInstalledVerified!==false||candidate.actualConditionalPreCommitVerified!==false||
  !["providerCalls","databaseWrites","githubWrites","signaturesIssued"].every(k=>candidate[k]===0)||candidate.phase6PaidGo!==false)
  hold("CANDIDATE_NOT_EXACT_REVIEWED_PREVIEW");
 const bytes=candidate.privatePolicyBytes,digests={},writes=[];
 for(const k of Object.keys(stems)){
  const b=bytes?.[k];
  if(!Buffer.isBuffer(b)||b.length<100||b.toString("base64").length>48000)hold("SECRET_BYTES_CAPACITY");
  const prefix=NEXT+stems[k],d=hash(b);digests[k]=d;
  writes.push({name:prefix+"_BASE64",value:b.toString("base64")},{name:prefix+"_SHA256",value:d});
 }
 if(p6ConditionalCommitment("candidate",digests)!==expected)hold("PRIVATE_CANDIDATE_BYTES_DRIFT");
 const result={candidateCommitmentSha256:expected,secretCount:writes.length};
 Object.defineProperty(result,"privateWrites",{value:Object.freeze(writes.map(Object.freeze)),enumerable:false});
 return Object.freeze(result);
}
function gitHubCli(token,args,input){
 // No shell, command tracing, provider or database environment, or stdout/
 // stderr from gh may escape this process. The token is never a CLI argument.
 const result=spawnSync("gh",args,{input,encoding:"utf8",timeout:25000,maxBuffer:128000,
  env:{PATH:process.env.PATH,HOME:process.env.HOME,GH_TOKEN:token,GH_PROMPT_DISABLED:"1",
   GH_NO_UPDATE_NOTIFIER:"1",GH_NO_EXTENSION_UPDATE_NOTIFIER:"1"}});
 if(result.status!==0||result.error)hold("GITHUB_OPERATION_UNKNOWN_NO_ACTIVATION");
 return result.stdout.trim();
}
export function openP6ConditionalStageTransport(token){
 if(!/^github_pat_[A-Za-z0-9_]{30,255}$/.test(token??""))hold("SCOPED_OWNER_TOKEN_REQUIRED");
 const gh=(args,input)=>gitHubCli(token,args,input);
 const names=path=>gh(["api","--paginate",path,"--jq",".secrets[].name"]).split(/\r?\n/).filter(Boolean);
 return Object.freeze({owner:()=>gh(["api","user","--jq",".login"]),
  repoNames:()=>names("repos/"+REPO+"/actions/secrets?per_page=100"),
  environmentNames:()=>names("repos/"+REPO+"/environments/"+ENVIRONMENT+"/secrets?per_page=100"),
  set:(name,value)=>{
   if(!P6_CONDITIONAL_SUCCESSOR_SECRET_NAMES.includes(name))hold("SECRET_NAME_SCOPE");
   gh(["secret","set",name,"--repo",REPO],value);
  }});
}
export function stageP6ConditionalSuccessor({env,candidate,review,transportFactory=openP6ConditionalStageTransport}){
 if(admitP6ConditionalInstallAction(env,"conditional_custody")!==P6_CONDITIONAL_INSTALL_ACTIONS.STAGE||
  review?.ownerDelegatedTechnicalScopeReviewed!==true||review.protocolSha256!==env.P6_PHASE5B_CONDITIONAL_REVIEW_PROTOCOL_SHA256||
  review.standaloneNoT24ProtocolSha256!==null||candidate.reviewSha256!==env.P6_CONDITIONAL_COMMITMENT_REVIEW_SHA256)hold("REVIEW_DRIFT");
 const plan=buildP6ConditionalSuccessorStagePlan(candidate,env.P6_PHASE5B_CONDITIONAL_EXPECTED_CANDIDATE_SHA256);
 const g=transportFactory(env.P6_PHASE5B_CONDITIONAL_INSTALL_TOKEN);
 if(g.owner()!=="HKcode22")hold("OWNER_TOKEN_IDENTITY");
 const rn=g.repoNames(),en=g.environmentNames(),scoped=[...oldNames,...P6_CONDITIONAL_SUCCESSOR_SECRET_NAMES];
 if(!Array.isArray(rn)||!Array.isArray(en)||new Set(rn).size!==rn.length||new Set(en).size!==en.length||
  !oldNames.every(n=>rn.includes(n))||en.some(n=>scoped.includes(n))||
  new Set([...rn,...P6_CONDITIONAL_SUCCESSOR_SECRET_NAMES]).size>100)hold("SECRET_SCOPE_CAPACITY_OR_SHADOW");
 let acknowledged=0;
 for(const {name,value} of plan.privateWrites){
  try{g.set(name,value);acknowledged++;}
  catch{return Object.freeze({status:"HOLD_CONDITIONAL_SUCCESSOR_STAGE_PARTIAL_OR_UNKNOWN_INACTIVE",
   acknowledgedSecretWrites:acknowledged,expectedSecretWrites:6,candidateCommitmentSha256:plan.candidateCommitmentSha256,
   candidatePublicCommitmentLetters:encodeP6PublicPolicyCommitment(plan.candidateCommitmentSha256),githubWritesMayHaveOccurred:true,
   activeSelectorChanged:false,actualConditionalPolicyInstalledVerified:false,providerCalls:0,databaseWrites:0,signaturesIssued:0,phase6PaidGo:false});}
 }
 return Object.freeze({status:"CONDITIONAL_SUCCESSOR_SIX_SECRET_WRITES_ACKNOWLEDGED_INACTIVE",
  acknowledgedSecretWrites:acknowledged,expectedSecretWrites:6,candidateCommitmentSha256:plan.candidateCommitmentSha256,
  candidatePublicCommitmentLetters:encodeP6PublicPolicyCommitment(plan.candidateCommitmentSha256),githubWrites:acknowledged,
  activeSelectorChanged:false,actualConditionalPolicyInstalledVerified:false,providerCalls:0,databaseWrites:0,signaturesIssued:0,phase6PaidGo:false});
}
/** Readback uses actual restricted custody, authenticated policy bytes and
 * the already reviewed exact preview commitment. It never stages or writes.
 */
export function verifyP6ConditionalSuccessorReadback({ctx,receipt,review,env}){
 const a=admitP6ConditionalInstallAction(env,"conditional_custody"),active=a===P6_CONDITIONAL_INSTALL_ACTIONS.VERIFY_ACTIVE;
 if(!active&&a!==P6_CONDITIONAL_INSTALL_ACTIONS.VERIFY_STAGED)hold("READBACK_ACTION");
 const protocol=env.P6_PHASE5B_CONDITIONAL_REVIEW_PROTOCOL_SHA256,expected=env.P6_PHASE5B_CONDITIONAL_EXPECTED_CANDIDATE_SHA256;
 const actual=p6ConditionalCommitment("candidate",{daily:env.P6_NONPAID_DAILY_POLICY_SHA256,signing:env.P6_NONPAID_SIGNING_POLICY_SHA256,transport:env.P6_NONPAID_TRANSPORT_TRUST_SHA256});
 const base=p6ConditionalCommitment("base",{daily:env.P6_PHASE5B_BASE_DAILY_SHA256,signing:env.P6_PHASE5B_BASE_SIGNING_SHA256,transport:env.P6_PHASE5B_BASE_TRANSPORT_SHA256});
 const p=ctx.p,q=ctx.q,v=p.nativeLaterReview,tr=deriveP6NativeT24PolicyTransition(p),scope=deriveP6ConditionalT24Scope(p);
 if(receipt.status!=="P6_ACTUAL_PROTECTED_CONDITIONAL_POLICY_CUSTODY_READONLY"||
  !["exactThreePolicyDigestsValidated","exact31PlanPinsValidated","canonicalNativePredecessorBytes","nativePolicyPresent","baseIntervalCoversRemainingStudy","publicActorsVerified","conditionalProtocolVarMatchesPolicy","conditionalMetadataEnabled"].every(k=>receipt[k]===true)||
  receipt.conditionalPolicyFieldState!=="ALL_FIELDS_PRESENT_NOT_COMMISSIONED_PROOF"||
  receipt.signingOrPublishingCapabilityPresent!==false||receipt.actualConditionalPreCommitVerified!==false||
  !["providerCalls","databaseWrites","githubWrites","signaturesIssued"].every(k=>receipt[k]===0)||
  actual!==expected||base!==review?.basePolicyCommitmentSha256||
  review.schema!=="v39.phase5b.prospective-conditional-commissioning-commitment-review.v1"||
  review.ownerDelegatedTechnicalScopeReviewed!==true||review.standaloneNoT24ProtocolSha256!==null||
  review.manifestSha256!==ctx.trust.manifestSha256||review.rightsSha256!==ctx.trust.rightsSha256||
  review.firstEligibleRunDayIndex!==receipt.prospective.runDayIndex||review.protocolSha256!==protocol||
  !tr||tr.previousDailyPolicySha256!==env.P6_PHASE5B_BASE_DAILY_SHA256||
  tr.firstConditionalRunDayIndex!==review.firstEligibleRunDayIndex||tr.conditionalEffectiveUtc!==review.effectiveUtc||
  !scope||scope.protocolSha256!==protocol||scope.externalContentUseReviewSha256!==review.externalContentUseReviewSha256||
  p.conditionalLaterPermitReview?.standaloneNoT24ProtocolSha256!==null||
  q.conditionalServicePolicy?.firstEligibleRunDayIndex!==review.firstEligibleRunDayIndex||
  q.conditionalServicePolicy?.effectiveUtc!==review.effectiveUtc||
  [p.conditionalT24PermitReview,p.conditionalLaterPermitReview,v.conditionalLaterDayAppendPolicy].some(x=>x?.validFromUtc!==review.effectiveUtc||x?.validUntilUtc!==review.validUntilUtc)||
  !admitP6ConditionalT24Reviewer(env,p,ctx.trust)||!admitP6ConditionalLaterReviewer(env,p,ctx.trust))hold("READBACK_COMMITMENT_OR_SCOPE_DRIFT");
 return Object.freeze({...receipt,status:active?"P6_ACTUAL_ACTIVE_CONDITIONAL_POLICY_READBACK_NO_PROVIDER":"P6_ACTUAL_STAGED_CONDITIONAL_POLICY_READBACK_INACTIVE",
  basePolicyCommitmentSha256:base,basePolicyPublicCommitmentLetters:encodeP6PublicPolicyCommitment(base),
  reviewSha256:env.P6_CONDITIONAL_COMMITMENT_REVIEW_SHA256,candidateCommitmentSha256:actual,candidatePublicCommitmentLetters:encodeP6PublicPolicyCommitment(actual),
  actualConditionalPolicyStagedVerified:true,actualConditionalPolicyInstalledVerified:active,
  actualConditionalPreCommitVerified:false,activeSelectorChanged:false});
}
