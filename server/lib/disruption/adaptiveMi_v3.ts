/**
 * V3.9-f.8 REGIONAL adaptive allocation owner.
 *
 * Binding authority: SEPmd/V3.9_DataCollectPlan_f.8.md §§8.2, 8.3, 8.6.
 * This module deliberately fails closed on missing adaptive evidence. Probe
 * results never seed Phase-6 state and true zero-yield observations never
 * update the EMA.
 */

export interface EmaConfig {
  /** Frozen V3.9 smoothing factor. */
  alpha: number;
  /** Frozen lower bound for m_i. */
  lowerBound: number;
  /** Frozen upper bound for m_i. */
  upperBound: number;
  /** Compatibility field. V3.9 has no warmup averaging period. */
  warmupObservations: number;
}

export const DEFAULT_EMA_CONFIG: EmaConfig = {
  alpha: 0.5,
  lowerBound: 0.25,
  upperBound: 1.5,
  warmupObservations: 0,
};

export type ZeroYieldState =
  | "normal"
  | "zero_yield_once"
  | "zero_yield_repeated"
  | "zero_yield_persistent";

export interface ZeroYieldConfig {
  repeatedThreshold: number;
  persistentThreshold: number;
  persistentDays: number;
}

export const DEFAULT_ZERO_YIELD_CONFIG: ZeroYieldConfig = {
  repeatedThreshold: 2,
  persistentThreshold: 5,
  persistentDays: 30,
};

export type AdaptiveObservation =
  | "valid_nonempty"
  | "true_zero_yield"
  | "provider_failure"
  | "coverage_failed"
  | "missing";

/**
 * Classify a completed direct Phase-6 airport observation.
 * A true zero means a successful, complete provider observation containing
 * zero distinct canonical flight instances. A provider/coverage/parser error
 * is never a zero.
 */
export function classifyCompletedObservation(input: {
  complete: boolean;
  distinctCanonicalFlights: number | null;
  providerError?: boolean;
  coverageFailed?: boolean;
}): AdaptiveObservation {
  if (input.coverageFailed) return "coverage_failed";
  if (input.providerError) return "provider_failure";
  if (!input.complete || input.distinctCanonicalFlights === null) return "missing";
  if (input.distinctCanonicalFlights < 0 || !Number.isFinite(input.distinctCanonicalFlights)) return "missing";
  return input.distinctCanonicalFlights === 0 ? "true_zero_yield" : "valid_nonempty";
}

/**
 * Deprecated compatibility adapter retained for old callers. It intentionally
 * cannot manufacture a true-zero from a failed/no-observation call. New
 * production code must use classifyCompletedObservation().
 */
export function classifyZeroYieldObservation(
  flightObserved: boolean,
  delayExceedsThreshold: boolean,
  providerError: boolean,
): "true_zero_yield" | "provider_failure" | "has_yield" {
  if (providerError || !flightObserved) return "provider_failure";
  return delayExceedsThreshold ? "has_yield" : "true_zero_yield";
}

function utcDayDiff(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;
  return (to - from) / 86_400_000;
}

/**
 * Sole V3.9 zero-yield FSM. Provider/coverage failures do not advance it.
 * Persistent is reached after >=5 consecutive valid empty observations OR
 * >=30 calendar days since the first unresolved valid empty observation.
 */
export function transitionZeroYieldState(
  currentState: ZeroYieldState,
  observation: "true_zero_yield" | "provider_failure" | "has_yield" | "coverage_failed" | "missing",
  config: ZeroYieldConfig = DEFAULT_ZERO_YIELD_CONFIG,
  consecutiveZeroYield: number,
  firstZeroYieldDate: string | null = null,
  observationDate: string | null = null,
): { newState: ZeroYieldState; newConsecutive: number; firstZeroYieldDate: string | null } {
  if (observation === "provider_failure" || observation === "coverage_failed" || observation === "missing") {
    return { newState: currentState, newConsecutive: consecutiveZeroYield, firstZeroYieldDate };
  }
  if (observation === "has_yield") {
    return { newState: "normal", newConsecutive: 0, firstZeroYieldDate: null };
  }

  const newConsecutive = consecutiveZeroYield + 1;
  const firstZero = firstZeroYieldDate ?? observationDate;
  const persistentByDays = Boolean(
    firstZero && observationDate && utcDayDiff(firstZero, observationDate) >= config.persistentDays,
  );

  if (newConsecutive >= config.persistentThreshold || persistentByDays) {
    return { newState: "zero_yield_persistent", newConsecutive, firstZeroYieldDate: firstZero };
  }
  if (newConsecutive >= config.repeatedThreshold) {
    return { newState: "zero_yield_repeated", newConsecutive, firstZeroYieldDate: firstZero };
  }
  return { newState: "zero_yield_once", newConsecutive, firstZeroYieldDate: firstZero };
}

