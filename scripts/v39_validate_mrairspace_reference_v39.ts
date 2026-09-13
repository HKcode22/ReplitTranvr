import { readFileSync } from "node:fs";
import { resolveRegion, type MacroRegion } from "../server/lib/disruption/regionMapping_v39";

const ICAO = /^[A-Z0-9]{4}$/;
const SHA = /^[a-f0-9]{64}$/;
const REGIONS: readonly MacroRegion[] = ["NA", "EU", "AP", "MEA", "SA", "OC"];

type Row = {
  icao: string;
  traffic_metric_value: number;
  country_iso2: string;
  longitude_e: number | null;
  airport_timezone: string | null;
  out_degree: number;
  in_degree: number;
  undirected_degree: number;
  effective_carriers: number | null;
  carrier_count_5pct: number | null;
  carrier_shannon: number | null;
  carrier_coverage_share: number;
  intl_share: number | null;
};

type Candidate = {
  schema_version: string;
  status: string;
  reference_period_start: string;
  reference_period_end: string;
  traffic_metric_name: string;
  traffic_metric_units: string;
  semantics_warning: string;
  provenance_sha256: string;
  airports: Row[];
};

function finiteNonnegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function fail(message: string): never {
  throw new Error(`MRAIRSPACE_REFERENCE_VALIDATION_FAILED:${message}`);
}

const path = process.argv[2];
if (!path) fail("INPUT_REQUIRED");
const candidate = JSON.parse(readFileSync(path, "utf8")) as Candidate;
if (candidate.schema_version !== "v3.9-mrairspace-reference-candidate-1") fail("SCHEMA_VERSION");
if (candidate.status !== "CANDIDATE_NOT_FROZEN") fail("STATUS");
if (candidate.reference_period_start !== "2025-07-01" || candidate.reference_period_end !== "2026-06-30") fail("REFERENCE_PERIOD");
const span = (Date.parse(`${candidate.reference_period_end}T00:00:00Z`) - Date.parse(`${candidate.reference_period_start}T00:00:00Z`)) / 86_400_000 + 1;
if (span !== 365) fail(`REFERENCE_PERIOD_DAYS:${span}`);
if (candidate.traffic_metric_name !== "observed_commercial_movements") fail("METRIC_SEMANTICS");
if (!candidate.semantics_warning?.includes("NOT published/scheduled airline departures")) fail("SCHEDULE_SEMANTICS_WARNING_MISSING");
if (!SHA.test(candidate.provenance_sha256 ?? "")) fail("PROVENANCE_HASH");
if (!Array.isArray(candidate.airports) || candidate.airports.length < 100) fail(`TOO_FEW_AIRPORTS:${candidate.airports?.length ?? 0}`);

const seen = new Set<string>();
const regionCounts: Record<MacroRegion, number> = { NA: 0, EU: 0, AP: 0, MEA: 0, SA: 0, OC: 0 };
const carrierCoverage: number[] = [];
let unmapped = 0;
for (const row of candidate.airports) {
  const icao = String(row.icao ?? "").trim().toUpperCase();
  if (!ICAO.test(icao)) fail(`ICAO:${icao}`);
  if (seen.has(icao)) fail(`DUPLICATE_ICAO:${icao}`);
  seen.add(icao);
  if (!finiteNonnegative(row.traffic_metric_value) || row.traffic_metric_value < 53) fail(`TRAFFIC:${icao}`);
  for (const [label, value] of [["OUT", row.out_degree], ["IN", row.in_degree], ["UNDIR", row.undirected_degree]] as const) {
    if (!finiteNonnegative(value)) fail(`${label}_DEGREE:${icao}`);
  }
  if (typeof row.carrier_coverage_share !== "number" || !Number.isFinite(row.carrier_coverage_share) || row.carrier_coverage_share < 0 || row.carrier_coverage_share > 1) {
    fail(`CARRIER_COVERAGE:${icao}`);
  }
  carrierCoverage.push(row.carrier_coverage_share);
  if (row.effective_carriers !== null && (!finiteNonnegative(row.effective_carriers) || row.effective_carriers < 1)) fail(`EFFECTIVE_CARRIERS:${icao}`);
  if (row.intl_share !== null && (typeof row.intl_share !== "number" || !Number.isFinite(row.intl_share) || row.intl_share < 0 || row.intl_share > 1)) fail(`INTL_SHARE:${icao}`);
  const region = resolveRegion(row.country_iso2, row.longitude_e);
  if (region === "UNMAPPED") unmapped += 1;
  else regionCounts[region] += 1;
}

for (const region of REGIONS) {
  if (regionCounts[region] === 0) fail(`REGION_EMPTY:${region}`);
}

for (const anchor of ["WSSS", "OMAA"] as const) {
  const row = candidate.airports.find((item) => item.icao === anchor);
  if (!row) fail(`${anchor}_MISSING`);
  if (!(row.traffic_metric_value > 0 && row.undirected_degree > 0 && row.effective_carriers !== null && row.effective_carriers > 0)) {
    fail(`${anchor}_INCOMPLETE_METRICS`);
  }
}

carrierCoverage.sort((a, b) => a - b);
const quantile = (q: number) => carrierCoverage[Math.max(0, Math.min(carrierCoverage.length - 1, Math.ceil(q * carrierCoverage.length) - 1))];
const result = {
  status: "PASS_CANDIDATE_SOURCE",
  source_semantics: "OBSERVED_ADSB_DERIVED_NOT_PUBLISHED_SCHEDULE",
  airport_count: candidate.airports.length,
  region_counts: regionCounts,
  unmapped_count: unmapped,
  carrier_coverage_p10: quantile(0.10),
  carrier_coverage_p50: quantile(0.50),
  carrier_coverage_p90: quantile(0.90),
  anchors: Object.fromEntries(["WSSS", "OMAA"].map((icao) => [icao, candidate.airports.find((row) => row.icao === icao)])),
};
console.log(JSON.stringify(result, null, 2));
