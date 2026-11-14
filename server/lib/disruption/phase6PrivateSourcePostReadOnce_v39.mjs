/**
 * Phase6 SOURCE query + POST private packet reader after V0094 + V0095.
 *
 * No provider REST, queue write, migration, GH dispatch or actual GO. Reads
 * ONE externally Ed25519-reviewed SHA-bound JSON packet from existing PG16
 * using an exact dedicated restricted reader LOGIN + NOLOGIN effective group.
 * A return Buffer is non-enumerable: JSON.stringify(report) never exposes it.
 *
 * CRITICAL: this is transport verification, not a license/retention verdict,
 * independent organizational authority or authorization to run a PAID GET.
 */
import {
 createHash,createPublicKey,verify
} from "node:crypto";
import {
 lstatSync,mkdirSync,readFileSync,writeFileSync,unlinkSync,chmodSync
} from "node:fs";
import {resolve,join,dirname} from "node:path";

export const P6_PRIVATE_SOURCE_POST_READ_SCHEMA=
 "v39.phase6.private-source-post-packet-restricted-read-once.v1";
export const P6_SOURCE_POST_REVIEW_SCHEMA=
 "v39.phase6.external-source-post-review-ed25519.v1";
export const P6_SOURCE_POST_REVIEW_AUDIENCE=
 "HKcode22/ReplitTranvr:PHASE6_PRIVATE_SOURCE_POST_REVIEW";
const REVIEW_DOMAIN="HKcode22/ReplitTranvr:PHASE6_PRIVATE_SOURCE_POST_REVIEW:v1\n";
const TABLE="phase6_private.frozen_native_packet_v39";
const READER="phase6_private_frozen_reader_v39";
const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const LOGIN=/^phase6_private_reader_login_[a-z0-9_]{6,50}$/;
const MAX_PAYLOAD=250000,MIN_PAYLOAD=100;
const MAX_RETENTION_MS=7*86400000;
const PATHS={
 SOURCE_QUERY_PACKET:
  /^data-collection\/phase5\/frozen\/sourceq_[A-Za-z0-9_.-]{8,110}\.json$/,
 POST_PACKET:
  /^data-collection\/phase5\/frozen\/post_[A-Za-z0-9_-]{8,110}\.json$/
};
const fail=c=>{throw Error("HOLD_P6_PRIVATE_SOURCE_POST_READ_"+c);};
const h=b=>createHash("sha256").update(b).digest("hex");
const asUtc=(v)=>{
 const d=v instanceof Date?v:new Date(String(v));
 if(!Number.isFinite(d.getTime()))fail("INVALID_DB_TIMESTAMP");
 return d.toISOString();
};
const exactUtc=(s)=>{
 if(typeof s!=="string"||!UTC.test(s)||
    !Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)fail("INVALID_EXTERNAL_REVIEW_UTC");
 return Date.parse(s);
};
const exactShape=(o,names)=>o&&typeof o==="object"&&!Array.isArray(o)&&
 Object.keys(o).sort().join("|")===names.slice().sort().join("|");
