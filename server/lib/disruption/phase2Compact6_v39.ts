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
  prospective_reconciliation_policy: {
    external_settled_spend_is_authoritative_denominator: true;
    delivery_completeness_floor: number;
    nonzero_delivery_gap_is_terminal_not_scoreable: true;
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
    : [PHASE2G_COMPACT6_RECOVERY_ARTIFACT_PATH, PHASE2G_COMPACT6_ARTIFACT_PATH];
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
  if (
    amendment.prospective_reconciliation_policy.external_settled_spend_is_authoritative_denominator !== true ||
    amendment.prospective_reconciliation_policy.delivery_completeness_floor !== 1 ||
    amendment.prospective_reconciliation_policy.nonzero_delivery_gap_is_terminal_not_scoreable !== true ||
    amendment.prospective_reconciliation_policy.internal_greater_than_external_is_hard_mismatch !== true ||
    amendment.prospective_reconciliation_policy.cost_item_disagreement_is_hard_mismatch !== true ||
    amendment.prospective_reconciliation_policy.unresolved_settlement_is_hard_failure !== true ||
    amendment.prospective_reconciliation_policy.applies_only_to_attempts_started_after_this_freeze !== true
  ) {
    throw new Error("REFUSED_COMPACT6_RECONCILIATION_POLICY");
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
    amendment.anti_bias.no_unbounded_WSSS_retry !== true ||
    amendment.anti_bias.no_p2g06_calibrated_reconciliation_tolerance !== true
  ) {
    throw new Error("REFUSED_COMPACT6_ANTI_BIAS");
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