/** Exact V3.9 EMA recurrence. Call only for valid NONEMPTY observations. */
export function emaUpdate(
  previousEma: number | null,
  currentValue: number,
  config: EmaConfig = DEFAULT_EMA_CONFIG,
): number {
  if (!Number.isFinite(currentValue) || currentValue < 0) {
    throw new Error("adaptive yield must be a finite non-negative number");
  }
  if (!(config.alpha > 0 && config.alpha <= 1)) throw new Error("invalid adaptive alpha");
  if (previousEma === null) return currentValue;
  return config.alpha * currentValue + (1 - config.alpha) * previousEma;
}

export interface MiState {
  value: number;
  ema: number | null;
  observationCount: number;
  zeroYieldState: ZeroYieldState;
  consecutiveZeroYield: number;
  lastObservationDate: string | null;
  /** Always false under V3.9; retained for source compatibility. */
  inWarmup: boolean;
  firstZeroYieldDate?: string | null;
  lastSuccessfulPhase6ObservationDate?: string | null;
  version?: number;
}

export function clampMi(value: number, config: EmaConfig = DEFAULT_EMA_CONFIG): number {
  return Math.max(config.lowerBound, Math.min(config.upperBound, value));
}

/**
 * Compute base m_i from the frozen reference median. Missing EMA or an empty /
 * non-positive reference median means cold-start m_i=1.0.
 */
export function deriveBaseMi(
  ema: number | null,
  medianEmaYieldFrame: number | null,
  config: EmaConfig = DEFAULT_EMA_CONFIG,
): number {
  if (ema === null || medianEmaYieldFrame === null || !Number.isFinite(medianEmaYieldFrame) || medianEmaYieldFrame <= 0) {
    return 1.0;
  }
  return clampMi(ema / medianEmaYieldFrame, config);
}

/** Apply only the V3.9 repeated-zero transient penalty. */
export function deriveMi(
  ema: number | null,
  medianEmaYieldFrame: number | null,
  zeroYieldState: ZeroYieldState,
  config: EmaConfig = DEFAULT_EMA_CONFIG,
): number {
  const base = deriveBaseMi(ema, medianEmaYieldFrame, config);
  return zeroYieldState === "zero_yield_repeated"
    ? clampMi(base * 0.75, config)
    : base;
}

/**
 * Compatibility updater for a valid nonempty observation. No warmup average is
 * performed. If no reference median is supplied, the correct cold-start
 * fallback is m_i=1 rather than inventing a normalization reference.
 */
export function calculateMi(
  state: MiState,
  newValue: number,
  config: EmaConfig = DEFAULT_EMA_CONFIG,
  medianEmaYieldFrame: number | null = null,
  observationDate = new Date().toISOString().slice(0, 10),
): MiState {
  const ema = emaUpdate(state.ema, newValue, config);
  return {
    ...state,
    value: deriveMi(ema, medianEmaYieldFrame, "normal", config),
    ema,
    observationCount: state.observationCount + 1,
    zeroYieldState: "normal",
    consecutiveZeroYield: 0,
    firstZeroYieldDate: null,
    lastObservationDate: observationDate,
    lastSuccessfulPhase6ObservationDate: observationDate,
    inWarmup: false,
    version: (state.version ?? 0) + 1,
  };
}

/**
 * Update adaptive state from one completed observation. True zero and failures
 * NEVER update EMA. Only a valid nonempty observation updates EMA.
 */
export function applyAdaptiveObservation(
  state: MiState,
  observation: AdaptiveObservation,
  observationDate: string,
  yieldScore: number | null,
  medianEmaYieldFrame: number | null,
  emaConfig: EmaConfig = DEFAULT_EMA_CONFIG,
  zeroConfig: ZeroYieldConfig = DEFAULT_ZERO_YIELD_CONFIG,
): MiState {
  if (observation === "valid_nonempty") {
    if (yieldScore === null) throw new Error("valid nonempty observation requires yieldScore");
    return calculateMi(state, yieldScore, emaConfig, medianEmaYieldFrame, observationDate);
  }

  if (observation === "true_zero_yield") {
    const transition = transitionZeroYieldState(
      state.zeroYieldState,
      "true_zero_yield",
      zeroConfig,
      state.consecutiveZeroYield,
      state.firstZeroYieldDate ?? null,
      observationDate,
    );
    return {
      ...state,
      value: deriveMi(state.ema, medianEmaYieldFrame, transition.newState, emaConfig),
      zeroYieldState: transition.newState,
      consecutiveZeroYield: transition.newConsecutive,
      firstZeroYieldDate: transition.firstZeroYieldDate,
      lastObservationDate: observationDate,
      inWarmup: false,
      version: (state.version ?? 0) + 1,
    };
  }

  // Provider/coverage/missing observations leave EMA and zero FSM unchanged.
  return { ...state, inWarmup: false };
}

