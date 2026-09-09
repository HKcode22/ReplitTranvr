/** V3.9-f.8 timestamp/leakage and raw hash tests. */
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

describe("V3.9 timestamp/leakage", () => {
  it("keeps actual runway aliases unverified before Gate 0.5", () => {
    expect(PROVIDER_TO_FAA_MAPPING["departure.scheduledTime.utc"]).toEqual({ target: "scheduled_gate_out_utc", verified: true });
    expect(PROVIDER_TO_FAA_MAPPING["departure.runwayTime.utc"].verified).toBe(false);
    expect(PROVIDER_TO_FAA_MAPPING["arrival.runwayTime.utc"].verified).toBe(false);
  });

  it("requires known available_at at or before cutoff", () => {
    const cutoff = new Date("2026-08-15T12:00:00Z");
    expect(isAvailableAtCutoff(new Date("2026-08-15T10:00:00Z"), cutoff)).toBe(true);
    expect(isAvailableAtCutoff(new Date("2026-08-15T14:00:00Z"), cutoff)).toBe(false);
    expect(isAvailableAtCutoff(null, cutoff)).toBe(false);
  });

  it("requires known information_available_at and valid_from", () => {
    const cutoff = new Date("2026-08-15T12:00:00Z");
    const info = new Date("2026-08-15T08:00:00Z");
    const from = new Date("2026-08-15T00:00:00Z");
    expect(isFeatureEligible(info, from, null, cutoff)).toBe(true);
    expect(isFeatureEligible(null, from, null, cutoff)).toBe(false);
    expect(isFeatureEligible(info, null, null, cutoff)).toBe(false);
    expect(isFeatureEligible(null, null, null, cutoff)).toBe(false);
  });

  it("rejects future availability, future validity, and expired validity", () => {
    const cutoff = new Date("2026-08-15T12:00:00Z");
    expect(isFeatureEligible(new Date("2026-08-15T14:00:00Z"), new Date("2026-08-15T00:00:00Z"), null, cutoff)).toBe(false);
    expect(isFeatureEligible(new Date("2026-08-15T08:00:00Z"), new Date("2026-08-15T14:00:00Z"), null, cutoff)).toBe(false);
    expect(isFeatureEligible(new Date("2026-08-15T08:00:00Z"), new Date("2026-08-14T00:00:00Z"), new Date("2026-08-15T06:00:00Z"), cutoff)).toBe(false);
  });

  it("snapshot builder preserves clocks but does not promote unverified runway fields", () => {
    const flight = {
      depScheduledUtc: new Date("2026-08-15T14:00:00Z"),
      depRevisedUtc: new Date("2026-08-15T14:15:00Z"),
      depRunwayUtc: new Date("2026-08-15T14:18:00Z"),
      arrScheduledUtc: new Date("2026-08-15T17:00:00Z"),
      arrRunwayUtc: new Date("2026-08-15T16:55:00Z"),
      locReportedUtc: new Date("2026-08-15T15:30:00Z"),
      lastUpdatedUtc: new Date("2026-08-15T15:30:05Z"),
    };
    const received = new Date("2026-08-15T15:30:10Z");
    const t = buildSnapshotTimestamps(flight, received);
    expect(t.scheduledGateOutUtc).toEqual(flight.depScheduledUtc);
    expect(t.revisedGateOutUtc).toEqual(flight.depRevisedUtc);
    expect(t.actualGateOutUtc).toBeNull();
    expect(t.actualWheelsOnUtc).toBeNull();
    expect(t.locReportedUtc).toEqual(flight.locReportedUtc);
    expect(t.receivedAtUtc).toEqual(received);
  });
});

describe("raw hash stability", () => {
  it("same input has stable SHA-256 and different input differs", () => {
    const data = JSON.stringify({ flight: "UA123", status: "EnRoute" });
    expect(sha256(data)).toBe(sha256(data));
    expect(sha256(data)).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256("UA123")).not.toBe(sha256("UA456"));
  });
});
