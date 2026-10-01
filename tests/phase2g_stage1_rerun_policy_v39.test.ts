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
    probeBudgetDayId: null,
    runtimeSessionId: null,
    durableReconciliation: null,
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

    const p2g17Recovery = {
      authorized: true as const,
      maximum_additional_attempts: 1 as const,
      failed_probe_id: 13 as const,
      icao: "MMUN" as const,
      expected_probe_budget_day_id: "P2G-S1-20260930-16" as const,
      expected_runtime_session_id:
        "5c0064eb-585a-4dfb-af4c-211f3bee3e94" as const,
      expected_metric_contract_version:
        "v39-physical-flight-instance-v2" as const,
      expected_anchor_status: "failed" as const,
      expected_anchor_reconciliation_status: "UNRESOLVED" as const,
      expected_anchor_stop_reason: "supervisor_child_exit_recovered" as const,
      durable_evidence_status: "DELIVERY_GAP" as const,
      durable_external_spend_credits: 65 as const,
      durable_internal_received_credits: 60 as const,
      durable_delivery_gap_credits: 5 as const,
      durable_delivery_completeness: 60 / 65,
      durable_duration_censored: false as const,
      durable_stop_reason: "external_internal_delivery_gap" as const,
      durable_callback_requests_seen: 41 as const,
      durable_callback_success_2xx: 41 as const,
      durable_callback_failures: 0 as const,
      excluded_from_final_scoring: true as const,
      requires_fresh_runtime_budget_auth: true as const,
      requires_matched_time_class: true as const,
      no_automatic_retry_after_recovery_attempt: true as const,
      outcome_metrics_not_used_to_authorize: true as const,
      authorization_basis:
        "p2g17_delivery_gap_and_finalization_schema_failure_only" as const,
      reason: "Exact technical-invalid P2G17 recovery.",
    };

    function p2g17TechnicalInvalidAttempt() {
      return {
        ...attempt(
          13,
          "MMUN",
          "failed",
          "supervisor_child_exit_recovered",
          false,
          "UNRESOLVED",
          "v39-physical-flight-instance-v2",
        ),
        probeBudgetDayId: "P2G-S1-20260930-16",
        runtimeSessionId: "5c0064eb-585a-4dfb-af4c-211f3bee3e94",
        durableReconciliation: {
          runtimeSessionId: "5c0064eb-585a-4dfb-af4c-211f3bee3e94",
          evidenceStatus: "DELIVERY_GAP",
          externalSpendCredits: 65,
          internalReceivedCredits: 60,
          deliveryGapCredits: 5,
          deliveryCompleteness: 60 / 65,
          callbackRequestsSeen: 41,
          callbackSuccess2xx: 41,
          callbackFailures: 0,
          durationCensored: false,
          stopReason: "external_internal_delivery_gap",
        },
      };
    }

    function identityV2ThroughP2g17() {
      return [
        ...legacyEvidence(),
        attempt(
          11,
          "WSSS",
          "completed",
          null,
          false,
          "MATCH",
          "v39-physical-flight-instance-v2",
        ),
        attempt(
          12,
          "OMAA",
          "completed",
          null,
          false,
          "MATCH",
          "v39-physical-flight-instance-v2",
        ),
        p2g17TechnicalInvalidAttempt(),
      ];
    }

    it("treats only the exact frozen P2G17 DELIVERY_GAP row as non-consuming", () => {
      expect(
        choosePhysicalIdentityV2RemeasurementTargetV39(
          recovery,
          identityV2ThroughP2g17(),
          p2g17Recovery,
        ),
      ).toBe("MMUN");
    });

    it("refuses P2G17 recovery if durable settlement evidence is altered", () => {
      const evidence = identityV2ThroughP2g17().map((row) => ({ ...row }));
      const p2g17 = evidence.find((row) => row.probeId === 13)!;
      p2g17.durableReconciliation = {
        ...p2g17.durableReconciliation,
        externalSpendCredits: 64,
      };

      expect(() =>
        choosePhysicalIdentityV2RemeasurementTargetV39(
          recovery,
          evidence,
          p2g17Recovery,
        ),
      ).toThrow(/P2G17_MMUN_RECOVERY_EVIDENCE_MISMATCH/);
    });

    it("a valid but scientifically poor P2G17 recovery attempt consumes the authorization", () => {
      const recovered = {
        ...attempt(
          14,
          "MMUN",
          "completed",
          null,
          false,
          "MATCH",
          "v39-physical-flight-instance-v2",
        ),
        rowsPerHour: 1,
        stability: 0,
      };

      expect(
        choosePhysicalIdentityV2RemeasurementTargetV39(
          recovery,
          [...identityV2ThroughP2g17(), recovered],
          p2g17Recovery,
        ),
      ).toBeNull();
    });

    it("a new technical failure after P2G17 does not automatically authorize a third MMUN attempt", () => {
      const secondTechnicalFailure = attempt(
        14,
        "MMUN",
        "failed",
        "supervisor_child_exit_recovered",
        true,
        "UNRESOLVED",
        "v39-physical-flight-instance-v2",
      );

      expect(
        choosePhysicalIdentityV2RemeasurementTargetV39(
          recovery,
          [...identityV2ThroughP2g17(), secondTechnicalFailure],
          p2g17Recovery,
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
