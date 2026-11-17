'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {review,statements,expected}=require('./p5_sql_private_retention_review.cjs');
function fixture(overrides={}, identity={},fail) {
  const calls=[];
  const c={async query(sql){
    calls.push(sql);
    if(sql===fail) throw Error('TEST_SQL_ERROR');
    if(sql.startsWith('SELECT current_database()'))return {rows:[{db:'neondb',actor:'CI_TEST_OWNER',session_actor:'CI_TEST_OWNER',ver:160006,ro:'on',replica:false,observed:'2026-11-16T13:00:00Z',...identity}]};
    const entry=Object.entries(statements).find(([,v])=>v===sql);
    if(entry){const [k]=entry;return {rows:[{...Object.fromEntries(expected[k].map(f=>[f,0])),...overrides[k]}]};}
    assert.match(sql,/^(BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY|SET LOCAL statement_timeout='12000ms'|ROLLBACK)$/);
    return {rows:[]};
  }};
  return {c,calls};
}
test('empty snapshot returns bounded no-due finding, never claims rights or writes',async()=>{
  const {c,calls}=fixture();const r=await review(c);
  assert.equal(r.status,'NO_DUE_ROWS_ON_CHECKED_SQL_SURFACES');assert.deepEqual(r.findings,[]);
  for(const k of ['accountRightsVerified','backupOrPitrVerified','phase5ScientificFreeze','phase6PaidGo','allProviderContentColumnsCertified','witnessAndPreRetentionClassCertified','objectPresenceChecked'])assert.equal(r[k],false);
  assert.equal(r.providerCalls,0);assert.equal(r.databaseWrites,0);assert.equal(calls.at(-1),'ROLLBACK');assert.equal(calls.length,12);
  assert(!JSON.stringify(r).includes('CI_TEST_OWNER'));
});
test('reports true raw, normalized, private due counts separately',async()=>{
 const {c}=fixture({originals:{total:17,payload_present:9,payload_due_24h:5},population:{source_rows_with_parent:1200,due_24h_without_expiry_marker:12,due_24h_selected_provider_fields_present:6},markedPopulation:{marked_expired_fids_rows:8,marked_expired_selected_fields_present:1},privatePackets:{total:60,due_physical_review:3},privateIndexes:{total:2,due_physical_review:1}});
 const r=await review(c);assert.equal(r.status,'SQL_RETENTION_COUNTS_NEED_REVIEW');assert.equal(r.findings.length,3);assert.equal(r.counts.originals.payload_due_24h,5);
});
test('23h bound admission deadline and retained witness counts do not establish physical content violation',async()=>{
 const {c}=fixture({originals:{total:1,payload_present:1},originalBindings:{total:1,past_access_deadline:1,past_access_deadline_payload_present:1},witnesses:{total:1},pre:{total:1,t24:1}});const r=await review(c);
 assert.equal(r.status,'NO_DUE_ROWS_ON_CHECKED_SQL_SURFACES');assert.equal(r.sourceAccessDeadlineIsNotPhysicalDeletionDeadline,true);assert.equal(r.witnessAndPreRetentionClassCertified,false);
});
test('rejects writable/replica/wrong DB/role mismatch before counts and rolls back',async()=>{
 for(const id of [{ro:'off'},{replica:true},{db:'other'},{ver:150000},{session_actor:'OTHER'}]){const {c,calls}=fixture({},id);await assert.rejects(review(c),/NOT_EXISTING_PG16_PRIMARY_READONLY/);assert.equal(calls.length,4);assert.equal(calls.at(-1),'ROLLBACK');}
});
test('detects contradictory count subsets and rolls back',async()=>{
 const {c,calls}=fixture({originals:{total:8,payload_present:1,payload_due_24h:2}});await assert.rejects(review(c),/COUNT_SUBSET_INVARIANT/);assert.equal(calls.at(-1),'ROLLBACK');
});
test('malformed nonnumeric count or unexpected data column fails closed',async()=>{
 for(const o of [{total:'17'},{total:1,flight_id:'NEVER_EXPOSE'}]){const {c,calls}=fixture({originals:o});await assert.rejects(review(c),/COUNT_VALUE_OR_SHAPE/);assert.equal(calls.at(-1),'ROLLBACK');}
});
test('SQL failure rolls back, never retries or mutates',async()=>{
 const {c,calls}=fixture({}, {}, statements.privatePackets);await assert.rejects(review(c),/TEST_SQL_ERROR/);assert.equal(calls.at(-1),'ROLLBACK');assert.equal(calls.filter(x=>x===statements.privatePackets).length,1);
});
