import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { loadFrozenProbeArtifact } from "../server/lib/disruption/anchorPromotion_v39";
import {
  loadPhase2gCompact6AmendmentV39,
  PHASE2G_COMPACT6_EARLY_PILOT_SCOPE_ARTIFACT_PATH,
} from "../server/lib/disruption/phase2Compact6_v39";
import {
  chooseEarlyPilotScopeTargetV39,
  type Stage1AttemptEvidence,
} from "../scripts/v39_probe_stage1_owner_v39";

const PREPROBE_PATH = join(
  process.cwd(),
  "artifacts",
  "preprobe-reference-freeze-record.json",
);
const PREPROBE_SHA =
  "b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870";
const SCOPE_PATH = join(
  process.cwd(),
  PHASE2G_COMPACT6_EARLY_PILOT_SCOPE_ARTIFACT_PATH,
);
const sha256 = (raw: string) =>
  createHash("sha256").update(raw, "utf8").digest("hex");

function validAttempt(
  probeId: number,
  icao: string,
  rowsPerHour: number,
): Stage1AttemptEvidence {
  const session = `00000000-0000-4000-8000-${String(probeId).padStart(12, "0")}`;
  return {
    probeId,
    probeBudgetDayId: `TEST-${probeId}`,
    runtimeSessionId: session,
    durableReconciliation: {
      runtimeSessionId: session,
      evidenceStatus: "MATCH",
      externalSpendCredits: 100,
      internalReceivedCredits: 100,
      deliveryGapCredits: 0,
      deliveryCompleteness: 1,
      callbackRequestsSeen: 10,
      callbackSuccess2xx: 10,
      callbackFailures: 0,
      durationCensored: false,
      stopReason: null,
    },
    icao,
    status: "completed",
    metricContractVersion: "v39-physical-flight-instance-v2",
    rowsPerHour,
    creditsSpent: 1,
    uniqueFlightsPerCredit: 0.5,
    tailChainLinksPerCredit: 0.1,
    stability: 0.5,
    confirmedUniqueLower: 0.5,
    confirmedPlusAmbiguousUpper: 0.5,
    durationCensored: false,
    reconciliationStatus: "MATCH",
    stopReason: null,
    recordedAtUtc: new Date(
      Date.UTC(2026, 9, 1, 0, probeId),
    ).toISOString(),
  };
}

function baseline(): Stage1AttemptEvidence[] {
  return [
    validAttempt(11, "WSSS", 160.5),
    validAttempt(12, "OMAA", 74),
    validAttempt(14, "MMUN", 22.999639033442946),
  ];
}

function loadScope() {
  const preprobe = loadFrozenProbeArtifact(
    PREPROBE_PATH,
    PREPROBE_SHA,
  );
  const raw = readFileSync(SCOPE_PATH, "utf8");
  const loaded = loadPhase2gCompact6AmendmentV39({
    expectedSha256: sha256(raw),
    sourcePreprobeFileSha256: PREPROBE_SHA,
    preprobe: preprobe.artifact,
    path: SCOPE_PATH,
  });
  if (!loaded.amendment.early_pilot_scope_reduction) {
    throw new Error("scope reduction missing");
  }
  return loaded.amendment.early_pilot_scope_reduction;
}

describe("Phase2G early-pilot scope reduction", () => {
  it("is hash-bound and freezes YSSY then SKBO while deferring LKPR", () => {
    const scope = loadScope();
    expect(scope.authorized).toBe(true);
    expect(scope.ordered_new_targets).toEqual(["YSSY", "SKBO"]);
    expect(scope.deferred_icaos).toEqual(["LKPR"]);
    expect(scope.phase6_anchor_pool_if_both_valid).toEqual([
      "WSSS",
      "OMAA",
      "YSSY",
      "SKBO",
    ]);
    expect(scope.outcome_informed_scope_change).toBe(true);
    expect(scope.target_selection_uses_preoutcome_frozen_attributes).toBe(
      true,
    );
    expect(scope.no_automatic_retry_after_new_target).toBe(true);
  });

  it("selects YSSY from the exact completed WSSS/OMAA/MMUN baseline", () => {
    const scope = loadScope();
    expect(
      chooseEarlyPilotScopeTargetV39(scope, baseline()),
    ).toBe("YSSY");
  });

  it("selects SKBO after one scientifically valid YSSY attempt", () => {
    const scope = loadScope();
    expect(
      chooseEarlyPilotScopeTargetV39(scope, [
        ...baseline(),
        validAttempt(15, "YSSY", 80),
      ]),
    ).toBe("SKBO");
  });

  it("closes the reduced Stage-1 sequence after valid YSSY and SKBO", () => {
    const scope = loadScope();
    expect(
      chooseEarlyPilotScopeTargetV39(scope, [
        ...baseline(),
        validAttempt(15, "YSSY", 80),
        validAttempt(16, "SKBO", 70),
      ]),
    ).toBeNull();
  });

  it("does not automatically retry or skip a failed YSSY attempt", () => {
    const scope = loadScope();
    const failed = validAttempt(15, "YSSY", 0);
    failed.status = "failed";
    failed.durationCensored = true;
    failed.reconciliationStatus = "UNRESOLVED";
    failed.stopReason = "supervisor_child_exit_recovered";
    failed.durableReconciliation = null;

    expect(() =>
      chooseEarlyPilotScopeTargetV39(scope, [
        ...baseline(),
        failed,
      ]),
    ).toThrow("REFUSED_EARLY_PILOT_TARGET_REQUIRES_MANUAL_REVIEW:YSSY");
  });

  it("fails closed if the frozen baseline capacity classification changes", () => {
    const scope = loadScope();
    const wrong = baseline();
    wrong[2] = validAttempt(14, "MMUN", 61);

    expect(() =>
      chooseEarlyPilotScopeTargetV39(scope, wrong),
    ).toThrow("REFUSED_EARLY_PILOT_BASELINE_CAPACITY_MISMATCH:MMUN");
  });
});
