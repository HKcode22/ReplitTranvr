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
import {hydrateP6DayEpochFullRegistriesReadOnly}
 from "../server/lib/disruption/phase6DayEpochFullRegistryReadOnce_v39.mjs";
import {publishP6PrivateSourcePostOnce}
 from "../server/lib/disruption/phase6PrivateSourcePostPublisherOnce_v39.mjs";
import {P6_SOURCE_POST_REVIEW_SCHEMA,P6_SOURCE_POST_REVIEW_AUDIENCE,
 signedP6PrivateSourcePostReviewBytes,readP6PrivateSourcePostOnce}
 from "../server/lib/disruption/phase6PrivateSourcePostReadOnce_v39.mjs";
import {readP6StoredPrivateReviewOnce}
 from "../server/lib/disruption/phase6StoredPrivateReviewReadOnce_v39.mjs";
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
  approvedRetentionNotAfterUtc:expire,persistVerifiedReviewWire:true
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
 const trust={independentStudyTrustPinsApproved:true,
  expectedReaderSessionLogin:"phase6_private_reader_login_ci_epoch",
  reviewedCodeSha:code,manifestSha256:manifest,calendarSha256:calendar,
  releaseSha256:release,rightsSha256:rights,
  dayReviewerFingerprintSha256:fp,dayReviewerPublicKeyPem:pem,
  queryReviewerFingerprintSha256:fp,queryReviewerPublicKeyPem:pem};
 const scope={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
 const stored=await readP6StoredPrivateReviewOnce({client:read,trust,scope,
  selector:{kind:"CURRENT_DAY",runDayIndex:1}});
 await assert.rejects(readP6StoredPrivateReviewOnce({client:read,trust,scope,
  selector:{kind:"CURRENT_DAY",runDayIndex:2}}),/CURRENT_DAY_NOT_PUBLISHED_OR_RETAINED/);
 assert.equal(stored.pins.expectedIndexRevision,2);
 assert.deepEqual(stored.wire,second.wire);
 const old=await readP6StoredPrivateReviewOnce({client:read,trust,scope,
  selector:{kind:"EXACT_DAY",runDayIndex:1,indexRevision:1,indexSha256:first.review.indexSha256}});
 assert.deepEqual(old.wire,first.wire);
 const again=await readP6DayEpochIndexCurrentPriorOnce({
  client:read,pins:stored.pins,wire:stored.wire,publicKeyPem:stored.publicKeyPem});
 assert.deepEqual(again.currentIndexBytes,second.bytes);
 assert.equal(JSON.stringify(stored).includes(second.wire.signatureBase64),false);
 await assert.rejects(readP6StoredPrivateReviewOnce({client:read,trust,scope,
  selector:{kind:"EXACT_DAY",runDayIndex:1,indexRevision:1,indexSha256:six("9")}}),
  /DAY_REVISION_OR_STUDY_SELECTOR_DRIFT/);
 // Atomic signed query publication and dynamic lookup use the original
 // publisher and reader, with private detached review stored on same row.
 const qPath="data-collection/phase5/frozen/sourceq_synthetic_day01.json";
 const qBytes=Buffer.from(JSON.stringify({synthetic:true,filler:"q".repeat(200)}));
 const qReview={schema:P6_SOURCE_POST_REVIEW_SCHEMA,audience:P6_SOURCE_POST_REVIEW_AUDIENCE,
  kind:"SOURCE_QUERY_PACKET",logicalPath:qPath,contentSha256:hash(qBytes),
  reviewedCodeSha:code,manifestSha256:manifest,rightsSha256:rights,
  runDayIndex:1,shardIndex:1,externalReviewEvidenceSha256:evidence,
  reviewedAtUtc:reviewed,retentionNotAfterUtc:expire,validUntilUtc:valid,
  reviewerPublicKeyFingerprintSha256:fp};
 const qWire={review:qReview,signatureBase64:sign(null,
  signedP6PrivateSourcePostReviewBytes(qReview),key.privateKey).toString("base64")};
 const qPins={independentExternalReviewerSignaturePinsApproved:true,
  privateSourcePostPublishApproved:true,expectedKind:"SOURCE_QUERY_PACKET",
  expectedLogicalPath:qPath,expectedContentSha256:hash(qBytes),
  expectedReviewedMainSha:code,expectedManifestSha256:manifest,
  expectedRightsSha256:rights,expectedExternalReviewEvidenceSha256:evidence,
  expectedReviewerPublicKeyFingerprintSha256:fp,expectedRunDayIndex:1,expectedShardIndex:1};
 await publishP6PrivateSourcePostOnce({client:pub,pins:qPins,wire:qWire,
  reviewerPublicKeyPem:pem,packetBytes:qBytes,scope:{
   privateStoragePublicationApproved:true,separateProviderContentRightsReviewApproved:true,
   existingChildOrPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",
   approvedMainCodeSha:code,expectedPublisherSessionLogin:"phase6_private_publisher_login_ci_epoch",
   approvedRetentionNotAfterUtc:expire,reviewedRightsSha256:rights,
   externalReviewEvidenceSha256:evidence,expectedSourceDayRegistryLogicalPath:null,
   expectedSourceDayRegistrySha256:null,persistVerifiedReviewWire:true
 }});
 const qSelector={kind:"SOURCE_QUERY",runDayIndex:1,shardIndex:1,
  logicalPath:qPath,contentSha256:hash(qBytes)};
 const qStored=await readP6StoredPrivateReviewOnce({client:read,trust,scope,selector:qSelector});
 assert.deepEqual(qStored.wire,qWire);
 const verified=await readP6PrivateSourcePostOnce(read,qStored.pins,qStored.wire,qStored.publicKeyPem);
 assert.deepEqual(verified.privateBytes,qBytes);
 await assert.rejects(readP6StoredPrivateReviewOnce({client:read,trust,scope,
  selector:{...qSelector,shardIndex:2}}),/QUERY_REGISTRY_SELECTOR_DRIFT/);
 await assert.rejects(pub.query("UPDATE phase6_private.frozen_native_packet_v39 SET review_wire_bytes=NULL WHERE logical_path=$1",[qPath]));
 const removedQuery=await dbOwner.query("DELETE FROM phase6_private.frozen_native_packet_v39 WHERE logical_path=$1",[qPath]);
 assert.equal(removedQuery.rowCount,1);
 await assert.rejects(readP6StoredPrivateReviewOnce({client:read,trust,scope,selector:qSelector}),
  /EXACT_COMMITTED_REVIEW_NOT_FOUND/);
 // The existing V0098/V0099 transport also stores POST wires. Test
 // exact independent signer, precommitted SOURCE registry, authentic byte
 // readback, cross-kind refusal and missing-after-deletion behavior.
 const pk=generateKeyPairSync("ed25519"),postPem=pk.publicKey.export({format:"pem",type:"spki"}).toString(),
  postFp=hash(pk.publicKey.export({format:"der",type:"spki"}));
 const postPath="data-collection/phase5/frozen/post_synthetic_day01.json";
 const postBytes=Buffer.from(JSON.stringify({synthetic:true,filler:"p".repeat(300)}));
 const postReview={...qReview,kind:"POST_PACKET",logicalPath:postPath,
  contentSha256:hash(postBytes),shardIndex:3,reviewerPublicKeyFingerprintSha256:postFp};
 const postWire={review:postReview,signatureBase64:sign(null,signedP6PrivateSourcePostReviewBytes(postReview),pk.privateKey).toString("base64")};
 await publishP6PrivateSourcePostOnce({client:pub,pins:{...qPins,expectedKind:"POST_PACKET",
  expectedLogicalPath:postPath,expectedContentSha256:hash(postBytes),expectedShardIndex:3,
  expectedReviewerPublicKeyFingerprintSha256:postFp},wire:postWire,reviewerPublicKeyPem:postPem,
  packetBytes:postBytes,scope:{privateStoragePublicationApproved:true,separateProviderContentRightsReviewApproved:true,
   existingChildOrPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",
   approvedMainCodeSha:code,expectedPublisherSessionLogin:"phase6_private_publisher_login_ci_epoch",
   approvedRetentionNotAfterUtc:expire,reviewedRightsSha256:rights,externalReviewEvidenceSha256:evidence,
   expectedSourceDayRegistryLogicalPath:d1.path,expectedSourceDayRegistrySha256:hash(d1.payload),
   persistVerifiedReviewWire:true}});
 const postTrust={...trust,independentPostReviewerPinsApproved:true,
  postReviewerFingerprintSha256:postFp,postReviewerPublicKeyPem:postPem};
 const postSelector={kind:"POST",runDayIndex:1,shardIndex:3,logicalPath:postPath,contentSha256:hash(postBytes)};
 const postStored=await readP6StoredPrivateReviewOnce({client:read,trust:postTrust,scope,selector:postSelector});
 assert.deepEqual(postStored.wire,postWire);
 const postVerified=await readP6PrivateSourcePostOnce(read,postStored.pins,postStored.wire,postStored.publicKeyPem);
 assert.deepEqual(postVerified.privateBytes,postBytes);
 assert.equal(postVerified.redactedSummary.kind,"POST_PACKET");
 assert.equal(JSON.stringify(postStored).includes(postWire.signatureBase64),false);
 await assert.rejects(readP6StoredPrivateReviewOnce({client:read,trust,scope,selector:postSelector}));
 await assert.rejects(readP6StoredPrivateReviewOnce({client:read,trust:postTrust,scope,
  selector:{...postSelector,kind:"SOURCE_QUERY"}}),/UNMATCHED_EXACT_SELECTOR/);
 await assert.rejects(readP6StoredPrivateReviewOnce({client:read,trust:postTrust,scope,
  selector:{...postSelector,runDayIndex:2}}),/CROSS_DAY_REVIEW/);
 const postRemoved=await dbOwner.query("DELETE FROM phase6_private.frozen_native_packet_v39 WHERE logical_path=$1",[postPath]);
 assert.equal(postRemoved.rowCount,1);
 await assert.rejects(readP6StoredPrivateReviewOnce({client:read,trust:postTrust,scope,selector:postSelector}),
  /EXACT_COMMITTED_REVIEW_NOT_FOUND/);
 // After publishing r2, the r1 signature is still cryptographically valid.
 // A planner must refuse it; an already-admitted, exact immutable child
 // may still read r1, so new publication does not strand in-flight work.
 await assert.rejects(hydrateP6DayEpochFullRegistriesReadOnly({
  client:read,pins:first.pins,wire:first.wire,publicKeyPem:pem,
  scope:{privateDayRegistryReadOnlyApproved:true,
   existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}
 }),/STALE_OR_MISSING_DAY_REVISION_FOR_PLANNING/);
 const historical=await hydrateP6DayEpochFullRegistriesReadOnly({
  client:read,pins:first.pins,wire:first.wire,publicKeyPem:pem,
  scope:{privateDayRegistryReadOnlyApproved:true,
   existingPaidDispatchApproved:false}
 });
 assert.equal(historical.redactedSummary.indexRevision,1);
 const currentPlanning=await hydrateP6DayEpochFullRegistriesReadOnly({
  client:read,pins:second.pins,wire:second.wire,publicKeyPem:pem,
  scope:{privateDayRegistryReadOnlyApproved:true,
   existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}
 });
 assert.equal(currentPlanning.redactedSummary.indexRevision,2);
 // Physically SELECT both protected SOURCE bytes using the same restricted
 // reader group and one day-scoped signed index. Never print the payload.
 const hydrated=await hydrateP6DayEpochFullRegistriesReadOnly({
  client:read,pins:second.pins,wire:second.wire,publicKeyPem:pem,
  scope:{privateDayRegistryReadOnlyApproved:true,
   existingPaidDispatchApproved:false}
 });
 assert.equal(hydrated.redactedSummary.privateRegistryCount,2);
 assert.equal(hydrated.redactedSummary.actualPrivateRegistryBytesRead,true);
 assert.equal(hydrated.redactedSummary.githubChildDispatches,0);
 assert.deepEqual(hydrated.getFrozen(d1.path),d1.payload);
 assert.deepEqual(hydrated.getFrozen(d2.path),d2.payload);
 assert.deepEqual(Object.keys(hydrated),["redactedSummary"]);
 assert.equal(JSON.stringify(hydrated).includes(d1.path),false);
 assert.equal(JSON.stringify(hydrated).includes("TEST_SYNTHETIC_SOURCE"),false);
 assert.throws(()=>hydrated.getFrozen("unreviewed"),
  /UNSIGNED_PRIVATE_REGISTRY_LOOKUP/);
 await assert.rejects(hydrateP6DayEpochFullRegistriesReadOnly({
  client:read,pins:second.pins,wire:second.wire,publicKeyPem:pem,
  scope:{privateDayRegistryReadOnlyApproved:false,
   existingPaidDispatchApproved:false}
 }),/NO_EXPLICIT_READONLY_APPROVAL/);
 const day31=indexPacket(31,1,[d31.entry],null);
 await publishP6DayEpochIndexRevisionOnce({
  client:pub,pins:day31.pins,wire:day31.wire,
  publicKeyPem:pem,indexBytes:day31.bytes,scope:day31.scope
 });
 const laterDay=await readP6DayEpochIndexCurrentPriorOnce({
  client:read,pins:day31.pins,wire:day31.wire,publicKeyPem:pem
 });
 assert.equal(laterDay.redactedSummary.runDayIndex,31);
 const day31Bytes=await hydrateP6DayEpochFullRegistriesReadOnly({
  client:read,pins:day31.pins,wire:day31.wire,publicKeyPem:pem,
  scope:{privateDayRegistryReadOnlyApproved:true,
   existingPaidDispatchApproved:false}
 });
 assert.equal(day31Bytes.redactedSummary.runDayIndex,31);
 assert.deepEqual(day31Bytes.getFrozen(d31.path),d31.payload);
 // Two short-lived test-only day epochs, published through the genuine
 // publisher. Expire the current head while a previous revision is live.
 // The planner must never select that old live revision while the expired
 // head still exists. A separately admitted exact child may still read it.
 const shortA=registry(3,1),shortB=registry(3,2),shortC=registry(4,1);
 for(const x of [shortA,shortB,shortC]){
  x.entry.notBeforeUtc=t(-14000);x.entry.hardLatestUtc=t(-11000);
  await insertRegistry(x);
 }
 const sa=indexPacket(3,1,[shortA.entry],null);
 await publishP6DayEpochIndexRevisionOnce({client:pub,pins:sa.pins,wire:sa.wire,publicKeyPem:pem,indexBytes:sa.bytes,scope:sa.scope});
 const sb=indexPacket(3,2,[shortA.entry,shortB.entry],sa.bytes),sc=indexPacket(4,1,[shortC.entry],null);
 const localClock=new Date((await dbOwner.query("SELECT clock_timestamp() AS t")).rows[0].t).getTime();
 const shortValid=new Date(localClock+2500).toISOString(),shortRetention=new Date(localClock+4500).toISOString();
 for(const [x,ttl] of [[sb,shortRetention],[sc,expire]]){
  x.review.validUntilUtc=shortValid;x.review.retentionNotAfterUtc=ttl;
  x.wire.signatureBase64=sign(null,p6DayEpochReviewPreimage(x.review),key.privateKey).toString("base64");
  x.scope.approvedRetentionNotAfterUtc=ttl;
  await publishP6DayEpochIndexRevisionOnce({client:pub,pins:x.pins,wire:x.wire,publicKeyPem:pem,indexBytes:x.bytes,scope:x.scope});
 }
 await new Promise(resolve=>setTimeout(resolve,Math.max(0,Date.parse(shortValid)-Date.now()+100)));
 // Independently verified signature expiry is a localized unavailable day,
 // even while its physical storage lifetime remains live.
 for(const day of [3,4])await assert.rejects(readP6StoredPrivateReviewOnce({client:read,trust,scope,
  selector:{kind:"CURRENT_DAY",runDayIndex:day}}),/CURRENT_DAY_NOT_PUBLISHED_OR_RETAINED/);
 await assert.rejects(readP6StoredPrivateReviewOnce({client:read,trust,scope,selector:{kind:"EXACT_DAY",runDayIndex:3,
  indexRevision:2,indexSha256:sb.review.indexSha256}}),/RESTRICTED_READ_OR_SIGNATURE_HOLD_REDACTED/);
 await new Promise(resolve=>setTimeout(resolve,Math.max(0,Date.parse(shortRetention)-Date.now()+100)));
 await assert.rejects(readP6StoredPrivateReviewOnce({client:read,trust,scope,selector:{kind:"CURRENT_DAY",runDayIndex:3}}),
  /CURRENT_DAY_NOT_PUBLISHED_OR_RETAINED/);
 const retainedPrior=await readP6StoredPrivateReviewOnce({client:read,trust,scope,selector:{kind:"EXACT_DAY",runDayIndex:3,
  indexRevision:1,indexSha256:sa.review.indexSha256}});
 assert.equal(retainedPrior.pins.expectedIndexRevision,1);
 await assert.rejects(readP6StoredPrivateReviewOnce({client:read,trust:{...trust,rightsSha256:six("0")},scope,
  selector:{kind:"CURRENT_DAY",runDayIndex:3}}),/DAY_REVISION_OR_STUDY_SELECTOR_DRIFT/);
 const liveNext=await readP6StoredPrivateReviewOnce({client:read,trust,scope,selector:{kind:"CURRENT_DAY",runDayIndex:31}});
 assert.equal(liveNext.pins.expectedRunDayIndex,31);
 console.log("P6_CURRENT_DAY_VERIFIED_EXPIRED_HEAD_LOCAL_SKIP_NO_PREVIOUS_FALLBACK_REAL_PG16_PASS");
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
 // A still-valid signed index is NOT sufficient when a referenced original
 // has disappeared: the full read must fail closed, without any paid call.
 const missing=await dbOwner.query(
  "DELETE FROM phase6_private.frozen_native_packet_v39 WHERE logical_path=$1",
  [d31.path]);
 assert.equal(missing.rowCount,1);
 await assert.rejects(hydrateP6DayEpochFullRegistriesReadOnly({
  client:read,pins:day31.pins,wire:day31.wire,publicKeyPem:pem,
  scope:{privateDayRegistryReadOnlyApproved:true,
   existingPaidDispatchApproved:false}
 }),/INCOMPLETE_OR_OVERSIZE_PRIVATE_DAY_REGISTRY_SET/);
 console.log(JSON.stringify({
  status:"P6_DAY_EPOCH_REAL_RESTRICTED_PG16_PUBLISH_READ_PASS",
  signedDayIndices:[1,31],sourceRegistries:3,
  day1RevisionsBeforeOwnerDeletion:2,
  day31SurvivesDay1PrivateByteDeletion:true,
  immutableDay1ClaimPreventsGenesisReplay:true,
  realExternalEd25519SignatureVerified:true,
  realPg16SourceRoleIsolation:true,
  dayEpochPrivateFullRegistryHydrationVerified:true,
  missingSignedRegistryRefused:true,
  productionDatabaseWrites:0,providerCalls:0,
  phase6PaidGo:false
 }));
}finally{
 await pub.end();await read.end();await dbOwner.end();
}
