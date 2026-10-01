import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";

const PROBE_ID = 13;
const ICAO = "MMUN";
const BUDGET_DAY = "P2G-S1-20260930-16";
const SESSION_ID = "5c0064eb-585a-4dfb-af4c-211f3bee3e94";
const METRIC = "v39-physical-flight-instance-v2";
const CLEANUP_SHA = "7a1fb4622e4adffbda4ba88a04c2243cf702504414d78c7a1bfd862eafe1fd2e";

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`P2G17_ADJUDICATION_REFUSED:MISSING:${name}`);
  return value;
}
function has(name: string): boolean {
  return process.argv.includes(name);
}
function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
function closeEnough(a: unknown, b: number): boolean {
  const n = Number(a);
  return Number.isFinite(n) && Math.abs(n - b) <= 1e-12;
}
function incidentBelongs(row: any): boolean {
  const detail = row?.detail ?? {};
  const probeMatch = Number(detail.probeId ?? detail.probe_id ?? -1) === PROBE_ID;
  const budgetMatch = String(detail.budgetDayId ?? detail.probeBudgetDayId ?? detail.probe_budget_day_id ?? "") === BUDGET_DAY;
  const session = String(detail.sessionId ?? detail.runtimeSessionId ?? detail.runtime_session_id ?? "").toLowerCase();
  const sessionMatch = session === SESSION_ID;
  return probeMatch || (budgetMatch && sessionMatch) || sessionMatch;
}

function verifyCleanup(cleanupFile: string): { path: string; sha256: string } {
  const absolute = path.resolve(cleanupFile);
  if (!fs.existsSync(absolute)) {
    throw new Error("P2G17_ADJUDICATION_REFUSED:CLEANUP_RECEIPT_MISSING");
  }
  const raw = fs.readFileSync(absolute);
  const actual = sha256(raw);
  if (actual !== CLEANUP_SHA) {
    throw new Error(`P2G17_ADJUDICATION_REFUSED:CLEANUP_SHA_MISMATCH:${actual}`);
  }
  const receipt = JSON.parse(raw.toString("utf8"));
  const final = receipt.final ?? {};
  if (
    receipt.schema !== "v39.phase2g-exact-session-purpose-cleanup.v1" ||
    receipt.mode !== "APPLY" ||
    String(receipt.session_id ?? "").toLowerCase() !== SESSION_ID ||
    String(receipt.label ?? "") !== "P2G17-MMUN-20260930" ||
    Number(receipt.expected_live_blobs) !== 41 ||
    Number(receipt.deleted_blobs) !== 41 ||
    Number(final.sessions) !== 0 ||
    Number(final.deliveries) !== 0 ||
    Number(final.items) !== 0 ||
    Number(final.live_blobs) !== 0 ||
    Number(receipt.active_billable_subscriptions) !== 0 ||
    receipt.provider_mutation !== false ||
    receipt.subscription_mutation !== false ||
    Number(receipt.alert_credits_spent) !== 0
  ) {
    throw new Error("P2G17_ADJUDICATION_REFUSED:CLEANUP_RECEIPT_CONTRACT_MISMATCH");
  }
  return { path: path.relative(process.cwd(), absolute), sha256: actual };
}

async function readExactState(client: any = pool): Promise<any> {
  const state = await client.query(
    `SELECT
       p.probe_id,p.icao,p.stage,p.status,p.duration_censored,p.stop_reason,
       p.reconciliation_status,p.metric_contract_version,p.probe_budget_day_id,
       p.runtime_session_id,p.reserved_credits,
       e.evidence_status,e.external_spend_credits,e.internal_received_credits,
       e.delivery_gap_credits,e.delivery_completeness,e.callback_requests_seen,
       e.callback_success_2xx,e.callback_failures,
       e.duration_censored AS evidence_duration_censored,
       e.stop_reason AS evidence_stop_reason,
       e.runtime_session_id AS evidence_runtime_session_id
     FROM clean.adb_anchor_probe p
     JOIN clean.adb_probe_reconciliation_evidence e
       ON e.probe_id=p.probe_id
     WHERE p.probe_id=$1`,
    [PROBE_ID],
  );
  if (state.rowCount !== 1) {
    throw new Error("P2G17_ADJUDICATION_REFUSED:EXACT_PROBE_OR_EVIDENCE_NOT_FOUND");
  }
  return state.rows[0];
}

