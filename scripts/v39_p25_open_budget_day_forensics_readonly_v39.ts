/**
 * Production READ ONLY: identify the exact single stale OPEN budget day.
 * Never infer cleanup from missing UNLOGGED state; never close a budget.
 * Redacted evidence only. No provider calls; no DB writes.
 */
import {v39Pool as pool} from "../server/lib/disruption/db_v39.ts";
async function main(){
 const c=await pool.connect();let started=false;
 try{
  await c.query("BEGIN TRANSACTION READ ONLY");started=true;
  await c.query("SET LOCAL statement_timeout='15000ms'");
  const b=await c.query(`
    SELECT probe_budget_day_id,state,cap_credits,
           created_at,closed_at,
           to_jsonb(b) AS original_record
    FROM clean.adb_probe_budget_day b
    WHERE state='OPEN'
    ORDER BY created_at
    LIMIT 5`);
  const a=[];
  for(const row of b.rows){
   const id=String(row.probe_budget_day_id);
   const related=await c.query(`
    SELECT probe_id,icao,status,duration_censored,
           reconciliation_status,stop_reason,
           credits_spent::text AS credits_spent_exact,
           internal_send_credits::text AS internal_credits_exact,
           reserved_credits::text AS reserved_credits_exact,
           runtime_session_id
      FROM clean.adb_anchor_probe
      WHERE probe_budget_day_id=$1
      ORDER BY probe_id`,[id]);
   a.push({
    budget_day_id:id,
    state:row.state,
    cap_credits:Number(row.cap_credits),
    created_at_utc:row.created_at,
    closed_at_utc:row.closed_at,
    // list only non-sensitive field names, not any hidden json values
    record_keys:Object.keys(row.original_record??{}).sort(),
    related_probe_count:related.rows.length,
    failed_probes_missing_spend:related.rows.filter(p=>
      p.status==="failed"&&(p.credits_spent_exact==null||
        p.internal_credits_exact==null)).length,
    related_probes:related.rows.map(p=>({
     probe_id:p.probe_id,icao:p.icao,status:p.status,
     duration_censored:p.duration_censored,
     reconciliation_status:p.reconciliation_status,
     stop_reason:p.stop_reason,
     credits_spent_exact:p.credits_spent_exact,
     internal_credits_exact:p.internal_credits_exact,
     reserved_credits_exact:p.reserved_credits_exact,
     has_runtime_session_id:p.runtime_session_id!=null
    }))
   });
  }
  const counts=await c.query(`
    SELECT
      (SELECT count(*)::int FROM clean.adb_probe_budget_day
        WHERE state='OPEN') AS open_budget_days,
      (SELECT count(*)::int FROM clean.adb_anchor_probe
        WHERE status IN ('probing','settling')) AS active_or_settling_probes,
      (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime)
        AS runtime_sessions,
      (SELECT count(*)::int FROM clean.adb_incident_stop
        WHERE resolved=false) AS open_incidents
  `);
  console.log(JSON.stringify({
    schema:"v39.p25.open-budget-day.readonly.v1",
    status:"INSPECT_ONLY_NO_BUDGET_OR_INCIDENT_MUTATION",
    observed_at_utc:new Date().toISOString(),
    ...counts.rows[0],
    open_budget_records:a,
    no_active_probe_does_not_prove_budget_reconciliation:true,
    provider_inventory_checked_by_this_script:false,
    budget_closure_authorized_by_this_script:false,
    incident30_closure_authorized_by_this_script:false,
    paid_yssy_go_authorized:false,
    provider_calls:0,sql_mutations:0,storage_reads:0,alert_credits_spent:0
  },null,2));
  await c.query("ROLLBACK");started=false;
 }catch(e){
  if(started)await c.query("ROLLBACK").catch(()=>undefined);
  console.error("HOLD_BUDGET_FORENSICS_UNAVAILABLE",String(e instanceof Error?e.message:e).slice(0,180));
  process.exitCode=2;
 }finally{c.release();await pool.end().catch(()=>undefined)}
}
main().catch(()=>{console.error("HOLD_P25_BUDGET_READONLY_CONNECTION");process.exitCode=2});
