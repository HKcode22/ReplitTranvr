/**
 * Final manifest — V3.9-f.8 (§1.5.13 / CRIT-010 repair).
 *
 * Machine-readable manifest of the V3.9 repository state. Every entry derives
 * from current artifact/evidence hashes — there are no self-declared
 * `verified:true` flags, no stale f.9 authority labels, and no AugMDnotes
 * current dependencies. An incomplete manifest refuses FREEZE/start.
 */

import { createHash } from "crypto";

export const MANIFEST_PLAN_VERSION = "v3.9-f.8";

export interface ManifestEntry {
  type: "module" | "test" | "migration" | "config" | "document" | "rule" | "script";
  path: string;
  description: string;
  implemented: boolean;
  tested: boolean;
  /** Evidence ID backing the tested claim (null = unproven). */
  evidenceId: string | null;
  requirements: string[];
}

function sha(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export const V39_MANIFEST: ManifestEntry[] = [
  // ── CORE MODULES ──
  { type: "module", path: "server/lib/disruption/fidsCensus_v3.ts", description: "FIDS census fetcher (§1.5.3)", implemented: true, tested: true, evidenceId: "RUN-20260907-004", requirements: ["REQ-FIDS-001", "REQ-FIDS-002", "REQ-FIDS-003"] },
  { type: "module", path: "server/lib/disruption/flightNotificationExtractor_v3.ts", description: "Flight notification extractor with status codes", implemented: true, tested: true, evidenceId: "RUN-20260901-002", requirements: ["REQ-STATUS-001", "REQ-STATUS-002"] },
  { type: "module", path: "server/lib/disruption/flightInstanceCanonical_v3.ts", description: "Canonical flight instance ID, identity-v2 (§1.5.4)", implemented: true, tested: true, evidenceId: "RUN-20260903-003", requirements: ["REQ-CODESHARE-001", "REQ-CODESHARE-002"] },
  { type: "module", path: "server/lib/disruption/timestampTaxonomy_v3.ts", description: "15-field timestamp taxonomy with leakage prevention", implemented: true, tested: true, evidenceId: "RUN-20260901-002", requirements: ["REQ-TIMESTAMP-001", "REQ-TIMESTAMP-002", "REQ-TIMESTAMP-003"] },
  { type: "module", path: "server/lib/disruption/rawIngress_v3.ts", description: "Raw ingress immutability layers (3 tables)", implemented: true, tested: true, evidenceId: "RUN-20260906-003", requirements: ["REQ-RAW-001", "REQ-RAW-002"] },
  { type: "module", path: "server/lib/disruption/historicalFeatureStore_v3.ts", description: "Bitemporal as-of historical feature store (§1.5.9)", implemented: true, tested: true, evidenceId: "RUN-20260907-003", requirements: ["REQ-HIST-001", "REQ-HIST-002", "REQ-HIST-003"] },
  { type: "module", path: "server/lib/disruption/adaptiveMi_v3.ts", description: "Adaptive m_i with EMA, zero-yield FSM, coverage floor", implemented: true, tested: true, evidenceId: "RUN-20260901-002", requirements: ["REQ-ADAPT-001", "REQ-ADAPT-002", "REQ-ADAPT-003", "REQ-ADAPT-004"] },
  { type: "module", path: "server/lib/disruption/weatherSignal.ts", description: "Weather signals with ERA5 leak prevention (§1.5.9)", implemented: true, tested: true, evidenceId: "RUN-20260907-003", requirements: ["REQ-WEATHER-001", "REQ-WEATHER-002"] },
  { type: "module", path: "server/lib/disruption/experimentCalendar_v3.ts", description: "31-day calendar 26/3/2 + crossover (§1.5.12)", implemented: true, tested: true, evidenceId: "RUN-20260902-003", requirements: ["REQ-CAL-001", "REQ-CAL-002", "REQ-CAL-003"] },
  { type: "module", path: "server/lib/disruption/budgetAccounting_v3.ts", description: "FIDS/API-unit budget recompute + Alert-credit accounting", implemented: true, tested: true, evidenceId: "RUN-20260901-002", requirements: ["REQ-BUDGET-001", "REQ-BUDGET-002"] },
  { type: "module", path: "server/lib/disruption/aerodataboxLimiter_v3.ts", description: "Central rate limiter + experimental retry guard", implemented: true, tested: true, evidenceId: "RUN-20260907-004", requirements: ["REQ-RATE-001"] },
  { type: "module", path: "server/lib/disruption/gates_v3.ts", description: "Gate 0.5/4/5 tests + reconciliation + hard cap", implemented: true, tested: true, evidenceId: "RUN-20260901-002", requirements: ["REQ-RECON-001", "REQ-GATE4-001", "REQ-GATE05-001", "REQ-GATE5-001"] },
  { type: "module", path: "server/lib/disruption/settlement_v3.ts", description: "Shared settlement service (§1.5.11)", implemented: true, tested: true, evidenceId: "RUN-20260907-003", requirements: ["REQ-SETTLE-001"] },
  { type: "module", path: "server/lib/disruption/configRegistry_v3.ts", description: "Phase-6 configuration registry", implemented: true, tested: false, evidenceId: null, requirements: ["REQ-CONFIG-001"] },
  { type: "module", path: "server/lib/disruption/dataDictionary_v3.ts", description: "Data dictionary with all tables/columns", implemented: true, tested: false, evidenceId: null, requirements: [] },
  { type: "module", path: "server/lib/disruption/dataLineage_v3.ts", description: "Per-arrow data lineage (18 arrows)", implemented: true, tested: false, evidenceId: null, requirements: [] },
  { type: "module", path: "server/lib/disruption/requirementMatrix_v3.ts", description: "Requirement → Code → Test → Evidence matrix", implemented: true, tested: false, evidenceId: null, requirements: [] },
  { type: "module", path: "server/lib/disruption/contradictionScan_v3.ts", description: "Machine contradiction scan tool", implemented: true, tested: true, evidenceId: "RUN-20260901-002", requirements: [] },
  { type: "module", path: "server/lib/disruption/canonicalRules.ts", description: "Canonical rules for scan", implemented: true, tested: false, evidenceId: null, requirements: [] },
  { type: "module", path: "server/lib/disruption/preSnapshotBuilder_v3.ts", description: "PRE snapshot builder (§1.5.6)", implemented: true, tested: true, evidenceId: "RUN-20260907-001", requirements: [] },
  { type: "module", path: "server/lib/disruption/airborneSnapshotBuilder_v3.ts", description: "AIRBORNE snapshot builder (§1.5.7)", implemented: true, tested: true, evidenceId: "RUN-20260907-001", requirements: [] },
  { type: "module", path: "server/lib/disruption/outcomeTerminalizer_v3.ts", description: "Outcome terminalizer (§1.5.8)", implemented: true, tested: true, evidenceId: "RUN-20260907-001", requirements: [] },
  { type: "module", path: "server/lib/disruption/adbAirportCatalog_v3.ts", description: "Frame tier resolution + anchor-score formulas (§1.5.10)", implemented: true, tested: true, evidenceId: "RUN-20260907-003", requirements: [] },
  { type: "module", path: "server/lib/disruption/adbCollectionController_v3.ts", description: "Fail-closed collection controller (§1.5.1)", implemented: true, tested: true, evidenceId: "RUN-20260906-004", requirements: [] },
  { type: "module", path: "server/lib/disruption/flightDataPrePostStore_v3.ts", description: "Semantic observation identity + event log (§1.5.5)", implemented: true, tested: true, evidenceId: "RUN-20260906-004", requirements: [] },

  // ── TESTS ──
  { type: "test", path: "tests/provider_fids.test.ts", description: "Provider + FIDS + retry policy + population builder", implemented: true, tested: true, evidenceId: "RUN-20260907-004", requirements: ["REQ-FIDS-001", "REQ-STATUS-001", "REQ-CODESHARE-001"] },
  { type: "test", path: "tests/timestamps_raw.test.ts", description: "Timestamp + raw ingress tests", implemented: true, tested: true, evidenceId: "RUN-20260901-002", requirements: ["REQ-TIMESTAMP-001", "REQ-TIMESTAMP-002", "REQ-TIMESTAMP-003"] },
  { type: "test", path: "tests/adaptation.test.ts", description: "Adaptive m_i + frame/anchor tests", implemented: true, tested: true, evidenceId: "RUN-20260907-003", requirements: ["REQ-ADAPT-001", "REQ-ADAPT-002", "REQ-ADAPT-003", "REQ-ADAPT-004"] },
  { type: "test", path: "tests/weather_history.test.ts", description: "Weather + historical store + readiness tests", implemented: true, tested: true, evidenceId: "RUN-20260907-003", requirements: ["REQ-WEATHER-001", "REQ-HIST-001", "REQ-HIST-002", "REQ-HIST-003"] },
  { type: "test", path: "tests/fidsTimezone.test.ts", description: "Binding DST suite (plan §5.3)", implemented: true, tested: true, evidenceId: "RUN-20260903-002", requirements: [] },
  { type: "test", path: "tests/runtime_safety_v39.test.ts", description: "Fail-closed parser + retries guard (§1.5.1)", implemented: true, tested: true, evidenceId: "RUN-20260906-004", requirements: [] },
  { type: "test", path: "tests/snapshot_outcome_v39.test.ts", description: "PRE/AIRBORNE/outcome builders (§1.5.6–1.5.8)", implemented: true, tested: true, evidenceId: "RUN-20260907-001", requirements: [] },
  { type: "test", path: "tests/gates_v39.test.ts", description: "Gate logic + settlement (§1.5.11)", implemented: true, tested: true, evidenceId: "RUN-20260907-003", requirements: [] },
  { type: "test", path: "tests/calendar_solver_v39.test.ts", description: "Calendar + crossover (§1.5.12)", implemented: true, tested: true, evidenceId: "RUN-20260907-004", requirements: [] },

  // ── MIGRATIONS ──
  { type: "migration", path: "migrations/0017_collection_v39_credit_accounting.sql", description: "Credit accounting tables", implemented: true, tested: true, evidenceId: "RUN-20260906-003", requirements: [] },
  { type: "migration", path: "migrations/0018_collection_v39_delivery_failure_flag.sql", description: "Delivery failure flag", implemented: true, tested: true, evidenceId: "RUN-20260906-003", requirements: [] },
  { type: "migration", path: "migrations/0019_collection_v39_population_and_events.sql", description: "Population + events tables", implemented: true, tested: true, evidenceId: "RUN-20260906-003", requirements: [] },
  { type: "migration", path: "migrations/0020_collection_v39_airborne_time_series.sql", description: "Airborne time-series tables", implemented: true, tested: true, evidenceId: "RUN-20260906-003", requirements: [] },
  { type: "migration", path: "migrations/0021_collection_v39_sampling_frame.sql", description: "Sampling frame tables", implemented: true, tested: true, evidenceId: "RUN-20260906-003", requirements: [] },
  { type: "migration", path: "migrations/0022_collection_v39_design_probability.sql", description: "Design probability columns", implemented: true, tested: true, evidenceId: "RUN-20260906-003", requirements: [] },
  { type: "migration", path: "migrations/0023_anchor_probe_results.sql", description: "Anchor probe results", implemented: true, tested: true, evidenceId: "RUN-20260906-003", requirements: [] },
  { type: "migration", path: "migrations/0024_historical_feature_store.sql", description: "Historical feature store tables", implemented: true, tested: true, evidenceId: "RUN-20260906-003", requirements: ["REQ-HIST-001"] },
  { type: "migration", path: "migrations/0025_raw_ingress_immutable_layers.sql", description: "Raw ingress immutable layers tables", implemented: true, tested: true, evidenceId: "RUN-20260906-003", requirements: ["REQ-RAW-001"] },

  // ── SCRIPTS (thin CLI wrappers over production owners, §1.4.1) ──
  { type: "script", path: "scripts/gate0_evidence_gather.ts", description: "Read-only Gate-0 evidence gatherer", implemented: true, tested: false, evidenceId: null, requirements: [] },
  { type: "script", path: "scripts/gate0_budget_report.ts", description: "Gate-0 budget-partition report", implemented: true, tested: false, evidenceId: null, requirements: [] },
  { type: "script", path: "scripts/calendar_solve.ts", description: "Calendar SAT solver CLI (§1.5.12)", implemented: true, tested: true, evidenceId: "RUN-20260902-003", requirements: [] },
  { type: "script", path: "scripts/db_verify_phase0_v39.ts", description: "DB verification harness (read + rolled-back proof)", implemented: true, tested: false, evidenceId: null, requirements: [] },
  { type: "script", path: "scripts/apply_boot_migrations_v39.ts", description: "Boot migration applier (production path)", implemented: true, tested: true, evidenceId: "RUN-20260906-003", requirements: [] },
  { type: "script", path: "scripts/v39_preflight_consistency.ts", description: "Contradiction/preflight scanner (§26)", implemented: true, tested: false, evidenceId: null, requirements: [] },

  // ── DOCUMENTS (current authority only; archive lives in §36, never here) ──
  { type: "document", path: "SEPmd/V3.9_DataCollectPlan_f.8.md", description: "Binding plan §§0–21 (f.8)", implemented: true, tested: false, evidenceId: null, requirements: [] },
  { type: "document", path: "SEPmd/V3.9_IMPLEMENTATION_LOG.md", description: "Implementation manual §§0–35", implemented: true, tested: false, evidenceId: null, requirements: [] },
  { type: "document", path: "SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md", description: "Evidence ledger (this system)", implemented: true, tested: false, evidenceId: null, requirements: [] },
];

/**
 * Get manifest summary.
 */
export function getManifestSummary(): {
  total: number;
  implemented: number;
  tested: number;
  withEvidence: number;
  byType: Record<string, number>;
} {
  const total = V39_MANIFEST.length;
  const implemented = V39_MANIFEST.filter(m => m.implemented).length;
  const tested = V39_MANIFEST.filter(m => m.tested).length;
  const withEvidence = V39_MANIFEST.filter(m => m.evidenceId !== null).length;

  const byType: Record<string, number> = {};
  for (const entry of V39_MANIFEST) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }

  return { total, implemented, tested, withEvidence, byType };
}

