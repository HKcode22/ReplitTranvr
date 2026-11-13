/**
 * Phase 5/6: STOP-default, private PostgreSQL16 registry-last publisher.
 *
 * This is the WRITE counterpart of the V0094 private read-only hydrator.
 * It uses an existing SOURCE registry already independently published into
 * V0094. An actual external Ed25519 review is verified before any INSERT.
 * No production LOGIN or secret is commissioned here; no workflows/provider
 * calls, Stage14 tasks or paid Phase6 GO are performed.
 *
 * A PostgreSQL transaction makes packets + registry visible atomically.
 * Unknown COMMIT = HOLD for a SEPARATE independently pinned readback.
 * Never automatically retry, delete, overwrite, or log private payloads.
 */
import {createHash} from "node:crypto";
import {
 verifyP5ExternalEd25519ReviewOfLaterShard,
 type P5Ed25519ReviewWireEnvelope,
 type P5ExternalLaterReviewSignerPins
} from "./phase5ExternalEd25519LaterShardReviewerVerify_v39";
import type {P5UnsignedLaterRegistryReviewPlan}
 from "./phase5ReviewedLaterPacketToUnsignedDayRegistryProposal_v39";

const TABLE="phase6_private.frozen_native_packet_v39";
const GROUP="phase6_private_frozen_publisher_v39";
const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const LOGIN=/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/;
const MAX_RETENTION_MS=7*24*60*60*1000;
const MIN_CUTOFF_LEAD_MS=15*60*1000;
const fail=(reason:string):never=>{
 throw Error("HOLD_P5_V0094_PRIVATE_PUBLISH_"+reason);
};
const sha=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
function exactUtc(value:unknown):number{
 if(typeof value!=="string"||!UTC.test(value)||
    !Number.isFinite(Date.parse(value))||
    new Date(value).toISOString()!==value)
  fail("INVALID_APPROVED_UTC");
 return Date.parse(value as string);
}
function dbUtc(value:unknown):number{
 const t=value instanceof Date?value:new Date(String(value));
 if(!Number.isFinite(t.getTime()))
  fail("INVALID_POSTGRESQL_CLOCK");
 return t.getTime();
}

