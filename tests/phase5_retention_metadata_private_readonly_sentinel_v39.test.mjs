import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {
 classifyP5RetentionReadOnlyCounts,
 assertP5RetentionSentinelGate,
 readP5RetentionMetadataReadOnly,
 formatP5RetentionSentinelSummary
} from "../scripts/v39_phase5_retention_metadata_private_readonly_sentinel_v39.mjs";

const sha="a".repeat(40);
function base(overrides={}){
 return {
  total_refs:838,verified_refs:838,unverified_refs:0,
  expired_unverified:0,expired_over_24h:0,expired_over_7d:0,
  due_next_24h:0,unexpected_class_or_ttl:0,
  last_verified_deletion_utc:"2026-11-14T12:00:00.000Z",
  ...overrides
 };
}
const allowed={
 GITHUB_ACTIONS:"true",
 GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",
 GITHUB_SHA:sha,
 P5_RETENTION_MONITOR_EXECUTE:"1",
 P5_RETENTION_APPROVED_MAIN_SHA:sha,
 ADB_AUTO_COLLECT:"0",
 V39_PHASE6_PROCESS_ARMED:"0",
 V39_PHASE6_OWNER_APPROVED:"0",
 AERODATABOX_API_KEY:"",
 RAPIDAPI_KEY:"",
 DATABASE_URL:"",
 V39_DATABASE_RUNTIME_URL:"",
 P5_RETENTION_READER_DATABASE_URL:"postgresql://dummy-invalid-never-used",
 P5_RETENTION_EXPECTED_READER_ROLE:"p5_retention_test_reader"
};
test("completed 65-object owner closeout yields clear only for 0 expired",()=>{
 const s=classifyP5RetentionReadOnlyCounts(base());
 assert.equal(s.status,"NO_OVERDUE_REFERENCES");
 assert.equal(s.verified_refs,838);
 assert.equal(s.objectDeletions,0);
 assert.equal(s.primaryObjectPresenceChecked,false);
 assert.equal(s.phase6PaidGo,false);
 assert.match(formatP5RetentionSentinelSummary(s),/READ ONLY/);
 assert.doesNotMatch(formatP5RetentionSentinelSummary(s),/objectName|source_record_id/);
});
test("first expired unverified row is a FAIL even if 838 were previously verified",()=>{
 const x=classifyP5RetentionReadOnlyCounts(base({
  total_refs:839,unverified_refs:1,expired_unverified:1
 }));
 assert.equal(x.status,"OVERDUE_REFERENCES_HOLD");
 const urgent=classifyP5RetentionReadOnlyCounts(base({
  total_refs:839,unverified_refs:1,expired_unverified:1,
  expired_over_24h:1,expired_over_7d:1
 }));
 assert.equal(urgent.status,"OVERDUE_REFERENCES_HOLD");
});
test("unexpected classes and TTL hold; inconsistent counts or missing fields refuse",()=>{
 assert.equal(classifyP5RetentionReadOnlyCounts(base({
  unexpected_class_or_ttl:1
 })).status,"HOLD_UNEXPECTED_RETENTION_METADATA");
 assert.throws(()=>classifyP5RetentionReadOnlyCounts(base({
  total_refs:1,verified_refs:2
 })),/INCONSISTENT_COUNTS/);
 assert.throws(()=>classifyP5RetentionReadOnlyCounts(base({
  expired_over_7d:1,expired_over_24h:0
 })),/INCONSISTENT_COUNTS/);
 assert.throws(()=>classifyP5RetentionReadOnlyCounts(base({
  expired_unverified:-1
 })),/INVALID_AGGREGATE/);
 const missing=base();delete missing.total_refs;
 assert.throws(()=>classifyP5RetentionReadOnlyCounts(missing),/INVALID_AGGREGATE/);
});
test("scheduled runner STOP unless dedicated role, exact main and no paid/owner secrets",()=>{
 assert.deepEqual(assertP5RetentionSentinelGate(allowed),{
  expectedRole:"p5_retention_test_reader",
  url:"postgresql://dummy-invalid-never-used"
 });
 for(const mutation of [
  {GITHUB_ACTIONS:"false"},
  {GITHUB_REF:"refs/pull/1/merge"},
  {GITHUB_REPOSITORY:"other/repo"},
  {GITHUB_SHA:"b".repeat(40)},
  {P5_RETENTION_MONITOR_EXECUTE:"0"},
  {P5_RETENTION_APPROVED_MAIN_SHA:"b".repeat(40)},
  {ADB_AUTO_COLLECT:"1"},
  {V39_PHASE6_PROCESS_ARMED:"1"},
  {V39_PHASE6_OWNER_APPROVED:"1"},
  {AERODATABOX_API_KEY:"live"},
  {RAPIDAPI_KEY:"live"},
  {DATABASE_URL:"owner-secret"},
  {V39_DATABASE_RUNTIME_URL:"owner-secret"},
  {P5_RETENTION_EXPECTED_READER_ROLE:"neondb_owner"},
  {P5_RETENTION_READER_DATABASE_URL:""}
 ]){
  assert.throws(()=>assertP5RetentionSentinelGate({...allowed,...mutation}),
   /UNAPPROVED_MAIN_OR_PRIVILEGED_SECRET_SCOPE/);
 }
});
test("real disposable PG16: restricted SELECT-only actor, overdue -> clear -> TTL anomaly",{
 skip:!process.env.P5_RETENTION_SENTINEL_DISPOSABLE_TEST_URL
},async()=>{
 const url=process.env.P5_RETENTION_SENTINEL_DISPOSABLE_TEST_URL;
 const adminUrl=process.env.P5_RETENTION_SENTINEL_DISPOSABLE_ADMIN_URL;
 const role="p5_retention_test_reader";
 assert.match(url,/127\.0\.0\.1:5432\/neondb\?sslmode=disable$/);
 assert.match(adminUrl,/127\.0\.0\.1:5432\/neondb\?sslmode=disable$/);
 const first=await readP5RetentionMetadataReadOnly({url,expectedRole:role});
 assert.equal(first.restrictedReaderVerified,true);
 assert.equal(first.status,"OVERDUE_REFERENCES_HOLD");
 assert.equal(first.total_refs,4);
 assert.equal(first.verified_refs,1);
 assert.equal(first.unverified_refs,3);
 assert.equal(first.expired_unverified,2);
 assert.equal(first.expired_over_24h,1);
 assert.equal(first.expired_over_7d,1);
 assert.equal(first.due_next_24h,1);
 assert.equal(first.unexpected_class_or_ttl,0);
 assert.equal(first.databaseWrites,0);
 assert.equal(first.objectDeletions,0);
 assert.match(first.dbTimeUtc,/Z$/);
 await assert.rejects(
  readP5RetentionMetadataReadOnly({url,expectedRole:"neondb_owner"}),
  /NO_DEDICATED_RESTRICTED_READER/
 );
 await assert.rejects(
  readP5RetentionMetadataReadOnly({url,expectedRole:"not_the_session_user"}),
  /ACTOR_PRIVILEGE_DB_VERSION_OR_RO_MISMATCH/
 );
 const restricted=new pg.Client({connectionString:url});
 await restricted.connect();
 try{
  await assert.rejects(
   restricted.query("UPDATE clean.provider_content_blob_ref SET retention_hours=1"),
   e=>e.code==="42501"
  );
 }finally{await restricted.end()}
 const admin=new pg.Client({connectionString:adminUrl});
 await admin.connect();
 try{
  await admin.query(
   "UPDATE clean.provider_content_blob_ref SET deletion_verified_at_utc=clock_timestamp()"+
   " WHERE deletion_verified_at_utc IS NULL AND expires_at_utc <= clock_timestamp()"
  );
  const cleared=await readP5RetentionMetadataReadOnly({url,expectedRole:role});
  assert.equal(cleared.status,"NO_OVERDUE_REFERENCES");
  assert.equal(cleared.expired_unverified,0);
  assert.equal(cleared.due_next_24h,1);
  await admin.query(
   "UPDATE clean.provider_content_blob_ref SET retention_hours=999"+
   " WHERE deletion_verified_at_utc IS NULL"
  );
  const anomaly=await readP5RetentionMetadataReadOnly({url,expectedRole:role});
  assert.equal(anomaly.status,"HOLD_UNEXPECTED_RETENTION_METADATA");
  assert.equal(anomaly.unexpected_class_or_ttl,1);
 }finally{await admin.end()}
});
