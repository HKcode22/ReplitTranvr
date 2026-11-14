import test from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {
 publishP6PrivateSourcePostOnce,
 P6_PRIVATE_SOURCE_POST_PUBLISH_SCHEMA
} from "../server/lib/disruption/phase6PrivateSourcePostPublisherOnce_v39.mjs";
import {
 signedP6PrivateSourcePostReviewBytes,
 P6_SOURCE_POST_REVIEW_SCHEMA,
 P6_SOURCE_POST_REVIEW_AUDIENCE
} from "../server/lib/disruption/phase6PrivateSourcePostReadOnce_v39.mjs";
const sha=b=>createHash("sha256").update(b).digest("hex");
const KEY=generateKeyPairSync("ed25519");
const PEM=KEY.publicKey.export({format:"pem",type:"spki"}).toString();
const FINGERPRINT=sha(KEY.publicKey.export({format:"der",type:"spki"}));
const AT="2026-11-14T01:58:00.000Z";
const NOW="2026-11-14T02:00:00.000Z";
const EXPIRE="2026-11-14T04:00:00.000Z";
const SOURCE_PATH="data-collection/phase5/frozen/source_abcdefgh123.json";
function fixture(kind="SOURCE_QUERY_PACKET"){
 const post=kind==="POST_PACKET";
 const logicalPath=post?
  "data-collection/phase5/frozen/post_abcdefgh123.json":
  "data-collection/phase5/frozen/sourceq_abcdefgh123.json";
 const bytes=Buffer.from(JSON.stringify({
  test:"SYNTHETIC_NO_PROVIDER_CONTENTS",
  x:"s".repeat(155)
 }));
 const review={
  schema:P6_SOURCE_POST_REVIEW_SCHEMA,
  audience:P6_SOURCE_POST_REVIEW_AUDIENCE,
  kind,logicalPath,contentSha256:sha(bytes),
  reviewedCodeSha:"a".repeat(40),
  manifestSha256:"b".repeat(64),
  rightsSha256:"c".repeat(64),
  runDayIndex:1,shardIndex:1,
  externalReviewEvidenceSha256:"d".repeat(64),
  reviewedAtUtc:AT,retentionNotAfterUtc:EXPIRE,
  validUntilUtc:"2026-11-14T03:00:00.000Z",
  reviewerPublicKeyFingerprintSha256:FINGERPRINT
 };
 const wire={
  review,signatureBase64:sign(null,
   signedP6PrivateSourcePostReviewBytes(review),
   KEY.privateKey).toString("base64")
 };
 const pins={
  independentExternalReviewerSignaturePinsApproved:true,
  privateSourcePostPublishApproved:true,
  expectedKind:kind,expectedLogicalPath:logicalPath,
  expectedContentSha256:review.contentSha256,
  expectedReviewedMainSha:review.reviewedCodeSha,
  expectedManifestSha256:review.manifestSha256,
  expectedRightsSha256:review.rightsSha256,
  expectedExternalReviewEvidenceSha256:review.externalReviewEvidenceSha256,
  expectedReviewerPublicKeyFingerprintSha256:FINGERPRINT,
  expectedRunDayIndex:1,expectedShardIndex:1
 };
 const scope={
  privateStoragePublicationApproved:true,
  separateProviderContentRightsReviewApproved:true,
  existingChildOrPaidDispatchApproved:false,
  adbAutoCollect:"0",phase6ProcessArmed:"0",
  approvedMainCodeSha:review.reviewedCodeSha,
  expectedPublisherSessionLogin:"phase6_private_publisher_login_ci_checks",
  approvedRetentionNotAfterUtc:review.retentionNotAfterUtc,
  reviewedRightsSha256:review.rightsSha256,
  externalReviewEvidenceSha256:review.externalReviewEvidenceSha256,
  expectedSourceDayRegistryLogicalPath:post?SOURCE_PATH:null,
  expectedSourceDayRegistrySha256:post?"f".repeat(64):null
 };
 function mocked({
  wrongRole=false,alreadyExists=false,
  missingSource=false,badSource=false,unknownCommit=false,
  wrongAcl=false, expired=false
 }={}){
  const queries=[];
  const client={async query(sql,params=[]){
   queries.push({sql,params});
   if(sql.startsWith("BEGIN")||sql.startsWith("SET LOCAL")||
      sql==="ROLLBACK")return{rowCount:null,rows:[]};
   if(sql==="COMMIT"){
    if(unknownCommit)throw Error("transport private connection error");
    return{rowCount:null,rows:[]};
   }
   if(sql.includes("SELECT current_database() AS db"))
    return{rowCount:1,rows:[{
     db:"neondb",server_version:160016,ro:"off",replica:false,
     actor:wrongRole?"neondb_owner":"phase6_private_frozen_publisher_v39",
     session_login:"phase6_private_publisher_login_ci_checks",
     db_now:new Date(expired?"2026-11-16T04:00:00Z":NOW),
     can_select:true,can_insert:true,can_update:wrongAcl,can_delete:false,
     login_enabled:true,login_superuser:false,login_createrole:false,
     login_bypass_rls:false,group_can_login:false,
     group_superuser:false,group_bypass_rls:false
    }]};
   if(sql.startsWith("SELECT COUNT(*)::integer AS n FROM"))
    return{rowCount:1,rows:[{n:alreadyExists?1:0}]};
   if(sql.includes("SELECT run_day_index,kind,content_sha256"))
    return{rowCount:missingSource?0:1,rows:missingSource?[]:[{
     run_day_index:1,kind:"SOURCE_DAY_REGISTRY",
     content_sha256:badSource?"0".repeat(64):scope.expectedSourceDayRegistrySha256,
     manifest_sha256:review.manifestSha256,
     rights_sha256:review.rightsSha256,
     reviewed_code_sha:review.reviewedCodeSha,
     committed_at_utc:new Date("2026-11-14T01:55:00Z"),
     retention_not_after_utc:new Date("2026-11-14T05:00:00Z")
    }]};
   if(sql.startsWith("INSERT INTO phase6_private.frozen_native_packet_v39"))
    return{rowCount:1,rows:[]};
   if(sql==="SELECT clock_timestamp() AS db_now")
    return{rowCount:1,rows:[{db_now:new Date("2026-11-14T02:00:01.000Z")}]};
   throw Error("UNKNOWN_SQL_IN_UNIT_TEST");
  }};
  return {queries,client};
 }
 return{kind,review,wire,pins,scope,bytes,mocked};
}
test("one signed SOURCE query publishes once and mandates registry-last",async()=>{
 const f=fixture(),q=f.mocked();
 const r=await publishP6PrivateSourcePostOnce({
  client:q.client,pins:f.pins,wire:f.wire,
  reviewerPublicKeyPem:PEM,packetBytes:f.bytes,scope:f.scope
 });
 assert.equal(r.schema,P6_PRIVATE_SOURCE_POST_PUBLISH_SCHEMA);
 assert.equal(r.kind,"SOURCE_QUERY_PACKET");
 assert.equal(r.sourceQueryRegistryLastStillRequired,true);
 assert.equal(r.independentPostCommitReadbackRequired,true);
 assert.equal(r.providerCalls,0);
 assert.equal(r.phase6PaidGo,false);
 assert(q.queries.some(x=>x.sql==="COMMIT"));
 assert.equal(q.queries.filter(x=>x.sql.startsWith("INSERT INTO")).length,1);
 assert(!JSON.stringify(r).includes("SYNTHETIC_NO_PROVIDER_CONTENTS"));
});
test("POST packet requires genuine previously committed SOURCE day registry",async()=>{
 const f=fixture("POST_PACKET"),q=f.mocked();
 const r=await publishP6PrivateSourcePostOnce({
  client:q.client,pins:f.pins,wire:f.wire,
  reviewerPublicKeyPem:PEM,packetBytes:f.bytes,scope:f.scope
 });
 assert.equal(r.exactSourceRegistryPrecommitted,true);
 assert.equal(r.sourceQueryRegistryLastStillRequired,false);
 assert(q.queries.some(x=>x.sql.includes("SELECT run_day_index,kind,content_sha256")));
 for(const bad of [{missingSource:true},{badSource:true}]){
  const d=f.mocked(bad);
  await assert.rejects(publishP6PrivateSourcePostOnce({
   client:d.client,pins:f.pins,wire:f.wire,
   reviewerPublicKeyPem:PEM,packetBytes:f.bytes,scope:f.scope
  }),/HOLD_P6_SOURCE_POST_PUBLISH_/);
  assert(!d.queries.some(x=>x.sql.startsWith("INSERT INTO")));
  assert(d.queries.some(x=>x.sql==="ROLLBACK"));
 }
});
test("cannot publish using admin owner, broad ACL, expired clock or replay",async()=>{
 const f=fixture();
 for(const bad of [{wrongRole:true},{alreadyExists:true},
  {wrongAcl:true},{expired:true}]){
  const d=f.mocked(bad);
  await assert.rejects(publishP6PrivateSourcePostOnce({
   client:d.client,pins:f.pins,wire:f.wire,
   reviewerPublicKeyPem:PEM,packetBytes:f.bytes,scope:f.scope
  }),/HOLD_P6_SOURCE_POST_PUBLISH_/);
  assert(!d.queries.some(x=>x.sql==="COMMIT"));
  assert(d.queries.some(x=>x.sql==="ROLLBACK"));
 }
});
test("bad signature, changed private bytes, disabled scope hold BEFORE SQL",async()=>{
 const f=fixture();
 for(const changed of [
  {wire:{...f.wire,signatureBase64:Buffer.alloc(64).toString("base64")}},
  {packetBytes:Buffer.from("x".repeat(120))},
  {scope:{...f.scope,privateStoragePublicationApproved:false}},
  {scope:{...f.scope,existingChildOrPaidDispatchApproved:true}},
  {pins:{...f.pins,privateSourcePostPublishApproved:false}}
 ]){
  const q=f.mocked();
  await assert.rejects(publishP6PrivateSourcePostOnce({
   client:q.client,pins:f.pins,wire:f.wire,
   reviewerPublicKeyPem:PEM,packetBytes:f.bytes,scope:f.scope,...changed
  }),/HOLD_P6_/);
  assert.equal(q.queries.length,0);
 }
});
test("unknown COMMIT is HOLD without retransmission, secrets not exposed",async()=>{
 const f=fixture(),q=f.mocked({unknownCommit:true});
 await assert.rejects(publishP6PrivateSourcePostOnce({
  client:q.client,pins:f.pins,wire:f.wire,
  reviewerPublicKeyPem:PEM,packetBytes:f.bytes,scope:f.scope
 }),/UNKNOWN_COMMIT_REQUIRES_INDEPENDENT_READBACK_NEVER_RETRY/);
 assert.equal(q.queries.filter(x=>x.sql==="COMMIT").length,1);
 assert(!q.queries.some(x=>x.sql==="ROLLBACK"));
 assert.equal(q.queries.filter(x=>x.sql.startsWith("INSERT INTO")).length,1);
});
