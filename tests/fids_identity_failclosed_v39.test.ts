import { describe, expect, it } from "vitest";
import {
  localServiceDateOrNull,
  utcIntervalToLocal,
  fetchFidsPopulation,
  type FidsCensusParams,
  type PopulationRow,
} from "../server/lib/disruption/fidsCensus_v3";

const BASE: FidsCensusParams = {
  airportIcao: "KLAX",
  fromLocal: "2026-09-01 00:00",
  toLocal: "2026-09-01 12:00",
  ianaTimezone: "America/Los_Angeles",
  withCancelled: true,
  withCodeshared: true,
  withCargo: false,
  withPrivate: false,
  direction: "Both",
  serviceWindowStartUtc: new Date("2026-09-01T07:00:00Z"),
  serviceWindowEndUtc: new Date("2026-09-01T19:00:00Z"),
  cutoffUtc: new Date("2026-09-01T19:00:00Z"),
  providerApiVersion: "test",
  fidsProtocolVersion: "test",
  openapiSha256: "a".repeat(64),
};

describe("V3.9 FIDS service-date identity", () => {
  it("never substitutes today's date or UTC date when schedule/timezone is unavailable", () => {
    expect(localServiceDateOrNull(null, "America/Los_Angeles")).toBeNull();
    expect(localServiceDateOrNull("not-a-date", "America/Los_Angeles")).toBeNull();
    expect(localServiceDateOrNull("2026-09-01T08:00:00Z", "not-a-zone")).toBeNull();
    expect(localServiceDateOrNull("2026-09-01T08:00:00Z", "America/Los_Angeles")).toBe("2026-09-01");
  });

  it("invalid IANA timezone refuses interval conversion instead of falling back to UTC", () => {
    expect(() => utcIntervalToLocal(
      new Date("2026-09-01T07:00:00Z"),
      new Date("2026-09-01T19:00:00Z"),
      "invalid-zone",
    )).toThrow(/timezone/i);
  });

  it("retains an in-window FIDS record with unresolved departure identity as provisional, never canonical", async () => {
    const persisted: PopulationRow[] = [];
    const result = await fetchFidsPopulation(BASE, {
      fetchAirport: async () => ({
        departures: [],
        arrivals: [{
          id: null,
          number: "UA123",
          codeshareStatus: 1,
          isCargo: false,
          isPrivate: false,
          isCharter: false,
          departure: { airport: { icao: "KSFO", iata: "SFO" }, scheduledTime: { utc: null } },
          arrival: { airport: { icao: "KLAX", iata: "LAX" }, scheduledTime: { utc: "2026-09-01T18:00:00Z" } },
        }],
      }),
      now: () => new Date("2026-09-01T18:01:00Z"),
      persist: async (_q, rows) => { persisted.push(...rows); return rows.length; },
    });
    expect(result?.flightCount).toBe(1);
    expect(result?.flightInstanceIds).toEqual([]);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].canonicalFlightInstanceId).toBeNull();
    expect(persisted[0].analyticIdentityId).toMatch(/^provisional:/);
    expect(persisted[0].codeshareResolutionStatus).toBe("ambiguous_distinct_leg");
    expect(persisted[0].depScheduledUtc).toBeNull();
  });

  it("invalid airport timezone refuses the census before any provider call", async () => {
    let calls = 0;
    await expect(fetchFidsPopulation({ ...BASE, ianaTimezone: "not-a-zone" }, {
      fetchAirport: async () => { calls += 1; return { departures: [], arrivals: [] }; },
      persist: async () => 0,
    })).rejects.toThrow(/timezone/i);
    expect(calls).toBe(0);
  });
});
