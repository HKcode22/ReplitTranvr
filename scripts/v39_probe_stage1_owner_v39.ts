/**
 * V3.9 Gate-2 Stage-1 owner.
 * Executes at most one paid probe per invocation from the exact frozen
 * shortlist/replacement protocol. No source-code shortlist is an authority.
 */
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import {
  loadProbeExecutionArtifacts,
  PROBE_STAGE1_TARGET_MINUTES,
  type LoadedProbeExecutionArtifacts,
} from "../server/lib/disruption/probeExecution_v39";
import { executePrepaidProbeV39 } from "../server/lib/disruption/probeExecutionPrepaid_v39";
import {
  loadGate2RuntimeBindingV39,
  stage1AuthorizationScopeV39,
} from "../server/lib/disruption/phase2Gate2Runtime_v39";
import {
  selectStage2Top5,
  type Stage1ProbeEvidence,
} from "../server/lib/disruption/anchorPromotion_v39";
import {
  parseArgs,
  resolveOwnerAuthorization,
  verifyAuthFile,
} from "./v39_paid_guard_v39";
import type { AuthRecord } from "../server/lib/disruption/authRecord_v39";
import {
  compact6EffectiveArtifactV39,
  loadPhase2gCompact6AmendmentV39,
  type Phase2gCompact6AmendmentV39,
  type Phase2gEarlyPilotScopeReductionV39,
  type Phase2gP2g17MmunDeliveryGapRecoveryV39,
  type Phase2gPhysicalIdentityV2RemeasurementV39,
} from "../server/lib/disruption/phase2Compact6_v39";
import {
  assertYssyStage1StartV39,
  loadYssyOperatingHoursProtocolV39,
  yssyStage1TimeClassV39,
} from "../server/lib/disruption/yssyOperatingHours_v39";
import type { ProbeTimeClassConfig } from "../server/lib/disruption/probeExecution_v39";
import {
  PREPAID_PROBE_METRIC_CONTRACT_V39,
} from "../server/lib/disruption/prepaidProbeMetricContract_v39";

const SCOPE = "Phase 2 / Gate 2 Stage 1";
const AUTH_CLEANUP_BUFFER_MS = 5 * 60_000;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`REFUSED: ${name} is required`);
  return value;
}

function loadArtifacts(): LoadedProbeExecutionArtifacts {
  return loadProbeExecutionArtifacts({
    preprobePath: requiredEnv("ADB_PREPROBE_ARTIFACT_PATH"),
    preprobeSha256: requiredEnv("ADB_PREPROBE_ARTIFACT_SHA256"),
    runtimePath: requiredEnv("ADB_PROBE_RUNTIME_ARTIFACT_PATH"),
    runtimeSha256: requiredEnv("ADB_PROBE_RUNTIME_ARTIFACT_SHA256"),
  });
}

function loadGate2Binding() {
  return loadGate2RuntimeBindingV39({
    probeRuntimePath: requiredEnv("ADB_PROBE_RUNTIME_ARTIFACT_PATH"),
    probeRuntimeFileSha256: requiredEnv("ADB_PROBE_RUNTIME_ARTIFACT_SHA256"),
    smokePath: requiredEnv("ADB_PHASE2_SMOKE_ARTIFACT_PATH"),
    smokeRuntimePath: requiredEnv("ADB_PHASE2_SMOKE_RUNTIME_ARTIFACT_PATH"),
    smokeRuntimeFileSha256: requiredEnv("ADB_PHASE2_SMOKE_RUNTIME_ARTIFACT_SHA256"),
    preprobePath: requiredEnv("ADB_PREPROBE_ARTIFACT_PATH"),
  });
}

function verifiedStage1Auth(argv: string[], binding: ReturnType<typeof loadGate2Binding>): { record: AuthRecord; ceiling: number } {
  const controls = parseArgs(argv);
  if (!controls.authFile) throw new Error("REFUSED: --auth-file required");
  const checked = verifyAuthFile(controls.authFile, SCOPE);
  if ("error" in checked || !checked.verdict.verified) {
    throw new Error(`REFUSED: owner AUTH re-verification failed: ${"error" in checked ? checked.error : checked.verdict.reason}`);
  }
  const record = checked.record;
  const expectedScope = stage1AuthorizationScopeV39(binding);
  if (record.airportFilterWindow !== expectedScope) {
    throw new Error(`REFUSED_STAGE1_SCOPE_MISMATCH:AUTH=${record.airportFilterWindow ?? "<null>"}`);
  }
  const predecessors = [binding.smoke.evidenceId, binding.evidenceId];
  if (!Array.isArray(record.predecessorEvidenceIds) || record.predecessorEvidenceIds.length !== predecessors.length ||
      record.predecessorEvidenceIds.some((id, index) => id !== predecessors[index])) {
    throw new Error(`REFUSED_STAGE1_PREDECESSOR_MISMATCH:${predecessors.join(",")}`);
  }
  if (record.maxRestUnitsByCategory !== null && Object.values(record.maxRestUnitsByCategory).some((x) => Number(x) !== 0)) {
    throw new Error("REFUSED_STAGE1_REST_UNITS_MUST_BE_ZERO");
  }
  if (!record.cleanupOwner?.trim()) throw new Error("REFUSED_STAGE1_CLEANUP_OWNER_REQUIRED");
  const ceiling = Number(record.maxAlertCredits);
  if (!Number.isInteger(ceiling) || ceiling <= 0 || ceiling > 500) {
    throw new Error("REFUSED_STAGE1_AUTH_ALERT_CEILING_MUST_BE_1_TO_500");
  }
  const protectedExposure = binding.runtime.stage1ReservationCredits + binding.runtime.unsettledBurstMarginCredits;
  if (protectedExposure > ceiling) {
    throw new Error("REFUSED_STAGE1_RUNTIME_RESERVATION_PLUS_MARGIN_EXCEEDS_AUTH_CEILING");
  }
  return { record, ceiling };
}

