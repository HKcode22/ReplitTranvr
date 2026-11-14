/**
 * Phase5 P0 Phase6 Day-Epoch signed index issuer/reader candidate.
 * NO production schema, provider call, new worker, child dispatch or paid GO.
 * Works ONLY against independently reviewed, NOT-YET-INSTALLED day-epoch
 * alternative from #658, with the existing V0094 NOLOGIN roles.
 *
 * Unlike the deprecated global V0096 signing format, Ed25519 domain
 * separation binds runDayIndex (1..31) to a distinct bounded index chain.
 * A source registry and all later-PRE/POST registries MUST belong to the
 * same prospective study day. This module does NOT authorize provider
 * Contents use or long-term ML training retention.
 */
import {createHash,createPublicKey,verify} from "node:crypto";

export const P6_DAY_EPOCH_REVIEW_SCHEMA=
 "v39.phase6.day-epoch-index-external-review-ed25519.v1";
export const P6_DAY_EPOCH_REVIEW_AUDIENCE=
 "HKcode22/ReplitTranvr:PHASE6_DAY_EPOCH_INDEX_EXTERNAL_REVIEW";
export const P6_DAY_EPOCH_MODULE_SCHEMA=
 "v39.phase6.day-epoch-private-index-once-no-provider-no-go.v1";
const DOMAIN="HKcode22/ReplitTranvr:PHASE6_DAY_EPOCH_INDEX_EXTERNAL_REVIEW:v1\n";
const TABLE="phase6_private.signed_run_day_index_revision_v39";
const CLAIM="phase6_private.signed_run_day_epoch_claim_v39";
const PACKETS="phase6_private.frozen_native_packet_v39";
const PUB="phase6_private_frozen_publisher_v39";
const READER="phase6_private_frozen_reader_v39";
const LOGPUB=/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/;
const LOGREAD=/^phase6_private_reader_login_[a-z0-9_]{6,50}$/;
const SHA=/^[0-9a-f]{64}$/,CODE=/^[0-9a-f]{40}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const LANES={SOURCE:"SOURCE_DAY_REGISTRY",
 LATER_PRE:"LATER_PRE_DAY_REGISTRY",POST:"POST_PACKET"};
const MAX7=7*86400000;
const err=c=>{throw Error("HOLD_P6_DAY_EPOCH_INDEX_"+c);};
const sha=b=>createHash("sha256").update(b).digest("hex");
const keys=(x,ks)=>x&&typeof x==="object"&&!Array.isArray(x)&&
 Object.keys(x).sort().join("|")===ks.slice().sort().join("|");
