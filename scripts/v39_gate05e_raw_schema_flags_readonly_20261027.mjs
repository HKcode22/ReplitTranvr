/**
 * Gate05e existing provider raw FIDS shape forensic (NO paid provider access).
 * Runs a READ ONLY PostgreSQL transaction; raw JSON is inspected solely
 * inside SQL as aggregate boolean field indicators, never returned or logged.
 * It does NOT change original normalized rows or promote physical identities.
 */
import "dotenv/config";
import pg from "pg";
const SOURCE_QUERY="aa89e0c3-23ab-4b93-99dd-7624b456931f";
const SOURCE_SHA="e9abc8d43732b11002808402f330e9f2de8ad047a5306155ec190a73f4d5016c";
const PARENT_SQL=[
  "SELECT source_airport_icao,response_hash,available_at,raw_expired_at_utc,",
  "(raw_payload IS NOT NULL) AS raw_present,",
  "CASE WHEN jsonb_typeof(raw_payload->'departures')='array'",
  "THEN jsonb_array_length(raw_payload->'departures') ELSE NULL END AS raw_departures",
  "FROM clean.fids_query_response WHERE population_query_id=$1::uuid"
].join(" ");
const SHAPE_SQL=[
  "WITH source AS (SELECT raw_payload FROM clean.fids_query_response",
  "WHERE population_query_id=$1::uuid AND response_hash=$2 AND",
  "raw_expired_at_utc IS NULL AND jsonb_typeof(raw_payload->'departures')='array'),",
  "flights AS (SELECT f.item AS flight FROM source",
  "CROSS JOIN LATERAL jsonb_array_elements(source.raw_payload->'departures') AS f(item))",
  "SELECT count(*)::int AS raw_departure_objects,",
  "count(*) FILTER (WHERE flight->>'number' IS NOT NULL)::int AS number_present,",
  "count(*) FILTER (WHERE (flight->>'number') ~* '^[A-Z0-9]{2}[0-9]{1,4}$')::int AS strict_number_parseable,",
  "count(*) FILTER (WHERE (flight->>'number') ~* '^[A-Z0-9]{2}[[:space:]]+[0-9]{1,4}$')::int AS spaced_number_pattern,",
  "count(*) FILTER (WHERE (flight->>'number') ~* '^[A-Z0-9]{3}[0-9]{1,4}$')::int AS three_character_carrier_pattern,",
  "count(*) FILTER (WHERE flight->>'codeshareStatus'='IsOperator')::int AS operator_role,",
  "count(*) FILTER (WHERE flight->>'codeshareStatus'='IsCodeshared')::int AS marketing_role,",
  "count(*) FILTER (WHERE flight->>'codeshareStatus' IS NULL)::int AS missing_role,",
  "count(*) FILTER (WHERE flight#>>'{departure,airport,icao}' IS NOT NULL)::int AS explicit_departure_icao,",
  "count(*) FILTER (WHERE flight#>>'{arrival,airport,icao}' IS NOT NULL)::int AS explicit_arrival_icao,",
  "count(*) FILTER (WHERE flight#>>'{departure,scheduledTime,utc}' IS NOT NULL)::int AS departure_schedule_utc,",
  "count(*) FILTER (WHERE flight#>>'{arrival,scheduledTime,utc}' IS NOT NULL)::int AS arrival_schedule_utc,",
  "count(*) FILTER (WHERE flight->>'id' IS NOT NULL)::int AS provider_flight_id,",
  "count(*) FILTER (WHERE flight->>'callSign' IS NOT NULL)::int AS call_sign,",
  "count(*) FILTER (WHERE jsonb_typeof(flight->'departure')='object')::int AS departure_object,",
  "count(*) FILTER (WHERE jsonb_typeof(flight->'arrival')='object')::int AS arrival_object,",
  "count(*) FILTER (WHERE jsonb_typeof(flight->'movement')='object')::int AS movement_object,",
  "count(*) FILTER (WHERE flight#>>'{departure,runwayTime,utc}' IS NOT NULL)::int AS runway_utc_present",
  "FROM flights"
].join(" ");
let client=null,open=false,stage="CONFIG";
try{
 if(!process.env.V39_DATABASE_RUNTIME_URL)throw Error("DB_CONFIG_MISSING");
 client=new pg.Client({connectionString:process.env.V39_DATABASE_RUNTIME_URL,connectionTimeoutMillis:7000,query_timeout:7000});
 stage="CONNECT";await client.connect();
 stage="BEGIN_READ_ONLY";await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");open=true;
 if((await client.query("SHOW transaction_read_only")).rows[0]?.transaction_read_only!=="on")throw Error("NOT_READONLY");
 stage="VALIDATE_SOURCE";
 const parent=(await client.query(PARENT_SQL,[SOURCE_QUERY])).rows;
 if(parent.length!==1||parent[0].source_airport_icao!=="WSSS"||
    parent[0].response_hash!==SOURCE_SHA||parent[0].raw_present!==true||
    parent[0].raw_expired_at_utc!==null)throw Error("EXACT_OR_UNEXPIRED_SOURCE_MISSING");
 stage="AGGREGATE_RAW_SHAPE";
 const rows=(await client.query(SHAPE_SQL,[SOURCE_QUERY,SOURCE_SHA])).rows;
 if(rows.length!==1)throw Error("MISSING_AGGREGATE");
 stage="ROLLBACK";await client.query("ROLLBACK");open=false;
 console.log(JSON.stringify({
   schema:"v39.gate05e.adb-raw-field-shape-anonymous.v1",
   status:"EXACT_SOURCE_READONLY_SHAPE_PROFILED",
   originalQueryId:SOURCE_QUERY,sourceSha256:SOURCE_SHA,
   durableAvailableAtUtc:parent[0].available_at?.toISOString?.()??null,
   originalRawDepartureCount:parent[0].raw_departures,
   aggregate:rows[0],rawPayloadReturned:false,
   recordValuesReturned:false,physicalLegIdentityVerified:false,
   providerCalls:0,dbWrites:0,
   nominalOriginalCohortT6CutoffWindowUtc:["2026-10-28T05:26:37.388Z","2026-10-28T05:36:37.388Z"],
   earlyNowCannotBeClaimedAsNearCutoffT6:true
 }));
}catch{
 console.log(JSON.stringify({schema:"v39.gate05e.adb-raw-field-shape-anonymous.v1",
    status:"READONLY_SHAPE_AUDIT_HOLD",stage,
    providerCalls:0,dbWrites:0,rawPayloadReturned:false}));
 process.exitCode=2;
}finally{
 if(client){if(open)await client.query("ROLLBACK").catch(()=>{});await client.end().catch(()=>{});}
}
