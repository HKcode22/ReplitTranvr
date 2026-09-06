/**
 * Configuration registry — V3.9-f.9 §65 / Sep1_1 §65
 *
 * Complete registry of every active Phase-6 setting.
 * Each record includes: type, default, safe default, required, secret,
 * producer, consumer, phase, gate, failure behavior.
 *
 * Sep1_1 §65 corrections:
 *  - Include EVERY active Phase-6 setting (not just env vars)
 *  - Record type, default, safe default, required, secret, producer, consumer,
 *    phase, gate, failure behavior for each
 *  - No hidden configuration
 */

export interface ConfigEntry {
  key: string;
  type: "env" | "derived" | "frozen" | "measured";
  value: unknown;
  defaultValue: unknown;
  safeDefault: unknown;
  required: boolean;
  secret: boolean;
  producer: string;
  consumer: string;
  phase: string;
  gate: string;
  failureBehavior: string;
  description: string;
}

export const PHASE6_CONFIG_REGISTRY: ConfigEntry[] = [
  // ── DATABASE ──
  {
    key: "DATABASE_URL",
    type: "env",
    value: process.env.DATABASE_URL ?? null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: true,
    producer: "environment",
    consumer: "db.ts",
    phase: "all",
    gate: "all",
    failureBehavior: "FATAL — server cannot start",
    description: "PostgreSQL connection string",
  },

  // ── AERODATABOX ──
  {
    key: "AERODATABOX_API_KEY",
    type: "env",
    value: process.env.AERODATABOX_API_KEY ?? null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: true,
    producer: "environment",
    consumer: "aerodataboxLimiter_v3.ts",
    phase: "all",
    gate: "Gate 0",
    failureBehavior: "BLOCKED — no FIDS/webhook calls possible",
    description: "AeroDataBox RapidAPI key",
  },
  {
    key: "ADB_AUTO_COLLECT",
    type: "env",
    value: process.env.ADB_AUTO_COLLECT ?? "false",
    defaultValue: "false",
    safeDefault: "false",
    required: true,
    secret: false,
    producer: "environment",
    consumer: "adbCollectionController_v3.ts",
    phase: "Phase 6",
    gate: "Gate 0",
    failureBehavior: "SAFE — defaults to false (no auto-collection)",
    description: "Enable automatic collection on boot",
  },
  {
    key: "ADB_BATCH_BUDGET",
    type: "env",
    value: parseInt(process.env.ADB_BATCH_BUDGET ?? "1900", 10),
    defaultValue: 1900,
    safeDefault: 1900,
    required: false,
    secret: false,
    producer: "environment",
    consumer: "adbCollectionController_v3.ts",
    phase: "Phase 6",
    gate: "Gate 0",
    failureBehavior: "SAFE — defaults to 1900",
    description: "Credit budget per collection batch",
  },
  {
    key: "ADB_DAILY_SOFT_STOP_MARGIN",
    type: "env",
    value: parseInt(process.env.ADB_DAILY_SOFT_STOP_MARGIN ?? "50", 10),
    defaultValue: 50,
    safeDefault: 50,
    required: false,
    secret: false,
    producer: "environment",
    consumer: "adbCollectionController_v3.ts",
    phase: "Phase 6",
    gate: "Gate 0",
    failureBehavior: "SAFE — defaults to 50",
    description: "Soft stop margin before hard cap",
  },
  {
    key: "ADB_RESERVE_CREDITS",
    type: "env",
    value: parseInt(process.env.ADB_RESERVE_CREDITS ?? "1000", 10),
    defaultValue: 1000,
    safeDefault: 1000,
    required: false,
    secret: false,
    producer: "environment",
    consumer: "adbCollectionController_v3.ts",
    phase: "Phase 6",
    gate: "Gate 0",
    failureBehavior: "SAFE — defaults to 1000",
    description: "Protected credit floor",
  },

  // ── BUDGET ──
  {
    key: "actual_account_plan",
    type: "measured",
    value: null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: false,
    producer: "Gate 0 live verification",
    consumer: "budgetAccounting_v3.ts",
    phase: "Phase 6",
    gate: "Gate 0",
    failureBehavior: "BLOCKED — cannot compute budget without account plan",
    description: "AeroDataBox account plan type",
  },
  {
    key: "monthly_api_units",
    type: "measured",
    value: null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: false,
    producer: "Gate 0 live verification",
    consumer: "budgetAccounting_v3.ts",
    phase: "Phase 6",
    gate: "Gate 0",
    failureBehavior: "BLOCKED — cannot compute budget",
    description: "Monthly REST API unit entitlement",
  },

  // ── FIDS PROTOCOL ──
  {
    key: "fids_endpoint_version",
    type: "frozen",
    value: "v1.15.3.0",
    defaultValue: "v1.15.3.0",
    safeDefault: "v1.15.3.0",
    required: true,
    secret: false,
    producer: "provider contract",
    consumer: "fidsCensus_v3.ts",
    phase: "all",
    gate: "Gate 0",
    failureBehavior: "BLOCKED — FIDS endpoint unknown",
    description: "AeroDataBox FIDS API version",
  },
  {
    key: "fids_max_live_range",
    type: "measured",
    value: null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: false,
    producer: "Gate 0.5 live measurement",
    consumer: "fidsCensus_v3.ts",
    phase: "Phase 6",
    gate: "Gate 0.5",
    failureBehavior: "BLOCKED — cannot compute FIDS budget",
    description: "Maximum FIDS query range in hours",
  },
  {
    key: "fids_rate_limit",
    type: "measured",
    value: null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: false,
    producer: "Gate 0.5 live measurement",
    consumer: "rateLimiter_v3.ts",
    phase: "Phase 6",
    gate: "Gate 0.5",
    failureBehavior: "BLOCKED — cannot rate-limit",
    description: "Account rate limit (requests/second)",
  },

  // ── MILESTONES ──
  {
    key: "selected_t_milestone",
    type: "measured",
    value: null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: false,
    producer: "Gate 0.5 verification",
    consumer: "flightInstanceCanonical_v3.ts",
    phase: "Phase 6",
    gate: "Gate 0.5",
    failureBehavior: "BLOCKED — cannot compute flight instance IDs",
    description: "Selected T milestone (scheduled_gate_out or scheduled_wheels_off)",
  },
  {
    key: "selected_primary_target",
    type: "measured",
    value: null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: false,
    producer: "Gate 0.5 verification",
    consumer: "evaluation",
    phase: "Phase 6",
    gate: "Gate 0.5",
    failureBehavior: "BLOCKED — cannot define target variable",
    description: "Selected primary target (wheels_off delay or gate_out delay)",
  },

  // ── FRAME ──
  {
    key: "traffic_source",
    type: "measured",
    value: null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: false,
    producer: "FREEZE",
    consumer: "build_stratified_catalog.ts",
    phase: "Phase 6",
    gate: "FREEZE",
    failureBehavior: "BLOCKED — cannot build frame",
    description: "External traffic reference source",
  },
  {
    key: "region_mapping_version",
    type: "measured",
    value: null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: false,
    producer: "FREEZE",
    consumer: "build_stratified_catalog.ts",
    phase: "Phase 6",
    gate: "FREEZE",
    failureBehavior: "BLOCKED — cannot assign regions",
    description: "Region mapping version/hash",
  },

  // ── ADAPTATION ──
  {
    key: "m_i_alpha",
    type: "frozen",
    value: 0.5,
    defaultValue: 0.5,
    safeDefault: 0.5,
    required: true,
    secret: false,
    producer: "adaptiveMi_v3.ts",
    consumer: "adaptiveMi_v3.ts",
    phase: "Phase 6",
    gate: "FREEZE",
    failureBehavior: "SAFE — uses default 0.5",
    description: "EMA smoothing factor",
  },
  {
    key: "m_i_bounds",
    type: "frozen",
    value: [0.001, 1.0],
    defaultValue: [0.001, 1.0],
    safeDefault: [0.001, 1.0],
    required: true,
    secret: false,
    producer: "adaptiveMi_v3.ts",
    consumer: "adaptiveMi_v3.ts",
    phase: "Phase 6",
    gate: "FREEZE",
    failureBehavior: "SAFE — uses defaults",
    description: "m_i lower and upper bounds",
  },
  {
    key: "m_i_initial_source",
    type: "measured",
    value: null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: false,
    producer: "Phase 6 initial value",
    consumer: "adaptiveMi_v3.ts",
    phase: "Phase 6",
    gate: "FREEZE",
    failureBehavior: "BLOCKED — cannot initialize adaptive state",
    description: "Source of initial m_i (probe_results or default_prior)",
  },

  // ── CANARY ──
  {
    key: "reconcile_tolerance_canary",
    type: "frozen",
    value: 0,
    defaultValue: 0,
    safeDefault: 0,
    required: true,
    secret: false,
    producer: "§48.1",
    consumer: "gates_v3.ts",
    phase: "Phase 6",
    gate: "Gate 3",
    failureBehavior: "SAFE — defaults to 0 (strict)",
    description: "Canary reconciliation tolerance (prefer 0 after settlement)",
  },

  // ── CENSORING ──
  {
    key: "censoring_grace",
    type: "measured",
    value: null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: false,
    producer: "Gate 0.5",
    consumer: "snapshot queries",
    phase: "Phase 6",
    gate: "Gate 0.5",
    failureBehavior: "BLOCKED — cannot define censorship window",
    description: "Censoring grace period (P95+margin, measured at Gate 0.5)",
  },

  // ── SPLIT ──
  {
    key: "split_rule_version",
    type: "measured",
    value: null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: false,
    producer: "FREEZE",
    consumer: "evaluation",
    phase: "Phase 6",
    gate: "FREEZE",
    failureBehavior: "BLOCKED — cannot assign train/test splits",
    description: "Split rule version/hash",
  },
];

/**
 * Get a configuration entry by key.
 */
export function getConfig(key: string): ConfigEntry | undefined {
  return PHASE6_CONFIG_REGISTRY.find(c => c.key === key);
}

/**
 * Get all required configurations.
 */
export function getRequiredConfigs(): ConfigEntry[] {
  return PHASE6_CONFIG_REGISTRY.filter(c => c.required);
}

/**
 * Get all secrets.
 */
export function getSecretConfigs(): ConfigEntry[] {
  return PHASE6_CONFIG_REGISTRY.filter(c => c.secret);
}
