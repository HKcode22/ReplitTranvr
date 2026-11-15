/**
 * One bounded SOURCE shard publication, reusing existing V0095/V0098
 * immutable publishers and separately authenticated restricted readers.
 * No provider, GitHub dispatch, signing keys, or scientific/paid GO.
 * Existing committed packets are independently read back, never reinserted.
 * An ambiguous commit stops this invocation. Explicit separately approved
 * recovery must re-read the exact shard with a fresh restricted reader.
 * The caller must supply already independently signed exact bytes.
 */
import {createHash} from "node:crypto";
import {verifyP6ExternalSourcePostReview,readP6PrivateSourcePostOnce}
 from "./phase6PrivateSourcePostReadOnce_v39.mjs";
import {publishP6PrivateSourcePostOnce}
 from "./phase6PrivateSourcePostPublisherOnce_v39.mjs";
import {readP6StoredPrivateReviewOnce} from "./phase6StoredPrivateReviewReadOnce_v39.mjs";
import {readP6DayEpochRestrictedReaderClock} from "./phase6DayEpochSignedIndexOnce_v39.mjs";
import {verifyP6ExternalSourceRegistryLastReview,publishP6SourceDayRegistryLastOnce}
 from "./phase6PrivateSourceRegistryLastPublisher_v39.mjs";
const TABLE="phase6_private.frozen_native_packet_v39";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const QUERY=/^data-collection\/phase5\/frozen\/sourceq_[A-Za-z0-9_.-]{8,110}\.json$/;
const REG=/^data-collection\/phase5\/frozen\/source_[A-Za-z0-9_.-]{8,125}\.json$/;
const LOGIN=/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/;
const READ=/^phase6_private_reader_login_[a-z0-9_]{6,50}$/;
const fail=s=>{throw Error("HOLD_P6_STORED_SOURCE_SHARD_"+s);};
const h=b=>createHash("sha256").update(b).digest("hex");
const keys=(x,k)=>x&&typeof x==="object"&&!Array.isArray(x)&&
 Object.keys(x).sort().join("|")===k.slice().sort().join("|");