function assertStage1AuthCoversTargetWindow(record: AuthRecord, now = new Date()): void {
  const expires = Date.parse(String(record.expiresAtUtc ?? ""));
  if (!Number.isFinite(expires)) throw new Error("REFUSED_STAGE1_AUTH_EXPIRY_REQUIRED");
  const targetEndWithCleanup = now.getTime() + PROBE_STAGE1_TARGET_MINUTES * 60_000 + AUTH_CLEANUP_BUFFER_MS;
  if (targetEndWithCleanup > expires) {
    throw new Error(
      `REFUSED_STAGE1_AUTH_WINDOW_TOO_SHORT:target_plus_cleanup_ends=${new Date(targetEndWithCleanup).toISOString()}:auth_expires=${record.expiresAtUtc}`,
    );
  }
}

/**
 * Safe-mode rows intentionally retain no exact provider credit delta. For the
 * pure promotion math we express the already-frozen lower/upper per-credit
 * bounds on a synthetic denominator of 1. This is algebraically identical to
 * count/credits ratios and never recreates the deleted provider account value.
 */
export interface Stage1DurableReconciliationEvidenceV39 {
  runtimeSessionId: string;
  evidenceStatus: string;
  externalSpendCredits: number | null;
  internalReceivedCredits: number;
  deliveryGapCredits: number | null;
  deliveryCompleteness: number | null;
  callbackRequestsSeen: number;
  callbackSuccess2xx: number;
  callbackFailures: number;
  durationCensored: boolean;
  stopReason: string | null;
}

export interface Stage1AttemptEvidence extends Stage1ProbeEvidence {
  probeId: number;
  probeBudgetDayId: string | null;
  runtimeSessionId: string | null;
  durationCensored: boolean;
  stopReason: string | null;
  reconciliationStatus: string | null;
  durableReconciliation: Stage1DurableReconciliationEvidenceV39 | null;
  recordedAtUtc: string;
}

