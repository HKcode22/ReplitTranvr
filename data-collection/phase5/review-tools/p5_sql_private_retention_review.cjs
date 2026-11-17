'use strict';
// Owner-local metadata-only review of SQL/packet surfaces NOT covered by
// the existing five-column external-object sentinel. Never deletes data.
const hold = reason => { throw Error('HOLD_P5_SQL_RETENTION_REVIEW_' + reason); };
const statements = Object.freeze({
  originals: `SELECT count(*)::int total,
    count(*) FILTER (WHERE raw_payload IS NOT NULL)::int payload_present,
    count(*) FILTER (WHERE raw_payload IS NOT NULL AND raw_persisted_at_utc IS NULL)::int payload_clock_unknown,
    count(*) FILTER (WHERE raw_payload IS NOT NULL AND raw_persisted_at_utc<=transaction_timestamp()-interval '24 hours')::int payload_due_24h,
    count(*) FILTER (WHERE raw_payload IS NOT NULL AND raw_expired_at_utc IS NOT NULL)::int marked_expired_payload_present
    FROM clean.fids_query_response`,
  population: `SELECT count(*)::int source_rows_with_parent,
    count(*) FILTER (WHERE r.raw_persisted_at_utc<=transaction_timestamp()-interval '24 hours' AND p.provider_content_expired_at_utc IS NULL)::int due_24h_without_expiry_marker,
    count(*) FILTER (WHERE r.raw_persisted_at_utc<=transaction_timestamp()-interval '24 hours' AND
      (p.flight_number IS NOT NULL OR p.dep_scheduled_utc IS NOT NULL OR p.arr_scheduled_utc IS NOT NULL OR p.provider_record_key IS NOT NULL OR p.canonical_flight_instance_id IS NOT NULL OR p.analytic_identity_id IS NOT NULL))::int due_24h_selected_provider_fields_present
    FROM clean.flight_population p JOIN clean.fids_query_response r ON r.population_query_id=p.population_query_id
    WHERE p.source_type='fids'`,
  markedPopulation: `SELECT count(*)::int marked_expired_fids_rows,
    count(*) FILTER (WHERE flight_number IS NOT NULL OR dep_scheduled_utc IS NOT NULL OR arr_scheduled_utc IS NOT NULL OR provider_record_key IS NOT NULL OR canonical_flight_instance_id IS NOT NULL OR analytic_identity_id IS NOT NULL)::int marked_expired_selected_fields_present
    FROM clean.flight_population WHERE source_type='fids' AND provider_content_expired_at_utc IS NOT NULL`,
  originalBindings: `SELECT count(*)::int total,
    count(*) FILTER (WHERE b.source_expires_at_utc<=transaction_timestamp())::int past_access_deadline,
    count(*) FILTER (WHERE b.source_expires_at_utc<=transaction_timestamp() AND r.raw_payload IS NOT NULL)::int past_access_deadline_payload_present
    FROM clean.phase5_fids_original_binding_v39 b JOIN clean.fids_query_response r ON r.population_query_id=b.population_query_id`,
  privatePackets: `SELECT count(*)::int total,
    count(*) FILTER (WHERE retention_not_after_utc<=transaction_timestamp())::int due_physical_review
    FROM phase6_private.frozen_native_packet_v39`,
  privateIndexes: `SELECT count(*)::int total,
    count(*) FILTER (WHERE retention_not_after_utc<=transaction_timestamp())::int due_physical_review
    FROM phase6_private.signed_run_day_index_revision_v39`,
  witnesses: `SELECT count(*)::int total FROM clean.phase5_t24_postcommit_witness_v39`,
  pre: `SELECT count(*)::int total,
    count(*) FILTER (WHERE horizon='T-24h')::int t24
    FROM clean.flight_snapshots WHERE prediction_state='PRE_DEPARTURE'`
});
const expected = Object.freeze({ originals:['total','payload_present','payload_clock_unknown','payload_due_24h','marked_expired_payload_present'], population:['source_rows_with_parent','due_24h_without_expiry_marker','due_24h_selected_provider_fields_present'], markedPopulation:['marked_expired_fids_rows','marked_expired_selected_fields_present'], originalBindings:['total','past_access_deadline','past_access_deadline_payload_present'], privatePackets:['total','due_physical_review'], privateIndexes:['total','due_physical_review'], witnesses:['total'], pre:['total','t24'] });
function countRow(result, fields) {
  if(result?.rows?.length!==1) hold('COUNT_ROW_SHAPE');
  const row=result.rows[0];
  if(Object.keys(row).sort().join('|')!==[...fields].sort().join('|') ||fields.some(k=>!Number.isSafeInteger(row[k])||row[k]<0)||fields.slice(1).some(k=>row[k]>row[fields[0]])) hold('COUNT_VALUE_OR_SHAPE');
  return Object.fromEntries(fields.map(k=>[k,row[k]]));
}
async function review(c) {
  let began=false;
  try {
    await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); began=true;
    await c.query("SET LOCAL statement_timeout='12000ms'");
    const identity=(await c.query("SELECT current_database() db,current_user actor,session_user session_actor,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,transaction_timestamp() observed")).rows;
    const a=identity?.[0];
    if(identity?.length!==1||a.db!=='neondb'||a.actor!==a.session_actor||a.ver<160000||a.ver>=170000||a.ro!=='on'||a.replica!==false||!Number.isFinite(new Date(a.observed).getTime())) hold('NOT_EXISTING_PG16_PRIMARY_READONLY');
    const counts={};
    for(const [name,sql] of Object.entries(statements)) counts[name]=countRow(await c.query(sql),expected[name]);
    const {originals:o,population:p,markedPopulation:m,privatePackets:pp,privateIndexes:pi}=counts;
    if(o.payload_present>o.total||o.payload_due_24h>o.payload_present||o.payload_clock_unknown>o.payload_present||o.marked_expired_payload_present>o.payload_present||counts.originalBindings.past_access_deadline_payload_present>counts.originalBindings.past_access_deadline) hold('COUNT_SUBSET_INVARIANT');
    const findings=[];
    if(o.payload_clock_unknown||o.payload_due_24h||o.marked_expired_payload_present) findings.push('FIDS_RAW_PRIMARY_REVIEW_REQUIRED');
    if(p.due_24h_without_expiry_marker||p.due_24h_selected_provider_fields_present||m.marked_expired_selected_fields_present) findings.push('NORMALIZED_FIDS_PRIMARY_REVIEW_REQUIRED');
    if(pp.due_physical_review||pi.due_physical_review) findings.push('PRIVATE_PACKET_OR_INDEX_EXPIRY_REVIEW_REQUIRED');
    await c.query('ROLLBACK'); began=false;
    return {status:findings.length?'SQL_RETENTION_COUNTS_NEED_REVIEW':'NO_DUE_ROWS_ON_CHECKED_SQL_SURFACES',observedAtUtc:new Date(a.observed).toISOString(),counts,findings,countsAreExactAtSnapshot:true,allProviderContentColumnsCertified:false,sourceAccessDeadlineIsNotPhysicalDeletionDeadline:true,witnessAndPreRetentionClassCertified:false,objectPresenceChecked:false,backupOrPitrVerified:false,accountRightsVerified:false,providerCalls:0,databaseWrites:0,phase5ScientificFreeze:false,phase6PaidGo:false};
  } finally { if(began) await c.query('ROLLBACK').catch(()=>{}); }
}
async function main() {
  if(process.env.GITHUB_ACTIONS==='true'||!process.env.DATABASE_URL||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0') hold('OWNER_LOCAL_SCOPE');
  const u=new URL(process.env.DATABASE_URL);
  if(!['postgres:','postgresql:'].includes(u.protocol)||!u.username||!u.password||!u.hostname.endsWith('.neon.tech')||u.pathname!=='/neondb'||!['require','verify-full'].includes(u.searchParams.get('sslmode'))) hold('EXISTING_TLS_DB_REQUIRED');
  const {Client}=require(require.resolve('pg',{paths:[process.cwd()]}));
  const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:15000,options:'-c default_transaction_read_only=on',application_name:'p5_sql_retention_review'});
  try { await c.connect(); console.log(JSON.stringify(await review(c))); } finally { await c.end().catch(()=>{}); }
}
module.exports={review,countRow,statements,expected};
if(require.main===module) main().catch(e=>{const m=String(e?.message??'');console.error(/^HOLD_P5_SQL_RETENTION_REVIEW_[A-Z_]+$/.test(m)?m:'HOLD_P5_SQL_RETENTION_REVIEW_REDACTED');process.exitCode=2;});
