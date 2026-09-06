/**
 * Requirement → Code → Test → Evidence matrix — V3.9-f.9 §68-69 / Sep1_1 §68-69
 *
 * §68: For every implementation requirement:
 *   - Title
 *   - Where it lives in code (file + line or function)
 *   - What test(s) prove it works
 *   - What evidence artifact proves it in production
 *
 * §69: Reverse map: Code → Requirement.
 *   For every key source file/function, list which requirement(s) it satisfies.
 *
 * Sep1_1 §68-69 corrections:
 *  - No orphan implementations (every implementation has ≥1 requirement)
 *  - No stale requirements (every requirement has ≥1 implementation)
 *  - Single machine-readable source of truth
 */

export interface RequirementEntry {
  id: string;
  title: string;
  requirement: string;
  code: { file: string; location: string }[];
  tests: { file: string; testId: string }[];
  evidence: { artifact: string; location: string }[];
  phase: string;
  gate: string;
  implemented: boolean;
}

export interface CodeToRequirement {
  file: string;
  function: string;
  requirements: string[];
}

// ---------------------------------------------------------------------------
// Requirement → Code → Test → Evidence (§68)
// ---------------------------------------------------------------------------

export const REQUIREMENT_MATRIX: RequirementEntry[] = [
  // ── FIDS Protocol (§7-8) ──
  {
    id: "REQ-FIDS-001",
    title: "FIDS endpoint uses /flights/airports/icao/{code}/{fromLocal}/{toLocal}",
    requirement: "FIDS census must use the correct provider endpoint with ICAO codes and date range",
    code: [{ file: "server/lib/disruption/fidsCensus_v3.ts", location: "fetchFidsAirport()" }],
    tests: [{ file: "tests/provider_fids.test.ts", testId: "fids-correct-endpoint" }],
    evidence: [{ artifact: "V39_CANONICAL_RULE_REGISTRY.yaml", location: "rule PROVIDER_FIDS_ENDPOINT" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-FIDS-002",
    title: "direction=Both with withCancelled=true, withCodeshared=true",
    requirement: "FIDS query must include direction=Both and withCancelled=true",
    code: [{ file: "server/lib/disruption/fidsCensus_v3.ts", location: "fetchFidsAirport() URL params" }],
    tests: [{ file: "tests/provider_fids.test.ts", testId: "fids-direction-both" }],
    evidence: [{ artifact: "V39_CANONICAL_RULE_REGISTRY.yaml", location: "rule PROVIDER_FIDS_ENDPOINT" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-FIDS-003",
    title: "SHA-256 hash persisted for raw response",
    requirement: "Raw FIDS response must be persisted with SHA-256 hash",
    code: [{ file: "server/lib/disruption/fidsCensus_v3.ts", location: "persistRawDelivery()" }],
    tests: [{ file: "tests/timestamps_raw.test.ts", testId: "hash-stability" }],
    evidence: [{ artifact: "raw_delivery table", location: "raw_body_sha256 column" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },

  // ── Status Codes (§8) ──
  {
    id: "REQ-STATUS-001",
    title: "CanceledUncertain = code 12, distinct from Canceled = code 10",
    requirement: "CanceledUncertain must NOT be merged with Canceled",
    code: [{ file: "server/lib/disruption/flightNotificationExtractor_v3.ts", location: "STATUS_CODE enum" }],
    tests: [{ file: "tests/provider_fids.test.ts", testId: "canceled-uncertain-code-12" }],
    evidence: [{ artifact: "V39_CANONICAL_RULE_REGISTRY.yaml", location: "rule PROVIDER_CANCELEDUNCERTAIN" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-STATUS-002",
    title: "POST_STATUSES excludes CanceledUncertain",
    requirement: "CanceledUncertain must not trigger POST_STATUS notifications",
    code: [{ file: "server/lib/disruption/flightNotificationExtractor_v3.ts", location: "POST_STATUSES" }],
    tests: [{ file: "tests/provider_fids.test.ts", testId: "canceled-uncertain-not-post" }],
    evidence: [{ artifact: "flightNotificationExtractor_v3.ts", location: "POST_STATUSES definition" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },

  // ── Codeshare (§19) ──
  {
    id: "REQ-CODESHARE-001",
    title: "Codeshare classification: 0=Unknown/ambiguous, 1=IsOperator, 2=IsCodeshared",
    requirement: "Codeshare must be classified with 3 states, not binary",
    code: [{ file: "server/lib/disruption/flightInstanceCanonical_v3.ts", location: "classifyCodeshare()" }],
    tests: [{ file: "tests/provider_fids.test.ts", testId: "codeshare-ambiguous-unknown" }],
    evidence: [{ artifact: "V39_CANONICAL_RULE_REGISTRY.yaml", location: "rule CODESHARE_AMBIGUOUS_STATE" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-CODESHARE-002",
    title: "Retime detection: ≥2h shift or date change",
    requirement: "Retime must be detected by ≥2h shift or date change",
    code: [{ file: "server/lib/disruption/flightInstanceCanonical_v3.ts", location: "detectRetime()" }],
    tests: [{ file: "tests/provider_fids.test.ts", testId: "retime-detect-2h" }],
    evidence: [{ artifact: "V39_CANONICAL_RULE_REGISTRY.yaml", location: "rule RETIME_THRESHOLD" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },

  // ── Timestamp Taxonomy (§14) ──
  {
    id: "REQ-TIMESTAMP-001",
    title: "15 timestamp fields preserved distinctly",
    requirement: "All 15 timestamp fields must be preserved, never merged",
    code: [{ file: "server/lib/disruption/timestampTaxonomy_v3.ts", location: "TIMESTAMP_FIELDS definition" }],
    tests: [{ file: "tests/timestamps_raw.test.ts", testId: "timestamp-fields-count" }],
    evidence: [{ artifact: "V39_CANONICAL_RULE_REGISTRY.yaml", location: "rule TIMESTAMP_TAXONOMY_VERSION" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-TIMESTAMP-002",
    title: "Provider-to-FAA mapping preserves all fields",
    requirement: "Provider fields must be mapped to FAA/ASPM aliases",
    code: [{ file: "server/lib/disruption/timestampTaxonomy_v3.ts", location: "PROVIDER_TO_FAA_MAPPING" }],
    tests: [{ file: "tests/timestamps_raw.test.ts", testId: "provider-to-faa-mapping" }],
    evidence: [{ artifact: "timestampTaxonomy_v3.ts", location: "PROVIDER_TO_FAA_MAPPING" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-TIMESTAMP-003",
    title: "Leakage prevention enforced",
    requirement: "isAvailableAtCutoff and isFeatureEligible must prevent data leakage",
    code: [{ file: "server/lib/disruption/timestampTaxonomy_v3.ts", location: "isAvailableAtCutoff(), isFeatureEligible()" }],
    tests: [{ file: "tests/timestamps_raw.test.ts", testId: "leakage-prevention" }],
    evidence: [{ artifact: "timestampTaxonomy_v3.ts", location: "leakage prevention functions" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },

  // ── Raw Ingress (§15-16) ──
  {
    id: "REQ-RAW-001",
    title: "Raw delivery persisted BEFORE HTTP 2xx",
    requirement: "DB persistence must complete before 2xx response",
    code: [{ file: "server/lib/disruption/rawIngress_v3.ts", location: "persistRawDelivery()" }],
    tests: [], // Requires DB mock
    evidence: [{ artifact: "raw_delivery table", location: "Immutable after persist" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-RAW-002",
    title: "DB failure returns 5xx (triggers provider retry)",
    requirement: "If DB persistence fails, server must return 5xx",
    code: [{ file: "server/lib/disruption/rawIngress_v3.ts", location: "persistRawDelivery() error handling" }],
    tests: [], // Requires DB mock
    evidence: [{ artifact: "rawIngress_v3.ts", location: "Error handling" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },

  // ── Historical Store (§26) ──
  {
    id: "REQ-HIST-001",
    title: "Bitemporal as-of lookup prevents data leakage",
    requirement: "Historical lookup must use valid_from ≤ cutoff AND available_at ≤ cutoff",
    code: [{ file: "server/lib/disruption/historicalFeatureStore_v3.ts", location: "getAsOfFeature()" }],
    tests: [{ file: "tests/weather_history.test.ts", testId: "as-of-basic" }],
    evidence: [{ artifact: "V39_CANONICAL_RULE_REGISTRY.yaml", location: "rule HISTORICAL_STORE_TABLE" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-HIST-002",
    title: "Append-only (ON CONFLICT DO NOTHING)",
    requirement: "Historical store must never overwrite, only append",
    code: [{ file: "server/lib/disruption/historicalFeatureStore_v3.ts", location: "insertFeature()" }],
    tests: [{ file: "tests/weather_history.test.ts", testId: "append-only-on-conflict" }],
    evidence: [{ artifact: "historicalFeatureStore_v3.ts", location: "ON CONFLICT DO NOTHING" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-HIST-003",
    title: "Missing features stay NULL, never 0",
    requirement: "Missing features must remain NULL, not be set to 0",
    code: [{ file: "server/lib/disruption/historicalFeatureStore_v3.ts", location: "getAsOfFeature() nullable return" }],
    tests: [{ file: "tests/weather_history.test.ts", testId: "missing-feature-null" }],
    evidence: [{ artifact: "historicalFeatureStore_v3.ts", location: "NULL handling" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },

  // ── Adaptive m_i (§36) ──
  {
    id: "REQ-ADAPT-001",
    title: "EMA update with α=0.5, first obs = x₁",
    requirement: "EMA must use α=0.5 with first observation as initial value",
    code: [{ file: "server/lib/disruption/adaptiveMi_v3.ts", location: "emaUpdate()" }],
    tests: [{ file: "tests/adaptation.test.ts", testId: "ema-update" }],
    evidence: [{ artifact: "adaptiveMi_v3.ts", location: "emaUpdate()" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-ADAPT-002",
    title: "m_i clamped to [0.001, 1.0]",
    requirement: "m_i must be clamped to [0.001, 1.0]",
    code: [{ file: "server/lib/disruption/adaptiveMi_v3.ts", location: "clampMi()" }],
    tests: [{ file: "tests/adaptation.test.ts", testId: "m-i-clamp" }],
    evidence: [{ artifact: "adaptiveMi_v3.ts", location: "clampMi()" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-ADAPT-003",
    title: "Zero-yield FSM: normal→once→repeated→persistent",
    requirement: "Zero-yield must follow 4-state FSM",
    code: [{ file: "server/lib/disruption/adaptiveMi_v3.ts", location: "transitionZeroYieldState()" }],
    tests: [{ file: "tests/adaptation.test.ts", testId: "zero-yield-fsm" }],
    evidence: [{ artifact: "adaptiveMi_v3.ts", location: "ZERO_YIELD_STATES" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-ADAPT-004",
    title: "Coverage floor enforced",
    requirement: "If coverage < 80%, assign minimum viable set",
    code: [{ file: "server/lib/disruption/adaptiveMi_v3.ts", location: "applyCoverageFloor()" }],
    tests: [{ file: "tests/adaptation.test.ts", testId: "coverage-floor" }],
    evidence: [{ artifact: "adaptiveMi_v3.ts", location: "applyCoverageFloor()" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },

  // ── Weather ERA5 Leak Prevention (§27) ──
  {
    id: "REQ-WEATHER-001",
    title: "ERA5 rejected in operational mode",
    requirement: "ERA5 data must never be used in operational mode",
    code: [{ file: "server/lib/disruption/weatherSignal.ts", location: "isWeatherAvailableAtCutoff()" }],
    tests: [{ file: "tests/weather_history.test.ts", testId: "era5-leak-prevention" }],
    evidence: [{ artifact: "weatherSignal.ts", location: "allowEra5 check" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-WEATHER-002",
    title: "WeatherSignal has source, sourceVersion, issueTime",
    requirement: "WeatherSignal must include source metadata",
    code: [{ file: "server/lib/disruption/weatherSignal.ts", location: "WeatherSignal type" }],
    tests: [{ file: "tests/weather_history.test.ts", testId: "era5-leak-prevention" }],
    evidence: [{ artifact: "weatherSignal.ts", location: "WeatherSignal type" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },

  // ── Calendar Constraint (§40) ──
  {
    id: "REQ-CAL-001",
    title: "31-day calendar with 6h and 2×2h shapes",
    requirement: "Calendar must support both 6h and 2×2h window shapes",
    code: [{ file: "server/lib/disruption/experimentCalendar_v3.ts", location: "generateExperimentCalendar()" }],
    tests: [], // Will be added
    evidence: [{ artifact: "experimentCalendar_v3.ts", location: "Calendar generation" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-CAL-002",
    title: "Calendar validation (SAT/UNSAT)",
    requirement: "Calendar must be validated for all constraints",
    code: [{ file: "server/lib/disruption/experimentCalendar_v3.ts", location: "validateCalendar()" }],
    tests: [], // Will be added
    evidence: [{ artifact: "experimentCalendar_v3.ts", location: "Calendar validation" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-CAL-003",
    title: "Washout ≥24h between END and next START",
    requirement: "There must be ≥24h gap between END and next START",
    code: [{ file: "server/lib/disruption/experimentCalendar_v3.ts", location: "earliestNextStart()" }],
    tests: [], // Will be added
    evidence: [{ artifact: "experimentCalendar_v3.ts", location: "earliestNextStart()" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },

  // ── Budget (§41) ──
  {
    id: "REQ-BUDGET-001",
    title: "Budget computed from materialized calendar",
    requirement: "Budget must be computed from actual calendar, not arithmetic assumptions",
    code: [{ file: "server/lib/disruption/budgetAccounting_v3.ts", location: "recomputeBudget()" }],
    tests: [], // Will be added
    evidence: [{ artifact: "budgetAccounting_v3.ts", location: "Budget computation" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
  {
    id: "REQ-BUDGET-002",
    title: "Alert credits ≠ REST units (no double-counting)",
    requirement: "Alert credits and REST units must not be double-counted",
    code: [{ file: "server/lib/disruption/budgetAccounting_v3.ts", location: "verifyNoDoubleCounting()" }],
    tests: [], // Will be added
    evidence: [{ artifact: "budgetAccounting_v3.ts", location: "verifyNoDoubleCounting()" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },

  // ── Rate Limiting (§46) ──
  {
    id: "REQ-RATE-001",
    title: "Central rate limiter for all outbound calls",
    requirement: "ALL outbound AeroDataBox calls must go through rate limiter",
    code: [{ file: "server/lib/disruption/rateLimiter_v3.ts", location: "rateLimitedFetch()" }],
    tests: [], // Requires network mock
    evidence: [{ artifact: "rateLimiter_v3.ts", location: "rateLimitedFetch()" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },

  // ── Reconciliation (§48) ──
  {
    id: "REQ-RECON-001",
    title: "Reconciliation: C_external == C_internal (tolerance 0 after settlement)",
    requirement: "Reconciliation must match provider balance delta to internal count",
    code: [{ file: "server/lib/disruption/gates_v3.ts", location: "reconcile()" }],
    tests: [], // Requires DB mock
    evidence: [{ artifact: "gates_v3.ts", location: "reconcile()" }],
    phase: "Phase 6",
    gate: "Gate 3",
    implemented: true,
  },

  // ── Gate 4 (§49) ──
  {
    id: "REQ-GATE4-001",
    title: "Gate 4 offline scaled threshold test (cap=100, margin=10, stop at 90)",
    requirement: "Gate 4 must prove exact stop behavior without spending 1,850 credits",
    code: [{ file: "server/lib/disruption/gates_v3.ts", location: "runGate4OfflineTest()" }],
    tests: [], // Will be added
    evidence: [{ artifact: "gates_v3.ts", location: "Gate 4 offline test" }],
    phase: "Phase 6",
    gate: "Gate 4",
    implemented: true,
  },

  // ── Gate 0.5 (§50) ──
  {
    id: "REQ-GATE05-001",
    title: "Gate 0.5 sample adequacy with 20+ measurements",
    requirement: "Gate 0.5 must evaluate pilot sample adequacy against minimum criteria",
    code: [{ file: "server/lib/disruption/gates_v3.ts", location: "evaluateGate05()" }],
    tests: [], // Will be added
    evidence: [{ artifact: "gates_v3.ts", location: "Gate 0.5 evaluation" }],
    phase: "Phase 6",
    gate: "Gate 0.5",
    implemented: true,
  },

  // ── Gate 5 (§51) ──
  {
    id: "REQ-GATE5-001",
    title: "Gate 5 role-aware funnel: captured_in_population <= population_total",
    requirement: "Gate 5 must use role-aware funnel, not unsafe population >= captured",
    code: [{ file: "server/lib/disruption/gates_v3.ts", location: "validateGate5Funnel()" }],
    tests: [], // Will be added
    evidence: [{ artifact: "gates_v3.ts", location: "Gate 5 funnel" }],
    phase: "Phase 6",
    gate: "Gate 5",
    implemented: true,
  },

  // ── Configuration Registry (§65) ──
  {
    id: "REQ-CONFIG-001",
    title: "Complete configuration registry with all Phase-6 settings",
    requirement: "Every active Phase-6 setting must be documented in registry",
    code: [{ file: "server/lib/disruption/configRegistry_v3.ts", location: "PHASE6_CONFIG_REGISTRY" }],
    tests: [], // Will be added
    evidence: [{ artifact: "configRegistry_v3.ts", location: "Config registry" }],
    phase: "Phase 6",
    gate: "Gate 0",
    implemented: true,
  },
];

// ---------------------------------------------------------------------------
// Reverse: Code → Requirement (§69)
// ---------------------------------------------------------------------------

export const CODE_TO_REQUIREMENT: CodeToRequirement[] = [
  { file: "server/lib/disruption/fidsCensus_v3.ts", function: "fetchFidsAirport()", requirements: ["REQ-FIDS-001", "REQ-FIDS-002", "REQ-FIDS-003"] },
  { file: "server/lib/disruption/fidsCensus_v3.ts", function: "batchFidsCensus()", requirements: ["REQ-FIDS-001", "REQ-FIDS-002"] },
  { file: "server/lib/disruption/flightNotificationExtractor_v3.ts", function: "STATUS_CODE", requirements: ["REQ-STATUS-001", "REQ-STATUS-002"] },
  { file: "server/lib/disruption/flightNotificationExtractor_v3.ts", function: "POST_STATUSES", requirements: ["REQ-STATUS-002"] },
  { file: "server/lib/disruption/flightInstanceCanonical_v3.ts", function: "classifyCodeshare()", requirements: ["REQ-CODESHARE-001"] },
  { file: "server/lib/disruption/flightInstanceCanonical_v3.ts", function: "detectRetime()", requirements: ["REQ-CODESHARE-002"] },
  { file: "server/lib/disruption/flightInstanceCanonical_v3.ts", function: "retimeFlightInstanceId()", requirements: ["REQ-CODESHARE-002"] },
  { file: "server/lib/disruption/timestampTaxonomy_v3.ts", function: "TIMESTAMP_FIELDS", requirements: ["REQ-TIMESTAMP-001"] },
  { file: "server/lib/disruption/timestampTaxonomy_v3.ts", function: "PROVIDER_TO_FAA_MAPPING", requirements: ["REQ-TIMESTAMP-002"] },
  { file: "server/lib/disruption/timestampTaxonomy_v3.ts", function: "isAvailableAtCutoff()", requirements: ["REQ-TIMESTAMP-003"] },
  { file: "server/lib/disruption/timestampTaxonomy_v3.ts", function: "isFeatureEligible()", requirements: ["REQ-TIMESTAMP-003"] },
  { file: "server/lib/disruption/rawIngress_v3.ts", function: "persistRawDelivery()", requirements: ["REQ-RAW-001", "REQ-RAW-002"] },
  { file: "server/lib/disruption/rawIngress_v3.ts", function: "persistRawDeliveryItems()", requirements: ["REQ-RAW-001"] },
  { file: "server/lib/disruption/historicalFeatureStore_v3.ts", function: "getAsOfFeature()", requirements: ["REQ-HIST-001", "REQ-HIST-003"] },
  { file: "server/lib/disruption/historicalFeatureStore_v3.ts", function: "insertFeature()", requirements: ["REQ-HIST-002"] },
  { file: "server/lib/disruption/historicalFeatureStore_v3.ts", function: "batchAsOfLookup()", requirements: ["REQ-HIST-001"] },
  { file: "server/lib/disruption/adaptiveMi_v3.ts", function: "emaUpdate()", requirements: ["REQ-ADAPT-001"] },
  { file: "server/lib/disruption/adaptiveMi_v3.ts", function: "clampMi()", requirements: ["REQ-ADAPT-002"] },
  { file: "server/lib/disruption/adaptiveMi_v3.ts", function: "transitionZeroYieldState()", requirements: ["REQ-ADAPT-003"] },
  { file: "server/lib/disruption/adaptiveMi_v3.ts", function: "applyCoverageFloor()", requirements: ["REQ-ADAPT-004"] },
  { file: "server/lib/disruption/adaptiveMi_v3.ts", function: "calculateMi()", requirements: ["REQ-ADAPT-001", "REQ-ADAPT-002"] },
  { file: "server/lib/disruption/weatherSignal.ts", function: "isWeatherAvailableAtCutoff()", requirements: ["REQ-WEATHER-001"] },
  { file: "server/lib/disruption/weatherSignal.ts", function: "WeatherSignal type", requirements: ["REQ-WEATHER-002"] },
  { file: "server/lib/disruption/experimentCalendar_v3.ts", function: "generateExperimentCalendar()", requirements: ["REQ-CAL-001"] },
  { file: "server/lib/disruption/experimentCalendar_v3.ts", function: "validateCalendar()", requirements: ["REQ-CAL-002"] },
  { file: "server/lib/disruption/experimentCalendar_v3.ts", function: "earliestNextStart()", requirements: ["REQ-CAL-003"] },
  { file: "server/lib/disruption/budgetAccounting_v3.ts", function: "recomputeBudget()", requirements: ["REQ-BUDGET-001"] },
  { file: "server/lib/disruption/budgetAccounting_v3.ts", function: "verifyNoDoubleCounting()", requirements: ["REQ-BUDGET-002"] },
  { file: "server/lib/disruption/rateLimiter_v3.ts", function: "rateLimitedFetch()", requirements: ["REQ-RATE-001"] },
  { file: "server/lib/disruption/gates_v3.ts", function: "reconcile()", requirements: ["REQ-RECON-001"] },
  { file: "server/lib/disruption/gates_v3.ts", function: "runGate4OfflineTest()", requirements: ["REQ-GATE4-001"] },
  { file: "server/lib/disruption/gates_v3.ts", function: "evaluateGate05()", requirements: ["REQ-GATE05-001"] },
  { file: "server/lib/disruption/gates_v3.ts", function: "validateGate5Funnel()", requirements: ["REQ-GATE5-001"] },
  { file: "server/lib/disruption/configRegistry_v3.ts", function: "PHASE6_CONFIG_REGISTRY", requirements: ["REQ-CONFIG-001"] },
];

/**
 * Find requirements for a given file.
 */
export function findRequirementsForFile(file: string): CodeToRequirement[] {
  return CODE_TO_REQUIREMENT.filter(c => c.file === file);
}

/**
 * Find requirements for a given function.
 */
export function findRequirementsForFunction(file: string, func: string): string[] {
  const entry = CODE_TO_REQUIREMENT.find(c => c.file === file && c.function === func);
  return entry?.requirements ?? [];
}

/**
 * Validate matrix completeness: every requirement has ≥1 implementation,
 * every implementation has ≥1 requirement.
 */
export function validateMatrixCompleteness(): {
  orphanImplementations: string[];
  staleRequirements: string[];
  complete: boolean;
} {
  const allImplementedFunctions = new Set(CODE_TO_REQUIREMENT.map(c => `${c.file}:${c.function}`));
  const allRequirementIds = new Set(REQUIREMENT_MATRIX.map(r => r.id));
  const implementedRequirementIds = new Set(REQUIREMENT_MATRIX.filter(r => r.implemented).map(r => r.id));

  const orphanImplementations = CODE_TO_REQUIREMENT
    .filter(c => c.requirements.length === 0)
    .map(c => `${c.file}:${c.function}`);

  const staleRequirements = REQUIREMENT_MATRIX
    .filter(r => !r.implemented || r.code.length === 0)
    .map(r => r.id);

  return {
    orphanImplementations,
    staleRequirements,
    complete: orphanImplementations.length === 0 && staleRequirements.length === 0,
  };
}
