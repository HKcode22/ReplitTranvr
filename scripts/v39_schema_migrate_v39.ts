import "dotenv/config";
import crypto from "node:crypto";
import { migrationPool, pool } from "../server/db";
import { runSchemaMigrationsV39 } from "../server/lib/disruption/schemaMigration_v39";

function has(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL && !process.env.DATABASE_RUNTIME_URL) {
    throw new Error("DATABASE_URL/DATABASE_RUNTIME_URL not set");
  }
  const result = await runSchemaMigrationsV39(migrationPool, {
    executionId:
      "v39-migrate-" +
      new Date().toISOString().replace(/[-:.TZ]/g, "") +
      "-" +
      crypto.randomUUID().slice(0, 8),
    sourceSha: process.env.GITHUB_SHA ?? null,
    dryRun: has("--dry-run"),
  });
  console.log(JSON.stringify({ schema: "v39.schema-migrate.v1", ...result }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      schema: "v39.schema-migrate.v1",
      status: "FAIL",
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
    await migrationPool.end().catch(() => undefined);
  });