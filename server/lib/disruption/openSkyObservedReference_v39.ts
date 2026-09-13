import { createHash } from "crypto";

export const OPENSKY_OBSERVED_REFERENCE_SCHEMA_V39 = "v3.9-opensky-observed-reference-work-1" as const;
export const OPENSKY_CHUNK_SECONDS_V39 = 2 * 60 * 60;

export interface OpenSkyFlightV39 {
  icao24?: string | null;
  firstSeen?: number | null;
  lastSeen?: number | null;
  estDepartureAirport?: string | null;
  estArrivalAirport?: string | null;
  callsign?: string | null;
  departureAirportCandidatesCount?: number | null;
  arrivalAirportCandidatesCount?: number | null;
}

export interface OpenSkyRouteAggregateV39 {
  observed_departures: number;
  operator_proxy_counts: Record<string, number>;
  missing_operator_proxy: number;
}

export interface OpenSkyObservedReferenceWorkV39 {
  schema_version: typeof OPENSKY_OBSERVED_REFERENCE_SCHEMA_V39;
  source: "OpenSky Network REST /flights/all";
  source_semantics: "observed_surveillance_derived_flights_not_commercial_schedule";
  reference_period_start_utc: string;
  reference_period_end_exclusive_utc: string;
  chunk_seconds: typeof OPENSKY_CHUNK_SECONDS_V39;
  next_begin_unix: number;
  expected_chunks: number;
  completed_chunks: number;
  empty_chunks: number;
  failed_chunks: number;
  response_hashes: Array<{ begin: number; end: number; sha256: string; http_status: number }>;
  flights_returned: number;
  flights_counted: number;
  flights_excluded_outside_chunk_start: number;
  flights_missing_airport_pair: number;
  flights_ambiguous_airport_candidate: number;
  routes: Record<string, OpenSkyRouteAggregateV39>;
}

const ICAO = /^[A-Z0-9]{4}$/;
const OPERATOR_PREFIX = /^([A-Z]{3})[A-Z0-9]/;

