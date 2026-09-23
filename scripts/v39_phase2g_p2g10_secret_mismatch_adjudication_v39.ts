import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";

const BUDGET_DAY = "P2G-S1-20260923-09";
const PROBE_ID = 8;
const SESSION_ID = "c7826b30-47ef-453a-86a6-dd853ce2a6f8";
const INCIDENT_DOC = "SEPmd/phase2g/incidents/2026-09-23_P2G10_GITHUB_REPLIT_WEBHOOK_SECRET_MISMATCH.md";

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function main(): Promise<void> {
  if (!fs.existsSync(INCIDENT_DOC)) throw new Error("P2G10_ADJUDICATION_REFUSED:INCIDENT_DOC_MISSING");
  const docRaw = fs.readFileSync(INCIDENT_DOC, "utf8");
  if (!docRaw.includes("GitHub/Replit Webhook Secret Mismatch") ||
      !docRaw.includes(BUDGET_DAY) ||
      !docRaw.includes("Probe: 8") ||
      !docRaw.includes(SESSION_ID)) {
    throw new Error("P2G10_ADJUDICATION_REFUSED:INCIDENT_DOC_BINDING_MISMATCH");
  }

  const activeBillable = (await listSubscriptionsStrict()).filter(
    (sub) => sub.isActive && sub.billingType !== "LifetimeBased",
  );
  if (activeBillable.length !== 0) {
    throw new Error(`P2G10_ADJUDICATION_REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${activeBillable.length}`);
  }

  const runtime = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1::uuid) AS sessions,
       (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1::uuid) AS deliveries,
       (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1::uuid) AS items,
       (SELECT count(*)::int FROM clean.provider_content_blob_ref
         WHERE source_kind='webhook' AND source_record_id LIKE $2
           AND deletion_verified_at_utc IS NULL) AS live_blobs`,
    [SESSION_ID, `prepaid:${SESSION_ID}:%`],
  );
  const rt = runtime.rows[0] ?? {};
  if (Number(rt.sessions) !== 0 || Number(rt.deliveries) !== 0 ||
      Number(rt.items) !== 0 || Number(rt.live_blobs) !== 0) {
    throw new Error(`P2G10_ADJUDICATION_REFUSED:RUNTIME_NOT_CLEAN:${JSON.stringify(rt)}`);
  }

  const client = await pool.connect();
  let incidentIds: number[] = [];
  let closedAt: string | null = null;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [BUDGET_DAY]);

    const probeR = await client.query(
      `SELECT probe_id,icao,stage,status,duration_censored,stop_reason,reconciliation_status,
              runtime_session_id,runtime_cleanup_verified_at_utc,reserved_credits,provider_content_safe_mode,
              probe_budget_day_id
         FROM clean.adb_anchor_probe
        WHERE probe_id=$1 AND probe_budget_day_id=$2
        FOR UPDATE`,
      [PROBE_ID, BUDGET_DAY],
    );
    if (probeR.rowCount !== 1) throw new Error("P2G10_ADJUDICATION_REFUSED:PROBE_NOT_FOUND");
    const probe = probeR.rows[0];
    if (
      String(probe.icao).toUpperCase() !== "WSSS" ||
      Number(probe.stage) !== 1 ||
      String(probe.status) !== "failed" ||
      probe.duration_censored !== true ||
      String(probe.reconciliation_status) !== "UNRESOLVED" ||
      String(probe.runtime_session_id ?? "").toLowerCase() !== SESSION_ID ||
      probe.runtime_cleanup_verified_at_utc == null ||
      Number(probe.reserved_credits) !== 500 ||
      probe.provider_content_safe_mode !== true ||
      !String(probe.stop_reason ?? "").startsWith("supervisor_child_exit")
    ) {
      throw new Error(`P2G10_ADJUDICATION_REFUSED:FAILED_PROBE_SHAPE:${JSON.stringify({
        icao: probe.icao,
        stage: probe.stage,
        status: probe.status,
        duration_censored: probe.duration_censored,
        stop_reason: probe.stop_reason,
        reconciliation_status: probe.reconciliation_status,
        runtime_session_id: probe.runtime_session_id,
        runtime_cleanup_verified_at_utc: probe.runtime_cleanup_verified_at_utc,
        reserved_credits: probe.reserved_credits,
        provider_content_safe_mode: probe.provider_content_safe_mode,
      })}`);
    }

    const competing = await client.query(
      `SELECT count(*)::int AS n FROM clean.adb_anchor_probe
        WHERE status IN ('probing','settling') AND probe_id<>$1`,
      [PROBE_ID],
    );
    if (Number(competing.rows[0]?.n ?? -1) !== 0) {
      throw new Error("P2G10_ADJUDICATION_REFUSED:OTHER_ACTIVE_OR_SETTLING_PROBE");
    }

    const budget = await client.query(
      `SELECT state,cap_credits,closed_at
         FROM clean.adb_probe_budget_day
        WHERE probe_budget_day_id=$1
        FOR UPDATE`,
      [BUDGET_DAY],
    );
    if (budget.rowCount !== 1 ||
        String(budget.rows[0].state) !== "OPEN" ||
        Number(budget.rows[0].cap_credits) !== 500 ||
        budget.rows[0].closed_at != null) {
      throw new Error("P2G10_ADJUDICATION_REFUSED:BUDGET_NOT_EXPECTED_OPEN");
    }

    const open = await client.query(
      `SELECT id,cause,detail FROM clean.adb_incident_stop
        WHERE resolved=false ORDER BY id ASC FOR UPDATE`,
    );
    const matching = open.rows.filter((row: any) => {
      const detail = row.detail ?? {};
      return String(row.cause) === "reconciliation" &&
        String(detail.kind ?? "") === "stage1_supervisor_recovery" &&
        Number(detail.probeId) === PROBE_ID &&
        String(detail.budgetDayId ?? "") === BUDGET_DAY &&
        detail.providerDeleteVerified === true;
    });
    if (matching.length !== 1 || matching.length !== open.rows.length) {
      throw new Error(
        `P2G10_ADJUDICATION_REFUSED:OPEN_INCIDENT_SET_NOT_EXACT:open=${open.rows.map((x: any) => x.id).join(",")}:matching=${matching.map((x: any) => x.id).join(",")}`,
      );
    }
    incidentIds = matching.map((row: any) => Number(row.id));

    const resolved = await client.query(
      `UPDATE clean.adb_incident_stop
          SET resolved=true,resolved_at_utc=now()
        WHERE resolved=false AND id=ANY($1::bigint[])
        RETURNING id`,
      [incidentIds],
    );
    if (resolved.rowCount !== incidentIds.length) {
      throw new Error("P2G10_ADJUDICATION_REFUSED:INCIDENT_RESOLUTION_RACE");
    }

    const closed = await client.query(
      `UPDATE clean.adb_probe_budget_day
          SET state='CLOSED',closed_at=now()
        WHERE probe_budget_day_id=$1 AND state='OPEN'
        RETURNING closed_at`,
      [BUDGET_DAY],
    );
    if (closed.rowCount !== 1) throw new Error("P2G10_ADJUDICATION_REFUSED:BUDGET_CLOSE_RACE");
    closedAt = new Date(closed.rows[0].closed_at).toISOString();

    const preserved = await client.query(
      `SELECT status,duration_censored,reconciliation_status
         FROM clean.adb_anchor_probe WHERE probe_id=$1`,
      [PROBE_ID],
    );
    if (preserved.rowCount !== 1 ||
        String(preserved.rows[0].status) !== "failed" ||
        preserved.rows[0].duration_censored !== true ||
        String(preserved.rows[0].reconciliation_status) !== "UNRESOLVED") {
      throw new Error("P2G10_ADJUDICATION_REFUSED:FAILED_EVIDENCE_NOT_PRESERVED");
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  const post = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM clean.adb_incident_stop WHERE resolved=false) AS open_incidents,
       (SELECT state FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$1) AS budget_state,
       (SELECT status FROM clean.adb_anchor_probe WHERE probe_id=$2) AS probe_status,
       (SELECT reconciliation_status FROM clean.adb_anchor_probe WHERE probe_id=$2) AS reconciliation_status`,
    [BUDGET_DAY, PROBE_ID],
  );
  const state = post.rows[0] ?? {};
  if (Number(state.open_incidents) !== 0 ||
      String(state.budget_state) !== "CLOSED" ||
      String(state.probe_status) !== "failed" ||
      String(state.reconciliation_status) !== "UNRESOLVED") {
    throw new Error(`P2G10_ADJUDICATION_POSTCHECK_FAILED:${JSON.stringify(state)}`);
  }

  const receipt = {
    schema: "v39.phase2g-p2g10-secret-mismatch-adjudication.v1",
    status: "P2G10_INFRASTRUCTURE_FAILURE_ADJUDICATED",
    applied_at_utc: new Date().toISOString(),
    probe_id: PROBE_ID,
    icao: "WSSS",
    runtime_session_id: SESSION_ID,
    probe_budget_day_id: BUDGET_DAY,
    failed_probe_preserved: true,
    reconciliation_status_preserved: "UNRESOLVED",
    incident_ids_resolved: incidentIds,
    budget_state: "CLOSED",
    budget_closed_at_utc: closedAt,
    active_billable_subscriptions: 0,
    transient_runtime_clean: true,
    incident_doc: INCIDENT_DOC,
    incident_doc_sha256: sha256(docRaw),
    provider_mutation_performed: false,
    alert_credits_spent_by_adjudicator: 0,
    next: "Freeze a fresh Thursday runtime/budget/AUTH only after the cross-environment webhook-secret gate passes on the exact Thursday source head.",
  };
  fs.mkdirSync("artifacts", { recursive: true });
  const out = path.join("artifacts", `phase2g-p2g10-secret-mismatch-adjudication-${Date.now()}.json`);
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  console.log(JSON.stringify({
    ...receipt,
    receipt_file: out,
    receipt_file_sha256: sha256(fs.readFileSync(out)),
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "v39.phase2g-p2g10-secret-mismatch-adjudication.v1",
    status: "P2G10_ADJUDICATION_REFUSED_OR_FAILED",
    error: error instanceof Error ? error.message : String(error),
    provider_mutation_performed: false,
    alert_credits_spent_by_adjudicator: 0,
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => undefined);
});
