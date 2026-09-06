/**
 * Adaptive regional m_i — V3.9-f.8 §36 / Sep1_1 §36
 *
 * Implements:
 *   - EMA (Exponential Moving Average) for yield estimation
 *   - Zero-yield state machine (normal → zero_yield_once → zero_yield_repeated → zero_yield_persistent)
 *   - Median/reference pool for EMA normalization
 *   - Coverage floor with positive-probability guarantee
 *   - m_i bounds clamping
 *
 * Sep1_1 §36 corrections:
 *  - Exact EMA formula with alpha, first observation, cold-start, missing, zero-yield behaviors
 *  - Median/reference pool explicitly defined (REGIONAL only, non-null EMA, exclude persistent zero-yield)
 *  - Zero-yield state machine with exact states and transition rules
 *  - Provider failure ≠ zero-yield airport observation
 *  - Initial Phase-6 state frozen before collection starts
 */

// ---------------------------------------------------------------------------
// EMA Configuration
// ---------------------------------------------------------------------------

export interface EmaConfig {
  /** Smoothing factor (0 < alpha ≤ 1). alpha = 0.5 means ~4 observations to converge. */
  alpha: number;
  /** Lower bound for m_i (minimum probability) */
  lowerBound: number;
  /** Upper bound for m_i (maximum probability) */
  upperBound: number;
  /** Number of observations before EMA stabilizes */
  warmupObservations: number;
}

export const DEFAULT_EMA_CONFIG: EmaConfig = {
  alpha: 0.5,
  lowerBound: 0.001,
  upperBound: 1.0,
  warmupObservations: 4,
};

// ---------------------------------------------------------------------------
// Zero-yield state machine (§36.4)
// ---------------------------------------------------------------------------

export type ZeroYieldState =
  | "normal"
  | "zero_yield_once"
  | "zero_yield_repeated"
  | "zero_yield_persistent";

export interface ZeroYieldConfig {
  /** How many consecutive zero-yield observations before "repeated" */
  repeatedThreshold: number;
  /** How many consecutive zero-yield observations before "persistent" */
  persistentThreshold: number;
  /** Days to observe before "persistent" is confirmed */
  persistentDays: number;
}

export const DEFAULT_ZERO_YIELD_CONFIG: ZeroYieldConfig = {
  repeatedThreshold: 3,
  persistentThreshold: 5,
  persistentDays: 20,
};

/**
 * Classify a zero-yield observation.
 * IMPORTANT: A provider error is NOT a zero-yield airport observation.
 * Only true zero-yield (flight observed but no delay) counts.
 */
export function classifyZeroYieldObservation(
  /** Was a flight actually observed at this airport? */
  flightObserved: boolean,
  /** Was there a delay exceeding the threshold? */
  delayExceedsThreshold: boolean,
  /** Was this a provider error/timeout? */
  providerError: boolean,
): "true_zero_yield" | "provider_failure" | "has_yield" {
  if (providerError) return "provider_failure";
  if (!flightObserved) return "provider_failure"; // no observation ≠ zero yield
  if (delayExceedsThreshold) return "has_yield";
  return "true_zero_yield";
}

/**
 * State transition for zero-yield FSM.
 * Returns the new state given the current state and observation.
 */
export function transitionZeroYieldState(
  currentState: ZeroYieldState,
  observation: "true_zero_yield" | "provider_failure" | "has_yield",
  config: ZeroYieldConfig = DEFAULT_ZERO_YIELD_CONFIG,
  /** How many consecutive zero-yield observations so far (resets on has_yield) */
  consecutiveZeroYield: number,
): { newState: ZeroYieldState; newConsecutive: number } {
  // Provider failure does NOT advance the zero-yield state machine
  if (observation === "provider_failure") {
    return { newState: currentState, newConsecutive: consecutiveZeroYield };
  }

  // Any yield observation resets to normal
  if (observation === "has_yield") {
    return { newState: "normal", newConsecutive: 0 };
  }

  // true_zero_yield: advance the state machine
  const newConsecutive = consecutiveZeroYield + 1;

  if (newConsecutive >= config.persistentThreshold) {
    return { newState: "zero_yield_persistent", newConsecutive };
  }
  if (newConsecutive >= config.repeatedThreshold) {
    return { newState: "zero_yield_repeated", newConsecutive };
  }
  if (newConsecutive >= 1) {
    return { newState: "zero_yield_once", newConsecutive };
  }

  return { newState: "normal", newConsecutive: 0 };
}

// ---------------------------------------------------------------------------
// EMA Calculation (§36.2)
// ---------------------------------------------------------------------------

/**
 * Exact EMA recurrence:
 *   ema_t = alpha * x_t + (1 - alpha) * ema_{t-1}
 *
 * First observation: ema = x_1 (no previous EMA)
 * Cold start (no observations): ema = null
 * Missing observation: ema unchanged (use previous value)
 * Zero-yield: x_t = 0, but ema still updates (don't skip)
 */
export function emaUpdate(
  previousEma: number | null,
  currentValue: number,
  config: EmaConfig = DEFAULT_EMA_CONFIG,
): number {
  if (previousEma === null) {
    // First observation: ema = x_1
    return currentValue;
  }
  // Standard EMA recurrence
  return config.alpha * currentValue + (1 - config.alpha) * previousEma;
}

// ---------------------------------------------------------------------------
// m_i Calculation (§36.1)
// ---------------------------------------------------------------------------