export function signedP6PrivateSourcePostReviewBytes(review){
 if(!review||typeof review!=="object"||Array.isArray(review))
  fail("REVIEW_OBJECT_REQUIRED");
 return Buffer.concat([
  Buffer.from(REVIEW_DOMAIN,"utf8"),
  Buffer.from(JSON.stringify(review),"utf8")
 ]);
}
export function verifyP6ExternalSourcePostReview(wire,publicKeyPem,pins){
 const rev=wire?.review;
 if(!pins||pins.privateSourcePostReadOnlyApproved!==true||
    !exactShape(wire,["review","signatureBase64"])||
    !exactShape(rev,[
     "schema","audience","kind","logicalPath","contentSha256",
     "reviewedCodeSha","manifestSha256","rightsSha256",
     "runDayIndex","shardIndex","externalReviewEvidenceSha256",
     "reviewedAtUtc","retentionNotAfterUtc","validUntilUtc",
     "reviewerPublicKeyFingerprintSha256"
    ])||
    rev.schema!==P6_SOURCE_POST_REVIEW_SCHEMA||
    rev.audience!==P6_SOURCE_POST_REVIEW_AUDIENCE||
    !Object.hasOwn(PATHS,rev.kind)||
    !PATHS[rev.kind].test(rev.logicalPath??"")||
    !SHA.test(rev.contentSha256??"")||
    !CODE.test(rev.reviewedCodeSha??"")||
    ![rev.manifestSha256,rev.rightsSha256,
      rev.externalReviewEvidenceSha256,
      rev.reviewerPublicKeyFingerprintSha256].every(v=>SHA.test(v??""))||
    !Number.isSafeInteger(rev.runDayIndex)||rev.runDayIndex<1||
    rev.runDayIndex>31||
    !Number.isSafeInteger(rev.shardIndex)||rev.shardIndex<1||
    rev.shardIndex>100000||
    ![rev.contentSha256,rev.manifestSha256,rev.rightsSha256,
      rev.externalReviewEvidenceSha256,
      rev.reviewerPublicKeyFingerprintSha256].every((v,i)=>v===[
       pins.expectedContentSha256,pins.expectedManifestSha256,
       pins.expectedRightsSha256,pins.expectedExternalReviewEvidenceSha256,
       pins.expectedReviewerPublicKeyFingerprintSha256
      ][i])||
    rev.kind!==pins.expectedKind||
    rev.logicalPath!==pins.expectedLogicalPath||
    rev.reviewedCodeSha!==pins.expectedReviewedMainSha||
    rev.runDayIndex!==pins.expectedRunDayIndex||
    rev.shardIndex!==pins.expectedShardIndex||
    !LOGIN.test(pins.expectedPrivateSessionLogin??""))
  fail("MISSING_EXTERNAL_REVIEW_IDENTITY_AND_INDEPENDENT_PINS");
 const reviewed=exactUtc(rev.reviewedAtUtc);
 const expiry=exactUtc(rev.retentionNotAfterUtc);
 const validUntil=exactUtc(rev.validUntilUtc);
 if(expiry<=reviewed||expiry-reviewed>MAX_RETENTION_MS||
    validUntil<=reviewed||validUntil>expiry)
  fail("REVIEW_OR_RETENTION_WINDOW_UNSAFE");
 let pub,signature;
 try{
  pub=createPublicKey(publicKeyPem);
  const der=pub.export({format:"der",type:"spki"});
  if(h(der)!==pins.expectedReviewerPublicKeyFingerprintSha256||
     pub.asymmetricKeyType!=="ed25519"||
     typeof wire.signatureBase64!=="string"||
     !/^[A-Za-z0-9+/]{86}==$/.test(wire.signatureBase64))
    fail("WRONG_SIGNER_OR_SIGNATURE_FORMAT");
  signature=Buffer.from(wire.signatureBase64,"base64");
  if(signature.length!==64||
     signature.toString("base64")!==wire.signatureBase64||
     !verify(null,signedP6PrivateSourcePostReviewBytes(rev),pub,signature))
    fail("EXTERNAL_ED25519_SIGNATURE_BAD");
 }catch(e){
  if(String(e?.message??"").startsWith("HOLD_P6_PRIVATE_SOURCE_POST_READ_"))
   throw e;
  fail("EXTERNAL_ED25519_KEY_OR_SIGNATURE_INVALID");
 }
 return{
  review:rev,reviewedAtMs:reviewed,
  retentionNotAfterMs:expiry,validUntilMs:validUntil,
  ed25519SignatureCryptographicallyVerified:true,
  legalSourceRightsCertified:false,
  organizationalIndependenceCertified:false
 };
}
export async function readP6PrivateSourcePostOnce(
 client,pins,wire,publicKeyPem
){
 if(!client||typeof client.query!=="function")fail("NO_RESTRICTED_DB_CLIENT");
 // No SQL before verifying externally pinned identity and signature.
 const external=verifyP6ExternalSourcePostReview(
  wire,publicKeyPem,pins);
 let inTx=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  inTx=true;
  await client.query("SET LOCAL statement_timeout='8000ms'");
  await client.query("SET LOCAL lock_timeout='1200ms'");
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
   "grp.rolcanlogin AS group_can_login,"+
   "grp.rolbypassrls AS group_bypass_rls"+
   " FROM pg_catalog.pg_roles login,pg_catalog.pg_roles grp"+
   " WHERE login.rolname=session_user AND grp.rolname=current_user"
  );
  const id=rr?.rows?.[0];
  if(rr?.rowCount!==1||!id||id.db!=="neondb"||
     Number(id.server_version)<160000||Number(id.server_version)>=170000||
     id.ro!=="on"||id.replica!==false||id.actor!==READER||
     id.session_login!==pins.expectedPrivateSessionLogin||
     id.can_select!==true||id.can_insert!==false||
     id.can_update!==false||id.can_delete!==false||
     id.login_enabled!==true||id.login_superuser!==false||
     id.login_createrole!==false||
     id.group_can_login!==false||id.group_bypass_rls!==false)
   fail("NOT_REAL_PG16_RESTRICTED_READER_OR_ACL");
  const now=Date.parse(asUtc(id.db_now));
  if(external.reviewedAtMs>now||
     external.validUntilMs<=now||
     external.retentionNotAfterMs<=now||
     external.retentionNotAfterMs>now+MAX_RETENTION_MS)
   fail("EXTERNAL_SIGNATURE_EXPIRED_OR_CONTENTS_RETENTION_HOLD");
  const q=await client.query(
   "SELECT logical_path,run_day_index,shard_index,kind,"+
   "content_sha256,reviewed_code_sha,manifest_sha256,"+
   "rights_sha256,external_review_sha256,"+
   "externally_reviewed_at_utc,retention_not_after_utc,"+
   "committed_at_utc,payload_bytes"+
   " FROM "+TABLE+" WHERE logical_path=$1 AND kind=$2",
   [pins.expectedLogicalPath,pins.expectedKind]
  );
  const a=q?.rows?.[0],rev=external.review;
  if(q?.rowCount!==1||!a||
     a.logical_path!==rev.logicalPath||
     a.kind!==rev.kind||
     a.run_day_index!==rev.runDayIndex||
     a.shard_index!==rev.shardIndex||
     a.content_sha256!==rev.contentSha256||
     a.reviewed_code_sha!==rev.reviewedCodeSha||
     a.manifest_sha256!==rev.manifestSha256||
     a.rights_sha256!==rev.rightsSha256||
     a.external_review_sha256!==rev.externalReviewEvidenceSha256||
     asUtc(a.externally_reviewed_at_utc)!==rev.reviewedAtUtc||
     asUtc(a.retention_not_after_utc)!==rev.retentionNotAfterUtc||
     Date.parse(asUtc(a.committed_at_utc))<external.reviewedAtMs||
     Date.parse(asUtc(a.committed_at_utc))>now||
     !Buffer.isBuffer(a.payload_bytes)||
     a.payload_bytes.length<MIN_PAYLOAD||a.payload_bytes.length>MAX_PAYLOAD||
     h(a.payload_bytes)!==pins.expectedContentSha256)
   fail("NOT_EXACT_EXTERNALLY_SIGNED_PRIVATE_DB_PACKET");
  let packet;
  try{packet=JSON.parse(a.payload_bytes.toString("utf8"));}
  catch{fail("PRIVATE_PACKET_NOT_JSON");}
  if(!packet||typeof packet!=="object"||Array.isArray(packet))
   fail("PRIVATE_PACKET_NOT_JSON_OBJECT");
  await client.query("ROLLBACK");inTx=false;
  const receipt={redactedSummary:{
   schema:P6_PRIVATE_SOURCE_POST_READ_SCHEMA,
   status:"VERIFIED_ONE_PRIVATE_PACKET_BYTE_TRANSPORT_NO_GO",
   kind:rev.kind,runDayIndex:rev.runDayIndex,
   shardIndex:rev.shardIndex,contentSha256:rev.contentSha256,
   observedDatabaseClockUtc:new Date(now).toISOString(),
   verifiedEd25519Review:true,
   independentlyAuthorizedProviderUseCertified:false,
   reviewerOrganizationalIndependenceCertified:false,
   actualPhase6PaidGoCertified:false,
   contentsWereCopiedToPublicLogs:false,
   providerCalls:0,databaseWrites:0,githubDispatches:0
  }};
  Object.defineProperty(receipt,"privateBytes",{
   value:Buffer.from(a.payload_bytes),enumerable:false,writable:false
  });
  Object.defineProperty(receipt,"privateLogicalPath",{
   value:rev.logicalPath,enumerable:false,writable:false
  });
  return Object.freeze(receipt);
 }catch(e){
  if(inTx)await client.query("ROLLBACK").catch(()=>{});
  if(String(e?.message??"").startsWith("HOLD_P6_PRIVATE_SOURCE_POST_READ_"))
   throw e;
  fail("SQL_OR_AUTH_HOLD_REDACTED");
 }
}
/**
 * Local GH job filesystem only, never committed/uploaded or printed.
 * Requires an independently authorized job step to call it after the
 * external Ed25519 and real private PG16 read checks above. This is
 * NOT called automatically by existing SOURCE/POST jobs yet.
 */
