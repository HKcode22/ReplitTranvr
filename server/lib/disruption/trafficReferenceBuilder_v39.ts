import {
  computeTierHash,
  sha256Hex,
  verifyFrozenTrafficReference,
  type FrozenTrafficAirportRow,
  type FrozenTrafficReferenceV39,
  type FrozenTrafficTier,
} from "./trafficReference_v39";

/**
 * Provider-neutral schedule-reference row.
 *
 * This is intentionally NOT an OAG/Cirium schema. A licensed source adapter
 * must map its permitted export into these fields. The builder then owns every
 * scientific transformation used by Phase 2, so the operator never hand-edits
 * airport tiers or diversity metrics.
 */
export interface NormalizedScheduleRouteRowV39 {
  origin_icao: string;
  destination_icao: string;
  operating_carrier: string;
  origin_country_iso2: string;
  destination_country_iso2: string;
  origin_longitude_e: number | null;
  destination_longitude_e: number | null;
  origin_timezone: string | null;
  destination_timezone: string | null;
  scheduled_departures: number;
}

export interface TrafficReferenceBuildMetadataV39 {
  trafficSourceName: string;
  trafficSourceVersion: string;
  trafficRetrievalDate: string;
  referencePeriodStart: string;
  referencePeriodEnd: string;
  rawReferenceSha256: string;
  licenseAccessBasis: string;
}

export interface TrafficTierPolicyV39 {
  /** Project sampling stratum, not an industry airport classification. */
  hubRankShare: number;
  /** Cumulative HUB+MID share. */
  hubMidCumulativeRankShare: number;
  version: string;
}

export const DEFAULT_TRAFFIC_TIER_POLICY_V39: Readonly<TrafficTierPolicyV39> = Object.freeze({
  hubRankShare: 0.10,
  hubMidCumulativeRankShare: 0.40,
  version: "v39-rank-strata-10-30-60-v1",
});

export interface AirportTrafficBuildDiagnosticV39 {
  icao: string;
  scheduledDepartures: number;
  outDegree: number;
  inDegree: number;
  undirectedDegree: number;
  effectiveCarriers: number;
  carrierCount5Pct: number;
  carrierShannon: number;
  intlShare: number;
}

export interface TrafficReferenceBuildResultV39 {
  reference: FrozenTrafficReferenceV39;
  normalizedInputSha256: string;
  diagnostics: AirportTrafficBuildDiagnosticV39[];
  hubRankCount: number;
  midRankCount: number;
  regionalRankCount: number;
  weeklyRouteDepartureThreshold: number;
}

