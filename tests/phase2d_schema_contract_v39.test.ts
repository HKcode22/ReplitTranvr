import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(join(root, "migrations", "0057_phase2d_tier_source_contract.sql"), "utf8");
const dbOwner = readFileSync(join(root, "server", "db.ts"), "utf8");
const repairOwner = readFileSync(join(root, "scripts", "v39_apply_phase2d_schema_contract_v39.ts"), "utf8");

describe("Phase 2D sampling-frame schema contract", () => {
  it("retires the stale 0021 tier_source check and preserves legacy plus f.8 values", () => {
    expect(migration).toContain("DROP CONSTRAINT adb_sampling_frame_tier_source_check");
    expect(migration).toContain("adb_sampling_frame_tier_source_check_v2");
    for (const value of ["curated", "unclassified", "traffic_reference", "missing_reference"]) {
      expect(migration).toContain(`'${value}'`);
    }
    expect(migration).not.toMatch(/UPDATE\s+clean\.adb_sampling_frame/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+clean\.adb_sampling_frame/i);
  });

  it("keeps 0057 in the production boot migration order", () => {
    expect(dbOwner).toContain('"0056_prepaid_probe_safe_evidence.sql"');
    expect(dbOwner).toContain('"0057_phase2d_tier_source_contract.sql"');
    expect(dbOwner.indexOf('"0057_phase2d_tier_source_contract.sql"'))
      .toBeGreaterThan(dbOwner.indexOf('"0056_prepaid_probe_safe_evidence.sql"'));
  });

  it("requires explicit production owner authorization and never falls back to DATABASE_URL", () => {
    expect(repairOwner).toContain('const OWNER_ENV = "V39_PRODUCTION_DATABASE_OWNER_URL"');
    expect(repairOwner).toContain('const RUNTIME_ENV = "V39_DATABASE_RUNTIME_URL"');
    expect(repairOwner).toContain('const TARGET_CONFIRM_ENV = "V39_DATABASE_TARGET_CONFIRM"');
    expect(repairOwner).toContain('const APPLY_CONFIRM_ENV = "V39_PHASE2D_SCHEMA_CONTRACT_APPLY"');
    expect(repairOwner).not.toContain('process.env.DATABASE_URL');
    expect(repairOwner).not.toContain('process.env.DATABASE_RUNTIME_URL');
  });
});