const day=x=>Number.isSafeInteger(x)&&x>=1&&x<=31;
function ts(x){
 if(typeof x!=="string"||!UTC.test(x)||
   !Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)
  err("NONEXACT_SIGNED_UTC");
 return Date.parse(x);
}
function clock(x){
 const d=x instanceof Date?x:new Date(String(x));
 if(!Number.isFinite(d.getTime()))err("INVALID_REAL_PG16_CLOCK");
 return d.getTime();
}
export function p6DayEpochReviewPreimage(review){
 if(!keys(review,[
  "schema","audience","runDayIndex","indexRevision",
  "indexSha256","previousIndexSha256","reviewedCodeSha",
  "manifestSha256","calendarSha256","releaseSha256","rightsSha256",
  "externalReviewEvidenceSha256","reviewedAtUtc",
  "validUntilUtc","retentionNotAfterUtc","reviewerPublicKeyFingerprintSha256"
 ]))err("INVALID_REVIEW_CANONICAL_SHAPE");
 return Buffer.concat([Buffer.from(DOMAIN,"utf8"),
  Buffer.from(JSON.stringify(review),"utf8")]);
}
export function verifyP6DayEpochExternalReview({wire,publicKeyPem,pins}){
 const r=wire?.review;
 if(!pins||pins.independentExternalReviewerSignaturePinsApproved!==true||
    !keys(wire,["review","signatureBase64"])||
    !day(r?.runDayIndex)||r?.runDayIndex!==pins.expectedRunDayIndex||
    r.schema!==P6_DAY_EPOCH_REVIEW_SCHEMA||
    r.audience!==P6_DAY_EPOCH_REVIEW_AUDIENCE||
    !Number.isSafeInteger(r.indexRevision)||r.indexRevision<1||
    r.indexRevision>1024||
    r.indexRevision!==pins.expectedIndexRevision||
    !SHA.test(r.indexSha256??"")||
    r.indexSha256!==pins.expectedIndexSha256||
    (r.indexRevision===1?r.previousIndexSha256!==null:
      !SHA.test(r.previousIndexSha256??""))||
    r.previousIndexSha256!==pins.expectedPreviousIndexSha256||
    !CODE.test(r.reviewedCodeSha??"")||
    [
      ["reviewedCodeSha","expectedReviewedCodeSha"],
      ["manifestSha256","expectedManifestSha256"],
      ["calendarSha256","expectedCalendarSha256"],
      ["releaseSha256","expectedReleaseSha256"],
      ["rightsSha256","expectedRightsSha256"],
      ["externalReviewEvidenceSha256","expectedExternalReviewEvidenceSha256"],
      ["reviewerPublicKeyFingerprintSha256","expectedReviewerPublicKeyFingerprintSha256"]
    ].some(([a,b])=>r[a]!==pins[b]||
      !(a==="reviewedCodeSha"?CODE:SHA).test(r[a]??"")))
  err("UNPINNED_WRONG_DAY_OR_STUDY_ED25519_REVIEW");
 const reviewed=ts(r.reviewedAtUtc),valid=ts(r.validUntilUtc),
  expiry=ts(r.retentionNotAfterUtc);
 if(expiry<=reviewed||expiry-reviewed>MAX7||
    valid<=reviewed||valid>expiry)
  err("SIGNED_REVIEW_OR_EXPIRY_OUTSIDE_SEVEN_DAY_BOUND");
 try{
  const key=createPublicKey(publicKeyPem);
  const fingerprint=sha(key.export({type:"spki",format:"der"}));
  const signature=wire.signatureBase64;
  if(key.asymmetricKeyType!=="ed25519"||
     fingerprint!==r.reviewerPublicKeyFingerprintSha256||
     typeof signature!=="string"||
     !/^[A-Za-z0-9+/]{86}==$/.test(signature))
   err("INVALID_ED25519_PUBLIC_KEY_OR_SIGNATURE_FORMAT");
  const sig=Buffer.from(signature,"base64");
  if(sig.length!==64||sig.toString("base64")!==signature||
     !verify(null,p6DayEpochReviewPreimage(r),key,sig))
   err("ED25519_DAY_EPOCH_REVIEW_SIGNATURE_INVALID");
 }catch(e){
  if(String(e?.message??"").startsWith("HOLD_P6_DAY_EPOCH_INDEX_"))throw e;
  err("ED25519_PUBLIC_KEY_INVALID_REDACTED");
 }
 return{review:r,reviewedAtMs:reviewed,
   validUntilMs:valid,retentionNotAfterMs:expiry,
   signatureVerified:true,
   organizationalIndependenceCertifiedHere:false,
   providerContentsOrDerivedWorksRightsCertifiedHere:false};
}
export function validateP6DayEpochIndexBytes(bytes,review){
 if(!Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>1048576)
  err("PRIVATE_INDEX_BYTES_INVALID_SIZE");
 let obj;
 try{obj=JSON.parse(bytes.toString("utf8"));}
 catch{err("PRIVATE_INDEX_BYTES_NOT_JSON");}
 if(!keys(obj,[
  "schema","runDayIndex","revision","previousIndexSha256",
  "manifestSha256","calendarSha256","reviewedCodeSha",
  "reviewedReleaseSha256","reviewedRightsSha256","entries"
 ])||obj.schema!=="v39.phase6.run-day-scoped-append-only-index.v1"||
    obj.runDayIndex!==review.runDayIndex||
    obj.revision!==review.indexRevision||
    obj.previousIndexSha256!==review.previousIndexSha256||
    obj.manifestSha256!==review.manifestSha256||
    obj.calendarSha256!==review.calendarSha256||
    obj.reviewedCodeSha!==review.reviewedCodeSha||
    obj.reviewedReleaseSha256!==review.releaseSha256||
    obj.reviewedRightsSha256!==review.rightsSha256||
    !Array.isArray(obj.entries)||obj.entries.length<1||obj.entries.length>1024)
  err("UNSIGNED_OR_WRONG_DAY_INDEX_PAYLOAD_SHAPE");
 const seenPath=new Set(),seenShard=new Set(),sources=new Map();
 let lastPublication=-Infinity;
 for(const e of obj.entries){
  if(!keys(e,["lane","runDayIndex","shardIndex","filePath",
    "fileSha256","publishedAtUtc","notBeforeUtc","hardLatestUtc",
    "reviewEvidenceSha256","sourceRegistryFilePath",
    "sourceRegistrySha256"])||
    !Object.hasOwn(LANES,e.lane)||
    e.runDayIndex!==review.runDayIndex||
    !Number.isSafeInteger(e.shardIndex)||e.shardIndex<1||
    e.shardIndex>100000||
    !PATH.test(e.filePath??"")||!SHA.test(e.fileSha256??"")||
    !SHA.test(e.reviewEvidenceSha256??"")||
    seenPath.has(e.filePath)||
    seenShard.has([e.lane,e.shardIndex].join(":")))
   err("CROSS_DAY_DUPLICATE_OR_UNPINNED_SHARD");
  const pub=ts(e.publishedAtUtc),
   first=ts(e.notBeforeUtc),last=ts(e.hardLatestUtc);
  if(pub>reviewedEpoch(review)||pub>first||
     pub<lastPublication||first>=last||
     last-first>(e.lane==="POST"?60:180)*60000)
   err("RETROSPECTIVE_OR_INVALID_SHARD_DEADLINE");
  lastPublication=pub;
  seenPath.add(e.filePath);
  seenShard.add([e.lane,e.shardIndex].join(":"));
  if(e.lane==="SOURCE"){
   if(e.sourceRegistryFilePath!==null||e.sourceRegistrySha256!==null)
    err("SOURCE_REGISTRY_SELF_REFERENCE");
   sources.set(e.filePath,e);
  }else if(!PATH.test(e.sourceRegistryFilePath??"")||
   !SHA.test(e.sourceRegistrySha256??""))
   err("NON_SOURCE_SHARD_MISSING_SIGNED_SOURCE");
 }
 for(const e of obj.entries){
  if(e.lane==="SOURCE")continue;
  const source=sources.get(e.sourceRegistryFilePath);
  if(!source||source.fileSha256!==e.sourceRegistrySha256||
     source.runDayIndex!==review.runDayIndex||
     ts(source.publishedAtUtc)>ts(e.publishedAtUtc))
   err("MISSING_OR_CROSS_DAY_SOURCE_PROVENANCE");
 }
 return obj;
}
const reviewedEpoch=r=>ts(r.reviewedAtUtc);
function sameDayPrefix(current,prior){
 if(!prior||
    prior.runDayIndex!==current.runDayIndex||
    prior.revision!==current.revision-1||
    prior.manifestSha256!==current.manifestSha256||
    prior.calendarSha256!==current.calendarSha256||
    prior.reviewedCodeSha!==current.reviewedCodeSha||
    prior.reviewedReleaseSha256!==current.reviewedReleaseSha256||
    prior.reviewedRightsSha256!==current.reviewedRightsSha256||
    !Array.isArray(prior.entries)||
    prior.entries.length>=current.entries.length||
    prior.entries.some((x,i)=>JSON.stringify(x)!==
      JSON.stringify(current.entries[i])))
  err("NON_APPEND_ONLY_SAME_DAY_PREDECESSOR");
}
function validPgId(id,kind,login){
 const publisher=kind==="publisher";
 const group=publisher?PUB:READER;
 const reg=publisher?LOGPUB:LOGREAD;
 if(!id||id.db!=="neondb"||
   Number(id.version)<160000||Number(id.version)>=170000||
   id.ro!==(publisher?"off":"on")||id.replica!==false||
   id.actor!==group||!reg.test(login??"")||id.login!==login||
   id.index_select!==true||id.index_insert!==publisher||
   id.index_update!==false||id.index_delete!==false||
   id.packet_select!==true||id.packet_insert!==publisher||
   id.packet_update!==false||id.packet_delete!==false||
   id.login_enabled!==true||id.login_superuser!==false||
   id.login_createrole!==false||id.login_bypassrls!==false||
   id.group_login!==false||id.group_superuser!==false||
   id.group_bypassrls!==false)
  err("NOT_RESTRICTED_REAL_NEON_PG16_ROLE_OR_ACL");
}
const identitySQL=
 "SELECT current_database() AS db,"+
 "current_setting('server_version_num')::integer AS version,"+
 "current_setting('transaction_read_only') AS ro,"+
 "pg_catalog.pg_is_in_recovery() AS replica,"+
 "current_user AS actor,session_user AS login,clock_timestamp() AS db_now,"+
 "has_table_privilege(current_user,'"+TABLE+"','SELECT') AS index_select,"+
 "has_table_privilege(current_user,'"+TABLE+"','INSERT') AS index_insert,"+
 "has_table_privilege(current_user,'"+TABLE+"','UPDATE') AS index_update,"+
 "has_table_privilege(current_user,'"+TABLE+"','DELETE') AS index_delete,"+
 "has_table_privilege(current_user,'"+PACKETS+"','SELECT') AS packet_select,"+
 "has_table_privilege(current_user,'"+PACKETS+"','INSERT') AS packet_insert,"+
 "has_table_privilege(current_user,'"+PACKETS+"','UPDATE') AS packet_update,"+
 "has_table_privilege(current_user,'"+PACKETS+"','DELETE') AS packet_delete,"+
 "login_role.rolcanlogin AS login_enabled,"+
 "login_role.rolsuper AS login_superuser,"+
 "login_role.rolcreaterole AS login_createrole,"+
 "login_role.rolbypassrls AS login_bypassrls,"+
 "grp.rolcanlogin AS group_login,"+
 "grp.rolsuper AS group_superuser,"+
 "grp.rolbypassrls AS group_bypassrls"+
 " FROM pg_catalog.pg_roles login_role,pg_catalog.pg_roles grp"+
 " WHERE login_role.rolname=session_user AND grp.rolname=current_user";
