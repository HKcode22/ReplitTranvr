/**
 * Phase 0F/0G/0H tests — PRE snapshot builder, AIRBORNE snapshot builder,
 * outcome terminalizer (§1.5.6–1.5.8 PASS lists).
 */

import { describe, it, expect } from "vitest";
import {
  buildPreSnapshot,
  snapshotExists,
  selectFeatureValue,
  PRE_PREDICTION_STATE,
  type PrePopulationInput,
} from "../server/lib/disruption/preSnapshotBuilder_v3";
import {
  buildAirborneSnapshot,
  computeTrajectoryCadence,
  AIRBORNE_PREDICTION_STATE,
  type AirborneSnapshotInput,
} from "../server/lib/disruption/airborneSnapshotBuilder_v3";
import {
  terminalizeTarget,
  nextRecoveryDue,
  recoveryBudgetGate,
  targetFlagsFromStatuses,
  RECOVERY_DEADLINE_OFFSET_HOURS,
} from "../server/lib/disruption/outcomeTerminalizer_v3";

// ---------------------------------------------------------------------------
// Phase 0F — PRE snapshot builder (§1.5.6)
// ---------------------------------------------------------------------------

function preInput(over: Partial<PrePopulationInput> = {}): PrePopulationInput {
  return {
    flightInstanceId: "leg:abcd1234",
    populationQueryId: "pop_q_1",
    populationMemberAtCutoff: true,
    horizonEligible: true,
    horizon: "T-6h",
    selectedTMilestoneUtc: new Date("2026-09-01T10:00:00Z"),
    selectedTVersion: "t_v1",
    predictionCutoffUtc: new Date("2026-09-01T04:00:00Z"),
    features: [],
    frameHash: "frame1",
    configHash: "cfg1",
    fidsResponseHash: "fids1",
    scheduleVersion: "ver1",
    ...over,
  };
}

