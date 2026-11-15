/** Actual native POST evidence -> protected delegated review -> existing
 * V0094 POST publisher + independent readback -> existing day-index append.
 * No provider credential, paid reservation, new schema, or physical label.
 * Do not call this producer in a paid child. The original V0083 gates remain.
 */
import {createHash,createPublicKey,sign} from "node:crypto";
import {readP6ActualNativePostPreCandidatePage,proposeP6NativePostPhysicalWindow} from "./phase6PostNativePreCandidateReadOnce_v39.mjs";
import {readP6StoredPrivateReviewOnce} from "./phase6StoredPrivateReviewReadOnce_v39.mjs";
import {hydrateP6DayEpochFullRegistriesReadOnly} from "./phase6DayEpochFullRegistryReadOnce_v39.mjs";
import {inspectP6DayEpochExistingShardSemanticsNoGo} from "./phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {P6_SOURCE_POST_REVIEW_SCHEMA,P6_SOURCE_POST_REVIEW_AUDIENCE,signedP6PrivateSourcePostReviewBytes,verifyP6ExternalSourcePostReview,readP6PrivateSourcePostOnce} from "./phase6PrivateSourcePostReadOnce_v39.mjs";
import {publishP6PrivateSourcePostOnce} from "./phase6PrivateSourcePostPublisherOnce_v39.mjs";
import {P6_DAY_EPOCH_REVIEW_SCHEMA,P6_DAY_EPOCH_REVIEW_AUDIENCE,p6DayEpochReviewPreimage,validateP6DayEpochIndexBytes,verifyP6DayEpochExternalReview,publishP6DayEpochIndexRevisionOnce} from "./phase6DayEpochSignedIndexOnce_v39.mjs";
import {admitP5FuturePostFrozenForReadOnly} from "./phase5FuturePostGithubReadonlyRelease_v39.ts";
import {verifyP5FuturePostReviewedFrame,auditP5FuturePostActualPriorPreBatch} from "./phase5V0083FuturePostOriginalDb_v39.ts";
const H=/^[a-f0-9]{64}$/,LOGIN=/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/;
const hold=s=>{throw Error("HOLD_P6_NATIVE_POST_PUBLISH_"+s);};
const bytes=x=>Buffer.from(JSON.stringify(x),"utf8");
const hash=b=>createHash("sha256").update(b).digest("hex");
const utc=x=>{if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)hold("INVALID_UTC");return Date.parse(x);};
const iso=x=>new Date(x).toISOString();
const seal=(x,k)=>{const d=Object.getOwnPropertyDescriptor(x??{},k);return Boolean(d&&!d.enumerable&&!d.writable);};
const ro={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
function fp(k){
 try{if(k?.type!=="private"||k.asymmetricKeyType!=="ed25519")hold("PRIVATE_KEY");
  return hash(createPublicKey(k).export({type:"spki",format:"der"}));}catch{hold("PRIVATE_KEY");}
}
export function verifyP6NativePostDelegation(t,a){
 if(t?.independentStudyTrustPinsApproved!==true||t.independentPostReviewerPinsApproved!==true||
    a?.independentDelegatedPostAndDayAppendApproved!==true||a.noProviderCredentialsInReviewer!==true||
    !Buffer.isBuffer(a.policyBytes)||a.policyBytes.length<100||a.policyBytes.length>65536||
    !H.test(a.expectedPolicySha256??"")||hash(a.policyBytes)!==a.expectedPolicySha256)
  hold("NO_PROTECTED_DELEGATION");
 const p=JSON.parse(a.policyBytes.toString("utf8"));
 if(p.schema!=="v39.phase6.native-post-physical-window-policy.v1"||
    p.independentPostRequestGeometryApproved!==true||p.delegatedPostPacketAndDayAppendApproved!==true||
    p.independentSourceContentsUseAndRESTReleaseAttested!==true||p.independentProviderContentRetentionApproved!==true||
    p.reviewedCodeSha!==t.reviewedCodeSha||!["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>p[k]===t[k])||
    ![p.reviewedFrameSha256,p.reviewedProviderPriceSha256,p.reviewedCategoryBudgetSha256,p.reviewedProviderContractSha256,
      p.externalPostContentsAndBudgetEvidenceSha256].every(x=>H.test(x??""))||
    p.postReviewerFingerprintSha256!==t.postReviewerFingerprintSha256||
    p.dayReviewerFingerprintSha256!==t.dayReviewerFingerprintSha256||
    p.queryReviewerFingerprintSha256!==t.queryReviewerFingerprintSha256||
    new Set([p.postReviewerFingerprintSha256,p.dayReviewerFingerprintSha256,p.queryReviewerFingerprintSha256]).size!==3||
    fp(a.postReviewerKey)!==t.postReviewerFingerprintSha256||fp(a.dayReviewerKey)!==t.dayReviewerFingerprintSha256||
    !LOGIN.test(p.expectedPublisherSessionLogin??"")||p.expectedPublisherSessionLogin===t.expectedReaderSessionLogin||
    !Number.isSafeInteger(p.maximumPrivateRetentionHours)||p.maximumPrivateRetentionHours<1||p.maximumPrivateRetentionHours>168||
    !Number.isSafeInteger(p.maximumIndexRevision)||p.maximumIndexRevision<2||p.maximumIndexRevision>1024||
    !Number.isSafeInteger(p.maximumPopulationStalenessSeconds)||p.maximumPopulationStalenessSeconds<1||p.maximumPopulationStalenessSeconds>86400||
    !Number.isSafeInteger(p.followupAfterPartitionEndSeconds)||p.followupAfterPartitionEndSeconds<0||
    !Number.isSafeInteger(p.dispatchWindowSeconds)||p.dispatchWindowSeconds<1||p.dispatchWindowSeconds>1800||
    p.followupAfterPartitionEndSeconds+p.dispatchWindowSeconds>172800||
    p.expectedApiUnitsPerGet!==2||utc(p.validFromUtc)>=utc(p.validUntilUtc))
  hold("DELEGATION_RIGHTS_BUDGET_KEY_OR_SCOPE_DRIFT");
 return Object.freeze(p);
}
async function current(client,trust,runDayIndex){
 const day=await readP6StoredPrivateReviewOnce({client,trust,scope:ro,selector:{kind:"CURRENT_DAY",runDayIndex}});
 const index=await hydrateP6DayEpochFullRegistriesReadOnly({client,pins:day.pins,wire:day.wire,publicKeyPem:day.publicKeyPem,
  scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}});
 inspectP6DayEpochExistingShardSemanticsNoGo(index);return {day,index};
}
function indexedPost(x,requestSha){
 const entries=x.index.privateParsedIndex.entries,ids=new Set();let hit=null;
 for(const e of entries.filter(e=>e.lane==="POST")){
  const b=x.index.getFrozen(e.filePath);
  if(!Buffer.isBuffer(b)||hash(b)!==e.fileSha256)hold("POST_INDEX_BYTES_DRIFT");
  const p=JSON.parse(b.toString("utf8")),d=p?.reviewed?.requestSha256;
  if(p.schema!=="v39.phase5.github-future-post-reviewed-release.v1"||!H.test(d??"")||ids.has(d))
    hold("EXISTING_POST_REQUEST_IDENTITY_DRIFT");
  ids.add(d);if(d===requestSha)hit=e;
 }
 return {ids,hit};
}
function checkCurrent(x,t,runDayIndex){
 const z=x?.index?.redactedSummary,h=x?.index?.privateParsedIndex,b=x?.index?.privateCurrentIndexBytes;
 if(z?.status!=="SIGNED_DAY_EPOCH_FULL_REGISTRY_READONLY_NO_DISPATCH"||
    z.externalEd25519ReviewerVerified!==true||z.restrictedPrivatePg16ReaderVerified!==true||
    z.actualPrivateRegistryBytesRead!==true||z.providerCalls!==0||z.databaseWrites!==0||z.phase6PaidGo!==false||
    !seal(x.index,"privateParsedIndex")||!seal(x.index,"privateCurrentIndexBytes")||
    !Buffer.isBuffer(b)||hash(b)!==z.indexSha256||!bytes(h).equals(b)||
    h.runDayIndex!==runDayIndex||z.runDayIndex!==runDayIndex||h.revision!==z.indexRevision||
    x.day?.wire?.review?.indexSha256!==z.indexSha256||
    h.manifestSha256!==t.manifestSha256||h.calendarSha256!==t.calendarSha256||
    h.reviewedCodeSha!==t.reviewedCodeSha||h.reviewedReleaseSha256!==t.releaseSha256||h.reviewedRightsSha256!==t.rightsSha256||
    !Array.isArray(h.entries)||h.entries.length<1||h.entries.length>1024)
  hold("CURRENT_SIGNED_DAY_DRIFT");
 return h;
}
const noGo=(status,extra={})=>Object.freeze({status,...extra,providerCalls:0,paidReservations:0,phase6PaidGo:false});
/** Pure packet builder with same actual-reader scope as runtime; no writes.
 * The runner's real run ID is used ONLY for the existing verifier, never
 * stored in the future packet (the actual child supplies its own ID). */
export function buildP6DelegatedNativePostPacket({currentDay:x,proposal,sourceQueryRetentionNotAfterUtc,authority:a,trust:t,githubRunId}){
 const p=verifyP6NativePostDelegation(t,a),d=proposal?.privateReviewedDraft,e=proposal?.privateEvidence;
 if(proposal?.status!=="ONE_UNSIGNED_NATIVE_POST_PHYSICAL_REQUEST"||proposal.phase6PaidGo!==false||
    !seal(proposal,"privateReviewedDraft")||!seal(proposal,"privateEvidence")||!d||!e||
    d.requestSha256!==proposal.requestSha256||e.requestSha256!==d.requestSha256||
    d.reviewedRequestContextSha256!==hash(bytes(e))||e.policySha256!==a.expectedPolicySha256||
    d.manifestSha256!==t.manifestSha256||d.reviewedSourceRightsSha256!==t.rightsSha256||
    d.reviewedCategoryBudgetSha256!==p.reviewedCategoryBudgetSha256||d.reviewedProviderPriceSha256!==p.reviewedProviderPriceSha256||
    d.reviewedFrameSha256!==p.reviewedFrameSha256||d.reviewedProviderContractSha256!==p.reviewedProviderContractSha256||
    !/^[0-9]{5,25}$/.test(githubRunId??"")||Object.hasOwn(d,"githubRunId")||
    Object.hasOwn(d,"independentFuturePostRequestAndRightsReview"))hold("UNBOUND_ACTUAL_PRE_DRAFT");
 const h=checkCurrent(x,t,d.runDayIndex),now=utc(x.index.redactedSummary.observedDbClockUtc),prior=x.day.wire.review;
 if(now<utc(p.validFromUtc)||now>=utc(p.validUntilUtc)||now<utc(e.observedDbClockUtc)||now-utc(e.observedDbClockUtc)>120000||
    e.sourceIndexSha256!==x.index.redactedSummary.indexSha256)hold("STALE_ACTUAL_PRE_OR_INDEX");
 const already=indexedPost(x,d.requestSha256).hit;
 if(already)return noGo("POST_PHYSICAL_REQUEST_ALREADY_INDEXED_NO_REPLAY");
 const found=h.entries.filter(s=>s.lane==="SOURCE"&&s.filePath===proposal.privateSourceRegistryPath&&s.fileSha256===proposal.privateSourceRegistrySha256);
 if(found.length!==1||e.sourceRegistrySha256!==found[0].fileSha256)hold("NO_EXACT_CURRENT_SOURCE_REGISTRY");
 const source=found[0],sourceBytes=x.index.getFrozen(source.filePath),reg=JSON.parse(sourceBytes.toString("utf8"));
 if(hash(sourceBytes)!==source.fileSha256||reg.schema!=="v39.phase5.signed-per-day-source-batch-readonly.v1"||
    !reg.entries.some(q=>q.expectedQueryDigestSha256===e.sourceQueryDigestSha256))hold("NO_BOUND_SOURCE_QUERY");
 const start=utc(d.postDispatchEarliestUtc),end=utc(d.postDispatchHardLatestUtc);
 if(h.revision>=p.maximumIndexRevision||h.entries.length>=1024)return noGo("POST_DAY_INDEX_CAPACITY_DEFERRED");
 const retention=Math.min(utc(prior.retentionNotAfterUtc),utc(p.validUntilUtc),now+p.maximumPrivateRetentionHours*3600000,
  utc(sourceQueryRetentionNotAfterUtc),utc(e.anchorBoundPreRetentionNotAfterUtc));
 const valid=Math.min(retention,utc(prior.validUntilUtc));
 if(start<=now+120000||end<=start)return noGo("POST_PROSPECTIVE_WINDOW_TOO_CLOSE");
 if(end>=valid||h.entries.some(s=>utc(s.hardLatestUtc)>valid))return noGo("POST_RETENTION_OR_EXISTING_ROUTE_WINDOW_CONFLICT");
 const shardIndex=Math.max(0,...h.entries.filter(s=>s.lane==="POST").map(s=>s.shardIndex))+1;
 if(shardIndex>100000)hold("POST_SHARD_BOUND");
 const reviewed={...d,independentFuturePostRequestAndRightsReview:true};
 verifyP5FuturePostReviewedFrame({...reviewed,githubRunId});
 const packet={schema:"v39.phase5.github-future-post-reviewed-release.v1",approvedCodeSha:t.reviewedCodeSha,
  independentSourceContentsUseAndRESTReleaseAttested:true,reviewed};
 const packetBytes=bytes(packet),contentSha256=hash(packetBytes);
 // Stable immutable logical path, based on physical request rather than
 // a different anchor's content digest; DB uniqueness is cross-run-day.
 const path="data-collection/phase5/frozen/post_"+d.requestSha256+".json";
 const evidence=hash(bytes({schema:"v39.phase6.delegated-post-evidence.v1",contextSha256:d.reviewedRequestContextSha256,
  policySha256:a.expectedPolicySha256,externalPostContentsAndBudgetEvidenceSha256:p.externalPostContentsAndBudgetEvidenceSha256}));
 const rev={schema:P6_SOURCE_POST_REVIEW_SCHEMA,audience:P6_SOURCE_POST_REVIEW_AUDIENCE,kind:"POST_PACKET",logicalPath:path,contentSha256,
  reviewedCodeSha:t.reviewedCodeSha,manifestSha256:t.manifestSha256,rightsSha256:t.rightsSha256,runDayIndex:d.runDayIndex,shardIndex,
  externalReviewEvidenceSha256:evidence,reviewedAtUtc:iso(now),retentionNotAfterUtc:iso(retention),validUntilUtc:iso(valid),
  reviewerPublicKeyFingerprintSha256:t.postReviewerFingerprintSha256};
 const pins={independentExternalReviewerSignaturePinsApproved:true,privateSourcePostPublishApproved:true,privateSourcePostReadOnlyApproved:true,
  expectedPrivateSessionLogin:t.expectedReaderSessionLogin,expectedKind:"POST_PACKET",expectedLogicalPath:path,expectedContentSha256:contentSha256,
  expectedReviewedMainSha:t.reviewedCodeSha,expectedManifestSha256:t.manifestSha256,expectedRightsSha256:t.rightsSha256,
  expectedExternalReviewEvidenceSha256:evidence,expectedReviewerPublicKeyFingerprintSha256:t.postReviewerFingerprintSha256,
  expectedRunDayIndex:d.runDayIndex,expectedShardIndex:shardIndex};
 const wire={review:rev,signatureBase64:sign(null,signedP6PrivateSourcePostReviewBytes(rev),a.postReviewerKey).toString("base64")};
 verifyP6ExternalSourcePostReview(wire,t.postReviewerPublicKeyPem,pins);
 admitP5FuturePostFrozenForReadOnly(packetBytes,packet,{frozenPacketPath:path,expectedPacketSha256:contentSha256,
  approvedCodeSha:t.reviewedCodeSha,currentGithubRunId:githubRunId,manifestSha256:t.manifestSha256,sourceRightsSha256:t.rightsSha256,
  categoryBudgetSha256:p.reviewedCategoryBudgetSha256,providerContractSha256:p.reviewedProviderContractSha256,
  requestSha256:d.requestSha256,requestContextSha256:d.reviewedRequestContextSha256,frameSha256:p.reviewedFrameSha256,providerPriceSha256:p.reviewedProviderPriceSha256});
 return Object.freeze(Object.defineProperties({status:"DELEGATED_POST_PACKET_AWAIT_PUBLICATION_NO_GO",runDayIndex:d.runDayIndex,
  requestSha256:d.requestSha256,providerCalls:0,phase6PaidGo:false},{privatePacketBytes:{value:packetBytes},
  privateWire:{value:wire},privatePins:{value:pins},privateSource:{value:source}}));
}
/** Existing day index format. Append only after restricted POST readback.
 * The earlier day cannot lose validity for any outstanding route. */
export function buildP6PostDayAppend({currentDay:x,signedPacket:b,receipt,authority:a,trust:t}){
 const p=verifyP6NativePostDelegation(t,a),r=b?.privateWire?.review,raw=b?.privatePacketBytes,src=b?.privateSource;
 if(!r||!Buffer.isBuffer(raw)||hash(raw)!==r.contentSha256||!seal(b,"privateWire")||!seal(b,"privatePacketBytes")||
    !seal(b,"privatePins")||!seal(b,"privateSource")||!src||!receipt||
    receipt.redactedSummary?.status!=="VERIFIED_ONE_PRIVATE_PACKET_BYTE_TRANSPORT_NO_GO"||
    receipt.redactedSummary.verifiedEd25519Review!==true||receipt.redactedSummary.kind!=="POST_PACKET"||
    receipt.redactedSummary.providerCalls!==0||receipt.redactedSummary.databaseWrites!==0||
    !seal(receipt,"privateBytes")||!receipt.privateBytes.equals(raw)||receipt.privateLogicalPath!==r.logicalPath)
  hold("NO_INDEPENDENT_POST_PACKET_READBACK");
 verifyP6ExternalSourcePostReview(b.privateWire,t.postReviewerPublicKeyPem,b.privatePins);
 const h=checkCurrent(x,t,r.runDayIndex),now=utc(x.index.redactedSummary.observedDbClockUtc),prior=x.day.wire.review;
 const got=utc(receipt.redactedSummary.observedDatabaseClockUtc),d=JSON.parse(raw.toString("utf8")).reviewed;
 if(got<utc(r.reviewedAtUtc)||now<got||now-got>120000||now<utc(p.validFromUtc)||now>=utc(p.validUntilUtc)||
    !h.entries.some(s=>JSON.stringify(s)===JSON.stringify(src)))hold("POST_READBACK_OR_SOURCE_DRIFT");
 const hit=indexedPost(x,d.requestSha256).hit;
 if(hit){
  if(hit.filePath!==r.logicalPath||hit.fileSha256!==r.contentSha256)hold("EXISTING_POST_CONFLICT_NO_REPLAY");
  return noGo("POST_PHYSICAL_REQUEST_ALREADY_INDEXED_NO_REPLAY");
 }
 if(h.revision>=p.maximumIndexRevision||h.entries.length>=1024||
    h.entries.some(s=>s.filePath===r.logicalPath||(s.lane==="POST"&&s.shardIndex===r.shardIndex)))
  hold("POST_APPEND_CAPACITY_OR_CONCURRENT_SHARD_NO_REPLAY");
 const start=utc(d.postDispatchEarliestUtc),end=utc(d.postDispatchHardLatestUtc);
 const retention=Math.min(utc(prior.retentionNotAfterUtc),utc(r.retentionNotAfterUtc),utc(p.validUntilUtc));
 const valid=Math.min(retention,utc(prior.validUntilUtc),utc(r.validUntilUtc));
 if(now+120000>=start||end>=valid||h.entries.some(s=>utc(s.hardLatestUtc)>valid)||utc(h.entries.at(-1).publishedAtUtc)>now)
  hold("POST_APPEND_WINDOW_OR_RETENTION_NO_REPLAY");
 const next={...h,revision:h.revision+1,previousIndexSha256:x.index.redactedSummary.indexSha256,
  entries:[...h.entries,{lane:"POST",runDayIndex:r.runDayIndex,shardIndex:r.shardIndex,filePath:r.logicalPath,fileSha256:r.contentSha256,
   publishedAtUtc:iso(now),notBeforeUtc:d.postDispatchEarliestUtc,hardLatestUtc:d.postDispatchHardLatestUtc,
   reviewEvidenceSha256:r.externalReviewEvidenceSha256,sourceRegistryFilePath:src.filePath,sourceRegistrySha256:src.fileSha256}]};
 const indexBytes=bytes(next),indexSha256=hash(indexBytes);
 const evidence=hash(bytes({schema:"v39.phase6.delegated-post-day-append-evidence.v1",policySha256:a.expectedPolicySha256,
  previousIndexSha256:next.previousIndexSha256,indexSha256,postWireSha256:hash(bytes(b.privateWire)),observedDbClockUtc:iso(now)}));
 const review={schema:P6_DAY_EPOCH_REVIEW_SCHEMA,audience:P6_DAY_EPOCH_REVIEW_AUDIENCE,runDayIndex:r.runDayIndex,
  indexRevision:next.revision,indexSha256,previousIndexSha256:next.previousIndexSha256,reviewedCodeSha:t.reviewedCodeSha,
  manifestSha256:t.manifestSha256,calendarSha256:t.calendarSha256,releaseSha256:t.releaseSha256,rightsSha256:t.rightsSha256,
  externalReviewEvidenceSha256:evidence,reviewedAtUtc:iso(now),validUntilUtc:iso(valid),retentionNotAfterUtc:iso(retention),
  reviewerPublicKeyFingerprintSha256:t.dayReviewerFingerprintSha256};
 const pins={independentExternalReviewerSignaturePinsApproved:true,privateDayIndexPublicationApproved:true,expectedRunDayIndex:r.runDayIndex,
  expectedIndexRevision:next.revision,expectedIndexSha256:indexSha256,expectedPreviousIndexSha256:next.previousIndexSha256,
  expectedReviewedCodeSha:t.reviewedCodeSha,expectedManifestSha256:t.manifestSha256,expectedCalendarSha256:t.calendarSha256,
  expectedReleaseSha256:t.releaseSha256,expectedRightsSha256:t.rightsSha256,expectedExternalReviewEvidenceSha256:evidence,
  expectedReviewerPublicKeyFingerprintSha256:t.dayReviewerFingerprintSha256};
 const wire={review,signatureBase64:sign(null,p6DayEpochReviewPreimage(review),a.dayReviewerKey).toString("base64")};
 verifyP6DayEpochExternalReview({wire,pins,publicKeyPem:t.dayReviewerPublicKeyPem});validateP6DayEpochIndexBytes(indexBytes,review);
 return Object.freeze(Object.defineProperties({status:"DELEGATED_POST_DAY_APPEND_AWAIT_PUBLICATION_NO_GO",indexSha256,revision:next.revision,
  providerCalls:0,phase6PaidGo:false},{privateIndexBytes:{value:indexBytes},privateWire:{value:wire},privatePins:{value:pins}}));
}
/** Only this wrapper performs real publication. No caller-supplied PRE
 * proof: use actual restricted DB read. A failed/unknown commit MUST NOT
 * reinsert the packet. A committed orphan needs exact independent recovery.
 * Each invocation produces at most one physical-window packet and append. */
export async function runP6NativePostPublication({readerClient,publisherClient,sourcePool,trust,authority,selector,t24Trust,githubRunId}){
 if(!readerClient||!publisherClient||readerClient===publisherClient||!sourcePool||
    !/^[0-9]{5,25}$/.test(githubRunId??"")||!["T-24h","T-6h","T-90m"].includes(selector?.horizon))
  hold("NO_DISTINCT_RESTRICTED_RUNTIME");
 const p=verifyP6NativePostDelegation(trust,authority);
 const x=await current(readerClient,trust,selector.runDayIndex),existing=[...indexedPost(x,null).ids];
 let cursor=null,proposal,page;
 for(let i=0;i<4;i++){
  page=await readP6ActualNativePostPreCandidatePage({readerClient,sourcePool,trust,selector,t24Trust,
   policy:{horizon:selector.horizon,independentPostCandidateReadOnlyApproved:true,independentNativeCandidateReadOnlyApproved:true,
    existingPaidDispatchApproved:false,noProviderCredentialsInAudit:true,reviewedFrameSha256:p.reviewedFrameSha256,
    providerContractSha256:p.reviewedProviderContractSha256,maximumPopulationStalenessSeconds:p.maximumPopulationStalenessSeconds},
   afterFlightId:cursor,pageSize:384});
  proposal=proposeP6NativePostPhysicalWindow({page,policyBytes:authority.policyBytes,expectedPolicySha256:authority.expectedPolicySha256,
   trust,existingRequestSha256s:existing});
  cursor=page.privateNextCursor;
  if(proposal.status==="ONE_UNSIGNED_NATIVE_POST_PHYSICAL_REQUEST")break;
  if(!["NO_ACTUAL_RETAINED_BOUND_PRE_FOR_POST","BOUND_PRE_EXPIRES_BEFORE_POST_DISPATCH_WINDOW"].includes(proposal.status)||!cursor)
   return noGo(proposal.status);
 }
 if(proposal?.status!=="ONE_UNSIGNED_NATIVE_POST_PHYSICAL_REQUEST")return noGo("POST_CANDIDATE_PAGE_BOUND_DEFERRED");
 const head=await current(readerClient,trust,selector.runDayIndex);
 const b=buildP6DelegatedNativePostPacket({currentDay:head,proposal,sourceQueryRetentionNotAfterUtc:page.privateSourceQueryRetentionNotAfterUtc,
  authority,trust,githubRunId});
 if(b.status!=="DELEGATED_POST_PACKET_AWAIT_PUBLICATION_NO_GO")return b;
 const r=b.privateWire.review,d=proposal.privateReviewedDraft;
 // Recheck the exact anchor independently immediately before publishing,
 // including retained SOURCE at the prospective POST dispatch end.
 const actual=await auditP5FuturePostActualPriorPreBatch(sourcePool,{manifestSha256:trust.manifestSha256,runDayIndex:d.runDayIndex,
  airportIcao:d.airportIcao,reviewedFrameSha256:d.reviewedFrameSha256,candidates:[{flightInstanceId:d.flightInstanceId,
   expectedSelectedTNativeUtc:d.expectedSelectedTNativeUtc,boundSourceQueryDigests:[proposal.privateEvidence.sourceQueryDigestSha256]}]});
 const anchor=actual.privateDecisions[0];
 if(actual.eligibleCount!==1||anchor?.status!=="VALID_ACTUAL_PRE_FOR_POST_REVIEW"||
    utc(anchor.boundPreRetentionNotAfterUtc)<=utc(d.postDispatchHardLatestUtc)||
    utc(actual.completedDbClockUtc)-utc(r.reviewedAtUtc)>120000||utc(actual.completedDbClockUtc)<utc(r.reviewedAtUtc)||
    utc(actual.completedDbClockUtc)+120000>=utc(d.postDispatchEarliestUtc))
   return noGo("POST_ANCHOR_NO_LONGER_ELIGIBLE");
 await publishP6PrivateSourcePostOnce({client:publisherClient,pins:b.privatePins,wire:b.privateWire,reviewerPublicKeyPem:trust.postReviewerPublicKeyPem,
  packetBytes:b.privatePacketBytes,scope:{privateStoragePublicationApproved:true,separateProviderContentRightsReviewApproved:true,
   existingChildOrPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",approvedMainCodeSha:trust.reviewedCodeSha,
   expectedPublisherSessionLogin:p.expectedPublisherSessionLogin,approvedRetentionNotAfterUtc:r.retentionNotAfterUtc,
   reviewedRightsSha256:trust.rightsSha256,externalReviewEvidenceSha256:r.externalReviewEvidenceSha256,persistVerifiedReviewWire:true,
   expectedSourceDayRegistryLogicalPath:b.privateSource.filePath,expectedSourceDayRegistrySha256:b.privateSource.fileSha256}});
 const stored=await readP6StoredPrivateReviewOnce({client:readerClient,trust,scope:ro,
  selector:{kind:"POST",runDayIndex:r.runDayIndex,shardIndex:r.shardIndex,logicalPath:r.logicalPath,contentSha256:r.contentSha256}});
 const receipt=await readP6PrivateSourcePostOnce(readerClient,stored.pins,stored.wire,stored.publicKeyPem);
 const next=buildP6PostDayAppend({currentDay:await current(readerClient,trust,r.runDayIndex),signedPacket:b,receipt,authority,trust});
 if(next.status!=="DELEGATED_POST_DAY_APPEND_AWAIT_PUBLICATION_NO_GO")return next;
 await publishP6DayEpochIndexRevisionOnce({client:publisherClient,pins:next.privatePins,wire:next.privateWire,publicKeyPem:trust.dayReviewerPublicKeyPem,
  indexBytes:next.privateIndexBytes,scope:{privateDayIndexStorageApproved:true,independentProviderContentsReviewApproved:true,existingPaidDispatchApproved:false,
   adbAutoCollect:"0",phase6ProcessArmed:"0",expectedPublisherSessionLogin:p.expectedPublisherSessionLogin,approvedCodeSha:trust.reviewedCodeSha,
   approvedCalendarSha256:trust.calendarSha256,approvedRightsSha256:trust.rightsSha256,approvedRetentionNotAfterUtc:next.privateWire.review.retentionNotAfterUtc,
   persistVerifiedReviewWire:true}});
 const after=await current(readerClient,trust,r.runDayIndex),hit=indexedPost(after,d.requestSha256).hit;
 if(!hit||hit.fileSha256!==r.contentSha256||hit.filePath!==r.logicalPath||after.index.redactedSummary.indexSha256!==next.indexSha256)
  hold("SIGNED_POST_DAY_READBACK_UNKNOWN_NO_REPLAY");
 return noGo("NATIVE_POST_PACKET_AND_DAY_APPEND_VERIFIED_NO_GO",{runDayIndex:r.runDayIndex,revision:next.revision,
  requestSha256:d.requestSha256,independentPaidChildAdmissionStillRequired:true});
}


/** Bounded scheduler hints from actual committed PRE metadata. This does
 * NOT qualify a flight or authorize a request; it narrows the expensive
 * original exact-source review to queries that actually have observations.
 * No new queue, no read of raw bodies, no duplicate per-horizon requests.
 */
export async function readP6PostSourceQueryHints({sourcePool,trust,runDayIndex,queryDigests,frameSha256}){
 if(!sourcePool||typeof sourcePool.connect!=="function"||!Number.isSafeInteger(runDayIndex)||runDayIndex<1||runDayIndex>31||
    !H.test(trust?.manifestSha256??"")||!H.test(frameSha256??"")||!Array.isArray(queryDigests)||queryDigests.length<1||
    queryDigests.length>384||new Set(queryDigests).size!==queryDigests.length||queryDigests.some(x=>!H.test(x??"")))
  hold("UNBOUND_POST_HINT_SCOPE");
 const conn=await sourcePool.connect();let tx=false;
 try{
  await conn.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await conn.query("SET LOCAL statement_timeout='12000ms'");await conn.query("SET LOCAL lock_timeout='2000ms'");
  const w=await conn.query("SELECT current_user AS role,session_user AS login,current_database() AS db,"+
   "current_setting('transaction_read_only') AS ro,current_setting('server_version_num')::int AS version,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS now");
  const id=w.rows[0];
  if(w.rowCount!==1||id?.role!=="phase5_fids_source_prod_20261107"||id.login!=="phase5_p5_source_login_20261108"||
     id.db!=="neondb"||id.ro!=="on"||Number(id.version)<160000||Number(id.version)>=170000||id.replica!==false)
   hold("POST_HINT_NOT_RESTRICTED_SOURCE_READONLY");
  const timestamp=x=>{const d=new Date(x instanceof Date?x.getTime():String(x));if(!Number.isFinite(d.getTime()))hold("POST_HINT_CLOCK");return d.toISOString();};
  const clock=timestamp(id.now);
  const result=await conn.query("SELECT q.query_digest,q.horizon,q.airport_icao,q.service_window_start_utc,q.service_window_end_utc,"+
   "count(DISTINCT s.id)::int AS n FROM clean.phase5_fids_allowed_query_v39 q "+
   "JOIN clean.phase5_fids_original_binding_v39 b ON b.query_digest=q.query_digest AND b.manifest_sha256=q.manifest_sha256 "+
   "JOIN clean.flight_snapshots s ON s.population_query_id=b.population_query_id::text AND s.fids_response_hash=b.response_hash "+
   "WHERE q.manifest_sha256=$1 AND q.run_day_index=$2 AND q.query_digest=ANY($3::text[]) AND s.frame_hash=$4 "+
   "AND s.prediction_state='PRE_DEPARTURE' AND s.horizon=q.horizon AND s.created_at<=s.prediction_cutoff_utc "+
   "AND s.created_at<=$5::timestamptz AND b.source_expires_at_utc>$5::timestamptz "+
   "GROUP BY q.query_digest,q.horizon,q.airport_icao,q.service_window_start_utc,q.service_window_end_utc LIMIT 385",
   [trust.manifestSha256,runDayIndex,queryDigests,frameSha256,clock]);
  if(!Array.isArray(result.rows)||result.rowCount!==result.rows.length||result.rows.length>queryDigests.length)
    hold("POST_HINT_ROW_BOUND");
  const seen=new Set(),allowed=new Set(queryDigests),hints=[];
  for(const x of result.rows){
   const n=Number(x.n),from=timestamp(x.service_window_start_utc),to=timestamp(x.service_window_end_utc);
   if(!allowed.has(x.query_digest)||seen.has(x.query_digest)||!["T-24h","T-6h","T-90m"].includes(x.horizon)||
      !/^[A-Z]{4}$/.test(x.airport_icao??"")||!Number.isSafeInteger(n)||n<1||utc(from)>=utc(to)||utc(to)-utc(from)>21600000)
    hold("POST_HINT_OUTSIDE_SIGNED_DAY");
   seen.add(x.query_digest);hints.push({runDayIndex,queryDigestSha256:x.query_digest,horizon:x.horizon,airportIcao:x.airport_icao,
    fromUtc:from,toUtc:to,committedPreHintCount:n});
  }
  await conn.query("ROLLBACK");tx=false;
  return Object.freeze(Object.defineProperty({status:"ACTUAL_POST_QUERY_HINTS_NOT_ADMISSION",runDayIndex,observedDbClockUtc:clock,
   hintCount:hints.length,providerCalls:0,databaseWrites:0,phase6PaidGo:false},"privateHints",{value:Object.freeze(hints)}));
 }finally{if(tx)await conn.query("ROLLBACK").catch(()=>{});conn.release();}
}
/** Plan one airport+service-window at a time. Use actual DB time and
 * already indexed requests to avoid starvation from completed windows.
 * Within each window prefer more recent horizons and rotate refreshes
 * across ticks so a missing/expired candidate cannot block valid others.
 */
export function chooseP6NativePostWindowHints(hints,indexed,policy,clock){
 if(!Array.isArray(hints)||hints.length>1536||!Array.isArray(indexed)||indexed.length>4096||
    !Number.isSafeInteger(policy?.followupAfterPartitionEndSeconds)||!Number.isSafeInteger(policy?.dispatchWindowSeconds))
  hold("POST_HINT_SELECTION_BOUND");
 const now=utc(clock),key=x=>[x.airportIcao,x.fromUtc,x.toUtc].join("|"),used=new Set(indexed.map(key)),groups=new Map();
 let late=0,notYet=0,already=0,crossUtc=0;
 for(const h of hints){
  if(!h||!H.test(h.queryDigestSha256??"")||!["T-24h","T-6h","T-90m"].includes(h.horizon)||
     !/^[A-Z]{4}$/.test(h.airportIcao??"")||!Number.isSafeInteger(h.committedPreHintCount)||h.committedPreHintCount<1||
     utc(h.fromUtc)>=utc(h.toUtc))hold("INVALID_POST_HINT");
  const k=key(h);
  if(used.has(k)){already++;continue;}
  const start=utc(h.toUtc)+policy.followupAfterPartitionEndSeconds*1000,end=start+policy.dispatchWindowSeconds*1000;
  if(iso(start).slice(0,10)!==iso(end).slice(0,10)){crossUtc++;continue;}
  if(start<=now+120000){late++;continue;}
  if(start>now+10800000){notYet++;continue;}
  const g=groups.get(k)??{k,start,end,hints:[]};g.hints.push(h);groups.set(k,g);
 }
 const priority={"T-90m":0,"T-6h":1,"T-24h":2},tick=Math.floor(now/600000);
 const ordered=[...groups.values()].sort((a,b)=>a.start-b.start||a.k.localeCompare(b.k));
 const privateWindows=ordered.map(g=>{
  const hs=g.hints.slice().sort((a,b)=>priority[a.horizon]-priority[b.horizon]||
   b.committedPreHintCount-a.committedPreHintCount||a.queryDigestSha256.localeCompare(b.queryDigestSha256));
  // Always try best available hint first; rotate fallback across *all*
  // other refreshes/horizons. Limit to three per physical window per tick.
  const other=hs.slice(1),offset=other.length?tick%other.length:0;
  const rotated=other.slice(offset).concat(other.slice(0,offset));
  return {...g,hints:[hs[0],...rotated.slice(0,2)]};
 });
 return Object.freeze(Object.defineProperty({status:"BOUNDED_POST_WINDOW_HINT_SELECTION",dueWindowCount:ordered.length,
  deferredWindowCount:Math.max(0,ordered.length-4),late,notYet,already,crossUtc,providerCalls:0,phase6PaidGo:false},
  "privateWindows",{value:Object.freeze(privateWindows.slice(0,4))}));
}
export async function scanP6CurrentPostWindowHints({readerClient,sourcePool,trust,authority,runDayIndices,clock}){
 const p=verifyP6NativePostDelegation(trust,authority),at=utc(clock);
 if(at<utc(p.validFromUtc)||at>=utc(p.validUntilUtc)||!Array.isArray(runDayIndices)||runDayIndices.length>4||
    new Set(runDayIndices).size!==runDayIndices.length||runDayIndices.some(x=>!Number.isSafeInteger(x)||x<1||x>31))
  hold("POST_SCHEDULER_DAY_SCOPE");
 const hints=[],indexed=[];let missingDays=0;
 for(const n of runDayIndices){
  let x;try{x=await current(readerClient,trust,n);}
  catch(e){if(e?.message==="HOLD_P6_STORED_REVIEW_CURRENT_DAY_NOT_PUBLISHED_OR_RETAINED"){missingDays++;continue;}throw e;}
  const h=checkCurrent(x,trust,n),digests=new Set();
  for(const e of h.entries){
   const b=x.index.getFrozen(e.filePath);
   if(!Buffer.isBuffer(b)||hash(b)!==e.fileSha256)hold("SCHEDULER_INDEX_BYTES_DRIFT");
   if(e.lane==="SOURCE"){
    const q=JSON.parse(b.toString("utf8"));
    if(q.schema!=="v39.phase5.signed-per-day-source-batch-readonly.v1"||!Array.isArray(q.entries))hold("SCHEDULER_SOURCE_REGISTRY_DRIFT");
    for(const s of q.entries){
     const d=s.expectedQueryDigestSha256;
     if(!H.test(d??"")||digests.has(d))hold("SCHEDULER_DUPLICATE_SOURCE_DIGEST");
     digests.add(d);
    }
   }else if(e.lane==="POST"){
    const d=JSON.parse(b.toString("utf8")).reviewed;
    if(!d||!H.test(d.requestSha256??""))hold("SCHEDULER_POST_REGISTRY_DRIFT");
    indexed.push({airportIcao:d.airportIcao,fromUtc:d.plannedSourceFromUtc,toUtc:d.plannedSourceToUtc});
   }
  }
  if(digests.size){
   const read=await readP6PostSourceQueryHints({sourcePool,trust,runDayIndex:n,queryDigests:[...digests],frameSha256:p.reviewedFrameSha256});
   if(utc(read.observedDbClockUtc)<at||utc(read.observedDbClockUtc)-at>120000)
    hold("POST_SCHEDULER_SCAN_CLOCK_DRIFT");
   hints.push(...read.privateHints);
  }
 }
 const out=chooseP6NativePostWindowHints(hints,indexed,p,clock);
 return Object.freeze(Object.defineProperty({...out,missingDays},"privateWindows",{value:out.privateWindows}));
}
