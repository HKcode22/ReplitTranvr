/**
 * Phase6 V0096: one externally reviewed, already source-bound signed
 * INDEX revision publisher. NO provider REST, Alert, Stage14, GitHub
 * dispatch, login creation, migration, legal Contents rights attestation.
 *
 * Uses existing V0094/V0095 private frozen registries and V0096 index table
 * on a dedicated restricted INSERT-only publisher. Validates every indexed
 * registry's COMMITTED metadata, source relationships, legal TTL and
 * study identity BEFORE ONE SERIALIZABLE INSERT. Unknown COMMIT = HARD HOLD.
 */
import {createHash} from "node:crypto";
import {verifyP6PrivateSignedIndexExternalReview}
 from "./phase6PrivateSignedIndexReadOnce_v39.mjs";

export const P6_PRIVATE_INDEX_PUBLISH_SCHEMA=
 "v39.phase6.externally-reviewed-private-index-revision-publish-once.v1";
const INDEX="phase6_private.signed_day_shard_index_revision_v39";
const PACKETS="phase6_private.frozen_native_packet_v39";
const ROLE="phase6_private_frozen_publisher_v39";
const LOGIN=/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/;
const SHA=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const LANES={
 SOURCE:"SOURCE_DAY_REGISTRY",
 LATER_PRE:"LATER_PRE_DAY_REGISTRY",
 POST:"POST_PACKET"
};
const MAX7=7*86400000;
const fail=s=>{throw Error("HOLD_P6_SIGNED_PRIVATE_INDEX_PUBLISH_"+s);};
const hash=b=>createHash("sha256").update(b).digest("hex");
const exact=(o,keys)=>o&&typeof o==="object"&&!Array.isArray(o)&&
 Object.keys(o).sort().join("|")===keys.slice().sort().join("|");
