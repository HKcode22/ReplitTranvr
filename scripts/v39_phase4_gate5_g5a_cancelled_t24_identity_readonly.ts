/**
 * Incident-only production READ ONLY aggregate for the Nov5 ID-less WSSS
 * original; no HTTP calls, no history replay, no flight-level Content output.
 * Expires along with source rights. Never use results to rewrite old PRE.
 */
import pg from "pg";

const MANIFEST_SHA="7fe022a475447a082e1ccddd3805a5ad554f03885401afb22ee283a2a1b90aed";

/** Query intentionally returns aggregate counters ONLY; no flight number/ID. */
export const G5A_CANCELLED_T24_IDENTITY_AGG_SQL_V39=`
WITH originals AS (
 SELECT f.raw_payload,f.available_at
 FROM clean.phase4_g5_fids_original_binding_v39 b
 JOIN clean.phase4_g5_fids_allowed_query_v39 q
  ON q.query_digest=b.query_digest
 JOIN clean.phase4_g5_fids_physical_owner_v39 ow
  ON ow.owner_digest=q.owner_digest
  AND ow.manifest_sha256=b.manifest_sha256
 JOIN clean.fids_query_response f
  ON f.population_query_id=b.population_query_id
  AND f.response_hash=b.original_response_sha256
 WHERE b.manifest_sha256=$1 AND ow.horizon='T-24h'
  AND f.raw_expired_at_utc IS NULL
  AND b.source_use_expires_at_utc>clock_timestamp()
), native AS (
 SELECT elem.item,o.available_at
 FROM originals o
 CROSS JOIN LATERAL jsonb_array_elements(
  COALESCE(o.raw_payload->'departures','[]'::jsonb)) elem(item)
), tagged AS (
 SELECT item,available_at,
  item->>'codeshareStatus' IN ('IsOperator','1') AS is_operator,
  item->>'codeshareStatus' IN ('IsCodeshared','2') AS is_marketing,
  NULLIF(BTRIM(item->>'id'),'') IS NOT NULL AS has_native_id,
  UPPER(regexp_replace(COALESCE(item->>'number',''),
   '[[:space:]]','','g')) AS flight_number_clean,
  UPPER(item#>>'{arrival,airport,icao}') AS dest_icao,
  UPPER(item#>>'{departure,airport,icao}') AS origin_icao,
  item#>>'{departure,scheduledTime,utc}' AS departure_utc
 FROM native
), valid AS (
 SELECT *,
  (flight_number_clean ~ '^[A-Z0-9]{2}[0-9]{1,4}$') AS parsed_number,
  (dest_icao ~ '^[A-Z0-9]{4}$') AS valid_destination,
  (origin_icao IS NULL OR origin_icao='WSSS') AS valid_origin,
  (item->>'isCharter'='true' OR item->>'isCargo'='true'
   OR item->>'isPrivate'='true' OR
   item->>'isGeneralAviation'='true') AS excluded_known_scope,
  CASE WHEN item->>'codeshareStatus' IN ('IsOperator','1')
    AND NULLIF(BTRIM(item->>'id'),'') IS NULL
    AND flight_number_clean ~ '^[A-Z0-9]{2}[0-9]{1,4}$'
    AND dest_icao ~ '^[A-Z0-9]{4}$'
    AND (origin_icao IS NULL OR origin_icao='WSSS')
    AND item->>'isCharter' IS DISTINCT FROM 'true'
    AND item->>'isCargo' IS DISTINCT FROM 'true'
    AND item->>'isPrivate' IS DISTINCT FROM 'true'
    AND item->>'isGeneralAviation' IS DISTINCT FROM 'true'
    THEN flight_number_clean||'|WSSS|'||dest_icao
   ELSE NULL END AS conditional_key
 FROM tagged
), counted AS (
 SELECT *,
  COUNT(*) OVER (PARTITION BY conditional_key) AS same_key_count
 FROM valid
)
SELECT
 COUNT(*)::int AS raw_departure_rows,
 COUNT(*) FILTER (WHERE is_operator)::int AS provider_says_operator,
 COUNT(*) FILTER (WHERE is_marketing)::int AS provider_says_marketing,
 COUNT(*) FILTER (WHERE NOT is_operator AND NOT is_marketing)::int AS codeshare_unknown_or_other,
 COUNT(*) FILTER (WHERE has_native_id)::int AS provider_native_id_present,
 COUNT(*) FILTER (WHERE parsed_number)::int AS valid_two_char_flight_number,
 COUNT(*) FILTER (WHERE valid_destination)::int AS destination_present,
 COUNT(*) FILTER (WHERE valid_origin)::int AS origin_consistent_or_omitted,
 COUNT(*) FILTER (WHERE excluded_known_scope)::int AS known_out_of_scope,
 COUNT(*) FILTER (WHERE conditional_key IS NOT NULL)::int AS conditional_operator_candidates,
 COUNT(*) FILTER (WHERE conditional_key IS NOT NULL
  AND same_key_count=1)::int AS distinct_eligible_no_id_candidates,
 COUNT(*) FILTER (WHERE conditional_key IS NOT NULL
  AND same_key_count>1)::int AS composite_collision_rows,
 COUNT(*) FILTER (WHERE conditional_key IS NOT NULL
  AND same_key_count=1
  AND departure_utc ~ '^2026-11-06T'
  AND available_at<=departure_utc::timestamptz - interval '24 hours'
  AND departure_utc::timestamptz>=TIMESTAMPTZ '2026-11-06T09:00:00Z'
  AND departure_utc::timestamptz<TIMESTAMPTZ '2026-11-06T10:00:00Z'
 )::int AS qualified_on_time_candidate_count,
 (SELECT count(*)::int FROM originals) AS original_receipt_count
FROM counted`;

export async function main(){
 const connectionString=process.env.DATABASE_URL;
 if(!connectionString)throw Error("READONLY_DATABASE_URL_REQUIRED");
 const db=new pg.Client({connectionString,connectionTimeoutMillis:9000,
  query_timeout:15000,options:"-c default_transaction_read_only=on",
  application_name:"g5a_cancelled_t24_idless_aggregate_only"});
 let tx=false;
 await db.connect();
 try {
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  const r=await db.query(G5A_CANCELLED_T24_IDENTITY_AGG_SQL_V39,[MANIFEST_SHA]);
  await db.query("ROLLBACK");tx=false;
  if(r.rows.length!==1)throw Error("READONLY_AGGREGATE_SHAPE_HOLD");
  console.log(JSON.stringify({
   status:"G5A_CANCELLED_T24_NATIVE_FIELD_IDENTITY_AGGREGATE_ONLY",
   ...r.rows[0],providerCalls:0,databaseWrites:0,
   historicalPRERewritten:false,scientificGate5Passed:false
  }));
 }finally{if(tx)await db.query("ROLLBACK").catch(()=>{});
  await db.end().catch(()=>{})}
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_g5a_cancelled_t24_identity_readonly.ts"))
 void main().catch(()=>{
  console.error(JSON.stringify({status:"G5A_CANCELLED_T24_READONLY_AGGREGATE_HOLD",
   providerCalls:0,databaseWrites:0,providerContentPrinted:false}));
  process.exitCode=2;
 });
