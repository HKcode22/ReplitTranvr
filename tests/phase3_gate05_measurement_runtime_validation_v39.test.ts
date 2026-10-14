import {describe, expect, it} from "vitest";
import {
  evaluateGate05, validateGate05InputV39,
  DEFAULT_GATE_05_CRITERIA, type Gate05Measurement,
} from "../server/lib/disruption/gates_v3";

const valid = (): Gate05Measurement => ({
  notificationsReceived: 100, uniqueFlights: 50, completedFlights: 20,
  airborneFlights: 30, airbornePoints: 100, pilotDurationMinutes: 60,
  payloadFieldInventory: true, providerTimestampSemantics: true,
  tConstructibility: true, primaryTargetConstructibility: true,
  fidsMaxRange: true, fidsBoundaryBehavior: true, withLegBehavior: true,
  codeshareAmbiguity: true, observationCadence: true,
  trajectoryCompleteness: true, arrivalNotificationLatency: true,
  censoringGrace: true, rateLimit: true, unsettledAlertCreditBurst: true,
});

const asRuntimeJson = (value: unknown): Gate05Measurement =>
  value as Gate05Measurement;

describe("Phase3 Gate0.5 exact runtime input guards (zero provider calls)", () => {
  it("accepts properly typed evidence only at the specified thresholds", () => {
    expect(evaluateGate05(valid()).passed).toBe(true);
    const low = {...valid(), notificationsReceived: 99};
    expect(evaluateGate05(low).passed).toBe(false);
    expect(evaluateGate05(low).reason).toContain("notificationsReceived");
    const falseFlag = {...valid(), primaryTargetConstructibility: false};
    expect(evaluateGate05(falseFlag).passed).toBe(false);
    expect(evaluateGate05(falseFlag).reason).toContain("primaryTargetConstructibility");
  });

  it.each([
    ["truthy string false", {providerTimestampSemantics: "false"}],
    ["truthy string true", {tConstructibility: "true"}],
    ["string count", {notificationsReceived: "100"}],
    ["null flag", {payloadFieldInventory: null}],
    ["missing flag", {trajectoryCompleteness: undefined}],
    ["negative count", {airborneFlights: -1}],
    ["fractional count", {uniqueFlights: 50.5}],
    ["NaN count", {completedFlights: NaN}],
    ["infinite count", {airbornePoints: Infinity}],
    ["negative duration", {pilotDurationMinutes: -1}],
    ["infinite duration", {pilotDurationMinutes: Infinity}],
    ["missing count", {notificationsReceived: undefined}],
  ])("rejects malformed runtime JSON: %s", (_name, change) => {
    const input = asRuntimeJson({...valid(), ...change});
    expect(() => evaluateGate05(input)).toThrow(/INVALID_GATE05_MEASUREMENT:/);
  });

  it("rejects nonobject input even if a TypeScript cast says otherwise", () => {
    for (const input of [null, [], "validated", true]) {
      expect(() => evaluateGate05(asRuntimeJson(input)))
        .toThrow("INVALID_GATE05_MEASUREMENT:object");
    }
  });

  it("fails closed on corrupted, zero or nonfinite thresholds", () => {
    const baseline = {...DEFAULT_GATE_05_CRITERIA};
    expect(() => validateGate05InputV39(valid(), baseline)).not.toThrow();
    for (const bad of [
      {...baseline, minNotifications: -1},
      {...baseline, minUniqueFlights: 0},
      {...baseline, minCompletedFlights: 20.5},
      {...baseline, minAirbornePoints: Infinity},
      {...baseline, minPilotDurationMinutes: 0},
      {...baseline, minPilotDurationMinutes: NaN},
    ]) {
      expect(() => evaluateGate05(valid(), bad))
        .toThrow(/INVALID_GATE05_CRITERIA:/);
    }
  });

  it("guards type coercion, but does not certify evidence provenance", () => {
    const parse = JSON.parse('{"providerTimestampSemantics":"false"}');
    expect(() => evaluateGate05(asRuntimeJson({...valid(), ...parse})))
      .toThrow("INVALID_GATE05_MEASUREMENT:providerTimestampSemantics");
  });
});