export function sha256OpenSkyV39(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function iso(ms: number): string { return new Date(ms).toISOString(); }

export function createOpenSkyObservedReferenceWorkV39(startUtc: Date, endExclusiveUtc: Date): OpenSkyObservedReferenceWorkV39 {
  if (!Number.isFinite(startUtc.getTime()) || !Number.isFinite(endExclusiveUtc.getTime()) || endExclusiveUtc <= startUtc) {
    throw new Error("OPENSKY_REFERENCE_PERIOD_INVALID");
  }
  if (startUtc.getUTCHours() !== 0 || startUtc.getUTCMinutes() !== 0 || startUtc.getUTCSeconds() !== 0 || startUtc.getUTCMilliseconds() !== 0 ||
      endExclusiveUtc.getUTCHours() !== 0 || endExclusiveUtc.getUTCMinutes() !== 0 || endExclusiveUtc.getUTCSeconds() !== 0 || endExclusiveUtc.getUTCMilliseconds() !== 0) {
    throw new Error("OPENSKY_REFERENCE_PERIOD_MUST_USE_UTC_DAY_BOUNDARIES");
  }
  const days = (endExclusiveUtc.getTime() - startUtc.getTime()) / 86_400_000;
  if (!(days === 365 || days === 366)) throw new Error(`OPENSKY_REFERENCE_PERIOD_NOT_12_MONTHS:${days}d`);
  const chunks = (endExclusiveUtc.getTime() - startUtc.getTime()) / (OPENSKY_CHUNK_SECONDS_V39 * 1000);
  if (!Number.isInteger(chunks)) throw new Error("OPENSKY_REFERENCE_CHUNK_ALIGNMENT_INVALID");
  return {
    schema_version: OPENSKY_OBSERVED_REFERENCE_SCHEMA_V39,
    source: "OpenSky Network REST /flights/all",
    source_semantics: "observed_surveillance_derived_flights_not_commercial_schedule",
    reference_period_start_utc: iso(startUtc.getTime()),
    reference_period_end_exclusive_utc: iso(endExclusiveUtc.getTime()),
    chunk_seconds: OPENSKY_CHUNK_SECONDS_V39,
    next_begin_unix: Math.floor(startUtc.getTime() / 1000),
    expected_chunks: chunks,
    completed_chunks: 0,
    empty_chunks: 0,
    failed_chunks: 0,
    response_hashes: [],
    flights_returned: 0,
    flights_counted: 0,
    flights_excluded_outside_chunk_start: 0,
    flights_missing_airport_pair: 0,
    flights_ambiguous_airport_candidate: 0,
    routes: {},
  };
}

export function validateOpenSkyObservedReferenceWorkV39(work: OpenSkyObservedReferenceWorkV39): void {
  if (work.schema_version !== OPENSKY_OBSERVED_REFERENCE_SCHEMA_V39) throw new Error("OPENSKY_REFERENCE_SCHEMA_INVALID");
  if (work.source_semantics !== "observed_surveillance_derived_flights_not_commercial_schedule") {
    throw new Error("OPENSKY_REFERENCE_SEMANTICS_INVALID");
  }
  if (work.chunk_seconds !== OPENSKY_CHUNK_SECONDS_V39) throw new Error("OPENSKY_REFERENCE_CHUNK_SIZE_INVALID");
  if (!Number.isInteger(work.expected_chunks) || work.expected_chunks <= 0) throw new Error("OPENSKY_REFERENCE_EXPECTED_CHUNKS_INVALID");
  if (!Number.isInteger(work.completed_chunks) || work.completed_chunks < 0 || work.completed_chunks > work.expected_chunks) {
    throw new Error("OPENSKY_REFERENCE_COMPLETED_CHUNKS_INVALID");
  }
  if (work.response_hashes.length !== work.completed_chunks) throw new Error("OPENSKY_REFERENCE_HASH_LEDGER_LENGTH_MISMATCH");
  const expectedNext = Math.floor(Date.parse(work.reference_period_start_utc) / 1000) + work.completed_chunks * work.chunk_seconds;
  if (work.next_begin_unix !== expectedNext) throw new Error("OPENSKY_REFERENCE_NEXT_BEGIN_MISMATCH");
  for (const item of work.response_hashes) if (!/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error("OPENSKY_REFERENCE_RESPONSE_HASH_INVALID");
}

function normalizedAirport(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toUpperCase();
  return ICAO.test(v) ? v : null;
}

export function openSkyOperatorProxyV39(callsign: unknown): string | null {
  if (typeof callsign !== "string") return null;
  const normalized = callsign.trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(OPERATOR_PREFIX);
  return match?.[1] ?? null;
}

/**
 * Apply one non-overlapping two-hour OpenSky response.
 *
 * A flight is assigned only to the chunk containing its firstSeen timestamp.
 * This prevents long flights returned around adjacent query boundaries from
 * being counted twice without retaining a giant flight-level deduplication set.
 * Origin/destination are OpenSky estimates, not commercial schedule facts.
 */
export function applyOpenSkyChunkV39(input: {
  work: OpenSkyObservedReferenceWorkV39;
  beginUnix: number;
  endUnix: number;
  httpStatus: number;
  responseBodyText: string;
  flights: readonly OpenSkyFlightV39[];
}): void {
  const { work } = input;
  validateOpenSkyObservedReferenceWorkV39(work);
  if (input.beginUnix !== work.next_begin_unix || input.endUnix - input.beginUnix !== OPENSKY_CHUNK_SECONDS_V39) {
    throw new Error("OPENSKY_REFERENCE_CHUNK_SEQUENCE_INVALID");
  }
  if (input.httpStatus !== 200 && input.httpStatus !== 404) throw new Error(`OPENSKY_REFERENCE_HTTP_STATUS_UNEXPECTED:${input.httpStatus}`);
  if (input.httpStatus === 404 && input.flights.length !== 0) throw new Error("OPENSKY_REFERENCE_404_WITH_FLIGHTS");

  work.response_hashes.push({
    begin: input.beginUnix,
    end: input.endUnix,
    sha256: sha256OpenSkyV39(input.responseBodyText),
    http_status: input.httpStatus,
  });
  work.completed_chunks += 1;
  work.next_begin_unix = input.endUnix;
  if (input.flights.length === 0) work.empty_chunks += 1;
  work.flights_returned += input.flights.length;

  for (const flight of input.flights) {
    const firstSeen = Number(flight.firstSeen);
    if (!Number.isFinite(firstSeen) || firstSeen < input.beginUnix || firstSeen >= input.endUnix) {
      work.flights_excluded_outside_chunk_start += 1;
      continue;
    }
    const origin = normalizedAirport(flight.estDepartureAirport);
    const destination = normalizedAirport(flight.estArrivalAirport);
    if (!origin || !destination || origin === destination) {
      work.flights_missing_airport_pair += 1;
      continue;
    }
    if ((flight.departureAirportCandidatesCount ?? 1) > 1 || (flight.arrivalAirportCandidatesCount ?? 1) > 1) {
      work.flights_ambiguous_airport_candidate += 1;
    }
    const key = `${origin}>${destination}`;
    const aggregate = work.routes[key] ?? { observed_departures: 0, operator_proxy_counts: {}, missing_operator_proxy: 0 };
    aggregate.observed_departures += 1;
    const operator = openSkyOperatorProxyV39(flight.callsign);
    if (operator) aggregate.operator_proxy_counts[operator] = (aggregate.operator_proxy_counts[operator] ?? 0) + 1;
    else aggregate.missing_operator_proxy += 1;
    work.routes[key] = aggregate;
    work.flights_counted += 1;
  }

  validateOpenSkyObservedReferenceWorkV39(work);
}

export function finalizeOpenSkyObservedReferenceV39(work: OpenSkyObservedReferenceWorkV39): {
  complete: boolean;
  aggregate_sha256: string;
  route_count: number;
  airport_count: number;
  operator_proxy_coverage: number;
  airport_pair_usable_share: number;
} {
  validateOpenSkyObservedReferenceWorkV39(work);
  const airports = new Set<string>();
  let withOperator = 0;
  for (const [key, route] of Object.entries(work.routes)) {
    const [origin, destination] = key.split(">");
    airports.add(origin);
    airports.add(destination);
    withOperator += Object.values(route.operator_proxy_counts).reduce((sum, n) => sum + n, 0);
  }
  return {
    complete: work.completed_chunks === work.expected_chunks,
    aggregate_sha256: sha256OpenSkyV39(JSON.stringify({
      source: work.source,
      source_semantics: work.source_semantics,
      period: [work.reference_period_start_utc, work.reference_period_end_exclusive_utc],
      response_hashes: work.response_hashes,
      routes: Object.fromEntries(Object.entries(work.routes).sort(([a], [b]) => a.localeCompare(b))),
    })),
    route_count: Object.keys(work.routes).length,
    airport_count: airports.size,
    operator_proxy_coverage: work.flights_counted > 0 ? withOperator / work.flights_counted : 0,
    airport_pair_usable_share: work.flights_returned > 0 ? work.flights_counted / work.flights_returned : 0,
  };
}
