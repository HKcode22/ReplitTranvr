// Owner-only metadata census. No provider calls, GitHub dispatch, SQL writes,
// raw provider Content, secrets, or historical replay. Run from workspace root.
"use strict";
const {createRequire}=require("node:module");
const {join}=require("node:path");
const {Client}=createRequire(join(process.cwd(),"package.json"))("pg");
const exactRuns=["45435367814","45435371804","45435375175","45435378191"];
const report=(status,fields)=>console.log(JSON.stringify({status,...fields}));
async function main(){
 if(!process.env.DATABASE_URL)throw Error("NO_LOCAL_OWNER_DSN");
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
 try{
  await c.connect();
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='15s'");
  const g=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro,statement_timestamp() at")).rows[0];
  if(!g.db||!g.owner||!g.primary||!g.ro)throw Error("UNEXPECTED_DB_IDENTITY");
  const a=await c.query("SELECT DISTINCT manifest_sha256 FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL");
  if(a.rowCount!==1||!/^[a-f0-9]{64}$/.test(a.rows[0].manifest_sha256))throw Error("NO_EXACT_ACTIVE_MANIFEST");
  const m=a.rows[0].manifest_sha256;
  const exact=await c.query(`
   SELECT x.run_id, q.run_day_index, q.slot_id, q.horizon,
    q.planned_dispatch_utc, q.prediction_cutoff_utc,
    p.committed_at_utc AS reservation_utc,p.charged_reserved_units,
    (SELECT count(*)::int FROM clean.phase5_fids_original_binding_v39 b
     WHERE b.reservation_sha256=p.reservation_sha256) AS bound_originals,
    (SELECT count(*)::int FROM clean.phase5_fids_original_binding_v39 b
      JOIN clean.fids_query_response f USING(population_query_id)
      WHERE b.reservation_sha256=p.reservation_sha256
      AND f.available_at<=q.prediction_cutoff_utc) AS timely_bound_originals
   FROM unnest($2::text[]) x(run_id)
   LEFT JOIN clean.phase5_fids_physical_attempt_v39 p
     ON p.github_run_id::text=x.run_id AND p.manifest_sha256=$1
   LEFT JOIN clean.phase5_fids_allowed_query_v39 q
     ON q.manifest_sha256=p.manifest_sha256 AND q.query_digest=p.query_digest
   ORDER BY x.run_id,p.committed_at_utc`,[m,exactRuns]);
  report("P6_EXACT_FOUR_FAILED_SOURCE_RUNS_METADATA",{at:g.at,rows:exact.rows,providerHttpProven:false,providerBillingProven:false});
  const summary=await c.query(`
   WITH per_query AS (
    SELECT q.run_day_index,q.horizon,q.planned_dispatch_utc,q.prediction_cutoff_utc,
      EXISTS(SELECT 1 FROM clean.phase5_fids_physical_attempt_v39 p
       WHERE p.manifest_sha256=q.manifest_sha256 AND p.query_digest=q.query_digest) reserved,
      EXISTS(SELECT 1 FROM clean.phase5_fids_original_binding_v39 b
       JOIN clean.fids_query_response f USING(population_query_id)
       WHERE b.manifest_sha256=q.manifest_sha256 AND b.query_digest=q.query_digest) bound,
      EXISTS(SELECT 1 FROM clean.phase5_fids_original_binding_v39 b
       JOIN clean.fids_query_response f USING(population_query_id)
       WHERE b.manifest_sha256=q.manifest_sha256 AND b.query_digest=q.query_digest
        AND f.available_at<=q.prediction_cutoff_utc) timely
    FROM clean.phase5_fids_allowed_query_v39 q
    WHERE q.manifest_sha256=$1 AND q.run_day_index IN (1,2)
   )
   SELECT run_day_index,horizon,count(*)::int signed_queries,
    count(*) FILTER (WHERE reserved)::int reserved_queries,
    count(*) FILTER (WHERE bound)::int bound_queries,
    count(*) FILTER (WHERE timely)::int timely_bound_queries,
    count(*) FILTER (WHERE reserved AND NOT bound)::int reserved_without_current_original,
    count(*) FILTER (WHERE NOT reserved AND prediction_cutoff_utc<=transaction_timestamp())::int cutoff_elapsed_unreserved,
    count(*) FILTER (WHERE NOT reserved AND planned_dispatch_utc>transaction_timestamp())::int future_scheduled_unreserved
   FROM per_query GROUP BY run_day_index,horizon ORDER BY run_day_index,horizon`,[m]);
  const stops=(await c.query("SELECT count(*)::int n FROM clean.adb_incident_stop WHERE NOT resolved")).rows[0].n;
  report("P6_DAY1_DAY2_SOURCE_CUSTODY_METADATA",{rows:summary.rows,unresolvedStops:stops,absentHorizonIsNotZeroPlannedDenominator:true,prePublicationProven:false,providerCalls:0,productionWrites:0,workflowDispatches:0});
 }finally{
  await c.query("ROLLBACK").catch(()=>{});
  await c.end().catch(()=>{});
 }
}
main().catch(e=>{console.error(JSON.stringify({status:"P6_SOURCE_METADATA_READ_HOLD",code:/^[0-9A-Z]{5}$/.test(e?.code??"")?e.code:"READ_OR_IDENTITY_FAILED",providerCalls:0,productionWrites:0}));process.exitCode=2;});
