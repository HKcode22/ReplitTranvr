import { describe, expect, it } from "vitest";
import {
  buildFrozenTrafficReferenceV39,
  type NormalizedScheduleRouteRowV39,
  type TrafficTierPolicyV39,
} from "../server/lib/disruption/trafficReferenceBuilder_v39";

const ICAOS = ["K001", "K002", "K003", "K004", "K005", "K006", "K007", "K008", "K009", "K010"];

function rows(): NormalizedScheduleRouteRowV39[] {
  const out: NormalizedScheduleRouteRowV39[] = [];
  for (let i = 0; i < ICAOS.length; i += 1) {
    const origin = ICAOS[i];
    const destination = ICAOS[(i + 1) % ICAOS.length];
    const originCountry = i % 2 === 0 ? "US" : "CA";
    const destinationCountry = (i + 1) % 2 === 0 ? "US" : "CA";
    const total = 200 - i * 10;
    out.push({
      origin_icao: origin,
      destination_icao: destination,
      operating_carrier: "AA",
      origin_country_iso2: originCountry,
      destination_country_iso2: destinationCountry,
      origin_longitude_e: -120 + i,
      destination_longitude_e: -120 + ((i + 1) % ICAOS.length),
      origin_timezone: "Etc/UTC",
      destination_timezone: "Etc/UTC",
      scheduled_departures: Math.round(total * 0.8),
    });
    out.push({
      origin_icao: origin,
      destination_icao: destination,
      operating_carrier: "BB",
      origin_country_iso2: originCountry,
      destination_country_iso2: destinationCountry,
      origin_longitude_e: -120 + i,
      destination_longitude_e: -120 + ((i + 1) % ICAOS.length),
      origin_timezone: "Etc/UTC",
      destination_timezone: "Etc/UTC",
      scheduled_departures: Math.round(total * 0.2),
    });
  }
  return out;
}

const metadata = {
  trafficSourceName: "licensed-normalized-fixture",
  trafficSourceVersion: "fixture-v1",
  trafficRetrievalDate: "2026-09-12",
  referencePeriodStart: "2025-09-01",
  referencePeriodEnd: "2026-08-31",
  rawReferenceSha256: "a".repeat(64),
  licenseAccessBasis: "fixture test permission",
};

const rankPolicy: TrafficTierPolicyV39 = {
  kind: "rank",
  version: "fixture-rank-10-40-v1",
  hubRankShare: 0.10,
  hubMidCumulativeRankShare: 0.40,
};

const absolutePolicy: TrafficTierPolicyV39 = {
  kind: "absolute",
  version: "fixture-absolute-v1",
  hubMinMetric: 190,
  midMinMetric: 150,
};

describe("Phase 2 normalized schedule traffic-reference builder", () => {
  it("requires the Plan-owned threshold policy instead of inventing a default", () => {
    expect(() => buildFrozenTrafficReferenceV39(rows(), metadata, undefined as never)).toThrow(/TIER_POLICY_REQUIRED/);
  });

  it("freezes an explicitly supplied rank policy with Plan tie ordering", () => {
    const built = buildFrozenTrafficReferenceV39(rows(), metadata, rankPolicy);
    expect(built.hubRankCount).toBe(1);
    expect(built.midRankCount).toBe(3);
    expect(built.regionalRankCount).toBe(6);
    expect(built.reference.airports[0].icao).toBe("K001");
    expect(built.reference.airports[0].tier).toBe("HUB");
    expect(built.reference.airports[1].tier).toBe("MID");
    expect(built.reference.airports[3].tier).toBe("MID");
    expect(built.reference.airports[4].tier).toBe("REGIONAL");
    expect(built.reference.hub_cut_metric).toBe(200);
    expect(built.reference.tier_cut_rule).toContain("kind=rank");
    expect(built.reference.tier_cut_rule).toContain("sort=traffic_metric_desc_then_icao_asc");
  });

  it("supports an explicit absolute policy and sends equality to the higher tier", () => {
    const built = buildFrozenTrafficReferenceV39(rows(), metadata, absolutePolicy);
    const tier = Object.fromEntries(built.reference.airports.map((a) => [a.icao, a.tier]));
    expect(tier.K001).toBe("HUB");
    expect(tier.K002).toBe("HUB"); // 190 == HUB boundary
    expect(tier.K003).toBe("MID");
    expect(tier.K006).toBe("MID"); // 150 == MID boundary
    expect(tier.K007).toBe("REGIONAL");
    expect(built.reference.hub_cut_metric).toBe(190);
    expect(built.reference.tier_cut_rule).toContain("boundary_equality=higher_tier");
  });

  it("computes degree, carrier diversity and international share from the same 12-month reference", () => {
    const built = buildFrozenTrafficReferenceV39(rows(), metadata, rankPolicy);
    const k001 = built.diagnostics.find((row) => row.icao === "K001")!;
    expect(built.weeklyRouteDepartureThreshold).toBe(53);
    expect(k001.outDegree).toBe(1);
    expect(k001.inDegree).toBe(1);
    expect(k001.undirectedDegree).toBe(2);
    expect(k001.carrierCount5Pct).toBe(2);
    expect(k001.effectiveCarriers).toBeCloseTo(1 / (0.8 ** 2 + 0.2 ** 2), 10);
    expect(k001.intlShare).toBe(1);
  });

  it("produces the same frozen reference regardless of input row order", () => {
    const a = buildFrozenTrafficReferenceV39(rows(), metadata, rankPolicy).reference;
    const b = buildFrozenTrafficReferenceV39([...rows()].reverse(), metadata, rankPolicy).reference;
    expect(b).toEqual(a);
  });

  it("fails closed on malformed policy/license/hash/period and conflicting airport metadata", () => {
    expect(() => buildFrozenTrafficReferenceV39(rows(), { ...metadata, licenseAccessBasis: "" }, rankPolicy)).toThrow(/LICENSE_ACCESS_BASIS_MISSING/);
    expect(() => buildFrozenTrafficReferenceV39(rows(), { ...metadata, rawReferenceSha256: "bad" }, rankPolicy)).toThrow(/RAW_REFERENCE_SHA256_INVALID/);
    expect(() => buildFrozenTrafficReferenceV39(rows(), { ...metadata, referencePeriodStart: "2026-01-01" }, rankPolicy)).toThrow(/PERIOD_NOT_12_MONTHS/);
    expect(() => buildFrozenTrafficReferenceV39(rows(), metadata, { ...rankPolicy, hubRankShare: 0.5, hubMidCumulativeRankShare: 0.4 })).toThrow(/HUB_MID_RANK_SHARE_INVALID/);
    expect(() => buildFrozenTrafficReferenceV39(rows(), metadata, { ...absolutePolicy, midMinMetric: 200 })).toThrow(/ABSOLUTE_THRESHOLD_ORDER_INVALID/);

    const conflict = rows();
    conflict.push({ ...conflict[0], origin_country_iso2: "MX" });
    expect(() => buildFrozenTrafficReferenceV39(conflict, metadata, rankPolicy)).toThrow(/METADATA_COUNTRY_CONFLICT:K001/);
  });
});
