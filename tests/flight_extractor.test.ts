/**
 * TEST-009: Flight notification extractor (V3.9 Plan §5-8)
 *
 * Covers:
 *  - Status code normalization (numeric → string)
 *  - Codeshare status classification
 *  - Quality array handling (numeric → string)
 *  - Missing field → null (never 0)
 *  - data_stage determination (PRE/POST)
 *  - Dedup key stability
 *  - Event key with location updates
 *  - Sampling metadata attachment
 *  - Payload JSON preservation
 */

import { describe, it, expect } from "vitest";
import {
  extractFlightNotification,
  eventKey,
  STATUS_CODE_BY_NUMBER,
  CODESHARE_CODE,
  QUALITY_CODE,
  type ExtractionContext,
} from "../server/lib/disruption/flightNotificationExtractor_v3";

// ---------------------------------------------------------------------------
// TEST-009: Flight notification extractor
// ---------------------------------------------------------------------------

describe("TEST-009: Flight notification extractor", () => {
  const baseCtx: ExtractionContext = {
    receivedAt: new Date("2026-09-01T12:00:00Z"),
    index: 0,
  };

  describe("Status code normalization", () => {
    it("maps numeric status code to string name", () => {
      expect(STATUS_CODE_BY_NUMBER[0]).toBe("Unknown");
      expect(STATUS_CODE_BY_NUMBER[1]).toBe("Expected");
      expect(STATUS_CODE_BY_NUMBER[2]).toBe("EnRoute");
      expect(STATUS_CODE_BY_NUMBER[6]).toBe("Departed");
      expect(STATUS_CODE_BY_NUMBER[10]).toBe("Canceled");
      expect(STATUS_CODE_BY_NUMBER[12]).toBe("CanceledUncertain");
    });

    it("CanceledUncertain (code 12) is distinct from Canceled (code 10)", () => {
      expect(STATUS_CODE_BY_NUMBER[10]).not.toBe(STATUS_CODE_BY_NUMBER[12]);
      expect(STATUS_CODE_BY_NUMBER[12]).toBe("CanceledUncertain");
    });
  });

  describe("Codeshare classification", () => {
    it("code 0 = Unknown", () => {
      expect(CODESHARE_CODE[0]).toBe("Unknown");
    });

    it("code 1 = IsOperator", () => {
      expect(CODESHARE_CODE[1]).toBe("IsOperator");
    });

    it("code 2 = IsCodeshared", () => {
      expect(CODESHARE_CODE[2]).toBe("IsCodeshared");
    });
  });

  describe("Quality array handling", () => {
    it("maps numeric quality codes to string names", () => {
      expect(QUALITY_CODE[0]).toBe("Basic");
      expect(QUALITY_CODE[1]).toBe("Live");
      expect(QUALITY_CODE[2]).toBe("Approximate");
    });
  });

  describe("Extraction", () => {
    it("extracts basic flight fields", () => {
      const raw = {
        number: "UA123",
        airline: { iata: "UA", icao: "UAL", name: "United Airlines" },
        status: 2, // EnRoute
        departure: {
          airport: { icao: "KLAX", iata: "LAX" },
          scheduledTime: { utc: "2026-09-01T10:00:00Z" },
        },
        arrival: {
          airport: { icao: "KSFO", iata: "SFO" },
          scheduledTime: { utc: "2026-09-01T11:30:00Z" },
        },
        lastUpdatedUtc: "2026-09-01T12:00:00Z",
      };

      const row = extractFlightNotification(raw, baseCtx);
      expect(row).not.toBeNull();
      expect(row!.flightNumber).toBe("UA123");
      expect(row!.carrierIata).toBe("UA");
      expect(row!.status).toBe("EnRoute");
      expect(row!.statusCode).toBe(2);
    });

    it("returns null for missing flight number", () => {
      const raw = { airline: { iata: "UA" } };
      const row = extractFlightNotification(raw, baseCtx);
      expect(row).toBeNull();
    });

    it("missing fields are null, never 0", () => {
      const raw = { number: "UA123" };
      const row = extractFlightNotification(raw, baseCtx);
      expect(row).not.toBeNull();
      expect(row!.depAirportIcao).toBeNull();
      expect(row!.arrAirportIcao).toBeNull();
      expect(row!.locLat).toBeNull();
      expect(row!.gcdKm).toBeNull();
    });

    it("determines PRE stage when no location and no POST status", () => {
      const raw = {
        number: "UA123",
        status: 1, // Scheduled (PRE status)
      };
      const row = extractFlightNotification(raw, baseCtx);
      expect(row!.dataStage).toBe("PRE");
      expect(row!.hasLiveLocation).toBe(false);
    });

    it("determines POST stage when location present", () => {
      const raw = {
        number: "UA123",
        status: 2, // EnRoute
        location: { lat: 34.05, lon: -118.25 },
      };
      const row = extractFlightNotification(raw, baseCtx);
      expect(row!.dataStage).toBe("POST");
      expect(row!.hasLiveLocation).toBe(true);
    });

    it("determines POST stage for departed status without location", () => {
      const raw = {
        number: "UA123",
        status: 6, // Departed
      };
      const row = extractFlightNotification(raw, baseCtx);
      expect(row!.dataStage).toBe("POST");
      expect(row!.hasLiveLocation).toBe(false);
    });

    it("codeshare status extracted as string", () => {
      const raw = {
        number: "UA123",
        codeshareStatus: 1, // IsOperator
      };
      const row = extractFlightNotification(raw, baseCtx);
      expect(row!.codeshareStatus).toBe("IsOperator");
    });

    it("quality array mapped from numeric to string", () => {
      const raw = {
        number: "UA123",
        departure: { quality: [0, 1] }, // Basic, Live
      };
      const row = extractFlightNotification(raw, baseCtx);
      expect(row!.depQuality).toEqual(["Basic", "Live"]);
    });

    it("preserves raw payload in payload_json", () => {
      const raw = { number: "UA123", custom: "data" };
      const row = extractFlightNotification(raw, baseCtx);
      expect(row!.payloadJson).toEqual(raw);
    });

    it("dedup key is stable for same input", () => {
      const raw = {
        number: "UA123",
        lastUpdatedUtc: "2026-09-01T12:00:00Z",
      };
      const row1 = extractFlightNotification(raw, baseCtx);
      const row2 = extractFlightNotification(raw, baseCtx);
      expect(row1!.dedupKey).toBe(row2!.dedupKey);
    });
  });

  describe("Event key", () => {
    it("event key includes location timestamp when present", () => {
      const k1 = eventKey({
        flightNumber: "UA123",
        carrierIata: "UA",
        locReportedUtc: new Date("2026-09-01T12:00:00Z"),
        lastUpdatedUtc: new Date("2026-09-01T12:00:00Z"),
        receivedAt: new Date("2026-09-01T12:00:05Z"),
        index: 0,
      });

      const k2 = eventKey({
        flightNumber: "UA123",
        carrierIata: "UA",
        locReportedUtc: new Date("2026-09-01T12:01:00Z"), // different location time
        lastUpdatedUtc: new Date("2026-09-01T12:00:00Z"),
        receivedAt: new Date("2026-09-01T12:00:05Z"),
        index: 0,
      });

      // Different location timestamps → different event keys
      expect(k1).not.toBe(k2);
    });

    it("event key falls back to lastUpdatedUtc when no location", () => {
      const k = eventKey({
        flightNumber: "UA123",
        carrierIata: "UA",
        locReportedUtc: null,
        lastUpdatedUtc: new Date("2026-09-01T12:00:00Z"),
        receivedAt: new Date("2026-09-01T12:00:05Z"),
        index: 0,
      });

      expect(k).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("Sampling metadata", () => {
    it("attaches sampling metadata when provided", () => {
      const raw = { number: "UA123" };
      const ctx: ExtractionContext = {
        ...baseCtx,
        sampling: {
          batchId: "batch_001",
          tier: "REGIONAL",
          isRandomized: true,
          airportLayerDesignProbability: 0.15,
          plannedShare: null,
          samplingWeight: 0.8,
          randomSeed: "seed-123",
          windowStart: new Date("2026-09-01T08:00:00Z"),
          windowEnd: new Date("2026-09-01T14:00:00Z"),
        },
      };

      const row = extractFlightNotification(raw, ctx);
      expect(row!.samplingBatchId).toBe("batch_001");
      expect(row!.airportTier).toBe("REGIONAL");
      expect(row!.isRandomized).toBe(true);
      expect(row!.airportLayerDesignProbability).toBe(0.15);
    });

    it("defaults isRandomized to false when sampling is null", () => {
      const raw = { number: "UA123" };
      const row = extractFlightNotification(raw, baseCtx);
      expect(row!.isRandomized).toBe(false);
    });
  });
});
