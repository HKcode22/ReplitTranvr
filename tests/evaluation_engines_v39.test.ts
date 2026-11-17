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

  it("Engine A refuses the same exact flight across either chronological boundary, but not inside one partition", () => {
    const same = (id: string, day: number) => row(id, day, { flightInstanceId: "same" });
    for (const days of [[20, 21], [25, 26], [1, 31]]) {
      expect(() => buildPreEnginePartition("A", [same("a", days[0]), same("b", days[1])]))
        .toThrow("REFUSE_FLIGHT_PARTITION_OVERLAP");
    }
    expect(buildPreEnginePartition("A", [same("a", 1), same("b", 20)]).map(x=>x.partition)).toEqual(["train","train"]);
  });

  it.each(["B", "C", "D", "R"] as const)("Engine %s also refuses exact flight crossing its group-based partition", (engine) => {
    const base = row("a", 1, { flightInstanceId: "same" });
    const partition = buildPreEnginePartition(engine, [base])[0].partition;
    const candidates = Array.from({ length: 128 }, (_,i) => row("b", 2, {
      flightInstanceId:"same", airport:"AP"+i, region:"REG"+i, tail:"TAIL"+i, route:"R"+i
    }));
    const different = candidates.find(x => buildPreEnginePartition(engine,[x])[0].partition !== partition);
    expect(different).toBeDefined();
    expect(() => buildPreEnginePartition(engine,[base,different!])).toThrow("REFUSE_FLIGHT_PARTITION_OVERLAP");
  });

  it("rejects empty or noncanonical exact flight keys, including POST", () => {
    for (const flightInstanceId of ["", " ", " same"]) {
      const rows=[row("a",1,{flightInstanceId})];
      expect(()=>buildPreEnginePartition("A",rows)).toThrow("REFUSE_MISSING_OR_NONCANONICAL_FLIGHT_KEY");
      expect(()=>buildPostPartition(rows)).toThrow("REFUSE_MISSING_OR_NONCANONICAL_FLIGHT_KEY");
    }
  });

  it("manifest hashing refuses caller-substituted partitions, group keys and cross-flight assignments", () => {
    const rows=buildPreEnginePartition("A",[row("a",1),row("b",26)]);
    expect(()=>partitionManifestHash("A",[{...rows[0],partition:"test"},rows[1]])).toThrow("REFUSE_FROZEN_PARTITION_ASSIGNMENT_DRIFT");
    expect(()=>partitionManifestHash("A",[{...rows[0],groupKey:"different"},rows[1]])).toThrow("REFUSE_FROZEN_PARTITION_ASSIGNMENT_DRIFT");
    expect(()=>partitionManifestHash("A",[rows[0],{...rows[1],flightInstanceId:rows[0].flightInstanceId}])).toThrow("REFUSE_FLIGHT_PARTITION_OVERLAP");
    const p=buildPostPartition([row("c",1),row("d",26)]);
    expect(()=>partitionManifestHash("POST",[{...p[0],partition:"test"},p[1]])).toThrow("REFUSE_FROZEN_PARTITION_ASSIGNMENT_DRIFT");
    expect(partitionManifestHash("POST",p)).toMatch(/^[a-f0-9]{64}$/);
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
