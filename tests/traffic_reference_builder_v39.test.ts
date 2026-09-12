import { describe, expect, it } from "vitest";
import {
  buildFrozenTrafficReferenceV39,
  DEFAULT_TRAFFIC_TIER_POLICY_V39,
  type NormalizedScheduleRouteRowV39,
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

describe("Phase 2 normalized schedule traffic-reference builder", () => {
  it("freezes 10/30/60 rank strata with Plan tie ordering and no curated tiers", () => {
    const built = buildFrozenTrafficReferenceV39(rows(), metadata);
    expect(DEFAULT_TRAFFIC_TIER_POLICY_V39.version).toBe("v39-rank-strata-10-30-60-v1");
    expect(built.hubRankCount).toBe(1);
    expect(built.midRankCount).toBe(3);
    expect(built.regionalRankCount).toBe(6);
    expect(built.reference.airports[0].icao).toBe("K001");
    expect(built.reference.airports[0].tier).toBe("HUB");
    expect(built.reference.airports[1].tier).toBe("MID");
    expect(built.reference.airports[3].tier).toBe("MID");
    expect(built.reference.airports[4].tier).toBe("REGIONAL");
    expect(built.reference.hub_cut_metric).toBe(200);
    expect(built.reference.tier_cut_rule).toContain("sort=traffic_metric_desc_then_icao_asc");
  });

  it("computes degree, carrier diversity and international share from the same 12-month reference", () => {
    const built = buildFrozenTrafficReferenceV39(rows(), metadata);
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
    const a = buildFrozenTrafficReferenceV39(rows(), metadata).reference;
    const b = buildFrozenTrafficReferenceV39([...rows()].reverse(), metadata).reference;
    expect(b).toEqual(a);
  });

  it("fails closed on malformed license/hash/period and conflicting airport metadata", () => {
    expect(() => buildFrozenTrafficReferenceV39(rows(), { ...metadata, licenseAccessBasis: "" })).toThrow(/LICENSE_ACCESS_BASIS_MISSING/);
    expect(() => buildFrozenTrafficReferenceV39(rows(), { ...metadata, rawReferenceSha256: "bad" })).toThrow(/RAW_REFERENCE_SHA256_INVALID/);
    expect(() => buildFrozenTrafficReferenceV39(rows(), { ...metadata, referencePeriodStart: "2026-01-01" })).toThrow(/PERIOD_NOT_12_MONTHS/);

    const conflict = rows();
    conflict.push({ ...conflict[0], origin_country_iso2: "MX" });
    expect(() => buildFrozenTrafficReferenceV39(conflict, metadata)).toThrow(/METADATA_COUNTRY_CONFLICT:K001/);
  });
});
