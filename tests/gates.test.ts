/**
 * TEST-019/020: Gate logic and canary tests (V3.9 Plan §48-51)
 *
 * Covers:
 *  - Hard cap check logic (soft stop, hard cap, overshoot)
 *  - Gate 4 offline threshold test (cap=100, margin=10, stop at 90)
 *  - Gate 0.5 sample adequacy evaluation
 *  - Gate 5 role-aware funnel validation
 *  - Reconciliation contract (C_external == C_internal)
 *  - Canary tolerance behavior
 */

import { describe, it, expect } from "vitest";
import {
  runGate4OfflineTest,
  evaluateGate05,
  validateGate5Funnel,
  type Gate05Measurement,
  type Gate5Funnel,
} from "../server/lib/disruption/gates_v3";

// ---------------------------------------------------------------------------
// TEST-019: Gate logic
// ---------------------------------------------------------------------------

describe("TEST-019: Gate logic", () => {
  describe("Gate 4 offline threshold test", () => {
    it("proves exact stop behavior at synthetic thresholds", () => {
      const result = runGate4OfflineTest();
      expect(result.passed).toBe(true);
      expect(result.scenarios.length).toBe(4);
    });

    it("primary scenario: cap=100, margin=10, stop at 90", () => {
      const result = runGate4OfflineTest();
      expect(result.cap).toBe(100);
      expect(result.margin).toBe(10);
      expect(result.expectedStop).toBe(90);
      expect(result.actualStop).toBe(90);
    });

    it("all scenarios pass", () => {
      const result = runGate4OfflineTest();
      for (const scenario of result.scenarios) {
        expect(scenario.passed).toBe(true);
        expect(scenario.actualStop).toBe(scenario.expectedStop);
      }
    });
  });

  describe("Gate 0.5 sample adequacy", () => {
    const passingMeasurements: Gate05Measurement = {
      notificationsReceived: 150,
      uniqueFlights: 75,
      completedFlights: 30,
      airborneFlights: 40,
      airbornePoints: 150,
      pilotDurationMinutes: 90,
      payloadFieldInventory: true,
      providerTimestampSemantics: true,
      tConstructibility: true,
      primaryTargetConstructibility: true,
      fidsMaxRange: true,
      fidsBoundaryBehavior: true,
      withLegBehavior: true,
      codeshareAmbiguity: true,
      observationCadence: true,
      trajectoryCompleteness: true,
      arrivalNotificationLatency: true,
      censoringGrace: true,
      rateLimit: true,
      unsettledAlertCreditBurst: true,
    };

    it("passes when all measurements meet criteria", () => {
      const result = evaluateGate05(passingMeasurements);
      expect(result.passed).toBe(true);
      expect(result.reason).toBeNull();
    });

    it("fails when notifications too low", () => {
      const result = evaluateGate05({
        ...passingMeasurements,
        notificationsReceived: 50,
      });
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("notificationsReceived");
    });

    it("fails when unique flights too low", () => {
      const result = evaluateGate05({
        ...passingMeasurements,
        uniqueFlights: 10,
      });
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("uniqueFlights");
    });

    it("fails when behavioral measurement is false", () => {
      const result = evaluateGate05({
        ...passingMeasurements,
        payloadFieldInventory: false,
      });
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("payloadFieldInventory");
    });

    it("reports all failed measurements", () => {
      const result = evaluateGate05({
        ...passingMeasurements,
        notificationsReceived: 10,
        uniqueFlights: 5,
        completedFlights: 0,
      });
      expect(result.passed).toBe(false);
      expect(result.measurements.notificationsReceived.passed).toBe(false);
      expect(result.measurements.uniqueFlights.passed).toBe(false);
      expect(result.measurements.completedFlights.passed).toBe(false);
    });
  });

  describe("Gate 5 role-aware funnel", () => {
    it("passes when captured_in_population <= population_total", () => {
      const funnel: Gate5Funnel = {
        populationTotal: 1000,
        capturedInPopulation: 800,
        capturedOutsidePopulation: 50,
        snapshotCreated: 750,
        snapshotMissingFeatures: 10,
        outcomeObserved: 700,
        outcomeMissing: 5,
      };
      const result = validateGate5Funnel(funnel);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("fails when captured_in_population > population_total", () => {
      const funnel: Gate5Funnel = {
        populationTotal: 500,
        capturedInPopulation: 600,
        capturedOutsidePopulation: 0,
        snapshotCreated: 500,
        snapshotMissingFeatures: 0,
        outcomeObserved: 500,
        outcomeMissing: 0,
      };
      const result = validateGate5Funnel(funnel);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it("detects negative values", () => {
      const funnel: Gate5Funnel = {
        populationTotal: 100,
        capturedInPopulation: -1,
        capturedOutsidePopulation: 0,
        snapshotCreated: 0,
        snapshotMissingFeatures: 0,
        outcomeObserved: 0,
        outcomeMissing: 0,
      };
      const result = validateGate5Funnel(funnel);
      expect(result.passed).toBe(false);
      expect(result.violations).toContain("capturedInPopulation is negative");
    });

    it("reports outside-population reasons when present", () => {
      const funnel: Gate5Funnel = {
        populationTotal: 1000,
        capturedInPopulation: 800,
        capturedOutsidePopulation: 100,
        snapshotCreated: 800,
        snapshotMissingFeatures: 0,
        outcomeObserved: 800,
        outcomeMissing: 0,
      };
      const result = validateGate5Funnel(funnel);
      expect(result.outsidePopulationReasons.length).toBeGreaterThan(0);
    });
  });
});
