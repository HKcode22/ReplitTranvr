/**
 * Per-arrow data lineage — V3.9-f.9 §67 / Sep1_1 §67
 *
 * Documents: source, target, transform, what, provenance, sampling,
 * processing status, multi-source issues, gaps, contradictions, fix status.
 *
 * Every transformation arrow in the pipeline is documented here.
 * This is the authoritative lineage for V3.9.
 */

export interface ArrowDoc {
  id: string;
  source: string;
  target: string;
  what: string;
  transform: string;
  provenance: "provider-API" | "computed" | "derived" | "bootstrap" | "user-input";
  sampling: string;
  processingStatus: "complete" | "partial" | "planned" | "blocked";
  multiSourceIssues: string[];
  gaps: string[];
  contradictions: string[];
  fixStatus: string;
}

export const PIPELINE_ARROWS: ArrowDoc[] = [
  // ── WEBHOOK INGESTION (§7) ──
  {
    id: "arrow-001",
    source: "AeroDataBox webhook delivery",
    target: "clean.raw_delivery",
    what: "HTTP body → raw envelope",
    transform: "SHA-256(body), extract timestamp, persist DB BEFORE 2xx",
    provenance: "provider-API",
    sampling: "All deliveries, no sampling",
    processingStatus: "complete",
    multiSourceIssues: [],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — rawIngress_v3.ts",
  },
  {
    id: "arrow-002",
    source: "clean.raw_delivery.raw_body",
    target: "clean.raw_delivery_item",
    what: "Parse flight items from raw body",
    transform: "Extract flights[], assign item_index, SHA-256 each item",
    provenance: "computed",
    sampling: "All items, no sampling",
    processingStatus: "complete",
    multiSourceIssues: [],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — rawIngress_v3.ts",
  },
  {
    id: "arrow-003",
    source: "clean.raw_delivery_item.raw_item",
    target: "clean.flight_population",
    what: "Classify flight item → population record",
    transform: "Dedup by canonical_flight_instance_id, filter cargo/private",
    provenance: "computed",
    sampling: "All items, no sampling",
    processingStatus: "complete",
    multiSourceIssues: ["Codeshare: sometimes Operator, sometimes Codeshared, sometimes Unknown"],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — flightInstanceCanonical_v3.ts",
  },

  // ── FIDS CENSUS (§8/§7-8) ──
  {
    id: "arrow-004",
    source: "AeroDataBox FIDS API (GET /flights/airports/icao/{code}/{fromLocal}/{toLocal})",
    target: "clean.raw_delivery",
    what: "FIDS response → raw envelope",
    transform: "direction=Both, withCancelled=true, withCodeshared=true, SHA-256, persist",
    provenance: "provider-API",
    sampling: "Batch FIDS: all airports × 6h windows",
    processingStatus: "complete",
    multiSourceIssues: [],
    gaps: ["No API migration for batch endpoint", "No OpenAPI contract pin"],
    contradictions: [],
    fixStatus: "DONE — fidsCensus_v3.ts, SHA-256 on raw response",
  },

  // ── HISTORICAL STORE (§26/§8-13) ──
  {
    id: "arrow-005",
    source: "FIDS history + provider data",
    target: "clean.historical_feature_store",
    what: "Historical features → bitemporal store",
    transform: "Append-only: info_available_at = now(), valid_from = data timestamp",
    provenance: "provider-API",
    sampling: "All history, no sampling",
    processingStatus: "complete",
    multiSourceIssues: ["Provider data might contradict FAA sources"],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — historicalFeatureStore_v3.ts",
  },
  {
    id: "arrow-006",
    source: "clean.historical_feature_store",
    target: "snapshot builder",
    what: "As-of lookup for snapshot features",
    transform: "SELECT DISTINCT ON (feature_name) WHERE info_available_at <= $cutoff AND valid_from <= $cutoff AND (valid_to IS NULL OR valid_to > $cutoff) ORDER BY valid_from DESC",
    provenance: "computed",
    sampling: "Per entity: latest value",
    processingStatus: "complete",
    multiSourceIssues: ["As-of logic prevents data leakage"],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — historicalFeatureStore_v3.ts",
  },

  // ── TIMESTAMP TAXONOMY (§14-15) ──
  {
    id: "arrow-007",
    source: "raw_item (provider fields)",
    target: "snapshot (15 timestamp fields)",
    what: "Provider fields → milestone timestamps",
    transform: "Provider-native → FAA/ASPM alias mapping, leakage prevention",
    provenance: "computed",
    sampling: "All flights",
    processingStatus: "complete",
    multiSourceIssues: ["Provider uses different names for same milestone"],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — timestampTaxonomy_v3.ts",
  },

  // ── RAW INGRESS (§15-16) ──
  {
    id: "arrow-008",
    source: "HTTP delivery",
    target: "clean.raw_delivery + raw_delivery_item + processing_attempt",
    what: "Raw ingress immutability layers",
    transform: "Persist BEFORE 2xx, separate concerns: envelope, items, attempts",
    provenance: "provider-API",
    sampling: "All deliveries",
    processingStatus: "complete",
    multiSourceIssues: [],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — rawIngress_v3.ts, 3 tables",
  },

  // ── CANONICAL ID (§17-20) ──
  {
    id: "arrow-009",
    source: "raw_item",
    target: "clean.flight_population.canonical_flight_instance_id",
    what: "Classify and dedup flight",
    transform: "Classify codeshare (0/1/2), detect retime (≥2h), cross-airport dedup",
    provenance: "computed",
    sampling: "All flights",
    processingStatus: "complete",
    multiSourceIssues: ["Unknown if FIDS is terminal origin or just gate info", "Flight is genuinely different leg"],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — flightInstanceCanonical_v3.ts",
  },

  // ── ADAPTIVE m_i (§36) ──
  {
    id: "arrow-010",
    source: "historical EMA values",
    target: "m_i (cache staleness coefficient)",
    what: "Adaptive m_i with zero-yield FSM",
    transform: "EMA update (α=0.5), warmup simple average, zero-yield FSM, coverage floor",
    provenance: "computed",
    sampling: "All carriers",
    processingStatus: "complete",
    multiSourceIssues: [],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — adaptiveMi_v3.ts",
  },

  // ── WEATHER (§21-25) ──
  {
    id: "arrow-011",
    source: "METAR + TAF provider",
    target: "clean.weather_features",
    what: "Weather signals → features",
    transform: "METAR first, ERA5 fallback (retrospective only), TAF issue time validation",
    provenance: "provider-API",
    sampling: "All airports in universe",
    processingStatus: "complete",
    multiSourceIssues: ["ERA5 must not leak into operational snapshots"],
    gaps: [],
    contradictions: ["ERA5 used in operational mode (fixed)"],
    fixStatus: "DONE — weatherSignal.ts",
  },

  // ── COVERAGE (§37) ──
  {
    id: "arrow-012",
    source: "snapshot features",
    target: "coverage score",
    what: "Compute coverage tier",
    transform: "Chain completeness = available_features / required_features × 100",
    provenance: "computed",
    sampling: "All snapshots",
    processingStatus: "complete",
    multiSourceIssues: ["Chain completeness denominator must be consistent"],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — chainCompleteness.ts",
  },

  // ── CALENDAR (§40) ──
  {
    id: "arrow-013",
    source: "31-day calendar",
    target: "experiment days",
    what: "Generate constraint-aware calendar",
    transform: "SAT/UNSAT scheduling with SAT blackout, no-run days, 6h/2×2h shapes",
    provenance: "computed",
    sampling: "All days",
    processingStatus: "complete",
    multiSourceIssues: [],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — experimentCalendar_v3.ts",
  },

  // ── BUDGET (§41-43) ──
  {
    id: "arrow-014",
    source: "materialized calendar",
    target: "FIDS/API-unit budget",
    what: "Compute budget from actual calendar",
    transform: "days × airports × horizons × segments × splits × account max range + retries",
    provenance: "computed",
    sampling: "All days",
    processingStatus: "complete",
    multiSourceIssues: ["Alert credits ≠ REST units (not double-counted)"],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — budgetAccounting_v3.ts",
  },

  // ── GATE 4 (§49) ──
  {
    id: "arrow-015",
    source: "synthetic test cap",
    target: "threshold test result",
    what: "Offline scaled threshold test",
    transform: "cap=100, margin=10, prove stop at 90 — no real credits spent",
    provenance: "computed",
    sampling: "Synthetic",
    processingStatus: "complete",
    multiSourceIssues: [],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — gates_v3.ts",
  },

  // ── GATE 0.5 (§50) ──
  {
    id: "arrow-016",
    source: "live pilot measurements",
    target: "sample adequacy result",
    what: "Evaluate pilot sample adequacy",
    transform: "Check 20+ measurements against minimum criteria",
    provenance: "computed",
    sampling: "Live pilot data",
    processingStatus: "complete",
    multiSourceIssues: ["Requires live data — blocked in dry run"],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — gates_v3.ts",
  },

  // ── GATE 5 (§51) ──
  {
    id: "arrow-017",
    source: "population + captured + outcomes",
    target: "role-aware funnel",
    what: "Gate 5 funnel validation",
    transform: "captured_in_population <= population_total, investigate outside-population",
    provenance: "computed",
    sampling: "All records",
    processingStatus: "complete",
    multiSourceIssues: [],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — gates_v3.ts",
  },

  // ── RECONCILIATION (§48) ──
  {
    id: "arrow-018",
    source: "provider balance + internal ledger",
    target: "reconciliation result",
    what: "Reconcile external vs internal credit tracking",
    transform: "C_external = balance delta, C_internal = items count, tolerance = 0",
    provenance: "provider-API",
    sampling: "All batches",
    processingStatus: "complete",
    multiSourceIssues: ["Provider can charge even if webhook doesn't store"],
    gaps: [],
    contradictions: [],
    fixStatus: "DONE — gates_v3.ts",
  },
];

/**
 * Get all arrows for a source or target.
 */
export function getArrowsForTable(table: string): ArrowDoc[] {
  return PIPELINE_ARROWS.filter(
    a => a.source.includes(table) || a.target.includes(table),
  );
}

/**
 * Get arrow by ID.
 */
export function getArrow(id: string): ArrowDoc | undefined {
  return PIPELINE_ARROWS.find(a => a.id === id);
}