export async function readStage1EvidenceV39(preprobeHash: string): Promise<Stage1AttemptEvidence[]> {
  const r = await pool.query(
    `SELECT
            p.probe_id,p.icao,p.status,p.rows_per_hour,p.credits_spent,p.unique_flights_per_credit,
            p.tail_chain_links_per_credit,p.stability,p.confirmed_unique_lower,
            p.confirmed_plus_ambiguous_upper,p.provider_content_safe_mode,
            p.confirmed_unique_lower_per_credit,p.confirmed_plus_ambiguous_upper_per_credit,
            p.metric_contract_version,p.probe_budget_day_id,p.runtime_session_id,
            p.duration_censored,p.stop_reason,p.reconciliation_status,p.recorded_at,
            e.runtime_session_id AS durable_runtime_session_id,
            e.evidence_status AS durable_evidence_status,
            e.external_spend_credits AS durable_external_spend_credits,
            e.internal_received_credits AS durable_internal_received_credits,
            e.delivery_gap_credits AS durable_delivery_gap_credits,
            e.delivery_completeness AS durable_delivery_completeness,
            e.callback_requests_seen AS durable_callback_requests_seen,
            e.callback_success_2xx AS durable_callback_success_2xx,
            e.callback_failures AS durable_callback_failures,
            e.duration_censored AS durable_duration_censored,
            e.stop_reason AS durable_stop_reason
       FROM clean.adb_anchor_probe p
       LEFT JOIN clean.adb_probe_reconciliation_evidence e
         ON e.probe_id=p.probe_id
      WHERE p.stage=1 AND p.preprobe_artifact_sha256=$1
      ORDER BY p.recorded_at ASC,p.probe_id ASC`,
    [preprobeHash],
  );
  return r.rows.map((x: any) => {
    const safe = x.provider_content_safe_mode === true;
    const lowerRate = x.confirmed_unique_lower_per_credit == null ? null : Number(x.confirmed_unique_lower_per_credit);
    const upperRate = x.confirmed_plus_ambiguous_upper_per_credit == null ? null : Number(x.confirmed_plus_ambiguous_upper_per_credit);
    const safeRates = safe && lowerRate !== null && upperRate !== null && Number.isFinite(lowerRate) && Number.isFinite(upperRate);
    return {
      probeId: Number(x.probe_id),
      probeBudgetDayId: x.probe_budget_day_id == null ? null : String(x.probe_budget_day_id),
      runtimeSessionId: x.runtime_session_id == null ? null : String(x.runtime_session_id).toLowerCase(),
      icao: String(x.icao).toUpperCase(),
      status: String(x.status),
      metricContractVersion: x.metric_contract_version == null ? null : String(x.metric_contract_version),
      rowsPerHour: x.rows_per_hour == null ? null : Number(x.rows_per_hour),
      creditsSpent: safeRates ? 1 : (x.credits_spent == null ? null : Number(x.credits_spent)),
      uniqueFlightsPerCredit: x.unique_flights_per_credit == null ? null : Number(x.unique_flights_per_credit),
      tailChainLinksPerCredit: x.tail_chain_links_per_credit == null ? null : Number(x.tail_chain_links_per_credit),
      stability: x.stability == null ? null : Number(x.stability),
      confirmedUniqueLower: safeRates ? lowerRate : (x.confirmed_unique_lower == null ? null : Number(x.confirmed_unique_lower)),
      confirmedPlusAmbiguousUpper: safeRates ? upperRate : (x.confirmed_plus_ambiguous_upper == null ? null : Number(x.confirmed_plus_ambiguous_upper)),
      durationCensored: x.duration_censored === true,
      stopReason: x.stop_reason == null ? null : String(x.stop_reason),
      reconciliationStatus: x.reconciliation_status == null ? null : String(x.reconciliation_status),
      durableReconciliation: x.durable_evidence_status == null ? null : {
        runtimeSessionId: String(x.durable_runtime_session_id).toLowerCase(),
        evidenceStatus: String(x.durable_evidence_status),
        externalSpendCredits: x.durable_external_spend_credits == null ? null : Number(x.durable_external_spend_credits),
        internalReceivedCredits: Number(x.durable_internal_received_credits),
        deliveryGapCredits: x.durable_delivery_gap_credits == null ? null : Number(x.durable_delivery_gap_credits),
        deliveryCompleteness: x.durable_delivery_completeness == null ? null : Number(x.durable_delivery_completeness),
        callbackRequestsSeen: Number(x.durable_callback_requests_seen),
        callbackSuccess2xx: Number(x.durable_callback_success_2xx),
        callbackFailures: Number(x.durable_callback_failures),
        durationCensored: x.durable_duration_censored === true,
        stopReason: x.durable_stop_reason == null ? null : String(x.durable_stop_reason),
      },
      recordedAtUtc: new Date(x.recorded_at).toISOString(),
    };
  });
}

const MAX_INFRASTRUCTURE_INVALID_RERUNS_PER_PRIMARY = 1;

export function isP2g06PostfixWsssValidationEligibleV39(
  attempts: Stage1AttemptEvidence[],
): boolean {
  const wsss = attempts.filter((row) => row.icao.toUpperCase() === "WSSS");
  if (wsss.length !== 2) return false;
  const first = wsss[0];
  const second = wsss[1];
  return (
    isInfrastructureInvalidStage1AttemptV39(first) &&
    second.probeId === 4 &&
    second.status === "failed" &&
    second.durationCensored === false &&
    second.reconciliationStatus === "MISMATCH" &&
    second.stopReason === "external_internal_credit_mismatch"
  );
}

export function isP2g07Provider502RecoveryEligibleV39(
  attempts: Stage1AttemptEvidence[],
): boolean {
  const wsss = attempts.filter((row) => row.icao.toUpperCase() === "WSSS");
  if (wsss.length !== 3) return false;
  const [first, second, third] = wsss;
  return (
    isInfrastructureInvalidStage1AttemptV39(first) &&
    second.probeId === 4 &&
    second.status === "failed" &&
    second.durationCensored === false &&
    second.reconciliationStatus === "MISMATCH" &&
    second.stopReason === "external_internal_credit_mismatch" &&
    third.probeId === 5 &&
    third.status === "failed" &&
    third.durationCensored === true &&
    third.reconciliationStatus === "UNRESOLVED" &&
    third.stopReason === "subscription_delete_failed"
  );
}

