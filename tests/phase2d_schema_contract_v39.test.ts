import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const baseline = readFileSync(
  join(
    root,
    "migrations",
    "baseline",
    "B0062__v39_schema_baseline_20261001.sql",
  ),
  "utf8",
);
const dbOwner = readFileSync(join(root, "server", "db.ts"), "utf8");
const repairOwner = readFileSync(
  join(root, "scripts", "v39_apply_phase2d_schema_contract_v39.ts"),
  "utf8",
);

describe("Phase 2D sampling-frame schema contract", () => {
  it("frozen baseline contains only the final v2 tier-source constraint", () => {
    expect(baseline).toContain("adb_sampling_frame_tier_source_check_v2");
    expect(baseline).not.toContain("adb_sampling_frame_tier_source_rule");
  });

  it("preserves all allowed f.8 tier-source values", () => {
    for (const value of [
      "curated",
      "unclassified",
      "traffic_reference",
      "missing_reference",
    ]) {
      expect(baseline).toContain(`'${value}'::text`);
    }
  });

  it("durable boot baseline owns the final schema contract", () => {
    expect(dbOwner).toContain("runSchemaMigrationsV39");
    expect(dbOwner).not.toContain("BOOT_MIGRATIONS");
    expect(baseline).toContain("adb_sampling_frame_tier_source_check_v2");
  });

  it("retires the historical apply path and keeps only read-only contract verification", () => {
    expect(repairOwner).toContain(
      "RETIRED_APPLY_PATH:B0062_BASELINE_OWNS_PHASE2D_SCHEMA_CONTRACT",
    );
    expect(repairOwner).toContain("PASS_BASELINE_CONTRACT_PRESENT");
    expect(repairOwner).toContain("mutation_performed: false");
    expect(repairOwner).not.toContain("owner.query(migrationSql)");
  });
});
