import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const cli = readFileSync(join(process.cwd(), "scripts", "v39_schema_migrate_v39.ts"), "utf8");
const engine = readFileSync(join(process.cwd(), "server", "lib", "disruption", "schemaMigration_v39.ts"), "utf8");

describe("V3.9 migration runner safety surface", () => {
  it("requires explicit --apply for mutation", () => {
    expect(cli).toContain('const apply = has("--apply")');
    expect(cli).toContain("dryRun: !apply");
  });

  it("refuses contradictory apply and dry-run flags", () => {
    expect(cli).toContain("choose exactly one of --apply or --dry-run");
  });

  it("keeps dry-run read-only when migration history does not exist", () => {
    const dryRunPos = engine.indexOf("if (options.dryRun)");
    const ensurePos = engine.indexOf("await ensureHistorySurfaceV39(client)");
    expect(dryRunPos).toBeGreaterThanOrEqual(0);
    expect(ensurePos).toBeGreaterThan(dryRunPos);
    expect(engine).toContain("to_regclass");
    expect(engine).toContain("v39_meta.schema_migration_history");
    expect(engine).toContain("migrationHistoryExistsV39");
  });

  it("uses one PostgreSQL advisory lock around migration ownership", () => {
    expect(engine).toContain("pg_advisory_lock");
    expect(engine).toContain("pg_advisory_unlock");
  });
});