export function materializeP6VerifiedPrivatePacketOnce(
 receipt,repoRoot,{privateEphemeralFileApproved=false}={}
){
 if(privateEphemeralFileApproved!==true||
    !receipt||!Buffer.isBuffer(receipt.privateBytes)||
    !Object.hasOwn(PATHS,receipt.redactedSummary?.kind)||
    !PATHS[receipt.redactedSummary.kind].test(receipt.privateLogicalPath??"")||
    h(receipt.privateBytes)!==receipt.redactedSummary.contentSha256)
  fail("UNVERIFIED_PRIVATE_EPHEMERAL_MATERIALIZATION");
 const root=resolve(repoRoot);
 let gitignore;
 try{gitignore=readFileSync(join(root,".gitignore"),"utf8");}
 catch{fail("REPO_GITIGNORE_MISSING");}
 if(!gitignore.split(/\r?\n/).includes("/data-collection/phase5/frozen/"))
  fail("PUBLIC_FROZEN_GIT_IGNORE_NOT_ENFORCED");
 const parent=join(root,"data-collection","phase5");
 const dir=join(parent,"frozen");
 try{
  for(const p of [root,join(root,"data-collection"),parent]){
   const st=lstatSync(p);
   if(!st.isDirectory()||st.isSymbolicLink())
    fail("REPO_PARENT_SYMLINK_REFUSED");
  }
  // Multiple distinct private SOURCE/POST packets may be needed in one
  // ephemeral runner. Reuse a non-symlink dir, never overwrite a file.
  mkdirSync(dir,{mode:0o700,recursive:true});
  const st=lstatSync(dir);
  if(!st.isDirectory()||st.isSymbolicLink())
   fail("FROZEN_DIRECTORY_SYMLINK_REFUSED");
  chmodSync(dir,0o700);
 }catch(e){
  if(String(e?.message??"").startsWith("HOLD_P6_PRIVATE_SOURCE_POST_READ_"))
   throw e;
  fail("FROZEN_DIRECTORY_NOT_PRIVATE_OR_EXISTS");
 }
 const file=resolve(root,receipt.privateLogicalPath);
 if(dirname(file)!==dir)fail("PRIVATE_FILE_OUTSIDE_GIT_IGNORED_DIR");
 try{writeFileSync(file,receipt.privateBytes,{flag:"wx",mode:0o600});}
 catch{fail("PRIVATE_FILE_ALREADY_EXISTS_OR_UNSAFE_NO_OVERWRITE");}
 let cleaned=false;
 const cleanup=()=>{
  if(cleaned)return;
  unlinkSync(file);
  cleaned=true;
 };
 return Object.freeze({
  pathRelativeToRepo:receipt.privateLogicalPath,
  contentsMustNotBeLogged:true,
  releaseByThisFunction:false,
  cleanup
 });
}

