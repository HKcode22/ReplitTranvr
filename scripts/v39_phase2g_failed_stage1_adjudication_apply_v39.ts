import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`ADJUDICATION_APPLY_REFUSED:MISSING:${name}`);
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
  const planFile = path.resolve(required("--plan"));
  const expectedPlanFileSha = required("--plan-file-sha").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedPlanFileSha)) throw new Error("ADJUDICATION_APPLY_REFUSED:PLAN_FILE_SHA_INVALID");
  if (!fs.existsSync(planFile)) throw new Error("ADJUDICATION_APPLY_REFUSED:PLAN_FILE_MISSING");
  const planRaw = fs.readFileSync(planFile, "utf8");
  if (sha256(planRaw) !== expectedPlanFileSha) throw new Error("ADJUDICATION_APPLY_REFUSED:PLAN_FILE_SHA_MISMATCH");
  const plan = JSON.parse(planRaw);
  if (plan.schema !== "v39.phase2g-failed-stage1-adjudication-plan.v1" || plan.status !== "READY_FOR_EXACT_ADJUDICATION_NOT_APPLIED") {
    throw new Error("ADJUDICATION_APPLY_REFUSED:PLAN_SCHEMA_OR_STATUS");
  }
  const binding = String(plan.plan_binding_sha256 ?? "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(binding)) throw new Error("ADJUDICATION_APPLY_REFUSED:PLAN_BINDING_INVALID");
  const { plan_binding_sha256: _binding, ...core } = plan;
  if (sha256(canonical(core)) !== binding) throw new Error("ADJUDICATION_APPLY_REFUSED:PLAN_BINDING_MISMATCH");

  const budgetDayId = String(plan.probe_budget_day_id ?? "");
  const probeId = Number(plan.probe_id);
  const sessionId = String(plan.recovery_session_id ?? "").toLowerCase();
  const incidentIds = Array.isArray(plan.incident_ids) ? plan.incident_ids.map(Number) : [];
  if (!budgetDayId || !Number.isInteger(probeId) || probeId <= 0 || !sessionId || incidentIds.length < 1 || incidentIds.some((id: number) => !Number.isInteger(id) || id <= 0)) {
    throw new Error("ADJUDICATION_APPLY_REFUSED:PLAN_IDENTIFIERS_INVALID");
  }
  if (new Set(incidentIds).size !== incidentIds.length) throw new Error("ADJUDICATION_APPLY_REFUSED:DUPLICATE_INCIDENT_IDS");
  if (Number(plan.active_probe_count) !== 0 || Number(plan.active_runtime_rows) !== 0 || Number(plan.active_billable_subscriptions) !== 0) {
    throw new Error("ADJUDICATION_APPLY_REFUSED:PLAN_WAS_NOT_CLEAN");
  }
  if (plan.intended_mutation?.provider_mutation !== false || plan.intended_mutation?.deployment !== false ||
      plan.intended_mutation?.preserve_failed_probe_as_failed_unresolved !== true) {
    throw new Error("ADJUDICATION_APPLY_REFUSED:PLAN_MUTATION_CONTRACT_INVALID");
  }

  const cleanupPath = path.resolve(String(plan.cleanup_evidence_file ?? ""));
  if (!fs.existsSync(cleanupPath)) throw new Error("ADJUDICATION_APPLY_REFUSED:CLEANUP_EVIDENCE_MISSING");
  if (sha256(fs.readFileSync(cleanupPath)) !== String(plan.cleanup_evidence_sha256 ?? "")) {
    throw new Error("ADJUDICATION_APPLY_REFUSED:CLEANUP_EVIDENCE_CHANGED");
  }

  const activeBillable = (await listSubscriptionsStrict()).filter((s) => s.isActive && s.billingType !== "LifetimeBased");
  if (activeBillable.length !== 0) throw new Error(`ADJUDICATION_APPLY_REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${activeBillable.length}`);

  const client = await pool.connect();
  let closedAt: string | null = null;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [budgetDayId]);

    const probe = await client.query(
      `SELECT probe_id,icao,stage,status,duration_censored,reconciliation_status,reserved_credits,runtime_session_id
         FROM clean.adb_anchor_probe WHERE probe_id=$1 AND probe_budget_day_id=$2 FOR UPDATE`,
      [probeId, budgetDayId],
    );
    if (probe.rowCount !== 1 || Number(probe.rows[0].stage) !== 1 || String(probe.rows[0].status) !== "failed" ||
        probe.rows[0].duration_censored !== true || String(probe.rows[0].reconciliation_status) !== "UNRESOLVED" ||
        Number(probe.rows[0].reserved_credits) !== 500 || String(probe.rows[0].icao ?? "").toUpperCase() !== String(plan.icao ?? "").toUpperCase()) {
      throw new Error("ADJUDICATION_APPLY_REFUSED:FAILED_PROBE_STATE_CHANGED");
    }

    const activeProbes = await client.query(`SELECT count(*)::int n FROM clean.adb_anchor_probe WHERE status='probing'`);
    if (Number(activeProbes.rows[0]?.n ?? -1) !== 0) throw new Error("ADJUDICATION_APPLY_REFUSED:ACTIVE_PROBE_PRESENT");
    const runtimeRows = await client.query(
      `SELECT count(*)::int n FROM clean.prepaid_probe_session_runtime
        WHERE owner_kind='anchor_probe' AND owner_probe_id=$1 AND stage=1`,
      [probeId],
    );
    if (Number(runtimeRows.rows[0]?.n ?? -1) !== 0) throw new Error("ADJUDICATION_APPLY_REFUSED:RUNTIME_ROWS_PRESENT");

    const budget = await client.query(
      `SELECT state,cap_credits,closed_at FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$1 FOR UPDATE`,
      [budgetDayId],
    );
    if (budget.rowCount !== 1 || String(budget.rows[0].state) !== "OPEN" || Number(budget.rows[0].cap_credits) !== 500 || budget.rows[0].closed_at != null) {
      throw new Error("ADJUDICATION_APPLY_REFUSED:BUDGET_DAY_STATE_CHANGED");
    }

    const open = await client.query(`SELECT id,cause,occurred_at_utc,detail FROM clean.adb_incident_stop WHERE resolved=false ORDER BY id ASC FOR UPDATE`);
    const openIds = open.rows.map((row: any) => Number(row.id));
    if (openIds.length !== incidentIds.length || openIds.some((id: number, index: number) => id !== [...incidentIds].sort((a, b) => a - b)[index])) {
      throw new Error(`ADJUDICATION_APPLY_REFUSED:OPEN_INCIDENT_SET_CHANGED:${openIds.join(",")}`);
    }

    const expectedFingerprints = new Map<number, string>((plan.incident_fingerprints ?? []).map((entry: any) => [Number(entry.id), String(entry.detail_sha256)]));
    for (const row of open.rows) {
      const id = Number(row.id);
      const expected = expectedFingerprints.get(id);
      if (!expected || sha256(canonical(row.detail ?? null)) !== expected) {
        throw new Error(`ADJUDICATION_APPLY_REFUSED:INCIDENT_FINGERPRINT_CHANGED:${id}`);
      }
      const detail = row.detail ?? {};
      const expectedReconciliation = String(row.cause) === "reconciliation" && Number(detail.probeId) === probeId &&
        String(detail.budgetDayId ?? "") === budgetDayId && String(detail.kind ?? "") === "stage1_supervisor_recovery";
      const expectedRaw = String(row.cause) === "raw-persistence" && String(detail.sessionId ?? "").toLowerCase() === sessionId &&
        String(detail.error ?? "") === "PREPAID_PROBE_SESSION_NOT_FOUND_OR_CRASH_RESET" && String(detail.mode ?? "") === "prepaid_probe";
      if (!expectedReconciliation && !expectedRaw) throw new Error(`ADJUDICATION_APPLY_REFUSED:INCIDENT_SCOPE_CHANGED:${id}`);
    }

    const resolved = await client.query(
      `UPDATE clean.adb_incident_stop SET resolved=true,resolved_at_utc=now()
        WHERE resolved=false AND id = ANY($1::bigint[]) RETURNING id`,
      [incidentIds],
    );
    if (resolved.rowCount !== incidentIds.length) throw new Error("ADJUDICATION_APPLY_REFUSED:INCIDENT_RESOLUTION_COUNT_MISMATCH");

    const closed = await client.query(
      `UPDATE clean.adb_probe_budget_day SET state='CLOSED',closed_at=now()
        WHERE probe_budget_day_id=$1 AND state='OPEN' RETURNING closed_at`,
      [budgetDayId],
    );
    if (closed.rowCount !== 1) throw new Error("ADJUDICATION_APPLY_REFUSED:BUDGET_CLOSE_RACE");
    closedAt = new Date(closed.rows[0].closed_at).toISOString();

    // The failed scientific evidence is deliberately immutable in meaning.
    const preserved = await client.query(
      `SELECT status,duration_censored,reconciliation_status FROM clean.adb_anchor_probe WHERE probe_id=$1`,
      [probeId],
    );
    if (preserved.rowCount !== 1 || String(preserved.rows[0].status) !== "failed" ||
        preserved.rows[0].duration_censored !== true || String(preserved.rows[0].reconciliation_status) !== "UNRESOLVED") {
      throw new Error("ADJUDICATION_APPLY_REFUSED:FAILED_EVIDENCE_NOT_PRESERVED");
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  const remaining = await pool.query(`SELECT count(*)::int n FROM clean.adb_incident_stop WHERE resolved=false`);
  if (Number(remaining.rows[0]?.n ?? -1) !== 0) throw new Error("ADJUDICATION_APPLY_POSTCHECK:OPEN_INCIDENTS_REMAIN");
  const finalBudget = await pool.query(`SELECT state,closed_at FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$1`, [budgetDayId]);
  if (finalBudget.rowCount !== 1 || String(finalBudget.rows[0].state) !== "CLOSED") throw new Error("ADJUDICATION_APPLY_POSTCHECK:BUDGET_NOT_CLOSED");
  const finalProbe = await pool.query(`SELECT status,duration_censored,reconciliation_status FROM clean.adb_anchor_probe WHERE probe_id=$1`, [probeId]);
  if (finalProbe.rowCount !== 1 || String(finalProbe.rows[0].status) !== "failed" || finalProbe.rows[0].duration_censored !== true || String(finalProbe.rows[0].reconciliation_status) !== "UNRESOLVED") {
    throw new Error("ADJUDICATION_APPLY_POSTCHECK:FAILED_PROBE_CHANGED");
  }

  const receipt = {
    schema: "v39.phase2g-failed-stage1-adjudication-receipt.v1",
    status: "FAILED_ATTEMPT_ADJUDICATED_AND_BUDGET_CLOSED",
    applied_at_utc: new Date().toISOString(),
    plan_file: path.relative(process.cwd(), planFile),
    plan_file_sha256: expectedPlanFileSha,
    plan_binding_sha256: binding,
    probe_budget_day_id: budgetDayId,
    probe_id: probeId,
    failed_probe_preserved: true,
    reconciliation_status_preserved: "UNRESOLVED",
    incidents_resolved: incidentIds,
    incident_count: incidentIds.length,
    budget_state: "CLOSED",
    budget_closed_at_utc: closedAt,
    active_billable_subscriptions_before_apply: 0,
    provider_mutation_performed: false,
    deployment_performed: false,
    next: "Freeze a new Stage-1 runtime/budget day and create a new DRAFT_ONLY_NOT_AUTHORIZED authorization; do not reuse the failed budget day or prior AUTH.",
  };
  const stamp = new Date().toISOString().replace(/[-:.]/g, "").replace("Z", "Z");
  const out = path.join(process.cwd(), "artifacts", `phase2g-failed-stage1-adjudication-receipt-${stamp}.json`);
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  console.log(JSON.stringify({ ...receipt, receipt_file: path.relative(process.cwd(), out), receipt_file_sha256: sha256(fs.readFileSync(out)) }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "v39.phase2g-failed-stage1-adjudication-receipt.v1",
    status: "ADJUDICATION_APPLY_REFUSED_OR_FAILED",
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => { await pool.end().catch(() => undefined); });
