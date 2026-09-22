import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";

const PROBE_ID = 5;
const BUDGET_DAY = "P2G-S1-20260922-06";
const SESSION_ID = "9e55fa14-f156-4b5b-91b7-675b064b8d15";
const TARGET_MS = 120 * 60_000;

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`P2G07_ADJUDICATION_REFUSED:MISSING:${name}`);
  return value;
}
function has(name: string): boolean { return process.argv.includes(name); }
function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function main(): Promise<void> {
  const reconPath = path.resolve(required("--reconstruction"));
  const reconExpectedSha = required("--reconstruction-sha").toLowerCase();
  const cleanupPath = path.resolve(required("--cleanup-evidence"));
  const cleanupExpectedSha = required("--cleanup-sha").toLowerCase();
  const apply = has("--apply");

  if (!/^[a-f0-9]{64}$/.test(reconExpectedSha) || !/^[a-f0-9]{64}$/.test(cleanupExpectedSha)) {
    throw new Error("P2G07_ADJUDICATION_REFUSED:SHA_INVALID");
  }
  const reconRaw = fs.readFileSync(reconPath, "utf8");
  const cleanupRaw = fs.readFileSync(cleanupPath, "utf8");
  if (sha256(reconRaw) !== reconExpectedSha) throw new Error("P2G07_ADJUDICATION_REFUSED:RECONSTRUCTION_SHA_MISMATCH");
  if (sha256(cleanupRaw) !== cleanupExpectedSha) throw new Error("P2G07_ADJUDICATION_REFUSED:CLEANUP_SHA_MISMATCH");

  const recon = JSON.parse(reconRaw);
  const cleanup = JSON.parse(cleanupRaw);
  if (
    recon.schema !== "v39.phase2g-prepaid-session-reconstruction.v1" ||
    String(recon.sessionId ?? "").toLowerCase() !== SESSION_ID ||
    Number(recon.metadataRefs) !== 12 ||
    Number(recon.liveRefs) !== 12 ||
    Number(recon.payloadsReconstructed) !== 12 ||
    Number(recon.shaVerified) !== 12 ||
    Number(recon.payloadsUsingItemCountFallback) !== 0 ||
    Number(recon.payloadsWhereCostCreditsDiffersFromFlightItems) !== 0 ||
    !Number.isInteger(Number(recon.externalCredits)) ||
    Number(recon.externalCredits) < Number(recon.productionRuleInternalSendCredits) ||
    recon.exactReconciliationMatch !== false
  ) {
    throw new Error("P2G07_ADJUDICATION_REFUSED:RECONSTRUCTION_CONTRACT_MISMATCH");
  }

  if (
    cleanup.schema !== "v39.phase2g-exact-session-purpose-cleanup.v1" ||
    cleanup.mode !== "APPLY" ||
    String(cleanup.session_id ?? "").toLowerCase() !== SESSION_ID ||
    Number(cleanup.expected_live_blobs) !== 12 ||
    Number(cleanup.deleted_blobs) !== 12 ||
    Number(cleanup.final?.sessions ?? -1) !== 0 ||
    Number(cleanup.final?.deliveries ?? -1) !== 0 ||
    Number(cleanup.final?.items ?? -1) !== 0 ||
    Number(cleanup.final?.live_blobs ?? -1) !== 0
  ) {
    throw new Error("P2G07_ADJUDICATION_REFUSED:CLEANUP_CONTRACT_MISMATCH");
  }

  const activeBillable = (await listSubscriptionsStrict()).filter(
    (subscription) => subscription.isActive && subscription.billingType !== "LifetimeBased",
  );
  if (activeBillable.length !== 0) {
    throw new Error(`P2G07_ADJUDICATION_REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${activeBillable.length}`);
  }

  const probeR = await pool.query(
    `SELECT probe_id,icao,stage,status,window_start,window_end,duration_censored,
            stop_reason,reconciliation_status,runtime_session_id,runtime_cleanup_verified_at_utc,
            probe_budget_day_id,reserved_credits
       FROM clean.adb_anchor_probe
      WHERE probe_id=$1 AND probe_budget_day_id=$2`,
    [PROBE_ID, BUDGET_DAY],
  );
  if (probeR.rowCount !== 1) throw new Error("P2G07_ADJUDICATION_REFUSED:PROBE_NOT_FOUND");
  const probe = probeR.rows[0];
  const startMs = new Date(probe.window_start).getTime();
  const endMs = new Date(probe.window_end).getTime();
  const elapsedMs = endMs - startMs;
  if (
    Number(probe.stage) !== 1 ||
    String(probe.icao).toUpperCase() !== "WSSS" ||
    String(probe.status) !== "failed" ||
    String(probe.stop_reason) !== "subscription_delete_failed" ||
    String(probe.reconciliation_status) !== "UNRESOLVED" ||
    String(probe.runtime_session_id ?? "").toLowerCase() !== SESSION_ID ||
    Number(probe.reserved_credits) !== 500 ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs <= 0 ||
    elapsedMs >= TARGET_MS
  ) {
    throw new Error("P2G07_ADJUDICATION_REFUSED:PROBE_STATE_MISMATCH");
  }

  const budgetR = await pool.query(
    `SELECT state,cap_credits,closed_at FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$1`,
    [BUDGET_DAY],
  );
  if (budgetR.rowCount !== 1 || String(budgetR.rows[0].state) !== "OPEN" ||
      Number(budgetR.rows[0].cap_credits) !== 500 || budgetR.rows[0].closed_at != null) {
    throw new Error("P2G07_ADJUDICATION_REFUSED:BUDGET_STATE_MISMATCH");
  }

  const runtimeR = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1) sessions,
       (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1) deliveries,
       (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1) items,
       (SELECT count(*)::int FROM clean.provider_content_blob_ref
          WHERE source_kind='webhook' AND source_record_id LIKE $2 AND deletion_verified_at_utc IS NULL) live_blobs`,
    [SESSION_ID, `prepaid:${SESSION_ID}:%`],
  );
  const runtime = runtimeR.rows[0];
  if ([runtime.sessions,runtime.deliveries,runtime.items,runtime.live_blobs].some((v: unknown) => Number(v) !== 0)) {
    throw new Error("P2G07_ADJUDICATION_REFUSED:TRANSIENT_OR_RAW_CLEANUP_NOT_ZERO");
  }

  const openR = await pool.query(
    `SELECT id,cause,detail FROM clean.adb_incident_stop WHERE resolved=false ORDER BY id ASC`,
  );
  if (openR.rows.length === 0) throw new Error("P2G07_ADJUDICATION_REFUSED:NO_OPEN_INCIDENTS");
  for (const row of openR.rows) {
    const detail = row.detail ?? {};
    const probeScoped = String(row.cause) === "reconciliation" && Number(detail.probeId) === PROBE_ID;
    const sessionScoped = String(row.cause) === "raw-persistence" &&
      String(detail.sessionId ?? "").toLowerCase() === SESSION_ID;
    if (!probeScoped && !sessionScoped) {
      throw new Error(`P2G07_ADJUDICATION_REFUSED:UNRELATED_OPEN_INCIDENT:${row.id}`);
    }
  }
  const incidentIds = openR.rows.map((row: any) => Number(row.id));

  const preview = {
    schema: "v39.phase2g-p2g07-provider502-adjudication.v1",
    mode: apply ? "APPLY" : "DRY_RUN",
    probe_id: PROBE_ID,
    probe_budget_day_id: BUDGET_DAY,
    session_id: SESSION_ID,
    failed_probe_preserved: true,
    corrected_duration_censored: true,
    measured_duration_minutes: elapsedMs / 60_000,
    reconciliation_status_preserved: "UNRESOLVED",
    stop_reason_preserved: "subscription_delete_failed",
    reconstruction_sha256: reconExpectedSha,
    cleanup_sha256: cleanupExpectedSha,
    reconstructed_internal_credits: Number(recon.productionRuleInternalSendCredits),
    settled_external_credits: Number(recon.externalCredits),
    observed_external_minus_internal: Number(recon.reconciliationDeltaExternalMinusInternal),
    incidents_to_resolve: incidentIds,
    active_billable_subscriptions: 0,
    provider_mutation: false,
  };

  if (!apply) {
    console.log(JSON.stringify({...preview,status:"READY_FOR_APPLY"},null,2));
    return;
  }

  const client = await pool.connect();
  let closedAt: string | null = null;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [BUDGET_DAY]);

    const updated = await client.query(
      `UPDATE clean.adb_anchor_probe
          SET duration_censored=true,
              runtime_cleanup_verified_at_utc=COALESCE(runtime_cleanup_verified_at_utc,$2::timestamptz)
        WHERE probe_id=$1
          AND status='failed'
          AND stop_reason='subscription_delete_failed'
          AND reconciliation_status='UNRESOLVED'
        RETURNING probe_id`,
      [PROBE_ID, cleanup.verified_at_utc],
    );
    if (updated.rowCount !== 1) throw new Error("P2G07_ADJUDICATION_REFUSED:PROBE_UPDATE_RACE");

    const resolved = await client.query(
      `UPDATE clean.adb_incident_stop SET resolved=true,resolved_at_utc=now()
        WHERE resolved=false AND id = ANY($1::bigint[]) RETURNING id`,
      [incidentIds],
    );
    if (resolved.rowCount !== incidentIds.length) throw new Error("P2G07_ADJUDICATION_REFUSED:INCIDENT_RESOLUTION_RACE");

    const closed = await client.query(
      `UPDATE clean.adb_probe_budget_day SET state='CLOSED',closed_at=now()
        WHERE probe_budget_day_id=$1 AND state='OPEN' RETURNING closed_at`,
      [BUDGET_DAY],
    );
    if (closed.rowCount !== 1) throw new Error("P2G07_ADJUDICATION_REFUSED:BUDGET_CLOSE_RACE");
    closedAt = new Date(closed.rows[0].closed_at).toISOString();

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  const remaining = await pool.query(`SELECT count(*)::int n FROM clean.adb_incident_stop WHERE resolved=false`);
  if (Number(remaining.rows[0]?.n ?? -1) !== 0) throw new Error("P2G07_ADJUDICATION_POSTCHECK:OPEN_INCIDENTS_REMAIN");

  const receipt = {
    ...preview,
    mode: "APPLY",
    status: "P2G07_PROVIDER502_ADJUDICATED",
    applied_at_utc: new Date().toISOString(),
    budget_state: "CLOSED",
    budget_closed_at_utc: closedAt,
    provider_mutation: false,
    next: "Use only the prospectively frozen P2G07 provider-502 recovery amendment with a fresh runtime/budget/AUTH.",
  };
  fs.mkdirSync("artifacts",{recursive:true});
  const out = path.join("artifacts",`phase2g-p2g07-provider502-adjudication-${Date.now()}.json`);
  fs.writeFileSync(out,JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({...receipt,receipt_file:out,receipt_file_sha256:sha256(fs.readFileSync(out))},null,2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema:"v39.phase2g-p2g07-provider502-adjudication.v1",
    status:"REFUSED_OR_FAILED",
    error:error instanceof Error ? error.message : String(error),
  },null,2));
  process.exitCode=1;
}).finally(async()=>{ await pool.end().catch(()=>undefined); });
