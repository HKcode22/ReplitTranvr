// Actual production SQL privilege probe. EXPLAIN without ANALYZE: no writes,
// fake rows, sequence advancement, provider calls, reservations, or dispatch.
"use strict";
const {createRequire}=require("node:module"),{join}=require("node:path");
const {Client}=createRequire(join(process.cwd(),"package.json"))("pg");
const role="phase5_fids_source_prod_20261107";
const cases=[{"label":"RAW_RESPONSE_INSERT","sql":"INSERT INTO clean.fids_query_response\n       (population_query_id, source_airport_icao, query_direction, service_window_start_utc,\n        service_window_end_utc, from_local, to_local, airport_iana_timezone, fids_retrieval_utc,\n        raw_persisted_at_utc, available_at, response_hash, raw_payload, provider_api_version,\n        fids_protocol_version, openapi_sha256)\n       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),GREATEST($10,now()),$11,$12,$13,$14,$15)\n       RETURNING available_at","n":15},{"label":"POPULATION_LEGACY_CONFLICT_INSERT","sql":"INSERT INTO clean.flight_population\n         (batch_id, source_airport_icao, window_start_utc, window_end_utc, cutoff_utc,\n          flight_number, carrier_iata, carrier_icao, call_sign, dep_airport_icao, dep_airport_iata,\n          arr_airport_icao, arr_airport_iata, dep_scheduled_utc, arr_scheduled_utc, source_type,\n          provider_record_key, raw_payload_sha256, population_query_id, query_direction,\n          population_role, from_local, to_local, airport_iana_timezone, scope_classification,\n          codeshare_resolution_status, fids_retrieval_utc, available_at, response_hash,\n          canonical_flight_instance_id, analytic_identity_id, provider_api_version,\n          fids_protocol_version, openapi_sha256)\n         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,(SELECT GREATEST($28::timestamptz, q.available_at) FROM clean.fids_query_response q WHERE q.population_query_id=$19::uuid),$29,$30,$31,$32,$33,$34) ON CONFLICT ON CONSTRAINT flight_population_key DO NOTHING","n":34},{"label":"POPULATION_FALLBACK_INSERT","sql":"INSERT INTO clean.flight_population\n         (batch_id, source_airport_icao, window_start_utc, window_end_utc, cutoff_utc,\n          flight_number, carrier_iata, carrier_icao, call_sign, dep_airport_icao, dep_airport_iata,\n          arr_airport_icao, arr_airport_iata, dep_scheduled_utc, arr_scheduled_utc, source_type,\n          provider_record_key, raw_payload_sha256, population_query_id, query_direction,\n          population_role, from_local, to_local, airport_iana_timezone, scope_classification,\n          codeshare_resolution_status, fids_retrieval_utc, available_at, response_hash,\n          canonical_flight_instance_id, analytic_identity_id, provider_api_version,\n          fids_protocol_version, openapi_sha256)\n         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,(SELECT GREATEST($28::timestamptz, q.available_at) FROM clean.fids_query_response q WHERE q.population_query_id=$19::uuid),$29,$30,$31,$32,$33,$34) ON CONFLICT (population_query_id, analytic_identity_id, population_role) DO NOTHING","n":34},{"label":"ORIGINAL_BINDING_INSERT","sql":"INSERT INTO clean.phase5_fids_original_binding_v39(population_query_id,reservation_sha256,query_digest,manifest_sha256,response_hash,decoded_original_body_sha256,rights_review_sha256,normalized_members_count,source_expires_at_utc) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING bound_at_utc","n":9}];
const safe=e=>typeof e?.code==="string"&&/^[0-9A-Z]{5}$/.test(e.code)?e.code:"UNCLASSIFIED";
const emit=(status,x)=>console.log(JSON.stringify({status,...x,providerCalls:0,productionWrites:0}));
async function main(){
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
 try{
  await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='12s'");
  const id=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro")).rows[0];
  if(!id.db||!id.owner||!id.primary||!id.ro)throw Error("WRONG_OWNER_CONTEXT");
  const seq=await c.query(`SELECT table_name,column_name,pg_get_serial_sequence(format('%I.%I',table_schema,table_name),column_name) AS seq
   FROM information_schema.columns WHERE table_schema='clean' AND table_name IN ('fids_query_response','flight_population','phase5_fids_original_binding_v39')
   AND (is_identity='YES' OR column_default LIKE 'nextval(%')`);
  for(const row of seq.rows){
   if(!row.seq){emit("SOURCE_DEFAULT_SEQUENCE",{table:row.table_name,column:row.column_name,sequenceResolved:false});continue;}
   const x=(await c.query("SELECT has_sequence_privilege($1,$2,'USAGE') AS use,has_sequence_privilege($1,$2,'UPDATE') AS upd",[role,row.seq])).rows[0];
   emit("SOURCE_DEFAULT_SEQUENCE",{table:row.table_name,column:row.column_name,sequenceResolved:true,canAdvance:x.use||x.upd});
  }
  for(const t of cases){
   await c.query("SAVEPOINT explain_case");
   try{
    await c.query("SET LOCAL ROLE "+role);
    await c.query("EXPLAIN (COSTS OFF) "+t.sql,Array(t.n).fill(null));
    emit("P6_SOURCE_EXACT_SQL_EXPLAIN",{stage:t.label,pass:true});
   }catch(e){emit("P6_SOURCE_EXACT_SQL_EXPLAIN",{stage:t.label,pass:false,sqlstate:safe(e)});}
   finally{await c.query("ROLLBACK TO SAVEPOINT explain_case");await c.query("RELEASE SAVEPOINT explain_case");}
  }
 }finally{await c.query("ROLLBACK").catch(()=>{});await c.end().catch(()=>{});}
}
main().catch(e=>{emit("P6_SOURCE_PROBE_HOLD",{sqlstate:safe(e)});process.exitCode=2;});