export function isP2g08Balance502RecoveryEligibleV39(
  attempts: Stage1AttemptEvidence[],
): boolean {
  const wsss = attempts.filter((row) => row.icao.toUpperCase() === "WSSS");
  if (wsss.length !== 4) return false;
  const [first, second, third, fourth] = wsss;
  return (
    isInfrastructureInvalidStage1AttemptV39(first) &&
    second.probeId === 4 &&
    second.status === "failed" &&
    second.durationCensored === false &&
    second.reconciliationStatus === "MISMATCH" &&
    second.stopReason === "external_internal_credit_mismatch" &&
    third.probeId === 5 &&
    third.status === "failed" &&
    third.durationCensored === true &&
    third.reconciliationStatus === "UNRESOLVED" &&
    third.stopReason === "subscription_delete_failed" &&
    fourth.probeId === 6 &&
    fourth.status === "failed" &&
    fourth.durationCensored === true &&
    fourth.reconciliationStatus === "MATCH" &&
    fourth.stopReason === "balance_read_failed_after_retries"
  );
}

export function isP2g09HostResetRecoveryEligibleV39(
  attempts: Stage1AttemptEvidence[],
): boolean {
  const wsss = attempts.filter((row) => row.icao.toUpperCase() === "WSSS");
  if (wsss.length !== 5) return false;
  const [first, second, third, fourth, fifth] = wsss;
  return (
    isInfrastructureInvalidStage1AttemptV39(first) &&
    second.probeId === 4 &&
    second.status === "failed" &&
    second.durationCensored === false &&
    second.reconciliationStatus === "MISMATCH" &&
    second.stopReason === "external_internal_credit_mismatch" &&
    third.probeId === 5 &&
    third.status === "failed" &&
    third.durationCensored === true &&
    third.reconciliationStatus === "UNRESOLVED" &&
    third.stopReason === "subscription_delete_failed" &&
    fourth.probeId === 6 &&
    fourth.status === "failed" &&
    fourth.durationCensored === true &&
    fourth.reconciliationStatus === "MATCH" &&
    fourth.stopReason === "balance_read_failed_after_retries" &&
    fifth.probeId === 7 &&
    fifth.status === "failed" &&
    fifth.durationCensored === true &&
    fifth.reconciliationStatus === "UNRESOLVED" &&
    fifth.stopReason === "supervisor_child_exit_recovered"
  );
}

export function isP2g10SecretMismatchRecoveryEligibleV39(
  attempts: Stage1AttemptEvidence[],
): boolean {
  const wsss = attempts.filter((row) => row.icao.toUpperCase() === "WSSS");
  if (wsss.length !== 6) return false;
  const prior = wsss.slice(0, 5);
  const sixth = wsss[5];
  return (
    isP2g09HostResetRecoveryEligibleV39(prior) &&
    sixth.probeId === 8 &&
    sixth.status === "failed" &&
    sixth.durationCensored === true &&
    sixth.reconciliationStatus === "UNRESOLVED" &&
    sixth.stopReason === "supervisor_child_exit_recovered"
  );
}

function exactLegacyRequirementMatchesV39(
  requirement: Phase2gPhysicalIdentityV2RemeasurementV39["legacy_probe_requirements"][number],
  attempts: Stage1AttemptEvidence[],
): boolean {
  const matches = attempts.filter(
    (row) =>
      row.probeId === requirement.probe_id &&
      row.icao.toUpperCase() === requirement.icao,
  );
  if (matches.length !== 1) return false;
  const row = matches[0];
  return (
    row.status === requirement.expected_status &&
    row.durationCensored === requirement.expected_duration_censored &&
    row.reconciliationStatus === requirement.expected_reconciliation_status &&
    row.metricContractVersion === requirement.expected_metric_contract_version
  );
}

export function exactP2g17MmunTechnicalInvalidMatchesV39(
  recovery: Phase2gP2g17MmunDeliveryGapRecoveryV39,
  row: Stage1AttemptEvidence,
): boolean {
  const durable = row.durableReconciliation;
  if (!durable) return false;
  return (
    row.probeId === recovery.failed_probe_id &&
    row.icao.toUpperCase() === recovery.icao &&
    row.probeBudgetDayId === recovery.expected_probe_budget_day_id &&
    row.runtimeSessionId === recovery.expected_runtime_session_id &&
    row.metricContractVersion === recovery.expected_metric_contract_version &&
    row.status === recovery.expected_anchor_status &&
    row.reconciliationStatus === recovery.expected_anchor_reconciliation_status &&
    row.stopReason === recovery.expected_anchor_stop_reason &&
    durable.runtimeSessionId === recovery.expected_runtime_session_id &&
    durable.evidenceStatus === recovery.durable_evidence_status &&
    durable.externalSpendCredits === recovery.durable_external_spend_credits &&
    durable.internalReceivedCredits === recovery.durable_internal_received_credits &&
    durable.deliveryGapCredits === recovery.durable_delivery_gap_credits &&
    durable.deliveryCompleteness !== null &&
    Math.abs(
      durable.deliveryCompleteness - recovery.durable_delivery_completeness,
    ) <= 1e-12 &&
    durable.durationCensored === recovery.durable_duration_censored &&
    durable.stopReason === recovery.durable_stop_reason &&
    durable.callbackRequestsSeen === recovery.durable_callback_requests_seen &&
    durable.callbackSuccess2xx === recovery.durable_callback_success_2xx &&
    durable.callbackFailures === recovery.durable_callback_failures
  );
}

