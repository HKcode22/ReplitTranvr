import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const cli = readFileSync(join(process.cwd(), "scripts", "v39_adopt_schema_baseline_v39.ts"), "utf8");
const engine = readFileSync(join(process.cwd(), "server", "lib", "disruption", "schemaMigration_v39.ts"), "utf8");

describe("V3.9 baseline adoption safety", () => {
  it("requires explicit apply and exact evidence identities", () => {
    expect(cli).toContain("baseline adoption requires explicit --apply");
    expect(cli).toContain("--expected-baseline-sha");
    expect(cli).toContain("--evidence-sha");
    expect(cli).toContain("--source-sha");
  });

  it("marks adopted baseline separately from applied migrations", () => {
    expect(engine).toContain("installation_mode");
    expect(engine).toMatch(/ADOPTED/);
    expect(engine).toMatch(/APPLIED/);
    expect(engine).toContain("MigrationInstallationModeV39");
  });

  it("records evidence hash and never executes baseline SQL during adoption", () => {
    const start = engine.indexOf("export async function adoptExistingBaselineV39");
    expect(start).toBeGreaterThanOrEqual(0);
    const adoption = engine.slice(start);
    expect(adoption).toContain("evidence_sha256");
    expect(adoption).not.toContain("client.query(baseline.sql)");
  });

  it("refuses live migration replay before adoption", () => {
    expect(engine).toContain("BASELINE_ADOPTION_REQUIRED");
  });
});