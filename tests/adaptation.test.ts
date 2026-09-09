import { describe, it, expect } from "vitest";
import {
  emaUpdate,
  deriveBaseMi,
  deriveMi,
  classifyCompletedObservation,
  classifyZeroYieldObservation,
  transitionZeroYieldState,
  eligibilityForMedianPool,
  calculateMedianEma,
  applyCoverageFloor,
  isCoverageBoostEligible,
  coverageBoostFactor,
  computeRegionalProbabilityVector,
  freezePhase6InitialState,
  DEFAULT_EMA_CONFIG,
  DEFAULT_ZERO_YIELD_CONFIG,
  type ZeroYieldState,
} from "../server/lib/disruption/adaptiveMi_v3";
import {
  resolveFrameTier,
  trafficScore,
  geoScore,
  carrierScore,
  standardizeYieldComponent,
  yieldScore,
  anchorScore,
  passesCapacityGate,
  ANCHOR_CAPACITY_GATE_ROWS_PER_HOUR,
  PROBE_CAP_DAILY,
} from "../server/lib/disruption/adbAirportCatalog_v3";

describe("V3.9-f.8 REGIONAL adaptation", () => {
  it("freezes alpha=.5 and m_i bounds [0.25,1.5] with no warmup", () => {
    expect(DEFAULT_EMA_CONFIG.alpha).toBe(0.5);
    expect(DEFAULT_EMA_CONFIG.lowerBound).toBe(0.25);
    expect(DEFAULT_EMA_CONFIG.upperBound).toBe(1.5);
    expect(DEFAULT_EMA_CONFIG.warmupObservations).toBe(0);
  });

  it("first valid nonempty yield initializes EMA; later values use alpha=.5", () => {
    const ema1 = emaUpdate(null, 0.4);
    const ema2 = emaUpdate(ema1, 0.6);
    const ema3 = emaUpdate(ema2, 0.8);
    expect(ema1).toBe(0.4);
    expect(ema2).toBe(0.5);
    expect(ema3).toBeCloseTo(0.65, 10);
  });

  it("derives m_i from EMA/reference median and clamps exactly", () => {
    expect(deriveBaseMi(null, 0.5)).toBe(1);
    expect(deriveBaseMi(0.5, null)).toBe(1);
    expect(deriveBaseMi(0.1, 1)).toBe(0.25);
    expect(deriveBaseMi(3, 1)).toBe(1.5);
    expect(deriveBaseMi(0.75, 0.5)).toBe(1.5);
  });

  it("repeated zero applies only the transient 0.75 penalty", () => {
    expect(deriveMi(0.5, 0.5, "normal")).toBe(1);
    expect(deriveMi(0.5, 0.5, "zero_yield_once")).toBe(1);
    expect(deriveMi(0.5, 0.5, "zero_yield_repeated")).toBe(0.75);
    expect(deriveMi(0.5, 0.5, "zero_yield_persistent")).toBe(1);
  });

  it("classifies only a successful complete empty provider observation as true zero", () => {
    expect(classifyCompletedObservation({ complete: true, distinctCanonicalFlights: 0 })).toBe("true_zero_yield");
    expect(classifyCompletedObservation({ complete: true, distinctCanonicalFlights: 3 })).toBe("valid_nonempty");
    expect(classifyCompletedObservation({ complete: false, distinctCanonicalFlights: 0 })).toBe("missing");
    expect(classifyCompletedObservation({ complete: true, distinctCanonicalFlights: 0, providerError: true })).toBe("provider_failure");
    expect(classifyCompletedObservation({ complete: true, distinctCanonicalFlights: 0, coverageFailed: true })).toBe("coverage_failed");
  });

  it("provider failure never advances zero FSM", () => {
    const result = transitionZeroYieldState("normal", "provider_failure", DEFAULT_ZERO_YIELD_CONFIG, 0);
    expect(result.newState).toBe("normal");
    expect(result.newConsecutive).toBe(0);
  });

  it("first empty=once, second=repeated, fifth=persistent", () => {
    let state: ZeroYieldState = "normal";
    let consecutive = 0;
    let first: string | null = null;
    for (let i = 1; i <= 5; i++) {
      const r = transitionZeroYieldState(state, "true_zero_yield", DEFAULT_ZERO_YIELD_CONFIG, consecutive, first, `2026-09-0${i}`);
      state = r.newState;
      consecutive = r.newConsecutive;
      first = r.firstZeroYieldDate;
      if (i === 1) expect(state).toBe("zero_yield_once");
      if (i === 2) expect(state).toBe("zero_yield_repeated");
    }
    expect(state).toBe("zero_yield_persistent");
  });

  it("30 calendar days unresolved empties also make state persistent", () => {
    const result = transitionZeroYieldState(
      "zero_yield_repeated",
      "true_zero_yield",
      DEFAULT_ZERO_YIELD_CONFIG,
      2,
      "2026-08-01",
      "2026-08-31",
    );
    expect(result.newState).toBe("zero_yield_persistent");
  });

  it("successful nonempty observation resets zero state", () => {
    const result = transitionZeroYieldState("zero_yield_repeated", "has_yield", DEFAULT_ZERO_YIELD_CONFIG, 4, "2026-08-01", "2026-08-05");
    expect(result.newState).toBe("normal");
    expect(result.newConsecutive).toBe(0);
    expect(result.firstZeroYieldDate).toBeNull();
  });

  it("legacy classifier still refuses to call provider failure a zero", () => {
    expect(classifyZeroYieldObservation(true, false, true)).toBe("provider_failure");
    expect(classifyZeroYieldObservation(false, false, false)).toBe("provider_failure");
  });

  it("median pool includes repeated prior EMA but excludes once/persistent/failures", () => {
    expect(eligibilityForMedianPool("REGIONAL", 0.5, "normal")).toBe(true);
    expect(eligibilityForMedianPool("REGIONAL", 0.5, "zero_yield_repeated")).toBe(true);
    expect(eligibilityForMedianPool("REGIONAL", 0.5, "zero_yield_once")).toBe(false);
    expect(eligibilityForMedianPool("REGIONAL", 0.5, "zero_yield_persistent")).toBe(false);
    expect(eligibilityForMedianPool("REGIONAL", 0.5, "normal", { providerFailure: true })).toBe(false);
    expect(eligibilityForMedianPool("REGIONAL", 0.5, "normal", { coverageFailed: true })).toBe(false);
    expect(eligibilityForMedianPool("MID", 0.5, "normal")).toBe(false);
  });

  it("median calculation is deterministic", () => {
    expect(calculateMedianEma([0.7, 0.3, 0.5])).toBe(0.5);
    expect(calculateMedianEma([0.9, 0.3, 0.7, 0.5])).toBe(0.6);
    expect(calculateMedianEma([])).toBeNull();
  });

  it("does not force the obsolete minimum probability floor", () => {
    expect(applyCoverageFloor(0.0001)).toBe(0.0001);
  });

  it("coverage boost is 1.5 for never observed and >=20d stale, otherwise 1.0", () => {
    expect(isCoverageBoostEligible(null, "2026-09-01")).toBe(true);
    expect(coverageBoostFactor(null, "2026-09-01")).toBe(1.5);
    expect(isCoverageBoostEligible("2026-08-13", "2026-09-01")).toBe(false); // 19d
    expect(coverageBoostFactor("2026-08-13", "2026-09-01")).toBe(1);
    expect(isCoverageBoostEligible("2026-08-12", "2026-09-01")).toBe(true); // 20d
    expect(coverageBoostFactor("2026-08-12", "2026-09-01")).toBe(1.5);
  });

  it("computes normalized REGIONAL p_i from traffic_prior*m_i*coverage_boost", () => {
    const rows = computeRegionalProbabilityVector([
      { icao: "AAAA", trafficPrior: 1, mi: 1, coverageBoost: 1 },
      { icao: "BBBB", trafficPrior: 1, mi: 1.5, coverageBoost: 1 },
      { icao: "CCCC", trafficPrior: 2, mi: 0.5, coverageBoost: 1.5 },
    ]);
    const sum = rows.reduce((s, r) => s + r.probability, 0);
    expect(sum).toBeCloseTo(1, 12);
    expect(rows.find((r) => r.icao === "BBBB")!.drawScore).toBe(1.5);
    expect(rows.find((r) => r.icao === "CCCC")!.drawScore).toBe(1.5);
  });

  it("same adaptive state produces the same probability vector", () => {
    const input = [
      { icao: "BBBB", trafficPrior: 2, mi: 0.5, coverageBoost: 1.5 },
      { icao: "AAAA", trafficPrior: 1, mi: 1.2, coverageBoost: 1 },
    ];
    expect(computeRegionalProbabilityVector(input)).toEqual(computeRegionalProbabilityVector(input));
  });

  it("Phase-6 initial state is always uniform and never probe seeded", () => {
    const withProbe = freezePhase6InitialState(true, 0.5);
    const withoutProbe = freezePhase6InitialState(false, null);
    for (const result of [withProbe, withoutProbe]) {
      expect(result.probeSeeded).toBe(false);
      expect(result.m_i_initial_source).toBe("uniform");
      expect(result.ema_initial_source).toBe("none");
      expect(result.initialMi).toBe(1);
      expect(result.initialEma).toBeNull();
      expect(result.zero_yield_initial_state).toBe("normal");
      expect(result.coverageBoost).toBe(1.5);
    }
  });
});

