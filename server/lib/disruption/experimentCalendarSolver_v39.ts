/** V3.9-f.8 strict Phase-6 calendar + frozen slot→region template solver. */
import { createHash } from "crypto";

export type Shape = "4h" | "2x2h" | "up-to-6h";
export type SlotId = "HUB" | "MID_A" | "MID_B" | "REGIONAL";
export const SIX_SLOTS = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"] as const;

export interface FrozenAirportSlotAssignment { icao: string; region: string }
export type FrozenPairAirportSet = Record<SlotId, FrozenAirportSlotAssignment>;

export interface FrozenCalendarDesignInput {
  startDate: string;
  /** Frozen time-window/crossover seed. */
  seed: string;
  /** Separately frozen anchor rotation seed. */
  anchorSeed: string;
  /** Final five dual-eligible HUB anchors with mapped regions. */
  anchorPool: FrozenAirportSlotAssignment[];
  /** Nonempty mapped dual-eligible region sets frozen at FREEZE. */
  eligibleRegionsBySlot: Record<"MID_A" | "MID_B" | "REGIONAL", string[]>;
  /** Exact pair-template airport set, frozen before treatment-order randomization. */
  pairAirportSets: Record<string, FrozenPairAirportSet>;
  evaluationPartitionByRunDay: Record<string, string>;
  projectedAlertCreditsByRunDay: Record<string, number>;
  projectedRestUnitsTotal: number;
  protectedRestBudget: number;
}

export interface Segment { segmentId: string; startUtc: string; endUtc: string; isGap: boolean }
export interface SolvedRunDay {
  runDayIndex: number;
  budgetDayId: string;
  experimentDayId: string;
  parentBatchId: string;
  date: string;
  weekdayClass: "weekday" | "weekend";
  utcSlot: string;
  timeClass: string;
  windowShape: Shape;
  segments: Segment[];
  evaluationPartition: string;
  crossoverGroupId: string | null;
  crossoverPeriod: 1 | 2 | null;
  pairRole: "control" | "alternative" | null;
  anchorReplay: boolean;
  /** Frozen region target for every logical tier slot. */
  slotRegions: Record<SlotId, string>;
  /** Exact airport set only for crossover pair periods; ordinary days draw at execution. */
  pairAirportSet: FrozenPairAirportSet | null;
  /** NEW_TEMPLATE or PAIR_REPLAY — replay consumes no new region/anchor draw. */
  drawType: "NEW_TEMPLATE" | "PAIR_REPLAY";
}
export interface CalendarSolveResult {
  status: "SAT" | "UNSAT";
  reason: string | null;
  days: SolvedRunDay[];
  calendarHash: string | null;
}

