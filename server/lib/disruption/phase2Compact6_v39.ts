import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import type {
  FrozenProbeArtifact,
  FrozenProbeCandidate,
} from "./anchorPromotion_v39";

export const PHASE2G_COMPACT6_ARTIFACT_PATH =
  "artifacts/phase2g-compact6-amendment-freeze-20260921.json";
export const PHASE2G_COMPACT6_RECOVERY_ARTIFACT_PATH =
  "artifacts/phase2g-compact6-p2g07-provider502-recovery-freeze-20260922.json";
export const PHASE2G_COMPACT6_P2G08_RECOVERY_ARTIFACT_PATH =
  "artifacts/phase2g-compact6-p2g08-balance502-recovery-freeze-20260922.json";
export const PHASE2G_COMPACT6_P2G09_RECOVERY_ARTIFACT_PATH =
  "artifacts/phase2g-compact6-p2g09-hostreset-recovery-freeze-20260922.json";
export const PHASE2G_COMPACT6_P2G10_RECOVERY_ARTIFACT_PATH =
  "artifacts/phase2g-compact6-p2g10-secret-mismatch-recovery-freeze-20260923.json";
export const PHASE2G_COMPACT6_IDENTITY_V2_RECOVERY_ARTIFACT_PATH =
  "artifacts/phase2g-compact6-identity-v2-recovery-freeze-20260925.json";

export type Phase2gIdentityV2RecoveryIcaoV39 =
  | "WSSS"
  | "OMAA"
  | "MMUN";

export interface Phase2gPhysicalIdentityV2RemeasurementV39 {
  authorized: true;
  current_metric_contract: "v39-physical-flight-instance-v2";
  maximum_additional_attempts_per_candidate: 1;
  ordered_icaos: Phase2gIdentityV2RecoveryIcaoV39[];
  legacy_probe_requirements: Array<{
    icao: Phase2gIdentityV2RecoveryIcaoV39;
    probe_id: number;
    expected_status: "completed";
    expected_duration_censored: false;
    expected_reconciliation_status: "MATCH";
    expected_metric_contract_version: string | null;
  }>;
  exclude_legacy_from_v2_promotion: true;
  requires_fresh_runtime_budget_auth: true;
  outcome_metrics_not_used_to_authorize: true;
  reason: string;
}

