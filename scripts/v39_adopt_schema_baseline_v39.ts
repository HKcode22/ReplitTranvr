import "dotenv/config";
import crypto from "node:crypto";
import { migrationPool, pool } from "../server/db";
import { adoptExistingBaselineV39 } from "../server/lib/disruption/schemaMigration_v39";

function has(flag: string): boolean {
  return process.argv.includes(flag);
}

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`REFUSED: missing required ${name}`);
  return value;
}

function requireSha(name: string, value: string, length: 40 | 64): string {
  const re = length === 40 ? /^[0-9a-f]{40}$/ : /^[0-9a-f]{64}$/;
  if (!re.test(value)) throw new Error(`REFUSED: ${name} is not a lowercase ${length}-hex SHA`);
  return value;
}

async function main(): Promise<void> {
  if (!has("--apply")) {
    throw new Error("REFUSED: baseline adoption requires explicit --apply");
  }
  if (!process.env.DATABASE_URL && !process.env.DATABASE_RUNTIME_URL) {
    throw new Error("REFUSED: DATABASE_URL/DATABASE_RUNTIME_URL not set");
  }

  const expectedBaselineSha256 = requireSha(
    "--expected-baseline-sha",
    required("--expected-baseline-sha"),
    64,
  );
  const evidenceSha256 = requireSha(
    "--evidence-sha",
    required("--evidence-sha"),
    64,
  );
  const sourceSha = requireSha(
    "--source-sha",
    required("--source-sha"),
    40,
  );

  const result = await adoptExistingBaselineV39(migrationPool, {
    expectedBaselineSha256,
    evidenceSha256,
    sourceSha,
    executionId:
      "v39-baseline-adopt-" +
      new Date().toISOString().replace(/[-:.TZ]/g, "") +
      "-" +
      crypto.randomUUID().slice(0, 8),
  });

  console.log(JSON.stringify({
    schema: "v39.schema-baseline-adoption.v1",
    database_schema_mutation: "v39_meta_only",
    project_schema_replay: false,
    ...result,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      schema: "v39.schema-baseline-adoption.v1",
      status: "FAIL",
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
    await migrationPool.end().catch(() => undefined);
  });