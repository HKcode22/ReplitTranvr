import "dotenv/config";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";

async function state() {
  const r = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM clean.adb_anchor_probe WHERE status IN ('probing','settling')) AS active_or_settling,
       (SELECT count(*)::int FROM clean.adb_incident_stop WHERE resolved=false) AS open_incidents,
       EXISTS (
         SELECT 1 FROM pg_constraint
          WHERE conrelid='clean.adb_anchor_probe'::regclass
            AND conname='adb_anchor_probe_status_check'
            AND pg_get_constraintdef(oid) ILIKE '%settling%'
       ) AS settling_status,
       EXISTS (
         SELECT 1 FROM pg_constraint
          WHERE conrelid='clean.adb_anchor_probe'::regclass
            AND conname='adb_anchor_probe_safe_settling_shape'
       ) AS safe_shape,
       to_regclass('clean.idx_adb_anchor_probe_settling') IS NOT NULL AS settling_index`,
  );
  return r.rows[0];
}

async function main(): Promise<void> {
  if (process.argv.includes("--apply")) {
    throw new Error(
      "RETIRED_APPLY_PATH:B0062_BASELINE_OWNS_SETTLING_SCHEMA",
    );
  }

  const current = await state();
  if (
    current.settling_status !== true ||
    current.safe_shape !== true ||
    current.settling_index !== true
  ) {
    throw new Error(
      `BLOCKED:B0062_SETTLING_SCHEMA_CONTRACT_MISSING:${JSON.stringify(current)}`,
    );
  }

  console.log(JSON.stringify({
    schema: "v39.phase2g-settling-schema-status.v2",
    status: "PASS_BASELINE_CONTRACT_PRESENT",
    baseline_owner: "B0062",
    mutation_performed: false,
    provider_call: false,
    provider_mutation: false,
    alert_credits_spent: 0,
    state: current,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      schema: "v39.phase2g-settling-schema-status.v2",
      status: "REFUSED_OR_FAILED",
      provider_call: false,
      provider_mutation: false,
      alert_credits_spent: 0,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
