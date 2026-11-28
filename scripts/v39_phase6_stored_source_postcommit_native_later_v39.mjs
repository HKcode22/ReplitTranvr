import {sameP5ConditionalLaterReviewerScope} from "../server/lib/disruption/phase5ExternalEd25519LaterShardReviewerVerify_v39.ts";
/** Existing SOURCE child's nonpaid follow-on. No new provider request,
 * no PRE writer or queue enrollment in this process. Read confirmed
 * SOURCE once; privately review/publish later shards via existing ports.
 * Never run both the audit-only and this follow-on for a single child.
 * All publication uses independently approved protected policies and
 * existing restricted logins; STOP default. */
import pg from "pg";
import {readP6T24CurrentRegistrySet,buildP6DelegatedT24PrivateRegistry,publishP6T24PrivateRegistryOnce,deriveP6ConditionalT24Scope,deriveP6NativeT24PolicyTransition,buildP6ConditionalT24RegistryProposal,signP6DelegatedConditionalT24Registry} from "../server/lib/disruption/phase6PrivateT24RegistryTransport_v39.mjs";
import {createHash,createPrivateKey,createPublicKey} from "node:crypto";
import {pathToFileURL} from "node:url";
import {admitP6PostcommitNativeAudit,runP6PostcommitNativeAudit} from "./v39_phase6_stored_source_postcommit_native_audit_v39.mjs";
import {readP6PendingLaterT24EvidencePage} from "../server/lib/disruption/phase6LaterT24EvidenceBatchReadOnly_v39.ts";
import {pageP5UnsignedNativePreReviewDossier} from "../server/lib/disruption/phase5SourceBoundUnsignedPreDossier_v39.ts";
import {signP6DelegatedNativeLaterReviewPage,signP6DelegatedConditionalLaterRegistry,readP6ConditionalSourceInstructionProof,readP6ConditionalT24ReviewInstructionProof,readP6ConditionalLaterReviewInstructionProof} from "../server/lib/disruption/phase6StoredSourceNativeCandidateAudit_v39.mjs";
import {readP5ConditionalT24ReviewDelegation} from "../server/lib/disruption/phase5ConditionalPrePermitPreparation_v39.ts";
import {resolveP7PublicationProofs,resolveP7ConditionalPublicationPage} from "../server/lib/disruption/phase7IndependentPreProofPublication_v39.mjs";
import {enrichP7NativeFeatureReviewWithNoaa} from "../server/lib/disruption/phase7IndependentNoaaReceipt_v39.ts";
import {runP6DelegatedReviewedLaterAppend} from "../server/lib/disruption/phase6ReviewedLaterShardAppendRuntime_v39.ts";
import {readP6StoredPrivateReviewOnce} from "../server/lib/disruption/phase6StoredPrivateReviewReadOnce_v39.mjs";
import {hydrateP6DayEpochFullRegistriesReadOnly} from "../server/lib/disruption/phase6DayEpochFullRegistryReadOnce_v39.mjs";
import {inspectP6DayEpochExistingShardSemanticsNoGo} from "../server/lib/disruption/phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {makeP5Stage28DedicatedRolePool} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39.ts";
import {openP7StoredPreProofPort} from "../server/lib/disruption/phase7PrivateSignedReviewTransport_v39.ts";
import {openP7LocalPrivatePreHandoff,p7LocalPreSocketPaths,callP7LocalPreRole,makeP7LocalPreRequest} from "../server/lib/disruption/phase7LocalPrivatePreHandoff_v39.ts";
import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39.ts";
import {checkPhase7PrePolicyStructure,checkPhase7NativePrePolicySupport,inspectPhase7PreWriterRole} from "../server/lib/disruption/phase7PrePolicyCommission_v39.ts";
import {openPhase7ProtectedPreResolver,parsePhase7ProtectedPrePolicy} from "../server/lib/disruption/phase7ProtectedPreResolver_v39.ts";
const H=/^[a-f0-9]{64}$/,LOGIN=/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/;
const hold=s=>{throw Error("HOLD_P6_NATIVE_LATER_RUNTIME_"+s);};
const hash=b=>createHash("sha256").update(b).digest("hex");
const iso=x=>typeof x==="string"&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const preLogin="phase5_p30_pre_login_20261107";
const ro={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
const ports=["P5_V39_PRE_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL","P6_PRIVATE_LATER_REVIEWER_KEY_BASE64","P6_PRIVATE_DAY_REVIEWER_KEY_BASE64"];
function key(raw,fp){
 try{
  if(typeof raw!=="string"||raw.length>12000||raw.length<100||!H.test(fp??""))hold("REVIEWER_KEY_MISSING");
  const b=Buffer.from(raw,"base64");
  if(b.toString("base64")!==raw)hold("NONCANONICAL_KEY");
  const k=createPrivateKey(b);b.fill(0);
  if(k.asymmetricKeyType!=="ed25519"||hash(createPublicKey(k).export({format:"der",type:"spki"}))!==fp)hold("REVIEWER_KEY_DRIFT");
  return k;
 }catch{hold("REVIEWER_KEY_DRIFT");}
}
function endpoint(raw,login,source,direct){
 let u;try{u=new URL(raw);}catch{hold("MISSING_RESTRICTED_URL");}
 if(!sameP6NeonDatabaseEndpoint(u,source)||decodeURIComponent(u.username)!==login||!u.password||
    u.searchParams.getAll("sslmode").length!==1||u.searchParams.get("sslmode")!=="require"||
    [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require"))||
    (direct&&u.hostname.split(".")[0].endsWith("-pooler")))hold("RESTRICTED_TLS_ENDPOINT_OR_LOGIN_DRIFT");
 return raw;
}
/** The conditional publisher must have its separately pinned public
 * reviewer identity before SOURCE. Uncommissioned native-only policy
 * keeps the original behavior; never defer a known missing pin until
 * after a paid acquisition. */
export function admitP6ConditionalT24Reviewer(env,p,t){
 const scope=deriveP6ConditionalT24Scope(p),d=p.conditionalT24PermitReview,v=p.nativeLaterReview;
 if(!scope){if(d!==undefined)hold("CONDITIONAL_T24_DELEGATION_WITHOUT_REGISTRY_SCOPE");return null;}
 const fp=env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256,proofFp=env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256,
  encoded=env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PUBLIC_KEY_BASE64??"";
 const forbidden=[v.laterReviewerFingerprintSha256,t.dayReviewerFingerprintSha256,t.queryReviewerFingerprintSha256,proofFp];
 if(!H.test(fp??"")||forbidden.some(k=>!H.test(k??""))||new Set([...forbidden,fp]).size!==5||
  !encoded||encoded.length>5500||!d||Object.keys(d).sort().join("|")!==["schema","approved","protocolSha256","externalContentUseReviewSha256","reviewerFingerprintSha256","reportedScheduleSemanticsSha256","validFromUtc","validUntilUtc"].sort().join("|")||
  d.schema!=="v39.phase5.conditional-t24-permit-review-delegation.v1"||d.approved!==true||d.protocolSha256!==scope.protocolSha256||
  d.externalContentUseReviewSha256!==scope.externalContentUseReviewSha256||d.reviewerFingerprintSha256!==fp||
  v.nativeT24ReviewApproved!==true||v.independentT24WitnessProtocolReviewed!==true||v.reviewedWitnessOnlyRole!=="phase5_fids_t24_witness_prod_20261107"||
  !H.test(d.reportedScheduleSemanticsSha256??"")||d.reportedScheduleSemanticsSha256!==v.selectedTConfig?.semanticsEvidenceSha256||
  !iso(d.validFromUtc)||!iso(d.validUntilUtc)||d.validFromUtc>=d.validUntilUtc||d.validFromUtc<v.validFromUtc||d.validUntilUtc>v.validUntilUtc)
  hold("CONDITIONAL_T24_REVIEWER_NOT_READY");
 const b=Buffer.from(encoded,"base64");
 if(b.toString("base64")!==encoded||!b.toString("utf8").startsWith("-----BEGIN PUBLIC KEY-----"))hold("CONDITIONAL_T24_REVIEWER_KEY_DRIFT");
 try{const k=createPublicKey(b);if(k.asymmetricKeyType!=="ed25519"||hash(k.export({type:"spki",format:"der"}))!==fp)hold("CONDITIONAL_T24_REVIEWER_KEY_DRIFT");}
 catch{hold("CONDITIONAL_T24_REVIEWER_KEY_DRIFT");}
 return Object.freeze({scope,fp,publicKeyPem:b.toString("utf8"),validFromUtc:d.validFromUtc,validUntilUtc:d.validUntilUtc});
}
/** Conditional later has a separate policy envelope. Never add the
 * conditional scope to the original native day-append policy. */
export function admitP6ConditionalLaterReviewer(env,p,t){
 const v=p.nativeLaterReview,d=p.conditionalLaterPermitReview,day=v?.conditionalLaterDayAppendPolicy,f=p.conditionalPreFeatureReview;
 const enabled=env.P6_CONDITIONAL_LATER_METADATA_READ_ENABLED;
 if(enabled===undefined||enabled===""||enabled==="0")return null;
 if(enabled!=="1"||!d||!day||!f||Object.hasOwn(v.dayAppendPolicy??{},"conditionalLaterPreScope"))hold("CONDITIONAL_LATER_REVIEWER_NOT_READY");
 const fp=env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256,proofFp=env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256,
  encoded=env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PUBLIC_KEY_BASE64??"",standalone=d.standaloneNoT24ProtocolSha256;
 const scope={protocolSha256:d.protocolSha256,externalContentUseReviewSha256:d.externalContentUseReviewSha256,
  ...(standalone===null?{}:{independentlyApprovedStandaloneProtocolSha256:standalone})};
 const forbidden=[v.laterReviewerFingerprintSha256,t.dayReviewerFingerprintSha256,t.queryReviewerFingerprintSha256,proofFp];
 if(![...forbidden,fp,d.protocolSha256,d.externalContentUseReviewSha256,d.reportedScheduleSemanticsSha256].every(k=>H.test(k??""))||
  new Set([...forbidden,fp]).size!==5||!encoded||encoded.length>5500||
  Object.keys(d).sort().join("|")!==["schema","approved","protocolSha256","externalContentUseReviewSha256","reviewerFingerprintSha256","reportedScheduleSemanticsSha256","validFromUtc","validUntilUtc","standaloneNoT24ProtocolSha256"].sort().join("|")||
  d.schema!=="v39.phase5.conditional-later-permit-review-delegation.v1"||d.approved!==true||d.reviewerFingerprintSha256!==fp||
  f.schema!=="v39.phase5.conditional-pre-feature-review-policy.v1"||f.approved!==true||f.rightsSha256!==t.rightsSha256||
  f.protocolSha256!==d.protocolSha256||f.externalContentUseReviewSha256!==d.externalContentUseReviewSha256||
  d.reportedScheduleSemanticsSha256!==v.selectedTConfig?.semanticsEvidenceSha256||
  (standalone!==null&&!H.test(standalone??""))||
  day.schema!=="v39.phase6.delegated-later-day-append-review-policy.v1"||day.delegatedAutomatedLaterDayAppendApproved!==true||
  !["approvedCodeSha","manifestSha256","calendarSha256","releaseSha256","rightsSha256","laterReviewerFingerprintSha256","dayReviewerFingerprintSha256","queryReviewerFingerprintSha256"].every(k=>day[k]===v.dayAppendPolicy[k])||
  !sameP5ConditionalLaterReviewerScope(day.conditionalLaterPreScope,scope)||
  !Number.isSafeInteger(day.maximumIndexRevision)||day.maximumIndexRevision<2||day.maximumIndexRevision>v.dayAppendPolicy.maximumIndexRevision||
  ![d.validFromUtc,d.validUntilUtc,day.validFromUtc,day.validUntilUtc].every(iso)||
  day.validFromUtc<v.dayAppendPolicy.validFromUtc||day.validUntilUtc>v.dayAppendPolicy.validUntilUtc||day.validFromUtc>=day.validUntilUtc||
  d.validFromUtc<day.validFromUtc||d.validUntilUtc>day.validUntilUtc||d.validFromUtc>=d.validUntilUtc)
  hold("CONDITIONAL_LATER_REVIEWER_NOT_READY");
 const raw=Buffer.from(encoded,"base64");
 if(raw.toString("base64")!==encoded||!raw.toString("utf8").startsWith("-----BEGIN PUBLIC KEY-----"))hold("CONDITIONAL_LATER_REVIEWER_KEY_DRIFT");
 try{const key=createPublicKey(raw);if(key.asymmetricKeyType!=="ed25519"||hash(key.export({type:"spki",format:"der"}))!==fp)hold("CONDITIONAL_LATER_REVIEWER_KEY_DRIFT");}
 catch{hold("CONDITIONAL_LATER_REVIEWER_KEY_DRIFT");}
 return Object.freeze({scope,fp,publicKeyPem:raw.toString("utf8"),validFromUtc:d.validFromUtc,validUntilUtc:d.validUntilUtc,day});
}
/** Existing exact source audit checks retained. The extra ROLE/key
 * credentials are limited to this follow-on step, never passed to the
 * original audit's admission or the paid SOURCE child. */
export function admitP6NativeLaterRuntime(env,read,mode="committed"){
 const actorOnly=mode==="actor-preflight";
 if((!actorOnly&&env.P6_NATIVE_LATER_RUNTIME_ENABLED!=="1")||env.P6_NATIVE_LATER_RUNTIME_APPROVED!=="1"||
    env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||env.AERODATABOX_WEBHOOK_SECRET||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.ADB_AUTO_COLLECT!=="0"||env.NODE_TLS_REJECT_UNAUTHORIZED==="0")hold("NOT_APPROVED_NONPAID_RUNTIME");
 const auditEnv={...env};for(const k of ports)delete auditEnv[k];
 const c=admitP6PostcommitNativeAudit(auditEnv,read,mode);
 const policyBytes=Buffer.from(env.P6_NONPAID_DAILY_POLICY_BASE64,"base64"),p=JSON.parse(policyBytes.toString("utf8")),v=p.nativeLaterReview;
 const t=c.trust,day=v?.dayAppendPolicy,custody=v?.t24Custody;
 if(v?.approved!==true||v.privatePublicationApproved!==true||
    !LOGIN.test(v.expectedPublisherSessionLogin??"")||
    new Set([v.expectedPublisherSessionLogin,t.expectedReaderSessionLogin,preLogin,"phase5_p5_source_login_20261108"]).size!==4||
    ![v.laterReviewerFingerprintSha256,v.frameSha256,v.configSha256,v.builderSha256,v.runAndRetentionEvidenceSha256,
       custody?.policySha256,custody?.reviewerFingerprintSha256].every(x=>H.test(x??""))||
    v.frameSha256!==p.frameSha256||v.configSha256!==p.configSha256||
    !iso(v.validFromUtc)||!iso(v.validUntilUtc)||v.validFromUtc>=v.validUntilUtc||
    !Number.isSafeInteger(v.maximumPrivateRetentionHours)||v.maximumPrivateRetentionHours<1||v.maximumPrivateRetentionHours>168||
    !c.nativePreFeatureReview||!custody||custody.independentT24CustodyTrustApproved!==true||
    !Number.isSafeInteger(custody.maximumRetentionHours)||custody.maximumRetentionHours<1||custody.maximumRetentionHours>168||
    !iso(custody.policyValidFromUtc)||!iso(custody.policyValidUntilUtc)||custody.policyValidFromUtc>=custody.policyValidUntilUtc||
    v.selectedTConfig?.verifiedProviderNativeSchedule!==true||v.selectedTConfig.milestone!=="departure.scheduledTime.utc"||
    typeof v.selectedTConfig.version!=="string"||!v.selectedTConfig.version.trim()||!H.test(v.selectedTConfig.artifactHash??"")||
    day?.schema!=="v39.phase6.delegated-later-day-append-review-policy.v1"||day.delegatedAutomatedLaterDayAppendApproved!==true||
    day.approvedCodeSha!==t.reviewedCodeSha||!["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>day[k]===t[k])||
    day.laterReviewerFingerprintSha256!==v.laterReviewerFingerprintSha256||
    day.dayReviewerFingerprintSha256!==t.dayReviewerFingerprintSha256||day.queryReviewerFingerprintSha256!==t.queryReviewerFingerprintSha256||
    new Set([day.dayReviewerFingerprintSha256,day.queryReviewerFingerprintSha256,day.laterReviewerFingerprintSha256]).size!==3||
    !Number.isSafeInteger(day.maximumIndexRevision)||day.maximumIndexRevision<2||day.maximumIndexRevision>1024||
    !iso(day.validFromUtc)||!iso(day.validUntilUtc)||day.validFromUtc>=day.validUntilUtc)
  hold("PINNED_DELEGATION_CUSTODY_OR_PUBLICATION_POLICY_DRIFT");
 try{
  const pub=createPublicKey(custody.reviewerPublicKeyPem);
  if(pub.asymmetricKeyType!=="ed25519"||hash(pub.export({format:"der",type:"spki"}))!==custody.reviewerFingerprintSha256)hold("CUSTODY_KEY_DRIFT");
 }catch{hold("CUSTODY_KEY_DRIFT");}
 const source=new URL(c.sourceUrl);
 const publisherUrl=endpoint(env.P6_PRIVATE_PUBLISHER_DATABASE_URL,v.expectedPublisherSessionLogin,source,true);
 const preUrl=endpoint(env.P5_V39_PRE_DATABASE_URL,preLogin,source,false);
 const laterReviewerKey=key(env.P6_PRIVATE_LATER_REVIEWER_KEY_BASE64,v.laterReviewerFingerprintSha256);
 const dayReviewerKey=key(env.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64,t.dayReviewerFingerprintSha256);
 const dayPolicyBytes=Buffer.from(JSON.stringify(day)),conditionalT24Reviewer=admitP6ConditionalT24Reviewer(env,p,t),conditionalLaterReviewer=admitP6ConditionalLaterReviewer(env,p,t);
 const nativeT24PolicyTransition=deriveP6NativeT24PolicyTransition(p);
 // Do not spend for a conditional-marked future day with only the native
 // actor chain ready. Missing conditional metadata transport is not an
 // optional feature: it would silently strand every conditional later PRE.
 if(nativeT24PolicyTransition&&c.selector.runDayIndex>=nativeT24PolicyTransition.firstConditionalRunDayIndex&&
    (!conditionalT24Reviewer||!conditionalLaterReviewer))hold("CONDITIONAL_PRESERVATION_CHAIN_NOT_READY");
 const conditionalDayBytes=conditionalLaterReviewer?Buffer.from(JSON.stringify(conditionalLaterReviewer.day)):null;
 return {auditEnv,c,v,custody,policyBytes,publisherUrl,preUrl,conditionalT24Reviewer,conditionalLaterReviewer,nativeT24PolicyTransition,
  conditionalAppendApproval:conditionalDayBytes?{policyBytes:conditionalDayBytes,expectedPolicySha256:hash(conditionalDayBytes),dayReviewerKey,independentlyApprovedDelegatedDayAppend:true,noProviderCredentialsInSigner:true}:null,
  authority:{trust:t,policyBytes,expectedPolicySha256:env.P6_NONPAID_DAILY_POLICY_SHA256,
   independentDelegatedNativeReviewApproved:true,noProviderCredentialsInReviewer:true,laterReviewerKey},
  appendApproval:{policyBytes:dayPolicyBytes,expectedPolicySha256:hash(dayPolicyBytes),dayReviewerKey,
   independentlyApprovedDelegatedDayAppend:true,noProviderCredentialsInSigner:true}};
}
async function readCurrent(reader,trust,runDayIndex){
 const day=await readP6StoredPrivateReviewOnce({client:reader,trust,scope:ro,selector:{kind:"CURRENT_DAY",runDayIndex}});
 const index=await hydrateP6DayEpochFullRegistriesReadOnly({client:reader,pins:day.pins,wire:day.wire,publicKeyPem:day.publicKeyPem,
  scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}});
 inspectP6DayEpochExistingShardSemanticsNoGo(index);
 return {day,index};
}
/** Scope one append from the real signed current head. Allocate no new
 * physical query and no private rows until the existing publisher passes.
 * No artificial retention extension to satisfy a later packet. */
export function planP6NativeLaterAppendScope(handoff,current,policy,pageIndex){
 const d=handoff.privateOriginalDossier,z=current.index.redactedSummary,h=current.index.privateParsedIndex,wire=current.day.wire.review,v=policy.v;
 const now=Date.parse(z.observedDbClockUtc);
 if(z.runDayIndex!==d.runDayIndex||h.runDayIndex!==d.runDayIndex||h.manifestSha256!==d.manifestSha256||
    !iso(z.observedDbClockUtc)||!iso(wire.retentionNotAfterUtc)||!iso(wire.validUntilUtc)||
    !Number.isSafeInteger(pageIndex)||pageIndex<1||h.revision>=v.dayAppendPolicy.maximumIndexRevision||
    now<Date.parse(v.validFromUtc)||now>=Date.parse(v.validUntilUtc)||
    now<Date.parse(v.dayAppendPolicy.validFromUtc)||now>=Date.parse(v.dayAppendPolicy.validUntilUtc))
  hold("CURRENT_SIGNED_DAY_OR_POLICY_DRIFT");
 const src=h.entries.filter(e=>e.lane==="SOURCE"&&e.fileSha256===d.sourceDayRegistrySha256&&e.filePath===handoff.privateSourceRegistryPath);
 if(src.length!==1||!H.test(src[0].reviewEvidenceSha256??""))hold("ORIGINAL_SOURCE_NOT_CURRENTLY_INDEXED");
 const retention=Math.min(Date.parse(wire.retentionNotAfterUtc),Date.parse(v.validUntilUtc),Date.parse(v.dayAppendPolicy.validUntilUtc),
  now+v.maximumPrivateRetentionHours*3600000);
 const valid=Math.min(retention,Date.parse(wire.validUntilUtc));
 if(valid<=now||h.entries.some(e=>Date.parse(e.hardLatestUtc)>valid))return null;
 const shardIndex=1+Math.max(0,...h.entries.filter(e=>e.lane==="LATER_PRE").map(e=>e.shardIndex));
 if(shardIndex>1024||h.entries.length>=1024)return null;
 const path="data-collection/phase5/frozen/later_"+hash(JSON.stringify([d.sourceAuditSha256,pageIndex,shardIndex]))+".json";
 return {scope:{expectedDossierSha256:handoff.privateOriginalDossierSha256,observedDbClockUtc:z.observedDbClockUtc,
  reviewValidUntilUtc:new Date(valid).toISOString(),retentionNotAfterUtc:new Date(retention).toISOString(),
  expectedReviewedReleaseSha256:d.entries[0].source.expectedReviewedReleaseSha256,
  expectedReviewedSourceRightsSha256:d.entries[0].source.expectedReviewedSourceRightsSha256,
  proposedLaterRegistryFilePath:path,shardIndex},
  expectedSourceReviewEvidenceSha256:src[0].reviewEvidenceSha256};
}
/** Existing native admission and actual writer/readback role checks,
 * before acquiring a paid original. Only this readiness path accepts the
 * disarmed actor-only confirmation. No future signed index is invented. */
/** Count/enum-only receipt for already admitted policy and completed actor
 * checks. Disabled or future scope is never reported as live readiness.
 * Does not export policy bytes, signer pins, digests, DSNs or flight IDs. */
export function p6PreflightConditionalReadiness(x,clock){
 if(!iso(clock))hold("PREFLIGHT_CLOCK");
 const state=r=>!r?"NOT_ADMITTED":clock<r.validFromUtc?"NOT_YET_EFFECTIVE":clock>=r.validUntilUtc?"EXPIRED":"CURRENT_POLICY_ADMITTED";
 const later=x.conditionalLaterReviewer,scope=x.c?.policy?.conditionalPreFeatureReview;
 return Object.freeze({
  conditionalFeatureReview:scope?"APPROVED_POLICY_PRESENT":"NOT_CONFIGURED",
  conditionalT24:state(x.conditionalT24Reviewer),
  conditionalLater:state(later),
  conditionalLaterMetadataTransport:later?"ADMITTED":"DISABLED",
  standaloneNoT24:later?.scope?.independentlyApprovedStandaloneProtocolSha256?"SEPARATE_POLICY_ADMITTED":later?"WITNESS_REQUIRED":"NOT_ADMITTED",
  actualConditionalSourceReadVerified:false,actualConditionalPermitIssued:false,
  actualConditionalPreCommitVerified:false,trainingEligibilityCertified:false
 });
}
export function requireP6ConditionalPreflightClock(x,clock,actorOnly){
 if(!iso(clock))hold("PREFLIGHT_CLOCK");
 const tr=x.nativeT24PolicyTransition,day=x.c?.selector?.runDayIndex;
 if(tr&&(!Number.isSafeInteger(day)||day<1||day>31))hold("CONDITIONAL_PREFLIGHT_DAY");
 if(tr&&day<tr.firstConditionalRunDayIndex)return;
 if(tr){
  const f=x.c?.policy?.conditionalPreFeatureReview,t=x.conditionalT24Reviewer,l=x.conditionalLaterReviewer;
  if(!f||f.approved!==true||!t||!l||!x.conditionalAppendApproval||
     !H.test(f.protocolSha256??"")||!H.test(f.externalContentUseReviewSha256??"")||
     t.scope?.protocolSha256!==f.protocolSha256||l.scope?.protocolSha256!==f.protocolSha256||
     t.scope?.externalContentUseReviewSha256!==f.externalContentUseReviewSha256||l.scope?.externalContentUseReviewSha256!==f.externalContentUseReviewSha256||
     t.validFromUtc!==tr.conditionalEffectiveUtc||l.validFromUtc!==tr.conditionalEffectiveUtc||
     !iso(t.validUntilUtc)||!iso(l.validUntilUtc)||!iso(l.day?.validFromUtc)||!iso(l.day?.validUntilUtc)||
     l.day.validFromUtc!==tr.conditionalEffectiveUtc)hold("CONDITIONAL_PRESERVATION_CHAIN_NOT_READY");
 }
 if(x.conditionalT24Reviewer&&(clock>=x.conditionalT24Reviewer.validUntilUtc||(!actorOnly&&clock<x.conditionalT24Reviewer.validFromUtc)))hold("CONDITIONAL_T24_REVIEWER_CLOCK");
 if(x.conditionalLaterReviewer&&(clock>=x.conditionalLaterReviewer.validUntilUtc||(!actorOnly&&clock<x.conditionalLaterReviewer.validFromUtc)))hold("CONDITIONAL_LATER_REVIEWER_CLOCK");
 if(tr&&clock>=x.conditionalLaterReviewer.day.validUntilUtc)hold("CONDITIONAL_PRESERVATION_CHAIN_NOT_READY");
}
export async function preflightP6NativeLaterRuntime(env){
 const actorOnly=env.V39_P5_CHILD_CONFIRM==="ONLY_PRE_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER";
 const x=admitP6NativeLaterRuntime(env,undefined,actorOnly?"actor-preflight":"committed");
 if(x.v.nativeT24ReviewApproved!==true||x.v.independentT24WitnessProtocolReviewed!==true||x.v.reviewedWitnessOnlyRole!=="phase5_fids_t24_witness_prod_20261107")hold("T24_WITNESS_PROTOCOL_NOT_APPROVED");
 const policy=parsePhase7ProtectedPrePolicy(env),local=p7LocalPreSocketPaths(env,false);
 const underlying=new pg.Pool({connectionString:x.preUrl,max:1,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p6_pre_spend_writer_privilege_check"});
 const pre=makeP5Stage28DedicatedRolePool(underlying,{group:"pre",reviewedDedicatedLogin:preLogin,forbiddenApplicationLogin:"phase5_runtime_application_login"});
 let opened;
 try{
  opened=openPhase7ProtectedPreResolver(env);
  const z=await inspectPhase7PreWriterRole(pre),clock=z.observedDbClockUtc;
  for(const p of [x.v,x.v.dayAppendPolicy,{validFromUtc:x.custody.policyValidFromUtc,validUntilUtc:x.custody.policyValidUntilUtc}]){
   if(Date.parse(clock)>=Date.parse(p.validUntilUtc)||(!actorOnly&&Date.parse(clock)<Date.parse(p.validFromUtc)))hold("NATIVE_POLICY_CLOCK");
  }
  requireP6ConditionalPreflightClock(x,clock,actorOnly);
  checkPhase7PrePolicyStructure(policy,clock);
  checkPhase7NativePrePolicySupport(policy);
  const reader=await opened.preflight();
  if(reader.ready!==true)hold("PRE_FRAGMENT_READER");
  for(const path of Object.values(local.roles))await callP7LocalPreRole(path,makeP7LocalPreRequest(local.scope,"ready"),5000);
  return {status:"P7_NATIVE_PRE_CONFIGURATION_AND_RESTRICTED_WRITER_READER_READY_NO_GO",actorOnly,observedDbClockUtc:clock,conditionalReadiness:p6PreflightConditionalReadiness(x,clock),providerCalls:0,databaseWrites:0,productionProofIssued:false,phase6PaidGo:false};
 }finally{await Promise.allSettled([underlying.end(),opened?.close()])}
}
/** Allowlisted count-only diagnostics from the existing same-child audit.
 * Never expose raw flight records, identities, signatures, query paths or errors.
 * No admission, lead-time, signer or publication policy is changed. */
export function p6NativeLaterReadbackDiagnostics(actual,handoff,features,t24Approved){
 const count=x=>Number.isSafeInteger(x)&&x>=0?x:null;
 const counts={};
 for(const k of ["CENSORED_AMBIGUOUS_SOURCE_IDENTITY","CENSORED_NONNATIVE_OR_UNCONFIRMED_OPERATING_MEMBER",
 "CENSORED_MEMBER_NOT_AVAILABLE_BY_ACTUAL_DB_CLOCK","CENSORED_MISSING_NATIVE_T","CENSORED_SOURCE_TOO_STALE_OR_EXPIRED",
 "CENSORED_SOURCE_ARRIVED_AFTER_OWN_CUTOFF","CENSORED_NO_PROSPECTIVE_PRE_LEAD","CENSORED_OUTSIDE_APPROVED_SOURCE_WINDOW"])
  counts[k]=count(actual?.classifications?.[k]);
 const pending={};
 for(const k of ["originalEligibleCount","alreadyIndexed","changedNativeT","tooLate","notYetWithinShardWindow","pendingCount"])
  pending[k]=count(actual?.pendingLaterReview?.[k]);
 const sensitivity=[900,600,300].map(leadSeconds=>{
  const a=actual?.sourceTimingDiagnostics?.timingOnlyCountsByReviewLeadSeconds;
  const hit=Array.isArray(a)?a.filter(x=>x?.leadSeconds===leadSeconds):[];
  return {leadSeconds,eligible:hit.length===1?count(hit[0].eligible):null};
 });
 const observed=count(actual?.observedMemberCount),native=count(actual?.candidateCount),
  review=count(handoff?.reviewEntryCount),matched=count(features?.matchedCount);
 const conditional=actual?.conditionalSourceReview;
 const conditionalMembers=count(conditional?.stage14MatchedMembershipCount);
 const conditionalDrafts=count(conditional?.featureReview?.featureDraftCount);
 const conditionalStatus=conditionalDrafts===null?"NOT_MEASURED":conditionalDrafts>0?
  conditional?.predictionTimingReviewed===false?"CONDITIONAL_IDENTITY_DRAFTS_AWAIT_AUTHENTIC_T24_TIMING_REVIEW":
  "CONDITIONAL_DRAFTS_AWAIT_INDEPENDENT_PERMIT_REVIEW_AND_REGISTRY":"NO_CONDITIONAL_FEATURE_DRAFTS";
 const reason=review===0?(observed===0?"NO_OBSERVED_MEMBERS":native===0?"NO_ELIGIBLE_NATIVE_CANDIDATES":"NO_PENDING_REVIEW_ENTRIES"):
  matched===0?"NO_MATCHED_NATIVE_FEATURES":
  !features?"NO_FEATURE_REVIEW_RESULT":
  handoff?.horizon==="T-24h"&&t24Approved!==true?"T24_REVIEW_NOT_APPROVED":null;
 return {observedMemberCount:observed,eligibleNativeCandidateCount:native,
  censoredMemberCount:count(actual?.censoredCount),reviewEntryCount:review,matchedFeatureCount:matched,
  unsupportedNativeIdentityCount:count(features?.unsupportedNativeIdentityCount),
  classifications:counts,pendingLaterReview:pending,timingSensitivityOnly:sensitivity,
  conditionalMatchedMembershipCount:conditionalMembers,conditionalFeatureDraftCount:conditionalDrafts,
  conditionalPublicationStatus:conditionalStatus,conditionalRegistryPublicationAttempted:false,
  sourceAuditOnlyReason:reason,policyChanged:false};
}
/** Select only still-live actual conditional draft members, separately from
 * native candidates. Never regenerate a previously issued member page. */
export function selectP6ConditionalT24ReviewPage(actual,current,attempted=new Set()){
 const review=actual?.privateConditionalSourceReview,scope=actual?.privateConditionalSourceScope,now=Date.parse(current?.observedDbClockUtc);
 if(!scope||scope.source.horizon!=="T-24h"||scope.source.runDayIndex!==current?.runDayIndex||
  !Number.isFinite(now)||current?.status!=="CURRENT_PRIVATE_T24_REGISTRY_SET_NO_GO"||
  !(current.privateExistingFlightIds instanceof Set)||!(attempted instanceof Set)||!Array.isArray(review?.privateFeatureDrafts)||
  !Array.isArray(review?.memberReview?.privateReviewProposals))hold("CONDITIONAL_T24_PAGE_SCOPE");
 const drafts=new Set(review.privateFeatureDrafts.map(d=>d.flightInstanceId)),seen=new Set();
 if(drafts.size!==review.privateFeatureDrafts.length)hold("CONDITIONAL_T24_PAGE_SCOPE");
 const ids=[];
 for(const m of review.memberReview.privateReviewProposals){
  if(seen.has(m.flightInstanceId)||!/^leg:g5a:[a-f0-9]{64}$/.test(m.flightInstanceId)||!iso(m.predictionCutoffUtc))hold("CONDITIONAL_T24_PAGE_SCOPE");
  seen.add(m.flightInstanceId);
  const cutoff=Date.parse(m.predictionCutoffUtc);
  if(drafts.has(m.flightInstanceId)&&!attempted.has(m.flightInstanceId)&&!current.privateExistingFlightIds.has(m.flightInstanceId)&&cutoff>now+900000&&cutoff<=now+10800000)
   ids.push({id:m.flightInstanceId,cutoff});
 }
 if([...drafts].some(id=>!seen.has(id)))hold("CONDITIONAL_T24_PAGE_SCOPE");
 return ids.sort((a,b)=>a.cutoff-b.cutoff||a.id.localeCompare(b.id)).slice(0,96).map(x=>x.id);
}
/** Exact unsigned conditional identities are selected for actual T24
 * lookup independently of native dossiers. The current reported schedule
 * cannot supply later eligibility; the independent issuer authenticates
 * the original witness and reruns source timing before any signed review.
 * Attempted/held members are never replayed in this child. */
export function selectP6ConditionalLaterPage(actual,current,attempted=new Set()){
 const scope=actual?.privateConditionalSourceScope,review=actual?.privateConditionalSourceReview,
  h=current?.index?.privateParsedIndex,z=current?.index?.redactedSummary,now=Date.parse(z?.observedDbClockUtc);
 if(!scope||!["T-6h","T-90m"].includes(scope.source.horizon)||!Number.isFinite(now)||
    h?.runDayIndex!==scope.source.runDayIndex||z?.runDayIndex!==h.runDayIndex||h.manifestSha256!==scope.source.manifestSha256||
    !Array.isArray(h.entries)||!(attempted instanceof Set)||!Array.isArray(review?.privateFeatureDrafts)||
     !Array.isArray(review?.memberReview?.privateReviewProposals))hold("CONDITIONAL_LATER_PAGE_SCOPE");
  const inventory=review.report?.status==="CONDITIONAL_SERVICE_IDENTITY_INVENTORY_NOT_PRE_ELIGIBLE"&&review.report.predictionTimingReviewed===false;
 const used=new Set(),drafts=new Set(review.privateFeatureDrafts.map(d=>d.flightInstanceId)),seen=new Set();
 if(drafts.size!==review.privateFeatureDrafts.length)hold("CONDITIONAL_LATER_PAGE_SCOPE");
 for(const entry of h.entries.filter(e=>e.lane==="LATER_PRE")){
  const bytes=current.index.getFrozen(entry.filePath);
  if(!Buffer.isBuffer(bytes)||hash(bytes)!==entry.fileSha256)hold("CONDITIONAL_LATER_CURRENT_REGISTRY_DRIFT");
  const reg=JSON.parse(bytes.toString("utf8"));
  if(!Array.isArray(reg.entries))hold("CONDITIONAL_LATER_CURRENT_REGISTRY_DRIFT");
  for(const e of reg.entries){
   const key=e.expectedFlightInstanceId+"|"+e.expectedHorizon;
   if(used.has(key))hold("CONDITIONAL_LATER_DUPLICATE_EXISTING");
   used.add(key);
  }
 }
 const ids=[];
 for(const m of review.memberReview.privateReviewProposals){
  const id=m.flightInstanceId,cutoff=Date.parse(m.predictionCutoffUtc);
  if(seen.has(id)||!/^leg:g5a:[a-f0-9]{64}$/.test(id)||!iso(m.predictionCutoffUtc))hold("CONDITIONAL_LATER_PAGE_SCOPE");
  seen.add(id);
   if(inventory&&m.forecastReferenceEvidence!=="PENDING_T24_REVIEW")hold("CONDITIONAL_LATER_PAGE_SCOPE");
   if(drafts.has(id)&&!attempted.has(id)&&!used.has(id+"|"+scope.source.horizon)&&(inventory||cutoff>now+900000&&cutoff<=now+10800000))
   ids.push({id,cutoff});
 }
 if([...drafts].some(id=>!seen.has(id)))hold("CONDITIONAL_LATER_PAGE_SCOPE");
 return ids.sort((a,b)=>a.cutoff-b.cutoff||a.id.localeCompare(b.id)).slice(0,96).map(x=>x.id);
}
export function planP6ConditionalLaterAppendScope(handoff,scope,current,x,pageIndex,sourceExpiresAtUtc){
 const d=handoff?.privateOriginalDossier,z=current?.index?.redactedSummary,h=current?.index?.privateParsedIndex,wire=current?.day?.wire?.review,
  v=x.v,policy=x.conditionalLaterReviewer,now=Date.parse(z?.observedDbClockUtc);
 if(!d||!scope||!policy||!["T-6h","T-90m"].includes(scope.source.horizon)||d.horizon!==scope.source.horizon||
    h?.runDayIndex!==scope.source.runDayIndex||z?.runDayIndex!==h.runDayIndex||d.runDayIndex!==h.runDayIndex||
    h.manifestSha256!==scope.source.manifestSha256||d.manifestSha256!==h.manifestSha256||
    ![z.observedDbClockUtc,wire?.retentionNotAfterUtc,wire?.validUntilUtc,sourceExpiresAtUtc].every(iso)||
    !Number.isSafeInteger(pageIndex)||pageIndex<1||!Array.isArray(h.entries)||!Number.isSafeInteger(h.revision)||
    now<Date.parse(policy.validFromUtc)||now>=Date.parse(policy.validUntilUtc))hold("CONDITIONAL_LATER_CURRENT_SCOPE");
 const src=h.entries.filter(e=>e.lane==="SOURCE"&&e.fileSha256===d.sourceDayRegistrySha256&&e.filePath===handoff.privateSourceRegistryPath);
 if(src.length!==1||!H.test(src[0].reviewEvidenceSha256??""))hold("ORIGINAL_SOURCE_NOT_CURRENTLY_INDEXED");
 const raw=current.index.getFrozen(src[0].filePath);
 if(!Buffer.isBuffer(raw)||hash(raw)!==src[0].fileSha256||!Buffer.isBuffer(handoff.privateSourceRegistryBytes)||!raw.equals(handoff.privateSourceRegistryBytes))
  hold("CONDITIONAL_LATER_SOURCE_REGISTRY_DRIFT");
 const retention=Math.min(...[wire.retentionNotAfterUtc,sourceExpiresAtUtc,policy.validUntilUtc,v.validUntilUtc,policy.day.validUntilUtc].map(Date.parse),now+v.maximumPrivateRetentionHours*3600000),
  valid=Math.min(retention,Date.parse(wire.validUntilUtc));
 const shardIndex=1+Math.max(0,...h.entries.filter(e=>e.lane==="LATER_PRE").map(e=>e.shardIndex));
 if(valid<=now||h.entries.some(e=>Date.parse(e.hardLatestUtc)>valid)||h.revision>=policy.day.maximumIndexRevision||shardIndex>1024||h.entries.length>=1024)return null;
 return {sourceRegistryBytes:raw,sourceRegistry:JSON.parse(raw.toString("utf8")),scope:{
  expectedSourceRegistrySha256:src[0].fileSha256,sourceRegistryFilePath:src[0].filePath,expectedSourceReviewEvidenceSha256:src[0].reviewEvidenceSha256,
  proposedLaterRegistryFilePath:"data-collection/phase5/frozen/later_"+hash(JSON.stringify(["conditional",scope.source.queryDigestSha256,pageIndex,shardIndex]))+".json",
  shardIndex,observedDbClockUtc:z.observedDbClockUtc,reviewValidUntilUtc:new Date(valid).toISOString(),retentionNotAfterUtc:new Date(retention).toISOString()}};
}
export async function runP6NativeLaterRuntime(env,phase7ProofPort){
 if(typeof phase7ProofPort?.readExactPermitProofs!=="function")hold("INDEPENDENT_PRE_PROOF_PORT_NOT_COMMISSIONED");
 const x=admitP6NativeLaterRuntime(env),t=x.c.trust,v=x.v;
 const publisher=new pg.Client({connectionString:x.publisherUrl,connectionTimeoutMillis:8000,query_timeout:35000,
  application_name:"p6_native_later_registry_publication"});
 const reader=new pg.Client({connectionString:x.c.readerUrl,connectionTimeoutMillis:8000,query_timeout:25000,
  application_name:"p6_native_later_evidence_reader"});
 const pre=new pg.Pool({connectionString:x.preUrl,max:1,connectionTimeoutMillis:8000,query_timeout:25000,
  application_name:"p6_native_later_pre_evidence"});
 try{
  // Audit the actual immutable SOURCE first. Empty candidate sets need
  // neither an authenticated publication connection nor a contended lock.
  // All genuine publication still reauthenticates current signed registries.
  const actual=await runP6PostcommitNativeAudit(x.auditEnv);
  const handoff=actual.privateUnsignedPreReview;
  let features=actual.privateNativeFeatureReview;
  if(!handoff||handoff.runDayIndex!==x.c.selector.runDayIndex)hold("SOURCE_HANDOFF_MISSING");
  const report={status:"ACTUAL_SOURCE_TO_LATER_REVIEW_RUNTIME_NO_PAID_GO",runDayIndex:handoff.runDayIndex,horizon:handoff.horizon,
   candidateCount:handoff.reviewEntryCount,reviewedCount:0,committedShardCount:0,insertedPrivateRows:0,
   missingNativeOriginal:0,unresolvedT24:0,lateOrRetention:0,heldPages:0,providerCalls:0,phase6PaidGo:false,
   ...(actual.conditionalSourceReview?{conditionalSourceReview:actual.conditionalSourceReview}:{}),
   nativeReadback:p6NativeLaterReadbackDiagnostics(actual,handoff,features,v.nativeT24ReviewApproved)};
  const nativeNeeded=Boolean(handoff.reviewEntryCount&&features?.matchedCount&&(handoff.horizon!=="T-24h"||v.nativeT24ReviewApproved===true));
  const conditionalT24Scope=x.conditionalT24Reviewer?.scope;
  const conditionalNeeded=Boolean(handoff.horizon==="T-24h"&&conditionalT24Scope&&actual.privateConditionalSourceReview?.privateFeatureDrafts.length);
  const conditionalLaterNeeded=Boolean(handoff.horizon!=="T-24h"&&x.conditionalLaterReviewer&&actual.privateConditionalSourceReview?.privateFeatureDrafts.length);
  if(!nativeNeeded&&!conditionalNeeded&&!conditionalLaterNeeded)return {...report,sourceAuditOnly:true};
  await publisher.connect();await publisher.query("SET ROLE phase6_private_frozen_publisher_v39");
  // Session-scoped lock on the direct connection, not a transaction-pooler
  // connection. Serialize concurrent SOURCE follow-ons per study/day,
  // keeping the original publisher's own atomic DB/revision checks.
  const lockId=hash("P6_NATIVE_LATER:"+t.manifestSha256+":"+x.c.selector.runDayIndex).slice(0,16);
  await publisher.query("SET lock_timeout='20s'");
  await publisher.query("SELECT pg_advisory_lock(('x'||$1)::bit(64)::bigint)",[lockId]);
  await publisher.query("RESET lock_timeout");

  // Reuse genuine independently archived public weather if its reader is
  // commissioned. Optional absent observations remain explicit missingness;
  // an invalid signed source is not downgraded to missing.
  const forbidden=[v.laterReviewerFingerprintSha256,t.dayReviewerFingerprintSha256,t.queryReviewerFingerprintSha256];
  if(nativeNeeded&&typeof phase7ProofPort.readReviewedWeatherArtifacts==="function"){
   features=await enrichP7NativeFeatureReviewWithNoaa({env,handoff,featureReview:features,port:phase7ProofPort,forbiddenSignerFingerprints:forbidden});
   for(const k of ["weatherArtifactCount","weatherEligibleFlightCount","weatherLateFlightCount","weatherPresentFields","weatherMissingFields","weatherAmbiguousFields"])report[k]=features[k];
   report.weatherSourceStatus="INDEPENDENT_ARCHIVE_READ_AND_ASOF_CLASSIFIED";
  }else report.weatherSourceStatus="INDEPENDENT_ARCHIVE_READER_NOT_COMMISSIONED";
  await reader.connect();await reader.query("SET ROLE phase6_private_frozen_reader_v39");
  const resolveProofs=preview=>resolveP7PublicationProofs({preview,env,port:phase7ProofPort,readClock:async()=>new Date((await reader.query("SELECT clock_timestamp() AS at")).rows[0].at).toISOString(),forbiddenSignerFingerprints:[v.laterReviewerFingerprintSha256,t.dayReviewerFingerprintSha256,t.queryReviewerFingerprintSha256]});
  if(handoff.horizon==="T-24h"){
   if(v.independentT24WitnessProtocolReviewed!==true||v.reviewedWitnessOnlyRole!=="phase5_fids_t24_witness_prod_20261107")hold("T24_WITNESS_PROTOCOL_NOT_APPROVED");
   const trust={...t,independentNativeT24RegistryApproved:true,
    expectedT24ReviewerFingerprintSha256:v.laterReviewerFingerprintSha256,expectedT24PolicySha256:x.authority.expectedPolicySha256,
    ...(x.nativeT24PolicyTransition?{nativeT24PolicyTransition:x.nativeT24PolicyTransition}:{}),
    expectedFrameSha256:v.frameSha256,expectedConfigSha256:v.configSha256,
    expectedSelectedTVersion:v.selectedTConfig.milestone+":"+v.selectedTConfig.version+":"+v.selectedTConfig.artifactHash,
    maximumPrivateRetentionHours:v.maximumPrivateRetentionHours,policyValidFromUtc:v.validFromUtc,policyValidUntilUtc:v.validUntilUtc,
    t24ReviewerPublicKeyPem:createPublicKey(x.authority.laterReviewerKey).export({type:"spki",format:"pem"}),...(conditionalT24Scope?{conditionalT24Scope}:{})};
   if(conditionalNeeded){
    const scope=actual.privateConditionalSourceScope,{fp,publicKeyPem}=x.conditionalT24Reviewer;
    if(typeof phase7ProofPort.readConditionalT24Review!=="function"||!scope)hold("CONDITIONAL_T24_ISSUER_NOT_COMMISSIONED");
    readP5ConditionalT24ReviewDelegation(x.policyBytes,x.authority.expectedPolicySha256,scope,t.reviewedCodeSha,fp);
    const raw=new pg.Pool({connectionString:x.c.sourceUrl,max:1,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p6_conditional_t24_exact_review_read"});
    const pool=makeP5Stage28DedicatedRolePool(raw,{group:"source",reviewedDedicatedLogin:"phase5_p5_source_login_20261108",forbiddenApplicationLogin:"phase5_runtime_application_login"});
    const anchor={sourceGithubRunId:scope.source.expectedSourceGithubRunId,populationQueryId:scope.expectedPopulationQueryId,responseSha256:scope.expectedResponseSha256};
    report.conditionalReviewedCount=0;report.conditionalCommittedShardCount=0;report.conditionalHeldCount=0;
    const attempted=new Set();
    try{
     const pages=Math.ceil(actual.privateConditionalSourceReview.privateFeatureDrafts.length/96);
     for(let i=0;i<pages;i++){
      const current=await readP6T24CurrentRegistrySet({client:reader,trust,runDayIndex:handoff.runDayIndex});
      const ids=selectP6ConditionalT24ReviewPage(actual,current,attempted);
      if(!ids.length)break;
      for(const id of ids)attempted.add(id);
      report.nativeReadback.conditionalRegistryPublicationAttempted=true;
      const reviewWire=await phase7ProofPort.readConditionalT24Review({anchor,flightInstanceIds:ids});
      if(reviewWire===null){report.conditionalHeldCount+=ids.length;continue;}
      const reviewedIds=reviewWire.page.reviews.map(e=>e.flightInstanceId);
      if(!reviewedIds.length||new Set(reviewedIds).size!==reviewedIds.length||
       reviewedIds.some((id,i)=>!ids.includes(id)||(i>0&&ids.indexOf(reviewedIds[i-1])>=ids.indexOf(id))))hold("CONDITIONAL_T24_REVIEW_SUBSET");
      report.conditionalHeldCount+=ids.length-reviewedIds.length;
      const attached=await resolveP7ConditionalPublicationPage({pool,scope,requestedFlightIds:reviewedIds,reviewWire,
       reviewAuthority:{expectedReviewerFingerprintSha256:fp,reviewerPublicKeyPem:publicKeyPem,expectedReviewedCodeSha:t.reviewedCodeSha,forbiddenSignerFingerprints:forbidden},
       env,port:phase7ProofPort,readClock:async()=>new Date((await reader.query("SELECT clock_timestamp() AS at")).rows[0].at).toISOString(),forbiddenSignerFingerprints:forbidden});
      const fresh=await readP6T24CurrentRegistrySet({client:reader,trust,runDayIndex:handoff.runDayIndex});
      const unsigned=buildP6ConditionalT24RegistryProposal({trust,current:fresh,sourceRegistryPath:handoff.privateSourceRegistryPath,
       sourceRegistrySha256:handoff.privateOriginalDossier.sourceDayRegistrySha256,packets:attached.privateAttachedPackets,sourceExpiresAtUtc:attached.privateSourceExpiresAtUtc});
      const proposal=signP6DelegatedConditionalT24Registry({trust,current:fresh,proposal:unsigned,authority:x.authority});
      const committed=await publishP6T24PrivateRegistryOnce({readerClient:reader,publisherClient:publisher,trust,proposal,expectedPublisherSessionLogin:v.expectedPublisherSessionLogin});
      report.conditionalReviewedCount+=committed.packetCount;report.conditionalCommittedShardCount++;report.insertedPrivateRows+=committed.insertedPrivateRows;
     }
    }finally{await raw.end();}
    report.nativeReadback.conditionalPublicationStatus=report.conditionalCommittedShardCount?"CONDITIONAL_T24_REGISTRY_COMMITTED_AND_READBACK":"NO_STILL_LIVE_UNINDEXED_CONDITIONAL_T24";
   }
   if(!nativeNeeded)return {...report,status:"ACTUAL_SOURCE_TO_CONDITIONAL_T24_REGISTRY_NO_PAID_GO"};
   const maxPages=Math.ceil(handoff.reviewEntryCount/96);
   for(let i=0;i<maxPages;i++){
    const current=await readP6T24CurrentRegistrySet({client:reader,trust,runDayIndex:handoff.runDayIndex});
    const args={handoff,features,authority:x.authority,current,trust};
    const preview=buildP6DelegatedT24PrivateRegistry({...args,phase7ProofScope:{phase7ProofPreviewOnly:true}});
    const proposal=preview.phase7ProofPreviewOnly===true?buildP6DelegatedT24PrivateRegistry({...args,phase7ProofScope:await resolveProofs(preview)}):preview;
    if(!proposal.packetCount){
     report.heldPages+=Number(proposal.censored>0);break;
    }
    const committed=await publishP6T24PrivateRegistryOnce({readerClient:reader,publisherClient:publisher,trust,proposal,
     expectedPublisherSessionLogin:v.expectedPublisherSessionLogin});
    report.reviewedCount+=committed.packetCount;
    report.committedShardCount++;
    report.insertedPrivateRows+=committed.insertedPrivateRows;
    if(!proposal.deferredCount)break;
   }
   return {...report,status:"ACTUAL_SOURCE_TO_NATIVE_T24_REGISTRY_NO_PAID_GO"};
  }
  if(conditionalLaterNeeded){
   const scope=actual.privateConditionalSourceScope,authority=x.conditionalLaterReviewer;
   if(!scope||typeof phase7ProofPort.readConditionalLaterReview!=="function"||!x.conditionalAppendApproval)hold("CONDITIONAL_LATER_ISSUER_NOT_COMMISSIONED");
   const raw=new pg.Pool({connectionString:x.c.sourceUrl,max:1,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p6_conditional_later_exact_review_read"});
   const sourcePool=makeP5Stage28DedicatedRolePool(raw,{group:"source",reviewedDedicatedLogin:"phase5_p5_source_login_20261108",forbiddenApplicationLogin:"phase5_runtime_application_login"});
   const anchor={sourceGithubRunId:scope.source.expectedSourceGithubRunId,populationQueryId:scope.expectedPopulationQueryId,responseSha256:scope.expectedResponseSha256},attempted=new Set();
   report.conditionalReviewedCount=0;report.conditionalCommittedShardCount=0;report.conditionalHeldCount=0;
   try{
    const pages=Math.ceil(actual.privateConditionalSourceReview.privateFeatureDrafts.length/96);
    for(let i=0;i<pages;i++){
     const current=await readCurrent(reader,t,handoff.runDayIndex),ids=selectP6ConditionalLaterPage(actual,current,attempted);
     if(!ids.length)break;
     for(const id of ids)attempted.add(id);
     report.nativeReadback.conditionalRegistryPublicationAttempted=true;
     const reviewWire=await phase7ProofPort.readConditionalLaterReview({anchor,flightInstanceIds:ids,horizon:handoff.horizon});
     if(reviewWire===null){report.conditionalHeldCount+=ids.length;continue;}
     const reviewedIds=reviewWire.page.reviews.map(e=>e.flightInstanceId);
     if(!reviewedIds.length||new Set(reviewedIds).size!==reviewedIds.length||reviewedIds.some(id=>!ids.includes(id)))hold("CONDITIONAL_LATER_REVIEW_SUBSET");
     report.conditionalHeldCount+=ids.length-reviewedIds.length;
     const attached=await resolveP7ConditionalPublicationPage({pool:sourcePool,scope,requestedFlightIds:reviewedIds,reviewWire,
      reviewAuthority:{expectedReviewerFingerprintSha256:authority.fp,reviewerPublicKeyPem:authority.publicKeyPem,expectedReviewedCodeSha:t.reviewedCodeSha,
       forbiddenSignerFingerprints:forbidden,...(authority.scope.independentlyApprovedStandaloneProtocolSha256?{independentlyApprovedStandaloneProtocolSha256:authority.scope.independentlyApprovedStandaloneProtocolSha256}:{})},
      env,port:phase7ProofPort,readClock:async()=>new Date((await reader.query("SELECT clock_timestamp() AS at")).rows[0].at).toISOString(),forbiddenSignerFingerprints:forbidden});
     const fresh=await readCurrent(reader,t,handoff.runDayIndex),planned=planP6ConditionalLaterAppendScope(handoff,scope,fresh,x,i+1,attached.privateSourceExpiresAtUtc);
     if(!planned){report.conditionalHeldCount+=reviewedIds.length;continue;}
     const signed=signP6DelegatedConditionalLaterRegistry({page:attached,sourceRegistryBytes:planned.sourceRegistryBytes,sourceRegistry:planned.sourceRegistry,
      authority:x.authority,scope:planned.scope});
     const committed=await runP6DelegatedReviewedLaterAppend({readerClient:reader,publisherClient:publisher,trust:t,plan:signed.privatePlan,wire:signed.privateWire,
      reviewerPublicKeyPem:signed.privateReviewerPublicKeyPem,reviewerPins:signed.privateReviewerPins,
      publisherScope:{privateStoragePublicationApproved:true,adbAutoCollect:"0",phase6ProcessArmed:"0",expectedPublisherSessionLogin:v.expectedPublisherSessionLogin,
       expectedSourceReviewEvidenceSha256:planned.scope.expectedSourceReviewEvidenceSha256,approvedRetentionNotAfterUtc:planned.scope.retentionNotAfterUtc},
      scope:{independentReviewedLaterAppendApproved:true,existingPaidDispatchApproved:false,expectedLaterReviewerFingerprintSha256:v.laterReviewerFingerprintSha256,mode:"PUBLISH_ONCE"}},x.conditionalAppendApproval);
     report.conditionalReviewedCount+=signed.reviewedCount;report.insertedPrivateRows+=committed.insertedPrivateRows??0;
     if(committed.automatedDelegatedDaySignatureIssued===true)report.conditionalCommittedShardCount++;
    }
   }finally{await raw.end();}
   report.nativeReadback.conditionalPublicationStatus=report.conditionalCommittedShardCount?"CONDITIONAL_LATER_REGISTRY_COMMITTED_AND_READBACK":"NO_STILL_LIVE_REVIEWED_CONDITIONAL_LATER";
  }
  if(!nativeNeeded)return {...report,status:"ACTUAL_SOURCE_TO_CONDITIONAL_LATER_REGISTRY_NO_PAID_GO"};
  const pool=makeP5Stage28DedicatedRolePool(pre,{group:"pre",reviewedDedicatedLogin:preLogin,forbiddenApplicationLogin:"phase5_runtime_application_login"});
  const selected=new Set(handoff.privateReviewEntries.map(e=>e.source.flightInstanceId));
  const pages=pageP5UnsignedNativePreReviewDossier(handoff.privateOriginalDossier).filter(p=>p.entries.some(e=>selected.has(e.source.flightInstanceId)));
  const expectedSelectedTVersion=v.selectedTConfig.milestone+":"+v.selectedTConfig.version+":"+v.selectedTConfig.artifactHash;
  for(const page of pages){
   const d=handoff.privateOriginalDossier;
   const evidence=await readP6PendingLaterT24EvidencePage(pool,handoff,{
    independentDossierReviewPinned:true,independentT24EvidenceReadApproved:true,existingPaidDispatchApproved:false,
    expectedDossierSha256:handoff.privateOriginalDossierSha256,expectedManifestSha256:t.manifestSha256,
    expectedRightsSha256:t.rightsSha256,expectedReleaseSha256:t.releaseSha256,expectedFrameSha256:v.frameSha256,
    expectedConfigSha256:v.configSha256,expectedSelectedTVersion,pageIndex:page.pageIndex,reviewedReceipts:[]},
    {readerClient:reader,trust:{...x.custody,runDayIndex:d.runDayIndex,reviewedCodeSha:t.reviewedCodeSha,
     manifestSha256:t.manifestSha256,rightsSha256:t.rightsSha256,releaseSha256:t.releaseSha256,
     expectedFrameSha256:v.frameSha256,expectedConfigSha256:v.configSha256,expectedSelectedTVersion},
     scope:{privateT24CustodyApproved:true,existingPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",expectedSessionLogin:t.expectedReaderSessionLogin}});
   if(!evidence.candidateCount)continue;
   const current=await readCurrent(reader,t,d.runDayIndex);
   const planned=planP6NativeLaterAppendScope(handoff,current,x,page.pageIndex);
   if(!planned){report.heldPages++;continue;}
   const args={handoff,featureReview:features,evidence,authority:x.authority};
   const preview=signP6DelegatedNativeLaterReviewPage({...args,scope:{...planned.scope,phase7ProofPreviewOnly:true}});
   const signed=preview.phase7ProofPreviewOnly===true?signP6DelegatedNativeLaterReviewPage({...args,scope:{...planned.scope,...await resolveProofs(preview)}}):preview;
   report.reviewedCount+=signed.reviewedCount;
   report.missingNativeOriginal+=signed.missingNativeOriginal;
   report.unresolvedT24+=signed.unresolvedT24;
   report.lateOrRetention+=signed.lateOrRetention;
   if(!signed.signatureIssued)continue;
   const committed=await runP6DelegatedReviewedLaterAppend({
    readerClient:reader,publisherClient:publisher,trust:t,plan:signed.privatePlan,wire:signed.privateWire,
    reviewerPublicKeyPem:signed.privateReviewerPublicKeyPem,reviewerPins:signed.privateReviewerPins,
    publisherScope:{privateStoragePublicationApproved:true,adbAutoCollect:"0",phase6ProcessArmed:"0",
     expectedPublisherSessionLogin:v.expectedPublisherSessionLogin,expectedSourceReviewEvidenceSha256:planned.expectedSourceReviewEvidenceSha256,
     approvedRetentionNotAfterUtc:planned.scope.retentionNotAfterUtc},
    scope:{independentReviewedLaterAppendApproved:true,existingPaidDispatchApproved:false,
     expectedLaterReviewerFingerprintSha256:v.laterReviewerFingerprintSha256,mode:"PUBLISH_ONCE"}},x.appendApproval);
   report.insertedPrivateRows+=committed.insertedPrivateRows??0;
   if(committed.automatedDelegatedDaySignatureIssued===true)report.committedShardCount++;
  }
  return report;
 }finally{
  // Disconnect releases the session lock (including uncertain COMMIT). No
  // retry of an uncertain private write, no provider replay.
  await Promise.allSettled([publisher.end(),reader.end(),pre.end()]);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const env=process.env;
  if(env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PRIVATE_KEY_BASE64||env.P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64||env.P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64)hold("NATIVE_PUBLISHER_HAS_INDEPENDENT_KEY");
  const local=p7LocalPreSocketPaths(env,false),stored=openP7StoredPreProofPort(env);
  const port=openP7LocalPrivatePreHandoff({scope:local.scope,paths:local.roles,readStored:permits=>stored.readExactPermitProofs(permits),
   readConditionalInstructionProof:async permit=>{
    const auditEnv={...env};for(const k of ports)delete auditEnv[k];
    const c=admitP6PostcommitNativeAudit(auditEnv);
    if(c.expectedSourceRunId!==permit.expectedGithubSourceRunId)hold("CONDITIONAL_SOURCE_RUN_DRIFT");
    const client=new pg.Client({connectionString:c.readerUrl,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p6_conditional_instruction_reader"});
    try{await client.connect();await client.query("SET ROLE phase6_private_frozen_reader_v39");
     const a=await readP6ConditionalSourceInstructionProof({readerClient:client,trust:c.trust,selector:c.selector,policy:c.policy,permit});
     return a.privateProof;
    }finally{await client.end()}
   },readConditionalT24ReviewInstructionProof:async anchor=>{
    const auditEnv={...env};for(const k of ports)delete auditEnv[k];
    const c=admitP6PostcommitNativeAudit(auditEnv);
    const client=new pg.Client({connectionString:c.readerUrl,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p6_conditional_t24_review_instruction_reader"});
    try{await client.connect();await client.query("SET ROLE phase6_private_frozen_reader_v39");
     const a=await readP6ConditionalT24ReviewInstructionProof({readerClient:client,trust:c.trust,selector:c.selector,policy:c.policy,anchor,expectedSourceRunId:c.expectedSourceRunId});
     return a.privateProof;
    }finally{await client.end()}
   },readConditionalLaterReviewInstructionProof:async request=>{
    const auditEnv={...env};for(const k of ports)delete auditEnv[k];
    const c=admitP6PostcommitNativeAudit(auditEnv);
    const client=new pg.Client({connectionString:c.readerUrl,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p6_conditional_later_review_instruction_reader"});
    try{await client.connect();await client.query("SET ROLE phase6_private_frozen_reader_v39");
     const a=await readP6ConditionalLaterReviewInstructionProof({readerClient:client,trust:c.trust,selector:c.selector,policy:c.policy,anchor:request.anchor,expectedSourceRunId:c.expectedSourceRunId,expectedLaterHorizon:request.horizon});
     return a.privateProof;
    }finally{await client.end()}
   }});
  if(process.argv.length===3&&process.argv[2]==="--preflight")console.log(JSON.stringify(await preflightP6NativeLaterRuntime(env)));
  else if(process.argv.length===2)console.log(JSON.stringify(await runP6NativeLaterRuntime(env,port)));
  else hold("EXACT_MODE");
 }
 catch(e){const s=String(e?.message??"");console.error(/^HOLD_(?:P6|P5)_[A-Z0-9_]+$/.test(s)?s:"HOLD_P6_NATIVE_LATER_RUNTIME_REDACTED_NO_REPLAY");process.exitCode=2;}
}