/**
 * Prospective one-time recovery for the physical-identity contract correction.
 *
 * This is deliberately NOT a generic "rerun obsolete evidence" rule. The
 * machine-readable compact amendment must name the exact historical rows and
 * fixed candidate order. Each candidate gets at most one v2 attempt, regardless
 * of that attempt's outcome, so the recovery cannot become an outcome-driven
 * retry loop.
 */
export function choosePhysicalIdentityV2RemeasurementTargetV39(
  recovery: Phase2gPhysicalIdentityV2RemeasurementV39 | undefined,
  attempts: Stage1AttemptEvidence[],
  technicalInvalidRecovery?: Phase2gP2g17MmunDeliveryGapRecoveryV39,
): "WSSS" | "OMAA" | "MMUN" | null {
  if (!recovery?.authorized) return null;

  if (
    recovery.current_metric_contract !== PREPAID_PROBE_METRIC_CONTRACT_V39
  ) {
    throw new Error(
      `REFUSED_IDENTITY_V2_RECOVERY_CONTRACT_MISMATCH:freeze=${recovery.current_metric_contract}:code=${PREPAID_PROBE_METRIC_CONTRACT_V39}`,
    );
  }

  for (const requirement of recovery.legacy_probe_requirements) {
    if (!exactLegacyRequirementMatchesV39(requirement, attempts)) {
      throw new Error(
        `REFUSED_IDENTITY_V2_RECOVERY_LEGACY_EVIDENCE_MISMATCH:${requirement.icao}:probe=${requirement.probe_id}`,
      );
    }
  }

  const currentAttempts = new Map<string, Stage1AttemptEvidence[]>();
  for (const icao of recovery.ordered_icaos) {
    currentAttempts.set(
      icao,
      attempts.filter(
        (row) =>
          row.icao.toUpperCase() === icao &&
          row.metricContractVersion === PREPAID_PROBE_METRIC_CONTRACT_V39,
      ),
    );
  }

  let technicalInvalidProbeId: number | null = null;
  if (technicalInvalidRecovery?.authorized === true) {
    const matches = attempts.filter((row) =>
      exactP2g17MmunTechnicalInvalidMatchesV39(
        technicalInvalidRecovery,
        row,
      ),
    );
    if (matches.length !== 1) {
      throw new Error(
        `REFUSED_P2G17_MMUN_RECOVERY_EVIDENCE_MISMATCH:matches=${matches.length}`,
      );
    }
    technicalInvalidProbeId = technicalInvalidRecovery.failed_probe_id;
  }

  const consumingAttempts = new Map<string, Stage1AttemptEvidence[]>();
  for (const [icao, rows] of currentAttempts) {
    const consuming = rows.filter(
      (row) =>
        !(
          technicalInvalidProbeId !== null &&
          icao === "MMUN" &&
          row.probeId === technicalInvalidProbeId
        ),
    );
    consumingAttempts.set(icao, consuming);
    if (
      consuming.length >
      recovery.maximum_additional_attempts_per_candidate
    ) {
      throw new Error(
        `REFUSED_IDENTITY_V2_RECOVERY_RETRY_LIMIT:${icao}:attempts=${consuming.length}`,
      );
    }
  }

  for (let index = 0; index < recovery.ordered_icaos.length; index += 1) {
    const icao = recovery.ordered_icaos[index];
    const rows = consumingAttempts.get(icao) ?? [];

    if (rows.length === 0) {
      const outOfOrder = recovery.ordered_icaos
        .slice(index + 1)
        .find((later) => (consumingAttempts.get(later) ?? []).length > 0);
      if (outOfOrder) {
        throw new Error(
          `REFUSED_IDENTITY_V2_RECOVERY_OUT_OF_ORDER:missing=${icao}:later=${outOfOrder}`,
        );
      }
      return icao;
    }
  }

  return null;
}

export function hasObsoleteCompletedPrimaryEvidenceV39(
  shortlist: Array<{ icao: string }>,
  attempts: Stage1AttemptEvidence[],
): boolean {
  const allowed = new Set(shortlist.map((row) => row.icao.toUpperCase()));
  return attempts.some(
    (row) =>
      allowed.has(row.icao.toUpperCase()) &&
      row.status === "completed" &&
      row.metricContractVersion !== PREPAID_PROBE_METRIC_CONTRACT_V39,
  );
}

export function isInfrastructureInvalidStage1AttemptV39(attempt: Stage1AttemptEvidence): boolean {
  if (attempt.status !== "failed") return false;
  if (attempt.durationCensored !== true) return false;
  if (attempt.reconciliationStatus !== "UNRESOLVED") return false;
  const reason = String(attempt.stopReason ?? "");
  return reason.startsWith("supervisor_child_exit");
}

