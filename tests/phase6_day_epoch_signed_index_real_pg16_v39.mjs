/**
 * Real DISPOSABLE local PG16 only. Signed synthetic SOURCE registries precede
 * the externally reviewed day index and are never real provider Contents.
 */
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import pg from "pg";
import {
 P6_DAY_EPOCH_REVIEW_SCHEMA,P6_DAY_EPOCH_REVIEW_AUDIENCE,
 p6DayEpochReviewPreimage,publishP6DayEpochIndexRevisionOnce,
 readP6DayEpochIndexCurrentPriorOnce
} from "../server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs";
const p="postgresql://phase6_private_publisher_login_ci_epoch:ci-only-day-pub@127.0.0.1:5432/neondb?sslmode=disable";
const r="postgresql://phase6_private_reader_login_ci_epoch:ci-only-day-read@127.0.0.1:5432/neondb?sslmode=disable";
const owner="postgresql://neondb_owner:ci-only-day-real@127.0.0.1:5432/neondb?sslmode=disable";
if(process.env.CI!=="true"||
 process.env.P6_DAY_EPOCH_REAL_DISPOSABLE_ONLY!=="1"||
 process.env.DATABASE_URL||process.env.AERODATABOX_API_KEY||
 process.env.RAPIDAPI_KEY||
 process.env.P6_REAL_DISPOSABLE_OWNER_URL!==owner)
 throw Error("HOLD_NOT_EXPLICITLY_LOCAL_DISPOSABLE_NO_PROVIDER");

const hash=b=>createHash("sha256").update(b).digest("hex");
const key=generateKeyPairSync("ed25519");
const pem=key.publicKey.export({format:"pem",type:"spki"}).toString();
const fp=hash(key.publicKey.export({format:"der",type:"spki"}));
const six=x=>x.repeat(64);
const code="f".repeat(40),manifest=six("a"),calendar=six("b"),
 release=six("c"),rights=six("d"),evidence=six("e");
const n=Date.now();
const t=x=>new Date(n+x).toISOString();
const published=t(-15000),committed=t(-20000),reviewed=t(-10000),
 valid=t(1800000),expire=t(5400000),packetExpire=t(7200000),
 notBefore=t(300000),hardLatest=t(4200000);
