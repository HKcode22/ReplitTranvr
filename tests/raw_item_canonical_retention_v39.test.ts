import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("V3.9 raw-item canonical ID retention", () => {
  it("protects the canonical short-ID copy with the one-way raw-item expiry guard", () => {
    const migration = source("migrations/0050_provider_content_scope_expiry.sql");
    expect(migration).toContain("NEW.canonical_flight_instance_id IS NOT NULL");
  });

  it("includes the canonical short-ID copy in the raw expiry candidate and nullification", () => {
    const owner = source("server/lib/disruption/retentionExpiry_v39.ts");
    expect(owner).toContain("canonical_flight_instance_id");
    expect(owner).toContain("canonical_flight_instance_id: r.canonical_flight_instance_id");
    expect(owner).toContain("canonical_flight_instance_id=NULL");
  });
});
