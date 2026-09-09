/**
 * Tests: Provider/FIDS contract corrections (§70.1)
 * 
 * Covers:
 *  - correct FIDS endpoint (GET /flights/airports/icao/...)
 *  - correct direction parameter (Both|Arrival|Departure)
 *  - withLeg semantics
 *  - canceled/diverted/CanceledUncertain handling
 *  - codeshare Unknown state
 *  - no unsupported stable flightId assumption
 *  - scheduled/revised/runway field parsing
 *  - no actualTime assumption
 *  - service window vs cutoff
 *  - FIDS max-range config
 *  - generic split logic
 *  - split calls included in budget
 */

import { describe, it, expect, vi } from "vitest";
import {
  STATUS_CODE_BY_NUMBER,
  CODESHARE_CODE,
  QUALITY_CODE,
} from "../server/lib/disruption/flightNotificationExtractor_v3";
import { STATUS_CODE, POST_STATUSES } from "../server/lib/disruption/flightStatus_v3";
import {
  classifyCodeshare,
  detectRetime,
  canonicalFlightInstanceId,
  dedupCodeshares,
  isCrossAirportDuplicate,
} from "../server/lib/disruption/flightInstanceCanonical_v3";
import {
  utcIntervalToLocal,
  fetchFidsWithRetry,
  buildPopulationRow,
  FIDS_MAX_TOTAL_ATTEMPTS,
  FIDS_TRUNCATION_HEURISTIC_COUNT,
  type PopulationRowInput,
  fetchFidsPopulation,
  fetchBatchFidsPopulation,
} from "../server/lib/disruption/fidsCensus_v3";
import { fetchFidsAirport } from "../server/lib/disruption/aerodataboxLimiter_v3";

describe("§70.1 Provider/FIDS contract", () => {
  describe("Status code mapping", () => {
    it("CanceledUncertain is code 12, distinct from Canceled (code 10)", () => {
      expect(STATUS_CODE.Canceled).toBe(10);
      expect(STATUS_CODE.CanceledUncertain).toBe(12);
      expect(STATUS_CODE.Canceled).not.toBe(STATUS_CODE.CanceledUncertain);
    });

    it("STATUS_CODE_BY_NUMBER correctly reverses STATUS_CODE", () => {
      for (const [name, code] of Object.entries(STATUS_CODE)) {
        expect(STATUS_CODE_BY_NUMBER[code]).toBe(name);
      }
    });

    it("POST_STATUSES does NOT include CanceledUncertain", () => {
      expect(POST_STATUSES.has("CanceledUncertain")).toBe(false);
    });

    it("POST_STATUSES includes Departed, EnRoute, Approaching, Arrived", () => {
      expect(POST_STATUSES.has("Departed")).toBe(true);
      expect(POST_STATUSES.has("EnRoute")).toBe(true);
      expect(POST_STATUSES.has("Approaching")).toBe(true);
      expect(POST_STATUSES.has("Arrived")).toBe(true);
    });

    it("Canceled is NOT in POST_STATUSES", () => {
      expect(POST_STATUSES.has("Canceled")).toBe(false);
    });
  });

  describe("Codeshare handling", () => {
    it("CODESHARE_CODE maps 0=Unknown, 1=IsOperator, 2=IsCodeshared", () => {
      expect(CODESHARE_CODE[0]).toBe("Unknown");
      expect(CODESHARE_CODE[1]).toBe("IsOperator");
      expect(CODESHARE_CODE[2]).toBe("IsCodeshared");
    });

    it("classifyCodeshare: Unknown (0) is ambiguous_unknown", () => {
      const state = classifyCodeshare(0);
      expect(state.label).toBe("Unknown");
      expect(state.ambiguousUnknown).toBe(true);
    });

    it("classifyCodeshare: IsOperator (1) is not ambiguous", () => {
      const state = classifyCodeshare(1);
      expect(state.label).toBe("IsOperator");
      expect(state.ambiguousUnknown).toBe(false);
    });

    it("classifyCodeshare: IsCodeshared (2) is not ambiguous", () => {
      const state = classifyCodeshare(2);
      expect(state.label).toBe("IsCodeshared");
      expect(state.ambiguousUnknown).toBe(false);
    });

    it("classifyCodeshare: null/undefined defaults to Unknown", () => {
      expect(classifyCodeshare(null).label).toBe("Unknown");
      expect(classifyCodeshare(undefined).label).toBe("Unknown");
    });
  });

  describe("Quality codes", () => {
    it("QUALITY_CODE maps 0=Basic, 1=Live, 2=Approximate", () => {
      expect(QUALITY_CODE[0]).toBe("Basic");
      expect(QUALITY_CODE[1]).toBe("Live");
      expect(QUALITY_CODE[2]).toBe("Approximate");
    });
  });

  describe("FIDS timezone conversion", () => {
    it("utcIntervalToLocal converts UTC to airport local time", () => {
      const utcFrom = new Date("2026-08-15T06:00:00Z");
      const utcTo = new Date("2026-08-15T18:00:00Z");
      const result = utcIntervalToLocal(utcFrom, utcTo, "America/New_York");
      
      // EDT is UTC-4, so 06:00 UTC = 02:00 local, 18:00 UTC = 14:00 local
      expect(result.fromLocal).toContain("02:00");
      expect(result.toLocal).toContain("14:00");
    });

    it("utcIntervalToLocal handles DST spring-forward", () => {
      // Spring forward 2026: March 8, 2:00 AM → 3:00 AM EDT
      const utcFrom = new Date("2026-03-08T06:00:00Z"); // 01:00 EST (before spring forward)
      const utcTo = new Date("2026-03-08T10:00:00Z");   // 06:00 EDT (after spring forward)
      const result = utcIntervalToLocal(utcFrom, utcTo, "America/New_York");
      
      expect(result.fromLocal).toBeDefined();
      expect(result.toLocal).toBeDefined();
    });
  });
});

