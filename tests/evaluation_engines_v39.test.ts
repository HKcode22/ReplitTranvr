import { describe, expect, it } from "vitest";
import {
  EVALUATION_RULE_HASH,
  buildPostPartition,
  buildPreEnginePartition,
  evaluatePopulationAudit,
  partitionManifestHash,
  type EvaluationRow,
} from "../server/lib/disruption/evaluationEngines_v39";

const row = (id: string, day: number, overrides: Partial<EvaluationRow> = {}): EvaluationRow => ({
  rowId: id, runDayIndex: day, calendarDay: `2026-09-${String(day).padStart(2, "0")}`,
  airport: "KSEA", region: "NAM", tail: "N1", route: "KSEA-KJFK", flightInstanceId: `flight-${id}`, ...overrides,
});

describe("Phase-0 evaluation engines", () => {
  it("Engine A applies frozen chronological cutoffs", () => {
    expect(buildPreEnginePartition("A", [row("a", 20), row("b", 21), row("c", 26)]).map((x) => x.partition)).toEqual(["train", "validation", "test"]);
  });

  it.each([["B", "airport"], ["C", "region"], ["D", "tail"], ["R", "route"]] as const)("Engine %s deterministically isolates %s", (engine, field) => {
    const rows = [row("a", 1), row("b", 30, { [field]: row("a", 1)[field] })];
    const first = buildPreEnginePartition(engine, rows);
    expect(first[0].partition).toBe(first[1].partition);
    expect(first).toEqual(buildPreEnginePartition(engine, rows));
  });

  it("POST refuses a flight crossing chronological partitions", () => {
    expect(() => buildPostPartition([row("a", 20, { flightInstanceId: "same" }), row("b", 26, { flightInstanceId: "same" })])).toThrow("REFUSE_GROUP_OVERLAP");
  });

  it("refuses duplicate rows and invalid day cutoffs", () => {
    expect(() => buildPreEnginePartition("A", [row("a", 1), row("a", 1)])).toThrow("REFUSE_ROW_OVERLAP");
    expect(() => buildPreEnginePartition("A", [row("a", 32)])).toThrow("REFUSE_INVALID_RUN_DAY");
  });

  it("Engine P audits eligible provider population against Engine A", () => {
    const result = evaluatePopulationAudit([
      { populationId: "p1", engineARowId: "a", eligible: true },
      { populationId: "p2", engineARowId: null, eligible: true },
      { populationId: "p3", engineARowId: null, eligible: false },
    ], ["a"]);
    expect(result).toMatchObject({ populationCount: 3, eligibleCount: 2, matchedCount: 1, coverage: 0.5, missingEngineARowIds: ["p2"] });
    expect(result.manifestHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("freezes deterministic rule and assignment manifest hashes", () => {
    const assigned = buildPreEnginePartition("A", [row("a", 1), row("b", 26)]);
    expect(EVALUATION_RULE_HASH).toMatch(/^[a-f0-9]{64}$/);
    expect(partitionManifestHash("A", assigned)).toBe(partitionManifestHash("A", [...assigned].reverse()));
  });
});
