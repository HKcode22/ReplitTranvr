/**
 * Canonical rules for contradiction scan — V3.9-f.9 §71 / Sep1_1 §71
 *
 * All SCAN rules from V39_CANONICAL_RULE_REGISTRY.yaml, typed for programmatic use.
 */

export interface Rule {
  id: string;
  rule: string;
  type: "INVARIANT" | "SCAN" | "POLICY" | "HARD" | "SOFT";
  required?: boolean;
}

export const V39_CANONICAL_RULES: Rule[] = [
  // ── INVARIANTS ──
  { id: "INV-FIDS-VERSION", rule: "fids_endpoint_version = v1.15.3.0", type: "INVARIANT", required: true },
  { id: "INV-FIDS-HASH", rule: "raw response persisted with SHA-256", type: "INVARIANT", required: true },
  { id: "INV-CANCELED-UNCERTAIN", rule: "CanceledUncertain = code 12", type: "INVARIANT", required: true },
  { id: "INV-NO-MERGE", rule: "CanceledUncertain not merged with Canceled", type: "INVARIANT", required: true },
  { id: "INV-TIMESTAMP-15", rule: "15 timestamp fields preserved", type: "INVARIANT", required: true },
  { id: "INV-HIST-APPEND", rule: "historical_feature_store append-only", type: "INVARIANT", required: true },
  { id: "INV-HIST-NULL", rule: "missing features stay NULL", type: "INVARIANT", required: true },
  { id: "INV-RAW-BEFORE-2XX", rule: "raw delivery persisted BEFORE 2xx", type: "INVARIANT", required: true },
  { id: "INV-ERA5-LEAK", rule: "ERA5 not used in operational mode", type: "INVARIANT", required: true },
  { id: "INV-ADAPTIVE-ALPHA", rule: "m_i EMA α = 0.5", type: "INVARIANT", required: true },
  { id: "INV-ADAPTIVE-BOUNDS", rule: "m_i clamped [0.001, 1.0]", type: "INVARIANT", required: true },
  { id: "INV-RECON-TOLERANCE", rule: "reconciliation tolerance = 0 after settlement", type: "INVARIANT", required: true },
  { id: "INV-GATE-4-OFFLINE", rule: "Gate 4 offline test uses synthetic cap", type: "INVARIANT", required: true },
  { id: "INV-GATE-0.5-MEASUREMENTS", rule: "Gate 0.5 evaluates 20+ measurements", type: "INVARIANT", required: true },
  { id: "INV-GATE-5-FUNNEL", rule: "captured_in_population <= population_total", type: "INVARIANT", required: true },

  // ── SCAN RULES ──
  { id: "SCAN-MISSING-FIELDS", rule: "no snapshot has missing mandatory fields", type: "SCAN" },
  { id: "SCAN-NO-DOUBLE-COUNT", rule: "Alert credits ≠ REST API units (no double-counting)", type: "SCAN" },
  { id: "SCAN-NO-ERA5-LEAK", rule: "ERA5 data rejected in operational mode", type: "SCAN" },
  { id: "SCAN-CANCELED-UNCERTAIN", rule: "CanceledUncertain is distinct from Canceled", type: "SCAN" },
  { id: "SCAN-CALENDAR-SAT", rule: "calendar satisfies all constraints (SAT)", type: "SCAN" },
  { id: "SCAN-CHAIN-COMPLETENESS", rule: "chain completeness denominator is consistent", type: "SCAN" },
  { id: "SCAN-GATE-0.5-MEASUREMENTS", rule: "Gate 0.5 evaluates 20+ measurements", type: "SCAN" },
  { id: "SCAN-GATE-4-NO-SPEND", rule: "Gate 4 offline test does not spend real credits", type: "SCAN" },
  { id: "SCAN-GATE-5-FUNNEL", rule: "Gate 5 uses role-aware funnel", type: "SCAN" },
  { id: "SCAN-RECONCILIATION", rule: "reconciliation checks C_external == C_internal", type: "SCAN" },
  { id: "SCAN-RATE-LIMITER", rule: "central rate limiter exists for all outbound calls", type: "SCAN" },
  { id: "SCAN-HIST-APPEND-ONLY", rule: "historical_feature_store is append-only", type: "SCAN" },
  { id: "SCAN-RAW-BEFORE-2XX", rule: "raw delivery persisted BEFORE 2xx", type: "SCAN" },
  { id: "SCAN-WEATHER-SOURCE", rule: "WeatherSignal has source metadata", type: "SCAN" },
  { id: "SCAN-CONFIG-REGISTRY", rule: "configuration registry is complete", type: "SCAN" },
  { id: "SCAN-DATA-LINEAGE", rule: "all pipeline arrows documented", type: "SCAN" },
  { id: "SCAN-REQUIREMENT-MATRIX", rule: "requirement matrix is complete", type: "SCAN" },
  { id: "SCAN-NO-ORPHAN-IMPL", rule: "no orphan implementations", type: "SCAN" },
  { id: "SCAN-NO-STALE-REQ", rule: "no stale requirements", type: "SCAN" },

  // ── POLICY RULES ──
  { id: "POL-POST-REGIONAL", rule: "POST-only for REGIONAL airports", type: "POLICY" },
  { id: "POL-NO-LIVE-ACTIONS", rule: "no live billable actions without human authorization", type: "POLICY" },
  { id: "POL-NO-FABRICATE", rule: "never fabricate gate PASS", type: "POLICY" },
  { id: "POL-NO-PHASE6", rule: "no Phase 6 without gates 0-5", type: "POLICY" },
];
