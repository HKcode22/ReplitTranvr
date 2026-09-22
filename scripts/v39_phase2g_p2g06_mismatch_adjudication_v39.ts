import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";

const PROBE_ID = 4;
const ICAO = "WSSS";
const BUDGET_DAY = "P2G-S1-20260921-05";
const SESSION_ID = "e45ef007-6129-4b95-bd29-80a1d700be6e";
const INCIDENT_ID = 16;
const EXPECTED_EXTERNAL = 220;
const EXPECTED_INTERNAL = 219;
const EXPECTED_GAP = 1;
const EXPECTED_PAYLOADS = 36;

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`P2G06_ADJUDICATION_REFUSED:MISSING:${name}`);
  return value;
}
function has(name: string): boolean {
  return process.argv.includes(name);
}
function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function main(): Promise<void> {
  const reconstructionPath = path.resolve(required("--reconstruction"));
  const cleanupPath = path.resolve(required("--cleanup-evidence"));
  const apply = has("--apply");

  if (!fs.existsSync(reconstructionPath)) throw new Error("P2G06_ADJUDICATION_REFUSED:RECONSTRUCTION_MISSING");
  if (!fs.existsSync(cleanupPath)) throw new Error("P2G06_ADJUDICATION_REFUSED:CLEANUP_EVIDENCE_MISSING");

  const reconstructionRaw = fs.readFileSync(reconstructionPath, "utf8");
  const cleanupRaw = fs.readFileSync(cleanupPath, "utf8");
  const reconstruction = JSON.parse(reconstructionRaw);
  const cleanup = JSON.parse(cleanupRaw);

  if (reconstruction.schema !== "v39.phase2g-prepaid-session-reconstruction.v1") {
    throw new Error("P2G06_ADJUDICATION_REFUSED:RECONSTRUCTION_SCHEMA");
  }
  if (String(reconstruction.sessionId ?? "").toLowerCase() !== SESSION_ID) {
    throw new Error("P2G06_ADJUDICATION_REFUSED:RECONSTRUCTION_SESSION");
  }
  if (
    Number(reconstruction.payloadsReconstructed) !== EXPECTED_PAYLOADS ||
    Number(reconstruction.shaVerified) !== EXPECTED_PAYLOADS ||
    Number(reconstruction.externalCredits) !== EXPECTED_EXTERNAL ||
    Number(reconstruction.productionRuleInternalSendCredits) !== EXPECTED_INTERNAL ||
    Number(reconstruction.reconciliationDeltaExternalMinusInternal) !== EXPECTED_GAP ||
    reconstruction.exactReconciliationMatch !== false ||
    Number(reconstruction.payloadsUsingItemCountFallback) !== 0 ||
    Number(reconstruction.payloadsWhereCostCreditsDiffersFromFlightItems) !== 0
  ) {
    throw new Error("P2G06_ADJUDICATION_REFUSED:RECONSTRUCTION_FACTS_CHANGED");
  }

  if (
    cleanup.schema !== "v39.phase2g-exact-session-purpose-cleanup.v1" ||
    cleanup.mode !== "APPLY" ||
    String(cleanup.session_id ?? "").toLowerCase() !== SESSION_ID ||
    Number(cleanup.expected_live_blobs) !== EXPECTED_PAYLOADS ||
    Number(cleanup.deleted_blobs) !== EXPECTED_PAYLOADS ||
    Number(cleanup.final?.live_blobs ?? -1) !== 0
  ) {
    throw new Error("P2G06_ADJUDICATION_REFUSED:CLEANUP_EVIDENCE_INVALID");
  }
  const cleanupVerifiedAt = new Date(String(cleanup.verified_at_utc ?? ""));
  if (!Number.isFinite(cleanupVerifiedAt.getTime())) {
    throw new Error("P2G06_ADJUDICATION_REFUSED:CLEANUP_VERIFIED_TIME");
  }

  const activeBillable = (await listSubscriptionsStrict()).filter(
    (subscription) => subscription.isActive && subscription.billingType !== "LifetimeBased",
  );
  if (activeBillable.length !== 0) {
    throw new Error(`P2G06_ADJUDICATION_REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${activeBillable.length}`);
  }

  const probe = await pool.query(
    `SELECT probe_id,icao,stage,status,duration_censored,reconciliation_status,stop_reason,
            probe_budget_day_id,runtime_session_id,runtime_cleanup_verified_at_utc
       FROM clean.adb_anchor_probe WHERE probe_id=$1`,
    [PROBE_ID],
  );
  if (probe.rowCount !== 1) throw new Error("P2G06_ADJUDICATION_REFUSED:PROBE_MISSING");
  const p = probe.rows[0];
  if (
    String(p.icao).toUpperCase() !== ICAO ||
    Number(p.stage) !== 1 ||
    String(p.status) !== "failed" ||
    p.duration_censored !== false ||
    String(p.reconciliation_status) !== "MISMATCH" ||
    String(p.stop_reason) !== "external_internal_credit_mismatch" ||
    String(p.probe_budget_day_id) !== BUDGET_DAY ||
    String(p.runtime_session_id).toLowerCase() !== SESSION_ID
  ) {
    throw new Error("P2G06_ADJUDICATION_REFUSED:PROBE_STATE_CHANGED");
  }

  const budget = await pool.query(
    `SELECT state,cap_credits,closed_at FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$1`,
    [BUDGET_DAY],
  );
  if (
    budget.rowCount !== 1 ||
    String(budget.rows[0].state) !== "OPEN" ||
    Number(budget.rows[0].cap_credits) !== 500 ||
    budget.rows[0].closed_at != null
  ) {
    throw new Error("P2G06_ADJUDICATION_REFUSED:BUDGET_STATE_CHANGED");
  }

  const incident = await pool.query(
    `SELECT id,cause,detail,resolved FROM clean.adb_incident_stop WHERE id=$1`,
    [INCIDENT_ID],
  );
  if (incident.rowCount !== 1 || incident.rows[0].resolved === true ||
      String(incident.rows[0].cause) !== "reconciliation") {
    throw new Error("P2G06_ADJUDICATION_REFUSED:INCIDENT_STATE_CHANGED");
  }
  const detail = incident.rows[0].detail ?? {};
  if (
    String(detail.kind ?? "") !== "prepaid_probe_failed" ||
    Number(detail.probeId) !== PROBE_ID ||
    String(detail.stopReason ?? "") !== "external_internal_credit_mismatch" ||
    String(detail.reconciliationStatus ?? "") !== "MISMATCH"
  ) {
    throw new Error("P2G06_ADJUDICATION_REFUSED:INCIDENT_SCOPE_CHANGED");
  }

  const blobState = await pool.query(
    `SELECT
       count(*)::int AS total,
       count(*) FILTER (WHERE deletion_verified_at_utc IS NOT NULL)::int AS deleted,
       count(*) FILTER (WHERE deletion_verified_at_utc IS NULL)::int AS live
       FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook' AND source_record_id LIKE $1`,
    [`prepaid:${SESSION_ID}:%`],
  );
  if (
    Number(blobState.rows[0]?.total ?? -1) !== EXPECTED_PAYLOADS ||
    Number(blobState.rows[0]?.deleted ?? -1) !== EXPECTED_PAYLOADS ||
    Number(blobState.rows[0]?.live ?? -1) !== 0
  ) {
    throw new Error("P2G06_ADJUDICATION_REFUSED:BLOB_CLEANUP_NOT_VERIFIED");
  }

  const runtimeState = await pool.query(
    `SELECT
       (SELECT count(*) FROM clean.prepaid_probe_session_runtime WHERE session_id=$1)::int AS sessions,
       (SELECT count(*) FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1)::int AS deliveries,
       (SELECT count(*) FROM clean.prepaid_probe_item_runtime WHERE session_id=$1)::int AS items`,
    [SESSION_ID],
  );
  if (Number(runtimeState.rows[0]?.sessions) !== 0 ||
      Number(runtimeState.rows[0]?.deliveries) !== 0 ||
      Number(runtimeState.rows[0]?.items) !== 0) {
    throw new Error("P2G06_ADJUDICATION_REFUSED:TRANSIENT_RUNTIME_REMAINS");
  }

  const preview = {
    schema: "v39.phase2g-p2g06-mismatch-adjudication.v1",
    mode: apply ? "APPLY_REQUESTED" : "DRY_RUN",
    probe_id: PROBE_ID,
    icao: ICAO,
    budget_day: BUDGET_DAY,
    incident_id: INCIDENT_ID,
    runtime_session_id: SESSION_ID,
    historical_status_preserved: "failed",
    historical_reconciliation_preserved: "MISMATCH",
    external_credits: EXPECTED_EXTERNAL,
    internal_received_credits: EXPECTED_INTERNAL,
    delivery_gap_credits: EXPECTED_GAP,
    reconstruction_file: path.relative(process.cwd(), reconstructionPath),
    reconstruction_sha256: sha256(reconstructionRaw),
    cleanup_evidence_file: path.relative(process.cwd(), cleanupPath),
    cleanup_evidence_sha256: sha256(cleanupRaw),
    provider_mutation: false,
    alert_credits_spent: 0,
  };

  if (!apply) {
    console.log(JSON.stringify({ ...preview, status: "READY_FOR_APPLY" }, null, 2));
    return;
  }

  const client = await pool.connect();
  let closedAt: string | null = null;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [BUDGET_DAY]);

    const lockedProbe = await client.query(
      `SELECT status,duration_censored,reconciliation_status,stop_reason,runtime_session_id
         FROM clean.adb_anchor_probe WHERE probe_id=$1 FOR UPDATE`,
      [PROBE_ID],
    );
    if (
      lockedProbe.rowCount !== 1 ||
      String(lockedProbe.rows[0].status) !== "failed" ||
      lockedProbe.rows[0].duration_censored !== false ||
      String(lockedProbe.rows[0].reconciliation_status) !== "MISMATCH" ||
      String(lockedProbe.rows[0].stop_reason) !== "external_internal_credit_mismatch" ||
      String(lockedProbe.rows[0].runtime_session_id).toLowerCase() !== SESSION_ID
    ) {
      throw new Error("P2G06_ADJUDICATION_REFUSED:LOCKED_PROBE_CHANGED");
    }

    const openIncidents = await client.query(
      `SELECT id FROM clean.adb_incident_stop WHERE resolved=false ORDER BY id`,
    );
    const ids = openIncidents.rows.map((row: any) => Number(row.id));
    if (ids.length !== 1 || ids[0] !== INCIDENT_ID) {
      throw new Error(`P2G06_ADJUDICATION_REFUSED:OPEN_INCIDENT_SET:${ids.join(",")}`);
    }

    const resolved = await client.query(
      `UPDATE clean.adb_incident_stop
          SET resolved=true,resolved_at_utc=now()
        WHERE id=$1 AND resolved=false
        RETURNING id`,
      [INCIDENT_ID],
    );
    if (resolved.rowCount !== 1) throw new Error("P2G06_ADJUDICATION_REFUSED:INCIDENT_RESOLVE_RACE");

    const closed = await client.query(
      `UPDATE clean.adb_probe_budget_day
          SET state='CLOSED',closed_at=now()
        WHERE probe_budget_day_id=$1 AND state='OPEN'
        RETURNING closed_at`,
      [BUDGET_DAY],
    );
    if (closed.rowCount !== 1) throw new Error("P2G06_ADJUDICATION_REFUSED:BUDGET_CLOSE_RACE");
    closedAt = new Date(closed.rows[0].closed_at).toISOString();

    await client.query(
      `UPDATE clean.adb_anchor_probe
          SET runtime_cleanup_verified_at_utc=COALESCE(runtime_cleanup_verified_at_utc,$2)
        WHERE probe_id=$1`,
      [PROBE_ID, cleanupVerifiedAt],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  const finalProbe = await pool.query(
    `SELECT status,duration_censored,reconciliation_status,stop_reason,runtime_cleanup_verified_at_utc
       FROM clean.adb_anchor_probe WHERE probe_id=$1`,
    [PROBE_ID],
  );
  const finalBudget = await pool.query(
    `SELECT state,closed_at FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$1`,
    [BUDGET_DAY],
  );
  const remainingIncidents = await pool.query(
    `SELECT count(*)::int AS n FROM clean.adb_incident_stop WHERE resolved=false`,
  );

  if (
    String(finalProbe.rows[0]?.status) !== "failed" ||
    finalProbe.rows[0]?.duration_censored !== false ||
    String(finalProbe.rows[0]?.reconciliation_status) !== "MISMATCH" ||
    String(finalProbe.rows[0]?.stop_reason) !== "external_internal_credit_mismatch" ||
    finalProbe.rows[0]?.runtime_cleanup_verified_at_utc == null ||
    String(finalBudget.rows[0]?.state) !== "CLOSED" ||
    Number(remainingIncidents.rows[0]?.n ?? -1) !== 0
  ) {
    throw new Error("P2G06_ADJUDICATION_POSTCHECK_FAILED");
  }

  const receipt = {
    ...preview,
    mode: "APPLY",
    status: "P2G06_MISMATCH_ADJUDICATED",
    applied_at_utc: new Date().toISOString(),
    budget_state: "CLOSED",
    budget_closed_at_utc: closedAt,
    incident_resolved: INCIDENT_ID,
    raw_cleanup_verified: true,
    historical_probe_preserved: true,
    next: "Prepare a fresh compact-6-bound Tuesday runtime/AUTH. Do not reuse P2G06.",
  };

  fs.mkdirSync(path.join(process.cwd(), "artifacts"), { recursive: true });
  const out = path.join(
    process.cwd(),
    "artifacts",
    `phase2g-p2g06-mismatch-adjudication-${Date.now()}.json`,
  );
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  console.log(JSON.stringify({
    ...receipt,
    receipt_file: path.relative(process.cwd(), out),
    receipt_sha256: sha256(fs.readFileSync(out)),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      schema: "v39.phase2g-p2g06-mismatch-adjudication.v1",
      status: "REFUSED_OR_FAILED",
      error: error instanceof Error ? error.message : String(error),
      provider_mutation: false,
      alert_credits_spent: 0,
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
