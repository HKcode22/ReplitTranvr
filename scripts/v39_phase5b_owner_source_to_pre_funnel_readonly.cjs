// Owner-only aggregate audit; no provider calls, raw payloads, IDs in output, writes, signing, or replay.
"use strict";
const {createRequire}=require("node:module");
const {join}=require("node:path");
const {Client}=createRequire(join(process.cwd(),"package.json"))("pg");
async function main(){
 if(!process.env.DATABASE_URL)throw Error("NO_OWNER_DSN");
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
 try{
  await c.connect();
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='25s'");
  const g=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro,transaction_timestamp() at")).rows[0];
  if(!g.db||!g.owner||!g.primary||!g.ro)throw Error("UNEXPECTED_DB_IDENTITY");
  const a=await c.query("SELECT DISTINCT manifest_sha256 FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL");
  if(a.rowCount!==1||!/^[a-f0-9]{64}$/.test(a.rows[0].manifest_sha256))throw Error("NO_EXACT_ACTIVE_MANIFEST");
  const m=a.rows[0].manifest_sha256;
  const report=await c.query(`
  WITH bound AS MATERIALIZED (
    SELECT q.run_day_index,q.horizon,q.slot_id,q.airport_icao,q.service_window_start_utc,q.service_window_end_utc,
       b.population_query_id,b.response_hash,b.normalized_members_count,b.source_expires_at_utc,r.available_at source_at,
       CASE q.horizon WHEN 'T-24h' THEN interval '24 hours' WHEN 'T-6h' THEN interval '6 hours' WHEN 'T-90m' THEN interval '90 minutes' END horizon_offset
    FROM clean.phase5_fids_allowed_query_v39 q
    JOIN clean.phase5_fids_original_binding_v39 b USING(manifest_sha256,query_digest)
    JOIN clean.fids_query_response r ON r.population_query_id=b.population_query_id AND r.response_hash=b.response_hash
    WHERE q.manifest_sha256=$1 AND q.run_day_index IN (2,3)
    AND q.horizon IN ('T-24h','T-6h','T-90m')
    AND r.raw_expired_at_utc IS NULL AND b.source_expires_at_utc>transaction_timestamp()
  ), member AS (
    SELECT b.*,p.id,p.available_at member_at,p.dep_scheduled_utc native_t,
      p.dep_scheduled_utc-b.horizon_offset own_cutoff,
      count(*) OVER (PARTITION BY b.population_query_id,p.analytic_identity_id) n_same,
      (p.canonical_flight_instance_id IS NOT NULL AND p.canonical_flight_instance_id=p.analytic_identity_id
       AND p.source_airport_icao=b.airport_icao AND p.dep_airport_icao=b.airport_icao
       AND p.population_role='requested_airport_primary' AND p.scope_classification='confirmed_core'
       AND p.codeshare_resolution_status='confirmed_operating_leg' AND p.source_type='fids'
       AND p.response_hash=b.response_hash AND p.provider_content_expired_at_utc IS NULL
       AND p.query_direction='Departure' AND p.population_member_id IS NOT NULL
       AND length(p.population_member_id::text)>0) native_shape
    FROM bound b JOIN clean.flight_population p ON p.population_query_id=b.population_query_id
  ), screened AS (
    SELECT *, (n_same=1 AND native_shape AND native_t>=service_window_start_utc AND native_t<service_window_end_utc
       AND source_at<=own_cutoff AND member_at>=source_at AND member_at<=own_cutoff
       AND source_expires_at_utc>own_cutoff AND own_cutoff-source_at<=interval '45 minutes') AS timing_base
    FROM member
  ), orig AS (
    SELECT run_day_index,horizon,slot_id,count(*)::int live_bound_originals,
      sum(normalized_members_count)::bigint reported_normalized_members
    FROM bound GROUP BY 1,2,3
  ), funnel AS (
    SELECT run_day_index,horizon,slot_id,count(*)::bigint actual_population_members,
      count(*) FILTER (WHERE n_same=1 AND native_shape)::bigint native_shape_unique_members,
      count(*) FILTER (WHERE timing_base)::bigint timing_base_members,
      count(*) FILTER (WHERE timing_base AND own_cutoff-GREATEST(member_at,source_at)>interval '15 minutes')::bigint upper_bound_lead900,
      count(*) FILTER (WHERE timing_base AND own_cutoff-GREATEST(member_at,source_at)>interval '10 minutes')::bigint upper_bound_lead600,
      count(*) FILTER (WHERE timing_base AND own_cutoff-GREATEST(member_at,source_at)>interval '5 minutes')::bigint upper_bound_lead300
    FROM screened GROUP BY 1,2,3
  ), snapshots AS (
    SELECT b.run_day_index,b.horizon,b.slot_id,count(s.id)::bigint source_linked_pre_rows,
      count(s.id) FILTER (WHERE s.created_at<=s.prediction_cutoff_utc)::bigint source_linked_cutoff_safe_pre_rows
    FROM bound b LEFT JOIN clean.flight_snapshots s ON s.population_query_id=b.population_query_id
      AND s.horizon=b.horizon AND s.prediction_state='PRE_DEPARTURE'
    GROUP BY 1,2,3
  )
  SELECT o.*,COALESCE(f.actual_population_members,0) actual_population_members,
     COALESCE(f.native_shape_unique_members,0) native_shape_unique_members,
     COALESCE(f.timing_base_members,0) timing_base_members,
     COALESCE(f.upper_bound_lead900,0) upper_bound_lead900,COALESCE(f.upper_bound_lead600,0) upper_bound_lead600,
     COALESCE(f.upper_bound_lead300,0) upper_bound_lead300,
     COALESCE(s.source_linked_pre_rows,0) source_linked_pre_rows,
     COALESCE(s.source_linked_cutoff_safe_pre_rows,0) source_linked_cutoff_safe_pre_rows
  FROM orig o LEFT JOIN funnel f USING(run_day_index,horizon,slot_id)
    LEFT JOIN snapshots s USING(run_day_index,horizon,slot_id)
  ORDER BY run_day_index,horizon,slot_id`,[m]);
  console.log(JSON.stringify({status:"P6_LIVE_BOUND_SOURCE_TO_PRE_METADATA_FUNNEL_READONLY",at:g.at,rows:report.rows,
   leadCountsAreOptimisticUpperBoundsAtMemberAvailability:true,actualHistoricalAuditClockReconstructed:false,
   retainedCrossOriginalAliasScreenReproduced:false,publicationOrTrainingEligibilityCertified:false,
   expiredOriginalsExcluded:true,providerCalls:0,productionWrites:0}));
  const budget=await c.query(`
  SELECT (p.committed_at_utc AT TIME ZONE 'UTC')::date::text physical_utc_day,
    count(*)::int source_reservations,sum(p.charged_reserved_units)::bigint source_reserved_units
  FROM clean.phase5_fids_physical_attempt_v39 p WHERE p.manifest_sha256=$1
  GROUP BY 1 ORDER BY 1`,[m]);
  const stops=(await c.query("SELECT count(*)::int n FROM clean.adb_incident_stop WHERE NOT resolved")).rows[0].n;
  console.log(JSON.stringify({status:"P6_SOURCE_RESERVATION_AND_STOP_READONLY",at:g.at,rows:budget.rows,unresolvedStops:stops,
   sourceOnlyNotAllCategories:true,providerBillingProven:false,providerCalls:0,productionWrites:0}));
 }finally{await c.query("ROLLBACK").catch(()=>{});await c.end().catch(()=>{});}
}
main().catch(e=>{console.error(JSON.stringify({status:"P6_PRE_FUNNEL_READ_HOLD",code:/^[0-9A-Z]{5}$/.test(e?.code??"")?e.code:"READ_OR_IDENTITY_FAILED",providerCalls:0,productionWrites:0}));process.exitCode=2;});
