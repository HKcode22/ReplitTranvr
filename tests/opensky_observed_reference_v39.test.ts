import { describe, expect, it } from "vitest";
import {
  applyOpenSkyChunkV39,
  createOpenSkyObservedReferenceWorkV39,
  finalizeOpenSkyObservedReferenceV39,
  openSkyOperatorProxyV39,
} from "../server/lib/disruption/openSkyObservedReference_v39";

describe("OpenSky observed 12-month reference aggregation", () => {
  it("requires an exact 365/366-day UTC-day-bounded reference", () => {
    const work = createOpenSkyObservedReferenceWorkV39(
      new Date("2025-09-12T00:00:00Z"),
      new Date("2026-09-12T00:00:00Z"),
    );
    expect(work.expected_chunks).toBe(4380);
    expect(work.completed_chunks).toBe(0);
    expect(() => createOpenSkyObservedReferenceWorkV39(
      new Date("2025-09-12T01:00:00Z"),
      new Date("2026-09-12T00:00:00Z"),
    )).toThrow(/UTC_DAY_BOUNDARIES/);
  });

  it("counts each flight only in the chunk containing firstSeen and keeps no raw flight list", () => {
    const work = createOpenSkyObservedReferenceWorkV39(
      new Date("2025-09-12T00:00:00Z"),
      new Date("2026-09-12T00:00:00Z"),
    );
    const begin = work.next_begin_unix;
    const end = begin + 7200;
    applyOpenSkyChunkV39({
      work,
      beginUnix: begin,
      endUnix: end,
      httpStatus: 200,
      responseBodyText: "fixture-response",
      flights: [
        { firstSeen: begin + 10, estDepartureAirport: "KJFK", estArrivalAirport: "EGLL", callsign: "BAW117" },
        { firstSeen: begin + 20, estDepartureAirport: "KJFK", estArrivalAirport: "EGLL", callsign: "AAL100" },
        { firstSeen: begin - 1, estDepartureAirport: "KJFK", estArrivalAirport: "EGLL", callsign: "BAW999" },
        { firstSeen: begin + 30, estDepartureAirport: null, estArrivalAirport: "EGLL", callsign: "XXX1" },
      ],
    });
    expect(work.completed_chunks).toBe(1);
    expect(work.flights_returned).toBe(4);
    expect(work.flights_counted).toBe(2);
    expect(work.flights_excluded_outside_chunk_start).toBe(1);
    expect(work.flights_missing_airport_pair).toBe(1);
    expect(work.routes["KJFK>EGLL"].observed_departures).toBe(2);
    expect(work.routes["KJFK>EGLL"].operator_proxy_counts).toEqual({ BAW: 1, AAL: 1 });
    expect(JSON.stringify(work)).not.toContain("BAW117");
  });

  it("labels callsign prefix only as a proxy and measures proxy coverage", () => {
    expect(openSkyOperatorProxyV39("UAL123 ")).toBe("UAL");
    expect(openSkyOperatorProxyV39("N12345")).toBeNull();
    expect(openSkyOperatorProxyV39(null)).toBeNull();

    const work = createOpenSkyObservedReferenceWorkV39(
      new Date("2025-09-12T00:00:00Z"),
      new Date("2026-09-12T00:00:00Z"),
    );
    const begin = work.next_begin_unix;
    applyOpenSkyChunkV39({
      work,
      beginUnix: begin,
      endUnix: begin + 7200,
      httpStatus: 200,
      responseBodyText: "fixture",
      flights: [
        { firstSeen: begin + 1, estDepartureAirport: "KJFK", estArrivalAirport: "KLAX", callsign: "UAL1" },
        { firstSeen: begin + 2, estDepartureAirport: "KJFK", estArrivalAirport: "KLAX", callsign: "N12345" },
      ],
    });
    const summary = finalizeOpenSkyObservedReferenceV39(work);
    expect(summary.complete).toBe(false);
    expect(summary.operator_proxy_coverage).toBe(0.5);
    expect(summary.airport_pair_usable_share).toBe(1);
    expect(summary.aggregate_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("records empty 404 windows without inventing flights", () => {
    const work = createOpenSkyObservedReferenceWorkV39(
      new Date("2025-09-12T00:00:00Z"),
      new Date("2026-09-12T00:00:00Z"),
    );
    const begin = work.next_begin_unix;
    applyOpenSkyChunkV39({
      work,
      beginUnix: begin,
      endUnix: begin + 7200,
      httpStatus: 404,
      responseBodyText: "",
      flights: [],
    });
    expect(work.empty_chunks).toBe(1);
    expect(work.flights_counted).toBe(0);
    expect(work.response_hashes).toHaveLength(1);
  });
});