function hash(v: unknown): string { return createHash("sha256").update(JSON.stringify(v)).digest("hex"); }
function parseDate(s: string): Date | null { const d = new Date(`${s}T00:00:00.000Z`); return Number.isFinite(d.getTime()) ? d : null; }
function plusDays(d: Date, n: number): Date { return new Date(d.getTime() + n * 86_400_000); }
function dateText(d: Date): string { return d.toISOString().slice(0, 10); }
function weekdayClass(d: Date): "weekday" | "weekend" { return d.getUTCDay() === 0 || d.getUTCDay() === 6 ? "weekend" : "weekday"; }
function hmToMinutes(s: string): number { const [h, m] = s.split(":").map(Number); return h * 60 + m; }
function hm(minutes: number): string { const x = ((minutes % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; }
function absTime(date: string, clock: string): number { const [h, m] = clock.split(":").map(Number); return Date.parse(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`); }
function segments(run: number, slot: string, shape: Shape): Segment[] {
  const start = hmToMinutes(slot);
  if (shape === "4h") return [{ segmentId: `D${run}-S1`, startUtc: slot, endUtc: hm(start + 240), isGap: false }];
  if (shape === "up-to-6h") return [{ segmentId: `D${run}-S1`, startUtc: slot, endUtc: hm(start + 360), isGap: false }];
  return [
    { segmentId: `D${run}-S1`, startUtc: slot, endUtc: hm(start + 120), isGap: false },
    { segmentId: `D${run}-GAP`, startUtc: hm(start + 120), endUtc: hm(start + 180), isGap: true },
    { segmentId: `D${run}-S2`, startUtc: hm(start + 180), endUtc: hm(start + 300), isGap: false },
  ];
}
function normalizedRegionSet(xs: string[]): string[] { return [...new Set(xs.map(x => x.trim()).filter(Boolean))].sort(); }
function seededOrder<T>(items: readonly T[], seed: string): T[] {
  return [...items].map((value, i) => ({ value, k: hash(`${seed}|${i}|${JSON.stringify(value)}`) }))
    .sort((a, b) => a.k.localeCompare(b.k)).map(x => x.value);
}
function cyclePick<T>(items: readonly T[], drawIndex: number, seed: string): T {
  const cycle = Math.floor(drawIndex / items.length);
  const within = drawIndex % items.length;
  return seededOrder(items, `${seed}|cycle-${cycle}`)[within];
}
function randomizedAlternativeFirst(seed: string, pair: number): boolean {
  return parseInt(hash(`${seed}|pair-${pair}`).slice(0, 8), 16) % 2 === 1;
}
function pairId(p: number): string { return `pair-${p}`; }
function exactFour(set: FrozenPairAirportSet | undefined): boolean {
  if (!set) return false;
  const slots: SlotId[] = ["HUB", "MID_A", "MID_B", "REGIONAL"];
  const values = slots.map(s => set[s]?.icao?.trim().toUpperCase()).filter(Boolean);
  return values.length === 4 && new Set(values).size === 4 && slots.every(s => Boolean(set[s]?.region?.trim()));
}
function samePairSet(a: FrozenPairAirportSet | null, b: FrozenPairAirportSet | null): boolean {
  if (!a || !b) return false;
  return (["HUB", "MID_A", "MID_B", "REGIONAL"] as SlotId[]).every(s =>
    a[s].icao.toUpperCase() === b[s].icao.toUpperCase() && a[s].region === b[s].region,
  );
}

export function solveV39Calendar(input: FrozenCalendarDesignInput): CalendarSolveResult {
  const start = parseDate(input.startDate);
  if (!start) return { status: "UNSAT", reason: "invalid startDate", days: [], calendarHash: null };
  if (!input.seed || !input.anchorSeed) return { status: "UNSAT", reason: "missing frozen calendar/anchor seed", days: [], calendarHash: null };
  if (input.anchorPool.length !== 5 || new Set(input.anchorPool.map(x => x.icao.toUpperCase())).size !== 5 || input.anchorPool.some(x => !x.region)) {
    return { status: "UNSAT", reason: "anchorPool must be exact five unique mapped anchors", days: [], calendarHash: null };
  }
  for (const slot of ["MID_A", "MID_B", "REGIONAL"] as const) {
    const r = normalizedRegionSet(input.eligibleRegionsBySlot?.[slot] ?? []);
    if (!r.length || r.some(x => x === "UNMAPPED")) return { status: "UNSAT", reason: `${slot} eligible region set empty/unmapped`, days: [], calendarHash: null };
  }
  for (let p = 1; p <= 5; p++) if (!exactFour(input.pairAirportSets[pairId(p)])) {
    return { status: "UNSAT", reason: `${pairId(p)} requires exact four-airport slot assignment`, days: [], calendarHash: null };
  }
  for (let i = 1; i <= 31; i++) {
    const part = input.evaluationPartitionByRunDay[String(i)];
    const alert = input.projectedAlertCreditsByRunDay[String(i)];
    if (!part) return { status: "UNSAT", reason: `run day ${i} missing evaluation partition`, days: [], calendarHash: null };
    if (!Number.isFinite(alert) || alert < 0 || alert > 1900) return { status: "UNSAT", reason: `run day ${i} Alert feasibility exceeds 1900 or is unknown`, days: [], calendarHash: null };
  }
  if (!Number.isFinite(input.projectedRestUnitsTotal) || !Number.isFinite(input.protectedRestBudget) || input.projectedRestUnitsTotal > input.protectedRestBudget) {
    return { status: "UNSAT", reason: "REST budget infeasible/unknown", days: [], calendarHash: null };
  }
  for (let p = 1; p <= 5; p++) {
    if (input.evaluationPartitionByRunDay[String(p)] !== input.evaluationPartitionByRunDay[String(p + 6)]) {
      return { status: "UNSAT", reason: `${pairId(p)} evaluation partition mismatch`, days: [], calendarHash: null };
    }
  }

  const alternativeShape: Record<number, Shape> = { 1: "2x2h", 2: "2x2h", 3: "2x2h", 4: "up-to-6h", 5: "up-to-6h" };
  const shapeByRun: Record<number, Shape> = {};
  for (let i = 1; i <= 31; i++) shapeByRun[i] = "4h";
  for (let p = 1; p <= 5; p++) {
    const altFirst = randomizedAlternativeFirst(input.seed, p);
    shapeByRun[p] = altFirst ? alternativeShape[p] : "4h";
    shapeByRun[p + 6] = altFirst ? "4h" : alternativeShape[p];
  }

  const days: SolvedRunDay[] = [];
  let newDrawIndex = 0;
  const firstPeriodByPair = new Map<number, SolvedRunDay>();
  for (let i = 1; i <= 31; i++) {
    const week = Math.floor((i - 1) / 6), within = (i - 1) % 6;
    const date = dateText(plusDays(start, week * 7 + within));
    const slot = SIX_SLOTS[within];
    let p: number | null = null, period: 1 | 2 | null = null;
    if (i <= 5) { p = i; period = 1; }
    else if (i >= 7 && i <= 11) { p = i - 6; period = 2; }
    const replay = period === 2;

    let slotRegions: Record<SlotId, string>;
    let pairAirportSet: FrozenPairAirportSet | null = null;
    if (replay && p) {
      const first = firstPeriodByPair.get(p);
      if (!first) return { status: "UNSAT", reason: `${pairId(p)} replay missing first-period template`, days: [], calendarHash: null };
      slotRegions = { ...first.slotRegions };
      pairAirportSet = input.pairAirportSets[pairId(p)];
    } else {
      const anchor = cyclePick(input.anchorPool, newDrawIndex, input.anchorSeed);
      slotRegions = {
        HUB: anchor.region,
        MID_A: cyclePick(normalizedRegionSet(input.eligibleRegionsBySlot.MID_A), newDrawIndex, `${input.seed}|MID_A`).toString(),
        MID_B: cyclePick(normalizedRegionSet(input.eligibleRegionsBySlot.MID_B), newDrawIndex, `${input.seed}|MID_B`).toString(),
        REGIONAL: cyclePick(normalizedRegionSet(input.eligibleRegionsBySlot.REGIONAL), newDrawIndex, `${input.seed}|REGIONAL`).toString(),
      };
      if (slotRegions.MID_A === slotRegions.MID_B && normalizedRegionSet(input.eligibleRegionsBySlot.MID_B).length > 1) {
        const set = normalizedRegionSet(input.eligibleRegionsBySlot.MID_B);
        const idx = (set.indexOf(slotRegions.MID_B) + 1) % set.length;
        slotRegions.MID_B = set[idx];
      }
      if (p) {
        pairAirportSet = input.pairAirportSets[pairId(p)];
        const pairRegions = Object.fromEntries((Object.keys(pairAirportSet) as SlotId[]).map(s => [s, pairAirportSet![s].region])) as Record<SlotId, string>;
        if ((Object.keys(slotRegions) as SlotId[]).some(s => slotRegions[s] !== pairRegions[s])) {
          return { status: "UNSAT", reason: `${pairId(p)} airport-set region does not match frozen slot-region template`, days: [], calendarHash: null };
        }
        if (pairAirportSet.HUB.icao.toUpperCase() !== anchor.icao.toUpperCase()) {
          return { status: "UNSAT", reason: `${pairId(p)} HUB airport does not match frozen anchor rotation`, days: [], calendarHash: null };
        }
      }
      newDrawIndex += 1;
    }

    const shape = shapeByRun[i];
    const day: SolvedRunDay = {
      runDayIndex: i,
      budgetDayId: `run_day_${i}`,
      experimentDayId: `exp_day_${i}`,
      parentBatchId: `batch_day_${i}`,
      date,
      weekdayClass: weekdayClass(new Date(`${date}T00:00:00Z`)),
      utcSlot: slot,
      timeClass: slot,
      windowShape: shape,
      segments: segments(i, slot, shape),
      evaluationPartition: input.evaluationPartitionByRunDay[String(i)],
      crossoverGroupId: p ? pairId(p) : null,
      crossoverPeriod: period,
      pairRole: p ? (shape === "4h" ? "control" : "alternative") : null,
      anchorReplay: replay,
      slotRegions,
      pairAirportSet,
      drawType: replay ? "PAIR_REPLAY" : "NEW_TEMPLATE",
    };
    if (p && period === 1) firstPeriodByPair.set(p, day);
    days.push(day);
  }

  const validation = validateV39Calendar(days, input);
  if (validation.length) return { status: "UNSAT", reason: validation.join("; "), days: [], calendarHash: null };
  return { status: "SAT", reason: null, days, calendarHash: hash(days) };
}

export function validateV39Calendar(days: SolvedRunDay[], input: FrozenCalendarDesignInput): string[] {
  const v: string[] = [];
  if (days.length !== 31) v.push(`expected31:${days.length}`);
  const counts: Record<Shape, number> = { "4h": 0, "2x2h": 0, "up-to-6h": 0 };
  for (const d of days) counts[d.windowShape]++;
  if (counts["4h"] !== 26 || counts["2x2h"] !== 3 || counts["up-to-6h"] !== 2) v.push(`shape composition ${JSON.stringify(counts)}`);
  for (let base = 0; base + 6 <= days.length; base += 6) {
    const slots = days.slice(base, base + 6).map(d => d.utcSlot);
    if (new Set(slots).size !== 6 || SIX_SLOTS.some(s => !slots.includes(s))) v.push(`six-slot balance block ${base / 6 + 1}`);
  }
  for (const slot of ["MID_A", "MID_B", "REGIONAL"] as const) {
    const eligible = normalizedRegionSet(input.eligibleRegionsBySlot[slot]);
    const newRegions = days.filter(d => d.drawType === "NEW_TEMPLATE").map(d => d.slotRegions[slot]);
    for (let base = 0; base + eligible.length <= newRegions.length; base += eligible.length) {
      const block = newRegions.slice(base, base + eligible.length);
      if (new Set(block).size !== eligible.length || eligible.some(r => !block.includes(r))) v.push(`${slot}:unbalanced region block ${base / eligible.length + 1}`);
    }
  }
  for (let p = 1; p <= 5; p++) {
    const a = days[p - 1], b = days[p + 5];
    if (!a || !b) continue;
    if (a.crossoverGroupId !== pairId(p) || b.crossoverGroupId !== pairId(p)) v.push(`${pairId(p)}:missing group`);
    if (a.timeClass !== b.timeClass) v.push(`${pairId(p)}:time class mismatch`);
    if (a.weekdayClass !== b.weekdayClass) v.push(`${pairId(p)}:weekday mismatch`);
    if (a.evaluationPartition !== b.evaluationPartition) v.push(`${pairId(p)}:partition mismatch`);
    if (!samePairSet(a.pairAirportSet, b.pairAirportSet)) v.push(`${pairId(p)}:airport replay mismatch`);
    if (JSON.stringify(a.slotRegions) !== JSON.stringify(b.slotRegions)) v.push(`${pairId(p)}:region replay mismatch`);
    if (b.drawType !== "PAIR_REPLAY") v.push(`${pairId(p)}:period2 consumed new draw`);
    const alt: Shape = p <= 3 ? "2x2h" : "up-to-6h";
    const shapes = [a.windowShape, b.windowShape];
    if (!(shapes.includes("4h") && shapes.includes(alt))) v.push(`${pairId(p)}:wrong contrast`);
    if (a.pairRole === b.pairRole) v.push(`${pairId(p)}:treatment order invalid`);
    const endSeg = a.segments.filter(s => !s.isGap).at(-1)!;
    let prevEnd = absTime(a.date, endSeg.endUtc);
    if (hmToMinutes(endSeg.endUtc) <= hmToMinutes(a.segments[0].startUtc)) prevEnd += 86_400_000;
    const nextStart = absTime(b.date, b.segments.find(s => !s.isGap)!.startUtc);
    if (nextStart - prevEnd < 24 * 3_600_000) v.push(`${pairId(p)}:washout<24h`);
  }
  for (const d of days.filter(d => d.windowShape === "2x2h")) {
    const active = d.segments.filter(s => !s.isGap), gap = d.segments.filter(s => s.isGap);
    if (active.length !== 2 || gap.length !== 1 || active.some(s => hmToMinutes(s.endUtc) - hmToMinutes(s.startUtc) !== 120) || hmToMinutes(gap[0].endUtc) - hmToMinutes(gap[0].startUtc) !== 60) v.push(`run${d.runDayIndex}:bad2x2`);
  }
  for (const d of days) {
    const a = input.projectedAlertCreditsByRunDay[String(d.runDayIndex)];
    if (!Number.isFinite(a) || a > 1900) v.push(`run${d.runDayIndex}:alert infeasible`);
  }
  if (input.projectedRestUnitsTotal > input.protectedRestBudget) v.push("REST infeasible");
  return v;
}
