import {
  createHash,
} from "node:crypto";

import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  loadFrozenProbeArtifact,
} from "../server/lib/disruption/anchorPromotion_v39";

import {
  loadPhase2gCompact6AmendmentV39,
  PHASE2G_COMPACT6_P2G22_YSSY_RECOVERY_ARTIFACT_PATH,
  PHASE2G_EARLY_PILOT_YSSY_LOCAL_TIME_SCOPE_ARTIFACT_PATH,
} from "../server/lib/disruption/phase2Compact6_v39";

import {
  chooseEarlyPilotScopeTargetV39,
  type Stage1AttemptEvidence,
} from "../scripts/v39_probe_stage1_owner_v39";

const PREPROBE =
  "artifacts/preprobe-reference-freeze-record.json";

const PREPROBE_SHA =
  "b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870";

function sha256(
  raw: string,
): string {
  return createHash("sha256")
    .update(raw, "utf8")
    .digest("hex");
}

function validAttempt(
  probeId: number,
  icao: string,
  rowsPerHour = 100,
): Stage1AttemptEvidence {
  const session =
    `00000000-0000-4000-8000-` +
    String(probeId).padStart(12, "0");

  return {
    probeId,
    probeBudgetDayId:
      `TEST-${probeId}`,
    runtimeSessionId:
      session,
    durableReconciliation: {
      runtimeSessionId:
        session,
      evidenceStatus:
        "MATCH",
      externalSpendCredits:
        100,
      internalReceivedCredits:
        100,
      deliveryGapCredits:
        0,
      deliveryCompleteness:
        1,
      callbackRequestsSeen:
        10,
      callbackSuccess2xx:
        10,
      callbackFailures:
        0,
      durationCensored:
        false,
      stopReason:
        null,
    },
    icao,
    status:
      "completed",
    metricContractVersion:
      "v39-physical-flight-instance-v2",
    rowsPerHour,
    creditsSpent:
      1,
    uniqueFlightsPerCredit:
      0.5,
    tailChainLinksPerCredit:
      0.1,
    stability:
      0.5,
    confirmedUniqueLower:
      0.5,
    confirmedPlusAmbiguousUpper:
      0.5,
    durationCensored:
      false,
    stopReason:
      null,
    reconciliationStatus:
      "MATCH",
    recordedAtUtc:
      new Date(
        Date.UTC(
          2026,
          9,
          1,
          0,
          probeId,
        ),
      ).toISOString(),
  };
}

function baseline(): Stage1AttemptEvidence[] {
  return [
    validAttempt(
      11,
      "WSSS",
      160.5,
    ),
    validAttempt(
      12,
      "OMAA",
      74,
    ),
    validAttempt(
      14,
      "MMUN",
      22.999639033442946,
    ),
    validAttempt(
      15,
      "SKBO",
      150.4977007295722,
    ),
  ];
}

function p2g22():
  Stage1AttemptEvidence {
  return {
    ...validAttempt(
      16,
      "YSSY",
      0,
    ),

    probeBudgetDayId:
      "P2G-S1-20261006-21",

    runtimeSessionId:
      "06ae005c-34ca-4478-af17-1c5d11b42d6e",

    status:
      "failed",

    rowsPerHour:
      null,

    creditsSpent:
      null,

    uniqueFlightsPerCredit:
      null,

    tailChainLinksPerCredit:
      null,

    stability:
      null,

    confirmedUniqueLower:
      null,

    confirmedPlusAmbiguousUpper:
      null,

    durationCensored:
      false,

    stopReason:
      "external_internal_delivery_gap",

    reconciliationStatus:
      "DELIVERY_GAP",

    durableReconciliation: {
      runtimeSessionId:
        "06ae005c-34ca-4478-af17-1c5d11b42d6e",

      evidenceStatus:
        "DELIVERY_GAP",

      externalSpendCredits:
        260,

      internalReceivedCredits:
        259,

      deliveryGapCredits:
        1,

      deliveryCompleteness:
        259 / 260,

      callbackRequestsSeen:
        56,

      callbackSuccess2xx:
        56,

      callbackFailures:
        0,

      durationCensored:
        false,

      stopReason:
        "external_internal_delivery_gap",
    },
  };
}

function loadAmendment(
  artifactPath: string,
) {
  const preprobe =
    loadFrozenProbeArtifact(
      PREPROBE,
      PREPROBE_SHA,
    );

  const fullPath =
    join(
      process.cwd(),
      artifactPath,
    );

  const raw =
    readFileSync(
      fullPath,
      "utf8",
    );

  return loadPhase2gCompact6AmendmentV39({
    expectedSha256:
      sha256(raw),

    sourcePreprobeFileSha256:
      PREPROBE_SHA,

    preprobe:
      preprobe.artifact,

    path:
      fullPath,
  });
}

