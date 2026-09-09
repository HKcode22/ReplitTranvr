/**
 * AIRBORNE snapshot builder — Phase 0G (§1.5.7).
 *
 * Plan coverage: §§2, 6.1–6.2, 6.4–6.5, 7.5, 13 POST.
 *
 * Builds AIRBORNE snapshots from the trajectory layers:
 *   raw airborne/location observations
 *     → clean_airborne_points
 *     → flight_trajectory
 *     → flight_airborne_snapshots
 *
 * Binding rules implemented here (§1.5.7):
 *  - preserve every legitimate point (never latest-location-only);
 *  - physical location-observation clock is separate from the deployable
 *    prediction cutoff (`prediction_cutoff_utc` is normally durable availability);
 *  - only verified provider-native airborne movement evidence enables AIRBORNE
 *    state; a webhook point alone cannot define the denominator;
 *  - `airborne_eligible` = flight_population ∩ verified airborne evidence;
 *  - flight phases preserved explicitly (no pooling of incompatible states);
 *  - distance_to_destination / distance_flown / fraction_of_route_completed are
 *    DERIVED downstream features, never raw provider facts;
 *  - cadence/completeness reported (obs_per_flight, gaps, duration, %);
 *    thresholds are frozen config inputs, never hard-coded answers;
 *  - milestone-explicit POST target family (POST-A, POST-B1, POST-B2) plus
 *    PRE-side departure-delay targets.
 *
 * Pure offline logic (no DB calls): persistence lives with the caller.
 */

export const AIRBORNE_SNAPSHOT_BUILDER_VERSION = "airborneSnapshotBuilder_v3@1.0.0";

export const AIRBORNE_PREDICTION_STATE = "AIRBORNE" as const;

export type FlightPhase =
  | "pre_departure" | "taxi_out" | "airborne_climb" | "airborne_cruise"
  | "airborne_descent" | "approach" | "landed" | "taxi_in" | "gate_in";

export type AirborneFunnelStage =
  | "airborne_eligible" | "observed" | "usable" | "trajectory_complete"
  | "POST_snapshot_eligible" | "POST_labeled";

/** One preserved trajectory observation. */
export interface TrajectoryPoint {
  observedAtUtc: Date;          // physical location-observation clock
  availableAtUtc: Date | null;  // durable availability clock (may lag observation)
  lat: number | null;
  lon: number | null;
  altitudeFt: number | null;
  phase: FlightPhase | null;
}

/** Cadence/completeness diagnostics for one flight's trajectory. */
export interface TrajectoryCadence {
  obsPerFlight: number;
  medianGapSeconds: number | null;
  p95GapSeconds: number | null;
  maxGapSeconds: number | null;
  trajectoryDurationSeconds: number | null;
  completenessPct: number | null;
  sourceLatencySeconds: number | null;
}

/** Milestone-explicit POST target family (§1.5.7 rule 14). */
export interface PostTargetFamily {
  /** POST-A deployable remaining-time label = actual_wheels_on − prediction_cutoff. */
  postARemainingSeconds: number | null;
  /** POST-B1 = actual_wheels_on − scheduled_wheels_on. */
  postB1WheelsOnDelaySeconds: number | null;
  /** POST-B2 = actual_gate_in − scheduled_gate_in. */
  postB2GateInDelaySeconds: number | null;
  /** PRE-side departure delays (kept separate, never pooled). */
  preGateOutDelaySeconds: number | null;
  preWheelsOffDelaySeconds: number | null;
}

export interface AirborneSnapshotInput {
  flightInstanceId: string;
  /** Independent of webhook capture: population ∩ verified airborne evidence. */
  airborneEligible: boolean;
  points: TrajectoryPoint[];
  predictionCutoffUtc: Date;
  stateObservationTimeUtc: Date | null;
  /** Frozen cadence/completeness thresholds (Gate-0.5 MEASURE→FREEZE). */
  minUsablePoints: number | null;
  completenessThresholdPct: number | null;
  actualWheelsOnUtc: Date | null;
  scheduledWheelsOnUtc: Date | null;
  actualGateInUtc: Date | null;
  scheduledGateInUtc: Date | null;
  actualGateOutUtc: Date | null;
  scheduledGateOutUtc: Date | null;
  actualWheelsOffUtc: Date | null;
  scheduledWheelsOffUtc: Date | null;
}