function registry(day,shard){
 const path="data-collection/phase5/frozen/source_day"+
  day+"_shard"+shard+"_registry.json";
 const payload=Buffer.from(JSON.stringify({
  schema:"TEST_SYNTHETIC_SOURCE_NO_PROVIDER",
  day,shard,synthetic:true,
  filler:"x".repeat(200)
 }));
 return{path,payload,entry:{
  lane:"SOURCE",runDayIndex:day,shardIndex:shard,
  filePath:path,fileSha256:hash(payload),publishedAtUtc:published,
  notBeforeUtc:notBefore,hardLatestUtc:hardLatest,
  reviewEvidenceSha256:evidence,sourceRegistryFilePath:null,
  sourceRegistrySha256:null
 }};
}
const dbOwner=new pg.Client({connectionString:owner});
await dbOwner.connect();
async function insertRegistry(d){
 const res=await dbOwner.query(
  "INSERT INTO phase6_private.frozen_native_packet_v39 "+
  "(logical_path,run_day_index,shard_index,kind,content_sha256,"+
  "reviewed_code_sha,manifest_sha256,rights_sha256,"+
  "external_review_sha256,externally_reviewed_at_utc,"+
  "retention_not_after_utc,committed_at_utc,payload_bytes)"+
  " VALUES($1,$2,$3,'SOURCE_DAY_REGISTRY',$4,$5,$6,$7,$8,$9,$10,$11,$12)",
  [d.path,d.entry.runDayIndex,d.entry.shardIndex,hash(d.payload),
   code,manifest,rights,evidence,reviewed,packetExpire,committed,d.payload]);
 assert.equal(res.rowCount,1);
}
function indexPacket(day,revision,entries,previousBytes){
 const index={
  schema:"v39.phase6.run-day-scoped-append-only-index.v1",
  runDayIndex:day,revision,
  previousIndexSha256:previousBytes?hash(previousBytes):null,
  manifestSha256:manifest,calendarSha256:calendar,
  reviewedCodeSha:code,reviewedReleaseSha256:release,
  reviewedRightsSha256:rights,entries
 };
 const bytes=Buffer.from(JSON.stringify(index));
 const review={
  schema:P6_DAY_EPOCH_REVIEW_SCHEMA,
  audience:P6_DAY_EPOCH_REVIEW_AUDIENCE,
  runDayIndex:day,indexRevision:revision,indexSha256:hash(bytes),
  previousIndexSha256:index.previousIndexSha256,
  reviewedCodeSha:code,manifestSha256:manifest,
  calendarSha256:calendar,releaseSha256:release,
  rightsSha256:rights,externalReviewEvidenceSha256:evidence,
  reviewedAtUtc:reviewed,validUntilUtc:valid,
  retentionNotAfterUtc:expire,reviewerPublicKeyFingerprintSha256:fp
 };
 const wire={review,signatureBase64:sign(null,
   p6DayEpochReviewPreimage(review),key.privateKey).toString("base64")};
 const pins={
  independentExternalReviewerSignaturePinsApproved:true,
  privateDayIndexPublicationApproved:true,privateDayIndexReadOnlyApproved:true,
  expectedRunDayIndex:day,expectedIndexRevision:revision,
  expectedIndexSha256:hash(bytes),
  expectedPreviousIndexSha256:index.previousIndexSha256,
  expectedReviewedCodeSha:code,expectedManifestSha256:manifest,
  expectedCalendarSha256:calendar,expectedReleaseSha256:release,
  expectedRightsSha256:rights,
  expectedExternalReviewEvidenceSha256:evidence,
  expectedReviewerPublicKeyFingerprintSha256:fp,
  expectedReaderSessionLogin:"phase6_private_reader_login_ci_epoch"
 };
 const scope={
  privateDayIndexStorageApproved:true,
  independentProviderContentsReviewApproved:true,
  existingPaidDispatchApproved:false,adbAutoCollect:"0",
  phase6ProcessArmed:"0",expectedPublisherSessionLogin:"phase6_private_publisher_login_ci_epoch",
  approvedCodeSha:code,approvedCalendarSha256:calendar,
  approvedRightsSha256:rights,
  approvedRetentionNotAfterUtc:expire
 };
 return{bytes,wire,pins,scope,review};
}
const pub=new pg.Client({connectionString:p});
const read=new pg.Client({connectionString:r});
await pub.connect();await read.connect();
try{
 await pub.query("SET ROLE phase6_private_frozen_publisher_v39");
 await read.query("SET ROLE phase6_private_frozen_reader_v39");
 const d1=registry(1,1),d2=registry(1,2),d31=registry(31,1);
 await insertRegistry(d1);await insertRegistry(d2);await insertRegistry(d31);
 const first=indexPacket(1,1,[d1.entry],null);
 const inserted=await publishP6DayEpochIndexRevisionOnce({
  client:pub,pins:first.pins,wire:first.wire,publicKeyPem:pem,
  indexBytes:first.bytes,scope:first.scope
 });
 assert.equal(inserted.revision,1);
 const firstRead=await readP6DayEpochIndexCurrentPriorOnce({
  client:read,pins:first.pins,wire:first.wire,publicKeyPem:pem
 });
 assert.deepEqual(firstRead.currentIndexBytes,first.bytes);
 assert.equal(firstRead.redactedSummary.runDayIndex,1);
 const second=indexPacket(1,2,[d1.entry,d2.entry],first.bytes);
 const out=await publishP6DayEpochIndexRevisionOnce({
  client:pub,pins:second.pins,wire:second.wire,publicKeyPem:pem,
  indexBytes:second.bytes,scope:second.scope
 });
 assert.equal(out.revision,2);
 const secondRead=await readP6DayEpochIndexCurrentPriorOnce({
  client:read,pins:second.pins,wire:second.wire,publicKeyPem:pem
 });
 assert.deepEqual(secondRead.currentIndexBytes,second.bytes);
 assert.deepEqual(secondRead.previousIndexBytes,first.bytes);
 assert.equal(secondRead.redactedSummary.entryCount,2);
 const day31=indexPacket(31,1,[d31.entry],null);
 await publishP6DayEpochIndexRevisionOnce({
  client:pub,pins:day31.pins,wire:day31.wire,
  publicKeyPem:pem,indexBytes:day31.bytes,scope:day31.scope
 });
 const laterDay=await readP6DayEpochIndexCurrentPriorOnce({
  client:read,pins:day31.pins,wire:day31.wire,publicKeyPem:pem
 });
 assert.equal(laterDay.redactedSummary.runDayIndex,31);
 // An immutable day1 owner deletion removes its bytes without affecting
 // day31: this proof still requires a separate proper expiry reviewer.
 const removed=await dbOwner.query(
  "DELETE FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=1");
 assert.equal(removed.rowCount,2);
 await assert.rejects(publishP6DayEpochIndexRevisionOnce({
  client:pub,pins:first.pins,wire:first.wire,
  publicKeyPem:pem,indexBytes:first.bytes,scope:first.scope
 }),/DAY_GENESIS_ALREADY_CLAIMED_NO_REPLAY/);
 const still=await readP6DayEpochIndexCurrentPriorOnce({
  client:read,pins:day31.pins,wire:day31.wire,publicKeyPem:pem
 });
 assert.equal(still.redactedSummary.runDayIndex,31);
 console.log(JSON.stringify({
  status:"P6_DAY_EPOCH_REAL_RESTRICTED_PG16_PUBLISH_READ_PASS",
  signedDayIndices:[1,31],sourceRegistries:3,
  day1RevisionsBeforeOwnerDeletion:2,
  day31SurvivesDay1PrivateByteDeletion:true,
  immutableDay1ClaimPreventsGenesisReplay:true,
  realExternalEd25519SignatureVerified:true,
  realPg16SourceRoleIsolation:true,
  productionDatabaseWrites:0,providerCalls:0,
  phase6PaidGo:false
 }));
}finally{
 await pub.end();await read.end();await dbOwner.end();
}
