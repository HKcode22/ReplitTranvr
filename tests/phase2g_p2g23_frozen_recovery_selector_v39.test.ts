import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

import {
  loadFrozenProbeArtifact,
} from "../server/lib/disruption/anchorPromotion_v39";

import {
  loadPhase2gCompact6AmendmentV39,
  PHASE2G_P2G23_YSSY_FROZEN_PATH,
  PHASE2G_P2G23_YSSY_CANDIDATE_PATH,
} from "../server/lib/disruption/phase2Compact6_v39";

import {
  chooseEarlyPilotScopeTargetV39,
  chooseNextStage1TargetV39,
  type Stage1AttemptEvidence,
} from "../scripts/v39_probe_stage1_owner_v39";

const PREPROBE_SHA =
  "b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870";

const preprobe = loadFrozenProbeArtifact(
  "artifacts/preprobe-reference-freeze-record.json",
  PREPROBE_SHA,
);

function load(path: string) {
  const raw = readFileSync(path, "utf8");
  return loadPhase2gCompact6AmendmentV39({
    expectedSha256: createHash("sha256")
      .update(raw).digest("hex"),
    sourcePreprobeFileSha256: PREPROBE_SHA,
    preprobe: preprobe.artifact,
    path,
  });
}

const frozen = load(PHASE2G_P2G23_YSSY_FROZEN_PATH);
const scope = frozen.amendment.early_pilot_scope_reduction!;
const old = frozen.amendment
  .p2g22_yssy_delivery_gap_recovery_rerun!;
const next = frozen.amendment
  .p2g23_yssy_infrastructure_recovery_rerun!;

function valid(
  id: number,
  icao: string,
  rowsPerHour = 100,
): Stage1AttemptEvidence {
  const session =
    `00000000-0000-4000-8000-${String(id).padStart(12,"0")}`;

  return {
    probeId: id,
    icao,
    probeBudgetDayId: `TEST-${id}`,
    runtimeSessionId: session,
    status: "completed",
    metricContractVersion: "v39-physical-flight-instance-v2",
    rowsPerHour,
    creditsSpent: 1,
    uniqueFlightsPerCredit: .5,
    tailChainLinksPerCredit: .1,
    stability: .5,
    confirmedUniqueLower: .5,
    confirmedPlusAmbiguousUpper: .5,
    durationCensored: false,
    reconciliationStatus: "MATCH",
    stopReason: null,
    recordedAtUtc: "2026-10-09T00:00:00Z",
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
  };
}

function history(): Stage1AttemptEvidence[] {
  const p16: Stage1AttemptEvidence = {
    ...valid(16, "YSSY", 0),
    status: "failed",
    rowsPerHour: null,
    creditsSpent: null,
    uniqueFlightsPerCredit: null,
    tailChainLinksPerCredit: null,
    stability: null,
    confirmedUniqueLower: null,
    confirmedPlusAmbiguousUpper: null,
    probeBudgetDayId: "P2G-S1-20261006-21",
    runtimeSessionId:
      "06ae005c-34ca-4478-af17-1c5d11b42d6e",
    reconciliationStatus: "DELIVERY_GAP",
    stopReason: "external_internal_delivery_gap",
    durableReconciliation: {
      runtimeSessionId:
        "06ae005c-34ca-4478-af17-1c5d11b42d6e",
      evidenceStatus: "DELIVERY_GAP",
      externalSpendCredits: 260,
      internalReceivedCredits: 259,
      deliveryGapCredits: 1,
      deliveryCompleteness: 259 / 260,
      callbackRequestsSeen: 56,
      callbackSuccess2xx: 56,
      callbackFailures: 0,
      durationCensored: false,
      stopReason: "external_internal_delivery_gap",
    },
  };

  const p17: Stage1AttemptEvidence = {
    ...valid(17, "YSSY", 0),
    status: "failed",
    rowsPerHour: null,
    creditsSpent: null,
    uniqueFlightsPerCredit: null,
    tailChainLinksPerCredit: null,
    stability: null,
    confirmedUniqueLower: null,
    confirmedPlusAmbiguousUpper: null,
    probeBudgetDayId: "P2G-S1-20261008-22",
    runtimeSessionId:
      "cb90e45e-ae7b-4bb4-85fe-7f3e56bd8880",
    durationCensored: true,
    reconciliationStatus: "UNRESOLVED",
    stopReason: "supervisor_child_exit_recovered",
    durableReconciliation: null,
  };

  return [
    valid(11, "WSSS", 160.5),
    valid(12, "OMAA", 74),
    valid(14, "MMUN", 22.999639033442946),
    valid(15, "SKBO", 150.4977007295722),
    p16,
    p17,
  ];
}


/**
 * Full owner selection checks the earlier identity-v2
 * remeasurement before the YSSY early-pilot selector.
 * Keep the historical rows in this integration fixture.
 */
