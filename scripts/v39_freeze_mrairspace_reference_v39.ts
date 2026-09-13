import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  computeTierHash,
  verifyFrozenTrafficReference,
  type FrozenTrafficAirportRow,
  type FrozenTrafficReferenceV39,
} from "../server/lib/disruption/trafficReference_v39";
import { requireTrafficReferenceFreshnessV39 } from "../server/lib/disruption/trafficReferenceFreshness_v39";
import { resolveRegion } from "../server/lib/disruption/regionMapping_v39";

const POLICY_VERSION = "mrairspace-observed-rank-05-30-65-v1";
const HUB_SHARE = 0.05;
const HUB_MID_CUMULATIVE_SHARE = 0.30;
const MAX_AGE_DAYS = 92;
const EXPECTED_PERIOD_START = "2025-07-01";
const EXPECTED_PERIOD_END = "2026-06-30";
const EXPECTED_MAY_GAP = "2026_Q2 May 5-7 missing or considerably incomplete per upstream release notes";

interface CandidateAirport {
  icao: string;
  traffic_metric_value: number;
  country_iso2: string;
  longitude_e: number | null;
  airport_timezone: string | null;
  out_degree: number | null;
  in_degree: number | null;
  undirected_degree: number | null;
  effective_carriers: number | null;
  carrier_coverage_share?: number | null;
  intl_share: number | null;
}
interface Candidate {
  schema_version: string;
  status: string;
  built_at_utc: string;
  reference_period_start: string;
  reference_period_end: string;
  traffic_metric_name: string;
  traffic_metric_units: string;
  semantics_warning: string;
  provenance_sha256: string;
  airports: CandidateAirport[];
}
interface Diagnostics {
  provenance?: {
    license?: string;
    known_source_caveats?: string[];
    source_files?: Array<{ label?: string; sha256?: string; bytes?: number }>;
  };
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
function readJson<T>(path: string): { raw: string; value: T } {
  const raw = readFileSync(path, "utf8");
  return { raw, value: JSON.parse(raw) as T };
}
function wholePercentRankCount(total: number, share: number): number {
  return Math.max(1, Math.ceil(total * share));
}

export function freezeMrAirspaceReferenceV39(candidate: Candidate, diagnostics: Diagnostics, frozenAt = new Date()): FrozenTrafficReferenceV39 {
  if (candidate.schema_version !== "v3.9-mrairspace-reference-candidate-1" || candidate.status !== "CANDIDATE_NOT_FROZEN") {
    throw new Error("MRAIRSPACE_FREEZE_CANDIDATE_SCHEMA_INVALID");
  }
  if (candidate.reference_period_start !== EXPECTED_PERIOD_START || candidate.reference_period_end !== EXPECTED_PERIOD_END) {
    throw new Error("MRAIRSPACE_FREEZE_REFERENCE_PERIOD_INVALID");
  }
  if (candidate.traffic_metric_name !== "observed_commercial_movements") {
    throw new Error("MRAIRSPACE_FREEZE_TRAFFIC_METRIC_INVALID");
  }
  if (!candidate.semantics_warning?.includes("NOT published/scheduled airline departures")) {
    throw new Error("MRAIRSPACE_FREEZE_SEMANTICS_WARNING_MISSING");
  }
  if (!/^[a-f0-9]{64}$/.test(candidate.provenance_sha256)) throw new Error("MRAIRSPACE_FREEZE_PROVENANCE_HASH_INVALID");
  if (diagnostics.provenance?.license !== "ODbL-1.0") throw new Error("MRAIRSPACE_FREEZE_LICENSE_INVALID");
  if (!diagnostics.provenance?.known_source_caveats?.includes(EXPECTED_MAY_GAP)) {
    throw new Error("MRAIRSPACE_FREEZE_KNOWN_MAY_GAP_MISSING");
  }
  if (!Array.isArray(candidate.airports) || candidate.airports.length < 12) throw new Error("MRAIRSPACE_FREEZE_TOO_FEW_AIRPORTS");

  const ordered = [...candidate.airports].sort((a, b) => b.traffic_metric_value - a.traffic_metric_value || a.icao.localeCompare(b.icao));
  const hubCount = wholePercentRankCount(ordered.length, HUB_SHARE);
  const hubMidCount = Math.max(hubCount + 1, wholePercentRankCount(ordered.length, HUB_MID_CUMULATIVE_SHARE));
  const hubCutMetric = ordered[hubCount - 1]?.traffic_metric_value;
  if (!(hubCutMetric > 0)) throw new Error("MRAIRSPACE_FREEZE_HUB_CUT_INVALID");

  const airports: FrozenTrafficAirportRow[] = ordered.map((row, index) => ({
    icao: String(row.icao).toUpperCase(),
    traffic_metric_value: Number(row.traffic_metric_value),
    tier: index < hubCount ? "HUB" : index < hubMidCount ? "MID" : "REGIONAL",
    country_iso2: String(row.country_iso2).toUpperCase(),
    longitude_e: row.longitude_e,
    airport_timezone: row.airport_timezone,
    out_degree: row.out_degree,
    in_degree: row.in_degree,
    undirected_degree: row.undirected_degree,
    effective_carriers: row.effective_carriers,
    carrier_coverage_share: row.carrier_coverage_share ?? null,
    intl_share: row.intl_share,
  }));

  const required = new Map(airports.map((row, index) => [row.icao, { row, rank: index + 1 }]));
  for (const icao of ["WSSS", "OMAA"]) {
    const hit = required.get(icao);
    if (!hit || hit.row.tier !== "HUB") throw new Error(`MRAIRSPACE_FREEZE_REQUIRED_HUB_MISSING:${icao}`);
  }
  const hubRegions = new Set(
    airports.filter((row) => row.tier === "HUB")
      .map((row) => resolveRegion(row.country_iso2, row.longitude_e))
      .filter((region) => region !== "UNMAPPED"),
  );
  for (const region of ["NA", "EU", "AP", "MEA", "SA", "OC"] as const) {
    if (!hubRegions.has(region)) throw new Error(`MRAIRSPACE_FREEZE_HUB_REGION_MISSING:${region}`);
  }

  const retrievalDate = String(candidate.built_at_utc).slice(0, 10);
  const frozen: FrozenTrafficReferenceV39 = {
    schema_version: "v3.9-traffic-reference-frozen-1",
    status: "READY_FROZEN_REFERENCE",
    traffic_source_name: "MrAirspace aircraft-flight-schedules + OurAirports",
    traffic_source_version: "2025Q3+2025Q4+2026Q1+2026Q2; pinned release SHA-256; policy=" + POLICY_VERSION,
    traffic_retrieval_date: retrievalDate,
    reference_period_start: EXPECTED_PERIOD_START,
    reference_period_end: EXPECTED_PERIOD_END,
    traffic_metric_name: "observed_commercial_movements",
    traffic_metric_units: "resolved observed departures per fixed 365-day reference period",
    reference_semantics: "observed_commercial_movements",
    reference_max_age_days: MAX_AGE_DAYS,
    reference_freshness_basis: "latest complete four-quarter MrAirspace set available at freeze; maximum age one 92-day calendar quarter; known 2026-05-05..07 upstream archive gap recorded in V3.9_PHASE2_REFERENCE_FREEZE.md",
    hub_cut_metric: hubCutMetric,
    tier_cut_rule: [
      `policy=${POLICY_VERSION}`,
      "kind=rank",
      "sort=traffic_metric_desc_then_icao_asc",
      `hub_share=${HUB_SHARE}`,
      `hub_mid_cumulative_share=${HUB_MID_CUMULATIVE_SHARE}`,
      `hub_rank_count=${hubCount}`,
      `hub_mid_cumulative_rank_count=${hubMidCount}`,
      "regional=remainder",
      "missing_reference=UNCLASSIFIED_in_final_frame",
      "route_degree_threshold=observed_resolved_movements>=53_over_365d",
    ].join(";"),
    raw_reference_sha256: candidate.provenance_sha256,
    tier_hash: computeTierHash(airports),
    license_access_basis: "MrAirspace aircraft-flight-schedules ODbL-1.0; ADSB.lol open data; OurAirports public-domain metadata; used as a fixed exogenous research reference, not redistributed as raw quarterly records",
    airports,
  };

  const verdict = verifyFrozenTrafficReference(frozen);
  if (!verdict.pass) throw new Error(`MRAIRSPACE_FREEZE_OUTPUT_INVALID:${verdict.failures.join(",")}`);
  requireTrafficReferenceFreshnessV39(frozen, frozenAt);
  return frozen;
}

export function main(argv = process.argv.slice(2)): number {
  if (argv.length !== 3) {
    console.error("USAGE: v39_freeze_mrairspace_reference_v39 <candidate.json> <diagnostics.json> <output.json>");
    return 2;
  }
  try {
    const candidate = readJson<Candidate>(argv[0]);
    const diagnostics = readJson<Diagnostics>(argv[1]);
    const frozen = freezeMrAirspaceReferenceV39(candidate.value, diagnostics.value, new Date());
    const raw = `${JSON.stringify(frozen, null, 2)}\n`;
    writeFileSync(argv[2], raw, { encoding: "utf8" });
    const wsss = frozen.airports.findIndex((row) => row.icao === "WSSS") + 1;
    const omaa = frozen.airports.findIndex((row) => row.icao === "OMAA") + 1;
    console.log(JSON.stringify({
      status: "READY_FROZEN_REFERENCE",
      artifact_sha256: sha256Text(raw),
      airport_count: frozen.airports.length,
      hub_count: frozen.airports.filter((x) => x.tier === "HUB").length,
      mid_count: frozen.airports.filter((x) => x.tier === "MID").length,
      regional_count: frozen.airports.filter((x) => x.tier === "REGIONAL").length,
      hub_cut_metric: frozen.hub_cut_metric,
      wsss_rank: wsss,
      omaa_rank: omaa,
      tier_hash: frozen.tier_hash,
    }, null, 2));
    return 0;
  } catch (error: any) {
    console.error(`MRAIRSPACE_FREEZE_FAILED:${error?.message ?? error}`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = main();
