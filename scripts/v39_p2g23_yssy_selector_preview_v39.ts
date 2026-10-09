import {
  chooseEarlyPilotScopeTargetV39,
  type Stage1AttemptEvidence,
} from "./v39_probe_stage1_owner_v39";

import type {
  Phase2gEarlyPilotScopeReductionV39,
  Phase2gP2g22YssyDeliveryGapRecoveryV39,
} from "../server/lib/disruption/phase2Compact6_v39";

import {
  assessP2g23RecoveryReviewV39,
  type P2g23HistoricalRecord,
} from "./v39_p2g23_yssy_recovery_review_v39";

/**
 * Offline review-only selector preview.
 *
 * Not connected to runStage1Owner, the paid workflow,
 * the provider client, or any production admission path.
 */
export interface P2g23PreviewResult {
  status: "REVIEW_ONLY_NOT_AUTHORIZED";
  originalSelectorRefusalVerified: boolean;
  eligibleForIndependentReview: boolean;
  proposedNextTarget: "YSSY" | null;
  authorizedForPaidLaunch: false;
  automaticRetryAuthorized: false;
  blockers: string[];
}

export function previewP2g23YssyRecoveryV39(
  scope: Phase2gEarlyPilotScopeReductionV39,
  attempts: Stage1AttemptEvidence[],
  oldRecovery: Phase2gP2g22YssyDeliveryGapRecoveryV39,
  historical: P2g23HistoricalRecord,
): P2g23PreviewResult {
  const blockers: string[] = [];

  const yssy = attempts.filter(
    row => row.icao.toUpperCase() === "YSSY",
  );
  const p16 = attempts.filter(row => row.probeId === 16);
  const p17 = attempts.filter(row => row.probeId === 17);

  if (
    yssy.length !== 2 ||
    p16.length !== 1 ||
    p17.length !== 1 ||
    p16[0]?.icao.toUpperCase() !== "YSSY" ||
    p17[0]?.icao.toUpperCase() !== "YSSY"
  ) {
    blockers.push("EXACT_HISTORICAL_YSSY_ATTEMPT_SET_REQUIRED");
  }

  if (
    oldRecovery.authorized !== true ||
    oldRecovery.failed_probe_id !== 16 ||
    oldRecovery.maximum_additional_attempts !== 1 ||
    oldRecovery.no_automatic_retry_after_recovery_attempt !== true
  ) {
    blockers.push("OLD_RECOVERY_FREEZE_INVALID");
  }

  if (
    scope.scope_version !==
      "v39-phase2g-early-pilot-scope-reduction-3" ||
    scope.ordered_new_targets.join(",") !== "SKBO,YSSY" ||
    scope.target_execution_authorized?.YSSY !== true ||
    scope.yssy_selected_stage1_utc_slot_hour !== 4 ||
    !scope.yssy_local_operating_hours_protocol_sha256
  ) {
    blockers.push("FROZEN_YSSY_SCIENTIFIC_SCOPE_MISMATCH");
  }

  const row = p17[0];

  if (
    !row ||
    row.status !== "failed" ||
    row.durationCensored !== true ||
    row.reconciliationStatus !== "UNRESOLVED" ||
    row.stopReason !== "supervisor_child_exit_recovered" ||
    row.probeBudgetDayId !== "P2G-S1-20261008-22" ||
    row.runtimeSessionId !==
      "cb90e45e-ae7b-4bb4-85fe-7f3e56bd8880"
  ) {
    blockers.push("P2G23_DATABASE_EVIDENCE_MISMATCH");
  }

  if (
    row &&
    (
      historical.probeId !== row.probeId ||
      historical.icao !== row.icao ||
      historical.budgetDay !== row.probeBudgetDayId ||
      historical.sessionId !== row.runtimeSessionId ||
      historical.status !== row.status ||
      historical.durationCensored !== row.durationCensored ||
      historical.reconciliationStatus !== row.reconciliationStatus ||
      historical.stopReason !== row.stopReason
    )
  ) {
    blockers.push("P2G23_CLOSEOUT_DATABASE_DISAGREEMENT");
  }

  const review = assessP2g23RecoveryReviewV39(
    historical,
    Math.max(0, yssy.length - 2),
  );

  blockers.push(...review.blockers);

  let oldRefusalVerified = false;

  try {
    chooseEarlyPilotScopeTargetV39(
      scope,
      attempts,
      oldRecovery,
    );
    blockers.push("OLD_SELECTOR_UNEXPECTEDLY_ACCEPTED");
  } catch (error) {
    const reason = String(
      error instanceof Error ? error.message : error,
    );

    if (
      reason.includes(
        "REFUSED_EARLY_PILOT_YSSY_RECOVERY_CONSUMED:" +
        "probe=17:status=failed:reconciliation=UNRESOLVED",
      )
    ) {
      oldRefusalVerified = true;
    } else {
      blockers.push("OLD_SELECTOR_WRONG_REFUSAL_REASON");
    }
  }

  const eligible =
    blockers.length === 0 &&
    oldRefusalVerified &&
    review.eligibleForIndependentReview;

  return {
    status: "REVIEW_ONLY_NOT_AUTHORIZED",
    originalSelectorRefusalVerified: oldRefusalVerified,
    eligibleForIndependentReview: eligible,
    proposedNextTarget: eligible ? "YSSY" : null,
    authorizedForPaidLaunch: false,
    automaticRetryAuthorized: false,
    blockers,
  };
}