function assertExactState(row: any): void {
  if (
    Number(row.probe_id) !== PROBE_ID ||
    String(row.icao ?? "").toUpperCase() !== ICAO ||
    Number(row.stage) !== 1 ||
    String(row.status) !== "failed" ||
    String(row.stop_reason ?? "") !== "supervisor_child_exit_recovered" ||
    String(row.reconciliation_status ?? "") !== "UNRESOLVED" ||
    String(row.metric_contract_version ?? "") !== METRIC ||
    String(row.probe_budget_day_id ?? "") !== BUDGET_DAY ||
    String(row.runtime_session_id ?? "").toLowerCase() !== SESSION_ID ||
    String(row.evidence_runtime_session_id ?? "").toLowerCase() !== SESSION_ID ||
    String(row.evidence_status ?? "") !== "DELIVERY_GAP" ||
    Number(row.external_spend_credits) !== 65 ||
    Number(row.internal_received_credits) !== 60 ||
    Number(row.delivery_gap_credits) !== 5 ||
    !closeEnough(row.delivery_completeness, 60 / 65) ||
    Number(row.callback_requests_seen) !== 41 ||
    Number(row.callback_success_2xx) !== 41 ||
    Number(row.callback_failures) !== 0 ||
    row.evidence_duration_censored !== false ||
    String(row.evidence_stop_reason ?? "") !== "external_internal_delivery_gap"
  ) {
    throw new Error("P2G17_ADJUDICATION_REFUSED:EXACT_TECHNICAL_INVALID_EVIDENCE_MISMATCH");
  }
}

