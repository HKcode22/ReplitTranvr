/**
 * G5A Nov 6: last-missing-evidence metadata-only audit, run from Replit Shell.
 * No requests to AeroDataBox; no writing PostgreSQL; no raw FIDS/webhook body.
 * Source-derived identity hashes are used only inside SELECT joins and NOT logged.
 * All-airport webhook traffic is never called G5A-specific evidence.
 */
import pg from 'pg';

const manifest='02865331b9137c2ffb4d7e2b0a8c2a6016d0838051fd04f09a44c6f02e238667';
const cohort='WSSS_G5A_20261106_1400Z';
const pre="SELECT DISTINCT flight_instance_id FROM clean.flight_snapshots WHERE frame_hash=$1 AND horizon='T-24h' AND prediction_state='PRE_DEPARTURE' AND created_at<=prediction_cutoff_utc";
const checks=[
  ['frozen_pre_key_count',['clean.flight_snapshots'],
    'SELECT count(*)::int AS keys FROM ('+pre+') x',[manifest]],
  ['exact_named_cohort_alert_subscriptions',['clean.adb_collection_subs'],
    "SELECT count(*)::int AS exact_batch_subscriptions FROM clean.adb_collection_subs WHERE batch_id=$1 AND icao='WSSS'",[cohort]],
  ['exact_pre_key_webhook_matches',['clean.webhook_identity_resolution','clean.flight_snapshots'],
    "SELECT count(DISTINCT r.delivery_id)::int AS resolved_delivery_ids_with_exact_pre_key FROM clean.webhook_identity_resolution r JOIN ("+pre+") s ON s.flight_instance_id=r.flight_instance_id WHERE r.resolution_status='resolved'",[manifest]],
  ['nearby_wsss_webhook_identities_not_g5a_attributed',['clean.webhook_flight_identity'],
    "SELECT count(DISTINCT flight_instance_id)::int AS nearby_wsss_gate_reference_keys FROM clean.webhook_flight_identity WHERE origin_icao='WSSS' AND initial_scheduled_gate_out_utc >= $1::timestamptz AND initial_scheduled_gate_out_utc < $2::timestamptz",['2026-11-06T13:00:00.000Z','2026-11-06T16:00:00.000Z']],
  ['general_webhook_traffic_all_airports_not_g5a_attributed',['clean.raw_delivery'],
    "SELECT count(*)::int AS delivery_rows_all_airports, count(*) FILTER(WHERE subscription_id IS NOT NULL)::int AS rows_with_subscription_id, coalesce(sum(notification_items),0)::bigint::text AS notification_items_all_airports FROM clean.raw_delivery WHERE received_at_utc >= $1::timestamptz AND received_at_utc <= $2::timestamptz",['2026-11-05T11:30:00.000Z','2026-11-06T17:01:00.000Z']],
  ['exact_pre_key_airborne_evidence',['clean.airborne_eligibility_evidence','clean.flight_snapshots'],
    "SELECT count(DISTINCT a.flight_instance_id)::int AS matched_keys, count(DISTINCT a.flight_instance_id) FILTER(WHERE a.verified=true)::int AS matched_keys_with_verified_flag FROM clean.airborne_eligibility_evidence a JOIN ("+pre+") s ON s.flight_instance_id=a.flight_instance_id",[manifest]],
  ['exact_pre_key_airborne_snapshots',['clean.flight_airborne_snapshots','clean.flight_snapshots'],
    "SELECT count(DISTINCT a.flight_id)::int AS matched_keys FROM clean.flight_airborne_snapshots a JOIN ("+pre+") s ON s.flight_instance_id=a.flight_id",[manifest]],
  ['exact_pre_key_wheels_off_outcome_status',['clean.flight_outcomes','clean.flight_snapshots'],
    "SELECT count(DISTINCT o.flight_instance_id)::int AS keys_with_outcome_rows, count(DISTINCT o.flight_instance_id) FILTER(WHERE o.label_status='observed')::int AS keys_with_observed_status_not_actuality_certified FROM clean.flight_outcomes o JOIN ("+pre+") s ON s.flight_instance_id=o.flight_instance_id WHERE o.target='wheels_off'",[manifest]]
];

if(!process.env.DATABASE_URL){
  console.error('HOLD_DATABASE_URL_MISSING');
  process.exit(2);
}
const db=new pg.Client({
  connectionString:process.env.DATABASE_URL,
  connectionTimeoutMillis:10000,
  query_timeout:15000,
  options:'-c default_transaction_read_only=on',
  application_name:'g5a_final_metadata_readonly_no_provider'
});
db.on('error',()=>{});
let tx=false, measured=0;
try {
  await db.connect();
  await db.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  tx=true;
  await db.query("SET LOCAL statement_timeout='15000ms'");
  const status=(await db.query("SELECT current_setting('transaction_read_only') AS readonly,clock_timestamp() AS asof")).rows[0];
  if(status.readonly!=='on')throw Error('READ_ONLY_NOT_ENFORCED');
  console.log('G5A_METADATA_AUDIT',JSON.stringify({asof:status.asof.toISOString(),readOnly:true}));
  for(const [name,tables,sql,args] of checks){
    await db.query('SAVEPOINT single_metric');
    try{
      const can=(await db.query("SELECT bool_and(CASE WHEN to_regclass(t) IS NOT NULL THEN has_table_privilege(current_user,t,'SELECT') ELSE false END) AS ok FROM unnest($1::text[]) t",[tables])).rows[0];
      if(can.ok!==true){
        console.log(name,JSON.stringify({status:'UNKNOWN_TABLE_OR_PERMISSION'}));
      }else{
        const rows=(await db.query(sql,args)).rows;
        if(rows.length!==1)throw Error('EXPECTED_ONE_AGGREGATE');
        console.log(name,JSON.stringify({status:'MEASURED',...rows[0]}));
        measured++;
      }
      await db.query('RELEASE SAVEPOINT single_metric');
    }catch(e){
      await db.query('ROLLBACK TO SAVEPOINT single_metric').catch(()=>{});
      await db.query('RELEASE SAVEPOINT single_metric').catch(()=>{});
      const sqlstate=typeof e?.code==='string'&&/^[A-Z0-9]{5}$/.test(e.code)?e.code:'UNKNOWN';
      console.log(name,JSON.stringify({status:'UNKNOWN_QUERY_ERROR',sqlstate}));
    }
  }
  await db.query('ROLLBACK');
  tx=false;
  console.log('INTERPRETATION_GUARDS',JSON.stringify({
    exactKeyNonmatchDoesNotProveNoWebhookTraffic:true,
    namedBatchOnlyDoesNotExhaustAllPossibleSubscriptions:true,
    nearbyGateTimeNotEqualG5aScheduledReference:true,
    rawDeliveryWindowNotCohortSpecific:true,
    airborneVerifiedFlagNotActualRunwayCertification:true,
    absenceOfRowNeverCountsAsConfirmedNoDisruption:true,
    expiredOriginalBodiesNotRead:true,
    measuredKinds:measured,attemptedKinds:checks.length,
    providerCalls:0,databaseWrites:0,scientificGate5Passed:false
  }));
}catch(e){
  const sqlstate=typeof e?.code==='string'&&/^[A-Z0-9]{5}$/.test(e.code)?e.code:'UNKNOWN';
  console.error('G5A_METADATA_AUDIT_HOLD',sqlstate);
  process.exitCode=2;
}finally{
  if(tx)await db.query('ROLLBACK').catch(()=>{});
  await db.end().catch(()=>{});
}
