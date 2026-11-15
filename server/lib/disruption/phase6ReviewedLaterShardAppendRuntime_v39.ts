/** Existing external review -> existing V0094 registry-last publisher ->
 * genuinely separate restricted readback -> unsigned same-day append proposal.
 * Second operation verifies external day-index signature and uses existing
 * V0097/V0098 writer + actual reader. No new table, role, provider, key
 * minting, flight evidence, paid GO or purported human review.
 */
import {createHash} from "node:crypto";
import {publishP5ExternalLaterShardToPrivatePg16Once,type P5PrivatePgPublisherClient,type P5PrivatePgPublisherScope} from "./phase5Phase6Pg16PrivateLaterPrePublisher_v39";
import {verifyP5ExternalEd25519ReviewOfLaterShard,type P5Ed25519ReviewWireEnvelope,type P5ExternalLaterReviewSignerPins} from "./phase5ExternalEd25519LaterShardReviewerVerify_v39";
import {hydrateP5PrivateLaterPreFromPg16ReadOnly} from "./phase5Phase6Pg16PrivateLaterPreHydrator_v39";
import {verifyP5SignedLaterPreDayRegistry,type P5SignedLaterPreDayRegistry} from "./phase5SignedLaterPreDayRegistry_v39";
import type {P5UnsignedLaterRegistryReviewPlan} from "./phase5ReviewedLaterPacketToUnsignedDayRegistryProposal_v39";
import {readP6StoredPrivateReviewOnce} from "./phase6StoredPrivateReviewReadOnce_v39.mjs";
import {hydrateP6DayEpochFullRegistriesReadOnly} from "./phase6DayEpochFullRegistryReadOnce_v39.mjs";
import {inspectP6DayEpochExistingShardSemanticsNoGo} from "./phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {validateP6DayEpochIndexBytes,publishP6DayEpochIndexRevisionOnce,verifyP6DayEpochExternalReview} from "./phase6DayEpochSignedIndexOnce_v39.mjs";
const H=/^[a-f0-9]{64}$/;
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const hold=(s:string):never=>{throw Error("HOLD_P6_REVIEWED_LATER_APPEND_"+s);};
const utc=(x:string)=>{if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)hold("INVALID_EXACT_UTC");return Date.parse(x);};
const iso=(n:number)=>new Date(n).toISOString();
type Trust={independentStudyTrustPinsApproved:true;reviewedCodeSha:string;manifestSha256:string;calendarSha256:string;releaseSha256:string;rightsSha256:string;
 expectedReaderSessionLogin:string;dayReviewerFingerprintSha256:string;dayReviewerPublicKeyPem:string;queryReviewerFingerprintSha256:string;queryReviewerPublicKeyPem:string};
type Entry={lane:"SOURCE"|"LATER_PRE"|"POST";runDayIndex:number;shardIndex:number;filePath:string;fileSha256:string;publishedAtUtc:string;notBeforeUtc:string;hardLatestUtc:string;reviewEvidenceSha256:string;sourceRegistryFilePath:string|null;sourceRegistrySha256:string|null};
type Day={schema:string;runDayIndex:number;revision:number;previousIndexSha256:string|null;manifestSha256:string;calendarSha256:string;reviewedCodeSha:string;reviewedReleaseSha256:string;reviewedRightsSha256:string;entries:Entry[]};
type Input={readerClient:P5PrivatePgPublisherClient;publisherClient:P5PrivatePgPublisherClient;trust:Trust;plan:P5UnsignedLaterRegistryReviewPlan;
 wire:P5Ed25519ReviewWireEnvelope;reviewerPublicKeyPem:string;reviewerPins:P5ExternalLaterReviewSignerPins;
 publisherScope:P5PrivatePgPublisherScope;scope:{independentReviewedLaterAppendApproved:true;existingPaidDispatchApproved:false;
  expectedLaterReviewerFingerprintSha256:string;mode:"PUBLISH_ONCE"|"RECOVER_READONLY"}};
