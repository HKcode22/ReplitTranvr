import "dotenv/config";
import { v39Pool } from "../server/lib/disruption/db_v39";

const REQUIRED_TIER_SOURCES = ["curated", "unclassified", "traffic_reference", "missing_reference"] as const;

async function main(): Promise<void> {
  try {
    const columns = await v39Pool.query(
      `SELECT column_name,is_nullable
         FROM information_schema.columns
        WHERE table_schema='clean'
          AND table_name='adb_sampling_frame'
          AND column_name = ANY($1::text[])`,
      [["tier", "tier_source", "region", "tier_verified", "frame_version", "frame_hash"]],
    );
    const byColumn = new Map(columns.rows.map((row) => [String(row.column_name), String(row.is_nullable)]));
    for (const required of ["tier", "tier_source", "region", "tier_verified", "frame_version", "frame_hash"]) {
      if (!byColumn.has(required)) throw new Error(`BLOCKED:PHASE2D_SCHEMA_COLUMN_MISSING:${required}`);
    }
    if (byColumn.get("region") !== "YES") throw new Error("BLOCKED:PHASE2D_SCHEMA_REGION_MUST_BE_NULLABLE");

    const constraints = await v39Pool.query(
      `SELECT conname,pg_get_constraintdef(oid) AS definition
         FROM pg_constraint
        WHERE conrelid='clean.adb_sampling_frame'::regclass
          AND conname = ANY($1::text[])
        ORDER BY conname`,
      [[
        "adb_sampling_frame_tier_check",
        "adb_sampling_frame_tier_check_v2",
        "adb_sampling_frame_tier_source_check",
        "adb_sampling_frame_tier_source_check_v2",
      ]],
    );
    const defs = new Map(constraints.rows.map((row) => [String(row.conname), String(row.definition)]));
    if (defs.has("adb_sampling_frame_tier_check")) throw new Error("BLOCKED:PHASE2D_SCHEMA_LEGACY_TIER_CHECK_PRESENT");
    const tierDef = defs.get("adb_sampling_frame_tier_check_v2");
    if (!tierDef || !tierDef.includes("'UNCLASSIFIED'")) throw new Error("BLOCKED:PHASE2D_SCHEMA_TIER_CHECK_V2_REQUIRED");
    if (defs.has("adb_sampling_frame_tier_source_check")) {
      throw new Error("BLOCKED:PHASE2D_SCHEMA_0057_REQUIRED:legacy_tier_source_check_present");
    }
    const sourceDef = defs.get("adb_sampling_frame_tier_source_check_v2");
    if (!sourceDef) throw new Error("BLOCKED:PHASE2D_SCHEMA_0057_REQUIRED:tier_source_check_v2_missing");
    for (const value of REQUIRED_TIER_SOURCES) {
      if (!sourceDef.includes(`'${value}'`)) {
        throw new Error(`BLOCKED:PHASE2D_SCHEMA_TIER_SOURCE_VALUE_MISSING:${value}`);
      }
    }

    console.log(JSON.stringify({
      status: "PASS",
      phase: "2D",
      schema_contract: "0057",
      region_nullable: true,
      unclassified_tier_allowed: true,
      tier_source_constraint: "adb_sampling_frame_tier_source_check_v2",
    }, null, 2));
  } finally {
    await v39Pool.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(String(error?.message ?? error));
  process.exitCode = 1;
});
