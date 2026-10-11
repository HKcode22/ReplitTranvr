/**
 * P25 historical YSSY incident-30 custody/cleanup census.
 * READ ONLY / NEVER GO: no provider imports, object downloads, blob deletes,
 * updates, migration, incident closure or unlogged scientific promotion.
 * Only run against the established Replit V3.9 database binding.
 */
import {v39Pool as pool} from "../server/lib/disruption/db_v39";

const HISTORICAL_PROBE_ID=18;
const HISTORICAL_INCIDENT_ID=30;
const HISTORICAL_SESSION="6267293e-75a0-42a7-b977-89543f200ebc";

async function main():Promise<void>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN TRANSACTION READ ONLY");
    const incident=await client.query(`
      SELECT id,cause,occurred_at_utc,resolved,
             detail->>'kind' AS kind,
             detail->>'reason' AS reason,
             detail->>'providerDeleteVerified' AS provider_delete_verified,
             detail->>'runtimeCleanupVerified' AS runtime_cleanup_verified
      FROM clean.adb_incident_stop
      WHERE id=$1
    `,[HISTORICAL_INCIDENT_ID]);
    const probe=await client.query(`
      SELECT probe_id,icao,status,duration_censored,
             reconciliation_status,stop_reason,
             runtime_cleanup_verified_at_utc,
             (runtime_session_id=$2::uuid) AS exact_historical_session_bound
      FROM clean.adb_anchor_probe
      WHERE probe_id=$1
    `,[HISTORICAL_PROBE_ID,HISTORICAL_SESSION]);
    const presence=await client.query(`
      SELECT to_regclass('clean.prepaid_probe_session_runtime') IS NOT NULL AS runtime_present,
             to_regclass('clean.phase2g_cleanup_journal_v39') IS NOT NULL AS cleanup_journal_present,
             to_regclass('clean.provider_content_blob_ref') IS NOT NULL AS blob_ref_present,
             to_regclass('clean.phase2g_prepaid_source_intent_v39') IS NOT NULL AS v0064_present
    `);
    const present=presence.rows[0]??{};
    const runtime=present.runtime_present===true?await client.query(`
      SELECT state,
             (provider_subscription_id IS NOT NULL) AS has_bound_provider,
             callback_requests_seen,callback_success_2xx,callback_failures
      FROM clean.prepaid_probe_session_runtime
      WHERE session_id=$1::uuid
    `,[HISTORICAL_SESSION]):null;
    const journal=present.cleanup_journal_present===true?await client.query(`
      SELECT probe_id,state,expected_live_blobs
      FROM clean.phase2g_cleanup_journal_v39
      WHERE session_id=$1::uuid
    `,[HISTORICAL_SESSION]):null;
    const blobs=present.blob_ref_present===true?await client.query(`
      SELECT count(*)::int AS total_references,
             count(*) FILTER (WHERE deletion_verified_at_utc IS NULL)::int AS untombstoned,
             min(expires_at_utc) AS earliest_reference_expiry
      FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook'
        AND source_record_id LIKE $1
    `,[`prepaid:${HISTORICAL_SESSION}:%`]):null;
    const uniqueHistorical=(incident.rowCount===1&&probe.rowCount===1&&
      probe.rows[0]?.icao==="YSSY"&&
      probe.rows[0]?.exact_historical_session_bound===true);
    const result={
      schema:"v39.p25.incident30.custody-cleanup-readonly.v1",
      status:"HOLD_HISTORICAL_ADJUDICATION_REQUIRED" as const,
      observed_at_utc:new Date().toISOString(),
      historical_identity_matches:uniqueHistorical,
      historical_incident:incident.rows[0]??null,
      historical_probe:probe.rows[0]??null,
      has_v0064_source_intent:present.v0064_present===true,
      runtime_table_present:present.runtime_present===true,
      runtime_session_rows:runtime?.rows??null,
      missing_unlogged_runtime_is_not_cleanup_proof:runtime?.rowCount===0,
      cleanup_journal_table_present:present.cleanup_journal_present===true,
      cleanup_journal_rows:journal?.rows??null,
      historical_blob_ref_metadata:blobs?.rows[0]??null,
      retained_object_bytes_verified_now:false,
      provider_deletion_reverified_now:false,
      incident_closure_authorized:false,
      early_original_deletion_authorized:false,
      prior_failed_science_reclassification_authorized:false,
      paid_yssy_go_authorized:false,
      provider_calls:0,
      provider_mutations:0,
      storage_reads:0,
      storage_mutations:0,
      database_mutations:0,
      alert_credits_spent:0
    };
    console.log(JSON.stringify(result,null,2));
    await client.query("ROLLBACK");
    // An exact historical identity check is diagnostic, not launch admission.
    if(!uniqueHistorical||present.blob_ref_present!==true)process.exitCode=2;
  }catch{
    await client.query("ROLLBACK").catch(()=>undefined);
    // Do not print DB driver/connection errors (they may contain credentials).
    console.error("P25_READONLY_INCIDENT_AUDIT_FAILED_NO_PRODUCTION_CHANGES");
    process.exitCode=2;
  }finally{
    client.release();
    await pool.end().catch(()=>undefined);
  }
}
main().catch(()=>{
  console.error("P25_READONLY_INCIDENT_AUDIT_CONNECTION_FAILED");
  process.exitCode=2;
});