const ro={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
async function current(x:Input){
 const day=await readP6StoredPrivateReviewOnce({client:x.readerClient,trust:x.trust,scope:ro,
  selector:{kind:"CURRENT_DAY",runDayIndex:x.plan.registryProposal.runDayIndex}});
 const index=await hydrateP6DayEpochFullRegistriesReadOnly({client:x.readerClient,pins:day.pins,wire:day.wire,publicKeyPem:day.publicKeyPem,
  scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}});
 inspectP6DayEpochExistingShardSemanticsNoGo(index);
 return {index,day};
}
function checkScope(x:Input){
 const t=x?.trust,p=x?.plan,r=x?.reviewerPins,s=x?.publisherScope;
 if(!x||x.readerClient===x.publisherClient||!x.readerClient||!x.publisherClient||
   x.scope?.independentReviewedLaterAppendApproved!==true||x.scope.existingPaidDispatchApproved!==false||
   !["PUBLISH_ONCE","RECOVER_READONLY"].includes(x.scope.mode)||t?.independentStudyTrustPinsApproved!==true||
   !p||!r||!s||s.privateStoragePublicationApproved!==true||s.adbAutoCollect!=="0"||s.phase6ProcessArmed!=="0"||
   s.expectedPublisherSessionLogin===t.expectedReaderSessionLogin||
   r.expectedApprovedMainCodeSha!==t.reviewedCodeSha||r.expectedReviewedReleaseSha256!==t.releaseSha256||
   r.expectedReviewedRightsSha256!==t.rightsSha256||
   r.expectedReviewerPublicKeyFingerprintSha256!==x.scope.expectedLaterReviewerFingerprintSha256||
   !H.test(r.expectedReviewerPublicKeyFingerprintSha256)||
   [t.dayReviewerFingerprintSha256,t.queryReviewerFingerprintSha256].includes(r.expectedReviewerPublicKeyFingerprintSha256)||
   p.registryProposal.manifestSha256!==t.manifestSha256)
  hold("NO_DISTINCT_APPROVED_NONPAID_PUBLICATION_SCOPE");
}
/** Pure geometry only. The caller below invokes it exclusively after actual
 * signed head readback and verified new shard bytes. Do not use the resulting
 * SHA as proof of independent signature. */
