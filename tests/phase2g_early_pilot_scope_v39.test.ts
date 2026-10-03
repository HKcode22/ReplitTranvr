import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { loadFrozenProbeArtifact } from "../server/lib/disruption/anchorPromotion_v39";
import {
  loadPhase2gCompact6AmendmentV39,
  PHASE2G_COMPACT6_EARLY_PILOT_SCOPE_ARTIFACT_PATH,
  PHASE2G_EARLY_PILOT_OPERATING_HOURS_CORRECTION_ARTIFACT_PATH,
  PHASE2G_EARLY_PILOT_YSSY_LOCAL_TIME_SCOPE_ARTIFACT_PATH,
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

function loadScope(artifactPath: string) {
  const preprobe = loadFrozenProbeArtifact(
    PREPROBE_PATH,
    PREPROBE_SHA,
  );
  const fullPath = join(process.cwd(), artifactPath);
  const raw = readFileSync(fullPath, "utf8");
  const loaded = loadPhase2gCompact6AmendmentV39({
    expectedSha256: sha256(raw),
    sourcePreprobeFileSha256: PREPROBE_SHA,
    preprobe: preprobe.artifact,
    path: fullPath,
  });
  if (!loaded.amendment.early_pilot_scope_reduction) {
    throw new Error("scope reduction missing");
  }
  return loaded.amendment.early_pilot_scope_reduction;
}

describe("Phase2G early-pilot scope correction", () => {
  it("retains immutable v1 YSSY-first evidence readability", () => {
    const scope = loadScope(
      PHASE2G_COMPACT6_EARLY_PILOT_SCOPE_ARTIFACT_PATH,
    );

    expect(scope.scope_version).toBe(
      "v39-phase2g-early-pilot-scope-reduction-1",
    );
    expect(scope.ordered_new_targets).toEqual([
      "YSSY",
      "SKBO",
    ]);
  });

  it("freezes SKBO first and explicitly blocks YSSY in v2", () => {
    const scope = loadScope(
      PHASE2G_EARLY_PILOT_OPERATING_HOURS_CORRECTION_ARTIFACT_PATH,
    );

    expect(scope.scope_version).toBe(
      "v39-phase2g-early-pilot-scope-reduction-2",
    );
    expect(scope.ordered_new_targets).toEqual([
      "SKBO",
      "YSSY",
    ]);

    if (
      scope.scope_version !==
      "v39-phase2g-early-pilot-scope-reduction-2"
    ) {
      throw new Error("expected v2 scope");
    }

    expect(scope.target_execution_authorized).toEqual({
      SKBO: true,
      YSSY: false,
    });
    expect(
      scope.yssy_local_time_protocol_required,
    ).toBe(true);
  });

  it("selects SKBO from the exact completed baseline", () => {
    const scope = loadScope(
      PHASE2G_EARLY_PILOT_OPERATING_HOURS_CORRECTION_ARTIFACT_PATH,
    );

    expect(
      chooseEarlyPilotScopeTargetV39(
        scope,
        baseline(),
      ),
    ).toBe("SKBO");
  });

  it("refuses YSSY after valid SKBO until a new protocol is frozen", () => {
    const scope = loadScope(
      PHASE2G_EARLY_PILOT_OPERATING_HOURS_CORRECTION_ARTIFACT_PATH,
    );

    expect(() =>
      chooseEarlyPilotScopeTargetV39(
        scope,
        [
          ...baseline(),
          validAttempt(15, "SKBO", 80),
        ],
      ),
    ).toThrow(
      "REFUSED_EARLY_PILOT_TARGET_EXECUTION_NOT_AUTHORIZED:YSSY",
    );
  });

  it("binds the v3 YSSY protocol and selects YSSY after valid SKBO", () => {
    const scope = loadScope(
      PHASE2G_EARLY_PILOT_YSSY_LOCAL_TIME_SCOPE_ARTIFACT_PATH,
    );

    expect(scope.scope_version).toBe(
      "v39-phase2g-early-pilot-scope-reduction-3",
    );
    expect(scope.target_execution_authorized).toEqual({
      SKBO: true,
      YSSY: true,
    });
    expect(
      scope.yssy_local_operating_hours_protocol_sha256,
    ).toBe(
      "ad6224fb7fc83de42021c9f75a705892c7130614f4a72276b47fa2c246dd4991",
    );

    expect(
      chooseEarlyPilotScopeTargetV39(
        scope,
        [
          ...baseline(),
          validAttempt(15, "SKBO", 150.4977007295722),
        ],
      ),
    ).toBe("YSSY");
  });

  it("marks the reduced early-pilot target sequence complete after valid YSSY", () => {
    const scope = loadScope(
      PHASE2G_EARLY_PILOT_YSSY_LOCAL_TIME_SCOPE_ARTIFACT_PATH,
    );

    expect(
      chooseEarlyPilotScopeTargetV39(
        scope,
        [
          ...baseline(),
          validAttempt(15, "SKBO", 150.4977007295722),
          validAttempt(16, "YSSY", 80),
        ],
      ),
    ).toBeNull();
  });

  it("does not automatically retry or skip failed SKBO", () => {
    const scope = loadScope(
      PHASE2G_EARLY_PILOT_OPERATING_HOURS_CORRECTION_ARTIFACT_PATH,
    );
    const failed = validAttempt(
      15,
      "SKBO",
      0,
    );
    failed.status = "failed";
    failed.durationCensored = true;
    failed.reconciliationStatus = "UNRESOLVED";
    failed.stopReason =
      "supervisor_child_exit_recovered";
    failed.durableReconciliation = null;

    expect(() =>
      chooseEarlyPilotScopeTargetV39(
        scope,
        [
          ...baseline(),
          failed,
        ],
      ),
    ).toThrow(
      "REFUSED_EARLY_PILOT_TARGET_REQUIRES_MANUAL_REVIEW:SKBO",
    );
  });

  it("fails closed if baseline MMUN capacity classification changes", () => {
    const scope = loadScope(
      PHASE2G_EARLY_PILOT_OPERATING_HOURS_CORRECTION_ARTIFACT_PATH,
    );
    const wrong = baseline();
    wrong[2] = validAttempt(
      14,
      "MMUN",
      61,
    );

    expect(() =>
      chooseEarlyPilotScopeTargetV39(
        scope,
        wrong,
      ),
    ).toThrow(
      "REFUSED_EARLY_PILOT_BASELINE_CAPACITY_MISMATCH:MMUN",
    );
  });
});
