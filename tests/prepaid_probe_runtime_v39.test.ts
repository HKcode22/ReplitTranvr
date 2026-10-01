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
    const sql = readFileSync(join(process.cwd(), "migrations", "baseline", "B0062__v39_schema_baseline_20261001.sql"), "utf8");
    expect(sql).toContain("CREATE UNLOGGED TABLE clean.prepaid_probe_session_runtime");
    expect(sql).toContain("CREATE UNLOGGED TABLE clean.prepaid_probe_delivery_runtime");
    expect(sql).toContain("CREATE UNLOGGED TABLE clean.prepaid_probe_item_runtime");
    expect(sql).toContain("expires_at_utc <= (created_at_utc + '24:00:00'::interval)");
    expect(sql).toContain("provider_subscription_id text");
  });

  it("keeps provider plaintext fields out of the logged blob metadata migration", () => {
    const sql = readFileSync(join(process.cwd(), "migrations", "baseline", "B0062__v39_schema_baseline_20261001.sql"), "utf8");
    expect(sql).toContain("clean.provider_content_blob_ref");
    expect(sql).not.toMatch(/flight_number|aircraft_reg|callsign|latitude|longitude|raw_body\s+json|raw_payload\s+json/i);
  });

  it("frozen baseline preserves settling and physical-flight metric contracts", () => {
    const baseline = readFileSync(
      join(
        process.cwd(),
        "migrations",
        "baseline",
        "B0062__v39_schema_baseline_20261001.sql",
      ),
      "utf8",
    );

    expect(baseline).toContain("'settling'::text");
    expect(baseline).toContain("v39-physical-flight-instance-v1");
    expect(baseline).toContain("v39-physical-flight-instance-v2");
    expect(baseline).toContain("metric_contract_version");
  });

  it("frozen baseline preserves blob metadata and all three UNLOGGED runtime tables", () => {
    const baseline = readFileSync(
      join(
        process.cwd(),
        "migrations",
        "baseline",
        "B0062__v39_schema_baseline_20261001.sql",
      ),
      "utf8",
    );

    expect(baseline).toContain("CREATE TABLE clean.provider_content_blob_ref");
    expect(baseline).toContain(
      "CREATE UNLOGGED TABLE clean.prepaid_probe_session_runtime",
    );
    expect(baseline).toContain(
      "CREATE UNLOGGED TABLE clean.prepaid_probe_delivery_runtime",
    );
    expect(baseline).toContain(
      "CREATE UNLOGGED TABLE clean.prepaid_probe_item_runtime",
    );
  });
});

describe("V3.9 physical-flight metric baseline contract", () => {
  it("B0062 preserves the existing UNLOGGED item surface and frozen codeshare classes", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "migrations",
        "baseline",
        "B0062__v39_schema_baseline_20261001.sql",
      ),
      "utf8",
    );

    expect(sql).toContain(
      "CREATE UNLOGGED TABLE clean.prepaid_probe_item_runtime",
    );
    expect(sql).toContain("codeshare_resolution_status text");
    expect(sql).toContain("'resolved_operator'::text");
    expect(sql).toContain("'resolved_marketing'::text");
    expect(sql).toContain("'ambiguous_unknown'::text");
    expect(sql).toContain("scheduled_gate_in_utc timestamp with time zone");
    expect(sql).toContain("metric_contract_version text");
  });
});
