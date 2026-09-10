import { createHash } from "crypto";

export const GATE0_PHASE_GATE = "Phase 1 / Gate 0";
export const MAX_DESIGN_CEILING = 57_900;
/** Current-new/re-subscribed RapidAPI Ultra planning reference only. */
export const CURRENT_NEW_RAPIDAPI_ULTRA_BASELINE_UNITS = 50_000;

export const REST_CATEGORIES = [
  "fids_base_units",
  "fids_split_units",
  "fids_retry_unit_budget",
  "validation_unit_budget",
  "outcome_rest_unit_budget",
  "history_bootstrap_unit_budget",
  "diagnostic_unit_budget",
] as const;

export const PRE_RUN_SUBCAPS = [
  "safety_smoke",
  "stage1_candidates_and_replacements",
  "stage2_confirmations_and_replacements",
  "gate3",
  "gate05",
  "gate4_live_check",
] as const;

export type SubscriptionChannel = "rapidapi" | "api_market" | "direct" | "custom";
export type PlanVersionBasis = "current_new_subscription" | "grandfathered" | "custom_contract" | "provider_revised";
type RestCategory = typeof REST_CATEGORIES[number];
type PreRunSubcap = typeof PRE_RUN_SUBCAPS[number];

export interface RapidApiQuotaEvidence {
  observed_at_utc: string;
  api_units_limit: number;
  api_units_remaining: number;
  api_units_reset_seconds: number;
  api_units_reset_at_utc: string;
  requests_limit: number;
  requests_remaining: number;
  requests_reset_seconds: number;
  request_id: string | null;
  rapidapi_region: string | null;
  rapidapi_version: string | null;
}

export interface Gate0AccountEvidence {
  schema_version: "v3.9-gate0-account-evidence-3";
  gathered_at_utc: string;
  provenance: string;
  active_subscribed_plan: string;
  plan_version_basis: PlanVersionBasis;
  entitlement_verified_for_active_subscription: boolean;
  account_identity_verified: boolean;
  account_identity_evidence: string;
  subscription_channel: SubscriptionChannel;
  account_plan_id: string;
  billing_cycle_start_utc?: string | null;
  billing_cycle_start_basis: string;
  billing_cycle_end_utc: string;
  cycle_entitlement_units: number;
  api_units_consumed_before_freeze: number;
  api_units_remaining: number;
  /** Human/project authorization ceiling for total API-unit consumption in this provider cycle. */
  project_cycle_api_unit_ceiling: number;
  rapidapi_quota_headers: RapidApiQuotaEvidence;
  opening_nonexpiring_alert_balance: number;
  fids_endpoint: string;
  fids_tier: string;
  fids_units_per_request: number;
  rate_limit_and_account_mechanics: string;
  active_subscription_inventory: Array<{
    id: string;
    active: boolean;
    billing_type: string;
    subject_type: string | null;
    subject_id: string | null;
  }>;

  // The fields below belong to the later exact funding/budget freeze. They may
  // remain null/absent at Gate 0 when the Plan explicitly generates them later.
  refill_history?: Array<{ occurred_at_utc: string; credits: number; api_units: number }> | null;
  refill_conversion_api_units_per_credit?: number | null;
  refill_min_credits?: number | null;
  refill_max_credits?: number | null;
  alert_balance_cap_credits?: number | null;
  authorized_alert_refill_credits?: number | null;
  authorized_alert_refill_units?: number | null;
  protected_alert_floor?: number | null;
  ending_alert_margin?: number | null;
  pre_smoke_unsettled_burst_margin_credits?: number | null;
  protected_api_floor_units?: number | null;
  ending_api_margin_units?: number | null;
  pre_run_alert_subcaps?: Partial<Record<PreRunSubcap, number>> | null;
  pre_run_alert_spend_ceiling?: number | null;
  phase6_alert_spend_ceiling?: number | null;
  unallocated_alert_credits?: number | null;
  rest_categories?: Partial<Record<RestCategory, number>> | null;
  unallocated_api_units?: number | null;
}

