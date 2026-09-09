import { describe, expect, it } from "vitest";
import {
  AIRPORT_REGION_MAPPING_SOURCE,
  AIRPORT_REGION_MAPPING_VERSION,
  regionForIcao,
} from "../server/lib/disruption/adbAirportCatalog_v3";
import { selectFrameCandidates, type EligibleFrameCandidate } from "../server/lib/disruption/adbCollectionController_v3";
import { buildStratifiedFrame } from "../scripts/build_stratified_catalog";

describe("Phase 0J sampling frame", () => {
  it("uses only the frozen explicit mapping and leaves Russia/unknown airports unmapped", () => {
    expect(AIRPORT_REGION_MAPPING_SOURCE).toBeTruthy();
    expect(AIRPORT_REGION_MAPPING_VERSION).toMatch(/v1$/);
    expect(regionForIcao("KJFK")).toBe("North America");
    expect(regionForIcao("UUEE")).toBeNull();
    expect(regionForIcao("KZZZ")).toBeNull();
  });

  it("keeps UNCLASSIFIED and UNMAPPED rows visible with exclusion reasons", () => {
    const result = buildStratifiedFrame({
      fetchedAt: "2026-09-08T00:00:00Z",
      universe: { FlightSchedules: ["XXXX", "UUEE"], FlightLiveUpdates: ["XXXX", "UUEE"] },
      universeUnion: ["XXXX", "UUEE"],
      catalogCount: 276,
      catalogInUniverse: 1,
      catalogMissingFromUniverse: [],
      universeNotInCatalog: ["XXXX"],
    });
    expect(result.frame).toHaveLength(2);
    expect(result.frame.find((row) => row.icao === "XXXX")).toMatchObject({
      tier: "UNCLASSIFIED", region: null, exclusionReason: "UNCLASSIFIED_TIER;UNMAPPED_REGION",
    });
    expect(result.frame.find((row) => row.icao === "UUEE")).toMatchObject({
      tier: "HUB", region: null, exclusionReason: "UNMAPPED_REGION",
    });
  });
});

describe("Phase 0J controller slot selector", () => {
  const regions = ["North America", "Europe", "Asia-Pacific", "Gulf/Africa", "South America", "Oceania"];
  const rows: EligibleFrameCandidate[] = regions.flatMap((region, index) => [
    { icao: `H${index}`, tier: "HUB", trafficPrior: 3, region },
    { icao: `M${index}`, tier: "MID", trafficPrior: 1.5, region },
    { icao: `R${index}`, tier: "REGIONAL", trafficPrior: 1, region },
  ]);
  const mix = { HUB: 1, MID: 2, REGIONAL: 1 } as const;

  it("is deterministic and selects each airport inside its preselected tier x region cell", () => {
    const first = selectFrameCandidates(rows, 4242, mix);
    const second = selectFrameCandidates(rows, 4242, mix);
    expect(first.candidates).toEqual(second.candidates);
    for (const tier of ["HUB", "MID", "REGIONAL"] as const) {
      expect(first.candidates[tier]).toHaveLength(mix[tier]);
      expect(first.candidates[tier].every((icao) => rows.some((row) => row.icao === icao && row.tier === tier))).toBe(true);
    }
  });

  it("refuses an empty selected cell rather than choosing a nonempty substitute", () => {
    const full = selectFrameCandidates(rows, 4242, mix);
    const selectedHub = full.candidates.HUB[0];
    const selectedRegion = rows.find((row) => row.icao === selectedHub)!.region;
    const missingCell = rows.filter((row) => !(row.tier === "HUB" && row.region === selectedRegion));
    expect(() => selectFrameCandidates(missingCell, 4242, mix)).toThrow(/REFUSED_CELL_EMPTY.*HUB/);
  });
});