export interface AirborneSnapshot {
  flightInstanceId: string;
  predictionState: typeof AIRBORNE_PREDICTION_STATE;
  predictionCutoffUtc: Date;
  stateObservationTimeUtc: Date | null;
  funnelStage: AirborneFunnelStage;
  cadence: TrajectoryCadence;
  targets: PostTargetFamily;
  provenance: { builderVersion: string };
}

function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[idx];
}

/** Compute cadence diagnostics from preserved points (never invents points). */
export function computeTrajectoryCadence(points: TrajectoryPoint[]): TrajectoryCadence {
  const obsPerFlight = points.length;
  if (obsPerFlight === 0) {
    return {
      obsPerFlight: 0, medianGapSeconds: null, p95GapSeconds: null,
      maxGapSeconds: null, trajectoryDurationSeconds: null,
      completenessPct: null, sourceLatencySeconds: null,
    };
  }
  const times = points
    .map((p) => p.observedAtUtc.getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) gaps.push((times[i] - times[i - 1]) / 1000);
  gaps.sort((a, b) => a - b);
  const latencies = points
    .filter((p) => p.availableAtUtc)
    .map((p) => Math.max(0, (p.availableAtUtc!.getTime() - p.observedAtUtc.getTime()) / 1000))
    .sort((a, b) => a - b);
  return {
    obsPerFlight,
    medianGapSeconds: quantile(gaps, 0.5),
    p95GapSeconds: quantile(gaps, 0.95),
    maxGapSeconds: gaps.length ? gaps[gaps.length - 1] : null,
    trajectoryDurationSeconds: times.length > 1 ? (times[times.length - 1] - times[0]) / 1000 : 0,
    completenessPct: null, // set by caller against the frozen threshold
    sourceLatencySeconds: quantile(latencies, 0.5),
  };
}

function diffSeconds(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null;
  return (a.getTime() - b.getTime()) / 1000;
}

/**
 * Build one AIRBORNE snapshot, or report the funnel stage it stopped at.
 * `airborne_eligible=false` → BLOCKED denominator (never inferred from capture).
 */
export function buildAirborneSnapshot(input: AirborneSnapshotInput): AirborneSnapshot {
  const cadence = computeTrajectoryCadence(input.points);

  let funnelStage: AirborneFunnelStage = "airborne_eligible";
  if (!input.airborneEligible) {
    return {
      flightInstanceId: input.flightInstanceId,
      predictionState: AIRBORNE_PREDICTION_STATE,
      predictionCutoffUtc: input.predictionCutoffUtc,
      stateObservationTimeUtc: input.stateObservationTimeUtc,
      funnelStage,
      cadence,
      targets: {
        postARemainingSeconds: null, postB1WheelsOnDelaySeconds: null,
        postB2GateInDelaySeconds: null, preGateOutDelaySeconds: null,
        preWheelsOffDelaySeconds: null,
      },
      provenance: { builderVersion: AIRBORNE_SNAPSHOT_BUILDER_VERSION },
    };
  }
  funnelStage = input.points.length > 0 ? "observed" : "airborne_eligible";
  const usable =
    input.minUsablePoints !== null && input.points.length >= input.minUsablePoints;
  if (usable) funnelStage = "usable";
  if (usable) {
    const complete =
      input.completenessThresholdPct === null ||
      (cadence.completenessPct !== null && cadence.completenessPct >= input.completenessThresholdPct);
    if (complete) funnelStage = "trajectory_complete";
  }

  const targets: PostTargetFamily = {
    postARemainingSeconds:
      input.actualWheelsOnUtc ? diffSeconds(input.actualWheelsOnUtc, input.predictionCutoffUtc) : null,
    postB1WheelsOnDelaySeconds: diffSeconds(input.actualWheelsOnUtc, input.scheduledWheelsOnUtc),
    postB2GateInDelaySeconds: diffSeconds(input.actualGateInUtc, input.scheduledGateInUtc),
    preGateOutDelaySeconds: diffSeconds(input.actualGateOutUtc, input.scheduledGateOutUtc),
    preWheelsOffDelaySeconds: diffSeconds(input.actualWheelsOffUtc, input.scheduledWheelsOffUtc),
  };
  if (funnelStage === "trajectory_complete") funnelStage = "POST_snapshot_eligible";

  return {
    flightInstanceId: input.flightInstanceId,
    predictionState: AIRBORNE_PREDICTION_STATE,
    predictionCutoffUtc: input.predictionCutoffUtc,
    stateObservationTimeUtc: input.stateObservationTimeUtc,
    funnelStage,
    cadence,
    targets,
    provenance: { builderVersion: AIRBORNE_SNAPSHOT_BUILDER_VERSION },
  };
}
