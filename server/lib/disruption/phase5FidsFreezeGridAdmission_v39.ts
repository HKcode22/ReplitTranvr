/**
 * Phase5 FIDS acquisition-grid arithmetic and freeze admission.
 *
 * PURE, OFFLINE, NON-BILLABLE. Never calls provider, DB, GitHub or scheduler.
 * The proposed slots are source acquisition plans, NOT proven PRE snapshots.
 * Real first-observed T and actual source persisted availability are verified
 * by the existing prospective owner at runtime. The caller must not turn this
 * successful static plan into a Phase5 FREEZE or Phase6 paid GO.
 */
import { createHash } from "node:crypto";

export const P5_FIDS_GRID_SCHEMA = "v39.phase5.fids-freeze-grid.v1" as const;
export type P5FidsHorizon = "T-24h" | "T-6h" | "T-90m";
export type P5Slot = "HUB" | "MID_A" | "MID_B" | "REGIONAL";
const SLOTS: P5Slot[] = ["HUB", "MID_A", "MID_B", "REGIONAL"];
const HORIZONS: P5FidsHorizon[] = ["T-24h", "T-6h", "T-90m"];
const DAY_MS = 86_400_000;
const HASH = /^[a-f0-9]{64}$/;
const ICAO = /^[A-Z]{4}$/;
const YYYY_MM_DD = /^\d{4}-\d\d-\d\d$/;
const UTC_INSTANT = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

export interface P5FidsAcquisition {
  runDayIndex: number;
  budgetDayUtc: string;
  slot: P5Slot;
  icao: string;
  horizon: P5FidsHorizon;
  providerQueryDirection: "Departure";
  serviceWindowStartUtc: string;
  serviceWindowEndUtc: string;
  /** Window-specific earliest planned cutoff; NOT a verified provider-native T. */
  earliestPlannedCutoffUtc: string;
  scheduledRequestUtc: string;
  /** Conservative upper bound on request response + durable commit latency. */
  maxResponseAndPersistSeconds: number;
  apiUnitsPerAttempt: number;
  maxAttempts: number;
  /** Stable, frozen query key; all role/range and filter variants are distinct. */
  queryKey: string;
}

export interface P5FidsGridInput {
  schema: typeof P5_FIDS_GRID_SCHEMA;
  /** NOT a guessed study start: supplied only by independently frozen owner. */
  startDayUtc: string;
  calendarHash: string;
  configHash: string;
  frameHash: string;
  providerContractHash: string;
  /** Total study project API envelope, not provider account entitlement. */
  protectedProjectApiUnits: number;
  /** Reserved share of project API envelope for non-FIDS categories. */
  otherCategoryReservedUnits: number;
  protectedApiFloorUnits: number;
  /** Daily includes FIDS + all other categories, not a FIDS-only limit. */
  dailyProjectApiCeilingUnits: number;
  /** Exact frozen daily other-category allocations. Missing days are not zero. */
  otherCategoryReservedPerDay: Record<string, number>;
  acquisitions: P5FidsAcquisition[];
}

export interface P5FidsDayArithmetic {
  runDayIndex: number;
  budgetDayUtc: string;
  fidsPlannedRequests: number;
  fidsWorstCaseApiUnits: number;
  otherCategoryReservedUnits: number;
  combinedReservedUnits: number;
}

export interface P5FidsGridAdmission {
  status: "SCHEDULE_BUDGET_ARITHMETIC_VERIFIED_NOT_PHASE6_AUTHORIZED";
  gridSha256: string;
  days: number;
  distinctSlotHorizonGroups: number;
  plannedFidsRequests: number;
  worstCaseFidsApiUnits: number;
  worstCaseProjectReservedApiUnits: number;
  minAdvanceMarginSeconds: number;
  byDay: P5FidsDayArithmetic[];
  /** Always false: this result never proves external rights/deployment/cutoffs. */
  confirmsLiveSource: false;
  confirmsSourceUseRights: false;
  confirmsFlightLevelPre: false;
  authorizesPaidCollection: false;
}

function refuse(reason: string): never { throw new Error("REFUSED_P5_FIDS_GRID_" + reason); }
function positiveInt(value: number, label: string, max = Number.MAX_SAFE_INTEGER): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) refuse(label);
}
function utcMs(value: string, label: string): number {
  if (!UTC_INSTANT.test(value)) refuse(label + "_FORMAT");
  const n = Date.parse(value);
  if (!Number.isFinite(n) || new Date(n).toISOString() !== value) refuse(label + "_DATE");
  return n;
}
function dayMs(value: string, label: string): number {
  if (!YYYY_MM_DD.test(value)) refuse(label + "_FORMAT");
  const n = Date.parse(value + "T00:00:00.000Z");
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0, 10) !== value) refuse(label + "_DATE");
  return n;
}
function checkHash(value: string, name: string): void {
  if (typeof value !== "string" || !HASH.test(value)) refuse(name + "_HASH");
}
function safeAdd(a: number, b: number, label: string): number {
  const n = a + b;
  if (!Number.isSafeInteger(n)) refuse(label + "_OVERFLOW");
  return n;
}

