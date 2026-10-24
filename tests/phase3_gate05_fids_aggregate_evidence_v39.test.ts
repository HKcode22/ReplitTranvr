import {describe, expect, it} from "vitest";
import {aggregateGate05FidsPairV39}
  from "../server/lib/disruption/gate05FidsAggregateEvidence_v39";

const bounds = {
  requestedAirportIcao: "WSSS",
  startUtc: "2026-10-22T04:35:00Z",
  endUtc: "2026-10-22T04:45:00Z"
};
const entry = (time: string, overrides: Record<string, unknown> = {}) => ({
  number: "SQ123", codeshareStatus: "IsOperator", quality: ["Live"],
  departure: {
    airport: {icao: "WSSS"},
    scheduledTime: {utc: time},
    revisedTime: {utc: "2026-10-22T04:40:00Z"},
    runwayTime: {utc: "2026-10-22T04:42:00Z"}
  },
  arrival: {airport: {icao: "WADD"}},
  ...overrides
});
describe("Gate05 pair FIDS aggregate — fixture-only, zero provider IO", () => {
  it("summarizes in-memory fields without certifying actual runway time", () => {
    const result = aggregateGate05FidsPairV39(
      [entry("2026-10-22T04:35:00Z")],
      [entry("2026-10-22T04:35:00Z", {location: {lat: -1.1}})],
      bounds
    );
    expect(result.providerRequests).toBe(0);
    expect(result.withoutLocation.scheduledInsideWindow).toBe(1);
    expect(result.withoutLocation.runwayTimeUtcPresent).toBe(1);
    expect(result.withoutLocation.runwayTimestampActualityUnknown).toBe(1);
    expect(result.withoutLocation.scheduledWheelsOffReferenceProven).toBe(false);
    expect(result.withoutLocation.departurePrimaryByFidsContext).toBe(1);
    expect(result.fullScientificGate05Verdict).toBe("NOT_ASSESSABLE_FROM_THIS_MICROTEST");
    expect(result.withLocation.locationObjectPresent).toBe(1);
    expect(result.provisionalComparableOverlap).toBe(1);
    expect(result.actualRunwayDelayLabelProven).toBe(false);
    expect(result.matchingFlightIdentitiesProven).toBe(false);
    expect(result.pilotGate05Certified).toBe(false);
    const output = JSON.stringify(result);
    expect(output).not.toContain("SQ123");
    expect(output).not.toContain("WADD");
    expect(output).not.toContain("2026-10-22T04:42:00Z");
    expect(output).not.toContain('"lat":');
  });
  it("handles provider-documented omitted origin without inventing airport proof", () => {
    const d = entry("2026-10-22T04:39:00Z", {
      departure: {
        scheduledTime: {utc:"2026-10-22T04:39:00Z"},
        runwayTime: {utc:"2026-10-22T04:43:00Z"},
        quality: ["Live"]
      }
    });
    const r = aggregateGate05FidsPairV39([d], [], bounds);
    expect(r.withoutLocation.departureMovementObjects).toBe(1);
    expect(r.withoutLocation.departurePrimaryByFidsContext).toBe(1);
    expect(r.withoutLocation.departureRequestedAirportConfirmed).toBe(0);
    expect(r.withoutLocation.departureAirportUnverified).toBe(1);
    expect(r.withoutLocation.provisionalMatchableRows).toBe(1);
    expect(r.withoutLocation.provisionalDistinctKeys).toBe(1);
    expect(r.withoutLocation.qualityLive).toBe(1);
    expect(r.withoutLocation.runwayActualityProven).toBe(false);
    expect(r.withoutLocation.scheduledWheelsOffReferenceProven).toBe(false);
    expect(r.actualRunwayDelayLabelProven).toBe(false);
  });
  it("matches omitted-vs-explicit WSSS origins provisionally, not canonically", () => {
    const omitted = entry("2026-10-22T04:40:00Z", {
      departure: {scheduledTime: {utc:"2026-10-22T04:40:00Z"}}
    });
    const explicit = entry("2026-10-22T04:40:00Z");
    const r = aggregateGate05FidsPairV39([omitted], [explicit], bounds);
    expect(r.provisionalComparableOverlap).toBe(1);
    expect(r.withoutLocation.departureRequestedAirportConfirmed).toBe(0);
    expect(r.withoutLocation.departureAirportUnverified).toBe(1);
    expect(r.withoutLocation.provisionalMatchableRows).toBe(1);
    expect(r.matchingFlightIdentitiesProven).toBe(false);
    expect(r.actualRunwayDelayLabelProven).toBe(false);
  });
  it("excludes an explicitly foreign departure airport from WSSS matching", () => {
    const foreign = entry("2026-10-22T04:40:00Z", {
      departure: {
        airport:{icao:"WADD"},
        scheduledTime:{utc:"2026-10-22T04:40:00Z"}
      }
    });
    const r = aggregateGate05FidsPairV39([foreign], [foreign], bounds);
    expect(r.withoutLocation.provisionalMatchableRows).toBe(0);
    expect(r.provisionalComparableOverlap).toBe(0);
  });
  it("does not certify an actual flight or a cutoff from missing times", () => {
    const d = entry("2026-10-22T04:40:00Z", {
      departure: {airport:{icao:"WSSS"}, scheduledTime:{utc:"not-a-time"}}
    });
    const r = aggregateGate05FidsPairV39([d], [], bounds);
    expect(r.withoutLocation.scheduledTimeUtcPresent).toBe(0);
    expect(r.withoutLocation.scheduledWindowUnassessable).toBe(1);
    expect(r.withoutLocation.runwayTimeUtcPresent).toBe(0);
    expect(r.pilotGate05Certified).toBe(false);
  });
  it("uses a half-open UTC window; rejects the end boundary", () => {
    const x = aggregateGate05FidsPairV39(
      [entry("2026-10-22T04:45:00Z")], [], bounds);
    expect(x.withoutLocation.scheduledOutsideWindow).toBe(1);
    expect(x.withoutLocation.scheduledInsideWindow).toBe(0);
  });
  it("preserves unknown instead of manufacturing absent data or unique flights", () => {
    const ambiguous = entry("2026-10-22T04:40:00Z", {
      codeshareStatus: "Unknown",
      departure: {airport: {icao: "WSSS"}, revisedTime: {utc: "2026-10-22T04:45:00Z"}}
    });
    const result = aggregateGate05FidsPairV39(
      [ambiguous, null, "bad"], [ambiguous], bounds);
    expect(result.withoutLocation.malformedRows).toBe(2);
    expect(result.withoutLocation.scheduledWindowUnassessable).toBe(3);
    expect(result.withoutLocation.revisedTimeUtcPresent).toBe(1);
    expect(result.withoutLocation.runwayTimeUtcPresent).toBe(0);
    expect(result.withoutLocation.provisionalMatchableRows).toBe(0);
    expect(result.provisionalComparableOverlap).toBe(0);
  });
  it("counts duplicate provisional keys without calling them canonical", () => {
    const one = entry("2026-10-22T04:40:00Z");
    const x = aggregateGate05FidsPairV39([one, one], [one], bounds);
    expect(x.withoutLocation.objectsReturned).toBe(2);
    expect(x.withoutLocation.provisionalMatchableRows).toBe(2);
    expect(x.withoutLocation.provisionalDistinctKeys).toBe(1);
    expect(x.provisionalComparableOverlap).toBe(1);
    expect(x.matchingFlightIdentitiesProven).toBe(false);
  });
  it("rejects malformed inputs, out of scope, or invalid UTC boundaries", () => {
    expect(()=>aggregateGate05FidsPairV39(null,[],bounds))
      .toThrow("GATE05_AGGREGATE_INVALID_ROWS");
    expect(()=>aggregateGate05FidsPairV39([],[],{
      ...bounds,requestedAirportIcao:"wsss"}))
      .toThrow("GATE05_AGGREGATE_AIRPORT");
    expect(()=>aggregateGate05FidsPairV39([],[],{
      ...bounds,endUtc:bounds.startUtc}))
      .toThrow("GATE05_AGGREGATE_WINDOW");
    expect(()=>aggregateGate05FidsPairV39([],[],{
      ...bounds,startUtc:"2026-02-30T04:00:00Z"}))
      .toThrow("GATE05_AGGREGATE_WINDOW");
  });
});