function fullSelectionHistory(): Stage1AttemptEvidence[] {
  const oldMmun = frozen.amendment
    .p2g17_mmun_delivery_gap_recovery_rerun!;

  const failedMmun: Stage1AttemptEvidence = {
    ...valid(13, "MMUN", 0),
    probeId: oldMmun.failed_probe_id,
    probeBudgetDayId:
      oldMmun.expected_probe_budget_day_id,
    runtimeSessionId:
      oldMmun.expected_runtime_session_id,
    status: oldMmun.expected_anchor_status,
    metricContractVersion:
      oldMmun.expected_metric_contract_version,
    durationCensored: true,
    reconciliationStatus:
      oldMmun.expected_anchor_reconciliation_status,
    stopReason:
      oldMmun.expected_anchor_stop_reason,
    durableReconciliation: {
      runtimeSessionId:
        oldMmun.expected_runtime_session_id,
      evidenceStatus:
        oldMmun.durable_evidence_status,
      externalSpendCredits:
        oldMmun.durable_external_spend_credits,
      internalReceivedCredits:
        oldMmun.durable_internal_received_credits,
      deliveryGapCredits:
        oldMmun.durable_delivery_gap_credits,
      deliveryCompleteness:
        oldMmun.durable_delivery_completeness,
      callbackRequestsSeen:
        oldMmun.durable_callback_requests_seen,
      callbackSuccess2xx:
        oldMmun.durable_callback_success_2xx,
      callbackFailures:
        oldMmun.durable_callback_failures,
      durationCensored:
        oldMmun.durable_duration_censored,
      stopReason:
        oldMmun.durable_stop_reason,
    },
  };

  return [
    {
      ...valid(9, "WSSS"),
      metricContractVersion: null,
    },
    {
      ...valid(2, "OMAA"),
      metricContractVersion: null,
    },
    {
      ...valid(10, "MMUN"),
      metricContractVersion:
        "v39-physical-flight-instance-v1",
    },
    failedMmun,
    ...history(),
  ];
}

function select(rows = history()) {
  return chooseEarlyPilotScopeTargetV39(
    scope, rows, old, next,
  );
}

describe("P2G23 final bounded recovery", () => {
  it("preserves original one-attempt recovery", () => {
    expect(old.failed_probe_id).toBe(16);
    expect(old.maximum_additional_attempts).toBe(1);
    expect(next.failed_probe_id).toBe(17);
    expect(next.maximum_additional_attempts).toBe(1);
  });

  it("selects exactly one additional YSSY attempt", () => {
    expect(select()).toBe("YSSY");
    expect(chooseNextStage1TargetV39(
      {
        ...preprobe.artifact,
        shortlist: frozen.effectiveShortlist,
      },
      fullSelectionHistory(),
      frozen.amendment,
    )?.icao).toBe("YSSY");
  });

  it("refuses old freeze after consumed P2G23", () => {
    expect(() => chooseEarlyPilotScopeTargetV39(
      scope, history(), old,
    )).toThrow("REFUSED_EARLY_PILOT_YSSY_RECOVERY_CONSUMED");
  });

  it("completes after one scientifically valid new attempt", () => {
    expect(select([
      ...history(),
      valid(18, "YSSY"),
    ])).toBeNull();
  });

  it("consumes the new attempt regardless of failure", () => {
    const bad = valid(18, "YSSY");
    bad.status = "failed";
    bad.reconciliationStatus = "DELIVERY_GAP";
    bad.stopReason = "external_internal_delivery_gap";

    expect(() => select([
      ...history(), bad,
    ])).toThrow("REFUSED_P2G23_RECOVERY_CONSUMED");
  });

  it("refuses a fourth total YSSY attempt", () => {
    expect(() => select([
      ...history(),
      valid(18, "YSSY"),
      valid(19, "YSSY"),
    ])).toThrow("REFUSED_P2G23_RECOVERY_RETRY_LIMIT");
  });

  it("refuses altered P2G22 accounting", () => {
    const rows = history();
    rows[4].durableReconciliation = {
      ...rows[4].durableReconciliation!,
      externalSpendCredits: 259,
    };

    expect(() => select(rows)).toThrow(
      "REFUSED_P2G23_P2G22_HISTORICAL_MISMATCH",
    );
  });

  it("refuses altered P2G23 state", () => {
    const rows = history();
    rows[5].durableReconciliation =
      valid(17,"YSSY").durableReconciliation;

    expect(() => select(rows)).toThrow(
      "REFUSED_P2G23_HISTORICAL_DATABASE_MISMATCH",
    );
  });

  it("refuses duplicate historical probe records", () => {
    expect(() => select([
      ...history(), history()[5],
    ])).toThrow(
      "REFUSED_P2G23_HISTORICAL_DATABASE_MISMATCH",
    );
  });

  it("loads both the candidate and final amendment", () => {
    const candidate = load(
      PHASE2G_P2G23_YSSY_CANDIDATE_PATH,
    );
    expect(candidate.amendment.freeze_revision)
      .toContain("candidate");
    expect(frozen.amendment.freeze_revision)
      .toContain("frozen");
    expect(next.paid_launch_authorized_now).toBe(false);
  });

  it("preserves paid-owner refusal of the draft candidate", () => {
    const owner = readFileSync(
      "scripts/v39_probe_stage1_owner_v39.ts",
      "utf8",
    );
    const preflight = readFileSync(
      "scripts/v39_phase2g_stage1_paid_preflight_v39.ts",
      "utf8",
    );

    expect(owner).toContain(
      "REFUSED_P2G23_CANDIDATE_NOT_FINAL_FROZEN",
    );
    expect(preflight).toContain(
      "p2g23_candidate_not_final_frozen",
    );
  });
});
