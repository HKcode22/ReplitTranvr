/**
 * P25 historical P2G24 budgeting:
 * This does NOT recover actual Alert credit spend (unrecorded under prepaid
 * safe-mode). It can administratively quarantine *one exact* old OPEN day as
 * MISMATCH / unknown-science, based on the full 500-credit durable reserved
 * exposure. No paid provider subscription; no source or science mutation.
 *
 * Default is READ ONLY. A production SQL change requires an independent
 * explicit operator consent and '--apply'. This is a narrow REVIEW CANDIDATE,
 * not an override of the existing closeProbeBudgetDay() VERIFIED close.
 */
import {v39Pool as pool} from "../server/lib/disruption/db_v39.ts";
import {listSubscriptionsStrict} from "../server/lib/disruption/aerodataboxLimiter_v3.ts";

const DAY="P2G-S1-20261009-23";
const SESSION="6267293e-75a0-42a7-b977-89543f200ebc";
const APPLY=process.argv.includes("--apply");
const REQUIRED="I_APPROVE_QUARANTINE_EXACT_FAILED_P2G24_BUDGET_AS_MISMATCH_NOT_RECONCILED";
if(process.argv.slice(2).some(x=>x!=="--apply"))
 throw Error("REFUSED:UNKNOWN_QUARANTINE_ARGS");
if(APPLY&&process.env.P25_EXACT_OLD_BUDGET_QUARANTINE_CONSENT!==REQUIRED)
 throw Error("REFUSED:EXPLICIT_MISMATCH_QUARANTINE_CONSENT_REQUIRED");

