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
import {
  runSettlement,
  externalSpend,
  reconcileSpend,
  SETTLEMENT_MIN_STABLE_READS,
  type SettlementConfig,
} from "../server/lib/disruption/settlement_v3";

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

describe("Phase 0K: shared settlement service (§1.5.11)", () => {
  const cfg: SettlementConfig = {
    initialWaitSeconds: 0,
    pollIntervalSeconds: 0,
    stableReadCount: 3,
    timeoutSeconds: 60,
  };
  const noSleep = async (_ms: number) => {};

  it("minimum stable reads is 3", () => {
    expect(SETTLEMENT_MIN_STABLE_READS).toBe(3);
  });

  it("three consecutive equal reads settle", async () => {
    const reads = [2900, 2895, 2895, 2895];
    let i = 0;
    const r = await runSettlement(cfg, async () => reads[Math.min(i++, reads.length - 1)], {
      sleep: noSleep,
      nowMs: (() => { let t = 0; return () => (t += 1000); })(),
    });
    expect(r.status).toBe("settled");
    if (r.status === "settled") {
      expect(r.stableBalance).toBe(2895);
      expect(r.readsUsed).toBe(4);
    }
  });

  it("a late change resets stability (needs 3-in-a-row again)", async () => {
    const reads = [2900, 2900, 2899, 2899, 2899];
    let i = 0;
    const r = await runSettlement(cfg, async () => reads[Math.min(i++, reads.length - 1)], {
      sleep: noSleep,
      nowMs: (() => { let t = 0; return () => (t += 1000); })(),
    });
    expect(r.status).toBe("settled");
    if (r.status === "settled") expect(r.stableBalance).toBe(2899);
  });

  it("timeout → SETTLEMENT_UNRESOLVED (never settles on drift)", async () => {
    let n = 2900;
    const r = await runSettlement(
      { ...cfg, timeoutSeconds: 5 },
      async () => n--,
      { sleep: noSleep, nowMs: (() => { let t = 0; return () => { t += 2000; return t; }; })() },
    );
    expect(r.status).toBe("unresolved");
    if (r.status === "unresolved") expect(r.reason).toBe("timeout");
  });

  it("reader failure → unresolved (not settled)", async () => {
    const r = await runSettlement(cfg, async () => null, {
      sleep: noSleep,
      nowMs: (() => { let t = 0; return () => (t += 1000); })(),
    });
    expect(r.status).toBe("unresolved");
  });

  it("C_external = B_before − B_stable", () => {
    expect(externalSpend(2900, 2895)).toBe(5);
  });

  it("Gate-3 reconciliation is exact (tol=0)", () => {
    expect(reconcileSpend({ cExternal: 5, cInternal: 5, tolerance: 0 })).toMatchObject({ match: true, discrepancy: 0 });
    expect(reconcileSpend({ cExternal: 5, cInternal: 4, tolerance: 0 }).match).toBe(false);
  });
});
