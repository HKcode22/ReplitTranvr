import { describe, expect, it, vi } from "vitest";
import { buildGate1CoverageArtifact, serializeGate1Artifact } from "../server/lib/disruption/gate1Coverage_v39";
import { runGate1Coverage } from "../scripts/measure_coverage";

const identity = { evidenceId: "GATE-1-20260911-001", authorizationId: "AUTH-20260911-G1" };

function validInput() {
  return {
    feeds: {
      FlightSchedules: { airports: ["KLAX", "WSSS", "OMAA"] },
      FlightLiveUpdates: { airports: ["KLAX", "WSSS"] },
      AdsbUpdates: { airports: ["KLAX", "OMAA"] },
    },
    catalogIcaos: ["KLAX", "KJFK"],
    fetchedAtUtc: "2026-09-11T00:00:00Z",
    providerPin: "aerodatabox.p.rapidapi.com/health:v1",
  };
}

describe("Gate 1 coverage artifact", () => {
  it("measures universe/catalog math deterministically", () => {
    const a = buildGate1CoverageArtifact(validInput(), identity);
    const b = buildGate1CoverageArtifact(validInput(), identity);
    expect(a.status).toBe("PASS");
    expect(a.universe_count).toBe(3);
    expect(a.catalog_in_universe).toBe(1);
    expect(a.universe_not_in_catalog_count).toBe(2);
    expect(a.artifact_sha256).toBe(b.artifact_sha256);
    expect(a.artifact_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("blocks on missing feed or empty catalog, never zero-fills", () => {
    const missing = buildGate1CoverageArtifact({ ...validInput(), feeds: { ...validInput().feeds, AdsbUpdates: null } }, identity);
    expect(missing.status).toBe("BLOCKED");
    expect(missing.universe_count).toBeNull();
    const empty = buildGate1CoverageArtifact({ ...validInput(), catalogIcaos: [] }, identity);
    expect(empty.reasons).toContain("MISSING:catalog_icaos");
  });

  it("serializes no secrets", () => {
    const text = serializeGate1Artifact(buildGate1CoverageArtifact({ ...validInput(), providerPin: "pin" }, identity));
    expect(text).not.toMatch(/api[_-]?key|secret|bearer/i);
  });
});

describe("Gate 1 coverage command", () => {
  const args = ["--auth", identity.authorizationId, "--auth-file", "auth.json", "--evidence-id", identity.evidenceId];
  const reader = () => ({
    listFeedAirports: vi.fn(async (service: string) =>
      service === "FlightSchedules" ? ["KLAX", "WSSS"] : service === "FlightLiveUpdates" ? ["KLAX"] : ["WSSS"]),
    catalogIcaos: () => ["KLAX"],
    providerPin: () => "pin",
  });

  it("refuses before any provider call without valid AUTH", async () => {
    const r = reader();
    await expect(runGate1Coverage(args, r, () => false, vi.fn())).rejects.toThrow("AUTH verification failed");
    expect(r.listFeedAirports).not.toHaveBeenCalled();
  });

  it("uses the exact Phase Gate scope and writes the frozen artifact once", async () => {
    const r = reader();
    const authorize = vi.fn().mockReturnValue(true);
    const writeArtifact = vi.fn();
    const artifact = await runGate1Coverage(args, r, authorize, writeArtifact);
    expect(authorize).toHaveBeenCalledWith("auth.json", "Phase 2 / Gate 1", identity.authorizationId);
    expect(r.listFeedAirports).toHaveBeenCalledTimes(3);
    expect(artifact.universe_count).toBe(2);
    expect(writeArtifact).toHaveBeenCalledOnce();
  });

  it("fails closed when a feed is uncertain", async () => {
    const r = reader();
    r.listFeedAirports = vi.fn(async () => null);
    await expect(runGate1Coverage(args, r, () => true, vi.fn())).rejects.toThrow("BLOCKED");
  });
});
