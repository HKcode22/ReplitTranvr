/**
 * Resolve changing signed day/query review wires using stable, separately
 * approved study and signer pins. No new signing scheme, no provider, SQL,
 * GitHub dispatch, secret mutation, or authorization to execute a child.
 * A protected transport must supply bounded candidates and independently
 * obtained exact metadata selectors. The publisher cannot select its own
 * trust anchors. Existing restricted DB readers and SOURCE binder still
 * perform actual byte/role/route/budget checks.
 */
import {verifyP6DayEpochExternalReview} from "./phase6DayEpochSignedIndexOnce_v39.mjs";
import {verifyP6ExternalSourcePostReview} from "./phase6PrivateSourcePostReadOnce_v39.mjs";
const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const LOGIN=/^phase6_private_reader_login_[a-z0-9_]{6,50}$/;
const PACK=/^data-collection\/phase5\/frozen\/sourceq_[A-Za-z0-9_.-]{8,110}\.json$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const hold=x=>{throw Error("HOLD_P6_DYNAMIC_SOURCE_REVIEW_"+x);};
const hash=x=>typeof x==="string"&&SHA.test(x);
const day=x=>Number.isSafeInteger(x)&&x>=1&&x<=31;
const revision=x=>Number.isSafeInteger(x)&&x>=1&&x<=1024;
const shard=x=>Number.isSafeInteger(x)&&x>=1&&x<=100000;
function utc(x){
 if(typeof x!=="string"||!UTC.test(x)||!Number.isFinite(Date.parse(x))||
    new Date(x).toISOString()!==x)hold("REAL_DB_CLOCK_REQUIRED");
 return Date.parse(x);
}
function trustCheck(t,who){
 if(t?.independentStudyTrustPinsApproved!==true||
    !CODE.test(t.reviewedCodeSha??"")||
    !LOGIN.test(t.expectedReaderSessionLogin??"")||
    ![t.manifestSha256,t.calendarSha256,t.releaseSha256,t.rightsSha256,
      t.dayReviewerFingerprintSha256,t.queryReviewerFingerprintSha256].every(hash)||
    typeof t[who]!=="string"||t[who].length<80||t[who].length>4096)
  hold("STABLE_APPROVED_STUDY_AND_SIGNER_PINS_REQUIRED");
}
function select(wires,match,max){
 // Call only on bounded candidates selected by private metadata lookup.
 // No raw provider data or logging. Reject duplicate selector matches,
 // even if the duplicates contain identical signatures.
 if(!Array.isArray(wires)||wires.length<1||wires.length>max)
  hold("CANDIDATE_COUNT_BOUND");
 for(const w of wires){
  if(!w||typeof w!=="object"||Array.isArray(w)||
     !w.review||typeof w.review!=="object"||Array.isArray(w.review)||
     typeof w.signatureBase64!=="string"||w.signatureBase64.length!==88)
   hold("UNEXPECTED_REVIEW_WIRE_SHAPE");
  let bytes;
  try{bytes=Buffer.byteLength(JSON.stringify(w),"utf8");}
  catch{hold("INVALID_REVIEW_WIRE");}
  if(bytes>4096)hold("REVIEW_WIRE_SIZE_BOUND");
 }
 const hits=wires.filter(w=>match(w.review));
 if(hits.length!==1)hold("EXACT_REVIEW_MISSING_OR_AMBIGUOUS");
 return hits[0];
}
function live(external,now){
 if(external.reviewedAtMs>now||external.validUntilMs<=now||
    external.retentionNotAfterMs<=now)
  hold("SIGNED_REVIEW_NOT_LIVE_AT_DB_CLOCK");
}
function result(kind,pins,wire,publicKeyPem){
 const out={status:"EXACT_DYNAMIC_SIGNED_REVIEW_SELECTED_NO_GO",kind,
  providerCalls:0,databaseWrites:0,githubDispatches:0,paidPhase6Go:false,
  protectedTransportAndActualRestrictedReadStillRequired:true};
 Object.defineProperties(out,{
  pins:{value:Object.freeze(pins),enumerable:false},
  wire:{value:Object.freeze({review:Object.freeze({...wire.review}),
   signatureBase64:wire.signatureBase64}),enumerable:false},
  publicKeyPem:{value:publicKeyPem,enumerable:false}
 });
 return Object.freeze(out);
}
/**
 * selector originates from exact committed index metadata (current revision
 * for planners; exact immutable revision for an already admitted child).
 * It is NOT a trust anchor by itself. Re-verify with stable signer and
 * frozen study pins, then pass to original PG16 reader.
 */
