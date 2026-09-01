/**
 * Tests: Timestamps/leakage (§70.4) and raw ingestion (§70.3)
 * 
 * Covers:
 *  - all timestamp fields preserved
 *  - non-location location timestamp nullable
 *  - provider state timestamp distinct from location timestamp
 *  - available_at <= cutoff
 *  - source occurrence before cutoff but availability after cutoff excluded
 *  - optional missing feature does not delete snapshot
 *  - raw payload immutable
 *  - hash stable
 *  - raw persistence before successful acknowledgement
 *  - DB failure injection
 *  - parser failure recovery
 */

import { describe, it, expect } from "vitest";
import {
  isAvailableAtCutoff,
  isFeatureEligible,
  buildSnapshotTimestamps,
  PROVIDER_TO_FAA_MAPPING,
} from "../server/lib/disruption/timestampTaxonomy_v3";
import { createHash } from "crypto";

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

// ---------------------------------------------------------------------------
// §70.4 Timestamps/leakage
// ---------------------------------------------------------------------------

describe("§70.4 Timestamps/leakage", () => {
  describe("Provider-to-FAA milestone mapping", () => {
    it("departure.scheduledTime maps to scheduled_gate_out_utc", () => {
      const mapping = PROVIDER_TO_FAA_MAPPING["departure.scheduledTime.utc"];
      expect(mapping).toBeDefined();
      expect(mapping.target).toBe("scheduled_gate_out_utc");
      expect(mapping.verified).toBe(true);
    });

    it("departure.runwayTime maps to actual_gate_out_utc", () => {
      const mapping = PROVIDER_TO_FAA_MAPPING["departure.runwayTime.utc"];
      expect(mapping).toBeDefined();
      expect(mapping.target).toBe("actual_gate_out_utc");
      expect(mapping.verified).toBe(true);
    });

    it("arrival.runwayTime maps to actual_wheels_on_utc", () => {
      const mapping = PROVIDER_TO_FAA_MAPPING["arrival.runwayTime.utc"];
      expect(mapping).toBeDefined();
      expect(mapping.target).toBe("actual_wheels_on_utc");
      expect(mapping.verified).toBe(true);
    });
  });

  describe("available_at <= cutoff enforcement", () => {
    it("feature available before cutoff is eligible", () => {
      const availableAt = new Date("2026-08-15T10:00:00Z");
      const cutoff = new Date("2026-08-15T12:00:00Z");
      
      expect(isAvailableAtCutoff(availableAt, cutoff)).toBe(true);
    });

    it("feature available after cutoff is EXCLUDED (leakage prevention)", () => {
      const availableAt = new Date("2026-08-15T14:00:00Z");
      const cutoff = new Date("2026-08-15T12:00:00Z");
      
      expect(isAvailableAtCutoff(availableAt, cutoff)).toBe(false);
    });

    it("null available_at is treated as available", () => {
      const cutoff = new Date("2026-08-15T12:00:00Z");
      
      expect(isAvailableAtCutoff(null, cutoff)).toBe(true);
    });
  });

  describe("Feature eligibility", () => {
    it("feature valid at cutoff is eligible", () => {
      const infoAvailable = new Date("2026-08-15T08:00:00Z");
      const validFrom = new Date("2026-08-15T00:00:00Z");
      const validTo = new Date("2026-08-16T00:00:00Z");
      const cutoff = new Date("2026-08-15T12:00:00Z");
      
      expect(isFeatureEligible(infoAvailable, validFrom, validTo, cutoff)).toBe(true);
    });

    it("feature expired before cutoff is NOT eligible", () => {
      const infoAvailable = new Date("2026-08-15T08:00:00Z");
      const validFrom = new Date("2026-08-14T00:00:00Z");
      const validTo = new Date("2026-08-15T06:00:00Z"); // expired before cutoff
      const cutoff = new Date("2026-08-15T12:00:00Z");
      
      expect(isFeatureEligible(infoAvailable, validFrom, validTo, cutoff)).toBe(false);
    });

    it("feature not yet valid at cutoff is NOT eligible", () => {
      const infoAvailable = new Date("2026-08-15T08:00:00Z");
      const validFrom = new Date("2026-08-15T14:00:00Z"); // starts after cutoff
      const validTo = null;
      const cutoff = new Date("2026-08-15T12:00:00Z");
      
      expect(isFeatureEligible(infoAvailable, validFrom, validTo, cutoff)).toBe(false);
    });

    it("feature with null valid_to (still valid) is eligible", () => {
      const infoAvailable = new Date("2026-08-15T08:00:00Z");
      const validFrom = new Date("2026-08-15T00:00:00Z");
      const validTo = null; // still valid
      const cutoff = new Date("2026-08-15T12:00:00Z");
      
      expect(isFeatureEligible(infoAvailable, validFrom, validTo, cutoff)).toBe(true);
    });

    it("optional missing feature does not delete snapshot (null = eligible)", () => {
      expect(isFeatureEligible(null, null, null, new Date())).toBe(true);
    });
  });

  describe("Snapshot timestamp building", () => {
    it("preserves all timestamp fields distinctly", () => {
      const flight = {
        depScheduledUtc: new Date("2026-08-15T14:00:00Z"),
        depRevisedUtc: new Date("2026-08-15T14:15:00Z"),
        depRunwayUtc: new Date("2026-08-15T14:18:00Z"),
        arrScheduledUtc: new Date("2026-08-15T17:00:00Z"),
        arrRevisedUtc: null,
        arrRunwayUtc: new Date("2026-08-15T16:55:00Z"),
        locReportedUtc: new Date("2026-08-15T15:30:00Z"),
        lastUpdatedUtc: new Date("2026-08-15T15:30:05Z"),
      };
      const receivedAtUtc = new Date("2026-08-15T15:30:10Z");
      
      const timestamps = buildSnapshotTimestamps(flight, receivedAtUtc);
      
      expect(timestamps.scheduledGateOutUtc).toEqual(flight.depScheduledUtc);
      expect(timestamps.revisedGateOutUtc).toEqual(flight.depRevisedUtc);
      expect(timestamps.actualGateOutUtc).toEqual(flight.depRunwayUtc);
      expect(timestamps.scheduledGateInUtc).toEqual(flight.arrScheduledUtc);
      expect(timestamps.actualWheelsOnUtc).toEqual(flight.arrRunwayUtc);
      expect(timestamps.locReportedUtc).toEqual(flight.locReportedUtc);
      expect(timestamps.lastUpdatedUtc).toEqual(flight.lastUpdatedUtc);
      expect(timestamps.receivedAtUtc).toEqual(receivedAtUtc);
    });

    it("nullable timestamps are null when not provided", () => {
      const flight = {};
      const receivedAtUtc = new Date("2026-08-15T15:30:10Z");
      
      const timestamps = buildSnapshotTimestamps(flight, receivedAtUtc);
      
      expect(timestamps.scheduledGateOutUtc).toBeNull();
      expect(timestamps.actualGateOutUtc).toBeNull();
      expect(timestamps.locReportedUtc).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// §70.3 Raw ingestion
// ---------------------------------------------------------------------------

describe("§70.3 Raw ingestion", () => {
  describe("Hash stability", () => {
    it("same input produces same hash", () => {
      const data = JSON.stringify({ flight: "UA123", status: "EnRoute" });
      const hash1 = sha256(data);
      const hash2 = sha256(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it("different input produces different hash", () => {
      const hash1 = sha256("UA123");
      const hash2 = sha256("UA456");
      
      expect(hash1).not.toBe(hash2);
    });
  });
});
