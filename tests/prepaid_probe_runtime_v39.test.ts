import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prepaidProbeWebhookUrlV39 } from "../server/lib/disruption/prepaidProbeRuntime_v39";

describe("V3.9 prepaid probe PITR-safe runtime", () => {
  it("uses a session-specific HTTPS webhook before a provider subscription ID exists", () => {
    const session = "123e4567-e89b-42d3-a456-426614174000";
    expect(prepaidProbeWebhookUrlV39("https://travnr.example/api/v1/webhooks/aerodatabox/secret", session))
      .toBe(`https://travnr.example/api/v1/webhooks/aerodatabox/secret/prepaid/${session}`);
    expect(() => prepaidProbeWebhookUrlV39("http://insecure.example/hook", session)).toThrow(/MUST_BE_HTTPS/);
    expect(() => prepaidProbeWebhookUrlV39("https://example.test/hook", "not-a-uuid")).toThrow(/SESSION_ID_INVALID/);
  });

  it("declares all provider-identifying runtime tables UNLOGGED and bounded to 24h", () => {
    const sql = readFileSync(join(process.cwd(), "migrations", "0055_prepaid_probe_unlogged_runtime.sql"), "utf8");
    expect(sql).toContain("CREATE UNLOGGED TABLE IF NOT EXISTS clean.prepaid_probe_session_runtime");
    expect(sql).toContain("CREATE UNLOGGED TABLE IF NOT EXISTS clean.prepaid_probe_delivery_runtime");
    expect(sql).toContain("CREATE UNLOGGED TABLE IF NOT EXISTS clean.prepaid_probe_item_runtime");
    expect(sql).toContain("expires_at_utc <= created_at_utc + interval '24 hours'");
    expect(sql).toContain("provider_subscription_id TEXT UNIQUE");
  });

  it("keeps provider plaintext fields out of the logged blob metadata migration", () => {
    const sql = readFileSync(join(process.cwd(), "migrations", "0054_provider_blob_storage_boundary.sql"), "utf8");
    expect(sql).toContain("clean.provider_content_blob_ref");
    expect(sql).not.toMatch(/flight_number|aircraft_reg|callsign|latitude|longitude|raw_body\s+json|raw_payload\s+json/i);
  });

  it("registers the unlogged migration after the blob metadata boundary", () => {
    const db = readFileSync(join(process.cwd(), "server", "db.ts"), "utf8");
    const blob = db.indexOf('"0054_provider_blob_storage_boundary.sql"');
    const runtime = db.indexOf('"0055_prepaid_probe_unlogged_runtime.sql"');
    expect(blob).toBeGreaterThan(-1);
    expect(runtime).toBeGreaterThan(blob);
  });
});
