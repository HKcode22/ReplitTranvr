import { describe, expect, it } from "vitest";
import {
  computeTierHash,
  verifyFrozenTrafficReference,
  type FrozenTrafficReferenceV39,
} from "../server/lib/disruption/trafficReference_v39";

function fixture(): FrozenTrafficReferenceV39 {
  const airports = [
    { icao: "KLAX", traffic_metric_value: 1000, tier: "HUB" as const, country_iso2: "US", longitude_e: -118.4, airport_timezone: "America/Los_Angeles", out_degree: 100, in_degree: 100, undirected_degree: 120, effective_carriers: 8, intl_share: 0.4 },
    { icao: "OMAA", traffic_metric_value: 500, tier: "MID" as const, country_iso2: "AE", longitude_e: 54.65, airport_timezone: "Asia/Dubai", out_degree: 60, in_degree: 60, undirected_degree: 70, effective_carriers: 4, intl_share: 0.95 },
    { icao: "UUEE", traffic_metric_value: 250, tier: "REGIONAL" as const, country_iso2: "RU", longitude_e: 37.4, airport_timezone: "Europe/Moscow", out_degree: 40, in_degree: 40, undirected_degree: 45, effective_carriers: 3, intl_share: 0.3 },
  ];
  return {
    schema_version: "v3.9-traffic-reference-frozen-1",
    status: "READY_FROZEN_REFERENCE",
    traffic_source_name: "licensed-test-reference",
    traffic_source_version: "2026-08",
    traffic_retrieval_date: "2026-09-01",
    reference_period_start: "2025-09-01",
    reference_period_end: "2026-08-31",
    traffic_metric_name: "scheduled_departures",
    traffic_metric_units: "departures_per_12_month_period",
    hub_cut_metric: 900,
    tier_cut_rule: "fixture deterministic frozen rule",
    raw_reference_sha256: "a".repeat(64),
    tier_hash: computeTierHash(airports),
    license_access_basis: "test fixture only",
    airports,
  };
}

describe("Phase 2 frozen traffic reference", () => {
  it("accepts a complete deterministic 12-month frozen reference", () => {
    const verdict = verifyFrozenTrafficReference(fixture());
    expect(verdict.pass).toBe(true);
    expect(verdict.rowCount).toBe(3);
  });

  it("rejects tier tampering, duplicate ICAO, invalid metrics and invalid period", () => {
    const changed = fixture();
    changed.airports[0] = { ...changed.airports[0], tier: "MID" };
    expect(verifyFrozenTrafficReference(changed).failures).toContain("tier-hash-mismatch");

    const duplicate = fixture();
    duplicate.airports.push({ ...duplicate.airports[0] });
    expect(verifyFrozenTrafficReference(duplicate).failures).toContain("icao-duplicate:KLAX");

    const negative = fixture();
    negative.airports[0] = { ...negative.airports[0], traffic_metric_value: -1 };
    expect(verifyFrozenTrafficReference(negative).failures).toContain("traffic-invalid:KLAX");

    const short = fixture();
    short.reference_period_start = "2026-01-01";
    expect(verifyFrozenTrafficReference(short).failures.some((x) => x.startsWith("reference-period-not-12-months"))).toBe(true);
  });
});
