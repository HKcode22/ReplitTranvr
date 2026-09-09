/**
 * V3.9-f.8 production sampling-decision owner (§§8.2-8.6).
 *
 * Consumes a hash-frozen run-day slot→region template. Ordinary days choose
 * airports only inside their frozen tier×region cells; crossover days replay
 * their exact frozen pair template. REGIONAL probabilities use the persisted
 * state immediately before the draw. No global-region redraw or built_at proxy.
 */
import { createHash } from "crypto";
import {
  applyAdaptiveObservation,
  calculateMedianEma,
  computeRegionalProbabilityVector,
  coverageBoostFactor,
  deriveMi,
  eligibilityForMedianPool,
  type AdaptiveObservation,
  type MiState,
  type ZeroYieldState,
} from "./adaptiveMi_v3";

export type SlotId = "HUB" | "MID_A" | "MID_B" | "REGIONAL";
export type AirportTier = "HUB" | "MID" | "REGIONAL";
export interface FrozenSlotAirport { icao: string; region: string }
export interface FrozenRunDaySamplingPlan {
  runDayIndex: number;
  calendarHash: string;
  configHash: string;
  windowStartUtc: Date;
  drawType: "NEW_TEMPLATE" | "PAIR_REPLAY";
  slotRegions: Record<SlotId, string>;
  anchorIcao: string;
  pairAirportSet: Record<SlotId, FrozenSlotAirport> | null;
  frozenDrawSeed: string;
}
export interface FrameSamplingCandidate {
  icao: string;
  tier: AirportTier;
  region: string;
  trafficPrior: number;
  tierPrior: number;
  inFrame: boolean;
  preEligible: boolean;
  postEligible: boolean;
  exclusionReason: string | null;
}
export interface AirportSamplingState {
  icao: string;
  emaYield: number | null;
  mi: number;
  zeroYieldState: ZeroYieldState;
  consecutiveZeroYield: number;
  firstZeroYieldDate: string | null;
  lastSuccessfulPhase6ObservationAt: string | null;
  lastDirectObservationAt: string | null;
  lastSelectedAt: string | null;
  providerFailure: boolean;
  coverageFailed: boolean;
  stateVersion: number;
}
export interface SamplingSelection {
  slotId: SlotId;
  icao: string;
  targetRegion: string;
  isRandomized: boolean;
  designProbability: number | null;
  plannedShare: number | null;
  adaptiveStateHash: string | null;
  probabilityVector: Array<{ icao: string; probability: number; drawScore: number }> | null;
  drawType: "NEW_TEMPLATE" | "PAIR_REPLAY";
}
export interface SamplingDecision { selections: SamplingSelection[]; stateHash: string; }

