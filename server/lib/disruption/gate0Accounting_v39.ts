import { createHash } from "crypto";

export const GATE0_PHASE_GATE = "Phase 1 / Gate 0";
export const MAX_DESIGN_CEILING = 57_900;
/**
 * Planning reference only, never an admission constant. As of the Sep-2026
 * marketplace-plan change, a newly subscribed RapidAPI Ultra account is
 * expected to expose 50,000 monthly API units. Gate 0 must freeze the actual
 * entitlement reported for the active account/plan/cycle and may accept a
 * different value only when that value is explicitly verified (for example a
 * grandfathered subscription or later provider plan revision).
 */
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

export interface Gate0AccountEvidence {
  schema_version: "v3.9-gate0-account-evidence-2";
  gathered_at_utc: string;
  provenance: string;
  active_subscribed_plan: string;
  plan_version_basis: PlanVersionBasis;
  entitlement_verified_for_active_subscription: boolean;
  subscription_channel: SubscriptionChannel;
  account_plan_id: string;
  billing_cycle_start_utc: string;
  billing_cycle_end_utc: string;
  cycle_entitlement_units: number;
  api_units_consumed_before_freeze: number;
  api_units_remaining: number;
  opening_nonexpiring_alert_balance: number;
  refill_history: Array<{ occurred_at_utc: string; credits: number; api_units: number }>;
  refill_conversion_api_units_per_credit: number;
  refill_min_credits: number;
  refill_max_credits: number;
  alert_balance_cap_credits: number;
  fids_endpoint: string;
  fids_tier: string;
  fids_units_per_request: number;
  rate_limit_and_account_mechanics: string;
  active_subscription_inventory: Array<{ id: string; active: boolean; billing_type: string; subject_type: string | null; subject_id: string | null }>;
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
}