function utc(s){
 if(typeof s!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)||
    !Number.isFinite(Date.parse(s))||new Date(s).toISOString()!==s)
  fail("INVALID_REVIEW_OR_DB_UTC");
 return Date.parse(s);
}
function at(s){
 const t=s instanceof Date?s:new Date(String(s));
 if(!Number.isFinite(t.getTime()))fail("INVALID_DB_TIME");
 return t.toISOString();
}
function json(bytes,max){
 if(!Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>max)
  fail("INVALID_PRIVATE_PACKET_SIZE");
 try{return JSON.parse(bytes.toString("utf8"));}
 catch{fail("INVALID_PRIVATE_PACKET_JSON");}
}
function live(review,now,expiry){
 if(utc(review.reviewedAtUtc)>now||utc(review.validUntilUtc)<=now||
    utc(review.retentionNotAfterUtc)<=now||utc(review.retentionNotAfterUtc)>expiry)
  fail("EXTERNAL_REVIEW_NOT_LIVE_OR_RETENTION_BOUND");
}
function prepare({trust,scope,registryBytes,registryReviewWire,queryPackets}){
 if(scope?.privateSourceShardPublicationApproved!==true||
    scope.separateProviderContentRightsReviewApproved!==true||
    scope.existingPaidDispatchApproved!==false||
    scope.adbAutoCollect!=="0"||scope.phase6ProcessArmed!=="0"||
    typeof scope.resumeFromIndependentReadbackApproved!=="boolean"||
    !LOGIN.test(scope.expectedPublisherSessionLogin??"")||
    !SHA.test(scope.expectedProviderContractSha256??"")||
    trust?.independentStudyTrustPinsApproved!==true||
    !READ.test(trust.expectedReaderSessionLogin??"")||
    !CODE.test(trust.reviewedCodeSha??"")||
    ![trust.manifestSha256,trust.calendarSha256,trust.releaseSha256,trust.rightsSha256,
      trust.dayReviewerFingerprintSha256,trust.queryReviewerFingerprintSha256,trust.registryReviewerFingerprintSha256]
      .every(x=>typeof x==="string"&&SHA.test(x))||
    typeof trust.queryReviewerPublicKeyPem!=="string"||trust.queryReviewerPublicKeyPem.length>4096||
    typeof trust.registryReviewerPublicKeyPem!=="string"||trust.registryReviewerPublicKeyPem.length>4096)
  fail("NO_SEPARATE_PUBLICATION_SCOPE_AND_PINNED_REVIEWERS");
 const expiry=utc(scope.approvedRetentionNotAfterUtc);
 const r=registryReviewWire?.review;
 const registry=json(registryBytes,100000);
 if(!keys(registry,["schema","manifestSha256","runDayIndex","entries"])||
    registry.schema!=="v39.phase5.signed-per-day-source-batch-readonly.v1"||
    registry.manifestSha256!==trust.manifestSha256||
    registry.runDayIndex!==scope.expectedRunDayIndex||
    !Number.isSafeInteger(scope.expectedRunDayIndex)||scope.expectedRunDayIndex<1||scope.expectedRunDayIndex>31||
    !Number.isSafeInteger(scope.expectedShardIndex)||scope.expectedShardIndex<1||scope.expectedShardIndex>100000||
    !REG.test(scope.expectedRegistryPath??"")||!SHA.test(scope.expectedRegistrySha256??"")||
    h(registryBytes)!==scope.expectedRegistrySha256||
    !Array.isArray(registry.entries)||registry.entries.length<1||registry.entries.length>96||
    !Array.isArray(queryPackets)||queryPackets.length!==registry.entries.length)
  fail("EXACT_BOUNDED_SIGNED_SOURCE_SHARD_REQUIRED");
 const regPins={
  independentExternalReviewerSignaturePinsApproved:true,
  expectedRegistryPath:scope.expectedRegistryPath,expectedRegistrySha256:scope.expectedRegistrySha256,
  expectedManifestSha256:trust.manifestSha256,expectedCalendarSha256:trust.calendarSha256,
  expectedReleaseSha256:trust.releaseSha256,expectedRightsSha256:trust.rightsSha256,
  expectedReviewedMainSha:trust.reviewedCodeSha,expectedReviewEvidenceSha256:r?.externalReviewEvidenceSha256,
  expectedEntriesDigestSha256:h(Buffer.from(JSON.stringify(registry.entries))),
  expectedReviewerPublicKeyFingerprintSha256:trust.registryReviewerFingerprintSha256,
  expectedRunDayIndex:scope.expectedRunDayIndex,expectedShardIndex:scope.expectedShardIndex
 };
 verifyP6ExternalSourceRegistryLastReview(registryReviewWire,trust.registryReviewerPublicKeyPem,regPins);
 const paths=new Set(),digests=new Set(),packets=[];
 for(let i=0;i<registry.entries.length;i++){
  const e=registry.entries[i],q=queryPackets[i],w=q?.wire?.review;
  if(!keys(e,["filePath","expectedPacketSha256","expectedQueryDigestSha256"])||
     !QUERY.test(e.filePath??"")||paths.has(e.filePath)||
     !SHA.test(e.expectedPacketSha256??"")||!SHA.test(e.expectedQueryDigestSha256??"")||
     digests.has(e.expectedQueryDigestSha256)||!keys(q,["bytes","wire"]))
   fail("DUPLICATE_OR_UNSCOPED_REGISTRY_ENTRY");
  paths.add(e.filePath);digests.add(e.expectedQueryDigestSha256);
  const p=json(q.bytes,200000),a=p?.plan?.acquisition;
  // Validate actual native packet envelope and original query/plan
  // identity before the very first publication. Paid child still checks
  // complete plan geometry, committed PREPARED row, timing and spend.
  if(h(q.bytes)!==e.expectedPacketSha256||
     !keys(p,["schema","manifestSha256","queryDigestSha256","plan"])||
     p.schema!=="v39.phase5.github-source-one-query-template.v2"||
     p.manifestSha256!==trust.manifestSha256||p.queryDigestSha256!==e.expectedQueryDigestSha256||
     p.plan?.day?.runDayIndex!==scope.expectedRunDayIndex||
     p.plan?.reviewedReleaseSha256!==trust.releaseSha256||
     p.plan?.reviewedProviderRightsSha256!==trust.rightsSha256||
     p.plan?.openapiSha256!==scope.expectedProviderContractSha256||
     p.plan?.independentlyApprovedSourceAndRetention!==true||
     p.plan?.githubOnlyOwnerApproved!==true||
     !SHA.test(p.plan?.expectedEarlyDrawSha256??"")||
     a?.runDayIndex!==scope.expectedRunDayIndex||
     a?.providerQueryDirection!=="Departure"||a?.maxAttempts!==1||a?.apiUnitsPerAttempt!==2||
     !["HUB","MID_A","MID_B","REGIONAL"].includes(a?.slot)||
     !["T-24h","T-6h","T-90m"].includes(a?.horizon)||
     !/^[A-Z]{4}$/.test(a?.icao??"")||
     utc(a.scheduledRequestUtc)>=utc(a.earliestPlannedCutoffUtc))
   fail("SOURCE_PACKET_DOES_NOT_MATCH_SIGNED_REGISTRY_ENTRY");
  const pins={independentExternalReviewerSignaturePinsApproved:true,privateSourcePostPublishApproved:true,
   expectedKind:"SOURCE_QUERY_PACKET",expectedLogicalPath:e.filePath,
   expectedReviewedMainSha:trust.reviewedCodeSha,expectedManifestSha256:trust.manifestSha256,
   expectedRightsSha256:trust.rightsSha256,expectedContentSha256:e.expectedPacketSha256,
   expectedExternalReviewEvidenceSha256:w?.externalReviewEvidenceSha256,
   expectedReviewerPublicKeyFingerprintSha256:trust.queryReviewerFingerprintSha256,
   expectedRunDayIndex:scope.expectedRunDayIndex,expectedShardIndex:scope.expectedShardIndex};
  verifyP6ExternalSourcePostReview(q.wire,trust.queryReviewerPublicKeyPem,pins);
  if(utc(w.retentionNotAfterUtc)<utc(r.retentionNotAfterUtc)||
     utc(w.validUntilUtc)<utc(r.validUntilUtc))
   fail("QUERY_REVIEW_WINDOW_SHORTER_THAN_REGISTRY");
  packets.push({e,bytes:q.bytes,wire:q.wire,pins,review:w});
 }
 return{r,registry,regPins,packets,expiry};
}
async function snapshot(client,trust,paths){
 let tx=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await client.query("SET LOCAL statement_timeout='8000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const now=await readP6DayEpochRestrictedReaderClock(client,trust.expectedReaderSessionLogin);
  const res=await client.query("SELECT logical_path FROM "+TABLE+" WHERE logical_path=ANY($1::text[])",[paths]);
  if(!Number.isSafeInteger(res?.rowCount)||res.rowCount<0||res.rowCount>paths.length||
     !Array.isArray(res.rows)||res.rows.length!==res.rowCount||
     res.rows.some(x=>!paths.includes(x.logical_path))||
     new Set(res.rows.map(x=>x.logical_path)).size!==res.rows.length)
   fail("INCOMPLETE_PRIVATE_EXISTENCE_SNAPSHOT");
  await client.query("ROLLBACK");tx=false;
  return{now,present:new Set(res.rows.map(x=>x.logical_path))};
 }finally{if(tx)await client.query("ROLLBACK");}
}
async function verifyQuery(client,trust,p){
 const q=await readP6StoredPrivateReviewOnce({client,trust,
  scope:{privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false},
  selector:{kind:"SOURCE_QUERY",runDayIndex:p.review.runDayIndex,shardIndex:p.review.shardIndex,
   logicalPath:p.e.filePath,contentSha256:p.e.expectedPacketSha256}});
 if(JSON.stringify(q.wire)!==JSON.stringify(p.wire))
  fail("EXISTING_QUERY_REVIEW_DIFFERS_NO_REPLAY");
 const read=await readP6PrivateSourcePostOnce(client,q.pins,q.wire,q.publicKeyPem);
 if(!Buffer.isBuffer(read.privateBytes)||!read.privateBytes.equals(p.bytes))
  fail("EXISTING_QUERY_BYTES_DIFFER_NO_REPLAY");
}
async function verifyRegistry(client,trust,plan,registryBytes,reattested=false){
 const r=plan.r;
 let tx=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await client.query("SET LOCAL statement_timeout='8000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const now=await readP6DayEpochRestrictedReaderClock(client,trust.expectedReaderSessionLogin);
  live(r,utc(now),plan.expiry);
  const res=await client.query("SELECT logical_path,run_day_index,shard_index,kind,content_sha256,"+
   "reviewed_code_sha,manifest_sha256,rights_sha256,external_review_sha256,externally_reviewed_at_utc,"+
   "retention_not_after_utc,committed_at_utc,payload_bytes FROM "+TABLE+" WHERE logical_path=$1",[r.logicalPath]);
  const q=res?.rows?.[0];
  if(res?.rowCount!==1||res.rows.length!==1||!q||
     q.logical_path!==r.logicalPath||q.kind!=="SOURCE_DAY_REGISTRY"||
     q.run_day_index!==r.runDayIndex||q.shard_index!==r.shardIndex||q.content_sha256!==r.registrySha256||
     q.reviewed_code_sha!==r.reviewedCodeSha||q.manifest_sha256!==r.manifestSha256||
     q.rights_sha256!==r.rightsSha256||q.external_review_sha256!==r.externalReviewEvidenceSha256||
     (!reattested&&at(q.externally_reviewed_at_utc)!==r.reviewedAtUtc)||at(q.retention_not_after_utc)!==r.retentionNotAfterUtc||
     (reattested?(utc(at(q.externally_reviewed_at_utc))>utc(at(q.committed_at_utc))||utc(at(q.committed_at_utc))>utc(r.reviewedAtUtc)):
     utc(at(q.committed_at_utc))<utc(r.reviewedAtUtc))||utc(at(q.committed_at_utc))>utc(now)||
     !Buffer.isBuffer(q.payload_bytes)||!q.payload_bytes.equals(registryBytes))
   fail("REGISTRY_INDEPENDENT_READBACK_DRIFT");
  await client.query("ROLLBACK");tx=false;
  return{registryCommittedAtUtc:at(q.committed_at_utc),registryReadbackDbClockUtc:now};
 }finally{if(tx)await client.query("ROLLBACK");}
}
/**
 * Only independently approved immutable bundle bytes and separate restricted
 * publisher + reader clients. No credential or private key accepted here.
 * Result contains no raw packet/private path. Index must be separately built
 * and signed AFTER registry readback, never pre-sign a future commit time.
 */
