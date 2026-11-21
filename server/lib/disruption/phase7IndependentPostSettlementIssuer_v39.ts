/** Independent POST signer: reuse the actual committed SOURCE audit and
 * existing restricted PRE-group reader. This path settles ONLY an explicitly
 * reviewed unverified-label outcome after the existing signed POST window.
 * It never upgrades reported revised/runway/cancellation fields to truth.
 * It cannot issue a numerical target. Genuine independently attested outcome
 * decisions continue to use the existing signed settlement contract.
 * No provider/reserve/writer/owner credentials or production approval here.
 */
import {createHash,createPublicKey,randomUUID,sign,type KeyObject} from "node:crypto";
import type {Pool} from "pg";
import {readP6CommittedPostOutcomeObservability,type P6PostCommittedScope,type P6PostPreservationAnchor} from "./phase6ActualPostOutcomeObservability_v39";
import {verifyP5FuturePostReviewedFrame} from "./phase5V0083FuturePostOriginalDb_v39";
import {phase7CommittedPostAuditIdentity,verifyPhase7RecoveryReceiptForAudit} from "./phase7CommittedPostRecovery_v39";
import {phase7AuditedPreservationGroups} from "./phase7PostPreservationBridge_v39";
import {readPhase7PostScopedGroup,preflightPhase7PostScopedReader} from "./phase7PostScopedGroup_v39";
import {assemblePhase7FinalGroupCandidate,type Phase7GroupOutcomeScope,type Phase7StoredPreFragment,type Phase7FinalAssemblyIds} from "./phase7FinalGroupAssembly_v39";
import {assertPhase7PostSettlementCustodyShape,readPhase7PostReviewerPublicKey,verifyPhase7SignedPostSettlement,phase7PostFragmentsDigest,type Phase7SignedPostSettlement} from "./phase7SignedPostReview_v39";
import {hashPhase7DurableCandidate,validateDurableDerivedBundle,type Phase7DurableBundleApproval,type Phase7DurableDerivedBundle} from "./phase7DurableDerivedBundleCandidate_v39";
import type {Phase7DerivedReleaseContract,Phase6ReleaseHorizon} from "./phase6DerivedTrainingReleaseContract_v39";
import type {Phase7ReviewedTransformationProfile} from "./phase7ReviewedSourceTransformation_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_INDEPENDENT_POST_ISSUER_"+s)};
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const digest=(x:unknown):x is string=>typeof x==="string"&&H.test(x)&&!/^([a-f0-9])\1{63}$/.test(x);
const sha=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const at=(x:unknown)=>{if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(Date.parse(x)).toISOString()!==x)return hold("CLOCK");return Date.parse(x)};
const exact=(x:unknown,k:string[])=>!!x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(v=>Object.hasOwn(x,v));
function pinned(raw:string|undefined,hash:string|undefined,max=35000){
 if(!raw||raw.length>Math.ceil(max/3)*4||!(/^[A-Za-z0-9+/]+={0,2}$/).test(raw)||!digest(hash))return hold("REVIEW_BYTES");
 const bytes=Buffer.from(raw,"base64");
 if(bytes.toString("base64")!==raw||bytes.length>max||sha(bytes)!==hash)hold("REVIEW_BYTES");
 return JSON.parse(bytes.toString("utf8"));
}
type Policy={schema:"v39.phase7.independent-post-settlement-policy.v1";manifestSha256:string;rightsSha256:string;prePolicySha256:string;contractSha256:string;profileSha256:string;nativePostPolicySha256:string;validFromUtc:string;validUntilUtc:string;
 unverifiedLabelDisposition:"CENSOR_AFTER_REVIEWED_POST_OBSERVATION";independentBoundedSettlementApproved:true;sourceParityReviewSha256:string;reconstructionReviewSha256:string;fieldReviewSha256:string;associationReviewSha256:string;continuousTargetReviewSha256:string;minTargetMinutes:number;maxTargetMinutes:number};