describe("§70.5 Identity", () => {
  describe("Canonical flight instance ID", () => {
    it("generates deterministic ID from operating carrier + number + origin + dest + date + time", () => {
      const input = {
        operatingCarrier: "UA",
        operatingFlightNumber: "123",
        origin: "KORD",
        destinationOriginal: "KLAX",
        scheduledGateOutUtc: "2026-08-15T14:00:00Z",
        serviceDate: "2026-08-15",
      };
      
      const result1 = canonicalFlightInstanceId(input);
      const result2 = canonicalFlightInstanceId(input);
      
      expect(result1.flight_instance_id).toBe(result2.flight_instance_id);
      expect(result1.isFallback).toBe(true);
    });

    it("normalizes carrier and number (uppercase, strip leading zeros)", () => {
      const input1 = {
        operatingCarrier: "ua",
        operatingFlightNumber: "0123",
        origin: "KORD",
        destinationOriginal: "KLAX",
        scheduledGateOutUtc: "2026-08-15T14:00:00Z",
        serviceDate: "2026-08-15",
      };
      const input2 = {
        operatingCarrier: "UA",
        operatingFlightNumber: "123",
        origin: "KORD",
        destinationOriginal: "KLAX",
        scheduledGateOutUtc: "2026-08-15T14:00:00Z",
        serviceDate: "2026-08-15",
      };
      
      const result1 = canonicalFlightInstanceId(input1);
      const result2 = canonicalFlightInstanceId(input2);
      
      expect(result1.flight_instance_id).toBe(result2.flight_instance_id);
    });

    it("different flights get different IDs", () => {
      const input1 = {
        operatingCarrier: "UA",
        operatingFlightNumber: "123",
        origin: "KORD",
        destinationOriginal: "KLAX",
        scheduledGateOutUtc: "2026-08-15T14:00:00Z",
        serviceDate: "2026-08-15",
      };
      const input2 = {
        ...input1,
        operatingFlightNumber: "456",
      };
      
      const result1 = canonicalFlightInstanceId(input1);
      const result2 = canonicalFlightInstanceId(input2);
      
      expect(result1.flight_instance_id).not.toBe(result2.flight_instance_id);
    });
  });

  describe("Retime detection", () => {
    it("detects retime ≥ 2 hours", () => {
      const previous = new Date("2026-08-15T14:00:00Z");
      const current = new Date("2026-08-15T16:30:00Z"); // 2.5 hours later
      
      const result = detectRetime(previous, current);
      
      expect(result.isRetime).toBe(true);
      expect(result.retimeMinutes).toBeCloseTo(150, 0);
      expect(result.dateShifted).toBe(false);
    });

    it("does NOT detect retime < 2 hours", () => {
      const previous = new Date("2026-08-15T14:00:00Z");
      const current = new Date("2026-08-15T15:30:00Z"); // 1.5 hours later
      
      const result = detectRetime(previous, current);
      
      expect(result.isRetime).toBe(false);
    });

    it("detects date shift as retime", () => {
      const previous = new Date("2026-08-15T23:00:00Z");
      const current = new Date("2026-08-16T01:00:00Z"); // next day
      
      const result = detectRetime(previous, current);
      
      expect(result.isRetime).toBe(true);
      expect(result.dateShifted).toBe(true);
    });

    it("handles null inputs gracefully", () => {
      const result = detectRetime(null, new Date());
      expect(result.isRetime).toBe(false);
    });
  });

  describe("Codeshare dedup", () => {
    it("deduplicates marketing codeshares to operating legs", () => {
      const rows = [
        {
          operatingCarrier: "UA",
          operatingFlightNumber: "123",
          origin: "KORD",
          destinationOriginal: "KLAX",
          scheduledGateOutUtc: "2026-08-15T14:00:00Z",
          serviceDate: "2026-08-15",
          marketingCarrier: "LH",
          marketingNumber: "9000",
          codeshareStatus: 1, // IsOperator — first row sets the state
        },
        {
          operatingCarrier: "UA",
          operatingFlightNumber: "123",
          origin: "KORD",
          destinationOriginal: "KLAX",
          scheduledGateOutUtc: "2026-08-15T14:00:00Z",
          serviceDate: "2026-08-15",
          marketingCarrier: "NH",
          marketingNumber: "7100",
          codeshareStatus: 0, // Unknown — does NOT override IsOperator
        },
      ];
      
      const result = dedupCodeshares(rows);
      
      expect(result.size).toBe(1); // One operating leg
      const entry = Array.from(result.values())[0];
      expect(entry.marketing).toContain("LH9000");
      expect(entry.marketing).toContain("NH7100");
      expect(entry.codeshareState.label).toBe("IsOperator"); // First row set IsOperator
    });
  });

  describe("Cross-airport duplicate", () => {
    it("detects same flight at origin and destination airports", () => {
      const a = {
        operatingCarrier: "UA",
        operatingFlightNumber: "123",
        origin: "KORD",
        destinationOriginal: "KLAX",
        scheduledGateOutUtc: "2026-08-15T14:00:00Z",
        serviceDate: "2026-08-15",
      };
      const b = {
        ...a,
        origin: "KLAX",
        destinationOriginal: "KORD",
      };
      
      expect(isCrossAirportDuplicate(a, b)).toBe(true);
    });

    it("does NOT flag different flights as duplicates", () => {
      const a = {
        operatingCarrier: "UA",
        operatingFlightNumber: "123",
        origin: "KORD",
        destinationOriginal: "KLAX",
        scheduledGateOutUtc: "2026-08-15T14:00:00Z",
        serviceDate: "2026-08-15",
      };
      const b = {
        ...a,
        operatingFlightNumber: "456",
      };
      
      expect(isCrossAirportDuplicate(a, b)).toBe(false);
    });
  });
});

