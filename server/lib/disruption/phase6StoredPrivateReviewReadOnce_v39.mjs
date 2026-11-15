/**
 * V0098 stored signed review retrieval. No provider, dispatch, mutation or GO.
 * Reuses the existing PG16 ACL check and #678 dynamic Ed25519 resolver.
 * Select exact committed metadata plus small wire, NOT raw flight payload.
 * Caller must use an independently approved stable trust object and actual
 * signed registry selector; later original byte readers and child gates
 * are mandatory. No caller-supplied signer from row or workflow input.
 */
import {readP6DayEpochRestrictedReaderClock} from "./phase6DayEpochSignedIndexOnce_v39.mjs";
import {resolveP6DynamicDayReview,resolveP6DynamicSourceQueryReview}
 from "./phase6DynamicSourceReviewSelection_v39.mjs";
const INDEX="phase6_private.signed_run_day_index_revision_v39";
const PACKET="phase6_private.frozen_native_packet_v39";
const SHA=/^[a-f0-9]{64}$/;
const PATH=/^data-collection\/phase5\/frozen\/sourceq_[A-Za-z0-9_.-]{8,110}\.json$/;
const fail=s=>{throw Error("HOLD_P6_STORED_REVIEW_"+s);};
function wireOf(row){
 const b=row?.review_wire_bytes;
 if(!Buffer.isBuffer(b)||b.length<100||b.length>4096)
  fail("ABSENT_OR_OVERSIZE_WIRE_NO_STATIC_FALLBACK");
 try{
  const raw=b.toString("utf8"),wire=JSON.parse(raw);
  if(!Buffer.from(JSON.stringify(wire),"utf8").equals(b))
   fail("NONEXACT_JSON_WIRE_BYTES");
  return wire;
 }catch{fail("INVALID_STORED_WIRE_BYTES");}
}
function time(v){
 const d=v instanceof Date?v:new Date(String(v));
 if(!Number.isFinite(d.getTime()))fail("INVALID_ROW_CLOCK");
 return d.toISOString();
}
function checkRow(row,wire,now,trust){
 const rev=wire?.review;
 if(row.reviewed_code_sha!==trust.reviewedCodeSha||
    row.manifest_sha256!==trust.manifestSha256||
    row.rights_sha256!==trust.rightsSha256||
    time(row.externally_reviewed_at_utc)!==rev?.reviewedAtUtc||
    time(row.retention_not_after_utc)!==rev.retentionNotAfterUtc||
    time(row.committed_at_utc)<rev.reviewedAtUtc||
    time(row.committed_at_utc)>now||
    time(row.retention_not_after_utc)<=now)
  fail("ROW_STUDY_CLOCK_OR_EXPIRY_DRIFT");
}
export async function readP6StoredPrivateReviewOnce({client,trust,selector,scope}){
 if(!client||typeof client.query!=="function"||
    scope?.privateStoredReviewReadOnlyApproved!==true||
    scope?.existingPaidDispatchApproved!==false||
    trust?.independentStudyTrustPinsApproved!==true||
    !Number.isSafeInteger(selector?.runDayIndex)||
    selector.runDayIndex<1||selector.runDayIndex>31)
  fail("NO_INDEPENDENT_READ_SCOPE");
 const s=selector;
 const current=s.kind==="CURRENT_DAY";
 const exact=s.kind==="EXACT_DAY";
 const query=s.kind==="SOURCE_QUERY";
 if((!current&&!exact&&!query)||
    (exact&&(!Number.isSafeInteger(s.indexRevision)||s.indexRevision<1||
      s.indexRevision>1024||!SHA.test(s.indexSha256??"")))||
    (query&&(!PATH.test(s.logicalPath??"")||!SHA.test(s.contentSha256??"")||
      !Number.isSafeInteger(s.shardIndex)||s.shardIndex<1||s.shardIndex>100000)))
  fail("UNMATCHED_EXACT_SELECTOR");
 let begun=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  begun=true;
  await client.query("SET LOCAL statement_timeout='8000ms'");
  await client.query("SET LOCAL lock_timeout='1200ms'");
  const now=await readP6DayEpochRestrictedReaderClock(client,trust.expectedReaderSessionLogin);
  const fields="run_day_index,content_sha256,reviewed_code_sha,manifest_sha256,"+
   "rights_sha256,external_review_sha256,externally_reviewed_at_utc,"+
   "retention_not_after_utc,committed_at_utc,review_wire_bytes";
  const res=query?await client.query("SELECT "+fields+
    ",logical_path,shard_index,kind FROM "+PACKET+
    " WHERE logical_path=$1 AND kind='SOURCE_QUERY_PACKET'",[s.logicalPath]):
   await client.query("SELECT "+fields+
    ",revision,previous_index_sha256,calendar_sha256,release_sha256 FROM "+INDEX+
    " WHERE run_day_index=$1"+(exact?" AND revision=$2":" ORDER BY revision DESC LIMIT 1"),
    exact?[s.runDayIndex,s.indexRevision]:[s.runDayIndex]);
  // Only an actual empty CURRENT_DAY result can be isolated by a
  // prospective planner. Corrupt shape, missing exact child references,
  // SQL/ACL or signature failures remain hard holds.
  if(current&&res?.rowCount===0&&Array.isArray(res.rows)&&res.rows.length===0)
   fail("CURRENT_DAY_NOT_PUBLISHED_OR_RETAINED");
  if(res?.rowCount!==1||res.rows?.length!==1)
   fail("EXACT_COMMITTED_REVIEW_NOT_FOUND");
  const row=res.rows[0],wire=wireOf(row);
  checkRow(row,wire,now,trust);
  if(row.run_day_index!==s.runDayIndex)
   fail("CROSS_DAY_REVIEW");
  let result;
  if(query){
   if(row.kind!=="SOURCE_QUERY_PACKET"||row.logical_path!==s.logicalPath||
      row.shard_index!==s.shardIndex||row.content_sha256!==s.contentSha256)
    fail("QUERY_REGISTRY_SELECTOR_DRIFT");
   result=resolveP6DynamicSourceQueryReview({trust,wires:[wire],
    observedDbClockUtc:now,selector:{runDayIndex:s.runDayIndex,
     shardIndex:s.shardIndex,logicalPath:s.logicalPath,
     contentSha256:s.contentSha256,externalReviewEvidenceSha256:row.external_review_sha256}});
  }else{
   if(row.calendar_sha256!==trust.calendarSha256||
      row.release_sha256!==trust.releaseSha256||
      (exact&&(row.revision!==s.indexRevision||row.content_sha256!==s.indexSha256)))
    fail("DAY_REVISION_OR_STUDY_SELECTOR_DRIFT");
   result=resolveP6DynamicDayReview({trust,wires:[wire],
    observedDbClockUtc:now,selector:{runDayIndex:s.runDayIndex,
     indexRevision:row.revision,indexSha256:row.content_sha256,
     previousIndexSha256:row.previous_index_sha256,
     externalReviewEvidenceSha256:row.external_review_sha256}});
  }
  await client.query("ROLLBACK");begun=false;
  return result;
 }catch(e){
  if(begun)await client.query("ROLLBACK").catch(()=>{});
  const msg=String(e?.message??"");
  if(/^HOLD_P6_STORED_REVIEW_[A-Z0-9_]+$/.test(msg))throw e;
  fail("RESTRICTED_READ_OR_SIGNATURE_HOLD_REDACTED");
 }
}
