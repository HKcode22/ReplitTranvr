import { pool } from "../server/db";
import { validateGate5Funnel, type Gate5Funnel } from "../server/lib/disruption/gates_v3";

export async function runGate5Owner(): Promise<number> {
  const result = await pool.query(`SELECT
    COUNT(*)::int AS population_total,
    COUNT(*) FILTER (WHERE webhook_captured = true)::int AS captured_in_population,
    0::int AS captured_outside_population,
    COUNT(*) FILTER (WHERE snapshot_created = true)::int AS snapshot_created,
    COUNT(*) FILTER (WHERE snapshot_created = true AND required_features_complete = false)::int AS snapshot_missing_features,
    COUNT(*) FILTER (WHERE outcome_observed = true)::int AS outcome_observed,
    COUNT(*) FILTER (WHERE outcome_observed = false)::int AS outcome_missing
    FROM clean.flight_population`);
  const row = result.rows[0] ?? {};
  const funnel: Gate5Funnel = Object.fromEntries(Object.entries({
    populationTotal: row.population_total, capturedInPopulation: row.captured_in_population,
    capturedOutsidePopulation: row.captured_outside_population, snapshotCreated: row.snapshot_created,
    snapshotMissingFeatures: row.snapshot_missing_features, outcomeObserved: row.outcome_observed,
    outcomeMissing: row.outcome_missing,
  }).map(([key, value]) => [key, Number(value ?? 0)])) as unknown as Gate5Funnel;
  const verdict = validateGate5Funnel(funnel);
  const passed = funnel.populationTotal > 0 && verdict.passed;
  console.log(JSON.stringify({ schema: "v39.gate5-evidence.v1", status: passed ? "PASS" : "FAIL", funnel, ...verdict }));
  return passed ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) runGate5Owner().then((code) => { process.exitCode = code; }).catch((error: any) => {
  console.error(JSON.stringify({ schema: "v39.gate5-evidence.v1", status: "FAIL", error: error?.message ?? String(error) }));
  process.exitCode = 1;
});