export interface Gate0Artifact {
  schema_version: "v3.9-gate0-artifact-2";
  phase_gate: typeof GATE0_PHASE_GATE;
  evidence_id: string;
  authorization_id: string;
  status: "PASS" | "BLOCKED";
  reasons: string[];
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

export function evaluateGate0Accounting(
  raw: unknown,
  identity: { evidenceId: string; authorizationId: string },
  additionalReasons: string[] = [],
): Gate0Artifact {
  const evidence = (raw && typeof raw === "object" ? raw : {}) as Partial<Gate0AccountEvidence>;
  const reasons: string[] = [...additionalReasons];
  const requiredText: Array<keyof Gate0AccountEvidence> = [
    "gathered_at_utc", "provenance", "active_subscribed_plan", "account_plan_id",
    "billing_cycle_start_utc", "billing_cycle_end_utc", "fids_endpoint", "fids_tier",
    "rate_limit_and_account_mechanics",
  ];
  for (const key of requiredText) if (!text(evidence[key])) reasons.push(`MISSING_OR_INVALID:${key}`);
  if (evidence.schema_version !== "v3.9-gate0-account-evidence-2") reasons.push("INVALID:schema_version");
  if (evidence.entitlement_verified_for_active_subscription !== true) reasons.push("UNVERIFIED:entitlement_for_active_subscription");
  if (!(["current_new_subscription", "grandfathered", "custom_contract", "provider_revised"] as unknown[]).includes(evidence.plan_version_basis)) reasons.push("INVALID:plan_version_basis");
  if (!(["rapidapi", "api_market", "direct", "custom"] as unknown[]).includes(evidence.subscription_channel)) reasons.push("INVALID:subscription_channel");
  if (text(evidence.billing_cycle_start_utc) && text(evidence.billing_cycle_end_utc) &&
      (!(Date.parse(evidence.billing_cycle_start_utc) < Date.parse(evidence.billing_cycle_end_utc)))) reasons.push("INVALID:billing_cycle");

  const numeric: Array<keyof Gate0AccountEvidence> = [
    "api_units_consumed_before_freeze", "api_units_remaining",
    "opening_nonexpiring_alert_balance", "refill_conversion_api_units_per_credit", "refill_min_credits",
    "refill_max_credits", "alert_balance_cap_credits", "fids_units_per_request",
    "authorized_alert_refill_credits", "authorized_alert_refill_units", "protected_alert_floor",
    "ending_alert_margin", "pre_smoke_unsettled_burst_margin_credits", "protected_api_floor_units",
    "ending_api_margin_units", "pre_run_alert_spend_ceiling", "phase6_alert_spend_ceiling",
    "unallocated_alert_credits", "unallocated_api_units",
  ];
  for (const key of numeric) if (!finiteNonnegative(evidence[key])) reasons.push(`MISSING_OR_INVALID:${key}`);
  if (!positiveInteger(evidence.cycle_entitlement_units)) reasons.push("MISSING_OR_INVALID:cycle_entitlement_units");
  if (evidence.protected_alert_floor !== undefined && finiteNonnegative(evidence.protected_alert_floor) && evidence.protected_alert_floor < 1_000) reasons.push("INVALID:protected_alert_floor_below_1000");
  if (evidence.refill_conversion_api_units_per_credit !== undefined && evidence.refill_conversion_api_units_per_credit !== 1) reasons.push("INVALID:refill_conversion_not_1_to_1");
  if (evidence.fids_units_per_request !== undefined && !positiveInteger(evidence.fids_units_per_request)) reasons.push("INVALID:fids_units_per_request_must_be_positive");
  if (!Array.isArray(evidence.refill_history)) reasons.push("MISSING_OR_INVALID:refill_history");
  if (!Array.isArray(evidence.active_subscription_inventory)) reasons.push("MISSING_OR_INVALID:active_subscription_inventory");

  const subcaps = evidence.pre_run_alert_subcaps as Partial<Record<PreRunSubcap, unknown>> | undefined;
  for (const key of PRE_RUN_SUBCAPS) if (!finiteNonnegative(subcaps?.[key])) reasons.push(`MISSING_OR_INVALID:pre_run_alert_subcaps.${key}`);
  const rest = evidence.rest_categories as Partial<Record<RestCategory, unknown>> | undefined;
  for (const key of REST_CATEGORIES) if (!finiteNonnegative(rest?.[key])) reasons.push(`MISSING_OR_INVALID:rest_categories.${key}`);

  if (reasons.length === 0) {
    const e = evidence as Gate0AccountEvidence;
    const preRunSum = PRE_RUN_SUBCAPS.reduce((sum, key) => sum + e.pre_run_alert_subcaps[key], 0);
    if (preRunSum !== e.pre_run_alert_spend_ceiling) reasons.push("IDENTITY:pre_run_subcap_sum");
    const alertAvailable = e.opening_nonexpiring_alert_balance + e.authorized_alert_refill_credits;
    const phase6Remainder = alertAvailable - e.pre_run_alert_spend_ceiling - e.protected_alert_floor - e.ending_alert_margin;
    const feasiblePhase6 = Math.min(MAX_DESIGN_CEILING, phase6Remainder);
    if (phase6Remainder < 0 || e.phase6_alert_spend_ceiling !== feasiblePhase6) reasons.push("IDENTITY:phase6_ceiling_formula");
    const alertRight = e.pre_run_alert_spend_ceiling + e.phase6_alert_spend_ceiling + e.protected_alert_floor + e.ending_alert_margin + e.unallocated_alert_credits;
    if (alertAvailable !== alertRight) reasons.push("IDENTITY:alert_balance");
    if (e.authorized_alert_refill_credits !== e.authorized_alert_refill_units) reasons.push("IDENTITY:authorized_refill_units");
    if (e.api_units_consumed_before_freeze + e.api_units_remaining !== e.cycle_entitlement_units) reasons.push("IDENTITY:api_used_remaining");
    const restTotal = REST_CATEGORIES.reduce((sum, key) => sum + e.rest_categories[key], 0);
    const apiRight = e.api_units_consumed_before_freeze + e.authorized_alert_refill_units + restTotal + e.protected_api_floor_units + e.ending_api_margin_units + e.unallocated_api_units;
    if (apiRight !== e.cycle_entitlement_units) reasons.push("IDENTITY:api_balance");
  }

  // Explicit allow-list serialization prevents credentials or dashboard extras entering evidence.
  const evidenceItems: Record<string, unknown> = {
    account_plan: {
      active_subscribed_plan: evidence.active_subscribed_plan,
      plan_version_basis: evidence.plan_version_basis,
      entitlement_verified_for_active_subscription: evidence.entitlement_verified_for_active_subscription,
    },
    subscription_channel: evidence.subscription_channel,
    account_plan_id: evidence.account_plan_id,
    billing_cycle: { start_utc: evidence.billing_cycle_start_utc, end_utc: evidence.billing_cycle_end_utc, gathered_at_utc: evidence.gathered_at_utc, provenance: evidence.provenance },
    api_cycle_usage: { entitlement: evidence.cycle_entitlement_units, consumed: evidence.api_units_consumed_before_freeze, remaining: evidence.api_units_remaining },
    settled_alert_balance: evidence.opening_nonexpiring_alert_balance,
    refill_history: Array.isArray(evidence.refill_history)
      ? [...evidence.refill_history].sort((a, b) => canonical(a).localeCompare(canonical(b))) : evidence.refill_history,
    refill_conversion_and_caps: { conversion: evidence.refill_conversion_api_units_per_credit, min: evidence.refill_min_credits, max: evidence.refill_max_credits, balance_cap: evidence.alert_balance_cap_credits },
    fids_cost_identity: { endpoint: evidence.fids_endpoint, tier: evidence.fids_tier, units_per_request: evidence.fids_units_per_request },
    rate_limit_and_account_mechanics: evidence.rate_limit_and_account_mechanics,
    active_subscription_inventory: Array.isArray(evidence.active_subscription_inventory)
      ? [...evidence.active_subscription_inventory].sort((a, b) => canonical(a).localeCompare(canonical(b))) : evidence.active_subscription_inventory,
    protected_alert_floor: evidence.protected_alert_floor,
    ending_alert_margin: evidence.ending_alert_margin,
    pre_smoke_unsettled_burst_margin_credits: evidence.pre_smoke_unsettled_burst_margin_credits,
    api_floor_and_margin: { floor: evidence.protected_api_floor_units, ending_margin: evidence.ending_api_margin_units },
    seven_rest_categories: evidence.rest_categories,
    pre_run_alert_ceiling: { subcaps: evidence.pre_run_alert_subcaps, total: evidence.pre_run_alert_spend_ceiling },
    phase6_alert_spend_ceiling: evidence.phase6_alert_spend_ceiling,
    unallocated_values: { alert_credits: evidence.unallocated_alert_credits, api_units: evidence.unallocated_api_units },
  };
  const unsigned = {
    schema_version: "v3.9-gate0-artifact-2" as const,
    phase_gate: GATE0_PHASE_GATE as typeof GATE0_PHASE_GATE,
    evidence_id: identity.evidenceId,
    authorization_id: identity.authorizationId,
    status: reasons.length === 0 ? "PASS" as const : "BLOCKED" as const,
    reasons: [...new Set(reasons)].sort(),
    evidence_items: evidenceItems,
  };
  return { ...unsigned, artifact_sha256: createHash("sha256").update(canonical(unsigned)).digest("hex") };
}
