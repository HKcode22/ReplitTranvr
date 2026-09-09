/**
 * Evaluation guard — Phase 0M (§1.5.13).
 *
 * Resolves the apparent "evaluation code before collection vs engines in
 * Phase 7" tension exactly as the Log structures it: the GUARD machinery
 * (split rule application, leakage refusal, no-tuning-on-test enforcement,
 * mechanism-ablation metadata, staleness inputs, info-per-credit vectors,
 * resource vectors, preregistered claim structures) must exist and be tested
 * BEFORE collection. Model FITTING (XGBoost, GNN, calibration) runs in
 * Phase 7. Guards first, fitting later — never the reverse.
 *
 * Pure offline logic (no DB/provider calls).
 */

import { createHash } from "crypto";

export const EVAL_GUARD_VERSION = "evaluationGuard_v3@1.0.0";

// ---------------------------------------------------------------------------
// Mechanism-ablation feature sets (§1.5.13, frozen sequence A→D).
// A = all features; B removes collection-mechanism metadata; C additionally
// removes airport identity; D additionally removes graph connectivity.
// ---------------------------------------------------------------------------

export type AblationArm = "A" | "B" | "C" | "D";

export const ABLATION_REMOVED_GROUPS: Record<AblationArm, string[]> = {
  A: [],
  B: [
    "coverage_age",
    "notification_count",
    "capture",
    "observation_density",
    "sampling_strategy",
    "subscription_metadata",
  ],
  C: [
    "coverage_age",
    "notification_count",
    "capture",
    "observation_density",
    "sampling_strategy",
    "subscription_metadata",
    "airport_identity",
  ],
  D: [
    "coverage_age",
    "notification_count",
    "capture",
    "observation_density",
    "sampling_strategy",
    "subscription_metadata",
    "airport_identity",
    "graph_connectivity",
  ],
};

/** Features surviving an ablation arm (never mutates the input list). */
export function applyAblationArm(allFeatures: string[], arm: AblationArm): string[] {
  const removed = new Set(ABLATION_REMOVED_GROUPS[arm]);
  return allFeatures.filter((f) => !removed.has(f));
}

// ---------------------------------------------------------------------------
// Preregistered primary claim (§1.5.13).
// Model 1 XGBoost vs Model −1 persistence; Engine A; T−6h headline;
// MAE; practical delta ≥2 minutes; 95% day-block bootstrap; decision
// classification fixed BEFORE the protected read.
// ---------------------------------------------------------------------------

export interface PreregisteredClaim {
  modelA: string;
  modelB: string;
  engine: string;
  horizon: string;
  metric: string;
  practicalDeltaMinutes: number;
  uncertainty: string;
  decisionRule: string;
}

export const PRIMARY_CLAIM: PreregisteredClaim = {
  modelA: "Model 1 XGBoost",
  modelB: "Model −1 persistence",
  engine: "Engine A",
  horizon: "T-6h",
  metric: "MAE",
  practicalDeltaMinutes: 2,
  uncertainty: "95% calendar-day block bootstrap",
  decisionRule: "positive iff point delta_MAE ≥ 2min AND bootstrap lower bound > 0; negative iff ≤ −2min AND upper < 0; else neutral/inconclusive",
};

export function claimHash(claim: PreregisteredClaim = PRIMARY_CLAIM): string {
  return createHash("sha256").update(JSON.stringify(claim)).digest("hex");
}

// ---------------------------------------------------------------------------
// Protected-test read-once guard: TEST rows are read exactly once, after
// model selection. A second read is refused (no tuning on test).
// ---------------------------------------------------------------------------

export type ProtectedTestState = "unread" | "read-once" | "refused-second-read";

export function recordProtectedTestRead(current: ProtectedTestState): ProtectedTestState {
  if (current === "unread") return "read-once";
  return "refused-second-read";
}

// ---------------------------------------------------------------------------
// Leakage refusal: a candidate training feature set must not contain
// protected-test-derived inputs or post-cutoff facts.
// ---------------------------------------------------------------------------

const FORBIDDEN_TRAINING_PATTERNS = [/^test_/i, /protected/i, /post_cutoff/i, /future_/i];

/** Refuse training sets that reference protected/test/future-derived inputs. */
export function checkTrainingSetForLeakage(featureNames: string[]): { clean: boolean; offenders: string[] } {
  const offenders = featureNames.filter((f) => FORBIDDEN_TRAINING_PATTERNS.some((re) => re.test(f)));
  return { clean: offenders.length === 0, offenders };
}

// ---------------------------------------------------------------------------
// Info-per-credit + resource vectors (§1.5.13 Month-1 reporting inputs).
// ---------------------------------------------------------------------------

export interface InfoPerCredit {
  alertCredits: number;
  restApiUnits: number;
  uniqueFlights: number;
  preSnapshots: number;
  postSnapshots: number;
  airbornePoints: number;
}

export interface InfoPerCreditRates {
  flightsPerCredit: number | null;
  preSnapshotsPerCredit: number | null;
  postSnapshotsPerCredit: number | null;
  airbornePointsPerCredit: number | null;
}

/** Never equate rows/flights/credits: each rate carries its own denominator. */
export function infoPerCreditRates(v: InfoPerCredit): InfoPerCreditRates {
  const rate = (n: number): number | null =>
    v.alertCredits > 0 ? n / v.alertCredits : null;
  return {
    flightsPerCredit: rate(v.uniqueFlights),
    preSnapshotsPerCredit: rate(v.preSnapshots),
    postSnapshotsPerCredit: rate(v.postSnapshots),
    airbornePointsPerCredit: rate(v.airbornePoints),
  };
}
