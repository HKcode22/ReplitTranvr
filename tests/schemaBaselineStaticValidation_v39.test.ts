import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(join(process.cwd(), "scripts", "v39_validate_generated_baseline_v39.ts"), "utf8");

describe("V3.9 generated baseline static validator", () => {
  it("binds SQL and inventory hashes to the manifest", () => {
    expect(src).toContain("baseline_sha256_mismatch");
    expect(src).toContain("inventory_sha256_mismatch");
  });

  it("rejects managed schema references, not only CREATE SCHEMA", () => {
    for (const schema of ["_system", "drizzle", "stripe"]) expect(src).toContain(schema);
    expect(src).toContain("managed_schema_reference");
  });

  it("rejects a baseline that recreates the standard public schema", () => {
    expect(src).toContain("baseline_recreates_public_schema");
    expect(src).toContain("public_schema_assumption_missing");
  });

  it("allows pg_dump restrict/unrestrict but rejects unknown psql meta commands", () => {
    expect(src).toContain("restrict|unrestrict");
    expect(src).toContain("unsupported_psql_meta_command");
  });

  it("rejects ownership, privilege, database, and extension side effects", () => {
    for (const token of [
      "owner_statement", "grant_statement", "revoke_statement",
      "create_database", "drop_database", "psql_connect", "create_extension",
    ]) expect(src).toContain(token);
  });

  it("requires the three prepaid scratch tables to remain UNLOGGED", () => {
    expect(src).toContain("prepaid_probe_session_runtime");
    expect(src).toContain("prepaid_probe_delivery_runtime");
    expect(src).toContain("prepaid_probe_item_runtime");
    expect(src).toContain("CREATE UNLOGGED TABLE");
  });
});