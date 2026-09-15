import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}
function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function processAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
async function callbackHealthy(base: string): Promise<boolean> {
  if (!/^https:\/\/[^/]+\.replit\.dev$/i.test(base)) return false;
  try {
    const response = await fetch(`${base.replace(/\/+$/, "")}/__v39/workspace-runtime`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (response.status !== 200) return false;
    const json: any = await response.json().catch(() => null);
    return json?.status === "PASS";
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const authId = required("--auth").toUpperCase();
  const expectedHead = required("--expected-head").toLowerCase();
  const budgetDayId = required("--probe-budget-day-id");
  const statusPath = path.resolve(required("--status"));
  const heartbeatPath = path.resolve(required("--heartbeat"));
  const pidPath = path.resolve(required("--pid-file"));
  const logPath = path.resolve(required("--log"));

  const blockers: string[] = [];
  for (const file of [statusPath, heartbeatPath, pidPath, logPath]) {
    if (!fs.existsSync(file)) blockers.push(`missing_artifact:${path.basename(file)}`);
  }
  if (blockers.length) {
    console.log(JSON.stringify({
      schema: "v39.phase2g-stage1-unattended-health.v1",
      status: "BLOCKED_DO_NOT_RELAUNCH",
      mutation_performed: false,
      provider_paid_action_performed: false,
      blockers,
      next: "Keep the user awake and inspect the exact launch artifacts; never start a second paid probe.",
    }, null, 2));
    process.exitCode = 2;
    return;
  }

  const status = readJson(statusPath);
  const heartbeat = readJson(heartbeatPath);
  const supervisorPid = Number(fs.readFileSync(pidPath, "utf8").trim());
  const logSize = fs.statSync(logPath).size;
  const now = Date.now();
  const heartbeatMs = Date.parse(String(heartbeat.observed_at_utc ?? ""));
  const heartbeatAgeSeconds = Number.isFinite(heartbeatMs) ? Math.max(0, Math.floor((now - heartbeatMs) / 1000)) : null;

  if (!processAlive(supervisorPid)) blockers.push("supervisor_process_not_alive");
  if (status.state !== "RUNNING") blockers.push(`supervisor_status=${String(status.state ?? "missing")}`);
  if (heartbeat.state !== "RUNNING") blockers.push(`heartbeat_status=${String(heartbeat.state ?? "missing")}`);
  if (heartbeatAgeSeconds === null || heartbeatAgeSeconds > 90) blockers.push(`heartbeat_stale_seconds=${heartbeatAgeSeconds ?? "invalid"}`);
  if (status.authorization_id !== authId || heartbeat.authorization_id !== authId) blockers.push("auth_id_artifact_mismatch");
  if (String(status.git_head ?? "").toLowerCase() !== expectedHead || String(heartbeat.git_head ?? "").toLowerCase() !== expectedHead) {
    blockers.push("git_head_artifact_mismatch");
  }
  if (status.probe_budget_day_id !== budgetDayId || heartbeat.probe_budget_day_id !== budgetDayId) {
    blockers.push("budget_day_artifact_mismatch");
  }
  if (Number(heartbeat.callback_consecutive_failures ?? 0) !== 0 || heartbeat.callback_watchdog_triggered === true) {
    blockers.push("callback_watchdog_not_clean");
  }
  if (logSize <= 0) blockers.push("persistent_log_empty");

  const incidents = await pool.query(`SELECT count(*)::int AS n FROM clean.adb_incident_stop WHERE resolved=false`);
  const openIncidents = Number(incidents.rows[0]?.n ?? -1);
  if (openIncidents !== 0) blockers.push(`open_incidents=${openIncidents}`);

  const probes = await pool.query(
    `SELECT probe_id,icao,status,runtime_session_id FROM clean.adb_anchor_probe
      WHERE stage=1 AND probe_budget_day_id=$1 AND status='probing'
      ORDER BY recorded_at ASC`,
    [budgetDayId],
  );
  const probingCount = probes.rowCount ?? probes.rows.length;
  if (probingCount !== 1) blockers.push(`probing_rows=${probingCount}`);

  let runtimeSessionState: string | null = null;
  let providerSubscriptionBound = false;
  let exactOwnedSubscriptionActive = false;
  let foreignActiveBillable = -1;
  let callbackBase = String(status.callback_base ?? "").replace(/\/+$/, "");

  if (probingCount === 1) {
    const probeId = Number(probes.rows[0].probe_id);
    const sessions = await pool.query(
      `SELECT session_id,state,provider_subscription_id
         FROM clean.prepaid_probe_session_runtime
        WHERE owner_kind='anchor_probe' AND owner_probe_id=$1 AND stage=1
          AND state IN ('armed','active','settling')
        ORDER BY created_at_utc DESC`,
      [probeId],
    );
    const sessionCount = sessions.rowCount ?? sessions.rows.length;
    if (sessionCount !== 1) {
      blockers.push(`active_runtime_sessions=${sessionCount}`);
    } else {
      const session = sessions.rows[0];
      runtimeSessionState = String(session.state ?? "");
      if (runtimeSessionState !== "active") blockers.push(`runtime_session_state=${runtimeSessionState || "missing"}`);
      const providerSubscriptionId = session.provider_subscription_id ? String(session.provider_subscription_id) : null;
      providerSubscriptionBound = Boolean(providerSubscriptionId);
      if (!providerSubscriptionId) blockers.push("provider_subscription_not_bound");

      const subscriptions = await listSubscriptionsStrict();
      const activeBillable = subscriptions.filter((subscription) => subscription.isActive && subscription.billingType !== "LifetimeBased");
      const exactOwned = providerSubscriptionId
        ? activeBillable.filter((subscription) => subscription.id === providerSubscriptionId && subscription.billingType === "CreditBased")
        : [];
      exactOwnedSubscriptionActive = exactOwned.length === 1;
      foreignActiveBillable = providerSubscriptionId
        ? activeBillable.filter((subscription) => subscription.id !== providerSubscriptionId).length
        : activeBillable.length;
      if (!exactOwnedSubscriptionActive) blockers.push("exact_owned_credit_subscription_not_active");
      if (foreignActiveBillable !== 0) blockers.push(`foreign_active_billable=${foreignActiveBillable}`);
    }
  }

  const callbackReachable = await callbackHealthy(callbackBase);
  if (!callbackReachable) blockers.push("workspace_callback_not_reachable");

  const result = {
    schema: "v39.phase2g-stage1-unattended-health.v1",
    status: blockers.length === 0 ? "RUNNING_HEALTHY_UNATTENDED_WINDOW" : "BLOCKED_DO_NOT_RELAUNCH",
    mutation_performed: false,
    provider_paid_action_performed: false,
    authorization_id: authId,
    probe_budget_day_id: budgetDayId,
    supervisor_alive: processAlive(supervisorPid),
    heartbeat_age_seconds: heartbeatAgeSeconds,
    persistent_log_bytes: logSize,
    open_incidents: openIncidents,
    probing_rows: probingCount,
    runtime_session_state: runtimeSessionState,
    provider_subscription_bound: providerSubscriptionBound,
    exact_owned_credit_subscription_active: exactOwnedSubscriptionActive,
    foreign_active_billable_subscriptions: foreignActiveBillable,
    callback_base: callbackBase || null,
    callback_reachable: callbackReachable,
    blockers,
    host_failure_boundary: "This proves the current Replit workspace/process/callback path is healthy now; it does not provide an independent external cleanup agent if the entire Replit workspace is terminated.",
    next: blockers.length === 0
      ? "Keep the Mac plugged in, awake, lid open, network connected, and Replit workspace active. Do not relaunch the paid probe."
      : "Stay awake and inspect status/heartbeat/log/database/provider state. Do not launch a second paid probe.",
  };
  console.log(JSON.stringify(result, null, 2));
  if (blockers.length) process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      schema: "v39.phase2g-stage1-unattended-health.v1",
      status: "BLOCKED_DO_NOT_RELAUNCH",
      mutation_performed: false,
      provider_paid_action_performed: false,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