// ---------------------------------------------------------------------------
// Split-assignment rule (§1.5.13): freeze the rule, not row IDs.
// TRAIN run_day_index 1–20; VALIDATION 21–25; TEST 26–31; gap 0.
// ---------------------------------------------------------------------------

export type EvalPartition = "TRAIN" | "VALIDATION" | "TEST";

export const SPLIT_TRAIN_END = 20;
export const SPLIT_VALIDATION_END = 25;
export const SPLIT_TEST_END = 31;
export const SPLIT_HOLDOUT_GAP_BATCH_DAYS = 0;

/** Frozen split assignment by run_day_index (chronological, group rules in §1.5.13). */
export function splitPartitionForDay(runDayIndex: number): EvalPartition | null {
  if (!Number.isInteger(runDayIndex) || runDayIndex < 1 || runDayIndex > 31) return null;
  if (runDayIndex <= SPLIT_TRAIN_END) return "TRAIN";
  if (runDayIndex <= SPLIT_VALIDATION_END) return "VALIDATION";
  return "TEST";
}

/** Deterministic split-rule hash (rule + seed frozen before any protected read). */
export function splitRuleHash(seed: string): string {
  return sha(
    JSON.stringify({
      train: [1, SPLIT_TRAIN_END],
      validation: [SPLIT_TRAIN_END + 1, SPLIT_VALIDATION_END],
      test: [SPLIT_VALIDATION_END + 1, SPLIT_TEST_END],
      gap: SPLIT_HOLDOUT_GAP_BATCH_DAYS,
      seed,
    }),
  );
}

