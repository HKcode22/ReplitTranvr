/**
 * Production V3.9 boot-migration harness.
 *
 * Calls the exact same applyBootMigrations() function used by server/index.ts.
 * The function now delegates to the durable baseline/versioned migration
 * engine and never replays the retired root-level 0002-0062 legacy chain.
 *
 * Safe CI usage:
 *   export ADB_AUTO_COLLECT=0
 *   npx tsx scripts/apply_boot_migrations_v39.ts
 */

import { applyBootMigrations, migrationPool, pool } from "../server/db";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL && !process.env.DATABASE_RUNTIME_URL) {
    console.error(
      "DATABASE_URL/DATABASE_RUNTIME_URL not set — refusing to run.",
    );
    process.exit(2);
  }

  console.log(
    `migration-apply started_at_utc=${new Date().toISOString()} engine=durable-v39`,
  );

  try {
    await applyBootMigrations();
  } catch (err: any) {
    console.error(
      `migration-apply FAILED: ${err?.message ?? err}`,
    );
    process.exit(1);
  } finally {
    await pool.end().catch(() => undefined);
    await migrationPool.end().catch(() => undefined);
  }

  console.log(
    `migration-apply finished_at_utc=${new Date().toISOString()} result=PASS`,
  );
}

main().catch((e) => {
  console.error("migration-apply crashed:", e?.message ?? e);
  process.exit(1);
});
