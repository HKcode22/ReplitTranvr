/**
 * Phase6: actual restricted-PG16 in-memory bridge from externally Ed25519
 * reviewed V0096 current/prior index -> exact V0094/V0095 SOURCE/PRE/POST
 * registry bytes -> EXISTING Phase5/6 append-only day/shard planner.
 *
 * Zero provider REST, GitHub dispatch, paid action or SQL writes. No public
 * frozen/ checkout bytes or loggable flight paths. Never treats a signed
 * index or review signature alone as lawful provider Contents use.
 *
 * Do not enable unattended GH jobs until current real source, calendar,
 * external reviewer/retention and restricted credential installation pass.
 */
import {createHash} from "node:crypto";
import {readP6PrivateSignedIndexCurrentAndPriorOnce}
 from "./phase6PrivateSignedIndexReadOnce_v39.mjs";
import {planP6ThirtyOneDaySignedShardHandoffs}
 from "./phase6SignedThirtyOneDayShardHandoff_v39.ts";

export const P6_PRIVATE_FULL_REGISTRY_BRIDGE_SCHEMA=
 "v39.phase6.private-index-and-full-registries-memory-handoff-no-dispatch.v1";
const PACKETS="phase6_private.frozen_native_packet_v39";
const INDEX="phase6_private.signed_day_shard_index_revision_v39";
const GROUP="phase6_private_frozen_reader_v39";
const HASH=/^[0-9a-f]{64}$/;
const MAX_ENTRIES=1024;
const MAX_TOTAL_BYTES=32*1024*1024;
const MAX_PACKET=250000;
const KINDS={
 SOURCE:"SOURCE_DAY_REGISTRY",
 LATER_PRE:"LATER_PRE_DAY_REGISTRY",
 POST:"POST_PACKET"
};
const fail=code=>{
 throw Error("HOLD_P6_PRIVATE_INMEMORY_REGISTRY_HANDOFF_"+code);
};
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
const actualTime=t=>{
 const d=t instanceof Date?t:new Date(String(t));
 if(!Number.isFinite(d.getTime()))
  fail("INVALID_POSTGRESQL_CLOCK");
 return d.getTime();
};
/** Data fields are non-enumerable so JSON.stringify only shows redacted summary. */
export async function hydrateP6SignedIndexAndFullRegistryHandoffsReadOnly({
 client,reviewPins,reviewWire,reviewerPublicKeyPem
}){
 if(!client||typeof client.query!=="function"||
    !reviewPins||reviewPins.privateIndexReadOnlyApproved!==true||
    reviewPins.existingPaidGithubDispatchApproved!==false)
  fail("NO_DISTINCT_PRIVATE_ONLY_AND_NO_PAID_ADMISSION");
 // This function performs the cryptographic external review, restricted
 // reader login/ACL, exact index byte-SHA, current+prior JSON shape and
 // append-only validation before any registry SELECT is attempted.
 const verified=await readP6PrivateSignedIndexCurrentAndPriorOnce({
  client,pins:reviewPins,reviewWire,reviewerPublicKeyPem
 });
 const summary=verified?.redactedSummary;
 const index=verified?.currentParsedIndex;
 const raw=verified?.currentIndexBytes;
 const prior=verified?.previousParsedIndex;
 const priorRaw=verified?.previousIndexBytes;
 if(summary?.status!==
     "EXTERNALLY_SIGNED_CURRENT_PLUS_PREVIOUS_INDEX_VERIFIED_NO_GO"||
    summary?.exactReaderAndPrivateAclVerified!==true||
    summary?.providerCalls!==0||summary?.databaseWrites!==0||
    summary?.phase6PaidGo!==false||
    !Buffer.isBuffer(raw)||!index||
    index.revision!==reviewPins.expectedIndexRevision||
    summary.currentRevision!==index.revision||
    summary.currentIndexSha256!==reviewPins.expectedIndexSha256||
    summary.previousIndexSha256!==reviewPins.expectedPreviousIndexSha256||
    !Array.isArray(index.entries)||
    index.entries.length<1||index.entries.length>MAX_ENTRIES)
  fail("UNVERIFIED_PRIVATE_INDEX_READER_RECEIPT");
 const paths=index.entries.map(x=>x?.filePath);
 if(paths.some(p=>typeof p!=="string"||
    !/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/.test(p))||
    new Set(paths).size!==paths.length)
  fail("UNBOUNDED_DUPLICATE_OR_BAD_REGISTRY_PATH");
 const expected=new Map(index.entries.map(x=>[x.filePath,x]));
 let begun=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  begun=true;
  await client.query("SET LOCAL statement_timeout='18000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const idRes=await client.query(
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
  const id=idRes?.rows?.[0];
  if(idRes?.rowCount!==1||!id||
     id.db!=="neondb"||Number(id.version)<160000||
     Number(id.version)>=170000||id.ro!=="on"||
     id.replica!==false||id.actor!==GROUP||
     id.login!==reviewPins.expectedReaderSessionLogin||
     id.read_index!==true||id.write_index!==false||
     id.read_packets!==true||id.write_packets!==false||
     id.update_packets!==false||id.delete_packets!==false)
   fail("SECOND_TX_NOT_RESTRICTED_PG16_READER");
  const now=actualTime(id.db_now);
  const prevNow=actualTime(summary.observedRestrictedPgClockUtc);
  if(now<prevNow||now-prevNow>120000)
   fail("INDEX_AND_REGISTRY_CLOCK_TOO_FAR_APART_NO_CUTOFF");
  const review=reviewWire?.review;
  if(!review||
     now>=actualTime(review.validUntilUtc)||
     now>=actualTime(review.retentionNotAfterUtc)||
     now<actualTime(review.reviewedAtUtc))
   fail("INDEX_EXTERNAL_SIGNED_REVIEW_EXPIRED_BETWEEN_READS");
  // Keep the SQL byte transfer bounded BEFORE selecting payload_bytes:
  // worst-case 1024 * 250kB = 256MB, not appropriate for a GH runner.
  const count=await client.query(
   "SELECT count(*)::integer AS n,"+
   "COALESCE(sum(octet_length(payload_bytes)),0)::bigint AS bytes"+
   " FROM "+PACKETS+" WHERE logical_path=ANY($1::text[])",
   [paths]
  );
  const n=Number(count?.rows?.[0]?.n),
    size=Number(count?.rows?.[0]?.bytes);
  if(count?.rowCount!==1||n!==paths.length||
     !Number.isSafeInteger(size)||size<=0||
     size>MAX_TOTAL_BYTES)
   fail("MISSING_OR_TOO_LARGE_SIGNED_PRIVATE_REGISTRY_SET");
  const out=await client.query(
   "SELECT logical_path,run_day_index,shard_index,kind,"+
   "content_sha256,reviewed_code_sha,manifest_sha256,"+
   "rights_sha256,external_review_sha256,externally_reviewed_at_utc,"+
   "retention_not_after_utc,committed_at_utc,payload_bytes"+
   " FROM "+PACKETS+" WHERE logical_path=ANY($1::text[])",
   [paths]
  );
  if(out?.rowCount!==paths.length||
     !Array.isArray(out.rows)||out.rows.length!==paths.length)
   fail("SIGNED_PRIVATE_REGISTRY_SET_CHANGED_OR_MISSING");
  const map=new Map();
  let realBytes=0;
  for(const row of out.rows){
   const e=expected.get(row?.logical_path);
   if(!e||map.has(row.logical_path)||
      row.kind!==KINDS[e.lane]||
      row.run_day_index!==e.runDayIndex||
      row.shard_index!==e.shardIndex||
      row.content_sha256!==e.fileSha256||
      row.reviewed_code_sha!==review.reviewedCodeSha||
      row.manifest_sha256!==review.manifestSha256||
      row.rights_sha256!==review.rightsSha256||
      row.external_review_sha256!==e.reviewEvidenceSha256||
      !HASH.test(row.content_sha256??"")||
      !Buffer.isBuffer(row.payload_bytes)||
      row.payload_bytes.length<80||
      row.payload_bytes.length>MAX_PACKET||
      digest(row.payload_bytes)!==e.fileSha256||
      actualTime(row.externally_reviewed_at_utc)>now||
      actualTime(row.committed_at_utc)>Date.parse(e.publishedAtUtc)||
      actualTime(row.retention_not_after_utc)<now||
      actualTime(row.retention_not_after_utc)<
       actualTime(review.retentionNotAfterUtc))
    fail("PRIVATE_REGISTRY_SHA_KIND_DAY_REVIEW_OR_RETENTION_DRIFT");
   map.set(row.logical_path,Buffer.from(row.payload_bytes));
   realBytes+=row.payload_bytes.length;
  }
  if(realBytes!==size||map.size!==paths.length)
   fail("PRIVATE_REGISTRY_SNAPSHOT_BYTES_INCONSISTENT");
  // Invoke the pre-existing full semantic index validator. Unlike the
  // preceding signed publication test, this parses and checks every real
  // registry's SOURCE query identities, PRE horizons, POST approval and
  // intra-day provenance, with the actual restricted PostgreSQL clock.
  const pins={
   expectedIndexSha256:reviewPins.expectedIndexSha256,
   exactExternallyReviewedIndexSha256:reviewPins.expectedIndexSha256,
   expectedManifestSha256:reviewPins.expectedManifestSha256,
   expectedCalendarSha256:reviewPins.expectedCalendarSha256,
   expectedCodeSha:reviewPins.expectedReviewedCodeSha,
   expectedReleaseSha256:reviewPins.expectedReleaseSha256,
   expectedRightsSha256:reviewPins.expectedRightsSha256,
   observedDbClockUtc:new Date(now).toISOString()
  };
  const route=planP6ThirtyOneDaySignedShardHandoffs(
   raw,index,pins,(path)=>{
    const value=map.get(path);
    if(!value)fail("UNSIGNED_INDEX_REFERENCED_PRIVATE_PACKET");
    return value;
   },priorRaw,prior
  );
  if(route.operatorSummary?.githubChildDispatches!==0||
     route.operatorSummary?.providerCalls!==0||
     route.operatorSummary?.phase6PaidGo!==false)
   fail("PLAN_NOT_A_NONPAID_HANDOFF");
  await client.query("ROLLBACK");
  begun=false;
  const response={
   redactedSummary:Object.freeze({
    ...route.operatorSummary,
    schema:P6_PRIVATE_FULL_REGISTRY_BRIDGE_SCHEMA,
    status:"SIGNED_RESTRICTED_INMEMORY_31DAY_REGISTRY_HANDOFF_NO_DISPATCH",
    currentIndexSha256:reviewPins.expectedIndexSha256,
    currentIndexRevision:index.revision,
    verifiedRegistryCount:paths.length,
    verifiedTotalRegistryBytes:realBytes,
    observedRestrictedPgClockUtc:pins.observedDbClockUtc,
    privateRegistryBytesWereNeverWrittenToCheckout:true,
    privateSignedPathsExcludedFromPublicJson:true,
    externalSignedReviewerIsNotProviderRightsProof:true,
    underlyingPerFlightPacketsNotHydratedHere:true,
    independentPaidChildAdmissionStillRequired:true,
    existingGhWorkersUnchanged:true,
    providerCalls:0,databaseWrites:0,
    githubChildDispatches:0,phase6PaidGo:false
   })
  };
  Object.defineProperties(response,{
   privateRoutingCandidates:{
    enumerable:false,writable:false,
    value:route.privateRoutingCandidates
   },
   privateRegistryBytes:{
    enumerable:false,writable:false,value:map
   }
  });
  return Object.freeze(response);
 }catch(e){
  if(begun)await client.query("ROLLBACK").catch(()=>{});
  const message=String(e?.message??"");
  if(/^HOLD_P6_PRIVATE_INMEMORY_REGISTRY_HANDOFF_[A-Z0-9_]+$/.test(message))
   throw e;
  // Distinct existing semantic validator HOLD codes may contain schema/path
  // tokens. Never disclose arbitrary provider bytes or PostgreSQL strings.
  if(/^REFUSED_P5_PHASE6_APPEND_ONLY_SHARD_INDEX_[A-Z0-9_]+$/.test(message)||
     /^HOLD_P6_SIGNED_AUTONOMOUS_SHARD_HANDOFF_[A-Z0-9_]+$/.test(message))
   throw e;
  fail("SIGNED_REGISTRY_OR_PG16_READ_FAILED_REDACTED");
 }
}
