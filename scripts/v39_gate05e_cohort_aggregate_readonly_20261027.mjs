/**
 * Source-preserving Gate05e 15-row cohort diagnostic, no provider HTTP.
 * Explicit READ ONLY transaction, prints aggregates only. No flight numbers,
 * individual schedules, raw JSON, provider IDs, secret values or mutations.
 * Source: original Gate05e query UUID + content SHA, 2026-10-27 11:18Z.
 */
import "dotenv/config";
import pg from "pg";
const QUERY_ID="aa89e0c3-23ab-4b93-99dd-7624b456931f";
const SOURCE_SHA="e9abc8d43732b11002808402f330e9f2de8ad047a5306155ec190a73f4d5016c";
const COHORT_SUMMARY_SELECT=[
 "SELECT count(*)::int AS rows,",
 "count(*) FILTER (WHERE population_role='requested_airport_primary')::int AS primary_rows,",
 "count(*) FILTER (WHERE dep_scheduled_utc IS NOT NULL)::int AS schedule_present,",
 "count(*) FILTER (WHERE available_at IS NOT NULL)::int AS availability_present,",
 "count(*) FILTER (WHERE canonical_flight_instance_id IS NOT NULL)::int AS confirmed_canonical_rows,",
 "count(*) FILTER (WHERE dep_airport_icao='WSSS')::int AS normalized_departure_wsss,",
 "count(*) FILTER (WHERE dep_airport_icao IS NULL)::int AS missing_normalized_departure,",
 "count(*) FILTER (WHERE provider_record_key IS NOT NULL)::int AS provider_key_present,",
 "count(*) FILTER (WHERE provider_record_key LIKE 'fidsrec:%')::int AS fallback_provider_key,",
 "count(*) FILTER (WHERE call_sign IS NOT NULL)::int AS callsign_present,",
 "count(DISTINCT provider_record_key)::int AS distinct_provider_keys_not_physical_flights,",
 "count(DISTINCT analytic_identity_id)::int AS distinct_analytic_keys_not_physical_flights,",
 "count(DISTINCT flight_number)::int AS distinct_flight_number_strings_not_physical_flights,",
 "count(*) FILTER (WHERE dep_scheduled_utc IS NOT NULL AND",
 "available_at<=dep_scheduled_utc - interval '24 hours')::int AS available_before_candidate_t24,",
 "count(*) FILTER (WHERE dep_scheduled_utc IS NOT NULL AND",
 "available_at>dep_scheduled_utc - interval '24 hours')::int AS arrived_after_candidate_t24,",
 "count(*) FILTER (WHERE dep_scheduled_utc IS NOT NULL AND",
 "available_at<=dep_scheduled_utc - interval '24 hours' AND",
 "dep_scheduled_utc - interval '24 hours' - available_at < interval '10 minutes')::int AS lead_0_to_10m,",
 "count(*) FILTER (WHERE dep_scheduled_utc IS NOT NULL AND",
 "available_at<=dep_scheduled_utc - interval '24 hours' - interval '10 minutes' AND",
 "dep_scheduled_utc - interval '24 hours' - available_at < interval '20 minutes')::int AS lead_10_to_20m,",
 "count(*) FILTER (WHERE dep_scheduled_utc IS NOT NULL AND",
 "available_at<=dep_scheduled_utc - interval '24 hours' - interval '20 minutes')::int AS lead_20m_or_more,",
 "round(min(extract(epoch FROM (dep_scheduled_utc - interval '24 hours' - available_at)))/60.0,2) AS min_lead_minutes,",
 "round(max(extract(epoch FROM (dep_scheduled_utc - interval '24 hours' - available_at)))/60.0,2) AS max_lead_minutes,",
 "count(*) FILTER (WHERE provider_content_expired_at_utc IS NOT NULL)::int AS expired_population_rows",
 "FROM clean.flight_population WHERE population_query_id=$1::uuid"
].join(" ");
const GROUPED_SELECT=[
 "SELECT coalesce(codeshare_resolution_status,'NULL') AS identity_status,",
 "coalesce(scope_classification,'NULL') AS scientific_scope,",
 "count(*)::int AS response_rows",
 "FROM clean.flight_population WHERE population_query_id=$1::uuid",
 "GROUP BY codeshare_resolution_status,scope_classification",
 "ORDER BY identity_status,scientific_scope"
].join(" ");
const PARENT_SELECT=[
 "SELECT q.response_hash, q.source_airport_icao, q.raw_expired_at_utc,",
 "(q.raw_payload IS NOT NULL) AS raw_present, q.available_at",
 "FROM clean.fids_query_response q WHERE q.population_query_id=$1::uuid"
].join(" ");
let client=null,open=false,stage="CONFIG";
const iso=x=>x instanceof Date?x.toISOString():x===null?null:String(x);
try{
 if(!process.env.V39_DATABASE_RUNTIME_URL)throw Error("DB_NOT_CONFIGURED");
 client=new pg.Client({
  connectionString:process.env.V39_DATABASE_RUNTIME_URL,
  connectionTimeoutMillis:7000,query_timeout:8000
 });
 stage="CONNECT";await client.connect();
 stage="READ_ONLY_BEGIN";
 await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");open=true;
 const mode=await client.query("SHOW transaction_read_only");
 if(mode.rows[0]?.transaction_read_only!=="on")throw Error("NOT_READONLY");
 stage="PARENT";
 const p=await client.query(PARENT_SELECT,[QUERY_ID]);
 if(p.rows.length!==1||p.rows[0].response_hash!==SOURCE_SHA||
    p.rows[0].source_airport_icao!=="WSSS")
  throw Error("SOURCE_PROVENANCE_HOLD");
 stage="AGGREGATED_STATISTICS";
 const [summary,grouped]=await Promise.all([
  client.query(COHORT_SUMMARY_SELECT,[QUERY_ID]),
  client.query(GROUPED_SELECT,[QUERY_ID])
 ]);
 stage="ROLLBACK";await client.query("ROLLBACK");open=false;
 const v=summary.rows[0];
 if(Number(v?.rows)!==15)throw Error("COHORT_COUNT_MISMATCH");
 console.log(JSON.stringify({
  schema:"v39.gate05e.aggregate-identity-asof-review.v1",
  status:"READONLY_15_ROW_COHORT_PROFILE_RECONCILED",
  sourceSha256:SOURCE_SHA,originalQueryId:QUERY_ID,
  originalSourceAvailableAtUtc:iso(p.rows[0].available_at),
  rawPresent:p.rows[0].raw_present,
  sourceRawExpiredAtUtc:iso(p.rows[0].raw_expired_at_utc),
  totalRows:v.rows,primaryRows:v.primary_rows,
  schedulePresent:v.schedule_present,availabilityPresent:v.availability_present,
  confirmedCanonicalRows:v.confirmed_canonical_rows,
  normalizedDepAirportWsssRows:v.normalized_departure_wsss,
  missingNormalizedDepartureRows:v.missing_normalized_departure,
  providerRecordKeyPresent:v.provider_key_present,
  fallbackProviderKeyRows:v.fallback_provider_key,
  callsignPresentRows:v.callsign_present,
  distinctProviderKeysNotPhysicalFlights:v.distinct_provider_keys_not_physical_flights,
  distinctAnalyticKeysNotPhysicalFlights:v.distinct_analytic_keys_not_physical_flights,
  distinctFlightNumberStringsNotPhysicalFlights:v.distinct_flight_number_strings_not_physical_flights,
  availableBeforeCandidateT24:v.available_before_candidate_t24,
  arrivedAfterCandidateT24:v.arrived_after_candidate_t24,
  candidateCutoffLeadBuckets:{
    lessThan10m:v.lead_0_to_10m,
    from10To20m:v.lead_10_to_20m,
    atLeast20m:v.lead_20m_or_more,
    minMinutes:v.min_lead_minutes===null?null:Number(v.min_lead_minutes),
    maxMinutes:v.max_lead_minutes===null?null:Number(v.max_lead_minutes)
  },
  identityScopeCrossTab:grouped.rows.map(g=>({
    identityStatus:g.identity_status,scientificScope:g.scientific_scope,rows:g.response_rows
  })),
  expiredPopulationRows:v.expired_population_rows,
  sourceMilestoneSemanticsIndependentlyCertified:false,
  providerFlightIdentityIndependentlyCertified:false,
  physicalFlightsCountUnknown:true,
  futureProviderRequests:0,databaseWrites:0,
  rawFlightObjectsReadOrPrinted:false
 }));
}catch{
 console.log(JSON.stringify({
  schema:"v39.gate05e.aggregate-identity-asof-review.v1",
  status:"READONLY_AGGREGATE_AUDIT_HOLD",stage,
  error:"SOURCE_OR_DATABASE_NOT_VERIFIED",
  futureProviderRequests:0,databaseWrites:0
 }));
 process.exitCode=2;
}finally{
 if(client){
  if(open)await client.query("ROLLBACK").catch(()=>{});
  await client.end().catch(()=>{});
 }
}
