import { describe, expect, it } from "vitest";
import {
  canonicalFlightInstanceId,
  classifyCodeshare,
  detectRetime,
  isCrossAirportDuplicate,
  resolveRouteIdentity,
  resolveTailIdentity,
  resolveWebhookFlightIdentity,
  retimeFlightInstanceId,
  type CanonicalFlightInstanceInput,
  type WebhookIdentityPersistence,
} from "../server/lib/disruption/flightInstanceCanonical_v3";

const BASE: CanonicalFlightInstanceInput = {
  operatingCarrier: "UA",
  operatingFlightNumber: "123",
  origin: "KLAX",
  destinationOriginal: "KSFO",
  scheduledGateOutUtc: "2026-09-02T06:40:00Z",
  serviceDate: "2026-09-01",
  initialServiceDate: "2026-09-01",
  firstScheduledGateOutUtc: "2026-09-02T06:40:00Z",
};

describe("V3.9 Identity-v2 canonical key", () => {
  it("is deterministic and excludes provider flight/record ids from key material", () => {
    const a = canonicalFlightInstanceId({ ...BASE, providerFlightId: "provider-a", providerRecordKey: "record-a" });
    const b = canonicalFlightInstanceId({ ...BASE, providerFlightId: "provider-b", providerRecordKey: "record-b" });
    expect(a.flight_instance_id).toBe(b.flight_instance_id);
    expect(a.stableIdentity).toContain("UA123|KLAX|KSFO|2026-09-01|2026-09-02T06:40:00Z");
  });

  it("normalizes carrier and flight number", () => {
    const a = canonicalFlightInstanceId({ ...BASE, operatingCarrier: " ua ", operatingFlightNumber: "00123" });
    expect(a.stableIdentity.startsWith("UA123|")) .toBe(true);
  });

  it("genuine next-service-day recurring leg is DISTINCT", () => {
    const first = canonicalFlightInstanceId(BASE);
    const nextDay = canonicalFlightInstanceId({
      ...BASE,
      scheduledGateOutUtc: "2026-09-03T06:40:00Z",
      serviceDate: "2026-09-02",
      initialServiceDate: "2026-09-02",
      firstScheduledGateOutUtc: "2026-09-03T06:40:00Z",
    });
    expect(nextDay.flight_instance_id).not.toBe(first.flight_instance_id);
  });

  it("same-day same-number/route legs with distinct first schedules are DISTINCT", () => {
    const first = canonicalFlightInstanceId(BASE);
    const second = canonicalFlightInstanceId({
      ...BASE,
      scheduledGateOutUtc: "2026-09-02T15:00:00Z",
      firstScheduledGateOutUtc: "2026-09-02T15:00:00Z",
    });
    expect(second.flight_instance_id).not.toBe(first.flight_instance_id);
  });

  it("cross-midnight retime preserves the immutable physical ID", () => {
    const first = canonicalFlightInstanceId(BASE);
    const retimed = retimeFlightInstanceId(first, {
      ...BASE,
      scheduledGateOutUtc: "2026-09-02T07:20:00Z",
      serviceDate: "2026-09-02",
    });
    expect(retimed.flight_instance_id).toBe(first.flight_instance_id);
    expect(retimed.initialServiceDate).toBe("2026-09-01");
    expect(retimed.firstScheduledGateOutUtc).toBe("2026-09-02T06:40:00Z");
    expect(retimed.scheduleVersionId).not.toBe(first.scheduleVersionId);
  });

  it("detects >=2h and date-shift schedule revisions", () => {
    expect(detectRetime(new Date("2026-09-01T10:00:00Z"), new Date("2026-09-01T12:01:00Z")).isRetime).toBe(true);
    expect(detectRetime(new Date("2026-09-01T23:50:00Z"), new Date("2026-09-02T00:10:00Z")).isRetime).toBe(true);
    expect(detectRetime(new Date("2026-09-01T10:00:00Z"), new Date("2026-09-01T11:00:00Z")).isRetime).toBe(false);
  });
});

