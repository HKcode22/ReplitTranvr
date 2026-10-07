import "dotenv/config";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { readPhase2gScientificHealthV39 } from "../server/lib/disruption/phase2gScientificHealth_v39";

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}

async function main(): Promise<void> {
  const budgetDay = required("--probe-budget-day-id");

  const probeR = await pool.query(
    `SELECT probe_id,icao,status,runtime_session_id,metric_contract_version,
            window_start,window_end,
            duration_censored,stop_reason,reconciliation_status
       FROM clean.adb_anchor_probe
      WHERE stage=1 AND probe_budget_day_id=$1
      ORDER BY recorded_at DESC
      LIMIT 1`,
    [budgetDay],
  );

  if (!probeR.rowCount) {
    console.log(JSON.stringify({
      schema: "v39.phase2g-scientific-health-snapshot.v1",
      status: "NO_PROBE",
      probe_budget_day_id: budgetDay,
      provider_call: false,
      provider_mutation: false,
      database_mutation: false,
    }, null, 2));
    return;
  }

  const probe = probeR.rows[0];
  const sessionId = probe.runtime_session_id == null
    ? null
    : String(probe.runtime_session_id);

  if (!sessionId) {
    console.log(JSON.stringify({
      schema: "v39.phase2g-scientific-health-snapshot.v1",
      status: "PROBE_HAS_NO_RUNTIME_SESSION_YET",
      probe_budget_day_id: budgetDay,
      probe_id: Number(probe.probe_id),
      icao: String(probe.icao),
      probe_status: String(probe.status),
      metric_contract_version:
        probe.metric_contract_version == null
          ? null
          : String(probe.metric_contract_version),
      provider_call: false,
      provider_mutation: false,
      database_mutation: false,
    }, null, 2));
    return;
  }

  const health = await readPhase2gScientificHealthV39(pool, {
    sessionId,
    metricContractVersion:
      probe.metric_contract_version == null
        ? null
        : String(probe.metric_contract_version),
    windowStartUtc:
      new Date(probe.window_start),
    windowEndUtc:
      new Date(probe.window_end),
  });

  console.log(JSON.stringify({
    schema: "v39.phase2g-scientific-health-snapshot.v1",
    status: health.status,
    probe_budget_day_id: budgetDay,
    probe_id: Number(probe.probe_id),
    icao: String(probe.icao),
    probe_status: String(probe.status),
    duration_censored: probe.duration_censored === true,
    stop_reason: probe.stop_reason == null ? null : String(probe.stop_reason),
    reconciliation_status:
      probe.reconciliation_status == null
        ? null
        : String(probe.reconciliation_status),
    scientific_health: health,
    provider_call: false,
    provider_mutation: false,
    database_mutation: false,
  }, null, 2));

  console.log(
    [
      "SCIENTIFIC_HEALTH",
      `status=${health.status}`,
      `items=${health.counts.totalItemRows}`,
      `resolved=${health.counts.resolvedRows}`,
      `quarantined=${health.counts.quarantinedRows}`,
      `physical_ids=${health.counts.resolvedPhysicalIds}`,
      `exact_groups=${health.counts.exactLegGroups}`,
      `identity_splits=${health.counts.exactLegIdentitySplitGroups}`,
      `resolved_then_quarantined=${health.counts.resolvedThenQuarantinedExactLegGroups}`,
      `key_drift=${health.counts.exactLegProvisionalKeyDriftGroups}`,
      `violations=${health.hard_violations.join(",") || "none"}`,
    ].join(" "),
  );

  if (
    process.argv.includes("--fail-on-contract-violation") &&
    health.hard_violations.length > 0
  ) {
    process.exitCode = 3;
  }
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      schema: "v39.phase2g-scientific-health-snapshot.v1",
      status: "READ_FAILED",
      error: error instanceof Error ? error.message : String(error),
      provider_call: false,
      provider_mutation: false,
      database_mutation: false,
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
