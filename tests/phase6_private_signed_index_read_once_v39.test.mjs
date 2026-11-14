import test from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {
 P6_INDEX_REVIEW_SCHEMA,P6_INDEX_REVIEW_AUDIENCE,P6_INDEX_READ_SCHEMA,
 p6SignedIndexReviewPreimage,verifyP6PrivateSignedIndexExternalReview,
 readP6PrivateSignedIndexCurrentAndPriorOnce
} from "../server/lib/disruption/phase6PrivateSignedIndexReadOnce_v39.mjs";

const h=b=>createHash("sha256").update(b).digest("hex");
const key=generateKeyPairSync("ed25519");
const pem=key.publicKey.export({type:"spki",format:"pem"}).toString();
const fp=h(key.publicKey.export({type:"spki",format:"der"}));
const TIME="2026-11-14T02:00:00.000Z";
const AT="2026-11-14T01:58:00.000Z";
const UNTIL="2026-11-14T03:00:00.000Z";
const EXPIRE="2026-11-15T02:00:00.000Z";
const sha="a".repeat(64),cal="b".repeat(64),
 rights="c".repeat(64),release="d".repeat(64),
 evidence="e".repeat(64),code="f".repeat(40);
function fixture(revision=2){
 const first={
  schema:"v39.phase5.phase6-append-only-day-shard-index.v1",
  manifestSha256:sha,calendarSha256:cal,reviewedCodeSha:code,
  reviewedReleaseSha256:release,reviewedRightsSha256:rights,
  revision:1,previousIndexSha256:null,
  entries:[{ci:"SYNTHETIC_TEST",day:1,sourceSha:"0".repeat(64)}]
 };
 const raw1=Buffer.from(JSON.stringify(first));
 const current=revision===1?first:{
  ...first,revision:2,previousIndexSha256:h(raw1),
  entries:[...first.entries,{ci:"SYNTHETIC_TEST",day:2,
   sourceSha:"1".repeat(64)}]
 };
 const raw=Buffer.from(JSON.stringify(current));
 const review={
  schema:P6_INDEX_REVIEW_SCHEMA,
  audience:P6_INDEX_REVIEW_AUDIENCE,
  indexRevision:revision,indexSha256:h(raw),
  previousIndexSha256:current.previousIndexSha256,
  reviewedCodeSha:code,manifestSha256:sha,calendarSha256:cal,
  releaseSha256:release,rightsSha256:rights,
  externalReviewEvidenceSha256:evidence,
  reviewedAtUtc:AT,validUntilUtc:UNTIL,retentionNotAfterUtc:EXPIRE,
  reviewerPublicKeyFingerprintSha256:fp
 };
 const wire={review,signatureBase64:sign(null,
  p6SignedIndexReviewPreimage(review),key.privateKey).toString("base64")};
 const pins={
  independentExternalReviewerSignaturePinsApproved:true,
  privateIndexReadOnlyApproved:true,
  expectedReaderSessionLogin:"phase6_private_reader_login_ci_checks",
  expectedIndexRevision:revision,
  expectedIndexSha256:h(raw),
  expectedPreviousIndexSha256:review.previousIndexSha256,
  expectedReviewedCodeSha:code,
  expectedManifestSha256:sha,
  expectedCalendarSha256:cal,
  expectedReleaseSha256:release,
  expectedRightsSha256:rights,
  expectedExternalReviewEvidenceSha256:evidence,
  expectedReviewerPublicKeyFingerprintSha256:fp
 };
 const rowFor=(revision,payload,previousIndexSha256)=>({
  revision,previous_index_sha256:previousIndexSha256,
  content_sha256:h(payload),reviewed_code_sha:code,
  manifest_sha256:sha,calendar_sha256:cal,
  release_sha256:release,rights_sha256:rights,
  external_review_sha256:evidence,
  externally_reviewed_at_utc:new Date(AT),
  retention_not_after_utc:new Date(EXPIRE),
  committed_at_utc:new Date("2026-11-14T01:59:00.000Z"),
  payload_bytes:payload
 });
 const rows=[rowFor(revision,raw,review.previousIndexSha256)];
 if(revision>1)rows.push(rowFor(1,raw1,null));
 function db({
  wrongRole=false,missingPrior=false,tamperedBytes=false,
  olderClock=false,expired=false,broadAcl=false,
  revisedSource=false
 }={}){
  const calls=[];
  const client={async query(sql,params=[]){
   calls.push({sql,params});
   if(sql.startsWith("BEGIN")||sql.startsWith("SET LOCAL")||
      sql==="ROLLBACK")return{rowCount:null,rows:[]};
   if(sql.includes("SELECT current_database() AS db"))
    return{rowCount:1,rows:[{
     db:"neondb",version:160016,ro:"on",replica:false,
     actor:wrongRole?"neondb_owner":"phase6_private_frozen_reader_v39",
     login:"phase6_private_reader_login_ci_checks",
     db_now:new Date(expired?"2026-11-18T00:00:00.000Z":
       olderClock?"2026-11-14T01:00:00.000Z":TIME),
     select_index:true,insert_index:broadAcl,
     update_index:false,delete_index:false,
     select_packet:true,insert_packet:false,
     login_enabled:true,login_superuser:false,
     login_createrole:false,login_bypassrls:false,
     group_login:false,group_superuser:false,group_bypassrls:false
    }]};
   if(sql.includes("FROM phase6_private.signed_day_shard_index_revision_v39 WHERE")){
    const rr=rows.map(r=>({...r}));
    if(missingPrior)rr.pop();
    if(tamperedBytes)rr[0].payload_bytes=Buffer.from("X".repeat(160));
    if(revisedSource&&rr[1]){
     const p=JSON.parse(rr[0].payload_bytes);
     p.entries[0].sourceSha="3".repeat(64);
     const altered=Buffer.from(JSON.stringify(p));
     rr[0].payload_bytes=altered;
     rr[0].content_sha256=h(altered);
    }
    return{rowCount:rr.length,rows:rr};
   }
   throw Error("UNEXPECTED_SYNTAX_IN_OFFLINE_TEST");
  }};
  return{calls,client};
 }
 return{revision,current,raw,raw1,wire,pins,rows,db};
}
test("signed external index Ed25519 pins exact current/prior content and study identity",()=>{
 for(const revision of [1,2]){
  const f=fixture(revision);
  const good=verifyP6PrivateSignedIndexExternalReview(f.wire,pem,f.pins);
  assert.equal(good.verifiedEd25519Signature,true);
  assert.equal(good.providerContentsUseAnd31DayRightsCertified,false);
 }
 const f=fixture();
 for(const modified of [
  {...f.wire,signatureBase64:Buffer.alloc(64).toString("base64")},
  {...f.wire,review:{...f.wire.review,indexRevision:3}},
  {...f.wire,review:{...f.wire.review,rightsSha256:"0".repeat(64)}}
 ])assert.throws(()=>verifyP6PrivateSignedIndexExternalReview(
   modified,pem,f.pins),/HOLD_P6_SIGNED_PRIVATE_INDEX_READ_/);
});
test("two consecutive private index revisions are verified under restricted PG16, no byte leak",async()=>{
 for(const rev of [1,2]){
  const f=fixture(rev),q=f.db();
  const out=await readP6PrivateSignedIndexCurrentAndPriorOnce({
   client:q.client,pins:f.pins,
   reviewWire:f.wire,reviewerPublicKeyPem:pem
  });
  assert.equal(out.redactedSummary.schema,P6_INDEX_READ_SCHEMA);
  assert.equal(out.redactedSummary.currentRevision,rev);
  assert.equal(out.redactedSummary.indexEntryCount,rev);
  assert.equal(out.redactedSummary.phase6PaidGo,false);
  assert.deepEqual(out.currentIndexBytes,f.raw);
  if(rev===2)assert.deepEqual(out.previousIndexBytes,f.raw1);
  else assert.equal(out.previousIndexBytes,null);
  assert(!JSON.stringify(out).includes("SYNTHETIC_TEST"));
  assert(!JSON.stringify(out).includes("sourceSha"));
  assert(q.calls.some(x=>x.sql.startsWith("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")));
  assert(q.calls.some(x=>x.sql==="ROLLBACK"));
  assert(!q.calls.some(x=>/^\s*(INSERT|UPDATE|DELETE|COMMIT|ALTER|DROP)/.test(x.sql)));
 }
});
test("invalid signature is rejected before ANY SQL",async()=>{
 const f=fixture(),q=f.db();
 await assert.rejects(readP6PrivateSignedIndexCurrentAndPriorOnce({
  client:q.client,pins:f.pins,reviewerPublicKeyPem:pem,
  reviewWire:{...f.wire,signatureBase64:Buffer.alloc(64).toString("base64")}
 }),/HOLD_P6_SIGNED_PRIVATE_INDEX_READ_/);
 assert.equal(q.calls.length,0);
});
test("wrong role, forbidden INSERT, expired/future-clock or missing prior must rollback",async()=>{
 const f=fixture();
 for(const bad of [
  {wrongRole:true},{broadAcl:true},{olderClock:true},
  {expired:true},{missingPrior:true},{tamperedBytes:true},{revisedSource:true}
 ]){
  const q=f.db(bad);
  await assert.rejects(readP6PrivateSignedIndexCurrentAndPriorOnce({
   client:q.client,pins:f.pins,reviewWire:f.wire,
   reviewerPublicKeyPem:pem
  }),/HOLD_P6_SIGNED_PRIVATE_INDEX_READ_/);
  assert(q.calls.some(x=>x.sql==="ROLLBACK"));
 }
});
test("no correct role or distinct explicit private review grants can be guessed",async()=>{
 const f=fixture();
 for(const pins of [
  {...f.pins,privateIndexReadOnlyApproved:false},
  {...f.pins,independentExternalReviewerSignaturePinsApproved:false},
  {...f.pins,expectedReaderSessionLogin:"neondb_owner"},
  {...f.pins,expectedIndexSha256:"a".repeat(64)}
 ]){
  const q=f.db();
  await assert.rejects(readP6PrivateSignedIndexCurrentAndPriorOnce({
   client:q.client,pins,reviewWire:f.wire,
   reviewerPublicKeyPem:pem
  }),/HOLD_P6_SIGNED_PRIVATE_INDEX_READ_/);
  assert.equal(q.calls.length,0);
 }
});
