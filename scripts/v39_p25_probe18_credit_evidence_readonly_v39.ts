/** P25 probe18 specific historical credit-evidence diagnosis. READ ONLY.
 * No subscription/API calls, no payments, no secret or raw webhook content.
 * Unknown is kept unknown; never converts null to zero or "closed".
 */
import {v39Pool as pool} from "../server/lib/disruption/db_v39.ts";
async function main(){
 const c=await pool.connect();let tx=false;
 try{
  await c.query("BEGIN TRANSACTION READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='10000ms'");
  const p=await c.query(`
    SELECT probe_id,icao,status,duration_censored,reconciliation_status,
      stop_reason,probe_budget_day_id,balance_before,balance_after,
      settlement_stable_balance,settlement_reads,credits_spent,
      internal_send_credits,reserved_credits,window_start,window_end
    FROM clean.adb_anchor_probe WHERE probe_id=18
  `);
  const b=await c.query(`
    SELECT probe_budget_day_id,state,cap_credits,created_at,closed_at
    FROM clean.adb_probe_budget_day
    WHERE probe_budget_day_id='P2G-S1-20261009-23'
  `);
  const cols=await c.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='clean' AND table_name='adb_probe_reconciliation_evidence'
    ORDER BY ordinal_position
  `);
  const names=cols.rows.map(x=>String(x.column_name));
  let evidenceRows:any[]=[];
  if(names.includes("probe_id")){
    const e=await c.query(`
      SELECT to_jsonb(x) AS evidence
      FROM clean.adb_probe_reconciliation_evidence x
      WHERE x.probe_id=18 LIMIT 10
    `);
    const keep=new Set([
      "probe_id","recorded_at","status","reconciliation_status",
      "external_credits_spent","internal_send_credits","credits_spent",
      "balance_before","balance_after","settlement_stable_balance",
      "settlement_reads","source_count","delivery_count","item_count",
      "cost_credits","costCredits","confirmed_count",
      "ambiguous_count","accounted_count"
    ]);
    evidenceRows=e.rows.map(x=>Object.fromEntries(
      Object.entries(x.evidence??{}).filter(([k])=>keep.has(k))
    ));
  }
  const q=p.rows[0]??{};
  const required=["balance_before","balance_after","settlement_stable_balance",
    "credits_spent","internal_send_credits"];
  const report={
    schema:"v39.p25.probe18-credit-evidence.readonly.v1",
    observed_at_utc:new Date().toISOString(),
    status:"FORENSIC_EVIDENCE_ONLY_NOT_SPEND_SETTLEMENT",
    budget:b.rows[0]??null,
    probe18:p.rows[0]??null,
    credit_columns_missing:required.filter(k=>q[k]==null),
    external_spend_derived_by_this_script:false,
    provider_balance_event_history_verified_by_this_script:false,
    reconciliation_table_columns:names,
    reconciliation_rows_redacted:evidenceRows,
    historical_failed_probe_reclassified:false,
    historical_budget_closure_authorized:false,
    paid_YSSY_go_authorized:false,
    provider_calls:0,provider_mutations:0,sql_mutations:0,
    alert_credits_spent:0
  };
  console.log(JSON.stringify(report,null,2));
  await c.query("ROLLBACK");tx=false;
 }catch(e){
   if(tx)await c.query("ROLLBACK").catch(()=>undefined);
   console.error("P25_HISTORICAL_CREDIT_EVIDENCE_QUERY_UNAVAILABLE",
     String(e instanceof Error?e.message:e).slice(0,170));
   process.exitCode=2;
 }finally{c.release();await pool.end().catch(()=>undefined)}
}
main().catch(()=>{console.error("P25_READONLY_CREDIT_AUDIT_HOLD");process.exitCode=2});
