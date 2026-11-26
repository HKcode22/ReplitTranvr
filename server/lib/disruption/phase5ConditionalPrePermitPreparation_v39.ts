/** Separate conditional Stage14 PRE permit construction. Reuses the
 * authenticated exact SOURCE scope and a fresh restricted original read.
 * An independently protected artifact SHA is mandatory; this function never
 * manufactures a review, signs a production registry or grants paid GO.
 * Legacy Stage14 field names are retained for compatible execution, but
 * the evidence is explicitly conditional service / reported schedule only. */
import {createHash} from "node:crypto";
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
 return Object.freeze(Object.defineProperties(summary,{privatePermit:{value:Object.freeze(pre),enumerable:false},
  privateWitnessReview:{value:witnessReview?Object.freeze(witnessReview):null,enumerable:false}})) as typeof summary&{
  readonly privatePermit:Readonly<P5Stage14SingleFlightPrePermit>;readonly privateWitnessReview:Readonly<P5IndependentT24WitnessReview>|null};
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
 return Object.freeze(Object.defineProperty(summary,"privatePrepared",{value:Object.freeze(prepared),enumerable:false})) as typeof summary&{
  readonly privatePrepared:readonly ReturnType<typeof constructFromBound>[]};
}
export async function prepareP5ConditionalPrePermitForIndependentSigning(pool:P5EReadOnlyPgPool,scope:P5SignedConditionalFeatureReadScope,
 flightInstanceId:string,reviewBytes:Buffer,pins:Pins){
 return (await prepareP5ConditionalPrePermitPageForIndependentSigning(pool,scope,[{flightInstanceId,reviewBytes,pins}])).privatePrepared[0];
}
