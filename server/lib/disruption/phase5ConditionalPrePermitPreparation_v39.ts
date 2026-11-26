import {readP6ConditionalLaterT24EvidencePage} from "./phase6LaterT24EvidenceBatchReadOnly_v39";
/** Separate conditional Stage14 PRE permit construction. Reuses the
 * authenticated exact SOURCE scope and a fresh restricted original read.
 * An independently protected artifact SHA is mandatory; this function never
 * manufactures a review, signs a production registry or grants paid GO.
 * Legacy Stage14 field names are retained for compatible execution, but
 * the evidence is explicitly conditional service / reported schedule only. */
import {createHash,createPublicKey,verify,sign,type KeyObject} from "node:crypto";
import {attachPhase7SignedProofBeforeRoster} from "./phase7SignedPreFieldProof_v39";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
import type {Phase7CanonicalFieldDisposition} from "./phase7CanonicalFieldParity_v39";
import {P5_CONDITIONAL_T24_PACKET,P5_CONDITIONAL_WITNESSED_LATER_PACKET,P5_CONDITIONAL_STANDALONE_PACKET} from "./phase5ConditionalPreQueuePacket_v39";
import {readP5SignedConditionalServiceReview,type P5SignedConditionalFeatureReadScope} from "./phase5ConditionalBoundSourceReview_v39";
import type {P5EReadOnlyPgPool} from "./phase5AmendmentEOriginalFidsReadonlyCompiler_v39";
import {preflightP5Stage14ReviewedPermitV39,type P5Stage14SingleFlightPrePermit} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {P5_STAGE28_GROUPS} from "./phase5Stage28DedicatedRolePool_v39";
import {digestP5Stage24ReviewedReceipt} from "./phase5T24WitnessedLaterHorizonGuard_v39";
import {verifyP5T24PreWitnessCrossReview,type P5IndependentT24WitnessReview} from "./phase5T24PreIndependentWitnessChain_v39";
import {selectP5EReviewedSupplementalFeatures} from "./phase5AmendmentESignedSupplementalFeatures_v39";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const hold=(s:string):never=>{throw Error("HOLD_P5_CONDITIONAL_PRE_PERMIT_"+s)};
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const time=(x:unknown):number=>{if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)return hold("CLOCK");return Date.parse(x);};
type Bound=Awaited<ReturnType<typeof readP5SignedConditionalServiceReview>>;
type Proposal=Bound["memberReview"]["privateReviewProposals"][number];
type Draft=Bound["privateFeatureDrafts"][number];
/** Stable exact evidence for external review. The final database review clock
 * is intentionally not hashed because an independent reread advances it. */
export function digestP5ConditionalPermitEvidence(p:Proposal,d:Draft,sourceBoundAtUtc:string){
 if(!p||!d||p.flightInstanceId!==d.flightInstanceId||d.identityEvidenceTier!=="CONDITIONAL_QUERY_FILTERED_SERVICE"||
  d.reviewedProtocolSha256!==p.reviewedProtocolAmendmentSha256||d.physicalGateOutCertified!==false||
  d.sourceBodyAndCanonicalEnvelopeIntegrityVerified!==true)return hold("MEMBER_DRAFT_BINDING");
 const {observedDbClockUtc,...stable}=p;
 if(time(sourceBoundAtUtc)>time(observedDbClockUtc))hold("CLOCK");
 return hash(JSON.stringify({schema:"v39.phase5.conditional-pre-member-evidence.v1",sourceBoundAtUtc,member:stable,featureBundle:d.compiled.bundle}));
}
type Review={
 schema:"v39.phase5.external-conditional-pre-permit-review.v1";reviewedCodeSha:string;
 reviewedProtocolSha256:string;reviewedMemberEvidenceSha256:string;reviewedAtUtc:string;
 reviewedFrameSha256:string;reviewedConfigSha256:string;reviewedConditionalServiceEvidenceSha256:string;
 reviewedReportedScheduleEvidenceSha256:string;reviewedRunAndRetentionEvidenceSha256:string;
 frozenBuilderSha256:string;builderFrozenAtUtc:string;selectedTConfig:P5Stage14SingleFlightPrePermit["selectedTConfig"];
 reviewedConditionalScheduleSourceAndUse:true;nativeOperatingLegCertified:false;
 reviewedT24WitnessReceipt?:P5Stage14SingleFlightPrePermit["reviewedT24WitnessReceipt"];
 reviewedStandaloneLaterNoT24?:P5Stage14SingleFlightPrePermit["reviewedStandaloneLaterNoT24"];
};
type Pins={expectedReviewArtifactSha256:string;expectedReviewedCodeSha:string;expectedConditionalProtocolSha256:string;
 expectedExternalContentUseReviewSha256:string;expectedT24ReceiptSha256?:string;separatelyApprovedStandaloneProtocolSha256?:string};
