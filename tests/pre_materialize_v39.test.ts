/** PRE snapshot materializer tests — V3.9-f.8 population → PRE. */
import { describe, it, expect } from "vitest";
import {
  horizonEligibleForCutoff,
  materializePreSnapshotsForCutoff,
  resolveSelectedTMilestone,
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
function fakePool(rows: unknown[], insertRowCount = 1, onInsert: (params: unknown[]) => void = () => undefined) {
  return {
    query: async (text: string, params: unknown[]) => {
      if (/FROM clean\.flight_population/.test(text)) return { rows, rowCount: rows.length };
      onInsert(params);
      return { rows: [], rowCount: insertRowCount };
    },
  };
}
const CUTOFF = new Date("2026-09-08T12:00:00Z");
const FROZEN_T = { milestone: "scheduled_gate_out_utc", version: "gate05-construct@1", artifactHash: "f".repeat(64) };

describe("selected T and horizon eligibility", () => {
  it("uses the actual frozen selected-T resolver", () => {
    expect(resolveSelectedTMilestone(row(), FROZEN_T)?.toISOString()).toBe("2026-09-09T12:00:00.000Z");
    expect(resolveSelectedTMilestone(row(), { ...FROZEN_T, milestone: "unverified_field" })).toBeNull();
    expect(resolveSelectedTMilestone(row(), { ...FROZEN_T, artifactHash: "not-a-hash" })).toBeNull();
  });
  it("computes horizon against selected T", () => {
    const t24 = new Date("2026-09-09T12:00:00Z");
    expect(horizonEligibleForCutoff(t24, CUTOFF, "T-24h")).toBe(true);
    const t2 = new Date("2026-09-08T14:00:00Z");
    expect(horizonEligibleForCutoff(t2, CUTOFF, "T-24h")).toBe(false);
    expect(horizonEligibleForCutoff(t2, CUTOFF, "T-90m")).toBe(true);
  });
});

describe("materializePreSnapshotsForCutoff", () => {
  it("blocks all horizons before a valid Gate-0.5 selected-T artifact exists", async () => {
    const result = await materializePreSnapshotsForCutoff(fakePool([row()]), {
      cutoffUtc: CUTOFF, batchId: null, frameHash: "f", configHash: "c", selectedTMilestoneConfig: null,
    });
    expect(result.built).toBe(0);
    expect(result.inserted).toBe(0);
    expect(result.blocked).toEqual({ t_unavailable: 3 });
  });

  it("builds and inserts one row per eligible horizon after valid T freeze", async () => {
    const inserted: unknown[][] = [];
    const result = await materializePreSnapshotsForCutoff(fakePool([row()], 1, (p) => inserted.push(p)), {
      cutoffUtc: CUTOFF, batchId: null, frameHash: "f", configHash: "c", selectedTMilestoneConfig: FROZEN_T,
    });
    expect(result.built).toBe(3);
    expect(result.inserted).toBe(3);
    expect(result.alreadyExisting).toBe(0);
    expect(inserted).toHaveLength(3);
  });

  it("distinguishes expected idempotent conflicts from failures", async () => {
    const result = await materializePreSnapshotsForCutoff(fakePool([row()], 0), {
      cutoffUtc: CUTOFF, batchId: null, frameHash: null, configHash: null, selectedTMilestoneConfig: FROZEN_T,
    });
    expect(result.built).toBe(3);
    expect(result.inserted).toBe(0);
    expect(result.alreadyExisting).toBe(3);
  });

  it("opposite movement never snapshots and missing T blocks as t_unavailable", async () => {
    const result = await materializePreSnapshotsForCutoff(fakePool([
      row({ population_role: "opposite_movement_context" }),
      row({ analytic_identity_id: "OTHER", dep_scheduled_utc: null }),
    ]), { cutoffUtc: CUTOFF, batchId: null, frameHash: null, configHash: null, selectedTMilestoneConfig: FROZEN_T });
    expect(result.built).toBe(0);
    expect(result.blocked).toEqual({ not_primary_role: 1, t_unavailable: 3 });
  });

  it("SELECT and INSERT DB failures throw fail-closed", async () => {
    const badSelect = { query: async () => { throw new Error("db down"); } };
    await expect(materializePreSnapshotsForCutoff(badSelect, {
      cutoffUtc: CUTOFF, batchId: null, frameHash: null, configHash: null, selectedTMilestoneConfig: null,
    })).rejects.toThrow("db down");

    let calls = 0;
    const badInsert = {
      query: async (text: string) => {
        if (/FROM clean\.flight_population/.test(text)) return { rows: [row()], rowCount: 1 };
        calls += 1;
        throw new Error("insert failed");
      },
    };
    await expect(materializePreSnapshotsForCutoff(badInsert, {
      cutoffUtc: CUTOFF, batchId: null, horizons: ["T-90m"], frameHash: null, configHash: null, selectedTMilestoneConfig: FROZEN_T,
    })).rejects.toThrow("insert failed");
    expect(calls).toBe(1);
  });
});