const indexSQL=
 "SELECT run_day_index,revision,previous_index_sha256,content_sha256,"+
 "reviewed_code_sha,manifest_sha256,calendar_sha256,"+
 "release_sha256,rights_sha256,external_review_sha256,"+
 "externally_reviewed_at_utc,retention_not_after_utc,"+
 "committed_at_utc,payload_bytes FROM "+TABLE+
 " WHERE run_day_index=$1 AND revision=ANY($2::integer[]) ORDER BY revision DESC";
function readRow(row,idx,review,now,expectedSha){
 if(!row||row.run_day_index!==review.runDayIndex||
    row.revision!==idx||row.content_sha256!==expectedSha||
    !Buffer.isBuffer(row.payload_bytes)||
    sha(row.payload_bytes)!==expectedSha||
    row.reviewed_code_sha!==review.reviewedCodeSha||
    row.manifest_sha256!==review.manifestSha256||
    row.calendar_sha256!==review.calendarSha256||
    row.release_sha256!==review.releaseSha256||
    row.rights_sha256!==review.rightsSha256||
    clock(row.retention_not_after_utc)<=now||
    clock(row.committed_at_utc)>now)
  err("INDEX_ROW_UNKNOWN_EXPIRED_OR_CROSS_DAY");
 let obj;
 try{obj=JSON.parse(row.payload_bytes.toString("utf8"));}
 catch{err("INDEX_ROW_INVALID_JSON");}
 // The row still must have only the independently signed day; for older
 // revision, a different reviewedAt is possible, but study pins cannot drift.
 if(obj?.runDayIndex!==review.runDayIndex||obj?.revision!==idx||
   obj?.schema!=="v39.phase6.run-day-scoped-append-only-index.v1")
  err("PREDECESSOR_DAY_OR_SCHEMA_DRIFT");
 return obj;
}
export async function readP6DayEpochIndexCurrentPriorOnce({
 client,pins,wire,publicKeyPem
}){
 if(!client||typeof client.query!=="function"||
    pins?.privateDayIndexReadOnlyApproved!==true||
    !LOGREAD.test(pins.expectedReaderSessionLogin??""))
  err("NO_APPROVED_PRIVATE_DAY_INDEX_READER");
 const signed=verifyP6DayEpochExternalReview({wire,publicKeyPem,pins});
 let begun=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  begun=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const identity=await client.query(identitySQL);
  if(identity?.rowCount!==1)err("NO_ACTUAL_POSTGRESQL_READER_IDENTITY");
  const id=identity.rows[0];
  validPgId(id,"reader",pins.expectedReaderSessionLogin);
  const now=clock(id.db_now);
  if(signed.reviewedAtMs>now||signed.validUntilMs<=now||
     signed.retentionNotAfterMs<=now||
     signed.retentionNotAfterMs>now+MAX7)
   err("PRIVATE_DAY_INDEX_REVIEW_EXPIRED");
  const revision=signed.review.indexRevision;
  const wanted=revision===1?[1]:[revision,revision-1];
  const out=await client.query(indexSQL,[signed.review.runDayIndex,wanted]);
  if(out?.rowCount!==wanted.length||
     !Array.isArray(out.rows)||out.rows.length!==wanted.length)
   err("CURRENT_OR_PRIOR_DAY_INDEX_UNAVAILABLE");
  const row=out.rows[0],prior=out.rows[1]??null;
  if(row.previous_index_sha256!==signed.review.previousIndexSha256||
     row.external_review_sha256!==
       signed.review.externalReviewEvidenceSha256||
     clock(row.retention_not_after_utc)!==signed.retentionNotAfterMs)
   err("CURRENT_DAY_INDEX_REVIEW_ROW_DRIFT");
  const current=readRow(row,revision,signed.review,now,
    signed.review.indexSha256);
  validateP6DayEpochIndexBytes(row.payload_bytes,signed.review);
  let previous=null;
  if(revision>1){
   if(!prior||
      prior.content_sha256!==signed.review.previousIndexSha256||
      prior.revision!==revision-1)
    err("PRIOR_SAME_DAY_SHA_NOT_PRESENT");
   if(clock(prior.retention_not_after_utc)<signed.retentionNotAfterMs)
    err("PREDECESSOR_EXPIRES_BEFORE_CURRENT_DAY_INDEX");
   previous=readRow(prior,revision-1,signed.review,now,
      signed.review.previousIndexSha256);
   sameDayPrefix(current,previous);
  }else if(prior)err("GENESIS_MUST_HAVE_NO_PARENT");
  await client.query("ROLLBACK");begun=false;
  const receipt={
   redactedSummary:Object.freeze({
    schema:P6_DAY_EPOCH_MODULE_SCHEMA,
    status:"SIGNED_SAME_DAY_INDEX_CURRENT_PRIOR_READ_NO_DISPATCH",
    runDayIndex:signed.review.runDayIndex,
    revision,indexSha256:signed.review.indexSha256,
    previousIndexSha256:signed.review.previousIndexSha256,
    entryCount:current.entries.length,
    previousEntryCount:previous?.entries.length??0,
    realDbClockUtc:new Date(now).toISOString(),
    exactRestrictedReaderRoleVerified:true,
    actualAllRegistryBytesRead:false,
    privateByteDeleteAndBackupExpiryCertified:false,
    providerCalls:0,databaseWrites:0,githubDispatches:0,
    phase6PaidGo:false
   })
  };
  Object.defineProperties(receipt,{
   currentIndexBytes:{enumerable:false,value:Buffer.from(row.payload_bytes)},
   previousIndexBytes:{enumerable:false,
      value:prior?Buffer.from(prior.payload_bytes):null},
   currentParsedIndex:{enumerable:false,value:current}
  });
  return Object.freeze(receipt);
 }catch(e){
  if(begun)await client.query("ROLLBACK").catch(()=>{});
  if(String(e?.message??"").startsWith("HOLD_P6_DAY_EPOCH_INDEX_"))
   throw e;
  err("PRIVATE_DB_OR_REVIEW_FAILURE_REDACTED");
 }
}
export async function publishP6DayEpochIndexRevisionOnce({
 client,pins,wire,publicKeyPem,indexBytes,scope
}){
 if(!client||typeof client.query!=="function"||
    !Buffer.isBuffer(indexBytes)||indexBytes.length<100||
    indexBytes.length>1048576||!scope||
    scope.privateDayIndexStorageApproved!==true||
    scope.independentProviderContentsReviewApproved!==true||
    scope.existingPaidDispatchApproved!==false||
    scope.adbAutoCollect!=="0"||scope.phase6ProcessArmed!=="0"||
    pins?.privateDayIndexPublicationApproved!==true||
    !LOGPUB.test(scope.expectedPublisherSessionLogin??"")||
    scope.approvedCodeSha!==pins.expectedReviewedCodeSha||
    scope.approvedCalendarSha256!==pins.expectedCalendarSha256||
    scope.approvedRightsSha256!==pins.expectedRightsSha256||
    scope.approvedRetentionNotAfterUtc!==wire?.review?.retentionNotAfterUtc||
    sha(indexBytes)!==pins.expectedIndexSha256)
  err("NO_APPROVED_DAY_EPOCH_OR_UNREVIEWED_INDEX_BYTES");
 const signed=verifyP6DayEpochExternalReview({wire,publicKeyPem,pins});
 const current=validateP6DayEpochIndexBytes(indexBytes,signed.review);
 let begun=false,commitAttempted=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");
  begun=true;
  await client.query("SET LOCAL statement_timeout='30000ms'");
  await client.query("SET LOCAL lock_timeout='3000ms'");
  const ident=await client.query(identitySQL);
  if(ident?.rowCount!==1)err("NO_ACTUAL_POSTGRESQL_PUBLISHER_IDENTITY");
  const id=ident.rows[0];
  validPgId(id,"publisher",scope.expectedPublisherSessionLogin);
  const now=clock(id.db_now);
  if(signed.reviewedAtMs>now||signed.validUntilMs<=now||
     signed.retentionNotAfterMs<=now||
     signed.retentionNotAfterMs>now+MAX7)
   err("PRIVATE_DAY_INDEX_REVIEW_EXPIRED");
  const paths=current.entries.map(e=>e.filePath);
  const registry=await client.query(
   "SELECT logical_path,run_day_index,shard_index,kind,"+
   "content_sha256,reviewed_code_sha,manifest_sha256,rights_sha256,"+
   "external_review_sha256,retention_not_after_utc,committed_at_utc"+
   " FROM "+PACKETS+" WHERE logical_path=ANY($1::text[])",[paths]);
  if(registry?.rowCount!==paths.length||
     !Array.isArray(registry.rows)||registry.rows.length!==paths.length)
   err("MISSING_COMMITTED_INDEXED_SAME_DAY_REGISTRIES");
  const rows=new Map(registry.rows.map(r=>[r.logical_path,r]));
  if(rows.size!==paths.length)err("DUPLICATE_PRIVATE_REGISTRY_PATH");
  for(const e of current.entries){
   const r=rows.get(e.filePath);
   if(!r||r.run_day_index!==signed.review.runDayIndex||
     r.shard_index!==e.shardIndex||r.kind!==LANES[e.lane]||
     r.content_sha256!==e.fileSha256||
     r.reviewed_code_sha!==signed.review.reviewedCodeSha||
     r.manifest_sha256!==signed.review.manifestSha256||
     r.rights_sha256!==signed.review.rightsSha256||
     r.external_review_sha256!==e.reviewEvidenceSha256||
     clock(r.retention_not_after_utc)<signed.retentionNotAfterMs||
     clock(r.committed_at_utc)>ts(e.publishedAtUtc))
    err("UNSIGNED_REGISTRY_STUDY_DAY_RIGHTS_OR_EXPIRY");
  }
  const rev=signed.review.indexRevision;
  const existing=await client.query(
    "SELECT COUNT(*)::integer AS n FROM "+TABLE+
    " WHERE run_day_index=$1 AND revision=$2",
    [signed.review.runDayIndex,rev]);
  if(existing?.rowCount!==1||Number(existing.rows[0]?.n)!==0)
   err("REPEATED_OR_UNCERTAIN_INDEX_REVISION");
  if(rev===1){
   const claims=await client.query(
    "SELECT COUNT(*)::integer AS n FROM "+CLAIM+
    " WHERE run_day_index=$1",[signed.review.runDayIndex]);
   if(claims?.rowCount!==1||Number(claims.rows[0]?.n)!==0)
    err("DAY_GENESIS_ALREADY_CLAIMED_NO_REPLAY");
  }else{
   const previous=await client.query(indexSQL,[
    signed.review.runDayIndex,[rev-1]]);
   if(previous?.rowCount!==1)
    err("SAME_DAY_PREDECESSOR_NOT_COMMITTED");
   const p=previous.rows[0];
   if(p.content_sha256!==signed.review.previousIndexSha256||
      clock(p.retention_not_after_utc)<=now||
      clock(p.retention_not_after_utc)<signed.retentionNotAfterMs)
    err("PREVIOUS_DAY_REVISION_SHA_OR_EXPIRY");
   const earlier=readRow(p,rev-1,signed.review,now,
     signed.review.previousIndexSha256);
   sameDayPrefix(current,earlier);
  }
  const ins=await client.query(
   "INSERT INTO "+TABLE+
   " (run_day_index,revision,previous_index_sha256,content_sha256,"+
   "reviewed_code_sha,manifest_sha256,calendar_sha256,release_sha256,"+
   "rights_sha256,external_review_sha256,externally_reviewed_at_utc,"+
   "retention_not_after_utc,payload_bytes)"+
   " VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
   [signed.review.runDayIndex,rev,signed.review.previousIndexSha256,
    signed.review.indexSha256,signed.review.reviewedCodeSha,
    signed.review.manifestSha256,signed.review.calendarSha256,
    signed.review.releaseSha256,signed.review.rightsSha256,
    signed.review.externalReviewEvidenceSha256,
    signed.review.reviewedAtUtc,signed.review.retentionNotAfterUtc,
    indexBytes]);
  if(ins?.rowCount!==1)err("INDEX_INSERT_NOT_CONFIRMED");
  const end=await client.query("SELECT clock_timestamp() AS db_now");
  const endMs=clock(end?.rows?.[0]?.db_now);
  if(end?.rowCount!==1||endMs<now||
     endMs>=signed.validUntilMs||endMs>=signed.retentionNotAfterMs)
   err("SIGNED_REVIEW_EXPIRED_BEFORE_COMMIT");
  commitAttempted=true;
  await client.query("COMMIT");
  begun=false;
  return Object.freeze({
   schema:P6_DAY_EPOCH_MODULE_SCHEMA,
   status:"ONE_DAY_INDEX_COMMITTED_SEPARATE_READBACK_REQUIRED_NO_GO",
   runDayIndex:signed.review.runDayIndex,revision:rev,
   indexSha256:signed.review.indexSha256,
   registryCount:paths.length,
   independentPostcommitReadbackRequired:true,
   providerCalls:0,githubDispatches:0,phase6PaidGo:false
  });
 }catch(e){
  if(commitAttempted)
   err("UNKNOWN_COMMIT_INDEPENDENT_READBACK_NEVER_REPLAY");
  if(begun)await client.query("ROLLBACK").catch(()=>{});
  if(String(e?.message??"").startsWith("HOLD_P6_DAY_EPOCH_INDEX_"))
   throw e;
  err("PRIVATE_INDEX_DB_OR_SIGNING_FAILURE_REDACTED");
 }
}
