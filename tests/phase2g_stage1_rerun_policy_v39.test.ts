import { describe, expect, it } from "vitest";
import {
  chooseNextPrimaryStage1TargetV39,
  choosePhysicalIdentityV2RemeasurementTargetV39,
  hasObsoleteCompletedPrimaryEvidenceV39,
  isInfrastructureInvalidStage1AttemptV39,
  isP2g07Provider502RecoveryEligibleV39,
  isP2g08Balance502RecoveryEligibleV39,
  isP2g09HostResetRecoveryEligibleV39,
  isP2g10SecretMismatchRecoveryEligibleV39,
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
  metricContractVersion: string | null = null,
): any {
  return {
    probeId,
    icao,
    status,
    metricContractVersion,
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

  it("permits only the frozen P2G08 balance-control-plane recovery shape", () => {
    const attempts = [
      attempt(1, "WSSS", "failed", "supervisor_child_exit_before_runtime_session", true, "UNRESOLVED"),
      attempt(2, "OMAA", "completed", null, false, "MATCH"),
      attempt(3, "MMUN", "failed", "supervisor_child_exit_after_runtime_reset_recovered", true, "UNRESOLVED"),
      attempt(4, "WSSS", "failed", "external_internal_credit_mismatch", false, "MISMATCH"),
      attempt(5, "WSSS", "failed", "subscription_delete_failed", true, "UNRESOLVED"),
      attempt(6, "WSSS", "failed", "balance_read_failed_after_retries", true, "MATCH"),
    ];
    expect(isP2g08Balance502RecoveryEligibleV39(attempts)).toBe(true);

    const altered = attempts.map((row) => ({ ...row }));
    altered[5].durationCensored = false;
    expect(isP2g08Balance502RecoveryEligibleV39(altered)).toBe(false);
  });

  it("permits only the exact P2G09 Replit-host-reset recovery shape and becomes false after any sixth WSSS row", () => {
    const attempts = [
      attempt(1, "WSSS", "failed", "supervisor_child_exit_before_runtime_session", true, "UNRESOLVED"),
      attempt(2, "OMAA", "completed", null, false, "MATCH"),
      attempt(3, "MMUN", "failed", "supervisor_child_exit_after_runtime_reset_recovered", true, "UNRESOLVED"),
      attempt(4, "WSSS", "failed", "external_internal_credit_mismatch", false, "MISMATCH"),
      attempt(5, "WSSS", "failed", "subscription_delete_failed", true, "UNRESOLVED"),
      attempt(6, "WSSS", "failed", "balance_read_failed_after_retries", true, "MATCH"),
      attempt(7, "WSSS", "failed", "supervisor_child_exit_recovered", true, "UNRESOLVED"),
    ];
    expect(isP2g09HostResetRecoveryEligibleV39(attempts)).toBe(true);

    const wrongReason = attempts.map((row) => ({ ...row }));
    wrongReason[6].stopReason = "balance_read_failed_after_retries";
    expect(isP2g09HostResetRecoveryEligibleV39(wrongReason)).toBe(false);

    const afterSixthWsss = [
      ...attempts,
      attempt(8, "WSSS", "failed", "supervisor_child_exit_recovered", true, "UNRESOLVED"),
    ];
    expect(isP2g09HostResetRecoveryEligibleV39(afterSixthWsss)).toBe(false);
  });

  it("permits only the exact P2G10 GitHub/Replit secret-mismatch recovery shape", () => {
    const attempts = [
      attempt(1, "WSSS", "failed", "supervisor_child_exit_before_runtime_session", true, "UNRESOLVED"),
      attempt(2, "OMAA", "completed", null, false, "MATCH"),
      attempt(3, "MMUN", "failed", "supervisor_child_exit_after_runtime_reset_recovered", true, "UNRESOLVED"),
      attempt(4, "WSSS", "failed", "external_internal_credit_mismatch", false, "MISMATCH"),
      attempt(5, "WSSS", "failed", "subscription_delete_failed", true, "UNRESOLVED"),
      attempt(6, "WSSS", "failed", "balance_read_failed_after_retries", true, "MATCH"),
      attempt(7, "WSSS", "failed", "supervisor_child_exit_recovered", true, "UNRESOLVED"),
      attempt(8, "WSSS", "failed", "supervisor_child_exit_recovered", true, "UNRESOLVED"),
    ];
    expect(isP2g10SecretMismatchRecoveryEligibleV39(attempts)).toBe(true);

    const altered = attempts.map((row) => ({ ...row }));
    altered[7].reconciliationStatus = "MATCH";
    expect(isP2g10SecretMismatchRecoveryEligibleV39(altered)).toBe(false);

    const afterSeventhWsss = [
      ...attempts,
      attempt(9, "WSSS", "failed", "supervisor_child_exit_recovered", true, "UNRESOLVED"),
    ];
    expect(isP2g10SecretMismatchRecoveryEligibleV39(afterSeventhWsss)).toBe(false);
  });

  describe("physical-identity-v2 bounded remeasurement", () => {
    const recovery = {
      authorized: true as const,
      current_metric_contract: "v39-physical-flight-instance-v2" as const,
      maximum_additional_attempts_per_candidate: 1 as const,
      ordered_icaos: ["WSSS", "OMAA", "MMUN"] as const,
      legacy_probe_requirements: [
        {
          icao: "WSSS" as const,
          probe_id: 9,
          expected_status: "completed" as const,
          expected_duration_censored: false as const,
          expected_reconciliation_status: "MATCH" as const,
          expected_metric_contract_version: null,
        },
        {
          icao: "OMAA" as const,
          probe_id: 2,
          expected_status: "completed" as const,
          expected_duration_censored: false as const,
          expected_reconciliation_status: "MATCH" as const,
          expected_metric_contract_version: null,
        },
        {
          icao: "MMUN" as const,
          probe_id: 10,
          expected_status: "completed" as const,
          expected_duration_censored: false as const,
          expected_reconciliation_status: "MATCH" as const,
          expected_metric_contract_version:
            "v39-physical-flight-instance-v1",
        },
      ],
      exclude_legacy_from_v2_promotion: true as const,
      requires_fresh_runtime_budget_auth: true as const,
      outcome_metrics_not_used_to_authorize: true as const,
      reason: "Exact contract-correction remeasurement after P2G13 identity-parity defect.",
    };

    function legacyEvidence() {
      return [
        attempt(2, "OMAA", "completed", null, false, "MATCH", null),
        attempt(9, "WSSS", "completed", null, false, "MATCH", null),
        attempt(
          10,
          "MMUN",
          "completed",
          null,
          false,
          "MATCH",
          "v39-physical-flight-instance-v1",
        ),
      ];
    }

    it("remeasures in fixed WSSS then OMAA then MMUN order", () => {
      const legacy = legacyEvidence();

      expect(
        choosePhysicalIdentityV2RemeasurementTargetV39(
          recovery,
          legacy,
        ),
      ).toBe("WSSS");

      const withWsss = [
        ...legacy,
        attempt(
          11,
          "WSSS",
          "completed",
          null,
          false,
          "MATCH",
          "v39-physical-flight-instance-v2",
        ),
      ];
      expect(
        choosePhysicalIdentityV2RemeasurementTargetV39(
          recovery,
          withWsss,
        ),
      ).toBe("OMAA");

      const withOmaa = [
        ...withWsss,
        attempt(
          12,
          "OMAA",
          "completed",
          null,
          false,
          "MATCH",
          "v39-physical-flight-instance-v2",
        ),
      ];
      expect(
        choosePhysicalIdentityV2RemeasurementTargetV39(
          recovery,
          withOmaa,
        ),
      ).toBe("MMUN");

      const withMmun = [
        ...withOmaa,
        attempt(
          13,
          "MMUN",
          "completed",
          null,
          false,
          "MATCH",
          "v39-physical-flight-instance-v2",
        ),
      ];
      expect(
        choosePhysicalIdentityV2RemeasurementTargetV39(
          recovery,
          withMmun,
        ),
      ).toBeNull();
    });

    it("counts any one v2 attempt as the bounded attempt even when it fails", () => {
      const evidence = [
        ...legacyEvidence(),
        attempt(
          11,
          "WSSS",
          "failed",
          "provider_failure",
          true,
          "UNRESOLVED",
          "v39-physical-flight-instance-v2",
        ),
      ];

      expect(
        choosePhysicalIdentityV2RemeasurementTargetV39(
          recovery,
          evidence,
        ),
      ).toBe("OMAA");
    });

    it("refuses when the exact historical evidence does not match the freeze", () => {
      const altered = legacyEvidence().map((row) => ({ ...row }));
      altered.find((row) => row.probeId === 10)!.metricContractVersion = null;

      expect(() =>
        choosePhysicalIdentityV2RemeasurementTargetV39(
          recovery,
          altered,
        ),
      ).toThrow(/LEGACY_EVIDENCE_MISMATCH:MMUN/);
    });

    it("refuses a second v2 attempt for the same recovery candidate", () => {
      const evidence = [
        ...legacyEvidence(),
        attempt(
          11,
          "WSSS",
          "failed",
          "provider_failure",
          true,
          "UNRESOLVED",
          "v39-physical-flight-instance-v2",
        ),
        attempt(
          12,
          "WSSS",
          "completed",
          null,
          false,
          "MATCH",
          "v39-physical-flight-instance-v2",
        ),
      ];

      expect(() =>
        choosePhysicalIdentityV2RemeasurementTargetV39(
          recovery,
          evidence,
        ),
      ).toThrow(/RECOVERY_RETRY_LIMIT:WSSS/);
    });

    it("refuses out-of-order v2 evidence instead of normalizing after the fact", () => {
      const evidence = [
        ...legacyEvidence(),
        attempt(
          11,
          "OMAA",
          "completed",
          null,
          false,
          "MATCH",
          "v39-physical-flight-instance-v2",
        ),
      ];

      expect(() =>
        choosePhysicalIdentityV2RemeasurementTargetV39(
          recovery,
          evidence,
        ),
      ).toThrow(/RECOVERY_OUT_OF_ORDER:missing=WSSS:later=OMAA/);
    });

    it("detects obsolete completed compact-six evidence when no recovery is frozen", () => {
      expect(
        hasObsoleteCompletedPrimaryEvidenceV39(
          shortlist,
          legacyEvidence(),
        ),
      ).toBe(true);
    });
  });

  it("does not rerun an ordinary scientific/provider failure as infrastructure-invalid", () => {
    const attempts = [
      attempt(1, "WSSS", "failed", "zero_reconciled_credits", true, "MATCH"),
      attempt(2, "OMAA", "completed", null, false, "MATCH"),
    ];
    expect(chooseNextPrimaryStage1TargetV39(shortlist, attempts)).toBe("MMUN");
  });
});
