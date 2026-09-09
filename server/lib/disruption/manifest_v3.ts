/**
 * V3.9-f.8 current artifact inventory and byte-hash proof.
 * Historical RUN IDs never certify changed source bytes. The inventory names
 * only current authoritative/required Phase-0 artifacts; retired legacy owners
 * are intentionally not represented as executable authority.
 */
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

export const MANIFEST_PLAN_VERSION = "v3.9-f.8";
export const MANIFEST_SCHEMA_VERSION = "0047";

export interface ManifestEntry {
  type: "module" | "test" | "migration" | "config" | "document" | "rule" | "script";
  path: string;
  description: string;
  implemented: boolean;
  tested: boolean;
  evidenceId: string | null;
  requirements: string[];
}

const current = (
  type: ManifestEntry["type"],
  path: string,
  description: string,
  requirements: string[] = [],
): ManifestEntry => ({
  type,
  path,
  description,
  implemented: true,
  tested: false,
  evidenceId: null,
  requirements,
});

export const V39_MANIFEST: ManifestEntry[] = [
  // ---- Runtime / transport / admission owners ----
  current("module", "server/db.ts", "production boot-migration registry through schema 0047"),
  current("module", "server/routes_v3.ts", "webhook ingress and guarded management surface; HTTP Phase-6 start/stop explicitly refused", ["REQ-RAW-001", "REQ-RAW-002"]),
  current("module", "server/lib/disruption/aerodataboxLimiter_v3.ts", "central AeroDataBox transport, strict subscription-account reader, and REST-unit ledger", ["REQ-RATE-001"]),
  current("module", "server/lib/disruption/adbCollectionController_v3.ts", "hash-frozen Phase-6 parent admission and initial frozen segment creation owner"),
  current("module", "server/lib/disruption/phase6SafetyWatchdog_v39.ts", "sole long-lived frozen SEND-aware Phase-6 runtime, cleanup, settlement and parent-finalization owner", ["REQ-BUDGET-001", "REQ-SETTLE-001"]),
  current("module", "server/lib/disruption/phase6SegmentActivation_v39.ts", "serialized exact frozen child-segment continuation owner with strict R1 and no redraw", ["REQ-BUDGET-001", "REQ-CAL-001"]),
  current("module", "server/lib/disruption/phase6SamplingDecision_v39.ts", "frozen slot-region/adaptive sampling decision", ["REQ-ADAPT-001", "REQ-CAL-001"]),
  current("module", "server/lib/disruption/adaptiveMi_v3.ts", "binding REGIONAL adaptive state machine", ["REQ-ADAPT-001", "REQ-ADAPT-002", "REQ-ADAPT-003", "REQ-ADAPT-004"]),
  current("module", "server/lib/disruption/budgetAccounting_v3.ts", "Alert/REST budget accounting", ["REQ-BUDGET-001", "REQ-BUDGET-002"]),
  current("module", "server/lib/disruption/settlement_v3.ts", "shared >=3-read stable balance settlement", ["REQ-SETTLE-001"]),
  current("module", "server/lib/disruption/gates_v3.ts", "gate computations"),
  current("module", "server/lib/disruption/authRecord_v39.ts", "exact authorization artifact verifier"),
  current("module", "server/lib/disruption/retentionSecurity_v39.ts", "security/retention/incident machinery"),

  // ---- Population, identity, timestamp, raw/event layers ----
  current("module", "server/lib/disruption/fidsCensus_v3.ts", "provider-observable FIDS population and fail-closed service identity", ["REQ-FIDS-001", "REQ-FIDS-002", "REQ-FIDS-003"]),
  current("module", "server/lib/disruption/flightInstanceCanonical_v3.ts", "canonical physical flight identity and schedule versions", ["REQ-CODESHARE-001", "REQ-CODESHARE-002"]),
  current("module", "server/lib/disruption/flightNotificationExtractor_v3.ts", "notification extraction/provenance"),
  current("module", "server/lib/disruption/rawIngress_v3.ts", "atomic raw-before-2xx envelope/item persistence and provider-attempt provenance", ["REQ-RAW-001", "REQ-RAW-002"]),
  current("module", "server/lib/disruption/flightDataPrePostStore_v3.ts", "append-only semantic research events"),
  current("module", "server/lib/disruption/timestampTaxonomy_v3.ts", "cutoff timestamp taxonomy", ["REQ-TIMESTAMP-001", "REQ-TIMESTAMP-002", "REQ-TIMESTAMP-003"]),

  // ---- Snapshot/feature/outcome owners ----
  current("module", "server/lib/disruption/preSnapshotBuilder_v3.ts", "population-defined PRE materializer"),
  current("module", "server/lib/disruption/historicalFeatureStore_v3.ts", "bitemporal historical store with infrastructure-failure distinction", ["REQ-HIST-001", "REQ-HIST-002", "REQ-HIST-003"]),
  current("module", "server/lib/disruption/weatherSignal.ts", "cutoff-safe explicit-missing weather", ["REQ-WEATHER-001", "REQ-WEATHER-002"]),
  current("module", "server/lib/disruption/airborneSnapshotBuilder_v3.ts", "AIRBORNE snapshot pure builder"),
  current("module", "server/lib/disruption/airborneMaterializer_v39.ts", "canonical cutoff-safe AIRBORNE materializer"),
  current("module", "server/lib/disruption/outcomeTerminalizer_v3.ts", "target-specific terminalizer"),
  current("module", "server/lib/disruption/outcomeRecoveryOrchestrator_v39.ts", "bounded original-query outcome recovery"),

  // ---- Probe/calendar/freeze owners ----
  current("module", "server/lib/disruption/anchorPromotion_v39.ts", "exact-five Stage-2 promotion with anchor-score identity bounds"),
  current("module", "server/lib/disruption/probeExecution_v39.ts", "hash-frozen paid probe execution and probe-budget-day safety"),
  current("module", "server/lib/disruption/experimentCalendarSolver_v39.ts", "strict randomized crossover solver", ["REQ-CAL-001", "REQ-CAL-002", "REQ-CAL-003"]),
  current("module", "server/lib/disruption/configRegistry_v3.ts", "frozen configuration registry", ["REQ-CONFIG-001"]),
  current("module", "server/lib/disruption/requirementMatrix_v3.ts", "requirement traceability"),
  current("module", "server/lib/disruption/contradictionScan_v3.ts", "contradiction scanner"),

  // ---- Current executable scripts / anti-bypass wrappers ----
  current("script", "scripts/v39_paid_guard_v39.ts", "shared paid-operation AUTH verifier"),
  current("script", "scripts/v39_wrapper_runtime_v39.ts", "wrapper front-door plus owner re-verification forwarding"),
  current("script", "scripts/v39_probe_stage1_v39.ts", "Stage-1 AUTH wrapper"),
  current("script", "scripts/v39_probe_stage1_owner_v39.ts", "ordered frozen Stage-1/replacement owner"),
  current("script", "scripts/v39_probe_stage2_v39.ts", "Stage-2 AUTH wrapper"),
  current("script", "scripts/v39_probe_stage2_owner_v39.ts", "robust exact-five Stage-2 confirmation owner"),
  current("script", "scripts/v39_phase6_start_v39.ts", "Phase-6 AUTH wrapper"),
  current("script", "scripts/v39_phase6_start_owner_v39.ts", "manifest/code/schema/safety-heartbeat-bound Phase-6 start owner"),
  current("script", "scripts/v39_phase6_pause_v39.ts", "durable emergency pause using the same serialized runtime cleanup/settlement owner"),
  current("script", "scripts/calendar_solve.ts", "strict calendar CLI"),
  current("script", "scripts/v39_security_verify_v39.ts", "deployment-aware security/retention verifier"),
  current("script", "scripts/v39_preflight_v39.ts", "aggregate Phase-0 preflight"),
  current("script", "scripts/db_verify_phase0_v39.ts", "current schema/trigger verification"),
  current("script", ".github/workflows/v39-phase0-offline.yml", "zero-provider CI: locked install, typecheck, offline tests, production build"),

  // ---- Plan-derived regression tests ----
  current("test", "tests/adaptation.test.ts", "binding adaptation semantics"),
  current("test", "tests/timestamps_raw.test.ts", "timestamp/raw semantics"),
  current("test", "tests/raw_ingress_v39.test.ts", "raw-before-2xx/event-order and HTTP lifecycle anti-bypass regression"),
  current("test", "tests/weather_history.test.ts", "weather/history infrastructure distinction"),
  current("test", "tests/fids_identity_failclosed_v39.test.ts", "FIDS service-date/identity fail-closed behavior"),
  current("test", "tests/provider_fids.test.ts", "provider/FIDS contract and confirmed operating-leg population semantics"),
  current("test", "tests/pre_materialize_v39.test.ts", "PRE materialization"),
  current("test", "tests/airborne_materializer_v39.test.ts", "AIRBORNE materializer"),
  current("test", "tests/airborne_pipeline_v39.test.ts", "AIRBORNE builder/pipeline"),
  current("test", "tests/outcome_recovery_v39.test.ts", "outcome recovery"),
  current("test", "tests/flight_identity_v39.test.ts", "canonical identity/retime separation"),
  current("test", "tests/anchor_promotion_v39.test.ts", "exact-five score-bound promotion"),
  current("test", "tests/frame_selector_v39.test.ts", "frozen slot-region selector semantics"),
  current("test", "tests/calendar_solver_v39.test.ts", "calendar compatibility"),
  current("test", "tests/calendar_solver_strict_v39.test.ts", "calendar hard constraints"),
  current("test", "tests/fidsTimezone.test.ts", "FIDS timezone/DST"),
  current("test", "tests/runtime_safety_v39.test.ts", "runtime fail-closed parser/retries"),
  current("test", "tests/budget_accounting_v39.test.ts", "budget/accounting"),
  current("test", "tests/gates_v39.test.ts", "gate/settlement"),
  current("test", "tests/retention_security_v39.test.ts", "retention/security"),
  current("test", "tests/scanner_manifest_v39.test.ts", "manifest/scanner"),
  current("test", "tests/phase0_closure_v39.test.ts", "closure/anti-bypass"),
  current("test", "tests/phase6_safety_watchdog_v39.test.ts", "scaled Gate-4 and production SEND-aware Phase-6 safety"),

  // ---- Additive schema lineage used by current Phase-0/Phase-6 machinery ----
  current("migration", "migrations/0017_collection_v39_credit_accounting.sql", "credit accounting"),
  current("migration", "migrations/0018_collection_v39_delivery_failure_flag.sql", "delivery-failure flag"),
  current("migration", "migrations/0019_collection_v39_population_and_events.sql", "population/events"),
  current("migration", "migrations/0020_collection_v39_airborne_time_series.sql", "airborne time-series base"),
  current("migration", "migrations/0021_collection_v39_sampling_frame.sql", "sampling frame"),
  current("migration", "migrations/0022_collection_v39_design_probability.sql", "design probability"),
  current("migration", "migrations/0023_anchor_probe_results.sql", "anchor probe base"),
  current("migration", "migrations/0024_historical_feature_store.sql", "historical feature store"),
  current("migration", "migrations/0025_raw_ingress_immutable_layers.sql", "raw ingress"),
  current("migration", "migrations/0026_snapshot_outcome_tables.sql", "PRE/outcome persistence"),
  current("migration", "migrations/0027_probe_budget_day.sql", "probe budget-day lifecycle"),
  current("migration", "migrations/0028_frame_versioning.sql", "frame versioning"),
  current("migration", "migrations/0029_fids_population_production.sql", "FIDS production provenance"),
  current("migration", "migrations/0030_webhook_canonical_identity.sql", "webhook canonical identity"),
  current("migration", "migrations/0031_retention_tombstone.sql", "retention tombstone"),
  current("migration", "migrations/0032_airborne_canonical_identity.sql", "airborne canonical identity"),
  current("migration", "migrations/0033_incident_stop.sql", "persistent incident stop base"),
  current("migration", "migrations/0034_airborne_phase0_conformance.sql", "canonical AIRBORNE uniqueness/eligibility"),
  current("migration", "migrations/0035_anchor_probe_identity_bounds.sql", "anchor ambiguity evidence"),
  current("migration", "migrations/0036_webhook_identity_schedule_versions.sql", "schedule-aware webhook identity/versioning"),
  current("migration", "migrations/0037_phase6_sampling_decision_state.sql", "slot-region/adaptive-state provenance"),
  current("migration", "migrations/0038_phase6_parent_segment_lifecycle.sql", "parent/segment/gap lifecycle"),
  current("migration", "migrations/0039_phase6_authorization_and_admission.sql", "persistent hash-bound Phase-6 authorization"),
  current("migration", "migrations/0040_phase6_calendar_execution_fields.sql", "frozen scheduled start/duration/frame fields"),
  current("migration", "migrations/0041_phase6_start_admission_tolerance.sql", "frozen start-admission tolerance"),
  current("migration", "migrations/0042_webhook_identity_resolution_ledger.sql", "append-only webhook identity resolution/quarantine"),
  current("migration", "migrations/0043_phase6_start_time_guard.sql", "DB-enforced frozen Phase-6 start boundary"),
  current("migration", "migrations/0044_webhook_attempt_provenance.sql", "notification and delivery-attempt provenance"),
  current("migration", "migrations/0045_incident_stop_persistence_cause.sql", "incident cause alignment"),
  current("migration", "migrations/0046_subscription_create_uncertainty_stop.sql", "ambiguous provider CREATE -> incident/MISMATCH"),
  current("migration", "migrations/0047_phase6_frozen_safety_and_overshoot.sql", "frozen Phase-6 soft-stop/run-cap/settlement/overshoot safety"),

  current("document", "SEPmd/V3.9_DataCollectPlan_f.8.md", "binding Plan §§0-21"),
  current("document", "SEPmd/V3.9_IMPLEMENTATION_LOG.md", "implementation/status/manual subordinate to Plan"),
  current("document", "SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md", "append-only evidence ledger"),
];

