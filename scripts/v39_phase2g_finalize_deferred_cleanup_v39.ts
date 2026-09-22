import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";
import { cleanupPrepaidProbeSessionLocalV39 } from "../server/lib/disruption/prepaidProbeRuntime_v39";
import { prepaidSafeBudgetExposureV39 } from "../server/lib/disruption/probeExecutionPrepaid_v39";
import { PROBE_BUDGET_DAY_HARD_CAP } from "../server/lib/disruption/probeExecution_v39";

function required(name:string):string {
  const i=process.argv.indexOf(name);
  const v=i>=0?String(process.argv[i+1]??"").trim():"";
  if(!v) throw new Error(`MISSING:${name}`);
  return v;
}
function has(name:string):boolean { return process.argv.includes(name); }
function sha256(raw:Buffer|string):string { return createHash("sha256").update(raw).digest("hex"); }

async function main():Promise<void> {
  const budgetDay=required("--probe-budget-day-id");
  const expectedIcao=required("--expected-icao").toUpperCase();
  const apply=has("--apply");
  if(!/^[A-Z0-9]{4}$/.test(expectedIcao)) throw new Error("REFUSED:EXPECTED_ICAO_INVALID");

  const subs=await listSubscriptionsStrict();
  const active=subs.filter((s)=>s.isActive && s.billingType!=="LifetimeBased");
  if(active.length!==0) throw new Error(`REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${active.length}`);

  const rows=await pool.query(
    `SELECT probe_id,icao,status,runtime_session_id,duration_censored,stop_reason,
            reconciliation_status,runtime_cleanup_verified_at_utc,provider_content_safe_mode
       FROM clean.adb_anchor_probe
      WHERE stage=1 AND probe_budget_day_id=$1
      ORDER BY recorded_at ASC`,
    [budgetDay],
  );
  if(rows.rowCount!==1) throw new Error(`REFUSED:EXPECTED_ONE_PROBE_ROW:actual=${rows.rowCount}`);
  const probe=rows.rows[0];
  if(String(probe.icao).toUpperCase()!==expectedIcao) throw new Error("REFUSED:ICAO_MISMATCH");
  if(probe.provider_content_safe_mode!==true) throw new Error("REFUSED:NOT_PROVIDER_CONTENT_SAFE_MODE");
  if(!probe.runtime_session_id) throw new Error("REFUSED:RUNTIME_SESSION_ID_MISSING");
  if(probe.runtime_cleanup_verified_at_utc!=null) {
    console.log(JSON.stringify({
      schema:"v39.phase2g-deferred-cleanup-finalizer.v1",
      status:"PASS_ALREADY_CLEANED",
      probe_id:Number(probe.probe_id),
      probe_status:String(probe.status),
      runtime_cleanup_verified_at_utc:new Date(probe.runtime_cleanup_verified_at_utc).toISOString(),
      provider_mutation:false,
      alert_credits_spent:0,
    },null,2));
    return;
  }

  const probeId=Number(probe.probe_id);
  const sessionId=String(probe.runtime_session_id).toLowerCase();
  const status=String(probe.status);
  if(!["settling","failed"].includes(status)) throw new Error(`REFUSED:PROBE_STATUS_NOT_CLEANUP_PENDING:${status}`);

  const evidence=await pool.query(
    `SELECT evidence_status,external_spend_credits,internal_received_credits,
            delivery_gap_credits,delivery_completeness,duration_censored,stop_reason,
            window_start_utc,window_end_utc
       FROM clean.adb_probe_reconciliation_evidence
      WHERE probe_id=$1`,
    [probeId],
  );
  if(evidence.rowCount!==1) throw new Error("REFUSED:RECONCILIATION_EVIDENCE_MISSING");
  const ev=evidence.rows[0];

  if(status==="settling") {
    if(String(probe.reconciliation_status)!=="MATCH" ||
       String(ev.evidence_status)!=="MATCH" ||
       probe.duration_censored===true ||
       ev.duration_censored===true ||
       probe.stop_reason!=null ||
       ev.stop_reason!=null) {
      throw new Error("REFUSED:SETTLING_PROBE_NOT_EXACT_FULL_DURATION_MATCH");
    }
  }

  const counts=await pool.query(
    `SELECT
       (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1::uuid) AS sessions,
       (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1::uuid) AS deliveries,
       (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1::uuid) AS items,
       (SELECT count(*)::int FROM clean.provider_content_blob_ref
          WHERE source_kind='webhook' AND source_record_id LIKE $2 AND deletion_verified_at_utc IS NULL) AS live_blobs`,
    [sessionId,`prepaid:${sessionId}:%`],
  );
  const before=counts.rows[0];

  const preview={
    schema:"v39.phase2g-deferred-cleanup-finalizer.v1",
    mode:apply?"APPLY":"DRY_RUN",
    status:"READY_FOR_EXACT_SESSION_CLEANUP",
    probe_id:probeId,
    icao:expectedIcao,
    probe_status_before:status,
    probe_budget_day_id:budgetDay,
    session_id:sessionId,
    reconciliation_status:String(probe.reconciliation_status),
    provider_active_billable:0,
    before_cleanup:before,
    provider_mutation:false,
    subscription_mutation:false,
    alert_credits_spent:0,
  };
  if(!apply){
    console.log(JSON.stringify(preview,null,2));
    return;
  }

  const deletionRunId=`phase2g-deferred-finalize-${probeId}-${new Date().toISOString().replace(/[-:.]/g,"")}-${randomUUID().slice(0,8)}`;
  const cleaned=await cleanupPrepaidProbeSessionLocalV39(sessionId,deletionRunId);

  let finalStatus=status;
  let budgetState:string|null=null;
  if(status==="settling"){
    const client=await pool.connect();
    try{
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[budgetDay]);
      const completed=await client.query(
        `UPDATE clean.adb_anchor_probe
            SET status='completed',runtime_cleanup_verified_at_utc=$2::timestamptz
          WHERE probe_id=$1
            AND status='settling'
            AND reconciliation_status='MATCH'
            AND duration_censored=false
            AND stop_reason IS NULL
            AND runtime_cleanup_verified_at_utc IS NULL
          RETURNING probe_id`,
        [probeId,cleaned.verifiedAtUtc],
      );
      if(completed.rowCount!==1) throw new Error("REFUSED:SETTLING_TO_COMPLETED_RACE_OR_SHAPE_CHANGE");

      const failures=await client.query(
        `SELECT count(*)::int n FROM clean.adb_anchor_probe
          WHERE probe_budget_day_id=$1 AND status IN ('probing','settling','failed','abandoned')`,
        [budgetDay],
      );
      if(Number(failures.rows[0]?.n??-1)!==0) throw new Error("REFUSED:BUDGET_HAS_NONCOMPLETED_PROBE_AFTER_FINALIZE");

      const exposure=await prepaidSafeBudgetExposureV39(budgetDay);
      if(!Number.isFinite(exposure)||exposure<0||exposure>PROBE_BUDGET_DAY_HARD_CAP) {
        throw new Error(`REFUSED:BUDGET_EXPOSURE_INVALID:${exposure}`);
      }
      const budget=await client.query(
        `UPDATE clean.adb_probe_budget_day
            SET state='CLOSED',closed_at=COALESCE(closed_at,now())
          WHERE probe_budget_day_id=$1 AND state='OPEN'
          RETURNING state`,
        [budgetDay],
      );
      if(budget.rowCount!==1) throw new Error("REFUSED:BUDGET_CLOSE_RACE_OR_NOT_OPEN");
      budgetState=String(budget.rows[0].state);
      await client.query("COMMIT");
      finalStatus="completed";
    }catch(error){
      await client.query("ROLLBACK").catch(()=>undefined);
      throw error;
    }finally{
      client.release();
    }
  }else{
    const updated=await pool.query(
      `UPDATE clean.adb_anchor_probe
          SET runtime_cleanup_verified_at_utc=$2::timestamptz
        WHERE probe_id=$1 AND status='failed' AND runtime_cleanup_verified_at_utc IS NULL
        RETURNING probe_id`,
      [probeId,cleaned.verifiedAtUtc],
    );
    if(updated.rowCount!==1) throw new Error("REFUSED:FAILED_CLEANUP_TIMESTAMP_UPDATE_RACE");
  }

  const after=await pool.query(
    `SELECT
       (SELECT status FROM clean.adb_anchor_probe WHERE probe_id=$1) AS probe_status,
       (SELECT runtime_cleanup_verified_at_utc FROM clean.adb_anchor_probe WHERE probe_id=$1) AS cleanup_verified,
       (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$2::uuid) AS sessions,
       (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$2::uuid) AS deliveries,
       (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$2::uuid) AS items,
       (SELECT count(*)::int FROM clean.provider_content_blob_ref
          WHERE source_kind='webhook' AND source_record_id LIKE $3 AND deletion_verified_at_utc IS NULL) AS live_blobs,
       (SELECT state FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$4) AS budget_state`,
    [probeId,sessionId,`prepaid:${sessionId}:%`,budgetDay],
  );
  const a=after.rows[0];
  if(Number(a.sessions)||Number(a.deliveries)||Number(a.items)||Number(a.live_blobs)) {
    throw new Error(`REFUSED:POST_CLEANUP_RUNTIME_NOT_ZERO:${JSON.stringify(a)}`);
  }
  if(String(a.probe_status)!==finalStatus || a.cleanup_verified==null) {
    throw new Error("REFUSED:POST_CLEANUP_PROBE_STATE_INVALID");
  }
  if(finalStatus==="completed" && String(a.budget_state)!=="CLOSED") {
    throw new Error("REFUSED:SUCCESS_BUDGET_NOT_CLOSED");
  }

  const receipt={
    ...preview,
    mode:"APPLY",
    status:finalStatus==="completed"
      ?"PASS_COMPLETED_AFTER_DEFERRED_CLEANUP"
      :"PASS_FAILED_PROBE_CLEANUP_VERIFIED_REQUIRES_ADJUDICATION",
    deletion_run_id:deletionRunId,
    cleanup:{
      deleted_blobs:cleaned.deletedBlobs,
      deleted_runtime_rows:cleaned.deletedRuntimeRows,
      verified_at_utc:cleaned.verifiedAtUtc,
    },
    probe_status_after:finalStatus,
    budget_state_after:a.budget_state,
    after_cleanup:a,
  };
  fs.mkdirSync("artifacts",{recursive:true});
  const out=path.join("artifacts",`phase2g-deferred-cleanup-finalizer-${probeId}-${Date.now()}.json`);
  const raw=JSON.stringify(receipt,null,2)+"\n";
  fs.writeFileSync(out,raw,{flag:"wx"});
  console.log(JSON.stringify({...receipt,receipt_file:out,receipt_sha256:sha256(raw)},null,2));
}

main().catch((error)=>{
  console.error(JSON.stringify({
    schema:"v39.phase2g-deferred-cleanup-finalizer.v1",
    status:"REFUSED_OR_FAILED",
    provider_mutation:false,
    subscription_mutation:false,
    alert_credits_spent:0,
    error:error instanceof Error?error.message:String(error),
  },null,2));
  process.exitCode=1;
}).finally(async()=>{await pool.end().catch(()=>undefined);});
