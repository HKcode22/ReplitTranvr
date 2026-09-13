import { describe, expect, it } from "vitest";
import {
  buildPreprobeReferenceFreezeV39,
  verifyPreprobeReferenceFreezeV39,
  type PreprobeFrameRowV39,
} from "../server/lib/disruption/preprobeReferenceFreeze_v39";
import { computeTierHash, type FrozenTrafficReferenceV39 } from "../server/lib/disruption/trafficReference_v39";

const REGIONS = ["North America", "Europe", "Asia-Pacific", "Gulf/Africa", "South America", "Oceania"];
const HUBS = ["WSSS", "OMAA", "KJFK", "KLAX", "EGLL", "LFPG", "OMDB", "RJTT", "RKSI", "SBGR", "YSSY", "CYYZ", "EDDF", "VHHH"];

function frameRows(): PreprobeFrameRowV39[] {
  return HUBS.map((icao, i) => ({
    icao,
    tier: "HUB",
    tierVerified: true,
    region: REGIONS[i % REGIONS.length],
    preEligible: true,
    postEligible: true,
    trafficMetricValue: 1000 - i * 20,
    outDegree: 100 - i,
    inDegree: 95 - i,
    undirectedDegree: 120 - i,
    effectiveCarriers: 10 - i * 0.2,
    intlShare: 0.3 + (i % 5) * 0.1,
  }));
}

function traffic(): FrozenTrafficReferenceV39 {
  const airports = frameRows().map((row) => ({
    icao: row.icao,
    traffic_metric_value: row.trafficMetricValue!,
    tier: "HUB" as const,
    country_iso2: row.icao === "OMAA" || row.icao === "OMDB" ? "AE" : "US",
    longitude_e: 1,
    airport_timezone: "Etc/UTC",
    out_degree: row.outDegree,
    in_degree: row.inDegree,
    undirected_degree: row.undirectedDegree,
    effective_carriers: row.effectiveCarriers,
    intl_share: row.intlShare,
  }));
  return {
    schema_version: "v3.9-traffic-reference-frozen-1",
    status: "READY_FROZEN_REFERENCE",
    traffic_source_name: "licensed-fixture",
    traffic_source_version: "v1",
    traffic_retrieval_date: "2026-09-12",
    reference_period_start: "2025-09-01",
    reference_period_end: "2026-08-31",
    traffic_metric_name: "scheduled_departures",
    traffic_metric_units: "departures_per_frozen_12_month_period",
    hub_cut_metric: 700,
    tier_cut_rule: "fixture",
    raw_reference_sha256: "a".repeat(64),
    tier_hash: computeTierHash(airports),
    license_access_basis: "fixture",
    airports,
  };
}

const evidence = {
  frozenAtUtc: "2026-09-12T18:00:00Z",
  planSha256: "1".repeat(64),
  prerequisitePArtifactSha256: "2".repeat(64),
  gate1ArtifactSha256: "3".repeat(64),
  frameVersion: "frame_fixture",
  frameHash: "4".repeat(64),
  trafficReferenceArtifactSha256: "5".repeat(64),
  regionMappingVersion: "region-fixture-v1",
  regionMappingHash: "6".repeat(64),
  regionMappingSource: "fixture",
};

describe("Phase 2 hash-locked pre-probe reference freeze", () => {
  it("freezes exactly 12 dual-eligible HUBs including WSSS and OMAA", () => {
    const artifact = buildPreprobeReferenceFreezeV39(frameRows(), traffic(), evidence);
    expect(artifact.shortlist).toHaveLength(12);
    expect(artifact.shortlist.map((row) => row.icao)).toEqual(expect.arrayContaining(["WSSS", "OMAA"]));
    expect(artifact.shortlist.every((row) => row.tier === "HUB" && row.preEligible && row.postEligible)).toBe(true);
    expect(artifact.replacements).toHaveLength(2);
    expect(new Set([...artifact.shortlist, ...artifact.replacements].map((row) => row.icao)).size).toBe(14);
  });

  it("freezes all 18 tier-region diagnostic cells and positive nearest-rank P90 caps", () => {
    const artifact = buildPreprobeReferenceFreezeV39(frameRows(), traffic(), evidence);
    expect(artifact.frame_diagnostics).toHaveLength(18);
    expect(artifact.normalization.method).toBe("nearest-rank-p90-non-null-frame");
    expect(artifact.degreeCap).toBeGreaterThan(0);
    expect(artifact.carriersCap).toBeGreaterThan(0);
    expect(artifact.probe_protocol.capacityGateRowsPerHour).toBe(60);
    expect(artifact.probe_protocol.probeBudgetDayHardCapCredits).toBe(500);
    expect(artifact.probe_protocol.stage1TargetMinutes).toBe(120);
    expect(artifact.probe_protocol.stage2TargetMinutes).toBe(240);
    expect(verifyPreprobeReferenceFreezeV39(artifact)).toBe(true);
  });

  it("computes P90 normalization over all non-null frame airports, not only mapped/tier-verified rows", () => {
    const extra: PreprobeFrameRowV39[] = Array.from({ length: 6 }, (_, i) => ({
      icao: `Z${String(i).padStart(3, "0")}`,
      tier: "UNCLASSIFIED",
      tierVerified: false,
      region: null,
      preEligible: false,
      postEligible: false,
      trafficMetricValue: null,
      outDegree: null,
      inDegree: null,
      undirectedDegree: 900 + i * 10,
      effectiveCarriers: 90 + i,
      intlShare: null,
    }));
    const artifact = buildPreprobeReferenceFreezeV39([...frameRows(), ...extra], traffic(), evidence);
    // 20 non-null values => nearest-rank P90 is rank 18. After the 14 HUB
    // values, the added degree/carrier values occupy ranks 15..20.
    expect(artifact.degreeCap).toBe(930);
    expect(artifact.carriersCap).toBe(93);
  });

  it("is deterministic for the same frozen inputs apart from no mutable runtime state", () => {
    const a = buildPreprobeReferenceFreezeV39(frameRows(), traffic(), evidence);
    const b = buildPreprobeReferenceFreezeV39([...frameRows()].reverse(), traffic(), evidence);
    expect(b).toEqual(a);
  });

  it("rejects tampering and UNSAT candidate sets instead of substituting lower tiers", () => {
    const artifact = buildPreprobeReferenceFreezeV39(frameRows(), traffic(), evidence);
    const tampered = structuredClone(artifact);
    tampered.shortlist[0].trafficMetricValue += 1;
    expect(verifyPreprobeReferenceFreezeV39(tampered)).toBe(false);

    expect(() => buildPreprobeReferenceFreezeV39(frameRows().slice(0, 11), traffic(), evidence)).toThrow(/UNSAT_DUAL_HUB_COUNT/);
    const missingOmaa = frameRows().filter((row) => row.icao !== "OMAA");
    expect(() => buildPreprobeReferenceFreezeV39(missingOmaa, traffic(), evidence)).toThrow(/UNSAT_REQUIRED_DUAL_HUB:OMAA|UNSAT_DUAL_HUB_COUNT/);
  });
});
