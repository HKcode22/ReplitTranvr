/**
 * Phase6 one signed SOURCE QUERY or POST private packet publication to the
 * existing V0094+V0095 PG16 transport. This writes EXACTLY one private packet
 * in a SERIALIZABLE transaction, no provider HTTP or GH child dispatch.
 *
 * Only usable after genuine external reviewer/rights evidence, separate
 * private publisher LOGIN commissioning, legal provider retention and
 * independent storage approval. A caller boolean is never a legal verdict.
 * Replaying a committed/unknown COMMIT is FORBIDDEN.
 */
import {createHash} from "node:crypto";
import {
 verifyP6ExternalSourcePostReview
} from "./phase6PrivateSourcePostReadOnce_v39.mjs";

export const P6_PRIVATE_SOURCE_POST_PUBLISH_SCHEMA=
 "v39.phase6.private-source-post-packet-atomic-publish-once.v1";
const TABLE="phase6_private.frozen_native_packet_v39";
const PUB="phase6_private_frozen_publisher_v39";
const SHA=/^[a-f0-9]{64}$/;
const LOGIN=/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/;
const SOURCE=/^data-collection\/phase5\/frozen\/source_[A-Za-z0-9_.-]{8,125}\.json$/;
const MAX7=7*86400000;
const fail=(s)=>{throw Error("HOLD_P6_SOURCE_POST_PUBLISH_"+s);};
const digest=(b)=>createHash("sha256").update(b).digest("hex");
const dbUtc=(v)=>{
 const d=v instanceof Date?v:new Date(String(v));
 if(!Number.isFinite(d.getTime()))
  fail("INVALID_REAL_PG16_DATABASE_CLOCK");
 return d.getTime();
};
/** Never log raw SQL errors: DB connection errors can contain secrets. */
export async function publishP6PrivateSourcePostOnce({
 client,pins,wire,reviewerPublicKeyPem,packetBytes,scope
}){
 if(!client||typeof client.query!=="function"||
    !scope||scope.privateStoragePublicationApproved!==true||
    scope.separateProviderContentRightsReviewApproved!==true||
    scope.existingChildOrPaidDispatchApproved!==false||
    scope.adbAutoCollect!=="0"||
    scope.phase6ProcessArmed!=="0"||
    scope.approvedMainCodeSha!==pins?.expectedReviewedMainSha||
    !LOGIN.test(scope.expectedPublisherSessionLogin??"")||
    pins?.independentExternalReviewerSignaturePinsApproved!==true||
    pins?.privateSourcePostPublishApproved!==true||
    !Buffer.isBuffer(packetBytes)||
    packetBytes.length<100||packetBytes.length>250000||
    digest(packetBytes)!==pins.expectedContentSha256)
  fail("MISSING_RELEASE_INDEPENDENT_REVIEW_OR_CONTENT_SHA");
 // Ed25519 review only verifies authenticity of previously signed pins,
 // NOT actual rights/ML training permission or reviewer independence.
 const external=verifyP6ExternalSourcePostReview(
  wire,reviewerPublicKeyPem,pins);
 const rev=external.review;
 if(scope.approvedRetentionNotAfterUtc!==rev.retentionNotAfterUtc||
    scope.approvedMainCodeSha!==rev.reviewedCodeSha||
    scope.reviewedRightsSha256!==rev.rightsSha256||
    scope.externalReviewEvidenceSha256!==rev.externalReviewEvidenceSha256||
    !SHA.test(scope.reviewedRightsSha256??"")||
    !SHA.test(scope.externalReviewEvidenceSha256??""))
  fail("UNMATCHED_RIGHTS_REVIEW_OR_RETENTION_WINDOW");
 let packet;
 try{packet=JSON.parse(packetBytes.toString("utf8"));}
 catch{fail("PRIVATE_PACKET_NOT_JSON");}
 if(!packet||typeof packet!=="object"||Array.isArray(packet))
  fail("PRIVATE_PACKET_NOT_JSON_OBJECT");
 const isPost=rev.kind==="POST_PACKET";
 if(isPost){
  if(!SOURCE.test(scope.expectedSourceDayRegistryLogicalPath??"")||
     !SHA.test(scope.expectedSourceDayRegistrySha256??""))
   fail("POST_NEEDS_EXTERNALLY_PINNED_SOURCE_DAY_REGISTRY");
 }else if(rev.kind==="SOURCE_QUERY_PACKET"){
  // SOURCE per-query packets precede SOURCE_DAY_REGISTRY: registry-last
  // publication is a SEPARATE review, not automatically done here.
  if(scope.expectedSourceDayRegistryLogicalPath!==null||
     scope.expectedSourceDayRegistrySha256!==null)
   fail("SOURCE_QUERY_MUST_NOT_CLAIM_PRECOMMITTED_REGISTRY");
 }else fail("ONLY_SOURCE_QUERY_OR_POST_PRIVATE_PACKET_KINDS");
 let started=false,commitAttempted=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");
  started=true;
  await client.query("SET LOCAL statement_timeout='30000ms'");
  await client.query("SET LOCAL lock_timeout='3000ms'");
  const rr=await client.query(
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
  const id=rr?.rows?.[0];
  if(rr?.rowCount!==1||!id||id.db!=="neondb"||
     Number(id.server_version)<160000||Number(id.server_version)>=170000||
     id.ro!=="off"||id.replica!==false||id.actor!==PUB||
     id.session_login!==scope.expectedPublisherSessionLogin||
     id.login_enabled!==true||id.login_superuser!==false||
     id.login_createrole!==false||id.login_bypass_rls!==false||
     id.group_can_login!==false||id.group_superuser!==false||
     id.group_bypass_rls!==false||
     id.can_select!==true||id.can_insert!==true||
     id.can_update!==false||id.can_delete!==false)
   fail("NOT_RESTRICTED_PG16_PUBLISHER_SESSION_OR_ACL");
  const now=dbUtc(id.db_now);
  if(external.reviewedAtMs>now||
     external.validUntilMs<=now||
     external.retentionNotAfterMs<=now||
     external.retentionNotAfterMs>now+MAX7)
   fail("EXTERNAL_REVIEW_EXPIRED_OR_CONTENTS_RETENTION_HOLD");
  let prior;
  try{
   prior=await client.query(
    "SELECT COUNT(*)::integer AS n FROM "+TABLE+
    " WHERE logical_path=$1",[rev.logicalPath]
   );
  }catch{fail("PRECOMMIT_READBACK_UNAVAILABLE");}
  if(prior?.rowCount!==1||prior.rows?.[0]?.n!==0)
   fail("EXISTING_OR_UNCERTAIN_PRIVATE_PACKET_DO_NOT_REPLAY");
  if(isPost){
   const sr=await client.query(
    "SELECT run_day_index,kind,content_sha256,"+
    "manifest_sha256,rights_sha256,reviewed_code_sha,"+
    "retention_not_after_utc,committed_at_utc FROM "+TABLE+
    " WHERE logical_path=$1",
    [scope.expectedSourceDayRegistryLogicalPath]
   );
   const source=sr?.rows?.[0];
   if(sr?.rowCount!==1||!source||
      source.kind!=="SOURCE_DAY_REGISTRY"||
      source.run_day_index!==rev.runDayIndex||
      source.content_sha256!==scope.expectedSourceDayRegistrySha256||
      source.manifest_sha256!==rev.manifestSha256||
      source.rights_sha256!==rev.rightsSha256||
      source.reviewed_code_sha!==rev.reviewedCodeSha||
      dbUtc(source.committed_at_utc)>now||
      dbUtc(source.retention_not_after_utc)<=now||
      dbUtc(source.retention_not_after_utc)<external.retentionNotAfterMs)
    fail("POST_SOURCE_DAY_NOT_PRECOMMITTED_OR_UNREVIEWED");
  }
  const ins=await client.query(
   "INSERT INTO "+TABLE+
   " (logical_path,run_day_index,shard_index,kind,content_sha256,"+
   "reviewed_code_sha,manifest_sha256,rights_sha256,"+
   "external_review_sha256,externally_reviewed_at_utc,"+
   "retention_not_after_utc,payload_bytes)"+
   " VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
   [rev.logicalPath,rev.runDayIndex,rev.shardIndex,rev.kind,
    rev.contentSha256,rev.reviewedCodeSha,rev.manifestSha256,
    rev.rightsSha256,rev.externalReviewEvidenceSha256,
    rev.reviewedAtUtc,rev.retentionNotAfterUtc,packetBytes]
  );
  if(ins?.rowCount!==1)
   fail("PRIVATE_ONE_PACKET_INSERT_NOT_CONFIRMED");
  const after=await client.query("SELECT clock_timestamp() AS db_now");
  if(after?.rowCount!==1||
     dbUtc(after.rows[0].db_now)<now||
     dbUtc(after.rows[0].db_now)>=external.validUntilMs||
     dbUtc(after.rows[0].db_now)>=external.retentionNotAfterMs)
   fail("PRECOMMIT_CLOCK_INVALID_OR_PRIVATE_RETENTION_EXPIRED");
  commitAttempted=true;
  await client.query("COMMIT");
  started=false;
  return Object.freeze({
   schema:P6_PRIVATE_SOURCE_POST_PUBLISH_SCHEMA,
   status:"EXTERNALLY_REVIEWED_PRIVATE_PACKET_COMMIT_READBACK_REQUIRED_NO_GO",
   kind:rev.kind,runDayIndex:rev.runDayIndex,
   shardIndex:rev.shardIndex,contentSha256:rev.contentSha256,
   exactSourceRegistryPrecommitted:isPost,
   sourceQueryRegistryLastStillRequired:!isPost,
   independentPostCommitReadbackRequired:true,
   signedChildAdmissionStillRequired:true,
   independentlyVerifiedProviderLegalRightsByThisFunction:false,
   sourceOrPostPaidDispatchCount:0,
   providerCalls:0,publicGithubPacketWrites:0,
   phase5ScientificFreeze:false,phase6PaidGo:false
  });
 }catch(e){
  if(commitAttempted)
   fail("UNKNOWN_COMMIT_REQUIRES_INDEPENDENT_READBACK_NEVER_RETRY");
  if(started)await client.query("ROLLBACK").catch(()=>{});
  const code=String(e?.message??"");
  if(code.startsWith("HOLD_P6_SOURCE_POST_PUBLISH_"))throw e;
  fail("UNKNOWN_DB_OR_PACKET_FAILURE_REDACTED");
 }
}
