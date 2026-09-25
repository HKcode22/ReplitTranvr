import { describe, expect, it } from "vitest";
import {
  prepaidIdentityObservationFromFlightV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";

describe("V3.9 prepaid canonical-identity payload adapter", () => {
  it("maps the same AeroDataBox identity fields as the normal webhook path", () => {
    const mapped = prepaidIdentityObservationFromFlightV39({
      id: "provider-flight-123",
      number: "AA100",
      callSign: "AAL100",
      codeshareStatus: 1,
      airline: {
        iata: "AA",
        icao: "AAL",
      },
      departure: {
        airport: {
          icao: "MMUN",
          timeZone: "America/Cancun",
        },
        scheduledTime: {
          utc: "2026-09-25T11:30:00Z",
        },
      },
      arrival: {
        airport: {
          icao: "KDFW",
        },
        scheduledTime: {
          utc: "2026-09-25T14:15:00Z",
        },
      },
      aircraft: {
        reg: "N123AA",
      },
    });

    expect(mapped.observation).toEqual({
      operatingCarrier: "AA",
      operatingFlightNumber: "AA100",
      originIcao: "MMUN",
      originalDestinationIcao: "KDFW",
      scheduledGateOutUtc: "2026-09-25T11:30:00Z",
      originTimeZone: "America/Cancun",
      scheduleVerified: true,
      providerFlightId: "provider-flight-123",
      providerRecordKey: "provider-flight-123",
      callsign: "AAL100",
    });

    expect(mapped.codeshareStatus).toBe("IsOperator");
    expect(mapped.aircraftReg).toBe("N123AA");
    expect(mapped.scheduledGateInUtc?.toISOString())
      .toBe("2026-09-25T14:15:00.000Z");
    expect(mapped.provisionalIdentityKey).toMatch(/^amb:[a-f0-9]{64}$/);
  });

  it("falls back from airline IATA to ICAO without fabricating missing fields", () => {
    const mapped = prepaidIdentityObservationFromFlightV39({
      number: "BA2203",
      codeshareStatus: "Unknown",
      airline: {
        icao: "BAW",
      },
      departure: {
        airport: {
          icao: "MMUN",
        },
      },
      arrival: {
        airport: {
          icao: "EGLL",
        },
      },
    });

    expect(mapped.observation.operatingCarrier).toBe("BAW");
    expect(mapped.observation.originIcao).toBe("MMUN");
    expect(mapped.observation.originalDestinationIcao).toBe("EGLL");
    expect(mapped.observation.scheduledGateOutUtc).toBeNull();
    expect(mapped.observation.originTimeZone).toBeNull();
    expect(mapped.observation.scheduleVerified).toBe(false);
    expect(mapped.observation.providerFlightId).toBeNull();
    expect(mapped.observation.callsign).toBeNull();

    expect(mapped.codeshareStatus).toBe("Unknown");
    expect(mapped.aircraftReg).toBeNull();
    expect(mapped.scheduledGateInUtc).toBeNull();
  });

  it("keeps the provisional ambiguity identity deterministic across mutable updates", () => {
    const base = {
      number: "AA100",
      callSign: "AAL100",
      codeshareStatus: 0,
      airline: { iata: "AA" },
      departure: {
        airport: {
          icao: "MMUN",
          timeZone: "America/Cancun",
        },
        scheduledTime: {
          utc: "2026-09-25T11:30:00Z",
        },
      },
      arrival: {
        airport: { icao: "KDFW" },
        scheduledTime: {
          utc: "2026-09-25T14:15:00Z",
        },
      },
    };

    const first = prepaidIdentityObservationFromFlightV39({
      ...base,
      lastUpdatedUtc: "2026-09-25T11:01:00Z",
      status: 1,
    });

    const update = prepaidIdentityObservationFromFlightV39({
      ...base,
      lastUpdatedUtc: "2026-09-25T11:10:00Z",
      status: 2,
    });

    expect(first.provisionalIdentityKey)
      .toBe(update.provisionalIdentityKey);
  });

  it("separates materially different scheduled legs in the provisional upper bound", () => {
    const make = (scheduled: string) =>
      prepaidIdentityObservationFromFlightV39({
        number: "AA100",
        codeshareStatus: 0,
        airline: { iata: "AA" },
        departure: {
          airport: {
            icao: "MMUN",
            timeZone: "America/Cancun",
          },
          scheduledTime: { utc: scheduled },
        },
        arrival: {
          airport: { icao: "KDFW" },
        },
      });

    expect(
      make("2026-09-25T11:30:00Z").provisionalIdentityKey,
    ).not.toBe(
      make("2026-09-25T18:30:00Z").provisionalIdentityKey,
    );
  });
});
