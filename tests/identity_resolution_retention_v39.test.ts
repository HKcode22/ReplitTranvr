import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("V3.9 identity-resolution retention transition", () => {
  it("boots migration 0052 and keeps delete/general mutation forbidden", () => {
    const db = source("server/db.ts");
    const migration = source("migrations/0052_identity_resolution_scope_expiry.sql");
    expect(db).toContain('"0052_identity_resolution_scope_expiry.sql"');
    expect(migration).toContain("provider_identity_expired_at_utc");
    expect(migration).toContain("IF TG_OP='DELETE'");
    expect(migration).toContain("webhook identity resolution ledger is append-only except one-way provider identity expiry");
  });

  it("allows only the one-way resolved identity-field nullification", () => {
    const migration = source("migrations/0052_identity_resolution_scope_expiry.sql");
    expect(migration).toContain("NEW.flight_instance_id IS NULL");
    expect(migration).toContain("NEW.initial_service_date IS NULL");
    expect(migration).toContain("NEW.provider_identity_expired_at_utc IS NOT NULL");
    expect(migration).toContain("NEW.raw_item_sha256 IS NOT DISTINCT FROM OLD.raw_item_sha256");
    expect(migration).toContain("NEW.resolution_status IS NOT DISTINCT FROM OLD.resolution_status");
  });

  it("is owned by the normal raw-provider retention operator", () => {
    const owner = source("server/lib/disruption/retentionExpiry_v39.ts");
    expect(owner).toContain('| "webhook_identity_resolution"');
    expect(owner).toContain("FROM clean.webhook_identity_resolution");
    expect(owner).toContain("provider_identity_expired_at_utc IS NULL");
    expect(owner).toContain("flight_instance_id=NULL");
    expect(owner).toContain("initial_service_date=NULL");
  });
});
