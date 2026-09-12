import { createHash } from "crypto";

/**
 * Phase 2B — Gate 1 coverage measurement (Plan §§4, 17 step 10; Log §1.7.2).
 *
 * Measures the provider-covered airport universe from the pinned FREE
 * health/coverage endpoints only. No FIDS, no refill, no subscription
 * mutation, no probe.
 *
 * IMPORTANT RETENTION RULE: provider airport membership lists are transient
 * measurement inputs. The committed/public artifact contains only counts,
 * deterministic hashes and provenance; it never republishes airport-by-airport
 * provider coverage lists. A later frame rebuild performs its own authorized
 * measurement and freezes the resulting frame under the then-current evidence.
 */

export const GATE1_PHASE_GATE = "Phase 2 / Gate 1";
export const GATE1_COVERAGE_SCHEMA_VERSION = "v3.9-gate1-coverage-2" as const;

export const COVERAGE_SERVICES = ["FlightSchedules", "FlightLiveUpdates", "AdsbUpdates"] as const;
export type CoverageService = typeof COVERAGE_SERVICES[number];

export interface CoverageFeedInput {
  airports: string[];
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

export function sha256Hex(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export interface Gate1CoverageInput {
  feeds: Record<CoverageService, CoverageFeedInput | null>;
  catalogIcaos: string[];
  fetchedAtUtc: string;
  providerPin: string;
}

export interface Gate1CoverageArtifact {
  schema_version: typeof GATE1_COVERAGE_SCHEMA_VERSION;
  phase_gate: typeof GATE1_PHASE_GATE;
  evidence_id: string;
  authorization_id: string;
  status: "PASS" | "BLOCKED";
  reasons: string[];
  universe_count: number | null;
  catalog_in_universe: number | null;
  universe_not_in_catalog_count: number | null;
  coverage: {
    fetched_at_utc: string;
    provider_pin: string;
    endpoint_cost_basis: "documented-free";
    per_feed: Record<CoverageService, { count: number; response_sha256: string } | null>;
    universe_set_sha256: string;
    catalog_in_universe_set_sha256: string;
    catalog_reference_sha256: string;
    source_list_handling: "transient-not-committed";
  } | null;
  content_classification: "non_aerodatabox_metadata";
  artifact_sha256: string;
}

const norm = (icao: string): string => icao.trim().toUpperCase();

export function buildGate1CoverageArtifact(
  input: Gate1CoverageInput,
  identity: { evidenceId: string; authorizationId: string },
): Gate1CoverageArtifact {
  const reasons: string[] = [];
  if (!Number.isFinite(Date.parse(input.fetchedAtUtc))) reasons.push("INVALID:fetched_at_utc");
  if (!input.providerPin || !input.providerPin.trim()) reasons.push("MISSING:provider_pin");
  const perFeed: Record<CoverageService, { count: number; response_sha256: string } | null> = {
    FlightSchedules: null,
    FlightLiveUpdates: null,
    AdsbUpdates: null,
  };
  const universe = new Set<string>();
  for (const service of COVERAGE_SERVICES) {
    const feed = input.feeds[service];
    if (!feed || !Array.isArray(feed.airports)) {
      reasons.push(`UNAVAILABLE:feed:${service}`);
      continue;
    }
    const list = Array.from(new Set(feed.airports.map(norm).filter(Boolean))).sort();
    for (const icao of list) universe.add(icao);
    perFeed[service] = {
      count: list.length,
      response_sha256: sha256Hex(canonical({ endpoint: service, airports: list })),
    };
  }
  const catalog = Array.from(new Set(input.catalogIcaos.map(norm).filter(Boolean))).sort();
  if (catalog.length === 0) reasons.push("MISSING:catalog_icaos");

  const universeIcao = Array.from(universe).sort();
  const universeSet = new Set(universeIcao);
  const catalogInUniverse = catalog.filter((icao) => universeSet.has(icao));

  const coverage = reasons.length === 0 ? {
    fetched_at_utc: input.fetchedAtUtc,
    provider_pin: input.providerPin,
    endpoint_cost_basis: "documented-free" as const,
    per_feed: perFeed as Record<CoverageService, { count: number; response_sha256: string }>,
    universe_set_sha256: sha256Hex(canonical(universeIcao)),
    catalog_in_universe_set_sha256: sha256Hex(canonical(catalogInUniverse)),
    catalog_reference_sha256: sha256Hex(canonical(catalog)),
    source_list_handling: "transient-not-committed" as const,
  } : null;

  const unsigned = {
    schema_version: GATE1_COVERAGE_SCHEMA_VERSION,
    phase_gate: GATE1_PHASE_GATE as typeof GATE1_PHASE_GATE,
    evidence_id: identity.evidenceId,
    authorization_id: identity.authorizationId,
    status: (reasons.length === 0 ? "PASS" : "BLOCKED") as "PASS" | "BLOCKED",
    reasons: [...new Set(reasons)].sort(),
    universe_count: coverage ? universeIcao.length : null,
    catalog_in_universe: coverage ? catalogInUniverse.length : null,
    universe_not_in_catalog_count: coverage ? universeIcao.length - catalogInUniverse.length : null,
    coverage,
    content_classification: "non_aerodatabox_metadata" as const,
  };
  return { ...unsigned, artifact_sha256: sha256Hex(canonical(unsigned)) };
}

export function verifyGate1CoverageArtifact(value: unknown): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { pass: false, failures: ["artifact-not-object"] };
  const artifact = value as Partial<Gate1CoverageArtifact>;
  if (artifact.schema_version !== GATE1_COVERAGE_SCHEMA_VERSION) failures.push("schema-version");
  if (artifact.phase_gate !== GATE1_PHASE_GATE) failures.push("phase-gate");
  if (artifact.status !== "PASS") failures.push("status-not-pass");
  if (!Array.isArray(artifact.reasons) || artifact.reasons.length !== 0) failures.push("reasons-not-empty");
  if (!artifact.evidence_id || !/^GATE-1-\d{8}-[A-Z0-9]+$/.test(artifact.evidence_id)) failures.push("evidence-id");
  if (!artifact.authorization_id || !/^AUTH-\d{8}-[A-Z0-9]+$/.test(artifact.authorization_id)) failures.push("authorization-id");
  if (artifact.content_classification !== "non_aerodatabox_metadata") failures.push("content-classification");

  const universe = artifact.universe_count;
  const catalog = artifact.catalog_in_universe;
  const outside = artifact.universe_not_in_catalog_count;
  if (!Number.isInteger(universe) || Number(universe) <= 0) failures.push("universe-count");
  if (!Number.isInteger(catalog) || Number(catalog) < 0) failures.push("catalog-count");
  if (!Number.isInteger(outside) || Number(outside) < 0) failures.push("outside-count");
  if (Number.isInteger(universe) && Number.isInteger(catalog) && Number.isInteger(outside) && Number(universe) - Number(catalog) !== Number(outside)) failures.push("coverage-count-math");

  const coverage = artifact.coverage as Gate1CoverageArtifact["coverage"] | undefined;
  if (!coverage || !Number.isFinite(Date.parse(String(coverage.fetched_at_utc ?? "")))) failures.push("coverage-timestamp");
  if (!coverage?.provider_pin?.trim()) failures.push("provider-pin");
  if (coverage?.endpoint_cost_basis !== "documented-free") failures.push("endpoint-cost-basis");
  if (coverage?.source_list_handling !== "transient-not-committed") failures.push("source-list-handling");
  for (const hash of [coverage?.universe_set_sha256, coverage?.catalog_in_universe_set_sha256, coverage?.catalog_reference_sha256]) {
    if (!/^[a-f0-9]{64}$/i.test(String(hash ?? ""))) failures.push("coverage-set-hash");
  }
  for (const service of COVERAGE_SERVICES) {
    const entry = coverage?.per_feed?.[service];
    if (!entry || !Number.isInteger(entry.count) || entry.count < 0 || !/^[a-f0-9]{64}$/i.test(entry.response_sha256)) failures.push(`feed:${service}`);
  }

  if (/^[a-f0-9]{64}$/i.test(String(artifact.artifact_sha256 ?? ""))) {
    const unsigned = {
      schema_version: artifact.schema_version,
      phase_gate: artifact.phase_gate,
      evidence_id: artifact.evidence_id,
      authorization_id: artifact.authorization_id,
      status: artifact.status,
      reasons: artifact.reasons,
      universe_count: artifact.universe_count,
      catalog_in_universe: artifact.catalog_in_universe,
      universe_not_in_catalog_count: artifact.universe_not_in_catalog_count,
      coverage: artifact.coverage,
      content_classification: artifact.content_classification,
    };
    if (sha256Hex(canonical(unsigned)) !== String(artifact.artifact_sha256).toLowerCase()) failures.push("artifact-hash-mismatch");
  } else {
    failures.push("artifact-hash");
  }

  return { pass: failures.length === 0, failures: [...new Set(failures)].sort() };
}

export function serializeGate1Artifact(artifact: Gate1CoverageArtifact): string {
  return `${canonical(artifact)}\n`;
}