/**
 * Prospective early-pilot scope selector.
 *
 * Historical WSSS/OMAA/MMUN evidence remains immutable. New scope targets are
 * one-shot: a failed or scientifically invalid attempt is never automatically
 * retried or skipped.
 *
 * Scope v2 additionally blocks YSSY execution until a separately frozen
 * local-operating-hours-aware protocol resolves the Sydney curfew/time-class
 * confound.
 */
export function chooseEarlyPilotScopeTargetV39(
  scope: Phase2gEarlyPilotScopeReductionV39,
  attempts: Stage1AttemptEvidence[],
): "YSSY" | "SKBO" | null {
  for (const requirement of scope.baseline_completed_probes) {
    const matches = attempts.filter(
      (row) =>
        row.probeId === requirement.probe_id &&
        row.icao.toUpperCase() === requirement.icao,
    );
    if (matches.length !== 1) {
      throw new Error(
        `REFUSED_EARLY_PILOT_BASELINE_EVIDENCE_MISMATCH:${requirement.icao}:probe=${requirement.probe_id}:matches=${matches.length}`,
      );
    }
    const row = matches[0];
    const durable = row.durableReconciliation;
    if (
      row.status !== requirement.expected_status ||
      row.metricContractVersion !== requirement.expected_metric_contract_version ||
      row.reconciliationStatus !== requirement.expected_reconciliation_status ||
      row.durationCensored !== requirement.expected_duration_censored ||
      row.stopReason !== requirement.expected_stop_reason ||
      durable?.evidenceStatus !== "MATCH" ||
      durable.deliveryGapCredits !== 0 ||
      durable.deliveryCompleteness !== 1 ||
      durable.callbackFailures !== 0 ||
      durable.durationCensored !== false ||
      durable.stopReason !== null
    ) {
      throw new Error(
        `REFUSED_EARLY_PILOT_BASELINE_STATE_MISMATCH:${requirement.icao}:probe=${requirement.probe_id}`,
      );
    }
    const capacityPass =
      row.rowsPerHour !== null &&
      Number.isFinite(row.rowsPerHour) &&
      row.rowsPerHour >= scope.capacity_gate_rows_per_hour;
    if (
      (requirement.expected_capacity_gate === "pass" && !capacityPass) ||
      (requirement.expected_capacity_gate === "fail" && capacityPass)
    ) {
      throw new Error(
        `REFUSED_EARLY_PILOT_BASELINE_CAPACITY_MISMATCH:${requirement.icao}:rows_per_hour=${row.rowsPerHour}`,
      );
    }
  }

  for (const target of scope.ordered_new_targets) {
    const rows = attempts.filter((row) => row.icao.toUpperCase() === target);
    if (rows.length === 0) {
      if (
        scope.scope_version !==
          "v39-phase2g-early-pilot-scope-reduction-1" &&
        target === "YSSY" &&
        scope.target_execution_authorized?.YSSY !== true
      ) {
        throw new Error(
          `REFUSED_EARLY_PILOT_TARGET_EXECUTION_NOT_AUTHORIZED:YSSY:${scope.yssy_execution_block_reason ?? "local_time_protocol_required"}`,
        );
      }
      return target;
    }

    if (rows.length !== 1) {
      throw new Error(
        `REFUSED_EARLY_PILOT_TARGET_ATTEMPT_COUNT:${target}:attempts=${rows.length}`,
      );
    }

    const row = rows[0];
    const durable = row.durableReconciliation;
    const scientificallyValid =
      row.status === "completed" &&
      row.metricContractVersion === PREPAID_PROBE_METRIC_CONTRACT_V39 &&
      row.durationCensored === false &&
      row.stopReason === null &&
      row.reconciliationStatus === "MATCH" &&
      durable?.evidenceStatus === "MATCH" &&
      durable.deliveryGapCredits === 0 &&
      durable.deliveryCompleteness === 1 &&
      durable.callbackFailures === 0 &&
      durable.durationCensored === false &&
      durable.stopReason === null;

    if (!scientificallyValid) {
      throw new Error(
        `REFUSED_EARLY_PILOT_TARGET_REQUIRES_MANUAL_REVIEW:${target}:probe=${row.probeId}:status=${row.status}:reconciliation=${row.reconciliationStatus ?? "<null>"}`,
      );
    }
  }

  return null;
}

export function chooseNextPrimaryStage1TargetV39(
  shortlist: Array<{ icao: string }>,
  attempts: Stage1AttemptEvidence[],
): string | null {
  const grouped = new Map<string, Stage1AttemptEvidence[]>();
  for (const attempt of attempts) {
    const key = attempt.icao.toUpperCase();
    const rows = grouped.get(key) ?? [];
    rows.push(attempt);
    grouped.set(key, rows);
  }

  for (const candidate of shortlist) {
    const icao = candidate.icao.toUpperCase();
    const rows = grouped.get(icao) ?? [];
    if (rows.length === 0) return icao;

    if (rows.some((row) => row.status === "completed")) continue;

    const latest = rows[rows.length - 1];
    const infraInvalidCount = rows.filter(isInfrastructureInvalidStage1AttemptV39).length;
    if (
      rows.length === 1 &&
      infraInvalidCount <= MAX_INFRASTRUCTURE_INVALID_RERUNS_PER_PRIMARY &&
      isInfrastructureInvalidStage1AttemptV39(latest)
    ) {
      return icao;
    }

    // Any second attempt, abandoned row, or non-infrastructure failure is
    // terminal for the ordinary sequencing rule.
  }
  return null;
}

