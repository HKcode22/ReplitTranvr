import { describe, expect, it } from "vitest";
import {
  AIRPORT_REGION_MAPPING_SOURCE,
  AIRPORT_REGION_MAPPING_VERSION,
  regionForIcao,
} from "../server/lib/disruption/adbAirportCatalog_v3";
import { selectFrameCandidates } from "../server/lib/disruption/adbCollectionController_v3";
import {
  chooseAirportsForRunDay,
  type AirportSamplingState,
  type FrameSamplingCandidate,
  type FrozenRunDaySamplingPlan,
} from "../server/lib/disruption/phase6SamplingDecision_v39";
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

const state = (icao: string, over: Partial<AirportSamplingState> = {}): AirportSamplingState => ({
  icao,
  emaYield: null,
  mi: 1,
  zeroYieldState: "normal",
  consecutiveZeroYield: 0,
  firstZeroYieldDate: null,
  lastSuccessfulPhase6ObservationAt: null,
  lastDirectObservationAt: null,
  lastSelectedAt: null,
  providerFailure: false,
  coverageFailed: false,
  stateVersion: 0,
  ...over,
});

const candidate = (
  icao: string,
  tier: "HUB" | "MID" | "REGIONAL",
  region: string,
  trafficPrior = 1,
): FrameSamplingCandidate => ({
  icao, tier, region, trafficPrior, tierPrior: trafficPrior,
  inFrame: true, preEligible: true, postEligible: true, exclusionReason: null,
});

const PLAN: FrozenRunDaySamplingPlan = {
  runDayIndex: 1,
  calendarHash: "a".repeat(64),
  configHash: "b".repeat(64),
  windowStartUtc: new Date("2026-09-10T08:00:00Z"),
  drawType: "NEW_TEMPLATE",
  slotRegions: {
    HUB: "North America",
    MID_A: "Europe",
    MID_B: "Asia-Pacific",
    REGIONAL: "South America",
  },
  anchorIcao: "KLAX",
  pairAirportSet: null,
  frozenDrawSeed: "draw-seed-1",
};

const FRAME: FrameSamplingCandidate[] = [
  candidate("KLAX", "HUB", "North America", 10),
  candidate("EGKK", "MID", "Europe", 5),
  candidate("LFPO", "MID", "Europe", 4),
  candidate("RJTT", "MID", "Asia-Pacific", 7),
  candidate("WSSS", "MID", "Asia-Pacific", 6),
  candidate("SBGR", "REGIONAL", "South America", 2),
  candidate("SABE", "REGIONAL", "South America", 1),
];

describe("Phase 0J frozen production selector", () => {
  it("retires the legacy runtime region-shuffle selector", () => {
    expect(() => selectFrameCandidates([], 42, { HUB: 1, MID: 2, REGIONAL: 1 }))
      .toThrow(/REFUSED_LEGACY_SELECTOR/);
  });

  it("consumes exact frozen slot→region cells deterministically", () => {
    const states = FRAME.map((c) => state(c.icao));
    const a = chooseAirportsForRunDay(PLAN, FRAME, states);
    const b = chooseAirportsForRunDay(PLAN, FRAME, states);
    expect(a).toEqual(b);
    expect(a.selections.map((x) => x.slotId)).toEqual(["HUB", "MID_A", "MID_B", "REGIONAL"]);
    for (const selection of a.selections) {
      expect(selection.targetRegion).toBe(PLAN.slotRegions[selection.slotId]);
      expect(FRAME.some((row) => row.icao === selection.icao && row.region === selection.targetRegion)).toBe(true);
    }
  });

  it("anchor consumes HUB and is never substituted", () => {
    const states = FRAME.map((c) => state(c.icao));
    expect(chooseAirportsForRunDay(PLAN, FRAME, states).selections[0]).toMatchObject({ slotId: "HUB", icao: "KLAX" });
    expect(() => chooseAirportsForRunDay({ ...PLAN, anchorIcao: "KJFK" }, FRAME, states))
      .toThrow(/REFUSED_CELL_EMPTY/);
  });

  it("PAIR_REPLAY uses the exact frozen airport set and makes no new regional draw", () => {
    const first = chooseAirportsForRunDay(PLAN, FRAME, FRAME.map((c) => state(c.icao)));
    const frozen = Object.fromEntries(first.selections.map((s) => [s.slotId, { icao: s.icao, region: s.targetRegion }])) as any;
    const replayPlan: FrozenRunDaySamplingPlan = {
      ...PLAN,
      runDayIndex: 2,
      windowStartUtc: new Date("2026-09-12T08:00:00Z"),
      drawType: "PAIR_REPLAY",
      pairAirportSet: frozen,
      frozenDrawSeed: "different-seed-must-not-redraw",
    };
    const replay = chooseAirportsForRunDay(replayPlan, FRAME, FRAME.map((c) => state(c.icao)));
    expect(replay.selections.map((s) => s.icao)).toEqual(first.selections.map((s) => s.icao));
    expect(replay.selections.every((s) => s.drawType === "PAIR_REPLAY")).toBe(true);
  });

  it("different persisted m_i changes the REGIONAL probability vector", () => {
    const low = chooseAirportsForRunDay(PLAN, FRAME, FRAME.map((c) => state(c.icao, c.icao === "SBGR" ? { emaYield: 0.25 } : c.icao === "SABE" ? { emaYield: 1 } : {})));
    const high = chooseAirportsForRunDay(PLAN, FRAME, FRAME.map((c) => state(c.icao, c.icao === "SBGR" ? { emaYield: 4 } : c.icao === "SABE" ? { emaYield: 1 } : {})));
    const lowVec = low.selections.find((s) => s.slotId === "REGIONAL")!.probabilityVector!;
    const highVec = high.selections.find((s) => s.slotId === "REGIONAL")!.probabilityVector!;
    expect(lowVec).not.toEqual(highVec);
    expect(lowVec.reduce((n, x) => n + x.probability, 0)).toBeCloseTo(1, 12);
    expect(highVec.reduce((n, x) => n + x.probability, 0)).toBeCloseTo(1, 12);
  });
});