export interface Phase2gCompact6AmendmentV39 {
  schema_version: "v39-phase2g-compact6-amendment-1";
  status: "READY_FROZEN_COMPACT6_AMENDMENT";
  frozen_at_utc: string;
  source_preprobe_file_sha256: string;
  source_stage1_candidate_count: 12;
  effective_stage1_candidate_count: 6;
  candidate_icaos: string[];
  candidate_regions: Record<string, string>;
  selection_rule: string;
  p2g06_historical_probe_id: number;
  p2g06_historical_status: "failed";
  p2g06_historical_reconciliation_status: "MISMATCH";
  p2g06_historical_stop_reason: "external_internal_credit_mismatch";
  p2g06_reconstructed_external_credits: number;
  p2g06_reconstructed_internal_credits: number;
  p2g06_reconstructed_delivery_gap_credits: number;
  p2g06_excluded_from_final_scoring: true;
  wsss_postfix_validation_rerun: {
    authorized: true;
    maximum_additional_attempts: 1;
    reason: string;
  };
  p2g07_provider502_recovery_rerun?: {
    authorized: true;
    maximum_additional_attempts: 1;
    failed_probe_id: 5;
    failed_status: "failed";
    failed_reconciliation_status: "UNRESOLVED";
    failed_stop_reason: "subscription_delete_failed";
    excluded_from_final_scoring: true;
    requires_fresh_runtime_budget_auth: true;
    authorization_basis: "provider_502_and_orphan_subscription_safety_failure_only";
    outcome_metrics_not_used_to_authorize: true;
    reason: string;
  };
  p2g08_balance502_recovery_rerun?: {
    authorized: true;
    maximum_additional_attempts: 1;
    failed_probe_id: 6;
    failed_status: "failed";
    failed_duration_censored: true;
    failed_reconciliation_status: "MATCH";
    failed_stop_reason: "balance_read_failed_after_retries";
    excluded_from_final_scoring: true;
    requires_fresh_runtime_budget_auth: true;
    requires_balance_stability_canary: true;
    minimum_consecutive_balance_reads: 3;
    no_further_automatic_wsss_retry: true;
    outcome_metrics_not_used_to_authorize: true;
    reason: string;
  };
  p2g09_hostreset_recovery_rerun?: {
    authorized: true;
    maximum_additional_attempts: 1;
    failed_probe_id: 7;
    failed_status: "failed";
    failed_duration_censored: true;
    failed_reconciliation_status: "UNRESOLVED";
    failed_stop_reason: "supervisor_child_exit_recovered";
    excluded_from_final_scoring: true;
    requires_fresh_runtime_budget_auth: true;
    requires_owner_executor: "github-actions";
    requires_live_callback_verification: true;
    requires_deferred_cleanup_state_machine: true;
    requires_zero_active_billable_at_launch: true;
    no_further_automatic_wsss_retry: true;
    outcome_metrics_not_used_to_authorize: true;
    authorization_basis: "replit_development_runtime_host_reset_only";
    reason: string;
  };
  p2g10_secret_mismatch_recovery_rerun?: {
    authorized: true;
    maximum_additional_attempts: 1;
    failed_probe_id: 8;
    failed_status: "failed";
    failed_duration_censored: true;
    failed_reconciliation_status: "UNRESOLVED";
    failed_stop_reason: "supervisor_child_exit_recovered";
    excluded_from_final_scoring: true;
    requires_fresh_runtime_budget_auth: true;
    requires_owner_executor: "github-actions";
    requires_live_callback_verification: true;
    requires_cross_environment_webhook_secret_binding: true;
    requires_owner_secret_recheck: true;
    requires_cross_environment_runtime_db_binding: true;
    requires_owner_runtime_health_recheck: true;
    requires_owner_runtime_db_recheck: true;
    requires_zero_credit_callback_binding_workflow: true;
    requires_zero_callback_spend_fail_fast_watchdog: true;
    requires_url_encoded_webhook_secret_path: true;
    requires_zero_active_billable_at_launch: true;
    no_further_automatic_wsss_retry: true;
    outcome_metrics_not_used_to_authorize: true;
    authorization_basis: "github_replit_webhook_secret_mismatch_only";
    reason: string;
  };
  physical_identity_v2_remeasurement?: Phase2gPhysicalIdentityV2RemeasurementV39;
  prospective_reconciliation_policy: {
    external_settled_spend_is_authoritative_denominator: true;
    delivery_completeness_floor: number;
    nonzero_delivery_gap_is_terminal_not_scoreable: boolean;
    internal_greater_than_external_is_hard_mismatch: true;
    cost_item_disagreement_is_hard_mismatch: true;
    unresolved_settlement_is_hard_failure: true;
    applies_only_to_attempts_started_after_this_freeze: true;
  };
  stage2_policy: {
    mode: "conditional_confirmation_only";
    automatic_five_four_hour_confirmations: false;
    triggers: string[];
    result_label_without_triggered_stage2: string;
  };
  anti_bias: {
    candidate_subset_chosen_from_preoutcome_frozen_shortlist: true;
    no_retroactive_P2G06_pass: true;
    no_unbounded_WSSS_retry: true;
    no_p2g06_calibrated_reconciliation_tolerance: true;
  };
}

function sha256(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function assertSha256(value: string, label: string): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error(`${label}_SHA256_INVALID`);
  return normalized;
}

