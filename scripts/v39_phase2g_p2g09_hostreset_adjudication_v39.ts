import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";

const PROBE_ID = 7;
const BUDGET = "P2G-S1-20260922-08";
const ICAO = "WSSS";
const STOP = "supervisor_child_exit_recovered";

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
    throw new Error(`P2G09_ADJUDICATION_REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${activeBillable.length}`);
  }

  const probeR = await pool.query(
    `SELECT probe_id,icao,stage,status,window_start,window_end,duration_censored,
            stop_reason,reconciliation_status,runtime_session_id,
            runtime_cleanup_verified_at_utc,probe_budget_day_id,reserved_credits
       FROM clean.adb_anchor_probe
      WHERE probe_id=$1 AND probe_budget_day_id=$2`,
    [PROBE_ID, BUDGET],
  );
  if (probeR.rowCount !== 1) throw new Error("P2G09_ADJUDICATION_REFUSED:PROBE_NOT_FOUND");
  const probe = probeR.rows[0];

  if (
    Number(probe.stage) !== 1 ||
    String(probe.icao).toUpperCase() !== ICAO ||
    String(probe.status) !== "failed" ||
    probe.duration_censored !== true ||
    String(probe.stop_reason) !== STOP ||
    String(probe.reconciliation_status) !== "UNRESOLVED" ||
    probe.runtime_cleanup_verified_at_utc == null ||
    Number(probe.reserved_credits) !== 500
  ) {
    throw new Error("P2G09_ADJUDICATION_REFUSED:FAILED_HOSTRESET_SHAPE_MISMATCH");
  }

  const runtimeR = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM clean.adb_anchor_probe WHERE status='probing') active_probes,
       (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime
          WHERE owner_kind='anchor_probe' AND owner_probe_id=$1 AND stage=1) runtime_sessions,
       (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime
          WHERE session_id=$2::uuid) runtime_deliveries,
       (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime
          WHERE session_id=$2::uuid) runtime_items`,
    [PROBE_ID, String(probe.runtime_session_id)],
  );
  const runtime = runtimeR.rows[0];
  for (const [key, value] of Object.entries(runtime)) {
    if (Number(value) !== 0) throw new Error(`P2G09_ADJUDICATION_REFUSED:${key.toUpperCase()}=${value}`);
  }

  const budgetR = await pool.query(
    `SELECT state,cap_credits,closed_at
       FROM clean.adb_probe_budget_day
      WHERE probe_budget_day_id=$1`,
    [BUDGET],
  );
  if (budgetR.rowCount !== 1 || String(budgetR.rows[0].state) !== "OPEN" ||
      Number(budgetR.rows[0].cap_credits) !== 500 || budgetR.rows[0].closed_at != null) {
    throw new Error("P2G09_ADJUDICATION_REFUSED:BUDGET_NOT_EXPECTED_OPEN");
  }

  const incidentsR = await pool.query(
    `SELECT id,cause,occurred_at_utc,detail
       FROM clean.adb_incident_stop
      WHERE resolved=false
      ORDER BY id ASC`,
  );
  const matching = incidentsR.rows.filter((row: any) => {
    const detail = row.detail ?? {};
    return String(row.cause) === "reconciliation" &&
      String(detail.kind ?? "") === "stage1_supervisor_recovery" &&
      Number(detail.probeId) === PROBE_ID &&
      String(detail.budgetDayId ?? "") === BUDGET &&
      String(detail.reason ?? "") === STOP &&
      detail.providerDeleteAttempted === true &&
      detail.providerDeleteVerified === true &&
      detail.runtimeCleanupVerified === true;
  });

  if (matching.length !== 1 || incidentsR.rows.length !== 1) {
    throw new Error(
      `P2G09_ADJUDICATION_REFUSED:OPEN_INCIDENT_SET_UNEXPECTED:all=${incidentsR.rows.map((x:any)=>x.id).join(",")}:matching=${matching.map((x:any)=>x.id).join(",")}`,
    );
  }

  const incidentId = Number(matching[0].id);
  const preview = {
    schema: "v39.phase2g-p2g09-hostreset-adjudication.v1",
    mode: apply ? "APPLY" : "DRY_RUN",
    status_before: "failed",
    probe_id: PROBE_ID,
    icao: ICAO,
    probe_budget_day_id: BUDGET,
    duration_censored: true,
    stop_reason: STOP,
    reconciliation_status_preserved: "UNRESOLVED",
    runtime_cleanup_verified_at_utc: new Date(probe.runtime_cleanup_verified_at_utc).toISOString(),
    incident_id: incidentId,
    active_billable_subscriptions: 0,
    provider_mutation: false,
    failed_scientific_evidence_preserved: true,
  };

  if (!apply) {
    console.log(JSON.stringify({ ...preview, status: "READY_FOR_APPLY" }, null, 2));
    return;
  }

  const client = await pool.connect();
  let closedAt: string | null = null;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [BUDGET]);

    const lockedProbe = await client.query(
      `SELECT status,duration_censored,stop_reason,reconciliation_status,runtime_cleanup_verified_at_utc
         FROM clean.adb_anchor_probe
        WHERE probe_id=$1 AND probe_budget_day_id=$2
        FOR UPDATE`,
      [PROBE_ID, BUDGET],
    );
    if (lockedProbe.rowCount !== 1 ||
        String(lockedProbe.rows[0].status) !== "failed" ||
        lockedProbe.rows[0].duration_censored !== true ||
        String(lockedProbe.rows[0].stop_reason) !== STOP ||
        String(lockedProbe.rows[0].reconciliation_status) !== "UNRESOLVED" ||
        lockedProbe.rows[0].runtime_cleanup_verified_at_utc == null) {
      throw new Error("P2G09_ADJUDICATION_REFUSED:PROBE_STATE_CHANGED");
    }

    const resolved = await client.query(
      `UPDATE clean.adb_incident_stop
          SET resolved=true,resolved_at_utc=now()
        WHERE id=$1 AND resolved=false
        RETURNING id`,
      [incidentId],
    );
    if (resolved.rowCount !== 1) throw new Error("P2G09_ADJUDICATION_REFUSED:INCIDENT_RESOLVE_RACE");

    const closed = await client.query(
      `UPDATE clean.adb_probe_budget_day
          SET state='CLOSED',closed_at=now()
        WHERE probe_budget_day_id=$1 AND state='OPEN'
        RETURNING closed_at`,
      [BUDGET],
    );
    if (closed.rowCount !== 1) throw new Error("P2G09_ADJUDICATION_REFUSED:BUDGET_CLOSE_RACE");
    closedAt = new Date(closed.rows[0].closed_at).toISOString();

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  const post = await pool.query(
    `SELECT
       (SELECT status FROM clean.adb_anchor_probe WHERE probe_id=$1) probe_status,
       (SELECT duration_censored FROM clean.adb_anchor_probe WHERE probe_id=$1) duration_censored,
       (SELECT reconciliation_status FROM clean.adb_anchor_probe WHERE probe_id=$1) reconciliation_status,
       (SELECT state FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$2) budget_state,
       (SELECT count(*)::int FROM clean.adb_incident_stop WHERE resolved=false) open_incidents`,
    [PROBE_ID, BUDGET],
  );
  const x = post.rows[0];
  if (String(x.probe_status) !== "failed" || x.duration_censored !== true ||
      String(x.reconciliation_status) !== "UNRESOLVED" ||
      String(x.budget_state) !== "CLOSED" || Number(x.open_incidents) !== 0) {
    throw new Error("P2G09_ADJUDICATION_POSTCHECK_FAILED");
  }

  const receipt = {
    ...preview,
    mode: "APPLY",
    status: "P2G09_HOSTRESET_ADJUDICATED_AND_BUDGET_CLOSED",
    applied_at_utc: new Date().toISOString(),
    budget_state: "CLOSED",
    budget_closed_at_utc: closedAt,
    open_incidents_after: 0,
    next: "Do not reuse P2G09 AUTH or budget. Implement runtime hardening before any fresh paid Stage-1 authorization.",
  };
  fs.mkdirSync("artifacts", { recursive: true });
  const out = path.join("artifacts", `phase2g-p2g09-hostreset-adjudication-${Date.now()}.json`);
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({
    ...receipt,
    receipt_file: out,
    receipt_file_sha256: sha256(fs.readFileSync(out)),
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "v39.phase2g-p2g09-hostreset-adjudication.v1",
    status: "REFUSED_OR_FAILED",
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => undefined);
});