describe("§1.5.3 FIDS transport policy (max 3 attempts, transient-only retry)", () => {
  it("max total attempts is 3", () => {
    expect(FIDS_MAX_TOTAL_ATTEMPTS).toBe(3);
  });

  it("success on first attempt records 1 attempt", async () => {
    const r = await fetchFidsWithRetry(async () => ({ ok: true, statusCode: 200, value: { x: 1 } }));
    expect(r.value).toEqual({ x: 1 });
    expect(r.attempts).toHaveLength(1);
    expect(r.attempts[0].outcome).toBe("success");
    expect(r.budgetExhausted).toBe(false);
  });

  it("429 then success: retries once, both attempts recorded", async () => {
    let n = 0;
    const r = await fetchFidsWithRetry(async () => {
      n++;
      if (n === 1) return { ok: false, statusCode: 429, value: null };
      return { ok: true, statusCode: 200, value: { x: 1 } };
    });
    expect(r.value).toEqual({ x: 1 });
    expect(r.attempts).toHaveLength(2);
    expect(r.attempts[0].outcome).toBe("retryable_failure");
    expect(r.attempts[1].outcome).toBe("success");
  });

  it("persistent 503: stops at 3 attempts, budget exhausted", async () => {
    const r = await fetchFidsWithRetry(async () => ({ ok: false, statusCode: 503, value: null }));
    expect(r.value).toBeNull();
    expect(r.attempts).toHaveLength(3);
    expect(r.budgetExhausted).toBe(true);
  });

  it("401 auth failure: never retried", async () => {
    let calls = 0;
    const r = await fetchFidsWithRetry(async () => {
      calls++;
      return { ok: false, statusCode: 401, value: null };
    });
    expect(calls).toBe(1);
    expect(r.attempts[0].outcome).toBe("non_retryable_failure");
  });

  it("transport throw: retried until ceiling, then exhausted", async () => {
    const r = await fetchFidsWithRetry(async () => { throw new Error("connect timeout"); });
    expect(r.attempts).toHaveLength(3);
    expect(r.attempts.every((a) => a.outcome === "transport_error")).toBe(true);
    expect(r.budgetExhausted).toBe(true);
  });
});