const ICAO = /^[A-Z0-9]{4}$/;
const ISO2 = /^[A-Z]{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA = /^[a-f0-9]{64}$/;

interface AirportAccumulator {
  countryIso2: string;
  longitudeE: number | null;
  timezone: string | null;
  departures: number;
  internationalDepartures: number;
  carrierDepartures: Map<string, number>;
  outgoingQualifying: Set<string>;
  incomingQualifying: Set<string>;
}

function normalizedCode(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function validFiniteLongitude(value: number | null): boolean {
  return value === null || (Number.isFinite(value) && value >= -180 && value <= 180);
}

function parseUtcDate(value: string, label: string): number {
  if (!DATE.test(value)) throw new Error(`TRAFFIC_BUILD_INVALID_${label.toUpperCase()}`);
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(ms)) throw new Error(`TRAFFIC_BUILD_INVALID_${label.toUpperCase()}`);
  return ms;
}

function periodDays(start: string, end: string): number {
  const a = parseUtcDate(start, "period_start");
  const b = parseUtcDate(end, "period_end");
  const days = (b - a) / 86_400_000 + 1;
  if (!(days >= 365 && days <= 366)) throw new Error(`TRAFFIC_BUILD_PERIOD_NOT_12_MONTHS:${days}`);
  return days;
}

function assertMetadata(metadata: TrafficReferenceBuildMetadataV39): void {
  for (const [label, value] of [
    ["traffic_source_name", metadata.trafficSourceName],
    ["traffic_source_version", metadata.trafficSourceVersion],
    ["license_access_basis", metadata.licenseAccessBasis],
  ] as const) {
    if (!String(value ?? "").trim()) throw new Error(`TRAFFIC_BUILD_${label.toUpperCase()}_MISSING`);
  }
  parseUtcDate(metadata.trafficRetrievalDate, "retrieval_date");
  periodDays(metadata.referencePeriodStart, metadata.referencePeriodEnd);
  if (!SHA.test(metadata.rawReferenceSha256)) throw new Error("TRAFFIC_BUILD_RAW_REFERENCE_SHA256_INVALID");
}

function assertPolicy(policy: TrafficTierPolicyV39): void {
  if (!policy.version.trim()) throw new Error("TRAFFIC_BUILD_TIER_POLICY_VERSION_MISSING");
  if (!(policy.hubRankShare > 0 && policy.hubRankShare < 1)) throw new Error("TRAFFIC_BUILD_HUB_RANK_SHARE_INVALID");
  if (!(policy.hubMidCumulativeRankShare > policy.hubRankShare && policy.hubMidCumulativeRankShare < 1)) {
    throw new Error("TRAFFIC_BUILD_HUB_MID_RANK_SHARE_INVALID");
  }
}

function assertRow(row: NormalizedScheduleRouteRowV39, index: number): NormalizedScheduleRouteRowV39 {
  const origin = normalizedCode(row.origin_icao);
  const destination = normalizedCode(row.destination_icao);
  const carrier = normalizedCode(row.operating_carrier);
  const originCountry = normalizedCode(row.origin_country_iso2);
  const destinationCountry = normalizedCode(row.destination_country_iso2);
  if (!ICAO.test(origin) || !ICAO.test(destination) || origin === destination) {
    throw new Error(`TRAFFIC_BUILD_ROUTE_INVALID:${index}`);
  }
  if (!carrier) throw new Error(`TRAFFIC_BUILD_CARRIER_MISSING:${index}`);
  if (!ISO2.test(originCountry) || !ISO2.test(destinationCountry)) {
    throw new Error(`TRAFFIC_BUILD_COUNTRY_INVALID:${index}`);
  }
  if (!validFiniteLongitude(row.origin_longitude_e) || !validFiniteLongitude(row.destination_longitude_e)) {
    throw new Error(`TRAFFIC_BUILD_LONGITUDE_INVALID:${index}`);
  }
  if (!Number.isInteger(row.scheduled_departures) || row.scheduled_departures <= 0) {
    throw new Error(`TRAFFIC_BUILD_DEPARTURES_INVALID:${index}`);
  }
  return {
    ...row,
    origin_icao: origin,
    destination_icao: destination,
    operating_carrier: carrier,
    origin_country_iso2: originCountry,
    destination_country_iso2: destinationCountry,
    origin_timezone: row.origin_timezone?.trim() || null,
    destination_timezone: row.destination_timezone?.trim() || null,
  };
}

function getAirport(
  airports: Map<string, AirportAccumulator>,
  icao: string,
  countryIso2: string,
  longitudeE: number | null,
  timezone: string | null,
): AirportAccumulator {
  const existing = airports.get(icao);
  if (existing) {
    if (existing.countryIso2 !== countryIso2) throw new Error(`TRAFFIC_BUILD_METADATA_COUNTRY_CONFLICT:${icao}`);
    if (existing.longitudeE !== null && longitudeE !== null && Math.abs(existing.longitudeE - longitudeE) > 1e-9) {
      throw new Error(`TRAFFIC_BUILD_METADATA_LONGITUDE_CONFLICT:${icao}`);
    }
    if (existing.timezone && timezone && existing.timezone !== timezone) {
      throw new Error(`TRAFFIC_BUILD_METADATA_TIMEZONE_CONFLICT:${icao}`);
    }
    if (existing.longitudeE === null && longitudeE !== null) existing.longitudeE = longitudeE;
    if (!existing.timezone && timezone) existing.timezone = timezone;
    return existing;
  }
  const created: AirportAccumulator = {
    countryIso2,
    longitudeE,
    timezone,
    departures: 0,
    internationalDepartures: 0,
    carrierDepartures: new Map(),
    outgoingQualifying: new Set(),
    incomingQualifying: new Set(),
  };
  airports.set(icao, created);
  return created;
}

function carrierDiagnostics(carriers: Map<string, number>, total: number): {
  effectiveCarriers: number;
  carrierCount5Pct: number;
  carrierShannon: number;
} {
  if (!(total > 0)) return { effectiveCarriers: 0, carrierCount5Pct: 0, carrierShannon: 0 };
  let hhi = 0;
  let shannon = 0;
  let count5 = 0;
  for (const n of carriers.values()) {
    const p = n / total;
    hhi += p * p;
    if (p >= 0.05) count5 += 1;
    if (p > 0) shannon -= p * Math.log(p);
  }
  return {
    effectiveCarriers: hhi > 0 ? 1 / hhi : 0,
    carrierCount5Pct: count5,
    carrierShannon: shannon,
  };
}

function tierForRank(rank1: number, hubCount: number, hubMidCount: number): FrozenTrafficTier {
  if (rank1 <= hubCount) return "HUB";
  if (rank1 <= hubMidCount) return "MID";
  return "REGIONAL";
}

/**
 * Build the exact frozen Phase-2 traffic reference from a permitted normalized
 * 12-month schedule export.
 *
 * Frozen project design (not an aviation-industry constant): sort airports by
 * scheduled departures DESC then ICAO ASC; top 10% are HUB, next 30% MID, and
 * remaining 60% REGIONAL. Missing-reference airports are handled later by the
 * final-frame owner and remain UNCLASSIFIED.
 */
export function buildFrozenTrafficReferenceV39(
  rawRows: readonly NormalizedScheduleRouteRowV39[],
  metadata: TrafficReferenceBuildMetadataV39,
  policy: TrafficTierPolicyV39 = DEFAULT_TRAFFIC_TIER_POLICY_V39,
): TrafficReferenceBuildResultV39 {
  assertMetadata(metadata);
  assertPolicy(policy);
  if (!rawRows.length) throw new Error("TRAFFIC_BUILD_INPUT_EMPTY");

  const days = periodDays(metadata.referencePeriodStart, metadata.referencePeriodEnd);
  // Binding interpretation of Plan §4.2 "≥1 scheduled departure/week": average
  // frequency at least one departure per seven days over the complete frozen
  // reference period. For a 365-day period this is 53 departures.
  const weeklyRouteDepartureThreshold = Math.ceil(days / 7);
  const rows = rawRows.map((row, i) => assertRow(row, i));
  const normalizedInputSha256 = sha256Hex(rows);
  const airports = new Map<string, AirportAccumulator>();
  const routeTotals = new Map<string, number>();

  for (const row of rows) {
    getAirport(airports, row.origin_icao, row.origin_country_iso2, row.origin_longitude_e, row.origin_timezone);
    getAirport(airports, row.destination_icao, row.destination_country_iso2, row.destination_longitude_e, row.destination_timezone);
    const key = `${row.origin_icao}>${row.destination_icao}`;
    routeTotals.set(key, (routeTotals.get(key) ?? 0) + row.scheduled_departures);
  }

  for (const row of rows) {
    const origin = airports.get(row.origin_icao)!;
    origin.departures += row.scheduled_departures;
    origin.carrierDepartures.set(
      row.operating_carrier,
      (origin.carrierDepartures.get(row.operating_carrier) ?? 0) + row.scheduled_departures,
    );
    if (row.origin_country_iso2 !== row.destination_country_iso2) {
      origin.internationalDepartures += row.scheduled_departures;
    }
  }

  for (const [key, departures] of routeTotals) {
    if (departures < weeklyRouteDepartureThreshold) continue;
    const [originIcao, destinationIcao] = key.split(">");
    airports.get(originIcao)?.outgoingQualifying.add(destinationIcao);
    airports.get(destinationIcao)?.incomingQualifying.add(originIcao);
  }

  const diagnostics: AirportTrafficBuildDiagnosticV39[] = [...airports.entries()].map(([icao, a]) => {
    const carrier = carrierDiagnostics(a.carrierDepartures, a.departures);
    const connected = new Set([...a.outgoingQualifying, ...a.incomingQualifying]);
    return {
      icao,
      scheduledDepartures: a.departures,
      outDegree: a.outgoingQualifying.size,
      inDegree: a.incomingQualifying.size,
      undirectedDegree: connected.size,
      effectiveCarriers: carrier.effectiveCarriers,
      carrierCount5Pct: carrier.carrierCount5Pct,
      carrierShannon: carrier.carrierShannon,
      intlShare: a.departures > 0 ? a.internationalDepartures / a.departures : 0,
    };
  }).sort((a, b) => b.scheduledDepartures - a.scheduledDepartures || a.icao.localeCompare(b.icao));

  if (!diagnostics.length || diagnostics[0].scheduledDepartures <= 0) throw new Error("TRAFFIC_BUILD_NO_DEPARTURE_AIRPORTS");
  const hubRankCount = Math.max(1, Math.ceil(diagnostics.length * policy.hubRankShare));
  const hubMidRankCount = Math.max(hubRankCount + 1, Math.ceil(diagnostics.length * policy.hubMidCumulativeRankShare));
  const boundedHubMidRankCount = Math.min(diagnostics.length, hubMidRankCount);
  const midRankCount = Math.max(0, boundedHubMidRankCount - hubRankCount);
  const regionalRankCount = Math.max(0, diagnostics.length - boundedHubMidRankCount);
  const hubCutMetric = diagnostics[Math.min(hubRankCount, diagnostics.length) - 1].scheduledDepartures;
  if (!(hubCutMetric > 0)) throw new Error("TRAFFIC_BUILD_HUB_CUT_NOT_POSITIVE");

  const frozenRows: FrozenTrafficAirportRow[] = diagnostics.map((d, index) => {
    const a = airports.get(d.icao)!;
    return {
      icao: d.icao,
      traffic_metric_value: d.scheduledDepartures,
      tier: tierForRank(index + 1, hubRankCount, boundedHubMidRankCount),
      country_iso2: a.countryIso2,
      longitude_e: a.longitudeE,
      airport_timezone: a.timezone,
      out_degree: d.outDegree,
      in_degree: d.inDegree,
      undirected_degree: d.undirectedDegree,
      effective_carriers: d.effectiveCarriers,
      intl_share: d.intlShare,
    };
  });

  const tierCutRule = [
    `policy=${policy.version}`,
    `sort=traffic_metric_desc_then_icao_asc`,
    `hub=top_${policy.hubRankShare}`,
    `mid=next_${policy.hubMidCumulativeRankShare - policy.hubRankShare}`,
    `regional=remainder`,
    `hub_rank_count=${hubRankCount}`,
    `hub_mid_cumulative_rank_count=${boundedHubMidRankCount}`,
    `route_degree_threshold=scheduled_departures>=${weeklyRouteDepartureThreshold}_over_${days}d`,
  ].join(";");

  const reference: FrozenTrafficReferenceV39 = {
    schema_version: "v3.9-traffic-reference-frozen-1",
    status: "READY_FROZEN_REFERENCE",
    traffic_source_name: metadata.trafficSourceName,
    traffic_source_version: metadata.trafficSourceVersion,
    traffic_retrieval_date: metadata.trafficRetrievalDate,
    reference_period_start: metadata.referencePeriodStart,
    reference_period_end: metadata.referencePeriodEnd,
    traffic_metric_name: "scheduled_departures",
    traffic_metric_units: "departures_per_frozen_12_month_period",
    hub_cut_metric: hubCutMetric,
    tier_cut_rule: tierCutRule,
    raw_reference_sha256: metadata.rawReferenceSha256,
    tier_hash: computeTierHash(frozenRows),
    license_access_basis: metadata.licenseAccessBasis,
    airports: frozenRows,
  };
  const verdict = verifyFrozenTrafficReference(reference);
  if (!verdict.pass) throw new Error(`TRAFFIC_BUILD_OUTPUT_INVALID:${verdict.failures.join(",")}`);

  return {
    reference,
    normalizedInputSha256,
    diagnostics,
    hubRankCount,
    midRankCount,
    regionalRankCount,
    weeklyRouteDepartureThreshold,
  };
}
