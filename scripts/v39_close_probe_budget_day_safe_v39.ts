import "dotenv/config";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { loadProbeRuntimeConfig, PROBE_BUDGET_DAY_HARD_CAP } from "../server/lib/disruption/probeExecution_v39";
import { prepaidSafeBudgetExposureV39 } from "../server/lib/disruption/probeExecutionPrepaid_v39";

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}

async function main(): Promise<void> {
  const dayId = required("--day-id");
  const runtimeFile = required("--runtime-file");
  const runtimeSha = required("--runtime-sha").toLowerCase();
  const loaded = loadProbeRuntimeConfig(runtimeFile, runtimeSha);
  if (loaded.config.probeBudgetDayId !== dayId) {
    throw new Error(`REFUSED_PROBE_DAY_RUNTIME_MISMATCH:runtime=${loaded.config.probeBudgetDayId}:requested=${dayId}`);
  }

  const incident = await pool.query(
    `SELECT cause,occurred_at_utc FROM clean.adb_incident_stop
      WHERE resolved=false ORDER BY occurred_at_utc DESC LIMIT 1`,
  );
  if (incident.rowCount) throw new Error(`REFUSED_INCIDENT_STOP:${incident.rows[0].cause}`);

  const state = await pool.query(
    `SELECT state,cap_credits FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$1`,
    [dayId],
  );
  if (state.rowCount !== 1) throw new Error(`REFUSED_PROBE_BUDGET_DAY_MISSING:${dayId}`);
  if (state.rows[0].state === "CLOSED") {
    console.log(JSON.stringify({ status: "PASS_ALREADY_CLOSED", probe_budget_day_id: dayId }, null, 2));
    return;
  }
  if (state.rows[0].state !== "OPEN" || Number(state.rows[0].cap_credits) !== PROBE_BUDGET_DAY_HARD_CAP) {
    throw new Error(`REFUSED_PROBE_BUDGET_DAY_STATE:${state.rows[0].state}`);
  }

  const active = await pool.query(
    `SELECT count(*)::int n FROM clean.adb_anchor_probe
      WHERE probe_budget_day_id=$1 AND status='probing'`,
    [dayId],
  );
  if (Number(active.rows[0]?.n ?? 0) !== 0) {
    throw new Error("REFUSED_PROBE_BUDGET_DAY_ACTIVE_PROBE");
  }

  const failures = await pool.query(
    `SELECT count(*)::int n FROM clean.adb_anchor_probe
      WHERE probe_budget_day_id=$1 AND status IN ('failed','abandoned')`,
    [dayId],
  );
  if (Number(failures.rows[0]?.n ?? 0) !== 0) {
    throw new Error("REFUSED_PROBE_BUDGET_DAY_HAS_FAILED_OR_ABANDONED_PROBE");
  }

  const exposure = await prepaidSafeBudgetExposureV39(dayId);
  if (!Number.isFinite(exposure) || exposure < 0) throw new Error("REFUSED_PROBE_BUDGET_DAY_EXPOSURE_INVALID");
  if (exposure > PROBE_BUDGET_DAY_HARD_CAP) {
    await pool.query(
      `UPDATE clean.adb_probe_budget_day SET state='MISMATCH',closed_at=now()
        WHERE probe_budget_day_id=$1 AND state='OPEN'`,
      [dayId],
    );
    await pool.query(
      `INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
       VALUES('reconciliation',now(),$1::jsonb,false)`,
      [JSON.stringify({ kind: "probe_cap_overshoot", owner: "safe_probe_budget_day_close", probeBudgetDayId: dayId, exposure })],
    );
    throw new Error(`PROTOCOL_DEVIATION_PROBE_BUDGET_DAY_EXPOSURE:${exposure}`);
  }

  const closed = await pool.query(
    `UPDATE clean.adb_probe_budget_day SET state='CLOSED',closed_at=now()
      WHERE probe_budget_day_id=$1 AND state='OPEN'
      RETURNING probe_budget_day_id,state,closed_at`,
    [dayId],
  );
  if (closed.rowCount !== 1) throw new Error("REFUSED_PROBE_BUDGET_DAY_CLOSE_RACE");

  console.log(JSON.stringify({
    status: "PASS_CLOSED",
    probe_budget_day_id: dayId,
    conservative_safe_mode_exposure_credits: exposure,
    hard_cap_credits: PROBE_BUDGET_DAY_HARD_CAP,
    runtime_artifact_sha256: loaded.sha256,
    next: "A new probe budget day may be opened only under a separately frozen runtime artifact and authorization",
  }, null, 2));
}

main().catch((error: any) => {
  console.error(String(error?.message ?? error));
  process.exitCode = 1;
}).finally(async () => { await pool.end().catch(() => undefined); });
