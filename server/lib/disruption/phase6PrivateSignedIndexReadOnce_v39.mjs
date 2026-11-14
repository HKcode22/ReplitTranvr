/**
 * Phase6 V0096 signed index CURRENT+PRIOR private PG16 read-once.
 *
 * Strictly NONPAID and READ ONLY. Externally pre-pinned Ed25519 reviewer,
 * actual private byte SHA, same-study revision history, PG16 role/clock/TTL.
 * Returns private raw index bytes as NONENUMERABLE Buffers. NEVER log them,
 * send to PUBLIC GitHub, or treat the receipt as paid/source/Contents rights.
 *
 * Not yet an existing GitHub SOURCE/PRE/POST child adapter; real packet
 * hydration and independent study releases remain separate.
 */
import {createHash,createPublicKey,verify} from "node:crypto";

export const P6_INDEX_REVIEW_SCHEMA=
 "v39.phase6.external-signed-index-revision-review-ed25519.v1";
export const P6_INDEX_REVIEW_AUDIENCE=
 "HKcode22/ReplitTranvr:PHASE6_SIGNED_INDEX_REVISION_EXTERNAL_REVIEW";
export const P6_INDEX_READ_SCHEMA=
 "v39.phase6.private-signed-index-current-prior-pg16-read-once.v1";

const DOMAIN="HKcode22/ReplitTranvr:PHASE6_SIGNED_INDEX_REVISION_EXTERNAL_REVIEW:v1\n";
const TABLE="phase6_private.signed_day_shard_index_revision_v39";
const PACKETS="phase6_private.frozen_native_packet_v39";
const GROUP="phase6_private_frozen_reader_v39";
const LOGIN=/^phase6_private_reader_login_[a-z0-9_]{6,50}$/;
const SHA=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const MAX7=7*86400000,MAX_INDEX_BYTES=1048576;
const fail=s=>{throw Error("HOLD_P6_SIGNED_PRIVATE_INDEX_READ_"+s);};
const hash=b=>createHash("sha256").update(b).digest("hex");
const shape=(o,keys)=>o&&typeof o==="object"&&!Array.isArray(o)&&
 Object.keys(o).sort().join("|")===keys.slice().sort().join("|");
