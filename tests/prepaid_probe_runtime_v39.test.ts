import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  prepaidProbeWebhookUrlV39,
  resolvePrepaidRawRetentionHoursV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";

describe("V3.9 prepaid probe PITR-safe runtime", () => {
  it("uses a session-specific HTTPS webhook before a provider subscription ID exists", () => {
    const session = "123e4567-e89b-42d3-a456-426614174000";
    expect(prepaidProbeWebhookUrlV39("https://travnr.example/api/v1/webhooks/aerodatabox/secret", session))
      .toBe(`https://travnr.example/api/v1/webhooks/aerodatabox/secret/prepaid/${session}`);
    expect(() => prepaidProbeWebhookUrlV39("http://insecure.example/hook", session)).toThrow(/MUST_BE_HTTPS/);
    expect(() => prepaidProbeWebhookUrlV39("https://example.test/hook", "not-a-uuid")).toThrow(/SESSION_ID_INVALID/);
  });

  it("honors the registry-safe 168h default when the optional prepaid retention override is absent", () => {
    expect(resolvePrepaidRawRetentionHoursV39({} as NodeJS.ProcessEnv)).toBe(168);
    expect(resolvePrepaidRawRetentionHoursV39({
      V39_PREPAID_RAW_RETENTION_HOURS: "",
    } as NodeJS.ProcessEnv)).toBe(168);
    expect(resolvePrepaidRawRetentionHoursV39({
      V39_PREPAID_RAW_RETENTION_HOURS: "24",
    } as NodeJS.ProcessEnv)).toBe(24);

    expect(() => resolvePrepaidRawRetentionHoursV39({
      V39_PREPAID_RAW_RETENTION_HOURS: "0",
    } as NodeJS.ProcessEnv)).toThrow(/MUST_BE_INTEGER_1_TO_168/);

    expect(() => resolvePrepaidRawRetentionHoursV39({
      V39_PREPAID_RAW_RETENTION_HOURS: "169",
    } as NodeJS.ProcessEnv)).toThrow(/MUST_BE_INTEGER_1_TO_168/);
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

  it("registers physical-flight migration 0060 after settling-state migration 0059", () => {
    const db = readFileSync(join(process.cwd(), "server", "db.ts"), "utf8");
    const prior = db.indexOf('"0059_phase2g_settling_state.sql"');
    const physical = db.indexOf('"0060_phase2g_physical_flight_metrics.sql"');

    expect(prior).toBeGreaterThan(-1);
    expect(physical).toBeGreaterThan(prior);
  });

  it("registers the unlogged migration after the blob metadata boundary", () => {
    const db = readFileSync(join(process.cwd(), "server", "db.ts"), "utf8");
    const blob = db.indexOf('"0054_provider_blob_storage_boundary.sql"');
    const runtime = db.indexOf('"0055_prepaid_probe_unlogged_runtime.sql"');
    expect(blob).toBeGreaterThan(-1);
    expect(runtime).toBeGreaterThan(blob);
  });
});

describe("V3.9 physical-flight metric migration 0060", () => {
  it("0060 preserves the existing UNLOGGED item surface and freezes codeshare resolution classes", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "migrations",
        "0060_phase2g_physical_flight_metrics.sql",
      ),
      "utf8",
    );

    // Extend the existing PITR-safe content class; do not invent another
    // provider-plaintext runtime table.
    expect(sql).toContain(
      "ALTER TABLE clean.prepaid_probe_item_runtime",
    );
    expect(sql).not.toMatch(
      /CREATE\s+(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?clean\.prepaid_probe_[a-z0-9_]+/i,
    );

    expect(sql).toContain(
      "ADD COLUMN IF NOT EXISTS codeshare_resolution_status TEXT",
    );
    expect(sql).toContain("'resolved_operator'");
    expect(sql).toContain("'resolved_marketing'");
    expect(sql).toContain("'ambiguous_unknown'");

    expect(sql).toContain(
      "ADD COLUMN IF NOT EXISTS scheduled_gate_in_utc TIMESTAMPTZ",
    );
    expect(sql).toContain(
      "ADD COLUMN IF NOT EXISTS metric_contract_version TEXT",
    );
  });
});
