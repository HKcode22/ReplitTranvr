/**
 * Final manifest — V3.9-f.9 §74 / Sep1_1 §74
 *
 * Machine-readable manifest of the V3.9 repository state.
 * Every file, table, module, and rule is documented here.
 *
 * This is the single source of truth for repository contents.
 */

export interface ManifestEntry {
  type: "module" | "test" | "migration" | "config" | "document" | "rule";
  path: string;
  description: string;
  implemented: boolean;
  tested: boolean;
  verified: boolean;
  requirements: string[];
}

export const V39_MANIFEST: ManifestEntry[] = [
  // ── CORE MODULES ──
  { type: "module", path: "server/lib/disruption/fidsCensus_v3.ts", description: "FIDS census fetcher", implemented: true, tested: true, verified: true, requirements: ["REQ-FIDS-001", "REQ-FIDS-002", "REQ-FIDS-003"] },
  { type: "module", path: "server/lib/disruption/flightNotificationExtractor_v3.ts", description: "Flight notification extractor with status codes", implemented: true, tested: true, verified: true, requirements: ["REQ-STATUS-001", "REQ-STATUS-002"] },
  { type: "module", path: "server/lib/disruption/flightInstanceCanonical_v3.ts", description: "Canonical flight instance ID with codeshare/retime", implemented: true, tested: true, verified: true, requirements: ["REQ-CODESHARE-001", "REQ-CODESHARE-002"] },
  { type: "module", path: "server/lib/disruption/timestampTaxonomy_v3.ts", description: "15-field timestamp taxonomy with leakage prevention", implemented: true, tested: true, verified: true, requirements: ["REQ-TIMESTAMP-001", "REQ-TIMESTAMP-002", "REQ-TIMESTAMP-003"] },
  { type: "module", path: "server/lib/disruption/rawIngress_v3.ts", description: "Raw ingress immutability layers (3 tables)", implemented: true, tested: false, verified: false, requirements: ["REQ-RAW-001", "REQ-RAW-002"] },
  { type: "module", path: "server/lib/disruption/historicalFeatureStore_v3.ts", description: "Bitemporal as-of historical feature store", implemented: true, tested: true, verified: true, requirements: ["REQ-HIST-001", "REQ-HIST-002", "REQ-HIST-003"] },
  { type: "module", path: "server/lib/disruption/adaptiveMi_v3.ts", description: "Adaptive m_i with EMA, zero-yield FSM, coverage floor", implemented: true, tested: true, verified: true, requirements: ["REQ-ADAPT-001", "REQ-ADAPT-002", "REQ-ADAPT-003", "REQ-ADAPT-004"] },
  { type: "module", path: "server/lib/disruption/weatherSignal.ts", description: "Weather signals with ERA5 leak prevention", implemented: true, tested: true, verified: true, requirements: ["REQ-WEATHER-001", "REQ-WEATHER-002"] },
  { type: "module", path: "server/lib/disruption/experimentCalendar_v3.ts", description: "31-day constraint-aware experiment calendar", implemented: true, tested: false, verified: false, requirements: ["REQ-CAL-001", "REQ-CAL-002", "REQ-CAL-003"] },
  { type: "module", path: "server/lib/disruption/budgetAccounting_v3.ts", description: "FIDS/API-unit budget recompute + Alert-credit accounting", implemented: true, tested: false, verified: false, requirements: ["REQ-BUDGET-001", "REQ-BUDGET-002"] },
  { type: "module", path: "server/lib/disruption/rateLimiter_v3.ts", description: "Central rate limiter for all outbound calls", implemented: true, tested: false, verified: false, requirements: ["REQ-RATE-001"] },
  { type: "module", path: "server/lib/disruption/gates_v3.ts", description: "Gate 0.5/4/5 tests + reconciliation + hard cap", implemented: true, tested: false, verified: false, requirements: ["REQ-RECON-001", "REQ-GATE4-001", "REQ-GATE05-001", "REQ-GATE5-001"] },
  { type: "module", path: "server/lib/disruption/configRegistry_v3.ts", description: "Complete Phase-6 configuration registry", implemented: true, tested: false, verified: false, requirements: ["REQ-CONFIG-001"] },
  { type: "module", path: "server/lib/disruption/dataDictionary_v3.ts", description: "Data dictionary with all tables/columns", implemented: true, tested: false, verified: false, requirements: [] },
  { type: "module", path: "server/lib/disruption/dataLineage_v3.ts", description: "Per-arrow data lineage (18 arrows)", implemented: true, tested: false, verified: false, requirements: [] },
  { type: "module", path: "server/lib/disruption/requirementMatrix_v3.ts", description: "Requirement → Code → Test → Evidence matrix", implemented: true, tested: false, verified: false, requirements: [] },
  { type: "module", path: "server/lib/disruption/contradictionScan_v3.ts", description: "Machine contradiction scan tool", implemented: true, tested: false, verified: false, requirements: [] },
  { type: "module", path: "server/lib/disruption/canonicalRules.ts", description: "Canonical rules for scan", implemented: true, tested: false, verified: false, requirements: [] },

  // ── TESTS ──
  { type: "test", path: "tests/provider_fids.test.ts", description: "Provider + FIDS tests (23 tests)", implemented: true, tested: true, verified: true, requirements: ["REQ-FIDS-001", "REQ-STATUS-001", "REQ-CODESHARE-001"] },
  { type: "test", path: "tests/timestamps_raw.test.ts", description: "Timestamp + raw ingress tests (15 tests)", implemented: true, tested: true, verified: true, requirements: ["REQ-TIMESTAMP-001", "REQ-TIMESTAMP-002", "REQ-TIMESTAMP-003"] },
  { type: "test", path: "tests/adaptation.test.ts", description: "Adaptive m_i tests (23 tests)", implemented: true, tested: true, verified: true, requirements: ["REQ-ADAPT-001", "REQ-ADAPT-002", "REQ-ADAPT-003", "REQ-ADAPT-004"] },
  { type: "test", path: "tests/weather_history.test.ts", description: "Weather + historical store tests (10 tests)", implemented: true, tested: true, verified: true, requirements: ["REQ-WEATHER-001", "REQ-HIST-001", "REQ-HIST-002", "REQ-HIST-003"] },

  // ── MIGRATIONS ──
  { type: "migration", path: "migrations/0024_historical_feature_store.sql", description: "Historical feature store tables", implemented: true, tested: false, verified: false, requirements: ["REQ-HIST-001"] },
  { type: "migration", path: "migrations/0025_raw_ingress_immutable_layers.sql", description: "Raw ingress immutable layers tables", implemented: true, tested: false, verified: false, requirements: ["REQ-RAW-001"] },

  // ── CONFIG ──
  { type: "config", path: "vitest.config.ts", description: "Test configuration", implemented: true, tested: true, verified: true, requirements: [] },
  { type: "config", path: "package.json", description: "Project dependencies (vitest added)", implemented: true, tested: true, verified: true, requirements: [] },

  // ── DOCUMENTS ──
  { type: "document", path: "AugMDnotes/V39_CANONICAL_RULE_REGISTRY.yaml", description: "Canonical rule registry", implemented: true, tested: false, verified: false, requirements: [] },
  { type: "document", path: "AugMDnotes/IMPLEMENTATION_LOG.md", description: "Implementation log", implemented: true, tested: false, verified: false, requirements: [] },
  { type: "document", path: "AugMDnotes/V3.9_DataCollectPlan.md", description: "Binding PART 1", implemented: true, tested: false, verified: false, requirements: [] },
  { type: "document", path: "AugMDnotes/chatGPTv3_Sep1_1.md", description: "Authoritative implementation directive", implemented: true, tested: false, verified: false, requirements: [] },
];

/**
 * Get manifest summary.
 */
export function getManifestSummary(): {
  total: number;
  implemented: number;
  tested: number;
  verified: number;
  byType: Record<string, number>;
} {
  const total = V39_MANIFEST.length;
  const implemented = V39_MANIFEST.filter(m => m.implemented).length;
  const tested = V39_MANIFEST.filter(m => m.tested).length;
  const verified = V39_MANIFEST.filter(m => m.verified).length;

  const byType: Record<string, number> = {};
  for (const entry of V39_MANIFEST) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }

  return { total, implemented, tested, verified, byType };
}
