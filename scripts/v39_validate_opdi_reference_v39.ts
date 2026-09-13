import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseFrozenTrafficReference } from "../server/lib/disruption/trafficReference_v39";
import { requireTrafficReferenceFreshnessV39 } from "../server/lib/disruption/trafficReferenceFreshness_v39";

const EXPECTED_POLICY = "policy=opdi-observed-rank-10-30-60-v1";

function fail(message: string): never {
  throw new Error(`OPDI_REFERENCE_VALIDATION_FAILED:${message}`);
}

export function validateOpdiReferenceFileV39(path: string, now = new Date()): {
  airportCount: number;
  hubCount: number;
  midCount: number;
  regionalCount: number;
  wsssTier: string;
  omaaTier: string;
  hubCutMetric: number;
  carrierCoverageP10: number;
} {
  const raw = readFileSync(path, "utf8");
  const ref = parseFrozenTrafficReference(raw);
  requireTrafficReferenceFreshnessV39(ref, now);

  if (ref.reference_semantics !== "observed_commercial_movements") fail("SEMANTICS_NOT_OBSERVED_COMMERCIAL_MOVEMENTS");
  if (!/EUROCONTROL OPDI/i.test(ref.traffic_source_name)) fail("SOURCE_NOT_OPDI");
  if (!/OurAirports/i.test(ref.traffic_source_name)) fail("AIRPORT_METADATA_SOURCE_NOT_OURAIRPORTS");
  if (ref.reference_period_start !== "2025-08-01" || ref.reference_period_end !== "2026-07-31") {
    fail(`REFERENCE_PERIOD_UNEXPECTED:${ref.reference_period_start}:${ref.reference_period_end}`);
  }
  if (ref.reference_max_age_days !== 62 || !ref.reference_freshness_basis?.trim()) fail("FRESHNESS_POLICY_NOT_FROZEN");
  if (!ref.tier_cut_rule.includes(EXPECTED_POLICY)) fail("TIER_POLICY_NOT_EXPECTED_OPDI_POLICY");
  if (!ref.tier_cut_rule.includes("sort=traffic_metric_desc_then_icao_asc")) fail("TIER_TIE_BREAK_NOT_FROZEN");
  if (!ref.tier_cut_rule.includes("route_degree_threshold=observed_operator_coded_departures>=53_over_365d")) {
    fail("ROUTE_THRESHOLD_NOT_FROZEN");
  }

  const hubs = ref.airports.filter((row) => row.tier === "HUB");
  const mids = ref.airports.filter((row) => row.tier === "MID");
  const regionals = ref.airports.filter((row) => row.tier === "REGIONAL");
  if (hubs.length < 12) fail(`FEWER_THAN_12_HUBS:${hubs.length}`);

  const wsss = ref.airports.find((row) => row.icao === "WSSS");
  const omaa = ref.airports.find((row) => row.icao === "OMAA");
  if (!wsss) fail("WSSS_MISSING");
  if (!omaa) fail("OMAA_MISSING");
  if (wsss.tier !== "HUB") fail(`WSSS_NOT_HUB:${wsss.tier}`);
  if (omaa.tier !== "HUB") fail(`OMAA_NOT_HUB:${omaa.tier}`);

  for (const row of hubs) {
    if (!(typeof row.traffic_metric_value === "number" && row.traffic_metric_value > 0)) fail(`HUB_TRAFFIC_INVALID:${row.icao}`);
    if (!(typeof row.undirected_degree === "number" && row.undirected_degree >= 0)) fail(`HUB_DEGREE_MISSING:${row.icao}`);
    if (!(typeof row.effective_carriers === "number" && row.effective_carriers > 0)) fail(`HUB_CARRIER_DIVERSITY_MISSING:${row.icao}`);
    if (!(typeof row.intl_share === "number" && row.intl_share >= 0 && row.intl_share <= 1)) fail(`HUB_INTL_SHARE_MISSING:${row.icao}`);
  }

  const coverage = ref.airports
    .map((row) => row.carrier_coverage_share)
    .filter((x): x is number => typeof x === "number" && Number.isFinite(x))
    .sort((a, b) => a - b);
  if (coverage.length !== ref.airports.length) fail("CARRIER_COVERAGE_DIAGNOSTIC_INCOMPLETE");
  const p10 = coverage[Math.max(0, Math.ceil(coverage.length * 0.10) - 1)];
  if (!(p10 >= 0 && p10 <= 1)) fail("CARRIER_COVERAGE_P10_INVALID");

  return {
    airportCount: ref.airports.length,
    hubCount: hubs.length,
    midCount: mids.length,
    regionalCount: regionals.length,
    wsssTier: wsss.tier,
    omaaTier: omaa.tier,
    hubCutMetric: ref.hub_cut_metric,
    carrierCoverageP10: p10,
  };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    const file = process.argv[2];
    if (!file) fail("USAGE:tsx scripts/v39_validate_opdi_reference_v39.ts <traffic-reference.json>");
    const result = validateOpdiReferenceFileV39(resolve(process.cwd(), file));
    console.log(JSON.stringify({ status: "PASS", ...result }, null, 2));
  } catch (error: any) {
    console.error(String(error?.message ?? error));
    process.exitCode = 1;
  }
}