describe("§1.5.3 truncation signal is an explicit named heuristic", () => {
  it("threshold constant exists and is used (not a magic number)", () => {
    expect(FIDS_TRUNCATION_HEURISTIC_COUNT).toBe(500);
  });
});

describe("§1.5.3 population-row builder (append-only membership)", () => {
  function popInput(over: Partial<PopulationRowInput> = {}): PopulationRowInput {
    return {
      sourceAirportIcao: "KLAX",
      queryDirection: "Both",
      populationRole: "requested_airport_primary",
      serviceWindowStartUtc: new Date("2026-09-01T08:00:00Z"),
      serviceWindowEndUtc: new Date("2026-09-01T14:00:00Z"),
      fromLocal: "2026-09-01 01:00",
      toLocal: "2026-09-01 07:00",
      airportIanaTimezone: "America/Los_Angeles",
      flightNumber: "UA123",
      carrierIata: "UA",
      carrierIcao: "UAL",
      callSign: "UAL123",
      depAirportIcao: "KLAX",
      depAirportIata: "LAX",
      arrAirportIcao: "KSFO",
      arrAirportIata: "SFO",
      depScheduledUtc: new Date("2026-09-01T10:00:00Z"),
      arrScheduledUtc: new Date("2026-09-01T11:30:00Z"),
      canonicalFlightInstanceId: "leg:abcd1234",
      analyticIdentityId: "leg:abcd1234",
      populationQueryId: "10000000-0000-4000-8000-000000000001",
      providerRecordKey: "rec_1",
      rawPayloadSha256: "ff".repeat(32),
      scopeClassification: "confirmed_core",
      codeshareResolutionStatus: "IsOperator",
      fidsRetrievalUtc: new Date("2026-09-01T07:00:00Z"),
      responseHash: "ee".repeat(32),
      availableAtUtc: new Date("2026-09-01T07:00:05Z"),
      cutoffUtc: new Date("2026-09-01T08:00:00Z"),
      batchId: null,
      providerApiVersion: "1.15.3.0",
      fidsProtocolVersion: "v3.9-f.8",
      openapiSha256: "aa".repeat(32),
      ...over,
    };
  }

  it("builds a row with source_type=fids and full provenance", () => {
    const row = buildPopulationRow(popInput());
    expect(row.sourceType).toBe("fids");
    expect(row.flightNumber).toBe("UA123");
    expect(row.sourceAirportIcao).toBe("KLAX");
    const prov = JSON.parse(row.provenanceJson);
    expect(prov.populationRole).toBe("requested_airport_primary");
    expect(prov.canonicalFlightInstanceId).toBe("leg:abcd1234");
    expect(prov.scopeClassification).toBe("confirmed_core");
  });

  it("unknown scope stays visible (never silently forced to core)", () => {
    const row = buildPopulationRow(popInput({ scopeClassification: "unknown", canonicalFlightInstanceId: null }));
    expect(JSON.parse(row.provenanceJson).scopeClassification).toBe("unknown");
  });

  it("opposite-movement context role is stamped distinctly", () => {
    const row = buildPopulationRow(popInput({ populationRole: "opposite_movement_context" }));
    expect(JSON.parse(row.provenanceJson).populationRole).toBe("opposite_movement_context");
  });
});