export function chooseNextStage1TargetV39(
  artifactForSelection: LoadedProbeExecutionArtifacts["preprobe"],
  evidence: Stage1AttemptEvidence[],
  amendment: Phase2gCompact6AmendmentV39 | null,
): { icao: string; replacement: boolean } | null {
  const identityRecovery = amendment?.physical_identity_v2_remeasurement;
  if (identityRecovery?.authorized === true) {
    const target = choosePhysicalIdentityV2RemeasurementTargetV39(
      identityRecovery,
      evidence,
      amendment?.p2g17_mmun_delivery_gap_recovery_rerun,
    );
    if (target) return { icao: target, replacement: false };
  } else if (
    hasObsoleteCompletedPrimaryEvidenceV39(
      artifactForSelection.shortlist,
      evidence,
    )
  ) {
    throw new Error(
      "REFUSED_OBSOLETE_COMPLETED_METRIC_CONTRACT_REQUIRES_FROZEN_RECOVERY",
    );
  }

  if (
    amendment?.p2g10_secret_mismatch_recovery_rerun?.authorized === true &&
    isP2g10SecretMismatchRecoveryEligibleV39(evidence)
  ) {
    return { icao: "WSSS", replacement: false };
  }
  if (
    amendment?.p2g09_hostreset_recovery_rerun?.authorized === true &&
    isP2g09HostResetRecoveryEligibleV39(evidence)
  ) {
    return { icao: "WSSS", replacement: false };
  }
  if (
    amendment?.p2g08_balance502_recovery_rerun?.authorized === true &&
    isP2g08Balance502RecoveryEligibleV39(evidence)
  ) {
    return { icao: "WSSS", replacement: false };
  }
  if (
    amendment?.p2g07_provider502_recovery_rerun?.authorized === true &&
    isP2g07Provider502RecoveryEligibleV39(evidence)
  ) {
    return { icao: "WSSS", replacement: false };
  }
  if (
    amendment !== null &&
    isP2g06PostfixWsssValidationEligibleV39(evidence)
  ) {
    return { icao: "WSSS", replacement: false };
  }

  const earlyPilotScope = amendment?.early_pilot_scope_reduction;
  if (earlyPilotScope?.authorized === true) {
    const target = chooseEarlyPilotScopeTargetV39(
      earlyPilotScope,
      evidence,
    );
    return target ? { icao: target, replacement: false } : null;
  }

  const nextPrimary = chooseNextPrimaryStage1TargetV39(
    artifactForSelection.shortlist,
    evidence,
  );
  if (nextPrimary) return { icao: nextPrimary, replacement: false };

  const promotion = selectStage2Top5(artifactForSelection, evidence);
  if (promotion.replacementsNeeded === 0) return null;
  if (!promotion.nextReplacement) {
    throw new Error(
      `REFUSED_GATE2_UNSAT: ${promotion.replacementsNeeded} Stage-1-valid candidate(s) still needed but frozen replacements are exhausted`,
    );
  }
  return { icao: promotion.nextReplacement, replacement: true };
}

