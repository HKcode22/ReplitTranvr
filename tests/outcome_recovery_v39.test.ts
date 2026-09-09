/**
 * Outcome recovery orchestrator tests (0H / gptP0analyze4 #10). Offline.
 */
import { describe, it, expect } from "vitest";
import {
  OUTCOME_REST_UNIT_BUDGET,
  runOutcomeRecoveryForFlight,
  runOutcomeRecoveryCycle,
} from "../server/lib/disruption/outcomeRecoveryOrchestrator_v39";

function fakePool(rows: unknown[] = []) {
  return {
    query: async () => ({ rows, rowCount: 1 }),
  };
}

const NOW = new Date("2026-09-02T12:00:00Z");
const REF = new Date("2026-09-01T10:00:00Z"); // reference arrival

describe("runOutcomeRecoveryForFlight (0H)", () => {
  it("observed target persists and does not schedule further recovery", async () => {
    const res = await runOutcomeRecoveryForFlight(fakePool(), {
      flightInstanceId: "UA123_AB12",
      operationalState: "arrived",
      nowUtc: NOW,
      opportunitiesUsed: 0,
      categoryRemainingUnits: OUTCOME_REST_UNIT_BUDGET,
      targets: [
        { target: "gate_in", actualUtc: new Date("2026-09-01T10:05:00Z"), actualVerified: true, referenceArrivalUtc: REF },
      ],
    });
    expect(res.processed).toBe(1);
    expect(res.observed).toBe(1);
    expect(res.restUnitsConsumed).toBe(0); // observed → no recovery call
    expect(res.nextRecoveryDueUtc).toBeNull();
    expect(res.failures).toEqual([]);
  });

  it("pending target with budget schedules next +30min opportunity", async () => {
    const res = await runOutcomeRecoveryForFlight(fakePool(), {
      flightInstanceId: "UA123_AB12",
      operationalState: "departed",
      nowUtc: new Date("2026-09-01T10:30:00Z"),
      opportunitiesUsed: 0,
      categoryRemainingUnits: 10,
      targets: [
        { target: "gate_in", actualUtc: null, actualVerified: false, referenceArrivalUtc: REF },
      ],
    });
    expect(res.restUnitsConsumed).toBe(1);
    expect(res.deferred).toBe(0);
    expect(res.nextRecoveryDueUtc).not.toBeNull();
    expect(res.nextRecoveryDueUtc!.getTime()).toBe(REF.getTime() + 30 * 60_000);
  });

  it("defer when OUTCOME REST budget is exhausted (never borrow)", async () => {
    const res = await runOutcomeRecoveryForFlight(fakePool(), {
      flightInstanceId: "UA123_AB12",
      operationalState: "departed",
      nowUtc: new Date("2026-09-01T10:30:00Z"),
      opportunitiesUsed: 0,
      categoryRemainingUnits: 0, // exhausted
      targets: [
        { target: "gate_in", actualUtc: null, actualVerified: false, referenceArrivalUtc: REF },
      ],
    });
    expect(res.deferred).toBe(1);
    expect(res.restUnitsConsumed).toBe(0);
  });

  it("persist failure is fail-closed (recorded as failure, not advanced)", async () => {
    const badPool = { query: async () => ({ rows: [], rowCount: 0 }) };
    const res = await runOutcomeRecoveryForFlight(badPool, {
      flightInstanceId: "UA123_AB12",
      operationalState: "departed",
      nowUtc: new Date("2026-09-01T10:30:00Z"),
      opportunitiesUsed: 0,
      categoryRemainingUnits: 10,
      targets: [
        { target: "gate_in", actualUtc: null, actualVerified: false, referenceArrivalUtc: REF },
      ],
    });
    expect(res.failures.join(" ")).toContain("persist-failed");
  });
});

describe("runOutcomeRecoveryCycle (0H)", () => {
  it("bounds recovery to canonical flights and never exceeds the budget", async () => {
    const flights = Array.from({ length: 30 }, (_, i) => ({
      flightInstanceId: `LEG_${i}`,
      operationalState: "departed" as const,
      nowUtc: new Date("2026-09-01T10:30:00Z"),
      opportunitiesUsed: 0,
      categoryRemainingUnits: OUTCOME_REST_UNIT_BUDGET,
      targets: [{ target: "gate_in" as const, actualUtc: null, actualVerified: false, referenceArrivalUtc: REF }],
    }));
    // 30 flights × 1 unit = 30 units, well within the 500-unit budget → all run.
    const { totalConsumed, deferredFlights } = await runOutcomeRecoveryCycle(fakePool(), flights, OUTCOME_REST_UNIT_BUDGET, 1);
    expect(totalConsumed).toBe(30);
    expect(deferredFlights).toEqual([]);
    expect(totalConsumed).toBeLessThanOrEqual(OUTCOME_REST_UNIT_BUDGET);
  });

  it("a tight budget defers flights rather than borrowing", async () => {
    const flights = Array.from({ length: 10 }, (_, i) => ({
      flightInstanceId: `LEG_${i}`,
      operationalState: "departed" as const,
      nowUtc: new Date("2026-09-01T10:30:00Z"),
      opportunitiesUsed: 0,
      categoryRemainingUnits: 2,
      targets: [{ target: "gate_in" as const, actualUtc: null, actualVerified: false, referenceArrivalUtc: REF }],
    }));
    const { totalConsumed, deferredFlights } = await runOutcomeRecoveryCycle(fakePool(), flights, 2, 1);
    expect(totalConsumed).toBe(2);
    expect(deferredFlights.length).toBe(8);
  });
});