describe(
  "P2G22 bounded YSSY manual recovery",
  () => {
    it(
      "binds the P2G23 helper selector to the authoritative recovery amendment variable",
      () => {
        const helper =
          readFileSync(
            join(
              process.cwd(),
              "scripts/v39_phase2g_monday_yssy_local_time_prepare_v39.sh",
            ),
            "utf8",
          );

        expect(helper).toContain(
          'AMENDMENT="artifacts/phase2g-early-pilot-yssy-p2g22-recovery-freeze-20261007.json"',
        );

        expect(helper).toContain(
          'AMENDMENT="$AMENDMENT" \\',
        );

        expect(helper).toContain(
          "const amendmentPath=process.env.AMENDMENT;",
        );

        expect(helper).not.toContain(
          'const amendmentPath="artifacts/phase2g-early-pilot-yssy-local-time-scope-freeze-20261003.json";',
        );
      },
    );

    it(
      "keeps the original v3 scope fail-closed without a recovery freeze",
      () => {
        const loaded =
          loadAmendment(
            PHASE2G_EARLY_PILOT_YSSY_LOCAL_TIME_SCOPE_ARTIFACT_PATH,
          );

        const scope =
          loaded.amendment
            .early_pilot_scope_reduction!;

        expect(() =>
          chooseEarlyPilotScopeTargetV39(
            scope,
            [
              ...baseline(),
              p2g22(),
            ],
          ),
        ).toThrow(
          "REFUSED_EARLY_PILOT_TARGET_REQUIRES_MANUAL_REVIEW:YSSY",
        );
      },
    );

    it(
      "selects exactly one YSSY recovery from the exact immutable P2G22 failure",
      () => {
        const loaded =
          loadAmendment(
            PHASE2G_COMPACT6_P2G22_YSSY_RECOVERY_ARTIFACT_PATH,
          );

        const scope =
          loaded.amendment
            .early_pilot_scope_reduction!;

        const recovery =
          loaded.amendment
            .p2g22_yssy_delivery_gap_recovery_rerun;

        expect(recovery?.authorized)
          .toBe(true);

        expect(
          recovery
            ?.delivery_gap_tolerance_credits,
        ).toBe(0);

        expect(
          recovery
            ?.historical_root_cause_claimed,
        ).toBe(false);

        expect(
          chooseEarlyPilotScopeTargetV39(
            scope,
            [
              ...baseline(),
              p2g22(),
            ],
            recovery,
          ),
        ).toBe("YSSY");
      },
    );

    it(
      "refuses if the historical 260/259 evidence is altered",
      () => {
        const loaded =
          loadAmendment(
            PHASE2G_COMPACT6_P2G22_YSSY_RECOVERY_ARTIFACT_PATH,
          );

        const changed =
          p2g22();

        changed
          .durableReconciliation!
          .externalSpendCredits = 259;

        expect(() =>
          chooseEarlyPilotScopeTargetV39(
            loaded.amendment
              .early_pilot_scope_reduction!,
            [
              ...baseline(),
              changed,
            ],
            loaded.amendment
              .p2g22_yssy_delivery_gap_recovery_rerun,
          ),
        ).toThrow(
          "REFUSED_EARLY_PILOT_YSSY_RECOVERY_EVIDENCE_MISMATCH",
        );
      },
    );

    it(
      "completes the early-pilot target after one scientifically valid recovery",
      () => {
        const loaded =
          loadAmendment(
            PHASE2G_COMPACT6_P2G22_YSSY_RECOVERY_ARTIFACT_PATH,
          );

        expect(
          chooseEarlyPilotScopeTargetV39(
            loaded.amendment
              .early_pilot_scope_reduction!,
            [
              ...baseline(),
              p2g22(),
              validAttempt(
                17,
                "YSSY",
                100,
              ),
            ],
            loaded.amendment
              .p2g22_yssy_delivery_gap_recovery_rerun,
          ),
        ).toBeNull();
      },
    );

    it(
      "consumes the sole authorization even if the recovery is invalid",
      () => {
        const loaded =
          loadAmendment(
            PHASE2G_COMPACT6_P2G22_YSSY_RECOVERY_ARTIFACT_PATH,
          );

        const recoveryAttempt =
          validAttempt(
            17,
            "YSSY",
            0,
          );

        recoveryAttempt.status =
          "failed";

        recoveryAttempt.reconciliationStatus =
          "DELIVERY_GAP";

        recoveryAttempt.stopReason =
          "external_internal_delivery_gap";

        recoveryAttempt
          .durableReconciliation!
          .evidenceStatus =
          "DELIVERY_GAP";

        recoveryAttempt
          .durableReconciliation!
          .deliveryGapCredits = 1;

        recoveryAttempt
          .durableReconciliation!
          .deliveryCompleteness =
          0.99;

        recoveryAttempt
          .durableReconciliation!
          .stopReason =
          "external_internal_delivery_gap";

        expect(() =>
          chooseEarlyPilotScopeTargetV39(
            loaded.amendment
              .early_pilot_scope_reduction!,
            [
              ...baseline(),
              p2g22(),
              recoveryAttempt,
            ],
            loaded.amendment
              .p2g22_yssy_delivery_gap_recovery_rerun,
          ),
        ).toThrow(
          "REFUSED_EARLY_PILOT_YSSY_RECOVERY_CONSUMED",
        );
      },
    );

    it(
      "never permits a second recovery row",
      () => {
        const loaded =
          loadAmendment(
            PHASE2G_COMPACT6_P2G22_YSSY_RECOVERY_ARTIFACT_PATH,
          );

        expect(() =>
          chooseEarlyPilotScopeTargetV39(
            loaded.amendment
              .early_pilot_scope_reduction!,
            [
              ...baseline(),
              p2g22(),
              validAttempt(
                17,
                "YSSY",
              ),
              validAttempt(
                18,
                "YSSY",
              ),
            ],
            loaded.amendment
              .p2g22_yssy_delivery_gap_recovery_rerun,
          ),
        ).toThrow(
          "REFUSED_EARLY_PILOT_YSSY_RECOVERY_RETRY_LIMIT",
        );
      },
    );
  },
);
