import { describe, expect, it } from "vitest";
import {
  summarizePrepaidPhysicalIdentityRowsV39,
  type PrepaidPhysicalMetricRowV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";

function row(
  overrides: Partial<PrepaidPhysicalMetricRowV39>,
): PrepaidPhysicalMetricRowV39 {
  return {
    receivedAtUtc: new Date("2026-09-25T11:10:00Z"),
    flightInstanceId: "leg:a",
    provisionalIdentityKey: null,
    identityResolutionStatus: "resolved",
    codeshareStatus: "IsOperator",
    aircraftReg: "N123AA",
    originIcao: "MMUN",
    destinationIcao: "KDFW",
    scheduledGateOutUtc: new Date("2026-09-25T11:30:00Z"),
    scheduledGateInUtc: new Date("2026-09-25T13:30:00Z"),
    ...overrides,
  };
}

describe("V3.9 prepaid physical-flight Stage-1 metrics", () => {
  it("counts physical flight instances rather than public flight number", () => {
    const result = summarizePrepaidPhysicalIdentityRowsV39([
      row({
        flightInstanceId: "leg:first",
        scheduledGateOutUtc: new Date("2026-09-25T11:30:00Z"),
      }),
      row({
        flightInstanceId: "leg:second",
        scheduledGateOutUtc: new Date("2026-09-25T16:30:00Z"),
      }),
    ]);

    expect(result.confirmedUniqueLower).toBe(2);
    expect(result.confirmedPlusAmbiguousUpper).toBe(2);
    expect(result.uniqueFlights).toBe(2);
  });

  it("does not recount repeated updates of one physical flight", () => {
    const result = summarizePrepaidPhysicalIdentityRowsV39([
      row({
        flightInstanceId: "leg:same",
        receivedAtUtc: new Date("2026-09-25T11:10:00Z"),
      }),
      row({
        flightInstanceId: "leg:same",
        receivedAtUtc: new Date("2026-09-25T11:25:00Z"),
      }),
      row({
        flightInstanceId: "leg:same",
        receivedAtUtc: new Date("2026-09-25T11:40:00Z"),
      }),
    ]);

    expect(result.confirmedUniqueLower).toBe(1);
    expect(result.confirmedPlusAmbiguousUpper).toBe(1);
    expect(result.firstObservationMs).toEqual([
      new Date("2026-09-25T11:10:00Z").getTime(),
    ]);
  });

  it("keeps unresolved identity out of the lower bound but inside the upper bound", () => {
    const result = summarizePrepaidPhysicalIdentityRowsV39([
      row({
        flightInstanceId: "leg:confirmed",
      }),
      row({
        flightInstanceId: null,
        provisionalIdentityKey: "ambiguous:one",
        identityResolutionStatus: "quarantined",
        codeshareStatus: "Unknown",
        aircraftReg: null,
      }),
    ]);

    expect(result.confirmedUniqueLower).toBe(1);
    expect(result.ambiguousUnknown).toBe(1);
    expect(result.confirmedPlusAmbiguousUpper).toBe(2);
  });

  it("deduplicates a marketing codeshare already resolved to the same physical leg", () => {
    const result = summarizePrepaidPhysicalIdentityRowsV39([
      row({
        flightInstanceId: "leg:physical",
        codeshareStatus: "IsOperator",
      }),
      row({
        flightInstanceId: "leg:physical",
        codeshareStatus: "IsCodeshared",
      }),
    ]);

    expect(result.confirmedUniqueLower).toBe(1);
    expect(result.confirmedPlusAmbiguousUpper).toBe(1);
  });

  it("never counts a marketing-only codeshare as a confirmed physical leg", () => {
    const result = summarizePrepaidPhysicalIdentityRowsV39([
      row({
        flightInstanceId: "leg:marketing-only",
        provisionalIdentityKey: "amb:marketing-must-not-count",
        codeshareStatus: "IsCodeshared",
      }),
    ]);

    expect(result.confirmedUniqueLower).toBe(0);
    expect(result.confirmedPlusAmbiguousUpper).toBe(0);
    expect(result.uniqueFlights).toBe(0);
  });

  it("keeps provider-Unknown codeshare state in the ambiguity bound", () => {
    const result = summarizePrepaidPhysicalIdentityRowsV39([
      row({
        flightInstanceId: null,
        provisionalIdentityKey: "codeshare-unknown:one",
        identityResolutionStatus: "quarantined",
        codeshareStatus: "Unknown",
        aircraftReg: null,
      }),
    ]);

    expect(result.confirmedUniqueLower).toBe(0);
    expect(result.ambiguousUnknown).toBe(1);
    expect(result.confirmedPlusAmbiguousUpper).toBe(1);
  });

  it("does not double-count a resolved operator provisional key as ambiguity", () => {
    const result = summarizePrepaidPhysicalIdentityRowsV39([
      row({
        flightInstanceId: "leg:confirmed-operator",
        provisionalIdentityKey: "amb:resolved-operator-must-not-inflate-upper",
        identityResolutionStatus: "resolved",
        codeshareStatus: "IsOperator",
      }),
    ]);

    expect(result.confirmedUniqueLower).toBe(1);
    expect(result.ambiguousUnknown).toBe(0);
    expect(result.confirmedPlusAmbiguousUpper).toBe(1);
    expect(result.uniqueFlights).toBe(1);
  });

  it("counts a tail-chain link only for compatible physical legs within six hours", () => {
    const result = summarizePrepaidPhysicalIdentityRowsV39([
      row({
        flightInstanceId: "leg:one",
        aircraftReg: "N123AA",
        originIcao: "MMUN",
        destinationIcao: "KDFW",
        scheduledGateOutUtc: new Date("2026-09-25T11:00:00Z"),
        scheduledGateInUtc: new Date("2026-09-25T13:00:00Z"),
      }),
      row({
        flightInstanceId: "leg:two",
        aircraftReg: "N123AA",
        originIcao: "KDFW",
        destinationIcao: "KORD",
        scheduledGateOutUtc: new Date("2026-09-25T15:00:00Z"),
        scheduledGateInUtc: new Date("2026-09-25T16:30:00Z"),
      }),

      // Same registration, but route continuity is broken.
      row({
        flightInstanceId: "leg:three",
        aircraftReg: "N123AA",
        originIcao: "KLAX",
        destinationIcao: "KSFO",
        scheduledGateOutUtc: new Date("2026-09-25T17:00:00Z"),
        scheduledGateInUtc: new Date("2026-09-25T18:00:00Z"),
      }),

      // Correct route continuation but more than six hours later.
      row({
        flightInstanceId: "leg:four",
        aircraftReg: "N123AA",
        originIcao: "KSFO",
        destinationIcao: "KSEA",
        scheduledGateOutUtc: new Date("2026-09-26T02:30:00Z"),
      }),
    ]);

    expect(result.tailChainLinks).toBe(1);
  });
});