export function proposeP6LaterDayAppendBytes(priorBytes:Buffer,prior:Day,source:Entry,
 registry:P5SignedLaterPreDayRegistry,registryPath:string,registrySha:string,reviewEvidenceSha:string,
 observedDbClockUtc:string,priorRetentionUtc:string,newRetentionUtc:string,reviewValidUntilUtc:string){
 const now=utc(observedDbClockUtc),retention=Math.min(utc(priorRetentionUtc),utc(newRetentionUtc));
 if(!Buffer.isBuffer(priorBytes)||priorBytes.toString("utf8")!==JSON.stringify(prior)||
    prior.schema!=="v39.phase6.run-day-scoped-append-only-index.v1"||prior.revision<1||prior.revision>=1024||
    !Array.isArray(prior.entries)||prior.entries.length<1||prior.entries.length>=1024||
    !prior.entries.some(e=>JSON.stringify(e)===JSON.stringify(source))||source.lane!=="SOURCE"||
    source.filePath!==registry.sourceDayRegistryFilePath||source.fileSha256!==registry.sourceDayRegistrySha256||
    registry.runDayIndex!==prior.runDayIndex||registry.manifestSha256!==prior.manifestSha256||
    registry.reviewedCodeSha!==prior.reviewedCodeSha||!H.test(registrySha)||!H.test(reviewEvidenceSha)||
    !registry.entries.length||registry.entries.length>96||
    prior.entries.some(e=>e.filePath===registryPath||(e.lane==="LATER_PRE"&&e.shardIndex===registry.shardIndex))||
    retention<=now||utc(reviewValidUntilUtc)<=now)
  hold("WRONG_HEAD_SOURCE_OR_RETENTION");
 const cutoffs=registry.entries.map(e=>utc(e.expectedSelectedTNativeUtc)-
  (e.expectedHorizon==="T-6h"?21600000:e.expectedHorizon==="T-90m"?5400000:NaN));
 const earliest=Math.min(...cutoffs),latest=Math.max(...cutoffs);
 if(!Number.isFinite(earliest)||earliest<=now+900000||latest>now+180*60000||latest>=retention||
    utc(prior.entries.at(-1)!.publishedAtUtc)>now)
  hold("LATE_OR_OVERWIDE_SHARD_NEEDS_CENSOR_OR_PROSPECTIVE_SPLIT");
 const next:Day={...prior,revision:prior.revision+1,previousIndexSha256:hash(priorBytes),
  entries:[...prior.entries,{lane:"LATER_PRE",runDayIndex:prior.runDayIndex,shardIndex:registry.shardIndex,
   filePath:registryPath,fileSha256:registrySha,publishedAtUtc:observedDbClockUtc,notBeforeUtc:observedDbClockUtc,
   hardLatestUtc:iso(latest),reviewEvidenceSha256:reviewEvidenceSha,
   sourceRegistryFilePath:source.filePath,sourceRegistrySha256:source.fileSha256}]};
 const nextBytes=Buffer.from(JSON.stringify(next)),indexSha256=hash(nextBytes);
 validateP6DayEpochIndexBytes(nextBytes,{runDayIndex:next.runDayIndex,indexRevision:next.revision,previousIndexSha256:next.previousIndexSha256,
  manifestSha256:next.manifestSha256,calendarSha256:next.calendarSha256,reviewedCodeSha:next.reviewedCodeSha,
  releaseSha256:next.reviewedReleaseSha256,rightsSha256:next.reviewedRightsSha256,reviewedAtUtc:observedDbClockUtc});
 const out={status:"PRIVATE_LATER_SHARD_APPEND_PROPOSAL_NEEDS_EXTERNAL_DAY_SIGNATURE",runDayIndex:next.runDayIndex,
  revision:next.revision,indexSha256,previousIndexSha256:next.previousIndexSha256,
  latestAllowedRetentionUtc:iso(retention),latestAllowedReviewValidityUtc:iso(Math.min(retention,utc(reviewValidUntilUtc))),
  earliestCutoffUtc:iso(earliest),latestCutoffUtc:iso(latest),independentDayReviewIssuedHere:false,phase6PaidGo:false};
 return Object.defineProperty(out,"privateIndexBytes",{value:nextBytes,enumerable:false}) as typeof out&{readonly privateIndexBytes:Buffer};
}
function sourceAndDuplicates(index:any,x:Input){
 const p=x.plan,head=index.privateParsedIndex as Day;
 const sources=head.entries.filter(e=>e.lane==="SOURCE"&&e.filePath===p.registryProposal.sourceDayRegistryFilePath&&e.fileSha256===p.sourceRegistrySha256);
 if(sources.length!==1||sources[0].reviewEvidenceSha256!==x.publisherScope.expectedSourceReviewEvidenceSha256)
  hold("SOURCE_NOT_IN_AUTHENTICATED_CURRENT_DAY");
 const source=sources[0],already=head.entries.filter(e=>e.filePath===p.proposedRegistryFilePath||
  (e.lane==="LATER_PRE"&&e.shardIndex===p.registryProposal.shardIndex));
 if(already.length>1||already.some(e=>e.lane!=="LATER_PRE"||e.fileSha256!==p.proposedRegistrySha256||
    e.reviewEvidenceSha256!==x.reviewerPins.expectedIndependentReviewerEvidenceDigestSha256||e.sourceRegistrySha256!==source.fileSha256))
  hold("EXISTING_ROUTE_CONFLICT");
 const used=new Set<string>();
 for(const e of head.entries.filter(e=>e.lane==="LATER_PRE"&&e.filePath!==p.proposedRegistryFilePath)){
  const b=index.getFrozen(e.filePath),r=JSON.parse(b.toString("utf8")) as P5SignedLaterPreDayRegistry;
  for(const f of r.entries)used.add(f.expectedFlightInstanceId+"|"+f.expectedHorizon);
 }
 if(p.registryProposal.entries.some(e=>used.has(e.expectedFlightInstanceId+"|"+e.expectedHorizon)))
  hold("DUPLICATE_FLIGHT_HORIZON_ALREADY_IN_SIGNED_DAY");
 const raw=index.getFrozen(source.filePath);
 const packetMap=new Map(p.proposedPacketFiles.map(f=>[f.filePath,f.bytes]));
 verifyP5SignedLaterPreDayRegistry(p.registryProposalBytes,p.registryProposal,raw,JSON.parse(raw.toString("utf8")),
  {registryFilePath:p.proposedRegistryFilePath,expectedRegistrySha256:p.proposedRegistrySha256,
   expectedSourceDayRegistrySha256:source.fileSha256,expectedManifestSha256:x.trust.manifestSha256,
   expectedApprovedMainSha:x.trust.reviewedCodeSha,expectedRunDayIndex:head.runDayIndex,
   expectedReleaseSha256:x.trust.releaseSha256,expectedRightsSha256:x.trust.rightsSha256},
  path=>packetMap.get(path)??hold("MISSING_EXACT_REVIEWED_FLIGHT_BYTES"));
 return {source,head,already:already.length===1};
}
async function readback(x:Input,source:Entry){
 const p=x.plan,t=x.trust;
 const got=await hydrateP5PrivateLaterPreFromPg16ReadOnly(x.readerClient,{
  registryFilePath:p.proposedRegistryFilePath,expectedRegistrySha256:p.proposedRegistrySha256,
  expectedSourceRegistryPath:source.filePath,expectedSourceDayRegistrySha256:source.fileSha256,
  expectedManifestSha256:t.manifestSha256,expectedApprovedMainSha:t.reviewedCodeSha,
  expectedReleaseSha256:t.releaseSha256,expectedRightsSha256:t.rightsSha256,expectedRunDayIndex:p.registryProposal.runDayIndex,
  expectedPrivateSessionLogin:t.expectedReaderSessionLogin,expectedSourceReviewEvidenceSha256:source.reviewEvidenceSha256,
  expectedLaterReviewEvidenceSha256:x.reviewerPins.expectedIndependentReviewerEvidenceDigestSha256,privateReadOnlyApproved:true,paidProviderCallsAllowed:false});
 if(got.verified.entries.length!==p.proposedPacketFiles.length||
    got.verified.entries.some((e,i)=>e.filePath!==p.proposedPacketFiles[i].filePath||!e.bytes.equals(p.proposedPacketFiles[i].bytes)))
  hold("INDEPENDENT_PRIVATE_POSTCOMMIT_PACKET_READBACK_DRIFT");
 return got;
}
/** Publish only once, or explicitly recover with NO INSERT. Unknown COMMIT
 * requires a fresh reader operation. This function never retries a writer. */