export function loadPhase2gCompact6AmendmentV39(input: {
  expectedSha256: string;
  sourcePreprobeFileSha256: string;
  preprobe: FrozenProbeArtifact;
  path?: string;
}): {
  amendment: Phase2gCompact6AmendmentV39;
  fileSha256: string;
  effectiveShortlist: FrozenProbeCandidate[];
} {
  const expected = assertSha256(input.expectedSha256, "COMPACT6_EXPECTED");
  const sourcePreprobe = assertSha256(input.sourcePreprobeFileSha256, "COMPACT6_PREPROBE");
  const candidatePaths = input.path
    ? [input.path]
    : [PHASE2G_COMPACT6_IDENTITY_V2_RECOVERY_ARTIFACT_PATH, PHASE2G_COMPACT6_P2G10_RECOVERY_ARTIFACT_PATH, PHASE2G_COMPACT6_P2G09_RECOVERY_ARTIFACT_PATH, PHASE2G_COMPACT6_P2G08_RECOVERY_ARTIFACT_PATH, PHASE2G_COMPACT6_RECOVERY_ARTIFACT_PATH, PHASE2G_COMPACT6_ARTIFACT_PATH];
  let raw: string | null = null;
  let actual: string | null = null;
  for (const candidatePath of candidatePaths) {
    if (!existsSync(candidatePath)) continue;
    const candidateRaw = readFileSync(candidatePath, "utf8");
    const candidateSha = sha256(candidateRaw);
    if (candidateSha === expected) {
      raw = candidateRaw;
      actual = candidateSha;
      break;
    }
  }
  if (raw === null || actual === null) {
    throw new Error(`REFUSED_COMPACT6_HASH_MISMATCH:expected=${expected}:known_paths=${candidatePaths.join(",")}`);
  }

  const amendment = JSON.parse(raw) as Phase2gCompact6AmendmentV39;
  if (
    amendment.schema_version !== "v39-phase2g-compact6-amendment-1" ||
    amendment.status !== "READY_FROZEN_COMPACT6_AMENDMENT"
  ) {
    throw new Error("REFUSED_COMPACT6_SCHEMA_OR_STATUS");
  }
  if (amendment.source_preprobe_file_sha256 !== sourcePreprobe) {
    throw new Error("REFUSED_COMPACT6_PREPROBE_BINDING_MISMATCH");
  }
  if (amendment.source_stage1_candidate_count !== 12 || input.preprobe.shortlist.length !== 12) {
    throw new Error("REFUSED_COMPACT6_SOURCE_SHORTLIST_NOT_12");
  }
  if (
    amendment.effective_stage1_candidate_count !== 6 ||
    !Array.isArray(amendment.candidate_icaos) ||
    amendment.candidate_icaos.length !== 6
  ) {
    throw new Error("REFUSED_COMPACT6_CANDIDATE_COUNT");
  }

  const expectedRegions = new Set([
    "North America",
    "Europe",
    "Asia-Pacific",
    "Gulf/Africa",
    "South America",
    "Oceania",
  ]);
  const byIcao = new Map(input.preprobe.shortlist.map((candidate) => [candidate.icao.toUpperCase(), candidate]));
  const seenIcaos = new Set<string>();
  const seenRegions = new Set<string>();
  const effectiveShortlist: FrozenProbeCandidate[] = [];

  for (const rawIcao of amendment.candidate_icaos) {
    const icao = String(rawIcao).trim().toUpperCase();
    if (seenIcaos.has(icao)) throw new Error(`REFUSED_COMPACT6_DUPLICATE:${icao}`);
    seenIcaos.add(icao);
    const candidate = byIcao.get(icao);
    if (!candidate) throw new Error(`REFUSED_COMPACT6_NOT_IN_FROZEN_SHORTLIST:${icao}`);
    if (amendment.candidate_regions[icao] !== candidate.region) {
      throw new Error(`REFUSED_COMPACT6_REGION_MISMATCH:${icao}`);
    }
    seenRegions.add(candidate.region);
    effectiveShortlist.push(candidate);
  }

  if (!seenIcaos.has("WSSS") || !seenIcaos.has("OMAA")) {
    throw new Error("REFUSED_COMPACT6_REFERENCE_MISSING");
  }
  if (seenRegions.size !== 6 || [...expectedRegions].some((region) => !seenRegions.has(region))) {
    throw new Error("REFUSED_COMPACT6_REGION_COVERAGE");
  }
  if (
    amendment.p2g06_historical_probe_id !== 4 ||
    amendment.p2g06_historical_status !== "failed" ||
    amendment.p2g06_historical_reconciliation_status !== "MISMATCH" ||
    amendment.p2g06_historical_stop_reason !== "external_internal_credit_mismatch" ||
    amendment.p2g06_excluded_from_final_scoring !== true
  ) {
    throw new Error("REFUSED_COMPACT6_P2G06_CONTRACT");
  }
  if (
    amendment.p2g06_reconstructed_external_credits !== 220 ||
    amendment.p2g06_reconstructed_internal_credits !== 219 ||
    amendment.p2g06_reconstructed_delivery_gap_credits !== 1
  ) {
    throw new Error("REFUSED_COMPACT6_P2G06_RECONSTRUCTION_CONTRACT");
  }
  if (
    amendment.wsss_postfix_validation_rerun.authorized !== true ||
    amendment.wsss_postfix_validation_rerun.maximum_additional_attempts !== 1
  ) {
    throw new Error("REFUSED_COMPACT6_WSSS_VALIDATION_BOUND");
  }
  const recovery = amendment.p2g07_provider502_recovery_rerun;
  if (recovery !== undefined && (
    recovery.authorized !== true ||
    recovery.maximum_additional_attempts !== 1 ||
    recovery.failed_probe_id !== 5 ||
    recovery.failed_status !== "failed" ||
    recovery.failed_reconciliation_status !== "UNRESOLVED" ||
    recovery.failed_stop_reason !== "subscription_delete_failed" ||
    recovery.excluded_from_final_scoring !== true ||
    recovery.requires_fresh_runtime_budget_auth !== true ||
    recovery.authorization_basis !== "provider_502_and_orphan_subscription_safety_failure_only" ||
    recovery.outcome_metrics_not_used_to_authorize !== true
  )) {
    throw new Error("REFUSED_COMPACT6_P2G07_RECOVERY_BOUND");
  }
  const recoveryP2g08 = amendment.p2g08_balance502_recovery_rerun;
  if (recoveryP2g08 !== undefined && (
    recoveryP2g08.authorized !== true ||
    recoveryP2g08.maximum_additional_attempts !== 1 ||
    recoveryP2g08.failed_probe_id !== 6 ||
    recoveryP2g08.failed_status !== "failed" ||
    recoveryP2g08.failed_duration_censored !== true ||
    recoveryP2g08.failed_reconciliation_status !== "MATCH" ||
    recoveryP2g08.failed_stop_reason !== "balance_read_failed_after_retries" ||
    recoveryP2g08.excluded_from_final_scoring !== true ||
    recoveryP2g08.requires_fresh_runtime_budget_auth !== true ||
    recoveryP2g08.requires_balance_stability_canary !== true ||
    recoveryP2g08.minimum_consecutive_balance_reads !== 3 ||
    recoveryP2g08.no_further_automatic_wsss_retry !== true ||
    recoveryP2g08.outcome_metrics_not_used_to_authorize !== true
  )) {
    throw new Error("REFUSED_COMPACT6_P2G08_RECOVERY_BOUND");
  }
  const recoveryP2g09 = amendment.p2g09_hostreset_recovery_rerun;
  if (recoveryP2g09 !== undefined && (
    recoveryP2g09.authorized !== true ||
    recoveryP2g09.maximum_additional_attempts !== 1 ||
    recoveryP2g09.failed_probe_id !== 7 ||
    recoveryP2g09.failed_status !== "failed" ||
    recoveryP2g09.failed_duration_censored !== true ||
    recoveryP2g09.failed_reconciliation_status !== "UNRESOLVED" ||
    recoveryP2g09.failed_stop_reason !== "supervisor_child_exit_recovered" ||
    recoveryP2g09.excluded_from_final_scoring !== true ||
    recoveryP2g09.requires_fresh_runtime_budget_auth !== true ||
    recoveryP2g09.requires_owner_executor !== "github-actions" ||
    recoveryP2g09.requires_live_callback_verification !== true ||
    recoveryP2g09.requires_deferred_cleanup_state_machine !== true ||
    recoveryP2g09.requires_zero_active_billable_at_launch !== true ||
    recoveryP2g09.no_further_automatic_wsss_retry !== true ||
    recoveryP2g09.outcome_metrics_not_used_to_authorize !== true ||
    recoveryP2g09.authorization_basis !== "replit_development_runtime_host_reset_only"
  )) {
    throw new Error("REFUSED_COMPACT6_P2G09_RECOVERY_BOUND");
  }

  const recoveryP2g10 = amendment.p2g10_secret_mismatch_recovery_rerun;
  if (recoveryP2g10 !== undefined && (
    recoveryP2g10.authorized !== true ||
    recoveryP2g10.maximum_additional_attempts !== 1 ||
    recoveryP2g10.failed_probe_id !== 8 ||
    recoveryP2g10.failed_status !== "failed" ||
    recoveryP2g10.failed_duration_censored !== true ||
    recoveryP2g10.failed_reconciliation_status !== "UNRESOLVED" ||
    recoveryP2g10.failed_stop_reason !== "supervisor_child_exit_recovered" ||
    recoveryP2g10.excluded_from_final_scoring !== true ||
    recoveryP2g10.requires_fresh_runtime_budget_auth !== true ||
    recoveryP2g10.requires_owner_executor !== "github-actions" ||
    recoveryP2g10.requires_live_callback_verification !== true ||
    recoveryP2g10.requires_cross_environment_webhook_secret_binding !== true ||
    recoveryP2g10.requires_owner_secret_recheck !== true ||
    recoveryP2g10.requires_cross_environment_runtime_db_binding !== true ||
    recoveryP2g10.requires_owner_runtime_health_recheck !== true ||
    recoveryP2g10.requires_owner_runtime_db_recheck !== true ||
    recoveryP2g10.requires_zero_credit_callback_binding_workflow !== true ||
    recoveryP2g10.requires_zero_callback_spend_fail_fast_watchdog !== true ||
    recoveryP2g10.requires_url_encoded_webhook_secret_path !== true ||
    recoveryP2g10.requires_zero_active_billable_at_launch !== true ||
    recoveryP2g10.no_further_automatic_wsss_retry !== true ||
    recoveryP2g10.outcome_metrics_not_used_to_authorize !== true ||
    recoveryP2g10.authorization_basis !== "github_replit_webhook_secret_mismatch_only"
  )) {
    throw new Error("REFUSED_COMPACT6_P2G10_RECOVERY_BOUND");
  }
  const identityV2 = amendment.physical_identity_v2_remeasurement;
  if (identityV2 !== undefined) {
    const expectedOrder = ["WSSS", "OMAA", "MMUN"];
    if (
      identityV2.authorized !== true ||
      identityV2.current_metric_contract !== "v39-physical-flight-instance-v2" ||
      identityV2.maximum_additional_attempts_per_candidate !== 1 ||
      identityV2.exclude_legacy_from_v2_promotion !== true ||
      identityV2.requires_fresh_runtime_budget_auth !== true ||
      identityV2.outcome_metrics_not_used_to_authorize !== true ||
      !Array.isArray(identityV2.ordered_icaos) ||
      identityV2.ordered_icaos.length !== expectedOrder.length ||
      identityV2.ordered_icaos.some((icao, index) => icao !== expectedOrder[index]) ||
      !Array.isArray(identityV2.legacy_probe_requirements) ||
      identityV2.legacy_probe_requirements.length !== expectedOrder.length ||
      !String(identityV2.reason ?? "").trim()
    ) {
      throw new Error("REFUSED_COMPACT6_IDENTITY_V2_RECOVERY_CONTRACT");
    }

    const expectedLegacy: Record<string, {
      probeId: number;
      metricContractVersion: string | null;
    }> = {
      WSSS: { probeId: 9, metricContractVersion: null },
      OMAA: { probeId: 2, metricContractVersion: null },
      MMUN: {
        probeId: 10,
        metricContractVersion: "v39-physical-flight-instance-v1",
      },
    };

    const seen = new Set<string>();
    for (const requirement of identityV2.legacy_probe_requirements) {
      const icao = String(requirement.icao ?? "").toUpperCase();
      const expected = expectedLegacy[icao];
      if (
        !expected ||
        seen.has(icao) ||
        Number(requirement.probe_id) !== expected.probeId ||
        requirement.expected_status !== "completed" ||
        requirement.expected_duration_censored !== false ||
        requirement.expected_reconciliation_status !== "MATCH" ||
        requirement.expected_metric_contract_version !==
          expected.metricContractVersion
      ) {
        throw new Error(
          `REFUSED_COMPACT6_IDENTITY_V2_LEGACY_REQUIREMENT:${icao || "<missing>"}`,
        );
      }
      seen.add(icao);
    }

    if (expectedOrder.some((icao) => !seen.has(icao))) {
      throw new Error("REFUSED_COMPACT6_IDENTITY_V2_LEGACY_SET");
    }
  }

  const policy = amendment.prospective_reconciliation_policy;
  if (
    policy.external_settled_spend_is_authoritative_denominator !== true ||
    policy.internal_greater_than_external_is_hard_mismatch !== true ||
    policy.cost_item_disagreement_is_hard_mismatch !== true ||
    policy.unresolved_settlement_is_hard_failure !== true ||
    policy.applies_only_to_attempts_started_after_this_freeze !== true
  ) {
    throw new Error("REFUSED_COMPACT6_RECONCILIATION_POLICY");
  }
  if (
    policy.delivery_completeness_floor !== 1 ||
    policy.nonzero_delivery_gap_is_terminal_not_scoreable !== true
  ) {
    throw new Error("REFUSED_COMPACT6_RECONCILIATION_POLICY_V1");
  }
  if (
    amendment.stage2_policy.mode !== "conditional_confirmation_only" ||
    amendment.stage2_policy.automatic_five_four_hour_confirmations !== false
  ) {
    throw new Error("REFUSED_COMPACT6_STAGE2_POLICY");
  }
  if (
    amendment.anti_bias.candidate_subset_chosen_from_preoutcome_frozen_shortlist !== true ||
    amendment.anti_bias.no_retroactive_P2G06_pass !== true ||
    amendment.anti_bias.no_unbounded_WSSS_retry !== true
  ) {
    throw new Error("REFUSED_COMPACT6_ANTI_BIAS");
  }
  if (amendment.anti_bias.no_p2g06_calibrated_reconciliation_tolerance !== true) {
    throw new Error("REFUSED_COMPACT6_ANTI_BIAS_V1");
  }

  return { amendment, fileSha256: actual, effectiveShortlist };
}

export function compact6EffectiveArtifactV39(
  preprobe: FrozenProbeArtifact,
  effectiveShortlist: FrozenProbeCandidate[],
): FrozenProbeArtifact {
  return {
    ...preprobe,
    shortlist: [...effectiveShortlist],
  };
}