function utc(t){
 if(typeof t!=="string"||!ISO.test(t)||
    !Number.isFinite(Date.parse(t))||
    new Date(t).toISOString()!==t)
  fail("EXTERNAL_REVIEW_UTC_INVALID");
 return Date.parse(t);
}
function dbTime(t){
 const d=t instanceof Date?t:new Date(String(t));
 if(!Number.isFinite(d.getTime()))fail("INVALID_AUTHENTIC_DATABASE_TIME");
 return d.toISOString();
}
export function p6SignedIndexReviewPreimage(review){
 if(!review||typeof review!=="object"||Array.isArray(review))
  fail("EXTERNAL_REVIEW_NOT_OBJECT");
 return Buffer.concat([
  Buffer.from(DOMAIN,"utf8"),Buffer.from(JSON.stringify(review),"utf8")
 ]);
}
export function verifyP6PrivateSignedIndexExternalReview(wire,pem,pins){
 const r=wire?.review;
 if(!pins||
    pins.independentExternalReviewerSignaturePinsApproved!==true||
    !shape(wire,["review","signatureBase64"])||
    !shape(r,[
      "schema","audience","indexRevision","indexSha256",
      "previousIndexSha256","reviewedCodeSha","manifestSha256",
      "calendarSha256","releaseSha256","rightsSha256",
      "externalReviewEvidenceSha256","reviewedAtUtc","validUntilUtc",
      "retentionNotAfterUtc","reviewerPublicKeyFingerprintSha256"
    ])||
    r.schema!==P6_INDEX_REVIEW_SCHEMA||
    r.audience!==P6_INDEX_REVIEW_AUDIENCE||
    !Number.isSafeInteger(r.indexRevision)||r.indexRevision<1||
    r.indexRevision>1024||
    !SHA.test(r.indexSha256??"")||
    (r.indexRevision===1?r.previousIndexSha256!==null:
      !SHA.test(r.previousIndexSha256??""))||
    !CODE.test(r.reviewedCodeSha??"")||
    ![r.manifestSha256,r.calendarSha256,r.releaseSha256,
      r.rightsSha256,r.externalReviewEvidenceSha256,
      r.reviewerPublicKeyFingerprintSha256].every(v=>SHA.test(v??""))||
    r.indexRevision!==pins.expectedIndexRevision||
    r.indexSha256!==pins.expectedIndexSha256||
    r.previousIndexSha256!==pins.expectedPreviousIndexSha256||
    r.reviewedCodeSha!==pins.expectedReviewedCodeSha||
    r.manifestSha256!==pins.expectedManifestSha256||
    r.calendarSha256!==pins.expectedCalendarSha256||
    r.releaseSha256!==pins.expectedReleaseSha256||
    r.rightsSha256!==pins.expectedRightsSha256||
    r.externalReviewEvidenceSha256!==pins.expectedExternalReviewEvidenceSha256||
    r.reviewerPublicKeyFingerprintSha256!==
     pins.expectedReviewerPublicKeyFingerprintSha256)
  fail("UNSIGNED_UNPINNED_OR_WRONG_INDEX_REVIEW");
 const t=utc(r.reviewedAtUtc),valid=utc(r.validUntilUtc),
   expires=utc(r.retentionNotAfterUtc);
 if(expires<=t||expires-t>MAX7||valid<=t||valid>expires)
  fail("REVIEW_OR_PRIVATE_INDEX_RETENTION_WINDOW_UNSAFE");
 try{
  const pub=createPublicKey(pem);
  const fp=hash(pub.export({type:"spki",format:"der"}));
  if(pub.asymmetricKeyType!=="ed25519"||
     fp!==pins.expectedReviewerPublicKeyFingerprintSha256||
     typeof wire.signatureBase64!=="string"||
     !/^[A-Za-z0-9+/]{86}==$/.test(wire.signatureBase64))
   fail("WRONG_ED25519_SIGNER_OR_SIGNATURE_FORMAT");
  const sig=Buffer.from(wire.signatureBase64,"base64");
  if(sig.length!==64||
     sig.toString("base64")!==wire.signatureBase64||
     !verify(null,p6SignedIndexReviewPreimage(r),pub,sig))
   fail("WRONG_ED25519_INDEX_REVIEW_SIGNATURE");
 }catch(e){
  if(String(e?.message??"").startsWith("HOLD_P6_SIGNED_PRIVATE_INDEX_READ_"))
   throw e;
  fail("INVALID_EXTERNAL_ED25519_REVIEW_KEY");
 }
 return{
  review:r,reviewedAtMs:t,validUntilMs:valid,expiresMs:expires,
  verifiedEd25519Signature:true,
  reviewerOrganizationalIndependenceCertified:false,
  providerContentsUseAnd31DayRightsCertified:false
 };
}
function parseExactIndex(raw,row,review,now,expectedRevision,expectedSha){
 if(!row||row.revision!==expectedRevision||
    !Buffer.isBuffer(raw)||raw.length<100||
    raw.length>MAX_INDEX_BYTES||
    row.content_sha256!==expectedSha||hash(raw)!==expectedSha||
    row.reviewed_code_sha!==review.reviewedCodeSha||
    row.manifest_sha256!==review.manifestSha256||
    row.calendar_sha256!==review.calendarSha256||
    row.release_sha256!==review.releaseSha256||
    row.rights_sha256!==review.rightsSha256||
    Date.parse(dbTime(row.retention_not_after_utc))<=now||
    Date.parse(dbTime(row.committed_at_utc))>now)
  fail("PRIVATE_INDEX_ROW_SHA_STUDY_OR_LAWFUL_EXPIRY_MISMATCH");
 let idx;
 try{idx=JSON.parse(raw.toString("utf8"));}
 catch{fail("PRIVATE_INDEX_NOT_JSON");}
 if(!shape(idx,[
   "schema","manifestSha256","calendarSha256","reviewedCodeSha",
   "reviewedReleaseSha256","reviewedRightsSha256","revision",
   "previousIndexSha256","entries"
 ])||
    idx.schema!=="v39.phase5.phase6-append-only-day-shard-index.v1"||
    idx.revision!==expectedRevision||
    idx.previousIndexSha256!==row.previous_index_sha256||
    idx.manifestSha256!==review.manifestSha256||
    idx.calendarSha256!==review.calendarSha256||
    idx.reviewedCodeSha!==review.reviewedCodeSha||
    idx.reviewedReleaseSha256!==review.releaseSha256||
    idx.reviewedRightsSha256!==review.rightsSha256||
    !Array.isArray(idx.entries)||idx.entries.length<1||
    idx.entries.length>1024)
  fail("PRIVATE_INDEX_JSON_SHAPE_OR_REVIEWED_IDENTITY_DRIFT");
 return idx;
}
export async function readP6PrivateSignedIndexCurrentAndPriorOnce({
 client,pins,reviewWire,reviewerPublicKeyPem
}){
 if(!client||typeof client.query!=="function"||
    !pins||pins.privateIndexReadOnlyApproved!==true||
    !LOGIN.test(pins.expectedReaderSessionLogin??""))
  fail("PRIVATE_INDEX_RESTRICTED_READER_NOT_ADMITTED");
 const signed=verifyP6PrivateSignedIndexExternalReview(
  reviewWire,reviewerPublicKeyPem,pins);
 const review=signed.review;
 let begun=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  begun=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const idResult=await client.query(
   "SELECT current_database() AS db,"+
   "current_setting('server_version_num')::integer AS version,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_catalog.pg_is_in_recovery() AS replica,"+
   "current_user AS actor,session_user AS login,"+
   "clock_timestamp() AS db_now,"+
   "has_table_privilege(current_user,'"+TABLE+"','SELECT') AS select_index,"+
   "has_table_privilege(current_user,'"+TABLE+"','INSERT') AS insert_index,"+
   "has_table_privilege(current_user,'"+TABLE+"','UPDATE') AS update_index,"+
   "has_table_privilege(current_user,'"+TABLE+"','DELETE') AS delete_index,"+
   "has_table_privilege(current_user,'"+PACKETS+"','SELECT') AS select_packet,"+
   "has_table_privilege(current_user,'"+PACKETS+"','INSERT') AS insert_packet,"+
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
  const id=idResult?.rows?.[0];
  if(idResult?.rowCount!==1||!id||
     id.db!=="neondb"||Number(id.version)<160000||
     Number(id.version)>=170000||id.ro!=="on"||
     id.replica!==false||id.actor!==GROUP||
     id.login!==pins.expectedReaderSessionLogin||
     id.select_index!==true||id.insert_index!==false||
     id.update_index!==false||id.delete_index!==false||
     id.select_packet!==true||id.insert_packet!==false||
     id.login_enabled!==true||id.login_superuser!==false||
     id.login_createrole!==false||id.login_bypassrls!==false||
     id.group_login!==false||id.group_superuser!==false||
     id.group_bypassrls!==false)
   fail("NOT_RESTRICTED_PG16_READ_ONLY_INDEX_AND_PACKET_LOGIN");
  const now=Date.parse(dbTime(id.db_now));
  if(signed.reviewedAtMs>now||
     signed.validUntilMs<=now||
     signed.expiresMs<=now||signed.expiresMs>now+MAX7)
   fail("REVIEW_SIGNER_OR_INDEX_EXPIRED_UNDER_DB_CLOCK");
  const want=review.indexRevision===1?
    [1]:[review.indexRevision,review.indexRevision-1];
  const out=await client.query(
   "SELECT revision,previous_index_sha256,content_sha256,"+
   "reviewed_code_sha,manifest_sha256,calendar_sha256,"+
   "release_sha256,rights_sha256,external_review_sha256,"+
   "externally_reviewed_at_utc,retention_not_after_utc,"+
   "committed_at_utc,payload_bytes"+
   " FROM "+TABLE+" WHERE revision=ANY($1::integer[]) ORDER BY revision DESC",
   [want]
  );
  if(out?.rowCount!==want.length||
     !Array.isArray(out.rows)||out.rows.length!==want.length)
   fail("CURRENT_OR_PREVIOUS_INDEX_MISSING_NO_BACKFILL");
  const current=out.rows[0],previous=out.rows[1]??null;
  if(current.revision!==review.indexRevision||
     current.previous_index_sha256!==review.previousIndexSha256||
     current.external_review_sha256!==review.externalReviewEvidenceSha256||
     dbTime(current.externally_reviewed_at_utc)!==review.reviewedAtUtc||
     dbTime(current.retention_not_after_utc)!==review.retentionNotAfterUtc)
   fail("CURRENT_INDEX_INDEPENDENT_REVIEW_DB_ROW_DRIFT");
  const c=parseExactIndex(
   current.payload_bytes,current,review,now,
   review.indexRevision,review.indexSha256
  );
  let p=null;
  if(review.indexRevision>1){
   if(!previous||
      previous.revision!==review.indexRevision-1||
      previous.content_sha256!==review.previousIndexSha256||
      (review.indexRevision-1===1?
        previous.previous_index_sha256!==null:
        !SHA.test(previous.previous_index_sha256??"")))
    fail("PREVIOUS_INDEX_NOT_EXACTLY_COMMITTED");
   p=parseExactIndex(
    previous.payload_bytes,previous,review,now,
    review.indexRevision-1,review.previousIndexSha256
   );
   if(c.entries.length<=p.entries.length||
      p.entries.some((e,i)=>JSON.stringify(e)!==JSON.stringify(c.entries[i])))
    fail("NON_APPEND_ONLY_SOURCE_PRE_POST_INDEX_CONTENTS");
  }else if(previous!==null)fail("UNEXPECTED_GENESIS_PARENT");
  await client.query("ROLLBACK");begun=false;
  const receipt={redactedSummary:{
   schema:P6_INDEX_READ_SCHEMA,
   status:"EXTERNALLY_SIGNED_CURRENT_PLUS_PREVIOUS_INDEX_VERIFIED_NO_GO",
   currentRevision:review.indexRevision,
   currentIndexSha256:review.indexSha256,
   previousIndexSha256:review.previousIndexSha256,
   indexEntryCount:c.entries.length,
   parentIndexEntryCount:p?.entries.length??0,
   observedRestrictedPgClockUtc:new Date(now).toISOString(),
   exactReaderAndPrivateAclVerified:true,
   originalSourceAndFlightPacketBytesWereNotRead:true,
   reviewedIndexBytesMustNotBePrinted:true,
   actualIndependentProviderUseLicenseCertified:false,
   indexPurgesAndLongTerm31DayRightsCertified:false,
   sourceOrPostSignedChildDispatched:false,
   providerCalls:0,databaseWrites:0,phase6PaidGo:false
  }};
  Object.defineProperties(receipt,{
   currentIndexBytes:{
    enumerable:false,writable:false,value:Buffer.from(current.payload_bytes)
   },
   previousIndexBytes:{
    enumerable:false,writable:false,
    value:previous?Buffer.from(previous.payload_bytes):null
   },
   currentParsedIndex:{enumerable:false,writable:false,value:c},
   previousParsedIndex:{enumerable:false,writable:false,value:p}
  });
  return Object.freeze(receipt);
 }catch(e){
  if(begun)await client.query("ROLLBACK").catch(()=>{});
  if(String(e?.message??"").startsWith("HOLD_P6_SIGNED_PRIVATE_INDEX_READ_"))
   throw e;
  fail("PRIVATE_PG_SQL_OR_REVIEW_FAILURE_REDACTED");
 }
}