export async function prepareP6ReviewedLaterShardAppend(x:Input){
 checkScope(x);
 const initial=await current(x),before=sourceAndDuplicates(initial.index,x);
 verifyP5ExternalEd25519ReviewOfLaterShard(x.plan,x.wire,x.reviewerPublicKeyPem,x.reviewerPins,initial.index.redactedSummary.observedDbClockUtc);
 const bound=initial.day.wire.review.retentionNotAfterUtc;
 if(utc(x.publisherScope.approvedRetentionNotAfterUtc)<utc(bound))
  hold("NEW_SHARD_RETENTION_CANNOT_COVER_ORIGINAL_SIGNED_DAY");
 // A preflight proposal ensures complete shard window fits BEFORE any write.
 if(!before.already)proposeP6LaterDayAppendBytes(initial.index.privateCurrentIndexBytes,before.head,before.source,
  x.plan.registryProposal,x.plan.proposedRegistryFilePath,x.plan.proposedRegistrySha256,
  x.reviewerPins.expectedIndependentReviewerEvidenceDigestSha256,initial.index.redactedSummary.observedDbClockUtc,
  bound,x.publisherScope.approvedRetentionNotAfterUtc,x.wire.review.validUntilUtc);
 let inserted=0;
 if(x.scope.mode==="PUBLISH_ONCE"&&!before.already){
  const r=await publishP5ExternalLaterShardToPrivatePg16Once(x.publisherClient,x.plan,x.wire,x.reviewerPublicKeyPem,x.reviewerPins,x.publisherScope);
  inserted=r.insertedPrivateRowCount;
 }
 const got=await readback(x,before.source);
 const after=await current(x),fresh=sourceAndDuplicates(after.index,x);
 if(fresh.already)return {status:"EXACT_LATER_SHARD_ALREADY_IN_SIGNED_DAY_NO_REPLAY",runDayIndex:fresh.head.runDayIndex,
  indexSha256:after.index.redactedSummary.indexSha256,verifiedPacketCount:got.verified.entries.length,
  insertedPrivateRows:inserted,providerCalls:0,phase6PaidGo:false};
 const next=proposeP6LaterDayAppendBytes(after.index.privateCurrentIndexBytes,fresh.head,fresh.source,x.plan.registryProposal,
  x.plan.proposedRegistryFilePath,x.plan.proposedRegistrySha256,x.reviewerPins.expectedIndependentReviewerEvidenceDigestSha256,
  after.index.redactedSummary.observedDbClockUtc,after.day.wire.review.retentionNotAfterUtc,
  x.publisherScope.approvedRetentionNotAfterUtc,x.wire.review.validUntilUtc);
 const out={...next,verifiedPacketCount:got.verified.entries.length,insertedPrivateRows:inserted,providerCalls:0};
 return Object.defineProperty(out,"privateIndexBytes",{value:next.privateIndexBytes,enumerable:false}) as typeof out&{readonly privateIndexBytes:Buffer};
}
/** Separately received external day wire. Re-read actual current predecessor,
 * verify exact reviewed bytes and new packet readback, then use the existing
 * V0097/V0098 append publisher. No private key accepted. */
