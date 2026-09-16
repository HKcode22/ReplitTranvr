import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`ADJUDICATION_PREP_REFUSED:MISSING:${name}`);
  return value;
}
function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

async function main(): Promise<void> {
  const budgetDayId = required("--probe-budget-day-id");
  const probeId = Number(required("--probe-id"));
  const sessionId = required("--session-id").toLowerCase();
  const cleanupFile = path.resolve(required("--emergency-cleanup-file"));
  if (!Number.isInteger(probeId) || probeId <= 0) throw new Error("ADJUDICATION_PREP_REFUSED:PROBE_ID_INVALID");
  if (!UUID.test(sessionId)) throw new Error("ADJUDICATION_PREP_REFUSED:SESSION_ID_INVALID");
  if (!fs.existsSync(cleanupFile)) throw new Error("ADJUDICATION_PREP_REFUSED:CLEANUP_EVIDENCE_MISSING");

  const cleanupRaw = fs.readFileSync(cleanupFile, "utf8");
  const cleanup = JSON.parse(cleanupRaw);
  if (cleanup.schema !== "v39.phase2g-stage1-emergency-owned-subscription-cleanup.v1" ||
      cleanup.status !== "EXACT_OWNED_SUBSCRIPTION_DELETED_VERIFIED" ||
      cleanup.probe_budget_day_id !== budgetDayId ||
      Number(cleanup.probe_id) !== probeId ||
      String(cleanup.session_id ?? "").toLowerCase() !== sessionId ||
      cleanup.provider_delete_verified !== true ||
      Number(cleanup.active_billable_after) !== 0) {
    throw new Error("ADJUDICATION_PREP_REFUSED:CLEANUP_EVIDENCE_MISMATCH");
  }

  const probes = await pool.query(
    `SELECT probe_id,icao,stage,status,duration_censored,stop_reason,reconciliation_status,
            runtime_session_id,runtime_cleanup_verified_at_utc,reserved_credits,window_start,window_end
       FROM clean.adb_anchor_probe
      WHERE probe_id=$1 AND probe_budget_day_id=$2`,
    [probeId, budgetDayId],
  );
  if (probes.rowCount !== 1) throw new Error("ADJUDICATION_PREP_REFUSED:EXACT_FAILED_PROBE_NOT_FOUND");
  const probe = probes.rows[0];
  if (Number(probe.stage) !== 1 || String(probe.status) !== "failed" || probe.duration_censored !== true ||
      String(probe.reconciliation_status) !== "UNRESOLVED" || Number(probe.reserved_credits) !== 500 ||
      String(probe.icao ?? "").toUpperCase() !== "WSSS") {
    throw new Error("ADJUDICATION_PREP_REFUSED:FAILED_PROBE_STATE_MISMATCH");
  }

  const budget = await pool.query(
    `SELECT probe_budget_day_id,state,cap_credits,created_at,closed_at
       FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$1`,
    [budgetDayId],
  );
  if (budget.rowCount !== 1 || String(budget.rows[0].state) !== "OPEN" || Number(budget.rows[0].cap_credits) !== 500 || budget.rows[0].closed_at != null) {
    throw new Error("ADJUDICATION_PREP_REFUSED:BUDGET_DAY_NOT_EXPECTED_OPEN_STATE");
  }

  const activeProbes = await pool.query(`SELECT count(*)::int n FROM clean.adb_anchor_probe WHERE status='probing'`);
  if (Number(activeProbes.rows[0]?.n ?? -1) !== 0) throw new Error("ADJUDICATION_PREP_REFUSED:ACTIVE_PROBE_PRESENT");
  const runtimeRows = await pool.query(
    `SELECT count(*)::int n FROM clean.prepaid_probe_session_runtime
      WHERE owner_kind='anchor_probe' AND owner_probe_id=$1 AND stage=1`,
    [probeId],
  );
  if (Number(runtimeRows.rows[0]?.n ?? -1) !== 0) throw new Error("ADJUDICATION_PREP_REFUSED:RUNTIME_ROWS_PRESENT");

  const activeBillable = (await listSubscriptionsStrict()).filter((s) => s.isActive && s.billingType !== "LifetimeBased");
  if (activeBillable.length !== 0) throw new Error(`ADJUDICATION_PREP_REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${activeBillable.length}`);

  const blobs = await pool.query(
    `SELECT count(*)::int n,min(persisted_at_utc) first_persisted_utc,max(persisted_at_utc) last_persisted_utc
       FROM clean.provider_content_blob_ref WHERE source_record_id LIKE $1`,
    [`prepaid:${sessionId}:%`],
  );
  if (Number(blobs.rows[0]?.n ?? 0) < 1) throw new Error("ADJUDICATION_PREP_REFUSED:NO_DURABLE_RAW_EVIDENCE");

  const open = await pool.query(
    `SELECT id,cause,occurred_at_utc,detail
       FROM clean.adb_incident_stop
      WHERE resolved=false ORDER BY id ASC`,
  );
  if (open.rows.length === 0) throw new Error("ADJUDICATION_PREP_REFUSED:NO_OPEN_INCIDENTS");

  const expected = open.rows.filter((row: any) => {
    const detail = row.detail ?? {};
    const reconciliationForProbe = String(row.cause) === "reconciliation" &&
      Number(detail.probeId) === probeId && String(detail.budgetDayId ?? "") === budgetDayId &&
      String(detail.kind ?? "") === "stage1_supervisor_recovery";
    const rawForSession = String(row.cause) === "raw-persistence" &&
      String(detail.sessionId ?? "").toLowerCase() === sessionId &&
      String(detail.error ?? "") === "PREPAID_PROBE_SESSION_NOT_FOUND_OR_CRASH_RESET" &&
      String(detail.mode ?? "") === "prepaid_probe";
    return reconciliationForProbe || rawForSession;
  });
  if (expected.length !== open.rows.length) {
    const foreignIds = open.rows.filter((row: any) => !expected.some((e: any) => Number(e.id) === Number(row.id))).map((row: any) => Number(row.id));
    throw new Error(`ADJUDICATION_PREP_REFUSED:UNRELATED_OPEN_INCIDENTS:${foreignIds.join(",")}`);
  }
  if (expected.length < 1) throw new Error("ADJUDICATION_PREP_REFUSED:NO_MATCHING_FAILED_ATTEMPT_INCIDENTS");

  const planCore = {
    schema: "v39.phase2g-failed-stage1-adjudication-plan.v1",
    status: "READY_FOR_EXACT_ADJUDICATION_NOT_APPLIED",
    generated_at_utc: new Date().toISOString(),
    probe_budget_day_id: budgetDayId,
    probe_id: probeId,
    icao: String(probe.icao).toUpperCase(),
    failed_probe_status: String(probe.status),
    duration_censored: probe.duration_censored === true,
    reconciliation_status: String(probe.reconciliation_status),
    reserved_credits: Number(probe.reserved_credits),
    runtime_session_id: probe.runtime_session_id == null ? null : String(probe.runtime_session_id),
    recovery_session_id: sessionId,
    cleanup_evidence_file: path.relative(process.cwd(), cleanupFile),
    cleanup_evidence_sha256: sha256(cleanupRaw),
    durable_blob_ref_count: Number(blobs.rows[0].n),
    active_probe_count: 0,
    active_runtime_rows: 0,
    active_billable_subscriptions: 0,
    incident_ids: expected.map((row: any) => Number(row.id)),
    incident_count: expected.length,
    incident_fingerprints: expected.map((row: any) => ({
      id: Number(row.id),
      cause: String(row.cause),
      occurred_at_utc: new Date(row.occurred_at_utc).toISOString(),
      detail_sha256: sha256(canonical(row.detail ?? null)),
    })),
    intended_mutation: {
      resolve_only_exact_incident_ids: true,
      preserve_failed_probe_as_failed_unresolved: true,
      close_only_exact_failed_budget_day: true,
      provider_mutation: false,
      deployment: false,
    },
  };
  const planHash = sha256(canonical(planCore));
  const plan = { ...planCore, plan_binding_sha256: planHash };
  const stamp = new Date().toISOString().replace(/[-:.]/g, "").replace("Z", "Z");
  const out = path.join(process.cwd(), "artifacts", `phase2g-failed-stage1-adjudication-plan-${stamp}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(plan, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  console.log(JSON.stringify({ ...plan, plan_file: path.relative(process.cwd(), out), plan_file_sha256: sha256(fs.readFileSync(out)) }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "v39.phase2g-failed-stage1-adjudication-plan.v1",
    status: "ADJUDICATION_PREP_REFUSED_OR_FAILED",
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => { await pool.end().catch(() => undefined); });