/** V3.9 median reference-pool eligibility. */
export function eligibilityForMedianPool(
  tier: string,
  ema: number | null,
  zeroYieldState: ZeroYieldState,
  flags: { inFrame?: boolean; preEligible?: boolean; postEligible?: boolean; providerFailure?: boolean; coverageFailed?: boolean } = {},
): boolean {
  if (tier !== "REGIONAL" || ema === null) return false;
  if (flags.inFrame === false || flags.preEligible === false || flags.postEligible === false) return false;
  if (flags.providerFailure || flags.coverageFailed) return false;
  if (zeroYieldState === "zero_yield_once" || zeroYieldState === "zero_yield_persistent") return false;
  return true;
}

export function calculateMedianEma(emaValues: number[]): number | null {
  const finite = emaValues.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  const sorted = [...finite].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export interface CoverageFloorConfig {
  /** Kept for compatibility only. V3.9 has no forced minimum probability. */
  minimumPi: number;
  boostFactor: number;
  boostDurationDays: number;
}

export const DEFAULT_COVERAGE_FLOOR_CONFIG: CoverageFloorConfig = {
  minimumPi: 0,
  boostFactor: 1.5,
  boostDurationDays: 20,
};

/**
 * Compatibility function: V3.9 does not impose a minimum p floor. Positivity
 * must come from traffic_prior>0 and m_i>=0.25 before normalization.
 */
export function applyCoverageFloor(designProbability: number): number {
  if (!Number.isFinite(designProbability) || designProbability < 0) {
    throw new Error("invalid design probability");
  }
  return designProbability;
}

/**
 * Coverage boost eligibility is based ONLY on successful qualifying Phase-6
 * direct observations, never on frame-build/inclusion time.
 */
export function isCoverageBoostEligible(
  lastSuccessfulPhase6ObservationDate: string | null,
  currentDate: string,
  config: CoverageFloorConfig = DEFAULT_COVERAGE_FLOOR_CONFIG,
): boolean {
  if (!lastSuccessfulPhase6ObservationDate) return true;
  const age = utcDayDiff(lastSuccessfulPhase6ObservationDate, currentDate);
  return age >= config.boostDurationDays;
}

export function coverageBoostFactor(
  lastSuccessfulPhase6ObservationDate: string | null,
  currentDate: string,
  config: CoverageFloorConfig = DEFAULT_COVERAGE_FLOOR_CONFIG,
): number {
  return isCoverageBoostEligible(lastSuccessfulPhase6ObservationDate, currentDate, config)
    ? config.boostFactor
    : 1.0;
}

export interface RegionalProbabilityInput {
  icao: string;
  trafficPrior: number;
  mi: number;
  coverageBoost: number;
}

export interface RegionalProbabilityRow extends RegionalProbabilityInput {
  adaptiveScore: number;
  drawScore: number;
  probability: number;
}

/** Exact normalized V3.9 REGIONAL probability vector. */
export function computeRegionalProbabilityVector(inputs: RegionalProbabilityInput[]): RegionalProbabilityRow[] {
  if (inputs.length === 0) return [];
  const rows = [...inputs]
    .sort((a, b) => a.icao.localeCompare(b.icao))
    .map((row) => {
      if (!(row.trafficPrior > 0) || !(row.mi >= 0.25 && row.mi <= 1.5) || !(row.coverageBoost > 0)) {
        throw new Error(`invalid REGIONAL adaptive state for ${row.icao}`);
      }
      const adaptiveScore = Math.min(row.trafficPrior * row.mi, row.trafficPrior * 1.5);
      return { ...row, adaptiveScore, drawScore: adaptiveScore * row.coverageBoost, probability: 0 };
    });
  const total = rows.reduce((sum, row) => sum + row.drawScore, 0);
  if (!(total > 0) || !Number.isFinite(total)) throw new Error("REGIONAL probability denominator is non-positive");
  return rows.map((row) => ({ ...row, probability: row.drawScore / total }));
}

export interface Phase6InitialState {
  m_i_initial_source: string;
  ema_initial_source: string;
  zero_yield_initial_state: ZeroYieldState;
  coverage_floor_initial_state: string;
  probeSeeded: boolean;
  initialMi: number;
  initialEma: null;
  coverageBoost: number;
}

/** Binding Phase-6 initial state. Probe arguments are intentionally ignored. */
export function freezePhase6InitialState(
  _probeResultsAvailable = false,
  _medianEma: number | null = null,
): Phase6InitialState {
  return {
    m_i_initial_source: "uniform",
    ema_initial_source: "none",
    zero_yield_initial_state: "normal",
    coverage_floor_initial_state: "never_observed",
    probeSeeded: false,
    initialMi: 1.0,
    initialEma: null,
    coverageBoost: 1.5,
  };
}
