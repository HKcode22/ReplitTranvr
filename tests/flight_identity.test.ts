/**
 * TEST-008: Canonical flight_instance_id (V3.9 Plan §7.1)
 *
 * Covers:
 *  - Stable physical flight_instance_id across retimes
 *  - <2h retime keeps same identity
 *  - ≥2h retime creates new identity with parent link
 *  - Date shift creates new identity
 *  - Codeshare classification (Unknown/IsOperator/IsCodeshared)
 *  - Codeshare dedup (marketing → operating leg)
 *  - Cross-airport duplicate detection
 *  - Collision fallback with hash suffix
 *  - Identity resolution status tracking
 */

import { describe, it, expect } from "vitest";
import {
  classifyCodeshare,
  detectRetime,
  canonicalFlightInstanceId,
  retimeFlightInstanceId,
  dedupCodeshares,
  isCrossAirportDuplicate,
  type CanonicalFlightInstanceInput,
} from "../server/lib/disruption/flightInstanceCanonical_v3";

// ---------------------------------------------------------------------------
// TEST-008: Canonical flight instance identity
// ---------------------------------------------------------------------------

describe("TEST-008: Canonical flight instance identity", () => {
  describe("Codeshare classification", () => {
    it("code 1 = IsOperator", () => {
      const state = classifyCodeshare(1);
      expect(state.label).toBe("IsOperator");
      expect(state.ambiguousUnknown).toBe(false);
    });

    it("code 2 = IsCodeshared", () => {
      const state = classifyCodeshare(2);
      expect(state.label).toBe("IsCodeshared");
      expect(state.ambiguousUnknown).toBe(false);
    });

    it("code 0 = Unknown (ambiguous)", () => {
      const state = classifyCodeshare(0);
      expect(state.label).toBe("Unknown");
      expect(state.ambiguousUnknown).toBe(true);
    });

    it("null/undefined treated as Unknown", () => {
      expect(classifyCodeshare(null).ambiguousUnknown).toBe(true);
      expect(classifyCodeshare(undefined).ambiguousUnknown).toBe(true);
    });
  });

  describe("Retime detection", () => {
    it("no retime for <2h shift on same date", () => {
      const prev = new Date("2026-09-01T10:00:00Z");
      const curr = new Date("2026-09-01T11:30:00Z"); // +90 min
      const result = detectRetime(prev, curr);

      expect(result.isRetime).toBe(false);
      expect(result.dateShifted).toBe(false);
    });

    it("retime for ≥2h shift on same date", () => {
      const prev = new Date("2026-09-01T10:00:00Z");
      const curr = new Date("2026-09-01T12:30:00Z"); // +150 min
      const result = detectRetime(prev, curr);

      expect(result.isRetime).toBe(true);
      expect(result.dateShifted).toBe(false);
      expect(result.retimeMinutes).toBe(150);
    });

    it("retime for any date shift", () => {
      const prev = new Date("2026-09-01T23:00:00Z");
      const curr = new Date("2026-09-02T01:00:00Z"); // next day
      const result = detectRetime(prev, curr);

      expect(result.isRetime).toBe(true);
      expect(result.dateShifted).toBe(true);
    });

    it("null inputs = no retime", () => {
      const result = detectRetime(null, new Date());
      expect(result.isRetime).toBe(false);
    });
  });

  describe("Canonical ID generation", () => {
    const baseInput: CanonicalFlightInstanceInput = {
      operatingCarrier: "UA",
      operatingFlightNumber: "123",
      origin: "KLAX",
      destinationOriginal: "KSFO",
      scheduledGateOutUtc: "2026-09-01T10:00:00Z",
      serviceDate: "2026-09-01",
    };

    it("generates deterministic fallback ID", () => {
      const id1 = canonicalFlightInstanceId(baseInput);
      const id2 = canonicalFlightInstanceId(baseInput);

      expect(id1.flight_instance_id).toBe(id2.flight_instance_id);
      expect(id1.flight_instance_id).toMatch(/^leg:[a-f0-9]{8}$/);
      expect(id1.isFallback).toBe(true);
    });

    it("different flights produce different IDs", () => {
      const id1 = canonicalFlightInstanceId(baseInput);
      const id2 = canonicalFlightInstanceId({
        ...baseInput,
        operatingFlightNumber: "456",
      });

      expect(id1.flight_instance_id).not.toBe(id2.flight_instance_id);
    });

    it("uses provider flight ID when stable and verified", () => {
      const id = canonicalFlightInstanceId({
        ...baseInput,
        providerFlightId: "adb_12345",
        providerFlightIdStable: true,
      });

      expect(id.flight_instance_id).toBe("pid:adb_12345");
      expect(id.isFallback).toBe(false);
    });

    it("falls back to leg hash when provider ID not stable", () => {
      const id = canonicalFlightInstanceId({
        ...baseInput,
        providerFlightId: "adb_12345",
        providerFlightIdStable: false,
      });

      expect(id.flight_instance_id).toMatch(/^leg:[a-f0-9]{8}$/);
      expect(id.isFallback).toBe(true);
    });

    it("normalizes carrier and strips leading zeros from number", () => {
      const id = canonicalFlightInstanceId({
        ...baseInput,
        operatingCarrier: "  ua  ",
        operatingFlightNumber: "00123",
      });

      expect(id.flight_instance_id).toMatch(/^leg:[a-f0-9]{8}$/);
      // The stable identity should have normalized values
      expect(id.stableIdentity).toContain("UA123");
    });

    it("collision suffix appended when provided", () => {
      const id1 = canonicalFlightInstanceId(baseInput, { collisionSuffix: "abc" });
      const id2 = canonicalFlightInstanceId(baseInput);

      expect(id1.flight_instance_id).toContain(":abc");
      expect(id2.flight_instance_id).not.toContain(":abc");
    });
  });

  describe("Retime identity linking", () => {
    it("retimed flight gets new ID with parent link", () => {
      const original = canonicalFlightInstanceId({
        operatingCarrier: "UA",
        operatingFlightNumber: "123",
        origin: "KLAX",
        destinationOriginal: "KSFO",
        scheduledGateOutUtc: "2026-09-01T10:00:00Z",
        serviceDate: "2026-09-01",
      });

      const retimed = retimeFlightInstanceId(original, {
        operatingCarrier: "UA",
        operatingFlightNumber: "123",
        origin: "KLAX",
        destinationOriginal: "KSFO",
        scheduledGateOutUtc: "2026-09-01T14:00:00Z", // +4h retime
        serviceDate: "2026-09-01",
      });

      expect(retimed.flight_instance_id).not.toBe(original.flight_instance_id);
      expect(retimed.retimeParentId).toBe(original.flight_instance_id);
    });
  });

  describe("Codeshare dedup", () => {
    it("deduplicates marketing codeshares to operating leg", () => {
      const rows = [
        {
          operatingCarrier: "UA",
          operatingFlightNumber: "123",
          origin: "KLAX",
          destinationOriginal: "KSFO",
          scheduledGateOutUtc: "2026-09-01T10:00:00Z",
          serviceDate: "2026-09-01",
          codeshareStatus: 1, // IsOperator
        },
        {
          operatingCarrier: "UA",
          operatingFlightNumber: "123",
          origin: "KLAX",
          destinationOriginal: "KSFO",
          scheduledGateOutUtc: "2026-09-01T10:00:00Z",
          serviceDate: "2026-09-01",
          marketingCarrier: "LH",
          marketingNumber: "9001",
          codeshareStatus: 2, // IsCodeshared
        },
        {
          operatingCarrier: "UA",
          operatingFlightNumber: "123",
          origin: "KLAX",
          destinationOriginal: "KSFO",
          scheduledGateOutUtc: "2026-09-01T10:00:00Z",
          serviceDate: "2026-09-01",
          marketingCarrier: "AC",
          marketingNumber: "8001",
          codeshareStatus: 2,
        },
      ];

      const deduped = dedupCodeshares(rows);

      expect(deduped.size).toBe(1); // One physical flight
      const entry = Array.from(deduped.values())[0];
      expect(entry.marketing).toContain("LH9001");
      expect(entry.marketing).toContain("AC8001");
      expect(entry.codeshareState.label).toBe("IsOperator");
    });

    it("preserves Unknown state when no IsOperator seen", () => {
      const rows = [
        {
          operatingCarrier: "UA",
          operatingFlightNumber: "123",
          origin: "KLAX",
          destinationOriginal: "KSFO",
          scheduledGateOutUtc: "2026-09-01T10:00:00Z",
          serviceDate: "2026-09-01",
          codeshareStatus: 0, // Unknown
        },
      ];

      const deduped = dedupCodeshares(rows);
      const entry = Array.from(deduped.values())[0];
      expect(entry.codeshareState.ambiguousUnknown).toBe(true);
    });
  });

  describe("Cross-airport duplicate detection", () => {
    it("detects same flight from origin and destination", () => {
      const a: CanonicalFlightInstanceInput = {
        operatingCarrier: "UA",
        operatingFlightNumber: "123",
        origin: "KLAX",
        destinationOriginal: "KSFO",
        scheduledGateOutUtc: "2026-09-01T10:00:00Z",
        serviceDate: "2026-09-01",
      };
      const b: CanonicalFlightInstanceInput = {
        operatingCarrier: "UA",
        operatingFlightNumber: "123",
        origin: "KSFO",
        destinationOriginal: "KLAX",
        scheduledGateOutUtc: "2026-09-01T10:00:00Z",
        serviceDate: "2026-09-01",
      };

      expect(isCrossAirportDuplicate(a, b)).toBe(true);
    });

    it("rejects different flight numbers", () => {
      const a: CanonicalFlightInstanceInput = {
        operatingCarrier: "UA",
        operatingFlightNumber: "123",
        origin: "KLAX",
        destinationOriginal: "KSFO",
        scheduledGateOutUtc: "2026-09-01T10:00:00Z",
        serviceDate: "2026-09-01",
      };
      const b: CanonicalFlightInstanceInput = {
        operatingCarrier: "UA",
        operatingFlightNumber: "456",
        origin: "KSFO",
        destinationOriginal: "KLAX",
        scheduledGateOutUtc: "2026-09-01T10:00:00Z",
        serviceDate: "2026-09-01",
      };

      expect(isCrossAirportDuplicate(a, b)).toBe(false);
    });

    it("rejects different carriers", () => {
      const a: CanonicalFlightInstanceInput = {
        operatingCarrier: "UA",
        operatingFlightNumber: "123",
        origin: "KLAX",
        destinationOriginal: "KSFO",
        scheduledGateOutUtc: "2026-09-01T10:00:00Z",
        serviceDate: "2026-09-01",
      };
      const b: CanonicalFlightInstanceInput = {
        operatingCarrier: "AA",
        operatingFlightNumber: "123",
        origin: "KSFO",
        destinationOriginal: "KLAX",
        scheduledGateOutUtc: "2026-09-01T10:00:00Z",
        serviceDate: "2026-09-01",
      };

      expect(isCrossAirportDuplicate(a, b)).toBe(false);
    });
  });
});