export function resolveP6DynamicDayReview({trust,selector,wires,observedDbClockUtc}){
 trustCheck(trust,"dayReviewerPublicKeyPem");
 const now=utc(observedDbClockUtc);
 const s=selector;
 if(!s||!day(s.runDayIndex)||!revision(s.indexRevision)||
    !hash(s.indexSha256)||!hash(s.externalReviewEvidenceSha256)||
    (s.indexRevision===1?s.previousIndexSha256!==null:
      !hash(s.previousIndexSha256)))
  hold("INVALID_EXACT_DAY_METADATA_SELECTOR");
 const wire=select(wires,r=>r.runDayIndex===s.runDayIndex&&
  r.indexRevision===s.indexRevision,64);
 const pins={
  independentExternalReviewerSignaturePinsApproved:true,
  privateDayIndexReadOnlyApproved:true,existingPaidGithubDispatchApproved:false,
  expectedReaderSessionLogin:trust.expectedReaderSessionLogin,
  expectedRunDayIndex:s.runDayIndex,expectedIndexRevision:s.indexRevision,
  expectedIndexSha256:s.indexSha256,
  expectedPreviousIndexSha256:s.previousIndexSha256,
  expectedReviewedCodeSha:trust.reviewedCodeSha,
  expectedManifestSha256:trust.manifestSha256,
  expectedCalendarSha256:trust.calendarSha256,
  expectedReleaseSha256:trust.releaseSha256,
  expectedRightsSha256:trust.rightsSha256,
  expectedExternalReviewEvidenceSha256:s.externalReviewEvidenceSha256,
  expectedReviewerPublicKeyFingerprintSha256:trust.dayReviewerFingerprintSha256
 };
 const external=verifyP6DayEpochExternalReview({
  wire,pins,publicKeyPem:trust.dayReviewerPublicKeyPem
 });
 live(external,now);
 return result("DAY_INDEX",pins,wire,trust.dayReviewerPublicKeyPem);
}
/**
 * Selector combines one authenticated registry entry (exact path/content
 * SHA/day/shard) and independently read committed packet evidence metadata.
 * Never accept a publisher-supplied key/fingerprint, or pick by day alone.
 * The original SOURCE query/registry binder must still compare the query
 * digest and original child admission must still decide physical spend.
 */
export function resolveP6DynamicSourceQueryReview({
 trust,selector,wires,observedDbClockUtc
}){
 trustCheck(trust,"queryReviewerPublicKeyPem");
 const now=utc(observedDbClockUtc),s=selector;
 if(!s||!day(s.runDayIndex)||!shard(s.shardIndex)||
    !PACK.test(s.logicalPath??"")||!hash(s.contentSha256)||
    !hash(s.externalReviewEvidenceSha256))
  hold("INVALID_EXACT_SOURCE_QUERY_METADATA_SELECTOR");
 const wire=select(wires,r=>r.kind==="SOURCE_QUERY_PACKET"&&
  r.logicalPath===s.logicalPath,128);
 const pins={
  independentExternalReviewerSignaturePinsApproved:true,
  privateSourcePostReadOnlyApproved:true,
  expectedPrivateSessionLogin:trust.expectedReaderSessionLogin,
  expectedKind:"SOURCE_QUERY_PACKET",expectedLogicalPath:s.logicalPath,
  expectedReviewedMainSha:trust.reviewedCodeSha,
  expectedManifestSha256:trust.manifestSha256,
  expectedRightsSha256:trust.rightsSha256,
  expectedContentSha256:s.contentSha256,
  expectedExternalReviewEvidenceSha256:s.externalReviewEvidenceSha256,
  expectedReviewerPublicKeyFingerprintSha256:trust.queryReviewerFingerprintSha256,
  expectedRunDayIndex:s.runDayIndex,expectedShardIndex:s.shardIndex
 };
 const external=verifyP6ExternalSourcePostReview(
  wire,trust.queryReviewerPublicKeyPem,pins);
 live(external,now);
 return result("SOURCE_QUERY_PACKET",pins,wire,trust.queryReviewerPublicKeyPem);
}
