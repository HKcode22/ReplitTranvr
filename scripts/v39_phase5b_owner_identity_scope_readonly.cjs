// Owner read-only aggregate of exact retained SOURCE fields. No provider calls, IDs or contents printed.
"use strict";
const {createRequire}=require("node:module");
const {join}=require("node:path");
const {Client}=createRequire(join(process.cwd(),"package.json"))("pg");
let stage="ADMISSION";
async function main(){
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
 try{
  if(!process.env.DATABASE_URL)throw Error("NO_OWNER_DSN");
  await c.connect();await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='25s'");
  const who=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro,transaction_timestamp() at")).rows[0];
  if(!who.db||!who.owner||!who.primary||!who.ro)throw Error("IDENTITY_HOLD");
  const auth=await c.query("SELECT DISTINCT manifest_sha256 FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL");
  if(auth.rowCount!==1||!/^[a-f0-9]{64}$/.test(auth.rows[0].manifest_sha256))throw Error("MANIFEST_HOLD");
  const m=auth.rows[0].manifest_sha256;
  stage="NORMALIZED_IDENTITY";
  const norm=await c.query(`
   SELECT q.run_day_index,q.horizon,q.slot_id,p.scope_classification,p.codeshare_resolution_status,
    count(*)::bigint observations,count(*) FILTER(WHERE p.canonical_flight_instance_id IS NOT NULL)::bigint canonical_present,
    count(*) FILTER(WHERE p.dep_scheduled_utc IS NOT NULL)::bigint scheduled_present,
    count(*) FILTER(WHERE p.canonical_flight_instance_id=p.analytic_identity_id AND p.population_role='requested_airport_primary'
      AND p.dep_airport_icao=q.airport_icao AND p.query_direction='Departure'
      AND p.source_type='fids' AND p.response_hash=b.response_hash AND p.provider_content_expired_at_utc IS NULL)::bigint other_native_conditions
   FROM clean.phase5_fids_allowed_query_v39 q JOIN clean.phase5_fids_original_binding_v39 b USING(manifest_sha256,query_digest)
   JOIN clean.flight_population p ON p.population_query_id=b.population_query_id
   WHERE q.manifest_sha256=$1 AND q.run_day_index IN (2,3) AND b.source_expires_at_utc>transaction_timestamp()
   GROUP BY 1,2,3,4,5 ORDER BY 1,2,3,4,5`,[m]);
  // Never print arbitrary database strings, even in the grouped status fields.
  const scopes=new Set(["confirmed_core","unknown","auxiliary"]);
  const codes=new Set(["confirmed_operating_leg","resolved_marketing","ambiguous_codeshare","context_departure_origin_unverified","foreign_departure_origin_unverified","ambiguous_distinct_leg","phase5_duplicate_identity_ambiguous","phase5_duplicate_provider_record_ambiguous","phase5_legacy_observation_key_ambiguous","g5a_conditional_operator_composite_no_native_id"]);
  const rows=norm.rows.map(x=>({...x,scope_classification:scopes.has(x.scope_classification)?x.scope_classification:"OTHER_OR_NULL",codeshare_resolution_status:codes.has(x.codeshare_resolution_status)?x.codeshare_resolution_status:"OTHER_OR_NULL"}));
  console.log(JSON.stringify({status:"P6_NORMALIZED_IDENTITY_SCOPE_COUNTS_READONLY",at:who.at,rows,providerCalls:0,productionWrites:0}));
  stage="ORIGINAL_FIELD_PRESENCE";
  const raw=await c.query(`
   WITH originals AS MATERIALIZED (
    SELECT q.run_day_index,q.horizon,q.slot_id,q.airport_icao,r.raw_payload
    FROM clean.phase5_fids_allowed_query_v39 q JOIN clean.phase5_fids_original_binding_v39 b USING(manifest_sha256,query_digest)
    JOIN clean.fids_query_response r ON r.population_query_id=b.population_query_id AND r.response_hash=b.response_hash
    WHERE q.manifest_sha256=$1 AND q.run_day_index IN (2,3) AND b.source_expires_at_utc>clock_timestamp()+interval '30 seconds'
      AND r.raw_expired_at_utc IS NULL AND r.raw_payload IS NOT NULL
   ), departures AS (
    SELECT o.run_day_index,o.horizon,o.slot_id,o.airport_icao,d.value AS f
    FROM originals o CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(o.raw_payload->'departures')='array' THEN o.raw_payload->'departures' ELSE '[]'::jsonb END) d
   ), classified AS (
    SELECT *, (f->>'codeshareStatus' IN ('IsOperator','1')) operator_tag,
      (NULLIF(f#>>'{departure,airport,icao}','') IS NOT NULL) explicit_origin,
      (f#>>'{departure,airport,icao}'=airport_icao) matching_origin,
      (jsonb_typeof(f->'id')='string' AND length(trim(f->>'id')) BETWEEN 3 AND 180) native_id,
      (f->>'number' ~* '^[A-Z0-9]{2}[[:space:]]*[0-9]{1,4}$' AND f#>>'{arrival,airport,icao}' ~ '^[A-Z]{4}$'
       AND NULLIF(f#>>'{departure,scheduledTime,utc}','') IS NOT NULL) service_fields,
      (f->'isCargo'='false'::jsonb AND f->'isPrivate'='false'::jsonb AND f->'isCharter'='false'::jsonb) explicit_core,
      (f->'isCargo'='true'::jsonb OR f->'isPrivate'='true'::jsonb OR f->'isGeneralAviation'='true'::jsonb OR f->'isCharter'='true'::jsonb) known_excluded
    FROM departures
   )
   SELECT run_day_index,horizon,slot_id,count(*)::bigint raw_departures,
    count(*) FILTER (WHERE operator_tag)::bigint operator_tag,
    count(*) FILTER (WHERE f->>'codeshareStatus' IN ('IsCodeshared','2'))::bigint marketing_tag,
    count(*) FILTER (WHERE native_id)::bigint native_id_present,
    count(*) FILTER (WHERE explicit_origin)::bigint explicit_origin,
    count(*) FILTER (WHERE matching_origin)::bigint matching_origin,
    count(*) FILTER (WHERE f->'isCargo'='false'::jsonb)::bigint cargo_false,
    count(*) FILTER (WHERE f->'isPrivate'='false'::jsonb)::bigint private_false,
    count(*) FILTER (WHERE f->'isCharter'='false'::jsonb)::bigint charter_false,
    count(*) FILTER (WHERE explicit_core)::bigint explicit_core,
    count(*) FILTER (WHERE operator_tag AND matching_origin AND native_id AND explicit_core AND service_fields)::bigint strict_field_upper_bound,
    count(*) FILTER (WHERE operator_tag AND (NOT explicit_origin OR matching_origin) AND service_fields AND NOT COALESCE(known_excluded,false))::bigint conditional_service_field_upper_bound
   FROM classified GROUP BY 1,2,3 ORDER BY 1,2,3`,[m]);
  console.log(JSON.stringify({status:"P6_ORIGINAL_IDENTITY_FIELD_COUNTS_READONLY",at:who.at,rows:raw.rows,conditionalCountIsNotPhysicalLegOrPREEligibility:true,rawFieldsAreNotNormalizedDenominator:true,providerCalls:0,productionWrites:0}));
 }finally{await c.query("ROLLBACK").catch(()=>{});await c.end().catch(()=>{});}
}
main().catch(e=>{console.error(JSON.stringify({status:"P6_IDENTITY_SCOPE_AUDIT_HOLD",stage,code:/^[0-9A-Z]{5}$/.test(e?.code??"")?e.code:"READ_OR_IDENTITY_FAILED",providerCalls:0,productionWrites:0}));process.exitCode=2;});