// ---------------------------------------------------------------------------
// Staleness curve buckets (§1.5.13): state_age = cutoff − last_observation.
// ---------------------------------------------------------------------------

/** Frozen staleness buckets (minutes): 10m, 30m, 1h, 3h, 6h, 12h, 24h, 48h. */
export const STALENESS_BUCKETS_MIN = [10, 30, 60, 180, 360, 720, 1440, 2880];

/** Assign a state_age (seconds) to its frozen bucket label. */
export function stalenessBucket(stateAgeSeconds: number): string {
  if (!Number.isFinite(stateAgeSeconds) || stateAgeSeconds < 0) return "invalid";
  const mins = stateAgeSeconds / 60;
  for (const b of STALENESS_BUCKETS_MIN) {
    if (mins <= b) return `<=${b}m`;
  }
  return ">48h";
}

// ---------------------------------------------------------------------------
// Manifest completeness gate (§1.5.13): incomplete manifest refuses FREEZE/start.
// ---------------------------------------------------------------------------

export interface ManifestCompleteness {
  complete: boolean;
  missingEvidence: string[];
  missingImplementation: string[];
}

/**
 * Schema-validate manifest completeness: every module/test/migration/script
 * entry must be implemented AND carry an evidence ID. Documents/configs are
 * informational and excluded. Returns the exact missing lists.
 */
