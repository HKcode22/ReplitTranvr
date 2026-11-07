/**
 * Phase5 safety guard: Phase6 must consume an EARLIER immutable daily airport
 * choice, not choose a new adaptive airport after T-24h has passed.
 *
 * PURE: not a selection writer, provider client, source reader or a Phase6 GO.
 * Checking selected_at before the earliest possible T-24h is a NECESSARY
 * calendar-level condition, never sufficient to certify per-flight PRE.
 */
import { createHash } from "node:crypto";
import type { SamplingSelection, SlotId } from "./phase6SamplingDecision_v39";

const SLOTS: SlotId[] = ["HUB", "MID_A", "MID_B", "REGIONAL"];
const ICAO = /^[A-Z]{4}$/;
const SHA = /^[a-f0-9]{64}$/;
const MIN_PREPARE_LEAD_MS = 24 * 3600_000 + 30 * 60_000;

export interface PreparedDayForReadback {
  runDayIndex: number;
  scheduledStartUtc: Date;
  frozenDrawSeed: string;
  drawType: "NEW_TEMPLATE" | "PAIR_REPLAY";
  anchorIcao: string;
  slotRegions: Record<SlotId, string>;
  pairAirportSet: Record<SlotId, { icao: string; region: string }> | null;
  calendarHash: string;
  configHash: string;
  frameHash: string;
}
export interface PreparedDrawRow {
  slot_id: string;
  target_region: string;
  draw_type: string;
  selected_icao: string;
  frozen_draw_seed: string;
  selected_at_utc: Date | string;
  adaptive_state_hash: string | null;
  probability_vector: unknown;
  airport_layer_design_probability: number | string | null;
}
export interface PreparedReadback {
  selections: SamplingSelection[];
  stateHash: string;
  selectedAtUtc: string;
  verifiedCalendarLeadOnly: true;
  verifiedFlightLevelPre: false;
}
function refuse(code: string): never {
  throw new Error("REFUSED_PHASE6_EARLY_DRAW_" + code);
}
function dateMs(value: Date | string, label: string): number {
  const n = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(n)) refuse(label + "_TIME_UNKNOWN");
  return n;
}
function norm(v: string): string { return v.trim().toUpperCase(); }