describe("Phase 0F: PRE snapshot builder (§1.5.6)", () => {
  it("population member with zero webhook still gets a snapshot", () => {
    // Webhook capture is NOT an input to buildPreSnapshot at all.
    const r = buildPreSnapshot(preInput());
    expect(r.status).toBe("snapshot");
    if (r.status === "snapshot") {
      expect(r.snapshot.predictionState).toBe(PRE_PREDICTION_STATE);
      expect(r.snapshot.flightInstanceId).toBe("leg:abcd1234");
    }
  });

  it("not a population member → blocked (not fabricated)", () => {
    const r = buildPreSnapshot(preInput({ populationMemberAtCutoff: false }));
    expect(r).toEqual({ status: "blocked", reason: "not_population_member" });
  });

  it("not horizon eligible → blocked", () => {
    const r = buildPreSnapshot(preInput({ horizonEligible: false }));
    expect(r).toEqual({ status: "blocked", reason: "not_horizon_eligible" });
  });

  it("T unavailable → horizon BLOCKED, never fabricated", () => {
    const r = buildPreSnapshot(preInput({ selectedTMilestoneUtc: null }));
    expect(r).toEqual({ status: "blocked", reason: "t_unavailable" });
  });

  it("missing optional feature stays NULL/flagged and does NOT drop the row", () => {
    const r = buildPreSnapshot(
      preInput({
        features: [
          { featureName: "dep_delay_1h", value: 12, informationAvailableAt: new Date("2026-09-01T03:00:00Z"), source: "hist", sourceVersion: "v1" },
          { featureName: "wind_gust", value: null, informationAvailableAt: null, source: null, sourceVersion: null },
        ],
      }),
    );
    expect(r.status).toBe("snapshot");
    if (r.status === "snapshot") {
      expect(r.snapshot.features).toHaveLength(2);
      expect(r.snapshot.features[1]).toMatchObject({ value: null, missing: true });
      expect(r.snapshot.provenance.missingnessFlags.wind_gust).toBe("no_available_timestamp");
    }
  });

  it("post-cutoff feature is excluded (leakage refusal)", () => {
    const f = selectFeatureValue(
      { featureName: "x", value: 99, informationAvailableAt: new Date("2026-09-01T05:00:00Z"), source: "s", sourceVersion: "v" },
      new Date("2026-09-01T04:00:00Z"),
    );
    expect(f).toMatchObject({ value: null, missing: true, missingReason: "available_after_cutoff" });
  });

  it("snapshotExists = member AND eligible (webhook irrelevant)", () => {
    expect(snapshotExists(true, true)).toBe(true);
    expect(snapshotExists(false, true)).toBe(false);
    expect(snapshotExists(true, false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Phase 0G — AIRBORNE snapshot builder (§1.5.7)
// ---------------------------------------------------------------------------

function airborneInput(over: Partial<AirborneSnapshotInput> = {}): AirborneSnapshotInput {
  return {
    flightInstanceId: "leg:abcd1234",
    airborneEligible: true,
    points: [
      { observedAtUtc: new Date("2026-09-01T10:00:00Z"), availableAtUtc: new Date("2026-09-01T10:01:00Z"), lat: 34, lon: -118, altitudeFt: 5000, phase: "airborne_climb" },
      { observedAtUtc: new Date("2026-09-01T10:05:00Z"), availableAtUtc: new Date("2026-09-01T10:06:00Z"), lat: 34.5, lon: -117.5, altitudeFt: 15000, phase: "airborne_cruise" },
      { observedAtUtc: new Date("2026-09-01T10:10:00Z"), availableAtUtc: new Date("2026-09-01T10:11:00Z"), lat: 35, lon: -117, altitudeFt: 25000, phase: "airborne_cruise" },
    ],
    predictionCutoffUtc: new Date("2026-09-01T10:12:00Z"),
    stateObservationTimeUtc: new Date("2026-09-01T10:10:00Z"),
    minUsablePoints: 2,
    completenessThresholdPct: null,
    actualWheelsOnUtc: null,
    scheduledWheelsOnUtc: new Date("2026-09-01T11:15:00Z"),
    actualGateInUtc: null,
    scheduledGateInUtc: new Date("2026-09-01T11:30:00Z"),
    actualGateOutUtc: new Date("2026-09-01T10:05:00Z"),
    scheduledGateOutUtc: new Date("2026-09-01T10:00:00Z"),
    actualWheelsOffUtc: null,
    scheduledWheelsOffUtc: new Date("2026-09-01T10:30:00Z"),
    ...over,
  };
}

describe("Phase 0G: AIRBORNE snapshot builder (§1.5.7)", () => {
  it("every legitimate point is preserved (none dropped)", () => {
    const c = computeTrajectoryCadence(airborneInput().points);
    expect(c.obsPerFlight).toBe(3);
  });

  it("cadence metrics computed (gaps, duration, latency)", () => {
    const c = computeTrajectoryCadence(airborneInput().points);
    expect(c.medianGapSeconds).toBe(300);
    expect(c.maxGapSeconds).toBe(300);
    expect(c.trajectoryDurationSeconds).toBe(600);
    expect(c.sourceLatencySeconds).toBe(60);
  });

  it("not airborne-eligible → BLOCKED denominator (capture cannot define it)", () => {
    const s = buildAirborneSnapshot(airborneInput({ airborneEligible: false }));
    expect(s.predictionState).toBe(AIRBORNE_PREDICTION_STATE);
    expect(s.funnelStage).toBe("airborne_eligible");
  });

  it("usable trajectory advances the funnel", () => {
    const s = buildAirborneSnapshot(airborneInput());
    expect(["usable", "trajectory_complete", "POST_snapshot_eligible"]).toContain(s.funnelStage);
  });

  it("state observation time kept separate from prediction cutoff", () => {
    const s = buildAirborneSnapshot(airborneInput());
    expect(s.stateObservationTimeUtc).not.toEqual(s.predictionCutoffUtc);
  });

  it("POST target family kept milestone-explicit (B1/B2 separate, PRE separate)", () => {
    const s = buildAirborneSnapshot(airborneInput());
    expect(s.targets.preGateOutDelaySeconds).toBe(300); // 10:05 − 10:00
    expect(s.targets.postB1WheelsOnDelaySeconds).toBeNull(); // no actual yet
    expect(s.targets.postB2GateInDelaySeconds).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Phase 0H — outcome terminalizer (§1.5.8)
// ---------------------------------------------------------------------------

const REF = new Date("2026-09-01T11:30:00Z"); // reference arrival

describe("Phase 0H: outcome terminalizer (§1.5.8)", () => {
  it("verified actual → observed", () => {
    const r = terminalizeTarget({
      target: "wheels_on",
      actualUtc: new Date("2026-09-01T11:20:00Z"),
      actualVerified: true,
      operationalState: "arrived",
      referenceArrivalUtc: REF,
      nowUtc: new Date("2026-09-01T12:00:00Z"),
      opportunitiesUsed: 0,
    });
    expect(r.labelStatus).toBe("observed");
    expect(r.recoveryAllowed).toBe(false);
  });

  it("unverified (estimated) actual never counts as observed", () => {
    const r = terminalizeTarget({
      target: "wheels_on",
      actualUtc: new Date("2026-09-01T11:20:00Z"),
      actualVerified: false,
      operationalState: "arrived",
      referenceArrivalUtc: REF,
      nowUtc: new Date("2026-09-01T12:00:00Z"),
      opportunitiesUsed: 0,
    });
    expect(r.labelStatus).not.toBe("observed");
  });

  it("canceled → not_applicable; CanceledUncertain never fabricates it", () => {
    const canceled = terminalizeTarget({
      target: "gate_in", actualUtc: null, actualVerified: false,
      operationalState: "canceled", referenceArrivalUtc: REF,
      nowUtc: new Date("2026-09-01T12:00:00Z"), opportunitiesUsed: 0,
    });
    expect(canceled.labelStatus).toBe("not_applicable");
    const uncertain = terminalizeTarget({
      target: "gate_in", actualUtc: null, actualVerified: false,
      operationalState: "canceled_uncertain", referenceArrivalUtc: REF,
      nowUtc: new Date("2026-09-01T12:00:00Z"), opportunitiesUsed: 0,
    });
    expect(uncertain.labelStatus).not.toBe("not_applicable");
  });

  it("logical opportunities at +30/+120/+360; third stops calls but keeps pending", () => {
    expect(nextRecoveryDue(REF, new Date("2026-09-01T11:30:00Z"), 0)?.toISOString()).toBe("2026-09-01T12:00:00.000Z");
    expect(nextRecoveryDue(REF, new Date("2026-09-01T12:30:00Z"), 1)?.toISOString()).toBe("2026-09-01T13:30:00.000Z");
    expect(nextRecoveryDue(REF, new Date("2026-09-01T14:00:00Z"), 2)?.toISOString()).toBe("2026-09-01T17:30:00.000Z");
    const exhausted = terminalizeTarget({
      target: "wheels_on", actualUtc: null, actualVerified: false,
      operationalState: "arrived", referenceArrivalUtc: REF,
      nowUtc: new Date("2026-09-01T18:00:00Z"), opportunitiesUsed: 3,
    });
    expect(exhausted.recoveryAllowed).toBe(false);
    expect(exhausted.labelStatus).toBe("pending"); // NOT terminalized
  });

  it(`+${RECOVERY_DEADLINE_OFFSET_HOURS}h deadline without evidence → missing`, () => {
    const r = terminalizeTarget({
      target: "wheels_on", actualUtc: null, actualVerified: false,
      operationalState: "arrived", referenceArrivalUtc: REF,
      nowUtc: new Date("2026-09-02T12:00:00Z"), opportunitiesUsed: 3,
    });
    expect(r.labelStatus).toBe("missing");
  });

  it("budget gate: proceed only when the category can fund the call", () => {
    expect(recoveryBudgetGate(100, 2)).toBe("proceed");
    expect(recoveryBudgetGate(1, 2)).toBe("defer");
  });

  it("four target booleans, never one generic flag", () => {
    const flags = targetFlagsFromStatuses({
      gate_out: "observed", wheels_off: "observed",
      wheels_on: "pending", gate_in: "missing",
    });
    expect(flags).toEqual({
      gateOutLabelObserved: true, wheelsOffLabelObserved: true,
      wheelsOnLabelObserved: false, gateInLabelObserved: false,
    });
  });
});