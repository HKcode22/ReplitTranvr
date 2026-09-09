import { createHash } from "crypto";

export type EvaluationPartition = "train" | "validation" | "test";
export type PreEngine = "A" | "B" | "C" | "D" | "R";

export interface EvaluationRow {
  rowId: string;
  runDayIndex: number;
  calendarDay: string;
  airport: string;
  region: string;
  tail: string;
  route: string;
  flightInstanceId: string;
}

export interface AssignedRow extends EvaluationRow {
  partition: EvaluationPartition;
  groupKey: string;
}

export const EVALUATION_RULE = Object.freeze({
  version: "v39-evaluation-partitions@1.0.0",
  seed: "v39-month1-frozen",
  chronological: Object.freeze({ train: [1, 20], validation: [21, 25], test: [26, 31] }),
  groupKeys: Object.freeze({ A: "calendarDay", B: "airport", C: "region", D: "tail", R: "route", POST: "flightInstanceId" }),
  hashBuckets: Object.freeze({ trainEnd: 64, validationEnd: 79, modulus: 100 }),
});

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export const EVALUATION_RULE_HASH = createHash("sha256").update(canonical(EVALUATION_RULE)).digest("hex");

function chronologicalPartition(day: number): EvaluationPartition {
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error(`REFUSE_INVALID_RUN_DAY:${day}`);
  if (day <= 20) return "train";
  if (day <= 25) return "validation";
  return "test";
}

function hashPartition(engine: PreEngine, key: string): EvaluationPartition {
  if (!key.trim()) throw new Error(`REFUSE_MISSING_GROUP_KEY:${engine}`);
  const digest = createHash("sha256").update(`${EVALUATION_RULE.seed}\0${engine}\0${key}`).digest();
  const bucket = digest.readUInt32BE(0) % EVALUATION_RULE.hashBuckets.modulus;
  if (bucket <= EVALUATION_RULE.hashBuckets.trainEnd) return "train";
  if (bucket <= EVALUATION_RULE.hashBuckets.validationEnd) return "validation";
  return "test";
}

function refuseOverlap(rows: AssignedRow[]): void {
  const rowIds = new Set<string>();
  const groups = new Map<string, EvaluationPartition>();
  for (const row of rows) {
    if (!row.rowId || rowIds.has(row.rowId)) throw new Error(`REFUSE_ROW_OVERLAP:${row.rowId}`);
    rowIds.add(row.rowId);
    const prior = groups.get(row.groupKey);
    if (prior && prior !== row.partition) throw new Error(`REFUSE_GROUP_OVERLAP:${row.groupKey}`);
    groups.set(row.groupKey, row.partition);
  }
}

export function buildPreEnginePartition(engine: PreEngine, rows: readonly EvaluationRow[]): AssignedRow[] {
  const field = EVALUATION_RULE.groupKeys[engine] as keyof EvaluationRow;
  const assigned = rows.map((row) => {
    const groupKey = String(row[field] ?? "");
    if (!groupKey.trim()) throw new Error(`REFUSE_MISSING_GROUP_KEY:${engine}:${row.rowId}`);
    return { ...row, groupKey, partition: engine === "A" ? chronologicalPartition(row.runDayIndex) : hashPartition(engine, groupKey) };
  });
  refuseOverlap(assigned);
  return assigned;
}

export function buildPostPartition(rows: readonly EvaluationRow[]): AssignedRow[] {
  const assigned = rows.map((row) => ({ ...row, groupKey: row.flightInstanceId, partition: chronologicalPartition(row.runDayIndex) }));
  refuseOverlap(assigned);
  return assigned;
}

export interface PopulationAuditRow { populationId: string; engineARowId: string | null; eligible: boolean; }
export interface PopulationAudit { populationCount: number; eligibleCount: number; matchedCount: number; missingEngineARowIds: string[]; coverage: number | null; manifestHash: string; }

export function evaluatePopulationAudit(rows: readonly PopulationAuditRow[], engineARowIds: readonly string[]): PopulationAudit {
  const ids = new Set(engineARowIds);
  if (ids.size !== engineARowIds.length) throw new Error("REFUSE_ENGINE_A_ROW_OVERLAP");
  const populationIds = new Set<string>();
  for (const row of rows) {
    if (!row.populationId || populationIds.has(row.populationId)) throw new Error(`REFUSE_POPULATION_OVERLAP:${row.populationId}`);
    populationIds.add(row.populationId);
  }
  const eligible = rows.filter((row) => row.eligible);
  const matched = eligible.filter((row) => row.engineARowId !== null && ids.has(row.engineARowId));
  const result = {
    populationCount: rows.length,
    eligibleCount: eligible.length,
    matchedCount: matched.length,
    missingEngineARowIds: eligible.filter((row) => row.engineARowId === null || !ids.has(row.engineARowId)).map((row) => row.populationId).sort(),
    coverage: eligible.length ? matched.length / eligible.length : null,
  };
  return { ...result, manifestHash: createHash("sha256").update(canonical({ ruleHash: EVALUATION_RULE_HASH, result })).digest("hex") };
}

export function partitionManifestHash(engine: PreEngine | "POST", rows: readonly AssignedRow[]): string {
  const assignments = rows.map(({ rowId, partition, groupKey }) => ({ rowId, partition, groupKey })).sort((a, b) => a.rowId.localeCompare(b.rowId));
  refuseOverlap(rows.slice());
  return createHash("sha256").update(canonical({ engine, ruleHash: EVALUATION_RULE_HASH, assignments })).digest("hex");
}