/** Must be called before any Phase6 balance, sampling write or alert CREATE. */
export function verifyPreparedDailyDraw(
  day: PreparedDayForReadback,
  rows: PreparedDrawRow[],
): PreparedReadback {
  if (!Number.isInteger(day.runDayIndex) || day.runDayIndex < 1 || day.runDayIndex > 31)
    refuse("RUN_DAY");
  const start = dateMs(day.scheduledStartUtc, "SERVICE_START");
  if (![day.calendarHash, day.configHash, day.frameHash].every(x=>SHA.test(x)))
    refuse("UNPINNED_CALENDAR_CONFIG_OR_FRAME");
  if (!Array.isArray(rows) || rows.length !== 4)
    refuse("MISSING_OR_DUPLICATED_SLOTS");
  const slots = new Set<string>();
  const airports = new Set<string>();
  const times = new Set<number>();
  const selections: SamplingSelection[] = [];
  for (const x of rows) {
    const slot = x.slot_id as SlotId;
    if (!SLOTS.includes(slot) || slots.has(slot))
      refuse("INVALID_OR_DUPLICATE_SLOT");
    slots.add(slot);
    const airport = norm(x.selected_icao);
    if (!ICAO.test(airport) || airports.has(airport))
      refuse("INVALID_OR_DUPLICATE_AIRPORT");
    airports.add(airport);
    const selectedAt = dateMs(x.selected_at_utc, "SELECTED");
    times.add(selectedAt);
    if (selectedAt >= start - MIN_PREPARE_LEAD_MS)
      refuse("DRAW_TOO_LATE_FOR_T24_SOURCE");
    if (x.frozen_draw_seed !== day.frozenDrawSeed || x.draw_type !== day.drawType)
      refuse("MISMATCHED_SEED_OR_TEMPLATE");
    if (x.target_region !== day.slotRegions[slot])
      refuse("WRONG_FROZEN_REGION");
    if (day.pairAirportSet) {
      const expected = day.pairAirportSet[slot];
      if (!expected || norm(expected.icao) !== airport ||
          expected.region !== day.slotRegions[slot])
        refuse("PAIR_TEMPLATE_MISMATCH");
    } else if (slot === "HUB" && airport !== norm(day.anchorIcao)) {
      refuse("FROZEN_ANCHOR_MISMATCH");
    }

    const isRegional = slot === "REGIONAL";
    const p = x.airport_layer_design_probability == null
      ? null : Number(x.airport_layer_design_probability);
    if (isRegional && (p === null || !Number.isFinite(p) || p <= 0 || p > 1))
      refuse("REGIONAL_PROBABILITY_MISSING");
    if (!isRegional && p !== null) refuse("DIRECT_SLOT_PROBABILITY");
    if (isRegional && !Array.isArray(x.probability_vector))
      refuse("REGIONAL_PROBABILITY_VECTOR_MISSING");
    if (isRegional && x.adaptive_state_hash !== null &&
        !SHA.test(x.adaptive_state_hash))
      refuse("ADAPTIVE_STATE_HASH_INVALID");
    if (isRegional && day.pairAirportSet === null &&
        !x.adaptive_state_hash)
      refuse("ADAPTIVE_STATE_HASH_MISSING");
    // The chosen probabilistic draw must appear in its explicitly saved vector.
    if (isRegional) {
      const vec = x.probability_vector as Array<{
        icao?: unknown; probability?: unknown; drawScore?: unknown;
      }>;
      if (vec.length < 1 || vec.length > 1000 ||
          vec.some(v=>typeof v?.icao !== "string" ||
            !Number.isFinite(Number(v.probability)) ||
            !Number.isFinite(Number(v.drawScore)) ||
            Number(v.probability) <= 0 || Number(v.probability) > 1))
        refuse("INVALID_REGIONAL_PROBABILITY_VECTOR");
      const total = vec.reduce((n, v)=>n+Number(v.probability),0);
      if (Math.abs(total - 1) > 0.000001 ||
          vec.filter(v=>norm(String(v.icao)) === airport &&
            Math.abs(Number(v.probability)-p!) < 0.000001).length !== 1)
        refuse("REGIONAL_PROBABILITY_NOT_MATCHED");
    }
    selections.push({
      slotId: slot, icao: airport,
      targetRegion: x.target_region,
      drawType: x.draw_type as "NEW_TEMPLATE" | "PAIR_REPLAY",
      isRandomized: isRegional,
      designProbability: p,
      plannedShare: isRegional ? null : 1,
      adaptiveStateHash: x.adaptive_state_hash,
      // PostgreSQL jsonb deliberately canonicalizes object key order.
      // Never hash its raw key ordering; normalize explicit source-contract
      // fields in one deterministic order for both fresh and readback rows.
      probabilityVector: isRegional
        ? (x.probability_vector as Array<{
            icao: string; probability: number; drawScore: number;
          }>).map(v=>({
            icao:norm(v.icao),
            probability:Number(v.probability),
            drawScore:Number(v.drawScore),
          }))
        : null,
    });
  }
  if (times.size !== 1) refuse("NONATOMIC_DRAW_TIMESTAMPS");
  const selectedAtUtc = new Date([...times][0]).toISOString();
  selections.sort((a,b)=>SLOTS.indexOf(a.slotId)-SLOTS.indexOf(b.slotId));
  const stateHash = createHash("sha256").update(JSON.stringify({
    runDayIndex:day.runDayIndex,
    selectedAtUtc,
    calendarHash:day.calendarHash,
    configHash:day.configHash,
    frameHash:day.frameHash,
    seed:day.frozenDrawSeed,
    selections,
  })).digest("hex");
  return {
    selections, stateHash, selectedAtUtc,
    verifiedCalendarLeadOnly: true,
    verifiedFlightLevelPre: false,
  };
}