export function getManifestSummary() {
  const byType: Record<string, number> = {};
  for (const e of V39_MANIFEST) byType[e.type] = (byType[e.type] ?? 0) + 1;
  return {
    total: V39_MANIFEST.length,
    implemented: V39_MANIFEST.filter((e) => e.implemented).length,
    tested: V39_MANIFEST.filter((e) => e.tested).length,
    withEvidence: V39_MANIFEST.filter((e) => e.evidenceId).length,
    byType,
  };
}

export type EvalPartition = "TRAIN" | "VALIDATION" | "TEST";
export const SPLIT_TRAIN_END = 20;
export const SPLIT_VALIDATION_END = 25;
export const SPLIT_TEST_END = 31;
export const SPLIT_HOLDOUT_GAP_BATCH_DAYS = 0;
export function splitPartitionForDay(i: number): EvalPartition | null {
  if (!Number.isInteger(i) || i < 1 || i > 31) return null;
  return i <= SPLIT_TRAIN_END ? "TRAIN" : i <= SPLIT_VALIDATION_END ? "VALIDATION" : "TEST";
}

function sha(s: string): string { return createHash("sha256").update(s).digest("hex"); }
export function splitRuleHash(seed: string) {
  return sha(JSON.stringify({
    train: [1, SPLIT_TRAIN_END],
    validation: [SPLIT_TRAIN_END + 1, SPLIT_VALIDATION_END],
    test: [SPLIT_VALIDATION_END + 1, SPLIT_TEST_END],
    gap: SPLIT_HOLDOUT_GAP_BATCH_DAYS,
    groupBy: "flight_instance_id",
    seed,
    ordering: "run_day_index_chronological",
  }));
}