function sha(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function norm(s: string): string { return s.trim().toUpperCase(); }
function stateFor(map: ReadonlyMap<string, AirportSamplingState>, icao: string): AirportSamplingState {
  return map.get(norm(icao)) ?? {
    icao: norm(icao), emaYield: null, mi: 1, zeroYieldState: "normal", consecutiveZeroYield: 0,
    firstZeroYieldDate: null, lastSuccessfulPhase6ObservationAt: null, lastDirectObservationAt: null,
    lastSelectedAt: null, providerFailure: false, coverageFailed: false, stateVersion: 0,
  };
}
function candidateEligible(c: FrameSamplingCandidate): boolean {
  return c.inFrame && c.preEligible && c.postEligible && !c.exclusionReason && c.region !== "UNMAPPED";
}
function assertFrozenHash(label: string, h: string): void {
  if (!/^[0-9a-f]{64}$/i.test(h)) throw new Error(`REFUSED_${label.toUpperCase()}_HASH: invalid frozen hash`);
}
function ms(x: string | null): number | null { if (!x) return null; const n = Date.parse(x); return Number.isFinite(n) ? n : null; }
function violates24hWashout(state: AirportSamplingState, start: Date): boolean {
  const last = ms(state.lastSelectedAt); return last !== null && start.getTime() - last < 24 * 3_600_000;
}
function midRecent(state: AirportSamplingState, start: Date): boolean {
  const last = ms(state.lastSelectedAt); return last !== null && start.getTime() - last < 7 * 86_400_000;
}
function directSort(a: FrameSamplingCandidate, b: FrameSamplingCandidate, states: ReadonlyMap<string, AirportSamplingState>): number {
  const sa = stateFor(states, a.icao), sb = stateFor(states, b.icao);
  const ad = ms(sa.lastDirectObservationAt), bd = ms(sb.lastDirectObservationAt);
  if (ad === null && bd !== null) return -1;
  if (ad !== null && bd === null) return 1;
  if (ad !== null && bd !== null && ad !== bd) return ad - bd;
  if (a.tier === "HUB" && a.tierPrior !== b.tierPrior) return b.tierPrior - a.tierPrior;
  return norm(a.icao).localeCompare(norm(b.icao));
}
function deterministicUnit(seed: string): number {
  const n = parseInt(sha(seed).slice(0, 13), 16);
  return n / 0x1fffffffffffff;
}

/** Pure exact V3.9 decision; persistence is a separate transactional owner. */
export function chooseAirportsForRunDay(
  plan: FrozenRunDaySamplingPlan,
  frame: FrameSamplingCandidate[],
  statesInput: AirportSamplingState[],
): SamplingDecision {
  assertFrozenHash("calendar", plan.calendarHash);
  assertFrozenHash("config", plan.configHash);
  if (!Number.isInteger(plan.runDayIndex) || plan.runDayIndex < 1 || plan.runDayIndex > 31) throw new Error("REFUSED_RUN_DAY: invalid run_day_index");
  const states = new Map(statesInput.map(s => [norm(s.icao), { ...s, icao: norm(s.icao) }]));
  const eligible = frame.filter(candidateEligible).map(c => ({ ...c, icao: norm(c.icao) }));
  const byIcao = new Map(eligible.map(c => [c.icao, c]));
  const selections: SamplingSelection[] = [];

  if (plan.drawType === "PAIR_REPLAY") {
    if (!plan.pairAirportSet) throw new Error("REFUSED_PAIR_REPLAY: exact frozen pair airport set missing");
    for (const slot of ["HUB", "MID_A", "MID_B", "REGIONAL"] as SlotId[]) {
      const frozen = plan.pairAirportSet[slot];
      const c = byIcao.get(norm(frozen.icao));
      if (!c || c.region !== plan.slotRegions[slot] || frozen.region !== plan.slotRegions[slot]) {
        throw new Error(`REFUSED_CELL_EMPTY: replay ${slot} ${frozen.icao} is not eligible in frozen region ${plan.slotRegions[slot]}`);
      }
      if (violates24hWashout(stateFor(states, c.icao), plan.windowStartUtc)) throw new Error(`REFUSED_WASHOUT: ${c.icao} <24h since prior use`);
      selections.push({ slotId: slot, icao: c.icao, targetRegion: plan.slotRegions[slot], isRandomized: slot === "REGIONAL", designProbability: slot === "REGIONAL" ? 1 : null, plannedShare: slot === "REGIONAL" ? null : 1, adaptiveStateHash: null, probabilityVector: slot === "REGIONAL" ? [{ icao: c.icao, probability: 1, drawScore: 1 }] : null, drawType: "PAIR_REPLAY" });
    }
    return { selections, stateHash: sha({ plan, selections }) };
  }

  if (plan.pairAirportSet) {
    // First period of a crossover pair is also an exact pre-treatment template.
    for (const slot of ["HUB", "MID_A", "MID_B", "REGIONAL"] as SlotId[]) {
      const frozen = plan.pairAirportSet[slot];
      const c = byIcao.get(norm(frozen.icao));
      if (!c || c.region !== plan.slotRegions[slot] || frozen.region !== plan.slotRegions[slot]) throw new Error(`REFUSED_CELL_EMPTY: pair template ${slot} unavailable`);
      if (violates24hWashout(stateFor(states, c.icao), plan.windowStartUtc)) throw new Error(`REFUSED_WASHOUT: ${c.icao} <24h since prior use`);
      selections.push({ slotId: slot, icao: c.icao, targetRegion: plan.slotRegions[slot], isRandomized: slot === "REGIONAL", designProbability: slot === "REGIONAL" ? 1 : null, plannedShare: slot === "REGIONAL" ? null : 1, adaptiveStateHash: null, probabilityVector: slot === "REGIONAL" ? [{ icao: c.icao, probability: 1, drawScore: 1 }] : null, drawType: "NEW_TEMPLATE" });
    }
    return { selections, stateHash: sha({ plan, selections }) };
  }

  const anchor = byIcao.get(norm(plan.anchorIcao));
  if (!anchor || anchor.tier !== "HUB" || anchor.region !== plan.slotRegions.HUB) throw new Error(`REFUSED_CELL_EMPTY: frozen anchor ${plan.anchorIcao} unavailable in ${plan.slotRegions.HUB}`);
  if (violates24hWashout(stateFor(states, anchor.icao), plan.windowStartUtc)) throw new Error(`REFUSED_WASHOUT: ${anchor.icao} <24h since prior use`);
  selections.push({ slotId: "HUB", icao: anchor.icao, targetRegion: plan.slotRegions.HUB, isRandomized: false, designProbability: null, plannedShare: 1, adaptiveStateHash: null, probabilityVector: null, drawType: "NEW_TEMPLATE" });

  const midAll = eligible.filter(c => c.tier === "MID");
  const enforceSevenDay = midAll.length >= 4;
  const used = new Set([anchor.icao]);
  for (const slot of ["MID_A", "MID_B"] as const) {
    const cell = midAll.filter(c => c.region === plan.slotRegions[slot] && !used.has(c.icao) && !violates24hWashout(stateFor(states, c.icao), plan.windowStartUtc));
    const fresh = enforceSevenDay ? cell.filter(c => !midRecent(stateFor(states, c.icao), plan.windowStartUtc)) : cell;
    const available = (fresh.length ? fresh : (!enforceSevenDay ? cell : [])).sort((a, b) => directSort(a, b, states));
    if (!available.length) throw new Error(`REFUSED_CELL_EMPTY: ${slot}×${plan.slotRegions[slot]} has no eligible freshest-first airport`);
    const c = available[0]; used.add(c.icao);
    selections.push({ slotId: slot, icao: c.icao, targetRegion: plan.slotRegions[slot], isRandomized: false, designProbability: null, plannedShare: 1, adaptiveStateHash: null, probabilityVector: null, drawType: "NEW_TEMPLATE" });
  }

  const regionalCell = eligible.filter(c => c.tier === "REGIONAL" && c.region === plan.slotRegions.REGIONAL && !used.has(c.icao) && !violates24hWashout(stateFor(states, c.icao), plan.windowStartUtc));
  if (!regionalCell.length) throw new Error(`REFUSED_CELL_EMPTY: REGIONAL×${plan.slotRegions.REGIONAL} has no eligible airport`);
  const medianPool = eligible.filter(c => c.tier === "REGIONAL").map(c => stateFor(states, c.icao)).filter(s => eligibilityForMedianPool("REGIONAL", s.emaYield, s.zeroYieldState, { inFrame: true, preEligible: true, postEligible: true, providerFailure: s.providerFailure, coverageFailed: s.coverageFailed })).map(s => s.emaYield!).filter(Number.isFinite);
  const median = calculateMedianEma(medianPool);
  const probability = computeRegionalProbabilityVector(regionalCell.map(c => {
    const s = stateFor(states, c.icao);
    const mi = deriveMi(s.emaYield, median, s.zeroYieldState);
    const boost = coverageBoostFactor(s.lastSuccessfulPhase6ObservationAt ? s.lastSuccessfulPhase6ObservationAt.slice(0, 10) : null, plan.windowStartUtc.toISOString().slice(0, 10));
    return { icao: c.icao, trafficPrior: c.trafficPrior, mi, coverageBoost: boost };
  }));
  const adaptiveStateHash = sha(probability.map(p => ({ icao: p.icao, trafficPrior: p.trafficPrior, mi: p.mi, coverageBoost: p.coverageBoost, probability: p.probability })));
  const u = deterministicUnit(`${plan.frozenDrawSeed}|REGIONAL|${adaptiveStateHash}`);
  let cumulative = 0; let selected = probability[probability.length - 1];
  for (const p of probability) { cumulative += p.probability; if (u <= cumulative) { selected = p; break; } }
  selections.push({ slotId: "REGIONAL", icao: selected.icao, targetRegion: plan.slotRegions.REGIONAL, isRandomized: true, designProbability: selected.probability, plannedShare: null, adaptiveStateHash, probabilityVector: probability.map(p => ({ icao: p.icao, probability: p.probability, drawScore: p.drawScore })), drawType: "NEW_TEMPLATE" });
  return { selections, stateHash: sha({ plan: { ...plan, windowStartUtc: plan.windowStartUtc.toISOString() }, selections }) };
}

/**
 * Pure adaptive-state transition wrapper used by the persistence owner after a
 * completed direct Phase-6 observation. Probe data must never call this path.
 */
export function nextRegionalAdaptiveState(
  current: AirportSamplingState,
  observation: AdaptiveObservation,
  observationDate: string,
  yieldScore: number | null,
  referenceMedian: number | null,
): AirportSamplingState {
  const miState: MiState = {
    value: current.mi, ema: current.emaYield, observationCount: current.stateVersion,
    zeroYieldState: current.zeroYieldState, consecutiveZeroYield: current.consecutiveZeroYield,
    firstZeroYieldDate: current.firstZeroYieldDate, lastObservationDate: current.lastDirectObservationAt?.slice(0, 10) ?? null,
    lastSuccessfulPhase6ObservationDate: current.lastSuccessfulPhase6ObservationAt?.slice(0, 10) ?? null,
    inWarmup: false, version: current.stateVersion,
  };
  const next = applyAdaptiveObservation(miState, observation, observationDate, yieldScore, referenceMedian);
  return {
    ...current,
    emaYield: next.ema,
    mi: next.value,
    zeroYieldState: next.zeroYieldState,
    consecutiveZeroYield: next.consecutiveZeroYield,
    firstZeroYieldDate: next.firstZeroYieldDate ?? null,
    lastSuccessfulPhase6ObservationAt: next.lastSuccessfulPhase6ObservationDate ? `${next.lastSuccessfulPhase6ObservationDate}T00:00:00.000Z` : current.lastSuccessfulPhase6ObservationAt,
    lastDirectObservationAt: observation === "valid_nonempty" || observation === "true_zero_yield" ? `${observationDate}T00:00:00.000Z` : current.lastDirectObservationAt,
    providerFailure: observation === "provider_failure",
    coverageFailed: observation === "coverage_failed",
    stateVersion: next.version ?? current.stateVersion,
  };
}
