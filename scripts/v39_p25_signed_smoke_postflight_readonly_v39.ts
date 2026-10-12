/**
 * Inspect ONE actual signed public disposable callback result after cleanup.
 * HISTORICAL P2G24 originals and synthetic V0064 LOGGED intent are different
 * evidence classes. No provider, object reads, DB modifications, or cleanups.
 * Exact test session/receipt identity is required; never wildcard old sessions.
 */
import {v39Pool as pool} from "../server/lib/disruption/db_v39.ts";

const HIST="6267293e-75a0-42a7-b977-89543f200ebc";
const TEST="c2380814-6210-43a0-847f-bf8066013063";
const RECEIPT="ecc7ed79f706fcb59d288b158898cdfb65e27901f0ef8477a374176cad0d356d";

async function main(){
 const c=await pool.connect();
 let tx=false;
 try{
  await c.query("BEGIN TRANSACTION READ ONLY"); tx=true;
  await c.query("SET LOCAL statement_timeout='10000ms'");
  const q=await c.query(`
  SELECT
    (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime
      WHERE session_id=$2::uuid) AS test_sessions,
    (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime
      WHERE session_id=$2::uuid) AS test_deliveries,
    (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime
      WHERE session_id=$2::uuid) AS test_items,
    (SELECT count(*)::int FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook' AND source_record_id LIKE $3) AS test_blob_refs,
    (SELECT count(*)::int FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook' AND source_record_id LIKE $3
        AND deletion_verified_at_utc IS NOT NULL) AS test_tombstones,
    (SELECT count(*)::int FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook' AND source_record_id LIKE $4) AS historical_refs,
    (SELECT count(*)::int FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook' AND source_record_id LIKE $4
        AND deletion_verified_at_utc IS NULL) AS historical_retained,
    (SELECT count(*)::int FROM clean.phase2g_prepaid_source_intent_v39
      WHERE session_id=$2::uuid AND state='VERIFIED') AS test_verified_intents,
    (SELECT count(*)::int FROM clean.phase2g_prepaid_source_intent_v39
      WHERE session_id=$1::uuid) AS historical_intents,
    (SELECT count(*)::int FROM clean.adb_anchor_probe
      WHERE status IN ('probing','settling')) AS active_or_settling_probes,
    (SELECT count(*)::int FROM clean.adb_incident_stop
      WHERE resolved=false) AS open_incidents
  `,[HIST,TEST,`prepaid:${TEST}:%`,`prepaid:${HIST}:%`]);
  const raw=q.rows[0]??{};
  const counts=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,Number(v)]));
  const incident=(await c.query(`
    SELECT id,resolved,cause,
      detail->>'reason' AS reason,
      detail->>'runtimeCleanupVerified' AS recorded_cleanup
    FROM clean.adb_incident_stop WHERE id=30
  `)).rows;
  const probe=(await c.query(`
    SELECT probe_id,icao,status,duration_censored,reconciliation_status,
       stop_reason,runtime_cleanup_verified_at_utc
    FROM clean.adb_anchor_probe WHERE probe_id=18
  `)).rows;
  const p=probe[0],i=incident[0];
  const passed=counts.test_sessions===0&&counts.test_deliveries===0&&
    counts.test_items===0&&counts.test_blob_refs===1&&
    counts.test_tombstones===1&&counts.test_verified_intents===1&&
    counts.historical_refs===30&&counts.historical_retained===30&&
    counts.active_or_settling_probes===0&&counts.open_incidents===1&&
    counts.historical_intents===0&&
    incident.length===1&&String(i?.id)==="30"&&i?.resolved===false&&
    i?.cause==="reconciliation"&&i?.reason==="supervisor_child_exit_recovered"&&
    i?.recorded_cleanup==="false"&&
    probe.length===1&&p?.probe_id===18&&p?.icao==="YSSY"&&
    p?.status==="failed"&&p?.duration_censored===true&&
    p?.reconciliation_status==="UNRESOLVED"&&
    p?.stop_reason==="supervisor_child_exit_recovered"&&
    p?.runtime_cleanup_verified_at_utc==null;
  console.log(JSON.stringify({
    schema:"v39.p25.after-signed-public-smoke-readonly.v1",
    inspected_test_session:TEST,
    signed_public_smoke_receipt_sha256:RECEIPT,
    status:passed?"PASS_SYNTHETIC_CLEANUP_HISTORICAL_ORIGINALS_PRESERVED":
      "HOLD_POST_SMOKE_DATABASE_STATE",
    counts,
    historical_incident30_still_open: i?.resolved===false,
    historical_probe18_still_failed: p?.status==="failed",
    test_source_intent_metadata_remains_immutable:true,
    note:"Test source intent is LOGGED while disposable test object was deliberately deleted. Never count this as 168h live-flight retention proof.",
    historical_30_object_sha_readback_performed_by_this_script:false,
    paid_run_authorized:false,science_reclassified:false,
    provider_calls:0,db_mutations:0,storage_calls:0,
    alert_credits_spent:0
  },null,2));
  await c.query("ROLLBACK");tx=false;
  if(!passed)process.exitCode=2;
 }catch{
  if(tx)await c.query("ROLLBACK").catch(()=>undefined);
  console.error("P25_POST_SMOKE_READONLY_AUDIT_UNAVAILABLE_HOLD");
  process.exitCode=2;
 }finally{
  c.release();await pool.end().catch(()=>undefined);
 }
}
main().catch(()=>{console.error("P25_POST_SMOKE_READONLY_CONNECTION_HOLD");process.exitCode=2;});