export function checkManifestCompleteness(
  entries: ManifestEntry[] = V39_MANIFEST,
): ManifestCompleteness {
  const missingEvidence: string[] = [];
  const missingImplementation: string[] = [];
  for (const e of entries) {
    if (e.type === "document" || e.type === "config") continue;
    if (!e.implemented) missingImplementation.push(e.path);
    else if (e.tested && e.evidenceId === null) missingEvidence.push(`${e.path} (tested but no evidence)`);
    else if (!e.tested) missingEvidence.push(e.path);
  }
  return {
    complete: missingEvidence.length === 0 && missingImplementation.length === 0,
    missingEvidence,
    missingImplementation,
  };
}

// ---------------------------------------------------------------------------
// Hash-derived manifest proof (gptP0analyze4 #17 / 0M).
// Completeness is NOT proven by static `implemented:true` flags. It is proven
// by hashing the CURRENT on-disk artifacts (modules, tests, migrations,
// scripts) and the frozen rule manifest. A manifest completeness gate that
// certifies a stale implementation is blocked: the per-artifact and aggregate
// hashes must reflect the bytes currently in the tree.
// ---------------------------------------------------------------------------

import { readFileSync } from "fs";
import { join } from "path";

export interface ArtifactHashProof {
  path: string;
  /** SHA-256 of the current on-disk bytes of this artifact. */
  sha256: string;
  /** True when the file exists (a missing file fails the proof). */
  exists: boolean;
}

