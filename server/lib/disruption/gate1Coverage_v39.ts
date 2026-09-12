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
  catalogIcaos: string[] | (() => string[]);
  fetchedAtUtc: string;
  providerPin: string;
}

export interface Gate1CoverageArtifact {
  schema_version: "v3.9-gate1-coverage-2";
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
  const catalogSource = typeof input.catalogIcaos === "function" ? input.catalogIcaos() : input.catalogIcaos;
  const catalog = Array.from(new Set(catalogSource.map(norm).filter(Boolean))).sort();
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
    schema_version: "v3.9-gate1-coverage-2" as const,
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

/**
 * Verify that a persisted Gate-1 artifact is the exact current schema, a real
 * PASS result, and cryptographically self-consistent. This deliberately rejects
 * historical/sanitized compatibility artifacts such as PASS_MEASUREMENT_RETAINED.
 */
export function verifyGate1CoverageArtifact(value: unknown): value is Gate1CoverageArtifact {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.schema_version !== "v3.9-gate1-coverage-2") return false;
  if (candidate.phase_gate !== GATE1_PHASE_GATE) return false;
  if (candidate.status !== "PASS") return false;
  if (!/^GATE-1-\d{8}-[A-Z0-9]+$/.test(String(candidate.evidence_id ?? ""))) return false;
  if (!/^AUTH-\d{8}-[A-Z0-9]+$/.test(String(candidate.authorization_id ?? ""))) return false;
  if (!candidate.coverage || typeof candidate.coverage !== "object" || Array.isArray(candidate.coverage)) return false;
  if (candidate.content_classification !== "non_aerodatabox_metadata") return false;
  const expected = String(candidate.artifact_sha256 ?? "");
  if (!/^[a-f0-9]{64}$/.test(expected)) return false;
  const { artifact_sha256: _ignored, ...unsigned } = candidate;
  return sha256Hex(canonical(unsigned)) === expected;
}

export function serializeGate1Artifact(artifact: Gate1CoverageArtifact): string {
  return `${canonical(artifact)}\n`;
}
