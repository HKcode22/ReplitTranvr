import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {
 P6_DAY_EPOCH_REVIEW_SCHEMA,P6_DAY_EPOCH_REVIEW_AUDIENCE,
 p6DayEpochReviewPreimage
} from "../server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs";
import {
 P6_SOURCE_POST_REVIEW_SCHEMA,P6_SOURCE_POST_REVIEW_AUDIENCE,
 signedP6PrivateSourcePostReviewBytes
} from "../server/lib/disruption/phase6PrivateSourcePostReadOnce_v39.mjs";
import {
 resolveP6DynamicDayReview,resolveP6DynamicSourceQueryReview
} from "../server/lib/disruption/phase6DynamicSourceReviewSelection_v39.mjs";
const H=c=>c.repeat(64);
function key(){
 const k=generateKeyPairSync("ed25519");
 return {...k,pem:k.publicKey.export({format:"pem",type:"spki"}).toString(),
  fp:createHash("sha256").update(k.publicKey.export({format:"der",type:"spki"})).digest("hex")};
}
const k=key(),q=key(),rogue=key();
const clock="2026-11-15T04:00:00.000Z";
const time={reviewedAtUtc:"2026-11-15T03:55:00.000Z",
 validUntilUtc:"2026-11-15T05:00:00.000Z",
 retentionNotAfterUtc:"2026-11-15T06:00:00.000Z"};
const trust={independentStudyTrustPinsApproved:true,
 expectedReaderSessionLogin:"phase6_private_reader_login_ci_dynamic",
 reviewedCodeSha:"f".repeat(40),manifestSha256:H("a"),
 calendarSha256:H("b"),releaseSha256:H("c"),rightsSha256:H("d"),
 dayReviewerFingerprintSha256:k.fp,dayReviewerPublicKeyPem:k.pem,
 queryReviewerFingerprintSha256:q.fp,queryReviewerPublicKeyPem:q.pem};
function d(day=1,rev=1,over={},signer=k){
 const review={schema:P6_DAY_EPOCH_REVIEW_SCHEMA,audience:P6_DAY_EPOCH_REVIEW_AUDIENCE,
  runDayIndex:day,indexRevision:rev,indexSha256:H("1"),
  previousIndexSha256:rev===1?null:H("2"),
  reviewedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,
  calendarSha256:trust.calendarSha256,releaseSha256:trust.releaseSha256,
  rightsSha256:trust.rightsSha256,externalReviewEvidenceSha256:H("3"),
  ...time,reviewerPublicKeyFingerprintSha256:signer.fp,...over};
 return {review,signatureBase64:sign(null,p6DayEpochReviewPreimage(review),signer.privateKey).toString("base64")};
}
function p(day=1,id="alpha",shard=1,over={},signer=q){
 const review={schema:P6_SOURCE_POST_REVIEW_SCHEMA,audience:P6_SOURCE_POST_REVIEW_AUDIENCE,
  kind:"SOURCE_QUERY_PACKET",logicalPath:"data-collection/phase5/frozen/sourceq_day"+day+"_"+id+".json",
  contentSha256:H("4"),reviewedCodeSha:trust.reviewedCodeSha,
  manifestSha256:trust.manifestSha256,rightsSha256:trust.rightsSha256,
  runDayIndex:day,shardIndex:shard,externalReviewEvidenceSha256:H("5"),
  ...time,reviewerPublicKeyFingerprintSha256:signer.fp,...over};
 return {review,signatureBase64:sign(null,signedP6PrivateSourcePostReviewBytes(review),signer.privateKey).toString("base64")};
}
const ds=w=>{const {runDayIndex,indexRevision,indexSha256,previousIndexSha256,externalReviewEvidenceSha256}=w.review;return {runDayIndex,indexRevision,indexSha256,previousIndexSha256,externalReviewEvidenceSha256}};
const ps=w=>{const {runDayIndex,shardIndex,logicalPath,contentSha256,externalReviewEvidenceSha256}=w.review;return {runDayIndex,shardIndex,logicalPath,contentSha256,externalReviewEvidenceSha256}};
const day=(selector,wires,extra={})=>resolveP6DynamicDayReview({trust,selector,wires,observedDbClockUtc:clock,...extra});
const packet=(selector,wires,extra={})=>resolveP6DynamicSourceQueryReview({trust,selector,wires,observedDbClockUtc:clock,...extra});
test("reuse independent real signatures across day1/day31, revisions and two queries; never expose private wires",()=>{
 const a=d(),b=d(1,2),c=d(31),x=p(),y=p(1,"bravo",2),z=p(31);
 for(const w of [a,b,c]){
  const out=day(ds(w),[a,b,c]);
  assert.equal(out.pins.expectedRunDayIndex,w.review.runDayIndex);
  assert.equal(out.pins.expectedIndexRevision,w.review.indexRevision);
  assert.equal(out.paidPhase6Go,false);
  assert.equal(JSON.stringify(out).includes(w.signatureBase64),false);
 }
 for(const w of [x,y,z]){
  const out=packet(ps(w),[x,y,z]);
  assert.equal(out.pins.expectedLogicalPath,w.review.logicalPath);
  assert.equal(out.pins.expectedShardIndex,w.review.shardIndex);
  assert.equal(out.providerCalls,0);
  assert.equal(JSON.stringify(out).includes(w.review.logicalPath),false);
 }
});
test("duplicate or missing exact review, wrong SHA/day/shard, and cross-study drift are rejected",()=>{
 const a=d(),x=p();
 assert.throws(()=>day(ds(a),[a,a]),/MISSING_OR_AMBIGUOUS/);
 assert.throws(()=>day(ds(a),[d(31)]),/MISSING_OR_AMBIGUOUS/);
 assert.throws(()=>day({...ds(a),indexSha256:H("9")},[a]));
 assert.throws(()=>day(ds(d(1,1,{manifestSha256:H("9")})),[d(1,1,{manifestSha256:H("9")})]));
 assert.throws(()=>packet(ps(x),[x,x]),/MISSING_OR_AMBIGUOUS/);
 assert.throws(()=>packet({...ps(x),runDayIndex:2},[x]));
 assert.throws(()=>packet({...ps(x),shardIndex:2},[x]));
 assert.throws(()=>packet({...ps(x),contentSha256:H("9")},[x]));
});
test("untrusted signer, altered signature, unapproved stable policy and clock cannot open gates",()=>{
 const a=d(),x=p(),bad=d(1,1,{},rogue),wrong=p(1,"alpha",1,{},rogue);
 assert.throws(()=>day(ds(bad),[bad]));
 assert.throws(()=>packet(ps(wrong),[wrong]));
 assert.throws(()=>packet(ps(x),[{...x,signatureBase64:Buffer.alloc(64).toString("base64")}]));
 assert.throws(()=>day(ds(a),[a],{trust:{...trust,independentStudyTrustPinsApproved:false}}));
 assert.throws(()=>packet(ps(x),[x],{observedDbClockUtc:time.validUntilUtc}),/NOT_LIVE/);
 assert.throws(()=>day(ds(a),[a],{observedDbClockUtc:"invalid"}),/REAL_DB_CLOCK_REQUIRED/);
 assert.throws(()=>day(ds(a),Array(65).fill(a)),/CANDIDATE_COUNT_BOUND/);
 assert.throws(()=>packet(ps(x),Array(129).fill(x)),/CANDIDATE_COUNT_BOUND/);
});
