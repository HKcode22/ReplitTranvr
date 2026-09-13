import "dotenv/config";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

const OWNER_ENV = "V39_PRODUCTION_DATABASE_OWNER_URL";
const RUNTIME_ENV = "V39_DATABASE_RUNTIME_URL";
const TARGET_CONFIRM_ENV = "V39_DATABASE_TARGET_CONFIRM";
const APPLY_CONFIRM_ENV = "V39_PHASE2D_SCHEMA_CONTRACT_APPLY";
const MIGRATION = "0057_phase2d_tier_source_contract.sql";
const LEGACY_CONSTRAINT = "adb_sampling_frame_tier_source_check";
const CURRENT_CONSTRAINT = "adb_sampling_frame_tier_source_check_v2";
const ALLOWED_VALUES = new Set(["curated", "unclassified", "traffic_reference", "missing_reference"]);

function safeDbLabel(url: string): string {
  const parsed = new URL(url);
  return `${parsed.hostname}/${parsed.pathname.replace(/^\//, "") || "<database>"}`;
}

function sameDatabaseTarget(a: string, b: string): boolean {
  const ua = new URL(a);
  const ub = new URL(b);
  return ua.hostname === ub.hostname && ua.port === ub.port && ua.pathname === ub.pathname;
}

function sha256(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

async function constraintDefinitions(pool: Pool): Promise<Map<string, string>> {
  const result = await pool.query(
    `SELECT conname, pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
      WHERE conrelid='clean.adb_sampling_frame'::regclass
        AND conname = ANY($1::text[])
      ORDER BY conname`,
    [[LEGACY_CONSTRAINT, CURRENT_CONSTRAINT]],
  );
  return new Map(result.rows.map((row) => [String(row.conname), String(row.definition)]));
}

function assertCurrentDefinition(definition: string | undefined): void {
  if (!definition) throw new Error(`BLOCKED:${CURRENT_CONSTRAINT}_MISSING_AFTER_APPLY`);
  for (const value of ALLOWED_VALUES) {
    if (!definition.includes(`'${value}'`)) {
      throw new Error(`BLOCKED:${CURRENT_CONSTRAINT}_MISSING_VALUE:${value}`);
    }
  }
}

async function main(): Promise<void> {
  if (String(process.env[TARGET_CONFIRM_ENV] ?? "").trim().toLowerCase() !== "production") {
    throw new Error(`BLOCKED:${TARGET_CONFIRM_ENV}=production required`);
  }
  if (String(process.env[APPLY_CONFIRM_ENV] ?? "").trim() !== "1") {
    throw new Error(`BLOCKED:${APPLY_CONFIRM_ENV}=1 required for the exact Phase-2D schema-contract repair`);
  }

  const ownerUrl = String(process.env[OWNER_ENV] ?? "").trim();
  const runtimeUrl = String(process.env[RUNTIME_ENV] ?? "").trim();
  if (!ownerUrl) throw new Error(`BLOCKED:${OWNER_ENV}_REQUIRED`);
  if (!runtimeUrl) throw new Error(`BLOCKED:${RUNTIME_ENV}_REQUIRED`);
  if (!sameDatabaseTarget(ownerUrl, runtimeUrl)) {
    throw new Error(`BLOCKED:${OWNER_ENV}_AND_${RUNTIME_ENV}_TARGET_MISMATCH`);
  }

  const migrationPath = join(process.cwd(), "migrations", MIGRATION);
  const migrationSql = readFileSync(migrationPath, "utf8");
  const migrationSha = sha256(migrationSql);
  const owner = new Pool({ connectionString: ownerUrl });
  const runtime = new Pool({ connectionString: runtimeUrl });

  try {
    const meta = await owner.query("SELECT current_user AS u,current_database() AS db");
    const ownerRole = String(meta.rows[0]?.u ?? "");
    const dbName = String(meta.rows[0]?.db ?? "");
    const runtimeMeta = await runtime.query("SELECT current_user AS u,current_database() AS db");
    const runtimeRole = String(runtimeMeta.rows[0]?.u ?? "");
    const runtimeDb = String(runtimeMeta.rows[0]?.db ?? "");
    if (!ownerRole || !dbName || !runtimeRole || !runtimeDb || dbName !== runtimeDb) {
      throw new Error("BLOCKED:PHASE2D_SCHEMA_TARGET_IDENTITY_INVALID");
    }
    if (ownerRole === runtimeRole) throw new Error("BLOCKED:OWNER_AND_RUNTIME_ROLE_MUST_BE_DISTINCT");
    if (!/^travnr_v39_runtime(?:_recovery\d+)?$/.test(runtimeRole)) {
      throw new Error(`BLOCKED:UNEXPECTED_V39_RUNTIME_ROLE:${runtimeRole}`);
    }

    const values = await owner.query(
      `SELECT DISTINCT tier_source
         FROM clean.adb_sampling_frame
        WHERE tier_source IS NOT NULL
        ORDER BY tier_source`,
    );
    const existingValues = values.rows.map((row) => String(row.tier_source));
    const unexpected = existingValues.filter((value) => !ALLOWED_VALUES.has(value));
    if (unexpected.length) {
      throw new Error(`BLOCKED:UNEXPECTED_EXISTING_TIER_SOURCE_VALUES:${unexpected.join(",")}`);
    }

    const before = await constraintDefinitions(owner);
    if (!before.has(LEGACY_CONSTRAINT) && before.has(CURRENT_CONSTRAINT)) {
      assertCurrentDefinition(before.get(CURRENT_CONSTRAINT));
      console.log(JSON.stringify({
        status: "PASS_ALREADY_APPLIED",
        target: "production",
        database: safeDbLabel(ownerUrl),
        runtime_role: runtimeRole,
        migration: MIGRATION,
        migration_sha256: migrationSha,
        existing_tier_source_values: existingValues,
        constraint: CURRENT_CONSTRAINT,
      }, null, 2));
      return;
    }

    await owner.query(migrationSql);

    const after = await constraintDefinitions(owner);
    if (after.has(LEGACY_CONSTRAINT)) throw new Error(`BLOCKED:${LEGACY_CONSTRAINT}_STILL_PRESENT_AFTER_APPLY`);
    assertCurrentDefinition(after.get(CURRENT_CONSTRAINT));

    // Verify the restricted role can still read the repaired table; never grant
    // privileges here and never expose either connection string.
    await runtime.query("SELECT tier_source FROM clean.adb_sampling_frame LIMIT 0");

    console.log(JSON.stringify({
      status: "PASS_APPLIED",
      target: "production",
      database: safeDbLabel(ownerUrl),
      runtime_role: runtimeRole,
      migration: MIGRATION,
      migration_sha256: migrationSha,
      existing_tier_source_values: existingValues,
      removed_constraint: LEGACY_CONSTRAINT,
      active_constraint: CURRENT_CONSTRAINT,
      active_constraint_definition: after.get(CURRENT_CONSTRAINT),
    }, null, 2));
  } finally {
    await owner.end().catch(() => undefined);
    await runtime.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(String(error?.message ?? error));
  process.exitCode = 1;
});
