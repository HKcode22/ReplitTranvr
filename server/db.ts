import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { runSchemaMigrationsV39 } from "./lib/disruption/schemaMigration_v39";

const runtimeConnectionString =
  process.env.DATABASE_RUNTIME_URL || process.env.DATABASE_URL;
const ownerConnectionString =
  process.env.DATABASE_URL || process.env.DATABASE_RUNTIME_URL;

const pool = new Pool({ connectionString: runtimeConnectionString });
const migrationPool = new Pool({ connectionString: ownerConnectionString });

export const db = drizzle(pool, { schema });
export { pool, migrationPool };

function explicitAutoCollectEnabled(): boolean {
  const raw = String(process.env.ADB_AUTO_COLLECT ?? "")
    .trim()
    .toLowerCase();
  return ["1", "true", "on", "yes"].includes(raw);
}

let bootMigrationsApplied = false;
let phase6SafetyStarted = false;

/**
 * Production schema bootstrap/update path.
 *
 * - Empty database: applies the newest committed B#### baseline once, followed
 *   by any V#### migrations newer than that baseline.
 * - Existing adopted database: verifies durable history/checksums and applies
 *   only pending V#### migrations.
 * - Never replays the retired root-level 0002-0062 legacy chain.
 */
export async function applyBootMigrations(): Promise<void> {
  if (bootMigrationsApplied) return;
  bootMigrationsApplied = true;

  try {
    const result = await runSchemaMigrationsV39(migrationPool, {
      executionId:
        "server-boot-" +
        new Date().toISOString().replace(/[-:.TZ]/g, "") +
        "-" +
        process.pid,
      sourceSha:
        process.env.GITHUB_SHA ??
        process.env.REPLIT_GIT_COMMIT_SHA ??
        null,
      dryRun: false,
    });

    console.log(
      `[migrations] durable-v39 applied=${result.applied.length} pending=${result.pending.length}`,
    );
    for (const file of result.applied) {
      console.log(`[migrations] applied ${file}`);
    }

    if (explicitAutoCollectEnabled() && !phase6SafetyStarted) {
      const invokedScript = String(process.argv[1] ?? "");
      if (!invokedScript.includes("apply_boot_migrations_v39")) {
        const { startPhase6SafetyWatchdog } = await import(
          "./lib/disruption/phase6SafetyWatchdog_v39"
        );
        startPhase6SafetyWatchdog();
        phase6SafetyStarted = true;
        console.log("[v39-phase6-safety] frozen safety watchdog started");
      }
    }
  } catch (err: any) {
    bootMigrationsApplied = false;
    console.error(
      "[migrations] durable migration/safety initialization failed:",
      err?.message || err,
    );
    throw err;
  }
}