describe("production webhook identity boundary", () => {
  function capturePersistence(): { persistence: WebhookIdentityPersistence; inputs: any[] } {
    const inputs: any[] = [];
    return {
      inputs,
      persistence: {
        async resolveOrCreate(input) {
          inputs.push(input);
          return { flightInstanceId: input.flightInstanceId, initialServiceDate: input.initialServiceDate };
        },
      },
    };
  }

  it("uses origin-local service date and forwards retained linkage evidence", async () => {
    const cap = capturePersistence();
    const result = await resolveWebhookFlightIdentity({
      operatingCarrier: "UA",
      operatingFlightNumber: "123",
      originIcao: "KLAX",
      originalDestinationIcao: "KSFO",
      scheduledGateOutUtc: "2026-09-02T06:40:00Z",
      originTimeZone: "America/Los_Angeles",
      scheduleVerified: true,
      providerFlightId: null,
      providerRecordKey: "raw-record-1",
      callsign: "UAL123",
    }, cap.persistence);
    expect(result).toMatchObject({ status: "resolved", initialServiceDate: "2026-09-01" });
    expect(cap.inputs[0]).toMatchObject({
      initialServiceDate: "2026-09-01",
      providerRecordKey: "raw-record-1",
      callsign: "UAL123",
    });
  });

  it("quarantines missing/unverified schedule, timezone, or required operating-leg fields", async () => {
    let calls = 0;
    const persistence: WebhookIdentityPersistence = {
      async resolveOrCreate() { calls += 1; throw new Error("must not persist"); },
    };
    const base = {
      operatingCarrier: "UA", operatingFlightNumber: "123", originIcao: "KLAX",
      originalDestinationIcao: "KSFO", providerFlightId: null,
    };
    expect((await resolveWebhookFlightIdentity({ ...base, scheduledGateOutUtc: null, originTimeZone: "America/Los_Angeles", scheduleVerified: false }, persistence)).status).toBe("quarantined");
    expect((await resolveWebhookFlightIdentity({ ...base, scheduledGateOutUtc: "2026-09-02T06:40:00Z", originTimeZone: "not-a-zone", scheduleVerified: true }, persistence)).status).toBe("quarantined");
    expect((await resolveWebhookFlightIdentity({ ...base, operatingFlightNumber: null, scheduledGateOutUtc: "2026-09-02T06:40:00Z", originTimeZone: "America/Los_Angeles", scheduleVerified: true }, persistence)).status).toBe("quarantined");
    expect(calls).toBe(0);
  });

  it("propagates infrastructure failure rather than silently inventing identity", async () => {
    const persistence: WebhookIdentityPersistence = { async resolveOrCreate() { throw new Error("db down"); } };
    await expect(resolveWebhookFlightIdentity({
      operatingCarrier: "UA", operatingFlightNumber: "123", originIcao: "KLAX",
      originalDestinationIcao: "KSFO", scheduledGateOutUtc: "2026-09-02T06:40:00Z",
      originTimeZone: "America/Los_Angeles", scheduleVerified: true, providerFlightId: null,
    }, persistence)).rejects.toThrow("db down");
  });
});

describe("codeshare/route/tail invariants", () => {
  it("keeps codeshare Unknown ambiguous", () => {
    expect(classifyCodeshare(0)).toMatchObject({ label: "Unknown", ambiguousUnknown: true });
    expect(classifyCodeshare(1)).toMatchObject({ label: "IsOperator", ambiguousUnknown: false });
    expect(classifyCodeshare(2)).toMatchObject({ label: "IsCodeshared", ambiguousUnknown: false });
  });

  it("cross-airport duplicate requires same carrier/number and matching directed route pair", () => {
    expect(isCrossAirportDuplicate(BASE, { ...BASE, origin: "KSFO", destinationOriginal: "KLAX" })).toBe(true);
    expect(isCrossAirportDuplicate(BASE, { ...BASE, operatingFlightNumber: "456" })).toBe(false);
  });

  it("tail fallback never marks non-registration fallbacks as known", () => {
    expect(resolveTailIdentity({ aircraftReg: "N123UA" })).toMatchObject({ tailKnown: true, tailSource: "aircraft_reg" });
    expect(resolveTailIdentity({ aircraftModeS: "abc123" })).toMatchObject({ tailKnown: false, tailSource: "mode_s" });
    expect(resolveTailIdentity({ providerAircraftId: "p1", providerAircraftIdVerified: false })).toMatchObject({ tailKey: null, tailKnown: false });
  });

  it("preserves original/current/actual destination separately and flags diversion", () => {
    const route = resolveRouteIdentity({
      originIcao: "KLAX",
      originalScheduledDestinationIcao: "KSFO",
      currentOperationalDestinationIcao: "KOAK",
      actualDestinationIcao: "KOAK",
      scheduledGateOutUtc: "2026-09-01T23:30:00Z",
      actualWheelsOnUtc: "2026-09-02T01:00:00Z",
    });
    expect(route).toMatchObject({
      originIcao: "KLAX",
      originalScheduledDestinationIcao: "KSFO",
      currentOperationalDestinationIcao: "KOAK",
      actualDestinationIcao: "KOAK",
      diversionFlag: true,
      midnightCrossing: true,
    });
  });
});
