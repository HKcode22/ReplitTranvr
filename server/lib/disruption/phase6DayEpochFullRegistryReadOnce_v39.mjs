/**
 * Phase5 P0: read every exact signed private SOURCE/PRE/POST registry for ONE
 * Phase6 run-day index using the NEW day-scoped architecture (#658/#659).
 * NO provider, paid child, GitHub dispatch, SQL mutation, owner migration,
 * private checkout file, new credential or scientific GO.
 *
 * This is a transport/integrity bridge, NOT physical-flight validation.
 * A subsequent stage must invoke the existing authoritative Phase5 semantic
 * SOURCE -> Stage14/V0081 PRE -> V0083 POST admissions before any paid action.
 */
import {createHash} from "node:crypto";
import {readP6DayEpochIndexCurrentPriorOnce}
 from "./phase6DayEpochSignedIndexOnce_v39.mjs";

export const P6_DAY_EPOCH_FULL_REGISTRY_SCHEMA=
 "v39.phase6.day-epoch-full-private-registry-readonly-no-dispatch.v1";
const PACKETS="phase6_private.frozen_native_packet_v39";
const INDEX="phase6_private.signed_run_day_index_revision_v39";
const GROUP="phase6_private_frozen_reader_v39";
const SHA=/^[a-f0-9]{64}$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const KINDS={SOURCE:"SOURCE_DAY_REGISTRY",
 LATER_PRE:"LATER_PRE_DAY_REGISTRY",POST:"POST_PACKET"};
const MAX_BYTES=32*1024*1024,MAX_PACKET=250000,MAX_ENTRIES=1024;
const fail=code=>{throw Error("HOLD_P6_DAY_EPOCH_FULL_REGISTRY_"+code);};
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
function millis(value){
 const d=value instanceof Date?value:new Date(String(value));
 if(!Number.isFinite(d.getTime()))fail("INVALID_DB_CLOCK_REDACTED");
 return d.getTime();
}

/**
 * Caller passes an already established independently scoped reader LOGIN,
 * with SET ROLE phase6_private_frozen_reader_v39.
 * All returned private bytes/paths are deliberately non-enumerable.
 */