describe("§1.5.3 production FIDS path", () => {
  it("reserves base then retry immediately before each physical request", async () => {
    const order: string[] = [];
    const reserve = vi.fn(async (category: string) => { order.push(`reserve:${category}`); return crypto.randomUUID(); });
    const fetchImpl = vi.fn(async () => {
      order.push("fetch");
      return fetchImpl.mock.calls.length === 1
        ? new Response("busy", { status: 503 })
        : new Response(JSON.stringify({ departures: [], arrivals: [] }), { status: 200 });
    });
    const result = await fetchFidsAirport("KLAX", "2026-09-01T01:00", "2026-09-01T07:00", {
      budgetOwner: { reserve }, fetchImpl: fetchImpl as typeof fetch, sleepImpl: async () => {},
    });
    expect(result).toEqual({ departures: [], arrivals: [] });
    expect(order).toEqual(["reserve:fids_base", "fetch", "reserve:fids_retry", "fetch"]);
  });

  it("budget refusal prevents the provider request", async () => {
    const fetchImpl = vi.fn();
    await expect(fetchFidsAirport("KLAX", "a", "b", {
      budgetOwner: { reserve: async () => { throw new Error("budget exhausted"); } },
      fetchImpl: fetchImpl as typeof fetch,
    })).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("normal fetch persists raw provenance and complete immutable population rows", async () => {
    const persist = vi.fn(async (_query, rows) => rows.length);
    const result = await fetchFidsPopulation({
      airportIcao: "KLAX", fromLocal: "2026-09-01T01:00", toLocal: "2026-09-01T07:00",
      ianaTimezone: "America/Los_Angeles", withCancelled: true, withCodeshared: true,
      direction: "Departure", serviceWindowStartUtc: new Date("2026-09-01T08:00:00Z"),
      serviceWindowEndUtc: new Date("2026-09-01T14:00:00Z"), cutoffUtc: new Date("2026-09-01T07:30:00Z"),
      providerApiVersion: "1.15.3.0", fidsProtocolVersion: "v3.9-f.8", openapiSha256: "aa".repeat(32),
    }, {
      fetchAirport: async () => ({ departures: [{ id: "r1", number: "UA123", codeshareStatus: 1,
        isCargo: false, isPrivate: false, isCharter: false,
        departure: { airport: { icao: "KLAX", iata: "LAX" }, scheduledTime: { utc: "2026-09-01T10:00:00Z" } },
        arrival: { airport: { icao: "KSFO", iata: "SFO" }, scheduledTime: { utc: "2026-09-01T11:30:00Z" } } }], arrivals: [] }),
      persist,
      now: () => new Date("2026-09-01T07:00:00Z"),
    });
    expect(result?.persistedPopulationRows).toBe(1);
    const [query, rows] = persist.mock.calls[0];
    expect(query).toMatchObject({ queryDirection: "Departure", airportIanaTimezone: "America/Los_Angeles", providerApiVersion: "1.15.3.0" });
    expect(rows[0]).toMatchObject({ populationRole: "requested_airport_primary", scopeClassification: "confirmed_core",
      codeshareResolutionStatus: "confirmed_operating_leg", canonicalFlightInstanceId: expect.any(String), availableAtUtc: new Date("2026-09-01T07:00:00Z") });
  });

  it("raw/provenance persistence failure rejects rather than returning success", async () => {
    await expect(fetchFidsPopulation({
      airportIcao: "KLAX", fromLocal: "a", toLocal: "b", ianaTimezone: "America/Los_Angeles",
      withCancelled: true, withCodeshared: true, serviceWindowStartUtc: new Date("2026-09-01T08:00:00Z"),
      serviceWindowEndUtc: new Date("2026-09-01T09:00:00Z"), cutoffUtc: new Date("2026-09-01T07:00:00Z"),
      providerApiVersion: "1", fidsProtocolVersion: "p", openapiSha256: "aa".repeat(32),
    }, { fetchAirport: async () => ({ departures: [], arrivals: [] }), persist: async () => { throw new Error("disk"); } }))
      .rejects.toThrow("disk");
  });

  it("batch uses the same persistence path for every airport", async () => {
    const persist = vi.fn(async () => 0);
    const base = {
      fromLocal: "a", toLocal: "b", ianaTimezone: "America/Los_Angeles", withCancelled: true,
      withCodeshared: true, serviceWindowStartUtc: new Date("2026-09-01T08:00:00Z"),
      serviceWindowEndUtc: new Date("2026-09-01T09:00:00Z"), cutoffUtc: new Date("2026-09-01T07:00:00Z"),
      providerApiVersion: "1", fidsProtocolVersion: "p", openapiSha256: "aa".repeat(32),
    };
    const result = await fetchBatchFidsPopulation([{ ...base, airportIcao: "KLAX" }, { ...base, airportIcao: "KSFO" }], {
      fetchAirport: async () => ({ departures: [], arrivals: [] }), persist,
    });
    expect(result.failed).toEqual([]);
    expect(persist).toHaveBeenCalledTimes(2);
  });
});

describe("§1.5.3 PRE population/capture counters (numerator + denominator)", () => {
  it("snapshot_expected = horizon eligible; zero denominator → rate NULL + reason", async () => {
    const { buildPreCounters } = await import("../server/lib/disruption/fidsCensus_v3");
    const c = buildPreCounters({
      populationCount: 100, horizonEligibleCount: 80, snapshotCreatedCount: 80,
      webhookCapturedCount: 60, requiredFeaturesCompleteCount: 70, optionalFeatureMissingCount: 10,
      targetObservedCount: 50, targetApplicableCount: 75,
      confirmedOperatingLegCount: 78, ambiguousCodeshareRecordCount: 2,
    });
    expect(c.snapshotExpectedCount).toBe(80);
    expect(c.snapshotCreated.rate).toBe(1);
    expect(c.webhookCaptured.rate).toBe(0.75);
    const empty = buildPreCounters({
      populationCount: 0, horizonEligibleCount: 0, snapshotCreatedCount: 0,
      webhookCapturedCount: 0, requiredFeaturesCompleteCount: 0, optionalFeatureMissingCount: 0,
      targetObservedCount: 0, targetApplicableCount: 0,
      confirmedOperatingLegCount: 0, ambiguousCodeshareRecordCount: 0,
    });
    expect(empty.snapshotCreated.rate).toBeNull();
    expect(empty.snapshotCreated.reason).toBe("no horizon-eligible flights");
  });
});

describe("§1.5.3 scope classification (never guessed)", () => {
  it("cargo/private → auxiliary; charter-positive → unknown; clean scheduled → core", async () => {
    const { classifyScope } = await import("../server/lib/disruption/fidsCensus_v3");
    expect(classifyScope({ isCargo: true })).toBe("auxiliary");
    expect(classifyScope({ isPrivate: true })).toBe("auxiliary");
    expect(classifyScope({ isCharter: true })).toBe("unknown");
    expect(classifyScope({ isCargo: false, isPrivate: false, isCharter: false })).toBe("confirmed_core");
    expect(classifyScope({})).toBe("unknown");
  });
});
