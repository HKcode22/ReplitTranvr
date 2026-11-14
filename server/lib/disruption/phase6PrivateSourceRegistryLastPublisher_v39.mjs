/**
 * Phase6 SOURCE registry-LAST commit to already approved private V0094+V0095.
 * One registry per prospective day/shard, only after exact external Ed25519
 * reviewer and every constituent SOURCE_QUERY_PACKET already committed.
 *
 * No provider HTTP, GH child dispatch, source GET, flight label inference,
 * rights/licensing conclusion, paid GO, DDL or UPDATE/DELETE. Real outputs
 * are SHA/count-only. Unknown COMMIT is a NO RETRY incident.
 */
import {createHash,createPublicKey,verify} from "node:crypto";

export const P6_PRIVATE_SOURCE_REGISTRY_REVIEW_SCHEMA=
 "v39.phase6.external-source-day-registry-review-ed25519.v1";
export const P6_PRIVATE_SOURCE_REGISTRY_PUBLISH_SCHEMA=
 "v39.phase6.private-source-registry-last-publisher.v1";
const DOMAIN="HKcode22/ReplitTranvr:PHASE6_SOURCE_REGISTRY_LAST_EXTERNAL_REVIEW:v1\n";
const AUDIENCE="HKcode22/ReplitTranvr:PHASE6_SOURCE_DAY_REGISTRY_REVIEW_ONLY";
const GROUP="phase6_private_frozen_publisher_v39";
const TABLE="phase6_private.frozen_native_packet_v39";
const SHA=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const SOURCE_PATH=/^data-collection\/phase5\/frozen\/source_[A-Za-z0-9_.-]{8,125}\.json$/;
const PACKET_PATH=/^data-collection\/phase5\/frozen\/sourceq_[A-Za-z0-9_.-]{8,110}\.json$/;
const LOGIN=/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/;
const MAX7=7*86400000;
const fail=code=>{throw Error("HOLD_P6_SOURCE_REGISTRY_LAST_"+code);};
const sha=b=>createHash("sha256").update(b).digest("hex");
const keys=(o,arr)=>o&&typeof o==="object"&&!Array.isArray(o)&&
 Object.keys(o).sort().join("|")===arr.slice().sort().join("|");
