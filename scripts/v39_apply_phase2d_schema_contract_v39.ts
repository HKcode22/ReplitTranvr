import "dotenv/config";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";

const LEGACY_CONSTRAINT = "adb_sampling_frame_tier_source_check";
const CURRENT_CONSTRAINT = "adb_sampling_frame_tier_source_check_v2";
const ALLOWED_VALUES = new Set([
  "curated",
  "unclassified",
  "traffic_reference",
  "missing_reference",
]);

async function main(): Promise<void> {
  if (process.argv.includes("--apply")) {
    throw new Error(
      "RETIRED_APPLY_PATH:B0062_BASELINE_OWNS_PHASE2D_SCHEMA_CONTRACT",
    );
  }

  const constraints = await pool.query(
    `SELECT conname, pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
      WHERE conrelid='clean.adb_sampling_frame'::regclass
        AND conname = ANY($1::text[])
      ORDER BY conname`,
    [[LEGACY_CONSTRAINT, CURRENT_CONSTRAINT]],
  );
  const byName = new Map(
    constraints.rows.map((r: any) => [String(r.conname), String(r.definition)]),
  );
  const values = await pool.query(
    `SELECT DISTINCT tier_source
       FROM clean.adb_sampling_frame
      WHERE tier_source IS NOT NULL
      ORDER BY tier_source`,
  );
  const existingValues = values.rows.map((r: any) => String(r.tier_source));
  const unexpected = existingValues.filter((v: string) => !ALLOWED_VALUES.has(v));

  const current = byName.get(CURRENT_CONSTRAINT);
  if (byName.has(LEGACY_CONSTRAINT)) {
    throw new Error(`BLOCKED:${LEGACY_CONSTRAINT}_STILL_PRESENT`);
  }
  if (!current) {
    throw new Error(`BLOCKED:${CURRENT_CONSTRAINT}_MISSING`);
  }
  for (const value of ALLOWED_VALUES) {
    if (!current.includes(`'${value}'`)) {
      throw new Error(`BLOCKED:${CURRENT_CONSTRAINT}_MISSING_VALUE:${value}`);
    }
  }
  if (unexpected.length) {
    throw new Error(
      `BLOCKED:UNEXPECTED_EXISTING_TIER_SOURCE_VALUES:${unexpected.join(",")}`,
    );
  }

  console.log(JSON.stringify({
    schema: "v39.phase2d-schema-contract-status.v2",
    status: "PASS_BASELINE_CONTRACT_PRESENT",
    baseline_owner: "B0062",
    mutation_performed: false,
    active_constraint: CURRENT_CONSTRAINT,
    active_constraint_definition: current,
    existing_tier_source_values: existingValues,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(String(error instanceof Error ? error.message : error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