describe("Phase 0J frame tier + anchor score formulas", () => {
  it("catalog hit resolves a verified tier", () => {
    const r = resolveFrameTier("KLAX");
    expect(r.tier).toBe("HUB");
    expect(r.tierVerified).toBe(true);
  });

  it("missing traffic reference stays UNCLASSIFIED", () => {
    expect(resolveFrameTier("XXXX").tier).toBe("UNCLASSIFIED");
    expect(resolveFrameTier(null).tier).toBe("UNCLASSIFIED");
  });

  it("traffic_score = min(1, metric/hub_cut)", () => {
    expect(trafficScore(100, 100)).toBe(1);
    expect(trafficScore(50, 100)).toBe(0.5);
    expect(trafficScore(200, 100)).toBe(1);
    expect(trafficScore(10, 0)).toBe(0);
  });

  it("geo/carrier scores follow frozen weights", () => {
    expect(geoScore(1, 1, 1)).toBeCloseTo(1, 10);
    expect(carrierScore(0.5, 0.5)).toBeCloseTo(0.5, 10);
  });

  it("invalid yield reference remains null", () => {
    expect(standardizeYieldComponent(0.5, 1)).toBe(0.5);
    expect(standardizeYieldComponent(0.5, 0)).toBeNull();
    expect(yieldScore([null, null, null])).toBeNull();
  });

  it("anchor score uses 40/20/20/20 and capacity is separate", () => {
    expect(anchorScore(1, 1, 1, 1)).toBeCloseTo(1, 10);
    expect(anchorScore(1, 1, 1, null)).toBeNull();
    expect(ANCHOR_CAPACITY_GATE_ROWS_PER_HOUR).toBe(60);
    expect(passesCapacityGate(60)).toBe(true);
    expect(passesCapacityGate(59)).toBe(false);
  });

  it("probe cap remains 500 per immutable probe budget day", () => {
    expect(PROBE_CAP_DAILY).toBe(500);
  });
});
