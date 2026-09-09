import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { readFile } from "fs/promises";
import path from "path";

const runtimeConnectionString = process.env.DATABASE_RUNTIME_URL || process.env.DATABASE_URL;
const ownerConnectionString = process.env.DATABASE_URL || process.env.DATABASE_RUNTIME_URL;
const pool = new Pool({ connectionString: runtimeConnectionString });
const migrationPool = new Pool({ connectionString: ownerConnectionString });
export const db = drizzle(pool, { schema });
export { pool, migrationPool };

const BOOT_MIGRATIONS: readonly string[] = [
  "0002_agency_disruption_system.sql",
  "0003_travelers_health.sql",
  "0004_confirmation_alert.sql",
  "0005_aircraft_data.sql",
  "0006_test_flight_seeder.sql",
  "0007_user_monitored_flights.sql",
  "0008_resolved_flight_status.sql",
  "0010_flight_data_pre_post.sql",
  "0011_flight_data_pre_post_quality_jsonb.sql",
  "0012_collection_sampling.sql",
  "0014_flight_data_pre_post_drop_dead_columns.sql",
  "0015_collection_v33_sampling_meta.sql",
  "0017_collection_v39_credit_accounting.sql",
  "0018_collection_v39_delivery_failure_flag.sql",
  "0019_collection_v39_population_and_events.sql",
  "0020_collection_v39_airborne_time_series.sql",
  "0021_collection_v39_sampling_frame.sql",
  "0022_collection_v39_design_probability.sql",
  "0023_anchor_probe_results.sql",
  "0024_historical_feature_store.sql",
  "0025_raw_ingress_immutable_layers.sql",
  "0026_snapshot_outcome_tables.sql",
  "0027_probe_budget_day.sql",
  "0028_frame_versioning.sql",
  "0029_fids_population_production.sql",
  "0030_webhook_canonical_identity.sql",
  "0031_retention_tombstone.sql",
  "0032_airborne_canonical_identity.sql",
  "0033_incident_stop.sql",
  "0034_airborne_phase0_conformance.sql",
  "0035_anchor_probe_identity_bounds.sql",
  "0036_webhook_identity_schedule_versions.sql",
  "0037_phase6_sampling_decision_state.sql",
  "0038_phase6_parent_segment_lifecycle.sql",
  "0039_phase6_authorization_and_admission.sql",
  "0040_phase6_calendar_execution_fields.sql",
  "0041_phase6_start_admission_tolerance.sql",
  "0042_webhook_identity_resolution_ledger.sql",
  "0043_phase6_start_time_guard.sql",
  "0044_webhook_attempt_provenance.sql",
  "0045_incident_stop_persistence_cause.sql",
];

let bootMigrationsApplied = false;
export async function applyBootMigrations(): Promise<void> {
  if (bootMigrationsApplied) return;
  bootMigrationsApplied = true;
  const migrationsDir = path.resolve(process.cwd(), "migrations");
  for (const file of BOOT_MIGRATIONS) {
    const full = path.join(migrationsDir, file);
    try {
      const sql = await readFile(full, "utf8");
      const blocks = sql.split(/-->\s*statement-breakpoint/i).map((s) => s.trim()).filter(Boolean);
      for (const block of blocks) await migrationPool.query(block);
      console.log(`[migrations] applied ${file}`);
    } catch (err: any) {
      bootMigrationsApplied = false;
      console.error(`[migrations] failed to apply ${file}:`, err?.message || err);
      throw err;
    }
  }
}