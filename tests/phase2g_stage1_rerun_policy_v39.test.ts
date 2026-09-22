import { describe, expect, it } from "vitest";
import {
  chooseNextPrimaryStage1TargetV39,
  isInfrastructureInvalidStage1AttemptV39,
  isP2g07Provider502RecoveryEligibleV39,
} from "../scripts/v39_probe_stage1_owner_v39";

const shortlist = [
  { icao: "WSSS" },
  { icao: "OMAA" },
  { icao: "MMUN" },
  { icao: "LKPR" },
];

function attempt(
  probeId: number,
  icao: string,
  status: string,
  stopReason: string | null,
  durationCensored: boolean,
  reconciliationStatus: string | null,
): any {
  return {
    probeId,
    icao,
    status,
    rowsPerHour: status === "completed" ? 100 : null,
    creditsSpent: status === "completed" ? 1 : null,
    uniqueFlightsPerCredit: status === "completed" ? 0.2 : null,
    tailChainLinksPerCredit: status === "completed" ? 0.01 : null,
    stability: status === "completed" ? 0.5 : null,
    confirmedUniqueLower: status === "completed" ? 0.2 : null,
    confirmedPlusAmbiguousUpper: status === "completed" ? 0.2 : null,
    durationCensored,
    stopReason,
    reconciliationStatus,
    recordedAtUtc: new Date(Date.UTC(2026, 8, 15 + probeId)).toISOString(),
  };
}

describe("Phase2G bounded infrastructure-invalid Stage1 rerun policy", () => {
  it("classifies the observed WSSS/MMUN supervisor exits as infrastructure-invalid", () => {
    expect(isInfrastructureInvalidStage1AttemptV39(
      attempt(1, "WSSS", "failed", "supervisor_child_exit_before_runtime_session", true, "UNRESOLVED"),
    )).toBe(true);
    expect(isInfrastructureInvalidStage1AttemptV39(
      attempt(3, "MMUN", "failed", "supervisor_child_exit_after_runtime_reset_recovered", true, "UNRESOLVED"),
    )).toBe(true);
  });

  it("chooses WSSS first from the current durable evidence", () => {
    const attempts = [
      attempt(1, "WSSS", "failed", "supervisor_child_exit_before_runtime_session", true, "UNRESOLVED"),
      attempt(2, "OMAA", "completed", null, false, "MATCH"),
      attempt(3, "MMUN", "failed", "supervisor_child_exit_after_runtime_reset_recovered", true, "UNRESOLVED"),
    ];
    expect(chooseNextPrimaryStage1TargetV39(shortlist, attempts)).toBe("WSSS");
  });

  it("after a completed WSSS rerun chooses MMUN next", () => {
    const attempts = [
      attempt(1, "WSSS", "failed", "supervisor_child_exit_before_runtime_session", true, "UNRESOLVED"),
      attempt(2, "OMAA", "completed", null, false, "MATCH"),
      attempt(3, "MMUN", "failed", "supervisor_child_exit_after_runtime_reset_recovered", true, "UNRESOLVED"),
      attempt(4, "WSSS", "completed", null, false, "MATCH"),
    ];
    expect(chooseNextPrimaryStage1TargetV39(shortlist, attempts)).toBe("MMUN");
  });

  it("after completed WSSS and MMUN reruns advances to LKPR", () => {
    const attempts = [
      attempt(1, "WSSS", "failed", "supervisor_child_exit_before_runtime_session", true, "UNRESOLVED"),
      attempt(2, "OMAA", "completed", null, false, "MATCH"),
      attempt(3, "MMUN", "failed", "supervisor_child_exit_after_runtime_reset_recovered", true, "UNRESOLVED"),
      attempt(4, "WSSS", "completed", null, false, "MATCH"),
      attempt(5, "MMUN", "completed", null, false, "MATCH"),
    ];
    expect(chooseNextPrimaryStage1TargetV39(shortlist, attempts)).toBe("LKPR");
  });

  it("does not create an unlimited retry loop after a second WSSS infrastructure failure", () => {
    const attempts = [
      attempt(1, "WSSS", "failed", "supervisor_child_exit_before_runtime_session", true, "UNRESOLVED"),
      attempt(2, "OMAA", "completed", null, false, "MATCH"),
      attempt(3, "MMUN", "failed", "supervisor_child_exit_after_runtime_reset_recovered", true, "UNRESOLVED"),
      attempt(4, "WSSS", "failed", "supervisor_child_exit_recovered", true, "UNRESOLVED"),
    ];
    expect(chooseNextPrimaryStage1TargetV39(shortlist, attempts)).toBe("MMUN");
  });


  it("permits only the prospectively amended P2G07 provider-502 WSSS recovery shape", () => {
    const attempts = [
      attempt(1, "WSSS", "failed", "supervisor_child_exit_before_runtime_session", true, "UNRESOLVED"),
      attempt(2, "OMAA", "completed", null, false, "MATCH"),
      attempt(3, "MMUN", "failed", "supervisor_child_exit_after_runtime_reset_recovered", true, "UNRESOLVED"),
      attempt(4, "WSSS", "failed", "external_internal_credit_mismatch", false, "MISMATCH"),
      attempt(5, "WSSS", "failed", "subscription_delete_failed", true, "UNRESOLVED"),
    ];
    expect(isP2g07Provider502RecoveryEligibleV39(attempts)).toBe(true);

    const altered = attempts.map((row) => ({ ...row }));
    altered[4].stopReason = "zero_reconciled_credits";
    expect(isP2g07Provider502RecoveryEligibleV39(altered)).toBe(false);
  });

  it("does not rerun an ordinary scientific/provider failure as infrastructure-invalid", () => {
    const attempts = [
      attempt(1, "WSSS", "failed", "zero_reconciled_credits", true, "MATCH"),
      attempt(2, "OMAA", "completed", null, false, "MATCH"),
    ];
    expect(chooseNextPrimaryStage1TargetV39(shortlist, attempts)).toBe("MMUN");
  });
});