export async function runStage1Owner(argv = process.argv.slice(2)): Promise<number> {
  const auth = resolveOwnerAuthorization(SCOPE, argv);
  const artifacts = loadArtifacts();
  const binding = loadGate2Binding();
  if (artifacts.preprobeSha256 !== binding.smoke.preprobe.fileSha256 || artifacts.runtimeSha256 !== binding.runtimeFileSha256) {
    throw new Error("REFUSED_STAGE1_EXECUTION_ARTIFACT_BINDING_MISMATCH");
  }
  const approved = verifiedStage1Auth(argv, binding);
  assertStage1AuthCoversTargetWindow(approved.record);
  const evidence = await readStage1EvidenceV39(artifacts.preprobeSha256);
  const compact6 = artifacts.runtime.stage1AmendmentSha256
    ? loadPhase2gCompact6AmendmentV39({
        expectedSha256: artifacts.runtime.stage1AmendmentSha256,
        sourcePreprobeFileSha256: artifacts.preprobeSha256,
        preprobe: artifacts.preprobe,
      })
    : null;
  const selectionArtifact = compact6
    ? {
        ...artifacts.preprobe,
        shortlist: compact6.effectiveShortlist,
      }
    : artifacts.preprobe;
  const next = chooseNextStage1TargetV39(
    selectionArtifact,
    evidence,
    compact6?.amendment ?? null,
  );

  let stage1TimeClassOverride: ProbeTimeClassConfig | undefined;
  if (next?.icao === "YSSY") {
    const scope = compact6?.amendment.early_pilot_scope_reduction;
    if (
      scope?.scope_version !==
        "v39-phase2g-early-pilot-scope-reduction-3" ||
      scope.target_execution_authorized?.YSSY !== true ||
      !scope.yssy_local_operating_hours_protocol_file ||
      !scope.yssy_local_operating_hours_protocol_sha256
    ) {
      throw new Error(
        "REFUSED_YSSY_STAGE1_PROTOCOL_NOT_MACHINE_AUTHORIZED",
      );
    }

    const loadedYssy = loadYssyOperatingHoursProtocolV39({
      expectedSha256:
        scope.yssy_local_operating_hours_protocol_sha256,
      path: scope.yssy_local_operating_hours_protocol_file,
    });
    assertYssyStage1StartV39(new Date(), loadedYssy.protocol);
    stage1TimeClassOverride = yssyStage1TimeClassV39(
      loadedYssy.protocol,
      artifacts.preprobe.probeTimeClass,
    );
  }

  if (!next) {
    const promotion = selectStage2Top5(selectionArtifact, evidence);
    console.log(JSON.stringify({
      schema: "v39.anchor-stage1-evidence.v3",
      status: "PASS",
      authorizationId: auth.authId,
      preprobeArtifactSha256: artifacts.preprobeSha256,
      runtimeArtifactSha256: artifacts.runtimeSha256,
      gate2RuntimeEvidenceId: binding.evidenceId,
      smokeEvidenceId: binding.smoke.evidenceId,
      primaryStage1Complete: promotion.primaryStage1Complete,
      stage1ValidForPromotion: promotion.ranked.length,
      replacementsNeeded: promotion.replacementsNeeded,
      referenceIcao: promotion.referenceIcao,
      ambiguityMembershipInvariant: promotion.ambiguityMembershipInvariant,
      providerContentSafeMode: true,
      stage1AmendmentSha256: artifacts.runtime.stage1AmendmentSha256,
      compact6: compact6 !== null,
      message: "Stage 1/replacement requirements complete; no provider call made",
    }));
    return 0;
  }

  const explicitIndex = argv.indexOf("--icao");
  if (explicitIndex >= 0) {
    const explicit = String(argv[explicitIndex + 1] ?? "").toUpperCase();
    if (explicit !== next.icao) {
      throw new Error(`REFUSED_STAGE1_ORDER: next frozen candidate is ${next.icao}, not ${explicit || "<missing>"}`);
    }
  }

  const result = await executePrepaidProbeV39({
    stage: 1,
    icao: next.icao,
    allowReplacement: next.replacement,
    artifacts,
    authMaxAlertCredits: approved.ceiling,
    timeClassOverride: stage1TimeClassOverride,
  });
  const deferredCleanup = process.env.V39_DEFER_PROVIDER_CONTENT_CLEANUP === "1";
  const safeTerminal =
    result.status === "completed" ||
    (deferredCleanup && result.status === "settling");
  if (!safeTerminal || result.durationCensored || result.stopReason !== null) {
    throw new Error(`REFUSED_STAGE1_PROBE_FAILED: ${next.icao} ${result.stopReason ?? (result.durationCensored ? "duration_censored" : result.status)}`);
  }
  console.log(JSON.stringify({
    schema: "v39.anchor-stage1-execution.v3",
    status: result.status === "settling" ? "PASS_PROVIDER_SAFE_AWAITING_CLEANUP" : "PASS",
    authorizationId: auth.authId,
    preprobeArtifactSha256: artifacts.preprobeSha256,
    runtimeArtifactSha256: artifacts.runtimeSha256,
    gate2RuntimeEvidenceId: binding.evidenceId,
    smokeEvidenceId: binding.smoke.evidenceId,
    probeBudgetDayId: artifacts.runtime.probeBudgetDayId,
    icao: next.icao,
    replacement: next.replacement,
    probeId: result.probeId,
    providerContentSafeMode: true,
    stage1AmendmentSha256: artifacts.runtime.stage1AmendmentSha256,
    compact6: compact6 !== null,
    durationCensored: result.durationCensored,
    stopReason: result.stopReason,
    cleanupPending: result.status === "settling",
    message: result.status === "settling"
      ? "Provider deleted and exact reconciliation persisted; exact-session Replit cleanup is pending with zero provider exposure"
      : "One sequential frozen Stage-1 probe completed through isolated App-Storage/UNLOGGED runtime",
  }));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runStage1Owner().catch((error: any) => {
    console.error(JSON.stringify({
      schema: "v39.anchor-stage1-execution.v3",
      status: "FAIL",
      error: error?.message ?? String(error),
    }));
    process.exitCode = 1;
  }).finally(async () => {
    await pool.end().catch(() => undefined);
  });
}