type Inputs={env:NodeJS.ProcessEnv;signer:KeyObject;source:Pick<Pool,"connect">;scopedReader:Pick<Pool,"connect">;scopedReaderRole:string;contract:Phase7DerivedReleaseContract;profile:Phase7ReviewedTransformationProfile;readExactRecoveryReceipt:(scope:Readonly<P6PostCommittedScope>)=>Promise<unknown>};
export function createP7IndependentPostSettlementIssuer(d:Inputs){
 const {env:e,signer,contract,profile}=d;
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||e.GITHUB_REF!=="refs/heads/main"||
  e.GITHUB_RUN_ATTEMPT!=="1"||!C.test(e.GITHUB_SHA??"")||e.GITHUB_SHA!==e.V39_P5_POST_APPROVED_CODE_SHA||
  e.P6_PHASE7_POST_RECOVERY_REVIEWER_APPROVED!=="1"||e.P6_PHASE7_POST_STORAGE_APPROVED!=="1"||
  e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||e.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
  [e.AERODATABOX_API_KEY,e.RAPIDAPI_KEY,e.AERODATABOX_WEBHOOK_SECRET,e.DATABASE_URL,e.V39_DATABASE_RUNTIME_URL,e.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,e.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,e.P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL,e.P6_PRIVATE_PUBLISHER_DATABASE_URL,e.P5_V39_PRE_DATABASE_URL,e.P5_V39_PREPARE_DATABASE_URL,e.P5_V39_T24_WITNESS_DATABASE_URL,e.P6_PRIVATE_POST_REVIEWER_KEY_BASE64,e.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64,e.P6_PRIVATE_LATER_REVIEWER_KEY_BASE64,e.P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64,e.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PRIVATE_KEY_BASE64].some(Boolean)||
  d.source===d.scopedReader||d.scopedReaderRole!=="phase7_post_scoped_prod20261120"||typeof d.readExactRecoveryReceipt!=="function")hold("PROTECTED_NO_PROVIDER_SCOPE");
 const key=readPhase7PostReviewerPublicKey(e);
 if(signer?.type!=="private"||signer.asymmetricKeyType!=="ed25519"||!createPublicKey(signer).export({type:"spki",format:"der"}).equals(key.export({type:"spki",format:"der"}))||
  e.P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256===e.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256)hold("SIGNER_SCOPE");
 const p=pinned(e.P6_PHASE7_POST_PRESERVATION_POLICY_BASE64,e.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256) as Policy;
 if(!exact(p,["schema","manifestSha256","rightsSha256","prePolicySha256","contractSha256","profileSha256","nativePostPolicySha256","validFromUtc","validUntilUtc","unverifiedLabelDisposition","independentBoundedSettlementApproved","sourceParityReviewSha256","reconstructionReviewSha256","fieldReviewSha256","associationReviewSha256","continuousTargetReviewSha256","minTargetMinutes","maxTargetMinutes"])||
  p.schema!=="v39.phase7.independent-post-settlement-policy.v1"||!digest(p.manifestSha256)||!digest(p.rightsSha256)||p.manifestSha256!==e.V39_P5_MANIFEST_SHA256||p.rightsSha256!==e.V39_P5_RIGHTS_SHA256||
  !digest(p.prePolicySha256)||p.prePolicySha256!==e.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256||
  p.contractSha256!==hashPhase7DurableCandidate(contract)||p.contractSha256!==e.P6_PHASE7_POST_CONTRACT_SHA256||p.profileSha256!==hashPhase7DurableCandidate(profile)||p.profileSha256!==e.P6_PHASE7_POST_PROFILE_SHA256||
  p.nativePostPolicySha256!==e.P6_NATIVE_POST_POLICY_SHA256||p.unverifiedLabelDisposition!=="CENSOR_AFTER_REVIEWED_POST_OBSERVATION"||p.independentBoundedSettlementApproved!==true||
  ![p.sourceParityReviewSha256,p.reconstructionReviewSha256,p.fieldReviewSha256,p.associationReviewSha256,p.continuousTargetReviewSha256].every(digest)||
  !Number.isFinite(p.minTargetMinutes)||!Number.isFinite(p.maxTargetMinutes)||p.minTargetMinutes>=p.maxTargetMinutes||at(p.validFromUtc)>=at(p.validUntilUtc)||at(p.validUntilUtc)>at(contract.researchExpiryUtc))hold("INDEPENDENT_SETTLEMENT_POLICY");
 const native=pinned(e.P6_NATIVE_POST_POLICY_BASE64,e.P6_NATIVE_POST_POLICY_SHA256);
 if(native.schema!=="v39.phase6.native-post-physical-window-policy.v1"||native.independentPostRequestGeometryApproved!==true||native.manifestSha256!==p.manifestSha256||native.rightsSha256!==p.rightsSha256||native.reviewedCodeSha!==e.GITHUB_SHA||
  !Number.isSafeInteger(native.followupAfterPartitionEndSeconds)||native.followupAfterPartitionEndSeconds<0||
  !Number.isSafeInteger(native.dispatchWindowSeconds)||native.dispatchWindowSeconds<1||native.dispatchWindowSeconds>1800||native.followupAfterPartitionEndSeconds+native.dispatchWindowSeconds>48*3600||native.expectedApiUnitsPerGet!==2)hold("EXISTING_POST_GEOMETRY");
 const before=(clock:string)=>{const n=at(clock);if(n<at(p.validFromUtc)||n>=at(p.validUntilUtc))hold("POLICY_CLOCK");return n;};
 let active:null|{scope:Readonly<P6PostCommittedScope>;scopeSha:string;audit:Awaited<ReturnType<typeof readP6CommittedPostOutcomeObservability>>;groups:ReturnType<typeof phase7AuditedPreservationGroups>["eligible"]}=null;
 const issued=new Set<string>();
 return {
  async preflight(){const clock=await preflightPhase7PostScopedReader(d.scopedReader,d.scopedReaderRole,contract);before(clock);return {providerCalls:0 as const,databaseWrites:0 as const}},
  /** Consumer has already requested the signed recovery receipt. Read it
   * from independent custody and reproduce the exact audit denominator.
   * No caller-provided group list or label booleans become evidence. */
  async prepare(scope:Readonly<P6PostCommittedScope>){
   if(active)hold("ONE_ORIGINAL_NO_REPLAY");
   const q=scope.packet,f=verifyP5FuturePostReviewedFrame(q);
   if(q.manifestSha256!==p.manifestSha256||q.reviewedSourceRightsSha256!==p.rightsSha256||q.reviewedFrameSha256!==native.reviewedFrameSha256||q.reviewedProviderContractSha256!==native.reviewedProviderContractSha256||q.reviewedProviderPriceSha256!==native.reviewedProviderPriceSha256||q.reviewedCategoryBudgetSha256!==native.reviewedCategoryBudgetSha256||
    f.reservedSha256!==scope.reservationSha256||f.start!==f.to+native.followupAfterPartitionEndSeconds*1000||f.end!==f.start+native.dispatchWindowSeconds*1000)hold("EXACT_POST_SCOPE");
   const audit=await readP6CommittedPostOutcomeObservability(d.source,scope);
   const now=before(audit.privateObservedDbClockUtc);
   if(at(audit.privateOriginalAvailableAtUtc)<f.start||now<f.start||now>=at(audit.privateOriginalAvailableAtUtc)+600000||audit.actualGateOutNumericCandidates!==0||audit.confirmedCancellationLabels!==0)hold("REVIEWED_POST_WINDOW");
   const recovery=await d.readExactRecoveryReceipt(scope),clock=await preflightPhase7PostScopedReader(d.scopedReader,d.scopedReaderRole,contract);
   before(clock);verifyPhase7RecoveryReceiptForAudit(e,scope,audit,recovery,clock);
   active={scope:Object.freeze({...scope,packet:Object.freeze({...q})}),scopeSha:hashPhase7DurableCandidate(scope),audit,groups:phase7AuditedPreservationGroups(audit).eligible};
   return {providerCalls:0 as const,databaseWrites:0 as const,eligibleGroups:active.groups.size};
  },
  async issue(input:{committed:Readonly<P6PostCommittedScope>;anchor:Readonly<P6PostPreservationAnchor>;fragments:readonly Phase7StoredPreFragment[];observedDbClockUtc:string}){
   const a=active;if(!a||hashPhase7DurableCandidate(input.committed)!==a.scopeSha)return hold("EXACT_PREPARED_ORIGINAL");
   const live=a.groups.get(input.anchor.flightInstanceId);
   if(!live||!live.length||live.length>3||input.anchor.ambiguousIdentity||new Set(live.map(x=>x.horizon)).size!==live.length||
    live.some(x=>x.selectedNativeTUtc!==input.anchor.selectedNativeTUtc))return hold("GROUP_MEMBERSHIP");
   const anchor=[...live].sort((x,y)=>at(y.sourceExpiresAtUtc)-at(x.sourceExpiresAtUtc)||x.horizon.localeCompare(y.horizon))[0];
   if(hashPhase7DurableCandidate(anchor)!==hashPhase7DurableCandidate(input.anchor))hold("EXACT_LIVE_ANCHOR");
   const group=await readPhase7PostScopedGroup(d.scopedReader,d.scopedReaderRole,contract,profile,anchor),now=before(group.observedAtUtc);
   if(at(input.observedDbClockUtc)>now||now<at(a.audit.privateObservedDbClockUtc)||
    hashPhase7DurableCandidate(group.fragments)!==hashPhase7DurableCandidate(input.fragments)||live.some(x=>!group.fragments.some(f=>f.packet.rows[0].horizon===x.horizon)))hold("EXACT_GROUP_READBACK");
   const groupId=group.fragments[0].groupId;
   if(issued.has(groupId))hold("GROUP_ALREADY_ISSUED_NO_REPLAY");
   const until=Math.min(at(a.audit.privateOriginalAvailableAtUtc)+600000,at(anchor.sourceExpiresAtUtc),at(p.validUntilUtc),at(contract.researchExpiryUtc));
   if(now>=until||now<at(anchor.selectedNativeTUtc))hold("LIVE_SETTLEMENT_WINDOW");
   const horizons=["T-24h","T-6h","T-90m"] as const,existing=new Set(group.fragments.map(f=>f.packet.rows[0].horizon));
   const ids:Phase7FinalAssemblyIds={continuousPacketId:randomUUID(),missingPreRows:Object.fromEntries(horizons.filter(h=>!existing.has(h)).map(h=>[h,randomUUID()])) as Partial<Record<Phase6ReleaseHorizon,string>>};
   const scope:Phase7GroupOutcomeScope={groupId,associationReviewSha256:p.associationReviewSha256,outcomeReviewSha256:hashPhase7DurableCandidate({schema:"v39.phase7.independently-read-unverified-post-outcome.v1",policy:e.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256,audit:phase7CommittedPostAuditIdentity(a.audit),anchor:hashPhase7DurableCandidate(anchor),fragments:phase7PostFragmentsDigest(group.fragments),settlementAtUtc:group.observedAtUtc}),groupSettlementDue:true,evidence:Object.fromEntries([...existing].map(h=>[h,null]))};
   const v=assemblePhase7FinalGroupCandidate(contract,profile,group.fragments,scope,group.observedAtUtc,ids);
   if(v.continuous.rows.some(x=>x.value!==null)||v.packet.rows.some(x=>x.censoring==="observed"||Object.values(x.labelBuckets).some(y=>y!==null)))hold("UNVERIFIED_NUMERIC_FORBIDDEN");
   const bundle:Phase7DurableDerivedBundle={schema:"v39.phase7.durable-derived-bundle.v1",packet:v.packet,paired:{...v.association,schema:"v39.phase7.paired-derived-association-reviewed.v1",approvedForUse:true},continuous:v.continuous};
   const approval:Phase7DurableBundleApproval={schema:"v39.phase7.durable-derived-bundle-independent-review.v1",contractSha256:p.contractSha256,bundleSha256:hashPhase7DurableCandidate(bundle),sourceParityReviewSha256:p.sourceParityReviewSha256,reconstructionReviewSha256:p.reconstructionReviewSha256,fieldReviewSha256:p.fieldReviewSha256,associationReviewSha256:p.associationReviewSha256,continuousTargetReviewSha256:p.continuousTargetReviewSha256,approvedForDurableStorage:true,sourceMappingPersisted:false,minTargetMinutes:p.minTargetMinutes,maxTargetMinutes:p.maxTargetMinutes};
   validateDurableDerivedBundle(contract,bundle,approval,new Date(now));
   const settlement:Phase7SignedPostSettlement={schema:"v39.phase7.exact-post-group-settlement.v1",policySha256:e.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256!,manifestSha256:p.manifestSha256,rightsSha256:p.rightsSha256,anchorSha256:hashPhase7DurableCandidate(anchor),committedPostSha256:a.scopeSha,fragmentsSha256:phase7PostFragmentsDigest(group.fragments),reviewedAtUtc:group.observedAtUtc,releasedAtUtc:group.observedAtUtc,validUntilUtc:new Date(until).toISOString(),scope,assemblyIds:ids,approval};
   assertPhase7PostSettlementCustodyShape(settlement);
   const bytes=Buffer.from(JSON.stringify(settlement)),wire={payloadBase64:bytes.toString("base64"),signatureBase64:sign(null,bytes,signer).toString("base64")};
   verifyPhase7SignedPostSettlement({env:e,wire,anchor,committed:a.scope,fragments:group.fragments,contract,profile,observedDbClockUtc:group.observedAtUtc});
   issued.add(groupId);
   const out={status:"INDEPENDENT_UNVERIFIED_POST_CENSORED_SETTLEMENT_ISSUED_NO_GO",providerCalls:0,databaseWrites:0,numericalGateOutLabels:0,phase6PaidGo:false};
   return Object.freeze(Object.defineProperty(out,"privateWire",{value:Object.freeze(wire),enumerable:false})) as typeof out&{readonly privateWire:typeof wire};
  }
 };
}
