/**
 * TEST-008: Canonical flight_instance_id (V3.9 Plan §7.1 / Identity-v2)
 *
 * Covers:
 *  - Stable physical flight_instance_id across retimes (CRIT-008)
 *  - Retime = append-only schedule version under the SAME flight_instance_id
 *  - Provider flight.id is NEVER canonical key material (§7.1)
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
  resolveWebhookFlightIdentity,
  type WebhookIdentityPersistence,
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

    it("provider flight ID is NOT canonical key material (identity-v2 §7.1)", () => {
      const withPid = canonicalFlightInstanceId({
        ...baseInput,
        providerFlightId: "adb_12345",
        providerFlightIdStable: true,
      });
      const withoutPid = canonicalFlightInstanceId({
        ...baseInput,
        providerFlightId: null,
      });

      // The physical ID must NOT depend on provider flight.id.
      expect(withPid.flight_instance_id).toBe(withoutPid.flight_instance_id);
      expect(withPid.flight_instance_id).toMatch(/^leg:[a-f0-9]{8}$/);
    });

    it("provider record key is never key material either", () => {
      const withKey = canonicalFlightInstanceId({
        ...baseInput,
        providerRecordKey: "rec_abc",
      });
      const withoutKey = canonicalFlightInstanceId(baseInput);
      expect(withKey.flight_instance_id).toBe(withoutKey.flight_instance_id);
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

  describe("Retime identity linking (identity-v2 §7.1 — CRIT-008)", () => {
    const original = canonicalFlightInstanceId({
      operatingCarrier: "UA",
      operatingFlightNumber: "123",
      origin: "KLAX",
      destinationOriginal: "KSFO",
      scheduledGateOutUtc: "2026-09-01T10:00:00Z",
      serviceDate: "2026-09-01",
    });

    it("≥2h retime keeps the SAME flight_instance_id (append-only schedule version)", () => {
      const retimed = retimeFlightInstanceId(original, {
        operatingCarrier: "UA",
        operatingFlightNumber: "123",
        origin: "KLAX",
        destinationOriginal: "KSFO",
        scheduledGateOutUtc: "2026-09-01T14:00:00Z", // +4h retime
        serviceDate: "2026-09-01",
      });

      expect(retimed.flight_instance_id).toBe(original.flight_instance_id);
      expect(retimed.retimeVersion).toBe((original.retimeVersion ?? 0) + 1);
      expect(retimed.scheduleVersionId).toBeDefined();
      expect(retimed.scheduleVersionId).not.toBe(original.scheduleVersionId);
    });

    it("date-shift retime keeps the SAME flight_instance_id too", () => {
      const retimed = retimeFlightInstanceId(original, {
        operatingCarrier: "UA",
        operatingFlightNumber: "123",
        origin: "KLAX",
        destinationOriginal: "KSFO",
        scheduledGateOutUtc: "2026-09-02T10:00:00Z", // next day
        serviceDate: "2026-09-01",
      });

      expect(retimed.flight_instance_id).toBe(original.flight_instance_id);
      expect(retimed.retimeVersion).toBeGreaterThan((original.retimeVersion ?? 0));
    });

    it("initial_service_date is immutable across retimes", () => {
      const retimed = retimeFlightInstanceId(original, {
        operatingCarrier: "UA",
        operatingFlightNumber: "123",
        origin: "KLAX",
        destinationOriginal: "KSFO",
        scheduledGateOutUtc: "2026-09-02T10:00:00Z",
        serviceDate: "2026-09-02", // later schedule claims a different date
      });

      // The physical identity keeps the ORIGINAL first-observed service date.
      expect(retimed.initialServiceDate).toBe("2026-09-01");
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

describe("Phase 0D: route/tail identity contract (§1.5.4 items 13–15)", () => {
  it("tail fallback chain: reg > modeS > icao24 > verified provider id", async () => {
    const { resolveTailIdentity } = await import("../server/lib/disruption/flightInstanceCanonical_v3");
    expect(resolveTailIdentity({ aircraftReg: "N123UA" })).toMatchObject({ tailKey: "N123UA", tailKnown: true, tailSource: "aircraft_reg" });
    expect(resolveTailIdentity({ aircraftModeS: "a1b2c3" })).toMatchObject({ tailKey: "A1B2C3", tailKnown: false, tailSource: "mode_s" });
    expect(resolveTailIdentity({ icao24: "abc123" })).toMatchObject({ tailSource: "icao24", tailKnown: false });
    expect(resolveTailIdentity({ providerAircraftId: "p1", providerAircraftIdVerified: true }).tailSource).toBe("provider_aircraft_id");
    // Unverified provider id never counts.
    expect(resolveTailIdentity({ providerAircraftId: "p1" })).toMatchObject({ tailKey: null, tailKnown: false, tailSource: "unknown" });
    expect(resolveTailIdentity({})).toMatchObject({ tailKey: null, tailKnown: false });
  });

  it("diversion flag + separate destinations; midnight crossing recorded", async () => {
    const { resolveRouteIdentity } = await import("../server/lib/disruption/flightInstanceCanonical_v3");
    const normal = resolveRouteIdentity({
      originIcao: "KLAX", originalScheduledDestinationIcao: "KSFO",
      actualDestinationIcao: "KSFO",
      scheduledGateOutUtc: "2026-09-01T10:00:00Z", actualWheelsOnUtc: "2026-09-01T11:15:00Z",
    });
    expect(normal.diversionFlag).toBe(false);
    expect(normal.midnightCrossing).toBe(false);
    const diverted = resolveRouteIdentity({
      originIcao: "KLAX", originalScheduledDestinationIcao: "KSFO",
      currentOperationalDestinationIcao: "KOAK", actualDestinationIcao: "KOAK",
      scheduledGateOutUtc: "2026-09-01T23:30:00Z", actualWheelsOnUtc: "2026-09-02T01:00:00Z",
    });
    expect(diverted.diversionFlag).toBe(true);
    expect(diverted.currentOperationalDestinationIcao).toBe("KOAK");
    expect(diverted.originalScheduledDestinationIcao).toBe("KSFO");
    expect(diverted.midnightCrossing).toBe(true);
  });
});

describe("production webhook canonical identity", () => {
  function memoryPersistence(): WebhookIdentityPersistence {
    const aliases = new Map<string, { flightInstanceId: string; initialServiceDate: string }>();
    return {
      async resolveOrCreate(input) {
        const alias = input.providerFlightId ?? `${input.operatingCarrier}${input.operatingFlightNumber}|${input.originIcao}|${input.originalDestinationIcao}|${input.initialServiceDate}`;
        const existing = aliases.get(alias);
        if (existing) return existing;
        const created = { flightInstanceId: input.flightInstanceId, initialServiceDate: input.initialServiceDate };
        aliases.set(alias, created);
        return created;
      },
    };
  }

  it("uses the origin-local date when UTC is across midnight", async () => {
    const result = await resolveWebhookFlightIdentity({
      operatingCarrier: "UA", operatingFlightNumber: "123", originIcao: "KLAX",
      originalDestinationIcao: "KSFO", scheduledGateOutUtc: "2026-09-02T06:30:00Z",
      originTimeZone: "America/Los_Angeles", scheduleVerified: true, providerFlightId: "provider-1",
    }, memoryPersistence());
    expect(result).toMatchObject({ status: "resolved", initialServiceDate: "2026-09-01" });
  });

  it("reuses the first identity and local date after a date-shift retime", async () => {
    const persistence = memoryPersistence();
    const first = await resolveWebhookFlightIdentity({
      operatingCarrier: "UA", operatingFlightNumber: "123", originIcao: "KLAX",
      originalDestinationIcao: "KSFO", scheduledGateOutUtc: "2026-09-02T06:30:00Z",
      originTimeZone: "America/Los_Angeles", scheduleVerified: true, providerFlightId: "provider-2",
    }, persistence);
    const retimed = await resolveWebhookFlightIdentity({
      operatingCarrier: "UA", operatingFlightNumber: "123", originIcao: "KLAX",
      originalDestinationIcao: "KSFO", scheduledGateOutUtc: "2026-09-03T08:30:00Z",
      originTimeZone: "America/Los_Angeles", scheduleVerified: true, providerFlightId: "provider-2",
    }, persistence);
    expect(retimed).toEqual(first);
  });

  it("quarantines missing/unverified schedule and invalid timezone without persistence", async () => {
    let calls = 0;
    const persistence: WebhookIdentityPersistence = { async resolveOrCreate() { calls++; throw new Error("must not persist"); } };
    const base = { operatingCarrier: "UA", operatingFlightNumber: "123", originIcao: "KLAX", originalDestinationIcao: "KSFO", providerFlightId: "p" };
    expect((await resolveWebhookFlightIdentity({ ...base, scheduledGateOutUtc: null, originTimeZone: "America/Los_Angeles", scheduleVerified: false }, persistence)).status).toBe("quarantined");
    expect((await resolveWebhookFlightIdentity({ ...base, scheduledGateOutUtc: "2026-09-02T06:30:00Z", originTimeZone: "not-a-zone", scheduleVerified: true }, persistence)).status).toBe("quarantined");
    expect(calls).toBe(0);
  });

  it("provider flight ID is an alias only, not canonical key material", async () => {
    const observation = {
      operatingCarrier: "UA", operatingFlightNumber: "123", originIcao: "KLAX",
      originalDestinationIcao: "KSFO", scheduledGateOutUtc: "2026-09-02T06:30:00Z",
      originTimeZone: "America/Los_Angeles", scheduleVerified: true,
    };
    const a = await resolveWebhookFlightIdentity({ ...observation, providerFlightId: "a" }, memoryPersistence());
    const b = await resolveWebhookFlightIdentity({ ...observation, providerFlightId: "b" }, memoryPersistence());
    expect(a.status === "resolved" && b.status === "resolved" && a.flightInstanceId).toBe(b.status === "resolved" ? b.flightInstanceId : "");
  });
});
