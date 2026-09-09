/**
 * Phase 0M — evaluation guard tests (§1.5.13).
 *
 * Guards (not model fitting) must exist before collection: ablation metadata,
 * preregistered claim, protected-test read-once, leakage refusal,
 * info-per-credit vectors. Model fitting itself is Phase-7 scope.
 */

import { describe, it, expect } from "vitest";
import {
  applyAblationArm,
  claimHash,
  PRIMARY_CLAIM,
  recordProtectedTestRead,
  checkTrainingSetForLeakage,
  infoPerCreditRates,
} from "../server/lib/disruption/evaluationGuard_v39";

describe("Phase 0M: mechanism ablation arms (§1.5.13)", () => {
  const all = ["dep_delay", "coverage_age", "airport_identity", "graph_connectivity", "wind_gust"];

  it("arm A keeps everything", () => {
    expect(applyAblationArm(all, "A")).toEqual(all);
  });

  it("arm B removes collection-mechanism metadata only", () => {
    const kept = applyAblationArm(all, "B");
    expect(kept).toContain("dep_delay");
    expect(kept).toContain("wind_gust");
    expect(kept).not.toContain("coverage_age");
  });

  it("arm C additionally removes airport identity", () => {
    const kept = applyAblationArm(all, "C");
    expect(kept).not.toContain("airport_identity");
    expect(kept).not.toContain("coverage_age");
  });

  it("arm D additionally removes graph connectivity", () => {
    const kept = applyAblationArm(all, "D");
    expect(kept).not.toContain("graph_connectivity");
  });

  it("does not mutate the input list", () => {
    const input = [...all];
    applyAblationArm(input, "D");
    expect(input).toEqual(all);
  });
});

describe("Phase 0M: preregistered claim (§1.5.13)", () => {
  it("primary claim pins Model 1 vs −1, Engine A, T−6h, MAE, ≥2min", () => {
    expect(PRIMARY_CLAIM).toMatchObject({
      modelA: "Model 1 XGBoost",
      modelB: "Model −1 persistence",
      engine: "Engine A",
      horizon: "T-6h",
      metric: "MAE",
      practicalDeltaMinutes: 2,
    });
  });

  it("claim hash is deterministic", () => {
    expect(claimHash()).toBe(claimHash());
    expect(claimHash()).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("Phase 0M: protected-test read-once guard", () => {
  it("first read allowed, second refused", () => {
    expect(recordProtectedTestRead("unread")).toBe("read-once");
    expect(recordProtectedTestRead("read-once")).toBe("refused-second-read");
    expect(recordProtectedTestRead("refused-second-read")).toBe("refused-second-read");
  });
});

describe("Phase 0M: leakage refusal", () => {
  it("clean feature sets pass", () => {
    const r = checkTrainingSetForLeakage(["dep_delay_1h", "wind_gust", "carrier_score"]);
    expect(r).toEqual({ clean: true, offenders: [] });
  });

  it("protected/test/future-derived inputs are refused with names", () => {
    const r = checkTrainingSetForLeakage(["dep_delay_1h", "test_row_flag", "future_delay"]);
    expect(r.clean).toBe(false);
    expect(r.offenders).toContain("test_row_flag");
    expect(r.offenders).toContain("future_delay");
  });
});

describe("Phase 0M: info-per-credit vectors (never equate rows/flights/credits)", () => {
  it("each rate carries its own denominator", () => {
    const r = infoPerCreditRates({
      alertCredits: 100, restApiUnits: 50,
      uniqueFlights: 200, preSnapshots: 150, postSnapshots: 50, airbornePoints: 1000,
    });
    expect(r.flightsPerCredit).toBe(2);
    expect(r.preSnapshotsPerCredit).toBe(1.5);
    expect(r.postSnapshotsPerCredit).toBe(0.5);
    expect(r.airbornePointsPerCredit).toBe(10);
  });

  it("zero credits → null rates (never divide by zero)", () => {
    const r = infoPerCreditRates({
      alertCredits: 0, restApiUnits: 0,
      uniqueFlights: 10, preSnapshots: 5, postSnapshots: 1, airbornePoints: 20,
    });
    expect(r.flightsPerCredit).toBeNull();
  });
});