type ReviewInput={flightInstanceId:string;reviewBytes:Buffer;pins:Pins};
const preparedBindings=new WeakMap<object,{code:string;artifact:string;permitHash:string;witnessHash:string}>();
const previews=new WeakSet<object>();
const proofPages=new WeakSet<object>();
const proofAttachedPackets=new WeakSet<object>();
function parseIndependentReview(scope:P5SignedConditionalFeatureReadScope,flightInstanceId:string,reviewBytes:Buffer,pins:Pins){
 if(!pins||![pins.expectedReviewArtifactSha256,pins.expectedConditionalProtocolSha256,pins.expectedExternalContentUseReviewSha256].every(x=>H.test(x??""))||
  !C.test(pins.expectedReviewedCodeSha??"")||!Buffer.isBuffer(reviewBytes)||reviewBytes.length<100||reviewBytes.length>200000||
  hash(reviewBytes)!==pins.expectedReviewArtifactSha256||scope?.protocolSha256!==pins.expectedConditionalProtocolSha256||
  scope.externalContentUseReviewSha256!==pins.expectedExternalContentUseReviewSha256||!/^leg:g5a:[a-f0-9]{64}$/.test(flightInstanceId))
  return hold("INDEPENDENT_REVIEW_PINS");
 let r:Review;try{r=JSON.parse(reviewBytes.toString("utf8"));}catch{return hold("REVIEW_JSON");}
 const keys=["schema","reviewedCodeSha","reviewedProtocolSha256","reviewedMemberEvidenceSha256","reviewedAtUtc","reviewedFrameSha256","reviewedConfigSha256","reviewedConditionalServiceEvidenceSha256","reviewedReportedScheduleEvidenceSha256","reviewedRunAndRetentionEvidenceSha256","frozenBuilderSha256","builderFrozenAtUtc","selectedTConfig","reviewedConditionalScheduleSourceAndUse","nativeOperatingLegCertified"];
 if(!r||r.schema!=="v39.phase5.external-conditional-pre-permit-review.v1"||
  r.reviewedCodeSha!==pins.expectedReviewedCodeSha||r.reviewedProtocolSha256!==scope.protocolSha256||
  r.reviewedConditionalScheduleSourceAndUse!==true||r.nativeOperatingLegCertified!==false||
  ![r.reviewedMemberEvidenceSha256,r.reviewedFrameSha256,r.reviewedConfigSha256,r.reviewedConditionalServiceEvidenceSha256,r.reviewedReportedScheduleEvidenceSha256,r.reviewedRunAndRetentionEvidenceSha256,r.frozenBuilderSha256].every(x=>H.test(x??""))||
  Object.keys(r).some(k=>!keys.includes(k)&&k!=="reviewedT24WitnessReceipt"&&k!=="reviewedStandaloneLaterNoT24")||keys.some(k=>!Object.hasOwn(r,k)))
  return hold("EXACT_CONDITIONAL_REVIEW");
 time(r.reviewedAtUtc);time(r.builderFrozenAtUtc);
 return r;
}
function constructFromBound(scope:P5SignedConditionalFeatureReadScope,read:Bound,p:Proposal|undefined,d:Draft|undefined,r:Review,pins:Pins){
 const at=time(r.reviewedAtUtc),frozen=time(r.builderFrozenAtUtc),q=scope.source;
 if(!p||!d||read.conditionalFeatureReview.actualPreIssued!==false)return hold("CURRENT_ELIGIBLE_MEMBER_REQUIRED");
 const cutoff=time(p.predictionCutoffUtc),now=time(read.observedDbClockUtc);
 if(digestP5ConditionalPermitEvidence(p,d,read.privateSourceBoundAtUtc)!==r.reviewedMemberEvidenceSha256||
  at<time(read.privateSourceBoundAtUtc)||at<time(p.sourceMemberAvailableUtc)||at>now||frozen>at||
  cutoff-now<=scope.minimumReviewLeadSeconds*1000||p.horizon!==q.horizon||p.manifestSha256!==q.manifestSha256)
  return hold("MEMBER_REVIEW_OR_PROSPECTIVE_CLOCK");
 const cfg=r.selectedTConfig;
 if(!cfg||cfg.verifiedProviderNativeSchedule!==true||cfg.milestone!=="departure.scheduledTime.utc"||
  cfg.semanticsEvidenceSha256!==r.reviewedReportedScheduleEvidenceSha256||!H.test(cfg.artifactHash??"")||!cfg.version?.trim())
  return hold("REPORTED_SCHEDULE_SEMANTICS");
 const bundle=d.compiled.bundle;
 selectP5EReviewedSupplementalFeatures({flightInstanceId:p.flightInstanceId,horizon:q.horizon,selectedNativeTUtc:p.selectedTNativeUtc,
  cutoffUtc:p.predictionCutoffUtc,issuedAtUtc:r.reviewedAtUtc,sourceOriginalSha256:p.expectedSourceResponseSha256,
  sourcePopulationQueryId:p.expectedSourcePopulationQueryId,memberAvailableAtUtc:p.sourceMemberAvailableUtc,
  originIcao:q.airportIcao,destinationIcao:p.expectedDestinationIcao,bundle});
 const pre:P5Stage14SingleFlightPrePermit={
  manifestSha256:q.manifestSha256,queryDigestSha256:q.queryDigestSha256,expectedSourcePopulationQueryId:p.expectedSourcePopulationQueryId,
  expectedSourceResponseSha256:p.expectedSourceResponseSha256,runDayIndex:q.runDayIndex,slot:q.slot,horizon:q.horizon,airportIcao:q.airportIcao,
  flightInstanceId:p.flightInstanceId,expectedGithubSourceRunId:p.expectedGithubSourceRunId,expectedReviewedReleaseSha256:q.reviewedReleaseSha256,
  expectedReviewedSourceRightsSha256:q.rightsReviewSha256,expectedProviderContractSha256:q.providerContractSha256,expectedEarlyDrawSha256:q.earlyDrawSha256,
  reviewedFrameSha256:r.reviewedFrameSha256,reviewedConfigSha256:r.reviewedConfigSha256,
  independentlyReviewedOperatingLegEvidenceSha256:r.reviewedConditionalServiceEvidenceSha256,
  independentlyReviewedNativeTEvidenceSha256:r.reviewedReportedScheduleEvidenceSha256,
  independentlyReviewedRunAndRetentionEvidenceSha256:r.reviewedRunAndRetentionEvidenceSha256,
  frozenBuilderSha256:r.frozenBuilderSha256,builderFrozenAtUtc:r.builderFrozenAtUtc,selectedTConfig:cfg,
  selectedTNativeUtc:p.selectedTNativeUtc,maxPopulationStalenessSeconds:q.maxPopulationStalenessSeconds,expectedRestrictedPreWriterRole:P5_STAGE28_GROUPS.pre,
  identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",externalConditionalScheduleSourceAndUseReviewed:true,requireProspectiveConditionalSourceMarker:true,
  reviewedProtocolAmendmentSha256:scope.protocolSha256,reviewedStableServiceKeySha256:p.reviewedStableServiceKeySha256,
  expectedOperatorFlightNumber:p.expectedOperatorFlightNumber,expectedDestinationIcao:p.expectedDestinationIcao,reviewedSupplementalFeatureBundle:bundle};
 let witnessReview:P5IndependentT24WitnessReview|null=null;
 if(q.horizon==="T-24h"){
  if(Object.hasOwn(r,"reviewedT24WitnessReceipt")||Object.hasOwn(r,"reviewedStandaloneLaterNoT24")||
   pins.expectedT24ReceiptSha256!==undefined||pins.separatelyApprovedStandaloneProtocolSha256!==undefined)return hold("T24_NO_SUBSTITUTE");
  witnessReview={flightInstanceId:pre.flightInstanceId,sourcePopulationQueryId:pre.expectedSourcePopulationQueryId,
   expectedSourceResponseSha256:pre.expectedSourceResponseSha256,expectedSourceQueryDigestSha256:pre.queryDigestSha256,
   expectedFrameSha256:pre.reviewedFrameSha256,expectedConfigSha256:pre.reviewedConfigSha256,selectedTNativeUtc:pre.selectedTNativeUtc,
   expectedT24CutoffUtc:p.predictionCutoffUtc,expectedSelectedTVersion:cfg.milestone+":"+cfg.version+":"+cfg.artifactHash,
   expectedWitnessOnlyRole:P5_STAGE28_GROUPS.witness,reviewedConditionalProtocolSha256:scope.protocolSha256};
  verifyP5T24PreWitnessCrossReview(pre,witnessReview);
 }else{
  const w=r.reviewedT24WitnessReceipt,s=r.reviewedStandaloneLaterNoT24;
  if(Boolean(w)===Boolean(s))return hold("EXACT_T24_EVIDENCE_TIER");
  if(w){
   if(!H.test(pins.expectedT24ReceiptSha256??"")||pins.separatelyApprovedStandaloneProtocolSha256!==undefined||
    w.receiptSha256!==pins.expectedT24ReceiptSha256||digestP5Stage24ReviewedReceipt(w)!==w.receiptSha256||
    w.flightInstanceId!==pre.flightInstanceId||w.selectedTNativeUtc!==pre.selectedTNativeUtc||
    w.frozenT24CutoffUtc!==new Date(time(pre.selectedTNativeUtc)-86400000).toISOString()||
    w.t24FrameSha256!==pre.reviewedFrameSha256||w.t24ConfigSha256!==pre.reviewedConfigSha256||
    w.expectedSelectedTVersion!==cfg.milestone+":"+cfg.version+":"+cfg.artifactHash)return hold("WITNESS_BINDING");
   pre.reviewedT24WitnessReceipt=w;
  }else{
   if(pins.expectedT24ReceiptSha256!==undefined||!H.test(pins.separatelyApprovedStandaloneProtocolSha256??""))return hold("STANDALONE_REVIEW_PIN");
   pre.reviewedStandaloneLaterNoT24=s;
  }
 }
 if(preflightP5Stage14ReviewedPermitV39(pre,pins.separatelyApprovedStandaloneProtocolSha256)!==p.selectedTNativeUtc)return hold("STAGE14_PREFLIGHT");
 const summary={status:"CONDITIONAL_STAGE14_PERMIT_PREPARED_NOT_SIGNED",identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",nativeOperatingLegCertified:false,
  physicalGateOutCertified:false,signedPrePacketsIssued:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 const out=Object.freeze(Object.defineProperties(summary,{privatePermit:{value:Object.freeze(pre),enumerable:false},
  privateWitnessReview:{value:witnessReview?Object.freeze(witnessReview):null,enumerable:false}})) as typeof summary&{
  readonly privatePermit:Readonly<P5Stage14SingleFlightPrePermit>;readonly privateWitnessReview:Readonly<P5IndependentT24WitnessReview>|null};
 preparedBindings.set(out,{code:r.reviewedCodeSha,artifact:pins.expectedReviewArtifactSha256,permitHash:hash(JSON.stringify(pre)),witnessHash:hash(JSON.stringify(witnessReview))});
 return out;
}

/** C+D page: validate every external artifact and unique flight before SQL,
 * then read the actual original and member population once. No first-match
 * behavior, no caller-supplied source readback, no extra paid acquisition.
 * A failed member rejects this page before any signing/publication; callers
 * must preserve honest censoring and may not synthesize replacement permits. */
export async function prepareP5ConditionalPrePermitPageForIndependentSigning(pool:P5EReadOnlyPgPool,scope:P5SignedConditionalFeatureReadScope,inputs:readonly ReviewInput[]){
 if(!Array.isArray(inputs)||inputs.length<1||inputs.length>96||new Set(inputs.map(x=>x?.flightInstanceId)).size!==inputs.length)
  return hold("EXACT_PAGE_SCOPE");
 const parsed=inputs.map(x=>parseIndependentReview(scope,x.flightInstanceId,x.reviewBytes,x.pins));
 const read=await readP5SignedConditionalServiceReview(pool,scope);
 const proposals=new Map(read.memberReview.privateReviewProposals.map(p=>[p.flightInstanceId,p]));
 const drafts=new Map(read.privateFeatureDrafts.map(d=>[d.flightInstanceId,d]));
 if(proposals.size!==read.memberReview.privateReviewProposals.length||drafts.size!==read.privateFeatureDrafts.length)
  return hold("AMBIGUOUS_PAGE_SOURCE");
 const prepared=inputs.map((x,i)=>constructFromBound(scope,read,proposals.get(x.flightInstanceId),drafts.get(x.flightInstanceId),parsed[i],x.pins));
 const summary={status:"CONDITIONAL_STAGE14_PERMIT_PAGE_PREPARED_NOT_SIGNED",preparedCount:prepared.length,originalBodyReadCount:1,
  identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",nativeOperatingLegCertified:false,physicalGateOutCertified:false,
  signedPrePacketsIssued:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 return Object.freeze(Object.defineProperties(summary,{privatePrepared:{value:Object.freeze(prepared),enumerable:false},privateSourceExpiresAtUtc:{value:read.privateSourceExpiresAtUtc,enumerable:false}})) as typeof summary&{
  readonly privatePrepared:readonly ReturnType<typeof constructFromBound>[];readonly privateSourceExpiresAtUtc:string};
}
export async function prepareP5ConditionalPrePermitForIndependentSigning(pool:P5EReadOnlyPgPool,scope:P5SignedConditionalFeatureReadScope,
 flightInstanceId:string,reviewBytes:Buffer,pins:Pins){
 return (await prepareP5ConditionalPrePermitPageForIndependentSigning(pool,scope,[{flightInstanceId,reviewBytes,pins}])).privatePrepared[0];
}

/** Produce the exact private packet for the independent Phase7 proof preview.
 * No new signature, registry publication or native-identity attestation. */
export function buildP5ConditionalPrePacketPreview(prepared:ReturnType<typeof constructFromBound>){
 const pin=preparedBindings.get(prepared),p=prepared.privatePermit,w=prepared.privateWitnessReview;
 if(!pin||hash(JSON.stringify(p))!==pin.permitHash||hash(JSON.stringify(w))!==pin.witnessHash)return hold("ACTUAL_PREPARED_PERMIT_REQUIRED");
 const schema=p.horizon==="T-24h"?P5_CONDITIONAL_T24_PACKET:p.reviewedT24WitnessReceipt?P5_CONDITIONAL_WITNESSED_LATER_PACKET:P5_CONDITIONAL_STANDALONE_PACKET;
 const packet={schema,reviewedCodeSha:pin.code,reviewArtifactSha256:pin.artifact,independentlyReviewedConditionalScheduleServiceAndSourceAttested:true as const,
  reviewedConditionalProtocolSha256:p.reviewedProtocolAmendmentSha256!,prePermit:structuredClone(p) as P5Stage14SingleFlightPrePermit,...(w?{witnessReview:structuredClone(w)}:{})};
 const packetBytes=Buffer.from(JSON.stringify(packet),"utf8");
 if(packetBytes.length>200000)return hold("PACKET_BOUND");
 const out=Object.freeze(Object.defineProperties({status:"CONDITIONAL_PRE_PACKET_PREVIEW_NO_SIGNATURE",packetSha256:hash(packetBytes),providerCalls:0,databaseWrites:0,phase6PaidGo:false},
  {packet:{value:packet,enumerable:false},packetBytes:{value:packetBytes,enumerable:false}})) as {status:string;packetSha256:string;providerCalls:number;databaseWrites:number;phase6PaidGo:boolean;readonly packet:typeof packet;readonly packetBytes:Buffer};
 previews.add(out);return out;
}
/** Bounded adapter to the existing independent proof-publication port.
 * Only genuine prepared permits can enter; no registry signature is issued.
 * Keep all flight identities and packet bytes in the nonenumerable handoff. */
export function buildP5ConditionalPreProofPage(prepared:readonly ReturnType<typeof constructFromBound>[]){
 if(!Array.isArray(prepared)||prepared.length<1||prepared.length>96)return hold("EXACT_PROOF_PAGE_SCOPE");
 const packets=prepared.map(buildP5ConditionalPrePacketPreview);
 const permits=packets.map(x=>x.packet.prePermit);
 const first=permits[0];
 if(!first||new Set(permits.map(p=>p.flightInstanceId)).size!==permits.length||
  permits.some(p=>p.manifestSha256!==first.manifestSha256||p.runDayIndex!==first.runDayIndex||
   p.horizon!==first.horizon||p.queryDigestSha256!==first.queryDigestSha256||
   p.expectedSourceResponseSha256!==first.expectedSourceResponseSha256||
   p.expectedSourcePopulationQueryId!==first.expectedSourcePopulationQueryId||
   p.expectedReviewedSourceRightsSha256!==first.expectedReviewedSourceRightsSha256||
   p.reviewedProtocolAmendmentSha256!==first.reviewedProtocolAmendmentSha256))
  return hold("EXACT_PROOF_PAGE_SCOPE");
 const completed=Object.freeze(packets.map(p=>Object.freeze({completed:p})));
 const result={phase7ProofPreviewOnly:true as const,signatureIssued:false as const,providerCalls:0 as const,databaseWrites:0 as const,
  phase6PaidGo:false as const,packetCount:packets.length};
 const page=Object.freeze(Object.defineProperty(result,"privateCompletedPackets",{value:completed,enumerable:false})) as typeof result&{
  readonly privateCompletedPackets:typeof completed};
 proofPages.add(page);return page;
}

/** Existing independent field-proof verification is reused before the
 * separately authenticated registry signer can sign the packet digest. */
export function attachP5ConditionalPreFieldProof(preview:ReturnType<typeof buildP5ConditionalPrePacketPreview>,
 env:NodeJS.ProcessEnv,policySha256:string,dispositions:readonly Phase7CanonicalFieldDisposition[],wire:unknown){
 if(!previews.has(preview))return hold("ACTUAL_CONDITIONAL_PACKET_PREVIEW");
 const out=attachPhase7SignedProofBeforeRoster(preview,env,policySha256,dispositions,wire);
 const attached=Object.freeze(Object.defineProperties({...out,status:"CONDITIONAL_PRE_PACKET_AWAIT_INDEPENDENT_REGISTRY_SIGNATURE"},
  {packet:{value:out.packet,enumerable:false},packetBytes:{value:out.packetBytes,enumerable:false}}));
 proofAttachedPackets.add(attached);return attached;
}

/** Complete the exact bounded page after the independent proof port returns.
 * Reject missing, extra or substituted proof keys. No registry signature or
 * publication occurs; all private completed packets remain nonenumerable. */
export function completeP5ConditionalPreProofPage(page:ReturnType<typeof buildP5ConditionalPreProofPage>,
 env:NodeJS.ProcessEnv,policySha256:string,dispositions:readonly Phase7CanonicalFieldDisposition[],wires:ReadonlyMap<string,unknown>){
 if(!proofPages.has(page)||!(wires instanceof Map))return hold("ACTUAL_CONDITIONAL_PROOF_PAGE_REQUIRED");
 const list=page.privateCompletedPackets.map(x=>x.completed),keys=list.map(x=>hashPhase7DurableCandidate(x.packet.prePermit));
 if(wires.size!==keys.length||new Set(keys).size!==keys.length||keys.some(k=>!wires.has(k)))return hold("EXACT_CONDITIONAL_PROOF_SET");
 const attached=Object.freeze(list.map((p,i)=>attachP5ConditionalPreFieldProof(p,env,policySha256,dispositions,wires.get(keys[i]))));
 const summary={status:"CONDITIONAL_PROOF_PAGE_AWAIT_INDEPENDENT_REGISTRY_SIGNATURE",packetCount:attached.length,
  signatureIssued:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 return Object.freeze(Object.defineProperty(summary,"privateAttachedPackets",{value:attached,enumerable:false})) as typeof summary&{
  readonly privateAttachedPackets:typeof attached};
}
export type P5ProofAttachedConditionalPacket=ReturnType<typeof attachP5ConditionalPreFieldProof>;
export function assertP5ProofAttachedConditionalPacket(x:P5ProofAttachedConditionalPacket){
 if(!proofAttachedPackets.has(x)||!Buffer.isBuffer(x.packetBytes)||hash(x.packetBytes)!==x.packetSha256||
    !Buffer.from(JSON.stringify(x.packet),"utf8").equals(x.packetBytes))
  return hold("ACTUAL_PROOF_ATTACHED_PACKET_REQUIRED");
}

/** F027: authenticate the dynamically supplied review artifact page, rather
 * than accepting a publisher-selected digest as an independent approval.
 * The signing key is held outside this consumer. Protected caller pins
 * the separate reviewer, code, exact SOURCE and standalone policy. */
export type P5ConditionalReviewPagePins={
 expectedReviewerFingerprintSha256:string;reviewerPublicKeyPem:string;expectedReviewedCodeSha:string;
 forbiddenSignerFingerprints:readonly string[];independentlyApprovedStandaloneProtocolSha256?:string;
};
export type P5ConditionalReviewPage={
 schema:"v39.phase5.conditional-pre-external-review-page.v1";
 reviewedCodeSha:string;manifestSha256:string;rightsSha256:string;protocolSha256:string;externalContentUseReviewSha256:string;
 queryDigestSha256:string;populationQueryId:string;responseSha256:string;runDayIndex:number;horizon:string;sourceGithubRunId:string;
 reviews:{flightInstanceId:string;reviewArtifactBase64:string;reviewArtifactSha256:string;expectedT24ReceiptSha256?:string;separatelyApprovedStandaloneProtocolSha256?:string}[];
};
export type P5ConditionalReviewPageWire={page:P5ConditionalReviewPage;signatureBase64:string};
export function p5ConditionalReviewPagePreimage(page:P5ConditionalReviewPage){
 return Buffer.concat([Buffer.from("HKcode22/ReplitTranvr:PHASE6_CONDITIONAL_PRE_EXTERNAL_PERMIT_REVIEW_PAGE:v1\n","utf8"),Buffer.from(JSON.stringify(page),"utf8")]);
}
export async function prepareP5ConditionalPrePermitPageFromSignedReviews(pool:P5EReadOnlyPgPool,scope:P5SignedConditionalFeatureReadScope,
 requestedFlightIds:readonly string[],wire:P5ConditionalReviewPageWire,authority:P5ConditionalReviewPagePins){
 const p=wire?.page,q=scope?.source;
 if(!q||!authority||!H.test(authority.expectedReviewerFingerprintSha256??"")||!C.test(authority.expectedReviewedCodeSha??"")||
  !Array.isArray(authority.forbiddenSignerFingerprints)||authority.forbiddenSignerFingerprints.some(k=>!H.test(k)||k===authority.expectedReviewerFingerprintSha256)||
  (authority.independentlyApprovedStandaloneProtocolSha256!==undefined&&!H.test(authority.independentlyApprovedStandaloneProtocolSha256))||
  typeof authority.reviewerPublicKeyPem!=="string"||authority.reviewerPublicKeyPem.length>5000||
  !authority.reviewerPublicKeyPem.includes("BEGIN PUBLIC KEY")||authority.reviewerPublicKeyPem.includes("PRIVATE KEY")||
  !Array.isArray(requestedFlightIds)||requestedFlightIds.length<1||requestedFlightIds.length>96||
  requestedFlightIds.some(id=>!/^leg:g5a:[a-f0-9]{64}$/.test(id))||new Set(requestedFlightIds).size!==requestedFlightIds.length||
  !p||Object.keys(wire).sort().join("|")!=="page|signatureBase64"||
  Object.keys(p).sort().join("|")!==["schema","reviewedCodeSha","manifestSha256","rightsSha256","protocolSha256","externalContentUseReviewSha256","queryDigestSha256","populationQueryId","responseSha256","runDayIndex","horizon","sourceGithubRunId","reviews"].sort().join("|")||
  p.schema!=="v39.phase5.conditional-pre-external-review-page.v1"||p.reviewedCodeSha!==authority.expectedReviewedCodeSha||
  p.manifestSha256!==q.manifestSha256||p.rightsSha256!==q.rightsReviewSha256||p.protocolSha256!==scope.protocolSha256||
  p.externalContentUseReviewSha256!==scope.externalContentUseReviewSha256||p.queryDigestSha256!==q.queryDigestSha256||
  p.populationQueryId!==scope.expectedPopulationQueryId||p.responseSha256!==scope.expectedResponseSha256||
  p.runDayIndex!==q.runDayIndex||p.horizon!==q.horizon||p.sourceGithubRunId!==q.expectedSourceGithubRunId||
  !Array.isArray(p.reviews)||p.reviews.length!==requestedFlightIds.length||
  typeof wire.signatureBase64!=="string"||!/^[A-Za-z0-9+/]{86}==$/.test(wire.signatureBase64))
  return hold("EXACT_SIGNED_REVIEW_PAGE_SCOPE");
 const wanted=new Set(requestedFlightIds),seen=new Set<string>(),inputs:ReviewInput[]=[];
 for(const x of p.reviews){
  if(!x||Object.keys(x).some(k=>!["flightInstanceId","reviewArtifactBase64","reviewArtifactSha256","expectedT24ReceiptSha256","separatelyApprovedStandaloneProtocolSha256"].includes(k))||
   !wanted.has(x.flightInstanceId)||seen.has(x.flightInstanceId)||!H.test(x.reviewArtifactSha256??"")||
   typeof x.reviewArtifactBase64!=="string"||x.reviewArtifactBase64.length<100||x.reviewArtifactBase64.length>266668||
   (x.expectedT24ReceiptSha256!==undefined&&!H.test(x.expectedT24ReceiptSha256))||
   (x.separatelyApprovedStandaloneProtocolSha256!==undefined&&(!H.test(x.separatelyApprovedStandaloneProtocolSha256)||
    x.separatelyApprovedStandaloneProtocolSha256!==authority.independentlyApprovedStandaloneProtocolSha256)))
   return hold("EXACT_SIGNED_REVIEW_ARTIFACT_SET");
  const bytes=Buffer.from(x.reviewArtifactBase64,"base64");
  if(bytes.length>200000||bytes.toString("base64")!==x.reviewArtifactBase64||hash(bytes)!==x.reviewArtifactSha256)
   return hold("EXACT_SIGNED_REVIEW_ARTIFACT_BYTES");
  seen.add(x.flightInstanceId);
  inputs.push({flightInstanceId:x.flightInstanceId,reviewBytes:bytes,pins:{expectedReviewArtifactSha256:x.reviewArtifactSha256,
   expectedReviewedCodeSha:authority.expectedReviewedCodeSha,expectedConditionalProtocolSha256:scope.protocolSha256,
   expectedExternalContentUseReviewSha256:scope.externalContentUseReviewSha256,expectedT24ReceiptSha256:x.expectedT24ReceiptSha256,
   separatelyApprovedStandaloneProtocolSha256:x.separatelyApprovedStandaloneProtocolSha256}});
 }
 const sig=Buffer.from(wire.signatureBase64,"base64");
 if(sig.length!==64||sig.toString("base64")!==wire.signatureBase64)return hold("SIGNED_REVIEW_PAGE_SIGNATURE");
 try{
  const key=createPublicKey(authority.reviewerPublicKeyPem);
  if(key.asymmetricKeyType!=="ed25519"||hash(key.export({format:"der",type:"spki"}))!==authority.expectedReviewerFingerprintSha256||
    !verify(null,p5ConditionalReviewPagePreimage(p),key,sig))return hold("SIGNED_REVIEW_PAGE_SIGNATURE");
 }catch{return hold("SIGNED_REVIEW_PAGE_SIGNATURE");}
 // No SQL before exact signed authority and complete unique review set.
 // Existing fresh restricted original read revalidates every member, clock,
 // feature bundle, witness or standalone protocol and Stage14 preflight.
 return prepareP5ConditionalPrePermitPageForIndependentSigning(pool,scope,inputs);
}

/** Independent restricted SOURCE lane, not the registry publisher. An
 * explicit prospective protected T24 delegation may use the existing
 * independent lane authority key in this distinct review domain. No
 * automatic standalone later/missingness or native identity assertion. */
export type P5ConditionalT24ReviewDelegation={
 schema:"v39.phase5.conditional-t24-permit-review-delegation.v1";approved:true;
 protocolSha256:string;externalContentUseReviewSha256:string;reviewerFingerprintSha256:string;
 reportedScheduleSemanticsSha256:string;validFromUtc:string;validUntilUtc:string;
};
export function readP5ConditionalT24ReviewDelegation(policyBytes:Buffer,expectedPolicySha256:string,
 scope:P5SignedConditionalFeatureReadScope,expectedReviewedCodeSha:string,expectedReviewerFingerprintSha256:string){
 if(!Buffer.isBuffer(policyBytes)||policyBytes.length<100||policyBytes.length>35000||!H.test(expectedPolicySha256??"")||
   hash(policyBytes)!==expectedPolicySha256||!C.test(expectedReviewedCodeSha??"")||!H.test(expectedReviewerFingerprintSha256??""))
  return hold("UNPINNED_CONDITIONAL_T24_DELEGATION");
 let p:any;try{p=JSON.parse(policyBytes.toString("utf8"));}catch{return hold("UNPINNED_CONDITIONAL_T24_DELEGATION");}
 const q=scope?.source,v=p?.nativeLaterReview,d=p?.conditionalT24PermitReview as P5ConditionalT24ReviewDelegation,
  f=p?.conditionalPreFeatureReview,cfg=v?.selectedTConfig;
 const keys=["schema","approved","protocolSha256","externalContentUseReviewSha256","reviewerFingerprintSha256","reportedScheduleSemanticsSha256","validFromUtc","validUntilUtc"];
 if(!q||q.horizon!=="T-24h"||p.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||
   p.delegatedDailyPacketProductionApproved!==true||p.approvedCodeSha!==expectedReviewedCodeSha||
   p.manifestSha256!==q.manifestSha256||p.rightsSha256!==q.rightsReviewSha256||p.releaseSha256!==q.reviewedReleaseSha256||
   p.providerContractSha256!==q.providerContractSha256||!d||Object.keys(d).sort().join("|")!==keys.sort().join("|")||
   d.schema!=="v39.phase5.conditional-t24-permit-review-delegation.v1"||d.approved!==true||
   d.protocolSha256!==scope.protocolSha256||d.externalContentUseReviewSha256!==scope.externalContentUseReviewSha256||
   d.reviewerFingerprintSha256!==expectedReviewerFingerprintSha256||!H.test(d.reportedScheduleSemanticsSha256??"")||
   f?.schema!=="v39.phase5.conditional-pre-feature-review-policy.v1"||f.approved!==true||f.rightsSha256!==p.rightsSha256||
   f.protocolSha256!==d.protocolSha256||f.externalContentUseReviewSha256!==d.externalContentUseReviewSha256||
   v?.approved!==true||v.nativeT24ReviewApproved!==true||v.independentT24WitnessProtocolReviewed!==true||
   v.reviewedWitnessOnlyRole!==P5_STAGE28_GROUPS.witness||
   v.conditionalT24Scope?.protocolSha256!==d.protocolSha256||v.conditionalT24Scope?.externalContentUseReviewSha256!==d.externalContentUseReviewSha256||
   Object.keys(v.conditionalT24Scope??{}).length!==2||
   v.frameSha256!==p.frameSha256||v.configSha256!==p.configSha256||
   ![v.frameSha256,v.configSha256,v.builderSha256,v.runAndRetentionEvidenceSha256,v.laterReviewerFingerprintSha256,cfg?.artifactHash].every(x=>H.test(x??""))||
   v.laterReviewerFingerprintSha256===d.reviewerFingerprintSha256||cfg?.verifiedProviderNativeSchedule!==true||
   cfg.milestone!=="departure.scheduledTime.utc"||cfg.semanticsEvidenceSha256!==d.reportedScheduleSemanticsSha256||
   typeof cfg.version!=="string"||!cfg.version.trim()||time(d.validFromUtc)>=time(d.validUntilUtc)||
   time(d.validFromUtc)<time(v.validFromUtc)||time(d.validUntilUtc)>time(v.validUntilUtc)||time(d.validFromUtc)>time(q.plannedRequestUtc)||
   time(v.builderFrozenAtUtc)>time(q.plannedRequestUtc))
  return hold("EXACT_CONDITIONAL_T24_DELEGATION_REQUIRED");
 return {delegation:d,frameSha256:v.frameSha256 as string,configSha256:v.configSha256 as string,
  builderSha256:v.builderSha256 as string,builderFrozenAtUtc:v.builderFrozenAtUtc as string,
  runAndRetentionEvidenceSha256:v.runAndRetentionEvidenceSha256 as string,selectedTConfig:cfg as Review["selectedTConfig"]};
}
export async function issueP5ConditionalT24SignedReviewPage(pool:P5EReadOnlyPgPool,scope:P5SignedConditionalFeatureReadScope,
 requestedFlightIds:readonly string[],input:{policyBytes:Buffer;expectedPolicySha256:string;expectedReviewedCodeSha:string;
  expectedReviewerFingerprintSha256:string;forbiddenSignerFingerprints:readonly string[];signer:KeyObject;env:NodeJS.ProcessEnv}){
 const q=scope?.source;
 if(!q||!input||input.env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_APPROVED!=="1"||
   input.env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256!==input.expectedReviewerFingerprintSha256||
   input.env.P6_NONPAID_DAILY_POLICY_SHA256!==input.expectedPolicySha256||
   input.env.V39_P5_MANIFEST_SHA256!==q.manifestSha256||input.env.V39_P5_RIGHTS_SHA256!==q.rightsReviewSha256||
   input.env.AERODATABOX_API_KEY||input.env.RAPIDAPI_KEY||input.env.AERODATABOX_WEBHOOK_SECRET||
   input.env.P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64||input.env.P6_PRIVATE_LATER_REVIEWER_KEY_BASE64||
   input.env.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64||input.env.P6_PRIVATE_PUBLISHER_DATABASE_URL||
   !Array.isArray(input.forbiddenSignerFingerprints)||input.forbiddenSignerFingerprints.some(k=>!H.test(k)||k===input.expectedReviewerFingerprintSha256)||
   input.expectedReviewerFingerprintSha256===input.env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256||
   !Array.isArray(requestedFlightIds)||requestedFlightIds.length<1||requestedFlightIds.length>96||
   requestedFlightIds.some(id=>!/^leg:g5a:[a-f0-9]{64}$/.test(id))||new Set(requestedFlightIds).size!==requestedFlightIds.length)
  return hold("INDEPENDENT_T24_ISSUER_SCOPE");
 try{if(input.signer?.type!=="private"||input.signer.asymmetricKeyType!=="ed25519"||
   hash(createPublicKey(input.signer).export({format:"der",type:"spki"}))!==input.expectedReviewerFingerprintSha256)
  return hold("INDEPENDENT_T24_ISSUER_KEY");}catch{return hold("INDEPENDENT_T24_ISSUER_KEY");}
 const v=readP5ConditionalT24ReviewDelegation(input.policyBytes,input.expectedPolicySha256,scope,input.expectedReviewedCodeSha,input.expectedReviewerFingerprintSha256);
 const actual=await readP5SignedConditionalServiceReview(pool,scope),now=time(actual.observedDbClockUtc);
 if(now<time(v.delegation.validFromUtc)||now>=time(v.delegation.validUntilUtc))return hold("CONDITIONAL_T24_DELEGATION_CLOCK");
 const proposals=new Map(actual.memberReview.privateReviewProposals.map(p=>[p.flightInstanceId,p])),
  drafts=new Map(actual.privateFeatureDrafts.map(d=>[d.flightInstanceId,d]));
 if(proposals.size!==actual.memberReview.privateReviewProposals.length||drafts.size!==actual.privateFeatureDrafts.length)
  return hold("AMBIGUOUS_PAGE_SOURCE");
 const reviews=requestedFlightIds.map(flightInstanceId=>{
  const member=proposals.get(flightInstanceId),draft=drafts.get(flightInstanceId);
  if(!member||!draft||time(member.predictionCutoffUtc)>=time(v.delegation.validUntilUtc))return hold("CURRENT_ELIGIBLE_MEMBER_REQUIRED");
  const evidence=digestP5ConditionalPermitEvidence(member,draft,actual.privateSourceBoundAtUtc);
  const review:Review={schema:"v39.phase5.external-conditional-pre-permit-review.v1",reviewedCodeSha:input.expectedReviewedCodeSha,
   reviewedProtocolSha256:scope.protocolSha256,reviewedMemberEvidenceSha256:evidence,reviewedAtUtc:actual.observedDbClockUtc,
   reviewedFrameSha256:v.frameSha256,reviewedConfigSha256:v.configSha256,
   reviewedConditionalServiceEvidenceSha256:hash(JSON.stringify({schema:"v39.phase5.delegated-conditional-t24-evidence.v1",policySha256:input.expectedPolicySha256,memberEvidenceSha256:evidence})),
   reviewedReportedScheduleEvidenceSha256:v.delegation.reportedScheduleSemanticsSha256,reviewedRunAndRetentionEvidenceSha256:v.runAndRetentionEvidenceSha256,
   frozenBuilderSha256:v.builderSha256,builderFrozenAtUtc:v.builderFrozenAtUtc,selectedTConfig:v.selectedTConfig,
   reviewedConditionalScheduleSourceAndUse:true,nativeOperatingLegCertified:false};
  const b=Buffer.from(JSON.stringify(review));
  // Independently prove the exact prospective permit can be constructed
  // before signing the review. No PRE/witness claim is issued here.
  constructFromBound(scope,actual,member,draft,review,{expectedReviewArtifactSha256:hash(b),expectedReviewedCodeSha:input.expectedReviewedCodeSha,
   expectedConditionalProtocolSha256:scope.protocolSha256,expectedExternalContentUseReviewSha256:scope.externalContentUseReviewSha256});
  return {flightInstanceId,reviewArtifactBase64:b.toString("base64"),reviewArtifactSha256:hash(b)};
 });
 const page:P5ConditionalReviewPage={schema:"v39.phase5.conditional-pre-external-review-page.v1",reviewedCodeSha:input.expectedReviewedCodeSha,
  manifestSha256:q.manifestSha256,rightsSha256:q.rightsReviewSha256,protocolSha256:scope.protocolSha256,externalContentUseReviewSha256:scope.externalContentUseReviewSha256,
  queryDigestSha256:q.queryDigestSha256,populationQueryId:scope.expectedPopulationQueryId,responseSha256:scope.expectedResponseSha256,runDayIndex:q.runDayIndex,
  horizon:q.horizon,sourceGithubRunId:q.expectedSourceGithubRunId,reviews};
 return {page,signatureBase64:sign(null,p5ConditionalReviewPagePreimage(page),input.signer).toString("base64")} satisfies P5ConditionalReviewPageWire;
}

/** Separately delegated conditional later review. No native approval or
 * T24-only delegation can silently authorize a standalone later packet.
 * The actual custody/PRE reader is invoked here, never supplied as a
 * caller-asserted absence or witness. A fresh SOURCE reread follows it. */
export async function issueP5ConditionalLaterSignedReviewPage(
 pool:P5EReadOnlyPgPool,prePool:Parameters<typeof readP6ConditionalLaterT24EvidencePage>[1],
 scope:P5SignedConditionalFeatureReadScope,requestedFlightIds:readonly string[],
 custody:Parameters<typeof readP6ConditionalLaterT24EvidencePage>[5],
 input:Parameters<typeof issueP5ConditionalT24SignedReviewPage>[3]){
 const q=scope?.source;
 if(!q||!["T-6h","T-90m"].includes(q.horizon)||!input||!Buffer.isBuffer(input.policyBytes)||
   input.policyBytes.length<100||input.policyBytes.length>35000||!H.test(input.expectedPolicySha256??"")||
   hash(input.policyBytes)!==input.expectedPolicySha256||!C.test(input.expectedReviewedCodeSha??"")||
   !H.test(input.expectedReviewerFingerprintSha256??"")||
   input.env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_APPROVED!=="1"||
   input.env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256!==input.expectedReviewerFingerprintSha256||
   input.env.P6_NONPAID_DAILY_POLICY_SHA256!==input.expectedPolicySha256||
   input.env.V39_P5_MANIFEST_SHA256!==q.manifestSha256||input.env.V39_P5_RIGHTS_SHA256!==q.rightsReviewSha256||
   input.env.AERODATABOX_API_KEY||input.env.RAPIDAPI_KEY||input.env.AERODATABOX_WEBHOOK_SECRET||
   input.env.P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64||input.env.P6_PRIVATE_LATER_REVIEWER_KEY_BASE64||
   input.env.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64||input.env.P6_PRIVATE_PUBLISHER_DATABASE_URL||
   !Array.isArray(input.forbiddenSignerFingerprints)||input.forbiddenSignerFingerprints.some(k=>!H.test(k)||k===input.expectedReviewerFingerprintSha256)||
   input.expectedReviewerFingerprintSha256===input.env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256||
   !Array.isArray(requestedFlightIds)||requestedFlightIds.length<1||requestedFlightIds.length>96||
   requestedFlightIds.some(id=>!/^leg:g5a:[a-f0-9]{64}$/.test(id))||new Set(requestedFlightIds).size!==requestedFlightIds.length)
  return hold("INDEPENDENT_LATER_ISSUER_SCOPE");
 try{if(input.signer?.type!=="private"||input.signer.asymmetricKeyType!=="ed25519"||
   hash(createPublicKey(input.signer).export({format:"der",type:"spki"}))!==input.expectedReviewerFingerprintSha256)
  return hold("INDEPENDENT_LATER_ISSUER_KEY");}catch{return hold("INDEPENDENT_LATER_ISSUER_KEY");}
 let p:any;try{p=JSON.parse(input.policyBytes.toString("utf8"));}catch{return hold("EXACT_CONDITIONAL_LATER_DELEGATION_REQUIRED");}
 const v=p?.nativeLaterReview,d=p?.conditionalLaterPermitReview,f=p?.conditionalPreFeatureReview,cfg=v?.selectedTConfig,day=v?.dayAppendPolicy,cs=day?.conditionalLaterPreScope;
 const standalone=d?.standaloneNoT24ProtocolSha256;
 const keys=["schema","approved","protocolSha256","externalContentUseReviewSha256","reviewerFingerprintSha256","reportedScheduleSemanticsSha256","validFromUtc","validUntilUtc","standaloneNoT24ProtocolSha256"];
 if(p?.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||p.delegatedDailyPacketProductionApproved!==true||
   p.approvedCodeSha!==input.expectedReviewedCodeSha||p.manifestSha256!==q.manifestSha256||p.rightsSha256!==q.rightsReviewSha256||
   p.releaseSha256!==q.reviewedReleaseSha256||p.providerContractSha256!==q.providerContractSha256||
   !d||Object.keys(d).sort().join("|")!==keys.sort().join("|")||d.schema!=="v39.phase5.conditional-later-permit-review-delegation.v1"||d.approved!==true||
   d.protocolSha256!==scope.protocolSha256||d.externalContentUseReviewSha256!==scope.externalContentUseReviewSha256||
   d.reviewerFingerprintSha256!==input.expectedReviewerFingerprintSha256||
   f?.schema!=="v39.phase5.conditional-pre-feature-review-policy.v1"||f.approved!==true||f.rightsSha256!==p.rightsSha256||
   f.protocolSha256!==d.protocolSha256||f.externalContentUseReviewSha256!==d.externalContentUseReviewSha256||
   v?.approved!==true||v.frameSha256!==p.frameSha256||v.configSha256!==p.configSha256||
   ![v.frameSha256,v.configSha256,v.builderSha256,v.runAndRetentionEvidenceSha256,v.laterReviewerFingerprintSha256,cfg?.artifactHash,d.reportedScheduleSemanticsSha256].every(x=>H.test(x??""))||
   v.laterReviewerFingerprintSha256===d.reviewerFingerprintSha256||cfg?.verifiedProviderNativeSchedule!==true||
   cfg.milestone!=="departure.scheduledTime.utc"||cfg.semanticsEvidenceSha256!==d.reportedScheduleSemanticsSha256||
   typeof cfg.version!=="string"||!cfg.version.trim()||
   day?.schema!=="v39.phase6.delegated-later-day-append-review-policy.v1"||day.delegatedAutomatedLaterDayAppendApproved!==true||
   day.approvedCodeSha!==p.approvedCodeSha||day.manifestSha256!==p.manifestSha256||day.rightsSha256!==p.rightsSha256||
   day.releaseSha256!==p.releaseSha256||day.laterReviewerFingerprintSha256!==v.laterReviewerFingerprintSha256||
   ![day.dayReviewerFingerprintSha256,day.queryReviewerFingerprintSha256].every(x=>H.test(x??""))||
   new Set([day.dayReviewerFingerprintSha256,day.queryReviewerFingerprintSha256,v.laterReviewerFingerprintSha256,d.reviewerFingerprintSha256]).size!==4||
   !cs||cs.protocolSha256!==d.protocolSha256||cs.externalContentUseReviewSha256!==d.externalContentUseReviewSha256||
   (standalone===null?Object.hasOwn(cs,"independentlyApprovedStandaloneProtocolSha256"):
    !H.test(standalone??"")||cs.independentlyApprovedStandaloneProtocolSha256!==standalone)||
   Object.keys(cs).length!==(standalone===null?2:3)||
   time(d.validFromUtc)>=time(d.validUntilUtc)||time(d.validFromUtc)<Math.max(time(v.validFromUtc),time(day.validFromUtc))||
   time(d.validUntilUtc)>Math.min(time(v.validUntilUtc),time(day.validUntilUtc))||
   time(d.validFromUtc)>time(q.plannedRequestUtc)||time(v.builderFrozenAtUtc)>time(q.plannedRequestUtc))
  return hold("EXACT_CONDITIONAL_LATER_DELEGATION_REQUIRED");
 // Bind custody authority even for an absent receipt: a caller-selected
 // alternate archive key/retention window cannot certify missingness.
 const ct=v.t24Custody,actualTrust=custody?.trust,readerLogin=input.env.P6_PHASE7_PRIVATE_REVIEW_READER_LOGIN;
 if(!ct||ct.independentT24CustodyTrustApproved!==true||!actualTrust||
   !H.test(ct.policySha256??"")||!H.test(ct.reviewerFingerprintSha256??"")||
   !Number.isSafeInteger(ct.maximumRetentionHours)||ct.maximumRetentionHours<1||ct.maximumRetentionHours>168||
   time(ct.policyValidFromUtc)>=time(ct.policyValidUntilUtc)||
   !/^phase6_private_reader_login_[a-z0-9_]{6,50}$/.test(readerLogin??"")||
   custody.scope?.expectedSessionLogin!==readerLogin||
   !["independentT24CustodyTrustApproved","policySha256","reviewerFingerprintSha256","reviewerPublicKeyPem",
     "maximumRetentionHours","policyValidFromUtc","policyValidUntilUtc"].every(k=>actualTrust[k as keyof typeof actualTrust]===ct[k]))
  return hold("CONDITIONAL_LATER_CUSTODY_POLICY_DRIFT");
 try{
  const pub=createPublicKey(ct.reviewerPublicKeyPem);
  if(pub.asymmetricKeyType!=="ed25519"||hash(pub.export({format:"der",type:"spki"}))!==ct.reviewerFingerprintSha256)
   return hold("CONDITIONAL_LATER_CUSTODY_KEY_DRIFT");
 }catch{return hold("CONDITIONAL_LATER_CUSTODY_KEY_DRIFT");}
 const evidence=await readP6ConditionalLaterT24EvidencePage(pool,prePool,scope,requestedFlightIds,{
  independentConditionalLaterEvidenceReadApproved:true,existingPaidDispatchApproved:false,expectedReviewedCodeSha:p.approvedCodeSha,
  expectedProtocolSha256:d.protocolSha256,expectedContentUseReviewSha256:d.externalContentUseReviewSha256,
  expectedFrameSha256:v.frameSha256,expectedConfigSha256:v.configSha256,expectedSelectedTVersion:cfg.milestone+":"+cfg.version+":"+cfg.artifactHash,
  ...(input.env.P6_CONDITIONAL_LATER_METADATA_READ_ENABLED==="1"?{conditionalMetadataReaderLogin:readerLogin}: {})},custody);
 const actual=await readP5SignedConditionalServiceReview(pool,scope),now=time(actual.observedDbClockUtc);
 if(now<time(evidence.observedDbClockUtc)||now<time(d.validFromUtc)||now>=time(d.validUntilUtc))return hold("CONDITIONAL_LATER_DELEGATION_CLOCK");
 const proposals=new Map(actual.memberReview.privateReviewProposals.map(x=>[x.flightInstanceId,x])),
  drafts=new Map(actual.privateFeatureDrafts.map(x=>[x.flightInstanceId,x])),
  receipts=new Map(evidence.privateCustodyReceipts.map(x=>[x.receipt.flightInstanceId,x]));
 if(proposals.size!==actual.memberReview.privateReviewProposals.length||drafts.size!==actual.privateFeatureDrafts.length||
    receipts.size!==evidence.privateCustodyReceipts.length)return hold("AMBIGUOUS_PAGE_SOURCE");
 const reviews:P5ConditionalReviewPage["reviews"]=[];
 for(const decision of evidence.privateDecisions){
  const flightInstanceId=decision.flightInstanceId,member=proposals.get(flightInstanceId),draft=drafts.get(flightInstanceId);
  if(!member||!draft||time(member.predictionCutoffUtc)>=Math.min(time(d.validUntilUtc),time(actual.privateSourceExpiresAtUtc)))continue;
  let tier:Partial<Review>,extra:Pick<Pins,"expectedT24ReceiptSha256"|"separatelyApprovedStandaloneProtocolSha256">;
  if(decision.status==="T24_PERSISTED_AND_SEPARATE_RECEIPT_MATCH_REVIEW_REQUIRED"){
   const w=receipts.get(flightInstanceId);
   if(!w||w.expectedReceiptSha256!==decision.receiptSha256)return hold("LATER_WITNESS_BINDING");
   tier={reviewedT24WitnessReceipt:w.receipt};extra={expectedT24ReceiptSha256:w.expectedReceiptSha256};
  }else if(decision.status==="T24_ABSENT_AFTER_CUTOFF_SEPARATE_MISSINGNESS_REVIEW_REQUIRED"&&H.test(standalone??"")&&now>=time(member.selectedTNativeUtc)-86400000){
   tier={reviewedStandaloneLaterNoT24:{schema:"v39.phase5.standalone-later-asof-no-t24.v1",reviewedProtocolSha256:standalone,
    reviewedOriginalResponseSha256:scope.expectedResponseSha256,reviewedNativeTSemanticsSha256:cfg.semanticsEvidenceSha256,
    missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED",independentLaterAsOfAndMissingnessReviewAttested:true}};
   extra={separatelyApprovedStandaloneProtocolSha256:standalone};
  }else continue;
  const digest=digestP5ConditionalPermitEvidence(member,draft,actual.privateSourceBoundAtUtc);
  const review:Review={schema:"v39.phase5.external-conditional-pre-permit-review.v1",reviewedCodeSha:p.approvedCodeSha,
   reviewedProtocolSha256:scope.protocolSha256,reviewedMemberEvidenceSha256:digest,reviewedAtUtc:actual.observedDbClockUtc,
   reviewedFrameSha256:v.frameSha256,reviewedConfigSha256:v.configSha256,
   reviewedConditionalServiceEvidenceSha256:hash(JSON.stringify({schema:"v39.phase5.delegated-conditional-later-evidence.v1",policySha256:input.expectedPolicySha256,memberEvidenceSha256:digest,decision:decision.status,receiptSha256:decision.receiptSha256})),
   reviewedReportedScheduleEvidenceSha256:d.reportedScheduleSemanticsSha256,reviewedRunAndRetentionEvidenceSha256:v.runAndRetentionEvidenceSha256,
   frozenBuilderSha256:v.builderSha256,builderFrozenAtUtc:v.builderFrozenAtUtc,selectedTConfig:cfg,reviewedConditionalScheduleSourceAndUse:true,nativeOperatingLegCertified:false,...tier};
  const b=Buffer.from(JSON.stringify(review)),sha=hash(b);
  constructFromBound(scope,actual,member,draft,review,{expectedReviewArtifactSha256:sha,expectedReviewedCodeSha:p.approvedCodeSha,
   expectedConditionalProtocolSha256:scope.protocolSha256,expectedExternalContentUseReviewSha256:scope.externalContentUseReviewSha256,...extra});
  reviews.push({flightInstanceId,reviewArtifactBase64:b.toString("base64"),reviewArtifactSha256:sha,...extra});
 }
 const summary={status:"CONDITIONAL_LATER_INDEPENDENT_REVIEW_NO_PUBLICATION",reviewedCount:reviews.length,
  heldCount:requestedFlightIds.length-reviews.length,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 if(!reviews.length)return Object.freeze(Object.defineProperty(summary,"privateWire",{value:null,enumerable:false})) as typeof summary&{readonly privateWire:P5ConditionalReviewPageWire|null};
 const page:P5ConditionalReviewPage={schema:"v39.phase5.conditional-pre-external-review-page.v1",reviewedCodeSha:p.approvedCodeSha,
  manifestSha256:q.manifestSha256,rightsSha256:q.rightsReviewSha256,protocolSha256:scope.protocolSha256,externalContentUseReviewSha256:scope.externalContentUseReviewSha256,
  queryDigestSha256:q.queryDigestSha256,populationQueryId:scope.expectedPopulationQueryId,responseSha256:scope.expectedResponseSha256,runDayIndex:q.runDayIndex,
  horizon:q.horizon,sourceGithubRunId:q.expectedSourceGithubRunId,reviews};
 const wire={page,signatureBase64:sign(null,p5ConditionalReviewPagePreimage(page),input.signer).toString("base64")};
 return Object.freeze(Object.defineProperty(summary,"privateWire",{value:wire,enumerable:false})) as typeof summary&{readonly privateWire:P5ConditionalReviewPageWire|null};
}
