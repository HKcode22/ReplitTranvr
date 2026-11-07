/**
 * Phase5 pre-freeze operator view of research data columns and coarse recent
 * row presence. Protected metadata only: NO values, raw Contents, flight IDs,
 * user records, API keys, provider GETs, SQL mutations, or automatic Phase 6.
 *
 * Counts cap at 2001 sampled rows. Never report an exact full table total from
 * a capped sample. This is visibility, not an outcome/rights/science verdict.
 */
import pg from 'pg';
const TABLES=[
  ['fids_query_response','available_at','FIDS_ORIGINALS'],
  ['flight_population','created_at','FIDS_POPULATION'],
  ['flight_snapshots','created_at','CUT_OFF_PRE'],
  ['adb_collection_batches','started_at','RUN_DAYS'],
  ['adb_collection_subs','created_at','ALERT_SUBSCRIPTIONS'],
  ['raw_delivery','received_at_utc','WEBHOOK_ENVELOPES'],
  ['raw_delivery_item','created_at','WEBHOOK_ITEMS'],
  ['webhook_identity_resolution','resolved_at_utc','WEBHOOK_IDENTITY'],
  ['flight_events','created_at','SEMANTIC_EVENTS'],
  ['raw_airborne_events','created_at','AIRBORNE_RAW_META'],
  ['clean_airborne_points','created_at','AIRBORNE_CLEAN'],
  ['airborne_eligibility_evidence','created_at','AIRBORNE_ELIGIBILITY'],
  ['flight_airborne_snapshots','created_at','AIRBORNE_SNAPSHOTS'],
  ['flight_outcomes','updated_at','OUTCOME_STATUS'],
  ['flight_data_pre_post','received_at','FLIGHT_RECORD_VIEW']
];
const onlySafe=/^[a-z][a-z0-9_]*$/;
const out=(kind,obj)=>console.log(kind+' '+JSON.stringify(obj));
if(!process.env.DATABASE_URL){out('HOLD',{reason:'DATABASE_URL_MISSING'});process.exit(2)}
const db=new pg.Client({
  connectionString:process.env.DATABASE_URL,
  options:'-c default_transaction_read_only=on',
  connectionTimeoutMillis:10000,
  query_timeout:7000,
  application_name:'phase5_freeze_column_visibility_readonly'
});
db.on('error',()=>{});
let tx=false;
try {
  await db.connect();
  await db.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  tx=true;
  await db.query("SET LOCAL statement_timeout='5000ms'");
  const meta=(await db.query("SELECT current_setting('transaction_read_only') AS read_only,clock_timestamp() AS read_at")).rows[0];
  if(meta?.read_only!=='on')throw Error('READ_ONLY_NOT_ENFORCED');
  out('PHASE5_PHASE6_READONLY_SCHEMA_INVENTORY_V1',{
    readAt:meta.read_at.toISOString(),readOnly:true,
    source:'DATABASE_METADATA_NOT_SUBSTITUTE_FOR_AUTHORIZED_DATA_EXPORT',
    sampledCap:2001,providerCalls:0,databaseWrites:0
  });
  for(const [table,clock,feed] of TABLES){
    if(![table,clock].every(v=>onlySafe.test(v)))throw Error('UNSAFE_STATIC_IDENTIFIER');
    await db.query('SAVEPOINT table_metric');
    try {
      const priv=(await db.query(
        "SELECT to_regclass($1) IS NOT NULL AS present, CASE WHEN to_regclass($1) IS NOT NULL THEN has_table_privilege(current_user,$1,'SELECT') ELSE false END AS can_read",
        ['clean.'+table]
      )).rows[0];
      if(!priv.present||!priv.can_read){
        out('DATASET',{dataset:feed,table:'clean.'+table,status:'UNKNOWN_MISSING_OR_NOT_GRANTED'});
        await db.query('RELEASE SAVEPOINT table_metric');continue;
      }
      const columns=(await db.query(
        "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='clean' AND table_name=$1 ORDER BY ordinal_position",
        [table]
      )).rows;
      if(!columns.length)throw Error('NO_VISIBLE_COLUMNS');
      let recent={status:'UNKNOWN_NO_VALID_EVENT_TIME_COLUMN'};
      if(columns.some(c=>c.column_name===clock)){
        try{
          // Static, allowlisted SQL identifiers only. LIMIT protects busy tables.
          const q='SELECT count(*)::int AS n FROM (SELECT 1 FROM clean.'+table+
            ' WHERE '+clock+" >= clock_timestamp() - interval '24 hours' LIMIT 2001) bounded";
          const n=Number((await db.query(q)).rows[0]?.n);
          if(!Number.isSafeInteger(n)||n<0||n>2001)throw Error('INVALID_SAMPLE');
          recent={status:n===2001?'AT_LEAST_2001_ROWS':'EXACT_ROWS_UNDER_CAP',rowsAtMost2001:n};
        }catch(e){
          // A failed query aborts the tx; rollback to an inner savepoint.
          // The outer per-table SAVEPOINT handles this via the outer catch.
          throw e;
        }
      }
      out('DATASET',{dataset:feed,table:'clean.'+table,status:'COLUMNS_READ',
        columns:columns.map(c=>({name:c.column_name,type:c.data_type,nullable:c.is_nullable==='YES'})),
        recent24h:recent,contentsRead:false});
      await db.query('RELEASE SAVEPOINT table_metric');
    }catch(e){
      await db.query('ROLLBACK TO SAVEPOINT table_metric').catch(()=>{});
      await db.query('RELEASE SAVEPOINT table_metric').catch(()=>{});
      const code=typeof e?.code==='string'&&/^[A-Z0-9]{5}$/.test(e.code)?e.code:'UNKNOWN';
      out('DATASET',{dataset:feed,table:'clean.'+table,status:'UNKNOWN_NOT_A_ZERO',sqlstate:code});
    }
  }
  await db.query('ROLLBACK');tx=false;
  out('INTERPRETATION',{schemaOnlyNoRowValues:true,readOnly:true,
    zeroRecentRowsDoesNotMeanSourceUnavailable:true,
    missingTableOrGrantNotZero:true,
    rawOriginalContentNotRead:true,providerCalls:0,databaseWrites:0,
    alertSubscriptionRowsDoNotProveReceivedWebhooks:true,
    nonnullOutcomeStatusDoesNotProveActualRunwayTime:true,
    noPhase6Activation:true,sciencePassNotImplied:true});
}catch(e){
  const code=typeof e?.code==='string'&&/^[A-Z0-9]{5}$/.test(e.code)?e.code:'UNKNOWN';
  out('HOLD',{reason:'REDACTED_SQL_OR_CONNECTION_ERROR',sqlstate:code,providerCalls:0,databaseWrites:0});
  process.exitCode=2;
}finally{
  if(tx)await db.query('ROLLBACK').catch(()=>{});
  await db.end().catch(()=>{});
}
