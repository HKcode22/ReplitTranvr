import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(join(process.cwd(), "scripts", "v39_compare_schema_inventories_v39.ts"), "utf8");

describe("V3.9 schema inventory comparator", () => {
  it("compares all structural schema sections", () => {
    for (const name of ["relations","columns","constraints","indexes","triggers","functions","sequences","user_defined_types"]) {
      expect(src).toContain(`name: "${name}"`);
    }
  });
  it("scopes exact comparison to project-owned clean/public schemas", () => {
    expect(src).toContain('row?.[key] === "clean"');
    expect(src).toContain('row?.[key] === "public"');
  });
  it("requires the three Phase-2G runtime tables to remain UNLOGGED", () => {
    expect(src).toContain("prepaid_probe_session_runtime");
    expect(src).toContain("prepaid_probe_delivery_runtime");
    expect(src).toContain("prepaid_probe_item_runtime");
    expect(src).toContain('"UNLOGGED"');
  });
});