import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";

const PROBE_ID = 6;
const BUDGET = "P2G-S1-20260922-07";
const ICAO = "WSSS";
const STOP = "balance_read_failed_after_retries";
const TARGET_MS = 120 * 60_000;

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
function applyRequested(): boolean { return process.argv.includes("--apply"); }

async function main(): Promise<void> {
  const apply = applyRequested();

  const activeBillable = (await listSubscriptionsStrict()).filter(
    (s) => s.isActive && s.billingType !== "LifetimeBased",
  );
  if (activeBillable.length !== 0) {
    throw new Error(`P2G08_ADJUDICATION_REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${activeBillable.length}`);
  }

  const probeR = await pool.query(
    `SELECT probe_id,icao,stage,status,window_start,window_end,window_hours,
            duration_censored,stop_reason,reconciliation_status,runtime_session_id,
            runtime_cleanup_verified_at_utc,probe_budget_day_id
       FROM clean.adb_anchor_probe
      WHERE probe_id=$1 AND probe_budget_day_id=$2`,
    [PROBE_ID, BUDGET],
  );
  if (probeR.rowCount !== 1) throw new Error("P2G08_ADJUDICATION_REFUSED:PROBE_NOT_FOUND");
  const probe = probeR.rows[0];
  const elapsedMs = new Date(probe.window_end).getTime() - new Date(probe.window_start).getTime();
  if (
    Number(probe.stage) !== 1 ||
    String(probe.icao).toUpperCase() !== ICAO ||
    String(probe.status) !== "completed" ||
    probe.duration_censored !== true ||
    String(probe.stop_reason) !== STOP ||
    String(probe.reconciliation_status) !== "MATCH" ||
    probe.runtime_cleanup_verified_at_utc == null ||
    !Number.isFinite(elapsedMs) || elapsedMs <= 0 || elapsedMs >= TARGET_MS
  ) {
    throw new Error("P2G08_ADJUDICATION_REFUSED:FALSE_PASS_SHAPE_MISMATCH");
  }

  const budgetR = await pool.query(
    `SELECT state,cap_credits,closed_at
       FROM clean.adb_probe_budget_day
      WHERE probe_budget_day_id=$1`,
    [BUDGET],
  );
  if (budgetR.rowCount !== 1 || String(budgetR.rows[0].state) !== "OPEN" ||
      Number(budgetR.rows[0].cap_credits) !== 500 || budgetR.rows[0].closed_at != null) {
    throw new Error("P2G08_ADJUDICATION_REFUSED:BUDGET_NOT_EXPECTED_OPEN");
  }

  const stateR = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM clean.adb_anchor_probe WHERE status='probing') active_probes,
       (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime) runtime_sessions,
       (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime) runtime_deliveries,
       (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime) runtime_items,
       (SELECT count(*)::int FROM clean.provider_content_blob_ref
          WHERE source_kind='webhook'
            AND source_record_id LIKE $1
            AND deletion_verified_at_utc IS NULL) live_blobs,
       (SELECT count(*)::int FROM clean.adb_incident_stop WHERE resolved=false) open_incidents`,
    [`prepaid:${String(probe.runtime_session_id)}:%`],
  );
  const state = stateR.rows[0];
  for (const [key,value] of Object.entries(state)) {
    if (Number(value) !== 0) throw new Error(`P2G08_ADJUDICATION_REFUSED:${key.toUpperCase()}=${value}`);
  }

  const preview = {
    schema:"v39.phase2g-p2g08-censored-false-pass-adjudication.v1",
    mode: apply ? "APPLY" : "DRY_RUN",
    probe_id:PROBE_ID,
    icao:ICAO,
    probe_budget_day_id:BUDGET,
    historical_status_before:"completed",
    corrected_status:"failed",
    duration_censored:true,
    stop_reason:STOP,
    reconciliation_status_preserved:"MATCH",
    measured_duration_minutes:elapsedMs/60_000,
    runtime_cleanup_verified_at_utc:new Date(probe.runtime_cleanup_verified_at_utc).toISOString(),
    active_billable_subscriptions:0,
    open_incidents:0,
    provider_mutation:false,
    scientific_metrics_preserved:true,
  };

  if (!apply) {
    console.log(JSON.stringify({...preview,status:"READY_FOR_APPLY"},null,2));
    return;
  }

  const client=await pool.connect();
  let closedAt:string|null=null;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[BUDGET]);

    const updated=await client.query(
      `UPDATE clean.adb_anchor_probe
          SET status='failed'
        WHERE probe_id=$1
          AND probe_budget_day_id=$2
          AND status='completed'
          AND duration_censored=true
          AND stop_reason=$3
          AND reconciliation_status='MATCH'
        RETURNING probe_id`,
      [PROBE_ID,BUDGET,STOP],
    );
    if(updated.rowCount!==1) throw new Error("P2G08_ADJUDICATION_REFUSED:PROBE_UPDATE_RACE");

    const closed=await client.query(
      `UPDATE clean.adb_probe_budget_day
          SET state='CLOSED',closed_at=now()
        WHERE probe_budget_day_id=$1 AND state='OPEN'
        RETURNING closed_at`,
      [BUDGET],
    );
    if(closed.rowCount!==1) throw new Error("P2G08_ADJUDICATION_REFUSED:BUDGET_CLOSE_RACE");
    closedAt=new Date(closed.rows[0].closed_at).toISOString();

    await client.query("COMMIT");
  } catch(error) {
    await client.query("ROLLBACK").catch(()=>undefined);
    throw error;
  } finally {
    client.release();
  }

  const post=await pool.query(
    `SELECT status,duration_censored,stop_reason,reconciliation_status
       FROM clean.adb_anchor_probe WHERE probe_id=$1`,
    [PROBE_ID],
  );
  if(post.rowCount!==1 || String(post.rows[0].status)!=="failed" ||
     post.rows[0].duration_censored!==true ||
     String(post.rows[0].stop_reason)!==STOP ||
     String(post.rows[0].reconciliation_status)!=="MATCH") {
    throw new Error("P2G08_ADJUDICATION_POSTCHECK:PROBE_NOT_PRESERVED_AS_FAILED_MATCH");
  }

  const receipt={
    ...preview,
    mode:"APPLY",
    status:"P2G08_CENSORED_FALSE_PASS_ADJUDICATED",
    applied_at_utc:new Date().toISOString(),
    budget_state:"CLOSED",
    budget_closed_at_utc:closedAt,
    next:"Use only the frozen P2G08 balance-control-plane recovery amendment with a fresh runtime/budget/AUTH.",
  };
  fs.mkdirSync("artifacts",{recursive:true});
  const out=path.join("artifacts",`phase2g-p2g08-censored-adjudication-${Date.now()}.json`);
  fs.writeFileSync(out,JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({...receipt,receipt_file:out,receipt_file_sha256:sha256(fs.readFileSync(out))},null,2));
}

main().catch((error)=>{
  console.error(JSON.stringify({
    schema:"v39.phase2g-p2g08-censored-false-pass-adjudication.v1",
    status:"REFUSED_OR_FAILED",
    error:error instanceof Error?error.message:String(error),
  },null,2));
  process.exitCode=1;
}).finally(async()=>{ await pool.end().catch(()=>undefined); });
