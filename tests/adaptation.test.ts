/**
 * Tests: Adaptation (§70.11) — adaptive m_i, EMA, zero-yield, median pool
 * 
 * Covers:
 *  - EMA first update
 *  - alpha recurrence
 *  - m_i clamp
 *  - exact median set
 *  - zero-yield state transitions
 *  - provider failure not zero-yield
 *  - 20-day boost if retained
 *  - positive p_i
 *  - deterministic replay
 *  - initial-state freeze
 *  - probe-state seeding rule
 */

import { describe, it, expect } from "vitest";
import {
  emaUpdate,
  calculateMi,
  classifyZeroYieldObservation,
  transitionZeroYieldState,
  eligibilityForMedianPool,
  calculateMedianEma,
  applyCoverageFloor,
  isCoverageBoostEligible,
  freezePhase6InitialState,
  DEFAULT_EMA_CONFIG,
  DEFAULT_ZERO_YIELD_CONFIG,
  DEFAULT_COVERAGE_FLOOR_CONFIG,
  type ZeroYieldState,
  type MiState,
} from "../server/lib/disruption/adaptiveMi_v3";

describe("§70.11 Adaptation", () => {
  describe("EMA calculation", () => {
    it("first observation sets EMA to that value", () => {
      const result = emaUpdate(null, 0.5, DEFAULT_EMA_CONFIG);
      expect(result).toBe(0.5);
    });

    it("EMA recurrence with alpha=0.5", () => {
      // ema_t = 0.5 * x_t + 0.5 * ema_{t-1}
      const ema1 = emaUpdate(null, 0.4, DEFAULT_EMA_CONFIG); // 0.4
      const ema2 = emaUpdate(ema1, 0.6, DEFAULT_EMA_CONFIG); // 0.5*0.6 + 0.5*0.4 = 0.5
      const ema3 = emaUpdate(ema2, 0.8, DEFAULT_EMA_CONFIG); // 0.5*0.8 + 0.5*0.5 = 0.65
      
      expect(ema1).toBe(0.4);
      expect(ema2).toBe(0.5);
      expect(ema3).toBeCloseTo(0.65, 10);
    });

    it("deterministic replay: same sequence produces same result", () => {
      const values = [0.3, 0.5, 0.7, 0.4, 0.6];
      let ema: number | null = null;
      for (const v of values) {
        ema = emaUpdate(ema, v, DEFAULT_EMA_CONFIG);
      }
      
      let ema2: number | null = null;
      for (const v of values) {
        ema2 = emaUpdate(ema2, v, DEFAULT_EMA_CONFIG);
      }
      
      expect(ema).toBe(ema2);
    });
  });

  describe("m_i calculation", () => {
    it("clamps m_i to bounds", () => {
      const state: MiState = {
        value: 0.5,
        ema: 0.5,
        observationCount: 10,
        zeroYieldState: "normal",
        consecutiveZeroYield: 0,
        lastObservationDate: null,
        inWarmup: false,
      };
      
      const result = calculateMi(state, 2.0, DEFAULT_EMA_CONFIG); // way above upper bound
      expect(result.value).toBe(DEFAULT_EMA_CONFIG.upperBound);
      
      // Use a very low EMA state that will produce a value below the lower bound after update
      const lowState: MiState = {
        value: 0.001,
        ema: 0.001,
        observationCount: 10,
        zeroYieldState: "normal",
        consecutiveZeroYield: 0,
        lastObservationDate: null,
        inWarmup: false,
      };
      // ema = 0.5 * 0.0005 + 0.5 * 0.001 = 0.00075, clamped to 0.001
      const result2 = calculateMi(lowState, 0.0005, DEFAULT_EMA_CONFIG);
      expect(result2.value).toBe(DEFAULT_EMA_CONFIG.lowerBound);
    });

    it("warmup phase uses simple average", () => {
      const state: MiState = {
        value: 0.5,
        ema: 0.5,
        observationCount: 2, // < warmupObservations (4)
        zeroYieldState: "normal",
        consecutiveZeroYield: 0,
        lastObservationDate: null,
        inWarmup: true,
      };
      
      const result = calculateMi(state, 0.7, DEFAULT_EMA_CONFIG);
      // Simple average: (0.5 * 2 + 0.7) / 3 = 1.7/3 ≈ 0.5667
      expect(result.ema).toBeCloseTo(0.5667, 3);
      expect(result.observationCount).toBe(3);
    });
  });

  describe("Zero-yield state machine", () => {
    it("provider failure does NOT advance state", () => {
      const result = transitionZeroYieldState("normal", "provider_failure", DEFAULT_ZERO_YIELD_CONFIG, 0);
      expect(result.newState).toBe("normal");
      expect(result.newConsecutive).toBe(0);
    });

    it("has_yield resets to normal", () => {
      const result = transitionZeroYieldState("zero_yield_repeated", "has_yield", DEFAULT_ZERO_YIELD_CONFIG, 5);
      expect(result.newState).toBe("normal");
      expect(result.newConsecutive).toBe(0);
    });

    it("true_zero_yield advances state", () => {
      let state: ZeroYieldState = "normal";
      let consecutive = 0;
      
      // First zero yield
      let result = transitionZeroYieldState(state, "true_zero_yield", DEFAULT_ZERO_YIELD_CONFIG, consecutive);
      expect(result.newState).toBe("zero_yield_once");
      state = result.newState;
      consecutive = result.newConsecutive;
      
      // Second zero yield
      result = transitionZeroYieldState(state, "true_zero_yield", DEFAULT_ZERO_YIELD_CONFIG, consecutive);
      expect(result.newState).toBe("zero_yield_once");
      state = result.newState;
      consecutive = result.newConsecutive;
      
      // Third zero yield → repeated
      result = transitionZeroYieldState(state, "true_zero_yield", DEFAULT_ZERO_YIELD_CONFIG, consecutive);
      expect(result.newState).toBe("zero_yield_repeated");
      state = result.newState;
      consecutive = result.newConsecutive;
      
      // Fourth + fifth → persistent
      for (let i = 0; i < 2; i++) {
        result = transitionZeroYieldState(state, "true_zero_yield", DEFAULT_ZERO_YIELD_CONFIG, consecutive);
        state = result.newState;
        consecutive = result.newConsecutive;
      }
      expect(state).toBe("zero_yield_persistent");
    });

    it("classifyZeroYieldObservation: provider error is NOT zero-yield", () => {
      const result = classifyZeroYieldObservation(true, false, true);
      expect(result).toBe("provider_failure");
    });

    it("classifyZeroYieldObservation: no observation is NOT zero-yield", () => {
      const result = classifyZeroYieldObservation(false, false, false);
      expect(result).toBe("provider_failure");
    });

    it("classifyZeroYieldObservation: flight observed but no delay is true zero-yield", () => {
      const result = classifyZeroYieldObservation(true, false, false);
      expect(result).toBe("true_zero_yield");
    });
  });

  describe("Median reference pool", () => {
    it("only REGIONAL airports enter the pool", () => {
      expect(eligibilityForMedianPool("HUB", 0.5, "normal")).toBe(false);
      expect(eligibilityForMedianPool("MID", 0.5, "normal")).toBe(false);
      expect(eligibilityForMedianPool("REGIONAL", 0.5, "normal")).toBe(true);
    });

    it("null EMA excluded", () => {
      expect(eligibilityForMedianPool("REGIONAL", null, "normal")).toBe(false);
    });

    it("persistent zero-yield excluded", () => {
      expect(eligibilityForMedianPool("REGIONAL", 0.5, "zero_yield_persistent")).toBe(false);
    });

    it("calculateMedianEma: odd count returns middle", () => {
      const result = calculateMedianEma([0.3, 0.5, 0.7]);
      expect(result).toBe(0.5);
    });

    it("calculateMedianEma: even count returns average of middle two", () => {
      const result = calculateMedianEma([0.3, 0.5, 0.7, 0.9]);
      expect(result).toBe(0.6);
    });

    it("calculateMedianEma: empty returns null", () => {
      expect(calculateMedianEma([])).toBeNull();
    });
  });

  describe("Coverage floor", () => {
    it("applies minimum probability", () => {
      const result = applyCoverageFloor(0.0001, DEFAULT_COVERAGE_FLOOR_CONFIG);
      expect(result).toBe(DEFAULT_COVERAGE_FLOOR_CONFIG.minimumPi);
    });

    it("does not reduce higher probabilities", () => {
      const result = applyCoverageFloor(0.1, DEFAULT_COVERAGE_FLOOR_CONFIG);
      expect(result).toBe(0.1);
    });

    it("isCoverageBoostEligible within 20 days", () => {
      const firstIncluded = "2026-08-15";
      const currentDate = "2026-08-25"; // 10 days later
      expect(isCoverageBoostEligible(firstIncluded, currentDate)).toBe(true);
    });

    it("isCoverageBoostEligible after 20 days", () => {
      const firstIncluded = "2026-08-15";
      const currentDate = "2026-09-10"; // 26 days later
      expect(isCoverageBoostEligible(firstIncluded, currentDate)).toBe(false);
    });
  });

  describe("Initial Phase-6 state", () => {
    it("probe results available → seeded", () => {
      const result = freezePhase6InitialState(true, 0.5);
      expect(result.probeSeeded).toBe(true);
      expect(result.m_i_initial_source).toBe("probe_results");
      expect(result.ema_initial_source).toBe("probe_ema");
    });

    it("no probe results → default prior", () => {
      const result = freezePhase6InitialState(false, null);
      expect(result.probeSeeded).toBe(false);
      expect(result.m_i_initial_source).toBe("default_prior");
      expect(result.ema_initial_source).toBe("median_ema");
    });
  });
});
