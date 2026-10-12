/**
 * Exact historical incident #30: current-risk administrative containment.
 * Defaults READ ONLY. --apply is a production DB mutation: only run with
 * separately explicit operator consent after complete project-lead review.
 * Never claims original UNLOGGED cleanup, provider sender completeness,
 * scientific PASS, or permission for a new paid subscription.
 */
import { v39Pool as pool } from "../server/lib/disruption/db_v39.ts";
import {listSubscriptionsStrict} from "../server/lib/disruption/aerodataboxLimiter_v3.ts";

const SESSION="6267293e-75a0-42a7-b977-89543f200ebc";
const APPLY=process.argv.includes("--apply");
const PHRASE="I_APPROVE_ONLY_CURRENT_RISK_CONTAINMENT_OF_INCIDENT_30_KEEP_HISTORICAL_CLEANUP_UNVERIFIED";
const approved=process.env.P25_INCIDENT30_ADMIN_CONSENT===PHRASE;
if(process.argv.slice(2).some(x=>x!=="--apply"))
  throw Error("REFUSED:UNREVIEWED_ADMIN_ARGS");
if(APPLY&&!approved)
  throw Error("REFUSED:EXPLICIT_INCIDENT30_CONSENT_REQUIRED");
async function main(){
  // A failed provider LIST must fail closed even for dry-run. This
  // endpoint may consume standard REST units, never Alert credits.
  const subscriptions=await listSubscriptionsStrict();
  if(!Array.isArray(subscriptions))
    throw Error("REFUSED:PROVIDER_INVENTORY_UNAVAILABLE");
  const activeBillable=subscriptions.filter(x=>x.isActive&&x.billingType!=="LifetimeBased");
  const client=await pool.connect();let tx=false;
  try{
    await client.query(APPLY?"BEGIN":"BEGIN TRANSACTION READ ONLY");tx=true;
    await client.query("SET LOCAL statement_timeout='12000ms'");
    await client.query("SET LOCAL lock_timeout='3000ms'");
    if(APPLY){
      const lock=await client.query("SELECT pg_try_advisory_xact_lock(943025,30) AS acquired");
      if(lock.rows[0]?.acquired!==true)throw Error("REFUSED:INCIDENT30_ADMIN_LOCK_UNAVAILABLE");
    }
    const incidents=await client.query(`
      SELECT id,cause,resolved,detail,occurred_at_utc
        FROM clean.adb_incident_stop
       WHERE id=30 ${APPLY?"FOR UPDATE":""}`);
    const probes=await client.query(`
      SELECT probe_id,icao,status,duration_censored,
             reconciliation_status,stop_reason,runtime_session_id,
             runtime_cleanup_verified_at_utc
        FROM clean.adb_anchor_probe WHERE probe_id=18`);
    const totals=await client.query(`
      SELECT
        (SELECT count(*)::int FROM clean.adb_incident_stop WHERE resolved=false)
          AS open_incidents,
        (SELECT count(*)::int FROM clean.adb_anchor_probe
          WHERE status IN ('probing','settling')) AS busy_probes,
        (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime)
          AS runtime_sessions,
        (SELECT count(*)::int FROM clean.phase2g_cleanup_journal_v39
          WHERE session_id=$1::uuid) AS old_cleanup_journal_rows,
        (SELECT count(*)::int FROM clean.provider_content_blob_ref
          WHERE source_kind='webhook' AND source_record_id LIKE $2)
          AS historical_blob_refs,
        (SELECT count(*)::int FROM clean.provider_content_blob_ref
          WHERE source_kind='webhook' AND source_record_id LIKE $2
            AND deletion_verified_at_utc IS NULL)
          AS untombstoned_historical_refs,
        (SELECT min(expires_at_utc) FROM clean.provider_content_blob_ref
          WHERE source_kind='webhook' AND source_record_id LIKE $2)
          AS earliest_source_expiry,
        (SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN')
          AS open_budget_days
    `,[SESSION,`prepaid:${SESSION}:%`]);
    const i=incidents.rows[0],p=probes.rows[0],t=totals.rows[0];
    const metadata=i?.detail??{};
    const eligible=incidents.rowCount===1&&probes.rowCount===1&&
      String(i.id)==="30"&&i.cause==="reconciliation"&&i.resolved===false&&
      metadata.kind==="stage1_supervisor_recovery"&&
      metadata.reason==="supervisor_child_exit_recovered"&&
      String(metadata.providerDeleteVerified)==="true"&&
      String(metadata.runtimeCleanupVerified)==="false"&&
      p.probe_id===18&&p.icao==="YSSY"&&p.status==="failed"&&
      p.duration_censored===true&&p.reconciliation_status==="UNRESOLVED"&&
      p.stop_reason==="supervisor_child_exit_recovered"&&
      String(p.runtime_session_id)===SESSION&&
      p.runtime_cleanup_verified_at_utc==null&&
      Number(t.open_incidents)===1&&Number(t.busy_probes)===0&&
      Number(t.runtime_sessions)===0&&Number(t.old_cleanup_journal_rows)===0&&
      Number(t.historical_blob_refs)===30&&
      Number(t.untombstoned_historical_refs)===30&&
      new Date(t.earliest_source_expiry).getTime()>Date.now()&&
      Number(t.open_budget_days)===0&&activeBillable.length===0;
    const out={
      schema:"v39.p25.incident30.current-risk-containment.v1",
      status:eligible?"ELIGIBLE_FOR_EXPLICIT_CONTAINMENT_ONLY":
        "HOLD_INCOMPLETE_CURRENT_RISK_EVIDENCE",
      mode:APPLY?"EXPLICIT_ADMIN_APPLY":"READ_ONLY_PREVIEW",
      observed_at_utc:new Date().toISOString(),
      exact_historical_identity:incidents.rowCount===1&&probes.rowCount===1,
      old_probe_failed_censored:p?.status==="failed"&&p?.duration_censored===true,
      historical_runtime_cleanup_proven:false,
      old_cleanup_journal_rows:Number(t?.old_cleanup_journal_rows??-1),
      retained_source_references:Number(t?.untombstoned_historical_refs??-1),
      source_object_sha_verified_by_this_script:false,
      active_billable_subscriptions:activeBillable.length,
      active_probes:Number(t?.busy_probes??-1),
      runtime_sessions:Number(t?.runtime_sessions??-1),
      open_budget_days:Number(t?.open_budget_days??-1),
      existing_open_incidents:Number(t?.open_incidents??-1),
      current_risk_containment_decision_requested:APPLY,
      paid_provider_calls:0,paid_alert_credits_spent:0,
      paid_yssy_authorized:false,
      past_scientific_failure_unchanged:true,
      historical_original_deletion_authorized:false
    };
    if(!eligible){
      console.log(JSON.stringify(out,null,2));
      await client.query("ROLLBACK");tx=false;process.exitCode=2;return;
    }
    if(!APPLY){
      console.log(JSON.stringify(out,null,2));
      await client.query("ROLLBACK");tx=false;return;
    }
    // The old incident's detail stays intact, including
    // runtimeCleanupVerified:false. This optional note distinguishes
    // current-hazard closure from absent historical cleanup proof.
    const evidence={
      adminScope:"CURRENT_HAZARD_CONTAINED_ONLY",
      historicalRuntimeCleanupVerified:false,
      historicalScientificAccepted:false,
      originalProviderSenderCompletenessUnknown:true,
      historicalProbe18RemainsFailed:true,
      originalThirtyBlobRefsPreserved:true,
      paidYssyAuthorizedByAdminClose:false,
      adminApprovedAtUtc:new Date().toISOString()
    };
    const updated=await client.query(`
      UPDATE clean.adb_incident_stop
         SET resolved=true,
             detail=detail||$1::jsonb
       WHERE id=30 AND cause='reconciliation' AND resolved=false
         AND detail->>'kind'='stage1_supervisor_recovery'
         AND detail->>'reason'='supervisor_child_exit_recovered'
         AND detail->>'runtimeCleanupVerified'='false'
       RETURNING id,resolved,detail->>'runtimeCleanupVerified'
        AS old_cleanup_claim
    `,[JSON.stringify(evidence)]);
    if(updated.rowCount!==1||
      updated.rows[0]?.resolved!==true||
      updated.rows[0]?.old_cleanup_claim!=="false")
      throw Error("REFUSED:ADMIN_UPDATE_MUST_AFFECT_EXACTLY_INCIDENT30");
    const after=await client.query(
      "SELECT count(*)::int AS n FROM clean.adb_incident_stop WHERE resolved=false");
    if(Number(after.rows[0]?.n)!==0)
      throw Error("REFUSED:OTHER_UNRESOLVED_INCIDENTS_REMAIN");
    await client.query("COMMIT");tx=false;
    console.log(JSON.stringify({
      ...out,status:"ADMINISTRATIVELY_CONTAINED_HISTORICAL_CLEANUP_STILL_UNVERIFIED",
      database_mutations:1,incident_id:30,incident_resolved:true,
      historical_runtime_cleanup_proven:false,paid_yssy_authorized:false
    },null,2));
  }catch(e){
    if(tx)await client.query("ROLLBACK").catch(()=>undefined);
    console.error("P25_INCIDENT30_FAIL_CLOSED",
      String(e instanceof Error?e.message:e).slice(0,180));
    process.exitCode=2;
  }finally{
    client.release();
    await pool.end().catch(()=>undefined);
  }
}
main().catch(()=>{
  console.error("P25_INCIDENT30_ABORTED_NO_APPROVAL");
  process.exitCode=2;
});