async function main(): Promise<void> {
  const cleanup = verifyCleanup(required("--cleanup-file"));
  const apply = has("--apply");

  const activeBillable = (await listSubscriptionsStrict()).filter(
    (s) => s.isActive && s.billingType !== "LifetimeBased",
  );
  if (activeBillable.length !== 0) {
    throw new Error(`P2G17_ADJUDICATION_REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${activeBillable.length}`);
  }

  const state = await readExactState();
  assertExactState(state);

  const runtime = await pool.query(
    `SELECT count(*)::int AS n
       FROM clean.prepaid_probe_session_runtime
      WHERE session_id=$1`,
    [SESSION_ID],
  );
  if (Number(runtime.rows[0]?.n ?? -1) !== 0) {
    throw new Error("P2G17_ADJUDICATION_REFUSED:RUNTIME_SESSION_STILL_PRESENT");
  }

  const blobs = await pool.query(
    `SELECT
       count(*) FILTER (WHERE deletion_verified_at_utc IS NULL)::int AS live,
       count(*) FILTER (WHERE deletion_verified_at_utc IS NOT NULL)::int AS deleted
       FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook' AND source_record_id LIKE $1`,
    [`prepaid:${SESSION_ID}:%`],
  );
  if (Number(blobs.rows[0]?.live ?? -1) !== 0 || Number(blobs.rows[0]?.deleted ?? -1) !== 41) {
    throw new Error("P2G17_ADJUDICATION_REFUSED:BLOB_CLEANUP_STATE_MISMATCH");
  }

  const budget = await pool.query(
    `SELECT state,cap_credits,closed_at
       FROM clean.adb_probe_budget_day
      WHERE probe_budget_day_id=$1`,
    [BUDGET_DAY],
  );
  if (
    budget.rowCount !== 1 ||
    String(budget.rows[0].state) !== "OPEN" ||
    Number(budget.rows[0].cap_credits) !== 500 ||
    budget.rows[0].closed_at != null
  ) {
    throw new Error("P2G17_ADJUDICATION_REFUSED:BUDGET_NOT_EXACT_OPEN_STATE");
  }

  const active = await pool.query(
    `SELECT count(*)::int AS n
       FROM clean.adb_anchor_probe
      WHERE status IN ('probing','settling')`,
  );
  if (Number(active.rows[0]?.n ?? -1) !== 0) {
    throw new Error("P2G17_ADJUDICATION_REFUSED:ACTIVE_OR_SETTLING_PROBE_PRESENT");
  }

  const open = await pool.query(
    `SELECT id,cause,occurred_at_utc,detail
       FROM clean.adb_incident_stop
      WHERE resolved=false
      ORDER BY id ASC`,
  );
  if (open.rows.length < 1) {
    throw new Error("P2G17_ADJUDICATION_REFUSED:NO_OPEN_P2G17_INCIDENT");
  }
  const foreign = open.rows.filter((row: any) => !incidentBelongs(row));
  if (foreign.length !== 0) {
    throw new Error(
      `P2G17_ADJUDICATION_REFUSED:UNRELATED_OPEN_INCIDENTS:${foreign.map((r: any) => r.id).join(",")}`,
    );
  }
  const incidentIds = open.rows.map((row: any) => Number(row.id));

  const dryReceipt = {
    schema: "v39.phase2g-p2g17-mmun-adjudication.v1",
    status: apply ? "READY_TO_APPLY" : "PASS_DRY_RUN_READY",
    probe_id: PROBE_ID,
    icao: ICAO,
    probe_budget_day_id: BUDGET_DAY,
    runtime_session_id: SESSION_ID,
    metric_contract_version: METRIC,
    anchor_status_preserved: "failed",
    anchor_reconciliation_status_preserved: "UNRESOLVED",
    durable_reconciliation_status: "DELIVERY_GAP",
    durable_external_spend_credits: 65,
    durable_internal_received_credits: 60,
    durable_delivery_gap_credits: 5,
    durable_delivery_completeness: 60 / 65,
    durable_duration_censored: false,
    cleanup_receipt: cleanup,
    incident_ids: incidentIds,
    provider_read_only_check_performed: true,
    provider_mutation_performed: false,
    alert_credits_spent: 0,
    database_mutation_performed: false,
  };

  if (!apply) {
    console.log(JSON.stringify(dryReceipt, null, 2));
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [BUDGET_DAY]);

    const lockedState = await readExactState(client);
    assertExactState(lockedState);

    const lockedBudget = await client.query(
      `SELECT state,cap_credits,closed_at
         FROM clean.adb_probe_budget_day
        WHERE probe_budget_day_id=$1
        FOR UPDATE`,
      [BUDGET_DAY],
    );
    if (
      lockedBudget.rowCount !== 1 ||
      String(lockedBudget.rows[0].state) !== "OPEN" ||
      Number(lockedBudget.rows[0].cap_credits) !== 500 ||
      lockedBudget.rows[0].closed_at != null
    ) {
      throw new Error("P2G17_ADJUDICATION_REFUSED:BUDGET_STATE_CHANGED");
    }

    const lockedIncidents = await client.query(
      `SELECT id,cause,occurred_at_utc,detail
         FROM clean.adb_incident_stop
        WHERE resolved=false
        ORDER BY id ASC
        FOR UPDATE`,
    );
    const lockedIds = lockedIncidents.rows.map((row: any) => Number(row.id));
    if (
      lockedIds.length !== incidentIds.length ||
      lockedIds.some((id: number, i: number) => id !== incidentIds[i]) ||
      lockedIncidents.rows.some((row: any) => !incidentBelongs(row))
    ) {
      throw new Error("P2G17_ADJUDICATION_REFUSED:INCIDENT_SET_CHANGED");
    }

    const resolved = await client.query(
      `UPDATE clean.adb_incident_stop
          SET resolved=true,resolved_at_utc=now()
        WHERE resolved=false AND id = ANY($1::bigint[])
        RETURNING id`,
      [incidentIds],
    );
    if (resolved.rowCount !== incidentIds.length) {
      throw new Error("P2G17_ADJUDICATION_REFUSED:INCIDENT_RESOLUTION_COUNT_MISMATCH");
    }

    const closed = await client.query(
      `UPDATE clean.adb_probe_budget_day
          SET state='CLOSED',closed_at=now()
        WHERE probe_budget_day_id=$1 AND state='OPEN'
        RETURNING closed_at`,
      [BUDGET_DAY],
    );
    if (closed.rowCount !== 1) {
      throw new Error("P2G17_ADJUDICATION_REFUSED:BUDGET_CLOSE_RACE");
    }

    const preserved = await readExactState(client);
    assertExactState(preserved);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  const remaining = await pool.query(
    `SELECT count(*)::int AS n
       FROM clean.adb_incident_stop
      WHERE resolved=false`,
  );
  if (Number(remaining.rows[0]?.n ?? -1) !== 0) {
    throw new Error("P2G17_ADJUDICATION_POSTCHECK:OPEN_INCIDENTS_REMAIN");
  }
  const finalBudget = await pool.query(
    `SELECT state,closed_at
       FROM clean.adb_probe_budget_day
      WHERE probe_budget_day_id=$1`,
    [BUDGET_DAY],
  );
  if (
    finalBudget.rowCount !== 1 ||
    String(finalBudget.rows[0].state) !== "CLOSED" ||
    finalBudget.rows[0].closed_at == null
  ) {
    throw new Error("P2G17_ADJUDICATION_POSTCHECK:BUDGET_NOT_CLOSED");
  }
  const preserved = await readExactState();
  assertExactState(preserved);

  const receipt = {
    ...dryReceipt,
    status: "P2G17_TECHNICAL_INVALID_ADJUDICATED_AND_BUDGET_CLOSED",
    applied_at_utc: new Date().toISOString(),
    database_mutation_performed: true,
    database_mutation_scope: [
      "resolve_only_P2G17_scoped_open_incidents",
      "close_only_P2G17_budget_day",
    ],
    failed_probe_preserved: true,
    durable_reconciliation_evidence_preserved: true,
    next: "Freeze a fresh MMUN matched-time runtime/budget/AUTH bound to the P2G17 recovery amendment; do not reuse the P2G17 budget or AUTH.",
  };

  fs.mkdirSync("artifacts", { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:.]/g, "");
  const out = path.join(
    "artifacts",
    `phase2g-p2g17-mmun-adjudication-receipt-${stamp}.json`,
  );
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({
    ...receipt,
    receipt_file: out,
    receipt_file_sha256: sha256(fs.readFileSync(out)),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      schema: "v39.phase2g-p2g17-mmun-adjudication.v1",
      status: "REFUSED_OR_FAILED",
      error: error instanceof Error ? error.message : String(error),
      provider_mutation_performed: false,
      alert_credits_spent: 0,
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
