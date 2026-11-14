import test from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {
 P6_PRIVATE_SOURCE_REGISTRY_REVIEW_SCHEMA,
 P6_PRIVATE_SOURCE_REGISTRY_PUBLISH_SCHEMA,
 sourceDayRegistryReviewPreimage,
 verifyP6ExternalSourceRegistryLastReview,
 publishP6SourceDayRegistryLastOnce
} from "../server/lib/disruption/phase6PrivateSourceRegistryLastPublisher_v39.mjs";
const hash=b=>createHash("sha256").update(b).digest("hex");
const kp=generateKeyPairSync("ed25519");
const pem=kp.publicKey.export({format:"pem",type:"spki"}).toString();
const fp=hash(kp.publicKey.export({format:"der",type:"spki"}));
const A="2026-11-14T01:55:00.000Z";
const N="2026-11-14T02:00:00.000Z";
const E="2026-11-14T04:00:00.000Z";
const PATH="data-collection/phase5/frozen/source_abcdefgh123.json";
const P1="data-collection/phase5/frozen/sourceq_abcdefgh123.json";
function fixture(){
 const entries=[
  {filePath:P1,expectedPacketSha256:"f".repeat(64),
   expectedQueryDigestSha256:"1".repeat(64)},
  {filePath:"data-collection/phase5/frozen/sourceq_ijklmnop456.json",
   expectedPacketSha256:"e".repeat(64),
   expectedQueryDigestSha256:"2".repeat(64)}
 ];
 const registry={
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:"b".repeat(64),
  runDayIndex:1,entries
 };
 const registryBytes=Buffer.from(JSON.stringify(registry));
 const review={
  schema:P6_PRIVATE_SOURCE_REGISTRY_REVIEW_SCHEMA,
  audience:"HKcode22/ReplitTranvr:PHASE6_SOURCE_DAY_REGISTRY_REVIEW_ONLY",
  logicalPath:PATH,registrySha256:hash(registryBytes),
  manifestSha256:"b".repeat(64),
  calendarSha256:"c".repeat(64),
  releaseSha256:"d".repeat(64),
  rightsSha256:"a".repeat(64),
  reviewedCodeSha:"7".repeat(40),
  externalReviewEvidenceSha256:"3".repeat(64),
  entriesDigestSha256:hash(Buffer.from(JSON.stringify(entries))),
  runDayIndex:1,shardIndex:1,
  reviewedAtUtc:A,validUntilUtc:"2026-11-14T03:00:00.000Z",
  retentionNotAfterUtc:E,
  reviewerPublicKeyFingerprintSha256:fp
 };
 const wire={review,signatureBase64:sign(null,
  sourceDayRegistryReviewPreimage(review),kp.privateKey).toString("base64")};
 const pins={
  independentExternalReviewerSignaturePinsApproved:true,
  expectedRegistryPath:review.logicalPath,
  expectedRegistrySha256:review.registrySha256,
  expectedManifestSha256:review.manifestSha256,
  expectedCalendarSha256:review.calendarSha256,
  expectedReleaseSha256:review.releaseSha256,
  expectedRightsSha256:review.rightsSha256,
  expectedReviewedMainSha:review.reviewedCodeSha,
  expectedReviewEvidenceSha256:review.externalReviewEvidenceSha256,
  expectedEntriesDigestSha256:review.entriesDigestSha256,
  expectedReviewerPublicKeyFingerprintSha256:fp,
  expectedRunDayIndex:1,expectedShardIndex:1
 };
 const scope={
  privateSourceRegistryLastPublicationApproved:true,
  externallyReviewedContentsUseApproved:true,
  existingPaidSourceDispatchApproved:false,
  adbAutoCollect:"0",phase6ProcessArmed:"0",
  expectedPublisherSessionLogin:"phase6_private_publisher_login_ci_checks",
  approvedRetentionNotAfterUtc:review.retentionNotAfterUtc,
  approvedCodeSha:review.reviewedCodeSha,
  approvedManifestSha256:review.manifestSha256,
  approvedCalendarSha256:review.calendarSha256,
  approvedReleaseSha256:review.releaseSha256,
  approvedRightsSha256:review.rightsSha256
 };
 function db({missing=false,changed=false,duplicate=false,
  wrongRole=false,broadAcl=false,unknownCommit=false,expired=false}={}){
  const calls=[];
  const client={async query(sql,params=[]){
   calls.push({sql,params});
   if(sql.startsWith("BEGIN")||sql.startsWith("SET LOCAL")||sql==="ROLLBACK")
    return {rowCount:null,rows:[]};
   if(sql==="COMMIT"){
    if(unknownCommit)throw Error("secret connection string private failure");
    return{rowCount:null,rows:[]};
   }
   if(sql.includes("SELECT current_database() AS db"))
    return{rowCount:1,rows:[{
     db:"neondb",server_version:160016,ro:"off",replica:false,
     actor:wrongRole?"neondb_owner":"phase6_private_frozen_publisher_v39",
     session_login:"phase6_private_publisher_login_ci_checks",
     db_now:new Date(expired?"2026-11-17T02:00:00Z":N),
     can_select:true,can_insert:true,can_update:broadAcl,can_delete:false,
     login_enabled:true,login_superuser:false,login_createrole:false,
     login_bypass_rls:false,group_can_login:false,
     group_superuser:false,group_bypass_rls:false
    }]};
   if(sql.startsWith("SELECT COUNT(*)::integer AS n"))
    return{rowCount:1,rows:[{n:duplicate?1:0}]};
   if(sql.includes("WHERE logical_path=ANY($1::text[])")){
    const rows=entries.map(x=>({
     logical_path:x.filePath,run_day_index:1,
     kind:"SOURCE_QUERY_PACKET",
     content_sha256:changed?"0".repeat(64):x.expectedPacketSha256,
     reviewed_code_sha:review.reviewedCodeSha,
     manifest_sha256:review.manifestSha256,
     rights_sha256:review.rightsSha256,
     committed_at_utc:new Date("2026-11-14T01:59:00Z"),
     retention_not_after_utc:new Date(E)
    }));
    const out=missing?rows.slice(0,-1):rows;
    return{rowCount:out.length,rows:out};
   }
   if(sql.startsWith("INSERT INTO phase6_private.frozen_native_packet_v39"))
    return{rowCount:1,rows:[]};
   if(sql==="SELECT clock_timestamp() AS db_now")
    return{rowCount:1,rows:[{db_now:new Date("2026-11-14T02:00:01Z")}]};
   throw Error("UNKNOWN_SQL_IN_CI");
  }};
  return{client,calls};
 }
 return{entries,registryBytes,review,wire,pins,scope,db};
}
test("valid external signature and matching exact ordered entry digest",()=>{
 const f=fixture();
 assert.equal(verifyP6ExternalSourceRegistryLastReview(
  f.wire,pem,f.pins).review.registrySha256,f.pins.expectedRegistrySha256);
 for(const wire of [
  {...f.wire,signatureBase64:Buffer.alloc(64).toString("base64")},
  {...f.wire,review:{...f.review,runDayIndex:2}},
  {...f.wire,review:{...f.review,logicalPath:"../../evil.json"}}
 ])assert.throws(()=>verifyP6ExternalSourceRegistryLastReview(
   wire,pem,f.pins),/HOLD_P6_SOURCE_REGISTRY_LAST_/);
});
test("signed exact SOURCE registry is committed after every prior packet",async()=>{
 const f=fixture(),d=f.db();
 const out=await publishP6SourceDayRegistryLastOnce({
  client:d.client,registryBytes:f.registryBytes,reviewWire:f.wire,
  reviewerPublicKeyPem:pem,pins:f.pins,scope:f.scope
 });
 assert.equal(out.schema,P6_PRIVATE_SOURCE_REGISTRY_PUBLISH_SCHEMA);
 assert.equal(out.boundSourceQueryPacketCount,2);
 assert.equal(out.appendOnlyRegistryInsertedLast,true);
 assert.equal(out.phase6PaidGo,false);
 assert.equal(out.independentPostCommitReadbackRequired,true);
 assert.equal(out.paidSourceChildOrOriginalGETDispatched,false);
 assert.equal(d.calls.filter(c=>c.sql.startsWith("INSERT INTO")).length,1);
 assert(d.calls.some(c=>c.sql==="COMMIT"));
 assert(!JSON.stringify(out).includes("sourceq_"));
});
test("missing, changed or already-published SOURCE packets HOLD before registry insert",async()=>{
 const f=fixture();
 for(const opt of [{missing:true},{changed:true},{duplicate:true},
  {wrongRole:true},{broadAcl:true},{expired:true}]){
  const d=f.db(opt);
  await assert.rejects(publishP6SourceDayRegistryLastOnce({
   client:d.client,registryBytes:f.registryBytes,reviewWire:f.wire,
   reviewerPublicKeyPem:pem,pins:f.pins,scope:f.scope
  }),/HOLD_P6_SOURCE_REGISTRY_LAST_/);
  assert(!d.calls.some(c=>c.sql==="COMMIT"));
  assert(d.calls.some(c=>c.sql==="ROLLBACK"));
 }
});
test("altered registry bytes, dup query identity, forged signature and approvals hold before DB",async()=>{
 const f=fixture();
 const duplicateEntries=[
  {...f.entries[0]},{...f.entries[1],
   expectedQueryDigestSha256:f.entries[0].expectedQueryDigestSha256}
 ];
 const mutatedBytes=Buffer.from(JSON.stringify({...JSON.parse(f.registryBytes),
  entries:duplicateEntries}));
 for(const overrides of [
  {registryBytes:Buffer.from(f.registryBytes.toString()+" ")},
  {registryBytes:mutatedBytes},
  {reviewWire:{...f.wire,signatureBase64:Buffer.alloc(64).toString("base64")}},
  {scope:{...f.scope,existingPaidSourceDispatchApproved:true}},
  {pins:{...f.pins,independentExternalReviewerSignaturePinsApproved:false}}
 ]){
  const d=f.db();
  await assert.rejects(publishP6SourceDayRegistryLastOnce({
   client:d.client,registryBytes:f.registryBytes,reviewWire:f.wire,
   reviewerPublicKeyPem:pem,pins:f.pins,scope:f.scope,...overrides
  }),/HOLD_P6_SOURCE_REGISTRY_LAST_/);
  assert.equal(d.calls.length,0);
 }
});
test("unknown COMMIT is an independently readback-only HOLD, never retry",async()=>{
 const f=fixture(),d=f.db({unknownCommit:true});
 await assert.rejects(publishP6SourceDayRegistryLastOnce({
  client:d.client,registryBytes:f.registryBytes,reviewWire:f.wire,
  reviewerPublicKeyPem:pem,pins:f.pins,scope:f.scope
 }),/UNKNOWN_COMMIT_INDEPENDENT_READBACK_NEVER_RETRY/);
 assert.equal(d.calls.filter(c=>c.sql==="COMMIT").length,1);
 assert.equal(d.calls.filter(c=>c.sql.startsWith("INSERT INTO")).length,1);
 assert(!d.calls.some(c=>c.sql==="ROLLBACK"));
});