export const STALENESS_BUCKETS_MIN = [10, 30, 60, 180, 360, 720, 1440, 2880];
export function stalenessBucket(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "invalid";
  const m = sec / 60;
  for (const b of STALENESS_BUCKETS_MIN) if (m <= b) return `<=${b}m`;
  return ">2880m";
}

export interface ManifestCompleteness {
  complete: boolean;
  missingEvidence: string[];
  missingImplementation: string[];
}
export function checkManifestCompleteness(
  entries: ManifestEntry[] = V39_MANIFEST,
  evidenceByPath: Record<string, string> = {},
): ManifestCompleteness {
  const missingEvidence: string[] = [];
  const missingImplementation: string[] = [];
  for (const e of entries) {
    if (["document", "config"].includes(e.type)) continue;
    if (!e.implemented) missingImplementation.push(e.path);
    const evidence = evidenceByPath[e.path] ?? e.evidenceId;
    if (!evidence) missingEvidence.push(e.path);
  }
  return {
    complete: missingEvidence.length === 0 && missingImplementation.length === 0,
    missingEvidence,
    missingImplementation,
  };
}

export interface ArtifactHashProof { path: string; sha256: string; exists: boolean }
export interface ManifestHashProof { artifacts: ArtifactHashProof[]; aggregateSha256: string; missing: string[] }

