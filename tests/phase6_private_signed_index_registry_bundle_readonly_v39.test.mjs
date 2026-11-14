import test from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {
 P6_INDEX_REVIEW_SCHEMA,P6_INDEX_REVIEW_AUDIENCE,
 p6SignedIndexReviewPreimage
} from "../server/lib/disruption/phase6PrivateSignedIndexReadOnce_v39.mjs";
import {
 hydrateP6PrivateIndexAndRegistryBytesOnce,
 P6_PRIVATE_REGISTRY_BUNDLE_SCHEMA
} from "../server/lib/disruption/phase6PrivateSignedIndexRegistryBundleReadOnly_v39.mjs";

const H=b=>createHash("sha256").update(b).digest("hex");
const kp=generateKeyPairSync("ed25519");
const pem=kp.publicKey.export({type:"spki",format:"pem"}).toString();
const fp=H(kp.publicKey.export({type:"spki",format:"der"}));
const AT="2026-11-14T01:58:00.000Z",NOW="2026-11-14T02:00:00.000Z";
const EXPIRE="2026-11-14T04:00:00.000Z",VALID="2026-11-14T03:00:00.000Z";
const manifest="a".repeat(64),calendar="b".repeat(64),
 release="c".repeat(64),rights="d".repeat(64),
 reviewer="e".repeat(64),code="f".repeat(40);