export interface Gate0Artifact {
  schema_version: "v3.9-gate0-artifact-3";
  phase_gate: typeof GATE0_PHASE_GATE;
  evidence_id: string;
  authorization_id: string;
  /** Gate-0 account/subscription verification only; never authorizes paid work. */
  status: "PASS" | "BLOCKED";
  reasons: string[];
  budget_freeze_status: "READY" | "BLOCKED" | "BLOCKED_LATER_LIVE_VALUE";
  budget_reasons: string[];
  budget_pending_fields: string[];
  evidence_items: Record<string, unknown>;
  artifact_sha256: string;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

export function serializeGate0Artifact(artifact: Gate0Artifact): string {
  return `${canonical(artifact)}\n`;
}

function finiteNonnegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function positiveInteger(value: unknown): value is number {
  return finiteNonnegative(value) && value > 0;
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validIso(value: unknown): value is string {
  return text(value) && Number.isFinite(Date.parse(value));
}

function addBudgetNumber(
  evidence: Partial<Gate0AccountEvidence>,
  key: keyof Gate0AccountEvidence,
  pending: string[],
  reasons: string[],
): void {
  const value = evidence[key];
  if (value === undefined || value === null) pending.push(String(key));
  else if (!finiteNonnegative(value)) reasons.push(`MISSING_OR_INVALID:${String(key)}`);
}

function inspectBudgetFreeze(evidence: Partial<Gate0AccountEvidence>): {
  pending: string[];
  reasons: string[];
} {
  const pending: string[] = [];
  const reasons: string[] = [];

  if (evidence.refill_history === undefined || evidence.refill_history === null) pending.push("refill_history");
  else if (!Array.isArray(evidence.refill_history)) reasons.push("MISSING_OR_INVALID:refill_history");

  const numericKeys: Array<keyof Gate0AccountEvidence> = [
    "refill_conversion_api_units_per_credit", "refill_min_credits", "refill_max_credits",
    "alert_balance_cap_credits", "authorized_alert_refill_credits", "authorized_alert_refill_units",
    "protected_alert_floor", "ending_alert_margin", "pre_smoke_unsettled_burst_margin_credits",
    "protected_api_floor_units", "ending_api_margin_units", "pre_run_alert_spend_ceiling",
    "phase6_alert_spend_ceiling", "unallocated_alert_credits", "unallocated_api_units",
  ];
  for (const key of numericKeys) addBudgetNumber(evidence, key, pending, reasons);

  if (evidence.refill_conversion_api_units_per_credit !== undefined && evidence.refill_conversion_api_units_per_credit !== null &&
      evidence.refill_conversion_api_units_per_credit !== 1) reasons.push("INVALID:refill_conversion_not_1_to_1");
  if (finiteNonnegative(evidence.protected_alert_floor) && evidence.protected_alert_floor < 1_000) {
    reasons.push("INVALID:protected_alert_floor_below_1000");
  }

  if (evidence.pre_run_alert_subcaps === undefined || evidence.pre_run_alert_subcaps === null) {
    for (const key of PRE_RUN_SUBCAPS) pending.push(`pre_run_alert_subcaps.${key}`);
  } else {
    for (const key of PRE_RUN_SUBCAPS) {
      const value = evidence.pre_run_alert_subcaps[key];
      if (value === undefined || value === null) pending.push(`pre_run_alert_subcaps.${key}`);
      else if (!finiteNonnegative(value)) reasons.push(`MISSING_OR_INVALID:pre_run_alert_subcaps.${key}`);
    }
  }

  if (evidence.rest_categories === undefined || evidence.rest_categories === null) {
    for (const key of REST_CATEGORIES) pending.push(`rest_categories.${key}`);
  } else {
    for (const key of REST_CATEGORIES) {
      const value = evidence.rest_categories[key];
      if (value === undefined || value === null) pending.push(`rest_categories.${key}`);
      else if (!finiteNonnegative(value)) reasons.push(`MISSING_OR_INVALID:rest_categories.${key}`);
    }
  }

  if (pending.length === 0 && reasons.length === 0) {
    const e = evidence as Gate0AccountEvidence & {
      refill_history: Array<{ occurred_at_utc: string; credits: number; api_units: number }>;
      refill_conversion_api_units_per_credit: number;
      refill_min_credits: number;
      refill_max_credits: number;
      alert_balance_cap_credits: number;
      authorized_alert_refill_credits: number;
      authorized_alert_refill_units: number;
      protected_alert_floor: number;
      ending_alert_margin: number;
      pre_smoke_unsettled_burst_margin_credits: number;
      protected_api_floor_units: number;
      ending_api_margin_units: number;
      pre_run_alert_subcaps: Record<PreRunSubcap, number>;
      pre_run_alert_spend_ceiling: number;
      phase6_alert_spend_ceiling: number;
      unallocated_alert_credits: number;
      rest_categories: Record<RestCategory, number>;
      unallocated_api_units: number;
    };

    const preRunSum = PRE_RUN_SUBCAPS.reduce((sum, key) => sum + e.pre_run_alert_subcaps[key], 0);
    if (preRunSum !== e.pre_run_alert_spend_ceiling) reasons.push("IDENTITY:pre_run_subcap_sum");
    if (e.authorized_alert_refill_credits !== e.authorized_alert_refill_units) reasons.push("IDENTITY:authorized_refill_units");

    const alertAvailable = e.opening_nonexpiring_alert_balance + e.authorized_alert_refill_credits;
    const phase6Remainder = alertAvailable - e.pre_run_alert_spend_ceiling - e.protected_alert_floor - e.ending_alert_margin;
    const feasiblePhase6Max = Math.min(MAX_DESIGN_CEILING, phase6Remainder);
    if (phase6Remainder < 0 || e.phase6_alert_spend_ceiling > feasiblePhase6Max) {
      reasons.push("IDENTITY:phase6_ceiling_exceeds_feasible_max");
    }
    const alertRight = e.pre_run_alert_spend_ceiling + e.phase6_alert_spend_ceiling + e.protected_alert_floor +
      e.ending_alert_margin + e.unallocated_alert_credits;
    if (alertAvailable !== alertRight) reasons.push("IDENTITY:alert_balance");

    const restTotal = REST_CATEGORIES.reduce((sum, key) => sum + e.rest_categories[key], 0);
    const apiRight = e.api_units_consumed_before_freeze + e.authorized_alert_refill_units + restTotal +
      e.protected_api_floor_units + e.ending_api_margin_units + e.unallocated_api_units;
    if (apiRight !== e.project_cycle_api_unit_ceiling) reasons.push("IDENTITY:project_api_balance");
  }
  return { pending: [...new Set(pending)].sort(), reasons: [...new Set(reasons)].sort() };
}

export function evaluateGate0Accounting(
  raw: unknown,
  identity: { evidenceId: string; authorizationId: string },
  additionalReasons: string[] = [],
): Gate0Artifact {
  const evidence = (raw && typeof raw === "object" ? raw : {}) as Partial<Gate0AccountEvidence>;
  const reasons: string[] = [...additionalReasons];

  const requiredText: Array<keyof Gate0AccountEvidence> = [
    "gathered_at_utc", "provenance", "active_subscribed_plan", "account_identity_evidence",
    "account_plan_id", "billing_cycle_start_basis", "billing_cycle_end_utc", "fids_endpoint",
    "fids_tier", "rate_limit_and_account_mechanics",
  ];
  for (const key of requiredText) if (!text(evidence[key])) reasons.push(`MISSING_OR_INVALID:${String(key)}`);
  if (evidence.schema_version !== "v3.9-gate0-account-evidence-3") reasons.push("INVALID:schema_version");
  if (evidence.entitlement_verified_for_active_subscription !== true) reasons.push("UNVERIFIED:entitlement_for_active_subscription");
  if (evidence.account_identity_verified !== true) reasons.push("UNVERIFIED:account_identity_for_intended_team");
  if (!(["current_new_subscription", "grandfathered", "custom_contract", "provider_revised"] as unknown[]).includes(evidence.plan_version_basis)) {
    reasons.push("INVALID:plan_version_basis");
  }
  if (!(["rapidapi", "api_market", "direct", "custom"] as unknown[]).includes(evidence.subscription_channel)) {
    reasons.push("INVALID:subscription_channel");
  }

  if (evidence.billing_cycle_start_utc !== undefined && evidence.billing_cycle_start_utc !== null) {
    if (!validIso(evidence.billing_cycle_start_utc)) reasons.push("INVALID:billing_cycle_start_utc");
    else if (validIso(evidence.billing_cycle_end_utc) && Date.parse(evidence.billing_cycle_start_utc) >= Date.parse(evidence.billing_cycle_end_utc)) {
      reasons.push("INVALID:billing_cycle");
    }
  }
  if (text(evidence.billing_cycle_end_utc) && !validIso(evidence.billing_cycle_end_utc)) reasons.push("INVALID:billing_cycle_end_utc");

  if (!positiveInteger(evidence.cycle_entitlement_units)) reasons.push("MISSING_OR_INVALID:cycle_entitlement_units");
  if (!finiteNonnegative(evidence.api_units_consumed_before_freeze)) reasons.push("MISSING_OR_INVALID:api_units_consumed_before_freeze");
  if (!finiteNonnegative(evidence.api_units_remaining)) reasons.push("MISSING_OR_INVALID:api_units_remaining");
  if (!positiveInteger(evidence.project_cycle_api_unit_ceiling)) reasons.push("MISSING_OR_INVALID:project_cycle_api_unit_ceiling");
  if (!finiteNonnegative(evidence.opening_nonexpiring_alert_balance)) reasons.push("MISSING_OR_INVALID:opening_nonexpiring_alert_balance");
  if (!positiveInteger(evidence.fids_units_per_request)) reasons.push("INVALID:fids_units_per_request_must_be_positive");
  if (text(evidence.fids_tier) && evidence.fids_tier.trim().toUpperCase() !== "TIER 2") reasons.push("PROVIDER_CONTRACT:fids_tier_not_tier2");
  if (positiveInteger(evidence.fids_units_per_request) && evidence.fids_units_per_request !== 2) reasons.push("PROVIDER_CONTRACT:fids_units_per_request_not_2");
  if (!Array.isArray(evidence.active_subscription_inventory)) reasons.push("MISSING_OR_INVALID:active_subscription_inventory");

  if (positiveInteger(evidence.cycle_entitlement_units) && finiteNonnegative(evidence.api_units_consumed_before_freeze) && finiteNonnegative(evidence.api_units_remaining)) {
    if (evidence.api_units_consumed_before_freeze + evidence.api_units_remaining !== evidence.cycle_entitlement_units) {
      reasons.push("IDENTITY:api_used_remaining");
    }
  }
  if (positiveInteger(evidence.project_cycle_api_unit_ceiling) && positiveInteger(evidence.cycle_entitlement_units)) {
    if (evidence.project_cycle_api_unit_ceiling > evidence.cycle_entitlement_units) reasons.push("INVALID:project_ceiling_exceeds_provider_entitlement");
    if (finiteNonnegative(evidence.api_units_consumed_before_freeze) && evidence.api_units_consumed_before_freeze > evidence.project_cycle_api_unit_ceiling) {
      reasons.push("INVALID:project_ceiling_below_already_consumed_units");
    }
  }

  const quota = evidence.rapidapi_quota_headers;
  if (!quota || typeof quota !== "object") {
    reasons.push("MISSING_OR_INVALID:rapidapi_quota_headers");
  } else {
    if (!validIso(quota.observed_at_utc)) reasons.push("INVALID:rapidapi_quota_headers.observed_at_utc");
    if (!positiveInteger(quota.api_units_limit)) reasons.push("INVALID:rapidapi_quota_headers.api_units_limit");
    if (!finiteNonnegative(quota.api_units_remaining)) reasons.push("INVALID:rapidapi_quota_headers.api_units_remaining");
    if (!finiteNonnegative(quota.api_units_reset_seconds)) reasons.push("INVALID:rapidapi_quota_headers.api_units_reset_seconds");
    if (!validIso(quota.api_units_reset_at_utc)) reasons.push("INVALID:rapidapi_quota_headers.api_units_reset_at_utc");
    if (!positiveInteger(quota.requests_limit)) reasons.push("INVALID:rapidapi_quota_headers.requests_limit");
    if (!finiteNonnegative(quota.requests_remaining)) reasons.push("INVALID:rapidapi_quota_headers.requests_remaining");
    if (!finiteNonnegative(quota.requests_reset_seconds)) reasons.push("INVALID:rapidapi_quota_headers.requests_reset_seconds");
    if (positiveInteger(quota.api_units_limit) && finiteNonnegative(quota.api_units_remaining) && quota.api_units_remaining > quota.api_units_limit) {
      reasons.push("INVALID:rapidapi_quota_headers.api_units_remaining_gt_limit");
    }
    if (positiveInteger(quota.requests_limit) && finiteNonnegative(quota.requests_remaining) && quota.requests_remaining > quota.requests_limit) {
      reasons.push("INVALID:rapidapi_quota_headers.requests_remaining_gt_limit");
    }
    if (positiveInteger(evidence.cycle_entitlement_units) && positiveInteger(quota.api_units_limit) && evidence.cycle_entitlement_units !== quota.api_units_limit) {
      reasons.push("IDENTITY:entitlement_vs_live_quota_header");
    }
    if (finiteNonnegative(evidence.api_units_remaining) && finiteNonnegative(quota.api_units_remaining) && evidence.api_units_remaining !== quota.api_units_remaining) {
      reasons.push("IDENTITY:remaining_vs_live_quota_header");
    }
    if (validIso(quota.observed_at_utc) && finiteNonnegative(quota.api_units_reset_seconds) && validIso(quota.api_units_reset_at_utc)) {
      const derived = Date.parse(quota.observed_at_utc) + quota.api_units_reset_seconds * 1000;
      if (Math.abs(derived - Date.parse(quota.api_units_reset_at_utc)) > 5_000) reasons.push("IDENTITY:quota_reset_timestamp");
    }
    if (validIso(evidence.billing_cycle_end_utc) && validIso(quota.api_units_reset_at_utc) &&
        Math.abs(Date.parse(evidence.billing_cycle_end_utc) - Date.parse(quota.api_units_reset_at_utc)) > 5_000) {
      reasons.push("IDENTITY:billing_cycle_end_vs_live_reset");
    }
  }

  const budget = inspectBudgetFreeze(evidence);
  const budgetStatus: Gate0Artifact["budget_freeze_status"] = budget.reasons.length > 0
    ? "BLOCKED"
    : budget.pending.length > 0 ? "BLOCKED_LATER_LIVE_VALUE" : "READY";

  const providerOutsideProject = positiveInteger(evidence.cycle_entitlement_units) && positiveInteger(evidence.project_cycle_api_unit_ceiling)
    ? evidence.cycle_entitlement_units - evidence.project_cycle_api_unit_ceiling : null;
  const projectRemaining = positiveInteger(evidence.project_cycle_api_unit_ceiling) && finiteNonnegative(evidence.api_units_consumed_before_freeze)
    ? evidence.project_cycle_api_unit_ceiling - evidence.api_units_consumed_before_freeze : null;

  const evidenceItems: Record<string, unknown> = {
    account_plan: {
      active_subscribed_plan: evidence.active_subscribed_plan,
      plan_version_basis: evidence.plan_version_basis,
      entitlement_verified_for_active_subscription: evidence.entitlement_verified_for_active_subscription,
      account_identity_verified: evidence.account_identity_verified,
      account_identity_evidence: evidence.account_identity_evidence,
    },
    subscription_channel: evidence.subscription_channel,
    account_plan_id: evidence.account_plan_id,
    billing_cycle: {
      start_utc: evidence.billing_cycle_start_utc ?? null,
      start_basis: evidence.billing_cycle_start_basis,
      end_utc: evidence.billing_cycle_end_utc,
      gathered_at_utc: evidence.gathered_at_utc,
      provenance: evidence.provenance,
    },
    api_cycle_usage: {
      provider_entitlement: evidence.cycle_entitlement_units,
      consumed: evidence.api_units_consumed_before_freeze,
      provider_remaining: evidence.api_units_remaining,
      project_cycle_api_unit_ceiling: evidence.project_cycle_api_unit_ceiling,
      project_remaining_after_observed_consumption: projectRemaining,
      provider_entitlement_outside_project_ceiling: providerOutsideProject,
    },
    rapidapi_quota_headers: evidence.rapidapi_quota_headers,
    settled_alert_balance: evidence.opening_nonexpiring_alert_balance,
    fids_cost_identity: { endpoint: evidence.fids_endpoint, tier: evidence.fids_tier, units_per_request: evidence.fids_units_per_request },
    rate_limit_and_account_mechanics: evidence.rate_limit_and_account_mechanics,
    active_subscription_inventory: Array.isArray(evidence.active_subscription_inventory)
      ? [...evidence.active_subscription_inventory].sort((a, b) => canonical(a).localeCompare(canonical(b))) : evidence.active_subscription_inventory,
    later_budget_freeze: {
      refill_history: evidence.refill_history,
      refill_conversion_and_caps: {
        conversion: evidence.refill_conversion_api_units_per_credit,
        min: evidence.refill_min_credits,
        max: evidence.refill_max_credits,
        balance_cap: evidence.alert_balance_cap_credits,
      },
      authorized_refill: { credits: evidence.authorized_alert_refill_credits, api_units: evidence.authorized_alert_refill_units },
      protected_alert_floor: evidence.protected_alert_floor,
      ending_alert_margin: evidence.ending_alert_margin,
      pre_smoke_unsettled_burst_margin_credits: evidence.pre_smoke_unsettled_burst_margin_credits,
      api_floor_and_margin: { floor: evidence.protected_api_floor_units, ending_margin: evidence.ending_api_margin_units },
      seven_rest_categories: evidence.rest_categories,
      pre_run_alert_ceiling: { subcaps: evidence.pre_run_alert_subcaps, total: evidence.pre_run_alert_spend_ceiling },
      phase6_alert_spend_ceiling: evidence.phase6_alert_spend_ceiling,
      unallocated_values: { alert_credits: evidence.unallocated_alert_credits, api_units_within_project_ceiling: evidence.unallocated_api_units },
    },
  };

  const unsigned = {
    schema_version: "v3.9-gate0-artifact-3" as const,
    phase_gate: GATE0_PHASE_GATE as typeof GATE0_PHASE_GATE,
    evidence_id: identity.evidenceId,
    authorization_id: identity.authorizationId,
    status: reasons.length === 0 ? "PASS" as const : "BLOCKED" as const,
    reasons: [...new Set(reasons)].sort(),
    budget_freeze_status: budgetStatus,
    budget_reasons: budget.reasons,
    budget_pending_fields: budget.pending,
    evidence_items: evidenceItems,
  };
  return { ...unsigned, artifact_sha256: createHash("sha256").update(canonical(unsigned)).digest("hex") };
}