export async function publishP6StoredSourceShardOnce(args){
 const {publisherClient:pub,readerClient:reader,trust,scope,registryBytes,registryReviewWire}=args??{};
 if(!pub||!reader||pub===reader||typeof pub.query!=="function"||typeof reader.query!=="function")
  fail("SEPARATE_RESTRICTED_PUBLISHER_AND_READER_REQUIRED");
 let attempted=false;
 try{
  const p=prepare(args),r=p.r;
  const before=await snapshot(reader,trust,[r.logicalPath,...p.packets.map(x=>x.e.filePath)]);
  const now=utc(before.now);
  live(r,now,p.expiry);
  for(const q of p.packets)live(q.review,now,p.expiry);
  const registryAlready=before.present.has(r.logicalPath);
  const reattested=scope.registryReattestationFromCommittedRowApproved===true;
  if(reattested&&(!registryAlready||!scope.resumeFromIndependentReadbackApproved))
   fail("REGISTRY_REATTESTATION_REQUIRES_EXISTING_ROW_AND_RECOVERY_APPROVAL");
  const existing=p.packets.filter(q=>before.present.has(q.e.filePath));
  if(registryAlready&&existing.length!==p.packets.length)
   fail("COMMITTED_REGISTRY_MISSING_CONSTITUENT_NO_BACKFILL");
  if(before.present.size>0&&!scope.resumeFromIndependentReadbackApproved)
   fail("PRIOR_PUBLICATION_REQUIRES_SEPARATE_READBACK_RECOVERY_APPROVAL");
  // Prove every already present query before ANY new write.
  for(const q of existing)await verifyQuery(reader,trust,q);
  let insertedQueryCount=0;
  for(const q of p.packets){
   if(before.present.has(q.e.filePath))continue;
   attempted=true;
   await publishP6PrivateSourcePostOnce({client:pub,pins:q.pins,wire:q.wire,
    reviewerPublicKeyPem:trust.queryReviewerPublicKeyPem,packetBytes:q.bytes,scope:{
     privateStoragePublicationApproved:true,separateProviderContentRightsReviewApproved:true,
     existingChildOrPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",
     approvedMainCodeSha:trust.reviewedCodeSha,expectedPublisherSessionLogin:scope.expectedPublisherSessionLogin,
     approvedRetentionNotAfterUtc:q.review.retentionNotAfterUtc,reviewedRightsSha256:trust.rightsSha256,
     externalReviewEvidenceSha256:q.review.externalReviewEvidenceSha256,
     expectedSourceDayRegistryLogicalPath:null,expectedSourceDayRegistrySha256:null,persistVerifiedReviewWire:true
    }});
   await verifyQuery(reader,trust,q);insertedQueryCount++;
  }
  if(!registryAlready){
   attempted=true;
   await publishP6SourceDayRegistryLastOnce({client:pub,registryBytes,reviewWire:registryReviewWire,
    reviewerPublicKeyPem:trust.registryReviewerPublicKeyPem,pins:p.regPins,scope:{
     privateSourceRegistryLastPublicationApproved:true,externallyReviewedContentsUseApproved:true,
     existingPaidSourceDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",
     expectedPublisherSessionLogin:scope.expectedPublisherSessionLogin,
     approvedRetentionNotAfterUtc:r.retentionNotAfterUtc,approvedCodeSha:trust.reviewedCodeSha,
     approvedManifestSha256:trust.manifestSha256,approvedCalendarSha256:trust.calendarSha256,
     approvedReleaseSha256:trust.releaseSha256,approvedRightsSha256:trust.rightsSha256,
     requireStoredQueryReviews:true,storedQueryReviewTrust:trust
    }});
  }
  const verified=await verifyRegistry(reader,trust,p,registryBytes,reattested);
  return Object.freeze({schema:"v39.phase6.stored-source-shard-publication.v1",
   status:"EXACT_SOURCE_SHARD_QUERY_FIRST_REGISTRY_LAST_READBACK_NO_GO",
   runDayIndex:r.runDayIndex,shardIndex:r.shardIndex,registrySha256:r.registrySha256,
   independentlyReadBackQueryCount:p.packets.length,existingQueryCount:existing.length,
   insertedQueryCount,insertedRegistryCount:registryAlready?0:1,
   registryFreshlyReattestedNotOriginalSignature:reattested,
   ...verified,registryValidUntilUtc:r.validUntilUtc,registryRetentionNotAfterUtc:r.retentionNotAfterUtc,
   separateSignedDayIndexPublicationStillRequired:true,providerCalls:0,githubDispatches:0,
   paidPhase6Go:false,phase5ScientificFreeze:false});
 }catch(e){
  // An unknown write/COMMIT or post-commit readback stops this invocation.
  // No loop-level retry or catch-and-continue. Even known partial writes
  // require fresh scoped readback before any new publication.
  if(attempted)fail("PARTIAL_OR_UNKNOWN_PUBLICATION_READBACK_REQUIRED_NO_REPLAY");
  if(/^HOLD_P6_STORED_SOURCE_SHARD_[A-Z0-9_]+$/.test(e?.message??""))throw e;
  fail("AUTHENTICATED_PUBLICATION_PREFLIGHT_HOLD_REDACTED");
 }
}
