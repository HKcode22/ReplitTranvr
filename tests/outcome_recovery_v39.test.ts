import { describe, it, expect } from "vitest";
import {
  runOutcomeRecoveryForFlight,
  runOutcomeRecoveryCycle,
  type OutcomeRecoveryDependencies,
} from "../server/lib/disruption/outcomeRecoveryOrchestrator_v39";

function fakePool(rowCount = 1) {
  return { query: async () => ({ rows: [], rowCount }) };
}
const REF = new Date("2026-09-01T10:00:00Z");
const QUERY = {
  sourceAirportIcao: "KLAX",
  fromLocal: "2026-09-01T08:00",
  toLocal: "2026-09-01T12:00",
  populationQueryId: "population-1",
  queryDirection: "Departure" as const,
};
function deps(actual: Date | null = null, calls: string[] = []): OutcomeRecoveryDependencies {
  return {
    recover: async (query) => {
      calls.push(query.populationQueryId);
      return {
        payload: { flight: "canonical-only" },
        evidence: {
          requestHash: "a".repeat(64),
          responseHash: "b".repeat(64),
          retrievedAtUtc: new Date("2026-09-01T10:30:01Z"),
          availableAtUtc: new Date("2026-09-01T10:30:02Z"),
          unitsConsumed: 2,
          physicalAttempts: 1,
        },
      };
    },
    extractVerifiedActual: () => actual,
  };
}

describe("V3.9 outcome recovery", () => {
  it("does not issue a recovery call for an already observed target", async () => {
    const calls: string[] = [];
    const r = await runOutcomeRecoveryForFlight(fakePool(), {
      flightInstanceId: "LEG1", operationalState: "arrived", nowUtc: new Date("2026-09-01T10:30:00Z"),
      opportunitiesUsed: 0, categoryRemainingUnits: 500, recoveryQuery: QUERY,
      targets: [{ target: "gate_in", actualUtc: new Date("2026-09-01T10:05:00Z"), actualVerified: true, referenceArrivalUtc: REF }],
    }, 1, deps(null, calls));
    expect(calls).toEqual([]);
    expect(r.observed).toBe(1);
    expect(r.restUnitsConsumed).toBe(0);
  });

  it("missing original population query identity defers with zero provider call", async () => {
    const calls: string[] = [];
    const r = await runOutcomeRecoveryForFlight(fakePool(), {
      flightInstanceId: "LEG1", operationalState: "departed", nowUtc: new Date("2026-09-01T10:30:00Z"),
      opportunitiesUsed: 0, categoryRemainingUnits: 500, recoveryQuery: null,
      targets: [{ target: "gate_in", actualUtc: null, actualVerified: false, referenceArrivalUtc: REF }],
    }, 1, deps(null, calls));
    expect(calls).toEqual([]);
    expect(r.deferred).toBe(1);
    expect(r.failures).toContain("missing-original-population-query-identity");
    expect(r.restUnitsConsumed).toBe(0);
  });

  it("executes one bounded recovery transport and persists its provenance", async () => {
    const calls: string[] = [];
    const recoveredActual = new Date("2026-09-01T10:07:00Z");
    const r = await runOutcomeRecoveryForFlight(fakePool(), {
      flightInstanceId: "LEG1", operationalState: "arrived", nowUtc: new Date("2026-09-01T10:30:00Z"),
      opportunitiesUsed: 0, categoryRemainingUnits: 500, recoveryQuery: QUERY,
      targets: [{ target: "gate_in", actualUtc: null, actualVerified: false, referenceArrivalUtc: REF }],
    }, 1, deps(recoveredActual, calls));
    expect(calls).toEqual(["population-1"]);
    expect(r.restUnitsConsumed).toBe(2);
    expect(r.physicalAttempts).toBe(1);
    expect(r.recoveryRequestHash).toBe("a".repeat(64));
    expect(r.recoveryResponseHash).toBe("b".repeat(64));
    expect(r.observed).toBe(1);
  });

  it("default/unverified parser cannot fabricate an observed milestone", async () => {
    const r = await runOutcomeRecoveryForFlight(fakePool(), {
      flightInstanceId: "LEG1", operationalState: "departed", nowUtc: new Date("2026-09-01T10:30:00Z"),
      opportunitiesUsed: 0, categoryRemainingUnits: 500, recoveryQuery: QUERY,
      targets: [{ target: "gate_in", actualUtc: null, actualVerified: false, referenceArrivalUtc: REF }],
    }, 1, deps(null));
    expect(r.observed).toBe(0);
  });

  it("persistence short write throws fail-closed", async () => {
    await expect(runOutcomeRecoveryForFlight(fakePool(0), {
      flightInstanceId: "LEG1", operationalState: "arrived", nowUtc: new Date("2026-09-01T10:30:00Z"),
      opportunitiesUsed: 0, categoryRemainingUnits: 500, recoveryQuery: QUERY,
      targets: [{ target: "gate_in", actualUtc: new Date("2026-09-01T10:05:00Z"), actualVerified: true, referenceArrivalUtc: REF }],
    }, 1, deps())).rejects.toThrow(/persistence/);
  });

  it("cycle reports actual transport units instead of charging hypothetical calls", async () => {
    const flight = (id: string) => ({
      flightInstanceId: id, operationalState: "departed" as const, nowUtc: new Date("2026-09-01T10:30:00Z"),
      opportunitiesUsed: 0, categoryRemainingUnits: 500, recoveryQuery: { ...QUERY, populationQueryId: id },
      targets: [{ target: "gate_in" as const, actualUtc: null, actualVerified: false, referenceArrivalUtc: REF }],
    });
    const r = await runOutcomeRecoveryCycle(fakePool(), [flight("LEG1"), flight("LEG2")], 500, 1, deps(null));
    expect(r.totalConsumed).toBe(4);
  });
});
