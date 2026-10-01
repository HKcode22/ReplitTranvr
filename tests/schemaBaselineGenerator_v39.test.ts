import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const src = readFileSync(join(process.cwd(), "scripts", "v39_generate_schema_baseline_v39.sh"), "utf8");

describe("V3.9 baseline generator safety", () => {
  it("is valid bash syntax", () => {
    expect(() => execFileSync("bash", ["-n", join(process.cwd(), "scripts", "v39_generate_schema_baseline_v39.sh")])).not.toThrow();
  });
  it("scopes pg_dump to project-owned clean and public schemas", () => {
    expect(src).toContain("--schema=clean");
    expect(src).toContain("--schema=public");
    expect(src).toContain("--schema-only");
    expect(src).toContain("--no-owner");
    expect(src).toContain("--no-privileges");
  });

  it("normalizes the standard pre-existing public schema", () => {
    expect(src).toContain('awk \'$0 != "CREATE SCHEMA public;"\'');
    expect(src).toContain("baseline still attempts to create pre-existing public schema");
    expect(src).toContain("assumes_standard_public_schema_exists: true");
  });

  it("refuses managed schema leakage", () => {
    expect(src).toContain("_system|drizzle|stripe");
    expect(src).toContain("managed schema leaked into project baseline");
  });

  it("requires a passing live schema inventory before generating a baseline", () => {
    expect(src).toContain("PASS_CORE_V39_SCHEMA_INVENTORY");
  });

  it("proves all three prepaid runtime tables remain UNLOGGED", () => {
    for (const table of [
      "prepaid_probe_session_runtime",
      "prepaid_probe_delivery_runtime",
      "prepaid_probe_item_runtime",
    ]) {
      expect(src).toContain(`CREATE UNLOGGED TABLE clean.${table}`);
    }
  });

  it("refuses to overwrite an existing baseline", () => {
    expect(src).toContain("do not overwrite a baseline in place");
  });
});