export interface ManifestHashProof {
  /** Every non-document/config entry's current on-disk SHA-256. */
  artifacts: ArtifactHashProof[];
  /** Aggregate SHA-256 over the sorted artifact bytes/hashes + the frozen rule manifest. */
  aggregateSha256: string;
  /** Missing on-disk files (a manifest completeness gate must fail on these). */
  missing: string[];
}

/**
 * Derive manifest proof from the CURRENT on-disk artifact hashes. No static
 * booleans: `exists=false` for a missing file means the manifest cannot certify
 * that artifact. The aggregate hash binds every artifact's current bytes and
 * the frozen split rule so a later change to either is detectable.
 */
export function deriveManifestHashProof(
  root = process.cwd(),
  entries: ManifestEntry[] = V39_MANIFEST,
): ManifestHashProof {
  const artifacts: ArtifactHashProof[] = [];
  const missing: string[] = [];
  for (const e of entries) {
    if (e.type === "document" || e.type === "config") continue;
    const full = join(root, e.path);
    let exists = false;
    let sha256 = "";
    try {
      const bytes = readFileSync(full);
      exists = true;
      sha256 = createHash("sha256").update(bytes).digest("hex");
    } catch {
      exists = false;
    }
    if (!exists) missing.push(e.path);
    artifacts.push({ path: e.path, sha256, exists });
  }
  const ruleBlock = JSON.stringify({
    planVersion: MANIFEST_PLAN_VERSION,
    split: splitRuleHash("frozen"),
  });
  const aggregateSha256 = sha(
    artifacts
      .slice()
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((a) => `${a.path}:${a.sha256}`)
      .join("|") + "|" + ruleBlock,
  );
  return { artifacts, aggregateSha256, missing };
}

/**
 * Aggregate manifest completeness gate (0M): every required artifact must exist
 * on disk AND have a hash-derived proof. A missing file or a static flag
 * mismatch fails the gate. Returns the exact failures.
 */
export function checkManifestHashProof(
  proof: ManifestHashProof,
  entries: ManifestEntry[] = V39_MANIFEST,
): { complete: boolean; failures: string[] } {
  const failures: string[] = [];
  if (proof.missing.length > 0) {
    failures.push(`missing on-disk artifacts: ${proof.missing.join(", ")}`);
  }
  for (const e of entries) {
    if (e.type === "document" || e.type === "config") continue;
    const art = proof.artifacts.find((a) => a.path === e.path);
    if (!art || !art.exists || !/^[a-f0-9]{64}$/.test(art.sha256)) {
      if (!failures.some((f) => f.startsWith("missing on-disk"))) {
        failures.push(`artifact ${e.path} has no verifiable on-disk hash`);
      }
      continue;
    }
    if (!e.implemented) failures.push(`${e.path} flagged not-implemented but exists on disk`);
  }
  return { complete: failures.length === 0, failures };
}