export interface P5PrivatePgPublisherClient{
 query(sql:string,params?:unknown[]):Promise<{
  rowCount:number|null;rows:Record<string,unknown>[];
 }>;
}
export interface P5PrivatePgPublisherScope{
 /** Separate PRIVATE storage approval, not a scientific or paid GO. */
 privateStoragePublicationApproved:true;
 adbAutoCollect:"0";
 phase6ProcessArmed:"0";
 expectedPublisherSessionLogin:string;
 /** Independently reviewed SOURCE registry evidence, not derived from DB. */
 expectedSourceReviewEvidenceSha256:string;
 /** Independently approved lawful retention deadline (possibly <7 days). */
 approvedRetentionNotAfterUtc:string;
 /** Never infer provider Contents permission from a green CI test. */
}
export interface P5PrivatePgPublisherReceipt{
 schema:"v39.phase5.phase6-private-pg16-registry-last-publisher.v1";
 status:"EXTERNALLY_REVIEWED_PRIVATE_PG16_COMMIT_READBACK_REQUIRED_NO_GO";
 runDayIndex:number;shardIndex:number;
 sourceRegistrySha256:string;
 laterRegistrySha256:string;
 laterReviewEvidenceSha256:string;
 insertedPrivatePacketCount:number;
 insertedPrivateRowCount:number;
 sourceRegistryPrecommitted:true;
 singleAtomicTransaction:true;
 registryInsertedLast:true;
 independentPostCommitReadbackRequired:true;
 providerRightsCertifiedByThisFunction:false;
 organizationalReviewerIndependenceCertifiedHere:false;
 existingStage14OrV0091Called:false;
 githubDispatches:0;providerCalls:0;
 phase5ScientificFreezeGranted:false;phase6PaidGoGranted:false;
}
/** All database queries use constants and positional parameters. */
export async function publishP5ExternalLaterShardToPrivatePg16Once(
 client:P5PrivatePgPublisherClient,
 plan:P5UnsignedLaterRegistryReviewPlan,
 wire:P5Ed25519ReviewWireEnvelope,
 reviewerPublicKeyPem:string,
 pins:P5ExternalLaterReviewSignerPins,
 scope:P5PrivatePgPublisherScope
):Promise<P5PrivatePgPublisherReceipt>{
 if(!client||typeof client.query!=="function"||!scope||
    scope.privateStoragePublicationApproved!==true||
    scope.adbAutoCollect!=="0"||scope.phase6ProcessArmed!=="0"||
    !LOGIN.test(scope.expectedPublisherSessionLogin??"")||
    !SHA.test(scope.expectedSourceReviewEvidenceSha256??""))
  fail("MISSING_PRIVATE_ONLY_APPROVAL_OR_RESTRICTED_LOGIN");
 const expires=exactUtc(scope.approvedRetentionNotAfterUtc);
 let started=false,commitAttempted=false;
 try{
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  started=true;
  await client.query("SET LOCAL lock_timeout='3s'");
  await client.query("SET LOCAL statement_timeout='30000ms'");
  const identity=await client.query(
   "SELECT current_database() AS db, "+ 
   "current_setting('server_version_num')::integer AS server_version, "+
   "current_setting('transaction_read_only') AS ro, "+
   "current_user AS actor,session_user AS session_login, "+
   "clock_timestamp() AS db_now, "+
   "has_table_privilege(current_user,'"+TABLE+"','SELECT') AS can_read, "+
   "has_table_privilege(current_user,'"+TABLE+"','INSERT') AS can_insert, "+
   "has_table_privilege(current_user,'"+TABLE+"','UPDATE') AS can_update, "+
   "has_table_privilege(current_user,'"+TABLE+"','DELETE') AS can_delete, "+
   "login.rolcanlogin AS login_enabled, "+
   "login.rolsuper AS login_superuser, "+
   "login.rolcreaterole AS login_createrole, "+
   "login.rolbypassrls AS login_bypass_rls, "+
   "grp.rolcanlogin AS group_can_login, "+
   "grp.rolsuper AS group_superuser, "+
   "grp.rolbypassrls AS group_bypass_rls "+
   "FROM pg_catalog.pg_roles login,pg_catalog.pg_roles grp "+
   "WHERE login.rolname=session_user AND grp.rolname=current_user"
  );
  const id=identity.rows[0];
  if(identity.rowCount!==1||!id||id.db!=="neondb"||
     Number(id.server_version)<160000||id.ro!=="off"||
     id.actor!==GROUP||
     id.session_login!==scope.expectedPublisherSessionLogin||
     id.login_enabled!==true||id.login_superuser!==false||
     id.login_createrole!==false||id.login_bypass_rls!==false||
     id.group_can_login!==false||id.group_superuser!==false||
     id.group_bypass_rls!==false||
     id.can_read!==true||id.can_insert!==true||
     id.can_update!==false||id.can_delete!==false)
   fail("REAL_PG16_PUBLISHER_LOGIN_OR_ACL_MISMATCH");
  const now=dbUtc(id.db_now);
  if(expires<=now||expires>now+MAX_RETENTION_MS)
   fail("RETENTION_EXPIRED_OR_EXCEEDS_CONSERVATIVE_7D_CAP");
  // This verifies an externally pinned Ed25519 signature on the EXACT
  // packet manifest, SOURCE registry SHA, rights, code and day registry.
  // It does NOT assert legal rights or independent organizational identity.
  let verified:ReturnType<typeof verifyP5ExternalEd25519ReviewOfLaterShard>;
  try{
   verified=verifyP5ExternalEd25519ReviewOfLaterShard(
    plan,wire,reviewerPublicKeyPem,pins,new Date(now).toISOString());
  }catch{return fail("EXTERNAL_REVIEW_SIGNATURE_OR_BYTES_NOT_VERIFIED");}
  if(!plan||!wire||!SHA.test(plan.sourceRegistrySha256??"")||
     plan.sourceRegistrySha256!==verified.reviewedSourceDayRegistrySha256||
     plan.proposedRegistrySha256!==verified.reviewedRegistrySha256||
     plan.registryProposal.entries.length<1||
     plan.registryProposal.entries.length>96||
     plan.proposedPacketFiles.length!==plan.registryProposal.entries.length||
     verified.runDayIndex!==plan.registryProposal.runDayIndex||
     verified.shardIndex!==plan.registryProposal.shardIndex)
   fail("INCONSISTENT_EXTERNALLY_REVIEWED_SHARD");
  const sourcePath=plan.registryProposal.sourceDayRegistryFilePath;
  const source=await client.query(
   "SELECT logical_path,run_day_index,kind,content_sha256,"+
   "reviewed_code_sha,manifest_sha256,rights_sha256,"+
   "external_review_sha256,externally_reviewed_at_utc,"+
   "retention_not_after_utc FROM "+TABLE+
   " WHERE logical_path=$1 FOR SHARE",[sourcePath]
  );
  const s=source.rows[0];
  if(source.rowCount!==1||!s||s.logical_path!==sourcePath||
     s.kind!=="SOURCE_DAY_REGISTRY"||
     s.run_day_index!==verified.runDayIndex||
     s.content_sha256!==verified.reviewedSourceDayRegistrySha256||
     s.reviewed_code_sha!==pins.expectedApprovedMainCodeSha||
     s.manifest_sha256!==wire.review.reviewedManifestSha256||
     s.rights_sha256!==pins.expectedReviewedRightsSha256||
     s.external_review_sha256!==scope.expectedSourceReviewEvidenceSha256||
     dbUtc(s.externally_reviewed_at_utc)>now||
     dbUtc(s.retention_not_after_utc)<=now||
     expires>dbUtc(s.retention_not_after_utc))
   fail("PRECOMMITTED_SOURCE_REGISTRY_OR_RETENTION_NOT_VERIFIED");
  const files=plan.proposedPacketFiles;
  const paths=files.map(f=>f.filePath).concat([plan.proposedRegistryFilePath]);
  if(new Set(paths).size!==paths.length||paths.includes(sourcePath))
   fail("DUPLICATE_PRIVATE_REGISTRY_OR_PACKET_PATH");
  const prior=await client.query(
   "SELECT count(*)::integer AS n FROM "+TABLE+
   " WHERE logical_path=ANY($1::text[])",[paths]
  );
  if(prior.rowCount!==1||prior.rows[0]?.n!==0)
   fail("EXISTING_OR_PARTIAL_PRIVATE_SHARD_INDEPENDENT_READBACK_REQUIRED");
  const ensureLead=(clock:number)=>{
   for(const e of plan.registryProposal.entries){
    const selected=exactUtc(e.expectedSelectedTNativeUtc);
    const lead=e.expectedHorizon==="T-6h"?6*3600_000:
      e.expectedHorizon==="T-90m"?90*60_000:NaN;
    if(!Number.isFinite(lead)||selected-lead-clock<=MIN_CUTOFF_LEAD_MS)
     fail("LATE_OR_TOO_CLOSE_NATIVE_PRE_CUTOFF_NO_BACKFILL");
   }
  };
  ensureLead(now);
  const insert="INSERT INTO "+TABLE+" ("+
   "logical_path,run_day_index,shard_index,kind,content_sha256,"+
   "reviewed_code_sha,manifest_sha256,rights_sha256,"+
   "external_review_sha256,externally_reviewed_at_utc,"+
   "retention_not_after_utc,payload_bytes) "+
   "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)";
  const base=[
   verified.runDayIndex,verified.shardIndex,
   pins.expectedApprovedMainCodeSha,wire.review.reviewedManifestSha256,
   pins.expectedReviewedRightsSha256,
   wire.review.independentReviewerEvidenceDigestSha256,
   wire.review.reviewedAtUtc,scope.approvedRetentionNotAfterUtc
  ] as const;
  const put=async(path:string,kind:string,bytes:Buffer,expectedSha:string)=>{
   if(!Buffer.isBuffer(bytes)||sha(bytes)!==expectedSha)
    fail("PRIVATE_PAYLOAD_CHANGED_AFTER_SIGNATURE");
   const q=await client.query(insert,[
    path,base[0],base[1],kind,expectedSha,
    base[2],base[3],base[4],base[5],base[6],base[7],bytes
   ]);
   if(q.rowCount!==1)
    fail("INDETERMINATE_PG16_INSERT_NEEDS_READBACK");
  };
  for(const f of files)
   await put(f.filePath,"LATER_PRE_PACKET",f.bytes,f.sha256);
  // Registry-last within ONE SQL transaction: all-or-nothing visibility.
  await put(plan.proposedRegistryFilePath,"LATER_PRE_DAY_REGISTRY",
   plan.registryProposalBytes,plan.proposedRegistrySha256);
  const beforeCommit=await client.query("SELECT clock_timestamp() AS db_now");
  if(beforeCommit.rowCount!==1)
   fail("UNKNOWN_PRECOMMIT_DATABASE_CLOCK");
  const lastClock=dbUtc(beforeCommit.rows[0]?.db_now);
  if(lastClock<now||expires<=lastClock)
   fail("TIME_MOVED_BACK_OR_RETENTION_EXPIRED_BEFORE_COMMIT");
  ensureLead(lastClock);
  commitAttempted=true;
  await client.query("COMMIT");
  started=false;
  return{
   schema:"v39.phase5.phase6-private-pg16-registry-last-publisher.v1",
   status:"EXTERNALLY_REVIEWED_PRIVATE_PG16_COMMIT_READBACK_REQUIRED_NO_GO",
   runDayIndex:verified.runDayIndex,shardIndex:verified.shardIndex,
   sourceRegistrySha256:verified.reviewedSourceDayRegistrySha256,
   laterRegistrySha256:verified.reviewedRegistrySha256,
   laterReviewEvidenceSha256:
    wire.review.independentReviewerEvidenceDigestSha256,
   insertedPrivatePacketCount:files.length,
   insertedPrivateRowCount:files.length+1,
   sourceRegistryPrecommitted:true,
   singleAtomicTransaction:true,registryInsertedLast:true,
   independentPostCommitReadbackRequired:true,
   providerRightsCertifiedByThisFunction:false,
   organizationalReviewerIndependenceCertifiedHere:false,
   existingStage14OrV0091Called:false,githubDispatches:0,providerCalls:0,
   phase5ScientificFreezeGranted:false,phase6PaidGoGranted:false
  };
 }catch{
  // An ambiguous COMMIT has possibly succeeded. Never retry, and NEVER
  // query or ROLLBACK on the same connection after COMMIT uncertainty.
  if(commitAttempted)
   return fail("UNKNOWN_COMMIT_INDEPENDENT_READBACK_NO_RETRY");
  return fail("PRECOMMIT_ABORT_OR_UNVERIFIED_SOURCE_NO_RETRY");
 }finally{
  if(started&&!commitAttempted)
   await client.query("ROLLBACK").catch(()=>{});
 }
}
