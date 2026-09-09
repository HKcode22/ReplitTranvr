/**
 * Phase-0 migration applier — runs the app's OWN applyBootMigrations().
 *
 * This is the exact code path the production server runs on boot
 * (server/db.ts → applyBootMigrations → BOOT_MIGRATIONS in order).
 * Using it (instead of a copy) proves the real boot path works.
 *
 * SAFE BY CONSTRUCTION: every statement in the listed files uses
 * IF NOT EXISTS / guarded DO blocks, per the header comment in db.ts.
 * The runner stops at the first failing file (same as boot).
 *
 * Usage (Replit shell, or any machine that can reach DATABASE_URL):
 *   export ADB_AUTO_COLLECT=0
 *   export DATABASE_URL="<from secrets — never paste into chat/logs/git>"
 *   npx tsx scripts/apply_boot_migrations_v39.ts
 *
 * Exit 0 = every file applied. Nonzero = first failing file + error.
 */

import { applyBootMigrations, pool } from "../server/db";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set — refusing to run.");
    process.exit(2);
  }
  console.log(`migration-apply started_at_utc=${new Date().toISOString()}`);
  try {
    await applyBootMigrations();
  } catch (err: any) {
    console.error(`migration-apply FAILED: ${err?.message ?? err}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
  console.log(`migration-apply finished_at_utc=${new Date().toISOString()} result=PASS`);
}

main().catch((e) => { console.error("migration-apply crashed:", e?.message ?? e); process.exit(1); });
