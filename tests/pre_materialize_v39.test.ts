/**
 * PRE snapshot materializer tests (population → PRE production path).
 * Offline: injected fake pool, no DB, no provider.
 */
import { describe, it, expect } from "vitest";
import {
  horizonEligibleForCutoff,
  materializePreSnapshotsForCutoff,
} from "../server/lib/disruption/preSnapshotBuilder_v3";

function row(over: Record<string, unknown> = {}) {
  return {
    analytic_identity_id: "UA123_KLAX_KSFO_20260908_ab12cd34",
    dep_scheduled_utc: new Date("2026-09-09T12:00:00Z"),
    population_query_id: "00000000-0000-0000-0000-000000000001",
    response_hash: "r".repeat(64),
    population_role: "requested_airport_primary",
    scope_classification: "confirmed_core",
    ...over,
  };
}

function fakePool(rows: unknown[], onInsert: (params: unknown[]) => void = () => undefined) {
  return {
    query: async (text: string, params: unknown[]) => {
      if (/FROM clean\.flight_population/.test(text)) return { rows, rowCount: rows.length };
      onInsert(params);
      return { rows: [], rowCount: 1 };
    },
  };
}

const CUTOFF = new Date("2026-09-08T12:00:00Z"); // dep is +24h → all horizons eligible

// Gate-0.5-frozen selected-T construct (only present AFTER Gate 0.5).
const FROZEN_T = {
  milestone: "scheduled_gate_out",
  version: "gate05-construct@1",
  artifactHash: "f".repeat(64),
};

describe("horizon eligibility math", () => {
  it("dep +24h eligible for all horizons; dep +2h only T-90m", () => {
    const dep24 = new Date("2026-09-09T12:00:00Z");
    expect(horizonEligibleForCutoff(dep24, CUTOFF, "T-24h")).toBe(true);
    expect(horizonEligibleForCutoff(dep24, CUTOFF, "T-6h")).toBe(true);
    expect(horizonEligibleForCutoff(dep24, CUTOFF, "T-90m")).toBe(true);
    const dep2 = new Date("2026-09-08T14:00:00Z");
    expect(horizonEligibleForCutoff(dep2, CUTOFF, "T-24h")).toBe(false);
    expect(horizonEligibleForCutoff(dep2, CUTOFF, "T-6h")).toBe(false);
    expect(horizonEligibleForCutoff(dep2, CUTOFF, "T-90m")).toBe(true);
  });

  it("null schedule never eligible (blocked, never fabricated)", () => {
    expect(horizonEligibleForCutoff(null, CUTOFF, "T-90m")).toBe(false);
  });
});

describe("materializePreSnapshotsForCutoff", () => {
  it("BLOCKS all horizons (t_unavailable) with no Gate-0.5-frozen T construct (gptP0analyze4 #5)", async () => {
    const result = await materializePreSnapshotsForCutoff(
      fakePool([row()]),
      { cutoffUtc: CUTOFF, batchId: null, frameHash: "f", configHash: "c", selectedTMilestoneConfig: null },
    );
    expect(result.populationRows).toBe(1);
    expect(result.built).toBe(0);
    expect(result.inserted).toBe(0);
    expect(result.blocked).toEqual({ t_unavailable: 3 });
  });

  it("builds one snapshot per eligible horizon and persists idempotently once T is frozen", async () => {
    const inserted: unknown[][] = [];
    const result = await materializePreSnapshotsForCutoff(
      fakePool([row()], (p) => inserted.push(p)),
      { cutoffUtc: CUTOFF, batchId: null, frameHash: "f", configHash: "c", selectedTMilestoneConfig: FROZEN_T },
    );
    expect(result.populationRows).toBe(1);
    expect(result.built).toBe(3);
    expect(result.inserted).toBe(3);
    expect(result.blocked).toEqual({});
    expect(inserted.length).toBe(3);
  });

  it("opposite-movement rows never snapshot; null schedule blocks with reason", async () => {
    const result = await materializePreSnapshotsForCutoff(
      fakePool([
        row({ population_role: "opposite_movement_context" }),
        row({ analytic_identity_id: "OTHER", dep_scheduled_utc: null }),
      ]),
      { cutoffUtc: CUTOFF, batchId: null, frameHash: null, configHash: null, selectedTMilestoneConfig: FROZEN_T },
    );
    expect(result.built).toBe(0);
    expect(result.inserted).toBe(0);
    // Null schedule: eligibility unassessable → builder blocks on horizon
    // first (check order), never fabricates T. Either blocked reason is safe.
    expect(result.blocked).toEqual({ not_primary_role: 1, not_horizon_eligible: 3 });
  });

  it("population SELECT failure throws (fail-closed, no partial run)", async () => {
    const badPool = { query: async () => { throw new Error("db down"); } };
    await expect(
      materializePreSnapshotsForCutoff(badPool, { cutoffUtc: CUTOFF, batchId: null, frameHash: null, configHash: null, selectedTMilestoneConfig: null }),
    ).rejects.toThrow("db down");
  });

  it("horizon subset restricts output", async () => {
    const result = await materializePreSnapshotsForCutoff(
      fakePool([row()]),
      { cutoffUtc: CUTOFF, batchId: null, horizons: ["T-90m"], frameHash: null, configHash: null, selectedTMilestoneConfig: FROZEN_T },
    );
    expect(result.built).toBe(1);
    expect(result.inserted).toBe(1);
  });
});
