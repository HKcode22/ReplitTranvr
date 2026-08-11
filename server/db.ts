import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { readFile } from "fs/promises";
import path from "path";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export { pool };

// Boot-time migration runner for additive, idempotent SQL migrations that
// must always be present (e.g. the agency disruption system tables added
// in 0002_agency_disruption_system.sql). Every statement in the listed
// files uses IF NOT EXISTS, so this is safe to re-run on every startup.
//
// Kept separate from the Stripe sync's `runMigrations` (which only owns
// the `stripe` schema) and from `drizzle-kit push` (which is a dev-time
// workflow). This is the equivalent of a tiny in-process migrator for the
// small set of files that need to apply automatically.
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
      // Drizzle-style migrations sometimes split statements with the
      // "--> statement-breakpoint" marker. Our additive SQL doesn't need
      // that, but support it so any future file pasted in here works.
      const blocks = sql
        .split(/-->\s*statement-breakpoint/i)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const block of blocks) {
        await pool.query(block);
      }
      console.log(`[migrations] applied ${file}`);
    } catch (err: any) {
      console.error(`[migrations] failed to apply ${file}:`, err?.message || err);
      throw err;
    }
  }
}