export function deriveManifestHashProof(
  root = process.cwd(),
  entries: ManifestEntry[] = V39_MANIFEST,
): ManifestHashProof {
  const artifacts: ArtifactHashProof[] = [];
  const missing: string[] = [];
  for (const e of entries.filter((x) => !["document", "config"].includes(x.type))) {
    try {
      const bytes = readFileSync(join(root, e.path));
      artifacts.push({
        path: e.path,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        exists: true,
      });
    } catch {
      artifacts.push({ path: e.path, sha256: "", exists: false });
      missing.push(e.path);
    }
  }
  const aggregateSha256 = sha(JSON.stringify({
    plan: MANIFEST_PLAN_VERSION,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    artifacts: [...artifacts].sort((a, b) => a.path.localeCompare(b.path)),
    splitRule: splitRuleHash("manifest-rule"),
  }));
  return { artifacts, aggregateSha256, missing };
}

export function checkManifestHashProof(
  proof: ManifestHashProof,
  entries: ManifestEntry[] = V39_MANIFEST,
) {
  const failures: string[] = [];
  if (proof.missing.length) failures.push(...proof.missing.map((x) => `missing:${x}`));
  const required = new Set(
    entries.filter((x) => !["document", "config"].includes(x.type)).map((x) => x.path),
  );
  for (const p of proof.artifacts) {
    if (required.has(p.path) && (!p.exists || !/^[a-f0-9]{64}$/.test(p.sha256))) {
      failures.push(`invalid-hash:${p.path}`);
    }
  }
  for (const path of required) {
    if (!proof.artifacts.some((p) => p.path === path)) failures.push(`unproved:${path}`);
  }
  return { complete: failures.length === 0, failures };
}
