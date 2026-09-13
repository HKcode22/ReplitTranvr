import { describe, expect, it } from "vitest";
import {
  buildFinalFrameRows,
  frameHash,
  normalizeAirportCoverageForFinalFrame,
} from "../scripts/build_final_frame_v39";
import { computeTierHash, type FrozenTrafficReferenceV39 } from "../server/lib/disruption/trafficReference_v39";

function traffic(): FrozenTrafficReferenceV39 {
  const airports = [
    { icao: "KLAX", traffic_metric_value: 1000, tier: "HUB" as const, country_iso2: "US", longitude_e: -118.4, airport_timezone: "America/Los_Angeles", out_degree: 100, in_degree: 100, undirected_degree: 120, effective_carriers: 8, intl_share: 0.4 },
    { icao: "UUEE", traffic_metric_value: 800, tier: "MID" as const, country_iso2: "RU", longitude_e: 37.4, airport_timezone: "Europe/Moscow", out_degree: 50, in_degree: 50, undirected_degree: 60, effective_carriers: 4, intl_share: 0.35 },
    { icao: "UHWW", traffic_metric_value: 300, tier: "REGIONAL" as const, country_iso2: "RU", longitude_e: 131.9, airport_timezone: "Asia/Vladivostok", out_degree: 20, in_degree: 20, undirected_degree: 25, effective_carriers: 2, intl_share: 0.15 },
  ];
  return {
    schema_version: "v3.9-traffic-reference-frozen-1",
    status: "READY_FROZEN_REFERENCE",
    traffic_source_name: "fixture",
    traffic_source_version: "v1",
    traffic_retrieval_date: "2026-09-01",
    reference_period_start: "2025-09-01",
    reference_period_end: "2026-08-31",
    traffic_metric_name: "scheduled_departures",
    traffic_metric_units: "departures",
    hub_cut_metric: 900,
    tier_cut_rule: "fixture",
    raw_reference_sha256: "b".repeat(64),
    tier_hash: computeTierHash(airports),
    license_access_basis: "fixture",
    airports,
  };
}

const coverage = {
  fetchedAt: "2026-09-11T12:00:00Z",
  universe: {
    FlightSchedules: ["KLAX", "UUEE", "UHWW", "KZZZ"],
    FlightLiveUpdates: ["KLAX", "UUEE", "UHWW", "KZZZ"],
    AdsbUpdates: ["KLAX", "UHWW"],
  },
  universeUnion: ["KZZZ", "UHWW", "UUEE", "KLAX"],
};

describe("Phase 2D final frame construction", () => {
  it("normalizes the live collection-controller {feeds, all} shape before frame use", () => {
    const liveShape = {
      fetchedAt: "2026-09-13T07:04:20.817Z",
      feeds: {
        FlightSchedules: ["uuee", "KLAX", "UHWW", "KZZZ", "KLAX"],
        FlightLiveUpdates: ["KLAX", "UUEE", "UHWW", "KZZZ"],
        AdsbUpdates: ["UHWW", "KLAX"],
      },
      all: ["KZZZ", "UHWW", "UUEE", "KLAX"],
      byTier: {},
      worldScheduledCommercial: 0,
    };
    const normalized = normalizeAirportCoverageForFinalFrame(liveShape);
    expect(normalized.universe.FlightSchedules).toEqual(["KLAX", "KZZZ", "UHWW", "UUEE"]);
    expect(normalized.universeUnion).toEqual(["KLAX", "KZZZ", "UHWW", "UUEE"]);
    expect(buildFinalFrameRows(normalized, traffic())).toHaveLength(4);
  });

  it("refuses a live coverage object whose reported all-set disagrees with its feeds", () => {
    expect(() => normalizeAirportCoverageForFinalFrame({
      fetchedAt: "2026-09-13T07:04:20.817Z",
      feeds: {
        FlightSchedules: ["KLAX"],
        FlightLiveUpdates: ["KLAX"],
        AdsbUpdates: ["KLAX"],
      },
      all: ["KLAX", "KZZZ"],
    })).toThrow("BLOCKED:COVERAGE_REMEASUREMENT_SHAPE_INVALID:all_union_mismatch");
  });

  it("uses only frozen traffic tiers and reviewed country/longitude region mapping", () => {
    const rows = buildFinalFrameRows(coverage, traffic());
    const byIcao = new Map(rows.map((row) => [row.icao, row]));

    expect(byIcao.get("KLAX")?.tier).toBe("HUB");
    expect(byIcao.get("KLAX")?.tierSource).toBe("traffic_reference");
    expect(byIcao.get("KLAX")?.region).toBe("North America");

    expect(byIcao.get("UUEE")?.region).toBe("Europe");
    expect(byIcao.get("UHWW")?.region).toBe("Asia-Pacific");
  });

  it("never falls back to the curated catalog when traffic reference is missing", () => {
    const rows = buildFinalFrameRows(coverage, traffic());
    const missing = rows.find((row) => row.icao === "KZZZ");
    expect(missing?.tier).toBe("UNCLASSIFIED");
    expect(missing?.tierVerified).toBe(false);
    expect(missing?.tierSource).toBe("missing_reference");
    expect(missing?.exclusionReason).toContain("MISSING_TRAFFIC_REFERENCE");
  });

  it("records PRE and POST eligibility independently and hashes deterministically", () => {
    const first = buildFinalFrameRows(coverage, traffic());
    const second = buildFinalFrameRows({ ...coverage, universeUnion: [...coverage.universeUnion].reverse() }, traffic());
    expect(first.find((row) => row.icao === "UUEE")?.preEligible).toBe(true);
    expect(first.find((row) => row.icao === "UUEE")?.postEligible).toBe(true);
    expect(frameHash(first)).toBe(frameHash(second));
  });
});