const sourcePath="data-collection/phase5/frozen/source_abcdefgh123.json";
function fixture({revision=2}={}){
 const nowDate=new Date(NOW);
 const mk=(id,day,kind,lane,source)=>{
  const path=id;
  const raw=Buffer.from(JSON.stringify({
   schema:lane==="SOURCE"?"v39.phase5.signed-per-day-source-batch-readonly.v1":
    lane==="POST"?"v39.phase5.github-future-post-reviewed-release.v1":
    "v39.phase5.signed-later-pre-day-registry.v1",
   x:"SYNTHETIC_NO_PROVIDER_READ_BUNDLE_TEST".repeat(7),
   day
  }));
  return{
   entry:{
    lane,runDayIndex:day,shardIndex:1,
    filePath:path,fileSha256:H(raw),
    publishedAtUtc:"2026-11-14T01:59:00.000Z",
    notBeforeUtc:"2026-11-14T02:10:00.000Z",
    hardLatestUtc:"2026-11-14T02:55:00.000Z",
    reviewEvidenceSha256:reviewer,
    sourceRegistryFilePath:source?source.entry.filePath:null,
    sourceRegistrySha256:source?source.entry.fileSha256:null
   },
   row:{
    logical_path:path,run_day_index:day,shard_index:1,
    kind,content_sha256:H(raw),
    reviewed_code_sha:code,manifest_sha256:manifest,
    rights_sha256:rights,external_review_sha256:reviewer,
    externally_reviewed_at_utc:new Date(AT),
    retention_not_after_utc:new Date(EXPIRE),
    committed_at_utc:new Date("2026-11-14T01:58:59.000Z"),
    payload_bytes:raw
   }
  };
 };
 const src=mk(sourcePath,1,"SOURCE_DAY_REGISTRY","SOURCE",null);
 const post=mk("data-collection/phase5/frozen/post_abcdefgh123.json",
    1,"POST_PACKET","POST",src);
 const all=[src,post];
 const first={
  schema:"v39.phase5.phase6-append-only-day-shard-index.v1",
  manifestSha256:manifest,calendarSha256:calendar,
  reviewedCodeSha:code,reviewedReleaseSha256:release,
  reviewedRightsSha256:rights,
  revision:1,previousIndexSha256:null,entries:[src.entry]
 };
 const rawFirst=Buffer.from(JSON.stringify(first));
 const current=revision===1?first:{
  ...first,revision:2,previousIndexSha256:H(rawFirst),
  entries:all.map(x=>x.entry)
 };
 const rawCurrent=Buffer.from(JSON.stringify(current));
 const review={
  schema:P6_INDEX_REVIEW_SCHEMA,
  audience:P6_INDEX_REVIEW_AUDIENCE,
  indexRevision:revision,indexSha256:H(rawCurrent),
  previousIndexSha256:current.previousIndexSha256,
  reviewedCodeSha:code,manifestSha256:manifest,
  calendarSha256:calendar,releaseSha256:release,
  rightsSha256:rights,externalReviewEvidenceSha256:reviewer,
  reviewedAtUtc:AT,validUntilUtc:VALID,retentionNotAfterUtc:EXPIRE,
  reviewerPublicKeyFingerprintSha256:fp
 };
 const wire={review,signatureBase64:sign(null,
  p6SignedIndexReviewPreimage(review),kp.privateKey).toString("base64")};
 const pins={
  independentExternalReviewerSignaturePinsApproved:true,
  privateIndexReadOnlyApproved:true,
  privateFrozenRegistryReadOnlyApproved:true,
  expectedReaderSessionLogin:"phase6_private_reader_login_ci_checks",
  expectedIndexRevision:revision,
  expectedIndexSha256:H(rawCurrent),
  expectedPreviousIndexSha256:current.previousIndexSha256,
  expectedReviewedCodeSha:code,expectedManifestSha256:manifest,
  expectedCalendarSha256:calendar,expectedReleaseSha256:release,
  expectedRightsSha256:rights,
  expectedExternalReviewEvidenceSha256:reviewer,
  expectedReviewerPublicKeyFingerprintSha256:fp
 };
 function fake({badRole=false,badByte=false,wrongExpiry=false,
    missingRegistry=false,badClock=false}={}){
  const calls=[];
  const selected=revision===1?[src]:all;
  let authCount=0;
  const client={async query(sql,params=[]){
   calls.push({sql,params});
   if(sql.startsWith("BEGIN")||sql.startsWith("SET LOCAL")||
      sql==="ROLLBACK")return{rowCount:null,rows:[]};
   if(sql.includes("SELECT current_database() AS db")){
    authCount++;
    const first=authCount===1;
    return{rowCount:1,rows:[{
     db:"neondb",version:160016,ro:"on",replica:false,
     actor:badRole?"neondb_owner":"phase6_private_frozen_reader_v39",
     login:"phase6_private_reader_login_ci_checks",
     db_now:new Date(badClock&&!first?"2026-11-14T02:01:00Z":NOW),
     select_index:true,insert_index:false,update_index:false,
     delete_index:false,select_packet:true,insert_packet:false,
     can_read:true,can_insert:false,can_update:false,can_delete:false,
     index_read:true,login_enabled:true,login_superuser:false,
     login_createrole:false,login_bypassrls:false,
     group_login:false,group_superuser:false,group_bypassrls:false
    }]};
   }
   if(sql.includes("FROM phase6_private.signed_day_shard_index_revision_v39 WHERE")){
    const make=(idx,bytes,prev)=>({
     revision:idx.revision,previous_index_sha256:prev,
     content_sha256:H(bytes),
     reviewed_code_sha:code,manifest_sha256:manifest,
     calendar_sha256:calendar,release_sha256:release,
     rights_sha256:rights,external_review_sha256:reviewer,
     externally_reviewed_at_utc:new Date(AT),
     retention_not_after_utc:new Date(EXPIRE),
     committed_at_utc:new Date("2026-11-14T01:59:00.000Z"),
     payload_bytes:bytes
    });
    const rows=[make(current,rawCurrent,current.previousIndexSha256)];
    if(revision>1)rows.push(make(first,rawFirst,null));
    return{rowCount:rows.length,rows};
   }
   if(sql.includes("FROM phase6_private.frozen_native_packet_v39 WHERE")){
    const requested=params[0]??[];
    let rows=selected.filter(x=>requested.includes(x.entry.filePath)).
     map(x=>({...x.row}));
    if(missingRegistry)rows=rows.slice(0,-1);
    if(badByte&&rows.length)rows[0].payload_bytes=Buffer.from("x".repeat(150));
    if(wrongExpiry&&rows.length)
     rows[0].retention_not_after_utc=new Date("2026-11-14T01:00:00Z");
    return{rowCount:rows.length,rows};
   }
   throw Error("UNEXPECTED_READONLY_TEST_SQL");
  }};
  return{client,calls};
 }
 return{src,post,all,index:current,raw:rawCurrent,
   revision,rawFirst,wire,pins,fake};
}
test("source and POST frozen registry bytes hydrated in memory, log is SHA/count only",async()=>{
 for(const revision of [1,2]){
  const f=fixture({revision}),db=f.fake();
  const out=await hydrateP6PrivateIndexAndRegistryBytesOnce({
   client:db.client,indexPins:f.pins,indexReviewWire:f.wire,
   indexReviewerPublicKeyPem:pem
  });
  assert.equal(out.redactedSummary.schema,P6_PRIVATE_REGISTRY_BUNDLE_SCHEMA);
  assert.equal(out.redactedSummary.totalVerifiedRegistryCount,revision);
  assert.equal(out.redactedSummary.providerCalls,0);
  assert.equal(out.redactedSummary.githubChildDispatches,0);
  assert.equal(out.redactedSummary.phase6PaidGo,false);
  assert.deepEqual(out.getFrozen(f.src.entry.filePath),f.src.row.payload_bytes);
  if(revision===2)
   assert.deepEqual(out.getFrozen(f.post.entry.filePath),f.post.row.payload_bytes);
  assert.throws(()=>out.getFrozen("../foo"),/UNREGISTERED_SIGNED_PRIVATE/);
  assert(!JSON.stringify(out).includes("SYNTHETIC_NO_PROVIDER_READ_BUNDLE_TEST"));
  assert(!JSON.stringify(out).includes(sourcePath));
  assert(!JSON.stringify(out).includes("payload_bytes"));
  assert(db.calls.filter(x=>x.sql.startsWith("BEGIN")).length===2);
  assert.equal(db.calls.filter(x=>x.sql==="ROLLBACK").length,2);
  assert(!db.calls.some(x=>/^\s*(INSERT|UPDATE|DELETE|COMMIT|ALTER)/.test(x.sql)));
 }
});
test("bad restricted role, missing/modified/expired registry or stale PG clock HOLD",async()=>{
 for(const bad of [{badRole:true},{badByte:true},{wrongExpiry:true},
   {missingRegistry:true},{badClock:true}]){
  const f=fixture(),db=f.fake(bad);
  await assert.rejects(hydrateP6PrivateIndexAndRegistryBytesOnce({
   client:db.client,indexPins:f.pins,indexReviewWire:f.wire,
   indexReviewerPublicKeyPem:pem
  }),/HOLD_P6_/);
  assert(db.calls.some(x=>x.sql==="ROLLBACK"));
 }
});
test("signer/pins and separate private registry admission hold without any DB call",async()=>{
 const f=fixture();
 for(const inp of [
  {indexPins:{...f.pins,privateFrozenRegistryReadOnlyApproved:false}},
  {indexPins:{...f.pins,privateIndexReadOnlyApproved:false}},
  {indexPins:{...f.pins,expectedIndexSha256:"0".repeat(64)}},
  {indexReviewWire:{...f.wire,signatureBase64:Buffer.alloc(64).toString("base64")}}
 ]){
  const db=f.fake();
  await assert.rejects(hydrateP6PrivateIndexAndRegistryBytesOnce({
   client:db.client,indexPins:f.pins,indexReviewWire:f.wire,
   indexReviewerPublicKeyPem:pem,...inp
  }),/HOLD_P6_/);
  assert.equal(db.calls.length,0);
 }
});
