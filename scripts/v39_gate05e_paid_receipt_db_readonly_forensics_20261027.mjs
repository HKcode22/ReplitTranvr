/**
 * Gate05e 2026-10-27T11:18Z spent-once provider-call recovery.
 * Read-only DB transaction, absolutely no provider calls or data changes.
 * Prints query provenance/counts only, never raw provider flight data.
 */
import "dotenv/config";
import pg from "pg";
const scope="gate05e.first-prospective-rawfirst@1";
const query=[
"SELECT q.population_query_id::text AS query_id, q.source_airport_icao,",
"q.service_window_start_utc, q.service_window_end_utc,",
"q.fids_retrieval_utc, q.raw_persisted_at_utc, q.available_at,",
"q.raw_expired_at_utc, q.response_hash,",
"bool_or(q.raw_payload IS NOT NULL) AS has_raw,",
"count(p.id)::int AS normalized_rows,",
"count(p.id) FILTER (WHERE p.population_role='requested_airport_primary')::int AS primary_rows,",
"count(p.id) FILTER (WHERE p.codeshare_resolution_status='confirmed_operating_leg')::int AS operator_rows,",
"count(p.id) FILTER (WHERE p.dep_scheduled_utc IS NOT NULL AND",
"p.available_at <= p.dep_scheduled_utc - interval '24 hours')::int AS before_t24,",
"count(p.id) FILTER (WHERE p.dep_scheduled_utc IS NOT NULL AND",
"p.available_at <= p.dep_scheduled_utc - interval '24 hours' AND",
"p.dep_scheduled_utc - interval '24 hours' - p.available_at <= interval '10 minutes')::int AS within_t24_10m,",
"bool_or(p.provider_content_expired_at_utc IS NOT NULL) AS some_expired",
"FROM clean.fids_query_response q",
"LEFT JOIN clean.flight_population p ON p.population_query_id=q.population_query_id",
"WHERE q.fids_protocol_version=$1 AND q.source_airport_icao='WSSS'",
"AND q.fids_retrieval_utc >= $2::timestamptz AND q.fids_retrieval_utc < $3::timestamptz",
"GROUP BY q.population_query_id, q.source_airport_icao,",
"q.service_window_start_utc, q.service_window_end_utc,",
"q.fids_retrieval_utc, q.raw_persisted_at_utc, q.available_at,",
"q.raw_expired_at_utc, q.response_hash",
"ORDER BY q.fids_retrieval_utc DESC LIMIT 5"
].join(" ");
const utc=x=>x instanceof Date?x.toISOString():x==null?null:String(x);
let db=null,txn=false,stage="CONFIG";
try{
  if(!process.env.V39_DATABASE_RUNTIME_URL)throw Error("CONFIG_NOT_AVAILABLE");
  db=new pg.Client({connectionString:process.env.V39_DATABASE_RUNTIME_URL,
    connectionTimeoutMillis:7000,query_timeout:8000});
  stage="CONNECT";await db.connect();
  stage="READ_ONLY_BEGIN";
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  txn=true;
  const confirmed=await db.query("SHOW transaction_read_only");
  if(confirmed.rows[0]?.transaction_read_only!=="on")throw Error("NOT_READ_ONLY");
  stage="SELECT";
  const result=await db.query(query,[scope,
    "2026-10-27T11:00:00.000Z","2026-10-27T12:00:00.000Z"]);
  stage="ROLLBACK";await db.query("ROLLBACK");txn=false;
  const rows=result.rows.map(x=>({
    queryId:x.query_id,sourceAirport:x.source_airport_icao,
    serviceWindowStartUtc:utc(x.service_window_start_utc),
    serviceWindowEndUtc:utc(x.service_window_end_utc),
    retrievedUtc:utc(x.fids_retrieval_utc),
    rawPersistedUtc:utc(x.raw_persisted_at_utc),
    durableAvailableAtUtc:utc(x.available_at),
    responseSha256:x.response_hash,rawPresent:x.has_raw,
    rawExpiredUtc:utc(x.raw_expired_at_utc),
    normalizedRows:x.normalized_rows,primaryRows:x.primary_rows,
    confirmedOperatorRows:x.operator_rows,
    candidateBeforeT24:x.before_t24,
    candidateWithin10mAtT24:x.within_t24_10m,
    anyPopulationExpired:x.some_expired
  }));
  console.log(JSON.stringify({
    schema:"v39.gate05e.spent-paid-readonly-recovery.v1",
    status:rows.length===0?"NO_G05E_PARENT_FOUND":
      rows.some(x=>x.rawPresent&&x.rawExpiredUtc===null)?
        "PAID_RAW_AND_ROWS_FOUND_IN_EXISTING_DATABASE":
        "ONLY_EXPIRED_OR_MISSING_RAW_FOUND",
    scope:"WSSS Gate05e 2026-10-27T11Z",queryCount:rows.length,rows,
    paidProviderCalls:0,databaseWrites:0,rawFlightsReadOrPrinted:false,
    oldPaidScopeSpent:true,independentActualRunwayProven:false
  }));
}catch{
  console.log(JSON.stringify({schema:"v39.gate05e.spent-paid-readonly-recovery.v1",
    status:"READONLY_FORENSICS_HOLD",stage,reason:"DB_OR_SCHEMA_QUERY_ERROR",
    paidProviderCalls:0,databaseWrites:0,oldPaidScopeSpent:true}));
  process.exitCode=2;
}finally{
  if(db){
    if(txn)await db.query("ROLLBACK").catch(()=>{});
    await db.end().catch(()=>{});
  }
}
