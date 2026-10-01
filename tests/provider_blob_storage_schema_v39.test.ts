import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = () => readFileSync(join(process.cwd(), "migrations", "baseline", "B0062__v39_schema_baseline_20261001.sql"), "utf8");

describe("V3.9 provider blob metadata-only schema", () => {
  it("stores only opaque blob metadata and bounded retention classes", () => {
    const sql = migration();
    expect(sql).toContain("CREATE TABLE clean.provider_content_blob_ref");
    expect(sql).toContain("raw_provider_content");
    expect(sql).toContain("live_fids_cache");
    expect(sql).toContain("(retention_hours >= 1) AND (retention_hours <= 168)");
    expect(sql).toContain("(retention_hours >= 1) AND (retention_hours <= 24)");
    expect(sql).toContain("content_sha256");
    expect(sql).toContain("content_bytes");
    const start = sql.indexOf("CREATE TABLE clean.provider_content_blob_ref (");
    const end = sql.indexOf("\n);", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const table = sql.slice(start, end);
    expect(table).not.toMatch(
      /flight_number|callsign|latitude|longitude|scheduled_gate|raw_body\s+JSON|raw_payload\s+JSON/i,
    );
  });

  it("allows only the one-way externally verified deletion transition", () => {
    const sql = migration();
    expect(sql).toContain("guard_provider_content_blob_ref");
    expect(sql).toContain("provider content blob metadata is append-only");
    expect(sql).toContain("verified provider content blob tombstone is immutable");
    expect(sql).toContain("NEW.deletion_verified_at_utc IS NOT NULL");
    expect(sql).toContain("NEW.object_name IS NOT DISTINCT FROM OLD.object_name");
    expect(sql).toContain("NEW.content_sha256 IS NOT DISTINCT FROM OLD.content_sha256");
  });

  it("durable boot baseline contains the provider blob metadata boundary", () => {
    const db = readFileSync(join(process.cwd(), "server", "db.ts"), "utf8");
    const baseline = readFileSync(
      join(
        process.cwd(),
        "migrations",
        "baseline",
        "B0062__v39_schema_baseline_20261001.sql",
      ),
      "utf8",
    );

    expect(db).toContain("runSchemaMigrationsV39");
    expect(baseline).toContain("CREATE TABLE clean.provider_content_blob_ref");
    expect(baseline).toContain("guard_provider_content_blob_ref");
  });
});