export async function commitP6ExternallyReviewedLaterAppend(x:Input,approved:{
 indexBytes:Buffer;expectedIndexSha256:string;expectedDayReviewEvidenceSha256:string;wire:any
}){
 checkScope(x);
 if(x.scope.mode!=="RECOVER_READONLY"||!Buffer.isBuffer(approved?.indexBytes)||
   hash(approved.indexBytes)!==approved.expectedIndexSha256||!H.test(approved.expectedDayReviewEvidenceSha256))
  hold("SEPARATELY_APPROVED_DAY_APPEND_REQUIRED");
 const initial=await current(x),before=sourceAndDuplicates(initial.index,x),t=x.trust,p=x.plan;
 const now=initial.index.redactedSummary.observedDbClockUtc,r=approved.wire?.review;
 if(!r||r.externalReviewEvidenceSha256!==approved.expectedDayReviewEvidenceSha256||
    r.indexSha256!==approved.expectedIndexSha256)hold("EXTERNAL_DAY_REVIEW_PIN_DRIFT");
 const pins={independentExternalReviewerSignaturePinsApproved:true,privateDayIndexPublicationApproved:true,
  expectedRunDayIndex:before.head.runDayIndex,expectedIndexRevision:r.indexRevision,
  expectedIndexSha256:approved.expectedIndexSha256,expectedPreviousIndexSha256:r.previousIndexSha256,
  expectedReviewedCodeSha:t.reviewedCodeSha,expectedManifestSha256:t.manifestSha256,expectedCalendarSha256:t.calendarSha256,
  expectedReleaseSha256:t.releaseSha256,expectedRightsSha256:t.rightsSha256,
  expectedExternalReviewEvidenceSha256:approved.expectedDayReviewEvidenceSha256,
  expectedReviewerPublicKeyFingerprintSha256:t.dayReviewerFingerprintSha256};
 const signed=verifyP6DayEpochExternalReview({wire:approved.wire,publicKeyPem:t.dayReviewerPublicKeyPem,pins});
 const next=validateP6DayEpochIndexBytes(approved.indexBytes,signed.review) as Day;
 verifyP5ExternalEd25519ReviewOfLaterShard(p,x.wire,x.reviewerPublicKeyPem,x.reviewerPins,now);
 const got=await readback(x,before.source);
 if(before.already){
  if(!initial.index.privateCurrentIndexBytes.equals(approved.indexBytes))
   hold("ALREADY_INDEXED_DIFFERENT_REVISION_REQUIRES_REVIEW_NO_REPLAY");
  return {status:"EXACT_SIGNED_LATER_APPEND_ALREADY_COMMITTED_NO_REPLAY",indexSha256:approved.expectedIndexSha256,
   verifiedPacketCount:got.verified.entries.length,providerCalls:0,phase6PaidGo:false};
 }
 const e=next.entries.at(-1)!;
 const earliest=Math.min(...p.registryProposal.entries.map(f=>utc(f.expectedSelectedTNativeUtc)-
  (f.expectedHorizon==="T-6h"?21600000:5400000)));
 const latest=Math.max(...p.registryProposal.entries.map(f=>utc(f.expectedSelectedTNativeUtc)-
  (f.expectedHorizon==="T-6h"?21600000:5400000)));
 if(next.revision!==before.head.revision+1||next.previousIndexSha256!==initial.index.redactedSummary.indexSha256||
    next.entries.length!==before.head.entries.length+1||
    before.head.entries.some((v,i)=>JSON.stringify(v)!==JSON.stringify(next.entries[i]))||
    e.lane!=="LATER_PRE"||e.shardIndex!==p.registryProposal.shardIndex||e.filePath!==p.proposedRegistryFilePath||
    e.fileSha256!==p.proposedRegistrySha256||e.reviewEvidenceSha256!==x.reviewerPins.expectedIndependentReviewerEvidenceDigestSha256||
    e.sourceRegistryFilePath!==before.source.filePath||e.sourceRegistrySha256!==before.source.fileSha256||
    utc(e.notBeforeUtc)>=earliest||utc(e.hardLatestUtc)!==latest||earliest<=utc(got.observedDbClockUtc)+900000||
    signed.reviewedAtMs>utc(got.observedDbClockUtc)||signed.validUntilMs<=utc(got.observedDbClockUtc)||
    signed.validUntilMs<latest||signed.retentionNotAfterMs<=latest||
    signed.retentionNotAfterMs>Math.min(utc(initial.day.wire.review.retentionNotAfterUtc),utc(x.publisherScope.approvedRetentionNotAfterUtc))||
    signed.validUntilMs>utc(x.wire.review.validUntilUtc))
  hold("EXTERNAL_DAY_APPEND_CHANGED_OR_TOO_LATE");
 const committed=await publishP6DayEpochIndexRevisionOnce({client:x.publisherClient,pins,wire:approved.wire,publicKeyPem:t.dayReviewerPublicKeyPem,
  indexBytes:approved.indexBytes,scope:{privateDayIndexStorageApproved:true,independentProviderContentsReviewApproved:true,existingPaidDispatchApproved:false,
   adbAutoCollect:"0",phase6ProcessArmed:"0",expectedPublisherSessionLogin:x.publisherScope.expectedPublisherSessionLogin,
   approvedCodeSha:t.reviewedCodeSha,approvedCalendarSha256:t.calendarSha256,approvedRightsSha256:t.rightsSha256,
   approvedRetentionNotAfterUtc:r.retentionNotAfterUtc,persistVerifiedReviewWire:true}});
 const observed=await current(x);
 if(observed.index.redactedSummary.indexSha256!==committed.indexSha256||committed.indexSha256!==approved.expectedIndexSha256)
  hold("SIGNED_INDEX_READBACK_UNKNOWN_NO_REPLAY");
 return {status:"REVIEWED_LATER_SHARD_AND_SIGNED_DAY_APPEND_ACTUAL_READBACK_NO_GO",runDayIndex:next.runDayIndex,revision:next.revision,
  indexSha256:committed.indexSha256,verifiedPacketCount:got.verified.entries.length,providerCalls:0,phase6PaidGo:false};
}