const dbClock=x=>{
 const d=x instanceof Date?x:new Date(String(x));
 if(!Number.isFinite(d.getTime()))fail("INVALID_REAL_DATABASE_CLOCK");
 return d.getTime();
};
const exactUtc=s=>{
 if(typeof s!=="string"||!UTC.test(s)||
    !Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)
  fail("INVALID_PROSPECTIVE_SHARD_UTC");
 return Date.parse(s);
};
function parseIndex(bytes,review){
 let idx;
 try{idx=JSON.parse(bytes.toString("utf8"));}
 catch{fail("SIGNED_INDEX_BYTES_NOT_JSON");}
 if(!exact(idx,[
   "schema","manifestSha256","calendarSha256","reviewedCodeSha",
   "reviewedReleaseSha256","reviewedRightsSha256","revision",
   "previousIndexSha256","entries"
 ])||
    idx.schema!=="v39.phase5.phase6-append-only-day-shard-index.v1"||
    idx.revision!==review.indexRevision||
    idx.previousIndexSha256!==review.previousIndexSha256||
    idx.manifestSha256!==review.manifestSha256||
    idx.calendarSha256!==review.calendarSha256||
    idx.reviewedCodeSha!==review.reviewedCodeSha||
    idx.reviewedReleaseSha256!==review.releaseSha256||
    idx.reviewedRightsSha256!==review.rightsSha256||
    !Array.isArray(idx.entries)||idx.entries.length<1||
    idx.entries.length>1024)
  fail("INDEX_JSON_NOT_EXACT_REVIEWED_STUDY");
 const known=new Set(),seenShard=new Set();
 const source=new Map();
 let publicationTime=-Infinity;
 for(const e of idx.entries){
  if(!exact(e,[
    "lane","runDayIndex","shardIndex","filePath","fileSha256",
    "publishedAtUtc","notBeforeUtc","hardLatestUtc",
    "reviewEvidenceSha256","sourceRegistryFilePath",
    "sourceRegistrySha256"
   ])||
    !Object.hasOwn(LANES,e.lane)||
    !Number.isSafeInteger(e.runDayIndex)||e.runDayIndex<1||
    e.runDayIndex>31||
    !Number.isSafeInteger(e.shardIndex)||e.shardIndex<1||
    e.shardIndex>100000||
    !PATH.test(e.filePath??"")||
    !SHA.test(e.fileSha256??"")||
    !SHA.test(e.reviewEvidenceSha256??"")||
    known.has(e.filePath)||
    seenShard.has([e.lane,e.runDayIndex,e.shardIndex].join(":")))
   fail("INDEX_ENTRY_PATH_DAY_OR_SHA_UNTRUSTED");
  const pub=exactUtc(e.publishedAtUtc),
    first=exactUtc(e.notBeforeUtc),
    last=exactUtc(e.hardLatestUtc);
  if(pub>first||publicationTime>pub||
     first>=last||
     last-first>(e.lane==="POST"?60:180)*60000)
   fail("RETROSPECTIVE_OR_UNORDERED_SIGNED_SHARD_WINDOW");
  publicationTime=pub;
  known.add(e.filePath);
  seenShard.add([e.lane,e.runDayIndex,e.shardIndex].join(":"));
  if(e.lane==="SOURCE"){
   if(e.sourceRegistryFilePath!==null||
      e.sourceRegistrySha256!==null)
    fail("SOURCE_SHARD_CANNOT_POINT_TO_SOURCE");
   source.set(e.filePath,e);
  }else if(!PATH.test(e.sourceRegistryFilePath??"")||
            !SHA.test(e.sourceRegistrySha256??""))
   fail("LATER_PRE_OR_POST_MISSING_BOUND_SOURCE");
 }
 for(const e of idx.entries){
  if(e.lane!=="SOURCE"){
   const original=source.get(e.sourceRegistryFilePath);
   if(!original||original.fileSha256!==e.sourceRegistrySha256||
      original.runDayIndex!==e.runDayIndex||
      exactUtc(original.publishedAtUtc)>exactUtc(e.publishedAtUtc))
    fail("CROSS_DAY_OR_UNCOMMITTED_SOURCE_REGISTRY_IDENTITY");
  }
 }
 return idx;
}
export async function publishP6PrivateSignedIndexRevisionOnce({
 client,indexBytes,pins,reviewWire,reviewerPublicKeyPem,scope
}){
 if(!client||typeof client.query!=="function"||
    !pins||pins.privateIndexPublicationApproved!==true||
    !Buffer.isBuffer(indexBytes)||indexBytes.length<100||
    indexBytes.length>1048576||
    !SHA.test(pins.expectedIndexSha256??"")||
    hash(indexBytes)!==pins.expectedIndexSha256||
    !scope||scope.privateIndexStorageApproved!==true||
    scope.independentProviderContentsReviewApproved!==true||
    scope.existingChildPaidDispatchApproved!==false||
    scope.adbAutoCollect!=="0"||
    scope.phase6ProcessArmed!=="0"||
    !LOGIN.test(scope.expectedPublisherSessionLogin??"")||
    scope.approvedMainCodeSha!==pins.expectedReviewedCodeSha||
    scope.approvedRightsSha256!==pins.expectedRightsSha256||
    scope.approvedCalendarSha256!==pins.expectedCalendarSha256||
    scope.approvedRetentionNotAfterUtc!==reviewWire?.review?.retentionNotAfterUtc)
  fail("NO_EXPLICIT_PRIVATE_SOURCE_OR_REVIEW_SCOPE");
 const signed=verifyP6PrivateSignedIndexExternalReview(
  reviewWire,reviewerPublicKeyPem,pins);
 const r=signed.review,idx=parseIndex(indexBytes,r);
 let started=false,commitAttempted=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");
  started=true;
  await client.query("SET LOCAL statement_timeout='30000ms'");
  await client.query("SET LOCAL lock_timeout='3000ms'");
  const identity=await client.query(
   "SELECT current_database() AS db,"+
   "current_setting('server_version_num')::integer AS version,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_catalog.pg_is_in_recovery() AS replica,"+
   "current_user AS actor,session_user AS login,"+
   "clock_timestamp() AS db_now,"+
   "has_table_privilege(current_user,'"+INDEX+"','SELECT') AS select_index,"+
   "has_table_privilege(current_user,'"+INDEX+"','INSERT') AS insert_index,"+
   "has_table_privilege(current_user,'"+INDEX+"','UPDATE') AS update_index,"+
   "has_table_privilege(current_user,'"+INDEX+"','DELETE') AS delete_index,"+
   "has_table_privilege(current_user,'"+PACKETS+"','SELECT') AS select_packet,"+
   "has_table_privilege(current_user,'"+PACKETS+"','INSERT') AS insert_packet,"+
   "has_table_privilege(current_user,'"+PACKETS+"','UPDATE') AS update_packet,"+
   "has_table_privilege(current_user,'"+PACKETS+"','DELETE') AS delete_packet,"+
   "login_role.rolcanlogin AS login_enabled,"+
   "login_role.rolsuper AS login_superuser,"+
   "login_role.rolcreaterole AS login_createrole,"+
   "login_role.rolbypassrls AS login_bypassrls,"+
   "grp.rolcanlogin AS group_login,"+
   "grp.rolsuper AS group_superuser,"+
   "grp.rolbypassrls AS group_bypassrls"+
   " FROM pg_catalog.pg_roles login_role,pg_catalog.pg_roles grp"+
   " WHERE login_role.rolname=session_user AND grp.rolname=current_user"
  );
  const id=identity?.rows?.[0];
  if(identity?.rowCount!==1||!id||
     id.db!=="neondb"||Number(id.version)<160000||
     Number(id.version)>=170000||id.ro!=="off"||
     id.replica!==false||id.actor!==ROLE||
     id.login!==scope.expectedPublisherSessionLogin||
     id.select_index!==true||id.insert_index!==true||
     id.update_index!==false||id.delete_index!==false||
     id.select_packet!==true||id.insert_packet!==true||
     id.update_packet!==false||id.delete_packet!==false||
     id.login_enabled!==true||id.login_superuser!==false||
     id.login_createrole!==false||id.login_bypassrls!==false||
     id.group_login!==false||id.group_superuser!==false||
     id.group_bypassrls!==false)
   fail("NOT_ACTUAL_PG16_RESTRICTED_APPEND_ONLY_PUBLISHER");
  const now=dbClock(id.db_now);
  if(signed.reviewedAtMs>now||signed.validUntilMs<=now||
     signed.expiresMs<=now||signed.expiresMs>now+MAX7)
   fail("INDEX_EXTERNAL_REVIEW_OR_CONTENT_EXPIRY_HOLD");
  const seen=new Set();
  for(const e of idx.entries){
   if(exactUtc(e.publishedAtUtc)>now||
      seen.has(e.filePath))
    fail("LATE_OR_DUPLICATE_PRIVATE_INDEX_ENTRY");
   seen.add(e.filePath);
  }
  const list=idx.entries.map(e=>e.filePath);
  const rows=await client.query(
   "SELECT logical_path,run_day_index,shard_index,kind,"+
   "content_sha256,reviewed_code_sha,manifest_sha256,"+
   "rights_sha256,external_review_sha256,retention_not_after_utc,"+
   "committed_at_utc FROM "+PACKETS+
   " WHERE logical_path=ANY($1::text[])",
   [list]
  );
  if(rows?.rowCount!==list.length||
     !Array.isArray(rows.rows)||rows.rows.length!==list.length)
   fail("NOT_ALL_INDEXED_PRIVATE_REGISTRIES_EXIST");
  const found=new Map(rows.rows.map(row=>[row.logical_path,row]));
  if(found.size!==list.length)
   fail("DUPLICATE_INDEXED_PRIVATE_DB_REGISTRY");
  for(const e of idx.entries){
   const row=found.get(e.filePath);
   if(!row||row.kind!==LANES[e.lane]||
      row.run_day_index!==e.runDayIndex||
      row.shard_index!==e.shardIndex||
      row.content_sha256!==e.fileSha256||
      row.reviewed_code_sha!==r.reviewedCodeSha||
      row.manifest_sha256!==r.manifestSha256||
      row.rights_sha256!==r.rightsSha256||
      row.external_review_sha256!==e.reviewEvidenceSha256||
      dbClock(row.committed_at_utc)>exactUtc(e.publishedAtUtc)||
      dbClock(row.retention_not_after_utc)<signed.expiresMs)
    fail("INDEXED_SOURCE_LATER_POST_NOT_COMMITTED_AT_SIGNED_T");
  }
  const existing=await client.query(
   "SELECT COUNT(*)::integer AS n FROM "+INDEX+
   " WHERE revision=$1",[r.indexRevision]
  );
  if(existing?.rowCount!==1||existing.rows[0]?.n!==0)
   fail("REPEATED_OR_UNKNOWN_COMMITTED_INDEX_REVISION");
  if(r.indexRevision===1){
   const old=await client.query(
    "SELECT COUNT(*)::integer AS n FROM "+INDEX);
   if(old?.rowCount!==1||old.rows[0]?.n!==0)
    fail("GENESIS_NOT_FIRST_PRIVATE_INDEX");
  }else{
   const prior=await client.query(
    "SELECT revision,content_sha256,previous_index_sha256,"+
    "reviewed_code_sha,manifest_sha256,calendar_sha256,"+
    "release_sha256,rights_sha256,retention_not_after_utc,payload_bytes"+
    " FROM "+INDEX+" WHERE revision=$1",[r.indexRevision-1]
   );
   const p=prior?.rows?.[0];
   if(prior?.rowCount!==1||!p||
      p.revision!==r.indexRevision-1||
      p.content_sha256!==r.previousIndexSha256||
      p.reviewed_code_sha!==r.reviewedCodeSha||
      p.manifest_sha256!==r.manifestSha256||
      p.calendar_sha256!==r.calendarSha256||
      p.release_sha256!==r.releaseSha256||
      p.rights_sha256!==r.rightsSha256||
      !Buffer.isBuffer(p.payload_bytes)||
      hash(p.payload_bytes)!==r.previousIndexSha256||
      dbClock(p.retention_not_after_utc)<signed.expiresMs)
    fail("ABSENT_EXPIRED_OR_DRIFTED_COMMITTED_INDEX_PREDECESSOR");
   let oldIndex;
   try{oldIndex=JSON.parse(p.payload_bytes.toString("utf8"));}
   catch{fail("UNPARSEABLE_PREVIOUS_INDEX_BYTES");}
   if(!Array.isArray(oldIndex?.entries)||
      oldIndex.revision!==r.indexRevision-1||
      oldIndex.entries.length>=idx.entries.length||
      oldIndex.entries.some((v,i)=>JSON.stringify(v)!==
       JSON.stringify(idx.entries[i])))
    fail("REWRITTEN_PREVIOUS_SOURCE_PRE_POST_SHARDS");
  }
  const inserted=await client.query(
   "INSERT INTO "+INDEX+" (revision,previous_index_sha256,"+
   "content_sha256,reviewed_code_sha,manifest_sha256,calendar_sha256,"+
   "release_sha256,rights_sha256,external_review_sha256,"+
   "externally_reviewed_at_utc,retention_not_after_utc,payload_bytes)"+
   " VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
   [r.indexRevision,r.previousIndexSha256,r.indexSha256,
    r.reviewedCodeSha,r.manifestSha256,r.calendarSha256,
    r.releaseSha256,r.rightsSha256,r.externalReviewEvidenceSha256,
    r.reviewedAtUtc,r.retentionNotAfterUtc,indexBytes]
  );
  if(inserted?.rowCount!==1)fail("ONE_INDEX_INSERT_UNCERTAIN");
  const endClock=await client.query("SELECT clock_timestamp() AS db_now");
  if(endClock?.rowCount!==1||
     dbClock(endClock.rows[0].db_now)<now||
     dbClock(endClock.rows[0].db_now)>=signed.validUntilMs||
     dbClock(endClock.rows[0].db_now)>=signed.expiresMs)
   fail("PRECOMMIT_SIGNED_INDEX_REVIEW_EXPIRED");
  commitAttempted=true;
  await client.query("COMMIT");
  started=false;
  return Object.freeze({
   schema:P6_PRIVATE_INDEX_PUBLISH_SCHEMA,
   status:"INDEX_REVISION_COMMITTED_INDEPENDENT_READBACK_REQUIRED_NO_GO",
   revision:r.indexRevision,currentIndexSha256:r.indexSha256,
   previousIndexSha256:r.previousIndexSha256,
   signedBoundPrivateRegistryCount:idx.entries.length,
   indexCommitAtomicAndNoRetry:true,
   separateIndependentPostCommitReadbackRequired:true,
   legallyReviewed31DayOriginalContentsByThisCode:false,
   actualFutureSOURCEOrPREProvedByThisCode:false,
   providerCalls:0,githubDispatches:0,
   phase5ScientificFreeze:false,phase6PaidGo:false
  });
 }catch(e){
  if(commitAttempted)
   fail("UNKNOWN_COMMIT_INDEPENDENT_READBACK_NEVER_RETRY");
  if(started)await client.query("ROLLBACK").catch(()=>{});
  if(String(e?.message??"").startsWith("HOLD_P6_SIGNED_PRIVATE_INDEX_PUBLISH_"))
   throw e;
  fail("PRIVATE_PUBLISHER_SQL_OR_SIGNER_FAILURE_REDACTED");
 }
}
