/**
 * Gate05 existing independent T-6h source readback. NO provider HTTP.
 * Source source-query pin + SHA must match in retained raw-first DB.
 * Read-only REPEATABLE READ SQL. Only aggregate field/role and as-of counts
 * leave the database; no raw JSON, flight numbers, timestamps or keys.
 * This does NOT join Gate05f 16 rows with original Gate05e 15 rows.
 */
import "dotenv/config";
import pg from "pg";

const QUERY_ID="16dfcf40-f8df-42a3-b739-8110d7de2449";
const SOURCE_SHA="5e901d257ce62672d384c30f88a0796b3667b0f9741720bd23eccbb4f3ab96db";
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
  "SELECT count(*)::int AS response_objects,",
  "count(*) FILTER (WHERE flight->>'number' ~* '^[A-Z0-9]{2}[[:blank:]]*[0-9]{1,4}$')::int AS accepted_number_syntax,",
  "count(*) FILTER (WHERE flight->>'number' ~* '^[A-Z0-9]{2}[[:blank:]]+[0-9]{1,4}$')::int AS spaced_number_syntax,",
  "count(*) FILTER (WHERE flight->>'codeshareStatus'='IsOperator')::int AS operator_role_objects,",
  "count(*) FILTER (WHERE flight->>'codeshareStatus'='IsCodeshared')::int AS marketing_role_objects,",
  "count(*) FILTER (WHERE flight#>>'{departure,airport,icao}' IS NOT NULL)::int AS explicit_origin_icao,",
  "count(*) FILTER (WHERE flight#>>'{arrival,airport,icao}' IS NOT NULL)::int AS explicit_destination_icao,",
  "count(*) FILTER (WHERE flight#>>'{departure,scheduledTime,utc}' IS NOT NULL)::int AS departure_schedule_utc,",
  "count(*) FILTER (WHERE flight#>>'{departure,runwayTime,utc}' IS NOT NULL)::int AS runway_time_utc,",
  "count(*) FILTER (WHERE flight->>'id' IS NOT NULL)::int AS provider_id_present,",
  "count(*) FILTER (WHERE flight->>'callSign' IS NOT NULL)::int AS callsign_present,",
  "count(*) FILTER (WHERE flight->>'codeshareStatus'='IsOperator' AND",
  "flight->>'number' ~* '^[A-Z0-9]{2}[[:blank:]]*[0-9]{1,4}$' AND",
  "flight#>>'{departure,airport,icao}' IS NULL AND",
  "flight#>>'{arrival,airport,icao}' IS NOT NULL AND",
  "flight#>>'{departure,scheduledTime,utc}' IS NOT NULL)::int AS provisional_operator_context_candidates",
  "FROM flights"
].join(" ");
const MEMBERS_SQL=[
  "SELECT count(*)::int AS normalized_rows,",
  "count(*) FILTER (WHERE population_role='requested_airport_primary')::int AS primary_rows,",
  "count(*) FILTER (WHERE canonical_flight_instance_id IS NOT NULL)::int AS original_canonical_rows,",
  "count(*) FILTER (WHERE dep_scheduled_utc IS NOT NULL AND",
  "available_at<=dep_scheduled_utc-interval '6 hours')::int AS candidate_before_t6,",
  "count(*) FILTER (WHERE dep_scheduled_utc IS NOT NULL AND",
  "available_at<=dep_scheduled_utc-interval '6 hours' AND",
  "dep_scheduled_utc-interval '6 hours'-available_at<=interval '10 minutes')::int AS candidate_within_10m_t6",
  "FROM clean.flight_population WHERE population_query_id=$1::uuid"
].join(" ");

let db=null,open=false,stage="CONFIG";
try{
  if(!process.env.V39_DATABASE_RUNTIME_URL)throw Error("DB_CONFIG_MISSING");
  db=new pg.Client({connectionString:process.env.V39_DATABASE_RUNTIME_URL,
    connectionTimeoutMillis:7000,query_timeout:7000});
  stage="CONNECT";await db.connect();
  stage="READ_ONLY";await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");open=true;
  if((await db.query("SHOW transaction_read_only")).rows[0]?.transaction_read_only!=="on")
    throw Error("READONLY_NOT_ENFORCED");
  stage="EXACT_SOURCE";
  const parent=(await db.query(PARENT_SQL,[QUERY_ID])).rows;
  if(parent.length!==1||parent[0].source_airport_icao!=="WSSS"||
     parent[0].response_hash!==SOURCE_SHA||parent[0].raw_present!==true||
     parent[0].raw_expired_at_utc!==null||
     !Number.isInteger(parent[0].raw_departures))
    throw Error("SOURCE_UNAVAILABLE_OR_EXPIRED");
  stage="AGGREGATE";
  const shape=(await db.query(SHAPE_SQL,[QUERY_ID,SOURCE_SHA])).rows[0];
  const member=(await db.query(MEMBERS_SQL,[QUERY_ID])).rows[0];
  if(shape.response_objects!==parent[0].raw_departures||
     member.normalized_rows!==16||member.primary_rows!==16)
    throw Error("COHORT_CUSTODY_READBACK_MISMATCH");
  stage="ROLLBACK";await db.query("ROLLBACK");open=false;
  console.log(JSON.stringify({
    schema:"v39.gate05.independent-t6-shape-readonly.v1",
    status:"INDEPENDENT_T6_EXACT_RAW_AND_NORMALIZED_PROFILED",
    queryId:QUERY_ID,sourceSha256:SOURCE_SHA,
    durableAvailableAtUtc:parent[0].available_at?.toISOString?.()??null,
    rawDepartureObjects:parent[0].raw_departures,
    rawShapeAggregate:shape,normalizedAggregate:member,
    separateFromOriginalGate05e:true,
    correctedParserSourceMerged:"03f3c0ffd7afbf685de9a1cf07226dd9bdb22998",
    normalizationNotRewritten:true,
    targetTSourceVerified:false,scheduledWheelsOffProven:false,
    actualWheelsOffProven:false,physicalIdentityCertified:false,
    originalFullGate05ScientificallyPassed:false,
    providerCalls:0,databaseWrites:0,rawOrIndividualValuesReturned:false
  }));
}catch{
  console.log(JSON.stringify({schema:"v39.gate05.independent-t6-shape-readonly.v1",
    status:"READONLY_GATE05_T6_SOURCE_HOLD",stage,
    originalFullGate05ScientificallyPassed:false,
    providerCalls:0,databaseWrites:0,rawOrIndividualValuesReturned:false}));
  process.exitCode=2;
}finally{
  if(db){if(open)await db.query("ROLLBACK").catch(()=>{});
    await db.end().catch(()=>{});}
}