/** Validates frozen input only; it neither chooses airports nor queries FIDS. */
export function evaluateP5FidsGrid(input: P5FidsGridInput): P5FidsGridAdmission {
  if (input.schema !== P5_FIDS_GRID_SCHEMA) refuse("SCHEMA");
  for (const [name, value] of [
    ["CALENDAR", input.calendarHash],
    ["CONFIG", input.configHash],
    ["FRAME", input.frameHash],
    ["PROVIDER_CONTRACT", input.providerContractHash],
  ]) checkHash(value, name);
  const start = dayMs(input.startDayUtc, "START_DAY");
  positiveInt(input.protectedProjectApiUnits, "PROJECT_BUDGET", 50_000);
  positiveInt(input.otherCategoryReservedUnits, "OTHER_CATEGORIES");
  positiveInt(input.protectedApiFloorUnits, "API_FLOOR");
  positiveInt(input.dailyProjectApiCeilingUnits, "DAILY_LIMIT", 1_900);
  if (input.protectedProjectApiUnits < 1 || input.dailyProjectApiCeilingUnits < 1)
    refuse("BUDGET_UNFUNDED");
  if (input.acquisitions.length < 31 * 4 * 3 || input.acquisitions.length > 100_000)
    refuse("INCOMPLETE_OR_UNBOUNDED_GRID");

  const daySpend = new Map<number, { date: string; requests: number; fids: number }>();
  const seenQueryKeys = new Set<string>();
  const groups = new Map<string, { icao: string; earliestCutoff: number }>();
  const slotAirport = new Map<string, string>();
  let minMargin = Number.POSITIVE_INFINITY;

  for (const r of input.acquisitions) {
    positiveInt(r.runDayIndex, "RUN_DAY", 31);
    if (r.runDayIndex < 1) refuse("RUN_DAY_ZERO");
    const day = dayMs(r.budgetDayUtc, "BUDGET_DAY");
    if (day !== start + (r.runDayIndex - 1) * DAY_MS)
      refuse("NONCONTIGUOUS_31_DAY_CALENDAR");
    if (!SLOTS.includes(r.slot) || !HORIZONS.includes(r.horizon))
      refuse("SLOT_OR_HORIZON");
    if (!ICAO.test(r.icao)) refuse("AIRPORT_ICAO");
    if (r.providerQueryDirection !== "Departure") refuse("DIRECTION_NOT_DEPARTURE");
    if (typeof r.queryKey !== "string" || !/^[a-zA-Z0-9_.:-]{8,150}$/.test(r.queryKey))
      refuse("QUERY_KEY_INVALID");
    if (seenQueryKeys.has(r.queryKey)) refuse("DUPLICATE_QUERY_KEY");
    seenQueryKeys.add(r.queryKey);
    const serviceStart = utcMs(r.serviceWindowStartUtc, "SERVICE_START");
    const serviceEnd = utcMs(r.serviceWindowEndUtc, "SERVICE_END");
    if (serviceEnd <= serviceStart || serviceStart < day || serviceStart >= day + DAY_MS)
      refuse("SERVICE_WINDOW");
    const cutoff = utcMs(r.earliestPlannedCutoffUtc, "EARLIEST_CUTOFF");
    const request = utcMs(r.scheduledRequestUtc, "REQUEST_UTC");
    positiveInt(r.maxResponseAndPersistSeconds, "RESPONSE_PERSIST_SECONDS", 86_400);
    positiveInt(r.apiUnitsPerAttempt, "API_UNITS_PER_ATTEMPT", 50_000);
    positiveInt(r.maxAttempts, "MAX_ATTEMPTS", 3);
    if (r.maxResponseAndPersistSeconds < 1 || r.apiUnitsPerAttempt < 1 ||
        r.maxAttempts < 1) refuse("UNKNOWN_LATENCY_COST_OR_RETRIES");
    const margin = cutoff - request - r.maxResponseAndPersistSeconds * 1000;
    if (margin < 0 || request >= cutoff) refuse("REQUEST_NOT_BEFORE_CUTOFF");
    minMargin = Math.min(minMargin, margin / 1000);

    const slotKey = r.runDayIndex + "|" + r.slot;
    const priorAirport = slotAirport.get(slotKey);
    if (priorAirport && priorAirport !== r.icao) refuse("SLOT_AIRPORT_CHANGED_WITHIN_DAY");
    slotAirport.set(slotKey, r.icao);
    const groupKey = slotKey + "|" + r.horizon;
    const prev = groups.get(groupKey);
    if (prev && prev.icao !== r.icao) refuse("HORIZON_AIRPORT_MISMATCH");
    groups.set(groupKey, {
      icao: r.icao, earliestCutoff: Math.min(cutoff, prev?.earliestCutoff ?? cutoff),
    });
    const charge = r.apiUnitsPerAttempt * r.maxAttempts;
    if (!Number.isSafeInteger(charge)) refuse("ATTEMPT_BUDGET_OVERFLOW");
    const row = daySpend.get(r.runDayIndex) ?? { date: r.budgetDayUtc, requests: 0, fids: 0 };
    row.requests = safeAdd(row.requests, 1, "QUERY_COUNT");
    row.fids = safeAdd(row.fids, charge, "FIDS_COST");
    daySpend.set(r.runDayIndex, row);
  }

  const expected = 31 * SLOTS.length * HORIZONS.length;
  if (groups.size !== expected) refuse("MISSING_DAY_SLOT_HORIZON");
  if (slotAirport.size !== 31 * SLOTS.length) refuse("MISSING_DAY_SLOT");
  let worstFids = 0;
  let dailyOtherTotal = 0;
  const byDay: P5FidsDayArithmetic[] = [];
  const expectedDates = new Set<string>();

  for (let d = 1; d <= 31; d++) {
    const date = new Date(start + (d - 1) * DAY_MS).toISOString().slice(0, 10);
    expectedDates.add(date);
    const row = daySpend.get(d);
    if (!row || row.date !== date) refuse("MISSING_FROZEN_DAY");
    for (const slot of SLOTS) {
      const a = groups.get(d + "|" + slot + "|T-24h")?.earliestCutoff;
      const b = groups.get(d + "|" + slot + "|T-6h")?.earliestCutoff;
      const c = groups.get(d + "|" + slot + "|T-90m")?.earliestCutoff;
      if (a === undefined || b === undefined || c === undefined || !(a < b && b < c))
        refuse("INCONSISTENT_HORIZON_ORDER");
    }
    if (!Object.prototype.hasOwnProperty.call(input.otherCategoryReservedPerDay, date))
      refuse("UNRESERVED_OTHER_DAILY_SPEND");
    const other = input.otherCategoryReservedPerDay[date];
    positiveInt(other, "OTHER_DAILY_COST");
    const combined = safeAdd(row.fids, other, "DAILY_COST");
    if (combined > input.dailyProjectApiCeilingUnits)
      refuse("DAILY_BUDGET_EXCEEDED");
    worstFids = safeAdd(worstFids, row.fids, "MONTH_FIDS_COST");
    dailyOtherTotal = safeAdd(dailyOtherTotal, other, "MONTH_OTHER_COST");
    byDay.push({
      runDayIndex: d, budgetDayUtc: date,
      fidsPlannedRequests: row.requests, fidsWorstCaseApiUnits: row.fids,
      otherCategoryReservedUnits: other, combinedReservedUnits: combined,
    });
  }
  const keys = Object.keys(input.otherCategoryReservedPerDay);
  if (keys.length !== 31 || keys.some(k => !expectedDates.has(k)))
    refuse("OTHER_RESERVE_EXTRA_OR_MISSING_DAY");
  if (dailyOtherTotal > input.otherCategoryReservedUnits)
    refuse("OTHER_CATEGORIES_UNDERRESERVED");
  const total = safeAdd(
    safeAdd(worstFids, input.otherCategoryReservedUnits, "PROJECT_RESERVE"),
    input.protectedApiFloorUnits, "PROJECT_AND_FLOOR",
  );
  if (total > input.protectedProjectApiUnits) refuse("PROJECT_CEILING_EXCEEDED");
  for (let d = 1; d <= 31; d++) {
    const airports = SLOTS.map(s => slotAirport.get(d + "|" + s));
    if (new Set(airports).size !== 4) refuse("SAME_AIRPORT_MULTIPLE_DAY_SLOTS");
  }

  const normalized = [...input.acquisitions].sort((a, b) =>
    a.runDayIndex - b.runDayIndex ||
    a.slot.localeCompare(b.slot) ||
    a.horizon.localeCompare(b.horizon) ||
    a.queryKey.localeCompare(b.queryKey));
  const gridSha256 = createHash("sha256")
    .update(JSON.stringify({
      schema: input.schema, startDayUtc: input.startDayUtc,
      calendarHash: input.calendarHash, configHash: input.configHash,
      frameHash: input.frameHash, providerContractHash: input.providerContractHash,
      protectedProjectApiUnits: input.protectedProjectApiUnits,
      otherCategoryReservedUnits: input.otherCategoryReservedUnits,
      protectedApiFloorUnits: input.protectedApiFloorUnits,
      dailyProjectApiCeilingUnits: input.dailyProjectApiCeilingUnits,
      byDay, acquisitions: normalized,
    })).digest("hex");

  return {
    status: "SCHEDULE_BUDGET_ARITHMETIC_VERIFIED_NOT_PHASE6_AUTHORIZED",
    gridSha256, days: 31, distinctSlotHorizonGroups: groups.size,
    plannedFidsRequests: input.acquisitions.length,
    worstCaseFidsApiUnits: worstFids,
    worstCaseProjectReservedApiUnits: total,
    minAdvanceMarginSeconds: minMargin,
    byDay,
    confirmsLiveSource: false,
    confirmsSourceUseRights: false,
    confirmsFlightLevelPre: false,
    authorizesPaidCollection: false,
  };
}