function utc(v){
 if(typeof v!=="string"||!UTC.test(v)||
    !Number.isFinite(Date.parse(v))||
    new Date(v).toISOString()!==v)
  fail("BAD_REVIEW_OR_RETENTION_UTC");
 return Date.parse(v);
}
function pgClock(v){
 const t=v instanceof Date?v:new Date(String(v));
 if(!Number.isFinite(t.getTime()))fail("NOT_REAL_PG16_CLOCK");
 return t.getTime();
}
export function sourceDayRegistryReviewPreimage(review){
 if(!review||typeof review!=="object"||Array.isArray(review))
  fail("INVALID_EXTERNAL_SOURCE_REVIEW_OBJECT");
 return Buffer.concat([Buffer.from(DOMAIN,"utf8"),
  Buffer.from(JSON.stringify(review),"utf8")]);
}
export function verifyP6ExternalSourceRegistryLastReview(wire,pem,pins){
 const r=wire?.review;
 if(!pins||pins.independentExternalReviewerSignaturePinsApproved!==true||
    !keys(wire,["review","signatureBase64"])||
    !keys(r,["schema","audience","logicalPath","registrySha256",
      "manifestSha256","calendarSha256","releaseSha256","rightsSha256",
      "reviewedCodeSha","externalReviewEvidenceSha256",
      "entriesDigestSha256","runDayIndex","shardIndex",
      "reviewedAtUtc","validUntilUtc","retentionNotAfterUtc",
      "reviewerPublicKeyFingerprintSha256"])||
    r.schema!==P6_PRIVATE_SOURCE_REGISTRY_REVIEW_SCHEMA||
    r.audience!==AUDIENCE||
    !SOURCE_PATH.test(r.logicalPath??"")||
    ![r.registrySha256,r.manifestSha256,r.calendarSha256,
      r.releaseSha256,r.rightsSha256,r.externalReviewEvidenceSha256,
      r.entriesDigestSha256,r.reviewerPublicKeyFingerprintSha256].every(v=>
      SHA.test(v??""))||
    !CODE.test(r.reviewedCodeSha??"")||
    !Number.isSafeInteger(r.runDayIndex)||r.runDayIndex<1||
    r.runDayIndex>31||
    !Number.isSafeInteger(r.shardIndex)||r.shardIndex<1||
    r.shardIndex>100000||
    r.logicalPath!==pins.expectedRegistryPath||
    r.registrySha256!==pins.expectedRegistrySha256||
    r.manifestSha256!==pins.expectedManifestSha256||
    r.calendarSha256!==pins.expectedCalendarSha256||
    r.releaseSha256!==pins.expectedReleaseSha256||
    r.rightsSha256!==pins.expectedRightsSha256||
    r.reviewedCodeSha!==pins.expectedReviewedMainSha||
    r.externalReviewEvidenceSha256!==pins.expectedReviewEvidenceSha256||
    r.entriesDigestSha256!==pins.expectedEntriesDigestSha256||
    r.reviewerPublicKeyFingerprintSha256!==
      pins.expectedReviewerPublicKeyFingerprintSha256||
    r.runDayIndex!==pins.expectedRunDayIndex||
    r.shardIndex!==pins.expectedShardIndex)
  fail("UNSIGNED_UNPINNED_OR_WRONG_SOURCE_DAY_REGISTRY");
 const t=utc(r.reviewedAtUtc),latest=utc(r.validUntilUtc),
  expire=utc(r.retentionNotAfterUtc);
 if(expire<=t||expire-t>MAX7||latest<=t||latest>expire)
  fail("EXTERNAL_REVIEW_OR_RIGHTS_EXPIRY_UNSAFE");
 try{
  const pub=createPublicKey(pem);
  const fp=sha(pub.export({format:"der",type:"spki"}));
  if(pub.asymmetricKeyType!=="ed25519"||
     fp!==pins.expectedReviewerPublicKeyFingerprintSha256||
     typeof wire.signatureBase64!=="string"||
     !/^[A-Za-z0-9+/]{86}==$/.test(wire.signatureBase64))
   fail("WRONG_REVIEW_SIGNER_OR_SIGNATURE_FORMAT");
  const sig=Buffer.from(wire.signatureBase64,"base64");
  if(sig.length!==64||
     sig.toString("base64")!==wire.signatureBase64||
     !verify(null,sourceDayRegistryReviewPreimage(r),pub,sig))
   fail("EXTERNAL_SOURCE_ED25519_SIGNATURE_INVALID");
 }catch(e){
  if(String(e?.message??"").startsWith("HOLD_P6_SOURCE_REGISTRY_LAST_"))
   throw e;
  fail("BAD_EXTERNAL_SOURCE_REVIEW_KEY_REDACTED");
 }
 return{review:r,reviewedAtMs:t,validUntilMs:latest,expiresMs:expire};
}
export async function publishP6SourceDayRegistryLastOnce({
 client,registryBytes,reviewWire,reviewerPublicKeyPem,
 pins,scope
}){
 if(!client||typeof client.query!=="function"||
    !scope||scope.privateSourceRegistryLastPublicationApproved!==true||
    scope.externallyReviewedContentsUseApproved!==true||
    scope.existingPaidSourceDispatchApproved!==false||
    scope.adbAutoCollect!=="0"||
    scope.phase6ProcessArmed!=="0"||
    !LOGIN.test(scope.expectedPublisherSessionLogin??"")||
    !Buffer.isBuffer(registryBytes)||
    registryBytes.length<100||registryBytes.length>250000||
    !SHA.test(pins?.expectedRegistrySha256??"")||
    sha(registryBytes)!==pins.expectedRegistrySha256)
  fail("NO_PRIVATE_PUBLICATION_SCOPE_OR_BYTE_SHA");
 const external=verifyP6ExternalSourceRegistryLastReview(
  reviewWire,reviewerPublicKeyPem,pins);
 const r=external.review;
 if(scope.approvedRetentionNotAfterUtc!==r.retentionNotAfterUtc||
    scope.approvedCodeSha!==r.reviewedCodeSha||
    scope.approvedManifestSha256!==r.manifestSha256||
    scope.approvedCalendarSha256!==r.calendarSha256||
    scope.approvedReleaseSha256!==r.releaseSha256||
    scope.approvedRightsSha256!==r.rightsSha256)
  fail("CROSS_SCOPE_REVIEW_NOT_INDEPENDENTLY_APPROVED");
 let p;
 try{p=JSON.parse(registryBytes.toString("utf8"));}
 catch{fail("UNPARSEABLE_SOURCE_REGISTRY_JSON");}
 if(!keys(p,["schema","manifestSha256","runDayIndex","entries"])||
    p.schema!=="v39.phase5.signed-per-day-source-batch-readonly.v1"||
    p.manifestSha256!==r.manifestSha256||
    p.runDayIndex!==r.runDayIndex||
    !Array.isArray(p.entries)||p.entries.length<1||p.entries.length>96)
  fail("SOURCE_REGISTRY_SCHEMA_DAY_OR_COUNT_INVALID");
 const seenFiles=new Set(),seenQueries=new Set();
 for(const entry of p.entries){
  if(!keys(entry,["filePath","expectedPacketSha256",
                   "expectedQueryDigestSha256"])||
     !PACKET_PATH.test(entry.filePath??"")||
     !SHA.test(entry.expectedPacketSha256??"")||
     !SHA.test(entry.expectedQueryDigestSha256??"")||
     seenFiles.has(entry.filePath)||
     seenQueries.has(entry.expectedQueryDigestSha256))
   fail("SOURCE_PACKET_REGISTRY_DUPLICATED_OR_UNSCOPED");
  seenFiles.add(entry.filePath);seenQueries.add(entry.expectedQueryDigestSha256);
 }
 // Exact original entry order is part of the review. No re-sorting.
 const digest=sha(Buffer.from(JSON.stringify(p.entries),"utf8"));
 if(digest!==r.entriesDigestSha256)
  fail("SOURCE_QUERY_ENTRY_MANIFEST_NOT_EXTERNALLY_SIGNED");
 let started=false,commitAttempted=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");
  started=true;
  await client.query("SET LOCAL statement_timeout='30000ms'");
  await client.query("SET LOCAL lock_timeout='3000ms'");
  const idRes=await client.query(
   "SELECT current_database() AS db,"+
   "current_setting('server_version_num')::integer AS server_version,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_catalog.pg_is_in_recovery() AS replica,"+
   "current_user AS actor,session_user AS session_login,"+
   "clock_timestamp() AS db_now,"+
   "has_table_privilege(current_user,'"+TABLE+"','SELECT') AS can_select,"+
   "has_table_privilege(current_user,'"+TABLE+"','INSERT') AS can_insert,"+
   "has_table_privilege(current_user,'"+TABLE+"','UPDATE') AS can_update,"+
   "has_table_privilege(current_user,'"+TABLE+"','DELETE') AS can_delete,"+
   "login.rolcanlogin AS login_enabled,"+
   "login.rolsuper AS login_superuser,"+
   "login.rolcreaterole AS login_createrole,"+
   "login.rolbypassrls AS login_bypass_rls,"+
   "grp.rolcanlogin AS group_can_login,"+
   "grp.rolsuper AS group_superuser,"+
   "grp.rolbypassrls AS group_bypass_rls"+
   " FROM pg_catalog.pg_roles login,pg_catalog.pg_roles grp"+
   " WHERE login.rolname=session_user AND grp.rolname=current_user"
  );
  const id=idRes?.rows?.[0];
  if(idRes?.rowCount!==1||!id||
     id.db!=="neondb"||
     Number(id.server_version)<160000||Number(id.server_version)>=170000||
     id.ro!=="off"||id.replica!==false||
     id.actor!==GROUP||
     id.session_login!==scope.expectedPublisherSessionLogin||
     id.login_enabled!==true||id.login_superuser!==false||
     id.login_createrole!==false||id.login_bypass_rls!==false||
     id.group_can_login!==false||id.group_superuser!==false||
     id.group_bypass_rls!==false||
     id.can_select!==true||id.can_insert!==true||
     id.can_update!==false||id.can_delete!==false)
   fail("NOT_REAL_RESTRICTED_PG16_PUBLISHER");
  const now=pgClock(id.db_now);
  if(external.reviewedAtMs>now||
     external.validUntilMs<=now||
     external.expiresMs<=now||
     external.expiresMs>now+MAX7)
   fail("SOURCE_REVIEW_EXPIRED_OR_RETENTION_NOT_APPROVED");
  const dup=await client.query(
   "SELECT COUNT(*)::integer AS n FROM "+TABLE+
   " WHERE logical_path=$1",[r.logicalPath]
  );
  if(dup?.rowCount!==1||dup.rows[0]?.n!==0)
   fail("SOURCE_REGISTRY_ALREADY_COMMITTED_NEVER_REPLAY");
  const rows=await client.query(
   "SELECT logical_path,run_day_index,kind,content_sha256,"+
   "reviewed_code_sha,manifest_sha256,rights_sha256,"+
   "retention_not_after_utc,committed_at_utc"+
   " FROM "+TABLE+" WHERE logical_path=ANY($1::text[])",
   [p.entries.map(x=>x.filePath)]
  );
  if(rows?.rowCount!==p.entries.length||
     !Array.isArray(rows.rows)||rows.rows.length!==p.entries.length)
   fail("SOURCE_QUERY_PACKET_SET_NOT_FULLY_PUBLISHED");
  const byPath=new Map(rows.rows.map(x=>[x.logical_path,x]));
  if(byPath.size!==p.entries.length)
   fail("DUPLICATE_OR_CONFLICTED_PRIVATE_SOURCE_PACKET");
  for(const e of p.entries){
   const v=byPath.get(e.filePath);
   if(!v||v.kind!=="SOURCE_QUERY_PACKET"||
      v.run_day_index!==r.runDayIndex||
      v.content_sha256!==e.expectedPacketSha256||
      v.reviewed_code_sha!==r.reviewedCodeSha||
      v.manifest_sha256!==r.manifestSha256||
      v.rights_sha256!==r.rightsSha256||
      pgClock(v.committed_at_utc)>now||
      pgClock(v.retention_not_after_utc)<external.expiresMs)
    fail("SOURCE_PACKET_NOT_EXACT_APPROVED_UTC_DAY_OR_RIGHTS");
  }
  const put=await client.query(
   "INSERT INTO "+TABLE+
   " (logical_path,run_day_index,shard_index,kind,content_sha256,"+
   "reviewed_code_sha,manifest_sha256,rights_sha256,"+
   "external_review_sha256,externally_reviewed_at_utc,"+
   "retention_not_after_utc,payload_bytes)"+
   " VALUES ($1,$2,$3,'SOURCE_DAY_REGISTRY',$4,$5,$6,$7,$8,$9,$10,$11)",
   [r.logicalPath,r.runDayIndex,r.shardIndex,r.registrySha256,
    r.reviewedCodeSha,r.manifestSha256,r.rightsSha256,
    r.externalReviewEvidenceSha256,r.reviewedAtUtc,
    r.retentionNotAfterUtc,registryBytes]
  );
  if(put?.rowCount!==1)
   fail("SOURCE_REGISTRY_LAST_INSERT_NOT_CONFIRMED");
  const last=await client.query("SELECT clock_timestamp() AS db_now");
  if(last?.rowCount!==1||
     pgClock(last.rows[0].db_now)<now||
     pgClock(last.rows[0].db_now)>=external.validUntilMs||
     pgClock(last.rows[0].db_now)>=external.expiresMs)
   fail("PRECOMMIT_SOURCE_REVIEW_EXPIRED_OR_DB_CLOCK_CHANGED");
  commitAttempted=true;
  await client.query("COMMIT");
  started=false;
  return Object.freeze({
   schema:P6_PRIVATE_SOURCE_REGISTRY_PUBLISH_SCHEMA,
   status:"EXTERNALLY_REVIEWED_SOURCE_REGISTRY_COMMITTED_READBACK_REQUIRED_NO_GO",
   registrySha256:r.registrySha256,
   runDayIndex:r.runDayIndex,shardIndex:r.shardIndex,
   boundSourceQueryPacketCount:p.entries.length,
   appendOnlyRegistryInsertedLast:true,
   independentPostCommitReadbackRequired:true,
   paidSourceChildOrOriginalGETDispatched:false,
   contentsRightsOrExternalReviewerIndependenceCertifiedHere:false,
   providerCalls:0,githubDispatches:0,
   phase5ScientificFreeze:false,phase6PaidGo:false
  });
 }catch(e){
  if(commitAttempted)
   fail("UNKNOWN_COMMIT_INDEPENDENT_READBACK_NEVER_RETRY");
  if(started)await client.query("ROLLBACK").catch(()=>{});
  if(String(e?.message??"").startsWith("HOLD_P6_SOURCE_REGISTRY_LAST_"))
   throw e;
  fail("PRIVATE_SOURCE_REGISTRY_SQL_OR_AUTH_HOLD_REDACTED");
 }
}