export async function hydrateP6DayEpochFullRegistriesReadOnly({
 client,pins,wire,publicKeyPem,scope
}){
 if(!client||typeof client.query!=="function"||
    scope?.privateDayRegistryReadOnlyApproved!==true||
    scope?.existingPaidDispatchApproved!==false||
    pins?.privateDayIndexReadOnlyApproved!==true)
  fail("NO_EXPLICIT_READONLY_APPROVAL");
 // Reuse the actual Ed25519 reviewer, PG16 reader-role, current/prior
 // day-only chain and immutable index SHA checks. No alternate verifier.
 const signed=await readP6DayEpochIndexCurrentPriorOnce({
  client,pins,wire,publicKeyPem
 });
 const summary=signed?.redactedSummary;
 const index=signed?.currentParsedIndex;
 const raw=signed?.currentIndexBytes;
 const prior=signed?.previousIndexBytes;
 if(summary?.status!=="SIGNED_SAME_DAY_INDEX_CURRENT_PRIOR_READ_NO_DISPATCH"||
    summary.exactRestrictedReaderRoleVerified!==true||
    summary.phase6PaidGo!==false||summary.providerCalls!==0||
    summary.databaseWrites!==0||!Buffer.isBuffer(raw)||
    !index||!Array.isArray(index.entries)||
    index.runDayIndex!==pins.expectedRunDayIndex||
    index.revision!==pins.expectedIndexRevision||
    index.entries.length<1||index.entries.length>MAX_ENTRIES)
  fail("UNVERIFIED_DAY_INDEX_RECEIPT");
 const paths=index.entries.map(x=>x.filePath);
 if(paths.some(x=>typeof x!=="string"||!PATH.test(x))||
    new Set(paths).size!==paths.length)
  fail("DUPLICATE_OR_UNSAFE_PRIVATE_REGISTRY_PATHS");
 const expected=new Map(index.entries.map(x=>[x.filePath,x]));
 let begun=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  begun=true;
  await client.query("SET LOCAL statement_timeout='18000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const ident=await client.query(
   "SELECT current_database() AS db,"+
   "current_setting('server_version_num')::integer AS version,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_catalog.pg_is_in_recovery() AS replica,"+
   "current_user AS actor,session_user AS login,"+
   "clock_timestamp() AS db_now,"+
   "has_table_privilege(current_user,'"+INDEX+"','SELECT') AS read_index,"+
   "has_table_privilege(current_user,'"+INDEX+"','INSERT') AS write_index,"+
   "has_table_privilege(current_user,'"+PACKETS+"','SELECT') AS read_packets,"+
   "has_table_privilege(current_user,'"+PACKETS+"','INSERT') AS write_packets,"+
   "has_table_privilege(current_user,'"+PACKETS+"','UPDATE') AS update_packets,"+
   "has_table_privilege(current_user,'"+PACKETS+"','DELETE') AS delete_packets"
  );
  const id=ident?.rows?.[0];
  if(ident?.rowCount!==1||!id||id.db!=="neondb"||
     Number(id.version)<160000||Number(id.version)>=170000||
     id.ro!=="on"||id.replica!==false||id.actor!==GROUP||
     id.login!==pins.expectedReaderSessionLogin||
     id.read_index!==true||id.write_index!==false||
     id.read_packets!==true||id.write_packets!==false||
     id.update_packets!==false||id.delete_packets!==false)
   fail("SECOND_TX_NOT_RESTRICTED_PG16_READER");
  const now=millis(id.db_now),before=millis(summary.realDbClockUtc);
  const review=wire?.review;
  if(now<before||now-before>120000||!review||
     now<millis(review.reviewedAtUtc)||
     now>=millis(review.validUntilUtc)||
     now>=millis(review.retentionNotAfterUtc))
   fail("DAY_INDEX_EXPIRED_BETWEEN_READS");
  const count=await client.query(
   "SELECT count(*)::integer AS n,"+
   "COALESCE(sum(octet_length(payload_bytes)),0)::bigint AS bytes"+
   " FROM "+PACKETS+" WHERE logical_path=ANY($1::text[])",[paths]);
  const n=Number(count?.rows?.[0]?.n);
  const bytes=Number(count?.rows?.[0]?.bytes);
  if(count?.rowCount!==1||n!==paths.length||
     !Number.isSafeInteger(bytes)||bytes<=0||bytes>MAX_BYTES)
   fail("INCOMPLETE_OR_OVERSIZE_PRIVATE_DAY_REGISTRY_SET");
  const got=await client.query(
   "SELECT logical_path,run_day_index,shard_index,kind,"+
   "content_sha256,reviewed_code_sha,manifest_sha256,rights_sha256,"+
   "external_review_sha256,externally_reviewed_at_utc,"+
   "retention_not_after_utc,committed_at_utc,payload_bytes"+
   " FROM "+PACKETS+" WHERE logical_path=ANY($1::text[])",[paths]);
  if(got?.rowCount!==paths.length||
     !Array.isArray(got.rows)||got.rows.length!==paths.length)
   fail("PRIVATE_DAY_REGISTRY_SET_MISSING");
  const map=new Map();
  let total=0;
  for(const row of got.rows){
   const e=expected.get(row?.logical_path);
   if(!e||map.has(row.logical_path)||
      row.run_day_index!==review.runDayIndex||
      row.shard_index!==e.shardIndex||
      row.kind!==KINDS[e.lane]||
      !SHA.test(row.content_sha256??"")||
      row.content_sha256!==e.fileSha256||
      row.reviewed_code_sha!==review.reviewedCodeSha||
      row.manifest_sha256!==review.manifestSha256||
      row.rights_sha256!==review.rightsSha256||
      row.external_review_sha256!==e.reviewEvidenceSha256||
      !Buffer.isBuffer(row.payload_bytes)||
      row.payload_bytes.length<80||
      row.payload_bytes.length>MAX_PACKET||
      hash(row.payload_bytes)!==e.fileSha256||
      millis(row.externally_reviewed_at_utc)>now||
      millis(row.committed_at_utc)>millis(e.publishedAtUtc)||
      millis(row.retention_not_after_utc)<millis(review.retentionNotAfterUtc)||
      millis(row.retention_not_after_utc)<=now)
    fail("REGISTRY_SHA_DAY_KIND_RIGHTS_OR_RETENTION_DRIFT");
   map.set(row.logical_path,Buffer.from(row.payload_bytes));
   total+=row.payload_bytes.length;
  }
  if(total!==bytes||map.size!==expected.size)
   fail("PRIVATE_DAY_SNAPSHOT_INCONSISTENT");
  await client.query("ROLLBACK");begun=false;
  const output={redactedSummary:Object.freeze({
   schema:P6_DAY_EPOCH_FULL_REGISTRY_SCHEMA,
   status:"SIGNED_DAY_EPOCH_FULL_REGISTRY_READONLY_NO_DISPATCH",
   runDayIndex:review.runDayIndex,
   indexRevision:review.indexRevision,
   indexSha256:review.indexSha256,
   privateRegistryCount:paths.length,verifiedPrivateBytes:total,
   observedDbClockUtc:new Date(now).toISOString(),
   externalEd25519ReviewerVerified:true,
   restrictedPrivatePg16ReaderVerified:true,
   actualPrivateRegistryBytesRead:true,
   authoritativeFlightSemanticAdmissionDone:false,
   physicalOperatingFlightEvidenceCertified:false,
   providerContentsLicenseCertifiedHere:false,
   ownerExpiryAndPitrDeletionCertifiedHere:false,
   privateBytesWrittenToCheckout:false,
   providerCalls:0,databaseWrites:0,githubChildDispatches:0,
   phase6PaidGo:false
  })};
  Object.defineProperties(output,{
   privateCurrentIndexBytes:{enumerable:false,value:Buffer.from(raw)},
   privatePreviousIndexBytes:{enumerable:false,
    value:Buffer.isBuffer(prior)?Buffer.from(prior):null},
   privateParsedIndex:{enumerable:false,value:index},
   getFrozen:{enumerable:false,value:(path)=>{
    if(typeof path!=="string"||!map.has(path))
     fail("UNSIGNED_PRIVATE_REGISTRY_LOOKUP");
    return Buffer.from(map.get(path));
   }}
  });
  return Object.freeze(output);
 }catch(e){
  if(begun)await client.query("ROLLBACK").catch(()=>{});
  const message=String(e?.message??"");
  if(/^HOLD_P6_DAY_EPOCH_FULL_REGISTRY_[A-Z0-9_]+$/.test(message))
   throw e;
  fail("RESTRICTED_PRIVATE_PG16_READ_FAILED_REDACTED");
 }
}
