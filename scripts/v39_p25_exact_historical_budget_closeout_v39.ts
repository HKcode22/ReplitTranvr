/**
 * Old YSSY P2G24 probe18: exact, bounded historical budget-day
 * administrative closeout. READ ONLY by default; --apply requires an
 * independently approved operator consent and uses EXISTING
 * closeProbeBudgetDay() protocol guard. Never changes scientific probe,
 * incident evidence or source blobs, nor creates provider subscriptions.
 */
import {v39Pool as pool} from "../server/lib/disruption/db_v39.ts";
import {listSubscriptionsStrict} from "../server/lib/disruption/aerodataboxLimiter_v3.ts";
import {closeProbeBudgetDay} from "../server/lib/disruption/probeExecution_v39.ts";
const BUDGET="P2G-S1-20261009-23";
const SESSION="6267293e-75a0-42a7-b977-89543f200ebc";
const APPLY=process.argv.includes("--apply");
const PHRASE="I_APPROVE_ONLY_EXACT_OLD_YSSY_BUDGET_ADMIN_CLOSE_PRESERVING_FAILED_PROBE18";
if(process.argv.slice(2).some(x=>x!=="--apply"))throw Error("REFUSED:UNEXPECTED_ARGS");
if(APPLY&&process.env.P25_BUDGET_CLOSE_CONSENT!==PHRASE)
 throw Error("REFUSED:EXACT_BUDGET_CONSENT_REQUIRED");
async function main(){
 const inventory=await listSubscriptionsStrict();
 if(!Array.isArray(inventory))throw Error("REFUSED:ACCOUNT_INVENTORY_FAILED");
 const active=inventory.filter(x=>x.isActive&&x.billingType!=="LifetimeBased");
 const c=await pool.connect();let tx=false;
 try{
  await c.query("BEGIN TRANSACTION READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const budget=(await c.query(`
   SELECT probe_budget_day_id,state,cap_credits,closed_at
   FROM clean.adb_probe_budget_day
   WHERE probe_budget_day_id=$1`,[BUDGET])).rows;
  const probes=(await c.query(`
   SELECT probe_id,icao,status,reconciliation_status,
     duration_censored,stop_reason,runtime_session_id,
     credits_spent::text AS spent_exact,
     internal_send_credits::text AS internal_exact
   FROM clean.adb_anchor_probe
   WHERE probe_budget_day_id=$1`,[BUDGET])).rows;
  const incidents=(await c.query(`
   SELECT id,cause,resolved,detail->>'runtimeCleanupVerified' AS old_cleanup
   FROM clean.adb_incident_stop WHERE id=30`)).rows;
  const totals=(await c.query(`
   SELECT
    (SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN')
      AS open_budgets,
    (SELECT count(*)::int FROM clean.adb_incident_stop WHERE resolved=false)
      AS unresolved_incidents,
    (SELECT count(*)::int FROM clean.adb_anchor_probe
     WHERE status IN ('probing','settling')) AS active_probes,
    (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime)
      AS runtime_sessions,
    (SELECT count(*)::int FROM clean.provider_content_blob_ref
     WHERE source_kind='webhook' AND
       source_record_id LIKE $1
       AND deletion_verified_at_utc IS NULL) AS preserved_old_refs
   `,[`prepaid:${SESSION}:%`])).rows[0];
  const b=budget[0],p=probes[0],i=incidents[0];
  const spent=String(p?.spent_exact??""),local=String(p?.internal_exact??"");
  const exactInteger=(s:string)=>/^(?:0|[1-9][0-9]*)(?:\.0+)?$/.test(s)&&
     Number.isSafeInteger(Number(s));
  const exposure=exactInteger(spent)&&exactInteger(local)
      ?Math.max(Number(spent),Number(local)):null;
  const eligible=budget.length===1&&b.probe_budget_day_id===BUDGET&&
    b.state==="OPEN"&&Number(b.cap_credits)===500&&b.closed_at==null&&
    probes.length===1&&p.probe_id===18&&p.icao==="YSSY"&&
    p.status==="failed"&&p.reconciliation_status==="UNRESOLVED"&&
    p.duration_censored===true&&p.stop_reason==="supervisor_child_exit_recovered"&&
    String(p.runtime_session_id)===SESSION&&exposure!==null&&exposure<=500&&
    incidents.length===1&&i.id===30&&i.cause==="reconciliation"&&
    i.resolved===true&&i.old_cleanup==="false"&&
    Number(totals.open_budgets)===1&&
    Number(totals.unresolved_incidents)===0&&
    Number(totals.active_probes)===0&&
    Number(totals.runtime_sessions)===0&&
    Number(totals.preserved_old_refs)===30&&active.length===0;
  const report={
    schema:"v39.p25.historical-budget-admin-closeout.v1",
    mode:APPLY?"EXPLICIT_ADMIN_APPLY":"READ_ONLY_PREVIEW",
    status:eligible?"ELIGIBLE_EXACT_HISTORICAL_BUDGET_CONTAINMENT":
      "HOLD_EVIDENCE_OR_INCIDENT_NOT_READY",
    budget_day_id:BUDGET,
    expected_probe_id:18,
    old_budget_state:b?.state??null,
    failed_probe_spend_recorded:exactInteger(spent),
    failed_probe_internal_recorded:exactInteger(local),
    old_local_spent_exact:spent||null,
    old_local_received_exact:local||null,
    max_budget_exposure:exposure,
    old_science_reconciliation_preserved:"UNRESOLVED",
    incident30_admin_resolved:i?.resolved===true,
    old_runtime_cleanup_verified:false,
    active_billable_subscriptions:active.length,
    historical_original_refs_retained:Number(totals.preserved_old_refs),
    provider_paid_calls:0,alert_credits_spent:0,
    paid_stage1_authorized:false
  };
  await c.query("ROLLBACK");tx=false;c.release();
  if(!eligible){
    console.log(JSON.stringify(report,null,2));process.exitCode=2;
    await pool.end().catch(()=>undefined);return;
  }
  if(!APPLY){
    console.log(JSON.stringify(report,null,2));
    await pool.end().catch(()=>undefined);return;
  }
  // EXISTING production helper rejects other open incidents, active
  // probes, unknown spent credits and cap excess. It only updates exact
  // budget ID, and it must return an exact CLOSED record here.
  await closeProbeBudgetDay(BUDGET);
  const checked=await pool.query(
   "SELECT state,closed_at FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$1",[BUDGET]);
  if(checked.rows.length!==1||checked.rows[0].state!=="CLOSED"||
     checked.rows[0].closed_at==null)
    throw Error("HOLD_POST_ADMIN_BUDGET_CLOSE_VERIFICATION_FAILED");
  console.log(JSON.stringify({
    ...report,status:"EXACT_HISTORICAL_BUDGET_ADMIN_CLOSED_SCIENCE_UNRESOLVED",
    old_budget_state:"CLOSED",sql_mutations:1,
    old_science_reconciliation_preserved:"UNRESOLVED",
    paid_stage1_authorized:false
  },null,2));
  await pool.end().catch(()=>undefined);
 }catch(e){
   if(tx){await c.query("ROLLBACK").catch(()=>undefined);c.release();}
   console.error("P25_EXACT_BUDGET_ADMIN_FAIL_CLOSED",
       String(e instanceof Error?e.message:e).slice(0,160));
   process.exitCode=2;
   await pool.end().catch(()=>undefined);
 }
}
main().catch(e=>{
 console.error("P25_BUDGET_READONLY_OR_APPROVAL_REFUSED",
   String(e instanceof Error?e.message:e).slice(0,180));
 process.exitCode=2;
});
