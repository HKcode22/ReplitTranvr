import test from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {
 P6_INDEX_REVIEW_SCHEMA,P6_INDEX_REVIEW_AUDIENCE,
 p6SignedIndexReviewPreimage
} from "../server/lib/disruption/phase6PrivateSignedIndexReadOnce_v39.mjs";
import {
 P6_PRIVATE_INDEX_PUBLISH_SCHEMA,publishP6PrivateSignedIndexRevisionOnce
} from "../server/lib/disruption/phase6PrivateSignedIndexPublisherOnce_v39.mjs";

const hash=b=>createHash("sha256").update(b).digest("hex");
const key=generateKeyPairSync("ed25519");
const publicPem=key.publicKey.export({type:"spki",format:"pem"}).toString();
const fp=hash(key.publicKey.export({type:"spki",format:"der"}));
const AT="2026-11-14T01:59:50.000Z";
const NOW="2026-11-14T02:00:00.000Z";
const EXPIRE="2026-11-14T04:00:00.000Z";
const VALID="2026-11-14T03:00:00.000Z";
const code="f".repeat(40),manifest="a".repeat(64),
 calendar="b".repeat(64),release="c".repeat(64),
 rights="d".repeat(64),evidence="e".repeat(64);
function fixture(revision=1){
 const source=(id,day,published,first,last)=>({
  lane:"SOURCE",runDayIndex:day,shardIndex:1,
  filePath:"data-collection/phase5/frozen/source_"+id+".json",
  fileSha256:hash(Buffer.from("synthetic-registry-"+id)),
  publishedAtUtc:published,notBeforeUtc:first,hardLatestUtc:last,
  reviewEvidenceSha256:evidence,
  sourceRegistryFilePath:null,sourceRegistrySha256:null
 });
 const e1=source("abcdefgh123",1,"2026-11-14T01:59:30.000Z",
  "2026-11-14T02:20:00.000Z","2026-11-14T03:00:00.000Z");
 const e2=source("ijklmnop456",2,"2026-11-14T01:59:45.000Z",
  "2026-11-14T02:30:00.000Z","2026-11-14T03:10:00.000Z");
 const first={
  schema:"v39.phase5.phase6-append-only-day-shard-index.v1",
  manifestSha256:manifest,calendarSha256:calendar,
  reviewedCodeSha:code,reviewedReleaseSha256:release,
  reviewedRightsSha256:rights,
  revision:1,previousIndexSha256:null,entries:[e1]
 };
 const firstBytes=Buffer.from(JSON.stringify(first));
 const index=revision===1?first:{
  ...first,revision:2,previousIndexSha256:hash(firstBytes),
  entries:[e1,e2]
 };
 const indexBytes=Buffer.from(JSON.stringify(index));
 const review={
  schema:P6_INDEX_REVIEW_SCHEMA,
  audience:P6_INDEX_REVIEW_AUDIENCE,
  indexRevision:revision,indexSha256:hash(indexBytes),
  previousIndexSha256:index.previousIndexSha256,
  reviewedCodeSha:code,manifestSha256:manifest,
  calendarSha256:calendar,releaseSha256:release,
  rightsSha256:rights,externalReviewEvidenceSha256:evidence,
  reviewedAtUtc:AT,validUntilUtc:VALID,
  retentionNotAfterUtc:EXPIRE,
  reviewerPublicKeyFingerprintSha256:fp
 };
 const wire={review,signatureBase64:sign(null,
  p6SignedIndexReviewPreimage(review),key.privateKey).toString("base64")};
 const pins={
  independentExternalReviewerSignaturePinsApproved:true,
  privateIndexPublicationApproved:true,
  expectedIndexRevision:revision,
  expectedIndexSha256:hash(indexBytes),
  expectedPreviousIndexSha256:index.previousIndexSha256,
  expectedReviewedCodeSha:code,
  expectedManifestSha256:manifest,
  expectedCalendarSha256:calendar,
  expectedReleaseSha256:release,
  expectedRightsSha256:rights,
  expectedExternalReviewEvidenceSha256:evidence,
  expectedReviewerPublicKeyFingerprintSha256:fp
 };
 const scope={
  privateIndexStorageApproved:true,
  independentProviderContentsReviewApproved:true,
  existingChildPaidDispatchApproved:false,
  adbAutoCollect:"0",phase6ProcessArmed:"0",
  expectedPublisherSessionLogin:"phase6_private_publisher_login_ci_checks",
  approvedMainCodeSha:code,approvedRightsSha256:rights,
  approvedCalendarSha256:calendar,
  approvedRetentionNotAfterUtc:EXPIRE
 };
 function mocked({
  wrongRole=false,broadAcl=false,missingRegistry=false,
  tamperedRegistry=false,committedLate=false,
  wrongPrior=false,alreadyExists=false,expired=false,
  unknownCommit=false
 }={}){
  const calls=[];
  const client={async query(sql,params=[]){
   calls.push({sql,params});
   if(sql.startsWith("BEGIN")||sql.startsWith("SET LOCAL")||
      sql==="ROLLBACK")return{rowCount:null,rows:[]};
   if(sql==="COMMIT"){
    if(unknownCommit)throw Error("private transport unknown COMMIT");
    return{rowCount:null,rows:[]};
   }
   if(sql.includes("SELECT current_database() AS db"))
    return{rowCount:1,rows:[{
     db:"neondb",version:160016,ro:"off",replica:false,
     actor:wrongRole?"neondb_owner":"phase6_private_frozen_publisher_v39",
     login:"phase6_private_publisher_login_ci_checks",
     db_now:new Date(expired?"2026-11-18T00:00:00Z":NOW),
     select_index:true,insert_index:true,
     update_index:broadAcl,delete_index:false,
     select_packet:true,insert_packet:true,
     update_packet:false,delete_packet:false,
     login_enabled:true,login_superuser:false,
     login_createrole:false,login_bypassrls:false,
     group_login:false,group_superuser:false,group_bypassrls:false
    }]};
   if(sql.includes("FROM phase6_private.frozen_native_packet_v39 WHERE")){
    const rows=index.entries.map(e=>({
     logical_path:e.filePath,run_day_index:e.runDayIndex,
     shard_index:e.shardIndex,kind:"SOURCE_DAY_REGISTRY",
     content_sha256:tamperedRegistry?"0".repeat(64):e.fileSha256,
     reviewed_code_sha:code,manifest_sha256:manifest,
     rights_sha256:rights,external_review_sha256:evidence,
     retention_not_after_utc:new Date("2026-11-14T05:00:00Z"),
     committed_at_utc:new Date(committedLate?
       "2026-11-14T02:00:00Z":"2026-11-14T01:59:00Z")
    }));
    const chosen=missingRegistry?rows.slice(0,-1):rows;
    return{rowCount:chosen.length,rows:chosen};
   }
   if(sql.startsWith("SELECT COUNT(*)::integer AS n FROM phase6_private.signed_day_shard_index_revision_v39 WHERE"))
    return{rowCount:1,rows:[{n:alreadyExists?1:0}]};
   if(sql==="SELECT COUNT(*)::integer AS n FROM phase6_private.signed_day_shard_index_revision_v39")
    return{rowCount:1,rows:[{n:0}]};
   if(sql.includes("SELECT revision,content_sha256,previous_index_sha256")){
    return{rowCount:1,rows:[{
     revision:1,content_sha256:wrongPrior?
       "0".repeat(64):hash(firstBytes),
     previous_index_sha256:null,
     reviewed_code_sha:code,manifest_sha256:manifest,
     calendar_sha256:calendar,release_sha256:release,
     rights_sha256:rights,
     retention_not_after_utc:new Date("2026-11-14T05:00:00Z"),
     payload_bytes:firstBytes
    }]};
   }
   if(sql.startsWith("INSERT INTO phase6_private.signed_day_shard_index_revision_v39"))
    return{rowCount:1,rows:[]};
   if(sql==="SELECT clock_timestamp() AS db_now")
    return{rowCount:1,rows:[{db_now:new Date("2026-11-14T02:00:01Z")}]};
   throw Error("UNEXPECTED_MOCKED_SQL");
  }};
  return{calls,client};
 }
 return{revision,index,indexBytes,review,wire,pins,scope,mocked};
}
const run=(f,q,overrides={})=>publishP6PrivateSignedIndexRevisionOnce({
 client:q.client,indexBytes:f.indexBytes,pins:f.pins,
 reviewWire:f.wire,reviewerPublicKeyPem:publicPem,
 scope:f.scope,...overrides
});
test("externally signed, exact SOURCE registry set publishes genesis and appended revision once",async()=>{
 for(const rev of [1,2]){
  const f=fixture(rev),q=f.mocked();
  const out=await run(f,q);
  assert.equal(out.schema,P6_PRIVATE_INDEX_PUBLISH_SCHEMA);
  assert.equal(out.revision,rev);
  assert.equal(out.signedBoundPrivateRegistryCount,rev);
  assert.equal(out.separateIndependentPostCommitReadbackRequired,true);
  assert.equal(out.phase6PaidGo,false);
  assert.equal(out.providerCalls,0);
  assert(q.calls.some(x=>x.sql==="COMMIT"));
  assert.equal(q.calls.filter(x=>x.sql.startsWith("INSERT INTO")).length,1);
  assert(!JSON.stringify(out).includes("source_abcdefgh123"));
 }
});
test("all private signed registry rows must preexist, correct SHA and actual publication time",async()=>{
 const f=fixture(2);
 for(const bad of [{missingRegistry:true},{tamperedRegistry:true},
  {committedLate:true},{wrongPrior:true},{alreadyExists:true},
  {wrongRole:true},{broadAcl:true},{expired:true}]){
  const q=f.mocked(bad);
  await assert.rejects(run(f,q),/HOLD_P6_SIGNED_PRIVATE_INDEX_PUBLISH_/);
  assert(!q.calls.some(x=>x.sql==="COMMIT"));
  assert(q.calls.some(x=>x.sql==="ROLLBACK"));
 }
});
test("bad review, disabled paid STOP and tampered payload are rejected before DB",async()=>{
 const f=fixture();
 for(const change of [
  {indexBytes:Buffer.from("X".repeat(150))},
  {pins:{...f.pins,privateIndexPublicationApproved:false}},
  {scope:{...f.scope,existingChildPaidDispatchApproved:true}},
  {scope:{...f.scope,privateIndexStorageApproved:false}},
  {reviewWire:{...f.wire,signatureBase64:Buffer.alloc(64).toString("base64")}}
 ]){
  const q=f.mocked();
  await assert.rejects(run(f,q,change),/HOLD_P6_SIGNED_PRIVATE_INDEX_PUBLISH_|HOLD_P6_SIGNED_PRIVATE_INDEX_READ_/);
  assert.equal(q.calls.length,0);
 }
});
test("even a VALID Ed25519 signature cannot attest registries before publication",async()=>{
 const f=fixture(2),q=f.mocked();
 const review={...f.review,reviewedAtUtc:"2026-11-14T01:58:00.000Z"};
 const wire={review,signatureBase64:sign(null,
  p6SignedIndexReviewPreimage(review),key.privateKey).toString("base64")};
 await assert.rejects(run(f,q,{reviewWire:wire}),
  /EXTERNAL_REVIEW_PREDATES_A_SIGNED_REGISTRY_PUBLICATION/);
 assert.equal(q.calls.length,0);
});
test("ambiguous private index COMMIT is HOLD without replay or printing payload",async()=>{
 const f=fixture(),q=f.mocked({unknownCommit:true});
 await assert.rejects(run(f,q),/UNKNOWN_COMMIT_INDEPENDENT_READBACK_NEVER_RETRY/);
 assert.equal(q.calls.filter(x=>x.sql==="COMMIT").length,1);
 assert.equal(q.calls.filter(x=>x.sql.startsWith("INSERT INTO")).length,1);
 assert(!q.calls.some(x=>x.sql==="ROLLBACK"));
});
