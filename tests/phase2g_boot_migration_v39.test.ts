import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync(
  join(process.cwd(), "server", "db.ts"),
  "utf8",
);
const serverSource = readFileSync(
  join(process.cwd(), "server", "index.ts"),
  "utf8",
);
const harnessSource = readFileSync(
  join(process.cwd(), "scripts", "apply_boot_migrations_v39.ts"),
  "utf8",
);

describe("V3.9 production boot migration wiring", () => {
  it("uses the durable baseline/versioned migration engine", () => {
    expect(dbSource).toContain("runSchemaMigrationsV39");
    expect(dbSource).toContain("dryRun: false");
    expect(dbSource).toContain("durable-v39");
  });

  it("does not retain the legacy root migration replay list", () => {
    expect(dbSource).not.toContain("BOOT_MIGRATIONS");
    expect(dbSource).not.toContain("0062_phase2g_delivery_gap_reconciliation_status.sql");
    expect(dbSource).not.toContain("readFile(");
    expect(dbSource).not.toContain("statement-breakpoint");
  });

  it("keeps CI on the exact same boot function as production", () => {
    expect(serverSource).toContain("await applyBootMigrations()");
    expect(harnessSource).toContain(
      'import { applyBootMigrations, migrationPool, pool } from "../server/db"',
    );
    expect(harnessSource).toContain("await applyBootMigrations()");
  });

  it("fails server startup closed if schema migration fails", () => {
    const marker = 'console.error("Boot migrations failed:"';
    const start = serverSource.indexOf(marker);
    expect(start).toBeGreaterThanOrEqual(0);
    const failureBlock = serverSource.slice(start, start + 250);
    expect(failureBlock).toContain("throw err");
  });

  it("preserves the Phase-6 watchdog startup guard", () => {
    expect(dbSource).toContain("explicitAutoCollectEnabled()");
    expect(dbSource).toContain("startPhase6SafetyWatchdog");
    expect(dbSource).toContain('invokedScript.includes("apply_boot_migrations_v39")');
  });
});