async function main(){
 const activeSubscriptions=await listSubscriptionsStrict();
 if(!Array.isArray(activeSubscriptions))throw Error("REFUSED:PROVIDER_LIST_UNAVAILABLE");
 const active=activeSubscriptions.filter(x=>x.isActive&&x.billingType!=="LifetimeBased");
 const client=await pool.connect();let begun=false;
 try{
  await client.query(APPLY?"BEGIN":"BEGIN TRANSACTION READ ONLY");begun=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  await client.query("SET LOCAL lock_timeout='3000ms'");
  if(APPLY){
   const lock=await client.query("SELECT pg_try_advisory_xact_lock(943025,30) AS locked");
   if(lock.rows[0]?.locked!==true)throw Error("REFUSED:BUDGET_ADMIN_LOCK_UNAVAILABLE");
  }
  const day=(await client.query(`
   SELECT probe_budget_day_id,state,cap_credits,closed_at
   FROM clean.adb_probe_budget_day
   WHERE probe_budget_day_id=$1 ${APPLY?"FOR UPDATE":""}
  `,[DAY])).rows;
  const probes=(await client.query(`
   SELECT probe_id,icao,status,duration_censored,reconciliation_status,
      stop_reason,runtime_session_id,provider_content_safe_mode,
      reserved_credits,credits_spent,internal_send_credits
   FROM clean.adb_anchor_probe WHERE probe_budget_day_id=$1
  `,[DAY])).rows;
  const totals=(await client.query(`
   SELECT
    (SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN') AS open_days,
    (SELECT count(*)::int FROM clean.adb_incident_stop WHERE resolved=false) AS open_incidents,
    (SELECT count(*)::int FROM clean.adb_anchor_probe WHERE status IN ('probing','settling')) AS active_probes,
    (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime) AS active_sessions,
    (SELECT count(*)::int FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook' AND source_record_id LIKE $1) AS original_refs,
    (SELECT count(*)::int FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook' AND source_record_id LIKE $1 AND deletion_verified_at_utc IS NULL) AS retained_refs
  `,[`prepaid:${SESSION}:%`])).rows[0];
  const oldIncident=(await client.query(`
   SELECT id,resolved,cause,detail->>'runtimeCleanupVerified' AS cleanup_proven
   FROM clean.adb_incident_stop WHERE id=30
  `)).rows;
  const d=day[0],p=probes[0],i=oldIncident[0];
  const eligible=day.length===1&&d.probe_budget_day_id===DAY&&
    d.state==="OPEN"&&d.closed_at==null&&Number(d.cap_credits)===500&&
    probes.length===1&&p.probe_id===18&&p.icao==="YSSY"&&
    p.status==="failed"&&p.duration_censored===true&&
    p.reconciliation_status==="UNRESOLVED"&&
    p.stop_reason==="supervisor_child_exit_recovered"&&
    String(p.runtime_session_id)===SESSION&&
    p.provider_content_safe_mode===true&&Number(p.reserved_credits)===500&&
    p.credits_spent==null&&p.internal_send_credits==null&&
    oldIncident.length===1&&String(i.id)==="30"&&i.resolved===true&&
    i.cause==="reconciliation"&&i.cleanup_proven==="false"&&
    Number(totals.open_days)===1&&Number(totals.open_incidents)===0&&
    Number(totals.active_probes)===0&&Number(totals.active_sessions)===0&&
    Number(totals.original_refs)===30&&Number(totals.retained_refs)===30&&
    active.length===0;
  const report={
   schema:"v39.p25.historical-prepaid-safemode-budget-uncertainty.v1",
   status:eligible?"ELIGIBLE_ONLY_FOR_HISTORICAL_MISMATCH_QUARANTINE":"HOLD_NOT_ELIGIBLE",
   mode:APPLY?"EXPLICIT_ADMIN_APPLY":"READ_ONLY_PREVIEW",
   old_budget_day:DAY,old_budget_state:d?.state??null,
   old_failed_probe_id:p?.probe_id??null,
   old_science_status:p?.status??null,
   old_reconciliation_status:p?.reconciliation_status??null,
   prepaid_safe_mode:p?.provider_content_safe_mode===true,
   conservative_reserved_exposure:Number(p?.reserved_credits??-1),
   actual_provider_credit_spend_verified:false,
   historical_credit_totals_left_null:true,
   incident30_administratively_contained:i?.resolved===true,
   historical_runtime_cleanup_proven:false,
   source_references_retained:Number(totals.retained_refs),
   active_billable_subscriptions:active.length,
   new_paid_stage1_authorized:false,paid_provider_calls:0,
   alert_credits_spent:0
  };
  if(!eligible){
    console.log(JSON.stringify(report,null,2));
    await client.query("ROLLBACK");begun=false;process.exitCode=2;return;
  }
  if(!APPLY){
    console.log(JSON.stringify(report,null,2));
    await client.query("ROLLBACK");begun=false;return;
  }
  // MISMATCH is *not* CLOSED, MATCH, or credit-reconciled.
  // This admin-only quarantine makes the old OPEN reservation terminal,
  // without inventing exact external/internal credits.
  const changed=await client.query(`
   UPDATE clean.adb_probe_budget_day
      SET state='MISMATCH',closed_at=clock_timestamp()
    WHERE probe_budget_day_id=$1 AND state='OPEN' AND cap_credits=500
      AND closed_at IS NULL
    RETURNING probe_budget_day_id,state,closed_at
  `,[DAY]);
  if(changed.rowCount!==1||changed.rows[0].state!=="MISMATCH")
    throw Error("REFUSED:BUDGET_QUARANTINE_COMPARE_AND_SET_FAILED");
  const after=await client.query(`
   SELECT
    (SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN') AS open_days,
    (SELECT count(*)::int FROM clean.adb_anchor_probe WHERE probe_id=18
      AND status='failed' AND reconciliation_status='UNRESOLVED'
      AND duration_censored=true AND credits_spent IS NULL
      AND internal_send_credits IS NULL) AS original_science_preserved
  `);
  if(Number(after.rows[0]?.open_days)!==0||
     Number(after.rows[0]?.original_science_preserved)!==1)
    throw Error("REFUSED:POST_QUARANTINE_HISTORY_OR_OPEN_DAY_CHANGED");
  await client.query("COMMIT");begun=false;
  console.log(JSON.stringify({
    ...report,status:"HISTORICAL_BUDGET_QUARANTINED_MISMATCH_SPEND_UNKNOWN",
    old_budget_state:"MISMATCH",historical_credit_totals_left_null:true,
    old_reconciliation_status:"UNRESOLVED",
    database_mutations:1,new_paid_stage1_authorized:false
  },null,2));
 }catch(e){
  if(begun)await client.query("ROLLBACK").catch(()=>undefined);
  console.error("P25_OLD_BUDGET_QUARANTINE_ABORTED",
    String(e instanceof Error?e.message:e).slice(0,180));
  process.exitCode=2;
 }finally{client.release();await pool.end().catch(()=>undefined)}
}
main().catch(()=>{console.error("P25_QUARANTINE_CONNECTIVITY_HOLD");process.exitCode=2});