export interface MiState {
  /** Current m_i value */
  value: number;
  /** EMA of yield */
  ema: number | null;
  /** Number of observations */
  observationCount: number;
  /** Zero-yield state */
  zeroYieldState: ZeroYieldState;
  /** Consecutive zero-yield observations */
  consecutiveZeroYield: number;
  /** Last observation date */
  lastObservationDate: string | null;
  /** Whether this is in warmup phase */
  inWarmup: boolean;
}

/**
 * Calculate m_i for an airport.
 * m_i = clamp(ema_yield, lowerBound, upperBound)
 *
 * During warmup (< warmupObservations), m_i is the simple average.
 * After warmup, m_i is the EMA.
 */
export function calculateMi(
  state: MiState,
  newValue: number,
  config: EmaConfig = DEFAULT_EMA_CONFIG,
): MiState {
  const observationCount = state.observationCount + 1;

  let ema: number;
  if (observationCount <= 1) {
    // First observation
    ema = newValue;
  } else if (observationCount <= config.warmupObservations) {
    // Warmup: simple average
    const prevAvg = state.ema ?? 0;
    ema = (prevAvg * (observationCount - 1) + newValue) / observationCount;
  } else {
    // Post-warmup: EMA
    ema = emaUpdate(state.ema, newValue, config);
  }

  // Clamp to bounds
  const clampedValue = Math.max(config.lowerBound, Math.min(config.upperBound, ema));

  return {
    value: clampedValue,
    ema,
    observationCount,
    zeroYieldState: state.zeroYieldState,
    consecutiveZeroYield: state.consecutiveZeroYield,
    lastObservationDate: new Date().toISOString().slice(0, 10),
    inWarmup: observationCount < config.warmupObservations,
  };
}

// ---------------------------------------------------------------------------
// Median Reference Pool (§36.3)
// ---------------------------------------------------------------------------

/**
 * Define which airports enter the median_ema_yield_frame.
 *
 * Sep1_1 §36.3 decisions:
 *   - Only REGIONAL airports (not HUB/MID, which are slot-filled)
 *   - Only those with non-null EMA
 *   - Include zero-yield_once and zero_yield_repeated (not persistent)
 *   - Exclude zero_yield_persistent (they pull median down)
 *   - Include failed/provider-error observations (they don't affect median)
 */
export function eligibilityForMedianPool(
  tier: string,
  ema: number | null,
  zeroYieldState: ZeroYieldState,
): boolean {
  // Only REGIONAL
  if (tier !== "REGIONAL") return false;
  // Must have non-null EMA
  if (ema === null) return false;
  // Exclude persistent zero-yield
  if (zeroYieldState === "zero_yield_persistent") return false;
  return true;
}

/**
 * Calculate the median EMA yield across the reference pool.
 * Used for initializing new airports and normalizing m_i.
 */
export function calculateMedianEma(emaValues: number[]): number | null {
  if (emaValues.length === 0) return null;
  const sorted = [...emaValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

// ---------------------------------------------------------------------------
// Coverage Floor (§36.5)
// ---------------------------------------------------------------------------

export interface CoverageFloorConfig {
  /** Minimum p_i for any airport in the frame */
  minimumPi: number;
  /** Boost factor for airports below the median */
  boostFactor: number;
  /** Duration of boost in days */
  boostDurationDays: number;
}

export const DEFAULT_COVERAGE_FLOOR_CONFIG: CoverageFloorConfig = {
  minimumPi: 0.001,
  boostFactor: 1.5,
  boostDurationDays: 20,
};

/**
 * Apply coverage floor to design probability.
 * Ensures p_i > 0 for all airports in the frame.
 * NOTE: This does NOT guarantee selection within a finite 31-day experiment.
 * It only ensures positive probability.
 */
export function applyCoverageFloor(
  designProbability: number,
  config: CoverageFloorConfig = DEFAULT_COVERAGE_FLOOR_CONFIG,
): number {
  return Math.max(config.minimumPi, designProbability);
}

/**
 * Check if an airport is eligible for the coverage boost.
 * Boost applies for 20 days after first inclusion in the frame.
 */
export function isCoverageBoostEligible(
  firstIncludedDate: string,
  currentDate: string,
  config: CoverageFloorConfig = DEFAULT_COVERAGE_FLOOR_CONFIG,
): boolean {
  const first = new Date(firstIncludedDate);
  const current = new Date(currentDate);
  const daysSinceInclusion = (current.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceInclusion <= config.boostDurationDays;
}

// ---------------------------------------------------------------------------
// Initial Phase-6 State (§36.5)
// ---------------------------------------------------------------------------

export interface Phase6InitialState {
  m_i_initial_source: string;
  ema_initial_source: string;
  zero_yield_initial_state: ZeroYieldState;
  coverage_floor_initial_state: string;
  probeSeeded: boolean;
}

/**
 * Freeze initial Phase-6 state.
 * Explicitly states whether probe results seed Phase-6 adaptive state.
 * No hidden initialization.
 */
export function freezePhase6InitialState(
  probeResultsAvailable: boolean,
  medianEma: number | null,
): Phase6InitialState {
  return {
    m_i_initial_source: probeResultsAvailable ? "probe_results" : "default_prior",
    ema_initial_source: probeResultsAvailable ? "probe_ema" : "median_ema",
    zero_yield_initial_state: "normal",
    coverage_floor_initial_state: probeResultsAvailable ? "probe_measured" : "default_minimum",
    probeSeeded: probeResultsAvailable,
  };
}