/**
 * Always-clean private-file boundary for a **separately admitted** existing
 * SOURCE or POST child. No paid authorization is implied here. In contrast
 * to two independent GH steps, a same-process try/finally cannot strand a
 * packet following an exception from the injected child callback.
 *
 * Caller must run the existing signed child admission (rights, budget,
 * planned UTC, POST receipt, STOP, idempotence) independently; this function
 * never sets or changes those controls and returns no child payload.
 */
export async function withP6VerifiedPrivatePacketForExistingChild(
 receipt,repoRoot,scope,runSeparatelyAdmittedChild
){
 if(!scope||
    scope.privateEphemeralFileApproved!==true||
    scope.existingChildIndependentlyAdmitted!==true||
    scope.privateSourcePostAccessOnly!==true||
    typeof runSeparatelyAdmittedChild!=="function")
  fail("EXISTING_CHILD_INDEPENDENT_ADMISSION_REQUIRED");
 let file;
 try{
  file=materializeP6VerifiedPrivatePacketOnce(receipt,repoRoot,{
   privateEphemeralFileApproved:true
  });
  // Only the exact relative path and redacted receipt are provided. The
  // child must not print/read out Contents to GitHub logs or persist it.
  await runSeparatelyAdmittedChild(
   file.pathRelativeToRepo,
   Object.freeze({...receipt.redactedSummary})
  );
  return Object.freeze({
   ...receipt.redactedSummary,
   status:"PRIVATE_JOB_PACKET_USED_AND_CLEANED_NO_PHASE6_RELEASE",
   mandatoryPrivateFileCleanupAttempted:true,
   sourceOrPostActualPaidResultAttestedHere:false,
   externalRightsOrBudgetGoCertifiedHere:false
  });
 }catch{
  // Do not echo errors from an injected child: they may include packet data.
  fail("EXISTING_CHILD_OPERATION_OR_PRIVATE_CLEANUP_HOLD_REDACTED");
 }finally{
  if(file){
   try{file.cleanup();}
   catch{
    // If cleanup fails, never record success; this must remain an incident.
    fail("PRIVATE_FILE_CLEANUP_FAILED_HOLD_NO_PUBLIC_BYTES");
   }
  }
 }
}
